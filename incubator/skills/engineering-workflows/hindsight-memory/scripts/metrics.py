#!/usr/bin/env python3
"""Capture content-free Hindsight LLM counters for an isolated comparison."""

import argparse
from collections import defaultdict
import datetime
import json
import math
import os
from pathlib import Path
import re
import stat
import sys
import urllib.request


METRICS = {
    "hindsight_llm_calls_total": "calls",
    "hindsight_llm_tokens_input_tokens_total": "input_tokens",
    "hindsight_llm_tokens_output_tokens_total": "output_tokens",
    "hindsight_llm_tokens_cached_input_tokens_total": "cached_input_tokens",
    "hindsight_llm_tokens_thoughts_tokens_total": "thoughts_tokens",
}
SAMPLE = re.compile(r'^([a-zA-Z_:][a-zA-Z0-9_:]*)\{(.*)\} ([^ ]+)(?: .*)?$')
LABEL = re.compile(r'([a-zA-Z_][a-zA-Z0-9_]*)="((?:\\.|[^"\\])*)"')


def parse(text):
    start = None
    series = {}
    for line in text.splitlines():
        if line.startswith("process_start_time_seconds "):
            start = float(line.split()[1])
            continue
        sample = SAMPLE.fullmatch(line)
        if not sample or sample[1] not in METRICS:
            continue
        labels = {key: json.loads('"' + value + '"') for key, value in LABEL.findall(sample[2])}
        if not all(name in labels for name in ("provider", "model", "scope", "success")):
            raise ValueError("missing metric labels")
        value = float(sample[3])
        if not math.isfinite(value) or value < 0:
            raise ValueError("invalid counter")
        identity = json.dumps([sample[1], sorted(labels.items())], separators=(",", ":"))
        if identity in series:
            raise ValueError("duplicate series")
        series[identity] = value
    if start is None or not math.isfinite(start):
        raise ValueError("missing process start")
    return {"process_start": start, "captured_at": datetime.datetime.now(datetime.timezone.utc).isoformat(), "series": series}


def difference(before, after):
    if before["process_start"] != after["process_start"]:
        raise ValueError("service restarted")
    first = datetime.datetime.fromisoformat(before["captured_at"])
    last = datetime.datetime.fromisoformat(after["captured_at"])
    if first.tzinfo is None or last.tzinfo is None or last < first:
        raise ValueError("snapshot order")
    if before["series"].keys() - after["series"].keys():
        raise ValueError("counter disappeared")
    result = defaultdict(lambda: defaultdict(float))
    for identity, current in after["series"].items():
        name, label_pairs = json.loads(identity)
        labels = dict(label_pairs)
        delta = current - before["series"].get(identity, 0)
        if not math.isfinite(delta) or delta < 0:
            raise ValueError("counter reset")
        if delta:
            key = tuple(labels[k] for k in ("provider", "model", "scope", "success"))
            result[key][METRICS[name]] += delta
    return [{"provider": key[0], "model": key[1], "scope": key[2], "success": key[3], **values}
            for key, values in sorted(result.items())]


def read_private(path):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(fd, encoding="utf-8") as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o600:
            raise ValueError("snapshot permissions")
        return json.load(stream)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("snapshot", "diff"))
    parser.add_argument("paths", nargs="+", type=Path)
    args = parser.parse_args()
    try:
        if args.action == "snapshot" and len(args.paths) == 1:
            opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
            with opener.open("http://127.0.0.1:18888/metrics", timeout=10) as response:
                data = response.read(4_000_001)
            if len(data) > 4_000_000:
                raise ValueError("metrics response too large")
            snapshot = parse(data.decode("utf-8"))
            fd = os.open(args.paths[0], os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
            with os.fdopen(fd, "w", encoding="utf-8") as stream:
                json.dump(snapshot, stream)
                stream.write("\n")
        elif args.action == "diff" and len(args.paths) == 2:
            print(json.dumps(difference(read_private(args.paths[0]), read_private(args.paths[1])), indent=2))
        else:
            raise ValueError("arguments")
    except (OSError, ValueError, TypeError, KeyError):
        print("Hindsight metric measurement failed; review the service and snapshots.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
