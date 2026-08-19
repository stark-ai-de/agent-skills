# AC-ADR-040: Offer an Opinionated Stack Profile for New Public Skill Repositories

ID: AC-ADR-040
Title: Offer an Opinionated Stack Profile for New Public Skill Repositories
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: stack-tooling
Tags: stack-profile, typescript-7, pnpm, oxc
Applies when: Architecture Compass sets up a new public skill repository and the user wants a concrete maintained starting stack.
Adoptable: true
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Offer a concrete public-skill repository stack only through explicit Architecture Compass selection and local adaptation.

Variants: **Short** · [Long, canonical](ac-adr-040-offer-an-opinionated-stack-profile-for-new-public-skill-repositories.long.md) · [Guide](ac-adr-040-offer-an-opinionated-stack-profile-for-new-public-skill-repositories.guide.md)

## Decision summary

Architecture Compass offers an opinionated `public-skill-repository` provider profile for explicitly selected new repositories: open Agent Skills packages, Apache-2.0, pnpm-owned installation and one lockfile, a supported Node.js LTS for repository tooling, stable TypeScript 7 with a bounded TypeScript 6 compatibility lane, Oxc only after compatibility proof, dependency-light helpers, external evals, promotion and release gates, and GitHub plus the open Skills CLI for publishing. Local target ADRs, repository evidence, and user confirmation can adapt, defer, or reject every component; the profile is never a global or automatic default.

## Context

New repositories benefit from a concrete baseline, but universal hidden defaults conflate independent tool and platform decisions.

## Invariants

- Only a confirmed Architecture Compass workflow selects the profile.
- Components remain independently owned and evidence-gated.
- Application runtimes, orchestrators, sites, and deployment hosts are not added without target need.

## Consequences

New public skill repositories can start coherently, while maintainers must record deviations and compatibility lanes instead of treating the profile as mandatory.
