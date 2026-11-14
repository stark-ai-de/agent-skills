#!/usr/bin/env python3
"""Run the approved project import queue and weekly Hindsight reflection."""

import argparse
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import stat
import subprocess
import sys
import tempfile
from zoneinfo import ZoneInfo

from project_scope import project_directory


SESSION_ID = re.compile(r"^[0-9a-fA-F-]{36}$")


def private_token(path):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(fd, encoding="utf-8") as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o600:
            raise ValueError("runtime environment permissions")
        tokens = []
        for line in stream:
            key, separator, value = line.rstrip().partition("=")
            if separator and key == "HINDSIGHT_API_TENANT_API_KEY":
                parts = shlex.split(value)
                if len(parts) != 1:
                    raise ValueError("runtime credential")
                tokens.append(parts[0])
        if len(tokens) != 1 or not tokens[0]:
            raise ValueError("runtime credential")
        return tokens[0]


def atomic_write(path, contents):
    fd, temporary = tempfile.mkstemp(prefix=".hindsight-", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            stream.write(contents)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def validate_record(record, home, cutoff, scope=None):
    session_id = record["session_id"]
    if not SESSION_ID.fullmatch(session_id):
        raise ValueError("session id")
    transcript = Path(record["transcript_path"]).resolve(strict=True)
    transcript.relative_to((Path(scope["sessionsRoot"]) if scope else home / ".codex/sessions").resolve(strict=True))
    if not transcript.is_file():
        raise ValueError("transcript")
    with transcript.open(encoding="utf-8") as stream:
        header = json.loads(stream.readline())
    meta = header["payload"]
    project = (Path(scope["projectRoot"]) if scope else home / "dev/greppy").resolve(strict=True)
    project_directory(meta["cwd"], project)
    started = datetime.datetime.fromisoformat(meta["timestamp"].replace("Z", "+00:00"))
    if header.get("type") != "session_meta" or meta.get("id") != session_id or meta.get("source") != "cli" or started.tzinfo is None or started < cutoff:
        raise ValueError("session scope")
    return transcript


def call_worker(args, token, action, extra, transcript=None):
    scope = getattr(args, "memory_scope", None)
    if scope:
        from project_scope import load, active
        if load(args.policy) != scope:
            raise ValueError("project policy changed during the batch")
        if scope["consent"]["contentScope"] != "codex-session-content":
            raise ValueError("session content is not authorized")
        if active(scope, args.docker) != args.memory_cutoff:
            raise ValueError("project grant changed during the batch")
    command = [args.docker, "compose", "-f", args.compose, "run", "--rm", "--no-deps", "-T",
        "--user", f"{os.getuid()}:{os.getgid()}",
        "--volume", f"{args.worker}:/hindsight/worker.py:ro",
        "--volume", f"{args.parser}:/hindsight/parser.cjs:ro",
        "--env", "HINDSIGHT_API_TENANT_API_KEY"]
    if transcript is not None:
        command.extend(["--volume", f"{transcript}:/hindsight/transcript.jsonl:ro"])
    if scope:
        command.extend(["--env", "HINDSIGHT_MEMORY_BANK_API"])
    command.extend(["weekly", action, *extra])
    env = dict(os.environ)
    env["HINDSIGHT_API_TENANT_API_KEY"] = token
    if scope:
        env["HINDSIGHT_MEMORY_BANK_API"] = scope["endpoint"].rstrip("/") + "/v1/default/banks/" + scope["bankId"]
    result = subprocess.run(command, env=env, capture_output=True, text=True, timeout=1800)
    if result.returncode:
        raise ValueError("weekly worker failed")
    return json.loads(result.stdout)


def render_report(start, end, patterns):
    lines = [f"# Greppy-Rückblick {start} bis {end}", ""]
    if not patterns:
        lines.append("Für wiederkehrende Muster liegen nicht genügend zuordenbare Belege vor.")
    for pattern in patterns:
        finding = pattern["finding"]
        lines.extend([f"## {finding['summary']}", "", f"Gegenbelege: {finding['counterevidence']}",
            f"Offene Fragen: {finding['open_questions']}", "", "Belege:"])
        for fact in pattern["facts"]:
            metadata = fact.get("metadata") or {}
            if metadata.get("session_id") in pattern["sessions"]:
                lines.append(f"- Sitzung {metadata['session_id']}, Fakt {fact.get('id')}: {fact.get('text', '')}")
        lines.append("")
    return "\n".join(lines) + "\n"


def run(args):
    home = Path.home()
    scope = None
    if getattr(args, "policy", None):
        from project_scope import load, active
        scope = load(args.policy)
        if scope["consent"]["contentScope"] != "codex-session-content":
            raise ValueError("session content is not authorized")
        cutoff = active(scope, args.docker)
        args.memory_scope = scope
        args.memory_cutoff = cutoff
    state = Path(scope["stateRoot"]) if scope else home / ".local/state/hindsight-greppy"
    state.mkdir(parents=True, exist_ok=True, mode=0o700)
    if not scope:
        cutoff = datetime.datetime.fromisoformat((state / "pilot-start").read_text().strip().replace("Z", "+00:00"))
    if cutoff.tzinfo is None:
        raise ValueError("pilot start has no timezone")
    token = private_token(Path(scope["runtimeEnv"]) if scope else home / ".config/hindsight-greppy/runtime.env")
    queue = state / "queue"
    queue.mkdir(exist_ok=True, mode=0o700)
    ledger_path = state / "imported.json"
    ledger = json.loads(ledger_path.read_text()) if ledger_path.exists() else {}
    failed = False
    for record_path in sorted(queue.glob("*.json")):
        try:
            original = record_path.read_bytes()
            record = json.loads(original)
            transcript = validate_record(record, home, cutoff, scope)
            digest = hashlib.sha256(transcript.read_bytes()).hexdigest()
            if ledger.get(record["session_id"]) != digest:
                result = call_worker(args, token, "ingest", ["--transcript", "/hindsight/transcript.jsonl", "--session-id", record["session_id"]], transcript)
                if result != {"session_id": record["session_id"], "sha256": digest}:
                    raise ValueError("transcript changed during import")
                ledger[record["session_id"]] = digest
                atomic_write(ledger_path, json.dumps(ledger, sort_keys=True) + "\n")
            locks = state / "locks"
            locks.mkdir(exist_ok=True, mode=0o700)
            with (locks / f"{record['session_id']}.lock").open("a") as lock:
                os.chmod(lock.name, 0o600)
                fcntl.flock(lock, fcntl.LOCK_EX)
                if record_path.read_bytes() == original and hashlib.sha256(transcript.read_bytes()).hexdigest() == digest:
                    record_path.unlink()
                else:
                    failed = True
        except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError):
            failed = True
            print("A queued session remains pending.", file=sys.stderr)
    if failed or any(queue.glob("*.json")):
        raise ValueError("pending imports")
    today = datetime.datetime.now(ZoneInfo("Europe/Berlin")).date()
    end = today - datetime.timedelta(days=today.weekday())
    start = end - datetime.timedelta(days=7)
    year, week, _ = start.isocalendar()
    reports = state / "reflections"
    reports.mkdir(exist_ok=True, mode=0o700)
    report = reports / f"{year}-W{week:02}.md"
    if not report.exists():
        patterns = call_worker(args, token, "reflect", ["--start", start.isoformat(), "--end", end.isoformat()])
        atomic_write(report, render_report(start, end, patterns))


def main():
    parser = argparse.ArgumentParser()
    for name in ("docker", "compose", "worker", "parser"):
        parser.add_argument("--" + name, required=True)
    parser.add_argument("--policy", type=Path)
    args = parser.parse_args()
    try:
        if args.policy:
            from project_scope import load, active
            scope = load(args.policy)
            active(scope, args.docker)
            state = Path(scope["stateRoot"])
        else:
            state = Path.home() / ".local/state/hindsight-greppy"
        state.mkdir(parents=True, exist_ok=True, mode=0o700)
        with (state / "weekly.lock").open("a") as lock:
            os.chmod(lock.name, 0o600)
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            run(args)
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError):
        print("Hindsight weekly run did not complete; queued sessions were preserved.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
