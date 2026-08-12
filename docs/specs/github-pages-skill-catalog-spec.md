---
title: "GitHub Pages skill catalog"
slug: "github-pages-skill-catalog"
artifact_path: "docs/specs/github-pages-skill-catalog-spec.md"
mode: "standard"
status: "draft"
owner: "stark-ai-de"
repo: "stark-ai-de/agent-skills"
created: "2026-05-26"
updated: "2026-08-12"
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
- Keep one unfiltered stable required `validate` job. Pull requests whose affected or fail-full plan selects the site gate catch site build failures before merge.
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
  - Hosted validation uses a versioned gate manifest, fail-closed base/candidate pull-request planning, sequential execution, and a diagnostic report.
  - Generated or local helper skill installs under `.agents/` are not catalog content.
- Commands and toolchain:
  - Node `>=22.20.0`
  - `pnpm`
  - Existing root validation scripts
- Related ADRs:
  - [ADR-0013](../adrs/0013-persist-specs-and-adrs-as-repo-artifacts.short.md) ([Long, canonical](../adrs/0013-persist-specs-and-adrs-as-repo-artifacts.long.md) · [Guide](../adrs/0013-persist-specs-and-adrs-as-repo-artifacts.guide.md))
  - [ADR-0017](../adrs/0017-use-astro-for-github-pages-skill-catalog.short.md) ([Long, canonical](../adrs/0017-use-astro-for-github-pages-skill-catalog.long.md) · [Guide](../adrs/0017-use-astro-for-github-pages-skill-catalog.guide.md))
  - Historical: [ADR-0041](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.short.md) ([Long, canonical](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.long.md) · [Guide](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.guide.md)), [ADR-0042](../adrs/0042-optimize-github-actions-with-owned-gates.short.md) ([Long, canonical](../adrs/0042-optimize-github-actions-with-owned-gates.long.md) · [Guide](../adrs/0042-optimize-github-actions-with-owned-gates.guide.md)), and [ADR-0043](../adrs/0043-deploy-validated-main-artifacts.short.md) ([Long, canonical](../adrs/0043-deploy-validated-main-artifacts.long.md) · [Guide](../adrs/0043-deploy-validated-main-artifacts.guide.md)) are Superseded lineage records.
  - Current: [ADR-0044](../adrs/0044-select-validation-scope-by-trust-context-and-owned-gates.short.md) ([Long, canonical](../adrs/0044-select-validation-scope-by-trust-context-and-owned-gates.long.md) · [Guide](../adrs/0044-select-validation-scope-by-trust-context-and-owned-gates.guide.md)) governs validation scope and trusted proof.
  - Current: [ADR-0045](../adrs/0045-shard-mutation-fixtures-with-bounded-isolated-workers.short.md) ([Long, canonical](../adrs/0045-shard-mutation-fixtures-with-bounded-isolated-workers.long.md) · [Guide](../adrs/0045-shard-mutation-fixtures-with-bounded-isolated-workers.guide.md)) governs Architecture Compass fixture execution.
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
- WHEN `Validate` runs for a pull request, `main` push, or manual dispatch, THE SYSTEM SHALL create the same unfiltered required `validate` job.
- WHEN a pull request runs, THE SYSTEM SHALL use the fail-closed union of compatible base and candidate plans; WHEN that effective plan selects the site gate, THE SYSTEM SHALL build the site without creating Pages or reusable proof.
- IF pull-request planning is missing, malformed, incompatible, full, unknown, unmatched, or globally invalidated, THEN THE SYSTEM SHALL select the complete gate set.
- WHEN a `push` to `main` or any manual dispatch runs, THE SYSTEM SHALL execute the complete manifest gate set.
- WHEN a full `push` to `main` or full manual dispatch from `main` succeeds, THE SYSTEM SHALL deploy the exact sealed static artifact produced by that run. A full manual run from another branch remains diagnostic and SHALL NOT create Pages or reusable proof.
- WHEN any hosted run writes a validation report, THE SYSTEM SHALL retain it as diagnostic evidence and compare candidate fingerprints before and after the selected gates.
- WHEN a successful full trusted-main run produces receipt schema v2, THE RECEIPT SHALL bind full scope; plan, manifest, and gate-report digests; exact full gate IDs and outcomes; fixture-inventory digest; successful skills/smoke evidence; candidate fingerprint and file count; exact installed CLI version and normalized override state; workflow/run/job-attempt identity; event; branch; SHA; package version; sealed site digest; and artifact names and IDs.
- WHEN a release is prepared, THE SYSTEM SHALL resolve the exact successful full main-push Validate run for the checked-out SHA, verify receipt schema v2 and its validation report, discover the successful artifact-producing Validate job attempt, verify REST artifact metadata, download by explicit run ID and attempt-scoped name, recompute candidate and Pages digests, and reject affected, incomplete, missing, expired, malformed, or mismatched proof without a dependency install or aggregate rerun.
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

