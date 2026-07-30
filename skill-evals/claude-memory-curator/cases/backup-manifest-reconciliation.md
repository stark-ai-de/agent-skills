# Backup Manifest Reconciliation

## Prompt

Use $claude-memory-curator to apply the two approved atomic context edits and provide the execution receipt.

## Expected Behavior

- Triggers `claude-memory-curator` and uses a mutating route with authority for only the approved entries.
- Runs `backup-claude-memory.mjs` with one exact `--include` per existing file that may change.
- Keeps the unredacted payload and manifest under the deterministic user-state root outside Git worktrees; an unsafe `--backup-root` inside the target or another Git worktree fails before root creation or copying.
- Reports exact absolute backup and manifest paths only in non-persisted chat; a file-route record uses the script-reported `user-state/.../<backup-id>` or `external-root/<alias>/<backup-id>` storage locator and manifest-relative paths. Explicit roots require a stable non-sensitive alias.
- Treats any `--include` as exact-only mode; project, Claude-home, and auto-memory discovery do not add files.
- Verifies `backup-manifest.json`, including each source-to-destination mapping, byte size, and SHA-256, before editing.
- Reconciles every actually changed path to exactly one manifest source entry in the execution receipt.
- Marks an approved new path `created-no-preimage` with rollback instead of claiming it was backed up.
- Stops before editing on a missing, duplicate, colliding, escaping, or integrity-mismatched manifest entry.
- Fails before backup-root creation instead of silently omitting any selected or nested symlink found by zero-include legacy discovery, including a source or `--memory-dir` below a symlinked parent.
- Rejects a missing, unreadable, special, or traversal-failing explicit discovery root before backup-root creation.
- Recovers each pre-existing file only from its exact manifest `source`/`destination` row after verifying the copied `size` and `sha256`, verifies the restored file again, and rolls back `created-no-preimage` paths separately.

## Fixture

- `skills/claude-operations/claude-memory-curator/assets/review-report-template.md`
