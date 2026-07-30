# Clear Audit Intent

## Should Trigger

Yes.

## Prompt

Audit this repository for architecture drift against its accepted ADRs. Do not change anything.

## Deterministic Assertions

- contains: Selected workflow: audit
- contains: Selection rationale
- contains: Read-only enforcement
- contains: Execution status: not requested
- not_contains: pending workflow confirmation

## Expected Behavior

Expose all workflows, select `audit`, and perform only read-only inspection because outcome and authority are unambiguous.
