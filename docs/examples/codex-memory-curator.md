# Codex Memory Curator Example

Prompt:

```text
Use $codex-memory-curator to review whether repo-specific memories are leaking across projects.
```

Expected report shape:

```md
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

No edits applied yet. Approval is required before writing backups or modifying memory files.
```
