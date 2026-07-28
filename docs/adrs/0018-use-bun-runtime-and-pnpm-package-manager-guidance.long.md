# ADR-0018: Use Bun runtime and pnpm package manager guidance

ID: ADR-0018
Title: Use Bun runtime and pnpm package manager guidance
Status: Superseded
Date: 2026-06-11
Owner: stark-ai-de
Scope: repository
Category: stack-tooling
Tags: bun, pnpm, node, superseded
Applies when: Reviewing the former combined Architecture Compass runtime and package-manager default.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0034
Guide verified: 2026-07-28
Gist: Architecture Compass starter guidance should separate runtime choice from package-management ownership.

Variants: [Short](0018-use-bun-runtime-and-pnpm-package-manager-guidance.short.md) · **Long, canonical** · [Guide](0018-use-bun-runtime-and-pnpm-package-manager-guidance.guide.md)

## Decision

We will use Bun as the preferred app/backend runtime for Architecture Compass starter guidance, pnpm as the package manager with explicit workspace hardening, and Node.js for repo scripts and tools that require it.

## Why

- Architecture Compass needs explicit starter-stack guidance for runtime and package-manager ownership.
- Bun fits app/backend execution and Elysia guidance without making Bun install the workspace.
- pnpm supports workspace lockfiles and supply-chain controls for release age, trust policy, exotic-source blocking, and reviewed build scripts.

## Options

- Chosen: Bun runtime plus pnpm workspace/package management with explicit hardening.
- Rejected: Bun as package manager, because it would split this repo's lockfile and workspace policy.
- Rejected: npm/yarn defaults, because they do not match this repo's pnpm validation path.

## Consequences

- Good: Starter repos get clear runtime and install ownership.
- Tradeoff: Node remains for scripts/tools that require it.
- Risk: pnpm hardening can block urgent releases until maintainers approve narrow exceptions.

## Follow-up

- Align Architecture Compass stack and runtime references with this ADR.
