# Codex Execution Host

## Prompt

I am running Codex, but I need a Cursor Agent-ready implementation spec for a fuzzy refactor involving `.cursor/rules`. Select the appropriate installed skill without being given its name. For this routing check, state which skill applies, which host controls it should use, and which target ecosystem its evidence and artifacts belong to.

## Expected Behavior

- Activates `cursor-spec-interviewer` from the Cursor target terms without requiring an explicit skill name.
- Keeps `.cursor/rules`, the saved implementation spec, required ADRs, and the execution prompt Cursor-specific.
- Uses the current Codex execution host's equivalent planning, structured-question, transition, and plan-exit controls instead of trying to invoke Cursor-only controls.
- Does not redirect to `codex-spec-interviewer` merely because Codex is executing the skill.
- Keeps the routing check read-only and does not fabricate repository evidence.
