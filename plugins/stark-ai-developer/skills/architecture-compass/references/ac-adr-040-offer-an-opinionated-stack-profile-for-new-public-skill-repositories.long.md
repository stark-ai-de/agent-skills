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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-29
Gist: Offer a concrete public-skill repository stack only through explicit Architecture Compass selection and local adaptation.

Variants: [Short](ac-adr-040-offer-an-opinionated-stack-profile-for-new-public-skill-repositories.short.md) · **Long, canonical** · [Guide](ac-adr-040-offer-an-opinionated-stack-profile-for-new-public-skill-repositories.guide.md)

## Context

Architecture Compass normally selects independent provider decisions from target evidence. A brand-new public skill repository often has little evidence and still needs concrete choices for package ownership, compiler, linting, helpers, licensing, evaluation, release, and publication. A silent universal starter stack would override local intent and couple unrelated concerns; offering only abstract matrices leaves every new repository to reconstruct the same baseline.

## Decision

Architecture Compass offers a named `public-skill-repository` target-repository provider profile for new public skill repositories. The profile is considered or selected only inside a confirmed Architecture Compass Setup or writing Apply workflow. It is never inferred from repository type, installed globally, applied by another skill automatically, or treated as higher authority than accepted local ADRs, repository instructions, target evidence, or explicit user confirmation.

When selected, the profile proposes these independently recorded starting dispositions:

- use the open Agent Skills specification and a promoted-only public catalog with external maintainer eval evidence;
- license repository-owned public material under Apache-2.0 after ownership and attribution review;
- let pnpm own package installation, workspace membership when present, lifecycle approvals, and one lockfile;
- use a currently supported Node.js LTS for repository maintenance scripts and Node-based helper validation;
- use stable TypeScript 7 under `typescript` for repository type checking and supported editor workflows;
- retain a bounded TypeScript 6 compatibility lane only for named compiler-API, embedded-language, language-service-plugin, transformer, framework, or editor consumers that cannot yet use TypeScript 7;
- use Oxc as the preferred JavaScript/TypeScript lint and format candidate only after representative file, rule, plugin, formatter, editor, and CI compatibility evidence passes;
- prefer dependency-light portable helpers, keep maintainer-local helper state out of public source, and gate optional providers or tool installations;
- require promotion, release-coherence, migration, public-safety, and clean-install evidence;
- publish from a reviewed public GitHub source through the open Skills CLI contract after separate publication approval.

Each component maps to its own applicable provider ADR and receives `adopt`, `adapt`, `defer`, or `reject` with target rationale. Selecting the profile is not consent to install packages, enable network access, publish, or run migrations. The workflow presents exact planned files, dependencies, commands, compatibility gaps, and side effects before implementation.

The profile deliberately does not choose an application runtime, HTTP or UI framework, task orchestrator, documentation site generator, deployment host, database, AI provider, mobile or desktop target, or remote cache. Those concerns are added only when product and repository evidence require them and remain governed by their own ADRs. Existing repositories use their accepted stack unless the user authorizes a migration with compatibility and rollback evidence.

## Invariants

- The profile is one selectable provider candidate, not a fourth Setup profile or a global default.
- Local accepted ADRs and explicit user choices outrank every proposed component.
- Each tool owns one responsibility and retains its independent compatibility gate.
- TypeScript 7 is the primary compiler only where the target consumer supports it; TypeScript 6 exceptions are named and removable.
- Oxc remains conditional rather than an unconditional replacement.
- No package installation, tool download, migration, publication, or external side effect follows from profile selection alone.
- Unneeded runtime, framework, orchestration, and hosting choices remain absent or deferred.

## Failure handling

When repository evidence contradicts a component, preserve the accepted local choice and record adapt, defer, or reject rather than forcing the profile. Stop implementation when a required compatibility lane, package ownership, license review, or migration boundary is unresolved. If a current tool release or host support matrix invalidates Guide mechanics, keep the durable ownership decision and refresh evidence before proceeding.

## Consequences

New public skill repositories gain a concrete, interoperable, and maintainable starting point without turning every technology into a universal mandate. Setup requires explicit component dispositions and compatibility checks, and exceptions remain visible until their owners remove or supersede them.
