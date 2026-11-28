# AC-ADR-069: Require Shared Code Quality with Explicit Toolchain Ownership

ID: AC-ADR-069
Title: Require Shared Code Quality with Explicit Toolchain Ownership
Status: Accepted
Date: 2026-11-27
Owner: stark-ai-de
Scope: target-repository
Category: stack-tooling
Tags: code-quality, ultracite, oxc, compatibility, supply-chain
Applies when: Establishing, auditing, or changing quality enforcement for maintained JavaScript/TypeScript source or its tooling ownership.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: AC-ADR-013
Superseded by: none
Guide verified: 2026-11-28
Gist: Require shared quality presets while retaining explicit consumer ownership, compatibility exceptions and measured migration.

Variants: [Short](ac-adr-069-require-shared-code-quality-with-explicit-toolchain-ownership.short.md) · **Long, canonical** · [Guide](ac-adr-069-require-shared-code-quality-with-explicit-toolchain-ownership.guide.md)

## Context

Independent repositories need a maintained quality policy without copying rule implementations or losing their own compiler, runtime, package, and source ownership. The former discretionary Oxc candidate allowed policy drift. A shared package can fix that responsibility while compatibility evidence, explicit exceptions, and controlled legacy migration preserve required coverage.

## Decision

### Assign one owner per responsibility

The repository records a tooling matrix for:

- package installation, workspace membership, registry configuration, lifecycle-script approval, and lockfile generation;
- language type checking, declaration generation, emit or bundling, and editor diagnostics;
- linting, formatting, import policy, generated-file handling, and autofix;
- task graph, local or remote caching, affected-project selection, and CI execution;
- runtime execution and deployment build behavior.

No second tool silently takes over an owned responsibility. In a pnpm-adopted repository, pnpm owns installation, workspaces, lifecycle approvals, and `pnpm-lock.yaml`. A runtime such as Bun may execute an adopted app but cannot auto-install missing dependencies or introduce its own lockfile. Package-manager and runtime changes require an explicit migration and rollback path.

### Require the shared quality policy

An adopting repository SHALL consume the reviewed `@servrox/code-quality` package for its applicable JavaScript/TypeScript source boundaries. The mandatory policy comprises `/oxlint/core`, `/oxlint/strict`, `/oxlint/modularity`, `/oxlint/anti-slop`, and `/oxfmt`. Import those exports from an immutable reviewed package version or full retained Git commit; do not fork their rule bodies or recreate a parallel plugin. Upstream plugin execution remains inside Oxlint, without a second ESLint runner for the same policy.

Inventory maintained source, tests, helpers, packages, generated outputs, vendored material, and unsupported syntax before selecting paths. A pure non-JavaScript/TypeScript repository records non-applicability and retains its native quality tools. A mixed repository applies this policy to its actual JavaScript/TypeScript boundaries and keeps other language checks. Framework presets apply only to their matching source; package availability does not justify adding React, Playwright, or another framework.

The shared package owns reusable defaults and their compatible tool versions. The consumer owns source paths, environment globals, framework selection, compiler configuration, public entrypoints, dependency boundaries, generated/vendor exclusions, command orchestration, CI ownership, and reviewed migration data. Consumer extensions may strengthen the policy. A relaxation requires an explicit compatibility exception naming the exact rule or behavior, bounded paths, reason and evidence, authority, owner, compensating check where needed, and removal or revisit condition. A broad ignore, all-rules-off override, or unrecorded formatter change is not adoption.

Preserve an already-passing correctness gate while qualifying the shared policy. A measured legacy baseline MAY allow only existing countable diagnostics and numeric values; new groups, occurrences, increased metrics, missing or malformed reports, and unclassified failures SHALL fail the required gate. Uncountable module/export syntax must be fixed or covered by an explicit scoped entrypoint exception. Improvements become durable through a reviewed prune. Baseline refresh is a deliberate migration operation, never an automatic CI repair or a way to absorb regressions.

The steady state blocks mandatory policy violations locally and in CI. A baseline-backed migration is partial adoption with a named owner, cleanup/promotion criteria, and revisit trigger; its regression gate is still mandatory. Report-only discovery cannot replace an established required gate. Keep raw process status and report validity distinct so tool failures cannot masquerade as allowed diagnostics.

