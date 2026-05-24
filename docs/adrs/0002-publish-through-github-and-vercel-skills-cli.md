# ADR-0002: Publish through GitHub and Vercel skills CLI

Status: Accepted  
Date: 2026-05-19  
Owner: stark-ai-de  
Gist: Publishing should be simple and testable.

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
