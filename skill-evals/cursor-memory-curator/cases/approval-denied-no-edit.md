# Approval Denied No Edit

## Prompt

Use $cursor-memory-curator to review the synthetic Cursor context. After you show the review report, do not apply cleanup.

## Expected Behavior

- Triggers `cursor-memory-curator`.
- Produces the review report before any edits, with a cleanup plan only if ID-by-ID approval is needed.
- Does not run `backup-cursor-context.mjs` because cleanup was not approved.
- Does not modify `.cursor/rules`, `.cursorrules`, `AGENTS.md`, User Rules exports, Team Rules exports, or memory-bank fixtures.
- Ends with the remaining recommended action instead of asking the approval question again.

## Fixture

- Synthetic repo with Cursor Project Rules and `AGENTS.md`.
