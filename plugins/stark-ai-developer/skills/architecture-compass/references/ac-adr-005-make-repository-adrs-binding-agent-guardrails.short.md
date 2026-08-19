# AC-ADR-005: Make Repository ADRs Binding Agent Guardrails

ID: AC-ADR-005
Title: Make Repository ADRs Binding Agent Guardrails
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: governance
Tags: adr-governance, agent-instructions, conflict-resolution
Applies when: A repository uses or is adopting ADR governance for architecture-affecting implementation, refactoring, or review.
Adoptable: true
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Make accepted repository ADRs discoverable and binding for architecture-affecting agent work.

Variants: **Short** · [Long, canonical](ac-adr-005-make-repository-adrs-binding-agent-guardrails.long.md) · [Guide](ac-adr-005-make-repository-adrs-binding-agent-guardrails.guide.md)

## Decision summary

A governed repository keeps a canonical ADR location and index, records one durable decision per ADR, and tells agents to discover and apply relevant accepted ADRs before architecture-affecting work. Proposed ADRs are pending choices; superseded ADRs lead to their successors; current code that conflicts with an accepted ADR is drift.

Changing an accepted decision requires a successor or the repository's explicit amendment process. The agent reports a conflict before implementation and names the ADRs that constrained completed work.

## Read next

Read the [Long variant](ac-adr-005-make-repository-adrs-binding-agent-guardrails.long.md) when installing governance, resolving ADR status, or handling drift. Use the [Guide](ac-adr-005-make-repository-adrs-binding-agent-guardrails.guide.md) for an adoption and discovery workflow.
