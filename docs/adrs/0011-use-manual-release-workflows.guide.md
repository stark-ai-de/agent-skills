# ADR-0011: Use manual release workflows

ID: ADR-0011
Title: Use manual release workflows
Status: Superseded
Date: 2026-05-21
Owner: stark-ai-de
Scope: repository
Category: quality-delivery
Tags: release, automation, superseded
Applies when: Reviewing the repository's former release workflow.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0015
Guide verified: 2026-07-28
Gist: Releases should be automated but explicitly triggered.

Variants: [Short](0011-use-manual-release-workflows.short.md) · [Long, canonical](0011-use-manual-release-workflows.long.md) · **Guide**

This guide is non-normative. [Long](0011-use-manual-release-workflows.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

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

- Revisit custom archives only if a real installer needs them.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
