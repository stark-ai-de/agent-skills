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
Variant: Long
Canonical variant: Long
Supersedes: AC-ADR-040
Superseded by: none
Guide verified: 2026-11-28
Gist: Retain independent public-skill stack choices and require the shared quality policy on applicable source.

Variants: [Short](ac-adr-070-use-shared-quality-in-the-public-skill-repository-profile.short.md) · **Long, canonical** · [Guide](ac-adr-070-use-shared-quality-in-the-public-skill-repository-profile.guide.md)

## Context

A new public skill repository benefits from a concrete profile covering its independent maintenance responsibilities. The shared quality policy now has one reusable package owner. The profile must select that policy without imposing application frameworks, changing every target runtime, or converting profile selection into package-installation authority.

## Decision

Architecture Compass offers a named `public-skill-repository` target-repository provider profile for new public skill repositories. The profile is considered or selected only inside a authorized Architecture Compass setup or writing refactor workflow. It is never inferred from repository type, installed globally, applied by another skill automatically, or treated as higher authority than accepted local ADRs, repository instructions, target evidence, or explicit user authorization.

When selected, the profile proposes these independently recorded starting dispositions:

- use the open Agent Skills specification and a promoted-only public catalog with external maintainer eval evidence;
- license repository-owned public material under Apache-2.0 after ownership and attribution review;
- let pnpm own package installation, workspace membership when present, lifecycle approvals, and one lockfile;
- use a currently supported Node.js LTS for repository maintenance scripts and Node-based helper validation;
- use stable TypeScript 7 under `typescript` for repository type checking and supported editor workflows;
- retain a bounded TypeScript 6 compatibility lane only for named compiler-API, embedded-language, language-service-plugin, transformer, framework, or editor consumers that cannot yet use TypeScript 7;
- require the shared `@servrox/code-quality` policy under AC-ADR-069 for applicable JavaScript/TypeScript source, with mandatory presets, exact source/tool pins, consumer-owned scope and measured legacy migration;
- prefer dependency-light portable helpers, keep maintainer-local helper state out of public source, and gate optional providers or tool installations;
- require promotion, release-coherence, migration, public-safety, and clean-install evidence;
- publish from a reviewed public GitHub source through the open Skills CLI contract after separate publication approval.

Each component maps to its own applicable provider ADR and receives `adopt`, `adapt`, `defer`, or `reject` with target rationale. Selecting the profile is not consent to install packages, enable network access, publish, or run migrations. The workflow presents exact planned files, dependencies, commands, compatibility gaps, and side effects before implementation.

The profile deliberately does not choose an application runtime, HTTP or UI framework, task orchestrator, documentation site generator, deployment host, database, AI provider, mobile or desktop target, or remote cache. Those concerns are added only when product and repository evidence require them and remain governed by their own ADRs. Existing repositories use their accepted stack unless the user authorizes a migration with compatibility and rollback evidence.

## Invariants

- The profile remains one selectable provider candidate, not another setup coverage or workflow.
- Accepted local ADRs and explicit user choices outrank proposed components; reconcile conflicts before implementation.
- Each responsibility retains its independent owner and compatibility evidence.
- Applicable JavaScript/TypeScript quality enforcement follows AC-ADR-069. Pure non-JavaScript/TypeScript repositories retain native tools; mixed repositories scope the shared policy to their maintained JavaScript/TypeScript boundaries.
- Named compiler/runtime exceptions and measured migration baselines remain visible and owned.
- Profile selection alone grants no installation, migration, CI-change or publication authority; existing task authority remains reusable.
- Unneeded application runtime, framework, orchestration and hosting choices remain absent or deferred.

## Failure handling

Preserve a conflicting accepted local choice until its adaptation or successor is accepted. Record unsupported coverage or missing prerequisites with owner, evidence and revisit trigger; do not call the profile fully implemented from configuration or a baseline pass alone. Refresh transient Guide mechanics when tool support changes without rewriting accepted Decisions.

## Consequences

New public skill repositories receive a maintained quality default alongside independently owned repository capabilities. Established repositories can reuse the shared policy without adopting this new-repository profile. The cost is explicit component mapping, compatibility qualification and evidence for the actual installed commands.
