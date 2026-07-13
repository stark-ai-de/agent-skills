# Codex Execution Host

## Prompt

I am running Codex, but I need a Claude Code-ready implementation spec for a fuzzy refactor involving `CLAUDE.md` and `.claude/rules`. Select the appropriate installed skill without being given its name. For this routing check, state which skill applies, which host controls it should use, and which target ecosystem its evidence and artifacts belong to.

## Expected Behavior

- Activates `claude-spec-interviewer` from the Claude Code target terms without requiring an explicit skill name.
- Keeps `CLAUDE.md`, `.claude/rules`, the saved implementation spec, required ADRs, and the execution prompt Claude Code-specific.
- Uses the current Codex execution host's equivalent planning, structured-question, and plan-exit controls instead of trying to invoke Claude-only tools.
- Does not redirect to `codex-spec-interviewer` merely because Codex is executing the skill.
- Keeps the routing check read-only and does not fabricate repository evidence.
