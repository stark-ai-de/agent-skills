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
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-18
Gist: Make Agent Plugins the canonical package projection and generate a separate client adapter only when a target surface cannot consume that projection or requires client-native files.

Variants: **Short** · [Long, canonical](0043-package-portable-agent-plugins-and-separate-client-adapters.long.md) · [Guide](0043-package-portable-agent-plugins-and-separate-client-adapters.guide.md)

## Decision

Repository-managed plugins will use Agent Plugins 1.0.0 as the canonical portable package contract. Canonical skills remain under `skills/<category>/<skill>/`; `bundles/codex.json` is the only membership source; and `plugins/stark-ai-developer/` is a deterministic, committed projection with root `plugin.json` and immediate `skills/<name>/SKILL.md` children.

A client that consumes Agent Plugins directly must use the portable projection. Codex CLI 0.147.0 introduced direct portable-plugin installation, so Codex installation alone does not require an OpenAI adapter. Generate `adapters/<client>/stark-ai-developer/` only when a selected target surface requires client-native files or metadata, such as an OpenAI flow that specifically requires `.codex-plugin/plugin.json`. Adapters derive from the same bundle and canonical skills and cannot redefine membership. Existing `npx skills` distribution remains independent.

## Context

Agent Plugins 1.0.0 uses a closed root manifest, fixed skill discovery, and reverse-domain client extensions. It is currently a Working Draft, so the repository pins and validates the 1.0.0 schema. OpenAI currently supports portable Agent Plugins in Codex while also documenting a native `.codex-plugin` package for other authoring and publication flows; adapter selection must therefore be target-specific rather than vendor-wide.

## Consequences

The repository keeps one portable package, one explicit bundle, and one author-maintained skill source while avoiding unnecessary duplicate projections. Conditional adapters add target-selection and validation work, and older or publication-specific clients may still require generated copies. Any material specification or ownership change requires a successor ADR.
