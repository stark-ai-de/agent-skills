# Changelog

## Unreleased

### Added

### Changed

### Fixed

### Deprecated

### Removed

## [0.21.0](https://github.com/stark-ai-de/agent-skills/compare/v0.20.1...v0.21.0) (2026-09-03)


### Features

* **release:** automate release preparation and direct artifacts ([d357972](https://github.com/stark-ai-de/agent-skills/commit/d357972e76d63b18c6cd57ecddcfdb1c9e0c3eb1))
* **release:** automate release preparation and direct artifacts ([b6b444f](https://github.com/stark-ai-de/agent-skills/commit/b6b444f96d4532565465b362f77aaa6fe1dcb23a))


### Bug Fixes

* **governance:** resolve current-main ADR IDs ([42fc79d](https://github.com/stark-ai-de/agent-skills/commit/42fc79d90d2bb6ab2a1d1a61356a0ab40e9aa825))
* **identity:** require canonical GitHub repository hosts ([0101e98](https://github.com/stark-ai-de/agent-skills/commit/0101e984b57fa244f14290f3d7a4e9e24c402ab2))
* **release:** accept automated manifest lifecycle ([bdf7112](https://github.com/stark-ai-de/agent-skills/commit/bdf7112e9c585b6e85700eb7b2cce898eb668b81))
* **release:** accept automated manifest lifecycle ([b4d17df](https://github.com/stark-ai-de/agent-skills/commit/b4d17df9ca3e6e593c2e1d4abe4038373442b7fb))
* **release:** bind private App provenance to bot actor ([16210d5](https://github.com/stark-ai-de/agent-skills/commit/16210d50db281cb2087a9a2032ebb9b5e96547cd))
* **release:** bind provenance to app bot actor ([f86904b](https://github.com/stark-ai-de/agent-skills/commit/f86904b30bf615e4f9de5c06237277db8599dbfd))
* **release:** bind reconciliation to exact release metadata ([8576184](https://github.com/stark-ai-de/agent-skills/commit/8576184572c59cd62213d9ffe2370bb55fa8004f))
* **release:** derive evidence downloads from observed assets ([418188f](https://github.com/stark-ai-de/agent-skills/commit/418188fa7e726063e677947696499a777be4bec4))
* **release:** dispatch protected-main evidence after publication ([571da70](https://github.com/stark-ai-de/agent-skills/commit/571da70845a333538524cbfd7c52b2fc74323bbc))
* **release:** keep auxiliary attestations manual-only ([1fae040](https://github.com/stark-ai-de/agent-skills/commit/1fae04008a6f036debecb702cad86ef0532b1060))
* **release:** keep v0.19.1 retrospective validation metadata-only ([721226a](https://github.com/stark-ai-de/agent-skills/commit/721226a0412d3d4f5f0b387b7d21a822904f970e))
* **release:** preserve generated changelog formatting ([b7b5fb4](https://github.com/stark-ai-de/agent-skills/commit/b7b5fb44753a1ecd6a26f396d66a323e796bac50))
* **release:** preserve generated changelog formatting ([ad6fb29](https://github.com/stark-ai-de/agent-skills/commit/ad6fb29fe31a0e229a6b014d92f8e108b872cc3d))
* **release:** reconcile draft metadata before publication ([fb55f98](https://github.com/stark-ai-de/agent-skills/commit/fb55f98bae04b068b8a7aff5b49f0654a8ab34bb))
* **release:** run post-release evidence only from protected main ([652c899](https://github.com/stark-ai-de/agent-skills/commit/652c899fd713496f5c3cf04c5755caa6dadffaa9))
* **release:** support metadata-only historical subjects ([dd97e2b](https://github.com/stark-ai-de/agent-skills/commit/dd97e2b39618dfc7186fe47721473c86a0cc0d1c))
* **validation:** align installed Architecture Compass count ([d93d054](https://github.com/stark-ai-de/agent-skills/commit/d93d05442e2a0d847986c3b63ba1ba5c32c72d7b))

## v0.20.1 - 2026-08-25

### Added

### Changed

- Advanced the independently versioned `stark-ai-developer` plugin and its OpenAI listing surfaces to 1.0.1 while preserving historical 1.0.0 publication evidence.
- Updated `architecture-compass` to 0.6.5 with lean reference-first workflow routing while preserving its five public workflows and safety gates.

### Fixed

- Kept projection validation aligned with uncommitted plugin-version bump candidates.

### Deprecated

### Removed

## v0.20.0 - 2026-08-25

### Added

- Added `DIR-002` public category-catalog membership to `npm run verify:openai-directory` (same hosted action): plugin id in `developer-tools`, `ENABLED`, listing display name, and `installation_policy: AVAILABLE`.
- Recorded first OpenAI plugin publication observations, Platform plugin ID, portal submission ID, publisher organization ID, and verified individual identity.
- Added official ChatGPT Blossom marks to catalog and README plugin link-outs, with unmodified light and dark variants from the OpenAI brand kit.
- Added a ChatGPT-styled README listing shield that links to the public Plugins Directory page and shows the current plugin version.
- Added hosted `Publish Release` and `Post-release Evidence` provenance for `zip-store-v1` archives, plus a publication-owned Sigstore workflow that attests archives from a Git tag.

### Changed

- Updated `architecture-compass` to 0.6.4 with AC-ADR-054 for exclusive external agent worktrees and canonical-checkout isolation.
- Grouped repository CLIs into `scripts/catalog/`, `scripts/plugin/`, `scripts/release/`, and `scripts/repo/`. Prefer `npm run` names, including `release:intent`; `scripts/vendor/` and `scripts/lib/` stay put. Post-release capture keeps that tree so restored imports still resolve.
- Dropped Architecture Compass and CodeGraph validator-mutation suites and unused visual-assertion CLI; SkillOpt stays a focused incubator gate outside `npm run validate`.
- Expanded `DIR-001` to compare category, skill interface, SKILL.md descriptions, portal glyphs, and skills-only invariants, and pinned `portalGlyph` in listing JSON.
- Dropped unsigned `v0.19.1` provenance from launch checkboxes. Later GitHub Release attestation stays `Publish Release` plus `Post-release Evidence`, with local `build:release-subjects`.
- Operator follow-up (listing updates, clean-account install, ChatGPT web/desktop lifecycle, Pages smoke) lives in `docs/publishing.md` and in GitHub Actions job summaries.
- Rewrote stark AI Developer listing and catalog SEO copy as harness-first: daily-work origin, open source, and the existing no-backend package boundary. Catalog eyebrows now say OpenAI harness-first plugin. Listing release notes match that copy.
- Recorded Phase 6 listing as complete from the live ChatGPT plugin page.
- Dropped unused OpenAI listing `availability`/`regions` now that the portal does not collect a publisher country list.
- README ChatGPT listing shield now crops the official Blossom to fill the icon slot and shows the current plugin version instead of a "plugin" label.
- Catalog homepage plugin actions now stack the version and ChatGPT badges under the plugin link.
- README shields are grouped as listings, then repository status, with a green release badge.
- README intro links no longer include an inline ChatGPT Blossom; the listing shield still carries the mark.

### Fixed

### Deprecated

### Removed

- Removed the live repeated-trial product matrix from the v1 launch contract.

## v0.19.1 - 2026-08-19

### Added

- Added the committed portable Agent Plugins projection at `plugins/stark-ai-developer/`, with Codex membership and plugin identity in sibling `plugins/stark-ai-developer.source.json`.
- Pinned the official Agent Plugins 1.0.0 schema and dated contract snapshots under `scripts/vendor/`.
- Added `zip-store-v1` STORE-only packaging, requirement traceability, a supply-chain inventory command, and a Linux/macOS/Windows archive-identity CI matrix.
- Added OpenAI listing paperwork under `docs/listing/openai/`.
- Added linked `references/workflow-details.md` resources for `codex-spec-interviewer` and `drawio-diagrams`.

### Changed

- Updated the Claude, Codex, and Cursor `memory-curator` skills to 0.2.1 so their linked workflow contract stays version-aligned across hosts.
- Updated `codex-spec-interviewer` to 0.3.2, `cursor-spec-interviewer` to 0.2.4, `drawio-diagrams` to 0.7.2, `architecture-compass` to 0.6.3, `codegraph-ast-grep` to 0.3.2, and `animated-readme-logo` to 0.5.1.
- Hardened bundled OpenAI routing: Codex-only explicit routing for memory and structural-search workflows, Chat/Codex routing for the other four bundled skills, no empty dependency blocks, and implicit invocation off for the Codex-only skills.
- Documented the one-folder portable-plugin workflow: edit canonical `skills/`, then run `npm run sync:agent-plugin`; do not hand-edit `plugins/stark-ai-developer/`.
- Aligned README, validation, publishing, site, support, listing, spec, and ADR-0043 documentation with ephemeral OpenAI adapter packaging under `dist/openai/`.
- Spec and ADR-0043 docs now include release-identity, skill-local OpenAI metadata, and evidence gates. Live-eval, signed provenance, and external publication remain pending.
- Speed up hosted Validate and Pages: shallow checkout, pull-request base fetch only when needed, skip a duplicate network-endpoint scan after `npm run validate`, prefer the offline pnpm store, and add readable emoji step names. Publish Release waits for the hosted Validate run on the merged `main` SHA so a release prepared in the change PR can be published after merge.

### Fixed

- Stopped OpenAI adapter packaging, validation, and reproducibility checks from materializing the retired `adapters/openai/` tree, including leftover sibling stage directories, and pointed remaining docs and the repository map at ephemeral `dist/openai/*.zip` staging.
- Pin Git to LF on the Linux/macOS/Windows `archive-identity` matrix and in `.gitattributes` so Windows checkouts do not convert text files to CRLF and break `zip-store-v1` SHA-256 comparison.
- Reject untracked and ignored files under bundled skill and release-input roots so local `.env`, `.codegraph/`, `coverage/`, and scratch files cannot enter projections, archives, or release-input digests.
- Emit and validate marketplace `policy.authentication: "ON_INSTALL"`, derive OpenAI categories from the dated submission snapshot, and project listing `brandColorDark` into `.codex-plugin/plugin.json`.

### Deprecated

### Removed

- Removed Cursor-only `agents/openai.yaml` from `cursor-memory-curator` and `cursor-spec-interviewer`; those skills are not OpenAI-routed.

## v0.19.0 - 2026-08-10

### Added

- Added Architecture Compass AC-ADR-050 for accessible semantic receipt markers: `✅` verified/completed, `ℹ️` informational/not needed, `⏭️` intentionally skipped/not run, and `⚠️` limitations or attention-required outcomes.
- Added capability-aware final receipt profiles (`plain` and `enhanced`) plus a separate `interactive` progress adapter, with compact, host-neutral activation output and accessible plain-text fallbacks.
- Added host-neutral persistence-surface guidance and an internal/public Architecture Compass ADR boundary with immutable internal decision locks and reciprocal-successor checks, so implementation policy remains distinct from exposed portable decisions.

### Changed

- Updated `architecture-compass` from 0.6.1 to 0.6.2 with capability-aware final receipt profiles, a separate transient progress adapter, host-neutral persistence-surface routing, and separate internal/public ADR guidance.

### Fixed

### Deprecated

### Removed

### Security

## v0.18.0 - 2026-08-10

### Added

### Changed

- Updated `architecture-compass` to 0.6.1 by removing standing aggregate-validation commands from non-normative ADR Guides; focused checks now follow changed contracts and owning boundaries, while mandatory repository, release, and user-specified gates remain authoritative.

### Fixed

### Deprecated

### Removed

### Security

## v0.17.0 - 2026-08-10

### Added

### Changed

- Updated `codegraph-ast-grep` to 0.3.1 with plain, benefit-first setup and update descriptions while preserving its workflow, authority, provenance, migration, and verification contracts.

### Fixed

### Deprecated

### Removed

### Security

## v0.16.0 - 2026-08-10

### Added

- Added the read-only `probe-drawio-toolset.mjs` capability receipt, deterministic native/raw/browser fallback coverage, and ADR-0040 for capability-aware draw.io export routing.
- Added native, Windows-bridge, stale-candidate, browser-tristate, smoke-export, receipt-sanitization, and official-logo fidelity regression coverage for `drawio-diagrams`.

### Changed

- Updated `drawio-diagrams` to 0.7.1 with an upfront capability preflight, strict read-only review, explicit transactional/raw-CLI/browser/direct-XML fallback routes, independent approvals, canonical fallback naming, and complete delivery receipts.
- Made official organization, product, and service logos the primary icon choice whenever available, preserving original artwork and brand colors; generic semantic icons remain per-node fallbacks and recoloring requires explicit authorization or a documented accessibility exception.

### Fixed

### Deprecated

### Removed

### Security

## v0.15.0 - 2026-07-29

### Added

- Added accepted repository ADR-0038 as the successor to ADR-0037 for intent-bound workflow selection, with finite disclosure, ambiguity handling, agent-selection authority, and unchanged high-risk approval boundaries.
- Expanded Architecture Compass into a routed 45-decision Short/canonical-Long/Guide library covering repository governance, architecture, frontend/backend/runtime boundaries, security and data, tooling, validation, delivery, accessibility, observability, public-skill maintenance, host portability, and release policy.
- Added AC-ADR-042 for risk-proportional validation and reusable evidence receipts, AC-ADR-044 plus the exhaustive repo-only decision-lineage manifest, and AC-ADR-045 as the workflow and intent-routing successor to AC-ADR-043 while preserving the AC-ADR-026 -> AC-ADR-043 -> AC-ADR-045 history.
- Added deterministic focused validators and routing evals for memory curators, Architecture Compass, CodeGraph plus ast-grep, Draw.io, and Animated README Logo, including clear intent, ambiguity, agent-initiated authority, Plan lifecycle, persistence failure, migration, delivery, and read-only cases.
- Added backup fixtures across the three memory curators for exact-include, zero-include, collision, containment, no-clobber, manifest-integrity, and concurrent-root behavior, and expanded clean-copy Architecture Compass install proof to all 45 ADR triplets.
- Added AC-ADR-046 for evidence ranking without expanded operational authority, AC-ADR-047 and AC-ADR-049 as the reciprocal validation-risk successors, AC-ADR-048 as the reciprocal Plan-governance successor, and synchronized their catalog, locks, lineage, and guides.
- Added byte-exact historical snapshots of all eight legacy Architecture Compass references, a commit/blob/SHA source lock, line-complete disposition coverage, a read-only verifier, runtime-leak protection, and negative integrity fixtures outside the installed skill payload.
- Expanded clean-copy Architecture Compass install proof from 45 to all 49 ADR triplets.

### Changed

- Migrated repository ADR governance to linked Short, canonical Long, and non-normative Guide triplets with stable decision locks, reciprocal successors, direct catalog routing, and Long-first authority on conflict.
- Updated `architecture-compass` to 0.5.0 with `setup`, strict read-only `audit`, governed `refactor`, `plan-refactor`, and `plan-run-refactor`; setup now uses `recommended` or `complete` coverage and limits the seven-decision foundation to new or evidence-empty repositories.
- Architecture Compass now selects from clear intent, uses native Plan mode when supported, persists only after Plan-mode exit, rechecks approved state before execution, preserves repository-native ADR mapping and receipts, and conditionally adds the generic selector instruction only for evidenced stable public multi-workflow skill repositories.
- Updated the Claude, Codex, and Cursor memory curators to 0.2.0 with the same eight routes, `plan-run-cleanup-file` first and Recommended, chat-versus-file delivery, full-depth review, safe direct cleanup, Plan-governed cleanup, exact backups, and one redacted record for file routes.
- Updated `animated-readme-logo` to 0.5.0 with `audit`, `create`, `transform`, and `animate`; successful mutating workflows now deliver a verified SVG master, motion specification, executable animation recipe, static PNG, and animated GIF, while export remains an internal stage.
- Updated `codegraph-ast-grep` to 0.3.0 with idempotent `setup`, provenance-preserving `update`, and non-repairing `doctor`; setup persists agent guidance, update runs required config/index/schema migrations and reconnects the client, and semantic/structural coding operations are internal behaviors.
- Updated `drawio-diagrams` to 0.6.0 without changing its create, edit-repair, review, or export outcomes, while adopting intent-bound routing and focused authority evals.
- Updated Claude and Cursor spec interviewers to 0.2.3 and the Codex spec interviewer to 0.3.1 with one end-to-end outcome and aligned native Plan-mode, fallback, exit, and save-only persistence behavior.
- Re-evaluated toolchain, runtime, request, AI, data, UI, validation, security, delivery, and operational guidance against current primary sources; version-sensitive mechanics remain in dated Guides.
- Updated `architecture-compass` to 0.6.0 without changing the root package version or creating a release.
- Reconciled the legacy Next.js request, source-placement, backend/runtime, environment/configuration, host-collaboration, workflow, and stack-comparison references into current ADR Guides with explicit markers and source-linked adaptations instead of restoring the monolithic runtime references.
- Completed Setup catalog disposition, validation-receipt identity, refactor finding and Done-When fields, candidate-based new-repository planning, task-specific ADR routing, provider-metadata adaptation, and legacy input compatibility without adding public workflows.

### Fixed

- Removed the redundant human-selection round trip for clear authorized intent without permitting mutation from a bare invocation, agent discovery, or ambiguous scope.
- Prevented Architecture Compass audit from writing, direct refactor from inventing durable decisions or repairing governance, Plan fallback from treating indeterminate support as unavailable, and execution from continuing after material state drift.
- Prevented accepted local ADRs from being overwritten by provider decisions and prevented provider or skill-runtime ADR identities from being copied into target-repository numbering.
- Made memory-curator file persistence fail closed before mutation, kept chat routes report-free, and required exact-selection, collision-free, no-clobber backups with deterministic source-to-destination integrity manifests for every cleanup route.
- Prevented logo workflows from claiming successful delivery without the required animation stack, and preserved verified intermediates when optional tooling is unavailable or declined.
- Made CodeGraph doctor diagnose without repair and gated project-opening analytics on exact-root authority because generated metadata may migrate.
- Prevented Draw.io `review` and Animated README Logo `audit` from falling through into mutating workflows, and made their eval contracts assert the declared selection and protected originals.
- Bound the current CodeGraph v0.3 Setup, Update, Doctor, ambiguity, and unauthorized-mutation prompts, internal clean-context reviewer outputs, independent 35/35 grading, and provenance to the exact runtime payload without presenting internal evidence as CI, hosted, production, or live-tool proof.
- Removed contradictory authority and environment-loading guidance plus stale TypeScript preview, AI SDK v5, Vercel KV, elevated Supabase credential, and inconsistent Next.js/TanStack Query examples from the routed Architecture Compass guidance.
- Corrected identity-poor query keys, unsafe write validation, and inconsistent Next.js/TanStack Query hydration, retry, and realtime examples in the routed Architecture Compass guidance.
- Corrected validation risk so it follows changed contracts and blast radius rather than observation location, while restricting production fallback to bounded observation of an exact already-authorized low-risk artifact after mandatory gates.

### Deprecated

### Removed

- Removed the central stable-skill `migrate`/`not-needed` disposition manifest, its validator and package command, and the confirmation-only routing policy from active documentation.
- Removed superseded public workflow menus: Architecture Compass Setup/Apply variants, CodeGraph analysis-as-mode routes, memory-curator review/plan/cleanup triads, and Animated README Logo's public export mode.
- Removed eight legacy monolithic Architecture Compass references, unsuffixed repository ADR paths, the colliding validation draft, and its obsolete standalone patch artifact after their approved intent moved into the routed triplets.
- Removed the unpublished v0.14 release section by folding its complete delta into v0.15.

### Security

- Preserved separate approval for destructive, paid, irreversible, external, deployment, publication, production, telemetry, installation, and scope-expanding actions even when workflow selection is automatic.
- Added visible stop behavior for accepted-ADR conflicts, scope drift, missing authority, unsafe overwrite, sensitive context, persistence failure, and irreversible migration boundaries.
- Kept least privilege, trust boundaries, secret/PII redaction, object/action authorization, AI tool approval, data lifecycle, migration, rollback, root-bounded paths, and staged-evidence claims first-class across the public skills.

## v0.13.0 - 2026-07-24

### Added

- Added fixed-theme light/dark SVG-to-PNG comparison exports and profile-comparison proof for `drawio-diagrams`, including stable component, group, boundary, edge, and embedded-icon identities.
- Added visual assertions for exact group membership, fixed SVG themes, canonical PNG pixel differences, static gallery references, and SVG/PNG canvas matching.

### Changed

- Updated `drawio-diagrams` to 0.5.0 with viewer-independent comparison-gallery guidance, explicit fixed-theme rasterization approval, and bounded browser export behavior.
- Comparison proof now covers exact component-to-boundary membership, recursive self-contained SVG inspection across validators, and one explicitly selected browser executable per rasterization batch.

### Fixed

- Hardened fixed-theme rasterization to inspect bounded nested SVG image data and reject active or remotely loading content at every embedded level.

### Deprecated

### Removed

### Security

- Kept local browser rasterization no-clobber and fail-closed for active content, external render assets, and unapproved file-writing use.

## v0.12.0 - 2026-07-17

### Added

- Added a dependency-free, root-bounded static-PNG and animated-GIF exporter for trusted repository-owned README logo recipes, with non-exporting contract checks, strict XML and artifact inspection, commit-time no-clobber protection, exact per-frame GIF timing validation, sanitized failures, deterministic fake-tool coverage, and transactional replacement.
- Added explicit target-contract and install-host data to the generated catalog so contract-backed cross-host installs are discoverable without changing runtime-specific artifacts.
- Added focused Claude and Cursor lifecycle evals with competing interviewer skills and repository-owned persistence checks.

### Changed

- Updated `animated-readme-logo` to 0.4.0 so product repositories retain only brand-specific source, motion, timing, palette, and path decisions while the skill owns reusable export mechanics.
- Updated `drawio-diagrams` to 0.4.0 with default native animation for new directed runtime, process, and data flows, explicit opt-out, a technical-geominimalist default plus four bounded adaptive design profiles, bounded reference-style adaptation, architecture content gating, compact ER/UML/C4/BPMN/SysML/ML notation recipes, icon-first logo/service coverage, Lobe Icons and Simple Icons provider routing, a single user-responsibility rights notice, improved local shape search, conditional discovery, bounded three-pass self-review, and a fair head-to-head benchmark protocol.
- Updated `claude-spec-interviewer` and `cursor-spec-interviewer` to 0.2.2 so planning, question, transition, and plan-exit instructions follow the execution host while target-specific evidence and execution output remain unchanged.
- Updated incubator `skillopt-setup` to 0.1.1, keeping the Codex OpenAI-compatible gateway local to that workflow until reuse and isolation justify extraction.
- Updated incubator `handoff` to 0.1.1 with agent-neutral trigger wording.

### Fixed

- Superseded ADR-0026 with ADR-0028 so both proven reuse and fail-closed backend isolation are required before a gateway can be extracted from its owning skill.
- Removed natural-language directive classification from validation; OpenAI prompts now use a small fail-closed foreign-control-name check.
- Made complete skill frontmatter validation YAML-aware, including nested metadata, comments, quoted keys, and flow mappings.
- Parsed `agents/openai.yaml` as YAML before validating nested types and checking the resolved default prompt.
- Separated target runtime from installation host throughout catalog labels and commands, synchronized the documented host-ready install sets with the portable public catalog, and required every generated install command to have a host-specific accessible copy label.
- Hardened `drawio-diagrams` export verification so exit-zero Desktop runs cannot publish missing, stale, symlinked, structurally invalid, or concurrently changed artifacts; both outputs validate before commit, destination installation is no-clobber, and interrupted or replacement commits preserve recovery backups instead of deleting raced data. Portable-image validation now checks every HTML/CSS/srcset source, rejects missing and fragment-only image cells plus obfuscated active schemes, ignores navigation links, and stays in parity with SkillOpt. Also removed unsupported Desktop Mermaid-import and `--layout` assumptions, corrected eval regexes, and added guarded implicit-activation coverage.
- Hardened `animated-readme-logo` export with descriptor-bound output-parent creation, cumulative frame-byte limits, two complete deterministic render passes with verified-byte reuse, digest-bound multi-output commits, and retained replacement recovery that cannot delete same-inode concurrent updates.
- Fixed SkillOpt Codex CLI target, judge, and reflector prompt transport to use explicit UTF-8 stdin, redact prompt echoes from captured streams, and reap large no-read timeouts, so large skill/resource snapshots no longer exceed argument limits or leak through process arguments and logs.

### Deprecated

### Removed

### Security

- Kept fail-closed filesystem, process, tool, network, and environment isolation mandatory for every extracted or shared backend gateway.

## v0.11.0 - 2026-07-13

### Added

### Changed

- Updated `animated-readme-logo` to 0.3.0 with an approval-gated minimal exporter preflight and a configured Chromium/`agent-browser` preview fallback before any browser download.

### Fixed

- Separated browser-preview failures from raster-export readiness and provider approval from local-tool installation approval.

### Deprecated

### Removed

### Security

## v0.10.1 - 2026-07-13

### Added

- Added ADR-0026 guidance that separates the executing client from the target agent ecosystem, keeps independently valuable skills unconstrained by catalog size, and leaves backend gateways with their owning workflow until reuse and isolation are proven.
- Added real disposable Codex, Cursor, and Claude Code destination-install smoke coverage plus live Claude- and Cursor-target-on-Codex activation evidence.

### Changed

- Updated `claude-spec-interviewer` to `0.2.1` so cross-host execution adapts planning and question controls without changing Claude Code evidence or output artifacts.
- Updated `cursor-spec-interviewer` to `0.2.1` with execution-host control translation and a matching OpenAI default prompt, and updated `architecture-compass` to `0.2.1` with valid concise OpenAI metadata.
- Made catalog install commands target-correct by category and replaced manual Claude skill copies with supported `-a claude-code` installation commands.

### Fixed

- Validated every existing `agents/openai.yaml` file and rejected OpenAI prompts that require foreign-host-only planning or question controls.

### Deprecated

### Removed

### Security

## v0.10.0 - 2026-07-13

### Added

- Added once-per-task stable update checks for the selected CodeGraph/ast-grep analysis stack, with one itemized per-tool approval checkpoint, offline and opt-out handling, versioned actions, verification, and rollback disclosure.
- Added capability guidance for current and legacy CodeGraph releases, a focused optional-tool escalation guide, and expanded eval scenarios for update consent, runtime boundaries, legacy behavior, native LSP fallback, advanced codemods, security-policy routing, and bounded rewrites.
- Added deterministic `codegraph-ast-grep` contract validation, command-safety regression fixtures, and machine-regraded captured behavioral evals to the repository validation pipeline.

### Changed

- Updated `codegraph-ast-grep` to `0.2.0` with installed-help-first command selection, consolidated semantic exploration when exposed, watcher-aware graph freshness, capability-gated ast-grep outline, evidence reconciliation, and reviewed rewrite staging.
- Reworked setup for exact package or checksum-verified release provenance, reproducible project-local launches, effective `CODEGRAPH_DIR` handling, and explicit Codex, Cursor, Claude Code, and generic MCP configuration boundaries.
- Expanded Claude Code install documentation to include the portable `codegraph-ast-grep` workflow.

### Fixed

- Removed unconditional assumptions about `codegraph_trace`, CLI `explore`, `codegraph init -i`, universal auto-sync, npm-only CodeGraph installation, and unpinned persistent ast-grep MCP execution.
- Separated analysis-tool binary/package updates from runtime configuration refresh, prompt hooks, telemetry choices, graph operations, and unrelated application dependency updates.
- Made project-local ast-grep verification fail closed instead of allowing npm to fetch a missing command, and required affirmative approval before project-opening CodeGraph diagnostics that may migrate generated state.
- Preserved Team-pinned CodeGraph update scope and made native Windows checks, updates, and verification restore prior process environment state after telemetry/config guards.

### Deprecated

### Removed

### Security

- Prevented automatic or blanket tool updates, pipe-to-execution installer defaults, unreviewed optional-tool installs, and rewrite snapshot/update-all shortcuts.
- Required stable-source provenance, exact update scope, checksum/build-policy disclosure, redaction, telemetry-disabled update checks unless separately approved, and explicit approval for every side-effect class.

## v0.9.1 - 2026-07-13

### Added

- Added a concise public SkillOpt run summary for the accepted `drawio-diagrams` routing and readability optimization.

### Changed

- Updated `drawio-diagrams` to require explicit orthogonal waypoints around text and callout obstacles and to report validator names, connector rails, label backgrounds, and label spacing for dense diagrams.

### Fixed

### Deprecated

### Removed

### Security

## v0.9.0 - 2026-07-12

### Added

- Promoted `animated-readme-logo` 0.2.0 with live Recraft V4.1 discovery and cost approval, a deterministic local SVG fallback, explicit task/provider/export statuses, and README-safe delivery guidance.
- Added dependency-free strict SVG and GIF/APNG/WebP inspection with hidden-metadata rejection, a focused animated-logo fixture harness, and reusable bounded visual assertions shared with draw.io evaluation.

### Changed

- Kept animated-logo routing portable across Codex, Cursor, Claude, and other Agent Skills hosts; provider capability and output contracts drive the route instead of agent-specific forks.
- Refactored draw.io visual evaluation behind a reusable six-assertion library without changing its public grammar.

### Fixed

- Made README logo audits resolve assets inside an explicit repository root, parse bounded live Markdown/HTML image references, verify SVG and raster content, enforce meaningful reduced-motion/static fallbacks, and report readiness without fabricating unavailable artifacts.

### Deprecated

### Removed

### Security

- Rejected absolute, UNC, root-escaping traversal, encoded scheme/entity, duplicate-attribute, and symlink-escaped README asset paths before reading files.
- Rejected symlinked or oversized visual-artifact trees, active/foreign/metadata-bearing SVG content, hidden raster metadata, and non-regular animated-image inputs before release proof.

## v0.8.0 - 2026-07-12

### Added

- Added capability-detected Codex, Cursor, Claude, and unknown-host collaboration adapters to the portable `architecture-compass` workflow.
- Added Architecture Compass lifecycle evaluation cases for conditional planning, ADR conflicts, stack deviations, fallbacks, no-write decision phases, bounded execution, audits, and PR reviews.

### Changed

- Updated `architecture-compass` to use a read-only planning phase for unresolved durable choices or broad, multi-boundary, behavior-changing, or phased refactors while keeping narrow behavior-preserving ADR-backed work direct, audits read-only, and diff reviews on the host review surface.
- Added explicit planning, read-only-enforcement, architecture-decision, and execution fields; a pending-write-permission gate; exact route-matching continuations; and repository-state rechecks before approved changes are applied.
- Documented portable Architecture Compass installation and usage for Codex, Cursor, and Claude.

### Fixed

- Replaced the release workflow's cross-runtime wildcard verification command with the explicit Codex-ready public skill list.
- Fixed SkillOpt split generation to preserve wrapped expected-behavior bullets instead of truncating semantic judge requirements.
- Corrected Cursor Plan evidence classification so behavioral no-write instructions are not reported as an enforced filesystem sandbox.

### Deprecated

### Removed

### Security

## v0.7.0 - 2026-07-10

### Added

- Added the incubating `skillopt-setup` workflow with local Microsoft SkillOpt installation and readiness checks, per-skill train/validation/test preparation, provider-backed, hybrid, and Codex CLI execution profiles, run artifact verification and summaries, and guarded `best_skill.md` adoption.
- Added a local `.agents/` artifact audit and a loopback-only Codex-backed OpenAI Chat Completions gateway with an end-to-end compatibility probe for SkillOpt experiments.
- Added deterministic draw.io visual-eval support with six PNG/SVG artifact cases, fixture-backed assertions, generated full and text-only split variants, page-index export, `DRAWIO_BIN` overrides, and `diagrams.net` executable discovery.
- Added runtime-specific native Plan-mode lifecycle and fallback eval coverage for the Codex, Cursor, and Claude spec interviewers.
- Added `drawio-diagrams` architecture-readability guidance and eval coverage for connector-label gutters, fan-out lanes, hierarchy, whitespace, dark-mode labels, and logo fidelity.
- Added repository validation for SkillOpt helper and adapter contracts and draw.io visual assertions.

### Changed

- Updated all three public spec interviewers to require native Plan mode when supported, route transitions through each host's native controls, use structured clarification when available, and record conversational fallback only when Plan mode is unavailable or explicitly declined.
- Made Plan-mode interviewing read-only and moved approved spec and required ADR persistence to a save-only continuation after mode exit that stops before feature implementation.
- Strengthened SkillOpt setup and readiness reporting with strict training-ready checks, target/mode/profile-specific fresh manifests, active-split data floors, explicit model and credential blockers, and visual renderer readiness.
- Expanded `drawio-diagrams` XML authoring, routing, theming, icon, and verification guidance to improve dense architecture readability and preserve real logo artwork.
- Updated public usage examples for each runtime's native Plan-mode lifecycle.

### Fixed

- Fixed save-only spec-interviewer persistence so a required ADR also receives the minimal index entry mandated by the repository's existing convention, while all other repo-facing documentation remains deferred to implementation.
- Fixed `drawio-diagrams` connector-crossing validation to honor explicit waypoints and side ports and calculate nested cell bounds before warning about callout overlaps.
- Fixed draw.io visual assertion globs so Markdown escapes such as `\*.png` and `\*.svg` retain wildcard semantics in both JavaScript and Python matchers.
- Fixed SkillOpt readiness to score the configured active split, ignore `None` visual sentinels, reject missing configured split directories, and block stale or mismatched adapter manifests.
- Fixed generated SkillOpt case metadata to distinguish `text-only` execution from `isolated-artifact-write` visual execution instead of advertising legacy broad workspace writes.

### Deprecated

### Removed

### Security

- Isolated every Codex-backed SkillOpt target, judge, and reflection launch with strict network-disabled permissions and minimal runtime reads; visual cases alone receive bounded temporary-workspace artifact writes, with protected control output and symlink rejection.
- Restricted the bundled Codex gateway to loopback-only, text-only operation that denies workspace reads and rejects all writes, host config/rules, inherited environments, and profiles; it also terminates full Codex process trees on success, timeout, or client disconnect. Remote deployment remains prohibited without OS/container host-read isolation.
- Hardened provider endpoint probes, optimized-skill adoption, and local-artifact promotion against leaked URL/auth secrets, raw transcripts and private paths, stale proof, and regressing test scores.
- Pinned release publication and annotated tags to the exact validated `main` commit, making the workflow fail closed if `main` advances between readiness and publication.

## v0.6.2 - 2026-07-08

### Added

### Changed

### Fixed

- Fixed `drawio-diagrams` route-crossing validation so transparent text boxes and callouts are still treated as connector obstacles.
- Added regression coverage for connectors crossing transparent `fillColor=none` callouts.

### Deprecated

### Removed

## v0.6.1 - 2026-07-07

### Added

- Added strict XML preflight and browser URL helper coverage to the public `drawio-diagrams` skill.
- Added `drawio-diagrams` rules for real-logo defaults, icon source cascades, connector routing, fixed-aspect logos, and simplified/detailed diagram views.
- Added business AI workflow lookup terms to the `drawio-diagrams` icon catalog for AI, automation, ERP/CRM, cloud, data, delivery, and security icon needs.

### Changed

- Expanded `drawio-diagrams` setup, delivery, verification, and icon-catalog guidance with concrete commands and curated style starters.
- Updated `drawio-diagrams` to ask for missing-logo fetch approval during initial setup and to use simplified icons consistently when approval or sources are unavailable.

### Fixed

- Hardened `drawio-diagrams` regression coverage for forbidden XML constructs, icon catalog smoke checks, and browser URL generation.
- Added diagram-rule regression coverage for floating semantic edges and distorted image/logo cells.

### Deprecated

### Removed

## v0.6.0 - 2026-07-07

### Added

- Promoted `drawio-diagrams` into the public Engineering Workflows catalog for creating, editing, validating, and exporting editable draw.io / diagrams.net `.drawio` diagrams.
- Added the `drawio-diagrams` runtime payload with concise workflow guidance, XML authoring references, diagram-type and theming playbooks, delivery guidance, public-safe examples, and OpenAI metadata.
- Added deterministic draw.io validation for multi-page files, root/layer structure, attached vertex and edge geometry, dimensions, contrast, font-size, overlap, containment, icon, and edge-reference checks.
- Added optional local helpers for draw.io Desktop export and explicitly approved local shape/icon-cache search.
- Added `drawio-diagrams` eval proof, promotion cases, rubric, and a public release spec.
- Added ADR-0022 to allow dependency-free Python helpers by exception for complex deterministic public-skill validation.

### Changed

- Updated public catalog docs, Engineering Workflows listings, install guidance, publishing docs, package metadata, and generated site coverage for the `drawio-diagrams` promotion.
- Extended repository validation with draw.io examples and validator scenarios.

### Fixed

### Deprecated

### Removed

## v0.5.0 - 2026-07-06

### Added

- Added the promoted `cursor-spec-interviewer` public skill under Cursor Operations with self-contained templates, references, Cursor execution prompt asset, and eval proof.
- Added the promoted `cursor-memory-curator` public skill under Cursor Operations with Cursor-native context inventory, redacted risk scanning, approval-gated backup, cleanup templates, references, and eval proof.
- Added the promoted `claude-memory-curator` public skill under Claude Operations with Claude Code context inventory, redacted risk scanning, approval-gated backup, cleanup templates, references, and eval proof.
- Added the promoted `claude-spec-interviewer` public skill under Claude Operations with Claude Code-native source challenge, ADR gate, persistence guidance, execution prompt asset, templates, references, and eval proof.
- Added ADR-0021 to keep portable public skills in workflow categories and reserve runtime operations categories for runtime-specific behavior.
- Added Cursor global and project-local install examples for `cursor-spec-interviewer` and `cursor-memory-curator`.
- Added Claude Code project-local and user-level install guidance for `claude-spec-interviewer` and `claude-memory-curator`.

### Changed

- Moved `codegraph-ast-grep` to Engineering Workflows and updated its setup wording with runtime-specific MCP boundaries while keeping Codex MCP configuration clearly Codex-only.
- Clarified that `codex-memory-curator` remains scoped to Codex memory state even when installed from Cursor.
- Updated public catalog docs and package metadata for Cursor Operations and Claude Operations.
- Tightened Claude skill descriptions so trigger keywords are front-loaded and resilient to Claude Code skill-list truncation.
- Revised `codex-spec-interviewer` 0.2.0 with a deduplicated payload, clearer Codex integration boundaries, private-spec destination guidance, and refocused rollout guidance.

### Fixed

- Fixed `codex-spec-interviewer` artifact-destination guidance so private, exploratory, sensitive, or not-yet-public specs stay under the ignored `docs/specs/do-not-publish/` structure unless the maintainer explicitly confirms a publishable `docs/specs/` destination.
- Fixed spec-interviewer eval proof so explicit no-file persistence declines are exempt from persisted-path checks.
- Removed stale Cursor proof text that still listed the Codex spec-interviewer payload cleanup as a pending follow-up.
- Fixed `claude-memory-curator` inventory and risk scanning so explicit Claude auto-memory directories do not cause repo instruction files to be classified as auto-memory topics.

### Deprecated

### Removed

## v0.4.3 - 2026-06-11

### Added

- Added ADRs for Architecture Compass starter guidance covering Bun/pnpm ownership, native TypeScript tooling, and Oxc lint/format defaults.
- Added a publishable spec for the Architecture Compass Oxc tooling policy.

### Changed

- Updated `architecture-compass` preferred stack guidance for Bun runtimes, pnpm workspace hardening, native TypeScript `tsgo` usage, Oxc linting/formatting defaults, and layered Oxc type-aware linting.

### Fixed

### Deprecated

### Removed

## v0.4.2 - 2026-06-10

### Added

### Changed

- Clarified the canonical `architecture-compass` bundled guardrail inventory for setup and new-repo runs.
- Expanded setup reporting so adapted guardrails record the active adapted rule alongside defer and reject evidence.

### Fixed

### Deprecated

### Removed

## v0.4.1 - 2026-06-10

### Added

### Changed

- Updated `architecture-compass` setup and new-repo guidance so bundled ADR guardrails remain visible as adopted, adapted, deferred, or rejected decisions instead of being silently dropped by target-repository evidence.
- Made `setup-report-template.md` the canonical setup output for bundled guardrail adoption decisions, with deferred and rejected guardrails carrying explicit follow-up context.

### Fixed

### Deprecated

### Removed

## v0.4.0 - 2026-06-09

### Added

- Promoted `architecture-compass` into the public Engineering Workflows catalog with setup and refactor modes for ADR-governed repositories.
- Added `skill-evals/architecture-compass` promotion proof.

### Changed

- Updated public catalog, install examples, publishing docs, and generated site coverage for the `architecture-compass` promotion.

### Fixed

### Deprecated

### Removed

## v0.3.2 - 2026-05-29

### Added

### Changed

- Added user-facing `codegraph-ast-grep` use cases to the README, skill body, and usage playbook so the generated catalog explains everyday development workflows.

### Fixed

- Excluded local `.codegraph/` index state from the smoke-install clean copy so local CodeGraph sockets cannot break smoke validation.

### Deprecated

### Removed

## v0.3.1 - 2026-05-29

### Added

### Changed

- Updated `codegraph-ast-grep` setup guidance to present global vs repo-local install tradeoffs before approval, recommend global setup for personal multi-repo use, respect package-manager freshness and build-script policies, document pnpm ast-grep build approval, and keep `.codegraph/` index data ignored.

### Fixed

### Deprecated

### Removed

## v0.3.0 - 2026-05-29

### Added

- Promoted `codegraph-ast-grep` into the public Codex operations catalog with current CodeGraph, Codex MCP, ast-grep, and ast-grep MCP guidance.
- Added `skill-evals/codegraph-ast-grep` promotion proof.

### Changed

- Updated public catalog, install examples, and publishing docs for the `codegraph-ast-grep` promotion.

### Fixed

### Deprecated

### Removed

## v0.2.2 - 2026-05-26

### Added

- Added an Astro GitHub Pages catalog generated from public and incubator `SKILL.md` files.
- Added branded catalog assets, metadata, sitemap, JSON-LD, and generated skill detail pages.
- Added GitHub Pages deployment workflow and site build validation.

### Changed

- Extended repository validation to build and verify the generated site.

### Fixed

### Deprecated

### Removed

## v0.2.1 - 2026-05-26

### Added

- Added OpenAI/Codex metadata validation for Codex-facing public and incubator skills.
- Added `agents/openai.yaml` metadata for `codex-memory-curator` and incubator Codex operations skills.

### Changed

- Documented that Codex/OpenAI-facing skills use `agents/openai.yaml` while `SKILL.md` remains the portable source of truth.

### Fixed

### Deprecated

### Removed

## v0.2.0 - 2026-05-24

### Added

- Added `codex-memory-curator` as a promoted public Codex operations skill.

### Changed

- Updated `codex-spec-interviewer` to require user-verified finalization, convention-aware persisted spec/ADR artifacts, predictable spec filenames, and repo-facing documentation updates when artifact policy or promotion state changes.
- Documented the repository policy for implementation specs in `docs/specs/` and ADRs in `docs/adrs/`.
- Simplified release preparation so public skill changes carry skill version, package version, and changelog updates in the same pull request.
- Clarified that public skill `metadata.version` is independent from the repository package version.

### Fixed

- Fixed release validation so unchanged public skills can keep versions below the repository package release.

### Deprecated

### Removed

- Removed the separate `Prepare Release` workflow.

## v0.1.1 - 2026-05-24

### Added

- Added release-intent detection so pull requests that partially change `package.json`, `CHANGELOG.md`, or public skill `metadata.version` must pass release validation.
- Added GitHub Actions workflow linting to the local and CI validation gates.
- Added Cursor and VS Code actionlint recommendations and workspace settings for inline workflow diagnostics.

### Changed

- Renamed the public repository slug from `stark-ai-de/skills` to `stark-ai-de/agent-skills`.
- Kept `Publish Release` manual-only now that pull requests validate release intent before merge.

### Fixed

- Corrected `codex-spec-interviewer` release metadata to `0.1.1`.

### Deprecated

### Removed

## v0.1.0 - 2026-05-21

### Added

- Initial public Agent Skills repository scaffold.
- Validation, listing, and skill scaffolding scripts.
- Manual GitHub Actions workflows and helper scripts for preparing and publishing releases.
- Initial skill catalog for Codex operations, repo maintenance, skill maintenance, productivity, and engineering workflows.
- Added `codegraph-ast-grep` for Codex CLI setup and usage of CodeGraph paired with ast-grep.
- Added `codex-spec-interviewer` for turning fuzzy coding requests into Codex-ready implementation specs.
- Added incubator engineering workflow candidates for debugging, test-first implementation, issue slicing, PRDs, repo mapping, and prototype spikes.
- Added category README files, examples, out-of-scope boundary docs, and a root domain glossary.
- Added clean-copy install smoke test automation.
- Project-local helper skill lockfile for upstream skills used while maintaining this repo.
- Added Oxc formatting/lint config files.
- Added lightweight ADR system with initial repository decision records.
- Added `adr-writer` for short repo-level Architecture Decision Records.
- Added ADR validation and ADR creation scripts.
- Added `incubator/skills/` for candidate skills and `skill-evals/` for maintainer proof outside the runtime skill payload.

### Changed

- Tightened skill validation so every `SKILL.md` must include the universal section contract from the spec.
- Tightened category validation so category README files match skill frontmatter descriptions.
- Switched the repository license from MIT to Apache-2.0 for the public skill catalog and repository material.
- Aligned validation, docs, and publishing guidance with the open Agent Skills specification.
- Expanded `agent-context-bootstrap` into the canonical downstream repo setup workflow.
- Updated `codex-spec-interviewer` to use one-question-at-a-time grilling and a bounded source challenge before final specs.
- Added an ADR gate to `codex-spec-interviewer` so durable architectural decisions are drafted or linked before implementation specs.
- Moved broad engineering workflow candidates and `grill-plan` out of the public catalog and into the incubator.

### Fixed

- Added missing universal skill sections and an explicit approval note for the memory backup script.

### Deprecated

### Removed

- Removed vendored copies of already-published upstream skills from the public `skills/` catalog.
