# ADR-0078: Recover unpublished releases with tag-specific subjects

ID: ADR-0078
Title: Recover unpublished releases with tag-specific subjects
Status: Accepted
Date: 2026-10-28
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: release, recovery, github-actions, artifacts, attestations
Applies when: Recovering an unpublished generated release through a protected replacement candidate.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: ADR-0062
Superseded by: None
Guide verified: 2026-10-28
Gist: Recovery proves byte identity for the exact archive set and subject schema selected by the target release tag.

Variants: **Short** · [Long, canonical](0078-recover-unpublished-releases-with-tag-specific-subjects.long.md) · [Guide](0078-recover-unpublished-releases-with-tag-specific-subjects.guide.md)

## Decision

Unpublished generated-release recovery preserves the authenticated Release Please origin, exact protected-main ancestry, bounded complete comparison, the fixed recovery allowlist established by ADR-0062 without additions, unchanged root release metadata and public payload, successful exact-origin and exact-replacement hosted validation, absent target tag and GitHub Release, protected environment approval, and replacement-bound tag and attestations established by ADR-0053 and ADR-0062. Recovery selects the required release subjects from the immutable target tag. Releases through v0.31.0 require the historical `openai.zip` and `portable.zip` pair and their matching schema-1 release subject where that subject existed. Releases from v0.32.0 require `openai-skills-only.zip`, `openai-tools.zip`, and `portable.zip` with the matching schema-2 subject. Every required archive must be present, have the subject-declared identity, digest and byte length, and be byte-identical between the origin and replacement hosted Validate runs. Each subject must identify the same release and profile versions, transports, and archive membership while naming its own source revision. Missing, substituted, swapped, or mismatched subjects fail closed. The guarded controller requirement remains the publication workflow or the named GitHub Release reconciler. ADR-0052's published-release ZIP attestation gate and no-attestation JSON-only exception are unchanged and are not extended to three-ZIP releases.

## Context

The immutable release tag determines which archive names and subject schema are valid for recovery.

## Consequences

- Good: Historical and current releases retain their original assets and provenance requirements.
- Tradeoff: Recovery validates different complete subject sets by target tag.
- Risk: Incomplete or incompatible hosted evidence blocks recovery.
