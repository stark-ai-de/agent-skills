# ADR-0019: Use native TypeScript tooling

Status: Accepted
Date: 2026-06-11
Owner: stark-ai-de
Gist: Architecture Compass should guide TypeScript repos toward native TypeScript tooling.

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
