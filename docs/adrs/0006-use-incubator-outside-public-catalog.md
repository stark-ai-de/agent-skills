# ADR-0006: Use incubator as default candidate home

Status: Accepted  
Date: 2026-05-21  
Owner: stark-ai-de  
Gist: Keep all unproven skills outside the installable catalog.

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
