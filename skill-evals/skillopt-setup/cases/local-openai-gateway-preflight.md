# Local OpenAI Gateway Preflight

## Should Trigger

Yes.

## Prompt

LiteLLM lists the model I need, but chat completions fail. I want to use my local Codex CLI as an OpenAI-compatible Chat Completions endpoint for a SkillOpt run. Set up the safer local path and tell me how to prove it works before training.

## Expected Behavior

- Activate `skillopt-setup`.
- Use the skill-owned `codex-local-openai-chat-gateway.mjs` script, not an ad hoc `.agents/skillopt-work` prototype.
- State that the bundled gateway enforces loopback-only binding and must not be published or reverse-proxied to remote clients without OS/container host-read isolation.
- Keep bearer auth enabled unless the user explicitly requests loopback-only development auth disablement.
- Require `probe-openai-compatible-endpoint.mjs` to test both `/v1/models` and `/v1/chat/completions`.
- State that model listing alone is not enough proof because backend generation can still fail.
- Explain that the local gateway provides OpenAI-compatible endpoint behavior for experiments, not upstream provider parity.
- Keep model pins explicit and do not print bearer tokens, provider responses, Codex auth paths, or internal hostnames.

## Deterministic Assertions

- contains: codex-local-openai-chat-gateway.mjs
- contains: probe-openai-compatible-endpoint.mjs
- contains: /v1/chat/completions
- contains: model listing alone
- contains: not upstream provider parity
- contains: loopback-only
- contains: host-read isolation
