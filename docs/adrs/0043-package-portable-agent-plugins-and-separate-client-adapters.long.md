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
Gist: Make Agent Plugins the canonical package projection and generate a separate client adapter only when a target surface cannot consume that projection or requires client-native files.

Variants: [Short](0043-package-portable-agent-plugins-and-separate-client-adapters.short.md) · **Long, canonical** · [Guide](0043-package-portable-agent-plugins-and-separate-client-adapters.guide.md)

## Decision

Repository-managed plugins will use Agent Plugins 1.0.0 as their canonical portable package contract.

- Canonical skills remain author-maintained only under `skills/<category>/<skill>/`.
- Plugin membership is defined only by the versioned bundle manifest at `bundles/codex.json`.
- `plugins/stark-ai-developer/` is a generated, committed Agent Plugins projection with a root `plugin.json` and skills discovered only from immediate `skills/<name>/SKILL.md` children.
- A target that can consume the Agent Plugins package directly must use that portable projection. Codex CLI 0.147.0 introduced direct installation of portable Agent Plugins, so Codex installation alone is not a reason to generate an OpenAI adapter.
- A client adapter under `adapters/<client>/stark-ai-developer/` is generated only when a specific target surface requires client-native files, metadata, or capabilities that the portable contract cannot represent or that the target does not consume from the portable package. This includes an OpenAI-native package only when the selected OpenAI packaging or publication flow requires `.codex-plugin/plugin.json` or other OpenAI-only files.
- Every adapter is derived from the same bundle and canonical skill sources. It cannot add, remove, rename, or redefine portable bundle membership.
- The existing `npx skills` catalog and category layout remain supported independently of plugin packaging.

## Decision invariants

1. **Single author-maintained skill source:** Generated projections never become editable skill sources.
2. **Single membership source:** The bundle manifest controls direct-install documentation, portable packaging, adapter packaging, evaluation membership, and release contents.
3. **Portable-first distribution:** No adapter is created merely because a client has a legacy or native package format; an adapter must be justified by the selected target surface.
4. **Projection isolation:** The portable projection contains only Agent Plugins core files, ordinary package files, and conformant reverse-domain client extensions. Client-native layouts such as `.codex-plugin/` remain outside the portable projection.
5. **Byte-identical shared skills:** A generated skill tree is copied byte-for-byte from its canonical source, including scripts, references, assets, and other skill-local resources. Provenance belongs in package-level metadata, not copied `SKILL.md` files.
6. **Deterministic and safe generation:** Materialization is idempotent, rejects unsafe paths and unsupported file types, and fails CI when generated output differs from a clean regeneration.
7. **Independent validation:** Portable conformance and every client-adapter contract are validated separately. Passing an adapter validator cannot weaken or replace portable validation.

## Context

Agent Plugins 1.0.0 defines a portable package rooted at `plugin.json`, discovers skills only from immediate children of `skills/`, and uses a closed manifest schema. Unknown top-level manifest fields make the manifest non-conformant even though conformant clients are instructed to report and ignore those fields when the remaining manifest is valid. Client-specific manifest data and files use reverse-domain extension namespaces.

The specification is currently published as a Working Draft. This ADR therefore pins the 1.0.0 schema identifier, validates it locally, and treats material specification changes as a reason to revisit the decision.

OpenAI has two relevant package paths:

- Codex CLI 0.147.0 introduced installation of portable Agent Plugins, including root `plugin.json` packages.
- OpenAI-native plugin authoring and publication documentation still describes packages with `.codex-plugin/plugin.json` and OpenAI-specific marketplace or listing metadata.

These paths must not be conflated. A portable Agent Plugin can be the direct Codex package, while a separate OpenAI adapter remains appropriate only for an OpenAI surface that actually requires the native package contract.

## Why

- Agent Plugins provides a small, client-neutral interoperability floor for skills and optional MCP configuration.
- Portable-first distribution avoids duplicating package trees for clients that already consume the standard directly.
- Conditional adapters preserve support for client-native publication, listing, policy, hook, application, or compatibility files without contaminating the portable package boundary.
- Explicit bundle membership prevents unrelated future public skills from entering a reviewed plugin automatically.
- Keeping canonical skills in their existing category paths preserves the stable `npx skills` source-of-truth boundary.
- Separate validators make failures attributable: portable conformance, target compatibility, membership drift, and release-policy failures remain distinct.

