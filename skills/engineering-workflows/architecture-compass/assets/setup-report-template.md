# ADR Governance Setup Report

> Derived, non-normative asset. The applicable canonical Long ADRs prevail if this template conflicts or drifts.

## Intent-bound selection

- Public workflows exposed: `setup | audit | refactor | plan-refactor | plan-run-refactor`
- Selected workflow: `setup`
- Selection rationale and intent evidence:
- Coverage: `recommended | complete`
- Write scope: `ADR governance, confirmed receipt-location record, and supported agent instructions only`
- Planning capability: `<state - evidence>`
- Read-only enforcement: `<state - evidence>`
- Architecture decision status: `<not required | pending | approved | blocked>`
- Execution status: `<not requested | ready for direct execution | pending Plan-mode exit | pending write permission | blocked | completed>`
- Expected artifacts:
- Protected paths and pre-existing state:
- Separate approval boundaries:

## Inspected evidence

- Repository identity, branch, HEAD, and status:
- Agent instructions: `AGENTS.md | CLAUDE.md | CLAUDE.local.md | .claude/rules | .cursor/rules | .cursorrules | none`
- ADR paths/index/mapping:
- Architecture and stack docs:
- Representative code/tests:
- Validation/CI:
- Existing Spec/status/evidence receipt path:
- Missing or unavailable evidence:
- `CONTEXT.md` classification: `repository docs | absent` (never infer Claude instructions)

## Coverage result

- Repository evidence state: `new | evidence-empty | established`
- Foundation eligibility and evidence:
- Catalog path and revision/fingerprint:
- Eligible catalog count (`Scope: target-repository`, `Adoptable: true`): `35`
- Matrix row count: `35`
- Selected count (`adopt` + `adapt`): `<number from completed matrix>`
- Not-selected count (`defer` + `reject`): `<number from completed matrix>`
- Total disposition count (`selected` + `not-selected`): `<number; must equal 35>`
- Count equality: `selected + not-selected = total = 35`: `pass | fail`
- Duplicate IDs: `0 | <count and IDs>`
- Missing IDs: `0 | <count and IDs>`
- Deferred provider ADRs, triggers, and owners:
- Skill-runtime ADRs excluded:

For a new or evidence-empty repository, the initial candidate foundation is exactly `AC-ADR-005, AC-ADR-006, AC-ADR-018, AC-ADR-019, AC-ADR-021, AC-ADR-022, AC-ADR-049`. Established repositories use target evidence for `recommended`; `complete` evaluates every Accepted target-repository decision marked adoptable.

Every eligible catalog ADR appears exactly once below and receives one disposition. `adopt` and `adapt` count as selected; `defer` and `reject` count as not selected. A defer requires a trigger and owner. A reject requires maintainer-confirmed rationale. Re-read the catalog and update both the rows and expected count if its eligible inventory changes; never preserve a stale hard-coded inventory silently.

## Files created or changed

| Path | Change | Purpose | Within authorized write scope |
| ---- | ------ | ------- | ----------------------------- |
|      |        |         |                               |

## Provider-to-local ADR mapping

| Provider ADR | Local ADR ID | Local path | Disposition | Status | Adaptation/conflict notes |
| ------------ | ------------ | ---------- | ----------- | ------ | ------------------------- |
|              |              |            |             |        |                           |

## Target adoption matrix

Use `adopt`, `adapt`, `defer`, or `reject`. A defer names a future trigger or owner; a rejection records maintainer-confirmed rationale. Include only provider decisions with `Scope: target-repository` and `Adoptable: true`.

| Provider ADR | Disposition | Target evidence | Active/adapted rule | Deferred trigger/owner | Rejection rationale |
| ------------ | ----------- | --------------- | ------------------- | ---------------------- | ------------------- |
| AC-ADR-005   |             |                 |                     |                        |                     |
| AC-ADR-006   |             |                 |                     |                        |                     |
| AC-ADR-007   |             |                 |                     |                        |                     |
| AC-ADR-008   |             |                 |                     |                        |                     |
| AC-ADR-009   |             |                 |                     |                        |                     |
| AC-ADR-010   |             |                 |                     |                        |                     |
| AC-ADR-011   |             |                 |                     |                        |                     |
| AC-ADR-012   |             |                 |                     |                        |                     |
| AC-ADR-013   |             |                 |                     |                        |                     |
| AC-ADR-014   |             |                 |                     |                        |                     |
| AC-ADR-015   |             |                 |                     |                        |                     |
| AC-ADR-016   |             |                 |                     |                        |                     |
| AC-ADR-017   |             |                 |                     |                        |                     |
| AC-ADR-018   |             |                 |                     |                        |                     |
| AC-ADR-019   |             |                 |                     |                        |                     |
| AC-ADR-020   |             |                 |                     |                        |                     |
| AC-ADR-021   |             |                 |                     |                        |                     |
| AC-ADR-022   |             |                 |                     |                        |                     |
| AC-ADR-023   |             |                 |                     |                        |                     |
| AC-ADR-024   |             |                 |                     |                        |                     |
| AC-ADR-025   |             |                 |                     |                        |                     |
| AC-ADR-027   |             |                 |                     |                        |                     |
| AC-ADR-028   |             |                 |                     |                        |                     |
| AC-ADR-029   |             |                 |                     |                        |                     |
| AC-ADR-030   |             |                 |                     |                        |                     |
| AC-ADR-031   |             |                 |                     |                        |                     |
| AC-ADR-032   |             |                 |                     |                        |                     |
| AC-ADR-033   |             |                 |                     |                        |                     |
| AC-ADR-034   |             |                 |                     |                        |                     |
| AC-ADR-035   |             |                 |                     |                        |                     |
| AC-ADR-037   |             |                 |                     |                        |                     |
| AC-ADR-038   |             |                 |                     |                        |                     |
| AC-ADR-040   |             |                 |                     |                        |                     |
| AC-ADR-041   |             |                 |                     |                        |                     |
| AC-ADR-049   |             |                 |                     |                        |                     |

AC-ADR-001 through AC-ADR-004, AC-ADR-026, AC-ADR-036, AC-ADR-039, AC-ADR-043 through AC-ADR-046, and AC-ADR-048 are skill-runtime controls and remain outside the target adoption matrix. AC-ADR-042 and AC-ADR-047 are superseded target decisions and remain outside the matrix. Historical runtime decisions remain outside target adoption.

## Accepted ADR overlap and conflict

- Existing accepted ADRs preserved:
- Split records and reciprocal successors:
- Adaptations:
- Unresolved conflicts and blocked paths:
- Decision/spec handoff used:

## Conditional stable-skill selector instruction

- Applicability: `applicable | not applicable | indeterminate`
- Evidence of a stable public skill with multiple material workflows:
- Existing equivalent or conflicting rule and local ADR, if any:
- Result: `added | preserved | not applicable | indeterminate | blocked`
- Target instruction surfaces:

## Agent-instruction result

| Surface | Existing convention | Change | ADR mapping link | Receipt-location link | Binding/deviation stop verified | Intent-bound selector verified |
| ------- | ------------------- | ------ | ---------------- | --------------------- | ------------------------------- | ------------------------------ |
|         |                     |        |                  |                       |                                 |                                |

## Future activations

```text
Use Architecture Compass to establish recommended ADR governance for this repository.
```

```text
Use Architecture Compass to audit this repository's architecture and ADR drift without changing files.
```

## Validation ledger

Record one AC-ADR-049 receipt per distinct proof obligation. Do not collapse several owners or subjects into one ambiguous receipt.

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

## Remaining decisions and risks

-
