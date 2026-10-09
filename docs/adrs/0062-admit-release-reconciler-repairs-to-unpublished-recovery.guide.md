# ADR-0062: Admit release reconciler repairs to unpublished recovery

ID: ADR-0062
Title: Admit release reconciler repairs to unpublished recovery
Status: Accepted
Date: 2026-10-09
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: release, recovery, github-actions, attestations
Applies when: An unpublished generated release is blocked by a defect in the GitHub Release reconciler invoked by the protected publication workflow.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0053
Superseded by: None
Guide verified: 2026-10-09
Gist: A reviewed reconciler fix can qualify as the guarded controller change for payload-equivalent pre-publication recovery.

Variants: [Short](0062-admit-release-reconciler-repairs-to-unpublished-recovery.short.md) · [Long, canonical](0062-admit-release-reconciler-repairs-to-unpublished-recovery.long.md) · **Guide**

This guide is non-normative. [Long](0062-admit-release-reconciler-repairs-to-unpublished-recovery.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

1. Keep the generated release merge SHA as the explicit recovery origin.
2. Review the complete origin-to-replacement diff. A change to the publication workflow or `scripts/release/reconcile-github-release.mjs` must be present; test and ADR changes alone do not qualify.
3. Admit only the two named reconciler files and this ADR triplet in addition to the previously fixed ADR-0053 paths. Keep file-status, ancestry, immutable-file, and publication-absence checks unchanged.
4. Run the dry-run `publish-plan` with `--recovery-release-sha` before dispatching publication. Verify both hosted ZIP pairs are byte-identical and all required metadata identities match.
5. Approve only the exact protected replacement run, then verify tag, direct assets, attestations, and post-release evidence.

## Verification

- `pnpm run validate:release-management` proves workflow and reconciler changes qualify while test-only, ADR-only, and unrelated scripts fail.
- `pnpm run validate:adrs` proves reciprocal supersession and decision-lock integrity.
- The hosted recovery dry-run proves protected origin and replacement validation, complete allowed diff, unchanged root metadata, and byte-identical ZIP subjects. A local test is not publication evidence.

## Current references

- [ADR-0053](0053-recover-unpublished-releases-through-protected-replacement-candidates.long.md) defines the unchanged recovery boundaries.
- [GitHub artifact attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations) describe release-subject provenance.

## Revisit

Create a reciprocal successor if another controller path needs recovery eligibility or the guarded-controller requirement changes.
