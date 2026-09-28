# Testing Metric Truth

## Should Trigger

Yes.

## Prompt

Audit receipts with null baseline, missing denominator, expired waiver and a claimed p95 from five samples.

## Deterministic Assertions

- contains: unmeasured
- contains: unmet
- contains: waived
- contains: not-applicable
- not_contains: null baseline is zero

## Expected Behavior

Report unknown values unmeasured, expired waiver unmet, and insufficient percentile evidence unmeasured. A valid waiver is waived; evidence-backed zero denominator is not-applicable. Adoption and execution statuses are separate.

## Evidence Stage

source/static: this is an agent-behavior evaluation contract, not a recorded agent execution. Executable mechanisms are qualified separately in the repository-only measurable-testing fixtures; local pilot results do not establish hosted, install or external evidence.
