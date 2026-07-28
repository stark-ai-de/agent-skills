# ADR-0025: Keep Animated README Logo portable with provider routing

ID: ADR-0025
Title: Keep Animated README Logo portable with provider routing
Status: Accepted
Date: 2026-07-12
Owner: stark-ai-de
Scope: repository
Category: runtime-platform
Tags: animated-logo, portability, provider-routing
Applies when: Changing logo generation routing or host portability.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Keep one portable logo workflow and gate optional Recraft generation behind live discovery and approval.

Variants: [Short](0025-keep-animated-readme-logo-portable-with-provider-routing.short.md) · [Long, canonical](0025-keep-animated-readme-logo-portable-with-provider-routing.long.md) · **Guide**

This guide is non-normative. [Long](0025-keep-animated-readme-logo-portable-with-provider-routing.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

- Identify the execution host, target runtime, permission boundary, and artifact owner before routing work.
- Preserve the portable workflow contract while adapting only host-specific collaboration controls.
- Treat delegated findings as provisional until the lead reconciles them against current artifacts.

## Verification

- Exercise the affected workflow on each host whose behavior is claimed.
- Confirm that permission, mutation, routing, and final-evidence boundaries remain explicit after fallback or delegation.
- Cite the exact files, commands, and evidence boundaries used for the conclusion.

## Historical follow-up context

The original record named these follow-ups. Revalidate them against current repository state before treating them as active work:

- Split by host only if a future tool or output contract materially diverges.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
