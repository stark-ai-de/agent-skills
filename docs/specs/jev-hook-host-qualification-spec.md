---
title: "Qualify Jev hooks for Codex and Claude Code"
slug: "jev-hook-host-qualification"
artifact_path: "docs/specs/jev-hook-host-qualification-spec.md"
mode: "standard"
status: "approved"
owner: "stark-ai-de"
repo: "agent-skills"
created: "2026-09-26"
updated: "2026-09-26"
source_request: "Extend Jev hook credential configuration and current-session catalog guidance, then qualify each available host and platform independently."
---

# Qualify Jev hooks for Codex and Claude Code

## Goal

Complete the existing agent-mediated hook integration with private credential references and actionable catalog-capture guidance. Jev considers provably available skills and MCP tools in the running session. Bounded coverage remains explicit; the integration does not claim a complete machine inventory.

## Scope

### In scope

- Current-session catalog guidance for Codex CLI and Claude Code, including verified native defaults and effective invocation restrictions.
- Private per-host key-file references, credential precedence, and status that distinguishes configuration from qualification.
- Automated regressions and staged, controlled qualification on Linux, WSL, macOS, and Windows.
- Public documentation, the original hook specification, and generated plugin projections.

### Non-goals

- Host patches, background services, additional caches, or a second host used as the active session's inventory oracle.
- Publication, Git staging, new host installations, automatic trust changes, or qualification claims for unavailable environments.
- Copying, changing, or publishing credentials or private machine provenance.

## Repo context

- Canonical implementation: `skills/skill-maintenance/jev-capability-advisor/`.
- Existing hook manager: `scripts/jev_hooks.py`; static guidance: `assets/hook-guidance.txt`.
- Preserve the existing Recommend flow, ownership journal, guarded private state, backups, atomic writes, and native host permission checks.
- Use repository Python and pnpm validation commands in an assigned worktree.
- Previous contract: [agent-mediated hooks](jev-agent-mediated-hooks-spec.md).
- Available live environments and host versions must be established during implementation; missing combinations remain open.

## User-facing behavior

A user can configure an existing key-file reference with `jev_hooks.py install --host codex|claude-code --key-file PATH`. The installer stores only the path in private host-specific configuration. A later install without this option preserves it. Status describes registration, locally observable credential readiness, historical qualification evidence, and conditions that have not been checked in the current session.

The explicitly enabled hook requires the agent to consult Jev once per new actionable task, after only minimal prerequisite checks and before task-specific skill loading, planning or questions. A failed prerequisite produces an immediate concrete fallback line before native work continues. Confirmations, explanatory follow-ups, and continuations do not trigger another consultation. Advice failures produce a short concrete reason and normal native selection continues. Explicit skill choices, Plan mode, permissions, and existing request/time limits remain binding.

## Requirements

### Functional requirements

1. Codex catalog capture uses the running model's skill list and supplied tool metadata. Claude capture uses model-visible skill cards and currently loaded MCP definitions. Files can enrich descriptions but cannot establish availability. A separately started host is not an inventory source for an existing session.
2. Documented defaults may be used only when verified for the applicable host. Unknown availability or invocation restrictions exclude the entry. Known omissions and indeterminate completeness remain visible. The executing host retains argument-specific authorization.
3. `install --key-file PATH` validates an existing readable file and stores only its reference under the selected host's guarded private state. Apply the existing conflict, atomic-write, backup, and Git-exclusion protections. Never copy or modify the key file or its contents.
4. A configured key file takes precedence over `TYPESAFE_API_KEY`. Without a configured path, the environment is used. An unreadable configured file produces a specific fallback reason without silently switching sources. Reinstalling without the option preserves the setting.
5. Status separates registration, local credentials, recorded evidence, and currently unchecked conditions. Old evidence does not qualify a changed host version or integration revision. Historical `not_verified` is not itself an unavailable result or a blanket reason to skip advice; current verifiable prerequisites and ADR-0057 remain binding. Private paths never enter provider metadata or public evidence.
6. Preserve agent-mediated `general/current` advice, existing limits, native execution controls, and fallback. The hook remains a static emitter without semantic prompt processing or provider calls. Once current prerequisites hold, consultation precedes task-specific skill loading, planning and questions; a late manual call does not satisfy automatic consultation.
7. Embed local registration JSON containing `host`, `scope` and `project_root` (`null` for user scope; the bound absolute root for project scope). The agent uses these values for status arguments, without guessing host/scope/root or sending the binding to the provider. Missing, malformed or contradictory bindings produce immediate truthful native fallback.

### Non-functional requirements

- Performance: preserve existing advice limits and five-second hook timeout; no extra cache.
- Reliability: preserve sibling settings, ownership, idempotence, and safe handling of malformed files and concurrent changes.
- Security/privacy: raw test artifacts remain private; public receipts are sanitized. CI requires no credentials. Key contents never appear in output or backups.
- Observability: distinguish configured, observed, simulated, historical, and currently unverified results.

## Design notes

Extend the current manager and integration references rather than creating a new host adapter. Use current-session evidence and a bounded catalog instead of attempting full native inventory reconstruction. Qualification belongs to a specific host version, platform, integration revision, catalog scope, and scenario set; one successful probe provides no deterministic future-call guarantee.

## Architectural decisions

