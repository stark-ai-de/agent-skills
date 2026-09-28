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
Variant: Long
Canonical variant: Long
Supersedes: ADR-0028
Superseded by: None
Guide verified: 2026-09-22
Gist: Permit verified opt-in host advice while retaining native fallback, target contracts and gateway isolation.

Variants: [Short](0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.short.md) · **Long, canonical** · [Guide](0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.guide.md)

## Decision

We will preserve target contracts across execution hosts and adapt collaboration controls to the host. Native client and model discovery remains the default and fallback. An optional, explicitly enabled host adapter may obtain bounded Jev capability advice before ordinary task execution only after that host independently demonstrates its hook, current eligible capability inventory and recommendation delivery. Advice must preserve explicit invocation restrictions, host permissions and execution ownership; installing a plain portable skill does not imply universal interception. We will split skills only when target-specific contracts make both trigger and outcome materially distinct, and extract gateways only after a second independent consumer and fail-closed filesystem, process, tool, network, and environment isolation are proven.

## Why

- Skill metadata can support native discovery but cannot guarantee that every ordinary prompt invokes an advisor. An explicit host integration can provide a verifiable entry point.
- A configured or on-disk capability may be disabled, restricted or unavailable in the active session. Automatic advice needs current eligible inventory.
- The maintainer accepted the bounded automatic-advice adaptation on 2026-09-22. Gateway reuse and isolation remain separate requirements.

## Options

- Chosen: qualify optional host adapters independently, with bounded advice and native fallback.
- Rejected: assume a portable skill intercepts every prompt, infer session availability from installed files, or transfer execution authority to the chooser.
- Rejected: extract a shared gateway without both the reuse and isolation proofs.

## Consequences

- Good: supported hosts can supply automatic advice while retaining their permissions and task execution.
- Tradeoff: each host needs activation, inventory, delivery and failure evidence; a plugin archive alone proves none of them.
- Risk: stale inventory or mismatched session identity can produce unusable recommendations, so unverifiable integration must fall back to native discovery.

## Follow-up

- Qualify adapter installation, ordinary-prompt activation, actual adoption, explicit-only restrictions, stale inventory, timeout and cancellation in isolated host environments.
- Disclose task and metadata processing during opt-in setup; synthetic benchmark authorization does not authorize unrelated future private content.
- Retain separate evidence for selector latency, hook overhead and whole-task outcomes, including cold and reused connections.
- Keep Architecture Compass routing local and the Codex gateway in `skillopt-setup` until the gateway gate passes.
