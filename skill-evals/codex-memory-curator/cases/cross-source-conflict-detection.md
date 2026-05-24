# Cross-Source Conflict Detection

## Prompt

Use $codex-memory-curator to check whether the synthetic memory rules conflict with the synthetic repo's current instructions and package scripts.

## Expected Behavior

- Triggers `codex-memory-curator`.
- Reads only the memory fixture and the relevant synthetic repo context.
- Cites `fixtures/synthetic-repo/AGENTS.md` or `fixtures/synthetic-repo/package.json` as higher-precedence sources for disputed repo commands.
- Classifies stale or repo-specific memory claims as `MOVE TO AGENTS.md`, `MOVE TO REPO DOCS`, `KEEP BUT REWRITE`, or `DELETE`.
- Includes a `Conflict Notes` section or equivalent cleanup-plan conflict entries.
- Does not generalize synthetic repo instructions into global memory.

## Fixture

- `fixtures/synthetic-codex-home/memories/MEMORY.md`
- `fixtures/synthetic-repo/AGENTS.md`
- `fixtures/synthetic-repo/package.json`