Shared duplicate-detection and dependency-graph exports are used when those analyses are adopted; the consumer supplies actual roots, entrypoints, resolution, and permitted boundaries. Unused-code tooling and all application baselines remain consumer-owned. Neither these optional analyses nor the lint package replace compiler, behavior, security, accessibility, or runtime verification.

### Use stable TypeScript with an explicit compatibility lane

Stable TypeScript under the `typescript` package and its supported `tsc` command is the default authority for diagnostics, declarations, build semantics, and editor alignment. Preview packages and experimental editor settings are not production defaults after the stable release exists.

A TypeScript 6 lane is permitted only for identified consumers that require the JavaScript compiler API, language-service plugins, transformers, or a dependency not yet compatible with the current native toolchain. The lane has a named command, bounded files or packages, an owner, divergence tests, and a removal condition. It does not silently become a second repository-wide source of diagnostics.

### Gate lint, format, and orchestration changes

A proposed lint or formatting tool must demonstrate compatibility on representative source, config, generated, fixture, test, and intentionally ignored files. Required rules and plugins are mapped to an equivalent, a documented replacement, or an accepted gap. Autofix output, editor integration, CI exit behavior, suppression syntax, staged-file workflows, and format stability are tested before cutover.

Use the shared Oxlint policy for supported source and qualify type-aware linting for the applicable TypeScript scope with the pinned companion tool. An unsupported parser, plugin, formatter behavior, runtime, or compiler-API consumer receives a bounded compatibility exception or migration plan with preserved enforcement. It does not silently turn the shared policy into an optional preference. Experimental combined type-check modes do not replace the repository's explicit compiler gate without their own accepted decision and equivalence evidence.

A task orchestrator is introduced when a real multi-package dependency graph, repeated pipelines, affected-project selection, or cacheable expensive work warrants it. Cache configuration includes source, configuration, environment, toolchain, platform, and dependency inputs that affect output. Security-sensitive, nondeterministic, publication, deployment, and destructive tasks are not restored from an unsafe cache.

### Enforce supply-chain policy

The package-manager configuration and CI enforce the repository's reviewed policy for dependency sources, minimum release age, lifecycle scripts, lockfile integrity, registry and authentication scope, frozen installs, update review, and provenance where available. Exceptions are package-specific, justified, owned, and reviewable. Secrets stay in approved credential configuration and never enter committed package-manager files or logs.

Dependency changes preserve one lockfile and are validated in a clean or isolated install. Tool versions and option names remain in maintained config and guides so they can evolve without rewriting the durable ownership decision.

### Preserve adoption and execution authority

Map this provider decision to accepted repository-native governance before treating it as binding in a target. Resolve conflicting accepted decisions through their adaptation or reciprocal-successor process. The mandatory obligation applies within that adopted scope; provider availability, profile selection, or governance setup alone does not authorize installation, source changes, CI writes, runtime migration, or publication. Audit remains read-only. Existing user authority for implementation remains reusable without repeated approval requests.

## Consequences

Reusable lint and format defaults have one reviewed owner and immutable consumer updates. Consumers still qualify their source and framework coverage and own existing debt. The cost is explicit exception and baseline maintenance; a passing regression gate must not be described as a violation-free codebase.

## Validation

- Prove imports resolve from the reviewed pinned package and the peer/tool versions are compatible in a clean frozen install outside local workspace linking.
- Run the real lint, format, compiler, behavior, and required CI commands over declared source boundaries. Keep supported native checks during migration.
- Exercise meaningful passing/failing source, baseline growth, metric growth, malformed output, missing output, and tool failure through the actual command wrappers.
- Verify generated/vendor exclusions and explicit entrypoint exceptions do not hide maintained application source.
- Test compatible and incompatible plugin, parser, type-aware, and runtime paths; record exact exceptions and separate local from hosted evidence.
- Preserve the tooling ownership, lifecycle-script, auto-install, cache-invalidation, and compiler-lane proof required by this Decision.
