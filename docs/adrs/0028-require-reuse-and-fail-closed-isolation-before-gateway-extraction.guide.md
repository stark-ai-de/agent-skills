# ADR-0028: Preserve target contracts and gate gateway extraction

ID: ADR-0028
Title: Preserve target contracts and gate gateway extraction
Status: Accepted
Date: 2026-07-13
Owner: stark-ai-de
Scope: repository
Category: repository-architecture
Tags: host-adapter, gateway, isolation
Applies when: Splitting a portable skill or extracting a shared gateway.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0026
Superseded by: None
Guide verified: 2026-07-28
Gist: Preserve target contracts; extract gateways only after reuse and isolation.

Variants: [Short](0028-require-reuse-and-fail-closed-isolation-before-gateway-extraction.short.md) · [Long, canonical](0028-require-reuse-and-fail-closed-isolation-before-gateway-extraction.long.md) · **Guide**

This guide is non-normative. [Long](0028-require-reuse-and-fail-closed-isolation-before-gateway-extraction.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

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

- Keep Architecture Compass routing local and the Codex gateway in `skillopt-setup` until the gate passes.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
