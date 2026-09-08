# ADR-0048: Implement one portable Hetzner setup skill with client adapters

ID: ADR-0048
Title: Implement one portable Hetzner setup skill with client adapters
Status: Proposed
Date: 2026-08-26
Owner: stark-ai-de
Scope: repository
Category: stack-tooling
Tags: client-adapters, cross-platform, hetzner, node, portability, setup
Applies when: Implementing or changing the repository skill that configures Hetzner Inference for local coding clients.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-26
Gist: Keep one cross-platform setup workflow and isolate provider, gateway, client, credential, lifecycle, and operating-system differences behind explicit adapters.

Variants: **Short** · [Long, canonical](0048-implement-one-portable-hetzner-setup-skill-with-client-adapters.long.md) · [Guide](0048-implement-one-portable-hetzner-setup-skill-with-client-adapters.guide.md)

## Decision

The repository will implement one portable Agent Skill named `hetzner-inference-setup`, incubate it under `incubator/skills/engineering-workflows/`, and promote it only after evaluation and cross-platform evidence. Dependency-free Node.js `.mjs` helpers will orchestrate explicit provider, gateway, credential, lifecycle, host, and client adapters across Windows, macOS, Linux, and WSL. The skill will expose finite read-only and approved mutation workflows, automate only documented machine-readable configuration, use owned sidecars and manifests instead of replacing unrelated user state, and fail closed when a requested host or client contract cannot be verified.

## Context

The workflow spans three clients and four host modes, but provider discovery, gateway installation, credentials, lifecycle, evidence, and rollback are shared. Client and operating-system differences belong behind explicit adapters rather than copied skills or shell-specific implementations.

## Consequences

- Good: Users and agents learn one skill name, workflow set, manifest, and evidence model.
- Good: Approval, redaction, drift protection, and rollback cannot diverge between client variants.
- Tradeoff: The implementation must maintain adapter contracts and fixtures for every supported host and client.
- Risk: Client UI and configuration contracts can change; version-aware gates must block unsupported mutation and downgrade evidence.
