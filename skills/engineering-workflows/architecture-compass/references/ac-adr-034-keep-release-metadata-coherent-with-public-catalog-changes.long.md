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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: AC-ADR-055
Guide verified: 2026-07-28
Gist: Review release metadata with the public catalog change while keeping publication separately approved.

Variants: [Short](ac-adr-034-keep-release-metadata-coherent-with-public-catalog-changes.short.md) · **Long, canonical** · [Guide](ac-adr-034-keep-release-metadata-coherent-with-public-catalog-changes.guide.md)

## Context

Public skill changes can affect the installed package, repository catalog, generated site, host metadata, eval claims, release notes, and compatibility guidance independently. Preparing release metadata in a later automated pull request splits the behavior from its public contract and lets either side merge incomplete. Publishing automatically on merge collapses review, protected-branch state, tag creation, and external distribution into one irreversible boundary.

## Decision

A reviewed change that adds, removes, promotes, deprecates, renames, or materially changes a public skill or catalog contract prepares all required release metadata in the same change.

The review includes the affected skill version, repository release version when the repository uses one, changelog entry, public catalog and generated-site source metadata, host manifests, compatibility and migration notes, eval inventory, install examples, and explicit release intent required by the repository. Version impact follows the repository's documented compatibility policy; independent skill versions and the repository release version remain distinct when both exist.

Publication is a separate explicit action performed from the exact validated protected revision after merge or after the repository's equivalent acceptance boundary. The publisher verifies that the intended branch and commit have not drifted, creates or checks immutable tags and artifacts as applicable, and verifies public discovery or installation independently. A merged change, local validator, CI run, tag, release page, registry entry, and successful install are separate evidence stages.

Generated release surfaces derive from reviewed source and are either regenerated deterministically in the change or verified during the publication workflow. No publication step silently edits the protected source branch to repair missing metadata.

## Invariants

- Public behavior and its release description are reviewed together.
- Publication always identifies the exact source revision and requires explicit authority.
- Local or CI success is not described as publication or install proof.
- Missing metadata blocks release intent instead of being generated invisibly after review.
- Rollback, deprecation, and migration notes accompany breaking or risky contract changes.

## Failure handling

Block release readiness when versions, changelog, catalog, generated source, eval claims, or install guidance disagree. If the protected branch advances after validation, revalidate the intended revision or stop; do not move a tag or publish an unreviewed repair. Preserve already published immutable artifacts and use a documented successor release for corrections.

## Consequences

Change reviews are larger and contributors must understand release impact before merge. The repository gains one coherent release contract, explicit publication authority, and evidence that can be traced from source through public installation.
