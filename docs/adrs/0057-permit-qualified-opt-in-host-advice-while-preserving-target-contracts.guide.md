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
Variant: Guide
Canonical variant: Long
Supersedes: ADR-0028
Superseded by: None
Guide verified: 2026-09-22
Gist: Permit verified opt-in host advice while retaining native fallback, target contracts and gateway isolation.

Variants: [Short](0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.short.md) · [Long, canonical](0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.long.md) · **Guide**

This guide is non-normative. [Long](0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.long.md) is the authoritative decision; if this guidance conflicts with it, follow Long.

## How to apply

1. Keep the portable advisor available through native discovery. Offer automatic advice only through an explicitly enabled host adapter with a documented disable path.
2. Bind the eligible catalog to the active host session and preserve disabled and explicit-only restrictions. Do not infer runtime availability from files, configuration, another client or a shared parent session identifier.
3. Bound preparation, provider work and output by one deadline. Validate returned capability IDs locally and deliver a fixed advisory format; raw catalog text must not become trusted instructions.
4. Leave activation, permissions and execution with the host. Missing credentials, unavailable inventory, malformed results, cancellation or timeout must permit native discovery to continue.
5. Qualify each host and packaging surface separately. An OpenAI-native archive or command-hook schema does not prove that a Chat surface or installed desktop session runs it.

## Verification

- Run `pnpm run validate:adrs` after updating reciprocal supersession and the immutable decision lock.
- Verify ordinary prompts trigger the callback and advice before the first model action, then record whether the agent adopts it and completes the task.
- Exercise missing, disabled and stale capabilities, explicit invocation, ambiguous and compound requests, parent/subagent identity and provider failures.
- Measure cold and reused connection latency, hook overhead and whole-task outcomes separately. Fixtures prove parser behavior; installed-host runs prove integration.

## Current references

- [Predecessor ADR-0028](0028-require-reuse-and-fail-closed-isolation-before-gateway-extraction.long.md) preserves the historical decision unchanged.
- [ADR-0043](0043-package-portable-agent-plugins-and-separate-client-adapters.long.md) defines portable packages and generated client adapters.
- [Codex hooks](https://learn.chatgpt.com/docs/hooks) and [app-server](https://learn.chatgpt.com/docs/app-server) describe host interfaces; verify the installed version before relying on their current support.

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all three variants and both sides of the supersession metadata in one change.
