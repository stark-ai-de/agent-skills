# Credential Modes

SkillOpt can use provider-backed execution, Codex CLI target rollouts, or an exploratory Codex CLI reflection path. Report only whether environment variable names are present. Never print values.

## Startup Guidance

Start by telling the user which path avoids provider credentials:

- `codex-cli-all`: easiest no-provider-credentials path. Codex CLI handles target rollouts, adapter-managed reflection, and semantic LLM judging through the user's local Codex login. Use this when the user wants to run setup and continue directly toward SkillOpt without OpenAI/Azure/Anthropic/Qwen/MiniMax credentials. Keep it labeled exploratory because it is not upstream-native official optimizer parity.
- `hybrid-codex-target`: Codex CLI handles target rollouts and semantic judging, but native SkillOpt optimizer/reflection still needs provider credentials. Use the `official-parity` run profile when the user wants provider-backed optimizer behavior.
- `native-provider`: provider credentials are needed for both target and optimizer work. Use the `official-parity` run profile for production-quality SkillOpt behavior.

## `native-provider`

This mode uses provider-backed target rollouts and optimizer reflection.

Recognized credential names:

- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_AUTH_MODE`
- `AZURE_OPENAI_MANAGED_IDENTITY_CLIENT_ID`
- `OPTIMIZER_AZURE_OPENAI_ENDPOINT`
- `OPTIMIZER_AZURE_OPENAI_API_KEY`
- `OPTIMIZER_AZURE_OPENAI_AUTH_MODE`
- `AZURE_OPENAI_OPTIMIZER_ENDPOINT`
- `AZURE_OPENAI_OPTIMIZER_API_KEY`
- `AZURE_OPENAI_OPTIMIZER_AUTH_MODE`
- `TARGET_AZURE_OPENAI_ENDPOINT`
- `TARGET_AZURE_OPENAI_API_KEY`
- `TARGET_AZURE_OPENAI_AUTH_MODE`
- `AZURE_OPENAI_TARGET_ENDPOINT`
- `AZURE_OPENAI_TARGET_API_KEY`
- `AZURE_OPENAI_TARGET_AUTH_MODE`
- `OPENAI_API_KEY`
- `QWEN_CHAT_BASE_URL`
- `QWEN_CHAT_MODEL`
- `QWEN_CHAT_API_KEY`
- `OPTIMIZER_QWEN_CHAT_BASE_URL`
- `OPTIMIZER_QWEN_CHAT_MODEL`
- `OPTIMIZER_QWEN_CHAT_API_KEY`
- `TARGET_QWEN_CHAT_BASE_URL`
- `TARGET_QWEN_CHAT_MODEL`
- `TARGET_QWEN_CHAT_API_KEY`
- `MINIMAX_API_KEY`
- `MINIMAX_BASE_URL`
- `MINIMAX_MODEL`

Azure CLI or managed identity auth can avoid an API key for Azure, but an Azure endpoint is still required. For OpenAI-compatible endpoints, current upstream docs prefer `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, and `AZURE_OPENAI_AUTH_MODE=openai_compatible`; still report `OPENAI_API_KEY` presence because some local reference docs and backends mention it.

Endpoint reachability is not enough. For OpenAI-compatible routes, run `probe-openai-compatible-endpoint.mjs` and require one successful `/v1/chat/completions` response before declaring the route usable. The probe uses the raw URL only for requests and strips URL userinfo plus sensitive query and fragment values from all public diagnostics. `--strict-training-ready` performs this preflight automatically for configured `openai_chat` roles using `openai_compatible` auth; non-strict readiness does not make network calls.

Readiness validates the backend actually selected in the generated config. An unrelated `OPENAI_API_KEY`, Qwen setting, or target-only credential does not satisfy an `openai_chat` optimizer role. A selected `qwen_chat` role requires its base URL, model, and API key; endpoint and model alone are not training-ready. The installed SkillOpt clone maps `claude_chat` to a host-readable local Claude CLI rather than an Anthropic API-key backend, so this adapter marks `claude_chat` unsupported. It also rejects `claude_code_exec`, which the Agent Skills rollout adapter does not implement, and rejects `minimax_chat` for optimizer work because installed SkillOpt implements MiniMax only on its target path. Native provider mode validates optimizer and target separately; hybrid mode validates the provider-backed optimizer separately from the Codex target. Official-parity runs additionally require a semantic judge: `provider` reuses the validated optimizer provider, while `codex_cli` also requires the Codex isolation and login proofs. The heuristic judge is exploratory-only.

## Local Codex Gateway

If a provider-compatible endpoint is needed but the user does not want LiteLLM, start `codex-local-openai-chat-gateway.mjs` from this skill and probe it with `probe-openai-compatible-endpoint.mjs`. This can satisfy an OpenAI-compatible Chat Completions interface for local experiments, but it is not upstream provider parity. Keep the selected run classified by its real mode/profile and keep provider credentials/model pins explicit for official-parity runs.

## `hybrid-codex-target`

This mode uses SkillOpt native optimizer/reflection backends and runs target rollouts through `codex exec`.

Expected properties:

- `codex` is installed.
- The local Codex CLI login probe passes.
- Optimizer credentials are still present unless the run is setup-only.
- Generated configs set `target_backend: codex_exec`.

## `codex-cli-all`

This mode uses Codex CLI for target rollout, adapter-managed reflection, and the semantic LLM judge.

Expected properties:

- `codex` is installed and logged in.
- The adapter exposes `reflection_backend: codex_cli`.
- The generated config sets `judge_backend: codex_cli`, so OpenAI-model judging uses Codex login instead of `OPENAI_API_KEY`.
- The Codex CLI reflector locally coalesces reflected edits into one budget-capped patch so upstream aggregation/ranking does not need provider-backed optimizer calls.
- Provider-backed optimizer calls are avoided for target rollout, judging, reflection, aggregation, and ranking in the generated no-provider path.
- Keep `optimizer.use_slow_update: false` and `optimizer.use_meta_skill: false` in this mode. Those epoch-boundary mechanisms call upstream `chat_optimizer`, so enabling them turns the run back into a provider-backed optimizer run.
- The mode remains exploratory until local eval proof passes and must not be described as official-parity upstream optimizer behavior.
