---
title: "GitHub Pages skill catalog"
slug: "github-pages-skill-catalog"
artifact_path: "docs/specs/github-pages-skill-catalog-spec.md"
mode: "standard"
status: "draft"
owner: "stark-ai-de"
repo: "stark-ai-de/agent-skills"
created: "2026-05-26"
updated: "2026-08-13"
source_request: "Generate a Codex-ready spec for a GitHub Pages setup in this repo using the style, metadata, icons, favicons, and related brand assets of stark-ai.de."
---

# GitHub Pages Skill Catalog

## Goal

Create a polished static GitHub Pages site for `stark-ai-de/agent-skills` that presents the public catalog and incubator skills as readable, linkable web pages while preserving `SKILL.md` files as the source of truth.

The site should use the visual language, metadata conventions, logos, favicons, and brand assets of `https://stark-ai.de/` without requiring the sibling website repository at build time.

## Scope

### In scope

- Add an Astro static site under `site/`.
- Generate one page for every public skill under `skills/**/SKILL.md`.
- Generate one page for every incubator skill under `incubator/skills/**/SKILL.md`.
- Add catalog index pages for public and incubator skills.
- Add a focused home page that makes the skill catalog the first screen.
- Copy approved brand assets and design tokens from `stark-ai.de` into this repo.
- Add static favicons, app icons, manifest metadata, SEO metadata, Open Graph metadata, and Twitter card metadata.
- Keep `Validate` as the single trusted workflow that produces and deploys a validated Pages artifact after successful full trusted-main validation.
- Keep one unfiltered stable required `validate` aggregator. Pull requests whose affected or fail-full plan selects the site task catch site build or restore failures before merge.
- Update existing repo-facing docs, workflow references, receipt contracts, and ADR navigation that become stale because of the Pages ownership change.

### Non-goals

- Do not publish private `.agents/` helper skills.
- Do not publish `docs/specs/do-not-publish/`.
- Do not add a custom domain in the first pass.
- Do not add a runtime API, server rendering, search backend, contact form, analytics, or tracking.
- Do not make the site depend on the sibling `stark-ai.de` checkout during CI or local builds.
- Do not change the Agent Skills runtime format or skill promotion rules.

## Repo context

- Relevant files/directories:
  - `skills/**/SKILL.md`
  - `incubator/skills/**/SKILL.md`
  - `incubator/skills/skill-maintenance/skillopt-setup/` is cataloged as an incubator candidate.
  - `skill-evals/skillopt-setup/` provides eval proof linked from that candidate page.
  - `README.md`
  - `docs/assets/stark-ai-de-agent-skills-logo.svg`
  - `docs/adrs.md`
  - `docs/validation.md`
  - `.github/workflows/validate.yml`
  - `.github/workflows/publish-release.yml`
  - `.github/workflows/pages.yml` (removed)
  - `package.json`
  - `pnpm-lock.yaml`
- Existing abstractions/patterns to preserve:
  - `SKILL.md` frontmatter `name` and `description` are canonical.
  - Incubator skills remain visible as candidate/internal material and must not be presented as promoted public skills.
  - Repo validation runs through `npm run validate`, `pnpm format:check`, and `pnpm lint`.
  - Hosted validation uses manifest schema v2, fail-closed base/candidate pull-request planning, a content-addressed task graph, dynamic miss jobs, immutable result artifacts, and one stable aggregate report.
  - Generated or local helper skill installs under `.agents/` are not catalog content.
- Commands and toolchain:
  - Node `>=22.20.0`
  - `pnpm`
  - Existing root validation scripts
