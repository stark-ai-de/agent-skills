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

Unless a section is explicitly marked non-normative, the requirement terms `must`, `must not`, `required`, `should`, `should not`, and `may` use the meanings of RFC 2119 and RFC 8174 regardless of capitalization.

## Decision

Repository-managed plugins will use Agent Plugins 1.0.0 as the portable package contract: each portable projection has a root `plugin.json`, discovers skills only from immediate children of `skills/`, and keeps the portable manifest within the closed core schema. Canonical skills remain under `skills/`, plugin membership is explicit in a versioned bundle manifest, and generated portable projections are committed. Client formats that cannot coexist inside a conformant portable package, including OpenAI's required `.codex-plugin/plugin.json` layout, will be generated as separate adapter projections from the same bundle and canonical skills. Existing `npx skills` distribution remains supported.

## Decision invariants

1. **Single author-maintained skill source:** Generated projections never become editable skill sources.
2. **Single membership source:** Membership fields in `plugins/stark-ai-developer.source.json` control direct-install documentation, portable packaging, adapter packaging, evaluation membership, and release contents.
3. **Portable-first distribution:** No adapter is created merely because a client has a legacy or native package format; an adapter must be justified by the selected target surface.
4. **Projection isolation:** The portable projection contains only Agent Plugins core files, ordinary package files, and conformant reverse-domain client extensions. Package-level client-native layouts such as `.codex-plugin/` remain outside the portable projection. The OpenAI-native adapter must be generated into disposable staging, archived, and deleted; `adapters/openai/stark-ai-developer/` must never be retained as a repository tree.
5. **Canonical skill-local metadata:** Skill-local files required for standalone skill distribution, including `agents/openai.yaml`, are author-maintained inside the canonical skill tree and copied byte-for-byte into every projection that contains the skill. Provenance belongs in package-level metadata, not copied `SKILL.md` files.
6. **No adapter overlays:** An adapter may add package-level client-native files outside copied skill roots, but it must not synthesize, replace, patch, or remove canonical skill-local files.
7. **Deterministic and safe generation:** Materialization is idempotent, uses explicit versioned inputs, rejects unsafe paths and unsupported file types, and fails CI when generated output differs from a clean regeneration.
8. **Independent validation:** Portable conformance and every client-adapter contract are validated separately. Passing an adapter validator cannot weaken or replace portable validation.
9. **Target-specific marketplace selection:** The canonical repository marketplace targets the portable projection. Adapter-specific installation tests use a generated temporary marketplace or direct target path and never repoint the canonical repository marketplace.
10. **Explicit release identity:** Membership, public listing copy, and release identity/version remain distinct authorities; membership and identity live as separate fields in `plugins/stark-ai-developer.source.json`, listing copy stays in `docs/listing/openai/`, and generated artifacts must not introduce another source of truth.

## Decision clarifications

### Skill-local OpenAI metadata

`skills/<category>/<skill>/agents/openai.yaml` is canonical skill-local metadata because it is needed by standalone OpenAI skill distribution as well as the OpenAI plugin projection, as required by [ADR-0016](0016-use-openai-metadata-for-codex-skills.short.md) ([Long, canonical](0016-use-openai-metadata-for-codex-skills.long.md) · [Guide](0016-use-openai-metadata-for-codex-skills.guide.md)). It is reviewed with the skill, copied unchanged into the portable package, OpenAI adapter, and enabled standalone archives, and may be ignored by clients that do not consume it. Package-level OpenAI files such as `.codex-plugin/plugin.json`, listing assets, and publication-only metadata remain generated inside the disposable OpenAI adapter.

### Marketplace ownership

The committed repository marketplace at `.agents/plugins/marketplace.json` points to `./plugins/stark-ai-developer`. This is the canonical local/repository installation path for Codex CLI 0.147.0 or later. Tests that specifically exercise the OpenAI-native package generate an isolated temporary marketplace rooted at the staged test tree, or install the staged adapter directly. They do not modify or replace the committed repository marketplace.

### Public listing granularity

