#!/usr/bin/env python3
"""Run a synchronous Hindsight import or a source-checked weekly reflection."""

import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo


# shortcut: patterns miss unknown credential formats; upgrade when a maintained scanner is available in the worker.
SECRET_PATTERNS = (
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(r"\b(?:sk-(?:proj-)?|gh[pousr]_|github_pat_)[A-Za-z0-9_-]{20,}\b"),
    re.compile(r"(?i)\b(?:api[_-]?key|access[_-]?token|password|secret)\b[\"']?\s*[:=]\s*[\"']?[A-Za-z0-9_./+\-=]{20,}"),
)
API = "http://127.0.0.1:18888/v1/default/banks/greppy"


def request(path, body=None):
    token = os.environ.get("HINDSIGHT_API_TENANT_API_KEY")
    if not token:
        raise ValueError("missing API credential")
    data = None if body is None else json.dumps(body).encode()
    api = os.environ.get("HINDSIGHT_MEMORY_BANK_API", API)
    url = urlsplit(api)
    if (url.scheme != "http" or url.hostname not in {"127.0.0.1", "localhost", "::1"}
            or url.username is not None or url.password is not None or url.query or url.fragment
            or not re.fullmatch(r"/v1/default/banks/[A-Za-z0-9][A-Za-z0-9_.-]{0,127}", url.path)):
        raise ValueError("bank API scope")
    req = urllib.request.Request(api + path, data=data, headers={
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
    })
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    with opener.open(req, timeout=600) as response:
        return json.load(response)


def add_tool_details(turns, transcript_text):
    details = []
    for line in transcript_text.splitlines():
        event = json.loads(line)
        payload = event.get("payload") or {}
        if event.get("type") != "response_item":
            continue
        if payload.get("type") in ("function_call_output", "custom_tool_call_output"):
            role, content = "tool", payload.get("output")
        elif payload.get("type") in ("function_call", "custom_tool_call"):
            role = "tool_input"
            content = {"name": payload.get("name"), "input": payload.get("arguments", payload.get("input"))}
        else:
            continue
        if content is not None:
            if not isinstance(content, str):
                content = json.dumps(content, ensure_ascii=False)
            details.append({"role": role, "content": content, "timestamp": event.get("timestamp", "")})
    # Missing timestamps retain the parser's original order ahead of timestamped additions.
    return sorted([*turns, *details], key=lambda turn: turn.get("timestamp") or "")


def reject_secrets(value):
    text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
    if any(pattern.search(text) for pattern in SECRET_PATTERNS):
        raise ValueError("session contains a credential pattern")
    if isinstance(value, dict):
        for item in value.values():
            reject_secrets(item)
    elif isinstance(value, list):
        for item in value:
            reject_secrets(item)


def ingest(transcript, session_id, parser):
    raw = transcript.read_bytes()
    text = raw.decode("utf-8")
    reject_secrets(text)
    for line in text.splitlines():
        reject_secrets(json.loads(line))
    header = json.loads(text.splitlines()[0])
    meta = header["payload"]
    if header.get("type") != "session_meta" or meta.get("id") != session_id or meta.get("source") != "cli":
        raise ValueError("session identity mismatch")
    # The upstream parser seeks, so give it a private, seekable snapshot.
    with tempfile.TemporaryFile() as snapshot:
        snapshot.write(raw)
        snapshot.seek(0)
        result = subprocess.run(
            ["node", "-e", "process.stdout.write(JSON.stringify(require(process.argv[1]).readCodexTranscript(process.argv[2])))", str(parser), "/dev/stdin"],
            stdin=snapshot, check=True, capture_output=True, text=True,
        )
    turns = add_tool_details(json.loads(result.stdout), text)
    if not turns:
        raise ValueError("session has no supported conversation")
    reject_secrets(turns)
    content = json.dumps(turns, ensure_ascii=False)
    digest = hashlib.sha256(raw).hexdigest()
    document_id = "conversation-" + session_id
    response = request("/memories", {"items": [{
        "content": content,
        "context": "Project Codex CLI session",
        "document_id": document_id,
        "timestamp": meta["timestamp"],
        "metadata": {"session_id": session_id, "session_started": meta["timestamp"], "sha256": digest},
    }], "async": False})
    if response.get("success") is not True or response.get("async") is not False:
        raise ValueError("retain did not succeed")
    document = request("/documents/" + urllib.parse.quote(document_id, safe=""))
    count = document.get("memory_unit_count")
    if document.get("id") != document_id or type(count) is not int or count < 1:
        raise ValueError("retain produced no sourced memories")
    return {"session_id": session_id, "sha256": digest}


def grounded_patterns(response, start, end):
    facts = {str(item.get("id")): item for item in (response.get("based_on") or {}).get("memories", [])}
    findings = (response.get("structured_output") or {}).get("patterns", [])
    accepted = []
    for finding in findings:
        cited = [facts[fact_id] for fact_id in finding.get("evidence_ids", []) if fact_id in facts]
        sessions = {}
        verified = []
        for fact in cited:
            metadata = fact.get("metadata") or {}
            try:
                session = metadata["session_id"]
                timestamp = datetime.datetime.fromisoformat(metadata["session_started"].replace("Z", "+00:00"))
                if timestamp.tzinfo is None or fact.get("document_id") != "conversation-" + session:
                    continue
                date = timestamp.astimezone(ZoneInfo("Europe/Berlin")).date()
            except (KeyError, TypeError, ValueError):
                continue
            sessions[session] = date
            verified.append(fact)
        if len(sessions) >= 2 and any(start <= date < end for date in sessions.values()):
            accepted.append({"finding": finding, "facts": verified, "sessions": sorted(sessions)})
    return accepted


def reflect(start, end):
    schema = {"type": "object", "properties": {"patterns": {"type": "array", "items": {
        "type": "object", "properties": {
            "summary": {"type": "string"}, "evidence_ids": {"type": "array", "items": {"type": "string"}},
            "counterevidence": {"type": "string"}, "open_questions": {"type": "string"},
        }, "required": ["summary", "evidence_ids", "counterevidence", "open_questions"],
    }}}, "required": ["patterns"]}
    response = request("/reflect", {
        "query": f"Identify up to three recurring project problems and evidenced remedies. Include facts from at least two distinct sessions, with one session between {start} and {end} exclusive. Cite underlying fact IDs, identify counterevidence and open questions. Answer in German.",
        "budget": "mid", "include": {"facts": {}}, "response_schema": schema,
    })
    if response.get("structured_output_error") or response.get("structured_output") is None:
        raise ValueError("reflection returned no structured result")
    return grounded_patterns(response, start, end)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("ingest", "reflect"))
    parser.add_argument("--transcript", type=Path)
    parser.add_argument("--session-id")
    parser.add_argument("--parser", type=Path, default=Path("/hindsight/parser.cjs"))
    parser.add_argument("--start", type=datetime.date.fromisoformat)
    parser.add_argument("--end", type=datetime.date.fromisoformat)
    args = parser.parse_args()
    try:
        if args.action == "ingest":
            result = ingest(args.transcript, args.session_id, args.parser)
        else:
            result = reflect(args.start, args.end)
        print(json.dumps(result, ensure_ascii=False))
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError, urllib.error.URLError):
        print("Hindsight operation failed; inspect the private inputs and service status.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
