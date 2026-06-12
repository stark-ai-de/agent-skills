# ADR-0018: Use Bun runtime and pnpm package manager guidance

Status: Accepted
Date: 2026-06-11
Owner: stark-ai-de
Gist: Architecture Compass starter guidance should separate runtime choice from package-management ownership.

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
