# Approval Denied No Edit

## Prompt

Use $codex-memory-curator to review the synthetic Codex memory fixture. After you show the review report, do not apply cleanup.

## Expected Behavior

- Triggers `codex-memory-curator`.
- Selects `review-chat`, produces the full review, and creates no cleanup plan or durable report.
- Does not run `backup-memories.mjs` because the selected route is read-only.
- Does not modify memory files, config, or repo context fixtures.
- Ends with the remaining recommendation without asking a generic cleanup-approval question.

## Fixture

- `fixtures/synthetic-codex-home/memories/MEMORY.md`
