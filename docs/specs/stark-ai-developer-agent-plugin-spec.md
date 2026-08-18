# Implementation Specification: stark AI Developer Agent Plugin

- **Status:** Proposed; foundation slice implemented by this PR
- **Specification date:** 2026-08-18
- **Repository:** `stark-ai-de/agent-skills`
- **Plugin ID:** `stark-ai-developer`
- **Public display name:** **stark AI Developer**
- **Initial public version:** `1.0.0`
- **Initial plugin type:** Skills only

## 1. Objective

Extend the existing repository so its current Codex bundle can be distributed as **stark AI Developer** without replacing the existing Agent Skills catalog or `npx skills` installation path.

The implementation must package these six reviewed skills:

```text
codex-memory-curator
codex-spec-interviewer
animated-readme-logo
architecture-compass
codegraph-ast-grep
drawio-diagrams
```

Canonical skill content remains under `skills/<category>/<skill>/`. Plugin packages use generated flattened copies so every packaged skill is an immediate child of the package `skills/` directory and no package depends on symlinks or paths outside its root.

## 2. Source reconciliation

This specification consolidates both maintainer-provided implementation drafts. Their shared contract is preserved:

- one canonical skill source;
- one explicit six-skill Codex bundle;
- deterministic generated plugin content;
- checked-in projections with CI drift detection;
- continued `npx skills` support;
- skills-only v1 with no backend, MCP server, authentication, telemetry, or custom UI;
- plugin-level positive, negative, product-boundary, and approval tests;
- deterministic release artifacts and checksums;
- public legal/support URLs and verified publisher identity before submission;
- manual external review and publication rather than GitHub-only publication claims.

The source drafts target OpenAI's native package layout. The portable-package and client-adapter decision is defined by [ADR-0043](../adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.short.md) ([Long, canonical](../adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.long.md) · [Guide](../adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.guide.md)); this specification records the resulting implementation requirements and phased delivery.

## 3. Architecture

```text
skills/<category>/<skill>/       canonical skill content
        │
        └── bundles/codex.json   explicit ordered membership
                │
                ├── plugins/stark-ai-developer/
                │       ├── plugin.json
                │       └── skills/<skill>/
                │
                └── adapters/openai/stark-ai-developer/
                        ├── .codex-plugin/plugin.json
                        ├── assets/
                        └── skills/<skill>/
```

The portable projection follows Agent Plugins. The OpenAI projection is a client adapter generated from the same bundle and canonical skills. Neither generated tree is an author-maintained skill source.

## 4. Bundle contract

Create:

```text
bundles/
├── README.md
├── bundle.schema.json
└── codex.json
```

`bundles/codex.json` is the source for:

- ordered plugin membership;
- the README Codex install command;
- portable projection membership;
- OpenAI adapter membership;
- plugin-level evaluation membership;
- release contents.

Validation must reject:

- unsupported schema versions or fields;
- duplicate names, sources, or bundle IDs;
- non-kebab identifiers;
- absolute paths or parent traversal;
- sources outside public `skills/`;
- Cursor operations, Claude operations, or incubator content;
- missing source directories or `SKILL.md` files;
- symlinked path components or `SKILL.md` files;
- folder, bundle name, and frontmatter-name mismatches;
- README command drift.

Future bundle changes require explicit review of product routing, plugin evaluations, listing capabilities, plugin version, and release notes. Public skills are never added implicitly by category.

## 5. Portable Agent Plugins projection

Target layout:

```text
plugins/stark-ai-developer/
├── plugin.json
├── skills/<skill>/...
├── LICENSE
├── README.md
└── SOURCE-MANIFEST.json
```

Requirements:

- root `plugin.json` conforms to the pinned Agent Plugins contract;
- no OpenAI-only root fields are added to the portable manifest;
- skills are immediate `skills/<name>/SKILL.md` children;
- package paths stay inside the plugin root;
- v1 contains no MCP declaration;
- generated skill content is copied from canonical sources using ordinary files and directories;
- source manifest contains deterministic tree hashes and no timestamps, absolute paths, hostnames, or usernames;
- check mode compares a temporary staged projection with committed content and fails on drift.

## 6. OpenAI adapter projection

Target layout:

```text
adapters/openai/stark-ai-developer/
├── .codex-plugin/plugin.json
├── assets/
│   ├── composer-icon.png
│   └── logo.png
├── skills/<skill>/...
├── LICENSE
├── README.md
└── SOURCE-MANIFEST.json
```

The adapter may contain OpenAI-specific listing, asset, starter-prompt, product-policy, and legal URL fields. Its validator remains separate from portable Agent Plugins validation.

