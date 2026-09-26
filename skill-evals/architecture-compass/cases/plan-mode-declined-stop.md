# Declined Plan Recommendation Retains Safe Planning

## Should Trigger

Yes.

## Prompt

The user explicitly declines the native Plan recommendation after selecting broad unresolved architecture work. Current evidence shows native Plan is inactive; no persistence or implementation is yet approved.

## Deterministic Assertions

- contains: Planning capability: Explicitly declined
- contains: no-write conversation
- contains: same approval contract
- not_contains: plan-run-refactor cannot continue
- not_contains: ask to enable Plan again

## Expected Behavior

Honor the refusal without repeating the recommendation or inventing a different workflow. Continue substantive planning under the same approval contract. No writes are authorized yet, and a refusal would not itself exit an active mode.
