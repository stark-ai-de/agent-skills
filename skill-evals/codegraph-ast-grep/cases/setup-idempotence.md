# Setup Is Idempotent

## Should Trigger

Yes.

## Prompt

Run the CodeGraph and ast-grep setup again in a repository that may already be configured.

## Expected Behavior

- Select `setup`, inspect current state first, and reconcile only missing or drifted pieces.
- Reuse equivalent dependencies, MCP entries, state paths, and repository guidance rather than duplicating them.
- Verify readiness even when no write is needed and report a no-op setup accurately.
