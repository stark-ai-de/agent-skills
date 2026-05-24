# ADR-0004: Start with empty promoted-only catalog

Status: Accepted  
Date: 2026-05-20  
Owner: stark-ai-de  
Gist: Public installs should expose only promoted skills.

## Decision

We will start with no promoted skills under `skills/`; candidates live in `incubator/skills/` until promotion proof exists.

## Why

- Anything in `skills/` is installable into agent runtimes.
- Initial skills still need eval proof and maintenance review.
- Runtime-specific metadata adds drift before demand is proven.

## Options

- Chosen: Empty promoted-only catalog with portable install validation.
- Rejected: Ship a starter set immediately, because quality proof is not ready.
- Rejected: Claude plugin metadata now, because it would add a second catalog surface.

## Consequences

- Good: The public catalog does not overclaim quality.
- Tradeoff: Users cannot install this repo's skills until the first promotion.
- Risk: The repository looks less complete during incubation.

## Follow-up

- Promote one skill at a time after adding `skill-evals/` proof.
