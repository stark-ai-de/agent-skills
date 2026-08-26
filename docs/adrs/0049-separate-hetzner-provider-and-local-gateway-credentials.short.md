# ADR-0049: Separate Hetzner provider and local gateway credentials

ID: ADR-0049
Title: Separate Hetzner provider and local gateway credentials
Status: Proposed
Date: 2026-08-26
Owner: stark-ai-de
Scope: repository
Category: security-data
Tags: credentials, hetzner, least-privilege, litellm, local-gateway, secrets
Applies when: Storing, launching, exposing, rotating, or removing credentials for the local Hetzner Inference gateway.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-26
Gist: Keep the upstream token behind the gateway, use a protected machine-local administrative gateway key, bind to loopback, and make rotation and cleanup explicit.

Variants: **Short** · [Long, canonical](0049-separate-hetzner-provider-and-local-gateway-credentials.long.md) · [Guide](0049-separate-hetzner-provider-and-local-gateway-credentials.guide.md)

## Decision

The Hetzner setup skill will keep the upstream Hetzner token and local LiteLLM master key as separate secrets; store neither value in repositories, generated client profiles, command arguments, logs, shell startup files, roaming profiles, or global environment state; and bind the gateway to loopback by default. The portable baseline will use protected machine-local per-user secret files, inject values only into the minimum child environment, verify host-specific permissions before use, redact all evidence, preserve credentials during ordinary rollback, and describe the database-free LiteLLM master key as an administrative gateway credential rather than a scoped client key.

## Context

The provider token grants upstream Hetzner access, while the database-free LiteLLM master key administrates the local proxy. Reusing the provider token in clients would unnecessarily expose the stronger credential. Calling the local key scoped would also be misleading because LiteLLM virtual keys require database-backed key management, which is outside the workstation baseline.

## Consequences

- Good: Clients never receive the upstream token, and both credentials can rotate independently.
- Good: Secrets stay in machine-local storage rather than roaming profiles, repositories, generated config, or shell history.
- Tradeoff: Selected clients receive an administrative key to a loopback-only proxy instead of per-client least-privilege keys.
- Risk: Processes running as the same operating-system user can still read per-user secrets; permissions and minimal exposure reduce but do not remove that risk.
