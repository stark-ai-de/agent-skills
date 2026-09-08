---
title: "Cross-platform Hetzner Inference setup skill"
slug: "hetzner-inference-setup-skill"
artifact_path: "docs/specs/hetzner-inference-setup-skill-spec.md"
mode: "standard"
status: "proposed"
owner: "stark-ai-de"
repo: "stark-ai-de/agent-skills"
created: "2026-08-21"
updated: "2026-08-26"
source_request: "Specify a public skill that connects Hetzner Inference to Codex CLI, Claude Code, and Cursor on Windows, macOS, Linux, and WSL."
---

# Cross-platform Hetzner Inference setup skill

## Goal

Implement one incubator Agent Skill, `hetzner-inference-setup`, for diagnosing, planning, configuring, verifying, operating, repairing, rotating, and rolling back a local Hetzner Inference connection.

```text
Codex CLI ─────────── Responses ────────┐
Claude Code ───────── Messages ─────────┼─> LiteLLM on 127.0.0.1 ─> Hetzner Chat Completions
Cursor standard chat ─ verified BYOK ───┘
```

LiteLLM owns protocol adaptation and the local alias. The skill owns safe installation, client adapters, lifecycle, credentials, evidence, and rollback. It does not implement a custom gateway.

## ADR gate

- [ADR-0047](../adrs/0047-use-a-local-litellm-gateway-for-hetzner-coding-clients.short.md) ([Long, canonical](../adrs/0047-use-a-local-litellm-gateway-for-hetzner-coding-clients.long.md) · [Guide](../adrs/0047-use-a-local-litellm-gateway-for-hetzner-coding-clients.guide.md))
- [ADR-0048](../adrs/0048-implement-one-portable-hetzner-setup-skill-with-client-adapters.short.md) ([Long, canonical](../adrs/0048-implement-one-portable-hetzner-setup-skill-with-client-adapters.long.md) · [Guide](../adrs/0048-implement-one-portable-hetzner-setup-skill-with-client-adapters.guide.md))
- [ADR-0049](../adrs/0049-separate-hetzner-provider-and-local-gateway-credentials.short.md) ([Long, canonical](../adrs/0049-separate-hetzner-provider-and-local-gateway-credentials.long.md) · [Guide](../adrs/0049-separate-hetzner-provider-and-local-gateway-credentials.guide.md))

All three remain Proposed. This planning PR does not implement or promote the skill and performs no live Hetzner request.

## Verified design basis

- Hetzner remains experimental; `/v1/models` is authoritative and `/v1/chat/completions` is the upstream surface.
- Codex custom providers use Responses and support command-backed auth plus `${CODEX_HOME}/<name>.config.toml` profile overlays.
- Claude Code supports an Anthropic Messages gateway.
- Cursor BYOK is limited to standard chat; custom base-URL behavior is version- and UI-gated.
- LiteLLM virtual keys require database-backed key management. The database-free workstation baseline therefore uses one disclosed administrative master key.
- Windows uses machine-local `%LOCALAPPDATA%`, not roaming AppData.

Re-check official contracts in the implementation review and whenever a relevant version changes.

## Scope

In scope:

- one concise `SKKILL.md` with dependency-free Node.js `.mjs` orchestration;
- Windows, macOS, Linux, and WSL host adapters;
- Codex CLI, Claude Code, and Cursor standard-chat adapters;
- live model discovery and bounded provider probes;
- an owned per-user Python virtual environment with an exact reviewed LiteLLM pin;
- loopback-only proxy, stable alias `hetzner-default`, and owned process lifecycle;
- separate protected provider and administrative gateway credentials;
- versioned plans and evidence, locks, atomic writes, backups for non-secret artifacts, idempotence, drift protection, and rollback;
- hosted helper tests, WSL fixtures, mocks, opt-in live proof, and skill evals.

Non-goals:

- remote hosting, containers, Kubernetes, PostgreSQL, virtual keys, multi-user routing, budgets, HA, TLS termination, or network exposure;
- a production-readiness claim or custom protocol server;
- Claude.ai or Claude Desktop routing;
- Cursor specialized features or opaque-state mutation;
- a hardcoded model catalog, global Python install, service install, login startup, or shell-profile mutation;
- secrets in generated config, global environments, roaming profiles, command arguments, or repositories.

## Finite workflows

1. **Setup or add clients:** diagnose, discover, select, plan, approve, apply, optionally start, and check.
2. **Diagnose:** inspect host, clients, dependencies, ports, ownership, and drift without secrets, writes, or network.
3. **Compatibility check:** run explicitly selected non-mutating provider, gateway, and client probes.
4. **Lifecycle:** start, stop, and report only the owned gateway process.
5. **Repair or rotate:** create and apply a new approved plan for attributable drift or one credential.
6. **Rollback:** restore or remove owned artifacts; preserve credentials unless deletion is separately approved.

Bare or ambiguous invocation must select a workflow before mutation.

## Helper contract

```text
setup-hetzner-inference.mjs diagnose|plan|apply|check|start|stop|status|repair|rotate|rollback
```

- `diagnose`, `plan`, and `status` are offline and non-mutating.
- `check`is non-mutating but may read only selected credentials and call only approved endpoints.
- Every mutation consumes a persisted, schema-versioned, hash-bound, time-bounded plan.
- Apply rejects stale state, takes a single-writer lock, and revalidates before every write or process action.
- `install-manifest.json` records owned paths, hashes, non-secret backups, permissions, process identity, and rollback actions.
- Reapplying an identical current plan is a no-op.
- User-modified files, unexpected filesystem entries, and process-identity mismatches fail closed.
- PID alone never authorizes stop or rollback.
- JSON output is deterministic and redacted.

