# ADR-0059: Separate public listing metadata from private submission records

ID: ADR-0059
Title: Separate public listing metadata from private submission records
Status: Accepted
Date: 2026-09-28
Owner: stark-ai-de
Scope: repository
Category: security-data
Tags: public-artifacts, openai, privacy, release, issues
Applies when: Publishing the OpenAI listing, building its release archives, or creating a release handoff.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-09-28
Gist: Keep public OpenAI listing and release handoff data public while private account and portal submission records stay in the maintainer workflow.

Variants: [Short](0059-separate-public-listing-metadata-from-private-submission-records.short.md) · [Long, canonical](0059-separate-public-listing-metadata-from-private-submission-records.long.md) · **Guide**

This guide is non-normative. [Long](0059-separate-public-listing-metadata-from-private-submission-records.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

1. Treat `docs/listing/openai/stark-ai-developer.json` and the public release evidence as the source for issue content. The publisher object contains the public legal name only.
2. After a stable published release, run `pnpm run release:openai-issue -- plan --repository <owner/repo> --tag <vX.Y.Z> --release-sha <40-hex-sha>` to inspect the public handoff. Use `apply` only for a published release when no release or retry is in progress.
3. The issue marker `<!-- openai-plugin-release:<plugin>@<version> -->` makes retries idempotent. Search open and closed issues across all pages; never edit an existing matching issue.
4. Complete the five public checklist steps manually: post-release evidence, archive hash, portal upload and asset review, portal publication, and public rendering/installation. Keep account identifiers, authenticated URLs, submission IDs, and reviewer messages in the private portal workflow.

## Verification

- Validate the public listing, package, projections, release evidence, ADRs, workflow lint, and the complete repository aggregate before release.
- Use synthetic private publisher fields in transport fixtures and assert that validation, issue bodies, ZIP contents, and new evidence reject or omit them.
- A dry run, failed release, invalid subject, missing archive digest, or decreasing plugin version must produce no issue write.

## Current references

- [ADR-0043](0043-package-portable-agent-plugins-and-separate-client-adapters.long.md) owns portable source and generated client projections.
- [ADR-0044](0044-centralize-listing-identity-and-catalog-derivations.long.md) owns shared listing identity.
- [ADR-0050](0050-generate-release-prs-and-protect-publication.long.md) owns protected release publication and post-release evidence.
- [OpenAI plugin submission guidance](https://developers.openai.com/plugins/deploy/submission) describes the manual portal boundary; it does not provide a public publication API.

## Revisit

Create a successor ADR if portal submission becomes a supported public API, if private portal records become a documented public contract, or if release publication no longer needs a manual maintainer handoff.
