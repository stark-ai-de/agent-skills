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
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Build the repository website as a static Astro site deployed by GitHub Pages Actions.

Variants: **Short** · [Long, canonical](0017-use-astro-for-github-pages-skill-catalog.long.md) · [Guide](0017-use-astro-for-github-pages-skill-catalog.guide.md)

## Decision

We will publish the `agent-skills` documentation and skill catalog through a repo-local Astro static site deployed to GitHub Pages by GitHub Actions.

## Context

- The catalog is content-driven and can be generated from repository files at build time.
- Astro fits a low-JavaScript static Pages site without adopting the sibling website's Next.js runtime.

## Consequences

- Good: Each skill can get a polished generated page from `SKILL.md`.
- Tradeoff: The repo gains a frontend build dependency set.
- Risk: Site metadata and copied brand assets can drift from `stark-ai.de`.
