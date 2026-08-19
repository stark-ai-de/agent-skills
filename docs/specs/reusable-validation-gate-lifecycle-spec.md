---
title: "Reusable validation gate lifecycle"
slug: "reusable-validation-gate-lifecycle"
artifact_path: "docs/specs/reusable-validation-gate-lifecycle-spec.md"
mode: "compact"
status: "accepted"
created: "2026-08-19"
updated: "2026-08-19"
source_request: "Describe a reusable validation-gate approach without repository-specific implementation detail."
---

# Reusable validation gate lifecycle

## Goal

Define a portable contract for executing one standard validation gate without duplicating setup, runtime attestation, execution, evidence publication, and failure handling in every CI job.

The workflow should declare **what** gate to run. A reusable lifecycle component should own **how** a normal gate is prepared, executed, recorded, and published.

## Scope

In scope:

- Standard gates that execute one resolved task in one worker job.
- Optional dependency installation derived from the resolved task.
- Optional prerequisite outcomes from earlier gates.
- Runtime and tool identity attestation.
- Canonical success results and failure tombstones.
- Immutable artifact publication and final failure propagation.

Out of scope:

- Selecting which gates run.
- Building dynamic matrices or dependency graphs.
- Fan-out/fan-in validation topologies.
- Cache-key design, artifact-store implementation, or deployment authorization.
- Domain-specific validation logic.

The companion [validation orchestration boundaries spec](validation-orchestration-boundaries-spec.md) defines where this lifecycle ends and orchestration begins.

## Design principles

1. **Intent stays visible.** A caller should expose the gate identity, dependency mode, prerequisite inputs, and produced outputs without repeating lifecycle mechanics.
2. **Resolved data is authoritative.** Commands, dependencies, timeouts, tools, environment, and prerequisite keys come from a validated task descriptor rather than caller-maintained copies.
3. **Success is evidenced, not assumed.** A zero exit code is insufficient when the gate contract requires structured evidence, output digests, or capability markers.
4. **Failures remain publishable.** Setup or execution failures should produce a canonical tombstone whenever the evidence channel is still available.
5. **The lifecycle fails closed.** Missing inputs, contradictory identities, incomplete prerequisites, or publication failures must not be converted into success.
6. **The abstraction remains narrow.** It centralizes a repeated linear lifecycle; it does not hide specialized workflow topology behind conditional branches.

## Interface contract

A reusable gate runner accepts the following logical inputs. Implementations may expose them as action inputs, function arguments, command-line flags, or typed configuration.

| Input | Meaning | Requirement |
| --- | --- | --- |
| Gate identity | Stable identifier for the selected task | Required |
| Resolution | Validated task descriptor and candidate boundary | Required |
| Workspace | Materialized candidate to validate | Required |
| Producer identity | Run, attempt, job, and source identity used by evidence | Required |
| Dependency mode | Whether declared dependencies must be installed | Required, default deny |
| Prerequisite outcomes | Exact successful outcomes required by this task | Optional |
| Outcome publication | Whether downstream tasks need the normalized outcome | Optional |
| Gate-specific adapter inputs | Narrow values that cannot be derived from the resolution | Optional and explicitly declared |

The interface must reject unknown inputs and must not silently infer security-sensitive values from mutable external state.

## Lifecycle phases

### 1. Validate inputs

- Load and validate the task resolution.
- Confirm the gate is selected and is not already reused.
- Confirm the workspace and candidate boundary match the resolution.
- Confirm producer identity fields are present and well formed.

No dependency installation or gate command may start before this phase succeeds.

### 2. Prepare declared dependencies

- Install only dependency profiles declared by the selected task.
- Skip installation when the task declares no profile.
- Use deterministic package metadata and locked dependency resolution.
- Treat installation failure as a gate failure, not as permission to run with ambient dependencies.

### 3. Attest the execution runtime

- Resolve the exact executable paths required by the gate.
- Record stable tool identities and platform policy.
- Validate that required local tools come from the intended dependency boundary.
- Build a sanitized execution environment containing only declared and injected values.

### 4. Verify prerequisites

- Load only the prerequisite outcomes named by the task contract.
- Require exact gate identity, task key, resolution identity, candidate boundary, and successful status.
- Reject duplicate, missing, stale, or unexpected prerequisite outcomes.

A prerequisite that has already been independently reused may be accepted through the resolution rather than downloaded again.

### 5. Execute the gate

- Run the expanded command from the resolution.
- Enforce the declared timeout and process-cleanup policy.
- Capture bounded output required for evidence extraction.
- Preserve the candidate boundary before and after execution.

### 6. Normalize the outcome

Convert raw process facts into one canonical outcome:

- `passed` with complete evidence and declared output witnesses, or
- `failed` with a bounded reason and available process evidence.

