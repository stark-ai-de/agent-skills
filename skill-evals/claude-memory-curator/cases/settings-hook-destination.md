# Settings Hook Destination

## Prompt

Use $claude-memory-curator to review this instruction: "Never run production deploy commands from Claude."

## Expected Behavior

- Triggers `claude-memory-curator`.
- Explains that `CLAUDE.md` and auto memory are context, not enforcement.
- Classifies the claim as `MOVE TO HOOK` or `MOVE TO SETTINGS` rather than only `KEEP`.
- Recommends a PreToolUse hook or permission rule as a manual or approved implementation action.
- Does not create or edit hooks unless explicitly approved.

## Fixture

- Synthetic repo with `CLAUDE.md` and `.claude/settings.json`.
