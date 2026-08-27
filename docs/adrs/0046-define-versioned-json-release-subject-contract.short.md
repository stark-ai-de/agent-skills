# ADR-0046: Define a versioned JSON release subject contract

ID: ADR-0046
Title: Define a versioned JSON release subject contract
Status: Superseded
Date: 2026-08-22
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: release, artifacts, json-schema, reproducibility, provenance
Applies when: Building, comparing, publishing, or historically normalizing release subjects.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0050
Guide verified: 2026-08-22
Gist: A versioned JSON subject must be the single release metadata contract while ZIP subjects remain the published bytes.

Variants: **Short** · [Long, canonical](0046-define-versioned-json-release-subject-contract.long.md) · [Guide](0046-define-versioned-json-release-subject-contract.guide.md)

## Decision

The repository will use a versioned `release-subject.json` document, validated by `skill-evals/stark-ai-developer/evidence/release-subject.schema.json`, as the single metadata contract for release subjects. It must carry status, source revision, release and plugin versions, archive profile, each published subject's SHA-256 digest and byte size, and differences. The published `openai.zip` and `portable.zip` remain the release subjects; `SHA256SUMS` and `IDENTITY` are not parallel release contracts. All current producers and consumers—npm scripts, GitHub Actions, Publish Release, and historical compatibility—must migrate atomically; schema, version, source-revision, or digest mismatches block publication. Historical tags may produce legacy evidence internally, but the current action context must normalize it into this schema, with `v0.19.1` explicitly `not_applicable`.

## Context

Flat digest and identity files can be produced by one stage and interpreted by another without a shared schema, status vocabulary, source binding, or difference model. Release publication needs one machine-readable subject contract that can be validated and reconciled across local, hosted, historical, and publication stages.

## Consequences

- Good: Subject status, provenance, archive identity, sizes, and differences have one versioned validation boundary.
- Tradeoff: Every producer and consumer must cut over together, and historical evidence needs a normalization seam.
- Risk: A mixed old/new contract could let stale or mismatched bytes reach publication; the atomic migration and fail-closed checks prevent that.
