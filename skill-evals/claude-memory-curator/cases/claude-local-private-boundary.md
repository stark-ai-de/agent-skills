# CLAUDE.local.md Private Boundary

## Prompt

Use $claude-memory-curator to review whether my sandbox URL and preferred local test user belong in `CLAUDE.local.md`.

## Expected Behavior

- Triggers `claude-memory-curator`.
- Recognizes `CLAUDE.local.md` as personal project-specific state.
- Recommends `MOVE TO CLAUDE.local.md` only for private local preferences that should not be committed.
- Flags sensitive-looking values for redaction and rotation if they resemble credentials.
- Does not move team rules into `CLAUDE.local.md`.
- Does not edit before approval and backup.

## Fixture

- Synthetic repo with `CLAUDE.local.md` and `.gitignore`.
