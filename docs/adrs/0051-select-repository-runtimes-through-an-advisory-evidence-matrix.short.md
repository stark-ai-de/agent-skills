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
Variant: Short
Canonical variant: Long
Supersedes: ADR-0034
Superseded by: None
Guide verified: 2026-08-26
Gist: Rank runtime candidates per execution boundary without turning incomplete evidence into a repository gate.

Variants: **Short** · [Long, canonical](0051-select-repository-runtimes-through-an-advisory-evidence-matrix.long.md) · [Guide](0051-select-repository-runtimes-through-an-advisory-evidence-matrix.guide.md)

## Decision

The repository will maintain an advisory evidence matrix for each current execution boundary, start relevant JavaScript/TypeScript tooling from ADR-0050's Bun candidate, and encode the best evidenced supported winner in the owning command or workflow. Unknown or non-material matrix signals do not block work; actual command results and mandatory repository checks determine failure.

## Context

AC-ADR-014 requires selection by concrete deployable evidence, while AC-ADR-055 and ADR-0050 provide a useful Bun-first tooling candidate. A small repository-owned matrix coordinates them without making either decision universal or weakening narrow fallbacks.

## Consequences

- Good: Runtime winners and exceptions are inspectable at the boundary they affect.
- Tradeoff: Maintainers update evidence and revisit triggers when a winner changes.
- Risk: Stale evidence can preserve a weaker candidate; current command failures override the matrix and force focused reconciliation.
