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

Define a portable lifecycle for one standard validation gate so CI jobs declare their differences without copying setup, execution, evidence publication, and failure handling.

The workflow declares **what** runs. The reusable component owns **how** a normal gate is executed and recorded.

## Scope

In scope:

- one resolved task executed by one worker job;
- declared dependency installation;
- runtime and tool attestation;
- optional prerequisite outcomes;
- canonical success evidence or a failure tombstone;
- immutable publication followed by final status propagation.

Out of scope:

- gate selection and dependency-graph construction;
- dynamic matrices or fan-out/fan-in topology;
- cache and artifact-store design;
- deployment or release authorization;
- domain validation logic.

The companion [validation orchestration boundaries spec](validation-orchestration-boundaries-spec.md) defines those orchestration concerns.

## Caller contract

A caller provides only validated differences:

| Input                 | Meaning                                                              |
| --------------------- | -------------------------------------------------------------------- |
| Gate identity         | Stable identifier of the selected task                               |
| Resolution            | Command, inputs, dependencies, tools, timeout, evidence, and outputs |
| Workspace boundary    | Candidate identity before and after execution                        |
| Producer identity     | Run, attempt, job, and source identity used by evidence              |
| Dependency mode       | Whether the task's declared profiles must be installed               |
| Prerequisite outcomes | Exact earlier outcomes required by the task, when any                |
| Downstream outcome    | Optional normalized outcome for a dependent task                     |

Unknown inputs and security-sensitive implicit defaults must be rejected.

## Lifecycle

| Phase                | Required behavior                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| Validate             | Confirm resolution, selection, workspace, candidate boundary, and producer identity before side effects |
| Prepare              | Install only declared dependency profiles; never rely on ambient packages                               |
| Attest               | Resolve exact executables, tool identities, platform policy, and a sanitized environment                |
| Verify prerequisites | Accept only exact successful outcomes named by the task contract                                        |
| Execute              | Run the resolved command with bounded output, timeout, and process cleanup                              |
| Normalize            | Convert raw facts into one canonical passed or failed outcome                                           |
| Publish              | Write a reusable result only for a complete unchanged success; otherwise write a tombstone              |
| Propagate            | Publish required evidence before returning the final worker status                                      |

Gate-specific evidence extraction belongs behind a typed evidence contract, not caller-specific shell parsing.

## Invariants

| Condition                                                     | Required result                             |
| ------------------------------------------------------------- | ------------------------------------------- |
| Resolution or candidate identity is malformed                 | Stop before execution                       |
| Dependency or runtime preparation fails                       | Record a tombstone when possible, then fail |
| A prerequisite is missing, stale, duplicate, or contradictory | Fail closed                                 |
| The command fails or times out                                | Record failure evidence, then fail          |
| The candidate changes during execution                        | Reject the result                           |
| Required evidence is incomplete                               | Reject apparent success                     |
| Required publication cannot be verified                       | Fail the worker                             |
| Execution and publication both satisfy the contract           | Return success with stable metadata         |

## Abstraction boundary

Use this lifecycle when jobs share the same linear phases and differ only through validated data. Keep specialized parallel topologies and privileged publication boundaries explicit.

Suitable implementations include an in-repository composite action, an equivalent step bundle, or a typed runner module. Cross-repository workflows or packages should be introduced only after the interface is stable.

## Acceptance criteria

- Standard callers do not duplicate prepare, attest, execute, record, upload, or propagate steps.
- Adding a standard gate requires declarative inputs rather than copied shell code.
- Setup and execution failures use the same canonical recording path.
- Prerequisites are matched by exact task and candidate identity.
- Success artifacts are immutable, attempt-safe, and verified.
- Publication failure cannot be reported as validation success.
- Specialized fan-out/fan-in behavior is absent from the standard lifecycle.
- Contract tests cover successful, failing, and contradictory inputs.

## Reference validation commands

Map these placeholders to the adopting project:

```bash
<ci-linter> <workflow-files> <reusable-gate-definition>
<test-runner> <gate-lifecycle-contract-tests>
<formatter> --check <changed-files>
```

Minimum cases: no-dependency execution, dependency installation, prerequisite acceptance and rejection, setup failure, command failure, candidate mutation, incomplete evidence, publication failure, and successful downstream outcome publication.

## Source challenge summary

Copying the lifecycle keeps every job explicit but allows provenance and failure behavior to drift. Hiding the complete workflow in one configurable component reduces lines but also hides topology. Extracting only the repeated linear lifecycle centralizes mechanics while preserving visible orchestration, so that boundary is selected.

No CI vendor, repository layout, runner, gate name, shard count, branch, or artifact naming scheme is normative.

## ADR gate result

No new durable policy is introduced. Repositories should define trust, reuse, artifact authority, and publication policy in their own ADRs; this spec only defines the implementation boundary.

## User verification

A maintainer should be able to identify the full execution graph from the workflow and find exactly one reusable implementation for a standard gate.

## Risks

- Too many optional inputs can recreate hidden orchestration; reject topology-specific modes.
- Thin callers can obscure critical behavior; keep the phase contract and failure tests explicit.
- Caller and lifecycle interfaces can drift; use strict input validation and caller contract tests.

## Done when

- [ ] One component owns the standard-gate lifecycle.
- [ ] Standard callers declare only their differences.
- [ ] Specialized orchestration remains visible.
- [ ] Success and tombstones use one validated record path.
- [ ] Contract tests cover the acceptance criteria.
