# ADR-0047: Generate release PRs and protect publication

ID: ADR-0047
Title: Generate release PRs and protect publication
Status: Accepted
Date: 2026-08-26
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: release, pull-request, github-actions, artifacts, approvals, evidence
Applies when: Preparing, approving, publishing, repairing, or verifying a stable catalog release.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: ADR-0015, ADR-0046
Superseded by: None
Guide verified: 2026-08-26
Gist: Generated release PRs prepare one coherent version while protected publication preserves exact direct assets and dispatches post-release evidence explicitly.

Variants: **Short** · [Long, canonical](0047-generate-release-prs-and-protect-publication.long.md) · [Guide](0047-generate-release-prs-and-protect-publication.guide.md)

## Decision

The repository will separate reviewed feature impact, generated catalog release preparation, protected publication, and post-release proof while binding all four stages to one exact `main` revision. Feature pull requests update affected skill and plugin versions but do not manufacture a root release; Release Please is the sole producer of the draft pull request that synchronizes the release manifest, root package version, and root changelog. Release Please never creates the tag or GitHub Release.

Publication reuses the successful hosted `Validate` output for the release revision as three direct, byte-preserved assets: `openai.zip`, `portable.zip`, and `release-subject.json`. Only the ZIPs are attested. A read-only readiness job validates the candidate and remote plan; the only write-capable job targets the protected `release` environment, verifies its required reviewer, single custom `main` deployment-branch policy, protected `main`, and disabled administrator bypass before any API mutation, then reconciles an annotated tag and stable GitHub Release as `latest` without clobbering mismatched or immutable state.

The reconciler explicitly dispatches post-release evidence from protected `main` whenever initial publication or an allowed repair changes release state. Publication, repair, attestation, post-release evidence, and the manual OpenAI portal handoff remain distinct evidence and approval boundaries; local or hosted validation alone grants none of those external outcomes.

## Context

ADR-0015 required root release metadata inside each feature PR and rejected
generated release PRs. ADR-0046 defined one JSON metadata contract but kept only
the ZIPs as published subjects. That split now prevents a single automated
version queue, an exact JSON handoff, and environment-protected publication.

## Consequences

- Good: Feature review, version aggregation, irreversible publication, and
  post-release proof have explicit owners and exact revision/byte bindings.
- Tradeoff: Maintainers must configure and maintain a scoped GitHub App and the
  protected `release` environment before publication can proceed.
- Risk: Incorrect workflow routing or recovery logic could bypass approval or
  attach stale bytes; fail-closed environment, identity, digest, latest-release,
  attestation, and dispatch checks mitigate that risk.
