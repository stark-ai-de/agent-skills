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
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-10-11
Gist: The SSH domain library owns behavior while the HTTP runtime and MCP bridge remain replaceable adapters.

Variants: **Short** · [Long, canonical](0067-separate-ssh-management-from-transport-adapters.long.md) · [Guide](0067-separate-ssh-management-from-transport-adapters.guide.md)

## Decision

The TypeScript SSH management library owns domain models, errors, authorization, credential access, connection and terminal lifecycles, jobs, files, tunnels and events. Its public contract uses domain types and AbortSignal and exposes versioned exports with declarations, without importing MCP, Fastify or HTTP request types. The SSH2 adapter is internal to this boundary. A separate local runtime embeds the library and provides a versioned HTTP/WebSocket API, OpenAPI contract and typed client. The MCP bridge calls that API and owns neither SSH connections, storage nor business rules. Applications may embed the library directly or share the runtime through the client. Architecture tests and an independent example consumer verify both directions of this dependency boundary.

## Context

The approved product requires reuse by non-agent applications. Putting MCP errors or HTTP actors in the domain would make that reuse fragile. Transport annotations do not implement permission policy.

## Consequences

The SSH domain library owns behavior while the HTTP runtime and MCP bridge remain replaceable adapters. Acceptance does not imply successful tests, installation or publication.