Create `.agents/plugins/marketplace.json` only when the adapter is complete and point its local source to `./adapters/openai/stark-ai-developer`. The repository marketplace is for development, clean-host testing, and optional team distribution. It is not proof of public directory publication.

## 7. Product routing and skill hardening

Before the OpenAI adapter is submitted, audit every bundled canonical `agents/openai.yaml` and `SKILL.md`.

Baseline routing:

| Skill                    | Chat | Codex | Implicit invocation |
| ------------------------ | ---- | ----- | ------------------- |
| `codex-memory-curator`   | No   | Yes   | No                  |
| `codex-spec-interviewer` | Yes  | Yes   | Yes                 |
| `animated-readme-logo`   | Yes  | Yes   | Narrow trigger      |
| `architecture-compass`   | Yes  | Yes   | Yes                 |
| `codegraph-ast-grep`     | No   | Yes   | No                  |
| `drawio-diagrams`        | Yes  | Yes   | Narrow trigger      |

Chat-capable skills must determine whether files, repository context, command execution, and artifact creation are actually available. They must not claim inspection, command execution, rendering, or mutation without host evidence. Codex-capable skills must preserve the active sandbox and approval policy.

Every bundled skill must document inputs, preflight, workflow, decision points, outputs, evidence, incomplete-input behavior, mutation boundaries, required tools, and stop conditions. Every referenced skill-local resource must be included in the package and work from the installed package root.

## 8. Synchronization and packaging

Implement shared tooling and commands in follow-up slices:

```text
scripts/lib/plugin-projections.mjs
scripts/sync-agent-plugin.mjs
scripts/sync-openai-plugin.mjs
scripts/validate-agent-plugin.mjs
scripts/validate-openai-plugin.mjs
scripts/package-agent-plugin.mjs
scripts/package-openai-plugin.mjs
```

Required behavior:

1. load and validate the bundle;
2. resolve only canonical public sources;
3. reject symlinks and special files;
4. copy complete skill trees into a temporary staging directory;
5. normalize ordering and safe permissions;
6. generate deterministic source manifests;
7. atomically replace generated projections in write mode;
8. print concise actionable drift in check mode;
9. never modify canonical skills;
10. never use the network during synchronization.

Release archives must exclude Git data, dependencies, incubator content, repository-only fixtures, secrets, and unsupported filesystem entries. Build twice in separate temporary directories and require identical SHA-256 digests.

## 9. Evaluation plan

Extend the repository's existing evaluation conventions with plugin-level cases for:

- direct positive activation;
- indirect positive activation;
- incomplete input;
- negative non-activation;
- Chat/Codex product boundaries;
- missing repository or tool behavior;
- mutation approval;
- no-invention behavior;
- output contracts;
- cross-skill ambiguity.

Maintain at least one positive case for every initial skill and at least three negative cases. Evidence stores prompts, surface, selected skill, summarized observed behavior, pass/fail criteria, safe excerpts or artifacts, client/model version when available, date, and known variance. Do not store chain-of-thought, credentials, customer data, or private repositories.

## 10. Security, privacy, and non-goals

Version 1 must not introduce:

- a stark AI backend or API;
- LiteLLM or MCP connectivity;
- authentication or connectors;
- telemetry, analytics, or hidden network calls;
- custom UI, apps, hooks, or screenshots;
- runtime downloading of skills;
- Cursor-only, Claude-only, or incubator skills;
- automatic external publication.

Public packages must not contain API keys, tokens, credentials, customer data, private repository URLs, private paths, internal hostnames, environment dumps, or private evaluation artifacts.

## 11. Website and publication prerequisites

Before public OpenAI submission, provide live HTTPS pages for:

- plugin landing page;
- privacy policy;
- terms of service;
- support and security-report routing.

The v1 privacy text must accurately state that the package is skills-only, has no stark AI backend/account/telemetry, and does not itself transmit prompts, repositories, files, outputs, or credentials to stark AI. It must distinguish package behavior from processing performed by the selected host and workspace configuration.

Public release also requires:

- selected and verified publisher identity;
- final square branding assets;
- legal review and final company/contact details;
- country availability decision;
- reviewer-ready positive and negative cases;
- immutable release archive, checksum, and recoverable source commit/tag;
- external scan, review, approval, and explicit publication action;
- clean-account installation and published smoke tests.

Do not mark the plugin as published until the listing is actually visible and installable on supported surfaces.

## 12. Versioning

The plugin uses independent semantic versioning:

- **PATCH:** compatible fixes, safety improvements, or metadata corrections;
- **MINOR:** a new skill or meaningful backward-compatible capability;
- **MAJOR:** removed or renamed skills, incompatible workflows, or a changed privacy/runtime/authentication model.

