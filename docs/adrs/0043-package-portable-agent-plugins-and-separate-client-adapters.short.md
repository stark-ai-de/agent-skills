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

Requirement terms in this summary use the RFC 2119 and RFC 8174 meanings regardless of capitalization; the Long variant remains canonical.

## Decision

Repository-managed plugins will use Agent Plugins 1.0.0 as the portable package contract: each portable projection has a root `plugin.json`, discovers skills only from immediate children of `skills/`, and keeps the portable manifest within the closed core schema. Canonical skills remain under `skills/`, plugin membership is explicit in a versioned bundle manifest, and generated portable projections are committed. Client formats that cannot coexist inside a conformant portable package, including OpenAI's required `.codex-plugin/plugin.json` layout, will be generated as separate adapter projections from the same bundle and canonical skills. Existing `npx skills` distribution remains supported.

## Context

Agent Plugins 1.0.0 uses a closed root manifest, fixed skill discovery, and reverse-domain client extensions. It is currently a Working Draft, so the repository pins and validates the 1.0.0 schema. OpenAI currently supports portable Agent Plugins in Codex while also documenting a native `.codex-plugin` package for other authoring and publication flows; adapter selection must therefore be target-specific rather than vendor-wide.

Skill-local `agents/openai.yaml` is canonical when the same skill must remain independently installable; package-level `.codex-plugin` files and listing assets remain adapter-only. The committed repository marketplace targets `plugins/stark-ai-developer/`, while OpenAI-adapter tests use an isolated temporary marketplace or direct path. The OpenAI-native package is generated into disposable staging and archived under `dist/openai/`; `adapters/` is not a committed tree.

## Consequences

The repository keeps one portable package, one sibling plugin source file for membership and identity, and one author-maintained skill source while avoiding unnecessary duplicate projections. Canonical skill trees, including reviewed `agents/openai.yaml`, remain byte-identical across projections. Conditional adapters and temporary target-specific marketplace fixtures add validation work, and older or publication-specific clients may still require generated copies. Version 1 uses one public plugin listing containing the bundled skills; independent public cards are separate submissions. Any material specification or ownership change requires a successor ADR.
