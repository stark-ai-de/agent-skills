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
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-09-21
Gist: Keep provider, management, and client credentials separate, preserve protected storage, and disclose the distinct local and remote trust boundaries.

Variants: **Short** · [Long, canonical](0049-separate-hetzner-provider-and-local-gateway-credentials.long.md) · [Guide](0049-separate-hetzner-provider-and-local-gateway-credentials.guide.md)

## Decision

The Hetzner setup skill will keep the provider token, gateway management credential and client inference credential distinct. The database-free local baseline uses a separate protected administrative LiteLLM master key on loopback and discloses its scope; remote clients never receive the remote management key. Read only authorized protected credential sources, transmit provider credentials only to the selected authenticated remote gateway over encrypted transport, and distinguish remote secret references from local sources. Keep values out of command arguments, logs, plans, receipts, client configuration, repositories and automatic backups. Preserve credentials during ordinary rollback and leave manual-mode credential entry to the user.

## Context

A provider token, remote administrator credential and inference key authorize different operations. Reusing management access in clients unnecessarily widens exposure. A remote environment reference is meaningful only on that server.

## Consequences

- Benefit: clear target, ownership and evidence boundaries.
- Tradeoff: installed versions and operating systems require current verification.
- Risk: provider and client contracts may change; unsupported paths must remain visibly unverified or blocked.

## Follow-up

Implement and verify the approved [Hetzner setup specification](../specs/hetzner-inference-setup-skill-spec.md).

## Revisit

Create a reciprocal successor ADR when the accepted decision changes.
