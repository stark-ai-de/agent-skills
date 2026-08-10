# ADR-0039: Separate Internal Skill Implementation Policy from Exposed Contracts

ID: ADR-0039
Title: Separate Internal Skill Implementation Policy from Exposed Contracts
Status: Proposed
Date: 2026-08-05
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: adr, architecture-compass, internal-policy, public-contracts
Applies when: Adding, changing, routing, or promoting skill implementation rules and portable behavior contracts.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-05
Gist: Implementation-only skill policy stays private while generalized portable behavior is promoted through explicit exposed ADR contracts.

Variants: [Short](0039-separate-internal-skill-implementation-policy-from-exposed-contracts.short.md) · [Long, canonical](0039-separate-internal-skill-implementation-policy-from-exposed-contracts.long.md) · **Guide**

This guide is non-normative. [Long](0039-separate-internal-skill-implementation-policy-from-exposed-contracts.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

- Classify a rule as internal when it governs only skill packaging, routing, host adapters, persistence-surface resolution, evaluation mechanics, or other implementation details.
- Keep internal records in the owning skill's private or internal documentation surface. Do not add them to the public Architecture Compass catalog or target-repository adoption flow.
- Classify a rule as exposed when it defines generalized behavior that other skills, agents, or target repositories should be able to discover and adopt.
- Promote exposed behavior through a complete Short, Long, Guide triplet with stable metadata, catalog linkage, lineage, and validation updates. Do not silently duplicate an internal record.
- If an internal note and an accepted exposed decision conflict, follow the exposed decision and open the appropriate successor or correction record.

## Verification

- Confirm internal records are absent from public catalog and target-adoption indexes, while exposed triplets are linked in `docs/adrs.md` and pass triplet validation.
- Run `npm run validate:adrs` and the focused validator for the owning skill or catalog boundary.
- Check that references identify the exposed Short record first and include matching Long and Guide companions; internal implementation paths must not be presented as portable authority.

## Revisit

Create a new ADR that supersedes this record when the internal/exposed boundary changes. If an internal rule becomes generalized, promote it through a new exposed ADR instead of editing this record or treating the internal note as public policy.
