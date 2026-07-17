# Local OpenAI-Compatible Gateway

Use this only when the user wants an OpenAI-compatible Chat Completions endpoint backed by local `codex exec`, for example when a provider-backed SkillOpt path needs a chat endpoint and LiteLLM or another gateway is unavailable.

## Safety Boundary

- This implementation is loopback-only and rejects non-loopback listeners.
- Every request uses a strict Codex permission profile with minimal runtime reads, an explicit workspace deny, no workspace writes, no network, ignored host user config/rules, no selectable host profiles, and a minimal non-inherited process/shell environment. Configurations that weaken those controls fail closed.
- Do not publish or reverse-proxy it to remote clients. The local permission profile is not a PID namespace, cgroup, disk quota, or complete hostile-process boundary; remote use still requires a separate OS/container boundary with defense-in-depth host-read isolation.
- Keep auth enabled for anything except explicit loopback-only development.
- Do not store bearer tokens in tracked files.
- Do not inspect or copy Codex auth material.
- Treat this as OpenAI-compatible endpoint parity, not upstream provider parity.

## Start A Local Gateway

```bash
CODEX_GATEWAY_API_KEY=local-dev-token \
node <skill-root>/scripts/codex-local-openai-chat-gateway.mjs \
  --host 127.0.0.1 \
  --port 5050 \
  --workspace .
```

The gateway exposes:

- `GET /healthz`
- `GET /v1/healthz`
- `GET /v1/models`
- `POST /v1/chat/completions`

It invokes `codex exec` with `approval_policy=never`, strict read-isolated permissions, mandatory ignored user config/rules, no selectable Codex profile, and no prompt logging. `CODEX_OPENAI_GATEWAY_KEY` is accepted as a compatibility alias for `CODEX_GATEWAY_API_KEY`.

Use `--model` or `CODEX_MODEL` only to set the underlying Codex CLI model for the default `codex` alias; it does not rename the OpenAI-facing model alias.

Streaming is a compatibility response shape: the gateway waits for `codex exec` to finish, then emits SSE chunks. Backend failures return an ordinary JSON error before SSE starts.

## Config Notes

Prefer JSON config for anything beyond the default one-workspace setup. YAML config is accepted only for simple maps, scalar values, and arrays; it is intentionally a limited parser, not a full YAML implementation.

Model aliases are bound to one default working-directory alias, but the strict permission profile denies model/tool reads and writes there. Request-level `metadata.codex.workspace` may switch only to that model's default alias or an explicit `allowed_workspaces` entry. All workspaces must keep `allow_write: false`; `codex.ignore_user_config` and `codex.ignore_rules` must stay true, `codex.inherit_env` must stay false, and `codex.allowed_profiles` plus every model `profile` must stay empty. Do not use one gateway for aliases with different auth, resource, or ownership boundaries.

## Required Preflight

Always test both model listing and one chat completion:

```bash
node <skill-root>/scripts/probe-openai-compatible-endpoint.mjs \
  --base-url http://127.0.0.1:5050/v1 \
  --api-key local-dev-token \
  --model codex
```

Passing `/v1/models` alone is insufficient. A route can list models while generation still fails because the backend provider, gateway, or local Codex login cannot complete a chat request.

## SkillOpt Use

For text-only OpenAI-compatible provider mode, point the provider client at the gateway using the environment shape expected by the selected SkillOpt backend. The strict permission profile applies to untrusted optimized skill bodies. Keep model pins explicit:

```bash
export SKILLOPT_OPTIMIZER_MODEL=codex
export SKILLOPT_TARGET_MODEL=codex
export SKILLOPT_JUDGE_MODEL=codex
```

If the selected backend uses Azure/OpenAI-compatible settings, set only the required endpoint/auth variables for that backend and keep the actual token out of tracked files.

## Ownership and Extraction

Keep this loopback adapter inside `skillopt-setup`: SkillOpt is its only demonstrated workflow consumer. The agent executing this skill may be Codex, Cursor, or Claude Code; that does not require a gateway variant because the adapter backend remains `codex exec`.

Do not create Claude- or Cursor-backed copies for symmetry. Those would be different backends and need a concrete SkillOpt contract, version-pinned CLI behavior, and equivalent isolation and process-lifecycle proof.

Extract a reusable gateway only after a second independent consumer exists and fail-closed filesystem, process, tool, network, and inherited-environment isolation are proven. Remote publication additionally requires an infrastructure-owned OS/container boundary; route catalogs, workloads, NetworkPolicy, and secret wiring remain in the infrastructure source of truth.

## Troubleshooting

- `401`: auth is enabled; pass the same bearer token to the probe.
- `400 cwd_subdir`: the requested metadata path must be relative and must exist under the configured workspace.
- `413`: the request or compiled prompt exceeds gateway limits.
- `500 codex_process_failed`: run the Codex CLI probe and verify local login.
- `504 codex_timeout`: increase the gateway timeout only after confirming the rollout is expected to take longer.
