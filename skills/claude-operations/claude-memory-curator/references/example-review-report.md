# Example Claude Memory Review

## Top Decisions

1. Move the API-specific guidance from broad `CLAUDE.md` into a path-scoped `.claude/rules/api.md`.
2. Delete stale auto-memory notes about the old `npm test` command because `package.json` proves the command changed.
3. Recommend a PreToolUse hook for the "never deploy production" rule because instruction text is not enforcement.

## Summary

- Claude context files inspected: 5
- Entries extracted: 7
- Keep: 1
- Rewrite: 1
- Move to Claude rule: 1
- Move to auto memory topic: 1
- Move to settings: 1
- Move to hook: 1
- Delete: 1
- Ask user: 0

## Highest-Risk Context

| ID  | Source                    | Risk       | Recommendation                                  |
| --- | ------------------------- | ---------- | ----------------------------------------------- |
| C-2 | `~/.claude/.../MEMORY.md` | stale      | Delete old command after backup and approval.   |
| C-4 | `CLAUDE.md`               | unenforced | Move hard restriction to a hook recommendation. |
| C-6 | `.claude/rules/deploy.md` | sensitive  | Remove redacted token-like value and rotate it. |

## Proposed Cleanup Table

| ID  | Current claim              | Classification        | Risk tags  | Confidence | Reason                         | Proposed action                    |
| --- | -------------------------- | --------------------- | ---------- | ---------- | ------------------------------ | ---------------------------------- |
| C-1 | Use npm for all commands.  | `DELETE`              | stale      | high       | `package.json` uses pnpm.      | Remove after backup and approval.  |
| C-2 | API handlers use format X. | `MOVE TO CLAUDE RULE` | useful     | medium     | Applies only under `src/api/`. | Move to path-scoped rule.          |
| C-3 | Never deploy production.   | `MOVE TO HOOK`        | unenforced | high       | Context text cannot enforce.   | Recommend a PreToolUse hook guard. |

## Settings And Hook Recommendations

- Settings: consider `claudeMdExcludes` for irrelevant parent repo instructions.
- Hooks: add a PreToolUse hook only after explicit approval.
- Managed policy: no managed-policy change proposed.

## Recommended Next Action

Approve IDs C-1 and C-2 for cleanup, or tell me which entries to revise.
