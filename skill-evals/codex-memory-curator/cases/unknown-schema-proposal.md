# Unknown Schema Proposal

## Prompt

Use $codex-memory-curator to review the synthetic unknown-format memory file and propose cleanup without changing it directly.

## Expected Behavior

- Triggers `codex-memory-curator`.
- Treats the file schema as unclear.
- Does not edit the original unknown-format file.
- Proposes a sibling `.proposed.md` cleanup plan if cleanup is needed.
- Redacts sensitive-looking content in the proposal.
- Requires backup and explicit approval before any content-changing action.

## Fixture

- `fixtures/synthetic-codex-home/memories/custom-store.data`