- ADR required: no additional ADR; current accepted ADR-0044 governs validation scope and trusted proof, while ADR-0045 governs fixture sharding.
- Existing ADRs consulted:
  - [ADR-0013](../adrs/0013-persist-specs-and-adrs-as-repo-artifacts.short.md) ([Long, canonical](../adrs/0013-persist-specs-and-adrs-as-repo-artifacts.long.md) · [Guide](../adrs/0013-persist-specs-and-adrs-as-repo-artifacts.guide.md))
  - [ADR-0017](../adrs/0017-use-astro-for-github-pages-skill-catalog.short.md) ([Long, canonical](../adrs/0017-use-astro-for-github-pages-skill-catalog.long.md) · [Guide](../adrs/0017-use-astro-for-github-pages-skill-catalog.guide.md))
  - Historical: [ADR-0041](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.short.md) ([Long, canonical](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.long.md) · [Guide](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.guide.md)), [ADR-0042](../adrs/0042-optimize-github-actions-with-owned-gates.short.md) ([Long, canonical](../adrs/0042-optimize-github-actions-with-owned-gates.long.md) · [Guide](../adrs/0042-optimize-github-actions-with-owned-gates.guide.md)), and [ADR-0043](../adrs/0043-deploy-validated-main-artifacts.short.md) ([Long, canonical](../adrs/0043-deploy-validated-main-artifacts.long.md) · [Guide](../adrs/0043-deploy-validated-main-artifacts.guide.md))
- Current accepted ADR paths:
  - [ADR-0017](../adrs/0017-use-astro-for-github-pages-skill-catalog.short.md) ([Long, canonical](../adrs/0017-use-astro-for-github-pages-skill-catalog.long.md) · [Guide](../adrs/0017-use-astro-for-github-pages-skill-catalog.guide.md))
  - [ADR-0044](../adrs/0044-select-validation-scope-by-trust-context-and-owned-gates.short.md) ([Long, canonical](../adrs/0044-select-validation-scope-by-trust-context-and-owned-gates.long.md) · [Guide](../adrs/0044-select-validation-scope-by-trust-context-and-owned-gates.guide.md))
  - [ADR-0045](../adrs/0045-shard-mutation-fixtures-with-bounded-isolated-workers.short.md) ([Long, canonical](../adrs/0045-shard-mutation-fixtures-with-bounded-isolated-workers.long.md) · [Guide](../adrs/0045-shard-mutation-fixtures-with-bounded-isolated-workers.guide.md))
- Supersession lineage:
  - ADR-0042 is superseded by ADR-0043; ADR-0043 and ADR-0041 are superseded by ADR-0044. ADR-0045 is complementary and has no predecessor.
