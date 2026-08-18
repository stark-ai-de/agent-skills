# ADR-0043: Package portable Agent Plugins and separate client adapters

ID: ADR-0043
Title: Package portable Agent Plugins and separate client adapters
Status: Accepted
Date: 2026-08-18
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: agent-plugins, distribution, openai, packaging, portability
Applies when: Creating, publishing, validating, or adapting a repository-managed plugin package.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-18
Gist: Keep one portable Agent Plugins core and generate incompatible client package formats as separate adapters.

Variants: [Short](0043-package-portable-agent-plugins-and-separate-client-adapters.short.md) · [Long, canonical](0043-package-portable-agent-plugins-and-separate-client-adapters.long.md) · **Guide**

This guide is non-normative. The Long variant is the canonical decision.

## How to apply

1. Edit a skill only in its canonical `skills/<category>/<skill>/` directory.
2. Add or remove plugin membership only through the versioned bundle manifest and the required review/evaluation changes.
3. Generate `plugins/stark-ai-developer/` as the Agent Plugins projection. Its root manifest is `plugin.json`; skills are immediate children of `skills/`; portable fields stay within the Agent Plugins schema.
4. Generate `adapters/openai/stark-ai-developer/` as the OpenAI package. Keep `.codex-plugin/plugin.json`, OpenAI listing assets, and any other OpenAI-only files inside that adapter root.
5. Keep generated skill copies byte-identical to canonical sources and put provenance notices in package-level README or source-manifest files rather than modifying copied `SKILL.md` files.
6. Keep the existing `npx skills` catalog and category layout supported independently of plugin packaging.

## Verification

- Validate `bundles/codex.json` before materialization.
- Validate portable root `plugin.json` against Agent Plugins 1.0.0 and reject unknown core fields.
- Confirm portable skills are immediate `skills/<name>/SKILL.md` children and conform to the Agent Skills specification.
- Reject symlinks, special files, parent traversal, stale generated entries, duplicate names, and source paths outside public `skills/`.
- Compare generated trees and deterministic source hashes with their canonical sources in CI.
- Validate the OpenAI adapter using the current OpenAI package rules without weakening the portable validator.
- Verify the README's Codex install command is derived from the same bundle membership.

## Revisit

Create a successor ADR when Agent Plugins publishes a materially incompatible specification version, OpenAI natively accepts the portable root format, a backend/MCP/authentication layer is introduced, or another client adapter requires a change to the canonical ownership model.
