# Expected Cursor Memory Review Shape

Passing outputs should lead with a report shaped like this before edits:

```md
# Cursor Memory Review

## Top Decisions

1.
2.
3.

## Summary

- Cursor context files inspected:
- Entries extracted:
- Keep:
- Rewrite:
- Move to Cursor Project Rule:
- Move to AGENTS.md:
- Move to repo docs:
- Move to Cursor User Rules:
- Move to Cursor Team Rules:
- Move to skill:
- Move to config:
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

## Manual Cursor Settings Actions

- User Rules:
- Team Rules:

## Optional Cleanup Plan Artifact

- Plan path:
- Plan format: `assets/cleanup-plan-template.md`

## Recommended Next Action
```

After approved edits, outputs should add backup path, files changed, trimmed diff summary, skipped manual settings actions, and residual risks.
