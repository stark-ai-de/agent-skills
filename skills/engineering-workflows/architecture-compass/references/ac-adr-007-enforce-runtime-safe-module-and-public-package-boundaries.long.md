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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Make runtime audience explicit and expose cross-package code only through intentional compatible entrypoints.

Variants: [Short](ac-adr-007-enforce-runtime-safe-module-and-public-package-boundaries.short.md) · **Long, canonical** · [Guide](ac-adr-007-enforce-runtime-safe-module-and-public-package-boundaries.guide.md)

## Context

A path name alone does not stop trusted code from entering a browser bundle, and a monorepo package is not automatically portable. Deep imports bypass intended APIs, barrels can expose incompatible modules, and shallow wrappers can obscure ownership. At the same time, some thin facades are valuable because they enforce a runtime or public contract.

## Decision

The repository assigns every module and exported package entrypoint a runtime audience such as browser-safe, runtime-neutral, trusted application server, or long-running backend process. Dependency direction follows compatibility: a broader or less trusted audience never imports a narrower or more privileged one.

Browser-safe and runtime-neutral modules do not import or transitively expose server secrets, privileged credentials, cookie/session implementations, filesystem access, process bootstrap, deployment configuration, service-role clients, or server-only framework APIs. Values exposed to client code are deliberately public and validated at the owning application boundary.

Trusted modules in a Next.js application live under an explicit server-only boundary and import the framework-supported `server-only` sentinel in every hand-written module, including nested modules. Equivalent stacks use their supported compile-time or package boundary. Trusted modules expose narrow browser-safe DTOs or result contracts to entrypoints; persistence details and privileged clients remain private.

Shared packages declare compatible responsibilities:

- UI packages expose reusable presentation, tokens, and browser-compatible provider wiring through documented entrypoints.
- Domain and contract packages remain framework-agnostic and runtime-neutral unless a separately named subpath declares a narrower audience.
- Backend runtime packages contain app-agnostic process facilities and do not construct product services or import app domains.

Public package APIs are intentional. Package export maps or the ecosystem-equivalent define supported entrypoints and runtime-specific subpaths. Consumers use those entrypoints rather than private source paths. Internal barrels and re-export facades are retained only when they preserve a supported package API, runtime barrier, stable contract, or useful locality boundary.

Use the deletion test for a wrapper: if callers can import the true owner directly and deletion removes no runtime, compatibility, public API, or locality guarantee, delete it. If deletion would expose private implementation, merge incompatible audiences, or break a supported contract, retain and test the boundary.

## Invariants

- Client-reachable dependency graphs contain no trusted-only module or secret-bearing configuration.
- Every hand-written module inside the chosen Next.js trusted tree carries the server-only sentinel.
- Public exports match documented package entrypoints and do not expose private source structure accidentally.
- Runtime-specific subpaths are named and cannot be imported from incompatible consumers.
- Shared domain contracts do not depend on application aliases, framework lifecycle, or deployment configuration.
- Backend runtime facilities remain product-agnostic.
- Boundary tests consume public entrypoints rather than reaching into private files.

## Conflict resolution

When a convenience import conflicts with runtime safety, runtime safety governs. When one package needs incompatible browser and server capabilities, split explicit subpaths or separate packages rather than relying on a conditional side effect. When a framework or bundler imposes a stricter boundary, follow it and record any durable package-contract change in the target repository.

## Failure handling

Treat a client-to-server import, secret exposure risk, missing trusted sentinel, undeclared deep import, or incompatible public export as blocking. Stop before bundling or publishing the affected code, identify the dependency chain, and repair the narrowest owning boundary. If a public entrypoint must change, preserve compatibility or route the breaking change through the repository's migration and release decision.

## Acceptance criteria

- Static checks or focused builds detect a client-reachable trusted import.
- Representative server-only modules cannot be imported through the client graph.
- Package consumers compile and test through declared public entrypoints.
- No workspace consumer imports a package's private `src` path without an explicitly documented exception.
- Export maps distinguish runtime-specific entrypoints where required.
- Every retained shallow facade names the boundary it preserves.

## Consequences

Explicit subpaths and sentinels add small maintenance costs, and some helpers remain duplicated across incompatible runtimes. They prevent secret leakage, make package compatibility reviewable, and keep public APIs stable despite internal refactors.
