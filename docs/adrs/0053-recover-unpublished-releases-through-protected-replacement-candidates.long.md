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
Variant: Long
Canonical variant: Long
Supersedes: ADR-0051
Superseded by: None
Guide verified: 2026-09-03
Gist: Replace an unpublished release candidate only through an explicit protected and payload-equivalent recovery revision.

Variants: [Short](0053-recover-unpublished-releases-through-protected-replacement-candidates.short.md) · **Long, canonical** · [Guide](0053-recover-unpublished-releases-through-protected-replacement-candidates.guide.md)

## Decision

The repository may replace an unpublished generated release candidate only when an immutable workflow defect prevents its original run from publishing and neither the target tag nor any target-version GitHub Release exists. The operator must supply the original full release SHA. Before scheduling mutation, read-only checks authenticate that SHA as the configured Release Please App-owned merge, require successful hosted `Validate` runs for its exact pull-request head and merged origin, prove it is a strict ancestor of the exact protected current `main`, and require the complete intervening diff to contain only a fixed recovery allowlist with no removed or renamed paths, root release metadata changes, or public payload changes. Readiness then requires a successful hosted `Validate` run for the replacement candidate, byte-identical `openai.zip` and `portable.zip` artifacts between both main runs, and valid metadata documents with equal release, plugin, archive-profile, size, and digest identities while each document names its own source revision. The replacement candidate, not the origin, becomes the tag target, release-subject revision, workflow and source digest, and protected-environment approval target. Ordinary transient retry continues through the original run; repair after any tag or Release exists remains governed by ADR-0052.

## Why

- GitHub reruns keep the original event SHA, ref, and workflow definition, so a
  controller defect cannot be repaired by merely rerunning that immutable run.
- Attestations include the workflow and source revision; a newer controller
  publishing an older tag target would contradict the repository's exact
  signer/source verification contract.
- A strict path allowlist and exact hosted-archive equivalence preserve the
  already reviewed release payload without pretending that the controller
  source did not change.
- Making the replacement SHA authoritative keeps the workflow definition,
  candidate checkout, tag, release metadata, approval, and attestations on one
  observable revision.

## Options

- Chosen: Permit an explicit pre-publication replacement at protected current
  `main` after origin authentication, bounded-diff proof, two hosted validation
  receipts, and byte-identical ZIP comparison.
- Rejected: Rerun the original workflow after merging a fix, because the rerun
  still executes the defective workflow revision.
- Rejected: Tag the old candidate from the new workflow, because attestation
  source and signer digests would identify a different revision than the tag.
- Rejected: Advance directly to `v0.21.1`, because the validated, unpublished
  `v0.21.0` payload remains recoverable without changing public contents.
- Rejected: Accept arbitrary descendants of the origin, because feature or
  dependency changes would enter the same release number without a generated
  release transition.

## Consequences

- Good: A pre-mutation controller failure can be repaired without losing the
  generated version or weakening exact provenance.
- Good: The original generated release PR remains the authenticated lifecycle
  owner even though the replacement SHA is the published source revision.
- Tradeoff: Recovery depends on retained origin artifacts and a fresh
  successful candidate `Validate` run.
- Tradeoff: Any future legitimate recovery path outside the fixed allowlist
  needs an explicit reviewed policy change.
- Risk: Compare responses or artifacts may be missing, truncated, or expired;
  every ambiguous state blocks before the protected mutation job.

## Follow-up

- Keep the recovery allowlist centralized and fixture every allowed path,
  forbidden public path, file status, comparison boundary, and publication
  absence rule.
- Keep ordinary current-candidate publication and published-release repair as
  separate state-machine branches.
- Remove a recovery path only through a reciprocal successor if the hosted
  platform later supports safely updating an immutable failed workflow run.
