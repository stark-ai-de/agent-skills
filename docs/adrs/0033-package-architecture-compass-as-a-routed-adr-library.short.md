# ADR-0033: Package Architecture Compass as a routed ADR library

ID: ADR-0033
Title: Package Architecture Compass as a routed ADR library
Status: Superseded
Date: 2026-07-28
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: architecture-compass, routing, adr-library
Applies when: Changing Architecture Compass policy, routing, or guardrail content.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0039
Guide verified: 2026-07-28
Gist: Architecture Compass should load only applicable canonical guardrails.

Variants: **Short** · [Long, canonical](0033-package-architecture-compass-as-a-routed-adr-library.long.md) · [Guide](0033-package-architecture-compass-as-a-routed-adr-library.guide.md)

## Decision

We will package Architecture Compass as a flat, catalog-routed ADR triplet library with distinct `skill-runtime` and `target-repository` scopes and no additional manually maintained policy layer.

## Context

- The current skill duplicates rules across its main file, references, reports, checklists, and templates.
- Progressive disclosure keeps agent context bounded while preserving detailed guidance.

## Consequences

- Good: Agents load only relevant decisions and implementation guidance.
- Tradeoff: Catalog and metadata integrity become validated contracts.
- Risk: Poor applicability metadata could omit a needed guardrail.
