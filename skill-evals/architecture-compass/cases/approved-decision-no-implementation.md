# Approved Decision Without Implementation

## Should Trigger

Yes.

## Prompt

We have approved the Architecture Compass decision to keep the API and worker
in one deployable unit for now. Record the final architecture decision only. Do
not implement it, propose target paths, or return an execution continuation.
Native Plan mode is active, and read-only enforcement is active independently
of Plan mode. The durable decision and its assumptions are fully resolved; no
implementation was requested.

## Deterministic Assertions

- contains: Planning capability: Active
- contains: Read-only enforcement: enforced
- contains: Architecture decision status: approved
- contains: Execution status: not requested
- not_contains: Exit Plan mode.

## Expected Behavior

- Record the planning and read-only evidence separately.
- Finalize the durable architecture decision and its material assumptions.
- Return `Architecture decision status: approved` and
  `Execution status: not requested`.
- Do not invent an implementation slice, path allowlist, validation commands,
  write-capable permission transition, or post-Plan continuation.
- Keep repository, untracked, ignored, index, artifact, and external state
  unchanged.
