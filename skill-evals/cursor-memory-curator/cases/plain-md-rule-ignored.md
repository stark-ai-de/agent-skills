# Plain Markdown Rule Ignored

## Prompt

Use $cursor-memory-curator to explain why Cursor is not applying `.cursor/rules/testing.md`.

## Expected Behavior

- Triggers `cursor-memory-curator`.
- Inventories `.cursor/rules/testing.md`.
- Flags the plain Markdown file as ignored or metadata-less for Cursor Project Rule behavior.
- Recommends converting it to `.mdc` with appropriate frontmatter or moving simple guidance to `AGENTS.md`.
- Does not claim the file has active `description`, `globs`, or `alwaysApply` semantics.
- Does not edit before approval.

## Fixture

- Synthetic repo with `.cursor/rules/testing.md`.