The implementation specification chooses one public **stark AI Developer** plugin listing containing the six bundled skills for version 1. Independent public cards require separate one-skill plugin identities and submissions. That product decision does not change this ADR unless it changes canonical ownership, bundle membership authority, or projection boundaries.

### OpenAI adapter lifecycle

The OpenAI-native package is generated into disposable staging at package or adapter-validation time. The archive under `dist/openai/` is the distribution artifact. `npm run sync:openai-plugin` is a refuse-redirect and must not materialize `adapters/openai/stark-ai-developer/`.

## Context

Agent Plugins 1.0.0 defines a portable package rooted at `plugin.json`, discovers skills only from immediate children of `skills/`, and uses a closed manifest schema. Unknown top-level manifest fields make the manifest non-conformant even though conformant clients are instructed to report and ignore those fields when the remaining manifest is valid. Client-specific manifest data and files use reverse-domain extension namespaces.

The specification is currently published as a Working Draft. This ADR therefore pins the 1.0.0 schema identifier, validates it locally, and treats material specification changes as a reason to revisit the decision.

OpenAI has two relevant package paths:

- Codex CLI 0.147.0 introduced installation of portable Agent Plugins, including root `plugin.json` packages.
- OpenAI-native plugin authoring and publication documentation still describes packages with `.codex-plugin/plugin.json` and OpenAI-specific marketplace or listing metadata.

These paths must not be conflated. A portable Agent Plugin can be the direct Codex package, while a separate OpenAI adapter remains appropriate only for an OpenAI surface that actually requires the native package contract.

OpenAI skill metadata has a different ownership boundary from package-level OpenAI metadata. `agents/openai.yaml` belongs to the canonical skill when the same skill must remain independently installable, while `.codex-plugin/plugin.json`, listing assets, and portal-specific package fields belong only to the generated OpenAI adapter.

## Why

- Agent Plugins provides a small, client-neutral interoperability floor for skills and optional MCP configuration.
- Portable-first distribution avoids duplicating package trees for clients that already consume the standard directly.
- Conditional adapters preserve support for client-native publication, listing, policy, hook, application, or compatibility files without contaminating the portable package boundary.
- Explicit bundle membership prevents unrelated future public skills from entering a reviewed plugin automatically.
- Keeping canonical skills in their existing category paths preserves the stable `npx skills` source-of-truth boundary.
- Separate validators make failures attributable: portable conformance, target compatibility, membership drift, and release-policy failures remain distinct.
- Canonical ownership of `agents/openai.yaml` preserves byte-identical skill trees and avoids adapter overlays that would create a second skill definition.
- Keeping the committed repository marketplace on the portable package exercises the interoperability contract that this ADR selects as canonical.
- Generating the OpenAI adapter only into disposable staging avoids a second committed skill tree while still producing the native archive required for publication.

## Options

- **Chosen:** Keep canonical skills under `skills/`, define membership and plugin identity in `plugins/stark-ai-developer.source.json`, commit the generated Agent Plugins projection under `plugins/stark-ai-developer/`, and generate a client adapter only for a target that cannot use that projection as-is.
- **Rejected:** Always generate an OpenAI adapter. Current Codex versions can install portable Agent Plugins directly, so unconditional duplication is no longer justified.
- **Rejected:** Treat an OpenAI-native `.codex-plugin` package as the portable core. Its manifest and client-specific files belong to a different package contract.
- **Rejected:** Co-locate `.codex-plugin/` in the portable projection. Even where a host might tolerate the extra directory, doing so blurs validation, ownership, and extension boundaries; this repository keeps native layouts in adapters.
- **Rejected:** Put OpenAI-specific fields directly in root `plugin.json`. The Agent Plugins manifest schema is closed, and client data belongs under a recognized extension namespace or a separate adapter.
- **Rejected:** Move or hand-copy bundle skills into a plugin directory. That creates competing author-maintained sources and invites drift.
- **Rejected:** Infer plugin membership from every public non-operations skill. Capability expansion must remain explicit, reviewed, versioned, and evaluated.
- **Rejected:** Generate or overlay `agents/openai.yaml` only inside the OpenAI adapter. That would make standalone skill metadata non-canonical and break the byte-identical shared-tree invariant.
- **Rejected:** Point the canonical repository marketplace at the OpenAI adapter. That would contradict portable-first Codex installation and make the native adapter appear to be the repository's universal package.
- **Rejected:** Commit `adapters/openai/stark-ai-developer/` as a second generated skill tree. Disposable staging plus `dist/openai/*.zip` is sufficient for native packaging and publication.

