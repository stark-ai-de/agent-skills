# Inactive Plan Does Not Block Discovery

## Should Trigger

Yes.

## Prompt

Run plan-refactor for a module split. Native Plan is available but inactive, the user has not requested its activation, and read-only repository access is available. The outcome and target are clear.

## Deterministic Assertions

- contains: Planning capability: Available but inactive
- contains: no-write conversation
- contains: recommend native Plan
- not_contains: activate Plan before any planning

## Expected Behavior

Recommend native Plan for this substantial ambiguous work once; continue discovery and decision questions without waiting solely for a toggle. Do not persist before content/write approval and confirmed permissions.
