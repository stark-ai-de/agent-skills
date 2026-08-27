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
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0050
Guide verified: 2026-08-22
Gist: A versioned JSON subject must be the single release metadata contract while ZIP subjects remain the published bytes.

Variants: [Short](0046-define-versioned-json-release-subject-contract.short.md) · **Long, canonical** · [Guide](0046-define-versioned-json-release-subject-contract.guide.md)

## Decision

The repository will use a versioned `release-subject.json` document, validated by `skill-evals/stark-ai-developer/evidence/release-subject.schema.json`, as the single metadata contract for release subjects. It must carry status, source revision, release and plugin versions, archive profile, each published subject's SHA-256 digest and byte size, and differences. The published `openai.zip` and `portable.zip` remain the release subjects; `SHA256SUMS` and `IDENTITY` are not parallel release contracts. All current producers and consumers—npm scripts, GitHub Actions, Publish Release, and historical compatibility—must migrate atomically; schema, version, source-revision, or digest mismatches block publication. Historical tags may produce legacy evidence internally, but the current action context must normalize it into this schema, with `v0.19.1` explicitly `not_applicable`.

## Why

- A versioned schema gives every stage the same status, provenance, archive-profile, digest, size, and difference vocabulary.
- JSON can bind the subject metadata to source and plugin/release versions without asking consumers to infer relationships from filenames.
- One producer/consumer contract makes publication fail closed on schema, version, source, or digest mismatch.
- A current action seam can translate legacy historical evidence without teaching old tags the new contract.

## Options

- Chosen: Make `release-subject.json` the versioned metadata contract and keep `openai.zip` and `portable.zip` as the published byte subjects.
- Rejected: Keep `SHA256SUMS` and `IDENTITY` as parallel sources, because consumers could disagree about status, source, or archive meaning.
- Rejected: Put all release identity only in ZIP filenames, because filenames do not carry validated status, differences, or source provenance.
- Rejected: Require historical tags to emit the new schema themselves, because that would add current implementation requirements to old releases.

## Consequences

- Good: Local reproducibility, hosted Validate, Publish Release, and historical normalization can reconcile one subject schema.
- Good: Schema and digest errors become explicit publication blockers rather than ambiguous missing-file behavior.
- Tradeoff: The cutover must migrate every producer and consumer in one reviewed phase.
- Tradeoff: Legacy evidence requires a compatibility adapter at the current action seam.
- Risk: A schema version or source-binding mistake could reject valid subjects or admit stale ones; schema tests, two-build checks, and exact source identity mitigate this.

## Follow-up

- Keep this ADR accepted while implementing and verifying the subject cutover.
- Add the versioned schema and schema-backed producer/consumer tests in the same phase as the artifact migration.
- Prove two isolated builds yield identical ZIP subjects and a consistent JSON subject.
- Create a reciprocal successor if the subject schema, published subject set, or legacy normalization contract changes materially.