- Implementation blocked until ADR accepted: no; ADR-0017, ADR-0044, and ADR-0045 are accepted and locked.

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
- Skill validation behavior unrelated to site, affected-planning, proof-v2, or Architecture Compass fixture contracts.

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
   - keep one unfiltered, stable required `validate` job for pull requests, `main` pushes, and manual dispatch
   - use a fail-closed union of compatible base and candidate plans for pull requests; use the complete manifest for `main` and manual events
   - compute one `trusted_main` output from a `push` to `main` or manual dispatch from `main`
   - reuse that output for the site digest, Pages configuration, artifact upload, receipt creation, and deployment conditions
   - upload the versioned validation report as diagnostics for full and affected runs, while excluding affected reports from trusted proof
   - install only the selected root/site dependency profiles and reuse exact installed `skills@1.5.22` for listing and smoke checks
   - seal and hash the complete `site/dist` file set immediately after the build, upload it with hidden files included, run pinned external CLI checks only in isolated temporary copies, and assert the sealed digest before upload
   - upload `github-pages-<run-id>-<validation-job-attempt>` and receipt schema v2 at `validation-receipt-<run-id>-<validation-job-attempt>` only after every full gate passes in a trusted-main context
   - deploy the exact attempt-scoped Pages artifact from a dependent job
   - serialize production deployments and reject a deployment whose `refs/heads/main` no longer equals its run SHA
   - preserve diagnostic-only behavior for pull requests and full manual non-main dispatches
9. Keep Architecture Compass fixtures in isolated deterministic workers under ADR-0045, defaulting hosted execution to one until the accepted two/three-worker benchmark chooses a stable faster setting.
10. Make `Publish Release` resolve the exact successful full main-push Validate run and successful artifact-producing job attempt, derive both artifact names, verify report/receipt v2 and REST metadata symmetry, recompute candidate and Pages digests, run dependency-free release metadata validation, repeat proof checks at the publication boundary, confirm `main` has not advanced, and skip both dependency installation and the aggregate rerun.
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
  - [ADR-0044](../adrs/0044-select-validation-scope-by-trust-context-and-owned-gates.short.md) ([Long, canonical](../adrs/0044-select-validation-scope-by-trust-context-and-owned-gates.long.md) · [Guide](../adrs/0044-select-validation-scope-by-trust-context-and-owned-gates.guide.md))
  - [ADR-0045](../adrs/0045-shard-mutation-fixtures-with-bounded-isolated-workers.short.md) ([Long, canonical](../adrs/0045-shard-mutation-fixtures-with-bounded-isolated-workers.long.md) · [Guide](../adrs/0045-shard-mutation-fixtures-with-bounded-isolated-workers.guide.md))
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
  - Normalize validation scope to affected, fail-closed pull requests and full `main`/manual events. Deployment and reusable proof remain limited to successful full `main` pushes and full manual dispatches from `main`; pull requests and manual non-main runs are diagnostic-only.
  - Keep Architecture Compass at one hosted fixture worker until the ADR-0045 benchmark authorizes a stable faster count.
  - Bind release reuse to candidate evidence, workflow run and attempt, SHA, receipt fields, and REST artifact metadata; fixed artifact names are not safe on reruns.
  - Include `skillopt-setup` as an incubator candidate now that its public skill and eval proof are available, without presenting it as a promoted skill.
- Requirements preserved:
  - Each skill gets a separate page.
  - Website styling, metadata, icons, and favicons should align with `stark-ai.de`.
  - Incubator skills should be visible only as candidate/internal skills, not as promoted public catalog entries.
- Preceding ADR/spec work needed:
  - None; ADR-0017, ADR-0044, and ADR-0045 are accepted. ADR-0041 through ADR-0043 remain immutable historical lineage.
- ADR gate result:
  - ADR required: no additional ADR; ADR-0044 is the current validation/proof authority and ADR-0045 is the fixture authority.
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
  - [ADR-0044](../adrs/0044-select-validation-scope-by-trust-context-and-owned-gates.short.md) ([Long, canonical](../adrs/0044-select-validation-scope-by-trust-context-and-owned-gates.long.md) · [Guide](../adrs/0044-select-validation-scope-by-trust-context-and-owned-gates.guide.md))
  - [ADR-0045](../adrs/0045-shard-mutation-fixtures-with-bounded-isolated-workers.short.md) ([Long, canonical](../adrs/0045-shard-mutation-fixtures-with-bounded-isolated-workers.long.md) · [Guide](../adrs/0045-shard-mutation-fixtures-with-bounded-isolated-workers.guide.md))
