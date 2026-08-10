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
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-05
Gist: Implementation-only skill policy stays private while generalized portable behavior is promoted through explicit exposed ADR contracts.

Variants: [Short](0039-separate-internal-skill-implementation-policy-from-exposed-contracts.short.md) · **Long, canonical** · [Guide](0039-separate-internal-skill-implementation-policy-from-exposed-contracts.guide.md)

## Decision

We will separate skill-internal implementation policy from exposed portable contracts: implementation-only Architecture Compass rules may live in a skill-owned internal namespace or compact skill instructions, while generalized, reusable behavior must be promoted into the repository's exposed ADR contract before it is treated as a portable guardrail. Internal records are not public catalog entries or target-repository adoption inputs; accepted exposed decisions remain authoritative, and promotion requires explicit review plus synchronized Short, Long, Guide, catalog, and validation updates.

## Why

- Architecture Compass needs implementation mechanics such as routing, host adapters, persistence-surface resolution, and evaluation support that are useful to the skill but are not portable target-repository policy.
- Portable behavior must be discoverable, reviewable, and independently adoptable; hiding it in a skill implementation makes the contract implicit and difficult to validate.
- A clear boundary prevents internal implementation details from leaking into public catalog payloads or being mistaken for target-repository guardrails.

## Options

- Chosen: Use a two-tier model. Keep implementation-only rules in a skill-owned internal namespace or compact skill instructions, and promote generalized behavior into an exposed ADR triplet through explicit review.
- Rejected: Put every rule in the exposed catalog, because implementation mechanics would inflate public payloads and create accidental adoption obligations.
- Rejected: Keep every rule inside skill instructions, because reusable behavior would lack a stable portable contract and independent validation surface.
- Rejected: Maintain separate internal and exposed copies without a promotion path, because drift and authority conflicts would be unavoidable.

## Consequences

- Good: Skills remain compact and can evolve host adapters or packaging without changing a target repository's policy.
- Good: Exposed contracts provide stable authority, discoverability, lineage, and validation for behavior intended to be reused.
- Tradeoff: Maintainers must classify new rules and keep promoted triplets, catalog entries, and validators synchronized.
- Risk: A rule can be misclassified or drift between internal and exposed surfaces; validation and explicit review are required safeguards.

## Follow-up

- Define the Architecture Compass internal namespace, routing rules, and catalog-exclusion checks before relying on internal runtime ADRs.
- When an internal rule becomes generalized or reusable, promote it through a new or successor exposed ADR rather than silently copying or overriding the internal record.
