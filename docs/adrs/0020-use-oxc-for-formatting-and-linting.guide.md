# ADR-0020: Use Oxc for formatting and linting

ID: ADR-0020
Title: Use Oxc for formatting and linting
Status: Superseded
Date: 2026-06-11
Owner: stark-ai-de
Scope: repository
Category: stack-tooling
Tags: oxc, linting, formatting, superseded
Applies when: Reviewing the former unconditional Oxc starter guidance.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0036
Guide verified: 2026-07-28
Gist: Oxc is the repository formatter/linter and JS/TS starter default.

Variants: [Short](0020-use-oxc-for-formatting-and-linting.short.md) · [Long, canonical](0020-use-oxc-for-formatting-and-linting.long.md) · **Guide**

This guide is non-normative. [Long](0020-use-oxc-for-formatting-and-linting.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

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

- Update Architecture Compass references and validation docs.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
