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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-26
Gist: Repair exact metadata without inventing installable-artifact provenance and keep artifact repair attestation-gated.

Variants: **Short** · [Long, canonical](ac-adr-057-separate-metadata-repair-from-installable-artifact-provenance.long.md) · [Guide](ac-adr-057-separate-metadata-repair-from-installable-artifact-provenance.guide.md)

## Decision summary

A mutable published release may accept exact validated metadata without a valid
installable-artifact attestation only when strict chronology proves both
installable artifacts predate publication and the metadata was added later.
Any repair containing an installable artifact requires its existing valid
publication attestation. Every repair starts fresh post-release proof.

## Context

Metadata restoration does not change installable bytes, while artifact repair
introduces public bytes and needs stronger provenance. Complete exact state
alone cannot prove which class occurred.

## Invariants

- Metadata-only repair never changes installable artifacts.
- Strict chronology proves the repair class; ambiguity blocks.
- Missing installable artifacts require existing valid attestations.
- No published repair creates a new attestation.
- Every repair starts fresh post-release proof.

## Consequences

Exact metadata can be restored without manufacturing artifact provenance.
Later evidence or handoff may remain blocked until their own provenance
requirements pass.
