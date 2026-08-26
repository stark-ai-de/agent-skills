# ADR-0015: Prepare releases in change PRs

ID: ADR-0015
Title: Prepare releases in change PRs
Status: Superseded
Date: 2026-05-24
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: release, pull-request, changelog
Applies when: Changing a public skill in a release-intent pull request.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: ADR-0011
Superseded by: ADR-0050
Guide verified: 2026-08-19
Gist: Release metadata should travel with the public catalog change it releases.

Variants: [Short](0015-prepare-releases-in-change-prs.short.md) · **Long, canonical** · [Guide](0015-prepare-releases-in-change-prs.guide.md)

## Decision

We will prepare package and changelog release changes in the same pull request that changes public skills, then publish manually from `main`.

## Why

- Per-skill versions are independent and can stay below the repository package version.
- Public skill additions, removals, and version increases change the repository catalog release.
- A separate prepare workflow splits related review state from the catalog change.

## Options

- Chosen: Review skill, package, and changelog release updates together.
- Rejected: Generated prepare-release PRs, because they split release state.
- Rejected: Auto-publish on merge, because tags still need maintainer approval.

## Consequences

- Good: PR validation checks one coherent release contract.
- Tradeoff: Contributors must prepare release metadata before merging public skill changes.
- Risk: None known.

## Follow-up

- Keep `Publish Release` manual and guarded.
