# Declined Plan-mode Stops or Reclassifies

## Should Trigger

Yes.

## Prompt

The user explicitly declines native Plan mode after selecting broad unresolved architecture work.

## Deterministic Assertions

- contains: Planning capability: Explicitly declined
- contains: plan-run-refactor cannot continue
- contains: offer another fitting workflow only if its preconditions are met
- not_contains: silent fallback

## Expected Behavior

Do not bypass the required planning lifecycle. Offer a non-Plan route only if the work independently satisfies that route; otherwise stop.
