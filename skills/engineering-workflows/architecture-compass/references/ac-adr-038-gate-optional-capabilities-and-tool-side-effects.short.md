# AC-ADR-038: Gate Optional Capabilities and Tool Side Effects

ID: AC-ADR-038
Title: Gate Optional Capabilities and Tool Side Effects
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: runtime-platform
Tags: providers, tools, approval, fallback
Applies when: A public skill can call an optional provider, install a missing tool, launch a browser, or use a higher-side-effect capability.
Adoptable: true
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Keep a universal safe path and require live capability checks plus explicit consent for optional side effects.

Variants: **Short** · [Long, canonical](ac-adr-038-gate-optional-capabilities-and-tool-side-effects.long.md) · [Guide](ac-adr-038-gate-optional-capabilities-and-tool-side-effects.guide.md)

## Decision summary

A public skill keeps a documented dependency-light path that works without optional providers or new installs. Paid, credentialed, networked, browser, package-install, or system-tool paths are selected only after live capability discovery, concrete benefit and cost disclosure, and explicit user approval. The skill reuses configured tools first, keeps product-specific recipes in the target repository, and fails safely without silently installing or widening access.

## Context

Optional providers and tools can improve output but introduce changing availability, cost, credentials, local state, and execution risk.

## Invariants

- Capability discovery is read-only and current.
- Provider use and tool installation have distinct approval gates.
- Decline or absence preserves a useful safe fallback.

## Consequences

Users retain control and portability, while enhanced paths require extra preflight and may pause for approval.
