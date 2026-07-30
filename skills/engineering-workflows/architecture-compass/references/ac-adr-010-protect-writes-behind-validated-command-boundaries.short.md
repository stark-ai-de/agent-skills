# AC-ADR-010: Protect Writes Behind Validated Command Boundaries

ID: AC-ADR-010
Title: Protect Writes Behind Validated Command Boundaries
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: frontend
Tags: writes, commands, server-actions, http, validation, authentication, authorization
Applies when: Browser interaction, webhook, external client, or integration mutates trusted state.
Adoptable: true
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Every mutation crosses a validated, authenticated, authorized command boundary before trusted state changes.

Variants: **Short** · [Long, canonical](ac-adr-010-protect-writes-behind-validated-command-boundaries.long.md) · [Guide](ac-adr-010-protect-writes-behind-validated-command-boundaries.guide.md)

## Decision summary

- Treat Server Actions, Route Handlers, RPC procedures, webhooks, jobs, and message consumers as reachable mutation entrypoints, not trusted shortcuts.
- Parse untrusted input with a real schema before constructing a command. Authentication alone is insufficient: authorize the action and affected object or tenant inside the trusted boundary.
- Put business invariants and state changes in a command service that receives plain typed input and explicit dependencies. Framework adapters remain thin.
- Return a small typed result or an intentionally sanitized error. Never expose raw database, provider, stack, or secret-bearing failures.
- Choose Server Actions for React-owned interactions; choose HTTP or messages when non-React clients, webhooks, independent protocol semantics, or asynchronous delivery require them.
- Define transaction, idempotency, concurrency, side-effect ordering, cache invalidation, and audit requirements for each command.
- Client optimistic updates are provisional. Reconcile them with the authoritative result and recover safely from rejection or conflict.

Apply [AC-ADR-019](ac-adr-019-apply-security-and-privacy-controls-at-every-trust-boundary.short.md) ([Long, canonical](ac-adr-019-apply-security-and-privacy-controls-at-every-trust-boundary.long.md) · [Guide](ac-adr-019-apply-security-and-privacy-controls-at-every-trust-boundary.guide.md)) to the trust boundary and [AC-ADR-020](ac-adr-020-define-data-ownership-tenancy-retention-and-deletion-before-access-paths.short.md) ([Long, canonical](ac-adr-020-define-data-ownership-tenancy-retention-and-deletion-before-access-paths.long.md) · [Guide](ac-adr-020-define-data-ownership-tenancy-retention-and-deletion-before-access-paths.guide.md)) to data ownership.
