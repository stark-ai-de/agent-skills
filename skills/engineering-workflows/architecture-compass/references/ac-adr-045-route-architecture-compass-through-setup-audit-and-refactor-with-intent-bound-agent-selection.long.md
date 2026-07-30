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
Variant: Long
Canonical variant: Long
Supersedes: AC-ADR-043
Superseded by: AC-ADR-048
Guide verified: 2026-07-29
Gist: Route clear architecture intent through five bounded workflows while preserving governance, planning, and validation gates.

Variants: [Short](ac-adr-045-route-architecture-compass-through-setup-audit-and-refactor-with-intent-bound-agent-selection.short.md) · **Long, canonical** · [Guide](ac-adr-045-route-architecture-compass-through-setup-audit-and-refactor-with-intent-bound-agent-selection.guide.md)

## Context

AC-ADR-043 preserves risk-based validation but requires an explicit Setup/Apply confirmation even when the task already states an unambiguous architecture outcome. Its `apply` variants also combine audit, governance repair, planning, and execution in ways that obscure the user's actual result. Repository ADR-0038 now permits intent-bound agent selection from a finite workflow set while retaining ambiguity and authority gates. A reciprocal successor is required to simplify Architecture Compass without rewriting accepted history.

## Decision

Architecture Compass exposes exactly five public workflows: `setup`, `audit`, `refactor`, `plan-refactor`, and `plan-run-refactor`. It always discloses this finite set and never adds an `auto` workflow. For a direct or agent-initiated activation with one clear outcome and sufficient authority, it announces the selected workflow and task-derived rationale, then proceeds. A bare activation, conflicting cues, or ambiguity about outcome, scope, governance state, or mutation authority presents the five workflows and asks the user to choose.

`setup` establishes or reconciles repository-native ADR governance with coverage `recommended` or `complete`. `recommended` selects target-relevant provider decisions from repository evidence; only a new or evidence-empty repository receives the seven-decision foundation AC-ADR-005, AC-ADR-006, AC-ADR-018, AC-ADR-019, AC-ADR-021, AC-ADR-022, and AC-ADR-042 as its default candidate set. `complete` evaluates every adoptable target-repository provider decision. Both coverage levels preserve accepted local IDs and decision text, record provider-to-local mappings and non-selected dispositions, bind accepted ADRs through supported agent instructions, and use repository-native validation receipts.

Intent routes as follows: governance establishment or reconciliation selects `setup/recommended`; architecture review selects `audit`; planning without execution selects `plan-refactor`; broad implementation or unresolved durable decisions selects `plan-run-refactor`; and explicit bounded work governed by accepted local ADRs selects `refactor`. An agent-initiated activation may select `audit` without mutation authority. It may select a mutating workflow only when the task already authorizes that outcome and scope.

`audit` is strictly read-only and reports architecture evidence, ADR coverage, conflicts, drift, and validation gaps without repairing files or creating governance artifacts. `refactor` executes only a bounded change already governed by accepted local ADRs and explicit write scope; it cannot invent durable decisions, create missing governance, silently broaden scope, or convert findings into unapproved repairs. Missing governance, conflicting accepted decisions, or unresolved durable choices reclassify work to `setup`, `plan-refactor`, or `plan-run-refactor` and require the corresponding authority.

`plan-refactor` and `plan-run-refactor` use native Plan mode when the execution host supports it. If support is available but inactive or indeterminate, the workflow stops and asks the user to enter or confirm Plan mode; a portable fallback is allowed only when native Plan mode is definitely unavailable. `plan-refactor` ends with an approved bounded plan. `plan-run-refactor` rechecks repository and authority state after approval, exits Plan mode before mutation, executes only the unchanged approved plan, and stops on material drift.

All workflows preserve repository-native ADR mapping, accepted-history stability, conflict stops, protected-state boundaries, risk-based validation, fresh evidence reuse, and evidence-stage receipts. Setup conditionally adds the generic finite-workflow and intent-bound selection instruction only when target evidence proves a stable public repository with multiple material workflows; `audit` only reports that classification and indeterminate evidence never authorizes a write. Selection never authorizes destructive, paid, external, deployment, publication, production, irreversible, or scope-expanding action.

## Invariants

- The public workflow set is exactly `setup`, `audit`, `refactor`, `plan-refactor`, and `plan-run-refactor`.
- Workflow selection is announced and bounded by existing task intent and authority; ambiguity asks rather than infers.
- `audit` never writes, repairs, installs, deploys, publishes, or probes production.
- Direct `refactor` requires accepted local decisions and cannot repair missing governance or make durable architecture choices.
- Plan workflows use the native lifecycle whenever supported and recheck state before execution.
- Provider decisions map into repository-native ADR identity without overwriting accepted history.
- Validation cadence and claims remain proportional to risk and backed by stage-accurate receipts.

## Consequences

Architecture Compass gains simpler outcome-oriented routing and can participate in agent-driven skill activation without a redundant menu confirmation. Setup becomes evidence-sensitive instead of treating a fixed base as appropriate for every existing repository. Audit, planning, and execution boundaries become independently testable. Maintainers must keep five workflow routes, Plan-mode transitions, setup coverage, target-instruction classification, and focused evals synchronized. Ambiguous or governance-incomplete work may stop earlier, but that stop prevents accidental decision invention or unauthorized mutation.
