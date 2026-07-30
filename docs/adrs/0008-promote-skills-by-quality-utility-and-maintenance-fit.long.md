# ADR-0008: Promote skills by quality, utility, and maintenance fit

ID: ADR-0008
Title: Promote skills by quality, utility, and maintenance fit
Status: Accepted
Date: 2026-05-21
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: promotion, quality, maintenance
Applies when: Evaluating a skill for promotion into the public catalog.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Promotion requires value and maintainability, not just passing evals.

Variants: [Short](0008-promote-skills-by-quality-utility-and-maintenance-fit.short.md) · **Long, canonical** · [Guide](0008-promote-skills-by-quality-utility-and-maintenance-fit.guide.md)

## Decision

We will promote a skill only when it proves agent-quality improvement, correct activation, broad or high-value use, and acceptable maintenance cost.

## Why

- A niche skill can work well but still not belong in the public catalog.
- Public promotion creates support, docs, validation, and release obligations.
- The catalog should signal practical value, not just technical validity.

## Options

- Chosen: quality, activation fit, utility, and maintenance ROI.
- Rejected: eval pass rate alone, because correctness is not enough.
- Rejected: usage alone, because popular workflows can still be unsafe or weak.

## Consequences

- Good: Promoted skills are easier to trust and maintain.
- Tradeoff: Promotion requires judgment, not only automation.
- Risk: Valuable niche skills may wait longer in incubation.

## Follow-up

- Add a promotion checklist when the incubator workflow is implemented.
