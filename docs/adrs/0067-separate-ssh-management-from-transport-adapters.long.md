# ADR-0067: Separate SSH management from transport adapters

ID: ADR-0067
Title: Separate SSH management from transport adapters
Status: Accepted
Date: 2026-10-11
Owner: stark-ai-de
Scope: repository
Category: backend
Tags: api, boundaries, ssh, typescript
Applies when: Embedding or extending the SSH management component.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-10-11
Gist: The SSH domain library owns behavior while the HTTP runtime and MCP bridge remain replaceable adapters.

Variants: [Short](0067-separate-ssh-management-from-transport-adapters.short.md) · **Long, canonical** · [Guide](0067-separate-ssh-management-from-transport-adapters.guide.md)

## Decision

The TypeScript SSH management library owns domain models, errors, authorization, credential access, connection and terminal lifecycles, jobs, files, tunnels and events. Its public contract uses domain types and AbortSignal and exposes versioned exports with declarations, without importing MCP, Fastify or HTTP request types. The SSH2 adapter is internal to this boundary. A separate local runtime embeds the library and provides a versioned HTTP/WebSocket API, OpenAPI contract and typed client. The MCP bridge calls that API and owns neither SSH connections, storage nor business rules. Applications may embed the library directly or share the runtime through the client. Architecture tests and an independent example consumer verify both directions of this dependency boundary.

## Why

The approved product requires reuse by non-agent applications. Putting MCP errors or HTTP actors in the domain would make that reuse fragile. Transport annotations do not implement permission policy.

## Options

- Chosen: the approved local reusable management design with explicit boundaries.
- Rejected: transport-owned policy or automatic privilege/trust escalation.

## Consequences

Independent consumers and target-specific packages can evolve without changing the SSH domain. Additional lifecycle and security tests are required. Native and publication evidence remain separate from architecture acceptance.

## Follow-up

Keep domain methods and errors independent of transport status codes. Test the library in an isolated consumer and reject MCP/Fastify imports there. Reject SSH2 or persistent-store imports in the bridge. Translate errors only at the runtime/bridge boundary.
