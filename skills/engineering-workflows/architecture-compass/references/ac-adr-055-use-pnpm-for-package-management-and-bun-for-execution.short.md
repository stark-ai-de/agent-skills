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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-08-26
Gist: Let pnpm own persistent dependencies and run JavaScript tooling through Bun unless verified incompatibility requires a supported fallback.

Variants: **Short** · [Long, canonical](ac-adr-055-use-pnpm-for-package-management-and-bun-for-execution.long.md) · [Guide](ac-adr-055-use-pnpm-for-package-management-and-bun-for-execution.guide.md)

## Context and Problem Statement

- Dependency ownership, script entrypoints, runtime execution, shell expressions, and deployment builds need explicit owners.
- Bun speed is lost when every caller must remember runtime flags.
- Compatibility exceptions must be proven rather than assumed.

## Decision Outcome

Chosen option: **pnpm ownership with Bun-first, verification-gated execution**.

- pnpm MUST exclusively own persistent installs, workspaces, lifecycle trust, and `pnpm-lock.yaml`.
- Before Bun executes dependency-backed code, repository-local configuration MUST disable automatic installation so undeclared dependencies fail instead of being auto-installed.
- `package.json` scripts that call JavaScript/TypeScript CLIs MUST use `bun --bun <command>` by default. Remove it only after representative execution, build, or tests—or an authoritative upstream limitation—proves a problem; record the evidence and fallback.
- Use `pnpm run <script>` as the explicit project entrypoint. The `pnpm <script>` shorthand MAY be used only when the script name does not collide with a pnpm command. When Bun invokes a package script, use `bun run <script>`; naked Bun built-ins are not package-script aliases.
- Use `bun exec` for shell expressions. Keep single commands direct.
- Use Vite and Vitest by default unless a framework owns another toolchain or verification rejects them.
- Use a version-qualified `bunx --bun` only when Bun's transient installation and trust boundary is accepted; use `--no-install` when the package must already exist. Otherwise use version-qualified `pnx`/`pnpm dlx` when the repository's pnpm security and trust policy must apply. Do not hide these paths behind aliases.
- Prefer compiled, safely minified Bun artifacts for compatible server and container deployments; otherwise use the framework-native production path.
- Record current minimum tool versions in maintained configuration and the Guide. Treat them as forward-moving floors, not pins or ceilings.

## Decision summary

Use pnpm exclusively for persistent dependency ownership; disable Bun auto-install, run JavaScript/TypeScript CLIs through `bun --bun` by default, and remove it only after verified incompatibility; use `bun exec` for shell expressions, Vite and Vitest as non-framework defaults, an explicit versioned transient-runner trust boundary, and compiled or minified Bun artifacts for compatible server deployments; keep current tool floors in maintained config and the Guide and adopt newer compatible releases.
