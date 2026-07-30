# AC-ADR-036: Keep Architecture Compass Portable Through Host Adapters

ID: AC-ADR-036
Title: Keep Architecture Compass Portable Through Host Adapters
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: skill-runtime
Category: agent-lifecycle
Tags: architecture-compass, portability, host-adapters, capabilities
Applies when: Architecture Compass translates planning, questions, review, permissions, or instruction conventions across execution hosts.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-30
Gist: Preserve one Architecture Compass outcome contract and adapt only host collaboration controls.

Variants: **Short** · [Long, canonical](ac-adr-036-keep-architecture-compass-portable-through-host-adapters.long.md) · [Guide](ac-adr-036-keep-architecture-compass-portable-through-host-adapters.guide.md)

## Decision summary

Architecture Compass remains one portable skill whose setup, audit, ADR mapping, conflict, refactor, and evidence outcomes do not change by execution host. Capability-detected adapters translate native planning, structured questions, review, permissions, and agent-instruction conventions while reporting their real state. A host-specific variant is created only if target evidence or output contracts materially diverge, not because a host exposes different controls.

## Context

Hosts provide different collaboration surfaces, but repositories still need one architecture history and comparable outcomes.

## Invariants

- Host controls never change the confirmed public action or write boundary silently.
- Capability state is observed and reported rather than inferred from prompt text.
- Fallbacks preserve safety and target semantics.

## Consequences

One workflow stays consistent across hosts, while adapter guidance and cross-host regression evidence require ongoing maintenance.
