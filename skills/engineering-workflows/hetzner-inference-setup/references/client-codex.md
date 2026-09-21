# Codex CLI Adapter

## Owned configuration

The skill creates only `${CODEX_HOME}/hetzner.config.toml`. It does not edit base `config.toml`, project configuration, MCP servers, plugins, sandbox mode, approval policy, or unrelated model providers.

The profile selects:

- model alias `hetzner-default`;
- provider base URL `http://127.0.0.1:4000/v1`;
- `wire_api = "responses"`;
- command-backed auth through the installed protected-file helper;
- no WebSocket or standalone web-search claim.

Invoke it explicitly:

```bash
codex --profile hetzner
```

The command auth helper accepts no arguments and derives only the owned local administrative gateway-key path from its installed location. It cannot be redirected to the Hetzner provider token. Current custom-provider and profile fields should be rechecked in the [official Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference) when Codex changes.

The Hetzner route removes the unsupported OpenAI `reasoning_effort` hint. Codex effort settings therefore do not control this provider model; its default reasoning behavior remains. Required tools and their schemas are retained.

## Proof

Run proof only in a disposable Git repository with no credentials, private source, remotes, or unrelated agent configuration. Start with a minimal tool surface and record the exact executable and version captured by the install manifest.

Required cases:

1. Responses streaming
2. Tool call and tool-result continuation
3. File read
4. Shell execution
5. Edit/patch
6. Diff inspection
7. Cancellation
8. Error mapping
9. Context growth
10. Compaction

Every case must exercise the selected Hetzner alias without hidden fallback. Text generation alone is only transport proof. Unsupported required fields, tool namespaces, or continuation semantics block compatibility; do not hide them by stripping tools.

Persist the evidence shape from [live-proof.md](live-proof.md), then validate it with `check --components codex --codex-evidence <file>`.

For an existing remote gateway, use [remote-clients.md](remote-clients.md) and a separate inference credential.

## Observed compatibility boundary

On 2026-09-21, Codex 0.154.0 with the discovered `Qwen/Qwen3.6-35B-A3B-FP8` model through LiteLLM 1.101.0 failed with `System message must be at the beginning`. Standalone Responses text and tool continuation passed, but both the real Codex text request and a disposable coding task were blocked. Do not call that combination Codex-compatible. LiteLLM translates developer messages into system messages; moving them earlier or downgrading their role changes instruction semantics. The [upstream issue](https://github.com/BerriAI/litellm/issues/26879) and [proposed fix](https://github.com/BerriAI/litellm/pull/39852) explain the boundary. Re-test a reviewed upstream fix or another selected live model before promoting client evidence.
