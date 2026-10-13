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
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0043
Superseded by: ADR-0070
Guide verified: 2026-10-11
Gist: Explicit target membership preserves portable ownership while local MCP runtimes and native adapters are generated from canonical packages.

Variants: [Short](0066-package-local-mcp-runtimes-with-target-specific-projections.short.md) · [Long, canonical](0066-package-local-mcp-runtimes-with-target-specific-projections.long.md) · **Guide**

This guide is non-normative. [Long](0066-package-local-mcp-runtimes-with-target-specific-projections.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

Generate only from canonical source membership. Build the runtime before packaging. Verify portable mcp.json, Claude .mcp.json and .claude-plugin/plugin.json independently, and assert the OpenAI archive contains no MCP/runtime. Compare two archives and inspect dependency license/provenance inputs.

## Verification

Run `pnpm run test:ssh` and the changed projection checks. Acceptance of the architecture is not test evidence or publication authorization. Record unrun native-host and operating-system gates explicitly.

## Revisit

Create a successor when the ownership or security boundary changes, with reciprocal metadata.

Current ownership and artifact distribution are governed by [ADR-0070](0070-consume-pinned-ssh-runtime-artifacts-from-an-independent-repository.long.md). The historical decision above is unchanged.
