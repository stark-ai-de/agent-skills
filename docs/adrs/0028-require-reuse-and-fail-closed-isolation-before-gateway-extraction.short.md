# ADR-0028: Preserve target contracts and gate gateway extraction

ID: ADR-0028
Title: Preserve target contracts and gate gateway extraction
Status: Accepted
Date: 2026-07-13
Owner: stark-ai-de
Scope: repository
Category: repository-architecture
Tags: host-adapter, gateway, isolation
Applies when: Splitting a portable skill or extracting a shared gateway.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: ADR-0026
Superseded by: None
Guide verified: 2026-07-28
Gist: Preserve target contracts; extract gateways only after reuse and isolation.

Variants: **Short** · [Long, canonical](0028-require-reuse-and-fail-closed-isolation-before-gateway-extraction.long.md) · [Guide](0028-require-reuse-and-fail-closed-isolation-before-gateway-extraction.guide.md)

## Decision

We will preserve target contracts across execution hosts, adapt only collaboration controls, rely on client and model discovery instead of a router, split skills only when target-specific contracts make both trigger and outcome materially distinct, and extract gateways only after a second independent consumer and fail-closed filesystem, process, tool, network, and environment isolation are proven.

## Context

- Skill descriptions are visible before skill bodies, so a router skill cannot guarantee activation.
- Reuse proves gateway demand, while isolation proves containment; both are required.

## Consequences

- Good: cross-host use stays predictable without portable-workflow copies.
- Tradeoff: owning skills retain adapters until both gateway proofs exist.
- Risk: reviews must name the consumers and isolation checks.
