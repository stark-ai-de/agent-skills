# Safe Editing Procedure

Use this before modifying any Claude memory or instruction file.

## Route Authority Gate

Do not mutate unless the selected cleanup route is supported by an explicit user cleanup request for the exact Claude context scope. A direct cleanup route authorizes only high-confidence atomic changes. A plan-run route authorizes only the unchanged user-approved plan after the state recheck and Plan-mode exit. Do not add a generic second cleanup question after those gates.

Whole-file deletion, managed policy, destructive recovery, external actions, and scope expansion retain separate approval boundaries.

## Backup

Run the bundled script:

```bash
node scripts/backup-claude-memory.mjs --repo . --include PATH [--include PATH ...] [--backup-root PATH --backup-root-alias NAME]
```

Pass every file that may change as an exact repeatable `--include PATH`. Supplying any include selects exact mode and excludes project, Claude-home, and auto-memory discovery; zero includes retain that legacy discovery and may use `--claude-home` or `--memory-dir`. Exact paths must be readable regular files, and explicit discovery roots must exist and be readable. Any symlink path component, nested discovery symlink, unreadable directory, traversal failure, malformed discovered settings JSON, or present `autoMemoryDirectory` value that is not a non-empty string stops before backup-root creation. Only an absent `autoMemoryDirectory` key permits the documented derived per-project memory path. Before editing, verify that `backup-manifest.json` contains exactly one source entry for every intended changed file and that the copied size and SHA-256 match.

Unredacted backup payloads and their manifests must remain outside Git worktrees. The script defaults to a deterministic per-repository root below the portable user state directory (`XDG_STATE_HOME` when configured) and reports `outside-git-worktree`. Use `--backup-root PATH --backup-root-alias NAME` only for an external durable location and a stable non-sensitive operator-known alias; an override inside the target or any other Git worktree, a missing alias, or a path-like alias is rejected before root creation or copying. Verify the reported storage root and policy before editing, and never place a backup below the repository report directory.

Report exact absolute backup and manifest paths only in non-persisted chat. A file-route receipt persists the script-reported `user-state/agent-memory-curator-backups/claude/<identity-hash>/<backup-id>` or `external-root/<alias>/<backup-id>` storage locator, `<storage-locator>/backup-manifest.json`, and manifest-relative destinations; never copy absolute home, repository, source, or storage-root paths into a repository artifact.

Before editing, record the authorized entry IDs from the direct-cleanup set or approved plan. Do not edit an entry outside that set.

## Editing Rules

- Apply only changes authorized by the selected route and exact scope.
- Apply changes by entry ID from the review report or cleanup plan, not by broad pattern.
- Prefer the smallest edit that removes risk.
- Preserve existing file format, headings, frontmatter, imports, and ordering where practical.
- Do not edit managed policy files by default.
- Never delete the only copy of a context file.
- Do not print secrets or full sensitive values in diffs or summaries.
- If a line contains a real secret, remove or redact it after backup and tell the user to rotate it.
- Re-read each changed section after editing to verify the approved action was applied.

## Unknown Auto-Memory Schema

If an auto-memory topic file format is unclear, report:

```text
The Claude auto-memory file format is unclear. I will not edit it directly. I will defer proposed replacements in the current curation result.
```

Record replacement entries or deletion notes in chat or the single curation record. Do not create a sibling context file during direct cleanup.

## Diff

After approved edits, show only a trimmed diff or summarize the changed paths and actions. If the diff includes sensitive values, summarize the location and action instead of printing the value.

Reconcile the final changed-file set against the manifest. Stop and report the mismatch when any pre-existing changed file lacks exactly one manifest entry or any manifest source was outside the approved edit set. Mark an approved new path `created-no-preimage`, record its rollback, and never describe it as backed up.

Include the approved entry IDs in the summary:

```text
Applied: C-2 MOVE TO CLAUDE RULE, C-6 DELETE
Skipped: C-4 ASK USER
Manual: C-7 MOVE TO MANAGED POLICY
```

## Recovery

- If backup creation fails, do not edit.
- For each pre-existing changed file, locate the one manifest row whose `source` is that file. Before restore, verify that its copied `destination` still matches the recorded `size` and `sha256`; restore that file preimage only to the row's exact `source`, then verify the restored size and SHA-256 again.
- A `created-no-preimage` path has no backup. Roll it back separately according to the approved plan; never restore it from another manifest row.
- If manifest lookup, backup verification, restore, or restored-file verification fails, stop immediately and report the manifest path and command output.
- If the user changes scope mid-cleanup, stop and re-confirm the remaining edit set.
