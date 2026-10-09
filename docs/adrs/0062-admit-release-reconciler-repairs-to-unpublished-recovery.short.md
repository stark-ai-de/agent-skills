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
Variant: Short
Canonical variant: Long
Supersedes: ADR-0053
Superseded by: None
Guide verified: 2026-10-09
Gist: A reviewed reconciler fix can qualify as the guarded controller change for payload-equivalent pre-publication recovery.

Variants: **Short** · [Long, canonical](0062-admit-release-reconciler-repairs-to-unpublished-recovery.long.md) · [Guide](0062-admit-release-reconciler-repairs-to-unpublished-recovery.guide.md)

## Decision

For unpublished generated-release recovery, a reviewed modification to `scripts/release/reconcile-github-release.mjs` may satisfy the required guarded publication-controller change, as may a modification to `.github/workflows/publish-release.yml`. The fixed recovery path allowlist adds only that reconciler, its owning regression test `scripts/validation/test-release-reconciler.mjs`, and this successor ADR triplet. A test or ADR change alone does not satisfy the controller-change requirement. All other ADR-0053 conditions remain binding: the authenticated Release Please origin, protected current main and strict ancestry, bounded complete comparison and file statuses, unchanged root release metadata and public payload, exact hosted validation for origin and replacement, byte-identical OpenAI and portable ZIPs with matching metadata identities, absent target tag and Release, protected environment approval, and replacement-bound tag and attestations.

## Context

The protected publication workflow invokes the GitHub Release reconciler. A defect in that script can block an unpublished release even when the workflow YAML is correct. ADR-0053's original guard recognized only edits to the workflow file.

## Consequences

- Good: A reviewed fix to the actual failing controller can recover the validated release without a ceremonial workflow edit.
- Tradeoff: The allowlist and controller-change guard must stay aligned with this explicit successor decision.
- Risk: A broader script allowance could admit unrelated next-cycle behavior; only the named reconciler and its test are added.
