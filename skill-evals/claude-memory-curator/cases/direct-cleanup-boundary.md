# Direct Cleanup Boundary

## Should Trigger

Yes.

## Prompt

Use `cleanup-chat` to clean up high-confidence stale entries in existing editable Claude auto-memory files. Show results only in chat.

## Deterministic Assertions

- contains: cleanup-chat
- contains: high-confidence
- contains: exact-file backup
- contains: Deferred Work
- not_contains: new CLAUDE.md
- not_contains: settings changed

## Expected Behavior

Review first, then apply only atomic high-confidence edits, moves, or entry deletions in existing runtime-owned context. Defer new context files, settings, hooks, managed policy, repo docs, skills, uncertain schemas, and medium/low-confidence recommendations. Create a backup but no durable curation report.
