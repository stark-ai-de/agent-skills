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
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Publishing should be simple and testable.

Variants: **Short** · [Long, canonical](0002-publish-through-github-and-vercel-skills-cli.long.md) · [Guide](0002-publish-through-github-and-vercel-skills-cli.guide.md)

## Decision

We will publish skills from the public GitHub repo and validate discovery with the Vercel `skills` CLI.

## Context

- The CLI can list and install skills from GitHub repositories.
- Public GitHub publishing avoids a separate package registry for v1.

## Consequences

- Good: Users can install with one command.
- Tradeoff: Repo structure must stay installer-friendly.
- Risk: CLI behavior may change, so release checks must test it.
