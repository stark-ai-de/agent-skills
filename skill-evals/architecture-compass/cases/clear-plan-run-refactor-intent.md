# Clear Plan-and-run Refactor Intent

## Should Trigger

Yes.

## Prompt

Plan and implement this broad architecture migration with Architecture Compass.
Package ownership, the request boundary, and the public package contract are
unresolved durable decisions. Do not implement until the decisions and exact
scope are approved and native Plan mode has exited.

## Deterministic Assertions

- contains: Selected workflow: plan-run-refactor
- contains: Planning capability
- contains: Architecture decision status: pending
- contains: Execution status: blocked
- contains: approved specification
- contains: state recheck
- contains: package ownership
- contains: request boundary
- contains: public package contract
- not_contains: execute expanded scope

## Expected Behavior

- Classify unresolved package ownership, request boundaries, and public contract changes as durable decisions that require the decision phase.
- Select `plan-run-refactor`, enter and confirm native Plan mode before
  substantive planning, and keep repository/workspace state read-only.
- Return `Architecture decision status: pending` and
  `Execution status: blocked` until approval.
- After approval, exit Plan mode before persistence, persist and validate only
  the approved specification and required governance artifacts, recheck state,
  and execute only the unchanged approved scope.
