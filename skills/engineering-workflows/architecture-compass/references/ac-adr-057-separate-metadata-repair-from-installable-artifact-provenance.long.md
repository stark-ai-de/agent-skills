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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-26
Gist: Repair exact metadata without inventing installable-artifact provenance and keep artifact repair attestation-gated.

Variants: [Short](ac-adr-057-separate-metadata-repair-from-installable-artifact-provenance.short.md) · **Long, canonical** · [Guide](ac-adr-057-separate-metadata-repair-from-installable-artifact-provenance.guide.md)

## Context

Published recovery has distinct integrity classes. Restoring an exact validated
metadata document for existing installable artifacts does not change those
artifacts. Restoring a missing installable artifact introduces public bytes and
therefore needs stronger provenance. Treating both repairs identically either
blocks metadata recovery or weakens artifact integrity.

## Decision

A target repository may add an exact fully validated metadata subject to a mutable published release without a valid installable-artifact attestation only when strict provider chronology proves that every required installable artifact was created before publication and the metadata asset was created after publication. Equal, missing, invalid, or otherwise ambiguous timestamps block. Any repair containing an installable artifact requires the existing valid publication attestation, and an attestation observation error always blocks.

Metadata-only repair creates no installable artifact and no attestation. Every permitted repair explicitly starts fresh post-release proof. Successful proof and any later install or third-party handoff retain their own provenance gates; completing metadata recovery cannot claim those later outcomes.

## Invariants

- Metadata-only repair never changes installable artifact bytes.
- Strict asset chronology identifies the metadata-only repair class.
- Installable-artifact repair requires existing valid publication provenance.
- Immutable, conflicting, unexpected, or ambiguous state blocks.
- No published repair creates a new attestation.
- Every allowed repair starts fresh post-release proof.
- Publication, proof, install, and third-party handoff remain distinct.

## Failure handling

Block when exact metadata, release identity, Latest identity, mutability, asset
membership, bytes, or chronology cannot be proved. Block installable-artifact
repair without valid existing attestations and block every attestation
observation error. Preserve published bytes on conflict and use a successor
release for immutable or irreconcilable state.

## Consequences

- Benefit: Exact metadata recovery remains possible without manufacturing
  provenance for unchanged installable artifacts.
- Benefit: Installable-artifact repair retains its stronger provenance gate.
- Tradeoff: Equal or unavailable provider timestamps block a legitimate fast
  repair.
- Risk: Metadata recovery can complete while later provenance-dependent proof
  remains unavailable; receipts must state that boundary.

## Adoption notes

Adopt only with exact hosted subjects, fail-closed remote reconciliation,
authoritative asset timestamps, and separate post-release proof. Otherwise keep
all published repair attestation-gated or refuse it entirely.
