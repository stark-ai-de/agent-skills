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
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-10-11
Gist: The SSH domain library owns behavior while the HTTP runtime and MCP bridge remain replaceable adapters.

Variants: [Short](0067-separate-ssh-management-from-transport-adapters.short.md) · [Long, canonical](0067-separate-ssh-management-from-transport-adapters.long.md) · **Guide**

This guide is non-normative. [Long](0067-separate-ssh-management-from-transport-adapters.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

Keep domain methods and errors independent of transport status codes. Test the library in an isolated consumer and reject MCP/Fastify imports there. Reject SSH2 or persistent-store imports in the bridge. Translate errors only at the runtime/bridge boundary.

## Verification

Run `pnpm run test:ssh` and the changed projection checks. Acceptance of the architecture is not test evidence or publication authorization. Record unrun native-host and operating-system gates explicitly.

## Revisit

Create a successor when the ownership or security boundary changes, with reciprocal metadata.
