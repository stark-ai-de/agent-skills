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
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0011
Superseded by: None
Guide verified: 2026-08-19
Gist: Release metadata should travel with the public catalog change it releases.

Variants: [Short](0015-prepare-releases-in-change-prs.short.md) · [Long, canonical](0015-prepare-releases-in-change-prs.long.md) · **Guide**

This guide is non-normative. [Long](0015-prepare-releases-in-change-prs.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

- Map the decision to the owning validation, evidence, promotion, or release boundary.
- Keep local, CI, publication, deployment, and third-party evidence as separate stages.
- Change only the authorized delivery slice and preserve an explicit rollback or stop condition.
- In the change PR, write `CHANGELOG.md` as the planned catalog release compared with the previous release. Keep historical `## vX.Y.Z` sections unchanged, omit intra-PR layouts that no longer exist, and fold `## Unreleased` list items into `## v<package-version>` when the package version is bumped.

## Verification

- Record the exact commands or scenarios executed and the evidence stage each result proves.
- Confirm that generated reports and release claims do not exceed the available evidence.
- Cite the exact files, commands, and evidence boundaries used for the conclusion.
- Confirm `CHANGELOG.md` versus the PR base: historical `## vX.Y.Z` sections are unchanged, the `## Unreleased` section has no list items when the package is bumped, and the new `## v<package-version>` section describes the current tree compared with the previous release.
- A direct release-intent candidate may prepare package, plugin, listing, and worksheet metadata together, but publication remains a separate guarded evidence stage.

## Historical follow-up context

The original record named these follow-ups. Revalidate them against current repository state before treating them as active work:

- Keep `Publish Release` manual and guarded.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
