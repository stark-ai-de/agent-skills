# Legacy Cursorrules Migration

## Prompt

Use $cursor-memory-curator to check whether this repo's `.cursorrules` should be migrated.

## Expected Behavior

- Triggers `cursor-memory-curator`.
- Inventories `.cursorrules` and any `.cursor/rules/**/*.mdc` files.
- Treats `.cursorrules` as legacy project context.
- Identifies duplicated or superseded claims when matching `.mdc` rules already exist.
- Classifies current reusable guidance as `MOVE TO CURSOR PROJECT RULE` or `MOVE TO AGENTS.md`.
- Classifies obsolete duplicate guidance as `DELETE`.
- Does not edit until approval and backup.

## Fixture

- Synthetic repo with `.cursorrules` plus `.cursor/rules/current-style.mdc`.
