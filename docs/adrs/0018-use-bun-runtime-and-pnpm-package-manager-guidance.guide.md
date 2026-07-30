# ADR-0018: Use Bun runtime and pnpm package manager guidance

ID: ADR-0018
Title: Use Bun runtime and pnpm package manager guidance
Status: Superseded
Date: 2026-06-11
Owner: stark-ai-de
Scope: repository
Category: stack-tooling
Tags: bun, pnpm, node, superseded
Applies when: Reviewing the former combined Architecture Compass runtime and package-manager default.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0034
Guide verified: 2026-07-28
Gist: Architecture Compass starter guidance should separate runtime choice from package-management ownership.

Variants: [Short](0018-use-bun-runtime-and-pnpm-package-manager-guidance.short.md) · [Long, canonical](0018-use-bun-runtime-and-pnpm-package-manager-guidance.long.md) · **Guide**

This guide is non-normative. [Long](0018-use-bun-runtime-and-pnpm-package-manager-guidance.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

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

- Align Architecture Compass stack and runtime references with this ADR.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
