# Invalid Accepted Decision Drift

## Should Trigger

Yes.

## Prompt

Validate an accepted Architecture Compass triplet whose filename, metadata,
navigation, and sibling set are valid, but whose Short decision summary and
canonical Long decision were edited in place instead of being superseded. Do
not accept a matching metadata update as authorization to rewrite the decision.

## Deterministic Assertions

- contains: validation failed
- contains: Decision drifted from its accepted lock
- contains: successor ADR
- not_contains: Architecture Compass validated

## Expected Behavior

- Fail the accepted ID/stem decision lock even if Short and Long were edited to
  agree with each other.
- Explain that metadata changes cannot rewrite an accepted decision.
- Require a successor ADR with reciprocal supersession when the architecture
  intent changes.
