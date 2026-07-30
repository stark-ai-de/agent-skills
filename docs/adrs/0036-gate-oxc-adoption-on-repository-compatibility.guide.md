# ADR-0036: Gate Oxc adoption on repository compatibility

ID: ADR-0036
Title: Gate Oxc adoption on repository compatibility
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: repository
Category: stack-tooling
Tags: oxc, linting, formatting, compatibility
Applies when: Adopting or migrating JS/TS linting and formatting to Oxc.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0020
Superseded by: None
Guide verified: 2026-07-28
Gist: Oxc adoption must preserve the target repository's required coverage.

Variants: [Short](0036-gate-oxc-adoption-on-repository-compatibility.short.md) · [Long, canonical](0036-gate-oxc-adoption-on-repository-compatibility.long.md) · **Guide**

This guide is non-normative. [Long](0036-gate-oxc-adoption-on-repository-compatibility.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

- Inventory the current tool owner, configuration, scripts, supported files, plugins, and compatibility constraints.
- Adopt the canonical choice only where target evidence satisfies its compatibility boundary; document narrow fallbacks explicitly.
- Keep package installation, runtime execution, and repository scripting ownership distinct.

## Verification

- Run representative checks across every file type and integration the replaced tool currently covers.
- Verify the configured command path in local validation and CI without claiming unsupported environments.
- Cite the exact files, commands, and evidence boundaries used for the conclusion.

## Historical follow-up context

The original record named these follow-ups. Revalidate them against current repository state before treating them as active work:

- Supersede [ADR-0020](0020-use-oxc-for-formatting-and-linting.short.md) ([Long, canonical](0020-use-oxc-for-formatting-and-linting.long.md) · [Guide](0020-use-oxc-for-formatting-and-linting.guide.md)) for Architecture Compass guidance; keep this repository's existing Oxc ownership.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
