---
title: "Public Hetzner Inference setup skill"
slug: "hetzner-inference-setup-skill"
artifact_path: "docs/specs/hetzner-inference-setup-skill-spec.md"
mode: "deep"
status: "approved"
owner: "stark-ai-de"
repo: "stark-ai-de/agent-skills"
created: "2026-08-21"
updated: "2026-09-21"
source_request: "Finish the public standalone Hetzner skill with local and existing remote LiteLLM setup, autonomous and manual modes, client adapters, live proof, and reviewed PR delivery."
---

# Public Hetzner Inference setup skill

## Goal and approved scope

Deliver `hetzner-inference-setup` as a public standalone Agent Skill. The maintainer approved this specification on 2026-09-21, including accepting the revised Proposed ADR-0047 through ADR-0049 before implementation. Complete the existing candidate and promotion in one PR; public promotion follows current evidence rather than a separate incubation release.

The skill connects Hetzner Inference through the official LiteLLM Proxy to optional Codex CLI, Claude Code, and Cursor standard-chat clients. It owns configuration and verification, not protocol translation. Keep the Hetzner name and discovery triggers. Do not bundle the skill into the existing plugin.

## Architectural decisions

- [ADR-0047](../adrs/0047-use-a-local-litellm-gateway-for-hetzner-coding-clients.short.md) ([Long, canonical](../adrs/0047-use-a-local-litellm-gateway-for-hetzner-coding-clients.long.md) · [Guide](../adrs/0047-use-a-local-litellm-gateway-for-hetzner-coding-clients.guide.md)): official LiteLLM, local or existing remote target, explicit ownership, separate proof.
- [ADR-0048](../adrs/0048-implement-one-portable-hetzner-setup-skill-with-client-adapters.short.md) ([Long, canonical](../adrs/0048-implement-one-portable-hetzner-setup-skill-with-client-adapters.long.md) · [Guide](../adrs/0048-implement-one-portable-hetzner-setup-skill-with-client-adapters.guide.md)): one portable skill, separate adapters, finite workflows, evidence before promotion.
- [ADR-0049](../adrs/0049-separate-hetzner-provider-and-local-gateway-credentials.short.md) ([Long, canonical](../adrs/0049-separate-hetzner-provider-and-local-gateway-credentials.long.md) · [Guide](../adrs/0049-separate-hetzner-provider-and-local-gateway-credentials.guide.md)): provider, management, and client credential boundaries.

ADR gate: required, approved. These three records were Proposed and unlocked; revise and accept them, add decision locks and update their index. Preserve unrelated Accepted decisions, especially ADR-0006, ADR-0008, ADR-0028, ADR-0029, ADR-0038 and ADR-0041.

## Entry and finite workflows

Ask only for missing material choices: `target=local|remote`, `mode=autonomous|manual`, selected clients, endpoint/model alias, and credential sources. Carry clear user intent and existing authorization forward. Explain the selected workflow without repeating an already satisfied approval conversation.

Expose setup/add clients, diagnose, selected compatibility checks, local lifecycle, local repair/rotation, and owned-artifact rollback. Target and execution mode are separate options. Remote server installation, restart, upgrades, and infrastructure administration are outside the skill.

Manual mode reads no credentials, contacts no target endpoint, installs nothing, and writes no configuration. Return numbered commands or UI instructions with placeholders, expected outcomes, and validation steps. Users enter credentials themselves. Unknown model IDs remain placeholders until the user performs discovery.

## Local contract

Reuse the candidate's dependency-free Node helpers, owned per-user virtual environment, exactly reviewed LiteLLM version, loopback listener, stable `hetzner-default` alias, isolated credential storage and process identity. Preserve existing installations and unrelated client settings. Never silently switch ports or stop another process.

Keep local `diagnose`, `plan`, and `status` offline and free of secret reads. Explicit checks may read selected credentials and call selected endpoints. Every local mutation consumes an unexpired hash-bound plan, takes an owned lock, revalidates state, and produces an ownership/rollback receipt. Identical apply is a no-op; stale or user-modified state fails closed. Ordinary rollback preserves credentials.

Maintain native Windows, macOS, Linux and WSL adapters. Use machine-local roots, verified Unix modes or Windows ACLs, and same-environment clients by default. Do not install system-wide Python packages or silently add startup services.

## Remote contract

Use a separate adapter for an existing LiteLLM management URL and inference URL; preserve reverse-proxy path prefixes. Use authenticated read-only inspection to prepare a bounded remote plan. The local offline-plan promise does not imply that remote inspection is offline. Explicitly authorized management access may read model inventory and API/version capabilities.

Remote setup inventories model ownership, creates an API/database-managed Hetzner route, reuses a matching route, or reports a conflicting alias. Do not overwrite a foreign or config-owned route. A GitOps/config-owned route receives a concrete patch and owner-run instructions. Missing database/model-storage prerequisites receive an actionable handoff; do not migrate infrastructure.

Use a selected live Hetzner model ID with LiteLLM's OpenAI-compatible provider and the provider's documented base URL. Keep model IDs out of the hardcoded catalog. Recheck the deployed API contract instead of assuming the newest upstream CRUD routes work on every version.

