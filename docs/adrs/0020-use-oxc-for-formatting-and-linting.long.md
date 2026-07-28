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
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0036
Guide verified: 2026-07-28
Gist: Oxc is the repository formatter/linter and JS/TS starter default.

Variants: [Short](0020-use-oxc-for-formatting-and-linting.short.md) · **Long, canonical** · [Guide](0020-use-oxc-for-formatting-and-linting.guide.md)

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
