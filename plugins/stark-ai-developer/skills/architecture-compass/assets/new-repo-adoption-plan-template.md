# New Repository Architecture Adoption Plan

> Derived, non-normative asset. The applicable canonical Long ADRs prevail if this template conflicts or drifts.

Use this after `setup` establishes repository-native governance. It does not extend setup authority into source implementation.

## Setup handoff

- Setup coverage: `recommended | complete`
- Repository evidence state: `new | evidence-empty`
- Foundation candidates evaluated: `AC-ADR-005, AC-ADR-006, AC-ADR-018, AC-ADR-019, AC-ADR-021, AC-ADR-022, AC-ADR-049`
- Provider-to-local mapping path:
- Accepted local decisions and unresolved decisions:
- Protected paths and pre-existing state:
- Setup validation receipt:

## Candidate Dispositions

Do not treat the new-repository foundation as automatic adoption. Preserve each Setup disposition and implement only accepted local decisions.

Use one of `adopt`, `adapt`, `defer`, or `reject` in the Disposition column.

| Provider candidate | Disposition | Local ADR/path | Evidence or adaptation | Deferred trigger/owner or rejection rationale |
| ------------------ | ----------- | -------------- | ---------------------- | --------------------------------------------- |
| AC-ADR-005         |             |                |                        |                                               |
| AC-ADR-006         |             |                |                        |                                               |
| AC-ADR-018         |             |                |                        |                                               |
| AC-ADR-019         |             |                |                        |                                               |
| AC-ADR-021         |             |                |                        |                                               |
| AC-ADR-022         |             |                |                        |                                               |
| AC-ADR-049         |             |                |                        |                                               |

Additional candidates selected by repository evidence:

| Provider candidate | Disposition | Local ADR/path | Selection evidence | Trigger/owner or rejection rationale |
| ------------------ | ----------- | -------------- | ------------------ | ------------------------------------ |
|                    |             |                |                    |                                      |

## First implementation workflow

- Public workflows exposed: `setup | audit | refactor | plan-refactor | plan-run-refactor`
- Recommended route: `plan-run-refactor`
- Selected route: `plan-refactor | plan-run-refactor | refactor`
- Selection rationale and user-authorized outcome/scope:
- Planning capability and transition evidence:
- Expected specification and implementation artifacts:
- Separate destructive, paid, external, deployment, publication, or production approvals:

Use `refactor` only when accepted local ADRs already govern every durable choice and the requested implementation is explicitly bounded. Otherwise use a Plan workflow.

## Repository contract

- ADR directory, index, and successor convention:
- Agent instruction surfaces:
- Validation receipt location:
- Package/module ownership:
- Deployable units and runtime boundaries:
- Public contracts and compatibility policy:
- Security, data, migration, delivery, and rollback obligations:

## Selective Guide / Placement Map

Load only the Guide needed for an accepted candidate and place the resulting rule or implementation at the target repository's owning boundary. A provider Guide is non-normative and does not authorize copying provider paths.

| Accepted local ADR | Provider ADR | Guide path or heading needed | Target owning boundary | Exact target placement | Selection evidence |
| ------------------ | ------------ | ---------------------------- | ---------------------- | ---------------------- | ------------------ |
|                    |              |                              |                        |                        |                    |

## Approved bounded plan

- Outcome and non-goals:
- Exact path allowlist:
- Ordered reversible slices:
- Proof obligations and one owner per obligation:
- Reusable receipts and invalidators:
- Rollback and stop conditions:
- Plan-mode exit requirement:

## Execution preflight

- Repository root, branch, HEAD, and status:
- Accepted ADR and mapping recheck:
- Dependency/toolchain recheck:
- Permissions and protected-path recheck:
- Material drift result:

## Delivery ledger

| Slice | Exact paths | Governing local ADR | Validation | Evidence stage | Environment | Status | Observation/result | Rollback |
| ----- | ----------- | ------------------- | ---------- | -------------- | ----------- | ------ | ------------------ | -------- |
|       |             |                     |            |                |             |        |                    |          |

## AC-ADR-049 validation receipts

Record one receipt per distinct proof obligation. Reconcile delegated receipts against the integrated candidate before the final gate.

```text
Receipt ID:
Risk: low | moderate | high | critical
Cadence: reuse | final-batch | checkpointed | reproduce-first
Proof obligation:
Subject / owning boundary:
Revision / exact candidate artifact / dirty-tree or content fingerprint:
Command / scenario / harness:
Toolchain / config / fixtures / lockfile:
Evidence stage: source/static | local | CI | publication/install | deployed/production | external/third-party
Environment:
Status: verified | failed | not run | unavailable | stale
Observation / result:
Observed at / freshness boundary:
Covered contracts:
Invalidators / limitations:
Owner / source / run link:
Repository-native receipt location:
Skip reason: none | <why this obligation was not executed and who authorized it>
Final aggregate gate: <command or scenario, relationship to this receipt, and result>
```

| Receipt ID | Risk | Cadence | Proof obligation | Subject | Command/scenario/harness | Toolchain | Stage | Environment | Status | Observation/result | Invalidators | Owner | Skip reason | Final aggregate gate relationship |
| ---------- | ---- | ------- | ---------------- | ------- | ------------------------ | --------- | ----- | ----------- | ------ | ------------------ | ------------ | ----- | ----------- | --------------------------------- |
|            |      |         |                  |         |                          |           |       |             |        |                    |              |       |             |                                   |

## Deferred decisions and triggers

| Decision | Why deferred | Owner | Trigger | Blocking scope |
| -------- | ------------ | ----- | ------- | -------------- |
|          |              |       |         |                |
