# Plan Mode Lifecycle

## Should Trigger

Yes.

## Prompt

Plan and run a persisted Claude Code context cleanup. Native Plan mode is supported but inactive. Start the read-only review now; recommend a mode change if useful, without waiting for it.

## Deterministic Assertions

- contains: plan-run-cleanup-file
- contains: read-only
- contains: state recheck
- not_contains: cleanup applied

## Expected Behavior

Disclose the eight routes compactly, select the requested route, and begin the scoped read-only review. Recommend native Plan mode for substantial ambiguous planning without requiring a manual switch before permissible inspection. Prepare the complete plan before requesting missing approval. If Plan mode becomes active, no report, backup, or cleanup write is allowed until the host permits writes outside Plan mode. Preserve unchanged approval across exit; recheck target state and execute only the approved actions. A declined or unavailable mode control permits conversational planning; unknown state never permits writes.
