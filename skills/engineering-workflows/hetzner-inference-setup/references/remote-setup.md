# Existing remote LiteLLM setup

Use `scripts/manage-remote-hetzner.mjs`, or the main helper with `--target remote`. Commands are `diagnose`, `status`, `plan`, `apply`, `check`, and `rollback`. The remote helper manages model routes; it never installs or restarts the server.

## Inputs and authority

Identify the management base and inference base independently, retaining reverse-proxy prefixes. Use HTTPS; loopback HTTP is accepted for an explicitly established local tunnel. Requests do not follow redirects. The selected instance must expose its compatible OpenAPI contract and model-management inventory. Read-only inventory success is not proof of administrative write permission.

Ask for protected credential file paths or environment-variable names. Administrative and inference credentials must be separate. Remote provider access uses either `--provider-key-file` (read only at apply and sent to the selected gateway) or `--provider-env NAME --remote-env-confirmed` after the operator confirms that variable exists on every remote replica. This confirmation does not itself prove that the credential works.

On native Windows, use the helper's supported protected credential intake. Where a remote helper cannot verify file ACLs, it refuses file access and requires an operator-loaded session environment source. Do not relax permissions to make a check pass.

## Inspect and plan

`diagnose` is offline. `status` performs selected authenticated inspection. For a database/API-owned new route:

```bash
node scripts/manage-remote-hetzner.mjs plan \
  --management-url https://gateway.example.com/management \
  --inference-url https://gateway.example.com/v1 \
  --management-key-file /protected/management-key \
  --approve-network management \
  --model '<ID_FROM_HETZNER_DISCOVERY>' \
  --alias hetzner-default \
  --provider-key-file /protected/hetzner-key > remote-plan.json
```

Alternatively use `--management-key-env VARIABLE_NAME`. The value never belongs in an argument. Store plans and receipts privately outside the repository because even non-secret endpoint and source paths may be identifying.

Read the result's `plan`, including its ID, target, action, expiration and inventory binding. A plan may create a new route or reuse an equivalent route. Masked provider-key readback cannot prove credential equality; reuse still needs inference verification. Conflicting aliases require a deliberate owner decision, not an automatic overwrite.

For declared GitOps ownership, use `--configuration-owner gitops`. Config-owned routes and missing prerequisites receive an operator handoff with a concrete `model_list` entry. Do not infer that a successful transient request changed the declarative source of truth.

## Apply, read back and verify

```bash
node scripts/manage-remote-hetzner.mjs apply \
  --plan remote-plan.json --approve '<PLAN_ID>' \
  --management-key-file /protected/management-key \
  --approve-network management > remote-apply.json
```

Apply rechecks the approved inventory and API contract. It uses a preallocated model ID and an ownership marker, then reads back the created model and non-secret routing parameters. A local attempt journal prevents blindly retrying a create whose response was lost. Keep this journal with the plan. An uncertain result requires exact-ID reconciliation; a matching alias alone is insufficient.

On native Windows, keep the plan and adjacent attempt journal in a canonical private directory below `%LOCALAPPDATA%`, or select such a journal path with `--attempt-file`. The directory must already have inheritance disabled and an explicit current-user-only ACL; the helper verifies its owner, permissions and identity before reading the provider key. It never changes an existing directory's permissions. Only the new journal file is restricted and verified before the management write. An unavailable ACL verifier or unsafe directory stops the operation; loading credentials through environment variables does not bypass journal protection.

The gateway, not this skill, owns encrypted provider-key persistence. Existing remote credentials are not copied into receipts. API errors are reported without echoing raw response bodies.

Verify with a distinct client credential:

```bash
node scripts/manage-remote-hetzner.mjs check \
  --inference-url https://gateway.example.com/v1 \
  --inference-key-file /protected/inference-key \
  --alias hetzner-default --approve-network inference
```

This proves only the exact reported transport. Select additional provider/tool/client checks as needed. For optional clients, read [remote-clients.md](remote-clients.md).

## Rollback

```bash
node scripts/manage-remote-hetzner.mjs rollback \
  --receipt remote-apply.json --approve '<RECEIPT_ID>' \
  --management-key-file /protected/management-key \
  --approve-network management
```

Rollback may remove only the exact route created by this run, with matching owner marker and unchanged non-secret configuration. Reused or foreign routes are never deleted. A failed inference check does not automatically delete a model or credentials. The remote API has no universal compare-and-swap transaction for alias creation: independent operators can race, so inspect and reconcile any conflict rather than assuming a distributed lock.

## Version basis

The implementation targets the observed LiteLLM model-info/create/delete contract and inspects the deployed schema. Current upstream docs may mention newer update APIs; do not substitute them blindly for the installed version. [Official model management](https://docs.litellm.ai/docs/proxy/model_management) documents database storage prerequisites, config ownership and masked credential inventory.

The route removes only the unsupported OpenAI `reasoning_effort` hint; client effort settings are ignored and the provider model keeps its own default. Actual tools are preserved. Local setup pins LiteLLM 1.101.0, whose Responses bridge omits empty tool lists. An observed 1.97.0 gateway rejected tool-free Responses/Messages requests against Hetzner. On an older remote build, successful Chat inference does not qualify these client protocols: test them separately and give the operator an upgrade/configuration handoff when needed. Never upgrade or rewrite a foreign route automatically.

The local single-provider config also uses `litellm_settings.use_chat_completions_url_for_anthropic_messages: true` to select the official Messages-to-Chat path. This is a server-wide setting, not a model CRUD field. If remote Messages responses lose visible text, give this exact setting to the operator for impact review across all providers; do not apply it through a model request or restart the shared instance.

If local journal creation or protection fails before any POST, correct that local cause and prepare a fresh reviewed plan with a new journal path; a partial owned journal may remain to prevent reuse. This recovery does not apply to an uncertain API timeout: reconcile the original model ID and owner marker before planning any further create.
