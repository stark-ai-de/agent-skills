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
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0066
Superseded by: None
Guide verified: 2026-10-12
Gist: The skills repository bundles a reviewed immutable SSH runtime artifact while independent sources and lifecycle tests belong to the public SSH repository.

Variants: [Short](0070-consume-pinned-ssh-runtime-artifacts-from-an-independent-repository.short.md) · [Long, canonical](0070-consume-pinned-ssh-runtime-artifacts-from-an-independent-repository.long.md) · **Guide**

This guide is non-normative. Long is the authoritative decision.

## How to apply

Build and test committed producer sources, export their runtime, review its revision and manifest digest, then import it with `scripts/ssh/import-artifact.mjs`. Stage the approved consumer inputs before Git-index-dependent checks. Generate portable and native adapters from the verified artifact.

## Verification

Run `pnpm run validate:ssh`, projection/archive checks and the required repository aggregate and supply-chain gates. Native SSH lifecycle qualification belongs to the producer; consumer validation tests standalone bundled operation and rejected artifact mutations. Record unrun hosted gates separately.

## Revisit

Create a reciprocal successor when canonical ownership, public distribution or trust changes.
