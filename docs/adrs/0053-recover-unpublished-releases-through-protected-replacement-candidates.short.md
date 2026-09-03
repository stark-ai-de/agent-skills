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
Variant: Short
Canonical variant: Long
Supersedes: ADR-0051
Superseded by: None
Guide verified: 2026-09-03
Gist: Replace an unpublished release candidate only through an explicit protected and payload-equivalent recovery revision.

Variants: **Short** · [Long, canonical](0053-recover-unpublished-releases-through-protected-replacement-candidates.long.md) · [Guide](0053-recover-unpublished-releases-through-protected-replacement-candidates.guide.md)

## Decision

The repository may replace an unpublished generated release candidate only when an immutable workflow defect prevents its original run from publishing and neither the target tag nor any target-version GitHub Release exists. The operator must supply the original full release SHA. Before scheduling mutation, read-only checks authenticate that SHA as the configured Release Please App-owned merge, require successful hosted `Validate` runs for its exact pull-request head and merged origin, prove it is a strict ancestor of the exact protected current `main`, and require the complete intervening diff to contain only a fixed recovery allowlist with no removed or renamed paths, root release metadata changes, or public payload changes. Readiness then requires a successful hosted `Validate` run for the replacement candidate, byte-identical `openai.zip` and `portable.zip` artifacts between both main runs, and valid metadata documents with equal release, plugin, archive-profile, size, and digest identities while each document names its own source revision. The replacement candidate, not the origin, becomes the tag target, release-subject revision, workflow and source digest, and protected-environment approval target. Ordinary transient retry continues through the original run; repair after any tag or Release exists remains governed by ADR-0052.

## Context

GitHub reruns retain the original workflow revision, so a defect in that
immutable controller cannot consume a later fix. Publishing the old candidate
from a newer workflow would instead make tag identity and attestation
provenance disagree. A narrowly reviewed replacement can preserve the release
payload while making controller, candidate, validation, approval, and
attestation identity coherent again.

## Consequences

- Good: A controller defect can be repaired without renumbering or silently
  absorbing later feature work into the unpublished release.
- Tradeoff: Recovery requires two retained hosted validation receipts and exact
  archive comparison in addition to the normal protected publication gates.
- Risk: An overbroad allowlist could admit next-cycle content; the list is
  fixed, file-status bounded, and independently reviewed as release policy.
