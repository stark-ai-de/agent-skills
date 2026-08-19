# Architecture Audit and Refactor Report

> Derived, non-normative asset. The applicable canonical Long ADRs prevail if this template conflicts or drifts.

## Intent-bound selection

- Public workflows exposed: `setup | audit | refactor | plan-refactor | plan-run-refactor`
- Selected workflow: `audit | refactor | plan-refactor | plan-run-refactor`
- Selection rationale and intent evidence:
- Write scope: `read-only | approved specification/ADR paths | accepted-ADR-governed implementation paths`
- Planning capability: `<state - evidence>`
- Read-only enforcement: `<state - evidence>`
- Architecture decision status: `<not required | pending | approved | blocked>`
- Execution status: `<not requested | ready for direct execution | pending Plan-mode exit | pending write permission | blocked | completed>`
- Expected artifacts:
- Protected paths and pre-existing state:
- Separate approval boundaries:

## Inspected evidence

| Evidence                                | Status | Revision/path | Notes |
| --------------------------------------- | ------ | ------------- | ----- |
| Repository identity and protected state |        |               |       |
| Agent instructions                      |        |               |       |
| ADR catalog, local index, and mapping   |        |               |       |
| Stack/architecture docs                 |        |               |       |
| Representative code/tests               |        |               |       |
| Validation/CI                           |        |               |       |
| Repository-native validation receipts   |        |               |       |
| Stable public-skill workflow surface    |        |               |       |

## Selected decisions

Use AC-ADR-046 strengths without confusing architecture authority with execution permission: `required` is an applicable accepted local ADR or mandatory target rule; `preferred` is a target-documented default with an allowed evidence-backed deviation; `example` is approved shape guidance; `assumption` is unverified and cannot justify mutation. Lower-ranked current code, provider decisions, and framework defaults cannot override a contradictory `required` rule.

| Rule | Rule strength | Provider ADR Short | Canonical Long | Local ADR/path | Target provenance | Applies to |
| ---- | ------------- | ------------------ | -------------- | -------------- | ----------------- | ---------- |
|      |               |                    |                |                |                   |            |

## Findings and disposition

Assign each finding exactly one disposition: `fix-and-prove-now`, `verify-now`, `defer-recorded`, `accept-risk`, or `not-applicable`.

Severity definitions:

- `critical`: active or imminent loss of confidentiality, integrity, availability, data, or control with no safe bounded continuation.
- `high`: material violation of a binding decision, trust boundary, public contract, migration safety, or release gate that blocks the affected work.
- `moderate`: behavioral or governance drift with bounded impact and a practical workaround, but which does not meet the critical/high triggers.
- `low`: localized non-behavioral inconsistency, clarity defect, or maintenance risk with deterministic acceptance and no higher-severity trigger.

| Severity | File/area | Concrete drift or risk | Governing ADR | Rule strength | Disposition | Recommended Action | Docs/ADR Impact | Deviation Resolution | Proof obligation | Done-When |
| -------- | --------- | ---------------------- | ------------- | ------------- | ----------- | ------------------ | --------------- | -------------------- | ---------------- | --------- |
|          |           |                        |               |               |             |                    |                 |                      |                  |           |

If two applicable sources conflict, do not blend them. Record both sources, operational authority, affected scope and impact, recommended resolution, decision owner, and whether disjoint work can continue; stop the dependent slice until resolved.

## Workflow boundary

- Audit remained strictly read-only:
- Direct refactor was already fully governed and bounded:
- Missing governance routed to `setup` rather than repaired silently:
- Unresolved durable decisions routed to a Plan workflow:
- Material reclassification and authority resolution:

## Conditional stable-skill selector instruction

- Applicability: `applicable | not applicable | indeterminate`
- Target evidence:
- Existing equivalent or conflicting rule:
- Handling: `audit report only | setup required | preserved | not applicable | indeterminate`

## Approved refactoring specification

Complete this section for `plan-refactor` and `plan-run-refactor`.

- Plan-mode state and transition evidence:
- Approved outcome and non-goals:
- Durable decisions resolved:
- Exact path allowlist:
- Ordered reversible slices:
- Proof obligations, owners, and reusable receipts:
- Rollback and stop conditions:
- Separate external/high-risk approvals:
- Plan-mode exit evidence before persistence or execution:

## State recheck and execution

Complete this section for `refactor` and the execution phase of `plan-run-refactor`.

- Root, HEAD, index/worktree, dependency, permission, protected-path, and external-state recheck:
- Drift result: `unchanged | material drift - stopped`
- Implemented slices and exact paths:
- Integrated diff review:
- Deferred work:

## Validation ledger

Record one AC-ADR-049 receipt per distinct proof obligation and reconcile every delegated receipt against the integrated candidate.

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

## Remaining risk and next authorized action

-
