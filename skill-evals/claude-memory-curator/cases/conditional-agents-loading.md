# Conditional Native AGENTS.md Loading

## Should Trigger

Yes.

## Prompt

Review whether my Claude Code instructions load. The repository has `AGENTS.md`; native support and settings vary between these sessions.

## Expected Behavior

- v2.1.277+ with feature availability, no blocking hooks/plugin settings, default mode, and a confirmed loading message: classify the shared instructions as natively loaded; no import is required solely for this session.
- The same version with an ancestor `CLAUDE.local.md`: default mode does not establish native loading. Check actual settings and imports, do not claim version alone proves support.
- Bedrock/disabled feature flags, telemetry disabled, first post-upgrade session, `disableAllHooks`, `allowManagedHooksOnly`, disabled plugin, older version, or unknown evidence: preserve/recommend a `CLAUDE.md` import fallback. Do not silently enable telemetry, hooks, or plugin settings.
- `claude-md-and-agents-md` in user/explicit/managed settings permits both when native support is available. The same value only in project/local settings is ineffective.
- Absence from `/memory`, `/context` Memory files, or `InstructionsLoaded` is not negative loading proof. Record candidate presence separately from observed session loading.
- Exclude `AGENTS.local.md`, `AGENTS.override.md`, and `.agents/AGENTS.md` from native candidates. Defer shared-file changes outside explicitly approved plan scope.

The executable inventory fixtures prove candidate and setting discovery only; these session-behavior cases remain a conversational evaluation contract.
