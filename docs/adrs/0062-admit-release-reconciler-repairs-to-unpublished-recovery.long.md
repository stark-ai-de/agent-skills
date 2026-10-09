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
Variant: Long
Canonical variant: Long
Supersedes: ADR-0053
Superseded by: None
Guide verified: 2026-10-09
Gist: A reviewed reconciler fix can qualify as the guarded controller change for payload-equivalent pre-publication recovery.

Variants: [Short](0062-admit-release-reconciler-repairs-to-unpublished-recovery.short.md) · **Long, canonical** · [Guide](0062-admit-release-reconciler-repairs-to-unpublished-recovery.guide.md)

## Decision

For unpublished generated-release recovery, a reviewed modification to `scripts/release/reconcile-github-release.mjs` may satisfy the required guarded publication-controller change, as may a modification to `.github/workflows/publish-release.yml`. The fixed recovery path allowlist adds only that reconciler, its owning regression test `scripts/validation/test-release-reconciler.mjs`, and this successor ADR triplet. A test or ADR change alone does not satisfy the controller-change requirement. All other ADR-0053 conditions remain binding: the authenticated Release Please origin, protected current main and strict ancestry, bounded complete comparison and file statuses, unchanged root release metadata and public payload, exact hosted validation for origin and replacement, byte-identical OpenAI and portable ZIPs with matching metadata identities, absent target tag and Release, protected environment approval, and replacement-bound tag and attestations.

## Why

- The publication workflow calls the reconciler before any tag or Release mutation; an unattested subject can legitimately return HTTP 404 at that boundary.
- Requiring a workflow-YAML edit when the defect and repair are in the invoked reconciler would add an unrelated change merely to satisfy the former guard.
- The narrow path set and unchanged origin, payload, hosted validation, approval, and provenance requirements retain the reviewed release identity.

## Options

- Chosen: Recognize the named reconciler as a guarded publication controller and admit only it, its regression test, and this ADR triplet to the fixed recovery path set.
- Rejected: Add a no-op workflow edit to satisfy the old guard, because that would not be the repair being reviewed.
- Rejected: Admit arbitrary release scripts, because that would weaken the bounded replacement-candidate review.

## Consequences

- Good: An immutable reconciler defect can be repaired and published from one protected replacement revision without changing the public payload.
- Tradeoff: Future controller paths still need a reviewed successor decision and an exact allowlist update.
- Risk: A controller path may contain unrelated edits; the protected PR review, complete compare response, file-status bounds, immutable payload check, and hosted byte comparison remain required.

## Follow-up

- Fixture both qualifying controller paths, test-only and ADR-only rejection, and unrelated script rejection.
- Keep the original release SHA explicit for readiness, publication, and environment approval.
