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
import time
import uuid
from zoneinfo import ZoneInfo

from project_scope import project_directory
from session_parser import SESSION_ID, parse as parse_session, read_header, snapshot, timestamp


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
    if scope and scope.get("kind") == "hindsight-workspace":
        import workspace_scope
        source = record["source"]
        transcript = workspace_scope.transcript_path(scope, source, record["transcript_path"])
        meta = read_header(transcript, source)
        if (record.get("schemaVersion") != 2 or meta["session_id"] != session_id
                or timestamp(meta["timestamp"]) < cutoff or record.get("enabled_at") != cutoff.isoformat()
                or timestamp(record["checkpoint_at"]) < timestamp(meta["timestamp"])
                or workspace_scope.resolve(scope, meta["cwd"]) != record.get("repository")):
            raise ValueError("workspace session binding changed")
        return transcript
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
    state = Path(getattr(args, "memory_state", scope["stateRoot"] if scope else Path.home() / ".local/state/hindsight-greppy"))
    if (state / "worker-cleanup-required.json").exists():
        raise ValueError("prior owned-container cleanup requires review before dispatch")
    if scope:
        if scope.get("kind") == "hindsight-workspace":
            from workspace_scope import load, active
            policy_path = args.workspace_policy
        else:
            from project_scope import load, active
            policy_path = args.policy
        if load(policy_path) != scope:
            raise ValueError("project policy changed during the batch")
        if scope["consent"]["contentScope"] not in {"codex-session-content", "compact-session-outcomes"}:
            raise ValueError("session content is not authorized")
        if active(scope, args.docker) != args.memory_cutoff:
            raise ValueError("project grant changed during the batch")
    container_name = "hindsight-worker-" + uuid.uuid4().hex
    command = [args.docker, "compose", "-f", args.compose, "run", "--rm", "--no-deps", "-T", "--name", container_name,
        "--user", f"{os.getuid()}:{os.getgid()}",
        "--volume", f"{args.worker}:/hindsight/worker.py:ro",
        "--volume", f"{Path(args.worker).parent}:/hindsight/helpers:ro",
        "--env", "PYTHONPATH=/hindsight/helpers",
        "--env", "HINDSIGHT_API_TENANT_API_KEY"]
    if getattr(args, "parser", None):
        command.extend(["--volume", f"{args.parser}:/hindsight/parser.cjs:ro"])
    if transcript is not None:
        command.extend(["--volume", f"{transcript}:/hindsight/transcript.jsonl:ro"])
    if scope:
        command.extend(["--env", "HINDSIGHT_MEMORY_BANK_API"])
    env = dict(os.environ)
    env["HINDSIGHT_API_TENANT_API_KEY"] = token
    if scope:
        env["HINDSIGHT_MEMORY_BANK_API"] = scope["endpoint"].rstrip("/") + "/v1/default/banks/" + getattr(args, "memory_bank", scope.get("bankId", ""))
    remaining = getattr(args, "deadline", time.monotonic() + 1800) - time.monotonic()
    if remaining <= 0:
        raise ValueError("batch time budget exhausted")
    with tempfile.TemporaryDirectory(prefix="hindsight-job-") as directory:
        job = getattr(args, "memory_job", None) if action == "ingest" else None
        if job is not None:
            job_path = Path(directory) / "job.json"
            job_path.write_text(json.dumps(job))
            job_path.chmod(0o600)
            command.extend(["--volume", f"{job_path}:/hindsight/job.json:ro"])
            extra = [*extra, "--job", "/hindsight/job.json"]
        command.extend(["weekly", action, *extra])
        try:
            result = subprocess.run(command, env=env, capture_output=True, text=True, timeout=min(1800, remaining))
        except subprocess.TimeoutExpired:
            cleaned = False
            try:
                cleanup = subprocess.run([args.docker, "rm", "--force", container_name], capture_output=True, text=True, timeout=5)
                cleaned = cleanup.returncode == 0
            except (OSError, subprocess.SubprocessError):
                pass
            if not cleaned:
                state = Path(getattr(args, "memory_state", scope["stateRoot"] if scope else Path.home() / ".local/state/hindsight-greppy"))
                state.mkdir(parents=True, exist_ok=True, mode=0o700)
                atomic_write(state / "worker-cleanup-required.json", json.dumps({"container": container_name}) + "\n")
            raise ValueError("worker timed out; owned-container cleanup requires review" if not cleaned else "worker timed out and was stopped") from None
    if result.returncode:
        raise ValueError("weekly worker failed")
    return json.loads(result.stdout)


