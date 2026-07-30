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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-30
Gist: Assign one owner to each tooling responsibility and gate optimization or replacement tools on repository compatibility evidence.

Variants: **Short** · [Long, canonical](ac-adr-013-own-language-package-build-lint-and-supply-chain-tooling-explicitly.long.md) · [Guide](ac-adr-013-own-language-package-build-lint-and-supply-chain-tooling-explicitly.guide.md)

## Decision summary

- Use the stable TypeScript release and `tsc` entrypoint for supported typing, declaration, build, and editor behavior. Keep TypeScript 6 only as a named compatibility lane for tools that require the JavaScript compiler API or older integrations.
- One package manager owns dependency installation, workspace discovery, lifecycle-script trust, and the lockfile. In a pnpm repository, Bun may execute runtime scripts but does not install packages or create a second lockfile.
- Disable implicit runtime auto-install and fail on undeclared dependencies.
- Add monorepo orchestration or remote caching only when the task graph and measured build workflow justify them; cache keys include every behavior-changing input.
- Adopt Oxc linting or formatting only after checking required rule, plugin, ignore, editor, generated-file, and autofix behavior. Type-aware or combined diagnostics remain explicit gates, not silent replacements for the compiler.
- Dependency updates, lifecycle scripts, registries, lockfile integrity, release age, and provenance follow a documented supply-chain policy with narrow reviewed exceptions.
- Keep durable responsibilities in ADRs; record supported versions, flags, exact keys, migrations, and compatibility findings in maintained guides and config.
