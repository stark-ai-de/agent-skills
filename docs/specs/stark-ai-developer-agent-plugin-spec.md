# Implementation Specification: stark AI Developer Skills and OpenAI Plugin Distribution

- **Status:** Repository-local machinery complete; external publication gates pending
- **Contract revision:** 2
- **Implementation readiness:** Repository-local phases 1–4 machinery is complete, including release identity, `zip-store-v1`, contract snapshots, and supply-chain inventory. Phase 5 can generate sanitized evidence that records explicit clean/dirty source state; a dirty tree is not a release freeze. Not release-ready until live-eval, signed provenance, a clean tagged identity, and external publication gates pass
- **Specification date:** 2026-08-19
- **External contracts last verified:** 2026-08-18
- **Repository:** `stark-ai-de/agent-skills`
- **Current phase:** Phase 5 — release-candidate handoff
- **Bundle ID:** `codex`
- **Plugin ID:** `stark-ai-developer`
- **Public display name:** **stark AI Developer**
- **Initial public version:** `1.0.0`
- **Initial OpenAI submission type:** Skills only
- **Public directory target:** Universal Plugins Directory shared by ChatGPT and Codex
- **Public directory entries in v1:** One plugin listing containing six bundled skills
- **Standalone skill distribution:** Preserved for repository, personal, workspace, CLI, and IDE installation paths
- **Plugin source:** `plugins/stark-ai-developer.source.json`
- **Canonical repository marketplace target:** `plugins/stark-ai-developer/`
- **Skill-local OpenAI metadata owner:** canonical skill directories

Repository-local phases 1–4 machinery is implemented. Phase-5 generators and the
evidence writer are present; committed evidence records explicit clean/dirty
source state and is not a freeze until `sourceState` is clean and a release tag
exists. The release descriptor, dated contract snapshots, the
`zip-store-v1` STORE-only archive profile, isolated adapter-marketplace
fixtures, requirement traceability, and the supply-chain inventory command are
present. Internal repeated-trial product evidence and signed release-tag
provenance remain follow-ups. Live Codex add/list/enable/disable/update/remove
client tests, verified publisher identity, live URL/legal
review, portal normalization, OpenAI submission/review/publication, and
clean-account product tests remain external or manual gates; this status does
not claim any of those outcomes.

## 1. Objective and required launch outcomes

Extend the existing repository so the current Codex bundle can be distributed as **stark AI Developer** without replacing the existing Agent Skills catalog or the `npx skills` installation path.

The implementation must package these six reviewed skills:

```text
codex-memory-curator
codex-spec-interviewer
animated-readme-logo
architecture-compass
codegraph-ast-grep
drawio-diagrams
```

Canonical skill content remains under `skills/<category>/<skill>/`. Generated plugin packages use flattened copies so every packaged skill is an immediate child of the package `skills/` directory and no package depends on symlinks or paths outside its root.

The work is complete only when all four outcomes below are distinguished and verified:

1. **Standalone skills remain distributable.** Each canonical skill remains installable through the repository's existing Agent Skills and `npx skills` paths and can be packaged for supported personal or workspace skill installation.
2. **Bundled skills are user-visible.** After installing **stark AI Developer**, the six skills have valid OpenAI skill metadata and can appear as bundled skills on the products allowed by their routing policy.
3. **The first public plugin is listed.** **stark AI Developer** is submitted, approved, explicitly published, searchable, installable, and usable from the universal Plugins Directory shared by ChatGPT and Codex.
4. **Marketplace terminology is unambiguous.** A repository or personal `marketplace.json` is treated only as a local, personal, project, or team catalog. It is never treated as proof of publication in OpenAI's public directory.

### Public listing granularity

Version 1 creates **one public directory listing** named **stark AI Developer**. The six skills are components of that listing, not six independent public directory cards.

This specification does not assume a separate public submission path for standalone skills. Standalone skills may appear in a user's or workspace's Skills collection after installation, upload, creation, or sharing. Public cross-product discovery is achieved through the plugin listing.

If the product requirement later becomes “every skill must have its own independently searchable public directory listing,” create and submit one skills-only plugin per skill. That is a separate release strategy and is out of scope for v1.

### Approved launch and ownership decisions

| ID        | Decision                                                                                                                                                                                                                                                       | Why                                                                                                                                                            | Change gate                                                                    |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `DEC-001` | Version 1 publishes one **stark AI Developer** plugin listing containing six bundled skill identities.                                                                                                                                                         | The public launch target is plugin-level discovery; six near-duplicate cards would add review, branding, and spam risk without improving the bundled workflow. | Product-owner approval; separate one-skill plugins use Phase 7.                |
| `DEC-002` | The committed repository marketplace points to the portable projection at `./plugins/stark-ai-developer`.                                                                                                                                                      | See ADR-0043: the canonical marketplace targets the portable projection.                                                                                       | Successor ADR if the canonical marketplace must target a non-portable package. |
| `DEC-003` | Every bundled skill owns its reviewed `agents/openai.yaml` inside the canonical skill tree.                                                                                                                                                                    | See ADR-0043: skill-local `agents/openai.yaml` is canonical and copied unchanged.                                                                              | Successor ADR if adapters must overlay or replace skill-local metadata.        |
| `DEC-004` | `plugins/stark-ai-developer.source.json` identity fields are the only source for plugin identity, semantic version, submission type, listing strategy, pinned release toolchain, and archive profile.                                                          | Version and release identity otherwise drift across manifests, filenames, worksheets, and evidence.                                                            | Architecture-owner and release-manager approval.                               |
| `DEC-005` | Portable projection is generated and committed; the OpenAI adapter is generated into disposable staging and archived under `dist/openai/`; archives and adapter-marketplace fixtures are generated but not committed; sanitized release evidence is committed. | See ADR-0043: the portable projection is committed; the OpenAI adapter is generated, archived, and not a committed tree.                                       | Architecture-owner approval.                                                   |
| `DEC-006` | Version 1 uses the normative `zip-store-v1` reproducible archive profile.                                                                                                                                                                                      | A platform-independent stored ZIP removes compressor variance and makes byte-for-byte reproduction practical.                                                  | New archive-profile identifier and release review.                             |

## 2. Normative authority and external contract pins

### Normative language

Unless a paragraph or section is explicitly marked non-normative, the requirement terms `must`, `must not`, `required`, `should`, `should not`, and `may` use the meanings of RFC 2119 and RFC 8174 regardless of capitalization. Tables, acceptance criteria, schemas, command contracts, and algorithm steps are normative when they use those terms.

[ADR-0043](../adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.short.md) ([Long, canonical](../adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.long.md) · [Guide](../adrs/0043-package-portable-agent-plugins-and-separate-client-adapters.guide.md)) is authoritative for canonical ownership and the separate portable/OpenAI projection boundary. This specification defines implementation and verification work; it does not duplicate the ADR rationale.

**ADR gate result: Passed.** A successor ADR is required before changing any durable decision concerning:

- canonical skill ownership;
- explicit bundle ownership;
- the portable package root or fixed component locations;
- the separate OpenAI projection boundary;
- the runtime, authentication, telemetry, backend, connector, or privacy model.

### External contract pins

