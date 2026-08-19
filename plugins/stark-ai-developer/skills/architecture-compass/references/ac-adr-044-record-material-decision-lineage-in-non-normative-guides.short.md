# AC-ADR-044: Record Material Decision Lineage in Non-Normative Guides

ID: AC-ADR-044
Title: Record Material Decision Lineage in Non-Normative Guides
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: decision-lineage, provenance, adr, validation
Applies when: Creating or maintaining an Architecture Compass ADR triplet or its repository-ADR derivation record.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Keep only material public decision relationships in Guides and validate a complete lineage disposition inventory.

Variants: **Short** · [Long, canonical](ac-adr-044-record-material-decision-lineage-in-non-normative-guides.long.md) · [Guide](ac-adr-044-record-material-decision-lineage-in-non-normative-guides.guide.md)

## Decision summary

Architecture Compass records repository-ADR ancestry only when it materially explains that a provider decision adapts, consolidates, generalizes, or diverges from a public repository decision. The relationship appears as a typed `Decision lineage` section in the non-normative Guide; independent decisions omit the section. Every AC-ADR receives one complete, validated `material` or `independent` disposition outside the installed runtime payload.

Official and current sources, required attribution, provider-to-local mapping, and AC-ADR succession remain separate contracts. Lineage cannot supply normative obligations, replace the canonical Long decision, or expose private or unverifiable maintainer history.

## Context

The former `Source provenance` heading mixed useful decision ancestry with current technical sources, originality boilerplate, and unpublished maintainer context. Selective typed lineage preserves the useful graph without turning every Guide into an origin narrative.

## Invariants

- Decision lineage is Guide-only, public, typed, and non-normative.
- Independent decisions omit lineage rather than asserting that they are new or not copied.
- A complete repo-only manifest makes both material and independent dispositions deterministic.
- Operational sources, attribution, local mapping, and supersession are not reclassified as lineage.

## Consequences

Maintainers gain an auditable derivation graph with less public noise and disclosure risk. Adding or reclassifying an ADR now requires synchronized Guide and manifest updates.
