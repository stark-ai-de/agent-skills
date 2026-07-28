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
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Publishing should be simple and testable.

Variants: [Short](0002-publish-through-github-and-vercel-skills-cli.short.md) · [Long, canonical](0002-publish-through-github-and-vercel-skills-cli.long.md) · **Guide**

This guide is non-normative. [Long](0002-publish-through-github-and-vercel-skills-cli.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

- Map the decision to the owning validation, evidence, promotion, or release boundary.
- Keep local, CI, publication, deployment, and third-party evidence as separate stages.
- Change only the authorized delivery slice and preserve an explicit rollback or stop condition.

## Verification

- Record the exact commands or scenarios executed and the evidence stage each result proves.
- Confirm that generated reports and release claims do not exceed the available evidence.
- Cite the exact files, commands, and evidence boundaries used for the conclusion.

## Historical follow-up context

The original record named these follow-ups. Revalidate them against current repository state before treating them as active work:

- Add publishing docs and release checklist.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