- Related ADRs:
  - [ADR-0013](../adrs/0013-persist-specs-and-adrs-as-repo-artifacts.short.md) ([Long, canonical](../adrs/0013-persist-specs-and-adrs-as-repo-artifacts.long.md) · [Guide](../adrs/0013-persist-specs-and-adrs-as-repo-artifacts.guide.md))
  - [ADR-0017](../adrs/0017-use-astro-for-github-pages-skill-catalog.short.md) ([Long, canonical](../adrs/0017-use-astro-for-github-pages-skill-catalog.long.md) · [Guide](../adrs/0017-use-astro-for-github-pages-skill-catalog.guide.md))
  - Historical: [ADR-0041](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.short.md) ([Long, canonical](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.long.md) · [Guide](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.guide.md)), [ADR-0042](../adrs/0042-optimize-github-actions-with-owned-gates.short.md) ([Long, canonical](../adrs/0042-optimize-github-actions-with-owned-gates.long.md) · [Guide](../adrs/0042-optimize-github-actions-with-owned-gates.guide.md)), [ADR-0043](../adrs/0043-deploy-validated-main-artifacts.short.md) ([Long, canonical](../adrs/0043-deploy-validated-main-artifacts.long.md) · [Guide](../adrs/0043-deploy-validated-main-artifacts.guide.md)), [ADR-0044](../adrs/0044-select-validation-scope-by-trust-context-and-owned-gates.short.md) ([Long, canonical](../adrs/0044-select-validation-scope-by-trust-context-and-owned-gates.long.md) · [Guide](../adrs/0044-select-validation-scope-by-trust-context-and-owned-gates.guide.md)), and [ADR-0045](../adrs/0045-shard-mutation-fixtures-with-bounded-isolated-workers.short.md) ([Long, canonical](../adrs/0045-shard-mutation-fixtures-with-bounded-isolated-workers.long.md) · [Guide](../adrs/0045-shard-mutation-fixtures-with-bounded-isolated-workers.guide.md)) are Superseded lineage records.
  - Current: [ADR-0046](../adrs/0046-assemble-validation-proof-from-content-addressed-task-results.short.md) ([Long, canonical](../adrs/0046-assemble-validation-proof-from-content-addressed-task-results.long.md) · [Guide](../adrs/0046-assemble-validation-proof-from-content-addressed-task-results.guide.md)) governs content-addressed validation and trusted aggregate proof.
  - Current: [ADR-0047](../adrs/0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.short.md) ([Long, canonical](../adrs/0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.long.md) · [Guide](../adrs/0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.guide.md)) governs Architecture Compass hosted and local fixture distribution.
- Unspecified facts:
  - Final deployed Pages URL until repository Pages settings are enabled.
  - Whether a future custom domain will be configured.

## User-facing behavior

- User story: As a prospective skill user or maintainer, I can browse the Agent Skills catalog in a polished web UI, inspect each skill's purpose and usage, and jump to source files or install commands.
- Primary flow:
  - Open the Pages site.
  - See the public skills catalog immediately, with clear branding and install guidance.
  - Filter or scan public skills by category and skill name.
  - Open a skill page for description, metadata, install command, source link, proof/eval link when available, and related docs.
  - Browse incubator skills in a separate section clearly labeled as candidate/internal.
- Failure/empty/loading states:
  - Build should fail if a listed skill page cannot be generated from a valid `SKILL.md`.
  - Empty categories should not render.
  - Missing optional assets should fall back to a stable site logo rather than broken images.
- Accessibility/localization/compatibility notes:
  - Initial site language is English.
  - Use semantic headings, landmarks, labels, and keyboard-visible focus states.
  - Avoid text overlap at mobile and desktop widths.
  - Keep the site usable without client-side JavaScript.

## Requirements

### Functional requirements

