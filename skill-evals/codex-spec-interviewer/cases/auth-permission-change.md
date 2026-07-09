# Auth Permission Change

## Should Trigger

Yes.

## Prompt

The admin area needs a new permission model, but I do not want agents guessing the security rules. Create the spec first.

## Expected Artifacts

- skill-evals/codex-spec-interviewer/expected/adr-gate-expectations.md

## Deterministic Assertions

- contains: permission
- contains: security
- contains: ADR
- contains: acceptance criteria

## Expected Behavior

- Treat auth and permission semantics as high-impact requirements.
- Ask for policy details that are not discoverable from repo code or docs.
- Include explicit non-goals and security review points.
- Mark implementation blocked if the permission model requires an unresolved durable decision.
