# ADR-0004: Start with empty promoted-only catalog

ID: ADR-0004
Title: Start with empty promoted-only catalog
Status: Accepted
Date: 2026-05-20
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: catalog, promotion, incubation
Applies when: Deciding whether a candidate skill belongs in the public catalog.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Public installs should expose only promoted skills.

Variants: **Short** · [Long, canonical](0004-keep-public-catalog-stable-and-portable.long.md) · [Guide](0004-keep-public-catalog-stable-and-portable.guide.md)

## Decision

We will start with no promoted skills under `skills/`; candidates live in `incubator/skills/` until promotion proof exists.

## Context

- Anything in `skills/` is installable into agent runtimes.
- Initial skills still need eval proof and maintenance review.

## Consequences

- Good: The public catalog does not overclaim quality.
- Tradeoff: Users cannot install this repo's skills until the first promotion.
- Risk: The repository looks less complete during incubation.
