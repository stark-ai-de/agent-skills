# ADR-0049: Allow scoped JSON-only published release repair

ID: ADR-0049
Title: Allow scoped JSON-only published release repair
Status: Accepted
Date: 2026-08-26
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: release, recovery, artifacts, attestations, evidence
Applies when: A mutable published catalog release is missing exact validated release metadata or an installable ZIP.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-26
Gist: Repair exact release metadata without inventing ZIP provenance while keeping ZIP repair attestation-gated.

Variants: [Short](0049-allow-scoped-json-only-published-release-repair.short.md) · [Long, canonical](0049-allow-scoped-json-only-published-release-repair.long.md) · **Guide**

This guide is non-normative. [Long](0049-allow-scoped-json-only-published-release-repair.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

1. Require exact metadata, release identity, Latest identity, mutable state,
   exact existing bytes, and no unexpected assets.
2. Permit missing JSON without ZIP attestations only after full hosted-subject
   validation.
3. After repair, require each ZIP creation timestamp to be strictly earlier than
   publication and the JSON creation timestamp to be strictly later.
4. Permit any missing ZIP only with valid existing Publish Release
   attestations. Block attestation observation errors.
5. Create no post-publication attestation. Dispatch fresh post-release evidence
   and keep OpenAI handoff behind its successful exact-tag proof.

## Verification

- Fixture missing-attestation JSON-only repair and successful retry dispatch.
- Fixture a later ZIP, equal timestamp, invalid timestamp, immutable release,
  unexpected asset, and conflicting byte state as blockers.
- Fixture missing-ZIP repair with and without valid existing attestations.
- Confirm the JSON-only path creates no attestation and tolerates only an
  observed missing status; retain mandatory successful verification for initial
  publication and ZIP repair.

## Current references

- [GitHub release assets](https://docs.github.com/en/rest/releases/assets).
- [GitHub artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations).

## Revisit

Create a reciprocal successor if repair classification, chronology, attestation
prerequisites, or post-release proof changes. Update all three variants and both
sides of the supersession metadata together.
