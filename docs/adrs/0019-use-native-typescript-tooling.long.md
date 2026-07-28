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
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0035
Guide verified: 2026-07-28
Gist: Architecture Compass should guide TypeScript repos toward native TypeScript tooling.

Variants: [Short](0019-use-native-typescript-tooling.short.md) · **Long, canonical** · [Guide](0019-use-native-typescript-tooling.guide.md)

## Decision

We will make native TypeScript tooling the preferred Architecture Compass baseline for TypeScript type checking and editor setup, while keeping compatibility packages explicit for tools that still require the JavaScript compiler API.

## Why

- TypeScript 7 native tooling provides the intended `tsgo` transition path before stable `typescript` packaging.
- Architecture Compass starter guidance should optimize repeated repo setup, CI checks, and editor feedback.
- Compatibility must stay explicit because some tooling still depends on the TypeScript 6 JavaScript API.

## Options

- Chosen: `tsgo` now, stable TypeScript 7 `tsc` after release, explicit TS6 compatibility only when required.
- Rejected: research-only guidance, because maintainers want full native TypeScript use.
- Rejected: replace all semantic checks with Oxc, because Oxc and `oxlint-tsgolint` remain layered linting tools.

## Consequences

- Good: New TypeScript repos get faster checks and matching editor guidance.
- Tradeoff: Preview package names must change when TypeScript 7 stabilizes.
- Risk: Some package ecosystems may need temporary TS6 compatibility pins.

## Follow-up

- Align Architecture Compass preferred stack guidance with this ADR.
