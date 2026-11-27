# AC-ADR-070: Use Shared Quality in the Public Skill Repository Profile

ID: AC-ADR-070
Title: Use Shared Quality in the Public Skill Repository Profile
Status: Accepted
Date: 2026-11-27
Owner: stark-ai-de
Scope: target-repository
Category: stack-tooling
Tags: stack-profile, code-quality, typescript, pnpm, oxc
Applies when: Setting up a new public skill repository whose maintainer wants a concrete maintained starting stack.
Adoptable: true
Variant: Short
Canonical variant: Long
Supersedes: AC-ADR-040
Superseded by: none
Guide verified: 2026-11-27
Gist: Retain independent public-skill stack choices and require the shared quality policy on applicable source.

Variants: **Short** · [Long, canonical](ac-adr-070-use-shared-quality-in-the-public-skill-repository-profile.long.md) · [Guide](ac-adr-070-use-shared-quality-in-the-public-skill-repository-profile.guide.md)

## Decision summary

Offer the `public-skill-repository` profile within an authorized Architecture Compass workflow. Keep its specification, catalog, licensing, pnpm, supported tooling, portable helpers, eval, release and publication components independently mapped. Require AC-ADR-069 shared quality on applicable JavaScript/TypeScript boundaries while preserving accepted local authority, native non-JavaScript checks and separate installation or migration scope.
