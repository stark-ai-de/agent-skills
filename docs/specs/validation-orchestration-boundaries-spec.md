---
title: "Validation orchestration boundaries"
slug: "validation-orchestration-boundaries"
artifact_path: "docs/specs/validation-orchestration-boundaries-spec.md"
mode: "compact"
status: "accepted"
created: "2026-08-19"
updated: "2026-08-19"
source_request: "Describe how reusable validation gates and specialized validation topologies should be separated."
---

# Validation orchestration boundaries

## Goal

Separate declarative orchestration, reusable standard-gate mechanics, domain validation logic, and specialized fan-out/fan-in topology.

The design should remove repeated mechanics without hiding the execution graph or trust boundaries inside a highly conditional abstraction.

## Scope

In scope:

- ownership boundaries between workflow, task data, reusable lifecycle, and gate implementation;
- rules for extracting repeated standard jobs;
- explicit fan-out/fan-in accounting;
- one stable final validation result;
- incremental migration from duplicated jobs.

Out of scope:

- CI-vendor syntax;
- cache or artifact-store protocols;
- path-selection algorithms;
- domain-specific validation commands;
- repository-specific runner, branch, gate, shard, or artifact details.

The companion [reusable validation gate lifecycle spec](reusable-validation-gate-lifecycle-spec.md) defines the standard linear lifecycle.

## Layered model

| Layer | Owns | Does not own |
| --- | --- | --- |
| Orchestrator | Selection, job dependencies, conditions, matrices, concurrency, final aggregation, privileged transitions | Repeated gate mechanics or domain rules |
| Task descriptor | Commands, declared inputs, tools, environment, timeouts, prerequisites, evidence, outputs | CI transport or imperative topology |
| Reusable lifecycle | Prepare, attest, verify prerequisites, execute, normalize, publish, propagate | Selection, fan-out, deployment authority |
| Gate implementation | Domain validation and structured evidence | Scheduling, artifact authority, or release policy |

## Job classes

| Class | Treatment |
| --- | --- |
| Standard gate | Run one resolved task through the reusable lifecycle |
| Prerequisite-dependent gate | Keep the dependency edge visible; let the lifecycle verify exact outcomes |
| Fan-out/fan-in gate | Keep plan, parallel workers, and aggregation explicit until the complete topology becomes independently reusable |
| Promotion or deployment boundary | Keep separate because authorization, freshness, and proof verification differ from validation |

Parallel workers are partial execution details. Only the verified aggregate may represent the complete logical gate.

## Boundary rules

1. Extract a sequence only when its phase order and failure semantics are identical and its differences are validated data.
2. Keep job dependencies, conditions, matrices, fan-out, aggregation, and privileged transitions visible in orchestration.
3. Put command, dependency, timeout, tool, environment, prerequisite, evidence, and output variation in a closed task schema.
4. Keep domain checks in the gate implementation rather than the workflow or reusable lifecycle.
5. Do not add standard, sharded, aggregate, deploy, and release modes to one mega-component.
6. Extract a specialized topology separately only after multiple domains prove the same topology and trust semantics.

## Fan-out/fan-in contract

A specialized parallel gate requires four explicit stages:

### Plan

- Bind the logical task and immutable inputs.
- Assign every work item deterministically to exactly one partition.

### Execute

- Run partitions in isolated workers.
- Produce bounded structured reports.
- Preserve failures and process-cleanup results.

### Aggregate

- Require the exact expected report set.
- Reject missing, duplicate, stale, or unexpected reports.
- Prove complete one-result-per-item accounting.

### Publish

- Normalize one canonical aggregate outcome.
- Treat worker reports as diagnostic evidence, not independent reusable gate successes.

## Stable final result

A dynamic validation graph should still expose one stable required result. Its final aggregator must:

- explicitly interpret selected and skipped jobs;
- require one accepted result per selected logical gate;
- reject unexpected results;
- verify candidate integrity and declared outputs;
- distinguish executed and reused results;
- fail when topology or evidence is incomplete.

This is an orchestration responsibility, not a feature of each individual gate.

## Decision heuristic

For each new behavior:

1. Domain validation rule → gate implementation.
2. Declared task property → task descriptor.
3. Repeated linear execution phase → reusable lifecycle.
4. Dependency, parallelism, aggregation, authorization, or trust change → orchestration.
5. Repeated specialized topology with identical semantics → separate topology component.

## Migration approach

1. Inventory duplicated preparation, execution, recording, upload, and failure steps.
2. Classify every difference as task data, lifecycle input, topology, trust behavior, or accidental drift.
3. Define a strict narrow lifecycle interface.
4. Migrate one representative standard gate and prove success and failure paths.
5. Replace only equivalent callers.
6. Add structural tests for required wiring and forbidden duplication.

## Acceptance criteria

- Standard gates use one reusable lifecycle component.
- The workflow still exposes the complete graph and trust boundaries.
- Task variation is declarative rather than copied workflow code.
- Fan-out/fan-in publishes one complete aggregate result.
- Specialized topology is absent from the standard lifecycle's modes.
- The final required result verifies complete dynamic topology.
- Structural tests fail when duplicated lifecycle mechanics return.

## Reference validation commands

Map these placeholders to the adopting project:

```bash
<ci-linter> <workflow-files> <reusable-components>
<test-runner> <workflow-structure-tests> <gate-contract-tests>
<formatter> --check <changed-files>
```

The structure suite should cover standard callers, prerequisite callers, explicit parallel topology, final aggregation, privileged boundaries, exact reusable-component references, and absence of duplicated lifecycle commands.

## Source challenge summary

Full workflow duplication is easy to inspect but lets sensitive mechanics drift. Maximum abstraction reduces lines but hides topology. Layered extraction centralizes stable mechanics while preserving visible control flow and trust boundaries, so that approach is selected.

No repository-specific action path, gate name, fixed partition count, runner, branch, provenance record, or artifact naming scheme is normative.

## ADR gate result

No new durable policy is introduced. Trust contexts, reuse, proof authority, sharding, publication, and deployment remain repository-specific ADR concerns.

## User verification

A maintainer should identify every logical gate, dependency, matrix, specialized topology, final aggregator, and privileged boundary from the workflow without opening the reusable lifecycle.

## Risks

- A workflow can become too thin; keep topology and authority visible.
- A task descriptor can become executable code; keep its schema closed and declarative.
- Specialized behavior can accumulate as optional modes; split it into a separate topology.
- Structural tests can become formatting-sensitive; assert semantic markers and forbidden duplication.

## Done when

- [ ] Responsibilities are assigned to the four layers.
- [ ] Standard jobs use the reusable lifecycle.
- [ ] Fan-out/fan-in and privileged boundaries remain explicit.
- [ ] One final aggregator verifies all selected logical results.
- [ ] Structural tests protect the boundary.
