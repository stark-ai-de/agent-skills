# Codex CLI Login Probe

## Should Trigger

Yes.

## Prompt

Before running a hybrid SkillOpt optimization, verify that `codex exec` is usable with my local ChatGPT sign-in.

## Expected Behavior

- Activate `skillopt-setup`.
- Run or propose `probe-codex-cli.mjs --json`.
- Use a read-only sandbox for the probe.
- Verify the final response is exactly `CODEX_READY` after trimming whitespace.
- Redact token-like strings and home paths from diagnostics.
- Warn if `OPENAI_API_KEY` is set while Codex CLI auth mode was requested.
