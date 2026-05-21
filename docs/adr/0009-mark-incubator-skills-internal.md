# ADR-0009: Mark incubator skills internal

Status: Accepted  
Date: 2026-05-21  
Owner: stark-ai-de  
Gist: Hide incubator skills from normal CLI discovery.

## Decision

We will require every incubator skill to set `metadata.internal: true` until it is promoted into `skills/`.

## Why

- The skills CLI can discover `SKILL.md` files recursively from the repository root.
- Folder placement alone is not enough to prevent candidate skills from leaking.
- The CLI supports internal skills that appear only with `INSTALL_INTERNAL_SKILLS=1`.

## Options

- Chosen: Valid `SKILL.md` candidates with `metadata.internal: true`.
- Rejected: Rename candidate files, because they would stop being real skills.
- Rejected: Rely on install documentation, because users may run root discovery.

## Consequences

- Good: Incubator candidates stay hidden by default while remaining valid skills.
- Tradeoff: Promotion must remove the internal marker.
- Risk: Registry behavior may still need live verification before release.

## Follow-up

- Keep smoke install checks that fail if incubator skills leak.
