# ADR-0015: Prepare releases in change PRs

ID: ADR-0015
Title: Prepare releases in change PRs
Status: Accepted
Date: 2026-05-24
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: release, pull-request, changelog
Applies when: Changing a public skill in a release-intent pull request.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: ADR-0011
Superseded by: None
Guide verified: 2026-07-28
Gist: Release metadata should travel with the public catalog change it releases.

Variants: **Short** · [Long, canonical](0015-prepare-releases-in-change-prs.long.md) · [Guide](0015-prepare-releases-in-change-prs.guide.md)

## Decision

We will prepare package and changelog release changes in the same pull request that changes public skills, then publish manually from `main`.

## Context

- Per-skill versions are independent and can stay below the repository package version.
- Public skill additions, removals, and version increases change the repository catalog release.

## Consequences

- Good: PR validation checks one coherent release contract.
- Tradeoff: Contributors must prepare release metadata before merging public skill changes.
- Risk: None known.
