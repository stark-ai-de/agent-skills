# AC-ADR-061: Shard tests as complete fail-closed evidence sets

ID: AC-ADR-061
Title: Shard tests as complete fail-closed evidence sets
Status: Accepted
Date: 2026-09-14
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: testing, sharding, ci, evidence-integrity, performance
Applies when: A required test obligation is distributed across workers, machines, platforms or independently reported jobs.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-14
Gist: Reduce feedback latency through measured parallelism without allowing partial or mismatched evidence to pass.

Variants: [Short](ac-adr-061-shard-tests-as-complete-fail-closed-evidence-sets.short.md) · **Long, canonical** · [Guide](ac-adr-061-shard-tests-as-complete-fail-closed-evidence-sets.guide.md)

## Context

Distributing tests across independently reported jobs can shorten feedback, but report counts and successful individual jobs do not establish a complete required verdict. Setup, transfer and aggregation costs can also outweigh the time saved by additional shards.

## Intent

Shorten the time to a trustworthy required verdict without losing test coverage, increasing cost beyond an approved limit or accepting incomplete distributed evidence. The desired outcome is faster complete proof, not simply more jobs.

## Decision

A distributed test run SHALL define one expected proof set and aggregate results only when they form a complete, attributable partition for that set. Its identity includes source commit or exact working-tree/artifact digest, framework/configuration/lockfile identity, project/runtime/platform, selected test and data inventories, run ID and attempt. Platform/runtime matrix lanes are separate partitions; intentional execution in multiple required environments is not an accidental duplicate.

A plan or documented deterministic rule SHALL define expected membership independently of successful result files. Each shard reports its assigned inventory, actual completed cases and outcomes, execution identity and exit state through native reports plus minimal tested identity metadata where needed. Counts alone do not prove coverage.

## Invariants

- Within each partition, the union of shard file identities equals the expected set and intersections are empty. Case counts/identities and input coverage reconcile where applicable, including dynamic data-driven cases and intentional skips.
- No expected case may disappear after collection, and failed, errored, unexpectedly skipped or unfinished cases cannot become a passing required obligation.
- Missing, extra, overlapping, duplicate, foreign, stale or malformed evidence is rejected. Evidence from different attempts cannot be mixed silently; any deliberate partial-rerun policy must establish an equivalent complete subject-bound set.
- Required predecessor failures, cancellations and unexpected job skips prevent a successful aggregate even when some reports say passed. Diagnostics are attempted where possible, but inability to aggregate never means success.
- Reports and attachments remain attributable and come from the allowed run/trust boundary. Do not execute untrusted report payloads with elevated authority.
- Native build/typecheck/lint/external/platform obligations retain explicit owners. Avoid duplicated work only when it proves the same immutable artifact and environment contract.

## Measurable outcomes

Require zero missing/overlapping/foreign test identities and zero false-green results across a declared adversarial aggregation suite. Test at least the missing-report, missing-case, duplicate-shard, wrong-subject/configuration, failed-case and failed/cancelled/skipped-required-job conditions. Compare the selected sharded execution with an equivalent unsharded expected inventory and outcomes.

Approve a target latency budget and runner-cost/resource counter-budget before rollout. Include setup, queues as declared, repeated dependency work, reports and merge in the measured critical path; record total runner allocation separately. Select N and worker limits from observed benefit. N=1 is valid when fan-out is unnecessary or uneconomic; no universal shard count or improvement percentage is required.

## Adoption evidence

Record intent, provider/local mapping, proof-set identity, planned partition algorithm, selected N/worker limits, baseline/candidate measurements and units, samples/spread, approved budgets, adversarial fixture results, owner, enforcement stage and revisit trigger in target-native receipts. Governance adoption and enabled sharding are not achieved-outcome claims.

## Failure and exceptions

Stop promotion on incomplete proof or a reproducible budget breach. Reducing N or returning to a supported unsharded equivalent is allowed without dropping obligations. An exception must specify approval, exact scope, expiry/revisit and replacement proof; it cannot label an incomplete mandatory set complete. Preserve protected-check and release-consumer contracts during cutover.

## Revisit

Rebenchmark after test distribution, runner capacity, billing model, artifact topology or report format changes. Requalify fault cases when CI conditions, required checks or partial-rerun rules change.

## Consequences

Explicit partition identity and completeness protect the required verdict from partial or mismatched reports. Aggregation needs inventory metadata and adversarial fixtures, and its overhead may favor an unsharded equivalent over additional parallel jobs.
