#!/usr/bin/env bash
set -euo pipefail

CODEX_DIR="${CODEX_HOME:-$HOME/.codex}"
MEM_DIR="$CODEX_DIR/memories"

if [ ! -d "$MEM_DIR" ]; then
  echo "No memories directory found at: $MEM_DIR"
  exit 0
fi

grep -RInEi \
  "always|never|must|token|secret|password|api[_-]?key|private key|branch|temporary|one-off|todo|localhost|apps/|packages/" \
  "$MEM_DIR" \
  2>/dev/null || true
