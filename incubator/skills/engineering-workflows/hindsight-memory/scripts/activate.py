#!/usr/bin/env python3
"""Enable the pilot after recording the agreed manual comparison results."""

import argparse
import datetime
import json
import os
from pathlib import Path
import shlex
import stat
import sys


def activate(home, evidence_path):
    fd = os.open(evidence_path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(fd, encoding="utf-8") as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o600:
            raise ValueError("evidence permissions")
        evidence = json.load(stream)
    cases = evidence["cases"]
    if (evidence["embedding_dimensions"] != 1024 or evidence["bilingual_retrieval"] is not True
            or not (evidence.get("model_route_reviewed") is True
                    or evidence.get("model_route_privacy_accepted") is True) or len(cases) != 6
            or {case["kind"] for case in cases} != {"recall", "reflect"}
            or any(not isinstance(case["id"], str) or not case["id"].strip() for case in cases)
            or len({case["id"] for case in cases}) != 6
            or any(type(case[key]) is not bool for case in cases for key in ("hindsight_correct", "baseline_correct", "false_recurrence"))
            or any(case["false_recurrence"] for case in cases)):
        raise ValueError("qualification incomplete")
    score = sum(case["hindsight_correct"] for case in cases)
    if score < 5:
        raise ValueError("accuracy threshold")
    config = Path(home) / ".config/hindsight-greppy/runtime.env"
    fd = os.open(config, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(fd, encoding="utf-8") as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o600:
            raise ValueError("runtime permissions")
        providers = [shlex.split(value) for line in stream for key, sep, value in [line.rstrip().partition("=")] if sep and key == "HINDSIGHT_API_LLM_PROVIDER"]
        if len(providers) != 1 or providers[0] not in (["openai-codex"], ["openai-responses"], ["ollama"]):
            raise ValueError("model provider")
    state = Path(home) / ".local/state/hindsight-greppy"
    state.mkdir(parents=True, exist_ok=True, mode=0o700)
    info = state.lstat()
    if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) & 0o077:
        raise ValueError("state permissions")
    target = state / "pilot-start"
    fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as stream:
        stream.write(datetime.datetime.now(datetime.timezone.utc).isoformat() + "\n")
    return target


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--evidence", required=True, type=Path)
    args = parser.parse_args()
    try:
        activate(Path.home(), args.evidence)
    except (OSError, ValueError, KeyError, TypeError):
        print("Pilot not activated: evidence, permissions or thresholds need review.", file=sys.stderr)
        return 1
    print("Pilot activated. Only new eligible Greppy CLI sessions will be queued.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
