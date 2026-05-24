# Conflict Resolution

Use this when a memory claim may conflict with the current task, repo instructions, docs, scripts, or config.

## Precedence

Prefer sources in this order:

1. Current user request and direct conversation instructions.
2. Active `AGENTS.md` or `AGENTS.override.md` guidance for the current directory.
3. Current repository files that define behavior, including package scripts, ADRs, docs, and source code.
4. Current Codex config.
5. Codex memory.

Memory is useful context, not proof. When a memory conflicts with a higher-precedence source, classify it as `KEEP BUT REWRITE`, `MOVE TO AGENTS.md`, `MOVE TO REPO DOCS`, `MOVE TO CONFIG`, or `DELETE`.

## Checks

- Read only the repo files needed to verify the disputed claim.
- Prefer live files over remembered commands or branch names.
- Treat scoped repo guidance as local; do not generalize it into global memory.
- If two current repo sources disagree, report the conflict and classify the memory only after identifying the stronger source.
- If evidence is insufficient, classify `ASK USER`.

## Report Shape

Include a short conflict note in the review report or cleanup plan:

| Memory ID | Memory claim         | Higher source  | Conflict                              | Recommendation                                              |
| --------- | -------------------- | -------------- | ------------------------------------- | ----------------------------------------------------------- |
| M-1       | `Run npm test here.` | `package.json` | Current script is `npm run validate`. | Move current command to `AGENTS.md` or delete stale memory. |
