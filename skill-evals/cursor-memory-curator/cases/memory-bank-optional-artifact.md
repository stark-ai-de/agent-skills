# Memory Bank Optional Artifact

## Prompt

Use $cursor-memory-curator to review `memory-bank/currentContext.md` and prepare a cleanup plan. Do not edit yet.

## Expected Behavior

- Triggers `cursor-memory-curator`.
- Treats the path as a user-maintained memory-bank artifact, not an official Cursor memory store.
- Inventories and reads the file in bounded chunks.
- Extracts atomic claims and classifies them by destination.
- Selects `plan-cleanup-chat` and produces the structured cleanup plan in chat because persistence was not requested.
- Writes no changes because the prompt says not to edit yet.
- Defers unclear-schema changes in chat instead of creating a sibling context file.

## Fixture

- Synthetic repo with `memory-bank/currentContext.md`.
