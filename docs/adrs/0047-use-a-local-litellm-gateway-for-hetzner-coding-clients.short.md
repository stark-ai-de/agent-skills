# ADR-0047: Use LiteLLM gateways for Hetzner coding clients

ID: ADR-0047
Title: Use LiteLLM gateways for Hetzner coding clients
Status: Accepted
Date: 2026-08-26
Owner: stark-ai-de
Scope: repository
Category: runtime-platform
Tags: claude-code, codex, cursor, hetzner, litellm, provider-routing
Applies when: Connecting Hetzner Inference through a local or existing remote LiteLLM gateway.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-09-21
Gist: Use official LiteLLM locally or an existing remote gateway, preserve configuration ownership, and verify provider, gateway, and clients separately.

Variants: **Short** · [Long, canonical](0047-use-a-local-litellm-gateway-for-hetzner-coding-clients.long.md) · [Guide](0047-use-a-local-litellm-gateway-for-hetzner-coding-clients.guide.md)

## Decision

The repository will use the official LiteLLM Proxy as the protocol boundary for Hetzner Inference and optional Codex CLI, Claude Code, and Cursor standard-chat clients. Local setup uses an isolated, exactly pinned loopback proxy; remote setup configures an explicitly selected existing gateway through its verified management contract. Discover provider models live, preserve API/database versus declarative configuration ownership, and report provider, gateway, and client evidence separately. Do not implement a custom protocol translator, hardcode a model catalog, provision remote infrastructure, or treat text transport as proof of tool or coding compatibility.

## Context

Hetzner and coding clients do not necessarily share a wire protocol. LiteLLM owns adaptation. Existing gateways avoid a redundant local installation, but API-managed and config-managed routes have different owners.

## Consequences

- Benefit: clear target, ownership and evidence boundaries.
- Tradeoff: installed versions and operating systems require current verification.
- Risk: provider and client contracts may change; unsupported paths must remain visibly unverified or blocked.

## Follow-up

Implement and verify the approved [Hetzner setup specification](../specs/hetzner-inference-setup-skill-spec.md).

## Revisit

Create a reciprocal successor ADR when the accepted decision changes.