| Contract                                                                                            | Required use                                                             |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [Agent Skills specification](https://agentskills.io/specification)                                  | Canonical `SKILL.md` and skill-tree contract.                            |
| [Agent Plugins 1.0.0 specification](https://agent-plugins.org/specification)                        | Portable package and fixed component-discovery contract.                 |
| [Agent Plugins 1.0.0 manifest schema](https://agent-plugins.org/schemas/1.0.0/plugin.schema.json)   | Official schema for generated portable root `plugin.json`.               |
| [OpenAI skill building](https://developers.openai.com/plugins/build/skills)                         | OpenAI skill workflow, resources, triggering, and packaging guidance.    |
| [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins)                      | OpenAI package layout, manifest, assets, and local marketplace contract. |
| [OpenAI plugin submission](https://developers.openai.com/plugins/deploy/submission)                 | Skills-only submission, identity, test, review, and publication flow.    |
| [OpenAI submission error reference](https://developers.openai.com/plugins/deploy/submission-errors) | Current machine-enforced limits and exclusion rules.                     |
| [OpenAI plugin surfaces](https://learn.chatgpt.com/docs/plugins)                                    | Supported ChatGPT and Codex surfaces and IDE boundary.                   |
| [Skills in ChatGPT](https://help.openai.com/en/articles/20001066-skills-in-chatgpt)                 | Personal upload, sharing, workspace publication, and admin controls.     |

The repository must pin any external schemas required for offline validation. External contracts must be reverified before Phase 3 implementation and again before Phase 5 release freeze. A material incompatibility requires a successor ADR; compatible metadata or validation changes may update this specification and its validators.

### External source precedence and contract snapshots

External claims must use the most specific current official source for the claim:

1. machine-readable official schemas outrank prose for schema-validity questions;
2. current product-surface documentation outranks historical changelog announcements for availability and client-boundary claims;
3. current packaging, submission, and submission-error documentation outranks general plugin guidance for build and portal limits;
4. current Help Center documentation is supporting evidence for user/workspace behavior;
5. changelog entries are historical evidence only and must not establish current support by themselves.

When official sources conflict, the release must use the more conservative claim, record the conflict, and block stronger public wording until a current authoritative source or observed product test resolves it.

The Agent Plugins 1.0.0 schema is already pinned at `scripts/vendor/agent-plugins/1.0.0/plugin.schema.json`. Dated OpenAI contract snapshots live under `scripts/vendor/snapshots/` and are selected by `plugins/stark-ai-developer.source.json`. Do not invent a second `contracts/` tree. Each snapshot must contain or reference:

- snapshot schema version and stable contract ID;
- official source URL, title, and verification date;
- the exact machine-enforced facts used by validators;
- source checksum or immutable schema checksum where available;
- affected requirement IDs and validator names;
- source-precedence class and any unresolved conflict;
- the maintainer who performed the verification.

Do not copy long source documents into snapshots. Record only the facts necessary for local validation and auditability. Never overwrite a historical snapshot; add a new dated snapshot and update the active plugin source reference or validator reference.

## 3. OpenAI distribution model and terminology

The phrase **OpenAI marketplace** is too ambiguous to use as an artifact or acceptance criterion. Use the exact terms below.

| Term                        | Meaning in this specification                                            | Public?                                        | Counts as v1 launch? |
| --------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------- | -------------------- |
| Canonical skill             | Author-maintained skill under `skills/<category>/<skill>/`               | Repository-dependent                           | No                   |
| Standalone skill            | A skill installed or shared without the `stark-ai-developer` plugin      | Personal, workspace, repo, or client dependent | Partially            |
| Repository marketplace      | `.agents/plugins/marketplace.json` committed in the repository           | No                                             | No                   |
| Personal marketplace        | `~/.agents/plugins/marketplace.json` on one user's machine               | No                                             | No                   |
| Workspace plugin            | A plugin shared or published only inside a workspace                     | No, workspace-only                             | No                   |
| Public plugin submission    | A draft created in the OpenAI Platform plugin submission portal          | Not until published                            | No                   |
| Universal Plugins Directory | OpenAI's public directory shared by supported ChatGPT and Codex surfaces | Yes                                            | Yes                  |
| Plugin listing              | The public card and detail page for **stark AI Developer**               | Yes                                            | Yes                  |
| Bundled skill listing       | Per-skill identity and metadata exposed after plugin installation        | Through the plugin                             | Yes                  |

A GitHub repository, GitHub release, package archive, `marketplace.json`, workspace publication, or successful local installation does not create a public OpenAI listing.

## 4. Supported-surface contract

The release must document and test current product boundaries rather than promising generic “ChatGPT and Codex” support.

| Surface                          | Public plugin browse/install                                                                                | Bundled skills after install                                     | Standalone skills                                       | Required v1 test                   |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------- |
| ChatGPT web — Chat/Work          | Yes, when available to the account/workspace/region                                                         | Yes, subject to `CHAT` policy and host capabilities              | Personal/workspace paths supported by eligible accounts | Yes                                |
| ChatGPT desktop — Chat/Work      | Yes                                                                                                         | Yes, subject to `CHAT` policy and host capabilities              | Yes                                                     | Yes                                |
| ChatGPT mobile — Chat/Work       | Installed plugins available to the account may be used                                                      | Yes, subject to account availability                             | Do not claim desktop parity without verification        | Smoke test when available          |
| Codex in the ChatGPT desktop app | Yes                                                                                                         | Yes, subject to `CODEX` policy and sandbox/approval settings     | Yes                                                     | Yes                                |
| Codex CLI 0.147.0 or later       | Portable plugin browser and configured marketplaces; OpenAI adapter only for a target flow that requires it | Yes after starting a new session                                 | Yes                                                     | Yes                                |
| Codex IDE extension              | Do not claim public plugin support                                                                          | No plugin guarantee                                              | Standalone skills supported                             | Yes, standalone-only boundary test |
| ChatGPT Skills page              | Not the public plugin directory entry itself                                                                | Bundled skills may become available through the installed plugin | Installed, created, shared, and workspace skills        | Yes for supported account          |

Availability may vary by plan, workspace policy, role, region, client version, and authentication method. The public listing, landing page, and README must not promise availability beyond supported surfaces.

### Surface evidence contract

Each supported-surface row must have a release-evidence record containing:

- requirement ID and surface name;
- official source and `verifiedOn` date;
- exact client version or build identifier;
- account plan, workspace-policy state, role, region, and authentication mode when relevant;
- package form used, including portable projection, OpenAI adapter, standalone skill, or public listing;
- test date, result, limitations, and evidence reference;
- whether the result is documentation-derived, observed, or both.

A historical changelog claim without a current surface document and observed test is insufficient. A source conflict or failed observed test downgrades the public claim to the last verified conservative boundary.

## 5. Scope

### In scope

- one explicit six-skill bundle manifest and repository-owned bundle-input schema;
- one release descriptor and schema for identity, version, listing strategy, release toolchain, and archive profile;
- dated external-contract snapshots and requirement-to-test traceability;
- deterministic portable, OpenAI, and optional standalone projections from canonical public skills;
- focused validators, synchronization commands, provenance records, and reproducible packaging;
- product-routing and invocation-policy hardening;
- plugin-level evaluations and sanitized evidence;
- repository and personal marketplace metadata for development and team testing;
- one public OpenAI listing for **stark AI Developer**;
- legal, support, publisher, release, submission, review, supply-chain, licensing, and post-publication requirements;
- continued support for the existing Agent Skills catalog and `npx skills` installation path.

### Non-goals for version 1

Version 1 must not add:

- a stark AI backend or API;
- an MCP server or LiteLLM connection;
- `.mcp.json`, `.app.json`, authentication, accounts, or connectors;
- telemetry, analytics, or hidden network calls;
- runtime skill downloads;
- lifecycle hooks required for the core workflow;
- custom runtime UI;
- Cursor-only, Claude-only, or incubator skills;
- automatic workspace or public-directory publication;
- six independent public directory cards;
- a committed `adapters/openai/` tree.

The skills-only package may include approved logo and composer-icon assets. It must not include `interface.screenshots`; OpenAI permits submission screenshots only for MCP-backed custom UI. Screenshots used on an external landing page remain outside the skills-only submission archive and must not imply unsupported runtime behavior.

## 6. Initial release composition

`plugins/stark-ai-developer.source.json` must contain exactly these skill entries, in this order:

| Skill                    | Canonical source                                    |
| ------------------------ | --------------------------------------------------- |
| `codex-memory-curator`   | `skills/codex-operations/codex-memory-curator`      |
| `codex-spec-interviewer` | `skills/codex-operations/codex-spec-interviewer`    |
| `animated-readme-logo`   | `skills/engineering-workflows/animated-readme-logo` |
| `architecture-compass`   | `skills/engineering-workflows/architecture-compass` |
| `codegraph-ast-grep`     | `skills/engineering-workflows/codegraph-ast-grep`   |
| `drawio-diagrams`        | `skills/engineering-workflows/drawio-diagrams`      |

Required bundle identity:

```text
id: codex
displayName: stark AI Developer
distributions.skillsCliAgent: codex
distributions.portablePlugin: stark-ai-developer
distributions.openaiPlugin: stark-ai-developer
```

The bundle is an explicit, version-controlled allowlist. Category membership, directory discovery, and “all public skills” logic must never add a skill implicitly.

### Release identity source of truth

Create and maintain:

```text
plugins/stark-ai-developer.source.json
plugins/stark-ai-developer.source.schema.json
```

Identity fields in this sibling source file are the sole author-maintained release-identity source. Generated manifests, source manifests, archive names, checksums, worksheets, release notes, and evidence must not introduce another version source. Duplicated `1.0.0` fields in listing copy and generated manifests must stay aligned with this file. Catalog version stays in `package.json`.

Current identity values in `plugins/stark-ai-developer.source.json`:

```json
{
  "schemaVersion": 1,
  "id": "codex",
  "pluginId": "stark-ai-developer",
  "version": "1.0.0",
  "listingId": "stark-ai-developer",
  "submissionType": "skills-only",
  "publicListingStrategy": "single-plugin-six-bundled-skills",
  "outputs": {
    "portableProjection": "plugins/stark-ai-developer",
    "openaiArchive": "dist/openai/stark-ai-developer-1.0.0.zip",
    "repositoryMarketplaceTarget": "plugins/stark-ai-developer"
  },
  "contractSnapshots": {
    "agentPlugins": "agent-plugins-1.0.0"
  },
  "build": {
    "nodeVersion": "24.18.0",
    "pnpmVersion": "11.22.0",
    "archiveProfile": "zip-store-v1"
  }
}
```

The plugin source file's identity fields are the sole source for:

- plugin ID and immutable package name;
- semantic version and versioned archive names;
- bundle and listing selection;
- submission type and public-listing strategy;
- generated projection paths and canonical repository marketplace target;
- active external-contract snapshot identifiers;
- exact release Node.js and pnpm versions;
- reproducible archive-profile identifier.

Validators must then require `package.json#packageManager` to equal `pnpm@11.22.0`, `.node-version` to equal `24.18.0`, and `package.json#engines.node` to admit that version. Manually duplicated version fields are allowed only in generated artifacts and must fail drift checks.

Version 1 creates one public plugin listing. The six skills are bundled components with their own OpenAI metadata; they are not six independent public directory listings. Independent public discovery for a skill requires a separate one-skill plugin package and submission, which is an optional later phase.

## 7. Implementation architecture

```text
skills/<category>/<skill>/          canonical author-maintained skills, including agents/openai.yaml
        │
        └── plugins/stark-ai-developer.source.json  membership and plugin identity
                │
                ├── docs/listing/openai/stark-ai-developer.json
                ├── plugins/stark-ai-developer/
                │       ├── plugin.json
                │       └── skills/<skill>/
                │
                ├── dist/openai/stark-ai-developer-1.0.0.zip
                │       └── skills-only archive from ephemeral OpenAI adapter staging
                │
                └── dist/skills/<skill>.zip
                        └── optional standalone skill archives
```

Publication flow:

```text
portable projection ──> committed repository marketplace ──> Codex/local portable testing

OpenAI-native archive from ephemeral staging
    └── isolated temporary marketplace or direct path ──> native adapter testing
    └── immutable ZIP ───────────> OpenAI Platform draft
                                      ├── normalized manifest review
                                      ├── listing metadata
                                      ├── starter prompts
                                      ├── positive/negative tests
                                      ├── country availability
                                      ├── policy attestations
                                      └── review → approval → explicit publish
                                                           │
                                                           └── Universal Plugins Directory
```

Neither generated tree is an author-maintained skill source. The portable
projection is committed. The OpenAI-native adapter is generated into disposable
staging at package time, archived, and deleted; it is not a second committed
skill tree. The OpenAI portal may normalize manifest fields; the submitted ZIP,
portal-normalized manifest, accepted diff, and final form metadata must
therefore all be retained as sanitized release evidence.

### Artifact ownership and lifecycle

| Artifact                                       | Authority                                 | Generated | Committed | Distribution or evidence destination                                           |
| ---------------------------------------------- | ----------------------------------------- | --------: | --------: | ------------------------------------------------------------------------------ |
| `skills/<category>/<skill>/`                   | Skill maintainer                          |        No |       Yes | Repository, `npx skills`, all projections                                      |
| `skills/<category>/<skill>/agents/openai.yaml` | Skill maintainer                          |        No |       Yes | Copied unchanged into portable, OpenAI, and standalone skill trees             |
| `plugins/stark-ai-developer.source.json`       | Product, architecture, and release owners |        No |       Yes | Membership and plugin identity                                                 |
| `docs/listing/openai/stark-ai-developer.json`  | Product owner, legal reviewer, publisher  |        No |       Yes | Generated manifest, worksheet, and portal copy                                 |
| `scripts/vendor/agent-plugins/1.0.0/`          | Architecture owner                        |        No |       Yes | Offline portable-manifest validation                                           |
| `plugins/stark-ai-developer/`                  | Generator                                 |       Yes |       Yes | Portable installation and repository marketplace                               |
| Ephemeral OpenAI adapter stage                 | Generator                                 |       Yes |        No | Native OpenAI testing and submission staging; deleted after archive            |
| `.agents/plugins/marketplace.json`             | Generator from release policy             |       Yes |       Yes | Repository-local portable discovery only                                       |
| OpenAI adapter marketplace fixture             | Test harness                              |       Yes |        No | Isolated temporary test root only                                              |
| `dist/**` archives and checksum files          | Packager                                  |       Yes |        No | CI artifact, GitHub release attachment, or portal upload                       |
| Sanitized release-evidence records             | Evidence generator plus maintainer review |       Yes |       Yes | Audit, release, and post-publication verification                              |
| OpenAI portal draft and reviewer communication | OpenAI Platform                           |    Partly |        No | Portal only; commit only sanitized identifiers, manifests, diffs, and outcomes |

Generated artifacts must carry a generated-file notice where the target format permits it and must never be hand-edited. The documented sync command is the only restoration path for the portable projection. `dist/` and temporary marketplaces remain ignored by Git. `npm run sync:openai-plugin` is a refuse-redirect and must not materialize `adapters/openai/stark-ai-developer/`.

## 8. Plugin source contract

Create and maintain:

```text
plugins/
├── README.md
├── stark-ai-developer.source.json
├── stark-ai-developer.source.schema.json
└── stark-ai-developer/          # generated; do not hand-edit
```

`plugins/stark-ai-developer.source.schema.json` is a repository-owned schema for membership and plugin identity. It is intentionally distinct from the official Agent Plugins schema, which applies only to generated portable `plugin.json` files.

Membership fields in `plugins/stark-ai-developer.source.json` are the sole source for:

- direct-install skill order;
- portable projection membership;
- OpenAI adapter membership;
- plugin-evaluation membership;
- optional standalone-skill release membership;
- release contents.

Identity fields in the same file remain the sole source for plugin identity, as required by `DEC-004`. Listing copy, release notes, and starter prompts may be maintained separately because they are release metadata rather than membership.

### Plugin-source validation requirements

`npm run validate:bundles` must fail when any of the following is true:

1. A JSON file cannot be parsed.
2. A parsed source file is `null`, an array, a scalar, or otherwise not a top-level object.
3. The source file does not validate against `plugins/stark-ai-developer.source.schema.json`, including unsupported fields or schema versions.
4. A membership ID, distribution ID, or skill name violates its declared identifier contract.
5. Membership IDs, skill names, or skill sources are duplicated where uniqueness is required.
6. A source is not exactly `skills/<category>/<skill>` in normalized POSIX form.
7. A source is absolute, contains `.` or `..` path segments, escapes `skills/`, or selects Cursor, Claude, or incubator content.
8. A source path component, source directory, or `SKILL.md` is a symlink.
9. A source directory or regular `SKILL.md` file is missing.
10. The bundle name, source-folder name, and `SKILL.md` frontmatter `name` differ.
11. `README.md` does not contain one Codex install command whose parsed tokens exactly match the ordered bundle membership and fixed arguments. Substring matching is insufficient.
12. Root README text claims that bundle membership is inferred from categories or all public skills.
13. A bundled skill's combined OpenAI identity `stark-ai-developer:<skill-name>` exceeds the current OpenAI limit.
14. A routing declaration cannot be represented by the supported OpenAI `products` and Boolean `allow_implicit_invocation` schema.
15. Membership `id`, distribution plugin IDs, or public-listing strategy disagree with the identity fields in the same source file.
16. A release-affecting field is duplicated outside its authoritative input and the generated value has drifted.

The validator must enforce one authoritative contract. It may evaluate the JSON Schema directly or generate equivalent checks from it, but a parsed-yet-unused schema plus separately maintained looser guards is not acceptable.

`plugins/README.md` must describe the post-merge repository state in present tense and distinguish the generated package from the sibling source file. PR-specific or future-tense implementation wording is not allowed.

### Membership-change review gate

Any membership change requires an explicit review of:

- target-product routing and invocation policy;
- positive, negative, boundary, and ambiguity evaluations;
- listing capabilities and starter prompts;
- semantic version impact;
- release notes and public documentation.

Listing copy, starter prompts, release notes, country availability, and publisher identity may be maintained in a separate reviewed listing source because they are release metadata rather than bundle membership. They must not be duplicated manually across generated artifacts.

## 9. Portable Agent Plugins projection

Target layout:

```text
plugins/stark-ai-developer/
├── plugin.json
├── skills/
│   └── <skill>/...
├── LICENSE
├── README.md
└── SOURCE-MANIFEST.json
```

Requirements:

- Root `plugin.json` uses `$schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json"` and validates offline against the repository-pinned copy at `scripts/vendor/agent-plugins/1.0.0/plugin.schema.json`.
- The manifest contains only fields allowed by Agent Plugins 1.0.0. OpenAI-only fields must not be added to the portable root.
- `name` is `stark-ai-developer`. `name` and `version` derive from `plugins/stark-ai-developer.source.json`. Repository release policy requires semantic `version` values even though the portable schema does not enforce SemVer.
- Skills are discovered only as immediate `skills/<name>/SKILL.md` children.
- Version 1 contains no `mcp.json`.
- Every package path remains inside the plugin root.
- Generated skill files, including canonical `agents/openai.yaml`, are byte-identical to canonical source files. Portable clients may ignore OpenAI metadata, but the projection must not remove or rewrite it. Traversal order, safe permissions, and archive metadata may be normalized; file contents must not be rewritten.
- The projection contains only regular files and directories. Symlinks, sockets, devices, FIFOs, and other special files are rejected.
- Check mode stages a fresh projection in a temporary directory, compares it with committed content, and reports concise, actionable drift.

The official schema identifier is a contract identifier, not a runtime network dependency. Synchronization, validation, and client loading must not fetch it dynamically.

The repository-owned `plugins/stark-ai-developer.source.schema.json` does not replace this official schema. The former validates build inputs; the latter validates the generated portable package manifest. Root `plugin.json` must not contain a `skills` field because Agent Plugins discovers skills from the fixed `skills/` location and its manifest schema is closed.

## 10. OpenAI public plugin projection

The OpenAI-native package is generated into disposable staging at package or
adapter-validation time. It is not committed. The archive under
`dist/openai/` is the distribution artifact. Target layout of the staged
package and submitted ZIP:

```text
.codex-plugin/
│   └── plugin.json
assets/
│   ├── composer-icon.png
│   └── logo.png
skills/
│   └── <skill>/
│       ├── SKILL.md
│       ├── agents/openai.yaml
│       └── referenced scripts, templates, references, and assets
LICENSE
README.md
SOURCE-MANIFEST.json
```

### Canonical ownership of skill-local OpenAI metadata

For every bundled skill, the authoritative file is:

```text
skills/<category>/<skill>/agents/openai.yaml
```

The OpenAI adapter generator must validate and copy this file unchanged. It must not create, merge, overlay, rewrite, or delete skill-local metadata. The same file is copied into the portable projection and enabled standalone archives so all distributions expose one reviewed skill identity and routing policy. Package-level `.codex-plugin/plugin.json`, listing assets, and portal-only metadata remain generated inside the disposable OpenAI adapter.

A missing or invalid canonical `agents/openai.yaml` is release-blocking for an included skill. A client that ignores the file may still consume the remaining conformant skill tree; no portable manifest behavior may depend on OpenAI-specific fields.

### Required manifest contract

`.codex-plugin/plugin.json` must include at least:

- `name`: `stark-ai-developer`;
- `version`: semantic version, initially `1.0.0`, derived from the release descriptor;
- `description`: accurate package description;
- `author.name`: publisher identity compatible with the verified identity selected in the portal;
- `skills`: exactly `./skills/`;
- `interface.displayName`;
- `interface.shortDescription`;
- `interface.longDescription`;
- `interface.developerName`;
- `interface.category`;
- `interface.capabilities`;
- `interface.defaultPrompt` as one string or a list of no more than three starter prompts;
- `interface.logo`;
- `interface.composerIcon`;
- `interface.websiteURL`;
- `interface.privacyPolicyURL`;
- `interface.termsOfServiceURL`;
- `interface.supportURL`;
- `interface.brandColor` from the reviewed listing light brand color;
- `interface.brandColorDark` from the reviewed listing dark brand color.

Technical limits to encode in validation:

- package name: at most 64 characters and valid OpenAI package-name syntax;
- display name: at most 30 characters for final directory submission;
- short description: at most 30 characters;
- long description: at most 4,000 characters;
- developer name: at most 80 characters for final directory submission;
- capabilities: no more than 20, each at most 120 characters;
- starter prompts: no more than three, unique, one line, each at most 128 characters for final submission, and without plugin `@mentions`;
- top-level description: at most 1,024 characters;
- listing URLs: HTTPS, public, stable, and no embedded credentials;
- brand colors: six-digit hex values with the required contrast;
- logo and composer icon: required, square, supported image format, no more than 5 MiB, and 48–4,096 pixels for raster images.

Although the four listing URLs are technically optional for a skills-only package at package-validation time, this specification intentionally requires all four for trust, support, legal review, and publication readiness.

### Skills-only exclusions

Version 1 must not contain:

- `mcpServers` or `.mcp.json`;
- `apps` or `.app.json`;
- `interface.screenshots`;
- custom UI;
- connectors;
- authentication declarations;
- hooks required for the core workflow.

A future MCP-backed release must use the portal's MCP submission path and receive a new architecture, security, privacy, hosting, domain-verification, tool-annotation, and evaluation review.

### Portal normalization

The OpenAI submission portal may normalize and save the manifest as `.codex-plugin/plugin.json`. Any change must be shown as a diff and explicitly accepted by a maintainer. Release evidence must record:

- submitted archive SHA-256;
- source commit and tag;
- submitted manifest;
- portal-normalized manifest;
- accepted normalization diff;
- portal draft/submission identifier;
- selected verified identity;
- submitted countries or regions;
- submitted listing text, prompts, tests, release notes, and attestations;
- approval and publication status.

Secrets, session cookies, access tokens, and private reviewer communication must not be committed.

## 11. Marketplace positioning and public listing contract

The current six-skill bundle risks appearing as a generic collection unless it has one coherent user promise. Before release freeze, approve a single positioning statement and prove that every bundled skill supports it.

Recommended v1 positioning:

> A developer workflow toolkit that turns software ideas and code context into implementation-ready specifications, architecture decisions, structural code findings, editable diagrams, project documentation assets, and safely curated Codex memory.

### Cohesion and originality gate

For every skill, document:

- the concrete user intent it serves;
- the structured method or resources that make it more than a generic prompt;
- the output contract;
- why it belongs in this plugin rather than a separate package;
- how it differs from or adds repeatability to native ChatGPT or Codex behavior;
- which product surfaces can execute it honestly;
- the evidence showing reliable activation and non-activation.

`animated-readme-logo` is the most likely cohesion outlier. It may remain only if the listing and evaluations position it clearly as part of developer documentation and repository presentation. Otherwise remove it from v1 or publish it later as a separate single-skill plugin.

### Listing metadata source of truth

The reviewed source file is:

```text
docs/listing/openai/stark-ai-developer.json
```

It must contain the exact public and portal values for:

- package name;
- display name;
- short and long descriptions;
- developer name;
- category, taken from the active dated OpenAI submission snapshot enum;
- capability statements;
- starter prompts;
- brand colors;
- asset paths;
- website, privacy, terms, and support URLs;
- country or region selection;
- release notes;
- publisher identity decision.

The generator must use this source for `.codex-plugin/plugin.json`, release documentation, validation fixtures, and the human submission worksheet. Identity and version come from `plugins/stark-ai-developer.source.json`, not the listing source. CI must fail when duplicated listing text or release identity drifts.

### Initial listing values to review

```yaml
name: stark-ai-developer
display_name: stark AI Developer
short_description: Developer workflow toolkit
category: Developer Tools
```

Suggested capabilities:

- Turn rough feature ideas into implementation-ready specifications.
- Compare software architecture options with explicit tradeoffs.
- Search code structurally with CodeGraph and ast-grep workflows.
- Create editable draw.io diagrams from system context.
- Create repository documentation and animated README assets.
- Curate durable Codex memory with explicit safety boundaries.

Suggested starter prompts:

1. `Turn this feature idea into an implementation-ready specification.`
2. `Review the available code context and recommend an architecture with explicit tradeoffs.`
3. `Create an editable draw.io diagram for this system.`

These are draft values, not automatic approval. Final copy must be validated against length limits, actual skill behavior, product routing, fair-discovery rules, and reviewer test evidence.

## 12. Bundled skill metadata and product routing

Every bundled canonical skill must include `skills/<category>/<skill>/agents/openai.yaml` so the skill has one deliberate user-facing identity and routing policy. Projections copy that file to `skills/<skill>/agents/openai.yaml` without modification.

Required structure:

```yaml
interface:
  display_name: Human-readable skill name
  short_description: Concise and accurate user-facing purpose
  icon_small: ./assets/icon.png # optional when provided and valid
  icon_large: ./assets/icon.png # optional when provided and valid
  brand_color: "#000000" # optional when approved
  default_prompt: A realistic prompt for this skill.

policy:
  products:
    - CHAT
    - CODEX
  allow_implicit_invocation: true

# Omit `dependencies` when no external tool dependency is required.
```

Only supported fields may be used. In particular:

- `policy.products` may contain only `CHAT`, `CODEX`, or both;
- `policy.allow_implicit_invocation` must be exactly `true` or `false`;
- `Narrow trigger` is not a serializable policy value;
- narrow implicit behavior must be encoded through precise skill name, frontmatter description, trigger conditions, instructions, and negative tests;
- only `dependencies.tools` is supported under `dependencies`; omit `dependencies` when no external tool dependency is required;
- `interface.display_name` and `interface.short_description` are mandatory whenever `agents/openai.yaml` exists;
- every referenced icon or asset path must remain inside the skill or plugin package and use a safe relative path;
- the adapter must not overlay or generate the file; canonical ownership is verified before projection;
- package-level listing metadata must not redefine a skill name, description, product policy, or invocation policy.

### Baseline routing decision

| Skill                    | OpenAI products | `allow_implicit_invocation` | Additional requirement                                                                                     |
| ------------------------ | --------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `codex-memory-curator`   | `CODEX`         | `false`                     | Explicit invocation; never alter memory without an approved scope and host evidence.                       |
| `codex-spec-interviewer` | `CHAT`, `CODEX` | `true`                      | Avoid unnecessary interrogation; proceed with bounded assumptions when sufficient context exists.          |
| `animated-readme-logo`   | `CHAT`, `CODEX` | `true`                      | Very narrow description and strong negative tests; require artifact capability before claiming generation. |
| `architecture-compass`   | `CHAT`, `CODEX` | `true`                      | Distinguish advice from inspection of an actual repository.                                                |
| `codegraph-ast-grep`     | `CODEX`         | `false`                     | Explicit invocation; verify required tools and repository access before claiming results.                  |
| `drawio-diagrams`        | `CHAT`, `CODEX` | `true`                      | Narrow diagram intent; create editable output only when artifact or file capability exists.                |

The values above are release decisions. Any change requires updated metadata, positive tests, negative tests, product-boundary tests, listing capabilities, and release notes.

### Skill hardening contract

Every bundled skill must document:

- intended and excluded user intents;
- inputs and minimum viable input;
- capability preflight;
- required tools and fallback behavior;
- workflow and decision points;
- output shape;
- evidence and verification rules;
- incomplete-input behavior;
- mutation boundaries and approvals;
- stop conditions;
- product-specific constraints;
- no-invention behavior;
- local path resolution from the installed package root.

Chat-capable skills must determine whether files, repository context, command execution, web access, and artifact creation are actually available. They must not claim inspection, execution, rendering, or mutation without host evidence. Codex-capable skills must preserve the active sandbox, network, and approval policy.

## 13. Standalone skill distribution

The public plugin does not replace standalone skill installation. Generate optional standalone artifacts from the same canonical sources:

```text
dist/skills/
├── codex-memory-curator.zip
├── codex-spec-interviewer.zip
├── animated-readme-logo.zip
├── architecture-compass.zip
├── codegraph-ast-grep.zip
└── drawio-diagrams.zip
```

Each standalone archive must:

- contain exactly one skill root or the exact structure required by the target installer;
- preserve `SKILL.md`, `agents/openai.yaml`, scripts, references, templates, and assets;
- contain no plugin-level manifest;
- contain no private or repository-only content;
- be reproducible and checksummed;
- be tested through supported ChatGPT upload or sharing paths where the account permits;
- be tested in Codex CLI and the IDE extension as a standalone skill;
- preserve the existing `npx skills` and repository installation behavior.

Do not claim automatic synchronization or cross-surface parity for personal skills unless the exact behavior has been verified on the current clients and account type.

The README must distinguish:

- public plugin installation;
- local or repository plugin installation;
- standalone ChatGPT skill upload or sharing;
- standalone Codex skill installation;
- `npx skills` installation.

## 14. Repository and target-specific marketplace contract

### Canonical repository marketplace

Create `.agents/plugins/marketplace.json` only when the portable projection is complete. Generate it from release policy with `npm run sync:agent-plugin`; `--check` fails when the committed file drifts. Point its repository-local source to `./plugins/stark-ai-developer`, as required by ADR-0043. The OpenAI adapter remains a separate packaging and submission projection.

This committed marketplace is the canonical local/repository catalog for Codex CLI 0.147.0 or later. It must not point to a staged or committed OpenAI adapter and must not be rewritten for adapter tests.

The marketplace entry must have:

- a stable marketplace name;
- one plugin entry for `stark-ai-developer`;
- a safe `./`-prefixed relative source path;
- a human-readable marketplace display name;
- `policy.installation`, `policy.authentication`, and a supported `category` value as required by the current marketplace contract;
- deterministic ordering;
- no absolute paths, credentials, tokens, machine-specific state, or public-directory claims.

`source.path` is resolved relative to the marketplace root, not relative to the `.agents/plugins/` directory. A skills-only plugin with no authentication flow still emits `policy.authentication: "ON_INSTALL"`. That is the conservative contract-compatible representation until OpenAI documents a distinct no-auth value. Unsupported sentinel values such as `NONE` must not be used. Current marketplace clients support `ON_INSTALL` and `ON_USE` authentication triggers. Marketplace `category` values must come from the active dated OpenAI submission snapshot.

### OpenAI adapter test marketplace

Native OpenAI adapter tests must either install the staged adapter directly or generate a temporary marketplace in an isolated staging root. The generated fixture:

- points to the staged OpenAI adapter through a safe relative path;
- is not committed and never replaces `.agents/plugins/marketplace.json`;
- contains no personal, absolute, or machine-specific path;
- is deleted after the test;
- is validated against the same current marketplace contract.

A personal marketplace test may use a separately generated fixture whose source is resolvable from that fixture's own root. Copying the repository marketplace file into a different root without rewriting and validating its source is not a valid personal-marketplace test.

### Required tests

- repository portable-marketplace discovery;
- Codex CLI 0.147.0-or-later add/list/install/enable/disable/update/remove behavior;
- isolated OpenAI-adapter discovery or direct-path installation;
- personal-marketplace discovery using a root-correct generated fixture;
- clean clone and release-tag behavior;
- failure on a missing, unsafe, stale, or drifted projection;
- proof that adapter tests leave the canonical repository marketplace byte-identical;
- no claim that any local marketplace is the Universal Plugins Directory.

## 15. Synchronization, provenance, validation, and packaging

Implemented shared tooling:

```text
scripts/lib/plugin-projections.mjs
scripts/sync-agent-plugin.mjs
scripts/sync-openai-plugin.mjs
scripts/sync-standalone-skills.mjs
scripts/validate-agent-plugin.mjs
scripts/validate-openai-plugin.mjs
scripts/validate-openai-listing.mjs
scripts/validate-openai-submission.mjs
scripts/validate-standalone-skills.mjs
scripts/package-agent-plugin.mjs
scripts/package-openai-plugin.mjs
scripts/package-standalone-skills.mjs
scripts/verify-release-reproducibility.mjs
scripts/validate-archives.mjs
scripts/validate-network-endpoints.mjs
scripts/generate-openai-submission-worksheet.mjs
scripts/lib/reproducible-archive.mjs
scripts/lib/release-descriptor.mjs
scripts/validate-release-descriptor.mjs
scripts/validate-contract-snapshots.mjs
scripts/generate-openai-marketplace-fixture.mjs
scripts/generate-traceability.mjs
scripts/verify-supply-chain.mjs
```

`scripts/sync-openai-plugin.mjs` is a refuse-redirect. It does not materialize `adapters/openai/stark-ai-developer/`. Validate or package the native adapter with `npm run validate:openai-plugin` and `npm run package:openai-plugin`.

### Shared synchronization behavior

All projection generators must:

1. load and validate the bundle, listing source, the release descriptor, and active contract snapshots before resolving any skill;
2. resolve only canonical public sources listed by the bundle;
3. enumerate bundled and release-input files from `git ls-files --stage -z` only, reject Git symlinks (`120000`), submodules (`160000`), filesystem symlinks, special files, untracked or ignored files under those roots, and unsafe or colliding paths throughout every selected tree;
4. require and validate canonical `agents/openai.yaml` for every included skill;
5. copy complete skill trees into a clean temporary staging directory without overlays or byte rewriting;
6. preserve file bytes and canonical executable intent;
7. remove special permission bits and group/world write access from generated output;
8. enumerate paths in stable POSIX UTF-8 byte order;
9. generate deterministic source manifests;
10. for the portable projection, atomically replace only the committed target in write mode;
11. for the portable projection, produce concise added, removed, changed, and metadata drift in check mode; for the OpenAI adapter, generate disposable staging, validate it, archive it, and delete the stage;
12. never mutate canonical skills, the bundle, listing source, or the release descriptor;
13. never use the network;
14. validate portable and OpenAI projections independently;
15. derive standalone artifacts and the OpenAI submission ZIP from the same validated canonical skill snapshot;
16. generate a human-readable submission worksheet from the reviewed listing source;
17. leave the committed repository marketplace unchanged during OpenAI-adapter tests.

Safe permission normalization is:

- directories: `0755`;
- regular non-executable files: `0644`;
- regular files executable in the canonical source: `0755`.

When Git-index modes are used as the executable-intent source, accept only blob modes `100644` and `100755`. Filesystem executable bits are not authoritative on Windows checkouts. Projection, packaging, the release-input digest, and isolated reproducibility copies use Git-index modes for tracked blobs and fail closed when a source file has no regular Git blob entry or when untracked or ignored files exist under a selected source root. Tests that need Git must use a real index.

### Source manifest contract

Each `SOURCE-MANIFEST.json` must contain, at minimum:

- source-manifest schema version;
- bundle ID and a hash of the normalized bundle input;
- projection type;
- plugin ID and version;
- ordered skill name and canonical source path;
- deterministic per-file or per-tree SHA-256 values.

Tree hashes must be calculated from sorted package-relative paths and file-byte hashes, not filesystem enumeration order. Source manifests must not contain timestamps, absolute paths, hostnames, usernames, workspace locations, or platform-specific separators.

Canonical JSON used for bundle, release, listing, contract, and source-manifest hashes is UTF-8 without BOM, recursively sorts object keys by Unicode code point, preserves array order, uses two-space indentation and LF line endings, and ends with exactly one newline.

For every regular file, calculate `file_sha256 = SHA-256(file_bytes)`. Calculate a tree hash from the concatenation of these NUL-delimited UTF-8 records in package-path byte order:

```text
<mode> NUL <byte-length> NUL <file-sha256> NUL <package-relative-path> NUL
```

The mode is exactly `0644` or `0755`. NUL is forbidden in paths, so the framing is unambiguous.

### Release archive contract

Each packager must:

- package only its projection root;
- exclude Git data, dependencies, incubator content, repository-only fixtures, caches, secrets, temporary marketplaces, and unsupported filesystem entries;
- sort archive entries;
- normalize archive ownership, permissions, and timestamps;
- build twice in separate temporary directories;
- require byte-identical archives and equal SHA-256 digests;
- emit the archive digest and recoverable source commit/tag in release evidence.

The OpenAI submission skill bundle must be derived from the same validated staged skill tree used to generate the ephemeral adapter. Record both hashes so the packaged native archive and submitted skill snapshot are traceable to the same source.

### Reproducible build profile `zip-store-v1`

The following algorithm is the normative profile for version 1. Packaging uses `scripts/lib/reproducible-archive.mjs` and does not call a platform `zip` executable.

1. **Toolchain:** run Node.js `24.18.0` and pnpm `11.22.0` through Corepack with the frozen `pnpm-lock.yaml`. Do not call a platform `zip` executable. The ZIP implementation must be repository-pinned and locked.
2. **Environment:** set `TZ=UTC`, `LC_ALL=C`, and `SOURCE_DATE_EPOCH=315532800` (`1980-01-01T00:00:00Z`). No environment value may enter generated content.
3. **Inputs:** build from an immutable source commit and tag. Release mode requires a clean worktree and index, Git-tracked inputs only, and byte equality between selected working files and their Git blobs. Working-tree text files use LF so they match Git blobs on every platform: `.gitattributes` sets `* text=auto eol=lf`, and hosted `archive-identity` jobs set `core.autocrlf=false` and `core.eol=lf` before checkout.
4. **Git modes:** accept only blob modes `100644` and `100755`; reject symlinks `120000`, submodules `160000`, and every other entry type. Normalize package modes to `0644` and `0755` respectively.
5. **Paths:** convert separators to `/`; require relative NFC-normalized Unicode; reject empty, `.`, and `..` segments; backslashes; control characters; NUL; trailing spaces or periods; Windows-reserved device names; and characters invalid on Windows (`<`, `>`, `:`, `"`, `|`, `?`, `*`). Reject NFC and case-fold collisions. Each segment must be no more than 255 UTF-8 bytes, the package-relative path no more than 1024 UTF-8 bytes, and target-specific stricter limits still apply.
6. **Entry selection:** include regular files only. Do not emit explicit directory entries. Sort filenames by unsigned UTF-8 byte sequence.
7. **File bytes:** preserve exact bytes. Generated text files use UTF-8 without BOM, LF, and exactly one final newline. Binary files are never transformed.
8. **ZIP method:** use `STORE` compression method `0` for every file, set the UTF-8 filename flag, set creator OS to Unix, encode normalized Unix mode in external attributes, use the DOS timestamp `1980-01-01 00:00:00`, and emit no entry comments, archive comment, UID/GID fields, extended timestamps, platform-specific extra fields, or data descriptors. Reject output requiring ZIP64 under the v1 package limits.
9. **Archive root:** place the selected projection contents directly at archive root with no enclosing directory.
10. **Verification:** independently build in two clean temporary roots on Linux, macOS, and Windows CI using the same source commit and toolchain. Compare complete archive bytes, SHA-256 digest, entry inventory, modes, CRC values, and extracted tree hash. Any difference blocks release.

Changing any byte-affecting rule requires a new archive-profile identifier, fixtures for the old and new profile, release-note entry, and architecture/release approval.

### Listing source and generated release evidence

`docs/listing/openai/stark-ai-developer.json` is the source of truth for public copy, capabilities, starter prompts, URLs, assets, country or region intent, release notes, and publisher identity choice.

Generated release evidence must include:

- archive and projection SHA-256 values;
- source commit and tag;
- explicit clean/dirty source state and a deterministic release-input tree digest;
- normalized bundle-input hash;
- submitted and generated manifest hashes;
- a complete archive entry inventory;
- a human-readable listing and submission worksheet;
- reproducibility results from two isolated builds.

The generated evidence must not contain access tokens, cookies, credentials, private reviewer messages, customer data, or machine-specific paths.

## 16. OpenAI submission archive contract

The OpenAI release ZIP must:

- be a valid ZIP, at most 100 MB compressed;
- extract to at most 512 MiB;
- contain no more than 5,000 entries;
- contain only regular files and directories;
- contain paths using `/`, with no absolute paths, `..`, empty segments, or normalization collisions;
- reject invalid Windows names, trailing spaces or periods, control characters, backslashes, and NFC or case-fold collisions;
- use no more than 20 path segments per entry;
- contain no individual entry larger than 100 MiB;
- contain exactly one plugin root; repository policy packages the plugin at the archive root to remove root-selection ambiguity;
- contain `.codex-plugin/plugin.json` and at least one valid `skills/<skill>/SKILL.md`;
- contain all six expected skill roots and no unreviewed seventh skill;
- contain no Git data, dependencies, incubator content, repository-only fixtures, secrets, private paths, or evaluation evidence;
- contain no MCP, app, screenshot, or custom-UI configuration in v1.

The package name is immutable for updates. Every update must use a new semantic version and a freshly reviewed archive.

The submitted ZIP, the ephemeral OpenAI adapter used to build it, and the portal skill snapshot must be traceable to the same validated skill-tree hash. The portal-normalized `.codex-plugin/plugin.json` must be exported or recorded and reviewed against the submitted manifest before publication.

## 17. Evaluation and reviewer-test plan

The submission portal requires at least five positive and three negative test cases. Because v1 contains six skills, the release must contain at least:

- **six positive cases:** one reproducible case per bundled skill;
- **three negative cases:** preferably more, covering false activation and unsafe or unsupported behavior;
- **product-boundary cases:** Chat-only, Codex-only, missing local repository, missing tools, and IDE plugin non-support;
- **cross-skill ambiguity cases:** prompts that could match multiple skills;
- **discovery cases:** direct `@` invocation, implicit invocation where enabled, and non-activation where disabled;
- **mutation and approval cases:** no unapproved writes, memory changes, commands, or destructive actions;
- **no-invention cases:** no claim of repository inspection, rendering, command execution, or file creation without evidence;
- **output-contract cases:** required file types, editable draw.io output, structured specifications, architecture tradeoffs, and safe fallbacks;
- **listing fidelity cases:** every capability and starter prompt maps to tested behavior.

Each positive portal test case must record:

- user prompt;
- target product and surface;
- expected selected skill or workflow;
- expected behavior;
- expected result shape;
- required fixture data or files;
- pass/fail criteria.

Each negative portal test case must record:

- user prompt or scenario;
- expected non-activation, refusal, clarification, or safe fallback;
- reason the plugin or skill should not complete the action;
- pass/fail criteria.

Repository evidence may additionally store summarized observed behavior, safe excerpts or artifacts, client/model version when available, date, and known variance. It must not store chain-of-thought, credentials, customer data, private repositories, or confidential reviewer communication.

### Internal reliability thresholds

Portal minimums are not sufficient for the internal release gate. Recorded threshold values live in `skill-evals/stark-ai-developer/reliability-thresholds.json` with `status: "not_run"` until live ChatGPT/Codex trials are captured. For each supported client/model/surface configuration selected for release:

- explicit invocation for every skill must pass `3/3` repeated trials;
- each implicitly enabled skill must pass its direct intended activation case `10/10` times;
- each implicitly enabled skill must pass paraphrased or indirect intended cases at least `9/10` times;
- explicit-only skills must activate implicitly `0/20` times across intended-looking, near-miss, and cross-skill prompts;
- prohibited or clearly unrelated prompts must cause `0/10` activations;
- near-miss prompts may cause at most `1/20` false activations for implicitly enabled skills;
- missing-capability, no-tool, no-repository, and no-artifact cases must produce honest fallback behavior `10/10` times;
- mutation and approval cases must produce zero unapproved writes, commands, memory changes, or destructive actions.

Every case must have a stable test ID and record prompt, fixture, expected skill, expected non-skill alternatives, client, model, surface, policy state, date, trial count, observed counts, and evidence. A release may submit a representative portal subset, but it must retain the complete sanitized internal matrix.

## 18. Security and privacy requirements

Version 1 must not introduce:

- a stark AI backend or API;
- LiteLLM or MCP connectivity;
- authentication or connectors;
- telemetry, analytics, or hidden network calls;
- custom UI, apps, hooks required for core behavior, or screenshots;
- runtime downloading of skills;
- Cursor-only, Claude-only, or incubator skills;
- automatic external publication;
- claims of OpenAI endorsement;
- metadata that manipulates plugin selection or disparages alternatives.

Public packages must not contain API keys, tokens, credentials, customer data, private repository URLs, private paths, internal hostnames, environment dumps, or private evaluation artifacts.

Every skill must request only the minimum context and access needed for its task. Instructions must not bypass host permissions, approval prompts, sandbox policies, third-party access controls, or terms of service.

Secret scanning, private-path scanning, full archive inspection, regular-file validation, and undeclared-network-endpoint scanning are release-blocking. Synchronization and packaging are offline operations.

### Supply-chain and licensing gate

`npm run verify:supply-chain` inventories bundled files, scans executable scripts for forbidden download/install patterns, and emits an SPDX-2.3 toolchain package list from the frozen lockfile. Signed annotated release-tag provenance or a verifiable artifact attestation remains a publication gate. Before release freeze:

- inventory every bundled file and its license or repository ownership;
- verify rights for logos, icons, fonts, templates, screenshots used outside the package, and other third-party assets;
- generate an SPDX or CycloneDX dependency SBOM for the build toolchain and a package-content license inventory;
- include `THIRD_PARTY_NOTICES.md` when attribution is required;
- run the locked dependency audit and block unresolved high or critical vulnerabilities unless a documented security exception is approved;
- statically review executable scripts and reject hidden downloads, shell bootstrap installers, obfuscated payloads, or unpinned runtime package installation;
- pin and checksum external schemas and release-critical assets;
- require either a signed annotated release tag or a verifiable artifact-provenance attestation tied to the source commit;
- retain checksums and provenance for every published archive.

The public skills-only package must not require dependency installation or network downloads merely to load or discover its skills. A skill that needs an external tool must declare and preflight it honestly; it must not install that tool implicitly.

## 19. Website, privacy, legal, and publisher prerequisites

### Approval and responsibility matrix

| Role                   | Owns                                                                             | Required approval                                                       |
| ---------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Product owner          | Listing granularity, bundle cohesion, positioning, capabilities, starter prompts | Bundle change, listing freeze, Phase 7 decision                         |
| Architecture owner     | ADR consistency, source-of-truth boundaries, projections, archive profile        | Projection or ownership change, release descriptor, contract exceptions |
| Skill maintainer       | Canonical skill content, `agents/openai.yaml`, routing, fixtures                 | Skill inclusion and behavior evidence                                   |
| Security reviewer      | Filesystem safety, secret/private-path scans, scripts, dependencies, provenance  | Release candidate                                                       |
| Privacy/legal reviewer | Privacy, terms, asset rights, publisher naming, regional availability            | Public submission                                                       |
| Release manager        | Version, tag, reproducibility, checksums, evidence, rollback target              | Release candidate and portal upload                                     |
| Verified publisher     | Publishing organization, identity, attestations, explicit publication            | Portal submission and publish action                                    |
| Portal submitter       | Accurate portal data and reviewer responses                                      | Submission execution; must have Apps Management write permission        |

One person may hold multiple roles, but every required approval must be recorded separately in sanitized release evidence. The portal submitter may not silently override a rejected product, architecture, security, privacy/legal, or release gate.

Before public submission, provide live HTTPS pages for:

- plugin landing page;
- privacy policy;
- terms of service;
- support page and contact route;
- security or vulnerability-report route.

The v1 privacy policy must explicitly address, even when the answer is “none”:

- categories of personal data collected by stark AI through the package;
- purposes of processing;
- categories of recipients;
- retention periods;
- user controls and contact routes;
- distinction between the skills-only package and processing performed by ChatGPT, Codex, the user's selected host, workspace, repository, or tools;
- absence of a stark AI account, backend, telemetry, analytics, and hidden network calls in v1;
- handling of support requests and security reports.

The policy must accurately state that the package itself does not send prompts, repositories, files, outputs, or credentials to stark AI. It must not make claims about OpenAI or workspace processing that the publisher cannot guarantee.

Public release also requires:

- an OpenAI Platform organization selected as the publisher owner;
- **Apps Management: Write** permission for every submitter who creates or submits drafts;
- a verified individual or business identity in the same publishing organization;
- a final decision whether the public publisher name is the stark AI brand or the verified legal company name;
- matching `author.name`, `interface.developerName`, website, support contact, privacy policy, terms, and verified identity;
- final square branding assets;
- legal review and final company/contact details;
- country or region availability decision;
- reviewer-ready prompts and test cases;
- immutable archive, checksum, source commit, and tag;
- external scan, OpenAI review, remediation, approval, explicit publication, and clean-account verification.

## 20. OpenAI submission and publication workflow

### Pre-submission gate

Do not open a production submission until all of the following are true:

- the OpenAI package and standalone artifacts are generated and drift-free;
- the public listing source is approved;
- the package purpose and six-skill cohesion gate passes;
- product routing uses only supported schema values;
- positive and negative cases pass on supported surfaces;
- all public URLs are live and consistent;
- the publisher identity is verified in the correct OpenAI Platform organization;
- the submitter has Apps Management write access;
- the exact v1.0.0 ZIP is reproducible and tagged;
- the OpenAI submission and error-reference documentation has been re-verified for changes after this specification date.

### Portal flow

1. Open the OpenAI Platform plugin submission portal from the selected publishing organization.
2. Create a plugin draft and choose **Skills only**.
3. Enter the public listing and verified developer identity.
4. Upload the exact final skill/plugin bundle.
5. Review automated scans and every portal warning.
6. Review and accept or reject the portal-normalized manifest diff.
7. Add no more than three realistic starter prompts.
8. Add at least six positive and three negative tests for v1.
9. Select only countries or regions where product, support, legal terms, and publisher readiness are complete.
10. Add release notes describing the initial release and any reviewer setup expectations.
11. Complete policy attestations only after the listing, skills, prompts, tests, availability, and privacy claims are confirmed.
12. Submit for review.
13. Track requested changes as release-blocking issues; update source artifacts first, regenerate, retest, and resubmit.
14. After approval, explicitly publish from the portal.
15. Confirm the listing appears in the universal Plugins Directory and perform clean-account smoke tests.

Submission does not equal publication. Approval does not equal publication. The publisher must explicitly publish the approved version.

### Publication evidence

Store a sanitized release record containing:

- portal submission identifier;
- plugin package name and version;
- archive checksum;
- source tag and commit;
- normalized manifest checksum;
- publisher identity label;
- country or region set;
- submitted and approved timestamps;
- publication timestamp;
- public listing status;
- clean-account test results by supported surface;
- known plan, workspace, region, or client limitations;
- rollback target.

## 21. Versioning, updates, suspension, and maintenance

The plugin uses independent semantic versioning. The active version is changed first and only in `plugins/stark-ai-developer.source.json`; every other occurrence is generated:

- **PATCH:** compatible fixes, safety improvements, metadata corrections, or restoration of last-known-good behavior;
- **MINOR:** a new skill or meaningful backward-compatible capability;
- **MAJOR:** removed or renamed skills, incompatible workflows, or a changed privacy, runtime, authentication, backend, or connector model.

Rules:

- package name `stark-ai-developer` is immutable after first submission;
- every update uses a new version and a new reviewed snapshot;
- OpenAI does not consume live GitHub changes for the published skills-only snapshot;
- rollback publishes a new patch restoring reviewed content; versions and archive-profile identifiers are not reused for different bytes;
- any MCP, app, connector, authentication, telemetry, or custom-UI addition requires a new architecture and policy review before implementation;
- every release revalidates current OpenAI docs, schema, policies, country availability, URLs, assets, and publisher identity;
- support and security reports have an owner, triage process, and response target;
- maintain a documented process for pausing promotion, submitting an emergency fix, or requesting delisting when a severe issue cannot be fixed safely in place.

## 22. Implementation phases and exit gates

### Phase 1 — foundation contract (repository-local complete)

Deliver:

- accepted ADR-0043 and this implementation specification;
- `plugins/stark-ai-developer.source.schema.json` and the explicit six-skill membership in `plugins/stark-ai-developer.source.json`;
- focused bundle validation integrated into the root aggregate;
- current ADR/spec indexes and repository instructions;
- generally applicable bundle documentation and accurate root README text.
- scoped `codex-spec-interviewer` and `drawio-diagrams` skill-contract/resource hardening, with complete linked workflow resources, preserved safety/output contracts, and no duplicate normative policy layer.

Exit only when:

- bundle manifests are actually enforced against the declared repository-owned schema;
- parsed-but-invalid top-level values fail;
- source paths obey the exact schema contract;
- the README install command is parsed and compared as an exact token sequence;
- `plugins/stark-ai-developer.source.json` uses `displayName: "stark AI Developer"`;
- scoped skill-contract changes preserve the published workflow, evidence, mutation, and stop-condition requirements, and every linked runtime resource is represented in its owning payload inventory;
- focused and local format/lint checks pass; aggregate and hosted evidence are recorded separately;
- no incomplete projection or marketplace entry is exposed.

Remaining follow-up from later contract revision: none for repository-local identity and snapshot files; `plugins/stark-ai-developer.source.json` and dated snapshots under `scripts/vendor/snapshots/` are present.

### Phase 2 — portable and standalone projections (repository-local complete)

Deliver:

- root portable manifest and pinned official Agent Plugins schema;
- deterministic portable generator and source manifest;
- committed six-skill portable projection;
- optional standalone-skill generator and checksummed archives;
- portable and standalone validators;
- reproducible packaging and drift gates.

Exit when a clean checkout can generate, validate, package twice, and reproduce the portable and enabled standalone artifacts without network access using `zip-store-v1`.

### Phase 3 — OpenAI projection and local marketplace (repository-local complete)

Deliver:

- generated `.codex-plugin/plugin.json` inside the OpenAI archive;
- production logo and composer icon copied into ephemeral adapter staging;
- OpenAI projection generator, validator, and packager;
- listing source and submission worksheet generator;
- complete per-skill `agents/openai.yaml` metadata;
- repository marketplace metadata pointing at the portable projection, generated from release policy;
- local, clean-clone, personal-marketplace, and isolated adapter-marketplace fixtures.

Repository-local machinery is complete when generators, validators, the committed
portable marketplace, and isolated fixtures exist, and the skills-only ZIP
generated from ephemeral adapter staging passes current archive, manifest,
listing, skill, metadata, asset, and exclusion checks without weakening portable
validation. Isolated OpenAI-adapter marketplace fixtures are generated only into
disposable staging and must leave the committed marketplace unchanged.

Live Codex add, list, install, enable, disable, update, and remove behavior on a
clean host remains external, as recorded in the acceptance criteria.

### Phase 4 — hardening, cohesion, and evaluations (repository-local complete)

Deliver:

- final product routing and invocation policy;
- skill capability preflights and mutation boundaries;
- plugin purpose, cohesion, and originality decision;
- at least six positive and three negative portal-ready cases;
- discovery, ambiguity, product-boundary, IDE-boundary, mutation, and no-invention cases;
- fixtures, sanitized evidence, and clean-host ChatGPT/Codex tests.

Exit when every initial skill has a passing positive case, required negative and boundary cases pass, every public listing claim maps to tested behavior, and no skill claims unavailable capabilities or performs unapproved mutation.

Remaining follow-up: live repeated-trial product evidence against the recorded thresholds.

### Phase 5 — release candidate (external gates pending)

Deliver:

- public landing, privacy, terms, support, and security-report pages;
- final listing copy, capabilities, prompts, assets, and region decision;
- manual publisher-identity and Apps Management permission review fields;
- deterministic `1.0.0` artifacts, checksums, source tag, and submission worksheet;
- final legal, security, privacy, metadata, archive, and reproducibility review.

Repository-local generators can write sanitized evidence before freeze, including
explicit clean/dirty source state. An immutable release candidate still requires
a clean source identity, recorded tag, and two-build evidence from that identity.
Internal approval, verified publisher identity, Apps Management permission,
live URL/legal review, signed provenance, live-eval thresholds, and external
product evidence remain release-blocking manual or follow-up gates.

### Phase 6 — external submission and public launch

Deliver:

- Skills-only portal draft;
- upload and scan of the exact `1.0.0` archive;
- reviewed portal-normalized manifest;
- portal prompts, tests, regions, release notes, and attestations;
- source-controlled fixes for scan or reviewer findings;
- OpenAI approval;
- explicit publication;
- clean-account verification on every supported v1 surface.

Exit only when the exact approved version is visible and installable in the Universal Plugins Directory, the public listing accurately describes its boundaries, and all published smoke tests pass.

### Phase 7 — optional independent skill listings

Only when separately approved:

- decide which skills provide enough distinct value for independent public discovery;
- create one uniquely named skills-only plugin per selected skill;
- create distinct positioning, assets, tests, release artifacts, and portal submissions;
- avoid duplicate or spam-like directory entries.

Phase 7 is not required for the v1 **stark AI Developer** launch.

## 23. Acceptance criteria

### Repository and foundation acceptance

- [x] ADR-0043 defines portable packages and separate client-specific projections.
- [x] The six intended skills and their canonical sources are identified.
- [x] `DEC-001` through `DEC-006` resolve listing granularity, marketplace target, metadata ownership, release identity, artifact lifecycle, and archive profile.
- [x] `plugins/stark-ai-developer.source.json` identity fields validate and are the only author-maintained release/version source.
- [x] Current external-contract facts have dated OpenAI snapshots, source precedence, and validator mappings.
- [x] Requirement IDs map to validators, CI jobs, acceptance gates, and evidence artifacts.
- [x] `plugins/stark-ai-developer.source.json` uses the required **stark AI Developer** identity.
- [x] Plugin source files are enforced against `plugins/stark-ai-developer.source.schema.json`.
- [x] Parsed `null`, arrays, scalars, malformed JSON, unsupported fields, and unsupported schema versions fail.
- [x] README install commands are parsed and compared as exact token sequences.
- [x] Bundle and README documentation describe the post-merge repository state in present tense.
- [x] Scoped `codex-spec-interviewer` and `drawio-diagrams` skill-contract/resource hardening is complete, with Architecture Compass’s normative policy kept in `SKILL.md` and no duplicate workflow-policy asset.
- [x] Focused, format, and lint checks pass locally; aggregate and hosted evidence remain separately reported.
- [x] No incomplete portable projection or repository marketplace entry is exposed before its phase exit; OpenAI-native staging is disposable and exposed only through validated packaging.

### Projection and release acceptance

- [x] Canonical skills remain the only author-maintained skill sources.
- [x] Portable, OpenAI, and enabled standalone projections are deterministic and drift-checked.
- [x] Portable and OpenAI manifests validate independently against their owning contracts.
- [x] The OpenAI package contains exactly one root, one `.codex-plugin/plugin.json`, and six immediate skill directories.
- [x] The OpenAI archive passes current ZIP, manifest, listing, skill, metadata, asset, and skills-only exclusion limits.
- [x] Generated trees preserve canonical file bytes and approved executable intent.
- [x] Adapters add no skill-local overlays or rewritten metadata.
- [x] Cross-platform path normalization, Windows-reserved-name, NFC, and case-fold collision tests pass.
- [x] Source manifests contain deterministic hashes and no host-specific metadata.
- [ ] Two isolated builds on every supported CI platform implement `zip-store-v1` and produce byte-identical archives and equal checksums.
- [x] Node `24.18.0`, pnpm `11.22.0`, the frozen lockfile, and the pinned ZIP implementation are recorded and enforced as the `zip-store-v1` release toolchain.
- [x] Two isolated local builds produce byte-identical `zip-store-v1` archives and equal checksums.
- [x] Existing Agent Skills discovery and `npx skills` installation remain supported.

### Skill identity and routing acceptance

- [x] Every bundled skill has a valid `SKILL.md`.
- [x] Every included `agents/openai.yaml` has valid `interface` metadata.
- [x] Every bundled canonical skill owns a valid `agents/openai.yaml` with `interface` metadata.
- [x] Every skill has approved `display_name`, `short_description`, optional `default_prompt`, product policy, and implicit-invocation policy.
- [x] No routing policy contains the invalid literal `Narrow trigger`.
- [x] Explicit-only skills use `allow_implicit_invocation: false`.
- [x] Narrow implicit behavior is implemented through precise metadata, instructions, and negative tests.
- [x] Codex-only skills do not claim Chat support.
- [ ] Host capability preflight, mutation boundaries, fallbacks, and stop conditions are documented in skill contracts and inventoried in plugin eval cases; live ChatGPT/Codex trials remain the open repeated-trial item.
- [x] Standalone skill artifacts are structurally valid and preserve the supported installation path; live client tests remain external.

### Marketplace and public-directory acceptance

- [x] Repository marketplace and disposable personal-path fixtures are structurally valid and clearly labeled non-public.
- [x] The committed repository marketplace targets `./plugins/stark-ai-developer` and is clearly labeled non-public.
- [x] OpenAI-adapter and personal-marketplace tests use isolated root-correct fixtures and leave the committed marketplace unchanged.
- [x] `source.path` is safe, root-relative, and portable.
- [ ] The publishing organization and verified identity are selected and consistent with public metadata.
- [ ] Submitters have Apps Management write permission.
- [ ] Public website, privacy, terms, support, and security-report pages are live.
- [ ] Listing fields, assets, prompts, tests, regions, release notes, and attestations are complete.
- [x] At least six positive and three negative reviewer-ready structural tests pass; clean-client lifecycle evidence remains external.
- [ ] Internal repeated-trial activation, non-activation, capability, and mutation thresholds pass.
- [ ] Security, dependency, licensing, asset-rights, SBOM, and provenance gates pass.
- [ ] Required role approvals are recorded separately in sanitized evidence.
- [ ] Portal normalization is reviewed and recorded.
- [ ] OpenAI review passes.
- [ ] The publisher explicitly publishes `1.0.0`.
- [ ] **stark AI Developer** is searchable and installable in the Universal Plugins Directory on supported ChatGPT and Codex surfaces.
- [ ] A clean account can install, start a new chat or session, invoke every allowed bundled skill, and uninstall the plugin.

### Definition of “my skills are listed”

The v1 requirement is satisfied only when:

- the public **stark AI Developer** plugin listing is live;
- the installed plugin exposes all six bundled skill identities on their allowed products;
- each skill can be explicitly selected where the surface supports skill selection;
- implicitly enabled skills activate for intended requests and remain inactive for negative cases;
- standalone installation paths remain documented and tested for the clients that support them.

It does not require six independent public directory cards. That requires Phase 7.

## 24. Validation commands

Foundation commands:

```bash
npm run validate:bundles
npm run validate:adrs
node --check scripts/validate-bundles.mjs
npm run validate
pnpm format:check
pnpm lint
```

Implemented projection and release commands:

```bash
npm run sync:agent-plugin
npm run sync:standalone-skills
npm run validate:projections
npm run validate:agent-plugin
npm run validate:openai-plugin
npm run validate:openai-listing
npm run validate:openai-marketplace
npm run validate:openai-submission
npm run validate:standalone-skills
npm run validate:plugin-evals
npm run package:agent-plugin
npm run package:openai-plugin
npm run package:standalone-skills
npm run generate:openai-worksheet
npm run validate:openai-worksheet
npm run generate:release-evidence
npm run validate:archives
npm run validate:network-endpoints
npm run verify:release-reproducibility
npm run validate:release-proof
npm run validate:release-descriptor
npm run validate:contract-snapshots
npm run generate:openai-marketplace-fixture
npm run generate:traceability
npm run validate:traceability
npm run verify:supply-chain
```

`npm run sync:openai-plugin` remains a refuse-redirect. Hosted pull-request validation remains required for the complete checkout.

## 25. User verification

Before submission:

1. Review `plugins/stark-ai-developer.source.json` and confirm the six approved skills and order.
2. Review the listing source and the packaged `.codex-plugin/plugin.json` from `npm run package:openai-plugin`.
3. Review `plugins/stark-ai-developer.source.json` identity, `1.0.0`, one-listing strategy, Node `24.18.0`, pnpm `11.22.0`, and `zip-store-v1`.
4. Inspect all six canonical `agents/openai.yaml` files and their byte-identical generated copies.
5. Run focused and aggregate validation.
6. Inspect the full ZIP file listing and verify no excluded content.
7. Confirm two-build checksum equality.
8. Install from the repository marketplace on a clean clone.
9. Test direct and implicit invocation on each supported surface.
10. Test standalone skills in the IDE extension because public plugins are not relied upon there.
11. Open and review every public URL.
12. Confirm publisher organization, verified identity, permissions, countries, prompts, tests, and release notes.
13. Verify `.agents/plugins/marketplace.json` still points to `./plugins/stark-ai-developer` after OpenAI-adapter tests.
14. Verify every canonical `agents/openai.yaml` is byte-identical in portable, OpenAI, and standalone projections.

After publication:

1. Search for **stark AI Developer** in the public Plugins Directory.
2. Open the listing and verify name, developer, copy, category, capabilities, assets, prompts, and legal links.
3. Install with a clean eligible account.
4. Start a new chat or CLI session.
5. Explicitly invoke the plugin and each allowed bundled skill.
6. Verify implicit routing and negative non-activation.
7. Verify sandbox and approval behavior in Codex.
8. Verify update and uninstall behavior.
9. Record product, plan, workspace, role, region, or client limitations.

## 26. Risks

| Risk                                                                                        | Mitigation                                                                                                                            |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Bundle schema and validator diverge                                                         | Enforce one authoritative repository-owned input schema and test invalid objects, fields, paths, and versions.                        |
| The official Agent Plugins schema is misapplied to `plugins/stark-ai-developer.source.json` | Use the official schema only for generated portable `plugin.json`; document the separate input-schema purpose.                        |
| Canonical and generated trees drift                                                         | Clean staging, deterministic hashes, a committed portable projection, ephemeral adapter regeneration, and archive-vs-canonical proof. |
| OpenAI package is mislabeled as portable                                                    | Separate roots and validators under ADR-0043.                                                                                         |
| Future public skills enter automatically                                                    | Explicit static allowlist plus version, evaluation, listing, and legal review.                                                        |
| README installation behavior drifts                                                         | Parse and compare the complete command token sequence.                                                                                |
| ChatGPT claims unavailable local actions                                                    | Capability preflight, host-evidence requirements, boundary tests, and honest fallbacks.                                               |
| High-impact skills activate implicitly                                                      | Explicit-only memory and structural-search policies plus negative activation tests.                                                   |
| Six skills appear incoherent or generic                                                     | Purpose, cohesion, originality, and per-skill value gates before release freeze.                                                      |
| `animated-readme-logo` weakens the listing                                                  | Retain only when developer-documentation positioning and evaluations justify it; otherwise remove or split it.                        |
| Archive contains repository noise or private data                                           | Explicit package roots, regular-file checks, secret/private-path scans, and full archive inspection.                                  |
| Skills-only package accidentally contains MCP, app, or screenshot declarations              | Dedicated skills-only exclusion validator.                                                                                            |
| Publisher or legal metadata mismatches                                                      | Release-blocking verified identity and legal review before version freeze.                                                            |
| A local marketplace is mistaken for public publication                                      | Terminology contract and public-directory acceptance criteria.                                                                        |
| IDE support is overstated                                                                   | Explicitly test and document that plugins are unavailable in the Codex IDE extension; use standalone skills there.                    |
| Upstream contracts change                                                                   | Reverify before Phase 3 and Phase 5, preserve dated snapshots, and use a successor ADR for material changes.                          |
| Repository marketplace points at the wrong package                                          | Generate and validate the committed portable entry; test adapters only through isolated fixtures or direct paths.                     |
| `agents/openai.yaml` diverges between distributions                                         | Canonical skill ownership, no-overlay rule, byte comparison, and projection drift gates.                                              |
| Version or release identity drifts                                                          | One release descriptor drives manifests, archive names, worksheets, and evidence.                                                     |
| ZIP output varies by platform or library                                                    | Exact Node/pnpm pins, locked implementation, `zip-store-v1`, LF Git checkouts, two-build and cross-platform byte comparison.          |
| Unicode or Windows path collisions appear only after publication                            | NFC, case-fold, reserved-name, invalid-character, segment-length, and extraction tests.                                               |
| Third-party content or vulnerable tooling enters the release                                | License inventory, asset-rights review, SBOM, dependency audit, static script review, and provenance.                                 |
| Model routing tests are flaky or overfit                                                    | Repeated-trial thresholds, paraphrase and near-miss suites, fixed evidence metadata, and conservative public claims.                  |

## 27. Publishable source-challenge summary

The maintainer-provided drafts agree on one canonical skill source, explicit six-skill composition, deterministic flattened projections, no symlinks, a checked-in portable projection, ephemeral OpenAI adapter packaging, continued `npx skills` support, product-boundary hardening, plugin evaluations, legal/support prerequisites, reproducible artifacts, and manual publication after external review.

ADR-0043 resolves the durable packaging boundary. This specification applies that decision without duplicating its rationale and adds implementation gates for the current repository schema, validator, README, local marketplace, official package formats, and public submission flow.

This revision also distinguishes public plugin publication from repository, personal, and workspace distribution; defines one public v1 listing rather than six independent cards; points the canonical repository marketplace at the portable projection; makes `agents/openai.yaml` canonical skill-local metadata; introduces one intended release descriptor, explicit artifact lifecycle, dated contract snapshots, a normative reproducible ZIP profile, traceability, repeated-trial evaluations, and supply-chain gates; and treats the generated OpenAI archive as the exact public submission artifact.

## 28. Done when

Repository implementation is done when one explicit bundle deterministically produces:

1. the existing direct Agent Skills and `npx skills` distribution;
2. an independently conformant portable Agent Plugins package;
3. an independently conformant OpenAI skills-only package;
4. any enabled standalone skill artifacts;
5. reproducible release archives, source manifests, checksums, listing data, and reviewer-ready evidence.

Canonical ownership, exact bundle membership, release identity, authoritative schema validation, product routing, capability boundaries, marketplace target, reproducible archive profile, traceability, public documentation, legal pages, supply-chain review, role approvals, and security scans must all remain enforced.

Public launch is done only when the verified publisher has submitted the exact reviewed skill snapshot, OpenAI review has passed, the approved version has been explicitly published, **stark AI Developer** is visible and installable in the Universal Plugins Directory on supported surfaces, and clean-account smoke tests pass.

Version 1 does not require six independent public skill cards. Those require separately approved one-skill plugin submissions.

## Appendix A — OpenAI submission worksheet

Generate the human worksheet from the reviewed listing source without secrets:

```yaml
source: docs/listing/openai/stark-ai-developer.json
generated_worksheet: docs/listing/openai/stark-ai-developer-submission-worksheet.md
portal_only:
  platform_organization: manual-review-required
  verified_identity: manual-review-required
  apps_management_write_verified: false
  type: skills-only
  countries_or_regions: DE-pending-review
  positive_tests: 6
  negative_tests: 3
  archive_sha256: generated-release-evidence
  source_commit: release-candidate-evidence
  source_tag: release-candidate-evidence
  portal_submission_id: manual-review-required
  normalized_manifest_sha256: manual-review-required
  review_status: not-submitted
  publication_status: not-published
release:
  descriptor_path: plugins/stark-ai-developer.source.json
  archive_profile: zip-store-v1
  node_version: 24.18.0
  pnpm_version: 11.22.0
  public_listing_strategy: single-plugin-six-bundled-skills
```

## Appendix B — Requirement traceability baseline

| Requirement ID | Contract                                                          | Primary validator or command                                 | Required CI/evidence                                     |
| -------------- | ----------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------- |
| `FOUND-001`    | Normative authorities, approved decisions, release descriptor     | `validate:release-descriptor`, `validate:contract-snapshots` | Foundation job, descriptor and snapshot hashes           |
| `BND-001`      | Explicit ordered bundle and canonical source resolution           | `validate:bundles`                                           | Bundle fixtures and exact README token test              |
| `PORT-001`     | Portable Agent Plugins projection                                 | `validate:agent-plugin`                                      | Portable schema, tree hash, clean install                |
| `OAI-001`      | OpenAI adapter and skills-only manifest                           | `validate:openai-plugin`, `validate:openai-submission`       | Adapter diff, archive inventory, portal manifest         |
| `META-001`     | Canonical `agents/openai.yaml` and routing                        | `validate:openai-plugin`, skill-specific evaluators          | Byte equality, routing matrix, product-boundary evidence |
| `MKT-001`      | Portable repository marketplace and isolated adapter fixture      | marketplace smoke tests                                      | Canonical marketplace hash before/after adapter tests    |
| `REL-001`      | Version, archive name, toolchain, and evidence derivation         | `validate:release-descriptor`, `generate:release-evidence`   | Source tag, commit, descriptor hash, worksheet           |
| `REP-001`      | `zip-store-v1` deterministic build                                | `verify:release-reproducibility`                             | Linux/macOS/Windows archive byte equality                |
| `EVAL-001`     | Activation, non-activation, capability, and mutation thresholds   | plugin and skill evaluation suites                           | Repeated-trial matrix and portal subset                  |
| `SEC-001`      | Secret, path, endpoint, dependency, license, and provenance gates | `verify:supply-chain` plus scanners                          | SBOM, license inventory, scan results, attestation       |
| `PUB-001`      | Legal, publisher, portal review, explicit publication             | submission worksheet and publication checklist               | Recorded approvals, portal IDs, public smoke tests       |

Every normative validator failure must cite at least one requirement ID. Every acceptance checkbox and release-evidence record must map back to one or more IDs. New requirements must add or extend an ID before implementation merges. `docs/listing/openai/requirement-traceability.json` is generated from this baseline and checked by `npm run validate:traceability`.

## Appendix C — Official references to re-verify

Re-verify the current versions of these official documents before submission:

- [OpenAI Developers — Package your plugin](https://developers.openai.com/plugins/build/plugins)
- [OpenAI Developers — Build skills](https://developers.openai.com/plugins/build/skills)
- [OpenAI Developers — Connect and test your plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt)
- [OpenAI Developers — Submit plugins](https://developers.openai.com/plugins/deploy/submission)
- [OpenAI Developers — Plugin submission errors](https://developers.openai.com/plugins/deploy/submission-errors)
- [OpenAI Developers — Plugin guidelines](https://developers.openai.com/plugins/app-guidelines)
- [ChatGPT Learn — Plugins](https://learn.chatgpt.com/docs/plugins)
- [ChatGPT Learn — Build skills](https://learn.chatgpt.com/docs/build-skills)
- [OpenAI Help Center — Skills in ChatGPT](https://help.openai.com/en/articles/20001066-skills-in-chatgpt)
- [Agent Skills specification](https://agentskills.io/specification)
- [Agent Plugins 1.0.0 specification](https://agent-plugins.org/specification)
- [Agent Plugins 1.0.0 manifest schema](https://agent-plugins.org/schemas/1.0.0/plugin.schema.json)

This specification records the rules visible on 2026-08-18. Upstream documentation, schemas, product availability, submission permissions, and review requirements may change independently of the repository.
