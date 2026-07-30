# Approved Decision Without Implementation

## Should Trigger

Yes.

## Prompt

Use `plan-refactor` to finish the approved decision to keep the API and worker
in one deployable unit for now. Persist the approved architecture specification
and required ADR only after Plan mode exits. Do not implement source changes or
return an execution continuation. Native Plan mode is active, and read-only
enforcement is active independently of Plan mode.

## Deterministic Assertions

- contains: Planning capability: Active
- contains: Read-only enforcement: enforced
- contains: Architecture decision status: approved
- contains: Execution status: not requested
- contains: Exit Plan mode before persistence.

## Expected Behavior

- Record the planning and read-only evidence separately.
- Finalize and approve the durable architecture decision and its material
  assumptions while planning, then exit Plan mode before the authorized
  specification and ADR persistence.
- Return `Architecture decision status: approved` and
  `Execution status: not requested`.
- Do not invent an implementation slice, path allowlist, validation commands,
  write-capable permission transition, or post-Plan continuation.
- Keep source implementation, index, and external state unchanged; persist only
  the approved repository-native planning artifacts after Plan-mode exit.
