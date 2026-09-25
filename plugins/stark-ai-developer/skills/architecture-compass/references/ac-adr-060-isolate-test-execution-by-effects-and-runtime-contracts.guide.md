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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-14
Gist: Keep parallel test results representative and independent by owning their runtime and side effects.

Variants: [Short](ac-adr-060-isolate-test-execution-by-effects-and-runtime-contracts.short.md) · [Long, canonical](ac-adr-060-isolate-test-execution-by-effects-and-runtime-contracts.long.md) · **Guide**

This Guide is non-normative; the Long controls. Use the [testing outcome receipt](../assets/testing-outcome-receipt-template.md) in the target's existing evidence convention and the [Vitest 4 profile](../assets/vitest4-testing-profile.md) only when its stack applies.

For V4, start process-sensitive suites with `pool: "forks"`, `isolate: true` and explicit per-process worker limits. Pure suites may use threads or reduced isolation only after measurement and leakage tests. Use actual process identities from the parent, workers and required product probes; a package-script name is not runtime evidence.

Separate local filesystem/loopback fixtures from genuinely external services. Where a hermeticity claim is required, use an enforced runner/container/network boundary and record its scope. A mocked HTTP client alone does not constrain subprocess network calls. Clean up children and resources in failure paths; exercise cancellation and timeout cases.

Qualification examples: repeated runs with fixed and varied recorded seeds; malformed input after a successful run; concurrent jobs with distinct fixture roots; child-process timeout; database namespace leak; a Bun-only product API with Node-hosted orchestration. Record observed results rather than inventing a fixed universal test-count threshold.

## Related decisions

Use AC-ADR-018 for owning-boundary proof and AC-ADR-013/014/058 for applicable toolchain and runtime selection.

## Sources

Current references: [V4 performance/isolation](https://v4.vitest.dev/guide/improving-performance), [Bun runtime selection](https://bun.sh/docs/runtime).
