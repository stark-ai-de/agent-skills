# AC-ADR-058: Use pnpm for Package Management and Bun for Execution

ID: AC-ADR-058
Title: Use pnpm for Package Management and Bun for Execution
Status: Accepted
Date: 2026-08-26
Owner: stark-ai-de
Scope: target-repository
Category: stack-tooling
Tags: bun, pnpm, nodejs, vite, vitest, scripts, shell, deployment
Applies when: Establishing or changing JavaScript/TypeScript package management, script execution, shell expressions, build tooling, tests, or server deployment artifacts.
Adoptable: true
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-26
Gist: Let pnpm own persistent dependencies and run JavaScript tooling through Bun unless verified incompatibility requires a supported fallback.

Variants: [Short](ac-adr-058-use-pnpm-for-package-management-and-bun-for-execution.short.md) · **Long, canonical** · [Guide](ac-adr-058-use-pnpm-for-package-management-and-bun-for-execution.guide.md)

## Context

JavaScript and TypeScript repositories often mix package installation, script invocation, runtime selection, shell behavior, build tooling, and deployment packaging. That makes lockfile ownership ambiguous and lets runtime behavior depend on which outer command a developer happens to use.

This decision establishes an explicit fast path: pnpm owns persistent dependencies, while Bun executes supported JavaScript and TypeScript tooling. Bun compatibility is a tested default, not an unverified assumption and not an exception that callers must remember manually.

Framework-owned build systems remain authoritative where replacing them would change the application contract. A verified fallback is therefore part of the decision rather than a policy violation.

## Decision

### Give pnpm exclusive package ownership

pnpm MUST own persistent dependency installation, removal, updates, workspaces, registry configuration, lifecycle-script trust, and `pnpm-lock.yaml`. Repositories MUST NOT create npm, Yarn, or Bun lockfiles or use those package managers for persistent dependency mutations.

Before Bun executes dependency-backed code, repository-local configuration MUST disable automatic installation. Missing or undeclared dependencies MUST fail instead of entering Bun's automatic installation path. Keep the current configuration key in maintained config and the Guide.

### Enforce Bun inside JavaScript and TypeScript scripts

Every `package.json` script that invokes a JavaScript or TypeScript CLI MUST start that CLI through `bun --bun <command>` by default. Runtime enforcement belongs in the script body so `pnpm dev`, `npm run dev`, or `bun run dev` cannot silently select different runtimes.

The prefix MAY be removed only when representative execution, build, or test evidence—or an authoritative upstream limitation—shows incorrect behavior, unsupported functionality, or material regression under Bun. The repository MUST record the affected command, evidence, selected fallback, and revisit condition. The fallback is the fastest supported runtime that preserves correctness.

Bun-native commands such as `bun build`, `bun test`, `bun exec`, and `bunx` run directly. Native executables and shell expressions are not wrapped in `bun --bun`.

### Keep project and transient entrypoints explicit

Use `pnpm run <script>` as the canonical explicit project entrypoint. The `pnpm <script>` shorthand MAY be used only when the script name does not collide with an existing pnpm command. When explicitly entering through Bun, use `bun run <script>` so built-ins such as `bun build` and `bun test` cannot be mistaken for package scripts.

Use a version-qualified `bunx --bun <package>@<version>` for transient JavaScript/TypeScript CLIs only when Bun compatibility holds and Bun's separate transient installation and trust boundary is accepted. Add `--no-install` when the package must already be locally available. Use a version-qualified `pnx` or `pnpm dlx` when Bun is incompatible or the repository's pnpm security and trust policy must govern resolution and fetching. Do not create package-script aliases that conceal `npx`, `bunx`, `pnx`, or `pnpm dlx`.

### Use Bun for shell expressions

`bun exec` is the default shell executor for expressions that require environment assignments, pipes, redirects, chaining, conditionals, or equivalent shell composition. Single commands remain direct. JavaScript/TypeScript CLIs inside a shell expression continue to use `bun --bun` unless a verified fallback applies.

### Default build and test tooling

Use Vite as the default frontend JavaScript/TypeScript build tool and bundler when the selected framework does not own another production toolchain. Use Vitest as the default test framework under the same condition. Both execute through Bun first and fall back only through the verification rule above.

Framework-owned defaults such as Turbopack for Next.js take precedence when they are part of the supported application contract.

### Prefer optimized Bun production artifacts

For Bun-compatible server applications, prefer `bun build --compile` with safe minification for production and container deployments. Use full `--minify` when function-name preservation is not required; otherwise use selective syntax and whitespace minification. When standalone compilation is incompatible but Bun bundling is valid, prefer `bun build --minify`. Framework-native production builds take precedence where the framework requires them.

### Maintain a forward-moving baseline

Record current minimum versions in maintained repository configuration and the Guide, where they can advance without rewriting this durable ownership decision. Treat those minimums as floors, not pins or upper bounds. Repositories adopt newer compatible releases when they improve the project and record only necessary compatibility constraints.

## Invariants

- Exactly one persistent package manager and lockfile owner exists.
- Bun cannot auto-install a missing dependency during runtime execution.
- Bun is the default JavaScript/TypeScript execution runtime, and every removal has evidence and a revisit condition.
- Project commands stay short because runtime selection lives inside scripts.
- Framework contracts and correctness override speed.
- Version floors never become implicit ceilings.

## Validation

- Run a clean `pnpm install --frozen-lockfile` and prove no secondary lockfile appears.
- Exercise representative development, build, test, lint, type-check, and generated-code commands.
- Confirm Bun-enforced commands expose `process.versions.bun` or equivalent runtime evidence where observable.
- Prove an undeclared import fails without changing dependency state or creating a Bun lockfile.
- Exercise shell expressions on every supported operating-system lane.
- Smoke-test transient CLI paths without mutating persistent dependencies.
- Start and probe the production artifact; verify shutdown, source maps, observability, and container behavior.
- Record every fallback with the failing command, evidence, replacement runtime, and revisit trigger.

## Consequences

- Benefit: Dependency ownership stays deterministic while supported tooling uses the faster Bun execution path by default.
- Benefit: Short project commands cannot accidentally bypass the selected runtime.
- Benefit: Shell and deployment behavior become explicit and cross-platform.
- Tradeoff: Bun compatibility must be tested across representative commands and environments.
- Tradeoff: Some frameworks and tools retain Node.js or framework-native execution.
- Risk: Blindly forcing Bun can produce subtle correctness failures; evidence-gated fallback and production smoke tests contain that risk.

## Alternatives

- Rejected: Select runtime independently for every invocation. It creates inconsistent behavior and pushes policy onto callers.
- Rejected: Use Bun for dependency installation. It would introduce competing package ownership and lockfile semantics.
- Rejected: Default every command to Node.js. It preserves compatibility but discards the requested Bun-first execution path.
- Rejected: Hide transient runners behind aliases. It obscures cache, trust, and runtime semantics.
