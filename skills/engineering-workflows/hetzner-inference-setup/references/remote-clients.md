# Optional clients for a remote gateway

Remote model setup and local client setup are separate actions. Use `scripts/configure-remote-clients.mjs` only after the user selects clients and supplies a separate inference credential source. Provider and management keys must never be used here.

The helper creates owned launchers in an explicit dedicated output directory outside the repository. It preserves the client's unrelated settings and reads the protected inference source only when a launcher is actually run. Plans and apply operations contain references, not key values.

```bash
node scripts/configure-remote-clients.mjs plan \
  --output-dir /private/hetzner-clients \
  --inference-url https://gateway.example.com/v1 \
  --alias hetzner-default --clients codex,claude-code,cursor \
  --inference-key-file /protected/inference-key \
  --codex-executable /absolute/path/to/codex \
  --claude-executable /absolute/path/to/claude > client-plan.json

node scripts/configure-remote-clients.mjs apply \
  --plan client-plan.json --approve '<PLAN_ID>'
```

Use `--inference-key-env VARIABLE_NAME` for a selected session environment source. Never pass the variable's value in an argument. Inspect the helper's returned launcher paths and Cursor guidance.

- **Codex:** the launcher applies a dedicated Hetzner provider, Responses wire API, model alias and environment-backed inference credential. It does not edit global configuration. Existing incompatible provider/auth settings must not silently win.
- **Claude Code:** the launcher supplies the selected Messages gateway and inference key only to the child environment. Conflicting routing/authentication settings must be resolved explicitly rather than silently routing elsewhere. Hetzner models through this bridge are an experimental third-party compatibility path: Anthropic does not support Claude Code with non-Claude models through a gateway. Treat a failed tool/client flow as unsupported, not a reason to suppress required tools.
- **Cursor:** use the reported alias and inference base in the installed version's standard-chat BYOK UI, and enter the inference key yourself. No opaque editor-state mutation is performed. A remote URL that Cursor cannot reach is not verified by a successful request from the local terminal.

Run clients in a disposable repository to verify reading, tool calls/results, a small edit and its diff. Configuration or text-only success is insufficient. Record exact installed versions and available evidence; do not imply support for every model/client combination.

For rollback, create a fresh plan with `--operation rollback --output-dir /private/hetzner-clients`, then use `rollback --plan <file> --approve <id>`. Only unchanged owned launcher artifacts may be removed; credentials and unrelated files remain intact.

[Codex advanced configuration](https://learn.chatgpt.com/docs/config-file/config-advanced) and [Claude Code gateway documentation](https://code.claude.com/docs/en/llm-gateway) are version-sensitive contracts. Check the installed client before making stronger support claims.

Enterprise-managed Claude settings can override routing outside the readable JSON sources. On devices with server-managed policy, MDM or registry policy, have the operator verify the effective endpoint and authentication before launching; use manual mode when these sources cannot be inspected. A local settings-file check is not exhaustive enterprise-policy isolation.

Codex and Cursor retain the exact selected inference base, including custom prefixes. The Claude launcher requires a base ending in `/v1`, which maps to its Messages route. For another reverse-proxy mapping, provide manual instructions after the operator confirms the actual Messages base; the helper refuses to guess it.
