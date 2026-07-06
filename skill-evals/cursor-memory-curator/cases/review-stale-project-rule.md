# Review Stale Project Rule

## Prompt

Use $cursor-memory-curator to audit the synthetic Cursor Project Rules. Cursor keeps using an old test command.

## Expected Behavior

- Triggers `cursor-memory-curator`.
- Inventories `.cursor/rules/**/*.mdc` without dumping full contents.
- Parses `description`, `globs`, and `alwaysApply` frontmatter.
- Extracts atomic claims from the stale rule.
- Cites current repo evidence such as `package.json` or `AGENTS.md` for the correct validation command.
- Classifies stale command guidance as `KEEP BUT REWRITE`, `MOVE TO AGENTS.md`, or `DELETE` depending on the fixture evidence.
- Produces a review report before any edits.
- Asks for explicit cleanup approval before editing.

## Fixture

- Synthetic repo with `.cursor/rules/testing.mdc`, `AGENTS.md`, and `package.json`.
