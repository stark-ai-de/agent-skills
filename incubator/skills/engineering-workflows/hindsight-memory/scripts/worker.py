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

from session_parser import parse, snapshot


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
    """Compatibility entrypoint: raw tools and recalled content are never added."""
    return list(turns)


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


def ingest(transcript, session_id, parser=None, job=None):
    job = job or {}
    raw = snapshot(transcript, job.get("byte_length"))
    text = raw.decode("utf-8")
    reject_secrets(text)
    for line in text.splitlines():
        reject_secrets(json.loads(line))
    digest = hashlib.sha256(raw).hexdigest()
    known = job.get("known_outcomes", [])
    if not isinstance(known, list) or any(not isinstance(item, str) or not re.fullmatch(r"[a-f0-9]{64}", item) for item in known):
        raise ValueError("outcome ledger")
    meta, outcomes = parse(raw, session_id, job.get("source"), job.get("leaf_id"), known,
                           job.get("completion_status"), job.get("checkpoint_at"))
    reject_secrets(outcomes)
    items = []
    for outcome in outcomes:
        if outcome["id"] in known:
            continue
        provenance = {"session_id": session_id, "session_started": meta["timestamp"],
                      "source": meta["source"], "sha256": digest, "outcome_id": outcome["id"],
                      "outcome_at": json.loads(outcome["content"])["timestamp"]}
        if meta["forked_from"]:
            provenance["forked_from"] = meta["forked_from"]
        if outcome["entry_id"]:
            provenance["entry_id"] = outcome["entry_id"]
        for name in ("repository", "branch_at_intake", "commit_at_intake", "provenance_observed_at", "checkpoint_at"):
            if name in job:
                provenance[name] = job[name] if isinstance(job[name], str) else json.dumps(job[name], sort_keys=True)
        items.append({"content": outcome["content"], "context": "Agent-reported project outcome; verify against its sources.",
                      "document_id": "outcome-" + outcome["id"], "timestamp": provenance["outcome_at"], "metadata": provenance})
    result = {"session_id": session_id, "sha256": digest, "outcome_ids": [item["id"] for item in outcomes],
              "pending_outcomes": meta["remaining_outcomes"]}
    if not items:
        return result
    response = request("/memories", {"items": items, "async": False})
    if response.get("success") is not True or response.get("async") is not False:
        raise ValueError("retain did not succeed")
    for item in items:
        document = request("/documents/" + item["document_id"])
        count = document.get("memory_unit_count")
        if document.get("id") != item["document_id"] or type(count) is not int or count < 1:
            raise ValueError("retain produced no sourced memories")
    return result


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
                timestamp = datetime.datetime.fromisoformat(metadata.get("outcome_at", metadata["session_started"]).replace("Z", "+00:00"))
                documents = {"conversation-" + session}
                if isinstance(metadata.get("outcome_id"), str) and re.fullmatch(r"[a-f0-9]{64}", metadata["outcome_id"]):
                    documents.add("outcome-" + metadata["outcome_id"])
                if timestamp.tzinfo is None or fact.get("document_id") not in documents or metadata.get("forked_from"):
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
    parser.add_argument("--job", type=Path, help="Private bounded snapshot/provenance envelope")
    parser.add_argument("--start", type=datetime.date.fromisoformat)
    parser.add_argument("--end", type=datetime.date.fromisoformat)
    args = parser.parse_args()
    try:
        if args.action == "ingest":
            from project_scope import private_read
            job = json.loads(private_read(args.job)) if args.job else None
            result = ingest(args.transcript, args.session_id, args.parser, job)
        else:
            result = reflect(args.start, args.end)
        print(json.dumps(result, ensure_ascii=False))
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError, urllib.error.URLError):
        print("Hindsight operation failed; inspect the private inputs and service status.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
