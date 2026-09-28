# Reuse Approval After Plan Exit

## Should Trigger

Yes.

## Prompt

The complete specification revision A, its path docs/specs/split.md, required new directory, and proposed ADR triplet were approved together. Native Plan has now exited, writing those paths is permitted, and a fresh target-state check is unchanged. Continue plan-refactor save-only.

## Deterministic Assertions

- contains: approval reused
- contains: Persistence status: completed
- contains: Execution status: not requested
- not_contains: approve revision A again
- not_contains: Architecture decision status: approved

## Expected Behavior

Reuse the unchanged content and persistence approval, save and validate only the named artifacts, and stop. The Proposed ADR is not Accepted merely because saving it was approved. Report the pending architecture decision separately.
