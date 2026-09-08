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
Guide verified: 2026-08-26
Gist: Make Agent Plugins the canonical package projection and generate a separate client adapter only when a target surface cannot consume that projection or requires client-native files.

Variants: [Short](0043-package-portable-agent-plugins-and-separate-client-adapters.short.md) · [Long, canonical](0043-package-portable-agent-plugins-and-separate-client-adapters.long.md) · **Guide**

This guide is non-normative. The Long variant is the canonical decision.

## Intended layout

```text
skills/<category>/<skill>/                 # Canonical skill, including agents/openai.yaml when required
plugins/stark-ai-developer.source.json     # Membership and plugin identity
plugins/stark-ai-developer.source.schema.json
docs/listing/openai/stark-ai-developer.json # Public listing and portal copy
docs/listing/openai/stark-ai-developer-first-publication.md # Portal observations after first listing
plugins/stark-ai-developer/                # Generated committed portable Agent Plugin
scripts/vendor/agent-plugins/1.0.0/        # Official schema pin
scripts/vendor/snapshots/                  # Dated contract snapshots
dist/openai/*.zip                          # OpenAI-native archive from ephemeral adapter staging
.agents/plugins/marketplace.json           # Canonical repository marketplace; points to portable projection
adapters/                                  # Gitignored; not a committed tree
dist/                                      # Generated uncommitted archives and checksums
release-evidence/                          # Sanitized release/publication evidence when committed
```

Identity fields in `plugins/stark-ai-developer.source.json` are the sole source for plugin identity, semantic version, submission type, public-listing strategy, release toolchain, and archive profile. Do not introduce a second author-maintained version source in generated artifacts.

## How to apply

1. Edit a skill only in its canonical `skills/<category>/<skill>/` directory. When a skill is distributed to OpenAI surfaces, maintain its reviewed `agents/openai.yaml` there as skill-local canonical metadata. Do not hand-edit `plugins/stark-ai-developer/`. After changing a bundled skill or `plugins/stark-ai-developer.source.json`, run `pnpm run sync:agent-plugin`. Confirm with `pnpm run validate:projections` when the portable contract changed.
2. Add or remove plugin membership only through `plugins/stark-ai-developer.source.json`, together with the required version, routing, listing, evaluation, and release-review changes.
3. Change plugin identity, semantic version, submission type, public-listing strategy, release toolchain, or archive profile only through identity fields in `plugins/stark-ai-developer.source.json`. Do not introduce a second author-maintained version source in generated artifacts.
4. Always generate `plugins/stark-ai-developer/` as the Agent Plugins 1.0.0 projection:
   - Put `plugin.json` at the package root.
   - Use the canonical 1.0.0 `$schema` identifier.
   - Put each bundled skill at the immediate path `skills/<name>/SKILL.md`.
   - Copy the complete canonical skill tree byte-for-byte, including `agents/openai.yaml`.
   - Keep portable manifest fields inside the closed Agent Plugins schema.
   - Put optional package-level client extension data and files only under conformant reverse-domain namespaces.
5. Select the package by target capability, not merely by vendor name.

| Target                                                                                                          | Package to use                                     |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Agent Plugins-compatible client                                                                                 | `plugins/stark-ai-developer/`                      |
| Codex CLI 0.147.0 or later, for direct local/repository installation                                            | `plugins/stark-ai-developer/`                      |
| OpenAI packaging or publication flow that explicitly requires `.codex-plugin/plugin.json` or OpenAI-only assets | `dist/openai/*.zip` from ephemeral adapter staging |
| Older or incompatible client                                                                                    | A validated client adapter, only when required     |

