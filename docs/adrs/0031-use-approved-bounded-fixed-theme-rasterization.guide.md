# ADR-0031: Use approved bounded fixed-theme browser rasterization

ID: ADR-0031
Title: Use approved bounded fixed-theme browser rasterization
Status: Accepted
Date: 2026-07-24
Owner: stark-ai-de
Scope: repository
Category: security-data
Tags: browser, rasterization, isolation
Applies when: Rendering a fixed-theme SVG preview through a local browser.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Fixed-theme SVG previews use an approved, isolated local browser with fail-closed inspection.

Variants: [Short](0031-use-approved-bounded-fixed-theme-rasterization.short.md) · [Long, canonical](0031-use-approved-bounded-fixed-theme-rasterization.long.md) · **Guide**

This guide is non-normative. [Long](0031-use-approved-bounded-fixed-theme-rasterization.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

- Identify trust boundaries, sensitive inputs, public outputs, privileges, and containment controls affected by the decision.
- Fail closed when required isolation, approval, provenance separation, or validation evidence is unavailable.
- Keep secret values and private provenance out of public artifacts and reports.

## Verification

- Use bounded negative fixtures to prove rejection of unsafe, remote, active, privileged, or identifying inputs as applicable.
- Audit every public output surface and distinguish static inspection from runtime containment proof.
- Cite the exact files, commands, and evidence boundaries used for the conclusion.

## Historical follow-up context

The original record named these follow-ups. Revalidate them against current repository state before treating them as active work:

- Keep nested depth, aggregate-byte, and output limits in deterministic regressions.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