- WHEN the site builds, THE SYSTEM SHALL discover public skills from `skills/**/SKILL.md`.
- WHEN the site builds, THE SYSTEM SHALL discover incubator skills from `incubator/skills/**/SKILL.md`.
- WHEN a public skill exists, THE SYSTEM SHALL generate `/skills/<skill-name>/`.
- WHEN an incubator skill exists, THE SYSTEM SHALL generate `/incubator/<skill-name>/`.
- WHEN a skill page renders, THE SYSTEM SHALL show the skill name, description, category, source path, install or local usage guidance, and key metadata available from frontmatter.
- WHEN a cataloged skill has eval proof under `skill-evals/<skill-name>/`, THE SYSTEM SHALL link to that proof.
- WHEN a skill has `agents/openai.yaml`, THE SYSTEM SHALL indicate Codex/OpenAI metadata is available without requiring every skill to have it.
- WHEN a user views incubator pages, THE SYSTEM SHALL clearly label them as candidate skills outside the promoted public catalog.
- WHEN the site is deployed under GitHub Pages, THE SYSTEM SHALL load routes and assets correctly under `/agent-skills/`.
- WHEN metadata is generated, THE SYSTEM SHALL include title, description, canonical URL, Open Graph image, Twitter card metadata, manifest, theme color, favicon, SVG icon, and apple icon.
- WHEN `Validate` runs for a pull request, `main` push, or manual dispatch, THE SYSTEM SHALL create the same unfiltered required `validate` aggregator.
- WHEN a pull request runs, THE SYSTEM SHALL use the fail-closed union of compatible base and candidate plans; WHEN that effective plan selects the site gate, THE SYSTEM SHALL build the site without creating Pages or reusable proof.
- IF pull-request planning is missing, malformed, incompatible, full, unknown, unmatched, or globally invalidated, THEN THE SYSTEM SHALL select the complete gate set.
- WHEN a `push` to `main` or any manual dispatch runs, THE SYSTEM SHALL select the complete logical manifest task set; each selected task SHALL be satisfied by a current successful execution or one exact verified reusable result.
- WHEN manifest schema v2 describes a task, THE SYSTEM SHALL keep affected-selection paths separate from its complete entrypoint, helper, workspace, dependency, tool, environment, logical Git, prerequisite, evidence, and restored-output closure.
- WHEN a task key is computed, THE SYSTEM SHALL bind canonical repository, contract, path/type/mode/size/content, command, dependency, prerequisite, sanitized environment, exact tool/platform, evidence, and output identity while excluding commit SHA, run ID, timestamps, and duration.
- WHEN `validation_reuse=auto`, THE SYSTEM SHALL immediately reuse eligible exact results and create jobs only for misses; WHEN `off`, it SHALL execute every selected task; WHEN `verify`, it SHALL re-execute would-be hits and hard-fail semantic evidence or output drift.
- WHEN result discovery runs, THE SYSTEM SHALL treat Actions cache only as an untrusted lookup index and accept only immutable task artifacts downloaded by exact ID after strict producer, metadata, digest, schema, key, evidence, prerequisite, and archive verification. Missing, unavailable, or expired storage SHALL become a miss; malformed or contradictory proof SHALL fail closed.
- WHEN an eligible execution fails, THE SYSTEM SHALL record a tombstone that blocks older successes in the same trust/control-plane scope, and a current failure SHALL NOT fall back to an older pass.
- WHEN the site task is reused, THE SYSTEM SHALL restore `site/dist` into a private temporary directory, independently tree-hash it, atomically install it, and require the verified digest before a current protected-main run repackages it as a new current Pages artifact.
- WHEN a full protected-main aggregate succeeds, THE SYSTEM SHALL deploy the exact current-run Pages artifact. Pull-request results remain computation evidence, and a manual run from another branch remains diagnostic; neither grants deployment or publication authority.
- WHEN any hosted run writes validation report schema v2, THE SYSTEM SHALL retain it as diagnostic evidence and bind every selected task's executed/reused status, key, receipt, producer, lookup time, evidence/output identity, complete result-set digest, and candidate fingerprints before and after assembly.
- WHEN a successful full protected-main run produces trusted receipt schema v3, THE RECEIPT SHALL bind the current candidate/main identity, report and complete result-set digests, every accepted task and output receipt, every unique producer, and the current Pages artifact plus the existing plan, manifest, candidate, CLI, fixture, and package evidence.
- WHEN a release is prepared, THE SYSTEM SHALL resolve the exact successful full main-push aggregate for the checked-out SHA, verify receipt schema v3 and report schema v2, recursively verify every unique producer and authoritative artifact, recompute candidate and Pages digests, and reject lower-integrity, incomplete, missing, expired, malformed, tombstoned, or mismatched proof without a dependency install or aggregate rerun.
- WHEN Architecture Compass misses, THE SYSTEM SHALL partition the frozen 325-case inventory by stable ordinal modulo three, run three hosted shards with up to three isolated local workers each, seal each baseline capsule, and emit one gate result only after exact 325/325 accounting. A verified hit SHALL create no Architecture Compass job or process.
- WHEN production Pages deployments are queued from different triggers, THE SYSTEM SHALL serialize them in one deployment concurrency group and verify immediately before deployment that `refs/heads/main` still equals the run SHA, failing stale runs closed.

### Non-functional requirements

