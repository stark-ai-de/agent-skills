# AC-ADR-045: Route Architecture Compass Through Setup, Audit, and Refactor With Intent-Bound Agent Selection

ID: AC-ADR-045
Title: Route Architecture Compass Through Setup, Audit, and Refactor With Intent-Bound Agent Selection
Status: Superseded
Date: 2026-07-29
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: actions, intent-routing, setup, audit, refactor
Applies when: Architecture Compass is activated, establishes ADR governance, audits architecture, plans ADR work, or performs ADR-guided refactoring.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: AC-ADR-043
Superseded by: AC-ADR-048
Guide verified: 2026-07-29
Gist: Route clear architecture intent through five bounded workflows while preserving governance, planning, and validation gates.

Variants: [Short](ac-adr-045-route-architecture-compass-through-setup-audit-and-refactor-with-intent-bound-agent-selection.short.md) · [Long, canonical](ac-adr-045-route-architecture-compass-through-setup-audit-and-refactor-with-intent-bound-agent-selection.long.md) · **Guide**

This Guide is non-normative. The canonical Long decision controls this historical record. Use AC-ADR-048 for the active post-Plan persistence contract and current workflow mechanics.

## Activation routing

Expose the complete workflow set on every activation:

```text
Available workflows: setup | audit | refactor | plan-refactor | plan-run-refactor
Selected: <workflow or unresolved>
Setup coverage: recommended | complete | not-applicable
Reason: <task evidence>
Write scope: <read-only or exact authorized paths>
Expected artifacts: <reports, ADRs, plan, receipts, code>
Planning capability: <Active | Available but inactive | Unavailable | Explicitly declined | Indeterminate | Not applicable; evidence>
Protected state: <staged, unstaged, untracked, ignored, external>
Separate approvals: <destructive, paid, deployment, publication, production, scope expansion>
```

Proceed after announcing the route when one workflow is supported by clear task intent and authority. Ask when the request is bare, contradictory, or ambiguous about outcome, scope, persistence, governance, or mutation. Do not introduce an `auto` label.

Use this routing table:

| Intent evidence                                                               | Route               |
| ----------------------------------------------------------------------------- | ------------------- |
| Establish or reconcile ADR governance                                         | `setup/recommended` |
| Review architecture, ADR coverage, drift, or risk                             | `audit`             |
| Produce a refactoring plan without execution                                  | `plan-refactor`     |
| Implement broad architecture work or resolve durable choices before execution | `plan-run-refactor` |
| Execute explicit bounded work under accepted local ADRs                       | `refactor`          |

## Legacy intent mapping

Older input labels do not add public workflows. Route them by requested outcome and current governance:

| Legacy intent                            | Current route                                                                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `setup-existing-repo`                    | `setup` with evidence-based coverage.                                                                                                    |
| `setup-new-repo` or `new-repo-bootstrap` | `setup`; application bootstrap remains a separate planned implementation.                                                                |
| `pr-review`                              | read-only `audit`.                                                                                                                       |
| `new-implementation`                     | bounded `refactor` when accepted ADRs govern the whole slice; otherwise `plan-run-refactor`.                                             |
| `docs-sync`                              | bounded `refactor` when accepted governance resolves the sync; otherwise the Plan workflow matching whether execution is requested.      |
| `stack-deviation`                        | bounded `refactor` when accepted governance resolves the deviation; otherwise the Plan workflow matching whether execution is requested. |

Preserve the current workflow name in reports and receipts so the compatibility mapping cannot become a hidden sixth workflow.

## Setup procedure

1. Inspect repository-native ADR, instruction, validation, receipt, and Git conventions without changing them.
2. For `recommended`, select only decisions supported by target evidence. If the repository is new or lacks architecture evidence, use AC-ADR-005, 006, 018, 019, 021, 022, and 042 as the initial candidate foundation.
3. For `complete`, evaluate every adoptable target-repository AC-ADR and record `adopt`, `adapt`, `defer`, or `reject`.
4. Allocate repository-native IDs without renumbering or rewriting accepted records. Split provider concerns when the target's one-decision-per-ADR convention requires it.
5. Record every `AC-ADR -> local ADR` mapping, non-selected disposition, conflict, deviation, and source evidence.
6. Bind accepted local ADRs through supported agent instructions and record the repository-native validation receipt location.
7. Validate the governance artifacts only. Setup does not authorize application refactoring, deployment, production probes, or publication.

