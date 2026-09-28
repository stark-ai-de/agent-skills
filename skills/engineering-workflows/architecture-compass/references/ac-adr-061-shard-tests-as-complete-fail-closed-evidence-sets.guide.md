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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-14
Gist: Reduce feedback latency through measured parallelism without allowing partial or mismatched evidence to pass.

Variants: [Short](ac-adr-061-shard-tests-as-complete-fail-closed-evidence-sets.short.md) · [Long, canonical](ac-adr-061-shard-tests-as-complete-fail-closed-evidence-sets.long.md) · **Guide**

This Guide is non-normative; the Long controls. Use the [testing outcome receipt](../assets/testing-outcome-receipt-template.md) in the target's existing evidence convention and the [Vitest 4 profile](../assets/vitest4-testing-profile.md) only when its stack applies.

Vitest V4 shards test files. Split dominant monoliths by independently meaningful contracts, not arbitrary line counts. Compare 1/2/4 where useful and budget the workers of every local shard. Use the native blob reporter and merge command; supplement it only with the smallest tested identity/inventory adapter.

Use separate incoming `blobs/`, metadata and merged-output directories. Artifact names should identify run attempt, lane and shard. A directory with four files is insufficient: check expected identities and predecessor results before reporting success. If per-test attachments matter, upload/download them separately from blobs.

In GitHub Actions, continue collecting independent shard diagnostics after a failure where possible, keep aggregation from reporting green after cancellation, and preserve the required check consumed by merge/release policy. Explicitly test bad or missing artifacts; do not infer safety from `if: always()` or successful JSON parsing.

For a small repository, record N=1 and the trigger to reconsider. For a large repository, record critical-path gain together with runner seconds, memory and variance. Do not discard a required OS lane to improve those numbers.

## Related decisions

Use AC-ADR-018 for owning-boundary proof, AC-ADR-025 for performance budgets and AC-ADR-049 for evidence reuse alongside the target's delivery and release decisions.

## Sources

Current references: [V4 sharding](https://v4.vitest.dev/guide/improving-performance), [V4 reporters](https://v4.vitest.dev/guide/reporters), [GitHub workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).
