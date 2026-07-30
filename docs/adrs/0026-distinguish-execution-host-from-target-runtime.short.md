# ADR-0026: Distinguish execution host from target runtime

ID: ADR-0026
Title: Distinguish execution host from target runtime
Status: Superseded
Date: 2026-07-13
Owner: stark-ai-de
Scope: repository
Category: agent-lifecycle
Tags: host, target-runtime, superseded
Applies when: Reviewing the former execution-host and target-runtime split.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: None
Superseded by: ADR-0028
Guide verified: 2026-07-28
Gist: Preserve target-specific behavior while adapting only to the host that executes the skill.

Variants: **Short** · [Long, canonical](0026-distinguish-execution-host-from-target-runtime.long.md) · [Guide](0026-distinguish-execution-host-from-target-runtime.guide.md)

## Decision

We will distinguish the execution host from the target runtime, specialize only for target-specific contracts, adapt only collaboration controls across hosts, and keep gateways co-located until reuse and isolation are proven.

## Context

- The client running a skill may differ from the runtime whose artifacts it manages.
- ADR-0021 rejects duplicate variants when workflow contracts match.

## Consequences

- Good: Cross-host use preserves runtime-specific evidence without portable-skill copies.
- Tradeoff: Host fallbacks need focused compatibility proof.
- Risk: Implicit activation remains client-dependent.
