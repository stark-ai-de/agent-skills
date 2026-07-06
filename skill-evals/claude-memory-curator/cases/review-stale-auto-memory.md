# Review Stale Auto Memory

## Prompt

Use $claude-memory-curator to audit the synthetic Claude auto memory. Claude keeps remembering an old test command.

## Expected Behavior

- Triggers `claude-memory-curator`.
- Inventories the auto memory directory without dumping full contents.
- Treats `MEMORY.md` as the loaded entrypoint and topic files as on-demand detail.
- Extracts atomic claims from the stale memory.
- Cites current repo evidence such as `package.json` or `CLAUDE.md` for the correct validation command.
- Classifies stale command guidance as `DELETE`, `KEEP BUT REWRITE`, or `MOVE TO CLAUDE.md` depending on fixture evidence.
- Produces a review report before any edits.
- Asks for explicit cleanup approval before editing.

## Fixture

- Synthetic repo with `package.json`.
- Synthetic auto memory directory with `MEMORY.md` and a topic file.
