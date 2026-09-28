# Native Final Approval Covers Exact Content And Save

## Should Trigger

Yes.

## Prompt

A native final approval event explicitly confirms the displayed revision A and saving it to docs/specs/split.md without implementation. The host reports Plan exited and permission granted; target state is unchanged.

## Deterministic Assertions

- contains: native approval reused
- contains: Execution status: not requested
- not_contains: approve revision A again

## Expected Behavior

Treat the observed approval semantics as the single content-and-save checkpoint. A mode toggle alone would not suffice; the event explicitly confirms scope here. Save only that approved artifact.
