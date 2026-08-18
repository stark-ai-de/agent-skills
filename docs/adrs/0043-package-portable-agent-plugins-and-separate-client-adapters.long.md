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
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-18
Gist: Keep one portable Agent Plugins core and generate incompatible client package formats as separate adapters.

Variants: [Short](0043-package-portable-agent-plugins-and-separate-client-adapters.short.md) · **Long, canonical** · [Guide](0043-package-portable-agent-plugins-and-separate-client-adapters.guide.md)

## Decision

Repository-managed plugins will use Agent Plugins 1.0.0 as the portable package contract: each portable projection has a root `plugin.json`, discovers skills only from immediate children of `skills/`, and keeps the portable manifest within the closed core schema. Canonical skills remain under `skills/`, plugin membership is explicit in a versioned bundle manifest, and generated portable projections are committed. Client formats that cannot coexist inside a conformant portable package, including OpenAI's required `.codex-plugin/plugin.json` layout, will be generated as separate adapter projections from the same bundle and canonical skills. Existing `npx skills` distribution remains supported.

## Why

- Agent Plugins 1.0.0 gives the repository a vendor-neutral package contract with a required root `plugin.json`, fixed `skills/` discovery, and bounded client extensions.
- The portable manifest schema is closed; OpenAI-specific listing, policy, and package fields cannot be added as arbitrary top-level fields without losing conformance.
- OpenAI currently requires a `.codex-plugin/plugin.json` package and a repository marketplace entry, so its package needs an explicit adapter instead of being mislabeled as the portable core.
- The existing public skills and `npx skills` workflow already have a stable source-of-truth boundary that should not move merely to satisfy another distribution format.
- An explicit bundle allowlist prevents unrelated future public skills from entering a reviewed public plugin automatically.

## Options

- Chosen: Keep canonical skills under `skills/`, define membership in `bundles/codex.json`, commit a generated Agent Plugins projection under `plugins/stark-ai-developer/`, and generate incompatible client packages under repository-level adapter paths such as `adapters/openai/stark-ai-developer/`.
- Rejected: Treat the OpenAI `.codex-plugin` package as an Agent Plugins-conformant package, because its root layout and manifest fields are not the portable v1 contract.
- Rejected: Put OpenAI-specific fields directly in root `plugin.json`, because the Agent Plugins manifest schema is closed and assigns client data to reverse-domain extensions.
- Rejected: Move or hand-copy the six canonical skills into a plugin directory, because that creates competing author-maintained sources and invites drift.
- Rejected: Infer plugin membership from every public non-operations skill, because public-directory capability expansion must be explicit, reviewed, versioned, and evaluated.

## Consequences

- Good: The repository gains a genuinely portable plugin package while preserving an independently valid OpenAI distribution path.
- Good: One bundle drives direct install documentation, portable projection, client adapters, evaluation membership, and release contents.
- Good: Existing `npx skills` users and canonical category paths remain stable.
- Tradeoff: Generated skill trees exist in more than one distribution projection and increase repository size.
- Tradeoff: Each supported client format needs focused validation and packaging logic.
- Risk: A generator or validator bug could produce byte drift or omit a required skill-local resource; tree hashes, clean staging, no-symlink checks, and CI drift gates mitigate this.
- Risk: Agent Plugins or a client-native format may change; a successor ADR must evaluate any material contract change instead of editing this accepted decision in place.

## Follow-up

- Add the explicit Codex bundle schema and validator.
- Implement deterministic portable and OpenAI adapter synchronization from the same canonical sources.
- Validate root Agent Plugins conformance separately from OpenAI package conformance.
- Point `.agents/plugins/marketplace.json` at the OpenAI adapter, not at the portable package, until OpenAI natively consumes the Agent Plugins root format.
- Preserve public release, legal, evaluation, and publisher-identity gates from the implementation specification.
