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

Define a general boundary between declarative validation orchestration, reusable standard-gate execution, domain validation logic, and specialized fan-out/fan-in topologies.

The design should reduce duplication without turning the CI workflow into a hidden, highly conditional framework.

## Scope

In scope:

- Classification of validation jobs by execution shape.
- Ownership boundaries between workflow, manifest, reusable lifecycle, and gate implementation.
- Rules for deciding what to extract and what to keep explicit.
- Fan-out/fan-in accounting and publication boundaries.
- Incremental migration from duplicated jobs to reusable components.

Out of scope:

- A specific CI syntax or vendor.
- A specific cache or artifact-store protocol.
- Gate selection algorithms and path-matching details.
- Domain-specific test, lint, build, or release commands.
- Deployment and release policy beyond identifying them as separate trust boundaries.

The companion [reusable validation gate lifecycle spec](reusable-validation-gate-lifecycle-spec.md) defines the linear lifecycle used by standard gates.

## Layered model

| Layer | Owns | Must not own |
| --- | --- | --- |
| Orchestrator | Selection, dependencies, matrices, concurrency, privileged transitions, final aggregation | Repeated gate mechanics or domain validation rules |
| Manifest or task descriptor | Commands, declared inputs, tools, environment, timeouts, prerequisites, evidence, outputs | CI transport steps or hidden imperative branching |
| Reusable gate lifecycle | Prepare, attest, verify prerequisites, execute, normalize, publish, propagate | Gate selection, fan-out topology, deployment authorization |
| Gate implementation | Domain validation and structured evidence production | Artifact-store policy or workflow scheduling |

This separation keeps the workflow readable while allowing shared mechanics to evolve in one place.

## Validation job classes

### Standard gate

A standard gate runs one resolved task in one worker job and produces one canonical result. It should use the reusable gate lifecycle.

Typical variation is declarative:

- gate identity;
- dependency profile;
- required tools;
- prerequisite outcomes;
- timeout;
- evidence contract;
- declared outputs.

### Prerequisite-dependent standard gate

This remains a standard gate when it differs only by requiring exact outcomes from earlier tasks. The orchestrator owns the dependency edge; the reusable lifecycle owns prerequisite verification.

### Fan-out/fan-in gate

A fan-out/fan-in gate has an internal topology such as:

1. produce a deterministic execution plan;
2. execute disjoint partitions in parallel;
3. aggregate every partition into one complete result;
4. publish one canonical gate outcome.

This topology should remain explicit in orchestration until it is independently reusable as a stable unit. Individual shards are execution details and must not masquerade as complete gate results.

### Promotion or deployment boundary

Publication, deployment, tagging, or release jobs cross a trust boundary. They should not be folded into the standard validation lifecycle merely because they share setup steps. They require their own authorization, freshness, and proof-verification contract.

## Extraction rules

### Extract repeated mechanics, not repeated text alone

A sequence is a good reusable-lifecycle candidate when:

- it appears in at least two jobs;
- the phase order is identical;
- differences can be expressed as validated data;
- success and failure semantics are the same;
- it does not cross a distinct trust boundary.

Similar-looking steps should remain separate when they have different authority, evidence, failure, or topology semantics.

### Keep orchestration visible

The workflow should continue to show:

- which job depends on which;
- which jobs are conditional;
- which tasks use a matrix;
- where fan-out begins and aggregation completes;
- where privileged publication or deployment occurs;
- which final job represents the stable required result.

A reviewer should not need to inspect a reusable component to understand the high-level execution graph.

### Prefer data over caller-specific branches

Variation that belongs to a task contract should be represented as data rather than repeated workflow steps or `if` branches inside the reusable lifecycle.

Good candidates include:

- commands and arguments;
- dependency profiles;
- environment allowlists;
- tool identities;
- timeouts;
- prerequisite IDs;
- evidence types;
- declared restorable outputs.

Topology, authorization, and trust transitions are not ordinary task data.

### Do not build a mega-action

A reusable component becomes an orchestration framework when it contains many mode switches such as standard, sharded, aggregate, deploy, release, or publish. At that point it hides the graph and couples unrelated failure semantics.

Split the abstraction instead:

- one standard-gate lifecycle;
- narrow domain adapters where required;
- explicit specialized topology;
- separate privileged publication workflows.

## Fan-out/fan-in contract

A specialized parallel gate must satisfy these general requirements:

### Deterministic plan

- The plan binds the selected task identity and immutable input set.
- Partition assignment is deterministic and complete.
- Each work item belongs to exactly one partition.
- Worker-count tuning must not change semantic assignment or evidence identity unless explicitly part of the contract.

### Isolated execution

- Partitions execute without shared mutable state.
- Each partition reports bounded, structured evidence.
- A partition failure cannot be hidden by successful siblings.
- Cancellation and process cleanup are explicit.

### Complete aggregation

- The aggregator requires the exact expected partition set.
- Missing, duplicate, stale, or unexpected reports fail closed.
- Aggregate accounting proves every planned item has exactly one terminal result.
- Only the aggregate outcome represents the complete gate.

### Canonical publication

