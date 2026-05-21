#!/usr/bin/env bash
set -euo pipefail

CODEX_DIR="${CODEX_HOME:-$HOME/.codex}"
MEM_DIR="$CODEX_DIR/memories"

if [ ! -d "$MEM_DIR" ]; then
  echo "No memories directory found at: $MEM_DIR"
  exit 1
fi

BACKUP_DIR="$CODEX_DIR/memories.backup.$(date +%Y%m%d-%H%M%S)"

if [ -e "$BACKUP_DIR" ]; then
  echo "Backup path already exists: $BACKUP_DIR" >&2
  exit 1
fi

cp -a "$MEM_DIR" "$BACKUP_DIR"
echo "Backup created at $BACKUP_DIR"
