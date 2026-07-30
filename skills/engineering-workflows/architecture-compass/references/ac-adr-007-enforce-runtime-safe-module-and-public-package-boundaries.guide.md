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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Make runtime audience explicit and expose cross-package code only through intentional compatible entrypoints.

Variants: [Short](ac-adr-007-enforce-runtime-safe-module-and-public-package-boundaries.short.md) · [Long, canonical](ac-adr-007-enforce-runtime-safe-module-and-public-package-boundaries.long.md) · **Guide**

> Non-normative implementation guidance. The Long variant is authoritative.

## Runtime map

Annotate planned modules before implementation:

| Module or subpath       | Audience           | Allowed dependencies | Forbidden examples               |
| ----------------------- | ------------------ | -------------------- | -------------------------------- |
| `@repo/domain`          | runtime-neutral    | schemas, pure rules  | Next.js, secrets, app config     |
| `@repo/ui`              | browser-compatible | React UI, tokens     | privileged clients, filesystem   |
| `@repo/app/server`      | trusted server     | session, persistence | imports from client-only modules |
| `@repo/backend-runtime` | backend process    | HTTP lifecycle       | product-specific services        |

Trace transitive imports, not only the first import line. A browser-safe facade around a server-only implementation is still unsafe.

## Next.js trusted module example

```ts
import "server-only";

export async function loadResource(): Promise<ResourceDto> {
  // Read trusted state and return an explicitly browser-safe DTO.
}
```

Place the sentinel in each hand-written trusted module rather than relying on a parent index file.

## Export-map example

```json
{
  "name": "@repo/example",
  "exports": {
    ".": "./src/index.ts",
    "./browser": "./src/browser.ts",
    "./server": "./src/server.ts"
  }
}
```

The exact build outputs and conditions depend on the repository toolchain. Test each public subpath from a consumer fixture and make incompatible imports fail deterministically.

## Adaptable file and export conventions

Use these as review heuristics only when they improve the target repository:

- prefer named exports for reusable modules and stable public subpaths;
- keep one primary runtime value per file unless colocating tightly coupled values is clearer;
- keep a type beside its primary value, moving shared types only when several owners need the same contract;
- import packages through declared entrypoints, while package-internal modules use the target's established local convention; and
- expose selected DTO fields rather than generated database rows, privileged SDK results, or framework context.

For example, a trusted adapter can map persistence output to a narrow contract without exporting the persistence module:

```ts
import "server-only";

export function toProjectDto(row: ProjectRow): ProjectDto {
  return { id: row.id, name: row.name, version: row.version };
}
```

Do not create a barrel solely to shorten an import. Keep one only when it is the tested public entrypoint, a runtime barrier, or a coherent locality boundary.

## Boundary review

- Search consumers for private package-source imports.
- Inspect client entrypoints for transitive trusted dependencies.
- Verify public DTOs do not expose credential, storage, or internal error details.
- Compare documented exports with the package manifest and generated declarations.
- Apply the deletion test to barrels and facades.
- Run focused browser/server builds or import-condition tests where the toolchain supports them.

## Official sources

- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js guidance for preventing environment poisoning](https://nextjs.org/docs/app/getting-started/server-and-client-components#preventing-environment-poisoning)
- [Node.js package entry points and exports](https://nodejs.org/api/packages.html#package-entry-points)
