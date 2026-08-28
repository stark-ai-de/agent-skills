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
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0034
Superseded by: None
Guide verified: 2026-08-26
Gist: Let pnpm own persistent dependencies and run JavaScript tooling through Bun unless verified incompatibility requires a supported fallback.

Variants: [Short](0053-use-pnpm-for-package-management-and-bun-for-execution.short.md) · [Long, canonical](0053-use-pnpm-for-package-management-and-bun-for-execution.long.md) · **Guide**

This guide is non-normative. The Long variant is authoritative.

## How to apply

Use [AC-ADR-058 Short](../../skills/engineering-workflows/architecture-compass/references/ac-adr-058-use-pnpm-for-package-management-and-bun-for-execution.short.md) ([Long, canonical](../../skills/engineering-workflows/architecture-compass/references/ac-adr-058-use-pnpm-for-package-management-and-bun-for-execution.long.md) · [Guide](../../skills/engineering-workflows/architecture-compass/references/ac-adr-058-use-pnpm-for-package-management-and-bun-for-execution.guide.md)) as the provider decision.

Coordinate it with [AC-ADR-014 Short](../../skills/engineering-workflows/architecture-compass/references/ac-adr-014-select-application-runtimes-deployment-hosts-and-additional-targets-by-evidence.short.md) ([Long, canonical](../../skills/engineering-workflows/architecture-compass/references/ac-adr-014-select-application-runtimes-deployment-hosts-and-additional-targets-by-evidence.long.md) · [Guide](../../skills/engineering-workflows/architecture-compass/references/ac-adr-014-select-application-runtimes-deployment-hosts-and-additional-targets-by-evidence.guide.md)) and [ADR-0054](0054-select-repository-runtimes-through-an-advisory-evidence-matrix.short.md). AC-ADR-058 supplies the Bun candidate and may supply evidence; AC-ADR-014 and the local matrix select the winner for the concrete boundary.

When changing scripts:

1. Keep `pnpm-lock.yaml` as the only package-manager lockfile and use pnpm for every persistent dependency mutation.
2. Keep `.bun-version`, `engines.bun`, `packageManager`, `bunfig.toml`, and the release descriptor coherent.
3. Start compatible JavaScript/TypeScript CLIs with `bun --bun`; use `bun exec` for expressions and `pnpm run` for nested project scripts.
4. Record the command, candidate signals, winner, rationale, evidence reference, fallback order, and revisit trigger in `docs/runtime-evidence-matrix.json`.
5. Keep exceptions narrow. Node.js remains selected for `validate:memory-curators` and JavaScript syntax `--check` until their recorded incompatibilities are resolved.
6. Confirm the stark AI Developer projection remains synchronized; regenerate it only from changed canonical bundled-skill inputs.

## Current repository mapping

- pnpm 11.24.0 owns dependencies and `pnpm-lock.yaml`.
- Bun 1.4.0 is the default repository JavaScript/TypeScript candidate and cannot auto-install or load ambient `.env` files.
- Node.js 24.18.0 remains the compatibility runtime for evidenced fallbacks and upstream contracts.
- Astro owns the site's framework build; no separate Vite or Vitest dependency is added.
- There is no Bun server artifact in scope, so compiled/minified server packaging is not applicable.

## Fallback record

- `validate:memory-curators`: Bun 1.4.0 fails three fail-closed backup-root replacement fixtures before their temporary-directory boundary; Node.js 24.18.0 passes. Revisit on a Bun runtime release that fixes the behavior or when the fixture boundary changes for an independently justified reason.
- Script syntax validation: `bun --check` executes scripts rather than implementing Node.js-compatible syntax-only checking. Keep explicit Node.js `--check`; execute the validator's focused fixtures through its Bun parent. Revisit when Bun offers compatible syntax-only semantics.
- Historical tag-bound post-release helpers: their captured action contract is immutable and uses Node.js. Revisit only through a successor to that release-evidence contract.

## Verification

- `pnpm run validate:adrs`
- `pnpm run validate:architecture-compass`
- `pnpm run validate:runtime-matrix`
- `pnpm run sync:agent-plugin`
- `pnpm run validate:projections`
- `pnpm install --frozen-lockfile --prefer-offline`
- Confirm no npm, Yarn, or Bun lockfile exists and an undeclared import cannot trigger Bun installation.
- Confirm each runtime fallback has evidence and a revisit trigger in the matrix.

## Revisit

Create a successor if persistent package ownership moves away from pnpm or Bun ceases to be the repository's starting candidate. Change a per-boundary winner through ADR-0054's matrix and owning checks without rewriting this accepted decision.
