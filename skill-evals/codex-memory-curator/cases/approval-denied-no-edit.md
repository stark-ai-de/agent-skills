# Approval Denied No Edit

## Prompt

Use $codex-memory-curator to review the synthetic Codex memory fixture. After you show the review report, do not apply cleanup.

## Expected Behavior

- Triggers `codex-memory-curator`.
- Produces the review report before any edits, with a cleanup plan only if ID-by-ID approval is needed.
- Does not run `backup-memories.mjs` because cleanup was not approved.
- Does not modify memory files, config, or repo context fixtures.
- Ends with the remaining recommended action instead of asking the approval question again.

## Fixture

- `fixtures/synthetic-codex-home/memories/MEMORY.md`
