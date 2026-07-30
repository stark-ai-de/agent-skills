# ADR-0019: Use native TypeScript tooling

ID: ADR-0019
Title: Use native TypeScript tooling
Status: Superseded
Date: 2026-06-11
Owner: stark-ai-de
Scope: repository
Category: stack-tooling
Tags: typescript, compiler, superseded
Applies when: Reviewing the former native TypeScript transition guidance.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0035
Guide verified: 2026-07-28
Gist: Architecture Compass should guide TypeScript repos toward native TypeScript tooling.

Variants: [Short](0019-use-native-typescript-tooling.short.md) · [Long, canonical](0019-use-native-typescript-tooling.long.md) · **Guide**

This guide is non-normative. [Long](0019-use-native-typescript-tooling.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

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

- Align Architecture Compass preferred stack guidance with this ADR.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
