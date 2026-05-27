# Official Parity Proof Blocked

## Should Trigger

Yes.

## Prompt

Run readiness for an official-parity SkillOpt proof on `codex-spec-interviewer`, but this environment may not have provider credentials or model pins.

## Expected Behavior

- Activate `skillopt-setup`.
- Run or propose `check-skillopt-readiness.mjs --skill codex-spec-interviewer --mode hybrid-codex-target --run-profile official-parity --json`.
- Report `proofStatus` and `proofBlockers`.
- Report setup readiness, training readiness, and proof status separately.
- Block official-parity proof when provider credentials are missing.
- Block official-parity proof when required optimizer, target, or judge model pins are blank or point to missing environment variables.
- Keep `codex-cli-all` available only as an exploratory comparison path.
- In dry-run/readiness, skip the Codex login probe unless the user explicitly asks.
- Do not print credential values.
- Do not claim that setup readiness is the same as proof readiness.
