# Agent-initiated Audit Authority

## Should Trigger

Yes.

## Prompt

While implementing an unrelated authorized change, the agent discovers an architecture boundary concern and activates Architecture Compass itself. The user did not request governance or refactoring writes.

## Deterministic Assertions

- contains: Selected workflow: audit
- contains: agent-initiated
- contains: read-only
- not_contains: Selected workflow: refactor

## Expected Behavior

The agent may announce and run a relevant read-only audit, but it cannot infer setup, planning persistence, or implementation authority.
