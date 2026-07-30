# ADR-0007: Keep skill evals outside runtime payload

ID: ADR-0007
Title: Keep skill evals outside runtime payload
Status: Accepted
Date: 2026-05-21
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: evals, runtime-payload, evidence
Applies when: Adding evaluation cases, run evidence, or runtime self-test fixtures.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-07-28
Gist: Treat skill evals as maintainer proof, not default runtime content.

Variants: [Short](0007-keep-skill-evals-outside-runtime-payload.short.md) · [Long, canonical](0007-keep-skill-evals-outside-runtime-payload.long.md) · **Guide**

This guide is non-normative. [Long](0007-keep-skill-evals-outside-runtime-payload.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

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

- Define the `skill-evals/` layout before adding the first eval case.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
