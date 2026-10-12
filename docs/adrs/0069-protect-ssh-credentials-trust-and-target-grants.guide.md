# ADR-0069: Protect SSH credentials, trust and target grants

ID: ADR-0069
Title: Protect SSH credentials, trust and target grants
Status: Accepted
Date: 2026-10-11
Owner: stark-ai-de
Scope: repository
Category: security-data
Tags: authorization, credentials, host-trust, ssh
Applies when: Authenticating SSH targets or exposing management actions.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-10-11
Gist: Credentials, explicit host trust and per-target human grants are shared policy across every access path.

Variants: [Short](0069-protect-ssh-credentials-trust-and-target-grants.short.md) · [Long, canonical](0069-protect-ssh-credentials-trust-and-target-grants.long.md) · **Guide**

This guide is non-normative. [Long](0069-protect-ssh-credentials-trust-and-target-grants.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

Exercise denied access through the library, HTTP, WebSocket and MCP. Test wrong passwords, vault tampering/record swapping, restore rollback, revoked keys, jump-key changes and concurrent profile edits. Confirm vault lock does not kill an existing channel. Keep optional encrypted recordings bounded and disabled by default.

## Verification

Run `pnpm run test:ssh` and the changed projection checks. Acceptance of the architecture is not test evidence or publication authorization. Record unrun native-host and operating-system gates explicitly.

## Revisit

Create a successor when the ownership or security boundary changes, with reciprocal metadata.
