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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Promote only skills that prove quality, activation fit, utility, safety, and sustainable ownership.

Variants: **Short** · [Long, canonical](ac-adr-029-promote-skills-through-an-evidence-and-maintenance-gate.long.md) · [Guide](ac-adr-029-promote-skills-through-an-evidence-and-maintenance-gate.guide.md)

## Decision summary

A candidate enters the promoted public catalog only after reviewable evidence demonstrates correct activation, meaningful task-quality improvement, safe bounded behavior, a broad or high-value use case, portable install behavior for claimed hosts, and acceptable ongoing maintenance cost. Passing syntax checks or one eval is necessary evidence where applicable but never sufficient by itself.

## Context

Promotion creates support, documentation, validation, security, and release obligations beyond proving that a package can run once.

## Invariants

- Evidence covers trigger and non-trigger behavior.
- Promotion names an owner and maintenance boundary.
- Unsupported host or quality claims remain explicit.

## Consequences

The catalog grows more slowly but communicates a stronger and more maintainable quality signal.
