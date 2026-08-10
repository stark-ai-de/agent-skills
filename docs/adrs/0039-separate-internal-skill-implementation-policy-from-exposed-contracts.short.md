# ADR-0039: Separate Internal Skill Implementation Policy from Exposed Contracts

ID: ADR-0039
Title: Separate Internal Skill Implementation Policy from Exposed Contracts
Status: Proposed
Date: 2026-08-05
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: adr, architecture-compass, internal-policy, public-contracts
Applies when: Adding, changing, routing, or promoting skill implementation rules and portable behavior contracts.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-05
Gist: Implementation-only skill policy stays private while generalized portable behavior is promoted through explicit exposed ADR contracts.

Variants: **Short** · [Long, canonical](0039-separate-internal-skill-implementation-policy-from-exposed-contracts.long.md) · [Guide](0039-separate-internal-skill-implementation-policy-from-exposed-contracts.guide.md)

## Decision

We will separate skill-internal implementation policy from exposed portable contracts: implementation-only Architecture Compass rules may live in a skill-owned internal namespace or compact skill instructions, while generalized, reusable behavior must be promoted into the repository's exposed ADR contract before it is treated as a portable guardrail. Internal records are not public catalog entries or target-repository adoption inputs; accepted exposed decisions remain authoritative, and promotion requires explicit review plus synchronized Short, Long, Guide, catalog, and validation updates.

## Context

- A skill needs private routing, adapter, packaging, and evaluation mechanics that should not burden target repositories or public discovery.
- Reusable behavior needs a durable, discoverable contract instead of remaining implicit in one skill's implementation notes.

## Consequences

- Good: Skills can stay focused while portable policy remains explicit and reviewable.
- Tradeoff: Promotion requires maintaining a second, synchronized policy surface.
- Risk: Internal and exposed records can drift unless routing and validation enforce the boundary.
