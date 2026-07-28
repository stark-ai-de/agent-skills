# AC-ADR-013: Own Language, Package, Build, Lint, and Supply-Chain Tooling Explicitly

ID: AC-ADR-013
Title: Own Language, Package, Build, Lint, and Supply-Chain Tooling Explicitly
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: stack-tooling
Tags: typescript, pnpm, monorepo, builds, lint, formatting, oxc, supply-chain
Applies when: Establishing or changing a JavaScript/TypeScript compiler, package manager, workspace, task orchestration, lint/format toolchain, or dependency trust policy.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Assign one owner to each tooling responsibility and gate optimization or replacement tools on repository compatibility evidence.

Variants: [Short](ac-adr-013-own-language-package-build-lint-and-supply-chain-tooling-explicitly.short.md) · [Long, canonical](ac-adr-013-own-language-package-build-lint-and-supply-chain-tooling-explicitly.long.md) · **Guide**

## Implementation guide

This guide is non-normative and reflects primary documentation checked on the guide verification date.

### TypeScript

TypeScript 7 is stable under `typescript`; use the repository-supported stable version and `tsc` instead of the former `@typescript/native-preview`/`tsgo` transition. Keep a TS6 alias only where a named integration still requires it, and run a narrow compatibility command over affected fixtures. Remove preview-only editor settings once all supported editor integrations use stable tooling.

### pnpm and Bun

Use the repository's `packageManager` declaration, pnpm workspace file, and one `pnpm-lock.yaml`. A Bun-owned runtime command can be invoked from a pnpm script without giving Bun package-manager ownership. For an adopted Bun runtime, set `[install] auto = "disable"` in repository-local `bunfig.toml` so an undeclared import fails rather than mutating dependency state.

For a pnpm 11 repository that has verified support for these settings, a hardened starting policy is `strictDepBuilds: true`, `blockExoticSubdeps: true`, `minimumReleaseAge: 1440`, `minimumReleaseAgeStrict: true`, `trustPolicy: no-downgrade`, and narrow `allowBuilds` entries for reviewed lifecycle scripts. Confirm the target's exact pnpm version and each option before adoption. Start narrow, keep exception lists reviewed, and test them with a clean frozen install.

### Oxc and Turbo

Before Oxc adoption, inventory ESLint/Prettier rules, plugins, processors, import resolvers, ignore rules, inline suppressions, editor settings, CI wrappers, and generated fixtures. Compare output and diagnostics on that corpus. Adopt type-aware linting only when its current `oxlint-tsgolint` support covers required code; treat `--type-check` as experimental until the repository separately proves it can own compiler diagnostics.

Add Turborepo only when package relationships and repeatable pipelines benefit from its task graph or caching. Declare task inputs, outputs, environment, dependencies, and non-cacheable tasks. Verify one cold and one warm run and force changes to every behavior-changing input.

### Suggested gates

- frozen clean install using the sole package manager;
- package and workspace listing;
- stable TypeScript diagnostics plus any bounded TS6 compatibility command;
- lint and format check without writes;
- build/test from both cold and warm cache states where orchestration exists;
- search for unexpected lockfiles and undeclared auto-installed dependencies.

## Official sources

- [TypeScript 7 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [TypeScript documentation](https://www.typescriptlang.org/docs/)
- [pnpm settings](https://pnpm.io/settings)
- [pnpm supply-chain security](https://pnpm.io/supply-chain-security)
- [Bun auto-install](https://bun.sh/docs/runtime/auto-install)
- [Bun: `bunfig.toml`](https://bun.sh/docs/runtime/bunfig)
- [Oxc: Oxlint](https://oxc.rs/docs/guide/usage/linter.html)
- [Oxc: Type-aware linting](https://oxc.rs/docs/guide/usage/linter/type-aware.html)
- [Turborepo: Configuring tasks](https://turborepo.com/docs/crafting-your-repository/configuring-tasks)
- [Turborepo: Caching](https://turborepo.com/docs/crafting-your-repository/caching)
