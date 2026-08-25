# ADR-0046: Define a versioned JSON release subject contract

ID: ADR-0046
Title: Define a versioned JSON release subject contract
Status: Accepted
Date: 2026-08-22
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: release, artifacts, json-schema, reproducibility, provenance
Applies when: Building, comparing, publishing, or historically normalizing release subjects.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-22
Gist: A versioned JSON subject must be the single release metadata contract while ZIP subjects remain the published bytes.

Variants: [Short](0046-define-versioned-json-release-subject-contract.short.md) · [Long, canonical](0046-define-versioned-json-release-subject-contract.long.md) · **Guide**

This guide is non-normative. [Long](0046-define-versioned-json-release-subject-contract.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

1. Define the versioned schema before changing a producer or consumer.
2. Emit one `release-subject.json` beside the two ZIP subjects with status, source revision, release/plugin versions, archive profile, digests, sizes, and differences.
3. Validate schema, schema version, source revision, and digest identity before handing subjects to publication.
4. Migrate npm scripts, GitHub Actions, Publish Release, and historical normalization in one phase.
5. Keep `SHA256SUMS` and `IDENTITY` out of the release-source contract; legacy historical evidence is input to normalization only.
6. Return `not_applicable` for `v0.19.1` where the new subject comparison does not apply.

## Verification

- Build the subjects twice in isolated directories and compare both ZIP bytes and the JSON subject.
- Mutate schema version, source revision, digest, size, and difference fields in fixtures and confirm publication is blocked.
- Confirm no current consumer reads `SHA256SUMS` or `IDENTITY` as release source.
- Validate the schema and the owning archive, release, and historical-receipt checks.

## Current references

- The release reproducibility builder, archive validator, publication workflow, historical subject preparation, and release-subject comparison are the owning boundaries.
- ADR-0043 keeps release identity, bundle membership, and public listing identity as distinct authorities; this subject contract records their bound release evidence without replacing those authorities.

## Revisit

Create a new ADR that supersedes this record if the JSON subject schema, published ZIP set, source-binding model, or legacy normalization contract changes materially.
