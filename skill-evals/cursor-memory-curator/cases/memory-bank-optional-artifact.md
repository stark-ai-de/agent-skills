# Memory Bank Optional Artifact

## Prompt

Use $cursor-memory-curator to review `memory-bank/currentContext.md` and prepare a cleanup plan. Do not edit yet.

## Expected Behavior

- Triggers `cursor-memory-curator`.
- Treats the path as a user-maintained memory-bank artifact, not an official Cursor memory store.
- Inventories and reads the file in bounded chunks.
- Extracts atomic claims and classifies them by destination.
- Produces a structured cleanup plan when ID-by-ID approval is requested.
- Writes no changes because the prompt says not to edit yet.
- Recommends a sibling `.proposed.md` plan if the schema is unclear.

## Fixture

- Synthetic repo with `memory-bank/currentContext.md`.