- Performance: Static output should keep pages lightweight and avoid unnecessary client JavaScript.
- Reliability: CI must fail on broken site builds, missing generated routes, or broken asset references that can be checked locally.
- Security/privacy: Do not publish ignored private drafts, `.agents/`, secrets, tokens, customer data, private repo paths, or internal hostnames.
- Maintainability: Skill page content must be generated from `SKILL.md` and adjacent repo data, not duplicated manually.

## Design notes

- Preferred implementation approach:
  - Use Astro for static generation in `site/`.
  - Use `site/src/lib/skills.ts` or equivalent to read repo-relative skill files at build time.
  - Use a real Markdown/frontmatter parser rather than ad hoc string manipulation for the site data path.
  - Use Tailwind CSS v4 through the Vite plugin if Tailwind is selected for styling.
  - Configure Astro with `site: "https://stark-ai-de.github.io"` and `base: "/agent-skills"`.
  - Prefer a `pnpm-workspace.yaml` that includes the repo root and `site/` so the existing root install can cover the site package with one lockfile.
- Reuse before rewrite:
  - Copy approved static assets from the `stark-ai.de` website into `site/public/`.
  - Copy only the needed design tokens, font declarations, logo, favicons, and manifest values.
  - Do not import or vendor the sibling website app components.
- Data/API/model changes:
  - No runtime API.
  - Site data is derived from repo files during build.
- Tradeoffs considered:
  - Astro gives stronger static route generation and design control than raw GitHub Pages/Jekyll.
  - Astro avoids pulling in the sibling website's Next.js runtime and application concerns.
  - A copied asset set can drift, so future sync should be explicit and reviewable.
- Follow existing repo conventions unless the spec says otherwise.

## Architectural decisions

- ADR required: satisfied by accepted ADR-0046 for content-addressed validation and accepted ADR-0047 for hosted/local Architecture Compass distribution.
- Existing ADRs consulted:
  - [ADR-0013](../adrs/0013-persist-specs-and-adrs-as-repo-artifacts.short.md) ([Long, canonical](../adrs/0013-persist-specs-and-adrs-as-repo-artifacts.long.md) · [Guide](../adrs/0013-persist-specs-and-adrs-as-repo-artifacts.guide.md))
  - [ADR-0017](../adrs/0017-use-astro-for-github-pages-skill-catalog.short.md) ([Long, canonical](../adrs/0017-use-astro-for-github-pages-skill-catalog.long.md) · [Guide](../adrs/0017-use-astro-for-github-pages-skill-catalog.guide.md))
  - Historical: [ADR-0041](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.short.md) ([Long, canonical](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.long.md) · [Guide](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.guide.md)), [ADR-0042](../adrs/0042-optimize-github-actions-with-owned-gates.short.md) ([Long, canonical](../adrs/0042-optimize-github-actions-with-owned-gates.long.md) · [Guide](../adrs/0042-optimize-github-actions-with-owned-gates.guide.md)), and [ADR-0043](../adrs/0043-deploy-validated-main-artifacts.short.md) ([Long, canonical](../adrs/0043-deploy-validated-main-artifacts.long.md) · [Guide](../adrs/0043-deploy-validated-main-artifacts.guide.md))
- Current accepted ADR paths:
  - [ADR-0017](../adrs/0017-use-astro-for-github-pages-skill-catalog.short.md) ([Long, canonical](../adrs/0017-use-astro-for-github-pages-skill-catalog.long.md) · [Guide](../adrs/0017-use-astro-for-github-pages-skill-catalog.guide.md))
  - [ADR-0046](../adrs/0046-assemble-validation-proof-from-content-addressed-task-results.short.md) ([Long, canonical](../adrs/0046-assemble-validation-proof-from-content-addressed-task-results.long.md) · [Guide](../adrs/0046-assemble-validation-proof-from-content-addressed-task-results.guide.md))
  - [ADR-0047](../adrs/0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.short.md) ([Long, canonical](../adrs/0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.long.md) · [Guide](../adrs/0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.guide.md))
- Supersession lineage:
  - ADR-0042 is superseded by ADR-0043; ADR-0043 and ADR-0041 are superseded by ADR-0044; ADR-0044 is superseded by ADR-0046. ADR-0045 is superseded by ADR-0047.
