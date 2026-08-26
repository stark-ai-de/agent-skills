# AC-ADR-055: Use pnpm for Package Management and Bun for Execution

ID: AC-ADR-055
Title: Use pnpm for Package Management and Bun for Execution
Status: Accepted
Date: 2026-08-26
Owner: stark-ai-de
Scope: target-repository
Category: stack-tooling
Tags: bun, pnpm, nodejs, vite, vitest, scripts, shell, deployment
Applies when: Establishing or changing JavaScript/TypeScript package management, script execution, shell expressions, build tooling, tests, or server deployment artifacts.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-26
Gist: Let pnpm own persistent dependencies and run JavaScript tooling through Bun unless verified incompatibility requires a supported fallback.

Variants: [Short](ac-adr-055-use-pnpm-for-package-management-and-bun-for-execution.short.md) · [Long, canonical](ac-adr-055-use-pnpm-for-package-management-and-bun-for-execution.long.md) · **Guide**

This guide is non-normative. The Long variant is authoritative.

## How to apply

### Package scripts

Keep pnpm as package owner and put runtime selection inside each JavaScript/TypeScript script:

```toml
# bunfig.toml
[install]
auto = "disable"
```

```json
{
  "packageManager": "pnpm@11.24.0",
  "engines": {
    "node": ">=24.18.0"
  },
  "scripts": {
    "dev": "bun --bun vite",
    "build": "bun --bun vite build",
    "test": "bun --bun vitest run",
    "check": "bun exec \"bun --bun eslint . && bun --bun vitest run\""
  }
}
```

Use explicit project entrypoints:

```bash
pnpm run dev
pnpm run build
pnpm run test
```

`pnpm <script>` is an optional shorthand only when the script name does not collide with a pnpm command.

For a framework-owned CLI, keep its supported toolchain but still test Bun execution first:

```json
{
  "scripts": {
    "dev": "bun --bun next dev",
    "build": "bun --bun next build"
  }
}
```

### Verified fallback

When Bun fails, keep the exception narrow:

```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

Record:

```text
command: test
Bun path: bun --bun vitest run
evidence: <failing fixture, upstream limitation, or regression>
fallback: default Vitest runtime
revisit: <version, issue, or date>
```

Do not remove `bun --bun` because compatibility is merely uncertain; run the representative command or cite an authoritative limitation.

### Shell expressions

Use `bun exec` when the command is an expression rather than a single executable:

```json
{
  "scripts": {
    "dev:debug": "bun exec \"LOG_LEVEL=debug bun --bun vite\"",
    "verify": "bun exec \"bun --bun eslint . && bun --bun vitest run\""
  }
}
```

### Transient CLIs

```bash
bunx --bun <package>@<version>                # accepted Bun transient-install boundary
bunx --bun --no-install <package>              # require a locally available package
pnx <package>@<version>                        # apply project pnpm security/trust policy
pnpm dlx <package>@<version>                   # explicit pnx equivalent
```

`bunx` checks local packages first and otherwise uses Bun's global cache; it does not inherit the project's pnpm trust policy. Prefer `pnx`/`pnpm dlx` when that policy must govern resolution and fetching. Do not add a generic `x` package script; the visible command communicates the runtime and package-execution policy.

### Production and containers

For a compatible Bun server:

```bash
bun build --compile --target bun --minify ./src/index.ts --outfile server
```

When tracing or observability depends on function names:

```bash
bun build --compile --target bun   --minify-whitespace --minify-syntax   ./src/index.ts --outfile server
```

When compilation is not supported but Bun bundling is:

```bash
bun build --minify ./src/index.ts --outdir dist
```

Copy only the verified artifact and required runtime assets into the final container stage. Keep the framework-native production build when the framework requires it.

### Version floors

| Tool    | Minimum |
| ------- | ------- |
| Node.js | 24.18.0 |
| Bun     | 1.4.0   |
| Vite    | 8.2.2   |
| pnpm    | 11.24.0 |
| Vitest  | 4.1.11  |

These are minimums. Select and update to newer compatible releases without adding an upper bound unless evidence requires one.

## Verification

- `pnpm install --frozen-lockfile` succeeds from a clean checkout.
- Only `pnpm-lock.yaml` exists.
- `pnpm run dev`, `pnpm run build`, and `pnpm run test` exercise the intended package scripts.
- An undeclared import fails without changing dependency state or creating a Bun lockfile.
- Bun-enforced CLIs run under Bun where runtime identity is observable.
- Shell-expression scripts pass on every supported OS lane.
- A fallback record exists for each command without `bun --bun`.
- Transient CLI runs do not change persistent dependencies or lockfiles.
- Compiled or bundled production artifacts start, become ready, handle shutdown, and preserve required observability.

## Decision lineage

- `adapts`: [ADR-0018](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0018-use-bun-runtime-and-pnpm-package-manager-guidance.long.md).
- `diverges-from`: [ADR-0034](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0034-separate-package-manager-runtime-orchestration-and-hosting-decisions.long.md).

## Current sources

- [Bun runtime and `--bun`](https://bun.com/docs/runtime)
- [Bun shell](https://bun.com/docs/runtime/shell)
- [`bunx`](https://bun.com/docs/pm/bunx)
- [Bun compiled executables](https://bun.com/docs/bundler/executables)
- [pnpm scripts](https://pnpm.io/cli/run)
- [`pnpm dlx` / `pnx`](https://pnpm.io/cli/pnx)
- [Vite guide](https://vite.dev/guide/)
- [Vitest guide](https://vitest.dev/guide/)
- [Elysia production deployment](https://elysiajs.com/patterns/deploy.html#compile-to-binary)

## Revisit

Revisit when Bun no longer needs explicit shebang override, pnpm package ownership changes, framework runtime support materially shifts, or production evidence shows another default preserves correctness with lower total cost.
