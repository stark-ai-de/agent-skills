# ADR-0056: Allow reviewed public comparisons while protecting private provenance

ID: ADR-0056
Title: Allow reviewed public comparisons while protecting private provenance
Status: Proposed
Date: 2026-09-22
Owner: stark-ai-de
Scope: repository
Category: security-data
Tags: public-artifacts, comparisons, provenance, evidence
Applies when: Publishing skill comparisons and promotional benchmark claims.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-09-22
Gist: Permit sourced public comparisons while keeping private provenance local and preserving material measurement limits.

Variants: **Short** · [Long, canonical](0056-allow-reviewed-public-comparisons-while-protecting-private-provenance.long.md) · [Guide](0056-allow-reviewed-public-comparisons-while-protecting-private-provenance.guide.md)

## Decision

Public artifacts retain official sources, schemas, setup and probe instructions, dependency and license information required to use or verify a public function. Maintainer-approved public comparisons may also name publicly available products and link their public source revisions. Such comparisons must identify their reviewed scope and evidence date, distinguish source-inspected features from measured behavior, and keep material sample, environment, version and measurement boundaries adjacent to numerical claims. Selective emphasis is allowed; invented measurements, unsupported overall rankings and omission of conditions that would make a claim misleading are not.

Non-public maintainer repositories and paths, private mappings and identifying raw artifacts remain local. Publish only sanitized, non-identifying benchmark summaries or deliberately public fixtures with enough method information to interpret the claim. Unknown and unmeasured cells must not be represented as absent capabilities or zero latency. Every tracked public artifact remains subject to the release privacy and claim review.

This record proposes replacing ADR-0030 upon explicit maintainer acceptance. Until that acceptance and reciprocal supersession metadata are recorded, ADR-0030 remains binding and named comparative content stays local.

## Context

Permit deliberate public-source comparisons without exposing private provenance. This proposal does not yet replace ADR-0030.

## Consequences

- Highlight demonstrated advantages with nearby scope and measurement limits.
- Keep unknown results explicit and raw private evidence local.
- Accept the reciprocal successor before publishing named comparisons.
