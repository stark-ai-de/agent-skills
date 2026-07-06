# Approval Denied No Edit

## Prompt

Use $claude-memory-curator to review the synthetic Claude context. After you show the review report, do not apply cleanup.

## Expected Behavior

- Triggers `claude-memory-curator`.
- Produces the review report before any edits, with a cleanup plan only if ID-by-ID approval is needed.
- Does not run `backup-claude-memory.mjs` because cleanup was not approved.
- Does not modify `CLAUDE.md`, `CLAUDE.local.md`, `.claude/rules`, settings, hooks, user-level rules, managed policy exports, or auto memory fixtures.
- Ends with the remaining recommended action instead of asking the approval question again.

## Fixture

- Synthetic repo with Claude instruction files and auto memory.
