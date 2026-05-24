# Example Review Report

Use this as a shape reference, not as a fixed answer.

# Codex Memory Review

## Top Decisions

1. Move the repo-specific test command to `AGENTS.md` if it is still current.
2. Delete stale branch state after backup and approval.
3. Rewrite the service-boundary preference so it is scoped to repo conventions.

## Summary

- Memory files inspected: 2
- Entries extracted: 6
- Keep: 1
- Rewrite: 1
- Move to AGENTS.md: 1
- Move to repo docs: 1
- Move to skill: 1
- Move to config: 0
- Delete: 1
- Ask user: 0

## Highest-Risk Memories

| ID  | Entry                         | Risk                                      | Recommendation                    |
| --- | ----------------------------- | ----------------------------------------- | --------------------------------- |
| M-4 | `Always use service classes.` | Too broad; may fight current repo design. | Rewrite with scope and caveat.    |
| M-6 | `old-branch-name migration`   | One-off branch state.                     | Delete after approval and backup. |

## Proposed Cleanup Table

| ID  | Current memory                   | Classification      | Risk tags         | Confidence | Reason                                 | Proposed action                                                                   |
| --- | -------------------------------- | ------------------- | ----------------- | ---------- | -------------------------------------- | --------------------------------------------------------------------------------- |
| M-1 | `User prefers pnpm.`             | `KEEP`              | `useful`          | high       | Stable user preference.                | Leave unchanged.                                                                  |
| M-2 | `Run pnpm turbo test here.`      | `MOVE TO AGENTS.md` | `repo-specific`   | medium     | Repo-specific validation command.      | Move to current repo `AGENTS.md` if still current.                                |
| M-3 | `Long refactors need handoffs.`  | `MOVE TO SKILL`     | `workflow`        | medium     | Reusable workflow with steps.          | Move to a handoff/refactor skill.                                                 |
| M-4 | `Always use service classes.`    | `KEEP BUT REWRITE`  | `too-broad`       | medium     | Useful preference but too absolute.    | Rewrite: `Prefer explicit service boundaries when repo conventions support them.` |
| M-5 | `Architecture decision details.` | `MOVE TO REPO DOCS` | `too-specific`    | high       | Too long and repo-specific for memory. | Move to `docs/architecture.md`.                                                   |
| M-6 | `old-branch-name migration`      | `DELETE`            | `temporary,stale` | high       | Temporary, stale branch detail.        | Remove after backup.                                                              |

## Conflict Notes

| ID  | Higher source  | Conflict                                  | Recommendation                              |
| --- | -------------- | ----------------------------------------- | ------------------------------------------- |
| M-2 | `package.json` | Current validation command may differ.    | Verify before moving into `AGENTS.md`.      |
| M-4 | Current source | Current repo may not use service classes. | Rewrite as a preference, not a global rule. |

## Optional Cleanup Plan Artifact

- Plan path: `codex-memory-cleanup-plan.json`
- Plan format: `assets/cleanup-plan-template.md`
- Included because the example has several proposed edits that benefit from ID-by-ID approval.

## Config Recommendation

Use Exact Repo Work Mode for the current refactor because stale memory assumptions are likely to be harmful.

## Recommended Next Action

Confirm whether I should apply the safe cleanup.

```text
Do you want me to apply the safe cleanup now? I will back up the memory directory first.
```