def render_report(start, end, patterns):
    lines = [f"# Projekt-Rückblick {start} bis {end}", ""]
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
    workspace_path = getattr(args, "workspace_policy", None)
    if workspace_path:
        from workspace_scope import load, active
        if not Path(workspace_path).exists():
            return {"status": "inactive", "reason": "workspace policy is absent"}
        scope = load(workspace_path)
        if not scope["enabled"]:
            return {"status": "inactive", "reason": "workspace memory is disabled"}
        cutoff = active(scope, args.docker)
        args.memory_scope = scope
        args.memory_cutoff = cutoff
    elif getattr(args, "policy", None):
        from project_scope import load, active
        scope = load(args.policy)
        if scope["consent"]["contentScope"] != "codex-session-content":
            raise ValueError("session content is not authorized")
        cutoff = active(scope, args.docker)
        args.memory_scope = scope
        args.memory_cutoff = cutoff
    state = Path(scope["stateRoot"]) if scope else home / ".local/state/hindsight-greppy"
    state.mkdir(parents=True, exist_ok=True, mode=0o700)
    if (state / "worker-cleanup-required.json").exists():
        raise ValueError("prior owned-container cleanup requires review before retry")
    if args is not None:
        args.memory_state = state
    if not scope:
        cutoff = datetime.datetime.fromisoformat((state / "pilot-start").read_text().strip().replace("Z", "+00:00"))
    if cutoff.tzinfo is None:
        raise ValueError("pilot start has no timezone")
    token = private_token(Path(scope["runtimeEnv"]) if scope else home / ".config/hindsight-greppy/runtime.env")
    queue = state / "queue"
    queue.mkdir(exist_ok=True, mode=0o700)
    ledger_path = state / "imported.json"
    from project_scope import private_read
    ledger = json.loads(private_read(ledger_path)) if ledger_path.exists() else {}
    failed = False
    mode = getattr(args, "mode", "weekly")
    maximum = getattr(args, "max_sessions", 8)
    attempted = 0
    counts = {"retained_outcomes": 0, "no_new_outcomes": 0, "unchanged_sessions": 0}
    if args is not None:
        args.deadline = time.monotonic() + getattr(args, "max_seconds", 240 if mode == "intake" else 1800)
    for record_path in sorted(queue.glob("*.json"), key=lambda path: (path.stat().st_mtime_ns, path.name)):
        if attempted >= maximum or (args is not None and time.monotonic() >= args.deadline):
            break
        attempted += 1
        try:
            original = record_path.read_bytes()
            record = json.loads(original)
            transcript = validate_record(record, home, cutoff, scope)
            # The hook records a dirty reference, not an immutable terminal size.
            # Admit the latest complete prefix, preserving an unfinished tail for retry.
            raw = snapshot(transcript, complete_only=True)
            digest = hashlib.sha256(raw).hexdigest()
            ledger_key = record_path.stem
            previous = ledger.get(ledger_key)
            bank = record.get("repository", {}).get("bankId", scope.get("bankId", "greppy") if scope else "greppy")
            known = previous.get("outcome_ids", []) if isinstance(previous, dict) and previous.get("bankId") == bank else []
            pending = isinstance(previous, dict) and previous.get("pending_outcomes", 0) > 0
            already = previous.get("sha256") if isinstance(previous, dict) else previous
            checkpoint = {key: record[key] for key in ("checkpoint_at", "leaf_id", "completion_status") if key in record}
            checkpoint_changed = bool(checkpoint) and (not isinstance(previous, dict) or previous.get("checkpoint") != checkpoint)
            if already != digest or pending or checkpoint_changed:
                if args is not None:
                    args.memory_bank = bank
                    args.memory_job = {key: record[key] for key in ("source", "leaf_id", "repository", "completion_status", "checkpoint_at") if key in record}
                    args.memory_job.update(byte_length=len(raw), known_outcomes=known)
                    if workspace_path:
                        from workspace_scope import git_run
                        root = record["repository"]["worktreeRoot"]
                        args.memory_job["provenance_observed_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
                        for name, command in (("commit_at_intake", ["rev-parse", "--verify", "HEAD"]), ("branch_at_intake", ["symbolic-ref", "--short", "-q", "HEAD"])):
                            info = git_run(root, command, check=False)
                            if info.returncode == 0 and len(info.stdout) <= 512:
                                args.memory_job[name] = info.stdout.strip()
                result = call_worker(args, token, "ingest", ["--transcript", "/hindsight/transcript.jsonl", "--session-id", record["session_id"]], transcript)
                if result.get("session_id") != record["session_id"] or result.get("sha256") != digest:
                    raise ValueError("transcript changed during import")
                if "outcome_ids" in result:
                    ids = result["outcome_ids"]
                    pending_count = result.get("pending_outcomes", 0)
                    if (not isinstance(ids, list) or len(ids) > 16 or any(not isinstance(item, str) or not re.fullmatch(r"[a-f0-9]{64}", item) for item in ids)
                            or type(pending_count) is not int or pending_count < 0):
                        raise ValueError("worker outcome acknowledgement")
                    ledger[ledger_key] = {"sha256": digest, "outcome_ids": sorted(set(known + ids)),
                                          "pending_outcomes": pending_count, "bankId": bank, "checkpoint": checkpoint,
                                          "repository": record.get("repository"), "session_id": record["session_id"]}
                    pending = pending_count > 0
                    counts["retained_outcomes"] += len(ids)
                    counts["no_new_outcomes"] += not ids
                else:
                    ledger[ledger_key] = digest  # Legacy worker acknowledgement compatibility.
                    pending = False
                atomic_write(ledger_path, json.dumps(ledger, sort_keys=True) + "\n")
            else:
                counts["unchanged_sessions"] += 1
            if pending:
                # Rotate partial records behind other sessions without losing their snapshot.
                os.utime(record_path, None)
                continue
            locks = state / "locks"
            locks.mkdir(exist_ok=True, mode=0o700)
            with (locks / f"{record_path.stem}.lock").open("a") as lock:
                os.chmod(lock.name, 0o600)
                fcntl.flock(lock, fcntl.LOCK_EX)
                if record_path.read_bytes() == original and hashlib.sha256(snapshot(transcript)).hexdigest() == digest:
                    record_path.unlink()
                else:
                    failed = True
        except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError):
            failed = True
            # Preserve poison/revoked records without starving later eligible sessions.
            if record_path.exists():
                os.utime(record_path, None)
            print("A queued session remains pending.", file=sys.stderr)
    if failed or any(queue.glob("*.json")):
        if mode == "intake":
            return {"status": "pending", "attempted": attempted, "failed": failed, **counts}
        raise ValueError("pending imports")
    if mode == "intake":
        return {"status": "complete", "attempted": attempted, **counts}
    today = datetime.datetime.now(ZoneInfo("Europe/Berlin")).date()
    end = today - datetime.timedelta(days=today.weekday())
    start = end - datetime.timedelta(days=7)
    year, week, _ = start.isocalendar()
    reports = state / "reflections"
    reports.mkdir(exist_ok=True, mode=0o700)
    banks = sorted({item["bankId"] for item in ledger.values() if isinstance(item, dict)}) if workspace_path else [None]
    for bank in banks:
        folder = reports / bank if bank else reports
        folder.mkdir(exist_ok=True, mode=0o700)
        report = folder / f"{year}-W{week:02}.md"
        if not report.exists():
            if bank:
                # Recheck current eligibility; a disabled repository cannot trigger reflection.
                from workspace_scope import resolve
                records = [item for item in ledger.values() if isinstance(item, dict) and item["bankId"] == bank]
                resolve(scope, records[0]["repository"]["projectRoot"])
                args.memory_bank = bank
            patterns = call_worker(args, token, "reflect", ["--start", start.isoformat(), "--end", end.isoformat()])
            atomic_write(report, render_report(start, end, patterns))
    return {"status": "complete", "attempted": attempted, **counts}


