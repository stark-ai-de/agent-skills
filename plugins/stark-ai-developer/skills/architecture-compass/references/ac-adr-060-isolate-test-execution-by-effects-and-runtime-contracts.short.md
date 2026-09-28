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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-14
Gist: Keep parallel test results representative and independent by owning their runtime and side effects.

Variants: **Short** · [Long, canonical](ac-adr-060-isolate-test-execution-by-effects-and-runtime-contracts.long.md) · [Guide](ac-adr-060-isolate-test-execution-by-effects-and-runtime-contracts.guide.md)

## Decision summary

Assign each test lane explicit runtime, state, I/O, concurrency and cleanup contracts. Preserve native tool/runtime ownership and prove required product behavior in a representative runtime, not just the harness. Repository-conformance tests remain read-only; negative cases use uniquely owned disposable resources. No hidden retries, unexpected external access or shared-state coupling may manufacture success.

Record actual runtime evidence, sequential/concurrent outcomes, cleanup and network enforcement limits, feedback/cost budgets and target-native adoption measurements. Start conservatively and relax isolation only after representative proof. Report missing evidence, leaks and expiring exceptions explicitly; revisit on runtime, topology or resource changes.
