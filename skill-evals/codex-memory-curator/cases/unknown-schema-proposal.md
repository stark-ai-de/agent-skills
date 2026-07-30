# Unknown Schema Proposal

## Prompt

Use $codex-memory-curator to review the synthetic unknown-format memory file and propose cleanup without changing it directly.

## Expected Behavior

- Triggers `codex-memory-curator`.
- Treats the file schema as unclear.
- Does not edit the original unknown-format file.
- Defers the cleanup proposal in chat or the one curation record without creating a sibling memory file.
- Records the cleanup action as `defer_without_writing`; no unknown-schema write flag is allowed.
- Redacts sensitive-looking content in the proposal.
- Requires route authority and an exact-file backup before any content-changing action.

## Fixture

- `fixtures/synthetic-codex-home/memories/custom-store.data`
