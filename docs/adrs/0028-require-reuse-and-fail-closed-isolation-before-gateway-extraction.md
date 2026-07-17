# ADR-0028: Preserve target contracts and gate gateway extraction

Status: Accepted
Date: 2026-07-13
Owner: stark-ai-de
Gist: Preserve target contracts; extract gateways only after reuse and isolation.

## Decision

We will preserve target contracts across execution hosts, adapt only collaboration controls, rely on client and model discovery instead of a router, split skills only when target-specific contracts make both trigger and outcome materially distinct, and extract gateways only after a second independent consumer and fail-closed filesystem, process, tool, network, and environment isolation are proven.

## Why

- Skill descriptions are visible before skill bodies, so a router skill cannot guarantee activation.
- Reuse proves gateway demand, while isolation proves containment; both are required.

## Options

- Chosen: preserve targets, adapt hosts, and require both gateway proofs.
- Rejected: universal routing or either gateway proof alone.

## Consequences

- Good: cross-host use stays predictable without portable-workflow copies.
- Tradeoff: owning skills retain adapters until both gateway proofs exist.
- Risk: reviews must name the consumers and isolation checks.

## Follow-up

- Keep Architecture Compass routing local and the Codex gateway in `skillopt-setup` until the gate passes.
