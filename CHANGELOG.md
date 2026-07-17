# Changelog

## Unreleased

### Added

### Changed

### Fixed

### Deprecated

### Removed

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
