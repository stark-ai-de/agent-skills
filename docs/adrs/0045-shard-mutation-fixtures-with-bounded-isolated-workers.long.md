# ADR-0045: Shard mutation fixtures with bounded isolated workers

ID: ADR-0045
Title: Shard mutation fixtures with bounded isolated workers
Status: Accepted
Date: 2026-08-12
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: architecture-compass, concurrency, fixtures, process-isolation, testing
Applies when: Running or changing mutation-based Architecture Compass validation fixtures.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-12
Gist: Architecture Compass fixtures use deterministic bounded worker processes with complete case accounting and one-worker equivalence.

Variants: [Short](0045-shard-mutation-fixtures-with-bounded-isolated-workers.short.md) · **Long, canonical** · [Guide](0045-shard-mutation-fixtures-with-bounded-isolated-workers.guide.md)

## Decision

We will execute Architecture Compass mutation fixtures through one coordinator and bounded isolated Node.js worker processes while keeping top-level validation gates sequential. The coordinator alone will run shared parser and setup preflights, baseline validation, and the repository mutation guard; freeze a sorted inventory of stable case IDs and expected outcomes; assign those IDs round-robin; and own one exact run-scoped temporary root whose case directories are disjoint.

Each worker will execute only its assigned cases in a separate process and return the case ID, outcome, reason, duration, and inventory digest. The coordinator will fail closed on missing, duplicate, unexpected, or mismatched cases; worker error or timeout; repository mutation; or cleanup failure. Cancellation and timeout handling will terminate complete owned process groups, await their exits, and remove only the run-owned temporary root.

For an explicit request of `1`, `2`, or `3`, the effective worker count will be `min(requestedWorkers, max(1, availableParallelism() - 1), 3)`; `auto` will request three. Parallel execution may become the default only after one-worker behavior exactly matches the frozen legacy inventory and outcome polarity and the selected count passes the approved stability and performance benchmark; otherwise the default remains one. This decision does not authorize cross-gate parallelism.

## Why

- In-process promises cannot safely isolate process-wide cwd or cwd-bound module imports.
- Hundreds of complete fixture copies and validator runs are independent but currently serial.
- Stable IDs and frozen inventory prevent a sharding refactor from silently dropping or duplicating coverage.
- One coordinator is required to own whole-repository mutation detection, child lifecycle, and safe cleanup.
- Bounded runtime-aware concurrency avoids assuming that every local or hosted runner has the same capacity.

## Options

- Chosen: Deterministic round-robin case shards in separate processes under one coordinator.
- Rejected: In-process `Promise.all`, because cwd and module initialization would race.
- Rejected: Parallelizing the entire validation gate set, because isolation and proof ownership differ between gates and are deferred.
- Rejected: Parallel smoke-install cases, because same-agent cases currently share installation roots and the measured runtime is small.
- Rejected: Fixed unbounded worker counts, because runner capacity and filesystem contention vary.

## Consequences

- Good: Architecture Compass can use bounded hosted capacity while keeping every case isolated and accounted for.
- Good: Frozen inventory, deterministic reports, and a one-worker mode provide a direct equivalence and rollback path.
- Tradeoff: The registry needs stable IDs and a coordinator/worker protocol.
- Tradeoff: Process startup and filesystem contention can limit gains.
- Risk: Failed child cleanup could leave descendants or temporary data; process-group termination, awaited exits, and exact-root deletion mitigate it.

## Follow-up

- Benchmark one, two, and three workers on the same candidate and retain one when no stable improvement is proven.
- Consider fixture-copy acceleration only if phase timings show copying remains material after sharding.
