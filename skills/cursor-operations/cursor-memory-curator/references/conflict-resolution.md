# Cursor Context Conflict Resolution

Use this when Cursor durable context conflicts with the current task, repo instructions, docs, scripts, source, or settings exports.

## Precedence

Prefer sources in this order:

1. Current user request and direct conversation instructions.
2. Active `AGENTS.md`, Cursor Project Rules, and explicit User or Team Rule exports relevant to the task.
3. Current repository files that define behavior, including package scripts, ADRs, docs, source code, and config.
4. Legacy `.cursorrules`.
5. User-maintained memory-bank files without current supporting evidence.

When two current repo surfaces disagree, prefer the more specific scoped file for the touched path, then report the conflict instead of silently choosing.

## Checks

- Read only the repo files needed to verify the disputed claim.
- Prefer live files over remembered commands, branch names, or generated summaries.
- Treat scoped repo guidance as local; do not generalize it into User Rules or Team Rules.
- Treat Team Rules as shared policy. If an exported Team Rule appears wrong, recommend a manual team-rule review rather than editing it from the repo.
- If evidence is insufficient, classify `ASK USER`.

## Report Shape

Include a short conflict note in the review report or cleanup plan:

| ID  | Cursor context claim | Higher source  | Conflict                              | Recommendation                                            |
| --- | -------------------- | -------------- | ------------------------------------- | --------------------------------------------------------- |
| C-1 | `Run npm test here.` | `package.json` | Current script is `npm run validate`. | Move current command to `AGENTS.md` or delete stale rule. |
