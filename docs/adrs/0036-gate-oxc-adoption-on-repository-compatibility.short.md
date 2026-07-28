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
Variant: Short
Canonical variant: Long
Supersedes: ADR-0020
Superseded by: None
Guide verified: 2026-07-28
Gist: Oxc adoption must preserve the target repository's required coverage.

Variants: **Short** · [Long, canonical](0036-gate-oxc-adoption-on-repository-compatibility.long.md) · [Guide](0036-gate-oxc-adoption-on-repository-compatibility.guide.md)

## Decision

We will keep Oxc as the preferred JS/TS lint and format candidate only when target file, plugin, rule, formatting, and CI coverage pass an explicit compatibility gate.

## Context

- Oxc is fast and already owns this repository's lint and format path.
- Formatter plugins, file types, semantic rules, and experimental type checks are not universally equivalent.

## Consequences

- Good: New and migrated repositories retain intentional validation coverage.
- Tradeoff: Adoption needs a comparison and representative fixtures.
- Risk: Compatibility findings can defer the preferred toolchain.
