# ADR-0045: Shard mutation fixtures with bounded isolated workers

ID: ADR-0045
Title: Shard mutation fixtures with bounded isolated workers
Status: Superseded
Date: 2026-08-12
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: architecture-compass, concurrency, fixtures, process-isolation, testing
Applies when: Running or changing mutation-based Architecture Compass validation fixtures.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0047
Guide verified: 2026-08-12
Gist: Architecture Compass fixtures use deterministic bounded worker processes with complete case accounting and one-worker equivalence.

Variants: [Short](0045-shard-mutation-fixtures-with-bounded-isolated-workers.short.md) · [Long, canonical](0045-shard-mutation-fixtures-with-bounded-isolated-workers.long.md) · **Guide**

This guide is non-normative. [Long](0045-shard-mutation-fixtures-with-bounded-isolated-workers.long.md) is authoritative.

## How to apply

- Capture the legacy registry IDs, expected polarity, and digest before changing execution structure.
- Keep shared parser/setup checks, baseline validation, inventory verification, and the repository mutation guard in the coordinator.
- Sort stable case IDs and assign them round-robin by index modulo worker count.
- Use detached child processes on the canonical Linux/WSL and hosted Linux environments so the coordinator can terminate complete process groups.
- Allocate one `mkdtemp` run root and distinct case directories below it. Never clean a broad system temporary directory or an unresolved path.
- Return structured worker reports and reject missing, duplicate, unexpected, differently classified, or digest-inconsistent cases.
- Resolve configured `auto`, `1`, `2`, or `3` against runtime parallelism and retain one-worker mode as the rollback.
- Keep cross-gate scheduling sequential and retain all six smoke cases serially in this phase.

## Verification

- Compare one-worker case IDs, expected polarity, outcomes, and inventory digest with the frozen legacy artifact.
- Inject worker failure, timeout, signal, malformed report, duplicate ID, missing ID, and stray child scenarios.
- Confirm all descendants exit and only the run-owned temporary root is removed.
- Run three comparable hosted measurements for two and three workers; require successful equivalence and bounded duration spread before enabling either.

## Current references

- [Node.js OS parallelism](https://nodejs.org/api/os.html#osavailableparallelism)
- [Node.js child processes](https://nodejs.org/api/child_process.html)
- [GitHub-hosted runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)

## Revisit

Create a successor if mutation fixtures move to shared mutable state, the coordinator no longer owns repository guarding and cleanup, or cross-gate scheduling becomes part of this decision.
