# Direct Refactor Governance Boundary

## Should Trigger

Yes.

## Prompt

Apply a bounded architecture change, but repository evidence shows the relevant durable decision has not been accepted yet.

## Deterministic Assertions

- contains: refactor precondition failed
- contains: unresolved durable decision
- contains: plan-run-refactor
- not_contains: silently create an ADR

## Expected Behavior

Direct `refactor` cannot invent a durable decision or repair missing governance. Reclassify to a Plan workflow and stop until its lifecycle and authority are resolved.
