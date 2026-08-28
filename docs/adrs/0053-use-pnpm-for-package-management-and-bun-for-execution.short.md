# ADR-0053: Use pnpm for package management and Bun for execution

ID: ADR-0053
Title: Use pnpm for package management and Bun for execution
Status: Accepted
Date: 2026-08-26
Owner: stark-ai-de
Scope: repository
Category: stack-tooling
Tags: bun, pnpm, nodejs, vite, vitest, scripts, shell, deployment
Applies when: Changing repository JavaScript/TypeScript package ownership, script execution, shell expressions, tests, builds, or deployment artifacts.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: ADR-0034
Superseded by: None
Guide verified: 2026-08-26
Gist: Let pnpm own persistent dependencies and run JavaScript tooling through Bun unless verified incompatibility requires a supported fallback.

Variants: **Short** · [Long, canonical](0053-use-pnpm-for-package-management-and-bun-for-execution.long.md) · [Guide](0053-use-pnpm-for-package-management-and-bun-for-execution.guide.md)

## Decision

The repository will let pnpm exclusively own persistent dependency management and use Bun as the default candidate for repository JavaScript and TypeScript execution. Bun runs only with fail-closed local configuration; each concrete command uses the winner recorded by [ADR-0054](0054-select-repository-runtimes-through-an-advisory-evidence-matrix.short.md), so verified incompatibility selects the best evidenced supported fallback without weakening correctness, operations, or security.

## Context

pnpm already owns the repository lockfile, but scripts, CI, and release tooling previously mixed npm entrypoints and caller-selected Node.js execution. AC-ADR-058 supplies the Bun-first candidate; AC-ADR-014 and ADR-0054 retain evidence-based selection for each executable or deployable.

## Consequences

- Good: One persistent package owner and one explicit default candidate replace caller-dependent behavior.
- Tradeoff: Some commands remain on Node.js or another supported runtime when their matrix evidence requires it.
- Risk: A new Bun or dependency release can invalidate a winner; the matrix records a revisit trigger and commands remain the authoritative proof.
