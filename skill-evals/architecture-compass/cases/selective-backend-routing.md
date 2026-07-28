# Selective Backend ADR Routing

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to plan a background worker with startup, shutdown,
configuration, health signals, and focused tests. The data store and hosting
provider are already accepted and unchanged. Do not plan any frontend work and
do not implement the worker.

## Deterministic Assertions

- contains: AC-ADR-011
- contains: AC-ADR-012
- contains: AC-ADR-018
- contains: AC-ADR-023
- not_contains: AC-ADR-008
- not_contains: AC-ADR-015
- not_contains: AC-ADR-024

## Expected Behavior

- Select the backend composition, config, testing, and observability ADRs from
  their catalog metadata.
- Load their Long variants and only relevant implementation Guides.
- Treat the accepted store and host as target evidence instead of reopening
  unrelated stack decisions.
- Exclude frontend capability and accessibility ADRs from the loaded set.
