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
Variant: Short
Canonical variant: Long
Supersedes: AC-ADR-045
Superseded by: none
Guide verified: 2026-07-29
Gist: Preserve five intent-bound workflows while making approved post-Plan governance persistence explicit and bounded.

Variants: **Short** · [Long, canonical](ac-adr-048-persist-approved-governance-before-planned-architecture-refactors.long.md) · [Guide](ac-adr-048-persist-approved-governance-before-planned-architecture-refactors.guide.md)

## Decision summary

Architecture Compass exposes `setup`, `audit`, `refactor`, `plan-refactor`, and `plan-run-refactor`. It discloses all five workflows, announces and proceeds with the task-derived route when intent and authority are clear, and asks when activation is bare or materially ambiguous. It has no `auto` workflow. Governance setup defaults to `setup/recommended`; architecture review to read-only `audit`; planning-only to `plan-refactor`; broad implementation or unresolved durable decisions to `plan-run-refactor`; and explicit bounded accepted-ADR work to `refactor`.

Setup uses target evidence and reserves the seven-decision foundation for new or evidence-empty repositories; complete coverage evaluates every adoptable target decision. Direct refactor cannot invent durable decisions or repair governance. Plan workflows require the native Plan lifecycle when supported. After Plan-mode exit, `plan-refactor` may persist only the approved specification and required governance artifacts, validate and report them, then stops without source implementation; `plan-run-refactor` persists the same governance artifacts, rechecks state, and executes only the unchanged approved plan. Repository-native ADR mapping, accepted history, protected state, risk-based validation, evidence receipts, conditional target instructions, and separate external-action approvals remain binding.

## Context

AC-ADR-045 established the five intent-bound workflows but ended planning-only work at an approved plan. Repository-conforming save-only handoff requires an explicit post-Plan boundary for persisting the approved specification and strictly required governance artifacts without silently implementing the refactor.

## Invariants

- Five public workflows and no recursive `auto` route.
- Audit is strictly read-only.
- Post-Plan persistence is a separately authorized governance slice, not source implementation.
- Refactor requires accepted local ADR authority and bounded write scope.
- External, destructive, deployment, and publication authority remains separate.

## Consequences

Approved plans can become durable, validated governance artifacts before implementation while the five-workflow selector and all authority boundaries remain stable.
