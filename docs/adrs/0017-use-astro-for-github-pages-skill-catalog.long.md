# ADR-0017: Use Astro for GitHub Pages skill catalog

ID: ADR-0017
Title: Use Astro for GitHub Pages skill catalog
Status: Accepted
Date: 2026-05-26
Owner: stark-ai-de
Scope: repository
Category: frontend
Tags: astro, github-pages, catalog
Applies when: Changing the repository documentation site or catalog deployment.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Build the repository website as a static Astro site deployed by GitHub Pages Actions.

Variants: [Short](0017-use-astro-for-github-pages-skill-catalog.short.md) · **Long, canonical** · [Guide](0017-use-astro-for-github-pages-skill-catalog.guide.md)

## Decision

We will publish the `agent-skills` documentation and skill catalog through a repo-local Astro static site deployed to GitHub Pages by GitHub Actions.

## Why

- The catalog is content-driven and can be generated from repository files at build time.
- Astro fits a low-JavaScript static Pages site without adopting the sibling website's Next.js runtime.
- A dedicated Pages workflow keeps compiled output out of `main` and avoids a `gh-pages` branch.

## Options

- Chosen: Astro static site in `site/` with GitHub Pages Actions deployment.
- Rejected: Next.js, because the repository does not need the sibling website's app runtime.
- Rejected: Jekyll or raw Markdown Pages, because skill pages need generated routes and stronger design control.

## Consequences

- Good: Each skill can get a polished generated page from `SKILL.md`.
- Tradeoff: The repo gains a frontend build dependency set.
- Risk: Site metadata and copied brand assets can drift from `stark-ai.de`.

## Follow-up

- Implement the Pages site from the GitHub Pages skill catalog spec.