For each disposition, `adapt` records the active target rule and its deviation from the provider candidate; `defer` records the trigger, owner, and resumption condition; and `reject` records the governing authority and rationale.

## Stable public workflow instruction check

Classify the generic intent-bound selector instruction as:

- `applicable`: target evidence proves a stable public skill repository with at least one skill exposing multiple material workflows;
- `not applicable`: target evidence proves that contract does not apply; or
- `indeterminate`: stability or workflow materiality cannot be established.

For Setup, preserve an equivalent target rule or add a generic instruction that requires finite disclosure, intent-bound selection, ambiguity fallback, and separate action approvals. Audit reports the classification only. `indeterminate` never writes. Do not copy this provider ADR ID into the target; map or create a repository-native decision only when target governance requires it.

## Audit procedure

Inspect repository evidence and report:

- applicable accepted ADRs, conflicts, missing coverage, and implementation drift;
- architecture boundaries, dependency direction, migration risk, and protected state;
- validation obligations, fresh reusable receipts, invalidated evidence, and claim limits; and
- the selector-instruction classification when applicable.

Audit creates no repository artifact, repairs no file, installs no tool, and performs no deployment, publication, production, or mutating environment probe.

## Refactor procedure

Use direct `refactor` only when accepted local ADRs already govern the complete bounded change and the user has authorized its write scope. Capture risk, proof obligations, evidence reuse, rollback, and stop conditions before mutation. Execute reversible slices, verify at the owning boundary, and stop on decision conflict, material drift, or required scope expansion.

If governance is missing, route to `setup`. If durable decisions or broad sequencing remain unresolved, route to `plan-refactor` or `plan-run-refactor`. Never silently combine those workflows under direct refactor.

## Plan workflows

For both plan routes:

1. Detect native Plan-mode support before substantive planning.
2. If supported and active, plan there. If supported but inactive or support is indeterminate, stop and ask the user to enter or confirm Plan mode. Use a portable in-chat fallback only when native Plan mode is definitely unavailable.
3. Resolve durable choices with the user, identify exact write scope, protected state, receipts, rollback, and separate approval boundaries.
4. Include any post-Plan persistence as an explicit bounded slice: the approved specification plus only the ADR and index artifacts required by the repository convention.
5. Exit native Plan mode before any persistence or implementation mutation.
6. For `plan-refactor`, persist that authorized governance slice when requested, validate and report the persisted paths, emit a bounded copy-ready execution handoff, then stop without implementing the refactor. Without persistence authority, return the same bounded copy-ready handoff and stop.
7. For `plan-run-refactor`, persist and validate the same governance slice, then recheck HEAD, index, working tree, authority, dependencies, and external state. Stop on material drift; otherwise execute only the unchanged approved plan.
8. New decisions, changed scope, or invalidated approval require a new planning checkpoint.

## Risk-based validation receipt

Use the locally adopted AC-ADR-042 mapping to record:

```text
Risk: low | moderate | high | critical
Cadence: reuse | final-batch | checkpointed | reproduce-first
Proof obligations and one owner each:
Reused receipts and reconciliation:
Invalidated receipts and targeted reruns:
Final aggregate gate:
Environment path: none | representative Preview | eligible production fallback
Separate external authorization: <evidence | absent>
```

Do not call local, focused, or Preview evidence production proof. Deployment, publication, production, traffic, destructive migration, and other external actions retain their own approvals.

## Validation

For this skill repository, run the focused validator while editing and the aggregate gate after content freeze:

```bash
npm run validate:architecture-compass
npm run validate
```

Target repositories use their own confirmed commands and repository-native receipt location.

## Decision lineage

- `adapts`: [ADR-0038](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0038-expose-finite-skill-workflows-and-permit-intent-bound-agent-selection.long.md).

## Source

- [Agent Skills specification](https://agentskills.io/specification), verified 2026-07-29.

## Revisit

Create a reciprocal successor if the public workflow set, setup coverage model, intent-routing authority, direct-refactor boundary, or Plan lifecycle changes materially. Host-version mechanics and examples may be updated in this Guide when they do not change the canonical decision.
