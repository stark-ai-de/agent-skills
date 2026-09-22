# ADR-0049: Separate Hetzner provider, management, and client credentials

ID: ADR-0049
Title: Separate Hetzner provider, management, and client credentials
Status: Accepted
Date: 2026-08-26
Owner: stark-ai-de
Scope: repository
Category: security-data
Tags: credentials, hetzner, least-privilege, litellm, local-gateway, secrets
Applies when: Reading, storing, transmitting, rotating or removing Hetzner and LiteLLM credentials.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-09-21
Gist: Keep provider, management, and client credentials separate, preserve protected storage, and disclose the distinct local and remote trust boundaries.

Variants: [Short](0049-separate-hetzner-provider-and-local-gateway-credentials.short.md) · [Long, canonical](0049-separate-hetzner-provider-and-local-gateway-credentials.long.md) · **Guide**

This guide is non-normative. [Long](0049-separate-hetzner-provider-and-local-gateway-credentials.long.md) is authoritative.

## How to apply

A provider token, remote administrator credential and inference key authorize different operations. Reusing management access in clients unnecessarily widens exposure. A remote environment reference is meaningful only on that server.

- Local protected files use machine-local roots, verified ownership/modes or Windows ACLs, and minimum child environments.
- Do not persist global environment state or shell-profile secrets; reject redirected credential paths.
- The local master key is administrative, never described as scoped. Remote inference credentials must be separate from management access.
- Remote provider secrets may be held by the selected server or referenced there; never claim a local environment variable provisions a remote secret.
- Redact errors and evidence. Never expose provider or management secrets in client/UI instructions.
- Rollback removes attributable configuration and preserves credentials; secret deletion is separate authority.

## Verification

- Test missing/unsafe sources, redaction, role confusion, remote secret reference mismatch and no-key manual mode.
- Verify local clients receive only the local gateway key and remote clients only their inference key.
- Check rotation and rollback preserve the promised ownership and secret boundaries.

## Follow-up

Implement and verify the approved [Hetzner setup specification](../specs/hetzner-inference-setup-skill-spec.md).

## Revisit

Create a reciprocal successor ADR when the accepted decision changes.
