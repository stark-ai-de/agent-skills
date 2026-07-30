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
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Build the repository website as a static Astro site deployed by GitHub Pages Actions.

Variants: [Short](0017-use-astro-for-github-pages-skill-catalog.short.md) · [Long, canonical](0017-use-astro-for-github-pages-skill-catalog.long.md) · **Guide**

This guide is non-normative. [Long](0017-use-astro-for-github-pages-skill-catalog.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

- Inventory target runtimes, deployment environments, support matrices, lifecycle ownership, and provider constraints.
- Select or retain a platform only from current target evidence; keep independent concerns as independent decisions.
- Document fallback and cleanup behavior at the boundary that owns execution.

## Verification

- Exercise the relevant startup, shutdown, build, or deployment path in the environment actually being claimed.
- Separate configuration proof from deployed behavior and record unavailable platform checks honestly.
- Cite the exact files, commands, and evidence boundaries used for the conclusion.

## Historical follow-up context

The original record named these follow-ups. Revalidate them against current repository state before treating them as active work:

- Implement the Pages site from the GitHub Pages skill catalog spec.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
