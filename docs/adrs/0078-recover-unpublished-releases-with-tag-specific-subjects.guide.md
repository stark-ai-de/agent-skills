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
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0062
Superseded by: None
Guide verified: 2026-10-28
Gist: Recovery proves byte identity for the exact archive set and subject schema selected by the target release tag.

Variants: [Short](0078-recover-unpublished-releases-with-tag-specific-subjects.short.md) · [Long, canonical](0078-recover-unpublished-releases-with-tag-specific-subjects.long.md) · **Guide**

This guide is non-normative. [Long](0078-recover-unpublished-releases-with-tag-specific-subjects.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

1. Keep the Release Please origin, exact target tag, protected replacement, hosted validation runs, and approval bound to the same recovery candidate.
2. For tags through v0.31.0, require the complete `openai.zip` and `portable.zip` pair. From v0.32.0, require both OpenAI profile ZIPs and `portable.zip`.
3. Validate the matching release subject and all attested archive identities, versions, transports, digests, and sizes. Compare exact ZIP bytes between origin and replacement runs.
4. Stop on any missing, swapped, substituted, or mismatched artifact. Do not synthesize a missing archive or widen the fixed allowlist.
5. Keep the protected publication approval and replacement-bound tag/attestations. ADR-0052 published-release repair boundaries remain unchanged.

Historical compatibility does not imply a currently eligible recovery. As checked on 2026-10-28, v0.31.0 is already published, while [the v0.25.2 recovery record](../release-recovery-0.25.2.md) explicitly abandons that version in favor of v0.25.3. The absent-tag/Release and immutable-root-metadata gates therefore block recovery of those historical versions. Do not synthesize or rename a modern archive to create a legacy candidate.

## Verification

- Test complete historical and current subject sets plus missing, swapped, and changed archive failures.
- Run ADR, recovery, and workflow validation. Hosted recovery remains separate from local fixture proof.

## Current references

- [ADR-0053](0053-recover-unpublished-releases-through-protected-replacement-candidates.long.md) defines the recovery foundation.
- [ADR-0062](0062-admit-release-reconciler-repairs-to-unpublished-recovery.long.md) defines the guarded reconciler extension.
- [ADR-0052](0052-allow-scoped-json-only-published-release-repair.long.md) defines published-release repair limits.

## Revisit

Create a reciprocal successor if the release-tag subject boundary or recovery proof requirements change.
