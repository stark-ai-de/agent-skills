# ADR-0024: Keep Architecture Compass portable with host mode adapters

ID: ADR-0024
Title: Keep Architecture Compass portable with host mode adapters
Status: Accepted
Date: 2026-07-11
Owner: stark-ai-de
Scope: repository
Category: agent-lifecycle
Tags: architecture-compass, portability, host-adapter
Applies when: Changing Architecture Compass behavior across agent hosts.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Keep one Architecture Compass workflow and adapt only host collaboration controls.

Variants: [Short](0024-keep-architecture-compass-portable-with-host-mode-adapters.short.md) · [Long, canonical](0024-keep-architecture-compass-portable-with-host-mode-adapters.long.md) · **Guide**

This guide is non-normative. [Long](0024-keep-architecture-compass-portable-with-host-mode-adapters.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

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

- Add conditional routing, host-specific proof, and fallback behavior without making Plan mode mandatory for every invocation.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
