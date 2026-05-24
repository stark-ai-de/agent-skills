# Codex Memory Curator Example

Prompt:

```text
Use $codex-memory-curator to review whether repo-specific memories are leaking across projects.
```

Expected report shape:

```md
## Top Decisions

1. Move the repo-specific command to AGENTS.md after verifying the current script.
2. Delete stale branch state after backup and approval.
3. Keep only scoped cross-repo preferences in memory.

## Summary

- Memory files inspected: 3
- Entries extracted: 18
- Keep: 9
- Rewrite: 4
- Move to AGENTS.md: 3
- Delete: 2

## Highest Risk Entries

- Move to AGENTS.md: A repo-specific test command is stored globally and can mislead other repos.
- Delete: An old branch policy conflicts with current repository instructions.

## Proposed Cleanup

No edits applied yet. For larger cleanup sets, attach a structured plan with IDs, risk tags, confidence, proposed action, and approval status. Approval is required before writing backups or modifying memory files.
```
