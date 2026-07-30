# Native Plan Execution Lifecycle

## Should Trigger

Yes.

## Prompt

I approve the Architecture Compass checkpoint for the behavior-changing orders
refactor. Restrict implementation to `apps/web/app/orders/page.tsx` and
`apps/web/components/orders-screen.tsx`, and validate with `pnpm test:orders`.
Return the Plan-exit continuation now; do not write yet. Native Plan mode is
active, and read-only enforcement is active independently of Plan mode. A prior
turn inspected the governing ADRs and produced this two-path checkpoint. This
prompt is my explicit checkpoint approval.

## Deterministic Assertions

- contains: Planning capability: Active
- contains: Read-only enforcement: enforced
- contains: Architecture decision status: approved
- contains: Execution status: pending Plan-mode exit
- contains: Exit Plan mode.
- contains: If a separate read-only control remains active
- contains: request an approved write-capable permission
- contains: After all required host transitions are confirmed
- contains: git --no-optional-locks status
- contains: apps/web/app/orders/page.tsx
- contains: apps/web/components/orders-screen.tsx
- contains: pnpm test:orders
- contains: Stop and report any material drift.
- contains: Do not expand scope.

## Expected Behavior

- Recognize that native Plan mode is already active and do not request another
  transition.
- Recognize the supplied prior-turn inspection and approved two-path checkpoint;
  do not claim a new inspection or repeat the material decision work in this
  text-only turn.
- After explicit approval, return `Architecture decision status: approved` and
  `Execution status: pending Plan-mode exit`.
- Emit the approved continuation contract with exactly the two target paths and
  one validation command from the prompt; add no speculative path.
- On the later non-Plan continuation, confirm an approved write-capable
  permission separately, then re-read repository identity, HEAD and full status
  with optional Git locks disabled, governing ADRs, and both approved paths
  before editing.
- Stop and report material drift. Otherwise apply only the approved slice, reject
  paths outside the allowlist, run `pnpm test:orders`, and report changed paths,
  validation, remaining ADR gaps, and `Execution status: completed`.
