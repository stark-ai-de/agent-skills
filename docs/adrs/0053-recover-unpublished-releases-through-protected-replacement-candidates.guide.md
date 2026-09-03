# ADR-0053: Recover unpublished releases through protected replacement candidates

ID: ADR-0053
Title: Recover unpublished releases through protected replacement candidates
Status: Accepted
Date: 2026-09-03
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: release, recovery, github-actions, approvals, evidence
Applies when: A validated generated release cannot be published because its immutable controller is defective before any release mutation.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0051
Superseded by: None
Guide verified: 2026-09-03
Gist: Replace an unpublished release candidate only through an explicit protected and payload-equivalent recovery revision.

Variants: [Short](0053-recover-unpublished-releases-through-protected-replacement-candidates.short.md) · [Long, canonical](0053-recover-unpublished-releases-through-protected-replacement-candidates.long.md) · **Guide**

This guide is non-normative. [Long](0053-recover-unpublished-releases-through-protected-replacement-candidates.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

1. Use the original run for a transient failure that needs no workflow-code
   correction.
2. For a controller defect before any tag or Release exists, merge only the
   reviewed controller, validator, runbook, and successor-ADR repair files.
3. Run `npm run release:manage -- publish-plan --recovery-release-sha SHA --confirm`
   with the full original generated-release merge SHA. Inspect the authenticated
   origin PR, successful origin validation, protected ancestry, allowed file
   set, target absence, fresh candidate validation, and exact ZIP comparison.
4. After the plan succeeds, separately dispatch
   `npm run release:manage -- publish --recovery-release-sha SHA --confirm`.
5. Approve the waiting `release` environment only after verifying the exact run
   SHA. That replacement SHA becomes the annotated tag and attestation source.
6. Verify Latest, the three direct assets, both ZIP attestations, and the exact
   tag's post-release evidence before any third-party handoff.

## Verification

- Fixture the authenticated origin, exact successful pull-request and merged
  origin runs, protected strict ancestry, bounded complete compare response,
  fixed path allowlist, allowed file statuses, absent tag/release, and original
  PR lifecycle output.
- Reject equal or diverged SHAs, an unprotected or mismatched `main`, incomplete
  results, unexpected/renamed/removed paths, changed release metadata or public
  payload, a missing/failed origin run, and any existing tag or Release.
- Download both runs' direct subjects and prove the ZIP pairs byte-identical.
  Validate each metadata document against its own SHA and require equal
  release, plugin, archive-profile, size, and digest identities.
- Confirm the write-capable job remains behind `environment: release` and binds
  its tag, reconciliation, receipt, and attestation checks to the replacement
  SHA.

## Current references

- [GitHub workflow reruns](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs).
- [GitHub workflow revision identity](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflows).
- [GitHub artifact attestation contents](https://docs.github.com/en/actions/concepts/security/artifact-attestations).
- [GitHub compare two commits](https://docs.github.com/en/rest/commits/commits#compare-two-commits).
- [GitHub direct artifact upload](https://github.com/actions/upload-artifact/blob/main/action.yml).

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
