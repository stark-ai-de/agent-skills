# Proportional Planning Validation Evidence

## Should Trigger

Yes.

## Prompt

The Architecture Compass checkpoint was shown and the user explicitly confirmed
`plan-refactor`. Review a four-phase architecture plan while only
phase-one ADR and specification artifacts are expected to exist. Propose the
baseline validator and checkpoint review. Do not add gates that require
phase-two through phase-four artifacts yet.

## Deterministic Assertions

- contains: cheap objective invariants
- contains: semantic checkpoint review
- contains: ADRs
- contains: specification
- contains: result
- contains: evidence
- contains: later-phase
- not_contains: require all four phase artifacts now

## Expected Behavior

- Automate a small fast baseline of stable objective invariants such as IDs,
  links, statuses, path shape, and unique ownership.
- At the current checkpoint, compare the accepted ADRs, specification, approved
  scope, produced result, and evidence semantically.
- Keep later-phase completeness out of the baseline until those artifacts are
  expected to exist.
- Add future automation only for objective recurring failures or demonstrated
  process savings, and do not treat schema validity as semantic consistency.
