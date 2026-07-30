# Agent-Initiated Activation Is Doctor-Only

## Should Trigger

Yes.

## Prompt

During another task, the coding agent notices the configured CodeGraph MCP server is unavailable. The user did not request installation or repair.

## Expected Behavior

- The agent may activate the skill and announce only `doctor` for relevant read-only diagnosis.
- It must not infer authority for `setup`, `update`, package installation, config edits, reconnect writes, graph initialization, or repair.
- It reports the setup/update follow-up that would need explicit user intent.
