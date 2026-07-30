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
Variant: Short
Canonical variant: Long
Supersedes: AC-ADR-043
Superseded by: AC-ADR-048
Guide verified: 2026-07-29
Gist: Route clear architecture intent through five bounded workflows while preserving governance, planning, and validation gates.

Variants: **Short** · [Long, canonical](ac-adr-045-route-architecture-compass-through-setup-audit-and-refactor-with-intent-bound-agent-selection.long.md) · [Guide](ac-adr-045-route-architecture-compass-through-setup-audit-and-refactor-with-intent-bound-agent-selection.guide.md)

## Decision summary

Architecture Compass exposes `setup`, `audit`, `refactor`, `plan-refactor`, and `plan-run-refactor`. It discloses all five workflows, announces and proceeds with the task-derived route when intent and authority are clear, and asks when activation is bare or materially ambiguous. It has no `auto` workflow. Governance setup defaults to `setup/recommended`; architecture review to read-only `audit`; planning-only to `plan-refactor`; broad implementation or unresolved durable decisions to `plan-run-refactor`; and explicit bounded accepted-ADR work to `refactor`.

Setup uses target evidence and reserves the seven-decision foundation for new or evidence-empty repositories; complete coverage evaluates every adoptable target decision. Direct refactor cannot invent durable decisions or repair governance. Plan workflows require the native Plan lifecycle when supported, recheck state after approval, and execute only after Plan-mode exit. Repository-native ADR mapping, accepted history, protected state, risk-based validation, evidence receipts, conditional target instructions, and separate external-action approvals remain binding.

## Context

The former Setup/Apply contract required confirmation even for clear intent and combined materially different audit, governance, planning, and execution outcomes. Repository ADR-0038 permits a finite intent-bound selector, requiring a reciprocal Architecture Compass successor.

## Invariants

- Five public workflows and no recursive `auto` route.
- Audit is strictly read-only.
- Refactor requires accepted local ADR authority and bounded write scope.
- Native Plan mode controls planning when supported.
- Recommended setup is evidence-sensitive; the fixed foundation is only a new/evidence-empty default.
- External, destructive, deployment, and publication authority remains separate.

## Consequences

Users and autonomous agents can route clear architecture work directly while ambiguous or governance-incomplete work fails closed. The workflow surface is simpler, but each route now requires focused intent, authority, Plan lifecycle, and evidence validation.
