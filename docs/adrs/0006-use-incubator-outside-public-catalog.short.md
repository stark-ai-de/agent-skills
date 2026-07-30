# ADR-0006: Use incubator as default candidate home

ID: ADR-0006
Title: Use incubator as default candidate home
Status: Accepted
Date: 2026-05-21
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: incubator, promotion, catalog
Applies when: Creating or promoting a skill candidate.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Keep all unproven skills outside the installable catalog.

Variants: **Short** · [Long, canonical](0006-use-incubator-outside-public-catalog.long.md) · [Guide](0006-use-incubator-outside-public-catalog.guide.md)

## Decision

We will create and keep skills under `incubator/skills/` by default; promotion moves a skill into `skills/` only after proof is ready.

## Context

- `skills/` is the public install surface.
- Starting in incubation avoids implying a complete base set.

## Consequences

- Good: The release boundary stays obvious and conservative.
- Tradeoff: Local users must opt into incubator discovery.
- Risk: Incubator candidates may drift without explicit review.
