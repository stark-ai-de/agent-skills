# Portable Fallback Execution Lifecycle

## Should Trigger

Yes.

## Prompt

I approve the conversational Architecture Compass checkpoint for the worker
ownership refactor. Restrict implementation to `apps/api/src/runtime.ts` and
`apps/worker/src/runtime.ts`, and validate with `pnpm test:runtime`. Return the
portable execution continuation now; do not write yet. Native Plan mode and
enforceable read-only controls are unavailable. A prior conversational no-write
decision phase resolved the durable choices, and this prompt explicitly approves
the two-path implementation checkpoint. The host is already write-capable, so no
permission transition is required before the later execution turn.

## Deterministic Assertions

- contains: Planning capability: Unavailable
- contains: Read-only enforcement: unavailable
- contains: Plan-mode fallback: unavailable
- contains: Architecture decision status: approved
- contains: Execution status: ready for direct execution
- contains: After explicit implementation approval
- contains: git --no-optional-locks status
- contains: apps/api/src/runtime.ts
- contains: apps/worker/src/runtime.ts
- contains: pnpm test:runtime
- contains: Stop and report any material drift.
- contains: Do not expand scope.

## Expected Behavior

- Record the unavailable planning and enforcement evidence separately without
  claiming a host transition.
- Confirm the prompt's active write capability before returning the ready
  execution status.
- Preserve the behavioral no-write gate while returning the approved checkpoint.
- Emit the portable fallback continuation with exactly the two paths and one
  validation command from the prompt; add no speculative path.
- On the later execution turn, reconfirm explicit implementation approval and
  any required write permission, then re-read repository identity, index-safe
  status, governing ADRs, and both approved paths before mutation.
- Stop on material drift. Otherwise change only the allowlisted paths, run
  `pnpm test:runtime`, and end with `Execution status: completed`.
