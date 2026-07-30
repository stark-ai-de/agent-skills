# AC-ADR-006: Assign Workspace Ownership and Source Roles

ID: AC-ADR-006
Title: Assign Workspace Ownership and Source Roles
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: repository-architecture
Tags: workspace, ownership, source-roles
Applies when: A repository creates or changes apps, packages, source folders, file placement, or shared-code ownership.
Adoptable: true
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Give each deployable and source role one clear owner and extract shared packages only for proven boundaries.

Variants: [Short](ac-adr-006-assign-workspace-ownership-and-source-roles.short.md) · [Long, canonical](ac-adr-006-assign-workspace-ownership-and-source-roles.long.md) · **Guide**

> Non-normative implementation guidance. The Long variant is authoritative.

## Placement map

Before creating or moving files, use a table like this:

| Planned path                                                   | Owner          | Source role          | Runtime audience | Callers        | Why here               |
| -------------------------------------------------------------- | -------------- | -------------------- | ---------------- | -------------- | ---------------------- |
| `apps/<web-app>/src/app/<route>/page.tsx`                      | web app        | framework entrypoint | server           | router         | required route file    |
| `apps/<web-app>/src/components/<feature>/<feature>-screen.tsx` | web app        | component            | server or shared | route          | product composition    |
| `packages/<domain-core>/src/<contract>.ts`                     | domain package | contract             | runtime-neutral  | web and worker | stable shared contract |

If the `Callers` column has only one app and no independent public contract, start app-local. Extract later with focused proof rather than predicting reuse.

## Adaptable workspace shape

```text
apps/
  <web-app>/
  <backend-service>/
  <docs-app>/
packages/
  ui/
  <domain-core>/
  <tooling>/
```

Create only selected, owned units. A small repository may correctly contain one app and no packages.

Within a Next.js app, a useful starting distinction is:

```text
src/app/          # framework entrypoints
src/components/   # React implementations
src/hooks/        # substantial React hooks
src/lib/          # non-React app modules
```

Introduce more specific folders only when the selected runtime and actual files require them. Keep framework metadata and fallback files thin; move reusable fallback UI to components.

## Source-role examples

Use role-specific folders only when the repository has enough files to make the distinction useful:

```text
src/lib/queries/         # browser-safe read contracts, keys, and client options
src/lib/search-params/   # URL parsing and serialization, not domain persistence
src/lib/server-only/     # trusted reads, privileged clients, and server adapters
src/generated/           # generated runtime sources, visibly marked and reproducible
infra/ | deploy/ | ops/  # deployment ownership outside hand-written runtime source
```

Generated database types stay private to the persistence adapter unless a deliberately smaller DTO is part of a public contract. App-local deployment manifests may remain under the owning app, but keep them outside `src/` and document the generator, inputs, owner, and regeneration command.

When target conventions require an exception, record a small allowlist:

| Path     | Reason                                | Owner     | Removal condition        |
| -------- | ------------------------------------- | --------- | ------------------------ |
| `<path>` | `<framework or migration constraint>` | `<owner>` | `<observable condition>` |

An allowlist explains a real exception; it is not a substitute for classifying new files.

## Extraction test

Before moving code to a package, ask:

- Are there two current consumers with the same semantics?
- Can the package API avoid app-local aliases, configuration, and framework lifecycle?
- Is ownership clearer after extraction?
- Can each consumer validate the contract independently?
- Does the package need a release or compatibility boundary?

A “no” does not forbid future extraction; it suggests app-local ownership for the current slice.

## Official sources

- [Next.js project structure](https://nextjs.org/docs/app/getting-started/project-structure)
- [pnpm workspace documentation](https://pnpm.io/workspaces)
- [Node.js packages and entry points](https://nodejs.org/api/packages.html)
