# ADR-0035: Use stable native TypeScript with a compatibility lane

ID: ADR-0035
Title: Use stable native TypeScript with a compatibility lane
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: repository
Category: stack-tooling
Tags: typescript, compiler, compatibility
Applies when: Choosing TypeScript compiler, editor, or compiler-API compatibility tooling.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0019
Superseded by: None
Guide verified: 2026-07-28
Gist: Stable native TypeScript is primary while legacy API consumers remain explicit.

Variants: [Short](0035-use-stable-native-typescript-with-a-compatibility-lane.short.md) · [Long, canonical](0035-use-stable-native-typescript-with-a-compatibility-lane.long.md) · **Guide**

This guide is non-normative. [Long](0035-use-stable-native-typescript-with-a-compatibility-lane.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

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

- Supersede [ADR-0019](0019-use-native-typescript-tooling.short.md) ([Long, canonical](0019-use-native-typescript-tooling.long.md) · [Guide](0019-use-native-typescript-tooling.guide.md)) and keep current package/editor mechanics in the Guide.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
