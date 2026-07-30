# Audit Is Strictly Read-only

## Should Trigger

Yes.

## Prompt

Audit ADR coverage, implementation drift, and validation receipts, and report any missing stable-skill selector rule.

## Deterministic Assertions

- contains: Selected workflow: audit
- contains: strictly read-only
- contains: reported only
- not_contains: create governance files
- not_contains: repair the selector rule

## Expected Behavior

Inspect and report without creating artifacts, modifying files or the index, installing tools, repairing governance, or performing external actions.
