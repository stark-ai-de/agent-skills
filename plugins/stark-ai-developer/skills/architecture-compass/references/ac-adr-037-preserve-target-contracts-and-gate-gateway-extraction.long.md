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
Variant: Long
Canonical variant: Long
Supersedes: none
Superseded by: none
Guide verified: 2026-07-28
Gist: Preserve target behavior across hosts and extract gateways only after independent reuse and fail-closed isolation are proven.

Variants: [Short](ac-adr-037-preserve-target-contracts-and-gate-gateway-extraction.short.md) · **Long, canonical** · [Guide](ac-adr-037-preserve-target-contracts-and-gate-gateway-extraction.guide.md)

## Context

An execution host is where a skill runs; a target contract is the capability, evidence, safety boundary, and output it promises. Confusing the two leads an installer target to rewrite a skill's meaning. A router skill cannot guarantee activation because hosts may select from descriptions before loading bodies. Extracting a shared agent or model gateway too early centralizes credentials, process control, network access, and workspace reach without proof that another consumer needs the abstraction or that compromise is contained.

## Decision

A skill preserves its target name, required evidence, substantive workflow, permission boundary, failure behavior, and output contract across supported execution hosts. Host adapters may translate planning, questions, reviews, permissions, or instruction conventions but cannot silently retarget the skill.

Skill and model selection rely on the client's supported discovery and the agent's direct capability selection. Do not introduce a universal router skill merely to choose among target packages. Split a skill only when target-specific trigger and outcome contracts are materially distinct under the adopted portability taxonomy, and migrate names, install guidance, evals, and existing users explicitly.

A shared agent, model, browser, or tool gateway is extracted from an owning skill only after both independent gates pass:

1. **Reuse proof:** a second independent production-like consumer needs the same stable protocol, lifecycle, policy, and failure semantics; a hypothetical or test-only caller is insufficient.
2. **Isolation proof:** the gateway fails closed across filesystem reads and writes, process creation and termination, tool access, network destinations, environment inheritance, credentials, request size and duration, concurrency, logs, cleanup, and client disconnects. The proof uses adversarial fixtures and the actual deployment boundary rather than prompt instructions alone.

Until both gates pass, keep the gateway local to its owning skill, minimize privilege, and expose only the narrow interface that consumer needs. Extraction records owners, threat model, authentication and authorization, quotas, observability, versioning, compatibility, incident handling, deployment, and rollback. Reuse does not excuse weak isolation, and isolation does not prove a reusable abstraction.

## Invariants

- Install host and target capability remain distinct.
- Direct discovery does not depend on a router skill loading first.
- Skill splits require material target-contract evidence and independent validation.
- Gateway extraction requires both reuse and isolation; neither can waive the other.
- Prompt restrictions are not filesystem, process, network, tool, or credential isolation.
- Gateway credentials and capabilities are least-privilege and consumer-scoped.

## Failure handling

When a host cannot preserve the target contract, stop claiming that host or create a separately accepted variant. When either gateway gate is missing or regresses, retain or return the capability to its owning boundary, disable unsafe remote access, preserve evidence, and do not broaden credentials or host access to make a test pass.

## Consequences

Repositories avoid activation indirection and premature privileged infrastructure. Adapter and gateway code may remain duplicated or local longer, but extraction occurs only with proven demand, a reviewable containment boundary, and an owned operational contract.