Remote writes consume a current approved plan, recheck state, and read back the returned model ID and non-secret routing properties. An ambiguous timeout requires inventory reconciliation before another create. Masked provider keys are not proof of equality. Remote rollback removes only an attributable created model whose identity/configuration still matches the receipt; reused models are not owned by this run.

Separate configuration success from successful inference using a client credential. Transport, streaming, tools and client E2E remain independent evidence. Do not start or stop remote server processes.

## Credentials and optional clients

Distinguish the Hetzner provider token, local administrative master key, remote management credential, and remote inference/client credential. Accept protected source references rather than literal keys in command arguments. Resolve remote environment-secret references on the remote server; local availability does not prove remote availability. Sending a provider credential to the selected remote gateway requires the selected workflow's authority and authenticated encrypted transport.

Never print secrets or persist them in plans, receipts, public evidence, client configs or backups. Authenticate clients with the local administrative loopback key or an appropriate remote inference credential, never with the remote management key. Remote provider storage belongs to the selected remote system. Preserve credentials on ordinary rollback.

Provide optional Codex Responses, Claude Code Messages and guided Cursor standard-chat adapters for both targets. Preserve unrelated configuration. Version-gate undocumented or changed client behavior. A configured client is not E2E-verified until its exact installed version completes a disposable coding flow; Cursor limitations must remain visible.

## Public integration and roadmap

Publish the proved candidate under `skills/engineering-workflows/hetzner-inference-setup/` with a concise entrypoint, referenced operational guides, canonical `agents/openai.yaml`, updated catalog and independent eval evidence. Keep maintainer tests outside the installed payload. Preserve the existing plugin membership, version and runtime policy.

Record a provider-neutral local/remote LiteLLM setup candidate in the existing roadmap/skill-ideas documentation. Evaluate the existing SkillOpt gateway without changing it: its backend is `codex exec`, whereas LiteLLM's Codex launcher makes Codex a client. Keep authentication ownership, isolation, error/streaming semantics and process cancellation as future migration criteria. ADR-0028's shared-gateway extraction gate remains applicable.

## Validation and acceptance

- Exercise all four target/mode combinations, ambiguous and clear routing, and no-key manual operation.
- Cover secret redaction, protected source reads, wrong key role, remote-secret mismatch, API prerequisites, GitOps ownership, equivalent route reuse, alias conflicts, stale plans, concurrent local writes, ambiguous create outcomes and attributable rollback.
- Retain local lifecycle and credential regressions. Add observed-failure regressions rather than assertions that only mirror source text.
- Perform real bounded local LiteLLM-to-Hetzner and existing remote-gateway-to-Hetzner runs with maintainer-controlled credentials. Use an attributable temporary remote alias and clean it up. Keep private paths, hostnames and secrets out of public evidence.
- Exercise available client flows and actual UI guidance. Collect economical cross-platform evidence using existing host/CI capabilities. Report remaining combinations and the cost/value of a next test to the maintainer; never count skips as passes.
- Register `pnpm run validate:hetzner-inference` in the owning validation contract and CI. Run focused tests during development and the required local `pnpm run validate`, `pnpm run format:check`, `pnpm run lint`, catalog discovery, install proof and mandatory hosted checks for public readiness.
- Independently review utility/maintainability, then Spec and Standards correctness. Fix findings and rerun affected checks/reviews on the resulting candidate.

## Delivery and done when

Work in an assigned isolated worktree from current main, preserving the historical uncommitted candidate. Complete specification/ADR persistence before implementation. Create a focused PR, attach it to the task, and tie review/test evidence to its final commit. Read every changed file on GitHub and add concise German `Änderung` / `Warum nötig` comments per logical change, avoiding duplicates and reading published comments back.

Done means actionable review findings are resolved, mandatory checks pass, the promised local/remote flows have current evidence, and remaining platform decisions are explicitly reported. Missing credentials or unavailable environments are reported as evidence gaps, not substituted with mock success. The task ends with the reviewed PR; merging and publication follow the existing release workflow.

## Source challenge and limitations

Reviewed 2026-09-21 against repository source and official contracts:

- [Agent Skills specification](https://agentskills.io/specification)
- [Hetzner Inference](https://experiments.hetzner.com/docs/inference): current full documentation requires account access; runtime discovery is authoritative.
- [LiteLLM model management](https://docs.litellm.ai/docs/proxy/model_management): database versus config ownership, storage prerequisites and masked key readback.
- [LiteLLM OpenAI-compatible providers](https://docs.litellm.ai/docs/providers/openai_compatible)
- [LiteLLM proxy management CLI](https://docs.litellm.ai/docs/proxy/management_cli)
- [LiteLLM Codex launcher source](https://github.com/BerriAI/litellm/blob/main/litellm/proxy/client/cli/commands/agents.py)

Recheck version-sensitive client configuration and LiteLLM behavior during implementation. Historical pins and successful test counts are starting evidence only. No general Kubernetes operator, new hosted gateway, generic provider framework, automatic remote infrastructure migration, or SkillOpt backend replacement is included.

## Current evidence boundary

Native NixOS is not qualified by Linux-container evidence. The current venv runner does not inherit dynamic-loader overrides; a missing native wheel library requires an explicit packaging adapter or the remote/manual alternative. Keep this limitation visible in the public skill and final release review.
