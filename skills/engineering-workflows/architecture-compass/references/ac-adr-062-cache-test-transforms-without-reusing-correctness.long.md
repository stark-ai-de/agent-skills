# AC-ADR-062: Cache test transforms without reusing correctness

ID: AC-ADR-062
Title: Cache test transforms without reusing correctness
Status: Accepted
Date: 2026-09-14
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: testing, transform-cache, invalidation, trust-boundaries, performance
Applies when: Persisting or restoring transformed test modules to reduce repeated validation work.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-14
Gist: Reuse transformation work only when inputs and trust match, while executing and proving validation independently.

Variants: [Short](ac-adr-062-cache-test-transforms-without-reusing-correctness.short.md) · **Long, canonical** · [Guide](ac-adr-062-cache-test-transforms-without-reusing-correctness.guide.md)

## Context

Repeated transformation can contribute to test feedback time, but cached code may become stale when plugins depend on inputs outside the tracked file content or configuration. Shared persistence adds transfer costs and provenance concerns that a cache-hit percentage cannot resolve.

## Intent

Reduce repeated transformation cost while ensuring a cache miss, deletion or invalidation never weakens validation. Cached code must not become stale execution, a substitute for fresh test results or a path across a security boundary.

## Decision

A target MAY use a supported transform cache only as an independently disposable accelerator. It SHALL classify transform, dependency, build-artifact and test-result evidence separately, with explicit ownership and invalidation. All selected tests still execute; reuse of a prior validation receipt follows the separate applicable evidence policy, never a transform hit.

Reuse identity SHALL cover every input capable of changing transformation, including source/module identity, runtime/framework/plugin versions, configuration, relevant environment or generated inputs and execution/coverage modes where applicable. External persistence keys alone cannot compensate for incomplete local plugin identity. Supply complete input keys, selectively opt out, clear the affected cache or disable caching when correctness cannot otherwise be established.

## Invariants

- Same-subject cache-enabled, disabled, cold and warm runs preserve test inventory and semantic outcomes. Deliberately changed inputs must produce the corresponding fresh result.
- Restored transformed code does not cross an unapproved trust boundary; PR-writable caches cannot feed privileged release execution. No secrets or authenticated user state enter shared caches.
- Concurrent users of a cache have supported synchronization or separate namespaces; one cleanup cannot delete another execution's cache or source.
- Caches/reports are excluded from source, release and clean-copy input inventories as required by those owning contracts.
- Missing or corrupt disposable state has an explicit safe recovery path. Recovery is bounded and visible; real source failures or repeated cache faults remain failures.
- An experimental feature is not a permanent architectural dependency. Native cache-disable/clear capability remains available.

## Measurable outcomes

Require zero inventory/outcome mismatches in the declared enabled/disabled/cleared parity set and zero stale passes in mutation fixtures covering relevant plugin/configuration/generated/environment inputs. Negative tests prove unsafe cache provenance is rejected or bypassed before consumption. These are bounded evidence claims, not an assertion that all possible inputs have been exhaustively tested.

Measure total repeated-run savings with restore, validation, write/save and storage overhead included. The target approves the workload, warm/cold mix, latency target and cost/storage ceiling. If persistence has no qualifying net benefit, leave it off or local-only and record the revisit trigger rather than claim success from a cache-hit percentage.

## Adoption evidence

Keep provider/local identity, intended benefit, scope, transform-input inventory, cache/trust namespace, baseline/candidate subject and versions, sample method, units, approved budgets, actual parity/fault results, owner, enforcement stage and review date/trigger in the target's existing receipt convention. Unmeasured economics and unknown input coverage are explicitly unresolved, not passed.

## Failure and exceptions

Disable or invalidate unsafe caching and rerun the affected proof without it. A single bounded retry after safe cache discard may diagnose corruption, but its occurrence remains visible. Do not retry indefinitely, weaken assertions or accept stale output. Exceptions identify scope, owner, authority and expiry/revisit; they cannot convert a cache hit into correctness evidence.

## Revisit

Requalify on changed transforms, plugin inputs, framework/runtime versions, coverage mode, trust model or remote cache semantics. Rebenchmark when transfer/storage overhead or the test workload changes.

## Consequences

Disposable, input-bound caches can reduce repeated transformation while preserving fresh validation. Maintaining input identity, trust boundaries and parity fixtures adds work; workloads without qualifying net savings can retain local-only caching or disable it.