- Implementation blocked until ADR accepted: no; ADR-0017, ADR-0046, and ADR-0047 are accepted and locked.

## File plan

### Expected touched areas

- `package.json`
- `pnpm-lock.yaml`
- `README.md`
- `docs/validation.md`
- `docs/publishing.md`
- `docs/adrs.md`
- `scripts/validation/adrs/decision-lock.tsv`
- `.github/workflows/validate.yml`
- `.github/workflows/publish-release.yml`
- `scripts/ci/`
- `scripts/validation/architecture-compass/test-validator.mjs`
- `docs/adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.{short,long,guide}.md`
- `docs/adrs/0042-optimize-github-actions-with-owned-gates.{short,long,guide}.md`
- `docs/adrs/0043-deploy-validated-main-artifacts.{short,long,guide}.md`
- `docs/adrs/0044-select-validation-scope-by-trust-context-and-owned-gates.{short,long,guide}.md`
- `docs/adrs/0045-shard-mutation-fixtures-with-bounded-isolated-workers.{short,long,guide}.md`
- `docs/adrs/0046-assemble-validation-proof-from-content-addressed-task-results.{short,long,guide}.md`
- `docs/adrs/0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.{short,long,guide}.md`
- `site/`

### Expected removed files

- `.github/workflows/pages.yml`

### Expected new files

- `pnpm-workspace.yaml`
- `site/package.json`
- `site/astro.config.mjs`
- `site/tsconfig.json`
- `site/src/pages/index.astro`
- `site/src/pages/skills/index.astro`
- `site/src/pages/skills/[slug].astro`
- `site/src/pages/incubator/index.astro`
- `site/src/pages/incubator/[slug].astro`
- `site/src/layouts/BaseLayout.astro`
- `site/src/components/*`
- `site/src/lib/skills.ts`
- `site/src/styles/global.css`
- `site/public/favicon.ico`
- `site/public/icon.svg`
- `site/public/apple-icon.png`
- `site/public/logo-alternative.svg`
- `site/public/logo-alternative.png`
- `site/public/og-image.png` or equivalent static social image
- `site/public/site.webmanifest`

### Areas not to change

- `skills/**/SKILL.md`, except if a build bug exposes invalid existing metadata and the maintainer explicitly approves fixing it.
- `incubator/skills/**/SKILL.md`, except for explicitly approved metadata fixes.
- `.agents/`
- `docs/specs/do-not-publish/`
- Skill validation semantics unrelated to site, task-input closure, trusted proof, or Architecture Compass fixture contracts.

## Execution plan

1. Read accepted ADR-0017 and keep the implementation within that decision.
2. Add the Astro site structure under `site/` and wire it into the root pnpm workspace.
3. Copy approved static brand assets from `stark-ai.de` into `site/public/`.
4. Implement build-time skill discovery from `skills/` and `incubator/skills/`, including `skillopt-setup` as an incubator candidate with eval proof.
5. Implement the home page, public skill index, incubator index, and skill detail pages.
6. Implement brand styling using the `stark-ai.de` visual language:
   - primary `#0021c7`
   - secondary `#006877`
   - background `#f8f9ff`
   - foreground `#0c1d2d`
   - Manrope display type and Inter body type when asset licensing permits reuse
7. Add metadata, manifest, favicons, canonical URLs, Open Graph, Twitter cards, robots, and sitemap behavior.
8. Make `Validate` the single trusted Pages artifact producer:
   - keep one unfiltered, stable required `validate` aggregator for pull requests, `main` pushes, and manual dispatch
   - use a fail-closed union of compatible base and candidate plans for pull requests; use the complete manifest for `main` and manual events
   - resolve canonical task keys under manifest schema v2, verify immutable result artifacts, and create jobs only for misses
   - expose `validation_reuse: auto|off|verify`, defaulting to `auto`, with `off` and namespace/epoch bumps as rollback controls
   - install only dependency profiles required by misses and skip gate dependency installation on a complete hit
   - publish every executed task as an immutable attempt-safe artifact; use Actions cache only as a disposable lookup index
   - write validation report schema v2 from the complete executed/reused result set and issue trusted receipt schema v3 only from a successful current protected-main aggregate
   - restore reusable `site/dist` into a temporary directory, independently verify its tree digest, atomically install it, then create and rehash a new current-run Pages artifact
   - upload attempt-scoped Pages and proof artifacts only after the full protected-main aggregate succeeds
   - deploy the exact current attempt-scoped Pages artifact from a dependent job
   - serialize production deployments and reject a deployment whose `refs/heads/main` no longer equals its run SHA
   - preserve diagnostic-only behavior for pull requests and full manual non-main dispatches
