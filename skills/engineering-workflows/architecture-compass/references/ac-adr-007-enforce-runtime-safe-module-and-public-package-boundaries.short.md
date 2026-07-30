# AC-ADR-007: Enforce Runtime-Safe Module and Public Package Boundaries

ID: AC-ADR-007
Title: Enforce Runtime-Safe Module and Public Package Boundaries
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: repository-architecture
Tags: runtime-boundaries, package-exports, server-only
Applies when: Code crosses browser, trusted server, backend process, app, or package boundaries, or exposes a reusable package API.
Adoptable: true
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Make runtime audience explicit and expose cross-package code only through intentional compatible entrypoints.

Variants: **Short** · [Long, canonical](ac-adr-007-enforce-runtime-safe-module-and-public-package-boundaries.long.md) · [Guide](ac-adr-007-enforce-runtime-safe-module-and-public-package-boundaries.guide.md)

## Decision summary

Modules declare and preserve their runtime audience. Browser-safe and runtime-neutral code cannot import secrets, trusted clients, filesystem or process bootstrap behavior; trusted Next.js modules use an explicit server-only boundary. Shared packages expose only intentional entrypoints compatible with their declared audiences, and consumers do not reach into private package source.

Shallow facades and barrels remain only when they preserve a runtime, public API, or useful locality boundary. A convenience wrapper that merely renames another module is removed.

## Read next

Read the [Long variant](ac-adr-007-enforce-runtime-safe-module-and-public-package-boundaries.long.md) before changing imports, package exports, or trusted-server placement. Use the [Guide](ac-adr-007-enforce-runtime-safe-module-and-public-package-boundaries.guide.md) for example sentinels and export maps.
