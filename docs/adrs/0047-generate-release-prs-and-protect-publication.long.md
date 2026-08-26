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
Variant: Long
Canonical variant: Long
Supersedes: ADR-0015, ADR-0046
Superseded by: None
Guide verified: 2026-08-26
Gist: Generated release PRs prepare one coherent version while protected publication preserves exact direct assets and dispatches post-release evidence explicitly.

Variants: [Short](0047-generate-release-prs-and-protect-publication.short.md) · **Long, canonical** · [Guide](0047-generate-release-prs-and-protect-publication.guide.md)

## Decision

The repository will separate reviewed feature impact, generated catalog release preparation, protected publication, and post-release proof while binding all four stages to one exact `main` revision. Feature pull requests update affected skill and plugin versions but do not manufacture a root release; Release Please is the sole producer of the draft pull request that synchronizes the release manifest, root package version, and root changelog. Release Please never creates the tag or GitHub Release.

Publication reuses the successful hosted `Validate` output for the release revision as three direct, byte-preserved assets: `openai.zip`, `portable.zip`, and `release-subject.json`. Only the ZIPs are attested. A read-only readiness job validates the candidate and remote plan; the only write-capable job targets the protected `release` environment, verifies its required reviewer, single custom `main` deployment-branch policy, protected `main`, and disabled administrator bypass before any API mutation, then reconciles an annotated tag and stable GitHub Release as `latest` without clobbering mismatched or immutable state.

The reconciler explicitly dispatches post-release evidence from protected `main` whenever initial publication or an allowed repair changes release state. Publication, repair, attestation, post-release evidence, and the manual OpenAI portal handoff remain distinct evidence and approval boundaries; local or hosted validation alone grants none of those external outcomes.

## Why

- Feature pull requests can express component impact without guessing the next
  root release version or rewriting the root changelog repeatedly.
- A generated draft release PR presents one reviewable root version,
  changelog, and manifest transition while leaving tags and Releases to the
  existing reconciler.
- Direct single-file artifacts avoid archive-within-archive extraction or
  repackaging and let every later stage prove exact bytes.
- GitHub environment protection creates an enforceable approval boundary for
  both automatic and manually requested publication.
- Explicit evidence dispatch works after initial publication and repair even
  when token recursion or event suppression prevents a `release.published`
  workflow.

## Options

- Chosen: Generated Release-Please PR, read-only readiness, protected
  reconciliation, three direct assets, ZIP-only attestations, and explicit
  evidence dispatch.
- Rejected: Root release metadata in every feature PR, because it couples
  independent feature review to global release numbering and conflicts when
  several changes queue.
- Rejected: Let Release Please tag or create the GitHub Release, because that
  bypasses the repository's exact-subject reconciliation and protected
  publication state machine.
- Rejected: Publish only the ZIPs, because consumers and post-release
  verification then cannot retrieve the exact hosted metadata contract.
- Rejected: Trigger proof from `release.published`, because workflow-created
  events and recovery repairs do not provide one dependable dispatch boundary.

## Consequences

- Good: Feature impact, global release preparation, approval, mutation, and
  evidence are independently reviewable without losing revision identity.
- Good: The release exposes the exact two installable packages and their
  validated metadata document directly.
- Tradeoff: The repository requires a narrowly scoped GitHub App for generated
  pull requests and a correctly protected GitHub environment for publication.
- Tradeoff: Release validation must distinguish feature PRs from the exact
  generated release-PR file set and support historical changelog syntax.
- Risk: Misconfigured environment policy, incorrect Latest observation, or
  repair ambiguity could weaken the gate; preflight and fail-closed remote
  reconciliation block mutation in those states.

## Follow-up

- Keep feature-impact and generated-release-PR validators synchronized with the
  Release-Please manifest contract.
- Keep the `v0.20.1` two-asset exception explicit; require three assets from
  `v0.21.0` onward.
- Revisit through a reciprocal successor if release preparation ownership,
  protected approval, published subject membership, or evidence dispatch
  changes materially.
