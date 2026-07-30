# Example Cursor Memory Review

Selected workflow: `review-chat`. This example creates no durable curation report.

## Top Decisions

1. Convert the ignored plain Markdown rule to `.mdc` or move its simple guidance to `AGENTS.md`.
2. Delete the stale package-manager rule because `package.json` and the lockfile prove the repo uses pnpm now.
3. Keep User Rules as a manual settings action because no editable User Rules file was provided.

## Summary

- Cursor context files inspected: 4
- Entries extracted: 6
- Keep: 1
- Rewrite: 1
- Move to Cursor Project Rule: 1
- Move to AGENTS.md: 1
- Delete: 2
- Ask user: 0

## Highest-Risk Context

| ID  | Source                        | Risk      | Recommendation                                  |
| --- | ----------------------------- | --------- | ----------------------------------------------- |
| C-2 | `.cursor/rules/testing.md`    | ignored   | Convert to `.mdc` or move to `AGENTS.md`.       |
| C-4 | `.cursorrules`                | legacy    | Delete after migrating current guidance.        |
| C-5 | `.cursor/rules/deploy.mdc:12` | sensitive | Remove redacted token-like value and rotate it. |

## Proposed Cleanup Table

| ID  | Current claim               | Classification              | Risk tags | Confidence | Reason                         | Proposed action                        |
| --- | --------------------------- | --------------------------- | --------- | ---------- | ------------------------------ | -------------------------------------- |
| C-1 | Use npm for all commands.   | `DELETE`                    | stale     | high       | `package.json` uses pnpm.      | Remove after backup and approval.      |
| C-2 | Testing rule in plain `.md` | `MOVE TO AGENTS.md`         | ignored   | high       | It lacks Cursor rule metadata. | Move short instruction to `AGENTS.md`. |
| C-3 | Use concise responses.      | `MOVE TO CURSOR USER RULES` | useful    | medium     | User-wide preference.          | Add manually in Cursor settings.       |

## Manual Cursor Settings Actions

- User Rules: add concise response preference manually if the user confirms it is global.
- Team Rules: no team-wide changes proposed.

## Recommended Next Action

Invoke a cleanup route explicitly if C-1 and C-2 should be applied; `plan-run-cleanup-file` is Recommended.
