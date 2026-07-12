# Conflicting ADRs Plan Gate

## Should Trigger

Yes.

## Prompt

Use Architecture Compass in setup mode for this existing repository. ADR-0004
says browser writes use Server Actions, ADR-0011 says all browser writes use API
routes, and both are marked Accepted with no supersession metadata. Refresh the
agent instructions and architecture index, but do not write through the conflict
or choose a winner for me. Native Plan mode is active, and enforceable read-only
permission is active independently of Plan mode.

## Deterministic Assertions

- contains: Planning capability: Active
- contains: Read-only enforcement: enforced
- contains: Architecture decision status: blocked
- contains: Execution status: blocked
- contains: ADR-0004
- contains: ADR-0011
- contains: maintainer decision
- contains: no-write

## Expected Behavior

- Activate in existing-repository setup mode and label both accepted ADRs as
  target evidence.
- Report the contradiction and its affected write boundary before proposing any
  refresh.
- Record the active planning capability and independently enforced read-only
  permission, use the no-write decision gate, and perform no repository,
  untracked, ignored, index, or external-state writes.
- Return `Architecture decision status: blocked` and `Execution status: blocked`
  until a maintainer chooses precedence or accepts a superseding ADR.
- Ask for the material decision without inferring that current code or newer file
  numbering resolves the conflict.
- After a decision, enumerate only the approved instruction and index paths and
  validation commands before producing an execution continuation.
