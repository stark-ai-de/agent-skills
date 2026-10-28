# ADR-0077: Protect multi-profile release subjects and publication

ID: ADR-0077
Title: Protect multi-profile release subjects and publication
Status: Accepted
Date: 2026-10-28
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: release, github-actions, artifacts, approvals, evidence
Applies when: Preparing, publishing, repairing or verifying a stable multi-profile catalog release.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: ADR-0050
Superseded by: None
Guide verified: 2026-10-28
Gist: Protected publication binds all profile archives and their independent handoffs to one reviewed release revision.

Variants: **Short** · [Long, canonical](0077-protect-multi-profile-release-subjects-and-publication.long.md) · [Guide](0077-protect-multi-profile-release-subjects-and-publication.guide.md)

## Decision

Reviewed feature impact, the Release Please generated catalog release PR, protected publication and post-release proof remain separate and bound to one exact `main` revision. Release Please alone prepares the root manifest, package version and changelog; it does not create a tag or GitHub Release. New multi-profile releases reuse the exact successful hosted Validate output as four direct byte-preserved assets: `openai-skills-only.zip`, `openai-tools.zip`, `portable.zip` and `release-subject.json`. A versioned subject binds both OpenAI identities, versions, transports, archive digests and sizes, the portable archive, source revision and release version. All three ZIPs are attested. Read-only readiness precedes the only write-capable job in the protected `release` environment; that job verifies required reviewers, protected `main`, its sole custom branch policy and disabled administrator bypass before reconciling an annotated tag and stable latest GitHub Release without clobbering mismatched or immutable state. Publication or repair explicitly dispatches fresh post-release evidence. Each existing OpenAI listing has a separate exact-asset and digest-bound manual handoff; publication, repair, attestations, evidence and portal outcomes remain distinct boundaries. Previously published releases retain their original asset names and verification contracts. The ADR-0052 no-attestation JSON-only repair exception is not expanded to releases with three ZIPs.

## Context

Two already published OpenAI products need independent immutable release assets and handoffs without weakening the protected release state machine.

## Consequences

- Good: Each listing receives an independently verifiable asset from the same reviewed source.
- Tradeoff: Release, recovery, attestation, historical compatibility and evidence consumers must support two profile identities.
- Risk: Swapped packages or stale evidence could target the wrong listing; membership, identity, bytes and provenance must fail closed.
