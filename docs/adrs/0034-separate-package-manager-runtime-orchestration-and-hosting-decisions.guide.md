# ADR-0034: Separate package manager, runtime, orchestration, and hosting decisions

ID: ADR-0034
Title: Separate package manager, runtime, orchestration, and hosting decisions
Status: Superseded
Date: 2026-07-28
Owner: stark-ai-de
Scope: repository
Category: runtime-platform
Tags: package-manager, runtime, orchestration, hosting
Applies when: Choosing package management, runtime, task orchestration, or hosting guidance.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0018
Superseded by: ADR-0053, ADR-0054
Guide verified: 2026-07-28
Gist: Tool and platform choices require independent target evidence.

Variants: [Short](0034-separate-package-manager-runtime-orchestration-and-hosting-decisions.short.md) · [Long, canonical](0034-separate-package-manager-runtime-orchestration-and-hosting-decisions.long.md) · **Guide**

This guide is non-normative. [Long](0034-separate-package-manager-runtime-orchestration-and-hosting-decisions.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

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

- Supersede [ADR-0018](0018-use-bun-runtime-and-pnpm-package-manager-guidance.short.md) ([Long, canonical](0018-use-bun-runtime-and-pnpm-package-manager-guidance.long.md) · [Guide](0018-use-bun-runtime-and-pnpm-package-manager-guidance.guide.md)) and move exact current commands and support matrices to Guides.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
