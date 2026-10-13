# ADR-0070: Consume pinned SSH runtime artifacts from an independent repository

ID: ADR-0070
Title: Consume pinned SSH runtime artifacts from an independent repository
Status: Accepted
Date: 2026-10-12
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: agent-plugins, distribution, mcp, packaging
Applies when: Importing or projecting externally owned SSH runtime artifacts.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: ADR-0066
Superseded by: None
Guide verified: 2026-10-12
Gist: The skills repository bundles a reviewed immutable SSH runtime artifact while independent sources and lifecycle tests belong to the public SSH repository.

Variants: [Short](0070-consume-pinned-ssh-runtime-artifacts-from-an-independent-repository.short.md) · **Long, canonical** · [Guide](0070-consume-pinned-ssh-runtime-artifacts-from-an-independent-repository.guide.md)

## Decision

Canonical SSH management sources belong to the independent public stark-ai-de/ssh-manager repository. This skills repository consumes one explicitly reviewed runtime artifact pinned by runtime version, public producer repository, full source commit and manifest SHA-256. The manifest inventories every payload file by path, size and digest; validation rejects mutated, missing, extra or unsafe files, symlinks and special files before projection. Normal plugin generation is offline and does not rebuild SSH sources or install dependencies at server startup. Preserve the portable root contract, canonical skill bytes, explicit per-target membership, committed generated portable projection, disposable native adapters, deterministic provenance and independent target checks. Portable and Claude-native packages include the SSH MCP, daemon, CLI and viewer; the existing OpenAI archive remains skills-only. SSH library, API/runtime and MCP boundaries, local session ownership and credential/trust/target-grant rules remain governed by ADR-0067, ADR-0068 and ADR-0069. Runtime updates are explicit artifact imports; consumer snapshots and projections are generated distribution inputs, never second canonical implementations.

## Why

The maintainer approved the complete independent-repository migration on 2026-10-12. The standalone MCP continues to ship its runtime. Moving source ownership prevents coupling infrastructure maintenance to the skills catalog while retaining a reviewed offline distribution boundary. ADR-0066 is superseded without changing its historical decision text.

## Consequences

A producer revision and complete payload are reviewed together. The consumer owns artifact verification and projections; the producer owns SSH implementation, compatibility and native lifecycle tests. Acceptance is not test, merge or release evidence.

## Options

Chosen: one independent source owner and pinned distribution snapshots. Rejected: duplicate canonical sources, mutable latest inputs, sibling checkout dependencies and MCP requiring Mechas.

## Follow-up

Keep source and artifact identities distinct, verify exact file inventories and preserve existing OS-local state when upgrading installations. No merge or release is authorized by this ADR alone.