## Options

- **Chosen:** Keep canonical skills under `skills/`, define membership in `bundles/codex.json`, commit the generated Agent Plugins projection under `plugins/stark-ai-developer/`, and generate a client adapter only for a target that cannot use that projection as-is.
- **Rejected:** Always generate an OpenAI adapter. Current Codex versions can install portable Agent Plugins directly, so unconditional duplication is no longer justified.
- **Rejected:** Treat an OpenAI-native `.codex-plugin` package as the portable core. Its manifest and client-specific files belong to a different package contract.
- **Rejected:** Co-locate `.codex-plugin/` in the portable projection. Even where a host might tolerate the extra directory, doing so blurs validation, ownership, and extension boundaries; this repository keeps native layouts in adapters.
- **Rejected:** Put OpenAI-specific fields directly in root `plugin.json`. The Agent Plugins manifest schema is closed, and client data belongs under a recognized extension namespace or a separate adapter.
- **Rejected:** Move or hand-copy bundle skills into a plugin directory. That creates competing author-maintained sources and invites drift.
- **Rejected:** Infer plugin membership from every public non-operations skill. Capability expansion must remain explicit, reviewed, versioned, and evaluated.

## Consequences

- **Good:** Current Codex installations can consume the portable projection directly.
- **Good:** One bundle drives direct installation, portable packaging, conditional adapters, evaluations, and release contents.
- **Good:** Existing `npx skills` users and canonical category paths remain stable.
- **Good:** Client-specific packaging can evolve without redefining the portable package or skill ownership model.
- **Tradeoff:** The generator must select outputs by target capability rather than always emitting a fixed set of projections.
- **Tradeoff:** A target-specific adapter may still duplicate generated skill bytes and increase repository size.
- **Tradeoff:** Compatibility with older clients may require an adapter or a documented minimum client version.
- **Risk:** Agent Plugins 1.0.0 is a Working Draft and may change materially. Pinning the schema, validating locally, and using a successor ADR for incompatible changes mitigate this.
- **Risk:** OpenAI local installation, workspace publication, and universal-directory submission may accept different package forms. Target-specific validation and smoke tests mitigate accidental conflation.
- **Risk:** A generator bug could omit a skill-local resource or produce byte drift. Clean staging, tree hashes, source manifests, no-symlink policy, and CI drift gates mitigate this.

## Follow-up

- Add a schema and validator for `bundles/codex.json`.
- Implement deterministic synchronization of `plugins/stark-ai-developer/` from the bundle and canonical sources.
- Add a target-capability matrix that decides whether an adapter is required; do not hard-code “OpenAI” as synonymous with “adapter required.”
- Point the current Codex repository marketplace entry at `plugins/stark-ai-developer/` and document Codex CLI 0.147.0 as the minimum version for direct portable installation.
- Generate `adapters/openai/stark-ai-developer/` only for an OpenAI packaging or publication flow that requires the native manifest or OpenAI-only assets.
- Validate Agent Plugins conformance independently from every generated adapter.
- Compare generated trees, source manifests, and deterministic hashes in CI from a clean checkout.
- Derive README installation commands and published release membership from the same bundle manifest.
- Preserve public-release, legal, evaluation, and publisher-identity gates from the implementation specification.

## External contract baseline

Verified on 2026-08-18:

- [Agent Plugins Specification 1.0.0](https://agent-plugins.org/specification)
- [OpenAI ChatGPT and Codex changelog](https://learn.chatgpt.com/docs/changelog)
- [OpenAI plugin packaging documentation](https://developers.openai.com/plugins/build/plugins)

## Revisit

Create a successor ADR when Agent Plugins publishes a materially incompatible specification version, all targeted OpenAI surfaces accept the portable root package and an OpenAI adapter becomes unnecessary, a target drops portable-package support, a backend/MCP/authentication layer changes package ownership, or another client adapter requires a change to the canonical source or membership model.