6. Keep the committed `.agents/plugins/marketplace.json` pointed at `./plugins/stark-ai-developer`. Test the OpenAI adapter with an isolated generated marketplace or direct path; never repoint the canonical repository marketplace.
7. When an adapter is required, generate it from the same bundle, listing source, and canonical skills into disposable staging. Keep package-level client manifests, listing assets, policies, hooks, application mappings, and compatibility files inside that staged adapter root, then archive it and delete the stage. Do not commit the adapter tree. Use `pnpm run validate:openai-plugin` and `pnpm run package:openai-plugin`. `pnpm run sync:openai-plugin` is a refuse-redirect and must not materialize `adapters/openai/stark-ai-developer/`.
8. Do not generate, overlay, or rewrite canonical skill-local files in an adapter. Put provenance and generation notices in package-level README or source-manifest files rather than modifying copied `SKILL.md` or `agents/openai.yaml` files.
9. Keep the existing `npx skills` catalog and category layout supported independently of plugin packaging.
10. Treat one public **stark AI Developer** listing with six bundled skills as the version 1 product strategy. Create independent public cards only through separately named and reviewed one-skill plugin submissions.
11. After OpenAI publication, follow [`docs/listing/openai/stark-ai-developer-first-publication.md`](../listing/openai/stark-ai-developer-first-publication.md) for sanitized portal observations and the live upload rules.

## Verification

### Bundle, release, and source checks

- Validate `plugins/stark-ai-developer.source.json` and the OpenAI listing source before materialization.
- Derive package IDs, version strings, archive names, toolchain versions, and the archive profile from that source file's identity fields.
- Require every source path to resolve inside the public canonical `skills/` tree.
- Reject duplicate bundle names, duplicate resolved skills, missing sources, parent traversal, symlinks, submodules, special files, untracked release inputs, and cross-platform path collisions.
- Require the skill frontmatter `name` to match both its canonical directory and projected immediate-child directory.
- Require every bundled OpenAI skill to own a valid canonical `agents/openai.yaml`; adapters may copy but not create or patch it.

### Portable projection checks

- Validate root `plugin.json` against Agent Plugins 1.0.0.
- Require the canonical `$schema` value and reject unknown top-level core fields to preserve strict conformance.
- Confirm that skills are discovered only as immediate `skills/<name>/SKILL.md` children and conform to the Agent Skills specification.
- Treat canonical `agents/openai.yaml` as ordinary skill-local content; do not depend on it for portable discovery.
- Confirm that any package-level client extension uses the same reverse-domain namespace in `plugin.json` and at the package root.
- Reject stale generated entries and files that are not present in a clean regeneration.

### Adapter checks

- Generate an adapter into disposable staging only when packaging or validating the native client archive.
- Validate the staged adapter with the current target-client package rules without weakening portable validation.
- Prove that adapter skill membership exactly matches the bundle and portable projection.
- Prove that copied skill files and skill-local resources are byte-identical to canonical sources.
- Keep target-native package metadata from becoming a second skill or membership source.
- Do not require a committed adapter tree.

### Marketplace, CI, and release checks

- Verify that the committed repository marketplace points to `./plugins/stark-ai-developer` and works on Codex CLI 0.147.0 or later.
- Exercise the OpenAI adapter only through an isolated temporary marketplace or direct path.
- For the portable projection, generate into clean staging directories and compare deterministic tree hashes with committed output.
- For the OpenAI adapter, regenerate into disposable staging, validate the stage and archive against canonical sources, and delete the stage.
- Run isolated generation twice and require an empty second diff.
- Enforce Node 24.18.0, Bun 1.4.0, pnpm 11.24.0, the frozen lockfile, and the `zip-store-v1` STORE-only archive profile. Packaging must not call a platform `zip` executable or use a compressed ZIP writer.
- Pin Git to LF (`core.autocrlf=false`, `core.eol=lf`) before Windows-inclusive archive-identity checkouts, and keep `* text=auto eol=lf` in `.gitattributes`, so packaged file bytes match Git blobs.
- Derive README installation commands and release contents from the same bundle membership.
- Require security, license, dependency, legal, evaluation, publisher, and explicit-publication gates before release.

## Revisit

Create a successor ADR when Agent Plugins publishes a materially incompatible specification version, all targeted OpenAI surfaces accept the portable root package and the OpenAI adapter becomes unnecessary, a target drops portable-package support, skill-local OpenAI metadata can no longer remain canonical and byte-identical, the canonical repository marketplace must target a non-portable package, a backend/MCP/authentication layer changes package ownership, or another client adapter requires a change to the canonical source or membership model.
