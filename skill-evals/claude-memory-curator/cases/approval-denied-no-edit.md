# Approval Denied No Edit

## Prompt

Use $claude-memory-curator to review the synthetic Claude context. After you show the review report, do not apply cleanup.

## Expected Behavior

- Triggers `claude-memory-curator`.
- Selects `review-chat`, produces the full review, and creates no cleanup plan or durable report.
- Does not run `backup-claude-memory.mjs` because the selected route is read-only.
- Does not modify `CLAUDE.md`, `CLAUDE.local.md`, `.claude/rules`, settings, hooks, user-level rules, managed policy exports, or auto memory fixtures.
- Ends with the remaining recommendation without asking a generic cleanup-approval question.

## Fixture

- Synthetic repo with Claude instruction files and auto memory.
