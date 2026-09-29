---
name: hetzner-inference-setup
description: Set up, check, or repair Hetzner Inference through a local LiteLLM Proxy or an existing remote LiteLLM gateway, with optional Codex, Claude Code, or Cursor clients. Use when the user requests Hetzner API setup, model discovery, gateway configuration, or step-by-step instructions without sharing keys. Do not use to provision cloud infrastructure or configure unrelated providers.
license: Apache-2.0
metadata:
  author: stark-ai-de
  category: engineering-workflows
  version: "0.1.0"
---

# Hetzner Inference Setup

## Goal

Connect Hetzner Inference through the official LiteLLM Proxy. Choose a local proxy or an existing remote gateway; automate the selected setup or explain how the user can do it themselves. This skill is independently installable and is not bundled into the stark AI Developer plugin.

## When to use

Use for Hetzner model discovery, local proxy setup/lifecycle, adding Hetzner to an existing remote LiteLLM instance, selected clients, or manual setup instructions.

## When not to use

Do not provision remote infrastructure, migrate databases, configure unrelated providers, or promise unsupported coding-client features.

## Inputs to inspect

Reuse explicit intent and existing authorization. Ask only for missing choices:

1. **Target:** a local LiteLLM proxy, or an existing remote instance? For remote, identify management and inference URLs separately.
2. **Execution:** autonomous setup, or a manual CLI/UI guide with no credential access?
3. **Clients:** gateway only, Codex CLI, Claude Code, Cursor standard chat, or a selected combination?
4. **Sources:** where may the agent read the Hetzner token, remote management credential and separate inference key? Ask for locations or variable names, not values in chat.

For a bare invocation, present the finite workflows below and ask which outcome is wanted. Do not repeatedly ask for permission already supplied; map the authorized concrete plan to the helper's approval flag. A request for instructions never authorizes setup.

| Workflow             | Local                                                        | Existing remote                                                             |
| -------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Setup or add clients | Diagnose, discover, plan, apply, optionally start and check  | Inspect, plan, add/reuse model, read back, check; optional client launchers |
| Diagnose             | Offline host, versions and owned-state inspection            | Offline options/help; authorized management inspection separately           |
| Compatibility check  | Selected provider, gateway and client probes                 | Selected inference check; client proof separately                           |
| Lifecycle            | Start, stop and status of the owned local process            | Existing server lifecycle belongs to its operator                           |
| Repair or rotate     | Current plan for attributable drift or one credential        | Owner-run/API-specific instructions; do not overwrite foreign routes        |
| Rollback             | Restore/remove unchanged owned artifacts; retain credentials | Remove only the receipt-owned unchanged model or client launchers           |

## Workflow

### Manual, either target

Read [manual-setup.md](references/manual-setup.md). Optionally render the pure guide:

```bash
node scripts/setup-hetzner-inference.mjs plan --target local --mode manual
node scripts/setup-hetzner-inference.mjs plan --target remote --mode manual
```

Provide short numbered steps, placeholders, expected results and a verification step. Do not read keys, contact the target, install dependencies, or apply configuration. The user enters secrets locally or in the remote UI. Missing admin access does not become available through a UI fallback. UI names and supported custom-provider fields must match the installed version.

### Autonomous local

Read [commands.md](references/commands.md) and [security.md](references/security.md). Diagnose first, approve only the needed provider discovery/probes, select a discovered model, then persist/review the plan and apply its exact ID. Reuse task authorization when it covers the displayed operations. LiteLLM runs in an owned virtual environment on `127.0.0.1:4000`; do not replace an unknown listener. Native NixOS currently needs a separate packaging adapter; use the documented remote/manual alternative instead of bypassing the protected runner environment. Use [architecture.md](references/architecture.md) for the ownership and lifecycle details.

### Autonomous existing remote

Read [remote-setup.md](references/remote-setup.md). Inspect the deployed API contract, management permissions and model ownership. Keep management and inference credentials separate. Add an API-managed route or reuse a matching route; route collisions, missing prerequisites and config-owned models need a concrete handoff. A remote `os.environ/...` reference must exist on the server. After a write, read back its ID/configuration and verify inference separately. Never infer success from creation alone or blindly retry an uncertain write.

### Optional clients

Use [client-codex.md](references/client-codex.md), [client-claude-code.md](references/client-claude-code.md), or [client-cursor.md](references/client-cursor.md) only for selected clients. For remote launchers, follow [remote-clients.md](references/remote-clients.md). Preserve unrelated settings. Codex uses Responses; Claude Code uses Messages; Cursor is guided standard-chat BYOK only when the installed UI supports the route. A successful configuration is not an end-to-end client test.

## Safety rules

- The Hetzner token stays behind the gateway. Remote clients receive an inference key, never the remote administrative key. The database-free local master key is administrative and is described honestly.
- Credential values never belong in arguments, generated profiles, plans, logs, evidence or repositories. Use protected machine-local files or explicitly selected session environment sources. Remote secret storage belongs to the selected gateway.
- Mutation helpers take a current plan and explicit plan ID. Do not recompute a changed plan and apply it under old authority. Preserve user edits and unrelated processes/routes.
- Keep local `diagnose`, `plan` and `status` offline. Authenticated remote planning is a read-only network operation and must be selected explicitly.
- Ordinary rollback preserves credentials. Remote deployment, Kubernetes changes, database migrations, TLS provisioning and remote server restarts are outside this skill.

## Completion criteria

Use [live-proof.md](references/live-proof.md) for independent provider, gateway and client evidence. Report `planned`, `configured`, `transport_verified`, `tools_verified`, `client_e2e_verified`, `verification_required`, `blocked` or `rolled_back` only where supported by the actual evidence. Distinguish mocks, automated platform tests, real requests and manual observations. Refresh evidence when the relevant model, version, configuration or host changes.

## Output format

Return the selected target/mode, model alias and ID, actions taken or manual steps, non-secret credential-source descriptions, independent verification results, rollback instructions and remaining blockers. A refused key or unavailable API should still yield useful instructions. Read [troubleshooting.md](references/troubleshooting.md) only for an observed failure.

## Failure modes

Missing authority, unavailable model discovery, configuration ownership conflicts, unsafe files, stale plans and uncertain API writes block the affected action. Report the exact safe next step. Give manual instructions when access is declined.

## References

Load only the selected workflow references linked above; [troubleshooting.md](references/troubleshooting.md) covers observed failures and [live-proof.md](references/live-proof.md) defines evidence.

## Scripts

Paths above are relative to this installed skill. `setup-hetzner-inference.mjs` exposes local commands and target/mode dispatch; `check-hetzner-inference.mjs` runs selected local/provider probes. `manage-remote-hetzner.mjs` owns existing-gateway model operations. `configure-remote-clients.mjs` owns optional local launchers for a remote endpoint. Manual guidance has no side effects. Installation, apply, lifecycle, rotation and rollback helpers modify explicitly owned state as documented in their references.
