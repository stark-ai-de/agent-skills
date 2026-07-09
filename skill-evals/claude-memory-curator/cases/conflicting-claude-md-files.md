# Conflicting CLAUDE.md Files

## Prompt

Use $claude-memory-curator to review why this repo has conflicting Claude instructions in parent and package-level `CLAUDE.md` files.

## Expected Behavior

- Triggers `claude-memory-curator`.
- Inventories root, nested, and local Claude instruction files.
- Explains that more specific files for the touched path should guide the recommendation.
- Extracts conflicting claims as atomic entries.
- Cites the higher-precedence or more specific source.
- Classifies lower or stale claims as `KEEP BUT REWRITE`, `MOVE TO CLAUDE RULE`, `DELETE`, or `ASK USER`.
- Does not edit before approval and backup.

## Fixture

- Synthetic repo with root `CLAUDE.md` and nested `packages/api/CLAUDE.md`.
