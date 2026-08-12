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
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-12
Gist: Architecture Compass fixtures use deterministic bounded worker processes with complete case accounting and one-worker equivalence.

Variants: **Short** · [Long, canonical](0045-shard-mutation-fixtures-with-bounded-isolated-workers.long.md) · [Guide](0045-shard-mutation-fixtures-with-bounded-isolated-workers.guide.md)

## Decision

We will execute Architecture Compass mutation fixtures through one coordinator and bounded isolated Node.js worker processes while keeping top-level validation gates sequential. The coordinator alone will run shared parser and setup preflights, baseline validation, and the repository mutation guard; freeze a sorted inventory of stable case IDs and expected outcomes; assign those IDs round-robin; and own one exact run-scoped temporary root whose case directories are disjoint.

Each worker will execute only its assigned cases in a separate process and return the case ID, outcome, reason, duration, and inventory digest. The coordinator will fail closed on missing, duplicate, unexpected, or mismatched cases; worker error or timeout; repository mutation; or cleanup failure. Cancellation and timeout handling will terminate complete owned process groups, await their exits, and remove only the run-owned temporary root.

For an explicit request of `1`, `2`, or `3`, the effective worker count will be `min(requestedWorkers, max(1, availableParallelism() - 1), 3)`; `auto` will request three. Parallel execution may become the default only after one-worker behavior exactly matches the frozen legacy inventory and outcome polarity and the selected count passes the approved stability and performance benchmark; otherwise the default remains one. This decision does not authorize cross-gate parallelism.

## Context

- Fixture cases change process-wide cwd and import cwd-bound validator modules.
- Hundreds of serial repository copies dominate hosted validation time.
- Shared guards and temporary roots need one owner for deterministic cleanup and mutation detection.

## Consequences

- Good: Independent cases can use available runner capacity without racing process-global state.
- Tradeoff: The coordinator/worker protocol and frozen inventory become validation contracts.
- Risk: Filesystem contention can erase gains, so hosted measurement controls the enabled worker count.
