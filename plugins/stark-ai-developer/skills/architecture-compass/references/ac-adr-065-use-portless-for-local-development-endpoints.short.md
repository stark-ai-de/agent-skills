# AC-ADR-065: Use Portless for Local Development Endpoints

ID: AC-ADR-065
Title: Use Portless for Local Development Endpoints
Status: Accepted
Date: 2026-09-25
Owner: stark-ai-de
Scope: target-repository
Category: stack-tooling
Tags: portless, local-development, https, endpoints, worktrees, migration
Applies when: Establishing, reviewing or changing local HTTP or WebSocket development endpoints, including single apps, monorepos and parallel worktrees.
Adoptable: true
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-09-25
Gist: Default compatible local development endpoints to Portless and HTTPS, migrate existing routing through authorized changes, and document evidence-backed exceptions.

Variants: **Short** · [Long, canonical](ac-adr-065-use-portless-for-local-development-endpoints.long.md) · [Guide](ac-adr-065-use-portless-for-local-development-endpoints.guide.md)

## Decision summary

Repositories adopting this decision use Portless as the default entrypoint for
compatible local HTTP/WebSocket development servers, with HTTPS as the normal
target. This includes one app, multiple services and concurrent worktrees,
regardless of application language. No relevant local endpoint means not
applicable; production and CI routing are separate decisions.

Migrate existing routing, including equivalent solutions, at the next suitable
authorized development change. Equivalent behavior alone is not a permanent
exception. Technical exceptions and temporary HTTP/direct-launch fallbacks need
scope, evidence, an owner and a revisit trigger. Preserve accepted target ADRs;
resolve conflicts through accepted adaptation or succession before migration.

Use the normal project development command, retain a documented direct launch
path, and prove assigned-port wiring, service/worktree identity, collision
handling, browser/client trust and required WebSocket/HMR/auth behavior. Keep
toolchain ownership and runtime evidence; neither Bun compatibility nor a Node
fallback is automatic. Host provisioning and exposure changes require their
own applicable authority. Setup adoption does not itself authorize installation
or source migration, and audit remains read-only.

## Consequences

Stable development URLs reduce accidental wrong-app testing and routing drift.
Compatibility qualification and existing-routing migration add work; documented
exceptions preserve usable development until prerequisites are met.