Gate-specific evidence extraction belongs behind typed evidence contracts, not caller-specific shell parsing.

### 7. Publish immutable evidence

- Record a reusable result only when execution, evidence, candidate integrity, and producer identity all pass.
- Otherwise record a non-reusable tombstone.
- Package the result and declared outputs canonically.
- Upload under an attempt-safe immutable name.
- Optionally publish the normalized outcome for a downstream prerequisite.

The upload or verification of the canonical record is part of the gate result. A validation command that passed but could not publish required evidence has not completed successfully.

### 8. Propagate the final status

Evidence publication runs before failure propagation. After recording is complete, the worker exits unsuccessfully when setup, execution, normalization, or publication did not complete as required.

## Required invariants

| Condition | Required behavior |
| --- | --- |
| Resolution or candidate identity is malformed | Stop before execution |
| Declared dependencies cannot be installed | Record a tombstone when possible, then fail |
| Runtime identity contradicts the task contract | Do not execute the gate |
| A prerequisite is absent or contradictory | Fail closed |
| The gate command fails or times out | Record failure evidence, then fail |
| The candidate changes during execution | Reject the result and publish a tombstone |
| Required evidence is incomplete | Reject the apparent success |
| Canonical artifact upload or verification fails | Fail the worker |
| The gate succeeds and publication succeeds | Return success with stable output metadata |

## Appropriate implementation shapes

Use the smallest mechanism that preserves this contract:

- An in-repository composite action or equivalent step bundle for repeated jobs in one repository.
- A typed runner module when lifecycle logic requires substantial validation or testing.
- A reusable workflow only when the complete job boundary is stable across repositories.
- A versioned package only after the interface is mature enough to support independent releases.

Keep platform-specific transport details behind adapters. The lifecycle contract itself should remain independent of a particular CI vendor or artifact service.

## Acceptance criteria

- A standard gate caller contains no duplicated install, attest, execute, record, upload, or propagate sequence.
- Adding a new standard gate requires declarative inputs rather than copied shell steps.
- The reusable component rejects unknown and contradictory inputs.
- Setup failures and validation failures follow the same canonical recording path.
- Required artifacts are immutable, attempt-safe, and verified before success.
- Prerequisite outcomes are exact and cannot be substituted by artifact-name or latest-run fallback.
- Specialized fan-out/fan-in gates are not forced through this linear abstraction.
- Contract tests prove both successful and failing paths.

## Reference validation commands

Each implementation should map these placeholders to its project tooling:

```bash
<ci-linter> <workflow-files> <reusable-gate-definition>
<test-runner> <gate-lifecycle-contract-tests>
<formatter> --check <changed-files>
```

The contract suite should include at least: no-dependency execution, dependency installation, prerequisite success and rejection, execution failure, setup failure, candidate mutation, evidence incompleteness, artifact publication failure, and successful outcome publication.

## Source challenge summary

Three boundaries were considered:

- Keep duplicated steps in each job: maximally explicit, but provenance and failure behavior drift over time.
- Move all orchestration into one configurable component: fewer workflow lines, but topology and trust boundaries become hidden behind conditionals.
- Extract only the repeated linear gate lifecycle: centralizes mechanics while leaving selection, dependencies, matrices, and specialized aggregation visible.

The third boundary is selected. No vendor-specific action, API, or repository layout is normative.

## ADR gate result

No new durable architecture decision is introduced by this implementation spec. Repositories adopting the pattern should keep trust, cache reuse, artifact authority, and publication policy in their own ADRs. This specification only defines the reusable execution boundary.

## User verification

A maintainer should be able to verify the design by answering both questions from the workflow alone:

1. Which gates and topologies will run?
2. Which common lifecycle implementation will execute a standard gate?

The first answer must remain visible in orchestration. The second should point to exactly one reusable component.

## Risks and mitigations

- **Over-generalization:** too many optional inputs recreate a hidden workflow. Mitigate by refusing topology-specific branches and splitting specialized adapters.
- **Hidden behavior:** concise callers can obscure critical steps. Mitigate with a documented phase contract and focused contract tests.
- **Interface drift:** callers and the reusable component can evolve independently. Mitigate with strict input validation and one compatibility test per caller class.
- **False success after publication failure:** command success may be mistaken for gate success. Mitigate by treating required evidence publication as part of the lifecycle.

## Done when

- [ ] One reusable component owns the complete standard-gate lifecycle.
- [ ] Standard callers declare only their differences.
- [ ] Specialized orchestration remains explicit.
- [ ] Success and tombstone artifacts use the same validated record path.
- [ ] Contract tests cover all acceptance criteria.
- [ ] Project-specific documentation links to this contract instead of copying it.