9. On an Architecture Compass miss, freeze the 325-case inventory, create three stable modulo shards, use up to three isolated local workers per shard, materialize sealed copy-on-write capsules with normal-copy fallback, and require one strict aggregate result under ADR-0047.
10. Make `Publish Release` resolve the exact successful full main-push aggregate and current proof artifact, verify report v2/receipt v3 plus every unique producer and immutable task artifact, recompute candidate and Pages digests, run dependency-free release metadata validation, repeat proof checks at publication, confirm `main` has not advanced, and skip both dependency installation and the aggregate rerun.
11. Select the site build on a pull request only when its owning paths or a fail-full condition require it.
12. Update README, validation, publishing, and ADR index/lock docs; remove stale Pages badge and workflow references.
13. Run automated validation and, after merge, collect hosted rollout evidence separately from local proof.

## Source challenge

- Repo evidence checked:
  - `README.md`
  - `package.json`
  - `.github/workflows/validate.yml`
  - `docs/specs.md`
  - `docs/adrs.md`
  - `docs/assets/stark-ai-de-agent-skills-logo.svg`
  - `skills/**/SKILL.md`
  - `incubator/skills/**/SKILL.md`
- ADRs/specs checked:
  - [ADR-0013](../adrs/0013-persist-specs-and-adrs-as-repo-artifacts.short.md) ([Long, canonical](../adrs/0013-persist-specs-and-adrs-as-repo-artifacts.long.md) · [Guide](../adrs/0013-persist-specs-and-adrs-as-repo-artifacts.guide.md))
  - [ADR-0017](../adrs/0017-use-astro-for-github-pages-skill-catalog.short.md) ([Long, canonical](../adrs/0017-use-astro-for-github-pages-skill-catalog.long.md) · [Guide](../adrs/0017-use-astro-for-github-pages-skill-catalog.guide.md))
  - [ADR-0041](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.short.md) ([Long, canonical](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.long.md) · [Guide](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.guide.md))
  - [ADR-0042](../adrs/0042-optimize-github-actions-with-owned-gates.short.md) ([Long, canonical](../adrs/0042-optimize-github-actions-with-owned-gates.long.md) · [Guide](../adrs/0042-optimize-github-actions-with-owned-gates.guide.md))
  - [ADR-0043](../adrs/0043-deploy-validated-main-artifacts.short.md) ([Long, canonical](../adrs/0043-deploy-validated-main-artifacts.long.md) · [Guide](../adrs/0043-deploy-validated-main-artifacts.guide.md))
  - [ADR-0046](../adrs/0046-assemble-validation-proof-from-content-addressed-task-results.short.md) ([Long, canonical](../adrs/0046-assemble-validation-proof-from-content-addressed-task-results.long.md) · [Guide](../adrs/0046-assemble-validation-proof-from-content-addressed-task-results.guide.md))
  - [ADR-0047](../adrs/0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.short.md) ([Long, canonical](../adrs/0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.long.md) · [Guide](../adrs/0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.guide.md))
- External docs checked:
  - Astro GitHub Pages deployment guidance
  - Astro static route/content guidance
  - GitHub Pages custom workflow guidance
  - Tailwind CSS v4 Vite guidance
  - Live `https://stark-ai.de/` page content and metadata behavior
