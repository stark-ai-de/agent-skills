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
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0045
Superseded by: None
Guide verified: 2026-08-13
Gist: A cache-miss Architecture Compass gate uses three deterministic hosted shards, bounded local workers, isolated copy-on-write fixtures, and one complete aggregate result.

Variants: [Short](0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.short.md) · [Long, canonical](0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.long.md) · **Guide**

This guide is non-normative. [Long](0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.long.md) is authoritative.

## How to apply

- Export a root-parameterized validator such as `validateArchitecture(root)` and keep the CLI as a thin `process.cwd()` adapter.
- Let the plan stage own shared preflights, baseline validation, sorted inventory, expected polarity, task digest, and modulo-three assignment.
- Give each shard an exact assignment and private temporary root. Within it, use at most three detached worker processes and disjoint case directories.
- Create and seal one baseline capsule per shard. Clone regular files with `COPYFILE_FICLONE`; retry with normal copying only when reflink support is unavailable.
- Never use hard links or share writable directories. Hash the capsule before and after case execution.
- Include materialize, mutate, validate, cleanup, worker-startup, and merge durations as diagnostics only.
- Aggregate only exact plan-bound shard reports and require the complete frozen inventory before creating the gate receipt.
- Keep forced one-worker and forced ordinary-copy modes available for diagnosis and rollback.

## Verification

- Assert the current frozen 325-case inventory appears exactly once across three disjoint shards with the same expected polarity and accounting digest.
- Reject missing, duplicate, unexpected, wrong-shard, malformed, skipped, failed, and digest-inconsistent results.
- Exercise one, two, and three local workers, reflink success, reflink fallback, sealed-baseline mutation, timeout, signal, descendant cleanup, and partial artifact loss.
- Compare current hosted cold-run semantic results with the prior frozen one-worker result; record timings without using local runs for performance acceptance.

## Current references

- [Node.js `fs` copy flags](https://nodejs.org/api/fs.html#file-copy-constants)
- [Node.js OS parallelism](https://nodejs.org/api/os.html#osavailableparallelism)
- [Node.js child processes](https://nodejs.org/api/child_process.html)
- [GitHub-hosted runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)

## Revisit

Create a successor if shard count or assignment becomes adaptive, cases share writable state, fixture isolation changes, or distributed partial results gain independent proof meaning.
