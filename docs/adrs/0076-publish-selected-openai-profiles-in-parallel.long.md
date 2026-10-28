# ADR-0076: Publish selected OpenAI profiles in parallel

ID: ADR-0076
Title: Publish selected OpenAI profiles in parallel
Status: Accepted
Date: 2026-10-28
Owner: stark-ai-de
Scope: repository
Category: repository-architecture
Tags: distribution, openai, profiles, mcp
Applies when: Changing OpenAI release profile membership or identities.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: ADR-0071
Superseded by: None
Guide verified: 2026-10-28
Gist: One canonical source publishes two independently identified OpenAI profiles in each stable release.

Variants: [Short](0076-publish-selected-openai-profiles-in-parallel.short.md) · **Long, canonical** · [Guide](0076-publish-selected-openai-profiles-in-parallel.guide.md)

## Decision

A single canonical skill source defines an explicit set of OpenAI release profiles. Each stable release includes both existing products: `existing-skills-only` for stark AI Developer and `new-remote` for stark AI Developer Tools. Each profile retains its own existing listing identity, version, transport, package and publication evidence. Both packages contain byte-identical canonical skills; profile-specific metadata and MCP content remain separate. A profile-specific packaging default does not select or exclude release membership. Portable and Claude retain the independently maintained, revision- and digest-pinned SSH runtime with complete payload validation and offline projection. Native adapters are temporary, target validation remains separate, and changes to product identities or the selected profile set require a reviewed decision.

## Why

The maintainer selected parallel maintenance of both already published products from one skill source, retaining the useful skills-only and remote-MCP distinction.

## Options

- Chosen: One canonical source publishes two independently identified OpenAI profiles in each stable release.
- Rejected: Maintain separate skill copies or silently replace an existing product identity.

## Consequences

- Good: One skill implementation serves both products while identities and transports remain explicit.
- Tradeoff: Each release requires two package qualifications and two independent portal handoffs.
- Risk: Portal eligibility, service operation and publication remain separate evidence boundaries.

## Follow-up

The maintainer requested implementation of the previously presented parallel-publication recommendation on 2026-10-28. Acceptance of this decision is separate from successful implementation, protected publication, service deployment and manual portal outcomes.
