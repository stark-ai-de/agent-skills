# ADR-0025: Keep Animated README Logo portable with provider routing

ID: ADR-0025
Title: Keep Animated README Logo portable with provider routing
Status: Accepted
Date: 2026-07-12
Owner: stark-ai-de
Scope: repository
Category: runtime-platform
Tags: animated-logo, portability, provider-routing
Applies when: Changing logo generation routing or host portability.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Keep one portable logo workflow and gate optional Recraft generation behind live discovery and approval.

Variants: **Short** · [Long, canonical](0025-keep-animated-readme-logo-portable-with-provider-routing.long.md) · [Guide](0025-keep-animated-readme-logo-portable-with-provider-routing.guide.md)

## Decision

We will keep `animated-readme-logo` portable, route eligible new or redesigned marks through an optional live `recraft_v4_1` preflight, and retain validated local SVG authoring as the universal path.

## Context

- Review, validation, motion, and README delivery contracts do not differ by agent host.
- Provider availability and cost are live facts, not documentation constants.

## Consequences

- Good: every environment can produce the same validated SVG and motion specification.
- Tradeoff: eligible creation adds a provider preflight.
- Risk: capability drift can block provider use; local authoring remains available.
