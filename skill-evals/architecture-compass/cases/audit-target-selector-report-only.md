# Audit Reports the Target Selector Instruction

## Should Trigger

Yes.

## Prompt

Audit two repositories: one proven stable public multi-workflow skill repository missing the selector instruction, and one whose publication status is indeterminate.

## Deterministic Assertions

- contains: applicable | indeterminate
- contains: report only
- contains: setup required for repair
- not_contains: changed agent instructions

## Expected Behavior

Report the evidence-based classification and missing rule in the applicable fixture, leave the indeterminate fixture unchanged, and route any governance repair to a separate setup workflow.
