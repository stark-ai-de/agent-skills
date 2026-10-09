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
Variant: Guide
Canonical variant: Long
Supersedes: AC-ADR-039
Superseded by: none
Guide verified: 2026-10-09
Gist: Reuse explicit scoped user selections without inferring installation, write or external-action permission.

Variants: [Short](ac-adr-068-reuse-explicit-skill-preselection-with-separate-provisioning-grants.short.md) · [Long, canonical](ac-adr-068-reuse-explicit-skill-preselection-with-separate-provisioning-grants.long.md) · **Guide**

This Guide is non-normative. Long is canonical.

## Resolve selection before effects

Inspect the exact current user instruction or genuine recorded preselection. Check task class, named identity, source policy, revocation and current host capability. Use the [profile template](../assets/product-planning-profile.md) to retain missing entries as unknown. The coordinator cannot approve itself.

Prefer an already available matching installation. Resolve project/global/plugin shadowing and disablement rather than installing another copy. Capture the actual package revision and native discovery result. No new top-level workflow is added.

## Provision only under an applicable separate grant

A preselected skill with no install grant stays uninstalled. An install grant with no runtime permission also stays uninstalled. Native Plan/read-only forbids the mutation even when the user has expressed a future installation intent. Before running an installer, inspect its actual documented syntax, target/version and side effects; do not copy a guessed universal command. Keep code and credentials out of the profile. Global scope requires explicit global authority.

After a permitted installation, read back the package and source identity, ask the host to refresh only when supported and authorized, and report restart-required or unavailable rather than claiming loaded. Do not retry an uncertain write automatically. Exact matching installations are no-ops. Experimental candidates require explicit preview authority and are never picked by ordinary automatic public provisioning.

## Compatibility

This decision succeeds AC-ADR-039 without rewriting its locked Decision. Conditional reuse and all separate side-effect gates remain; the addition is recognition of an explicit scoped user preselection rather than repeated selection at every handoff. Provider or target ADR acceptance alone is still not that selection.

## Decision lineage

- `adapts`: [ADR-0064](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0064-reuse-explicit-skill-preselection-with-separate-provisioning-grants.long.md).

## Sources

[Agent Skills specification](https://agentskills.io/specification) and the host documentation linked from AC-ADR-067 describe discovery, not permission grants or runtime qualification. Resolve actual host behavior before provisioning.

## Qualification

Exercise available/missing/disabled/namesake candidates, revoked and forged grants, active Plan, project/global destinations, offline discovery, unknown installer effects, source changes and restart requirements. Record native-host evidence independently of package/schema checks. No runtime auto-installer or provider credential handler is introduced.
