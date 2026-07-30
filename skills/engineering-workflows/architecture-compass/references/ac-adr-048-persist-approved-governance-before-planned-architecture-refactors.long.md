# AC-ADR-048: Persist Approved Governance Before Planned Architecture Refactors

ID: AC-ADR-048
Title: Persist Approved Governance Before Planned Architecture Refactors
Status: Accepted
Date: 2026-07-29
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: actions, intent-routing, planning, governance-persistence
Applies when: Architecture Compass is activated, establishes ADR governance, audits architecture, plans ADR work, or performs ADR-guided refactoring.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: AC-ADR-045
Superseded by: none
Guide verified: 2026-07-29
Gist: Preserve five intent-bound workflows while making approved post-Plan governance persistence explicit and bounded.

Variants: [Short](ac-adr-048-persist-approved-governance-before-planned-architecture-refactors.short.md) · **Long, canonical** · [Guide](ac-adr-048-persist-approved-governance-before-planned-architecture-refactors.guide.md)

## Context

AC-ADR-045 established five finite, intent-bound workflows and separated setup, audit, planning, and bounded implementation. Its `plan-refactor` contract ended with an approved plan, while repository-conforming save-only handoff needs a durable approved specification and the minimum governance artifacts required to make later execution deterministic. Treating that persistence as a Guide-only mechanic would change the canonical write boundary, so a reciprocal successor is required.

This decision carries the complete AC-ADR-045 workflow contract forward and changes only the post-Plan persistence boundary. Repository ADR-0038 continues to govern intent-bound finite workflow selection. AC-ADR-049 is the active validation-policy successor to AC-ADR-047.

## Decision

Architecture Compass exposes exactly five public workflows: `setup`, `audit`, `refactor`, `plan-refactor`, and `plan-run-refactor`. It always discloses this finite set and never adds an `auto` workflow. For a direct or agent-initiated activation with one clear outcome and sufficient authority, it announces the selected workflow and task-derived rationale, then proceeds. A bare activation, conflicting cues, or ambiguity about outcome, scope, governance state, or mutation authority presents the five workflows and asks the user to choose.

`setup` establishes or reconciles repository-native ADR governance with coverage `recommended` or `complete`. `recommended` selects target-relevant provider decisions from repository evidence; only a new or evidence-empty repository receives the seven-decision foundation AC-ADR-005, AC-ADR-006, AC-ADR-018, AC-ADR-019, AC-ADR-021, AC-ADR-022, and AC-ADR-047 as its default candidate set. `complete` evaluates every accepted, adoptable target-repository provider decision. Both coverage levels preserve accepted local IDs and decision text, record provider-to-local mappings and non-selected dispositions, bind accepted ADRs through supported agent instructions, and use repository-native validation receipts.

Intent routes as follows: governance establishment or reconciliation selects `setup/recommended`; architecture review selects `audit`; planning without execution selects `plan-refactor`; broad implementation or unresolved durable decisions selects `plan-run-refactor`; and explicit bounded work governed by accepted local ADRs selects `refactor`. An agent-initiated activation may select `audit` without mutation authority. It may select a mutating workflow only when the task already authorizes that outcome and scope.

`audit` is strictly read-only and reports architecture evidence, ADR coverage, conflicts, drift, and validation gaps without repairing files or creating governance artifacts. `refactor` executes only a bounded change already governed by accepted local ADRs and explicit write scope; it cannot invent durable decisions, create missing governance, silently broaden scope, or convert findings into unapproved repairs. Missing governance, conflicting accepted decisions, or unresolved durable choices reclassify work to `setup`, `plan-refactor`, or `plan-run-refactor` and require the corresponding authority.

`plan-refactor` and `plan-run-refactor` use native Plan mode when the execution host supports it. If support is available but inactive or indeterminate, the workflow stops and asks the user to enter or confirm Plan mode; a portable fallback is allowed only when native Plan mode is definitely unavailable. After approval and Plan-mode exit, `plan-refactor` may persist only the approved specification plus the required ADR, catalog, lineage, lock, and validator-inventory artifacts, validate and report those artifacts, emit the bounded execution handoff, and stop without source implementation. `plan-run-refactor` persists the same approved specification and required governance artifacts, rechecks repository and authority state, executes only the unchanged approved plan, and stops on material drift.

All workflows preserve repository-native ADR mapping, accepted-history stability, conflict stops, protected-state boundaries, risk-based validation, fresh evidence reuse, and evidence-stage receipts. Setup conditionally adds the generic finite-workflow and intent-bound selection instruction only when target evidence proves a stable public repository with multiple material workflows; `audit` only reports that classification and indeterminate evidence never authorizes a write. Selection never authorizes destructive, paid, external, deployment, publication, production, irreversible, or scope-expanding action.

## Invariants

- The public workflow set is exactly `setup`, `audit`, `refactor`, `plan-refactor`, and `plan-run-refactor`.
- Workflow selection is announced and bounded by existing task intent and authority; ambiguity asks rather than infers.
- `audit` never writes, repairs, installs, deploys, publishes, or probes production.
- Direct `refactor` requires accepted local decisions and cannot repair missing governance or make durable architecture choices.
- Plan workflows use the native lifecycle whenever supported and exit Plan mode before persistence or implementation.
- `plan-refactor` may persist only its authorized approved governance slice and never implements source changes.
- `plan-run-refactor` rechecks state after the same governance slice and executes only the unchanged approved plan.
- Provider decisions map into repository-native ADR identity without overwriting accepted history.
- Validation cadence and claims remain proportional to risk and backed by stage-accurate receipts.

## Conflict resolution

Operational authority and architecture authority remain separate. A workflow selection never supplies missing write, external-action, or destructive authority. If the approved plan, repository state, accepted ADRs, or authorized persistence paths conflict after Plan-mode exit, stop the affected persistence or implementation and return a bounded conflict record; do not reinterpret the plan or widen the governance slice.

## Failure handling

If native Plan support is available but inactive or indeterminate, stop before substantive planning. If the approved specification or required governance artifacts cannot be persisted without touching unapproved paths, return the copy-ready handoff without writing. If HEAD, index, working tree, authority, dependencies, or external state drifts materially before `plan-run-refactor` execution, preserve completed disjoint governance artifacts and stop before source mutation.

## Acceptance criteria

- Every activation exposes exactly five workflows and routes clear intent without a redundant selector confirmation.
- Bare, conflicting, or materially ambiguous activation asks rather than infers.
- Audit remains strictly read-only and direct refactor remains bounded by accepted local ADRs.
- Recommended Setup is evidence-sensitive and resolves the locked AC-ADR-047 foundation reference through its accepted successor AC-ADR-049.
- Plan workflows use native Plan mode when supported and perform no mutation before Plan-mode exit.
- `plan-refactor` persists only an authorized approved specification and required governance artifacts, validates them, emits a bounded handoff, and stops before source implementation.
- `plan-run-refactor` persists the same governance slice, rechecks state, and executes only the unchanged approved plan.
- No workflow selection grants destructive, paid, external, deployment, publication, production, irreversible, or scope-expanding authority.

## Consequences

Architecture Compass retains simple outcome-oriented routing and agent-driven activation while making planning persistence deterministic. A planning-only run may now create a small authorized governance slice after Plan-mode exit, which adds a validation and reporting step but prevents approved decisions from remaining chat-only. Implementation authority remains distinct and material drift still stops execution.