## Consequences

- **Good:** Current Codex installations can consume the portable projection directly.
- **Good:** One bundle drives direct installation, portable packaging, conditional adapters, evaluations, and release contents.
- **Good:** Existing `npx skills` users and canonical category paths remain stable.
- **Good:** Client-specific packaging can evolve without redefining the portable package or skill ownership model.
- **Tradeoff:** The generator must select outputs by target capability rather than always emitting a fixed set of projections.
- **Tradeoff:** A target-specific adapter may still duplicate generated skill bytes at package time.
- **Tradeoff:** Compatibility with older clients may require an adapter or a documented minimum client version.
- **Risk:** Agent Plugins 1.0.0 is a Working Draft and may change materially. Pinning the schema, validating locally, and using a successor ADR for incompatible changes mitigate this.
- **Risk:** OpenAI local installation, workspace publication, and universal-directory submission may accept different package forms. Target-specific validation and smoke tests mitigate accidental conflation.
- **Risk:** A generator bug could omit a skill-local resource or produce byte drift. Clean staging, tree hashes, source manifests, no-symlink policy, and CI drift gates mitigate this.
- **Tradeoff:** Portable packages may contain canonical skill-local metadata that a non-OpenAI client ignores; this is preferable to generating divergent skill trees.
- **Tradeoff:** Adapter installation tests need a temporary marketplace fixture or direct-path test instead of reusing the committed repository marketplace.
- **Risk:** Release version, listing copy, and bundle membership can drift if they are duplicated. The implementation specification therefore requires separate machine-readable authorities and cross-validation.

## Follow-up

Repository-local follow-up from this decision is implemented:

- schema and validator for `plugins/stark-ai-developer.source.json`;
- identity fields in that source file owning plugin identity, semantic version, submission type, public-listing strategy, pinned release toolchain, and archive profile;
- deterministic synchronization of `plugins/stark-ai-developer/` from the plugin source file and canonical sources;
- reviewed canonical `agents/openai.yaml` copied unchanged rather than generated as an adapter overlay;
- Codex repository marketplace pointed at `plugins/stark-ai-developer/` with Codex CLI 0.147.0 as the minimum for direct portable installation;
- OpenAI-native archive generated from disposable staging only; `adapters/openai/stark-ai-developer/` is never a repository tree;
- isolated temporary marketplace or direct-path tests for the OpenAI adapter;
- independent Agent Plugins conformance validation;
- `zip-store-v1` packaging, source manifests, and two-build reproducibility locally, plus a Linux/macOS/Windows archive-identity matrix in CI.

Remaining follow-up stays with public-release, legal, live-evaluation, supply-chain attestation, publisher-identity, and explicit-publication gates from the implementation specification. Cross-OS archive byte-identity is proven only after the hosted `archive-identity-compare` job succeeds.

## External contract baseline

Verified on 2026-08-18:

- [Agent Plugins Specification 1.0.0](https://agent-plugins.org/specification)
- [OpenAI ChatGPT and Codex changelog](https://learn.chatgpt.com/docs/changelog)
- [OpenAI plugin packaging documentation](https://developers.openai.com/plugins/build/plugins)
- [OpenAI skill-building documentation](https://developers.openai.com/plugins/build/skills)
- [OpenAI plugin surfaces documentation](https://learn.chatgpt.com/docs/plugins)

## Revisit

Create a successor ADR when Agent Plugins publishes a materially incompatible specification version, all targeted OpenAI surfaces accept the portable root package and an OpenAI adapter becomes unnecessary, a target drops portable-package support, skill-local OpenAI metadata can no longer remain canonical and byte-identical, the canonical repository marketplace must target a non-portable package, a backend/MCP/authentication layer changes package ownership, or another client adapter requires a change to the canonical source or membership model.
