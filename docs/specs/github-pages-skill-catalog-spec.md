---
title: "GitHub Pages skill catalog"
slug: "github-pages-skill-catalog"
artifact_path: "docs/specs/github-pages-skill-catalog-spec.md"
mode: "standard"
status: "draft"
owner: "stark-ai-de"
repo: "stark-ai-de/agent-skills"
created: "2026-05-26"
updated: "2026-07-13"
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
- Make the required `Validate` workflow upload and deploy the static site artifact only after successful validation on `main`; it also owns pull-request site-build proof.
- Add validation so pull requests catch site build failures before merge.
- Update existing repo-facing docs that become stale because of the new Pages surface.

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
  - `.github/workflows/`
  - `package.json`
  - `pnpm-lock.yaml`
- Existing abstractions/patterns to preserve:
  - `SKILL.md` frontmatter `name` and `description` are canonical.
  - Incubator skills remain visible as candidate/internal material and must not be presented as promoted public skills.
  - Repo validation runs through `npm run validate`, `pnpm format:check`, and `pnpm lint`.
  - Generated or local helper skill installs under `.agents/` are not catalog content.
- Commands and toolchain:
  - Node `>=22.13.0`
  - `pnpm`
  - Existing root validation scripts
- Related ADRs:
  - [ADR-0013](../adrs/0013-persist-specs-and-adrs-as-repo-artifacts.short.md) ([Long, canonical](../adrs/0013-persist-specs-and-adrs-as-repo-artifacts.long.md) · [Guide](../adrs/0013-persist-specs-and-adrs-as-repo-artifacts.guide.md))
  - [ADR-0017](../adrs/0017-use-astro-for-github-pages-skill-catalog.short.md) ([Long, canonical](../adrs/0017-use-astro-for-github-pages-skill-catalog.long.md) · [Guide](../adrs/0017-use-astro-for-github-pages-skill-catalog.guide.md))
  - [ADR-0043](../adrs/0043-deploy-validated-main-artifacts.short.md) ([Long, canonical](../adrs/0043-deploy-validated-main-artifacts.long.md) · [Guide](../adrs/0043-deploy-validated-main-artifacts.guide.md))
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
- WHEN the required `Validate` workflow runs on pull requests, THE SYSTEM SHALL build the site without deploying it.
- WHEN the required `Validate` workflow completes successfully for a `main` push or an explicit manual dispatch from `main`, THE SYSTEM SHALL upload and deploy the validated static artifact with GitHub Pages Actions in that same workflow run.

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

- ADR required: yes
- Existing ADRs consulted:
  - [ADR-0017](../adrs/0017-use-astro-for-github-pages-skill-catalog.short.md) ([Long, canonical](../adrs/0017-use-astro-for-github-pages-skill-catalog.long.md) · [Guide](../adrs/0017-use-astro-for-github-pages-skill-catalog.guide.md))
  - [ADR-0043](../adrs/0043-deploy-validated-main-artifacts.short.md) ([Long, canonical](../adrs/0043-deploy-validated-main-artifacts.long.md) · [Guide](../adrs/0043-deploy-validated-main-artifacts.guide.md))
  - [ADR-0013](../adrs/0013-persist-specs-and-adrs-as-repo-artifacts.short.md) ([Long, canonical](../adrs/0013-persist-specs-and-adrs-as-repo-artifacts.long.md) · [Guide](../adrs/0013-persist-specs-and-adrs-as-repo-artifacts.guide.md))
- Accepted ADR path:
  - [ADR-0043](../adrs/0043-deploy-validated-main-artifacts.short.md) ([Long, canonical](../adrs/0043-deploy-validated-main-artifacts.long.md) · [Guide](../adrs/0043-deploy-validated-main-artifacts.guide.md))
  - [ADR-0017](../adrs/0017-use-astro-for-github-pages-skill-catalog.short.md) ([Long, canonical](../adrs/0017-use-astro-for-github-pages-skill-catalog.long.md) · [Guide](../adrs/0017-use-astro-for-github-pages-skill-catalog.guide.md))
- Supersedes:
  - ADR-0042
- Implementation blocked until ADR accepted: no; ADR-0043 is accepted.

## File plan

### Expected touched areas

- `package.json`
- `pnpm-lock.yaml`
- `README.md`
- `docs/validation.md`
- `.github/workflows/validate.yml`
- `.github/workflows/publish-release.yml`
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
- Release scripts and skill validation behavior unless needed to add site validation commands.

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
8. Make the required `Validate` workflow the single trusted Pages artifact producer:
   - keep pull-request site-build proof in the required `Validate` workflow
   - upload and deploy only for relevant `main` pushes or explicit manual dispatches from `main`
   - use `actions/configure-pages`, `actions/upload-pages-artifact`, and `actions/deploy-pages` in the same workflow run
   - publish a SHA-bound validation receipt for manual release reuse
9. Add site build validation to the existing PR validation path.
10. Update README and validation docs with the site URL and commands.
11. Run automated validation and perform manual browser checks at desktop and mobile widths.

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
  - Existing ADR index through ADR-0017, ADR-0042, and accepted ADR-0043
