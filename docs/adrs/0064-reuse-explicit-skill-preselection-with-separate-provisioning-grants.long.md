# ADR-0064: Reuse explicit skill preselection with separate provisioning grants

ID: ADR-0064
Title: Reuse explicit skill preselection with separate provisioning grants
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

Variants: [Short](0064-reuse-explicit-skill-preselection-with-separate-provisioning-grants.short.md) · **Long, canonical** · [Guide](0064-reuse-explicit-skill-preselection-with-separate-provisioning-grants.guide.md)

## Why

Coordinated planning needs explicit outcome ownership without weakening existing runtime or release policy.

## Decision

Recognize a genuine scoped user preselection when resolving an already selected skill, while preserving separate approval and current host permission for installation, updates, writes and later external effects. Resolve source/revision and namesakes, never infer permission from a model-authored field, and fail only the dependent handoff when required capability or authority is missing.

## Options

- Chosen: explicitly scoped, outcome-driven composition with separate side-effect grants.
- Rejected: unconditional skill chains, a fourth mandatory coordinator, or installation inferred from an ADR reference.

## Consequences

The reviewed integration preserves bounded work and independent use. Real activation, outcome comparisons, host discovery and maintainer promotion judgment remain required; structural tests do not establish them.