def main():
    parser = argparse.ArgumentParser()
    for name in ("docker", "compose", "worker"):
        parser.add_argument("--" + name, required=True)
    parser.add_argument("--parser", help="Legacy compatibility; compact parsing uses the bundled Python reader")
    selected = parser.add_mutually_exclusive_group()
    selected.add_argument("--policy", type=Path)
    selected.add_argument("--workspace-policy", type=Path)
    parser.add_argument("--mode", choices=("intake", "weekly"), default="weekly")
    parser.add_argument("--max-sessions", type=int, default=8)
    parser.add_argument("--max-seconds", type=int, default=240)
    args = parser.parse_args()
    try:
        if not 1 <= args.max_sessions <= 64 or not 1 <= args.max_seconds <= 3600:
            raise ValueError("batch bounds")
        if args.workspace_policy:
            from workspace_scope import load
            if not args.workspace_policy.exists():
                print(json.dumps({"status": "inactive", "reason": "workspace policy is absent"}))
                return 0
            scope = load(args.workspace_policy)
            if not scope["enabled"]:
                print(json.dumps({"status": "inactive", "reason": "workspace memory is disabled"}))
                return 0
            state = Path(scope["stateRoot"])
        elif args.policy:
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
            print(json.dumps(run(args)))
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError):
        print("Hindsight weekly run did not complete; queued sessions were preserved.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
