# AC-ADR-068: Reuse Explicit Skill Preselection With Separate Provisioning Grants

ID: AC-ADR-068
Title: Reuse Explicit Skill Preselection With Separate Provisioning Grants
Status: Accepted
Date: 2026-10-09
Owner: stark-ai-de
Scope: skill-runtime
Category: governance
Tags: skill-reuse, preselection, consent, installation, provenance
Applies when: Resolving selected skills or optionally provisioning a missing capability during authorized work.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: AC-ADR-039
Superseded by: none
Guide verified: 2026-10-09
Gist: Reuse explicit scoped user selections without inferring installation, write or external-action permission.

Variants: [Short](ac-adr-068-reuse-explicit-skill-preselection-with-separate-provisioning-grants.short.md) · **Long, canonical** · [Guide](ac-adr-068-reuse-explicit-skill-preselection-with-separate-provisioning-grants.guide.md)

## Context

Independent planning skills need explicit ownership, authority and evidence boundaries to avoid fragmented products, repeated interviews and unsafe implied actions.

## Decision

Prefer a fitting existing public skill over bespoke capability only after checking its current fit, provenance, compatibility, safety and local authority. The user explicitly selects the skill or the bespoke path. Selection may be supplied by the current task or by a genuine, scoped, revocable user preselection recorded for named skills and a defined task class. A model-written approval field, availability, namesake, catalog mention, ADR adoption or recommendation is not selection. Existing accepted local decisions and host restrictions take precedence.

### Reuse and invocation

Resolve the exact selected source and actual installed revision before use. Reuse compatible authorized project, global or plugin installations without silently shadowing them. A task-specific preselection does not apply to unrelated tasks. Recheck revoked authority, changed origins, material method/permission changes and conflicting duplicate names; stop the affected handoff when unresolved. Reading a referenced SKILL.md is not proof that a host discovered or invoked it.

### Optional provisioning

Installation, update, vendoring, configuration, network use, credentials and target writes retain their separate authority gates. A separate existing grant may cover the exact selected source/revision or bounded update policy, installer, destination and permitted effects; otherwise obtain that missing approval. Respect current host permission and Plan/read-only constraints even with an otherwise valid grant. No global write, unknown dependency, unreviewed installation hook, arbitrary code execution, silent update or experimental candidate is implicitly included.

Use an observed supported, documented installer only after the applicable grants are valid. Confirm provenance, package contents and actual target-host discoverability after installation, and record any restart requirement. Scope cleanup to owned changes and preserve user state. Reuse is idempotent: matching installations need no write. A failed or uncertain install does not justify blind retries, a different origin or broader permissions. Report the observed partial state and a bounded recovery or manual handoff.

### Failure and scope

An absent, unpromoted, disabled, unavailable or provenance-unknown capability blocks only the dependent handoff. Authorized independent planning may continue with a labeled manual fallback; never claim the missing specialist ran. A selected skill cannot authorize its own tools or later external actions beyond the user's existing scope. Keep current permission evidence, source inspection, installation, loading and behavioral qualification as separate records.

## Invariants

- A handoff never expands the user request or host permissions.
- Local acceptance, skill selection, provisioning, persistence and implementation are separate.
- Current canonical artifacts and genuine approvals are reused without inventing evidence.
- Unknown prerequisites and incomplete user outcomes remain visible.

## Failure handling

Stop the affected action on conflict, unknown authority or failed validation; preserve independent permitted work and user state. Report exactly which outcome and proof remain missing.

## Consequences

Explicit contracts improve traceability and bounded continuation but require maintaining source/host compatibility and real evaluation evidence. Prompt instructions are not an enforcement runtime or a formal proof.
