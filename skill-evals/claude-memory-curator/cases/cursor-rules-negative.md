# Cursor Rules Negative

## Prompt

Use $claude-memory-curator to clean up my Cursor `.cursor/rules` files.

## Expected Behavior

- Does not proceed as `claude-memory-curator` because the target is Cursor durable context.
- Recommends a Cursor memory or rules curator if available.
- Does not inspect Claude Code files.
- Does not edit Cursor rule files.
