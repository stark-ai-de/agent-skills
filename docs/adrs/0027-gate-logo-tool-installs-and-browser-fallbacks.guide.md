# ADR-0027: Reuse logo export mechanics and gate tool installs

ID: ADR-0027
Title: Reuse logo export mechanics and gate tool installs
Status: Accepted
Date: 2026-07-13
Owner: stark-ai-de
Scope: repository
Category: stack-tooling
Tags: logo, export, tool-install, approval
Applies when: Changing logo export tooling, recipes, or browser fallback behavior.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Keep export mechanics portable, recipes repository-owned, and every missing-tool installation approval-gated.

Variants: [Short](0027-gate-logo-tool-installs-and-browser-fallbacks.short.md) · [Long, canonical](0027-gate-logo-tool-installs-and-browser-fallbacks.long.md) · **Guide**

This guide is non-normative. [Long](0027-gate-logo-tool-installs-and-browser-fallbacks.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

- Inventory target runtimes, deployment environments, support matrices, lifecycle ownership, and provider constraints.
- Select or retain a platform only from current target evidence; keep independent concerns as independent decisions.
- Document fallback and cleanup behavior at the boundary that owns execution.

## Verification

- Exercise the relevant startup, shutdown, build, or deployment path in the environment actually being claimed.
- Separate configuration proof from deployed behavior and record unavailable platform checks honestly.
- Cite the exact files, commands, and evidence boundaries used for the conclusion.

## Historical follow-up context

The original record named these follow-ups. Revalidate them against current repository state before treating them as active work:

- Keep provider approval and local-tool installation approval distinct in reports.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