- The aggregator normalizes the complete result through the same evidence model used by other gates.
- Partition reports may be retained as diagnostics, but reuse and trusted proof should bind the canonical aggregate result.

## Stable final aggregation

A validation workflow should expose one stable final status even when the internal graph is dynamic. The final aggregator must:

- inspect selected, skipped, successful, and failed jobs explicitly;
- require one accepted result for every selected logical gate;
- reject unexpected results;
- verify candidate integrity across the complete run;
- restore and verify declared outputs before success;
- distinguish executed and reused results;
- fail when topology or evidence is incomplete.

This stable final result is an orchestration responsibility and should not be implemented separately inside each gate.

## Decision heuristic

Use the following sequence when deciding where new behavior belongs:

1. **Is it domain validation logic?** Put it in the gate implementation.
2. **Is it a declared task property?** Put it in the manifest or task descriptor.
3. **Is it part of the repeated linear execution lifecycle?** Put it in the reusable gate component.
4. **Does it change dependencies, parallelism, aggregation, authorization, or trust?** Keep it in orchestration.
5. **Has a specialized topology repeated across independent domains with the same semantics?** Consider extracting it as a separate, versioned topology component rather than extending the standard gate lifecycle.

## Migration approach

### 1. Inventory repeated phases

Identify duplicated checkout, setup, dependency installation, runtime attestation, execution, outcome recording, artifact upload, and failure propagation.

### 2. Classify every difference

Mark each variation as:

- task data;
- lifecycle adapter input;
- orchestration topology;
- trust-boundary behavior;
- accidental inconsistency.

Do not extract until every difference has an owner.

### 3. Define the narrow interface

Create the reusable standard-gate contract with strict required inputs and explicit optional outputs. Reject unknown values.

### 4. Migrate one representative gate

Prove success, setup failure, validation failure, publication failure, and prerequisite behavior before moving other callers.

### 5. Replace equivalent callers

Move only jobs with identical lifecycle semantics. Keep specialized parallel and privileged jobs explicit.

### 6. Add structural contract tests

Tests should assert both positive wiring and absence of the old duplicated lifecycle. They should also protect immutable dependency pins and the visible specialized topology.

## Acceptance criteria

- Standard gates use one reusable lifecycle component.
- The workflow still exposes the complete job graph and trust boundaries.
- Task variation is declared in validated data instead of copied steps.
- Fan-out/fan-in gates publish one complete aggregate result.
- Specialized topology is not represented by mode switches in the standard gate lifecycle.
- The final required result explicitly verifies dynamic topology and complete evidence.
- Adding a new standard gate does not require copying lifecycle steps.
- Adding a specialized gate requires an explicit topology and accounting contract.
- Structural tests fail if duplicated lifecycle mechanics are reintroduced.

## Reference validation commands

Each implementation should map these placeholders to project tooling:

```bash
<ci-linter> <workflow-files> <reusable-components>
<test-runner> <workflow-structure-tests> <gate-contract-tests>
<formatter> --check <changed-files>
```

The structure suite should cover: standard callers, prerequisite-dependent callers, explicit fan-out/fan-in jobs, final aggregation, privileged boundaries, exact reusable-component references, and absence of duplicated lifecycle commands.

## Source challenge summary

The design balances three competing goals:

- full workflow explicitness, which is easy to inspect but duplicates sensitive mechanics;
- maximum abstraction, which reduces lines but hides execution and trust boundaries;
- layered extraction, which centralizes stable mechanics while preserving visible orchestration.

Layered extraction is selected. No repository-specific gate names, fixed partition count, action path, runner image, or artifact naming scheme is part of the general contract.

## ADR gate result

No new architecture policy is established here. The specification describes an implementation boundary. Durable decisions about trust contexts, cache reuse, proof authority, sharding policy, publication, and deployment should remain in repository-specific ADRs.

## User verification

A maintainer reviewing the resulting workflow should be able to identify, without opening implementation code:

- every logical gate;
- every dependency and matrix;
- the specialized parallel topology;
- the final required aggregator;
- every privileged publication or deployment boundary.

Opening the reusable lifecycle should then reveal one consistent standard-gate implementation rather than additional hidden orchestration.

## Risks and mitigations

- **Workflow becomes too thin:** critical topology may disappear into an action. Mitigate by keeping dependencies, conditions, matrices, and aggregation in the workflow.
- **Manifest becomes executable code:** excessive configuration can hide branching. Mitigate with a closed schema and declarative fields only.
- **Specialized gates are forced into the standard lifecycle:** optional modes accumulate. Mitigate by defining separate topology components.
- **Structural tests become brittle:** raw line-count or formatting assertions create noise. Mitigate by testing semantic markers, required references, and forbidden duplication.
- **Cross-repository reuse happens too early:** an unstable interface becomes hard to change. Mitigate by proving the boundary locally before publishing a reusable workflow or package.

## Done when

- [ ] Responsibilities are assigned to the four layers.
- [ ] Standard jobs use the reusable gate lifecycle.
- [ ] Fan-out/fan-in and privileged boundaries remain explicit.
- [ ] One final aggregator verifies all selected logical results.
- [ ] Structural tests protect the intended boundary.
- [ ] Repository-specific documentation links to these specs rather than restating the general approach.
