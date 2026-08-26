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
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-26
Gist: Keep one cross-platform setup workflow and isolate provider, gateway, client, credential, lifecycle, and operating-system differences behind explicit adapters.

Variants: [Short](0048-implement-one-portable-hetzner-setup-skill-with-client-adapters.short.md) · [Long, canonical](0048-implement-one-portable-hetzner-setup-skill-with-client-adapters.long.md) · **Guide**

This guide is non-normative. [Long](0048-implement-one-portable-hetzner-setup-skill-with-client-adapters.long.md) is authoritative.

## How to apply

Use this candidate layout:

```text
incubator/skills/engineering-workflows/hetzner-inference-setup/
├── SKILL.md
├── references/
│   ├── architecture.md
│   ├── client-claude-code.md
│   ├── client-codex.md
│   ├── client-cursor.md
│   ├── security.md
│   └── troubleshooting.md
├── assets/templates/
└── scripts/
    ├── check-hetzner-inference.mjs
    ├── setup-hetzner-inference.mjs
    └── lib/
        ├── clients/
        ├── credentials/
        ├── hosts/
        └── lifecycle/
```

Expose deterministic commands:

```text
diagnose  inspect host, clients, dependencies, ports, and owned state without secrets
plan      render a versioned, hash-bound change plan without writing
apply     execute an approved current plan and write an ownership manifest
check     run selected non-mutating provider, gateway, and client probes
start     start only the owned gateway process
stop      stop only the owned gateway process
status    report health, drift, and evidence without mutation
repair    apply an approved current repair plan
rotate    replace one selected credential through an approved current plan
rollback  restore or remove owned artifacts; preserve credentials by default
```

Adapter ownership:

- `provider`: model discovery and direct probes.
- `gateway`: virtual environment, exact pin, proxy config, alias, launch, and identity.
- `clients/codex`: profile overlay, command-backed auth, and Responses acceptance.
- `clients/claude-code`: owned launcher or supported settings and Messages acceptance.
- `clients/cursor`: guided instructions and manual receipt only.
- `hosts/*`: local roots, quoting, permissions, executable discovery, and process behavior.
- `credentials`: protected storage, generation, redaction, rotation, and deletion.
- `lifecycle`: lock, process receipt, graceful stop, and bounded escalation.

A plan includes schema version, observed-state digest, creation time, host, clients, model, exact dependency pin, port, intended paths, previous and new hashes, applicable non-secret backups, process actions, approvals, and rollback actions. Apply rejects stale plans instead of recomputing intent.

## Verification

- Run pure Node tests on hosted Windows, macOS, and Linux.
- Exercise Windows without Bash and Unix without PowerShell.
- Prove `diagnose`, `plan`, and `status` create nothing, install nothing, start nothing, read no secrets, and make no provider request.
- Prove `check` is non-mutating and uses only selected credentials and bounded endpoints.
- Prove identical apply is a no-op.
- Prove stale plans, concurrent writers, changed files, symlinks or reparse points, and mismatched process identities fail closed.
- Prove stop and rollback cannot terminate an unknown process after PID reuse.
- Prove Codex uses profile layering and preserves unrelated user, project, MCP, plugin, sandbox, and approval settings.
- Prove Claude Code preserves unrelated settings, hooks, permissions, and MCP configuration.
- Prove Cursor produces guided output and no opaque-state writes.
- Prove WSL blocks an unverified cross-boundary loopback route.
- Run targeted adapter and ADR validation before the required hosted aggregate.

## Current references

- [ADR-0014](0014-prefer-node-skill-helper-scripts.short.md) ([Long, canonical](0014-prefer-node-skill-helper-scripts.long.md) · [Guide](0014-prefer-node-skill-helper-scripts.guide.md))
- [ADR-0021](0021-place-portable-skills-in-workflow-categories.short.md) ([Long, canonical](0021-place-portable-skills-in-workflow-categories.long.md) · [Guide](0021-place-portable-skills-in-workflow-categories.guide.md))
- [ADR-0038](0038-expose-finite-skill-workflows-and-permit-intent-bound-agent-selection.short.md) ([Long, canonical](0038-expose-finite-skill-workflows-and-permit-intent-bound-agent-selection.long.md) · [Guide](0038-expose-finite-skill-workflows-and-permit-intent-bound-agent-selection.guide.md))
- [ADR-0043](0043-package-portable-agent-plugins-and-separate-client-adapters.short.md) ([Long, canonical](0043-package-portable-agent-plugins-and-separate-client-adapters.long.md) · [Guide](0043-package-portable-agent-plugins-and-separate-client-adapters.guide.md))
- [`../specs/hetzner-inference-setup-skill-spec.md`](../specs/hetzner-inference-setup-skill-spec.md)

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all variants and reciprocal metadata together.
