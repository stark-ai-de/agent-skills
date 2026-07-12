# Native Plan Fallbacks

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to plan a broad split of the API and worker runtimes.
Their ownership and environment-loading boundaries are unresolved. This agent
surface has no native Plan mode or mode-transition tool. Record that limitation,
keep the decision work read-only, and continue conversationally without changing
files. Native Plan mode and enforceable read-only controls are unavailable.

## Deterministic Assertions

- contains: Planning capability: Unavailable
- contains: Read-only enforcement: unavailable
- contains: Plan-mode fallback: unavailable
- contains: Architecture decision status: pending
- contains: Execution status: not requested
- contains: read-only decision gate
- contains: no native Plan mode

## Expected Behavior

- Activate and classify the runtime split as decision-heavy architecture work.
- Record `Plan-mode fallback: unavailable - <runtime evidence>` rather than
  inventing a transition or silently downgrading.
- Record `Read-only enforcement: unavailable - <runtime evidence>` separately.
- Preserve the same read-only decision gate and ask material ownership and env
  boundary questions conversationally.
- Perform no repository, untracked, ignored, index, or external-state writes.
- Keep `Architecture decision status: pending`; because the current prompt does
  not request execution, return `Execution status: not requested`.
- Record read-only enforcement separately from planning capability and disable
  optional Git locks for status inspection.
