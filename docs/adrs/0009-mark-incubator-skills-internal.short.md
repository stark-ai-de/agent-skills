# ADR-0009: Mark incubator skills internal

ID: ADR-0009
Title: Mark incubator skills internal
Status: Accepted
Date: 2026-05-21
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: incubator, metadata, discovery
Applies when: Creating or validating an incubator skill.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Hide incubator skills from normal CLI discovery.

Variants: **Short** · [Long, canonical](0009-mark-incubator-skills-internal.long.md) · [Guide](0009-mark-incubator-skills-internal.guide.md)

## Decision

We will require every incubator skill to set `metadata.internal: true` until it is promoted into `skills/`.

## Context

- The skills CLI can discover `SKILL.md` files recursively from the repository root.
- Folder placement alone is not enough to prevent candidate skills from leaking.

## Consequences

- Good: Incubator candidates stay hidden by default while remaining valid skills.
- Tradeoff: Promotion must remove the internal marker.
- Risk: Registry behavior may still need live verification before release.
