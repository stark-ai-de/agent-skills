# ADR-0051: Select repository runtimes through an advisory evidence matrix

ID: ADR-0051
Title: Select repository runtimes through an advisory evidence matrix
Status: Accepted
Date: 2026-08-26
Owner: stark-ai-de
Scope: repository
Category: runtime-platform
Tags: bun, evidence, matrix, nodejs, runtime, tooling
Applies when: Selecting or changing the runtime for a repository executable, composed task, build, transient CLI, action, or deployable.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0034
Superseded by: None
Guide verified: 2026-08-26
Gist: Rank runtime candidates per execution boundary without turning incomplete evidence into a repository gate.

Variants: [Short](0051-select-repository-runtimes-through-an-advisory-evidence-matrix.short.md) · [Long, canonical](0051-select-repository-runtimes-through-an-advisory-evidence-matrix.long.md) · **Guide**

This guide is non-normative. The Long variant is authoritative.

## How to apply

Use `docs/runtime-evidence-matrix.json` as the current record and `pnpm run validate:runtime-matrix` as its structural and drift check.

For each current boundary:

1. Name the owning package script, workflow, action, direct maintained command, or explicit historical contract.
2. List only realistic candidates and record material signals as `pass`, `fail`, `unknown`, or `not-applicable`.
3. Start repository JavaScript/TypeScript tooling with ADR-0050's Bun candidate; start framework, native, or immutable upstream contracts with their supported candidate.
4. Select the fastest candidate that preserves correctness, operations, security, upstream support, and required platform behavior.
5. If Bun is not the winner, record the exact evidence and revisit trigger. When Node.js works and no other candidate has better qualifying evidence, select Node.js as the default fallback.
6. Encode the winner in the owning command and update the matrix in the same change.

Do not invent scores for unknown signals or block a command solely because an observation is absent. A mandatory command failure overrides a matrix `pass`; repair or reclassify the owning boundary before continuing.

## Current fallback examples

- `validate:memory-curators` selects Node.js because Bun 1.4.0 fails three fail-closed backup-root replacement fixtures that Node.js 24.18.0 passes.
- JavaScript syntax checking inside `validate:scripts` selects Node.js `--check` because Bun's `--check` behavior executes the file instead of providing the required syntax-only contract; the validator's focused fixtures still run under Bun.
- Historical tag-bound post-release actions select Node.js because their captured source contract is intentionally immutable.
- Transient skills CLI checks select `pnpm dlx skills@1.5.23` because repository dependency trust and a version-qualified upstream contract matter more than using Bun's separate transient cache.

## Evidence maintenance

An evidence reference identifies a public source, an owning command/fixture, a CI run, or a concise repository-safe observation. Do not paste private paths or raw internal provenance into the public matrix. Record hosted and local stages separately.

Use a revisit trigger tied to a runtime/tool release, upstream issue, changed fixture, changed boundary, or explicit review date. A revisit does not change the winner without new focused evidence and the owning command update.

## Verification

- Run `pnpm run validate:runtime-matrix` after changing the matrix, scripts, toolchain pins, or selected workflow commands.
- Run the smallest focused command that owns a changed candidate or fallback.
- Run `pnpm run validate:ownership` when adding or changing a mandatory validation gate.
- Run `pnpm run validate` when release intent or another mandatory repository gate requires the aggregate.
- Confirm `pnpm-lock.yaml` is the only package-manager lockfile and Bun cannot auto-install undeclared dependencies.
- Confirm local and hosted results are reported as separate evidence stages.

## Revisit

Create a successor if the repository stops using a per-boundary evidence matrix or makes matrix completeness a mandatory policy gate. Update the matrix and owning command, not this decision, when only a candidate winner changes.
