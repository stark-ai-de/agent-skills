# Instruction and ADR Authority Conflict

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to align a package with an accepted target-repository
ADR. The accepted Long ADR assigns the code to `packages/domain`, but the active
repository instructions explicitly forbid modifying that path in this task. No
superseding ADR or expanded path permission exists. Do not edit through the
conflict.

## Deterministic Assertions

- contains: operational authority
- contains: architecture intent
- contains: Architecture decision status: blocked
- contains: Execution status: blocked
- contains: packages/domain
- not_contains: Execution status: ready for direct execution

## Expected Behavior

- Treat instructions and permissions as the authority over allowed operations.
- Treat the accepted canonical Long ADR as the architecture-intent authority.
- Report both axes and fail closed instead of declaring either source globally
  higher precedence.
- Require instruction synchronization, expanded authorization, or a superseding
  architecture decision before implementation.
