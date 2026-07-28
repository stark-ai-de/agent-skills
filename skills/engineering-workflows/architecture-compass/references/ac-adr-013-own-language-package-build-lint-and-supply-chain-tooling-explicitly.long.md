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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Assign one owner to each tooling responsibility and gate optimization or replacement tools on repository compatibility evidence.

Variants: [Short](ac-adr-013-own-language-package-build-lint-and-supply-chain-tooling-explicitly.short.md) · **Long, canonical** · [Guide](ac-adr-013-own-language-package-build-lint-and-supply-chain-tooling-explicitly.guide.md)

## Context

JavaScript repositories can accidentally assign the same responsibility to multiple tools: one installer and another lockfile generator, several type-check commands with different semantics, or a fast linter that does not cover required rules. Defaults also change quickly across compiler, package manager, runtime, orchestrator, and host releases. Architecture should define ownership and evidence, not freeze transient commands as eternal rules.

## Decision

### Assign one owner per responsibility

The repository records a tooling matrix for:

- package installation, workspace membership, registry configuration, lifecycle-script approval, and lockfile generation;
- language type checking, declaration generation, emit or bundling, and editor diagnostics;
- linting, formatting, import policy, generated-file handling, and autofix;
- task graph, local or remote caching, affected-project selection, and CI execution;
- runtime execution and deployment build behavior.

No second tool silently takes over an owned responsibility. In a pnpm-adopted repository, pnpm owns installation, workspaces, lifecycle approvals, and `pnpm-lock.yaml`. A runtime such as Bun may execute an adopted app but cannot auto-install missing dependencies or introduce its own lockfile. Package-manager and runtime changes require an explicit migration and rollback path.

### Use stable TypeScript with an explicit compatibility lane

Stable TypeScript under the `typescript` package and its supported `tsc` command is the default authority for diagnostics, declarations, build semantics, and editor alignment. Preview packages and experimental editor settings are not production defaults after the stable release exists.

A TypeScript 6 lane is permitted only for identified consumers that require the JavaScript compiler API, language-service plugins, transformers, or a dependency not yet compatible with the current native toolchain. The lane has a named command, bounded files or packages, an owner, divergence tests, and a removal condition. It does not silently become a second repository-wide source of diagnostics.

### Gate lint, format, and orchestration changes

A proposed lint or formatting tool must demonstrate compatibility on representative source, config, generated, fixture, test, and intentionally ignored files. Required rules and plugins are mapped to an equivalent, a documented replacement, or an accepted gap. Autofix output, editor integration, CI exit behavior, suppression syntax, staged-file workflows, and format stability are tested before cutover.

Oxc is an eligible high-performance choice, not an unconditional mandate. Type-aware Oxc linting is separately adopted because it changes dependencies, runtime cost, diagnostics, and maturity. Experimental combined type-check modes do not replace the repository's explicit compiler gate without their own accepted decision and equivalence evidence.

A task orchestrator is introduced when a real multi-package dependency graph, repeated pipelines, affected-project selection, or cacheable expensive work warrants it. Cache configuration includes source, configuration, environment, toolchain, platform, and dependency inputs that affect output. Security-sensitive, nondeterministic, publication, deployment, and destructive tasks are not restored from an unsafe cache.

### Enforce supply-chain policy

The package-manager configuration and CI enforce the repository's reviewed policy for dependency sources, minimum release age, lifecycle scripts, lockfile integrity, registry and authentication scope, frozen installs, update review, and provenance where available. Exceptions are package-specific, justified, owned, and reviewable. Secrets stay in approved credential configuration and never enter committed package-manager files or logs.

Dependency changes preserve one lockfile and are validated in a clean or isolated install. Tool versions and option names remain in maintained config and guides so they can evolve without rewriting the durable ownership decision.

## Consequences

Tooling responsibilities and failures are easier to diagnose, and opportunistic speed improvements cannot reduce coverage silently. Compatibility lanes and adoption gates add explicit work, but avoid mixed lockfiles, incomplete diagnostics, and unsafe dependency execution.

## Validation

- Run compiler, lint, format, build, test, package listing, and clean frozen-install gates from the documented package-manager entrypoints.
- Compare diagnostics and changed files on a representative fixture corpus before replacing a tool.
- Prove undeclared imports do not trigger runtime auto-install and no secondary lockfile appears.
- Exercise approved and unapproved lifecycle-script dependencies.
- Change each declared build input and confirm cached tasks invalidate; prove excluded sensitive tasks are not cached.
- Run compatibility-lane fixtures on both compiler lanes and document intentional differences.
