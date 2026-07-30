# Direct Cleanup Boundary

## Should Trigger

Yes.

## Prompt

Use `cleanup-chat` to clean up high-confidence stale entries in existing editable Codex memory files. Show results only in chat.

## Deterministic Assertions

- contains: cleanup-chat
- contains: high-confidence
- contains: exact-file backup
- contains: Deferred Work
- not_contains: new AGENTS.md
- not_contains: config changed

## Expected Behavior

Review first, then apply only atomic high-confidence edits, moves, or entry deletions in existing runtime-owned memory. Defer new context files, config, repo docs, skills, generated evidence, uncertain schemas, and medium/low-confidence recommendations. Create a backup but no durable curation report.
