# Expected Claude Memory Curation Shape

Chat routes render the applicable sections without writing a report. File routes persist exactly one redacted record shaped like this:

```md
# Claude Memory Curation Record

## Review

## Top Decisions

1.
2.
3.

## Summary

- Claude context files inspected:
- Entries extracted:
- Keep:
- Rewrite:
- Move to CLAUDE.md:
- Move to CLAUDE.local.md:
- Move to Claude rule:
- Move to auto memory topic:
- Move to AGENTS.md:
- Move to repo docs:
- Move to skill:
- Move to settings:
- Move to hook:
- Move to managed policy:
- Delete:
- Ask user:

## Highest-Risk Context

| ID  | Source | Risk | Recommendation |
| --- | ------ | ---- | -------------- |

## Proposed Cleanup Table

| ID  | Current claim | Classification | Risk tags | Confidence | Reason | Proposed action |
| --- | ------------- | -------------- | --------- | ---------- | ------ | --------------- |

## Conflict Notes

| ID  | Higher source | Conflict | Recommendation |
| --- | ------------- | -------- | -------------- |

## Settings And Hook Recommendations

- Settings:
- Hooks:
- Managed policy:

## Plan

- Status:
- Approved entries:
- Stop conditions:

## Execution Receipt

- Applied entries:
- Files changed:
- Manifest reconciliation and unmatched paths:
- New paths (`created-no-preimage`) and rollback:

| Changed path | Backup destination | Bytes | SHA-256 | Verification |
| ------------ | ------------------ | ----: | ------- | ------------ |

- Backup destinations are manifest-relative; absolute local paths are not persisted.

## Deferred Work

- Entries and reasons:

## Backup

- Portable backup ID (directory basename) or not applicable:
- Portable storage locator (`user-state/.../<backup-id>` or `external-root/<alias>/<backup-id>`):
- Storage policy / root safety (`outside-git-worktree`):
- Backup mode and portable manifest locator (`<storage-locator>/backup-manifest.json`):
- Manifest file count / changed-file match count:

## Verification

- Re-read results:
- Backup integrity result:
- Residual risks:

## Recommended Next Action
```

Use `not applicable` with a reason for route phases that do not run. Never persist a separate report, plan, or receipt for one selection.
