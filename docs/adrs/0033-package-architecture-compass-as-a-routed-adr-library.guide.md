# ADR-0033: Package Architecture Compass as a routed ADR library

ID: ADR-0033
Title: Package Architecture Compass as a routed ADR library
Status: Superseded
Date: 2026-07-28
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: architecture-compass, routing, adr-library
Applies when: Changing Architecture Compass policy, routing, or guardrail content.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0039
Guide verified: 2026-07-28
Gist: Architecture Compass should load only applicable canonical guardrails.

Variants: [Short](0033-package-architecture-compass-as-a-routed-adr-library.short.md) · [Long, canonical](0033-package-architecture-compass-as-a-routed-adr-library.long.md) · **Guide**

This guide is non-normative. [Long](0033-package-architecture-compass-as-a-routed-adr-library.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

- Locate the policy, catalog, metadata, or repository surfaces governed by the canonical record.
- Compare the current state with the Long decision and with any later accepted or superseding ADR before proposing a change.
- Keep one authoritative policy surface; treat templates, reports, and checklists as derived material.

## Verification

- Check the affected policy and generated or derived surfaces for semantic agreement.
- Run the narrow validator for the governed artifact, then the repository aggregate validation when the change is implementation-ready.
- Cite the exact files, commands, and evidence boundaries used for the conclusion.

## Historical follow-up context

The original record named these follow-ups. Revalidate them against current repository state before treating them as active work:

- Extend [ADR-0024](0024-keep-architecture-compass-portable-with-host-mode-adapters.short.md) ([Long, canonical](0024-keep-architecture-compass-portable-with-host-mode-adapters.long.md) · [Guide](0024-keep-architecture-compass-portable-with-host-mode-adapters.guide.md)) through routed skill-runtime ADRs.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
