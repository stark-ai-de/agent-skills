# ADR-0050: Generate release PRs and protect publication

ID: ADR-0050
Title: Generate release PRs and protect publication
Status: Accepted
Date: 2026-08-26
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: release, pull-request, github-actions, artifacts, approvals, evidence
Applies when: Preparing, approving, publishing, repairing, or verifying a stable catalog release.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0015, ADR-0046
Superseded by: None
Guide verified: 2026-08-26
Gist: Generated release PRs prepare one coherent version while protected publication preserves exact direct assets and dispatches post-release evidence explicitly.

Variants: [Short](0050-generate-release-prs-and-protect-publication.short.md) · [Long, canonical](0050-generate-release-prs-and-protect-publication.long.md) · **Guide**

This guide is non-normative. [Long](0050-generate-release-prs-and-protect-publication.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

1. In a feature PR, bump every affected skill/plugin version and omit a new
   root release heading, root version, or manifest bump.
2. Run Release Please from `main` with the repository GitHub App token. Keep
   `skip-github-release: true`; the generated draft PR changes only the
   manifest, root package, and root changelog. Before creating that token,
   verify that the workflow definition, event, checkout, and protected remote
   branch tip all identify the same `main` revision.
3. On that PR's merge, let read-only readiness bind current `main`, a
   successful hosted `Validate` run for the same SHA, three direct artifacts,
   and one reconciliation plan.
4. For real publication, schedule only the write job behind
   `environment: release`. Verify the environment by API before any tag,
   release, asset, attestation, publish, or dispatch mutation.
5. Reconcile the annotated tag through the authenticated GitHub Git API, then
   reconcile draft metadata, three assets, ZIP attestations, publication, and
   Latest observation without persisting checkout credentials or replacing any
   mismatched asset.
6. Dispatch `post-release-evidence.yml` on protected `main` exactly when
   `post_release_dispatch_required` is true.
7. Treat OpenAI portal upload and visual verification as a separate manual
   handoff after post-release evidence succeeds.

## Verification

- Validate Release-Please schema/baseline/title/token permissions and feature
  versus release-PR changed-file fixtures.
- Validate both historical and generated changelog heading formats.
- Test environment preflight ordering and prove no mutation occurs before
  approval or on a weaker environment.
- Test exact direct-artifact bytes, three-asset/legacy boundaries, immutable and
  repair behavior, Latest mismatch, no post-publication attestation, and
  explicit evidence dispatch.
- Run owning workflow, release-subject, reconciler, archive, projection, OpenAI,
  traceability, and release-intent checks before the mandatory local aggregate.
- Report local, hosted CI, environment approval, GitHub publication,
  post-release proof, and OpenAI portal evidence as separate stages.

## Current references

- [Release Please manifest configuration](https://github.com/googleapis/release-please/blob/main/schemas/config.json).
- [GitHub deployment environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).
- [GitHub deployment branch policies](https://docs.github.com/en/rest/deployments/branch-policies?apiVersion=2026-03-10).
- [GitHub direct artifact upload](https://github.com/actions/upload-artifact/blob/main/action.yml)
  and [download](https://github.com/actions/download-artifact/blob/main/action.yml).
- [GitHub Releases REST API](https://docs.github.com/en/rest/releases/releases?apiVersion=latest).
- [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins)
  and [submission](https://developers.openai.com/plugins/deploy/submission).

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
