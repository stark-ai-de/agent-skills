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
Variant: Long
Canonical variant: Long
Supersedes: ADR-0045
Superseded by: None
Guide verified: 2026-08-13
Gist: A cache-miss Architecture Compass gate uses three deterministic hosted shards, bounded local workers, isolated copy-on-write fixtures, and one complete aggregate result.

Variants: [Short](0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.short.md) · **Long, canonical** · [Guide](0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.guide.md)

## Decision

We will execute a cache-miss Architecture Compass mutation-fixture gate as one planned and aggregated logical task distributed across three deterministic hosted shards. A plan/preflight stage will run shared parser and setup preflights, validate the baseline, freeze the sorted inventory of stable case IDs and expected outcomes, bind the task and inventory digests, and assign each ordinal to `ordinal modulo 3`. The three shard jobs will execute disjoint assignments and will not independently redefine inventory or task identity.

Each hosted shard will use isolated Node.js worker processes and resolve its local worker count as `min(3, max(1, availableParallelism() - 1))`, further capped by its assigned case count. A worker will execute only assigned cases under a shard-owned temporary root and return structured case ID, expected and observed outcome, reason, duration, shard identity, inventory digest, and task digest. Process cancellation and timeout will terminate complete owned process groups, await their exits, and clean only the exact shard-owned root.

Fixture materialization will use one sealed baseline capsule per shard. Each case will receive a disjoint copy created with `COPYFILE_FICLONE` where supported and ordinary copying as the required fallback. Hard links, shared writable fixture trees, reset-in-place reuse, and writable overlay sharing are prohibited. The shard will hash the sealed capsule before and after its cases and fail on mutation. Phase timings and copy strategy will be diagnostic evidence but will not affect case accounting or task identity.

One Architecture Compass aggregator will accept shard reports only when their task, inventory, schema, baseline, and assignment identities match the plan. It will reject missing, duplicate, unexpected, wrong-shard, differently classified, skipped, malformed, failed, or digest-inconsistent cases; require the exact disjoint union of the frozen inventory; and emit the single Architecture Compass gate result and accounting digest. Current repository-candidate mutation protection remains mandatory across the distributed task.

Local one-process execution and forced ordinary copying will remain deterministic rollback and diagnostic modes. Cross-gate scheduling belongs to the validation task graph governed by ADR-0046; this decision authorizes hosted distribution only inside the Architecture Compass logical gate and does not weaken its complete inventory, mutation, cleanup, or proof obligations.

## Why

- Architecture Compass mutation fixtures dominate cold validation duration and are independent once inventory and baseline identity are frozen.
- Hosted shards use separate runner capacity while local workers use bounded CPU capacity inside each runner.
- One aggregate task result prevents partial shard success from masquerading as gate success.
- Copy-on-write materialization can reduce repeated filesystem writes without sharing mutable fixture state.
- An exported root-parameterized validator removes process-wide cwd coupling and makes repeated isolated invocation explicit.

## Options

- Chosen: Three deterministic hosted shards, each with bounded isolated local workers, sealed copy-on-write capsules, and one strict aggregator.
- Rejected: One hosted job with only more local workers, because one runner's CPU and filesystem remain the cold-path ceiling.
- Rejected: One GitHub job per fixture, because runner startup, artifact count, and orchestration cost would overwhelm useful work.
- Rejected: Shared writable baselines or hard-linked cases, because in-place mutations can contaminate other fixtures and invalidate isolation.
- Rejected: Duration-weighted adaptive assignment in the initial design, because stable ordinal assignment is easier to audit and reproduce; later evidence may justify a successor.

## Consequences

- Good: Cold Architecture Compass work can use both hosted and local parallel capacity while preserving exact case accountability.
- Good: Each shard has bounded ownership, cancellation, cleanup, and immutable baseline checks.
- Good: One aggregate receipt remains compatible with the validation task graph and proof model.
- Tradeoff: Shard planning, artifact transfer, and aggregation add runner startup and orchestration overhead on cache misses.
- Tradeoff: Stable modulo assignment can be imbalanced when fixture durations vary.
- Risk: Filesystem reflinks may be unavailable; ordinary copying preserves correctness with lower performance.
- Risk: A lost or malformed shard artifact blocks the gate rather than accepting partial evidence.

## Follow-up

- Record hosted cold-run shard accounting, worker counts, copy strategies, phase timings, cancellation cleanup, and equivalence with the frozen inventory.
- Consider duration-aware assignment only through a successor backed by stable hosted evidence.
