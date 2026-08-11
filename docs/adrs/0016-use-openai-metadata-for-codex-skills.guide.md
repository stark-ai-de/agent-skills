# ADR-0016: Use OpenAI metadata for Codex-facing skills

ID: ADR-0016
Title: Use OpenAI metadata for Codex-facing skills
Status: Accepted
Date: 2026-05-26
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: openai, metadata, codex
Applies when: Creating or updating a Codex- or OpenAI-facing skill.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Codex-facing skills should carry OpenAI product metadata without making it universal boilerplate.

Variants: [Short](0016-use-openai-metadata-for-codex-skills.short.md) · [Long, canonical](0016-use-openai-metadata-for-codex-skills.long.md) · **Guide**

This guide is non-normative. [Long](0016-use-openai-metadata-for-codex-skills.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

- Locate the policy, catalog, metadata, or repository surfaces governed by the canonical record.
- Compare the current state with the Long decision and with any later accepted or superseding ADR before proposing a change.
- Keep one authoritative policy surface; treat templates, reports, and checklists as derived material.

## Verification

- Check the affected policy and generated or derived surfaces for semantic agreement.
- Select focused checks from the changed contract and owning boundary. Run the repository aggregate only when a mandatory gate or distinct proof obligation requires it.
- Cite the exact files, commands, and evidence boundaries used for the conclusion.

## Historical follow-up context

The original record named these follow-ups. Revalidate them against current repository state before treating them as active work:

- Document the authoring rule and add missing metadata to Codex-facing skills.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
