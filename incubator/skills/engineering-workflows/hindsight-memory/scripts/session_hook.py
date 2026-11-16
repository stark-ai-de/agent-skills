#!/usr/bin/env python3
"""Quick local checkpoints for approved Codex/pi sessions; never call a service."""

import argparse
import datetime
import subprocess
import fcntl
import json
import os
from pathlib import Path
import re
import sys
import tempfile

from project_scope import project_directory
from session_parser import SESSION_ID, read_header, timestamp


def queue_session(event, home, policy_path=None, workspace_policy_path=None):
    home = Path(home)
    checkpoint_at = datetime.datetime.now(datetime.timezone.utc)
    scope = None
    mapping = None
    if policy_path and workspace_policy_path:
        return False
    if (os.environ.get("HINDSIGHT_MEMORY_DISABLED") == "1" or event.get("memory_disabled") is True
            or event.get("is_subagent") is True or event.get("hook_event_name") not in {"SessionEnd", "Stop"}):
        return False
    source = event.get("source", "codex")
    if source not in {"codex", "pi"}:
        return False
    if workspace_policy_path:
        import workspace_scope
        try:
            scope = workspace_scope.load(workspace_policy_path)
            cutoff = workspace_scope.local_active(scope)
            transcript = workspace_scope.transcript_path(scope, source, event["transcript_path"])
            meta = read_header(transcript, source)
            if not cutoff <= timestamp(meta["timestamp"]) <= checkpoint_at:
                return False
            mapping = workspace_scope.resolve(scope, event["cwd"], register=True)
            if workspace_scope.resolve(scope, meta["cwd"]) != mapping:
                return False
        except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError):
            return False
    if policy_path:
        from project_scope import load, local_active
        try:
            scope = load(policy_path)
            if scope["consent"]["contentScope"] != "codex-session-content" or source != "codex":
                return False
            cutoff = local_active(scope)
        except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError):
            return False
    state = Path(scope["stateRoot"]) if scope else home / ".local/state/hindsight-greppy"
    start_file = state / "pilot-start"
    if not scope and not start_file.is_file():
        return False
    session_id = event.get("session_id")
    if not isinstance(session_id, str) or not SESSION_ID.fullmatch(session_id):
        return False
    try:
        if not workspace_policy_path:
            if source != "codex":
                return False
            project = (Path(scope["projectRoot"]) if scope else home / "dev/greppy").resolve(strict=True)
            project_directory(event["cwd"], project)
            original = Path(event["transcript_path"])
            if original.is_symlink():
                return False
            transcript = original.resolve(strict=True)
            transcript.relative_to((Path(scope["sessionsRoot"]) if scope else home / ".codex/sessions").resolve(strict=True))
            meta = read_header(transcript, source)
            project_directory(meta["cwd"], project)
        if meta["session_id"] != session_id:
            return False
        started = timestamp(meta["timestamp"])
        if not scope:
            cutoff = datetime.datetime.fromisoformat(start_file.read_text().strip().replace("Z", "+00:00"))
        if started.tzinfo is None or cutoff.tzinfo is None or started < cutoff:
            return False
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError):
        return False

    queue = state / "queue"
    queue.mkdir(parents=True, exist_ok=True, mode=0o700)
    record = {"session_id": session_id, "transcript_path": str(transcript)}
    if scope:
        record.update(schemaVersion=2, source=source, byte_length=meta["byte_length"],
                      enabled_at=cutoff.isoformat(), checkpoint_at=checkpoint_at.isoformat(),
                      completion_status=event.get("completion_status", "checkpoint"))
        if source == "pi" and event.get("leaf_id") is not None:
            if not isinstance(event["leaf_id"], str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", event["leaf_id"]):
                return False
            record["leaf_id"] = event["leaf_id"]
        if mapping:
            record["repository"] = mapping
    queue_id = source + "-" + session_id if scope else session_id
    if mapping:
        import hashlib
        queue_id = source + "-" + hashlib.sha256((mapping["repoId"] + "\n" + session_id).encode()).hexdigest()
    locks = state / "locks"
    locks.mkdir(exist_ok=True, mode=0o700)
    fd = os.open(locks / f"{queue_id}.lock", os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, "a") as lock:
        os.chmod(lock.name, 0o600)
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        fd, temporary = tempfile.mkstemp(prefix=".queue-", dir=queue)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as stream:
                json.dump(record, stream)
                stream.write("\n")
            os.replace(temporary, queue / f"{queue_id}.json")
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    selected = parser.add_mutually_exclusive_group()
    selected.add_argument("--policy", type=Path)
    selected.add_argument("--workspace-policy", type=Path)
    args = parser.parse_args()
    event = {}
    try:
        raw = sys.stdin.buffer.read(65537)
        if len(raw) > 65536:
            raise ValueError("hook payload bound")
        event = json.loads(raw)
        if not isinstance(event, dict):
            raise ValueError("hook payload")
        queue_session(event, Path.home(), args.policy, args.workspace_policy)
    except (ValueError, OSError, TypeError, KeyError):
        print("hindsight session queue failed", file=sys.stderr)
    finally:
        # Codex Stop expects JSON success; never request another agent turn.
        if isinstance(event, dict) and event.get("hook_event_name") == "Stop":
            print("{}")


if __name__ == "__main__":
    main()
