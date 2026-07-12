# Architecture Compass Evals

This folder stores maintainer regression and release proof for the public
`architecture-compass` skill. The historical promotion evidence remains under
`runs/`; new dated run summaries must distinguish live, static, source-backed,
and unavailable runtime proof.

## Eval Contract

Passing behavior must:

- activate for ADR governance, architecture placement, setup, refactor, audit,
  PR review, and stack-deviation work while rejecting unrelated small tasks,
- inspect target evidence before applying bundled defaults,
- route unresolved durable decisions and broad, multi-boundary,
  behavior-changing, or phased refactors through a read-only decision phase
  without forcing Plan mode on narrow behavior-preserving ADR-backed work,
  audits, or reviews,
- treat collaboration mode and filesystem permissions as separate controls,
- report `Planning capability` and `Read-only enforcement` as explicit separate
  public fields,
- request host-controlled transitions instead of claiming prompt text changed a
  runtime mode,
- preserve the decision gate when Plan mode is unavailable or explicitly
  declined and record the fallback evidence,
- preserve the behavioral no-write gate without repeating the request when a
  read-only transition is explicitly declined,
- return the public architecture-decision and execution statuses,
- return `pending write permission` rather than `ready for direct execution`
  while a known required write control remains inactive or unconfirmed,
- hand approved implementation to an exact-path continuation that rechecks
  repository state and stops on material drift,
- produce public-safe output with no private source names, links, secrets, or
  copied source files.

## Eval Artifacts

- `activation-cases.md`: trigger and routing expectations.
- `rubric.md`: quality and lifecycle safety gates.
- `cases/`: focused text-only cases with deterministic assertions.
- `runs/YYYY-MM-DD-summary.md`: dated maintainer evidence after the relevant
  static and live checks have actually run.

Focused lifecycle cases:

- `cases/conditional-plan-routing-matrix.md`
- `cases/read-only-transition-gate.md`
- `cases/read-only-explicitly-declined-fallback.md`
- `cases/conflicting-adrs-plan-gate.md`
- `cases/stack-deviation-routing.md`
- `cases/native-plan-fallbacks.md`
- `cases/native-plan-declined-fallback.md`
- `cases/native-plan-indeterminate-fallback.md`
- `cases/native-plan-execution-lifecycle.md`
- `cases/approved-decision-no-implementation.md`
- `cases/portable-fallback-execution-lifecycle.md`
- `cases/direct-route-reclassification.md`
- `cases/direct-write-permission-gate.md`
- `cases/reentry-material-drift.md`
- `cases/audit-and-pr-review-routing.md`

## Lifecycle Evaluation

Decision-heavy cases are multi-turn. The first turn classifies the work and,
when appropriate, requests a host-controlled transition. The decision phase
inspects evidence and asks material questions without repository, untracked,
ignored, index, or external-state writes. When implementation was requested,
approval produces enumerated paths, validation commands, and the matching
execution handoff. An architecture-only approval returns
`Execution status: not requested` without an implementation continuation.

The direct permission continuation starts only after its required write-capable
transition is approved. The native execution continuation starts only after Plan
mode exits and any separately required write-capable permission transition is
approved. The portable fallback starts only after explicit implementation
approval and any required write permission. A known pending write transition returns
`Execution status: pending write permission` and stops; `ready for direct
execution` means permission is confirmed or no transition is required. Both
re-read Git identity and index-safe status when available, governing ADRs, and
approved target paths. Material drift blocks execution; otherwise changes remain
inside the approved path allowlist and end with validation evidence.

Audit cases remain read-only without a Plan requirement. PR, branch, and diff
reviews prefer the host review surface when available. Fallback cases pass only
when `unavailable`, `explicitly declined`, or `indeterminate` planning capability
is reported honestly, read-only enforcement is recorded separately, and the same
no-write decision gate is preserved.

`## Deterministic Assertions` provides lightweight output checks. No dated run
summary should claim the 0.2.0 lifecycle proof until the corresponding static or
live runtime check has completed.
