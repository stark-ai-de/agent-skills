"""Build the digest-pinned upstream 1.2.1 Codex parser; preview by default."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import urllib.request

BASE = "https://raw.githubusercontent.com/vectorize-io/hindsight/v1.2.1/hindsight-integrations/coding-agents/src/core/"
SOURCES = {
    "transcript-codex.ts": "c29043fd4f052a620571bbfaee2eb6e4a9be8a3bc74ec385a903229da2f9b5d0",
    "jsonl.ts": "0fa4e3fcdaafae689fcdf24c54f0da301709e1d585e4084d2c855ffa8f41af27",
    "transcript-util.ts": "337a159f9ad2cc74762199f778dc3da3fd886392ad961ae58889af67bb94cba1",
}


def build(output, esbuild="esbuild", apply=False):
    output = Path(output)
    if not output.is_absolute() or output.exists() or any(p.is_symlink() for p in [output, *output.parents]):
        raise ValueError("Choose a new absolute output without symlinks")
    if not apply:
        return {"status": "planned", "version": "1.2.1", "sources": SOURCES, "output": str(output)}
    with tempfile.TemporaryDirectory(prefix="hindsight-parser-") as directory:
        root = Path(directory)
        for name, expected in SOURCES.items():
            with urllib.request.urlopen(BASE + name, timeout=30) as response:
                raw = response.read(1048577)
            if len(raw) > 1048576 or hashlib.sha256(raw).hexdigest() != expected:
                raise ValueError("Upstream parser digest mismatch")
            (root / name).write_bytes(raw)
        subprocess.run([esbuild, "transcript-codex.ts", "--bundle", "--platform=node", "--format=cjs", "--target=node18", "--outfile=parser.cjs"],
                       cwd=root, check=True, capture_output=True, timeout=30)
        raw = (root / "parser.cjs").read_bytes()
        fd = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o644)
        with os.fdopen(fd, "wb") as stream:
            stream.write(raw)
    return {"status": "built", "version": "1.2.1", "sha256": hashlib.sha256(raw).hexdigest()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--esbuild", default="esbuild")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    try:
        print(json.dumps(build(args.output, args.esbuild, args.apply)))
        return 0
    except (OSError, ValueError, subprocess.SubprocessError):
        print(json.dumps({"status": "failed", "reason": "Parser build failed; no unverified parser was adopted."}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
