# Selective Backend ADR Routing

## Should Trigger

Yes.

## Prompt

Use Architecture Compass to plan a long-running backend process with an optional
HTTP adapter, startup, shutdown, configuration, health signals, and focused
tests. The target has already accepted its runtime and uses Elysia only in one
deployable. The data store and hosting provider are accepted and unchanged. Do
not plan frontend work and do not implement the service.

## Deterministic Assertions

- contains: AC-ADR-011
- contains: AC-ADR-012
- contains: AC-ADR-018
- contains: AC-ADR-023
- contains: validated request ID
- contains: sanitized error
- contains: liveness
- contains: readiness
- contains: side-effect-free HTTP factory
- contains: partial-startup unwind
- contains: HTTP factory failure unwind
- contains: signal handlers before runtime acquisition
- contains: cancellable runtime acquisition with AbortSignal
- contains: synchronously registered database-acquisition cleanup
- contains: bounded database-acquisition unwind
- contains: required dependencies before listener admission
- contains: repeated signals share cleanup
- contains: signal-handler removal
- contains: cancellable runtime start with AbortSignal
- contains: synchronously registered partial-bind cleanup
- contains: cancellable listener bind with AbortSignal
- contains: cancellable admission stop with AbortSignal
- contains: cancellable drain with AbortSignal
- contains: drain only after confirmed admission stop
- contains: never-resolving start terminal escalation
- contains: never-resolving bind terminal escalation
- contains: never-resolving stop-admission terminal escalation
- contains: never-resolving drain terminal escalation
- contains: never-resolving listener close terminal escalation
- contains: never-resolving runtime close terminal escalation
- contains: original and cleanup failures preserved with AggregateError
- contains: close failure before terminal failure in AggregateError
- contains: shared shutdown rejection observed
- contains: main awaits lifecycle completion
- contains: late rejection observation
- contains: handler cleanup when terminal throws
- contains: listener-close closeOrTerminate call site
- contains: runtime-close closeOrTerminate call site
- contains: drain deadline
- contains: reverse cleanup
- contains: config before main
- contains: alias
- contains: empty string
- not_contains: AC-ADR-008
- not_contains: AC-ADR-015
- not_contains: AC-ADR-024
- not_contains: Bun is required
- not_contains: Elysia is required

## Expected Behavior

- Select the backend composition, config, testing, and observability ADRs from
  their catalog metadata.
- Load their Long variants and only relevant implementation Guides.
- Keep the runtime and Elysia example conditional on target evidence. Build a
  side-effect-free HTTP factory with a validated or generated request ID,
  sanitized errors, and minimal liveness and dependency-aware readiness shapes.
- Resolve aliases and explicit empty-string behavior before `main`, then compose
  the runtime without ambient configuration reads in lower-level modules.
- Keep HTTP factory creation inside the guarded startup/unwind boundary and
  install signal handlers and the bootstrap controller before runtime
  acquisition. Make runtime and database acquisition `AbortSignal`-aware and
  deadline-bounded, with a closeable database owner registered synchronously
  before an external handle can open. Finish required dependency startup before
  listener admission. On partial acquisition or startup, unwind initialized
  resources and preserve primary plus cleanup failures in `AggregateError`. On
  termination, keep task-owned signal handlers installed so repeated signals
  join one cleanup, then remove those handlers in guaranteed `finally` cleanup.
  Observe both branches of the shared shutdown promise and keep `main` pending
  on lifecycle completion. Require `AbortSignal`-aware runtime start, listener
  bind, admission stop, and drain operations. Make the listener adapter return
  its partial-bind cleanup synchronously before a socket can open. After a
  deadline, abort and verify bounded settlement while observing late rejection;
  route never-resolving acquisition, start, or bind to terminal bootstrap
  escalation and never-resolving admission stop or drain to terminal shutdown
  escalation. Exercise the listener-close and runtime-close `closeOrTerminate`
  call sites even when their close operations never settle or injected terminal
  functions throw. When both close and terminal escalation fail, preserve the
  close failure first and the terminal failure second in `AggregateError`.
- Treat the accepted store and host as target evidence instead of reopening
  unrelated stack decisions.
- Exclude frontend capability and accessibility ADRs from the loaded set.
