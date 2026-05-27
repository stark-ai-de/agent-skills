# Model Provider Switch

## Should Trigger

Yes.

## Prompt

Switch our agent runtime from one model provider abstraction to another. I need the spec to identify config, auth, and compatibility risks.

## Expected Artifacts

- skill-evals/codex-spec-interviewer/expected/adr-gate-expectations.md

## Deterministic Assertions

- contains: provider
- contains: compatibility
- contains: ADR
- contains: validation

## Expected Behavior

- Treat runtime provider selection and auth boundaries as architecture-sensitive.
- Inspect current configuration and provider usage before proposing changes.
- Run the ADR gate and identify any blocked durable decision.
- Include rollout and rollback steps for provider-specific failure modes.
