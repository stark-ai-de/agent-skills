# ADR-0057: Permit qualified opt-in host advice while preserving target contracts

ID: ADR-0057
Title: Permit qualified opt-in host advice while preserving target contracts
Status: Accepted
Date: 2026-09-22
Owner: stark-ai-de
Scope: repository
Category: repository-architecture
Tags: host-adapter, capability-advice, isolation
Applies when: Adapting execution hosts, splitting a portable skill, integrating optional automatic capability advice or extracting a shared gateway.
Adoptable: false
Variant: Short
Canonical variant: Long
Supersedes: ADR-0028
Superseded by: None
Guide verified: 2026-09-22
Gist: Permit verified opt-in host advice while retaining native fallback, target contracts and gateway isolation.

Variants: **Short** · [Long, canonical](0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.long.md) · [Guide](0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.guide.md)

## Decision

We will preserve target contracts across execution hosts and adapt collaboration controls to the host. Native client and model discovery remains the default and fallback. An optional, explicitly enabled host adapter may obtain bounded Jev capability advice before ordinary task execution only after that host independently demonstrates its hook, current eligible capability inventory and recommendation delivery. Advice must preserve explicit invocation restrictions, host permissions and execution ownership; installing a plain portable skill does not imply universal interception. We will split skills only when target-specific contracts make both trigger and outcome materially distinct, and extract gateways only after a second independent consumer and fail-closed filesystem, process, tool, network, and environment isolation are proven.

## Context

Automatic advice requires a real host entry point and eligible session inventory. The maintainer accepted an opt-in integration while retaining native fallback and the existing gateway constraints.

## Consequences

- Good: qualified hosts can obtain advice before ordinary task execution.
- Tradeoff: activation, inventory and delivery need independent host evidence.
- Risk: plain installation or stale inventory must never imply automatic, executable recommendations.
