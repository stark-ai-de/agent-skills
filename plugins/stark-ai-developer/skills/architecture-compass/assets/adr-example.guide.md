# ADR-0007: Resolve configuration at the deployable boundary

> Derived, non-normative asset. The applicable canonical Long ADRs prevail if this example conflicts or drifts.

ID: ADR-0007
Title: Resolve configuration at the deployable boundary
Status: Accepted
Date: 2026-07-28
Owner: example-team
Scope: repository
Category: runtime-platform
Tags: configuration, environment, bootstrap
Applies when: A deployable process reads environment-backed configuration.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Select environment before bootstrap and parse resolved configuration once.

Variants: [Short](adr-example.short.md) · [Long, canonical](adr-example.long.md) · **Guide**

## Example procedure

1. Define a schema beside the deployable entrypoint.
2. Select local files through the launcher or runtime; use platform-injected variables in production.
3. Parse once before constructing services.
4. Pass typed configuration through the composition root.
5. Test valid, missing, malformed, and redacted-error cases.

## Bun example

Bun can select one or more files with `--env-file` or disable automatic files with `--no-env-file`. Keep exact launch syntax in package scripts or deployment configuration, not in domain modules.

## Validation

```bash
pnpm test -- config
pnpm typecheck
```

## Source

- [Bun environment variables](https://bun.com/docs/runtime/environment-variables), verified 2026-07-28.
