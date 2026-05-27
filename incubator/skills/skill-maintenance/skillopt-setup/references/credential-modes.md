# Credential Modes

SkillOpt can use provider-backed execution, Codex CLI target rollouts, or an exploratory Codex CLI reflection path. Report only whether environment variable names are present. Never print values.

## Startup Guidance

Start by telling the user which path avoids provider credentials:

- `codex-cli-all`: easiest no-provider-credentials path. Codex CLI handles target rollouts, adapter-managed reflection, and semantic LLM judging through the user's local Codex login. Use this when the user wants to run setup and continue directly toward SkillOpt without OpenAI/Azure/Anthropic/Qwen credentials. Keep it labeled exploratory because it is not upstream-native official optimizer parity.
- `hybrid-codex-target`: Codex CLI handles target rollouts and semantic judging, but native SkillOpt optimizer/reflection still needs provider credentials. Use the `official-parity` run profile when the user wants provider-backed optimizer behavior.
- `native-provider`: provider credentials are needed for both target and optimizer work. Use the `official-parity` run profile for production-quality SkillOpt behavior.

## `native-provider`

This mode uses provider-backed target rollouts and optimizer reflection.

Recognized credential names:

- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_AUTH_MODE`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `QWEN_CHAT_BASE_URL`
- `QWEN_CHAT_MODEL`

Azure CLI auth can avoid an API key for Azure, but an Azure endpoint is still required.

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
- The mode remains exploratory until local eval proof passes and must not be described as official-parity upstream optimizer behavior.
