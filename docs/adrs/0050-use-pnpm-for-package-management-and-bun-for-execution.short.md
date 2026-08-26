# ADR-0050: Use pnpm for package management and Bun for execution

ID: ADR-0050
Title: Use pnpm for package management and Bun for execution
Status: Proposed
Date: 2026-08-26
Owner: stark-ai-de
Scope: repository
Category: stack-tooling
Tags: bun, pnpm, nodejs, vite, vitest, scripts, shell, deployment
Applies when: Changing repository JavaScript/TypeScript package ownership, script execution, shell expressions, tests, builds, or deployment artifacts.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-26
Gist: Let pnpm own persistent dependencies and run JavaScript tooling through Bun unless verified incompatibility requires a supported fallback.

Variants: **Short** · [Long, canonical](0050-use-pnpm-for-package-management-and-bun-for-execution.long.md) · [Guide](0050-use-pnpm-for-package-management-and-bun-for-execution.guide.md)

## Decision

The repository will let pnpm exclusively own persistent dependency management, run supported JavaScript and TypeScript tooling through Bun by default with fail-closed installation and verification-based fallbacks, use Vite and Vitest where no framework-owned default applies, and prefer compiled or minified Bun server artifacts for compatible deployments.

## Context

The repository currently lets pnpm own dependencies but runs most scripts through Node.js and nested npm commands. AC-ADR-055 defines the proposed Bun-first execution path, explicit shell handling, default Vite/Vitest choices, deployment optimization, and version floors.

## Consequences

- Good: One package owner and one enforced fast runtime path replace caller-dependent behavior.
- Tradeoff: Existing scripts, tool versions, and CI need a separate verified migration.
- Risk: ADR-0034 and current Architecture Compass guidance conflict with this proposal; they remain unresolved until maintainers reconcile the decision set.
