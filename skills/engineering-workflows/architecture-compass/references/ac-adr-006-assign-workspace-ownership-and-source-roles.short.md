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
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Give each deployable and source role one clear owner and extract shared packages only for proven boundaries.

Variants: **Short** · [Long, canonical](ac-adr-006-assign-workspace-ownership-and-source-roles.long.md) · [Guide](ac-adr-006-assign-workspace-ownership-and-source-roles.guide.md)

## Decision summary

Each deployable owns its entrypoints, app-specific composition, integrations, configuration boundary, and product behavior. Source files are placed by role—framework entrypoint, React component, hook, non-React module, trusted server module, adapter, service, infrastructure, test, generated output, or documentation—so ownership is inferable without reading implementation details.

Code moves into a shared package only for a demonstrated second consumer, a stable cross-owner contract, or an intentional public boundary. Empty future apps, packages, services, and source-role folders are not created speculatively.

## Read next

Read the [Long variant](ac-adr-006-assign-workspace-ownership-and-source-roles.long.md) when planning placement or moving ownership. Use the [Guide](ac-adr-006-assign-workspace-ownership-and-source-roles.guide.md) for a placement map and adaptable example layout.
