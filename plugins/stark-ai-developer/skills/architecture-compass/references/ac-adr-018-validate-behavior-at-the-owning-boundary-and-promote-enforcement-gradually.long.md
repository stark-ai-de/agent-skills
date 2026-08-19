# AC-ADR-018: Validate Behavior at the Owning Boundary and Promote Enforcement Gradually

ID: AC-ADR-018
Title: Validate Behavior at the Owning Boundary and Promote Enforcement Gradually
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: testing, validation, enforcement, evidence
Applies when: Implementing, refactoring, reviewing, or turning documented rules into automated gates.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Prove behavior at the boundary that owns it and harden reliable checks into gates in deliberate stages.

Variants: [Short](ac-adr-018-validate-behavior-at-the-owning-boundary-and-promote-enforcement-gradually.short.md) · **Long, canonical** · [Guide](ac-adr-018-validate-behavior-at-the-owning-boundary-and-promote-enforcement-gradually.guide.md)

## Context

Tests that follow an arbitrary pyramid or mirror implementation details can be numerous while missing the boundary that actually owns a failure. Conversely, promoting an immature structural preference directly into a hard gate creates false positives, undocumented exceptions, and costly workarounds. Validation also becomes misleading when a local command is reported as CI, install, or deployed evidence.

## Decision

Repositories validate behavior at its owning boundary and add broader layers only for contracts that cross that boundary. They promote documented expectations into automated enforcement through explicit, evidence-backed stages.

### Test selection

- Test pure calculations, parsers, schemas, reducers, mappers, query keys, and cache-update logic with focused unit tests at the module that owns them.
- Test persistence, authorization, serialization, framework adapters, queues, external protocols, and other trust or I/O boundaries with integration or contract tests that exercise the real boundary wherever practical.
- Test critical user and operator journeys end to end in a production-like build and runtime. End-to-end coverage proves integration and recovery paths; it does not replace narrower diagnostic tests.
- Add a regression test at the lowest layer that reproduces a defect. Add broader coverage only when the defect also exposed a missing boundary contract or critical journey.
- Test failure, retry, cancellation, cleanup, unauthorized access, empty state, and recovery behavior when those states are part of the owning contract.

### Test quality

- Isolate mutable clients, caches, databases, files, queues, credentials, and tenant identity between tests. Shared state must be reset deterministically and must not create parallel-test coupling.
- Control clocks, random data, task scheduling, and network responses. Builders expose only values material to the scenario, while assertions focus on user-visible results, returned contracts, persisted effects, and emitted operational signals.
- Disable automatic retries in tests unless retry behavior is the subject under test. A test that passes only because hidden retries mask a failure is invalid evidence.
- Prefer real schemas and boundary adapters over mocks for contract proof. A mock can prove the caller's behavior but cannot prove compatibility with the substituted system.
- Run framework integration and end-to-end checks against a production-like build when development behavior differs in rendering, caching, bundling, routing, or error handling.

### Enforcement promotion

A new source-shape or policy rule starts as documented guidance with focused examples. It may move to a report-only check after its detection logic, scope, and expected exceptions are defined. It becomes a blocking local or CI gate only when it is deterministic, fast enough for the chosen stage, produces actionable output, has low false-positive risk, and includes an owned waiver or migration path.

Promotion requires named owners, a measured baseline, an explicit adoption boundary, and negative fixtures proving the check fails for the intended defect. Existing violations are migrated deliberately; they are not silently grandfathered or rewritten by an autofix whose behavior has not been reviewed.

### Evidence stages

Validation reports classify each claim as `source/static`, `local`, `CI`, `publication/install`, `deployed/production`, or `external/third-party`. For each stage they record the command or scenario, relevant environment or artifact identity, result, and any skipped or unavailable proof.

- Source inspection is not execution proof.
- A local pass does not establish CI behavior.
- CI does not establish that an artifact was published, installed, or deployed.
- Publication or install proof does not establish production activation or behavior.
- Deployment health does not establish an external platform or third-party contract unless that boundary was exercised directly.

## Failure handling

When a required layer cannot run, report the exact missing stage and risk instead of substituting a weaker layer. Quarantine or waive a flaky gate only with an owner, reason, bounded expiry, and restoration action. Stop promotion when results depend on uncontrolled state, undocumented environment access, or non-reproducible timing.

## Acceptance criteria

- Each changed contract has an identified owner and proportionate unit, boundary, or end-to-end proof.
- Tests are deterministic under supported parallelism and do not leak request, user, tenant, or cache state.
- Critical framework behavior is exercised in the relevant production-like mode.
- Every hard gate has positive and negative fixtures, actionable failures, and an owned exception process.
- Reports make skipped stages and the local-versus-CI/publication/deployment boundary explicit.

## Consequences

The repository may run fewer redundant tests while investing more in realistic boundary fixtures. Gate promotion takes longer than immediately failing the build, but the resulting enforcement is more trustworthy and cheaper to maintain.
