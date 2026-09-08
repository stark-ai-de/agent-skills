# ADR-0048: Implement one portable Hetzner setup skill with client adapters

ID: ADR-0048
Title: Implement one portable Hetzner setup skill with client adapters
Status: Proposed
Date: 2026-08-26
Owner: stark-ai-de
Scope: repository
Category: stack-tooling
Tags: client-adapters, cross-platform, hetzner, node, portability, setup
Applies when: Implementing or changing the repository skill that configures Hetzner Inference for local coding clients.
Adoptable: false
Variant: Long
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-26
Gist: Keep one cross-platform setup workflow and isolate provider, gateway, client, credential, lifecycle, and operating-system differences behind explicit adapters.

Variants: [Short](0048-implement-one-portable-hetzner-setup-skill-with-client-adapters.short.md) · **Long, canonical** · [Guide](0048-implement-one-portable-hetzner-setup-skill-with-client-adapters.guide.md)

## Decision

The repository will implement one portable Agent Skill named `hetzner-inference-setup`, incubate it under `incubator/skills/engineering-workflows/`, and promote it only after evaluation and cross-platform evidence. Dependency-free Node.js `.mjs` helpers will orchestrate explicit provider, gateway, credential, lifecycle, host, and client adapters across Windows, macOS, Linux, and WSL. The skill will expose finite read-only and approved mutation workflows, automate only documented machine-readable configuration, use owned sidecars and manifests instead of replacing unrelated user state, and fail closed when a requested host or client contract cannot be verified.

## Decision invariants

1. **One workflow source.** Client and operating-system adapters remain resources of one canonical skill.
2. **Incubator first.** The implementation stays internal until usefulness, maintenance, and evaluation evidence supports promotion.
3. **Node orchestrates; Python hosts LiteLLM.** Portable planning, hashing, redaction, files, processes, and HTTP probes use dependency-free `.mjs` helpers; Python is isolated to the proxy environment.
4. **Finite workflows.** Expose setup or add-clients, diagnose, compatibility check, lifecycle, repair or rotation, and rollback.
5. **Explicit mutation boundaries.** Diagnose, plan, and status are offline and non-mutating; credential use, installation, writes, process changes, rotation, and rollback require workflow authority.
6. **Documented writes only.** Use owned sidecars, launchers, manifests, and backups; never mutate undocumented databases or opaque application state.
7. **Idempotent ownership.** Reapplying an identical current plan is a no-op; stale plans and user-modified artifacts fail closed.
8. **Single-writer execution.** Mutations take an owned lock and revalidate state before every write or process action.
9. **No host ambiguity.** WSL is distinct; gateway and client run in the same environment unless an explicit reachability-verified route is selected.
10. **Owned lifecycle only.** Stop only a process whose executable, arguments, config digest, start time, and receipt match.
11. **Evidence before support labels.** Provider, gateway, and each client report independent proof levels.

## Why

- Shared provider, secret, lifecycle, evidence, and rollback behavior should not be copied.
- Node's standard library covers portable orchestration and native Windows support.
- Codex profile layering and Claude Code gateway settings provide documented sidecar seams.
- Cursor's UI-driven contract requires a guided adapter.
- Plans, locks, hashes, and manifests make setup, repair, and rollback attributable.

## Options

- **Chosen:** One skill with provider, gateway, client, host, credential, and lifecycle adapters.
- **Rejected:** One skill per client or operating system; security-sensitive logic would drift.
- **Rejected:** Bash as primary; native Windows would need another implementation.
- **Rejected:** PowerShell as universal; macOS and Linux would gain an unnecessary dependency.
- **Rejected:** Direct Cursor state edits; undocumented mutation is not durable or reviewable.
- **Rejected:** Immediate public promotion; candidate evidence must pass first.

## Consequences

- **Good:** One receipt explains the complete local setup.
- **Good:** Cross-platform fixtures exercise the same planning and ownership algorithm.
- **Tradeoff:** The helper needs disciplined adapter interfaces.
- **Tradeoff:** Cursor remains partly manual.
- **Risk:** Host-specific path, permission, or process behavior can regress; hosted tests and WSL fixtures mitigate it.
- **Risk:** A helper can overwrite configuration or stop the wrong process; sidecars, locks, hashes, identity checks, and approval mitigate it.

## Follow-up

- Implement the file plan and evidence in [`../specs/hetzner-inference-setup-skill-spec.md`](../specs/hetzner-inference-setup-skill-spec.md).
- Add targeted tests for plans, locks, manifests, redaction, idempotence, process identity, and rollback.
- Promote only through the repository's existing quality and release gates.

## Revisit

Create a successor ADR when adapters no longer share one provider workflow, a supported client-native plugin supersedes configuration generation, or a host cannot remain an adapter safely.
