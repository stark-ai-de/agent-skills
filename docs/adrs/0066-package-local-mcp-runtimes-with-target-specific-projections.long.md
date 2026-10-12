# ADR-0066: Package local MCP runtimes with target-specific projections

ID: ADR-0066
Title: Package local MCP runtimes with target-specific projections
Status: Superseded
Date: 2026-10-11
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: agent-plugins, distribution, mcp, packaging
Applies when: Generating runtime-bearing portable or native plugin packages.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: ADR-0043
Superseded by: ADR-0070
Guide verified: 2026-10-11
Gist: Explicit target membership preserves portable ownership while local MCP runtimes and native adapters are generated from canonical packages.

Variants: [Short](0066-package-local-mcp-runtimes-with-target-specific-projections.short.md) · **Long, canonical** · [Guide](0066-package-local-mcp-runtimes-with-target-specific-projections.guide.md)

## Decision

Repository-managed plugins retain the Agent Plugins 1.0.0 portable root contract, canonical skills under skills/, explicit versioned membership in plugins/stark-ai-developer.source.json, and committed generated portable projections. Canonical runtime sources live in workspace packages. Local MCP membership, runtime files and descriptions are explicitly selected per distribution target: the portable local plugin and the Claude-native adapter include the SSH management bridge and its runtime, while the existing public OpenAI-native archive remains skills-only. Native layouts are generated only for targets requiring them, into disposable staging and archives; adapters/ is never committed. Canonical skill-local metadata is copied byte-for-byte without overlays. Each target validates independently, uses deterministic explicit build inputs, records source and dependency provenance, and installs no dependencies at server startup. The repository marketplace continues to target the portable projection. Membership, release identity and public listing copy retain separate canonical owners.

## Why

The maintainer explicitly approved implementing the runtime-bearing V1 on 2026-10-11. ADR-0043 names backend/MCP/auth ownership as a successor trigger. This successor preserves its portable, canonical-skill, metadata, marketplace, isolation and deterministic-generation invariants while adding explicit runtime ownership and distribution-specific membership. A local stdio server and the public OpenAI submission have different transport and publication requirements.

## Options

- Chosen: the approved local reusable management design with explicit boundaries.
- Rejected: transport-owned policy or automatic privilege/trust escalation.

## Consequences

Independent consumers and target-specific packages can evolve without changing the SSH domain. Additional lifecycle and security tests are required. Native and publication evidence remain separate from architecture acceptance.

## Follow-up

Generate only from canonical source membership. Build the runtime before packaging. Verify portable mcp.json, Claude .mcp.json and .claude-plugin/plugin.json independently, and assert the OpenAI archive contains no MCP/runtime. Compare two archives and inspect dependency license/provenance inputs.

Current ownership and artifact distribution are governed by [ADR-0070](0070-consume-pinned-ssh-runtime-artifacts-from-an-independent-repository.long.md). The historical decision above is unchanged.
