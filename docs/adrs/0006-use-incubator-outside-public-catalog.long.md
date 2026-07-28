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
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Keep all unproven skills outside the installable catalog.

Variants: [Short](0006-use-incubator-outside-public-catalog.short.md) · **Long, canonical** · [Guide](0006-use-incubator-outside-public-catalog.guide.md)

## Decision

We will create and keep skills under `incubator/skills/` by default; promotion moves a skill into `skills/` only after proof is ready.

## Why

- `skills/` is the public install surface.
- Starting in incubation avoids implying a complete base set.
- Moving a folder is clearer than maintaining maturity flags.

## Options

- Chosen: `incubator/skills/` by default, `skills/` only after promotion.
- Rejected: `skills/experimental/`, because root discovery can expose candidates.
- Rejected: frontmatter maturity flags, because tooling and readers can miss them.

## Consequences

- Good: The release boundary stays obvious and conservative.
- Tradeoff: Local users must opt into incubator discovery.
- Risk: Incubator candidates may drift without explicit review.

## Follow-up

- Add promotion checklists and eval proof before moving any skill.
