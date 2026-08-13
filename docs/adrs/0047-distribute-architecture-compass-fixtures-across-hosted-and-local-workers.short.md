# ADR-0047: Distribute Architecture Compass fixtures across hosted and local workers

ID: ADR-0047
Title: Distribute Architecture Compass fixtures across hosted and local workers
Status: Accepted
Date: 2026-08-13
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: architecture-compass, github-actions, sharding, fixtures, isolation
Applies when: Executing a cache-miss Architecture Compass mutation-fixture gate locally or in hosted validation.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: ADR-0045
Superseded by: None
Guide verified: 2026-08-13
Gist: A cache-miss Architecture Compass gate uses three deterministic hosted shards, bounded local workers, isolated copy-on-write fixtures, and one complete aggregate result.

Variants: **Short** · [Long, canonical](0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.long.md) · [Guide](0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.guide.md)

## Decision

We will execute a cache-miss Architecture Compass mutation-fixture gate as one planned and aggregated logical task distributed across three deterministic hosted shards. A plan/preflight stage will run shared parser and setup preflights, validate the baseline, freeze the sorted inventory of stable case IDs and expected outcomes, bind the task and inventory digests, and assign each ordinal to `ordinal modulo 3`. The three shard jobs will execute disjoint assignments and will not independently redefine inventory or task identity.

Each hosted shard will use isolated Node.js worker processes and resolve its local worker count as `min(3, max(1, availableParallelism() - 1))`, further capped by its assigned case count. A worker will execute only assigned cases under a shard-owned temporary root and return structured case ID, expected and observed outcome, reason, duration, shard identity, inventory digest, and task digest. Process cancellation and timeout will terminate complete owned process groups, await their exits, and clean only the exact shard-owned root.

Fixture materialization will use one sealed baseline capsule per shard. Each case will receive a disjoint copy created with `COPYFILE_FICLONE` where supported and ordinary copying as the required fallback. Hard links, shared writable fixture trees, reset-in-place reuse, and writable overlay sharing are prohibited. The shard will hash the sealed capsule before and after its cases and fail on mutation. Phase timings and copy strategy will be diagnostic evidence but will not affect case accounting or task identity.

One Architecture Compass aggregator will accept shard reports only when their task, inventory, schema, baseline, and assignment identities match the plan. It will reject missing, duplicate, unexpected, wrong-shard, differently classified, skipped, malformed, failed, or digest-inconsistent cases; require the exact disjoint union of the frozen inventory; and emit the single Architecture Compass gate result and accounting digest. Current repository-candidate mutation protection remains mandatory across the distributed task.

Local one-process execution and forced ordinary copying will remain deterministic rollback and diagnostic modes. Cross-gate scheduling belongs to the validation task graph governed by ADR-0046; this decision authorizes hosted distribution only inside the Architecture Compass logical gate and does not weaken its complete inventory, mutation, cleanup, or proof obligations.

## Context

The prior decision allowed only local child-process sharding under one coordinator and required hosted benchmarking before a higher default. Hosted evidence showed the Architecture Compass gate dominates cold validation. This successor preserves isolation and exact accounting while distributing one logical gate across hosted runners and improving fixture materialization.

## Consequences

- Good: Cold fixture work can use three hosted runners and bounded local parallelism.
- Good: A strict aggregate still represents exactly one complete Architecture Compass result.
- Tradeoff: Cache misses incur shard startup and artifact aggregation overhead.
- Risk: Reflinks may not exist, so ordinary copying remains the correctness-preserving fallback.
