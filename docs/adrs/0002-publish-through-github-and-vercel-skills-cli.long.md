# ADR-0002: Publish through GitHub and Vercel skills CLI

ID: ADR-0002
Title: Publish through GitHub and Vercel skills CLI
Status: Accepted
Date: 2026-05-19
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: publishing, github, installer
Applies when: Publishing or validating installation of public skills.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Publishing should be simple and testable.

Variants: [Short](0002-publish-through-github-and-vercel-skills-cli.short.md) · **Long, canonical** · [Guide](0002-publish-through-github-and-vercel-skills-cli.guide.md)

## Decision

We will publish skills from the public GitHub repo and validate discovery with the Vercel `skills` CLI.

## Why

- The CLI can list and install skills from GitHub repositories.
- Public GitHub publishing avoids a separate package registry for v1.
- Local folder testing catches install issues before release.

## Options

- Chosen: GitHub repo plus Vercel `skills` CLI.
- Rejected: npm package, because the skills are files, not a runtime package.
- Rejected: Private-only install, because the goal is a public skill repo.

## Consequences

- Good: Users can install with one command.
- Tradeoff: Repo structure must stay installer-friendly.
- Risk: CLI behavior may change, so release checks must test it.

## Follow-up

- Add publishing docs and release checklist.
