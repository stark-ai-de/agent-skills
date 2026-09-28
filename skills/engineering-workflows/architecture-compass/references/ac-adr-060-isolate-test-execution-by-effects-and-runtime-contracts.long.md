# AC-ADR-060: Isolate test execution by effects and runtime contracts

ID: AC-ADR-060
Title: Isolate test execution by effects and runtime contracts
Status: Accepted
Date: 2026-09-14
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: testing, isolation, runtime-evidence, concurrency, hermeticity
Applies when: Tests share mutable resources, spawn processes, access external systems or exercise runtime-specific behavior.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-14
Gist: Keep parallel test results representative and independent by owning their runtime and side effects.

Variants: [Short](ac-adr-060-isolate-test-execution-by-effects-and-runtime-contracts.short.md) · **Long, canonical** · [Guide](ac-adr-060-isolate-test-execution-by-effects-and-runtime-contracts.guide.md)

## Context

Parallel tests can couple through files, ports, databases, environment state and child processes even when their modules are isolated. A passing harness also does not establish product compatibility when the harness and product use different runtimes.

## Intent

Make validation repeatable under realistic parallel execution without corrupting developer state or confusing a harness pass with product compatibility. Faster feedback is useful only when the same contracts still fail and pass for the same reasons.

## Decision

Each execution lane SHALL declare the contract it proves, harness/worker and product runtime boundaries, allowed I/O, mutable resources, maximum concurrency, timeouts and cleanup owner. Group tests by materially different effects or environments; do not create arbitrary empty projects. Choose candidates and fallbacks under existing runtime decisions, including AC-ADR-058 where adopted.

A harness runtime is not automatically the production runtime. A required browser, Bun, Node or other platform behavior SHALL have representative boundary proof for that platform. A fallback records its exact affected command, incompatibility or regression evidence, selected supported path and revisit trigger. Actual runtime identities must be observable where a compatibility claim depends on them.

## Invariants

- Positive repository-conformance tests do not mutate the real checkout or Git index. Negative/mutating cases own disposable locations or isolated services with unique namespaces.
- Fork/module isolation is not a filesystem, network or security sandbox. Shared files, ports, databases and environment resources have separate ownership and reset rules.
- Child processes have bounded execution, cancellation and cleanup. Global clock/randomness/environment changes are controlled and restored even on failure.
- Deterministic lanes do not depend on unapproved external network state. External/production-like tests remain separately identified and retain required gates; a local stub is not external compatibility proof.
- Automatic retries are disabled unless retry behavior is under test. Quarantines and waivers remain visible under the existing enforcement policy.
- Resource limits account for nested workers and concurrent project/CI processes; “all cores” in every process is not a capacity plan.

## Measurable outcomes

For the declared qualification set, require zero unauthorized checkout/index/shared-state writes, zero unexpected network events where observable, successful cleanup for every injected failure, and zero unexplained outcome differences between supported sequential and parallel runs. State the number of cases, seeds and repeats; this is bounded evidence, not proof that flakiness is impossible. Required runtime boundaries have complete owned coverage or an explicit unmet obligation.

Measure lane feedback time, memory, runner cost and flake frequency against target-approved budgets. Relaxed isolation or greater concurrency must improve the intended budget without violating the correctness metrics.

## Adoption evidence

Keep a target-native record of provider/local identity, user intent, lane/input scope, runtime matrix, enforced versus instructed restrictions, baseline workload, sample method, metric units/denominators, approved targets, observed results, evidence stage, owner and review trigger. A runtime or enforcement capability not observed is unknown, not successful. Adoption does not certify performance or compatibility. Unmeasured outcomes are not passed.

## Failure and exceptions

Leaks, incomplete cleanup, unhandled errors and unsupported required runtime behavior block the affected lane's promotion. Preserve other independent proof but do not replace a required external gate with an offline pass. Exceptions require owned scope, reason, bounded duration/revisit and alternative evidence. Do not change a protected product requirement to make a harness pass.

## Revisit

Requalify on runtime/framework changes, a new operating system, pool changes, new native dependencies, external service changes or changed concurrency/resource topology.

## Consequences

Explicit lane contracts make state leaks, runtime gaps and concurrency regressions attributable. Qualification adds fixture and measurement work, while conservative isolation may cost time or memory; any relaxation remains tied to representative correctness and benefit evidence.
