# AC-ADR-069: Require Shared Code Quality with Explicit Toolchain Ownership

ID: AC-ADR-069
Title: Require Shared Code Quality with Explicit Toolchain Ownership
Status: Accepted
Date: 2026-11-27
Owner: stark-ai-de
Scope: target-repository
Category: stack-tooling
Tags: code-quality, ultracite, oxc, compatibility, supply-chain
Applies when: Establishing, auditing, or changing quality enforcement for maintained JavaScript/TypeScript source or its tooling ownership.
Adoptable: true
Variant: Short
Canonical variant: Long
Supersedes: AC-ADR-013
Superseded by: none
Guide verified: 2026-11-28
Gist: Require shared quality presets while retaining explicit consumer ownership, compatibility exceptions and measured migration.

Variants: **Short** · [Long, canonical](ac-adr-069-require-shared-code-quality-with-explicit-toolchain-ownership.long.md) · [Guide](ac-adr-069-require-shared-code-quality-with-explicit-toolchain-ownership.guide.md)

## Decision summary

Require the reviewed `@servrox/code-quality` core, strict, modularity, anti-slop, and formatting exports on applicable adopted JavaScript/TypeScript boundaries. Preserve explicit package, compiler, runtime, build, and supply-chain ownership. Keep paths, framework selection, entrypoints, compatibility exceptions, and non-increasing migration baselines in the consumer; require real enforcement and installation evidence. Pure non-JavaScript/TypeScript repositories record non-applicability, and existing local decisions retain authority until an accepted adaptation or successor governs.
