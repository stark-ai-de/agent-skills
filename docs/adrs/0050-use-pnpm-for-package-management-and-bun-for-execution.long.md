# ADR-0050: Use pnpm for package management and Bun for execution

ID: ADR-0050
Title: Use pnpm for package management and Bun for execution
Status: Accepted
Date: 2026-08-26
Owner: stark-ai-de
Scope: repository
Category: stack-tooling
Tags: bun, pnpm, nodejs, vite, vitest, scripts, shell, deployment
Applies when: Changing repository JavaScript/TypeScript package ownership, script execution, shell expressions, tests, builds, or deployment artifacts.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: ADR-0034
Superseded by: None
Guide verified: 2026-08-26
Gist: Let pnpm own persistent dependencies and run JavaScript tooling through Bun unless verified incompatibility requires a supported fallback.

Variants: [Short](0050-use-pnpm-for-package-management-and-bun-for-execution.short.md) · **Long, canonical** · [Guide](0050-use-pnpm-for-package-management-and-bun-for-execution.guide.md)

## Decision

The repository will let pnpm exclusively own persistent dependency management and use Bun as the default candidate for repository JavaScript and TypeScript execution. Bun runs only with fail-closed local configuration; each concrete command uses the winner recorded by [ADR-0051](0051-select-repository-runtimes-through-an-advisory-evidence-matrix.short.md), so verified incompatibility selects the best evidenced supported fallback without weakening correctness, operations, or security.

## Why

- pnpm already owns the repository lockfile, while package scripts, CI, and release tooling previously mixed npm entrypoints and caller-selected Node.js execution.
- Runtime selection inside each script keeps commands short and prevents the outer runner from changing behavior.
- AC-ADR-055 provides a useful Bun-first repository-tooling candidate, while AC-ADR-014 requires evidence for the actual executable or deployable.
- Separating package ownership and default candidacy here from final per-boundary selection in ADR-0051 preserves both responsibilities.
- pnpm owns installation, updates, workspaces, dependency trust, and the only package-manager lockfile; Bun runs with automatic installation and environment-file loading disabled.
- Compatible CLIs use `bun --bun`, composed expressions use `bun exec`, and explicit project entrypoints use `pnpm run`; native executables remain direct.
- The public upstream interface of a consumer tool does not change merely because repository-maintainer automation selects another transient runner.
- Bun is a starting candidate rather than a universal winner; if no candidate has better qualifying evidence and Node.js works, Node.js is the default fallback.

## Options

- Chosen: pnpm ownership plus a Bun-first candidate, coordinated with ADR-0051's advisory evidence matrix.
- Rejected: Rewrite ADR-0034 in place. Accepted ADR history remains stable and is superseded reciprocally.
- Rejected: Make Bun the unconditional runtime. That would discard AC-ADR-014's deployable-specific evidence requirements.
- Rejected: Leave runtime selection to each caller. That preserves inconsistent behavior and hides fallbacks.

## Consequences

- Benefit: Dependency ownership is deterministic and compatible commands have an explicit Bun fast path.
- Benefit: Evidence-selected exceptions remain visible rather than becoming undocumented drift.
- Tradeoff: The repository maintains Bun alongside Node.js and pnpm because each has an owned boundary.
- Tradeoff: Runtime upgrades may require focused matrix evidence before a winner changes.
- Risk: Blindly forcing Bun could introduce subtle failures; ADR-0051 and mandatory command checks contain that risk.
