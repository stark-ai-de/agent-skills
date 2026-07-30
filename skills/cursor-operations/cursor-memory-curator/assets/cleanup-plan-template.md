# Cursor Context Cleanup Plan

Embed this structure in the `Plan` section of the selected route's chat result or single file record. Do not persist it as a second curation artifact.

## Scope

- Repo:
- Requested by:
- Created:
- Plan approval status: not approved
- Backup required before edits: yes

## Entries

| ID  | Source | Line | Current claim | Classification | Risk tags | Confidence | Conflict source | Proposed action | Proposed replacement | Approved |
| --- | ------ | ---- | ------------- | -------------- | --------- | ---------- | --------------- | --------------- | -------------------- | -------- |

## Manual Actions

| ID  | Surface | Recommendation | Reason |
| --- | ------- | -------------- | ------ |

## Backup Contract

- Mode: `exact`
- Storage policy: `outside-git-worktree`; default to the deterministic per-repository user-state root
- Explicit storage override: `--backup-root PATH --backup-root-alias NAME` only when PATH is outside every Git worktree and NAME is a stable non-sensitive alias
- Repository receipt locator: script-reported portable storage locator plus manifest-relative paths only; absolute paths stay in non-persisted chat
- Exact include paths: one entry for every file that may change
- Required manifest: `backup-manifest.json`
- Receipt rule: Every pre-existing changed file must match exactly one verified manifest source entry; an approved new file is `created-no-preimage` with an explicit rollback

## Edit Rules

- Apply only rows with `Approved` set to `yes` in a plan-run route; direct cleanup uses a separately identified high-confidence atomic set.
- Back up only the exact Cursor context files that may change before edits.
- Do not edit User Rules or Team Rules unless a documented filesystem-backed artifact or explicit exported file path is available.
- Redact sensitive values in reports and diffs.
- Re-read changed sections after edits.
