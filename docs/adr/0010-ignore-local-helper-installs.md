# ADR-0010: Ignore local helper installs

Status: Accepted  
Date: 2026-05-21  
Owner: stark-ai-de  
Gist: Local helper skills should not become repository state.

## Decision

We will ignore `.agents/` and `skills-lock.json` so maintainer-local helper skills stay outside Git.

## Why

- Helper skills are local working aids, not catalog content.
- Tracking a helper lockfile can imply an official base skill set.
- Ignoring the whole `.agents/` tree avoids accidental upstream skill republishing.

## Options

- Chosen: Ignore `.agents/` and `skills-lock.json`.
- Rejected: Track `skills-lock.json`, because helper selection is maintainer-local.
- Rejected: Ignore only `.agents/skills/`, because future agent-local files may also be local state.

## Consequences

- Good: Public repo state stays focused on original skills and promotion proof.
- Tradeoff: Maintainers recreate helper installs locally.
- Risk: Local helper drift is less visible in review.

## Follow-up

- Document any truly required helper as public docs, not a committed lockfile.