- External docs checked:
  - Astro GitHub Pages deployment guidance
  - Astro static route/content guidance
  - GitHub Pages custom workflow guidance
  - GitHub Actions artifact, concurrency, required-check, and workflow-run guidance
  - Tailwind CSS v4 Vite guidance
  - Live `https://stark-ai.de/` page content and metadata behavior
- Requirements revised:
  - Use Astro instead of Next.js for this repository because the target is a static catalog and GitHub Pages site.
  - Treat the sibling website as the design source, not a build dependency.
  - Require ADR-0043 because this changes repo build/deploy and release-proof policy.
  - Include `skillopt-setup` as an incubator candidate now that its public skill and eval proof are available, without presenting it as a promoted skill.
- Requirements preserved:
  - Each skill gets a separate page.
  - Website styling, metadata, icons, and favicons should align with `stark-ai.de`.
  - Incubator skills should be visible only as candidate/internal skills, not as promoted public catalog entries.
- Preceding ADR/spec work needed:
  - ADR-0043 is accepted and supersedes ADR-0042; ADR-0041 remains the validation-selection authority and ADR-0017 remains the static Astro authority.
- ADR gate result:
  - ADR required: yes
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
  - [ADR-0043](../adrs/0043-deploy-validated-main-artifacts.short.md) ([Long, canonical](../adrs/0043-deploy-validated-main-artifacts.long.md) · [Guide](../adrs/0043-deploy-validated-main-artifacts.guide.md))
  - [ADR-0017](../adrs/0017-use-astro-for-github-pages-skill-catalog.short.md) ([Long, canonical](../adrs/0017-use-astro-for-github-pages-skill-catalog.long.md) · [Guide](../adrs/0017-use-astro-for-github-pages-skill-catalog.guide.md))
- ADR persistence:
  - saved as Accepted
- ADR index updates needed:
  - `docs/adrs.md`

## Validation

```bash
npm run validate
pnpm format:check
pnpm lint
pnpm --filter ./site build
npx skills@latest add ./skills --list
npm run smoke:install
```

### Manual checks

- Start the local site and verify the home page, public skill index, incubator index, and representative skill detail pages.
- Verify at desktop and mobile widths that text does not overlap, navigation is usable, and assets render.
- Verify generated links work under the `/agent-skills/` base path.
- Verify GitHub Pages settings use GitHub Actions as the publishing source.
- Verify the deployed Pages URL after the first `main` deployment.

## Verification checkpoint

- Scope and non-goals confirmed: yes
- Assumptions reviewed:
  - Astro static site is acceptable.
  - Default GitHub Pages project URL is acceptable for the first pass.
  - Brand assets can be copied if approved and non-secret.
- Non-blocking unknowns accepted: yes
- Blocking decisions:
  - None; ADR-0017 and ADR-0043 are accepted, while ADR-0042 is superseded.
- Risks and rollout reviewed: yes
- Validation plan reviewed: yes
- ADR result reviewed: yes
- Spec saved: yes
- ADR persistence needed: yes

## Risks and rollout

- Primary risk:
  - The new site can drift from `stark-ai.de` styling and metadata after the initial asset copy.
- Rollback path:
  - Disable the Validate deployment job or remove the Pages deployment source; static site files can remain in the repo until reverted.
- Migration/backfill needs:
  - None for runtime users; skill installation behavior is unchanged.
- Feature-flag or phased rollout need:
  - no
- Rollout notes:
  - First implementation should land in a PR with Pages build validation.
  - Enable Pages deployment from GitHub Actions in repository settings before relying on deploys.
  - After merge, verify the deployed Pages URL and add or adjust README links if the URL differs from the assumed project URL.
- Later adjustment guidance:
  - Do not write a follow-up spec just to enable Pages settings or update the verified deployed URL; treat those as rollout tasks.
  - Write a compact follow-up spec when later work changes scope, such as moving to a custom domain or `stark-ai.de` subpath, adding search/analytics/runtime behavior, or introducing an automated brand-asset sync.

## Done when

- [x] ADR-0017 is accepted.
- [ ] The Astro site builds locally.
- [ ] Public and incubator skill pages are generated from current `SKILL.md` files.
- [ ] `skillopt-setup` is generated only as an incubator candidate and links to its eval proof without changing the skill or eval source files.
- [ ] Brand assets, favicons, manifest, SEO metadata, and social metadata are present.
- [ ] The required Validate workflow builds the site on PRs and deploys only its validated artifact for relevant `main` pushes and explicit manual-main dispatches.
- [ ] README and validation docs reflect the new site and commands.
- [ ] Automated validation commands pass.
- [ ] Manual desktop and mobile checks pass.
- [ ] The deployed Pages site loads correctly under `/agent-skills/`.

## Assumptions and open questions

- Assumption: `https://stark-ai-de.github.io/agent-skills/` is the initial Pages URL.
- Assumption: Approved `stark-ai.de` logo, favicon, app icon, font, and social image assets may be copied into this public repo.
- Assumption: Skill names are unique within public and incubator sections; if duplicates appear, routes should include category segments.
- Open question: Should a future custom domain or subpath under `stark-ai.de` replace the default GitHub Pages URL?
