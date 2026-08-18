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
<<<<<<< Updated upstream
Gist: Keep one portable Agent Plugins core and generate incompatible client package formats as separate adapters.
=======
Gist: Make Agent Plugins the canonical package projection and generate a separate client adapter only when a target surface cannot consume that projection or requires client-native files.
>>>>>>> Stashed changes

Variants: [Short](0043-package-portable-agent-plugins-and-separate-client-adapters.short.md) · **Long, canonical** · [Guide](0043-package-portable-agent-plugins-and-separate-client-adapters.guide.md)

## Decision

<<<<<<< Updated upstream
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
=======
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
>>>>>>> Stashed changes
