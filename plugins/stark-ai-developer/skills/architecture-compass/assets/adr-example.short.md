# ADR-0007: Resolve configuration at the deployable boundary

> Derived, non-normative asset. The applicable canonical Long ADRs prevail if this example conflicts or drifts.

ID: ADR-0007
Title: Resolve configuration at the deployable boundary
Status: Accepted
Date: 2026-07-28
Owner: example-team
Scope: repository
Category: runtime-platform
Tags: configuration, environment, bootstrap
Applies when: A deployable process reads environment-backed configuration.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Select environment before bootstrap and parse resolved configuration once.

Variants: **Short** · [Long, canonical](adr-example.long.md) · [Guide](adr-example.guide.md)

## Decision

The launcher or deployment selects environment input before bootstrap; the deployable-local parser validates the resolved environment once and passes typed configuration to runtime components.

## Consequences

- Services do not read scattered environment variables.
- Local and production selection remain deployment concerns.
