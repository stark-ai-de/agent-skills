# ADR-0058: Require qualified Jev host advice after repository adoption

ID: ADR-0058
Title: Require qualified Jev host advice after repository adoption
Status: Accepted
Date: 2026-09-25
Owner: stark-ai-de
Scope: repository
Category: governance
Tags: architecture-compass, jev, host-advice, adoption, qualification
Applies when: Publishing or adopting a repository policy for qualified Jev advice through explicitly enabled agent hosts.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-09-26
Gist: Require qualified Jev advice after explicit repository adoption while retaining separate host activation, processing authorization and native fallback.

Variants: [Short](0058-require-qualified-jev-host-advice-after-repository-adoption.short.md) · **Long, canonical** · [Guide](0058-require-qualified-jev-host-advice-after-repository-adoption.guide.md)

## Decision

We will expose an explicitly adoptable Architecture Compass policy requiring qualified host-mediated Jev capability advice before substantive work on new or materially changed tasks, including material changes to available capabilities, in adopting repositories. Repository adoption establishes a governance obligation; it does not activate a host, authorize TypeSafe processing, establish capability eligibility or qualify an integration. Host activation and authorization to process a minimal task summary and bounded approved capability metadata remain separate, explicit and scoped prerequisites. When those prerequisites and current host eligibility evidence are established, the host obtains advice and retains responsibility for selection, activation, permissions and execution. Missing prerequisites, unavailable or stale inventory, provider failure, timeout and cancellation retain native selection while making the unfulfilled obligation visible; they do not block unrelated authorized work. Native selection remains the default outside the opted-in scope. Architecture Compass setup records adoption and the required host evidence, while audit reports the evidence without changing configuration. Installation, configuration, actual host qualification and publication remain distinct evidence stages.

## Why

- Repository governance can require a contributor capability without owning or silently modifying the contributor's global host configuration.
- An opt-in adapter is permitted by [ADR-0057](0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.long.md). Requiring its qualified use after explicit repository adoption does not make Jev a universal dependency for all Architecture Compass users.
- A hook can deliver fixed guidance before model processing while the model obtains advice later, before substantive work. This order must not be described as provider advice before the first model action.
- Current model-visible metadata may establish some available capabilities, but installation, declarations or omitted restrictions cannot establish a complete eligible host inventory.
- Advisory availability should not become an availability dependency for otherwise authorized repository work. Fallback preserves progress while audit preserves the distinction between useful operation and compliance.

## Authority and evidence boundaries

The maintainer explicitly accepted this repository-level decision on 2026-09-25 and authorized implementation of the linked specification. Its unchanged canonical Decision is recorded in the accepted-decision lock. Acceptance authorizes exposing a reusable policy; it does not adopt that policy in every target repository or supersede ADR-0057. The immutable hook dependency remains a prerequisite for feature implementation.

Public AC-ADR-065 is separately classified as target-repository and adoptable, with repository-native adoption mappings. Each target decides whether to adopt, adapt, defer or reject it. Even an accepted target ADR cannot authorize a contributor's global configuration changes or provider processing by itself.

The first planned implementation uses model-mediated Codex CLI guidance. A fixed hook reminder is delivery evidence, not evidence of consultation, eligible inventory or successful selection. Each qualified host configuration needs observed delivery, current eligibility, actual advice and preserved execution ownership. Unknown capability restrictions remain unknown; a model-produced catalog must not be promoted to a complete authoritative export by assertion.

## Options

- Chosen: an explicitly adoptable host-advice obligation with separate operational prerequisites, truthful qualification and native fallback.
- Rejected: require Jev for every repository using Architecture Compass. This would replace optional adoption with a universal dependency and narrow portability.
- Rejected: treat a repository ADR or skill/plugin installation as global activation and processing consent. Those artifacts do not establish that authority.
- Rejected: count a configured hook as a qualified integration, reconstruct permission from missing flags or claim advice before the first model step from a static reminder.
- Rejected: stop all repository work when advice is unavailable. Such failures should remain visible without taking away otherwise authorized native execution.

## Consequences

- Good: a repository can require and audit the capability while leaving host ownership, permissions and processing control intact.
- Tradeoff: maintainers need separate adoption, configuration and host-observation evidence, including requalification when relevant versions, models, policies or capability sources change.
- Risk: trigger classification and task minimization remain model-mediated. Qualification must exercise both, and documentation must not promise deterministic routing or guaranteed secret removal.

## Follow-up

- The reviewed hook dependency is pinned to `39c77a0e0ddc9cc6bc631b35f571eaee49a87058`; the original writer's worktree was preserved.
- Public AC-ADR-065 exposes the accepted policy with its triplet, catalog, lineage, setup matrix and owning evaluations. The originally planned AC-ADR-059 was occupied; publication remains separately authorized.
- The implementation adds a non-mutating configuration renderer and separate policy guidance while preserving the dependency's installer and registration builder.
- Qualify Codex CLI on Linux/WSL with controlled native scenarios and a bounded real TypeSafe smoke using synthetic data. Other hosts and platforms require separate evidence.
- Follow the linked [implementation specification](../specs/jev-host-governance-spec.md) for operational details and acceptance criteria.
