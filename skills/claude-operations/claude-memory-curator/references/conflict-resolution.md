# Claude Context Conflict Resolution

Use this when Claude durable context conflicts with the current task, repo instructions, docs, scripts, source, settings, or hooks.

## Precedence

Prefer sources in this order:

1. Current user request and direct conversation instructions.
2. Managed policy and managed settings, treated as read-only unless explicitly in scope.
3. Active Claude settings and hooks that enforce runtime behavior.
4. More specific project `CLAUDE.md`, `CLAUDE.local.md`, and `.claude/rules` for the touched path.
5. Current repository files that define behavior, including package scripts, ADRs, docs, source code, and config.
6. User-level `~/.claude/CLAUDE.md` and `~/.claude/rules`.
7. Auto memory topic files and old learned summaries.

When two current repo surfaces disagree, prefer the more specific scoped file for the touched path, then report the conflict instead of silently choosing.

## Checks

- Read only the repo files needed to verify the disputed claim.
- Prefer live files over remembered commands, branch names, or generated summaries.
- Treat scoped repo guidance as local; do not generalize it into user-level Claude rules.
- If a cross-agent repo rule is currently duplicated between `AGENTS.md` and `CLAUDE.md`, recommend one source of truth plus import.
- If evidence is insufficient, classify `ASK USER`.

## Report Shape

Include a short conflict note in the review report or cleanup plan:

| ID  | Claude context claim | Higher source  | Conflict                              | Recommendation                                            |
| --- | -------------------- | -------------- | ------------------------------------- | --------------------------------------------------------- |
| C-1 | `Run npm test here.` | `package.json` | Current script is `npm run validate`. | Move current command to `CLAUDE.md` or delete stale text. |
