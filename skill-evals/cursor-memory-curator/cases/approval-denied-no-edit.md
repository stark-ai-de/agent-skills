# Approval Denied No Edit

## Prompt

Use $cursor-memory-curator to review the synthetic Cursor context. After you show the review report, do not apply cleanup.

## Expected Behavior

- Triggers `cursor-memory-curator`.
- Selects `review-chat`, produces the full review, and creates no cleanup plan or durable report.
- Does not run `backup-cursor-context.mjs` because the selected route is read-only.
- Does not modify `.cursor/rules`, `.cursorrules`, `AGENTS.md`, User Rules exports, Team Rules exports, or memory-bank fixtures.
- Ends with the remaining recommendation without asking a generic cleanup-approval question.

## Fixture

- Synthetic repo with Cursor Project Rules and `AGENTS.md`.
