#!/usr/bin/env bash
set -euo pipefail

CODEX_DIR="${CODEX_HOME:-$HOME/.codex}"
MEM_DIR="$CODEX_DIR/memories"

echo "Codex home: $CODEX_DIR"

if [ ! -d "$MEM_DIR" ]; then
  echo "No memories directory found at: $MEM_DIR"
  exit 0
fi

if ! find "$MEM_DIR" -maxdepth 2 -type f -print -quit 2>/dev/null | grep -q .; then
  echo "No memory files found under: $MEM_DIR"
  exit 0
fi

find "$MEM_DIR" -maxdepth 2 -type f -print0 \
  | xargs -0 -r ls -lh 2>/dev/null \
  | awk '{print $5, $6, $7, $8, $9}'
