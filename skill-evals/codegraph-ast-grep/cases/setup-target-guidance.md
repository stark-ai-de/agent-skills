# Setup Persists Target Guidance

## Should Trigger

Yes.

## Prompt

Finish the setup and ensure future coding agents know when and how to use CodeGraph and ast-grep.

## Expected Behavior

- Select `setup` and locate the repository's existing agent-instruction convention.
- Persist one concise, non-duplicated instruction: CodeGraph for semantic symbols/callers/call paths/impact, ast-grep CLI for structural syntax evidence, reconcile both before broad edits.
- Verify that the intended coding runtime discovers the instruction.
- Do not add the experimental ast-grep MCP server or turn internal coding behaviors into public modes.
