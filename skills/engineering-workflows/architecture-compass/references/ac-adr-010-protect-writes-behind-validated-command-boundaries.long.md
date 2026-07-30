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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Every mutation crosses a validated, authenticated, authorized command boundary before trusted state changes.

Variants: [Short](ac-adr-010-protect-writes-behind-validated-command-boundaries.short.md) · **Long, canonical** · [Guide](ac-adr-010-protect-writes-behind-validated-command-boundaries.guide.md)

## Context

Mutations arrive through different transports, but each can change trusted state or trigger external effects. Server-only syntax does not make a callable endpoint safe. Duplicating validation and authorization across UI, HTTP, and jobs creates drift; allowing adapters to own business behavior makes retries, transactions, and auditing inconsistent.

## Decision

### Use one trusted command boundary

Every state change is represented as a command with an explicit actor or system principal, target scope, input contract, intended effect, and result contract. A domain/application command handler owns business invariants. Server Actions, Route Handlers, RPC adapters, queue consumers, scheduled jobs, and webhook handlers only translate their transport into that command and translate the result back.

The command boundary must:

1. parse untrusted input with a schema that rejects unknown or malformed states as appropriate;
2. authenticate the caller or establish a narrowly scoped system identity;
3. authorize the requested action against the affected object, tenant, capability, and current state;
4. enforce domain invariants independently of the UI;
5. perform state changes with documented transaction and concurrency semantics;
6. order or durably record external side effects so partial failure is recoverable;
7. return a typed, minimal, sanitized result;
8. emit audit or observability events when the risk or product contract requires them.

Client-supplied identifiers, roles, prices, ownership, or completion flags are claims to verify, never authority. Authentication middleware does not replace command-level authorization.

### Select transport by consumer

- Use a Server Action when a React/Next.js interaction benefits from framework form or mutation integration and no independent public protocol is needed.
- Use an HTTP endpoint for external or non-React clients, webhooks, standard status/header semantics, independent versioning, or separately cacheable/readable resources.
- Use a message or job boundary for asynchronous work, but preserve the same command validation and authorization or system-principal policy.

Transport choice does not weaken the invariants. A Server Action is still directly invokable by a client that can address it. A private TypeScript type is not runtime validation.

### Make retries and client state safe

Commands that may be retried define an idempotency key, natural uniqueness constraint, operation token, or an explicit reason why duplicates are safe. Concurrent updates define conflict behavior rather than silently overwriting protected state. External effects are coupled by a recoverable pattern such as an outbox, durable job, or provider idempotency token where atomic execution is impossible.

After success, update or invalidate only affected cache identities. Optimistic UI represents pending intent, rolls back or reconciles on failure, and never becomes authorization evidence. Error results distinguish expected validation/conflict states from sanitized unexpected failure without returning provider or database internals.

## Consequences

All transports share one policy and are testable without a framework request. More explicit command/result types and idempotency work are required, but duplicated mutation logic and security drift decrease.

## Validation

- Test malformed input, unauthenticated access, cross-object and cross-tenant access, stale state, duplicate delivery, and concurrent writes.
- Verify the adapter cannot bypass the command handler for the same mutation.
- Prove rollback or recovery when persistence succeeds but an external side effect fails, and vice versa.
- Assert errors and logs do not expose secrets or raw infrastructure details.
- Test cache invalidation and optimistic rollback using the authoritative response.
