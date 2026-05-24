# Review Stale Repo-Specific Memory

## Prompt

Use $codex-memory-curator to audit the synthetic Codex memories in `skill-evals/codex-memory-curator/fixtures/synthetic-codex-home`. I think old repo rules are leaking into unrelated work.

## Expected Behavior

- Triggers `codex-memory-curator`.
- Inventories the synthetic memory directory without first dumping all contents.
- Extracts atomic claims from `memories/MEMORY.md`.
- Classifies the repo command and generated-file rule as `MOVE TO AGENTS.md` or `MOVE TO REPO DOCS`.
- Classifies stale branch/debugging state as `DELETE`.
- Keeps the stable cross-repo preference only if it is scoped and accurate.
- Produces a cleanup report before any edits.
- Includes confidence and proposed action for each memory ID.
- Asks for explicit cleanup approval before editing.

## Fixture

- `fixtures/synthetic-codex-home/memories/MEMORY.md`
