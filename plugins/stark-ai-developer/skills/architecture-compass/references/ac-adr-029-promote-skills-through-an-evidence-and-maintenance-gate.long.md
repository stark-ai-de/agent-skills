# AC-ADR-029: Promote Skills Through an Evidence and Maintenance Gate

ID: AC-ADR-029
Title: Promote Skills Through an Evidence and Maintenance Gate
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: quality-delivery
Tags: promotion, evals, activation, maintenance
Applies when: Evaluating whether a candidate skill is ready for the promoted public catalog.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Promote only skills that prove quality, activation fit, utility, safety, and sustainable ownership.

Variants: [Short](ac-adr-029-promote-skills-through-an-evidence-and-maintenance-gate.short.md) · **Long, canonical** · [Guide](ac-adr-029-promote-skills-through-an-evidence-and-maintenance-gate.guide.md)

## Context

A skill can be syntactically valid and pass a narrow test while activating at the wrong time, failing to improve task outcomes, relying on unavailable tools, or creating disproportionate maintenance work. Public promotion also commits the repository to documentation, compatibility, security review, eval upkeep, and release support. Popularity alone does not establish safety or quality, while low-volume but high-impact workflows can still merit promotion.

## Decision

A candidate skill is promoted only after a reviewable gate demonstrates all of the following at a level proportionate to its risk and claims:

- correct positive activation and restraint on representative negative or competing-skill cases;
- meaningful task-quality, reliability, or safety improvement over the relevant no-skill baseline or current public workflow;
- bounded side effects, permissions, data handling, failure behavior, and public-safe artifacts;
- a broad reusable use case or a narrower use case with material user value;
- clean package discovery and install behavior on every host or environment the skill claims to support;
- maintainable instructions, dependencies, helpers, sources, evals, and compatibility ownership;
- an identified maintainer, release impact, known evidence gaps, and a feasible deprecation or rollback path.

No single score, install count, successful demonstration, or schema validator replaces this combined judgment. Evidence must identify the tested revision, model or host where relevant, scenario set, limitations, and whether results are deterministic, judged, local, CI, published, or live. A candidate that misses the gate remains in incubation with a concrete next proof or maintenance blocker.

## Invariants

- Promotion evidence includes both activation and outcome quality.
- Safety-critical claims have direct deterministic or scenario evidence where feasible.
- Maintainer judgment is explicit instead of hidden behind an aggregate number.
- Promotion does not overclaim hosts, environments, or evidence stages that were not exercised.
- Every public skill has an owner and a sustainable update path.

## Failure handling

Defer promotion when required evidence is missing, stale, tied to another revision, non-reproducible, or outweighed by maintenance and safety risk. Record the blocker and next proof instead of lowering the public gate. If a promoted skill later falls below the gate, fix, deprecate, or demote it through the repository's release process.

## Consequences

Promotion needs qualitative review as well as automation and can delay useful niche skills. In return, the public catalog communicates demonstrated value, controlled behavior, and an owned maintenance commitment rather than mere package validity.
