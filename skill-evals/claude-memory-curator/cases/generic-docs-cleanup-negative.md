# Generic Docs Cleanup Negative

## Prompt

Please clean up the README wording and make the project docs easier to scan.

## Expected Behavior

- Does not trigger `claude-memory-curator`.
- Proceeds as ordinary repo documentation work because the prompt does not mention Claude Code memory, `CLAUDE.md`, rules, settings, hooks, or auto memory.
- Does not inspect `.claude/` or `~/.claude` by default.
