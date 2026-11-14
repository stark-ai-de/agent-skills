#!/usr/bin/env python3
"""Queue eligible Codex session references for the Hindsight weekly job."""

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


SESSION_ID = re.compile(r"^[0-9a-fA-F-]{36}$")


def queue_session(event, home, policy_path=None):
    home = Path(home)
    scope = None
    if policy_path:
        from project_scope import load, active
        try:
            scope = load(policy_path)
            if scope["consent"]["contentScope"] != "codex-session-content":
                return False
            cutoff = active(scope)
        except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError):
            return False
    state = Path(scope["stateRoot"]) if scope else home / ".local/state/hindsight-greppy"
    start_file = state / "pilot-start"
    if not scope and not start_file.is_file():
        return False
    if event.get("hook_event_name") != "SessionEnd":
        return False
    session_id = event.get("session_id")
    if not isinstance(session_id, str) or not SESSION_ID.fullmatch(session_id):
        return False
    try:
        project = (Path(scope["projectRoot"]) if scope else home / "dev/greppy").resolve(strict=True)
        project_directory(event["cwd"], project)
        transcript = Path(event["transcript_path"]).resolve(strict=True)
        transcript.relative_to((Path(scope["sessionsRoot"]) if scope else home / ".codex/sessions").resolve(strict=True))
        if not transcript.is_file():
            return False
        with transcript.open(encoding="utf-8") as stream:
            header = json.loads(stream.readline())
        meta = header["payload"]
        if header.get("type") != "session_meta" or meta.get("source") != "cli":
            return False
        if meta.get("id") != session_id:
            return False
        project_directory(meta["cwd"], project)
        started = datetime.datetime.fromisoformat(meta["timestamp"].replace("Z", "+00:00"))
        if not scope:
            cutoff = datetime.datetime.fromisoformat(start_file.read_text().strip().replace("Z", "+00:00"))
        if started.tzinfo is None or cutoff.tzinfo is None or started < cutoff:
            return False
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError):
        return False

    queue = state / "queue"
    queue.mkdir(parents=True, exist_ok=True, mode=0o700)
    record = {"session_id": session_id, "transcript_path": str(transcript)}
    locks = state / "locks"
    locks.mkdir(exist_ok=True, mode=0o700)
    with (locks / f"{session_id}.lock").open("a") as lock:
        os.chmod(lock.name, 0o600)
        fcntl.flock(lock, fcntl.LOCK_EX)
        fd, temporary = tempfile.mkstemp(prefix=".queue-", dir=queue)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as stream:
                json.dump(record, stream)
                stream.write("\n")
            os.replace(temporary, queue / f"{session_id}.json")
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--policy", type=Path)
    args = parser.parse_args()
    try:
        event = json.load(sys.stdin)
        queue_session(event, Path.home(), args.policy)
    except (ValueError, OSError, TypeError):
        print("hindsight session queue failed", file=sys.stderr)


if __name__ == "__main__":
    main()