Every public update is a reviewed snapshot. OpenAI does not consume live GitHub changes for the packaged skills-only artifact. Rollback uses a new patch release restoring last-known-good content; published versions are not reused.

## 13. Implementation phases

### Phase 1 — foundation contract (this PR)

- accept ADR-0043;
- save this consolidated specification;
- add bundle schema and six-skill manifest;
- add focused bundle validation;
- integrate bundle validation into the aggregate;
- update ADR/spec indexes and repository instructions.

Exit: bundle and ADR contracts are reviewable without exposing an incomplete plugin or marketplace entry.

### Phase 2 — portable projection

- root portable manifest;
- deterministic generator and source manifest;
- committed six-skill projection;
- portable validator and reproducible archive.

### Phase 3 — OpenAI adapter

- OpenAI manifest and production assets;
- adapter generator, validator, and packager;
- repository marketplace metadata;
- local and release-tag marketplace tests.

### Phase 4 — hardening and evaluations

- product routing and invocation review;
- capability preflights and mutation boundaries;
- plugin eval cases, fixtures, and sanitized evidence;
- clean-host Chat/Codex testing.

### Phase 5 — release candidate and external publication

- public pages, legal review, publisher identity, and final assets;
- deterministic v1.0.0 release artifacts;
- external submission, scan, review fixes, approval, explicit publication, and clean-account verification.

## 14. Foundation acceptance criteria

- [x] ADR-0043 defines portable packages and separate client adapters.
- [x] The two maintainer drafts are consolidated into one repository specification.
- [x] `bundles/codex.json` explicitly contains the six approved skills.
- [x] Bundle membership is not inferred from categories.
- [x] Sources remain canonical public `skills/` paths.
- [x] Bundle validation checks shape, paths, names, duplicates, symlinks, runtime exclusions, and README drift.
- [x] Root validation includes the bundle gate.
- [x] Repository instructions link the Agent Plugins contract and ADR.
- [ ] Generated projections, marketplace metadata, public pages, evaluations, and release artifacts are implemented in later phases.
- [ ] Public directory publication remains external and is not claimed by this foundation PR.

## 15. Validation commands

```bash
npm run validate:bundles
npm run validate:adrs
node --check scripts/validate-bundles.mjs
npm run validate
pnpm format:check
pnpm lint
```

Hosted pull-request validation remains required for the complete checkout.

## 16. User verification

Review `bundles/codex.json` and verify that the README Codex command installs exactly the six approved skills in the same order. Run the focused and aggregate validation commands.

Later clean-host verification must cover portable package loading, OpenAI marketplace add/list/install/update/uninstall, one positive case per skill, negative cases, no unapproved mutation, editable diagrams, README static fallback, two-build checksum equality, full archive inspection, and every public URL.

## 17. Risks

| Risk                                              | Mitigation                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Canonical and generated trees drift               | Deterministic staging, source hashes, committed projections, mandatory check mode. |
| OpenAI package is mislabeled as portable          | Separate adapter root and validators under ADR-0043.                               |
| Future public skills enter automatically          | Static allowlist and explicit version/evaluation/listing review.                   |
| Chat claims unavailable local actions             | Product routing, capability preflight, boundary tests, honest fallback.            |
| High-impact skills activate implicitly            | Explicit-only memory and CodeGraph policies plus negative tests.                   |
| Archive contains repository noise or private data | Explicit package roots, regular-file checks, secret/privacy scans.                 |
| Publisher or legal metadata mismatches            | Release-blocking identity and legal review before v1 freeze.                       |
| Upstream schemas change                           | Re-verify before release and create a successor ADR for material changes.          |

## 18. Source-challenge summary

The maintainer drafts support one canonical skill source, explicit six-skill composition, deterministic flattening, no symlinks, checked-in generated content, OpenAI metadata review, plugin-level evaluations, public legal/support URLs, deterministic packaging, and manual publication after review.

The source drafts target OpenAI's native layout, while this repository also defines a portable Agent Plugins projection. [ADR-0043](../adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.short.md) governs the boundary between those package contracts; this specification records the resulting source and implementation constraints.

## 19. Done when

Repository implementation is done when one explicit bundle deterministically produces an independently conformant portable Agent Plugins package and an independently conformant OpenAI adapter, with validation, evaluations, public documentation, legal pages, and reproducible release artifacts.

Public launch is done only after the verified publisher submits the exact reviewed archive, external review passes, the publisher explicitly publishes it, **stark AI Developer** is visible on supported public surfaces, and clean-account smoke tests pass.
