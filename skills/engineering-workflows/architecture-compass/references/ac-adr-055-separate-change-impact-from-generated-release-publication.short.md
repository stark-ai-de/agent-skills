# AC-ADR-055: Separate Change Impact From Generated Release Publication

ID: AC-ADR-055
Title: Separate Change Impact From Generated Release Publication
Status: Accepted
Date: 2026-08-26
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: release, changelog, versioning, pull-request, approval, evidence
Applies when: A repository aggregates reviewed public-skill changes into generated release preparation and separately approved publication.
Adoptable: true
Variant: Short
Canonical variant: Long
Supersedes: AC-ADR-034
Superseded by: none
Guide verified: 2026-08-26
Gist: Review component impact in feature changes, aggregate root release metadata in one generated PR, and keep publication and proof separately protected.

Variants: **Short** · [Long, canonical](ac-adr-055-separate-change-impact-from-generated-release-publication.long.md) · [Guide](ac-adr-055-separate-change-impact-from-generated-release-publication.guide.md)

## Decision summary

A repository with deterministic release preparation may review affected
component versions and public-contract impact in feature pull requests, then
use one generated release pull request as the only writer of the root release
version, manifest, and changelog. The generated pull request cannot tag or
publish and has an exact changed-file contract. Publication remains a separate
protected action from the exact validated revision, preserves verified artifact
bytes, and explicitly starts post-release proof after initial publication or an
allowed repair.

## Context

AC-ADR-034 required root release metadata in every feature change. That keeps a
single change coherent but creates conflicting global version and changelog
ownership when several independently reviewed changes queue for one catalog
release.

## Invariants

- Feature review contains the complete affected-component and public-contract
  impact.
- Exactly one generator owns root release aggregation.
- Generated preparation never implies tag or publication authority.
- Publication, post-release proof, install, and third-party handoff remain
  separate evidence stages and approval boundaries.

## Consequences

Feature reviews stay focused and one later pull request exposes the complete
catalog release. Repositories must enforce exact generator ownership,
changed-file limits, protected publication, and evidence dispatch.
