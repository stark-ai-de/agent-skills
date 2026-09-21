# AC-ADR-064: Preserve Approved Scope Through Capability-Aware Planning

ID: AC-ADR-064
Title: Preserve Approved Scope Through Capability-Aware Planning
Status: Accepted
Date: 2026-09-21
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: actions, intent-routing, planning, approval, governance-persistence
Applies when: Architecture Compass selects workflows, plans architecture changes, confirms a result, or persists approved governance across host transitions.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: AC-ADR-048
Superseded by: none
Guide verified: 2026-09-21
Gist: Preserve five workflows and one concrete approval while adapting planning controls to observed host capabilities.

Variants: [Short](ac-adr-064-preserve-approved-scope-through-capability-aware-planning.short.md) · **Long, canonical** · [Guide](ac-adr-064-preserve-approved-scope-through-capability-aware-planning.guide.md)

## Context

AC-ADR-048 preserves five workflows and bounded governance persistence, but requires a native Plan transition before substantive planning whenever a control might exist. This can interrupt safe discovery and repeat an already explicit approval after host transitions. The maintainer approved this successor's capability-aware lifecycle and unchanged-result approval contract before implementation on 2026-09-21. AC-ADR-036 already permits safe conversational fallbacks; this decision reconciles the workflow contract with that portability rule.

## Decision

Architecture Compass exposes exactly five public workflows: `setup`, `audit`, `refactor`, `plan-refactor`, and `plan-run-refactor`. It always discloses this finite set and never adds an `auto` workflow. For a direct or agent-initiated activation with one clear outcome and sufficient authority, it announces the selected workflow and task-derived rationale, then proceeds. A bare activation, conflicting cues, or ambiguity about outcome, scope, governance state, or mutation authority presents the five workflows and asks the user to choose.

`setup` establishes or reconciles repository-native ADR governance with coverage `recommended` or `complete`. `recommended` selects target-relevant provider decisions from repository evidence; only a new or evidence-empty repository receives the seven-decision foundation AC-ADR-005, AC-ADR-006, AC-ADR-018, AC-ADR-019, AC-ADR-021, AC-ADR-022, and AC-ADR-049 as its default candidate set. `complete` evaluates every accepted, adoptable target-repository provider decision. Both coverage levels preserve accepted local IDs and decision text, record provider-to-local mappings and non-selected dispositions, bind accepted ADRs through supported agent instructions, and use repository-native validation receipts.

Intent routes as follows: governance establishment or reconciliation selects `setup/recommended`; architecture review selects `audit`; planning without execution selects `plan-refactor`; broad implementation or unresolved durable decisions selects `plan-run-refactor`; and explicit bounded work governed by accepted local ADRs selects `refactor`. An agent-initiated activation may select `audit` without mutation authority. It may select a mutating workflow only when the task already authorizes that outcome and scope.

`audit` is strictly read-only and reports architecture evidence, ADR coverage, conflicts, drift, and validation gaps without repairing files or creating governance artifacts. `refactor` executes only a bounded change already governed by accepted local ADRs and explicit write scope; it cannot invent durable decisions, create missing governance, silently broaden scope, or convert findings into unapproved repairs. Missing governance, conflicting accepted decisions, or unresolved durable choices reclassify work to `setup`, `plan-refactor`, or `plan-run-refactor` and require the corresponding authority.

`plan-refactor` and `plan-run-refactor` respect active or explicitly requested native Plan mode. Recommend native Plan for substantial ambiguous work, but do not block permitted read-only discovery or conversation solely because controls are inactive, unavailable, declined, or indeterminate. Use the same no-write conversational planning and approval contract when a native control cannot or need not be activated; do not claim that this changes the host mode. An explicit request to use native Plan remains pending until its activation is observed. Unknown mode or permission state never authorizes writes. Active native Plan must end before any repository, workspace, index, environment, or external mutation; host-managed plan artifacts follow the host's own rules.

Resolve discoverable facts and reuse prior answers before asking only unresolved material questions. Prepare the complete reviewable draft and identify the exact delivery and write scope before the final checkpoint. One explicit approval covers that unchanged result and its named persistence actions, including directories, overwrite, and required governance artifacts when applicable. Existing authority remains valid across native Plan exit and permission transitions; do not repeat approval for the same unchanged result. A native approval can serve as this checkpoint only when it actually confirms the content and write scope. A mode toggle alone is not content approval. A bounded instruction to revise and save authorizes the unambiguous named revision; material ambiguity, changed content, destination, write scope, or target-state drift requires resolving only the affected change. Persisting a Proposed ADR does not accept its decision.

After approval, any necessary Plan exit, confirmed permissions, and a state recheck, `plan-refactor` may persist only the approved specification plus required ADR, catalog, lineage, lock, and validator-inventory artifacts, validate and report those artifacts, emit a bounded execution handoff, and stop without source implementation. Explicit chat-only delivery completes that requested delivery without claiming persistence; a later implementation still requires any mandated governance persistence. `plan-run-refactor` persists and validates the same approved governance slice, rechecks repository and authority state, then executes only the unchanged approved plan. Separate existing implementation authority may resume in an outer workflow after planning-only delivery completes, but does not make `plan-refactor` itself an implementation workflow.

Use structured or asynchronous questions only when the host exposes suitable tools. While a required material answer is pending, continue only independent authorized work. Silence, timeout, preselected options, and model inference never supply approval or acceptance.

All workflows preserve repository-native ADR mapping, accepted-history stability, conflict stops, protected-state boundaries, risk-based validation, fresh evidence reuse, and evidence-stage receipts. Setup conditionally adds the generic finite-workflow and intent-bound selection instruction only when target evidence proves a stable public repository with multiple material workflows; `audit` only reports that classification and indeterminate evidence never authorizes a write. Selection never authorizes destructive, paid, external, deployment, publication, production, irreversible, or scope-expanding action.

## Invariants

- Exactly five public workflows; clear authorized intent proceeds and bare or materially ambiguous invocation asks.
- Audit remains read-only; direct refactor cannot invent decisions or repair missing governance.
- Native Plan and operational permissions are separate observed states; active Plan blocks mutation.
- Unknown state permits only proven non-mutating discovery and conversation.
- Approval is bound to a concrete revision, paths, actions, and target state; it survives mode changes but not material drift.
- Plan-only work implements no source change; governance and external-action boundaries remain intact.

## Failure handling

Stop the affected write on unknown mode or permission state, missing authority, protected-path overlap, unresolved ADR conflict, rejected permission, or material drift. Continue disjoint non-mutating work where useful. Preserve approved content while a required host transition is pending; do not ask the same approval again. Return an accurate copy-ready handoff if authorized persistence cannot complete.

## Acceptance criteria

- Inactive, missing, declined, and unknown controls do not alone stop safe discovery or conversation.
- Active or explicitly requested Plan is respected without inventing transitions.
- The same unchanged draft and write scope receive one final content approval.
- Prior answers, bounded revisions, native approval, asynchronous silence, Proposed ADRs, and changed target state retain their distinct authority meanings.
- Required governance is persisted and validated before plan-run execution; chat-only delivery never claims persistence.

## Consequences

Planning remains portable and useful without redundant mode choreography. Exact approval records and a fresh pre-write state check are essential: fewer questions must not broaden authority or hide a missing host permission.
