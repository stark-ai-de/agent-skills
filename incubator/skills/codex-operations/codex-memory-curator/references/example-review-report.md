# Example Review Report

Use this as a shape reference, not as a fixed answer.

# Codex Memory Review

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

| ID  | Current memory                   | Classification      | Reason                                 | Proposed action                                                                   |
| --- | -------------------------------- | ------------------- | -------------------------------------- | --------------------------------------------------------------------------------- |
| M-1 | `User prefers pnpm.`             | `KEEP`              | Stable user preference.                | Leave unchanged.                                                                  |
| M-2 | `Run pnpm turbo test here.`      | `MOVE TO AGENTS.md` | Repo-specific validation command.      | Move to current repo `AGENTS.md` if still current.                                |
| M-3 | `Long refactors need handoffs.`  | `MOVE TO SKILL`     | Reusable workflow with steps.          | Move to a handoff/refactor skill.                                                 |
| M-4 | `Always use service classes.`    | `KEEP BUT REWRITE`  | Useful preference but too absolute.    | Rewrite: `Prefer explicit service boundaries when repo conventions support them.` |
| M-5 | `Architecture decision details.` | `MOVE TO REPO DOCS` | Too long and repo-specific for memory. | Move to `docs/architecture.md`.                                                   |
| M-6 | `old-branch-name migration`      | `DELETE`            | Temporary, stale branch detail.        | Remove after backup.                                                              |

## Config Recommendation

Use Exact Repo Work Mode for the current refactor because stale memory assumptions are likely to be harmful.

## Recommended Next Action

Confirm whether I should apply the safe cleanup.

```text
Do you want me to apply the safe cleanup now? I will back up the memory directory first.
```