- Requirements revised:
  - Use Astro instead of Next.js for this repository because the target is a static catalog and GitHub Pages site.
  - Treat the sibling website as the design source, not a build dependency.
  - Historical 2026-08-11 work accepted ADR-0042 as a standalone Validate-owned artifact/deployment decision. Its ID, stem, and Decision remain locked, but the current reciprocal lineage is ADR-0042 to ADR-0043 to ADR-0044.
  - Reject moving Pages production into `publish-release.yml`: it would make catalog freshness release-dependent or require a second trigger/cross-workflow handoff and weaken the one-build provenance boundary.
  - Preserve affected, fail-closed pull requests and full logical `main`/manual selections while allowing an exact task result to satisfy a selected gate. Deployment and current proof remain protected-main aggregate authority; pull requests and manual non-main runs cannot deploy or publish.
  - Create three hosted Architecture Compass shards with up to three local workers only on a miss; a hit creates no fixture job.
  - Bind release reuse to the current candidate and aggregate plus every task key, producer run/job/attempt, immutable artifact, receipt, output, and REST metadata; fixed names or unverified cache entries are not proof.
  - Include `skillopt-setup` as an incubator candidate now that its public skill and eval proof are available, without presenting it as a promoted skill.
- Requirements preserved:
  - Each skill gets a separate page.
  - Website styling, metadata, icons, and favicons should align with `stark-ai.de`.
  - Incubator skills should be visible only as candidate/internal skills, not as promoted public catalog entries.
- Preceding ADR/spec work needed:
  - None; ADR-0017, ADR-0046, and ADR-0047 are accepted. ADR-0041 through ADR-0045 remain immutable historical lineage.
- ADR gate result:
  - ADR required and satisfied: ADR-0046 is the current validation/proof authority and ADR-0047 is the fixture authority.
- Skipped checks and why:
  - Asset license audit beyond repo ownership was not completed; implementation must copy only approved assets.

## User verification

- Final checkpoint confirmed by:
  - User answered "yes" to saving the proposed ADR and spec.
- Confirmation date:
  - 2026-05-26
- Verified scope/non-goals:
  - GitHub Pages setup spec for this repo using `stark-ai.de` style and metadata.
  - Spec and ADR should be persisted.
- Non-blocking open questions accepted:
  - Final custom domain is out of scope.
  - Final deployed URL is assumed to be the default GitHub Pages project URL until Pages settings confirm it.

## Artifact plan

- Spec path:
  - `docs/specs/github-pages-skill-catalog-spec.md`
- Destination basis:
  - Existing publishable spec convention in `docs/specs/`
- Explicit confirmation needed:
  - yes, received before saving
- Spec persistence:
  - saved
- Existing file overwrite needed:
  - no
- ADR paths:
  - [ADR-0017](../adrs/0017-use-astro-for-github-pages-skill-catalog.short.md) ([Long, canonical](../adrs/0017-use-astro-for-github-pages-skill-catalog.long.md) · [Guide](../adrs/0017-use-astro-for-github-pages-skill-catalog.guide.md))
  - [ADR-0046](../adrs/0046-assemble-validation-proof-from-content-addressed-task-results.short.md) ([Long, canonical](../adrs/0046-assemble-validation-proof-from-content-addressed-task-results.long.md) · [Guide](../adrs/0046-assemble-validation-proof-from-content-addressed-task-results.guide.md))
  - [ADR-0047](../adrs/0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.short.md) ([Long, canonical](../adrs/0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.long.md) · [Guide](../adrs/0047-distribute-architecture-compass-fixtures-across-hosted-and-local-workers.guide.md))
- ADR persistence:
  - ADR-0046 and ADR-0047 accepted and locked; ADR-0041 through ADR-0045 retained as reciprocal Superseded history without changing their Decisions
- ADR index updates needed:
  - `docs/adrs.md` and `scripts/validation/adrs/decision-lock.tsv`

## Validation

```bash
npm run validate
pnpm lint:actions
node scripts/validate-adrs.mjs
pnpm format:check
pnpm lint
pnpm --filter ./site build
pnpm exec skills add ./skills --list
npm run smoke:fingerprint
npm run smoke:install
npm run validate:ci-contract
git diff --check
```

### Manual checks

- Start the local site and verify the home page, public skill index, incubator index, and representative skill detail pages.
- Verify at desktop and mobile widths that text does not overlap, navigation is usable, and assets render.
- Verify generated links work under the `/agent-skills/` base path.
- Verify GitHub Pages settings use GitHub Actions as the publishing source.
- Verify the deployed Pages URL after the first `main` deployment.
- Hosted matrix before merge: cold `off` executes every selected task and accounts for Architecture Compass 325/325 across three shards; identical-commit `auto` reuses every eligible result without a gate process or gate dependency install and completes within three minutes and at least 90% faster; `verify` re-executes hits with equal semantic evidence/output digests; partial changes execute only invalidated closures; global/control-plane changes miss all affected tasks.
- Hosted matrix after merge: protected main promotes only computation whose producer control plane exactly matches current main, rebuilds the current Pages artifact from verified site bytes, rejects lower-integrity or tampered proof, recursively verifies receipt-v3 producer chains, and preserves publication-time revalidation.
- Keep local source/static and CI proof separate from hosted deployment, release dry-run, and actual publication evidence.

