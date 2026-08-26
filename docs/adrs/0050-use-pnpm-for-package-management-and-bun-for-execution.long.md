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
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-26
Gist: Let pnpm own persistent dependencies and run JavaScript tooling through Bun unless verified incompatibility requires a supported fallback.

Variants: [Short](0050-use-pnpm-for-package-management-and-bun-for-execution.short.md) · **Long, canonical** · [Guide](0050-use-pnpm-for-package-management-and-bun-for-execution.guide.md)

## Decision

The repository will let pnpm exclusively own persistent dependency management, run supported JavaScript and TypeScript tooling through Bun by default with fail-closed installation and verification-based fallbacks, use Vite and Vitest where no framework-owned default applies, and prefer compiled or minified Bun server artifacts for compatible deployments.

## Why

- pnpm already owns the repository lockfile, but package-script entrypoints still mix npm and Node.js.
- Runtime selection inside each script keeps commands short and prevents the outer runner from changing behavior.
- Bun-first execution provides a measurable fast path while verification-based fallbacks protect correctness.
- The Architecture Compass provider record makes the policy reusable beyond this repository.

## Options

- Chosen: Adopt AC-ADR-055 locally through a proposed repository record, then migrate implementation in a separately reviewed change after conflicts are reconciled.
- Rejected: Rewrite ADR-0034 in place. Accepted ADR history must remain stable.
- Rejected: Change scripts in the same unresolved decision change. Current accepted guidance requires conflict resolution before affected implementation.
- Rejected: Keep pnpm ownership but leave runtime selection to each caller. That preserves inconsistent behavior.

## Consequences

- Benefit: The desired package, runtime, shell, build, test, transient CLI, deployment, and version policy is explicit and reusable.
- Benefit: The implementation migration can be reviewed against one concrete target.
- Tradeoff: This Proposed record does not override accepted ADR-0034.
- Tradeoff: Current scripts and pnpm version remain implementation drift until a successor or adaptation is accepted.
- Risk: Accepting both records without reconciliation would leave contradictory runtime authority.