- New ADR required: no.
- [ADR-0057](../adrs/0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.short.md) ([Long, canonical](../adrs/0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.long.md) · [Guide](../adrs/0057-permit-qualified-opt-in-host-advice-while-preserving-target-contracts.guide.md)) governs Jev integration.
- ADR-0029 governs assigned worktrees; ADR-0041 governs changed-contract validation.
- No accepted decision is superseded or rewritten.
- Implementation blocked on ADR acceptance: no.

## File plan

### Expected touched areas

- `skills/skill-maintenance/jev-capability-advisor/scripts/jev_hooks.py`
- Canonical skill instructions, hook guidance, and integration references.
- `skill-evals/jev-capability-advisor/` and the focused portability job if needed.
- Existing Jev documentation and `docs/specs/jev-agent-mediated-hooks-spec.md`.
- Generated `plugins/stark-ai-developer/` via the official generator only.

### Expected new files

- This approved follow-up specification.
- Focused qualification fixtures or evidence where necessary under the existing eval boundary.

### Areas not to change

- Host binaries, native trust policy, credentials, and the user's Git index.
- Unrelated skills, release metadata, and accepted ADR decisions.

## Execution plan

1. Save this approved specification before implementation.
2. Extend guarded private credential configuration and status.
3. Document same-session catalog capture and verified defaults, including exclusions and coverage reporting.
4. Add regressions and controlled qualification fixtures; run available live checks starting with WSL/Codex.
5. Synchronize projections and run required gates.
6. Review security, fallback behavior, evidence limits, and rollback.

## Source challenge

- Repository evidence: existing installer, advisor CLI, hook tests, integration guidance, and original specification.
- ADR gate: the extension remains within ADR-0057; no new ADR is required.
- Codex defines a default for implicit invocation and filters the model skill catalog: [pinned default](https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/skills/src/model.rs#L22-L28).
- Claude may defer MCP definitions: [native tool availability](https://code.claude.com/docs/en/mcp#tool-availability). Its SDK command list is not a complete catalog of an existing interactive session.
- Revised requirements: bounded skills plus MCP coverage, verified host defaults, and private credential configuration.
- Preserved requirements: static hooks, agent-controlled advice, permissions, Plan mode, limits, and native fallback.
- Missing live environments are deferred explicitly, never represented as passed.

## User verification

- Final checkpoint: the maintainer confirmed the plan and separately requested direct full implementation after saving.
- Confirmation date: 2026-09-26.
- Scope/non-goals: confirmed as above.
- Accepted unknowns: environment availability, live host behavior, and indeterminate full catalog completeness.

## Artifact plan

- Spec path: `docs/specs/jev-hook-host-qualification-spec.md` in the assigned worktree.
- Destination basis: user-provided, public storage explicitly confirmed.
- Additional confirmation needed: no.
- Spec persistence: saved; new file, no existing specification overwritten.
- ADR persistence/index updates: none.

## Validation

```bash
python3 -B -m unittest discover -s skill-evals/jev-capability-advisor -p 'test_hooks*.py' -v
pnpm run validate:jev
pnpm run validate:skills
pnpm run sync:agent-plugin
pnpm run validate:projections
pnpm run validate:plugin-evals
pnpm run lint
pnpm run lint:actions
git diff --check
```

Run relevant formatting checks. If untracked inputs prevent packaging checks, use a demonstrably byte-identical isolated candidate with its own index and document that distinction; do not stage the user's files.

### Manual checks

- Use isolated host profiles with known skills and harmless MCP tools. Separately prove registration, hook delivery, session catalog capture, actual Jev advice, and subsequent recommendation use.
- Exercise disabled and explicit-only capabilities, changed availability, missing metadata, Plan mode, missing credentials, errors, timeout, cancellation, and follow-ups. Label simulated failures explicitly.
- Record host version, platform, integration fingerprints, catalog scope, and scenario results. Keep raw artifacts private and sanitize public reports.
- Start with WSL/Codex; qualify each additional available combination independently. Live tests are explicitly initiated and CI remains offline.

## Verification checkpoint

- Scope, non-goals, assumptions, validation, risks, and ADR result reviewed: yes.
- Non-blocking unknowns accepted: yes.
- Blocking decisions: none for implementation; native host approvals remain binding for live tests.
- Spec saved: yes.
- New ADR persistence needed: no.

## Risks and rollout

Version changes and incomplete metadata can invalidate historical evidence. Treat registration and local key readiness separately from practical qualification. Roll out per tested host/platform. Remove only the manager's unchanged owned hook on failure and verify rollback. Preserve unrelated settings, user edits, credentials, and private historical evidence.

## Done when

- [x] Credential reference configuration, precedence, and failure behavior meet the requirements.
- [x] Current-session catalog guidance covers both hosts, exclusions, verified defaults, and bounded coverage.
- [x] Automated regressions and required local gates pass.
- [x] Available live checks are attempted and results separated from unavailable, simulated, or blocked scenarios.
- [x] Projections and relevant documentation are synchronized; no unsupported platform qualification is claimed.

Implementation completion requires the code and local checks. A host/platform is qualified only after its own successful live evidence.

## Assumptions and open questions

- The executing host remains authoritative for availability and concrete execution permissions.
- Existing credential ownership and native trust procedures remain in effect.
- Untested host/platform combinations and incomplete catalogs remain explicit follow-up work.
