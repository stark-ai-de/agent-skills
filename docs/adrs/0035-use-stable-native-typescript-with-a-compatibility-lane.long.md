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
Variant: Long
Canonical variant: Long
Supersedes: ADR-0019
Superseded by: None
Guide verified: 2026-07-28
Gist: Stable native TypeScript is primary while legacy API consumers remain explicit.

Variants: [Short](0035-use-stable-native-typescript-with-a-compatibility-lane.short.md) · **Long, canonical** · [Guide](0035-use-stable-native-typescript-with-a-compatibility-lane.guide.md)

## Decision

We will use the current stable native TypeScript toolchain for supported type-checking and editor workflows and retain an explicit TypeScript 6 compatibility lane where compiler APIs or language-service plugins require it.

## Why

- TypeScript 7 is stable, so preview package and transition commands are stale defaults.
- Some tools still depend on the JavaScript compiler API or legacy plugin integration.
- A named compatibility lane prevents hidden toolchain downgrades.

## Options

- Chosen: Stable native toolchain plus evidence-backed compatibility lane.
- Rejected: Continue preview tooling, because the transition has completed.
- Rejected: Remove TypeScript 6 immediately, because supported workflows still need it.

## Consequences

- Good: New guidance matches the supported stable compiler.
- Tradeoff: Mixed-toolchain projects document aliases and ownership.
- Risk: Editor and embedded-language support still requires current verification.

## Follow-up

- Supersede [ADR-0019](0019-use-native-typescript-tooling.short.md) ([Long, canonical](0019-use-native-typescript-tooling.long.md) · [Guide](0019-use-native-typescript-tooling.guide.md)) and keep current package/editor mechanics in the Guide.
