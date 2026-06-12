# ADR-0020: Use Oxc for formatting and linting

Status: Accepted
Date: 2026-06-11
Owner: stark-ai-de
Gist: Oxc is the repository formatter/linter and JS/TS starter default.

## Decision

We will use `oxfmt` and `oxlint` as this repository's formatting and linting toolchain and make Oxc the default JS/TS starter lint/format guidance in Architecture Compass unless a target repo records another accepted choice.

## Why

- This repo already pins Oxc config, scripts, and CI checks.
- One Rust-based toolchain keeps validation fast and simple.
- Starter guidance should expose lint/format as a guardrail, not an implicit preference.

## Options

- Chosen: Oxc by default for this repo and Architecture Compass JS/TS starters.
- Rejected: Only mention Oxc after adoption, because starters need a concrete baseline.
- Rejected: ESLint/Prettier default, because it adds tooling before target evidence needs it.

## Consequences

- Good: Agents can create consistent validation and setup reports.
- Tradeoff: Non-JS/TS repos or repos with contrary ADRs must adapt or reject the guardrail.
- Risk: Oxc gaps may require narrow fallback tooling with an ADR or stack-rule note.

## Follow-up

- Update Architecture Compass references and validation docs.
