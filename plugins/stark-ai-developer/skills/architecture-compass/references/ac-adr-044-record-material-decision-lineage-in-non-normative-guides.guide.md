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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Keep only material public decision relationships in Guides and validate a complete lineage disposition inventory.

Variants: [Short](ac-adr-044-record-material-decision-lineage-in-non-normative-guides.short.md) · [Long, canonical](ac-adr-044-record-material-decision-lineage-in-non-normative-guides.long.md) · **Guide**

This guide is non-normative. The canonical Long decision controls lineage classification, placement, and validation.

## Current workflow mapping

The canonical phrase `Setup and Apply` names the provider-to-local mapping lifecycle, not two current public workflow labels. The mapping is created or reconciled by current `setup`; later authorized application occurs through `refactor` or `plan-run-refactor` under AC-ADR-048. `audit` reports the mapping without writing, and `plan-refactor` may persist only its approved governance slice plus a bounded execution handoff.

## Classification procedure

1. Read the candidate AC-ADR's canonical Long decision and the public repository ADRs claimed as ancestors.
2. Classify a relationship only when it materially explains how the provider decision was formed or bounded.
3. Use `adapts` for bounded changes, `consolidates` for a many-to-one merge, `generalizes` for broader applicability, or `diverges-from` for deliberate non-retention.
4. Mark the AC-ADR `independent` when no public repository-ADR relationship is evidenced. Do not add originality boilerplate to its Guide.
5. For a material decision, put the typed relationship in a `Decision lineage` section immediately before the Guide's official or current sources.
6. Synchronize the repo-only lineage manifest and identify the smallest focused checks that prove the changed lineage and triplet surfaces.

## Boundary checks

- Keep commands, APIs, specifications, and other implementation evidence under official or current sources.
- Keep copyright, license, notice, and attribution records in their owning surfaces.
- Keep AC-ADR succession in triplet metadata and provider-to-local adoption in the current workflow mapping described above.
- Do not promote a merely compared or inspirational source into formal decision lineage.
- Remove private paths, unpublished drafts, review provenance, and unverifiable approval claims instead of translating them into lineage.
- Change Short or Long only when the decision itself changes; Guide-lineage maintenance does not authorize an in-place accepted decision rewrite.

## Validation

Select checks from the changed lineage contract, its catalog and lock surfaces, and any explicit repository or user gate. Do not run the repository aggregate merely because an ADR changed. When validation is explicitly excluded, record it as `not run` instead of overriding that boundary.

## Current sources

- [Agent Skills specification](https://agentskills.io/specification), verified 2026-07-28.
- [MADR: record architecture decisions](https://adr.github.io/madr/decisions/0001-record-architecture-decisions.html), verified 2026-07-28.

## Revisit

Create a successor if decision lineage becomes normative, needs external-source types beyond repository ADRs, or moves into the installed metadata contract.
