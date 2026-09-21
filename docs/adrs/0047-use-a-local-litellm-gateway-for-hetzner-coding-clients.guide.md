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
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-09-21
Gist: Use official LiteLLM locally or an existing remote gateway, preserve configuration ownership, and verify provider, gateway, and clients separately.

Variants: [Short](0047-use-a-local-litellm-gateway-for-hetzner-coding-clients.short.md) · [Long, canonical](0047-use-a-local-litellm-gateway-for-hetzner-coding-clients.long.md) · **Guide**

This guide is non-normative. [Long](0047-use-a-local-litellm-gateway-for-hetzner-coding-clients.long.md) is authoritative.

## How to apply

Hetzner and coding clients do not necessarily share a wire protocol. LiteLLM owns adaptation. Existing gateways avoid a redundant local installation, but API-managed and config-managed routes have different owners.

- Local installation remains isolated, exactly pinned and loopback-only. Remote mode does not change this local exposure boundary.
- Remote plans inspect an explicitly selected management endpoint and preserve path prefixes and the deployed API version.
- Create or reuse API-managed routes; give a patch and instructions for declarative routes instead of overwriting them.
- Read back writes and verify inference separately. Reconcile ambiguous outcomes before retrying.
- Model discovery and client-specific tool/result flows determine compatibility; unsupported required semantics block stronger claims.

## Verification

- Exercise a real local and an existing remote gateway with the same discovered Hetzner model.
- Verify duplicate/conflicting aliases, config-owned models, missing storage prerequisites and ambiguous writes.
- Report transport, tool and client evidence separately.

## Follow-up

Implement and verify the approved [Hetzner setup specification](../specs/hetzner-inference-setup-skill-spec.md).

## Revisit

Create a reciprocal successor ADR when the accepted decision changes.
