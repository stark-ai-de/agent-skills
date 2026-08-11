# ADR-0039: Separate Internal Skill Implementation Policy from Exposed Contracts

ID: ADR-0039
Title: Separate Internal Skill Implementation Policy from Exposed Contracts
Status: Accepted
Date: 2026-08-05
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: adr, architecture-compass, internal-policy, public-contracts
Applies when: Adding, changing, routing, or promoting skill implementation rules and portable behavior contracts.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: ADR-0033
Superseded by: None
Guide verified: 2026-08-05
Gist: Implementation-only skill policy stays internal while generalized portable behavior is promoted through explicit exposed ADR contracts.

Variants: **Short** · [Long, canonical](0039-separate-internal-skill-implementation-policy-from-exposed-contracts.long.md) · [Guide](0039-separate-internal-skill-implementation-policy-from-exposed-contracts.guide.md)

## Decision

We will separate skill-internal implementation policy from exposed portable contracts. The exposed Architecture Compass library remains a flat, catalog-routed Short, Long, and Guide triplet library with distinct `skill-runtime` and `target-repository` scopes, canonical Long decisions, and no duplicate compiled policy layer. Durable implementation-only rules may live in a separately validated, skill-owned internal Short, Long, and Guide triplet namespace; compact skill instructions may only dispatch to those records or state non-durable mechanics. Internal records are not exposed catalog entries, portable authority, or target-repository adoption inputs and cannot override accepted exposed decisions. Generalized, reusable behavior must be promoted into the exposed ADR contract through explicit review and synchronized triplet, catalog, lineage, and validation updates before it is treated as a portable guardrail.

## Context

- A skill needs implementation-only routing, adapter, packaging, and evaluation mechanics that should not burden target repositories or public discovery.
- Reusable behavior needs a durable, discoverable contract instead of remaining implicit in one skill's implementation notes.

## Consequences

- Good: Skills can stay focused while portable policy remains explicit and reviewable.
- Tradeoff: Maintainers must classify and validate a second policy namespace.
- Risk: Internal and exposed records can drift unless routing and validation enforce the boundary.