- ADR persistence:
  - ADR-0044 and ADR-0045 accepted and locked; ADR-0041 through ADR-0043 retained as reciprocal Superseded history without changing their Decisions
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
- Hosted matrix after merge: affected and fail-full pull-request plans retain the stable required job and create no trusted proof; main push and manual-main full runs deploy with receipt-v2/artifact symmetry; manual non-main runs are full but diagnostic-only; rerun attempts do not collide; release dry run accepts exact full main-push proof and rejects affected, incomplete, wrong event/branch/SHA, missing/expired/malformed proof, and advanced main.
- Keep the Architecture Compass default at one worker until alternating hosted two/three-worker measurements satisfy ADR-0045 equivalence, stability, and performance requirements.
- Keep local source/static and CI proof separate from hosted deployment, release dry-run, and actual publication evidence.

## Verification checkpoint

- Scope and non-goals confirmed: yes
- Assumptions reviewed:
  - Astro static site is acceptable.
  - Default GitHub Pages project URL is acceptable for the first pass.
  - Brand assets can be copied if approved and non-secret.
- Non-blocking unknowns accepted: yes
- Blocking decisions:
  - None; ADR-0017, ADR-0044, and ADR-0045 are accepted.
- Risks and rollout reviewed: yes
- Validation plan reviewed: yes
- ADR result reviewed: yes
- Spec saved: yes
- ADR persistence needed: yes

## Risks and rollout

- Primary risk:
  - The new site can drift from `stark-ai.de` styling and metadata after the initial asset copy.
- Rollback path:
  - Revert the workflow/documentation change and validate the rollback commit; Pages deployment remains dependent on successful Validate.
- Migration/backfill needs:
  - None for runtime users; skill installation behavior is unchanged.
- Feature-flag or phased rollout need:
  - no
- Rollout notes:
  - First implementation should land in a PR with Pages build validation.
  - Enable Pages deployment from GitHub Actions in repository settings before relying on deploys.
  - After merge, verify the deployed Pages URL and add or adjust README links if the URL differs from the assumed project URL.
  - A missing or expired receipt keeps release readiness incomplete and does not authorize publication.
- Later adjustment guidance:
  - Do not write a follow-up spec just to enable Pages settings or update the verified deployed URL; treat those as rollout tasks.
  - Write a compact follow-up spec when later work changes scope, such as moving to a custom domain or `stark-ai.de` subpath, adding search/analytics/runtime behavior, or introducing an automated brand-asset sync.

## Done when

- [x] ADR-0017, ADR-0044, and ADR-0045 are accepted; ADR-0041 through ADR-0043 are preserved as Superseded lineage.
- [ ] The Astro site builds locally.
- [ ] Public and incubator skill pages are generated from current `SKILL.md` files.
- [ ] `skillopt-setup` is generated only as an incubator candidate and links to its eval proof without changing the skill or eval source files.
- [ ] Brand assets, favicons, manifest, SEO metadata, and social metadata are present.
- [ ] The required `validate` job is unfiltered and stable; affected pull requests build the site only when selected, and no pull request creates trusted proof or deploys.
- [ ] Every `main` push and manual dispatch is full; successful trusted-main runs alone create receipt v2 and deploy the exact sealed artifact, while manual non-main runs remain diagnostic.
- [ ] Receipt candidate fingerprints before and after the gates match smoke-copy evidence, the exact installed CLI version is recorded without its path, and receipt v2 binds the complete plan/manifest/gate/fixture/artifact proof.
- [ ] Attempt-scoped artifact names, exact full scope, run/SHA/branch/event checks, and fail-closed release rejection cases are hosted-verified.
- [ ] README and validation docs reflect the new site and commands.
- [ ] Automated validation commands pass.
- [ ] Manual desktop and mobile checks pass.
- [ ] The deployed Pages site loads correctly under `/agent-skills/`.

## Assumptions and open questions

- Assumption: `https://stark-ai-de.github.io/agent-skills/` is the initial Pages URL.
- Assumption: Approved `stark-ai.de` logo, favicon, app icon, font, and social image assets may be copied into this public repo.
- Assumption: Skill names are unique within public and incubator sections; if duplicates appear, routes should include category segments.
- Open question: Should a future custom domain or subpath under `stark-ai.de` replace the default GitHub Pages URL?