## Verification checkpoint

- Scope and non-goals confirmed: yes
- Assumptions reviewed:
  - Astro static site is acceptable.
  - Default GitHub Pages project URL is acceptable for the first pass.
  - Brand assets can be copied if approved and non-secret.
- Non-blocking unknowns accepted: yes
- Blocking decisions:
  - None; ADR-0017, ADR-0046, and ADR-0047 are accepted.
- Risks and rollout reviewed: yes
- Validation plan reviewed: yes
- ADR result reviewed: yes
- Spec saved: yes
- ADR persistence needed: yes

## Risks and rollout

- Primary risk:
  - The new site can drift from `stark-ai.de` styling and metadata after the initial asset copy.
- Rollback path:
  - Set `validation_reuse=off` as the workflow default or bump the task namespace/epoch, validate fresh execution, and leave existing artifacts untouched; Pages deployment remains dependent on a successful current protected-main aggregate.
- Migration/backfill needs:
  - None for runtime users; skill installation behavior is unchanged.
- Feature-flag or phased rollout need:
  - no
- Rollout notes:
  - First implementation should land in a PR with Pages build validation.
  - Enable Pages deployment from GitHub Actions in repository settings before relying on deploys.
  - After merge, verify the deployed Pages URL and add or adjust README links if the URL differs from the assumed project URL.
  - A missing or expired task result executes fresh. A missing or expired assembled current-main receipt keeps release readiness incomplete and does not authorize publication.
- Later adjustment guidance:
  - Do not write a follow-up spec just to enable Pages settings or update the verified deployed URL; treat those as rollout tasks.
  - Write a compact follow-up spec when later work changes scope, such as moving to a custom domain or `stark-ai.de` subpath, adding search/analytics/runtime behavior, or introducing an automated brand-asset sync.

## Done when

- [x] ADR-0017, ADR-0046, and ADR-0047 are accepted; ADR-0041 through ADR-0045 are preserved as Superseded lineage.
- [ ] The Astro site builds locally.
- [ ] Public and incubator skill pages are generated from current `SKILL.md` files.
- [ ] `skillopt-setup` is generated only as an incubator candidate and links to its eval proof without changing the skill or eval source files.
- [ ] Brand assets, favicons, manifest, SEO metadata, and social metadata are present.
- [ ] The required `validate` aggregator is unfiltered and stable; affected pull requests build or restore the site only when selected, and no pull request deploys or publishes.
- [ ] Every `main` push and manual dispatch is logically full; only misses create jobs, and a successful current protected-main aggregate creates receipt v3 and deploys the exact current Pages artifact while manual non-main runs remain diagnostic.
- [ ] Candidate fingerprints before and after assembly match, report v2 binds every executed/reused task, and receipt v3 binds the complete plan/manifest/control-plane/result/output/producer proof without leaking paths or environment secrets.
- [ ] Cold, exact-hit, verify, partial-invalidation, global-invalidation, attempt-safe artifacts, 325/325 shard accounting, and fail-closed release rejection cases are hosted-verified.
- [ ] README and validation docs reflect the new site and commands.
- [ ] Automated validation commands pass.
- [ ] Manual desktop and mobile checks pass.
- [ ] The deployed Pages site loads correctly under `/agent-skills/`.

## Assumptions and open questions

- Assumption: `https://stark-ai-de.github.io/agent-skills/` is the initial Pages URL.
- Assumption: Approved `stark-ai.de` logo, favicon, app icon, font, and social image assets may be copied into this public repo.
- Assumption: Skill names are unique within public and incubator sections; if duplicates appear, routes should include category segments.
- Open question: Should a future custom domain or subpath under `stark-ai.de` replace the default GitHub Pages URL?
