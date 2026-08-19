# AC-ADR-001: Route Architecture Compass Through Canonical ADR Triplets

ID: AC-ADR-001
Title: Route Architecture Compass Through Canonical ADR Triplets
Status: Superseded
Date: 2026-07-28
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: adr-library, routing, progressive-disclosure
Applies when: Architecture Compass is activated, maintained, or extended with a durable rule.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: AC-ADR-051
Guide verified: 2026-07-28
Gist: Route each task through a bounded set of ADR triplets and keep Long as the only normative variant.

Variants: **Short** · [Long, canonical](ac-adr-001-route-architecture-compass-through-canonical-adr-triplets.long.md) · [Guide](ac-adr-001-route-architecture-compass-through-canonical-adr-triplets.guide.md)

## Decision summary

Architecture Compass stores each durable skill rule as a linked Short, Long, and Guide triplet. Long alone is normative; Short supports scanning and Guide supplies non-normative implementation help. `SKILL.md` and the ADR catalog route a task to relevant Short variants before an agent loads only the Long decisions and Guides needed for that task.

Reports, templates, examples, and checklists may derive from the library, but they cannot create or override policy. A missing, drifting, or contradictory triplet blocks reliance on that decision until the canonical Long and its derived views agree.

## Read next

Read the [Long variant](ac-adr-001-route-architecture-compass-through-canonical-adr-triplets.long.md) before changing Architecture Compass routing, ADR authority, metadata, or derived artifacts. Load the [Guide](ac-adr-001-route-architecture-compass-through-canonical-adr-triplets.guide.md) for the maintenance procedure and examples.
