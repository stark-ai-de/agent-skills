# AC-ADR-057: Separate Metadata Repair From Installable Artifact Provenance

ID: AC-ADR-057
Title: Separate Metadata Repair From Installable Artifact Provenance
Status: Accepted
Date: 2026-08-26
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: release, recovery, artifacts, attestations, evidence
Applies when: A mutable published release is missing exact metadata or an installable artifact.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-26
Gist: Repair exact metadata without inventing installable-artifact provenance and keep artifact repair attestation-gated.

Variants: [Short](ac-adr-057-separate-metadata-repair-from-installable-artifact-provenance.short.md) · [Long, canonical](ac-adr-057-separate-metadata-repair-from-installable-artifact-provenance.long.md) · **Guide**

This guide is non-normative. The canonical Long decision controls published
repair classification and provenance.

## Repair checklist

1. Validate expected metadata, release identity, mutability, Latest identity,
   exact existing bytes, and the complete allowed asset set.
2. Permit missing metadata without valid artifact attestations only after full
   hosted-subject validation and proof that both installable artifacts were
   created strictly before publication.
3. After repair, require the metadata timestamp to be strictly after
   publication. Treat equal, missing, or invalid timestamps as ambiguous.
4. Permit any missing installable artifact only with its valid existing
   publication attestation. Block observation errors.
5. Create no post-publication attestation. Dispatch fresh post-release proof and
   keep later handoff behind its successful provenance checks.

## Verification

- Fixture missing-attestation metadata-only repair and its retry dispatch.
- Fixture a later or equal artifact timestamp, equal metadata timestamp,
  invalid timestamp, immutable release, unexpected asset, and conflicting bytes
  as blockers.
- Fixture installable-artifact repair with and without valid existing
  attestations.
- Confirm the metadata-only path creates no attestation and tolerates only an
  observed missing status, never an observation error.

## Decision lineage

- `adapts`: [ADR-0052](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0052-allow-scoped-json-only-published-release-repair.long.md).

## Current sources

- [GitHub release assets](https://docs.github.com/en/rest/releases/assets).
- [GitHub artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations).

## Revisit

Create a reciprocal successor when repair classification, chronology,
attestation prerequisites, or post-release proof changes materially.
