# Claude Code Adapter

## Owned launcher

The skill renders `bin/claude-hetzner.mjs` with the exact approved Claude executable. The launcher derives the owned local gateway-key path from its installed location; it accepts neither a credential path nor a provider/base-URL override. It does not edit Claude settings, hooks, permissions, MCP configuration, shell profiles, or global environments.

Invoke the installed launcher with paths from `diagnose` and the manifest:

```text
node <config-root>/bin/claude-hetzner.mjs -- <claude-arguments>
```

The launcher validates the protected local key, constructs a bounded child environment, and sets `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, and the model aliases for the child only. On WSL it verifies every forwarded PATH entry and each explicit or effective mutable-state namespace—including `HOME/.claude`, the default XDG directories, `CLAUDE_CONFIG_DIR`, and temporary roots—before reading that key and again immediately before spawn, so neither a nested DrvFS mount nor a later environment override can redirect Claude state or tool discovery across the boundary. It never forwards `HETZNER_INFERENCE_API_KEY` or stores the gateway key in an argument.

This route is experimental third-party compatibility, not Anthropic-supported Claude Code use: Anthropic does not support routing Claude Code to non-Claude models through a gateway. Do not claim support without the exact client flow evidence. Recheck the [official Claude Code LLM gateway contract](https://code.claude.com/docs/en/llm-gateway) when Claude Code changes.

## Proof

Use a disposable Git repository containing only synthetic files. Record the exact launcher, Claude executable/version, host boundary, model, gateway configuration epoch/hash, and whether evidence was automated or manual.

Required cases:

1. Messages streaming
2. Tool call and tool-result continuation
3. Repository read
4. Terminal execution
5. Edit
6. Diff inspection
7. Multi-turn state
8. Cancellation
9. Error mapping

Do not infer tool proof from a schema-shaped response. Persist the evidence shape from [live-proof.md](live-proof.md), then validate it with `check --components claude-code --claude-evidence <file>`.

For an existing remote gateway, use [remote-clients.md](remote-clients.md); never reuse its administrative management credential.

Enterprise-managed Claude settings can override routing outside the readable JSON sources. On devices with server-managed policy, MDM or registry policy, have the operator verify the effective endpoint and authentication before launching; use manual mode when these sources cannot be inspected. A local settings-file check is not exhaustive enterprise-policy isolation.
