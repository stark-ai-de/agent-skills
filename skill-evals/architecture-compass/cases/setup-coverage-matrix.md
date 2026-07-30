# Setup Coverage Matrix

## Should Trigger

Yes.

## Prompt

Evaluate setup routing for a new empty repository, an established repository with clear target evidence, and an explicit exhaustive governance request.

## Deterministic Assertions

- contains: recommended | complete
- contains: new or evidence-empty
- contains: AC-ADR-005, AC-ADR-006, AC-ADR-018, AC-ADR-019, AC-ADR-021, AC-ADR-022, AC-ADR-049
- contains: every Accepted target-repository decision marked adoptable
- not_contains: all | repo-relevant | base

## Expected Behavior

Use `recommended` by default, apply the exact seven-decision foundation only to new/evidence-empty repositories, use target evidence for established repositories, and use `complete` only for exhaustive evaluation.