## Adapter contracts

### Host and gateway

- Linux/WSL use XDG roots; macOS uses Application Support; Windows uses `%LOCALAPPDATA%`.
- Resolve and record executable paths and versions; reject changes between plan and apply.
- Install LiteLLM only into an owned virtual environment using an exact implementation-reviewed pin.
- Bind to `127.0.0.1:4000`; never silently change ports or kill an unknown listener.
- Generate `openai/<live-model-id>` with `use_chat_completions_api: true`.
- Disable body logging and verbose environment diagnostics by default.
- Prefer foreground/manual startup; an optional wrapper may stop only its own identity-checked process.
- WSL runs gateway and client in the same environment by default; cross-boundary routes require explicit reachability proof.

### Codex CLI

- Create `${CODEX_HOME}/hetzner.config.toml` and invoke `codex --profile hetzner`.
- Use `wire_api = "responses"`, loopback `/v1`, the stable alias, and command-backed local auth.
- Preserve user, system, project, MCP, plugin, sandbox, approval, and unrelated model layers.
- Start with a minimal tool surface, then prove streaming, tool calls/results, file read, shell, edit/patch, diff, cancellation, errors, context growth, and compaction in a disposable repository.
- Unsupported required fields or tool namespaces block compatibility; never hide failures by stripping tools.

### Claude Code

- Use the documented LLM gateway contract through an owned launcher or supported `apiKeyHelper`.
- Preserve unrelated settings, MCP, hooks, and permissions.
- Prove Messages streaming, tools/results, repository read, terminal, edit, diff, multi-turn state, cancellation, and errors.
- Disclose the third-party gateway, non-Anthropic model, and administrative local key.

### Cursor standard chat

- Target only documented standard-chat BYOK.
- Treat custom base URL as a current-version UI capability, not a durable machine-readable contract.
- Provide guided values only when the installed UI exposes compatible controls; warn when an override is global.
- Require manual Verify and return `blocked` when unsupported.
- Never mutate editor databases or opaque state.
- Keep proof at `transport_verified` unless that exact version proves the corresponding tool/repository flow without hidden routing.

## Credentials

Use two secrets:

```text
HETZNER_INFERENCE_API_KEY  upstream provider token
LITELLM_MASTER_KEY         administrative key for the loopback proxy
```

- Store them separately under protected machine-local per-user roots.
- Generate the local `sk-` key with a cryptographically secure source.
- Never describe the database-free key as scoped or least-privilege.
- Verify POSIX ownership/modes or Windows ACLs and reject symlinks, reparse redirects, malformed values, and concurrent changes.
- Inject only the minimum child environment; never place values in arguments, logs, manifests, backups, or generated config.
- Cursor may receive only the local key after explicit user action; no client receives the provider token.
- Rotation replaces only the selected value without persisting an automatic old-secret backup.
- Ordinary rollback preserves credentials. Deletion is separately approved.
- Non-loopback binding is blocked without a separate TLS and network-security decision.

## Proof model

Report `provider`, `gateway`, `codex`, `claude-code`, and `cursor` independently as:

`planned`, `configured`, `transport_verified`, `tools_verified`, `client_e2e_verified`, `verification_required`, `blocked`, or `rolled_back`.

Text is not tool proof; a function call is not a tool-result loop; one client cannot prove another; mocks are not live proof; manual evidence remains labeled manual. Evidence expires when its model, gateway, client, executable, configuration, or host boundary changes.

## Acceptance criteria

- [ ] Offline workflows read no secrets, write nothing, start or stop nothing, and make no provider request.
- [ ] Checks are bounded, selected, and non-mutating.
- [ ] Every mutation has a current plan, approval, lock, state revalidation, atomic write, ownership hash, applicable non-secret backup, and rollback action.
- [ ] Secrets remain separate, machine-local, redacted, and absent from artifacts and arguments.
- [ ] The local key is correctly generated and disclosed as administrative.
- [ ] LiteLLM is isolated and exactly pinned; Python and resolved packages are recorded.
- [ ] The gateway is authenticated, loopback-only, identity-checked, and never silently changes ports or kills processes.
- [ ] Codex and Claude Code pass disposable repository workflows before `client_e2e_verified`.
- [ ] Cursor remains guided, standard-chat-only, conservative, and opaque-state-free.
- [ ] Stale plans, concurrent writers, drift, unexpected entries, and process mismatches fail closed.
- [ ] Rollback preserves credentials and cannot stop an unknown process after PID reuse.
- [ ] Hosted tests, WSL fixtures, mocks, opt-in live proof, and skill evals cover the contract.
- [ ] The candidate remains internal until promotion evidence is reviewed.

## Validation

```bash
pnpm format:check
pnpm validate:adrs
git diff --check
```

The hosted PR workflow runs `pnpm validate`. Live provider and client checks are opt-in, use user-controlled credentials, and run only in disposable workspaces.

## Done when

The spec is indexed; ADR-0047 through ADR-0049 are Proposed triplets in the correct categories; Short and Long decisions match; no stale Hetzner ADR-0044 through ADR-0046 references remain; Windows uses `%LOCALAPPDATA%`; the database-free key is administrative rather than scoped; and all required validation passes.
