# Codex Spec Benchmark Hardening

## Should Trigger

Yes.

## Prompt

Prepare `codex-spec-interviewer` as the first SkillOpt proof target and make sure its eval data is no longer a tiny smoke set.

## Expected Behavior

- Activate `skillopt-setup`.
- Use `prepare-skillopt-split.mjs --skill codex-spec-interviewer --seed 42`.
- Require at least 20 positive cases before official-parity proof can be claimed.
- Preserve at least 5 validation and 5 test cases when enough positive cases exist.
- Carry `## Deterministic Assertions`, `## Fixtures`, and `## Expected Artifacts` into generated split JSON.
- Keep `Should Trigger No` cases in activation-only negative data, not positive optimization training.
- Report deterministic assertion, fixture, and expected-artifact coverage in dataset metadata or readiness output.

## Deterministic Assertions

- contains: prepare-skillopt-split.mjs --skill codex-spec-interviewer --seed 42
- contains: 20 positive
- contains: 5 validation
- contains: 5 test
- contains: Deterministic Assertions
