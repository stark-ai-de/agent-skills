# ADR-0047: Use a local LiteLLM gateway for Hetzner coding clients

ID: ADR-0047
Title: Use a local LiteLLM gateway for Hetzner coding clients
Status: Proposed
Date: 2026-08-26
Owner: stark-ai-de
Scope: repository
Category: runtime-platform
Tags: claude-code, codex, cursor, hetzner, litellm, provider-routing
Applies when: Configuring a local coding client to use Hetzner Inference.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-26
Gist: Use an isolated, pinned loopback LiteLLM gateway as the default client boundary, with direct Hetzner calls reserved for discovery, probes, or an explicitly verified direct lane.

Variants: **Short** · [Long, canonical](0047-use-a-local-litellm-gateway-for-hetzner-coding-clients.long.md) · [Guide](0047-use-a-local-litellm-gateway-for-hetzner-coding-clients.guide.md)

## Decision

The repository will use an isolated, exactly pinned LiteLLM Proxy Server bound to loopback as the default workstation boundary between Hetzner Inference and Codex CLI, Claude Code, and Cursor standard chat. The workflow will discover models from Hetzner `/v1/models`, probe `/v1/chat/completions` directly before testing the gateway, expose each client through its verified API surface, and report provider, gateway, and client evidence separately. It will not ship a repository-owned protocol translator, hardcode a model catalog, silently bypass the gateway, or treat text transport as proof of tool or coding compatibility.

## Context

Hetzner currently exposes an experimental OpenAI-compatible Chat Completions API, while the target clients do not share one durable wire contract. Current Codex custom providers use Responses, Claude Code supports an Anthropic Messages gateway, and Cursor documents BYOK only for standard chat models. LiteLLM already owns the required protocol adaptation and avoids creating a repository-maintained gateway product.

## Consequences

- Good: One local alias, authentication boundary, lifecycle, and diagnostic path can serve the selected clients.
- Good: Provider inventory and capabilities are discovered and tested rather than copied into a static catalog.
- Tradeoff: The workstation must maintain an isolated Python environment and exact LiteLLM version.
- Risk: Translation can preserve text while losing tools, streaming, or state, so every client still requires independent evidence.
