# ADR-0033: Package Architecture Compass as a routed ADR library

ID: ADR-0033
Title: Package Architecture Compass as a routed ADR library
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: architecture-compass, routing, adr-library
Applies when: Changing Architecture Compass policy, routing, or guardrail content.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Architecture Compass should load only applicable canonical guardrails.

Variants: [Short](0033-package-architecture-compass-as-a-routed-adr-library.short.md) · **Long, canonical** · [Guide](0033-package-architecture-compass-as-a-routed-adr-library.guide.md)

## Decision

We will package Architecture Compass as a flat, catalog-routed ADR triplet library with distinct `skill-runtime` and `target-repository` scopes and no additional manually maintained policy layer.

## Why

- The current skill duplicates rules across its main file, references, reports, checklists, and templates.
- Progressive disclosure keeps agent context bounded while preserving detailed guidance.
- Scope metadata prevents the skill's own workflow rules from being offered as target-repository adoption choices.

## Options

- Chosen: Compact dispatcher, human-readable catalog, and direct triplet routing.
- Rejected: Read every reference, because it wastes context and obscures applicability.
- Rejected: A compiled prose layer, because it would become another authority surface.

## Consequences

- Good: Agents load only relevant decisions and implementation guidance.
- Tradeoff: Catalog and metadata integrity become validated contracts.
- Risk: Poor applicability metadata could omit a needed guardrail.

## Follow-up

- Extend [ADR-0024](0024-keep-architecture-compass-portable-with-host-mode-adapters.short.md) ([Long, canonical](0024-keep-architecture-compass-portable-with-host-mode-adapters.long.md) · [Guide](0024-keep-architecture-compass-portable-with-host-mode-adapters.guide.md)) through routed skill-runtime ADRs.
