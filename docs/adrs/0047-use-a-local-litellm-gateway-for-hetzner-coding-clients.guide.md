# ADR-0047: Use a local LiteLLM gateway for Hetzner coding clients

ID: ADR-0047
Title: Use a local LiteLLM gateway for Hetzner coding clients
Status: Proposed
Date: 2026-08-26
Owner: stark-ai-de
Scope: repository
Category: runtime-platform
Tags: claude-code, codex, cursor, hetzner, litellm, provider-routing
Applies when: Configuring a local coding client to use Hetzner Inference.
Adoptable: false
Variant: Guide
Canonical variant: Long
Supersedes: None
Superseded by: None
Guide verified: 2026-08-26
Gist: Use an isolated, pinned loopback LiteLLM gateway as the default client boundary, with direct Hetzner calls reserved for discovery, probes, or an explicitly verified direct lane.

Variants: [Short](0047-use-a-local-litellm-gateway-for-hetzner-coding-clients.short.md) · [Long, canonical](0047-use-a-local-litellm-gateway-for-hetzner-coding-clients.long.md) · **Guide**

This guide is non-normative. [Long](0047-use-a-local-litellm-gateway-for-hetzner-coding-clients.long.md) is authoritative.

## How to apply

1. Detect the host, clients, Python runtime, selected port, existing listeners, and owned state without reading secrets.
2. For an approved compatibility check, query `https://inference.hetzner.com/api/v1/models` and record only non-secret metadata plus observation time.
3. Probe the selected model directly through `/v1/chat/completions`: text, streaming, one bounded function schema, cancellation, and representative errors.
4. After approval, create or reuse an owned virtual environment and install the implementation's exact LiteLLM pin. Never use `latest` or a global environment.
5. Start the owned proxy on `127.0.0.1:4000`. Report an occupied port; never kill an unknown listener or silently choose another port.
6. Generate a stable `hetzner-default` alias backed by `openai/<live-model-id>` and `use_chat_completions_api: true`.
7. Configure and verify clients independently:
   - Codex: `${CODEX_HOME}/hetzner.config.toml`, `codex --profile hetzner`, Responses, and command-backed local authentication.
   - Claude Code: its documented gateway environment or supported `apiKeyHelper`, scoped to an owned launcher.
   - Cursor: guided standard-chat setup only when the installed UI exposes a compatible base URL and model entry.
8. Keep provider, gateway, and client receipts separate.

Minimal route shape:

```yaml
model_list:
  - model_name: hetzner-default
    litellm_params:
      model: openai/<live-model-id>
      api_base: https://inference.hetzner.com/api/v1
      api_key: os.environ/HETZNER_INFERENCE_API_KEY
      use_chat_completions_api: true

general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
```

## Verification

- Confirm virtual environment, Python, LiteLLM, package inventory, config hash, and launcher identity match the manifest.
- Confirm loopback-only listening and authenticated alias discovery.
- Confirm invalid local keys fail without an upstream request or secret disclosure.
- Confirm Codex completes the supported Responses, function-call, and tool-result loop from the owned profile.
- Confirm Claude Code completes the supported Messages, repository, terminal, edit, cancellation, and error flows.
- Keep Cursor at `transport_verified` unless that exact version proves the corresponding tool and repository workflow without hidden routing.
- Never promote a component when required fields or tool results were removed or altered.
- Mock rate limits, timeouts, malformed responses, disconnects, and stale processes rather than exhausting provider limits.
- Re-run source discovery when provider, gateway, or client versions exceed the recorded baseline.

## Current references

- [Hetzner Experiments Inference API](https://docs.hetzner.com/general/company-and-policy/experiments/inference/)
- [LiteLLM Responses API](https://docs.litellm.ai/docs/response_api)
- [LiteLLM Claude Code gateway](https://docs.litellm.ai/docs/tutorials/claude_non_anthropic_models)
- [OpenAI Codex config layering](https://github.com/openai/codex/blob/main/codex-rs/config/src/loader/mod.rs)
- [OpenAI Codex profile option](https://github.com/openai/codex/blob/main/codex-rs/utils/cli/src/shared_options.rs)
- [Cursor API keys](https://docs.cursor.com/settings/api-keys)

## Revisit

Create a new ADR that supersedes this record when the decision changes. Update all variants and reciprocal metadata together.
