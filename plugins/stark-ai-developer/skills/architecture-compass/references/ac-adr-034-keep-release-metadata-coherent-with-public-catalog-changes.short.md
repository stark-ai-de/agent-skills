# AC-ADR-034: Keep Release Metadata Coherent With Public Catalog Changes

ID: AC-ADR-034
Title: Keep Release Metadata Coherent With Public Catalog Changes
Status: Superseded
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: release, changelog, versioning, pull-request
Applies when: Adding, removing, promoting, or materially changing a public skill or catalog contract.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: AC-ADR-055
Guide verified: 2026-07-28
Gist: Review release metadata with the public catalog change while keeping publication separately approved.

Variants: **Short** · [Long, canonical](ac-adr-034-keep-release-metadata-coherent-with-public-catalog-changes.long.md) · [Guide](ac-adr-034-keep-release-metadata-coherent-with-public-catalog-changes.guide.md)

## Decision summary

A change that alters the public skill catalog or an installed contract prepares its skill version, repository release version when required, changelog, catalog and site metadata, migration or deprecation notes, and release intent in the same reviewed change. Publication remains a separate explicit action from the validated protected revision; merging or passing local validation does not publish automatically.

## Context

Separating code or skill changes from their release metadata creates ambiguous review state and makes versioned artifacts harder to reproduce.

## Invariants

- One review shows the exact public contract and release intent.
- Versions and changelog describe the installed change honestly.
- Publication verifies the exact reviewed revision independently.

## Consequences

Contributors prepare more metadata before merge, while releases become coherent, reviewable, and less prone to omitted public surfaces.
