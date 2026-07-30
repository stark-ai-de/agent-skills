# AC-ADR-040: Offer an Opinionated Stack Profile for New Public Skill Repositories

ID: AC-ADR-040
Title: Offer an Opinionated Stack Profile for New Public Skill Repositories
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: stack-tooling
Tags: stack-profile, typescript-7, pnpm, oxc
Applies when: Architecture Compass sets up a new public skill repository and the user wants a concrete maintained starting stack.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Offer a concrete public-skill repository stack only through explicit Architecture Compass selection and local adaptation.

Variants: [Short](ac-adr-040-offer-an-opinionated-stack-profile-for-new-public-skill-repositories.short.md) · [Long, canonical](ac-adr-040-offer-an-opinionated-stack-profile-for-new-public-skill-repositories.long.md) · **Guide**

This guide is non-normative. The canonical Long decision controls profile selection and component ownership.

## Current workflow mapping

The canonical phrase `Setup or writing Apply workflow` predates the current five-workflow dispatcher. It does not expose an additional public `Apply` workflow. `Setup` maps to current `setup`; a writing application of a confirmed profile maps to `refactor` when accepted local ADRs already govern the bounded change, or to `plan-run-refactor` when durable choices or broader implementation still require an approved plan. `audit` and `plan-refactor` never apply the profile to source files.

## Selection record

| Component                  | Provider ADR         | Target evidence | Disposition | Compatibility or migration note |
| -------------------------- | -------------------- | --------------- | ----------- | ------------------------------- |
| Package format             | AC-ADR-027           |                 |             |                                 |
| Catalog/promotion/evals    | AC-ADR-028, 029, 031 |                 |             |                                 |
| License                    | AC-ADR-030           |                 |             |                                 |
| Local state/helpers        | AC-ADR-032, 033      |                 |             |                                 |
| Toolchain                  | AC-ADR-013           |                 |             |                                 |
| Release/publishing         | AC-ADR-034, 041      |                 |             |                                 |
| Portability/optional tools | AC-ADR-035, 038      |                 |             |                                 |

Use AC-ADR-013 for package-manager, compiler, Oxc, orchestration, and supply-chain ownership; AC-ADR-014 for any actual runtime or host; and AC-ADR-021 for existing-repository migration. Do not copy a package list until the target confirms the profile and exact versions are re-verified.

## TypeScript 7 migration lanes

- **Direct CLI type checking:** install stable `typescript`, run its `tsc`, and compare diagnostics against the previous supported lane before cutover.
- **TypeScript compiler API or transformers:** TypeScript 7.0 does not expose a stable programmatic API. Keep a named TypeScript 6 lane, such as the official compatibility package or a reviewed package alias, for the bounded consumer.
- **VS Code:** use current TypeScript 7 LSP support or the documented TypeScript 7 extension, and retain the documented enable/disable fallback while support is transitioning.
- **Cursor and VS Code-compatible plugins:** verify the editor and every extension against workspace TypeScript 7 or its LSP. A plugin that embeds the JavaScript compiler API remains a TypeScript 6 compatibility consumer until its maintainer documents support.
- **Next.js and other framework builds:** run the framework's supported production build and type-check path with the exact version. Do not infer framework support from `tsc` alone, and keep any compiler-API consumer on the bounded compatibility lane.
- **Embedded languages and template tooling:** Vue, MDX, Astro, Svelte, Angular template tooling, and similar consumers may still require TypeScript 6 when they embed compiler or language-service APIs; follow their current official support before migration.

Record the owner, command, affected packages/files, divergence fixtures, and removal condition for every TypeScript 6 lane. A compatibility lane does not become repository-wide compiler authority.

## Decision lineage

- `generalizes`: [ADR-0034](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0034-separate-package-manager-runtime-orchestration-and-hosting-decisions.long.md), [ADR-0035](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0035-use-stable-native-typescript-with-a-compatibility-lane.long.md), [ADR-0036](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0036-gate-oxc-adoption-on-repository-compatibility.long.md).

## Current references

- [TypeScript 7 announcement and compatibility guidance](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [pnpm settings](https://pnpm.io/settings)
- [Oxc linter documentation](https://oxc.rs/docs/guide/usage/linter.html)
- [Agent Skills specification](https://agentskills.io/specification)

## Revisit

Create a successor when the profile's durable component set changes. Keep exact package versions, editor instructions, support matrices, and migration commands in this Guide and re-verify them before use.
