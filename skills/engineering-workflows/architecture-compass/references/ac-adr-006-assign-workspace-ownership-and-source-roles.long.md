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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Give each deployable and source role one clear owner and extract shared packages only for proven boundaries.

Variants: [Short](ac-adr-006-assign-workspace-ownership-and-source-roles.short.md) · **Long, canonical** · [Guide](ac-adr-006-assign-workspace-ownership-and-source-roles.guide.md)

## Context

Repositories accumulate confusing placement when the first caller determines ownership, every reusable-looking helper becomes a package, or framework entrypoints absorb product logic. Agents then spend time researching local conventions, touch unrelated files, and create competing abstractions. A fixed folder tree is not portable across all stacks, but explicit ownership and source roles are.

## Decision

The repository assigns every deployable app or service one owner boundary. That boundary owns its framework or process entrypoints, app-specific composition, product screens and workflows, local adapters, local configuration contract, and integrations that no other real consumer shares.

Workspace packages are created only for one of these reasons:

- at least two real owners consume the same coherent capability;
- a stable cross-owner domain or protocol contract needs an independent lifecycle;
- a deliberate public package or tooling boundary requires controlled exports;
- a runtime-specific shared facility has multiple compatible consumers.

Potential future reuse is insufficient. App-specific policy remains with the app even when a helper could be made generic.

Within each owner, files are classified and placed by their primary source role:

- framework or process entrypoint;
- React component or other view implementation;
- framework hook or stateful UI integration;
- browser-safe or runtime-neutral domain module;
- trusted server-only module;
- query, command, or protocol contract;
- adapter, service, or runtime composition;
- infrastructure or deployment artifact;
- test, fixture, generated file, or documentation.

Framework-reserved files remain thin and delegate product behavior to the owning component, service, or module. React component directories contain component implementations rather than unrelated registries, validators, constants, or persistence logic. Non-React behavior lives in an appropriate module boundary. Generated sources and infrastructure artifacts are visibly separated from hand-written application runtime code.

Local naming and existing accepted conventions determine exact folder names. The repository records exceptions that improve locality or preserve a real framework boundary; it does not create one-file folders, pass-through layers, or empty workspace units merely to match an example tree.

Before a new implementation, the agent produces a placement map that names each file, owner, source role, runtime audience, callers, and reason. A refactor moves ownership in behavior-preserving vertical slices and updates all affected imports and contracts within the approved slice.

## Invariants

- Every source file has one primary owner and role.
- A route, bootstrap, manifest, or other framework entrypoint does not become the owner of reusable product behavior.
- Shared packages are app-agnostic within their declared responsibility.
- Ownership follows the deployable or stable contract, not whichever folder was easiest to reach.
- Empty speculative units and abstractions are avoided.
- Infrastructure and generated outputs are distinguishable from hand-written runtime source.
- Existing accepted target-repository structure wins over this generic shape unless the guardrail is explicitly adapted or a successor decision changes it.

## Conflict resolution

When two owners claim a module, prefer the owner of the business capability or stable contract rather than the most frequent caller. If sharing would introduce app-specific configuration, framework imports, or a broader public surface, keep separate app-owned implementations until a coherent interface exists. When a framework requires a specific file location, keep the entrypoint there and delegate owned behavior rather than relocating the framework file.

## Failure handling

If ownership or runtime audience is unresolved, do not create the file in a generic shared folder. Keep the change in the narrowest existing owner or stop for a placement decision when that choice would create a durable boundary. During moves, stop if callers, generated inputs, deployment paths, or public contracts fall outside the approved slice; expand scope only through a new approval.

## Acceptance criteria

- A placement map can assign every changed file one owner and source role.
- Framework entrypoints remain thin in a representative route or process path.
- Every shared package has a documented second consumer, stable contract, public boundary, or multi-consumer runtime role.
- No new empty app, package, service, or ceremonial one-file layer is introduced.
- Components, non-React modules, infrastructure, and generated files are separated according to their roles.
- Focused tests and imports still resolve after any ownership move.

## Consequences

Some duplication remains app-local until a real shared contract appears, and placement maps add a small planning cost. The repository gains predictable navigation, clearer review ownership, and smaller implementation slices with fewer speculative abstractions.
