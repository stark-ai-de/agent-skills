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
Variant: Guide
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Every mutation crosses a validated, authenticated, authorized command boundary before trusted state changes.

Variants: [Short](ac-adr-010-protect-writes-behind-validated-command-boundaries.short.md) · [Long, canonical](ac-adr-010-protect-writes-behind-validated-command-boundaries.long.md) · **Guide**

## Implementation guide

This guide is non-normative. Verify the APIs supported by the target repository.

### Suggested shape

Keep a route-local `actions.ts` as a small adapter. Parse with the repository's adopted schema library, resolve the authenticated principal, then call a server-only command such as `renameProject({ actor, projectId, expectedVersion, name })`. The command re-loads authorization-relevant state and checks ownership or capability inside the trusted transaction.

For Next.js, perform authentication and authorization inside every Server Action even when the page itself is protected. Use `revalidatePath`, `revalidateTag`, or client-query invalidation only after the command succeeds and only for affected identities. Redirect and framework control-flow errors should not be caught and rewrapped as ordinary failures.

`next-safe-action` can standardize schema parsing and typed action results in repositories that choose it. It is an adapter convenience, not an authorization system and not a reason to bypass the command layer. For webhooks, verify the raw-body signature and replay window before schema parsing and command dispatch.

### Result and failure model

Return discriminated results for expected failures, for example `validation`, `forbidden`, `conflict`, or `not-found`, only where revealing that distinction is safe. Map unexpected failures to a correlation ID and generic user message. Log sanitized technical context on the server.

Prefer database constraints for uniqueness and integrity, transactions for coupled writes, version columns or conditional updates for concurrency, and an outbox/durable workflow for non-transactional external effects. Persist idempotency results when the transport can redeliver.

### Suggested tests

- Unit-test the command's business invariants with explicit dependencies.
- Integration-test persistence constraints, transaction rollback, object-level authorization, and idempotency.
- Contract-test each transport's schema, safe error mapping, and status/result behavior.
- Exercise a critical user journey including optimistic update rollback and retry.

## Official sources

- [Next.js: Mutating data](https://nextjs.org/docs/app/getting-started/mutating-data)
- [Next.js: Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend)
- [Next.js: Updating data](https://nextjs.org/docs/app/getting-started/updating-data)
- [OWASP: Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP: Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
