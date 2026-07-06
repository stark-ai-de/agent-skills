# Path Scoped Rule Placement

## Prompt

Use $claude-memory-curator to decide whether the React-only guidance in `CLAUDE.md` should be moved.

## Expected Behavior

- Triggers `claude-memory-curator`.
- Identifies that the guidance is path-specific or file-type-specific.
- Recommends `MOVE TO CLAUDE RULE` with `.claude/rules/*.md` and `paths` frontmatter.
- Does not over-generalize React guidance into user-level rules.
- Produces a review report before any edits.

## Fixture

- Synthetic repo with `CLAUDE.md` and `src/components/` files.
