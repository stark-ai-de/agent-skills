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
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-26
Gist: Let pnpm own persistent dependencies and run JavaScript tooling through Bun unless verified incompatibility requires a supported fallback.

Variants: [Short](0050-use-pnpm-for-package-management-and-bun-for-execution.short.md) · [Long, canonical](0050-use-pnpm-for-package-management-and-bun-for-execution.long.md) · **Guide**

This guide is non-normative. The Long variant is authoritative.

## How to apply

Use [AC-ADR-055 Short](../../skills/engineering-workflows/architecture-compass/references/ac-adr-055-use-pnpm-for-package-management-and-bun-for-execution.short.md) ([Long, canonical](../../skills/engineering-workflows/architecture-compass/references/ac-adr-055-use-pnpm-for-package-management-and-bun-for-execution.long.md) · [Guide](../../skills/engineering-workflows/architecture-compass/references/ac-adr-055-use-pnpm-for-package-management-and-bun-for-execution.guide.md)) as the provider decision.

Before changing scripts:

1. Reconcile the accepted ADR-0034 conflict through an explicit successor or adaptation.
2. Update pnpm to at least 11.24.0 while preserving `pnpm-lock.yaml` as the only lockfile.
3. Convert JavaScript/TypeScript package scripts to Bun-enforced bodies.
4. Replace nested npm script calls with explicit `pnpm run <script>` entrypoints.
5. Run the provider Guide verification matrix across supported platforms.
6. Confirm the stark AI Developer projection remains synchronized; regenerate it only when canonical bundled-skill inputs changed.

## Current repository drift

- `packageManager` is `pnpm@11.22.0`, below the proposed 11.24.0 floor.
- `engines.node` is `>=24.18.0`, which meets the proposed Node.js floor.
- Repository scripts predominantly call `node` and nested `npm run`.
- Bun is not declared or enforced for repository script execution.
- Vite and Vitest are not repository-wide defaults because this repository is not a conventional frontend application.

## Known conflicts

- [ADR-0034](0034-separate-package-manager-runtime-orchestration-and-hosting-decisions.short.md) ([Long, canonical](0034-separate-package-manager-runtime-orchestration-and-hosting-decisions.long.md) · [Guide](0034-separate-package-manager-runtime-orchestration-and-hosting-decisions.guide.md)) requires package manager and runtime choices to remain independent and evidence-selected.
- [ADR-0018](0018-use-bun-runtime-and-pnpm-package-manager-guidance.short.md) ([Long, canonical](0018-use-bun-runtime-and-pnpm-package-manager-guidance.long.md) · [Guide](0018-use-bun-runtime-and-pnpm-package-manager-guidance.guide.md)) is historical overlap but is already superseded by ADR-0034.
- AC-ADR-013, AC-ADR-014, and AC-ADR-040 contain overlapping or contradictory provider guidance; the pull request records these for manual reconciliation.

## Verification

- `pnpm validate:adrs`
- `pnpm validate:architecture-compass`
- `pnpm sync:agent-plugin`
- `pnpm validate:projections`
- Confirm the local ADR remains Proposed and is not added to the accepted decision lock.
- Confirm the PR description lists every unresolved accepted conflict and current implementation drift.

## Revisit

Revisit after maintainers decide whether this record supersedes or adapts ADR-0034 and whether the repository implementation migration belongs in the same follow-up.
