# Backup Manifest Reconciliation

## Prompt

Use $codex-memory-curator to apply the two approved atomic memory edits and provide the execution receipt.

## Expected Behavior

- Triggers `codex-memory-curator` and uses a mutating route with authority for only the approved entries.
- Runs `backup-memories.mjs` with one exact `--include` per existing file that may change.
- Keeps the unredacted payload and manifest under the deterministic user-state root outside Git worktrees and outside the physical Codex memories tree, including for a project-local `CODEX_HOME`. Any unsafe `--backup-root`, including a derived or explicit root equal to or below that tree through a symlink alias, fails before root creation or copying, before discovery can include it, and cannot recursively re-include an earlier backup.
- Reports exact absolute backup and manifest paths only in non-persisted chat; a file-route record uses the script-reported `user-state/.../<backup-id>` or `external-root/<alias>/<backup-id>` storage locator and manifest-relative paths. Explicit roots require a stable non-sensitive alias.
- Treats any `--include` as exact-only mode; unrelated legacy-discovery files are not copied.
- Verifies `backup-manifest.json`, including each source-to-destination mapping, byte size, and SHA-256, before editing.
- Reconciles every actually changed path to exactly one manifest source entry in the execution receipt.
- Marks an approved new path `created-no-preimage` with rollback instead of claiming it was backed up.
- Stops before editing on a missing, duplicate, colliding, escaping, or integrity-mismatched manifest entry.
- Fails before backup-root creation instead of silently omitting a symlink found by zero-include legacy discovery, including a selected nested symlink or a source below a symlinked parent.
- Rejects a missing, unreadable, special, or traversal-failing selected path before backup-root creation.
- Recovers each pre-existing file only from its exact manifest `source`/`destination` row after verifying the copied `size` and `sha256`, verifies the restored file again, and rolls back `created-no-preimage` paths separately.

## Fixture

- `fixtures/synthetic-codex-home/memories/MEMORY.md`
- `skills/codex-operations/codex-memory-curator/assets/review-report-template.md`
