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
Variant: Short
Canonical variant: Long
Supersedes: AC-ADR-048
Superseded by: none
Guide verified: 2026-09-21
Gist: Preserve five workflows and one concrete approval while adapting planning controls to observed host capabilities.

Variants: **Short** · [Long, canonical](ac-adr-064-preserve-approved-scope-through-capability-aware-planning.long.md) · [Guide](ac-adr-064-preserve-approved-scope-through-capability-aware-planning.guide.md)

## Decision summary

Architecture Compass retains exactly `setup`, `audit`, `refactor`, `plan-refactor`, and `plan-run-refactor`. Disclose all five compactly, proceed for clear authorized intent, and ask on bare or material ambiguity. Setup remains evidence-sensitive; audit stays read-only and direct refactor requires accepted local governance.

Respect active or explicitly requested native Plan, recommend it for substantial ambiguous work, and permit the same no-write planning conversation when controls are inactive, unavailable, declined, or indeterminate. Unknown state never authorizes writes. Exit active Plan before mutation and verify actual permission independently.

Prepare the complete draft before one approval covering the concrete unchanged result and named write scope. Reuse prior answers and authority across mode changes; native approval can combine the checkpoint only when it confirms content and scope. Ask again only for the affected material change. Proposed ADR persistence is distinct from decision acceptance; silence and timeout are never approval.

`plan-refactor` persists only authorized approved governance and stops before source implementation, or delivers explicit chat-only output without claiming persistence. `plan-run-refactor` persists and validates required governance, rechecks state, then executes only the unchanged approved plan. Protected state, accepted history, validation, and separate external-action authority remain binding.

## Consequences

Safe planning no longer waits solely for a host toggle. Approval reuse reduces interruptions while scope, permission, persistence, and implementation boundaries remain explicit.
