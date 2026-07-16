# ADR-0026: Distinguish execution host from target runtime

Status: Superseded
Date: 2026-07-13
Owner: stark-ai-de
Gist: Preserve target-specific behavior while adapting only to the host that executes the skill.

Superseded by [ADR-0028](0028-require-reuse-and-fail-closed-isolation-before-gateway-extraction.md).

## Decision

We will distinguish the execution host from the target runtime, specialize only for target-specific contracts, adapt only collaboration controls across hosts, and keep gateways co-located until reuse and isolation are proven.

## Why

- The client running a skill may differ from the runtime whose artifacts it manages.
- ADR-0021 rejects duplicate variants when workflow contracts match.
- Clients and models own implicit activation; explicit invocation is deterministic only where supported.

## Options

- Chosen: preserve target semantics and adapt collaboration controls to the execution host.
- Rejected: add a universal router or routing metadata, because neither guarantees activation.
- Rejected: limit independent skills by count; a distinct trigger and outcome can justify one.

## Consequences

- Good: Cross-host use preserves runtime-specific evidence without portable-skill copies.
- Tradeoff: Host fallbacks need focused compatibility proof.
- Risk: Implicit activation remains client-dependent.

## Follow-up

- See [ADR-0028](0028-require-reuse-and-fail-closed-isolation-before-gateway-extraction.md) for the current gateway extraction gate.
