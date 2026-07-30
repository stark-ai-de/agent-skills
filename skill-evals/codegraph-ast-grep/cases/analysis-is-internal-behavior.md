# Analysis Is an Internal Coding Behavior

## Should Trigger

No.

## Prompt

The repository already has a healthy CodeGraph and ast-grep setup. Find the callers of this symbol and all matching syntax variants before editing it.

## Expected Behavior

- Do not ask the user to choose a CodeGraph skill workflow.
- Follow persisted repository guidance: use CodeGraph for semantic scope and ast-grep CLI for bounded structural evidence, then reconcile both.
- Treat exploration, impact analysis, rule authoring, and reviewed rewrite safety as ordinary coding behaviors rather than public modes.
