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
<<<<<<< Updated upstream
Gist: Keep one portable Agent Plugins core and generate incompatible client package formats as separate adapters.
=======
Gist: Make Agent Plugins the canonical package projection and generate a separate client adapter only when a target surface cannot consume that projection or requires client-native files.
>>>>>>> Stashed changes

Variants: [Short](0043-package-portable-agent-plugins-and-separate-client-adapters.short.md) · [Long, canonical](0043-package-portable-agent-plugins-and-separate-client-adapters.long.md) · **Guide**

This guide is non-normative. The Long variant is the canonical decision.

<<<<<<< Updated upstream
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
=======
## Intended layout

```text
skills/<category>/<skill>/                 # Author-maintained canonical skills
bundles/codex.json                         # Explicit plugin membership
plugins/stark-ai-developer/                # Generated portable Agent Plugin
adapters/<client>/stark-ai-developer/      # Generated only when required
.agents/plugins/marketplace.json           # Points at the package for the target flow
```

## How to apply

1. Edit a skill only in its canonical `skills/<category>/<skill>/` directory.
2. Add or remove plugin membership only through `bundles/codex.json`, together with the required review and evaluation changes.
3. Always generate `plugins/stark-ai-developer/` as the Agent Plugins 1.0.0 projection:
   - Put `plugin.json` at the package root.
   - Use the canonical 1.0.0 `$schema` identifier.
   - Put each bundled skill at the immediate path `skills/<name>/SKILL.md`.
   - Keep portable manifest fields inside the closed Agent Plugins schema.
   - Put optional client extension data and files only under conformant reverse-domain namespaces.
4. Select the package by target capability, not merely by vendor name.

| Target | Package to use |
| --- | --- |
| Agent Plugins-compatible client | `plugins/stark-ai-developer/` |
| Codex CLI 0.147.0 or later, for direct local/repository installation | `plugins/stark-ai-developer/` |
| OpenAI packaging or publication flow that explicitly requires `.codex-plugin/plugin.json` or OpenAI-only assets | `adapters/openai/stark-ai-developer/` |
| Older or incompatible client | A validated client adapter, only when required |

5. When an adapter is required, generate it from the same bundle and canonical skills. Keep all client-only manifests, listing assets, policies, hooks, application mappings, and compatibility files inside that adapter root.
6. Do not place `.codex-plugin/` in the portable projection. The repository keeps native client layouts isolated even if a particular host would tolerate extra files.
7. Keep copied skill trees byte-identical to their canonical sources. Put provenance and generation notices in package-level README or source-manifest files rather than modifying copied `SKILL.md` files.
8. Keep the existing `npx skills` catalog and category layout supported independently of plugin packaging.

## Verification

### Bundle and source checks

- Validate `bundles/codex.json` before materialization.
- Require every source path to resolve inside the public canonical `skills/` tree.
- Reject duplicate bundle names, duplicate resolved skills, missing sources, parent traversal, symlinks, and special files.
- Require the skill frontmatter `name` to match both its canonical directory and projected immediate-child directory.

### Portable projection checks

- Validate root `plugin.json` against Agent Plugins 1.0.0.
- Require the canonical `$schema` value and reject unknown top-level core fields to preserve strict conformance.
- Confirm that skills are discovered only as immediate `skills/<name>/SKILL.md` children and conform to the Agent Skills specification.
- Confirm that any client extension uses the same reverse-domain namespace in `plugin.json` and at the package root.
- Reject stale generated entries and files that are not present in a clean regeneration.

### Adapter checks

- Generate an adapter only when the target-capability matrix marks it as required.
- Validate the adapter with the current target-client package rules without weakening portable validation.
- Prove that adapter skill membership exactly matches the bundle and portable projection.
- Prove that copied skill files and skill-local resources are byte-identical to canonical sources.
- Keep target-native metadata from becoming a second membership source.

### CI and installation checks

- Generate into clean staging directories and compare deterministic tree hashes with committed output.
- Run generation twice and require an empty second diff.
- Verify that `.agents/plugins/marketplace.json` points at the correct projection for the tested target.
- Smoke-test installation with the documented minimum client version and with every supported adapter target.
- Derive README installation commands and release contents from the same bundle membership.

## Revisit

Create a successor ADR when Agent Plugins publishes a materially incompatible specification version, all targeted OpenAI surfaces accept the portable root package and the OpenAI adapter becomes unnecessary, a target drops portable-package support, a backend/MCP/authentication layer changes package ownership, or another client adapter requires a change to the canonical source or membership model.
>>>>>>> Stashed changes
