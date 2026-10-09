# ADR-0063: Coordinate product planning through intent-bound skill contracts

ID: ADR-0063
Title: Coordinate product planning through intent-bound skill contracts
Status: Accepted
Date: 2026-10-09
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: product-planning, skill-routing, authority
Applies when: Integrating the three-skill product-planning contract and its release gates.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-10-09
Gist: Keep coordinated product planning bounded by canonical outcomes and actual user authority.

Variants: [Short](0063-coordinate-product-planning-through-intent-bound-skill-contracts.short.md) · **Long, canonical** · [Guide](0063-coordinate-product-planning-through-intent-bound-skill-contracts.guide.md)

## Why

Coordinated planning needs explicit outcome ownership without weakening existing runtime or release policy.

## Decision

Expose product planning as a contract-driven composition of Architecture Zoom, Architecture Compass and Codex Spec Interviewer. Keep one main coordinator, canonical artifact references, state-dependent entry, complete product increments, targeted feedback, standalone skill use and separate action authority. Qualify actual outcomes and host behavior before public promotion; do not add a fourth mandatory workflow or a blind three-stage chain.

## Options

- Chosen: explicitly scoped, outcome-driven composition with separate side-effect grants.
- Rejected: unconditional skill chains, a fourth mandatory coordinator, or installation inferred from an ADR reference.

## Consequences

The reviewed integration preserves bounded work and independent use. Real activation, outcome comparisons, host discovery and maintainer promotion judgment remain required; structural tests do not establish them.
