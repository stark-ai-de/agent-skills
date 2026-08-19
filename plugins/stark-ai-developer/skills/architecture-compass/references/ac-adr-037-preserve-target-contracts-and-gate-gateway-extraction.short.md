# AC-ADR-037: Preserve Target Contracts and Gate Gateway Extraction

ID: AC-ADR-037
Title: Preserve Target Contracts and Gate Gateway Extraction
Status: Accepted
Date: 2026-07-28
Owner: stark-ai-de
Scope: target-repository
Category: repository-architecture
Tags: target-contracts, gateways, isolation, reuse
Applies when: Routing a skill across execution hosts, splitting variants, or extracting a shared agent or model gateway.
Adoptable: true
Variant: Short
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Preserve target behavior across hosts and extract gateways only after independent reuse and fail-closed isolation are proven.

Variants: **Short** · [Long, canonical](ac-adr-037-preserve-target-contracts-and-gate-gateway-extraction.long.md) · [Guide](ac-adr-037-preserve-target-contracts-and-gate-gateway-extraction.guide.md)

## Decision summary

A skill preserves its target name, evidence, safety boundary, and output when another supported host executes it; only collaboration controls adapt. Client and model discovery select the skill directly rather than depending on a router package. A shared gateway is extracted only after a second independent production-like consumer proves reuse and fail-closed filesystem, process, tool, network, environment, and credential isolation proves containment.

## Context

Premature routers and gateways create activation ambiguity, centralized privilege, and a reusable abstraction before either demand or containment exists.

## Invariants

- Execution host does not silently change the target contract.
- A split follows material trigger or outcome evidence.
- Gateway reuse and isolation are independent mandatory proofs.

## Consequences

Owning skills keep some adapter code longer, while cross-host behavior and privileged gateway boundaries remain explicit and safer.
