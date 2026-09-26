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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-14
Gist: Reduce feedback latency through measured parallelism without allowing partial or mismatched evidence to pass.

Variants: **Short** · [Long, canonical](ac-adr-061-shard-tests-as-complete-fail-closed-evidence-sets.long.md) · [Guide](ac-adr-061-shard-tests-as-complete-fail-closed-evidence-sets.guide.md)

## Decision summary

Distribute tests only as an identity-bound, complete partition of the selected proof obligation. Define the expected inventory independently, match every result to subject/configuration/runtime/platform/run attempt, and require all mandatory outcomes and predecessors. Missing, extra, overlapping, stale, foreign, failed or unexpectedly skipped evidence cannot produce green.

Measure end-to-end feedback and total runner cost before selecting shard and worker counts; four shards are a candidate, not policy. Preserve separate artifact/environment owners and required-check identity. Record targets, partition proof, adversarial merge cases and observations in local receipts. Unmeasured speedup is not success; use an unsharded equivalent or stop on incomplete evidence.
