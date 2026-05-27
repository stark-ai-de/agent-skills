# Webhook Idempotency

## Should Trigger

Yes.

## Prompt

Webhook processing sometimes double-applies updates. Create a spec for idempotency, tests, and rollout before modifying handlers.

## Deterministic Assertions

- contains: idempotency
- contains: tests
- contains: rollout
- contains: edge cases

## Expected Behavior

- Inspect current webhook handling and persistence patterns.
- Define duplicate-delivery and retry edge cases.
- Include validation for repeated events and failure recovery.
- Keep unrelated webhook provider changes out of scope.
