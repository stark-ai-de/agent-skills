# AC-ADR-002: Select Actions, Resolve Authority, and Record Guardrail Adoption

ID: AC-ADR-002
Title: Select Actions, Resolve Authority, and Record Guardrail Adoption
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: actions, authority, adoption, conflict-resolution
Applies when: Architecture Compass classifies a request, combines repository evidence, or proposes bundled guardrails.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Separate operational authority from architecture authority and record every applicable guardrail disposition.

Variants: **Short** · [Long, canonical](ac-adr-002-select-actions-resolve-authority-and-record-guardrail-adoption.long.md) · [Guide](ac-adr-002-select-actions-resolve-authority-and-record-guardrail-adoption.guide.md)

## Decision summary

Architecture Compass exposes `setup` for installing ADR governance and `refactor` for aligning, reviewing, or implementing code under existing decisions. It normalizes the action to one canonical setup or refactor internal mode, then classifies each request as decision, direct execution, audit, or review before mutation.

Operational instructions, permissions, and the approved task scope determine what an agent may do. Accepted target-repository ADRs determine the architecture it must implement. Neither axis silently overrides the other: a semantic conflict blocks the affected implementation. During setup, every adoptable target-repository guardrail receives an evidence-backed `adopt`, `adapt`, `defer`, or `reject` disposition; current non-applicability is recorded as a defer with a future trigger.

## Read next

Read the [Long variant](ac-adr-002-select-actions-resolve-authority-and-record-guardrail-adoption.long.md) when selecting a route, resolving conflicting evidence, or accepting guardrails. Use the [Guide](ac-adr-002-select-actions-resolve-authority-and-record-guardrail-adoption.guide.md) for routing and adoption worksheets.
