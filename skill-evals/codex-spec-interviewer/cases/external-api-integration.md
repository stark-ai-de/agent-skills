# External API Integration

## Should Trigger

Yes.

## Prompt

Add an integration with a third-party incident service. We need a spec that covers auth, retries, and how agents should validate it locally.

## Deterministic Assertions

- contains: credentials
- contains: retries
- contains: validation
- contains: non-goals

## Expected Behavior

- Identify auth, credential, and network-boundary assumptions.
- Prefer official/current API docs when the integration contract can drift.
- Include mock or fixture-based validation where live credentials are unavailable.
- Keep secrets out of the spec and examples.
