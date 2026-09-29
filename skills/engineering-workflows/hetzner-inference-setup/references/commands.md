# Command Reference

Set `SKILL_DIR` to the installed or repository skill directory. Plan and evidence files below must stay outside repositories containing public or shared content.

## Read-only

```bash
node "$SKILL_DIR/scripts/setup-hetzner-inference.mjs" diagnose
node "$SKILL_DIR/scripts/setup-hetzner-inference.mjs" status
node "$SKILL_DIR/scripts/setup-hetzner-inference.mjs" help
```

`diagnose` and `status` are offline. `plan` is also offline, but setup/add-client planning requires a previously saved fresh discovery document.

## Provider discovery

Use a secure prompt or secret-manager command that writes the exact token to stdin without a trailing newline. The placeholder below is a non-exported shell variable, never an argument:

```bash
printf %s "$HETZNER_KEY" | node "$SKILL_DIR/scripts/check-hetzner-inference.mjs" \
  --components provider \
  --approve-network provider \
  --provider-credential-source stdin \
  --provider-probes models > provider-discovery.json
```

Do not use `echo`, because it normally appends a newline. Clear any temporary shell variable immediately. On Windows, use a secure prompt or password-manager pipeline that can write exact bytes to stdin; do not place plaintext in PowerShell history or command arguments.

## Initial plan and apply

```bash
node "$SKILL_DIR/scripts/setup-hetzner-inference.mjs" plan \
  --workflow setup \
  --clients codex,claude-code,cursor \
  --model <id-from-discovery> \
  --discovery-evidence provider-discovery.json \
  --start-after-apply > setup-plan.json
```

Inspect the whole plan. Apply only its exact unexpired `planId`:

```bash
printf %s "$HETZNER_KEY" | node "$SKILL_DIR/scripts/setup-hetzner-inference.mjs" apply \
  --plan setup-plan.json \
  --approve <plan-id>
```

When Codex is selected, its machine-local configuration directory must already exist with owner-only protection. The plan binds that directory and preserves unrelated client settings. Follow the explicit error if a path, permission, runtime identity or process receipt has drifted; do not repair it outside a new plan. The detailed ownership and lifecycle invariants are in [security.md](security.md).

If protected credentials survived an earlier rollback and still match its completed receipt, the plan declares `providerInput: protected-file`; do not pipe a token in that case. Any pre-existing credential without that unchanged receipt blocks as unowned state instead of being adopted. Every reused gateway key must retain the exact generated `sk-` plus 43-character Base64url shape.

## Add clients

Rerun model discovery so the selected model is still live, then:

```bash
node "$SKILL_DIR/scripts/setup-hetzner-inference.mjs" plan \
  --workflow add-clients \
  --clients claude-code \
  --model <same-live-model> \
  --discovery-evidence provider-discovery.json > add-client-plan.json

node "$SKILL_DIR/scripts/setup-hetzner-inference.mjs" apply \
  --plan add-client-plan.json \
  --approve <plan-id>
```

Add-client planning unions the selected clients with those in the existing manifest. It never removes a client.

## Selected checks

Provider examples:

```bash
node "$SKILL_DIR/scripts/check-hetzner-inference.mjs" \
  --components provider \
  --approve-network provider \
  --provider-credential-source owned \
  --model <live-model-id> \
  --provider-probes text,stream,tool-loop,cancellation,errors
```

Gateway examples:

```bash
node "$SKILL_DIR/scripts/check-hetzner-inference.mjs" \
  --components gateway \
  --approve-network gateway \
  --gateway-probes models,responses-text,responses-tool-loop,messages-text,messages-tool-loop,invalid-key
```

Select both with `--components provider,gateway --approve-network provider,gateway`. Checks are sequential and independently reported. Text/tool stages are bounded to 1024 output tokens each. `probe_output_exhausted` is inconclusive and does not prove a capability is unsupported. Before a gateway check reads its administrative key, it requires the current drift-free manifest, artifact/runtime/executable identities, and a fresh complete owned process receipt. The immutable process boundary is revalidated after the key read, immediately before every selected gateway request, after every gateway/client proof, and before report publication; normal heartbeat-only receipt refreshes remain valid, and `installationBinding` records the final non-secret receipt snapshot. Authenticated model discovery must return `hetzner-default`. A failing probe does not promote the component: its failure remains in JSON and the command exits `6`.

Codex and Claude Code evidence validation makes no network request and reads no credential, but it requires the same current owned installation and fresh process proof before accepting evidence:

```bash
node "$SKILL_DIR/scripts/check-hetzner-inference.mjs" \
  --components codex,claude-code \
  --codex-evidence codex-e2e.json \
  --claude-evidence claude-e2e.json
```

Cursor remains a separate guided-only path. `check --components cursor` always returns conservative `blocked` instructions without loading the manifest, requiring a running gateway, reading credentials, or making a network request. This remains true for an absent, stopped, or drifted installation.

## Lifecycle

```bash
node "$SKILL_DIR/scripts/setup-hetzner-inference.mjs" plan --workflow start > start-plan.json
node "$SKILL_DIR/scripts/setup-hetzner-inference.mjs" start --plan start-plan.json --approve <plan-id>

node "$SKILL_DIR/scripts/setup-hetzner-inference.mjs" plan --workflow stop > stop-plan.json
node "$SKILL_DIR/scripts/setup-hetzner-inference.mjs" stop --plan stop-plan.json --approve <plan-id>
```

A fresh matching running receipt makes repeated `start` a no-op. A terminal matching receipt makes repeated `stop` a no-op. An occupied port without complete proof is always blocked.

## Repair

Get `driftDigest` from `status`. Repair accepts only manifest-owned static-artifact drift:

```bash
node "$SKILL_DIR/scripts/setup-hetzner-inference.mjs" plan \
  --workflow repair \
  --accept-drift <exact-drift-digest> > repair-plan.json

node "$SKILL_DIR/scripts/setup-hetzner-inference.mjs" repair \
  --plan repair-plan.json \
  --approve <plan-id>
```

Executable, runtime, credential, backup, namespace, unexpected-entry, or unsafe-path drift requires reviewed rollback/recovery rather than repair.

## Rotation

```bash
node "$SKILL_DIR/scripts/setup-hetzner-inference.mjs" plan \
  --workflow rotate \
  --rotate-credential gateway \
  --restart-after-rotation > rotate-plan.json

node "$SKILL_DIR/scripts/setup-hetzner-inference.mjs" rotate \
  --plan rotate-plan.json \
  --approve <plan-id>
```

For provider rotation, select `provider` and pipe the exact replacement token on stdin. The runner is stopped first. No automatic old-secret backup is created.

## Rollback

```bash
node "$SKILL_DIR/scripts/setup-hetzner-inference.mjs" plan --workflow rollback > rollback-plan.json
node "$SKILL_DIR/scripts/setup-hetzner-inference.mjs" rollback \
  --plan rollback-plan.json \
  --approve <plan-id>
```

Rollback writes a protected journal, then freshly verifies every remaining removal target before each action. An interrupted rollback resumes only with that original approved plan, even after its ordinary planning window expires; changed targets block. Both credential files remain. Reapplying a completed rollback plan verifies its receipt and is a no-op.

## Exit codes

| Code | Meaning                                                |
| ---- | ------------------------------------------------------ |
| `0`  | Completed or verified no-op                            |
| `2`  | Invalid input or unexpected local error                |
| `3`  | Missing authority, unsupported contract, or safe block |
| `4`  | Stale or expired plan/evidence/state                   |
| `5`  | Drift, mismatch, or concurrent conflict                |
| `6`  | Network or external probe failure                      |

Every stable helper error has an explicit category. Malformed user-supplied plan or evidence JSON is input (`2`), while malformed managed manifest, receipt, rollback, or other owned-state JSON is a conflict (`5`); missing Windows ACL tooling is a safe block (`3`). Unknown local exceptions use the documented unexpected-local-error path rather than borrowing a state code.

Errors contain a stable code and redacted message. A failed atomic claim—including a raw permission/removal failure after the claim—may additionally contain only a sanitized `error.recovery.path` for the preserved quarantine object. External Codex-profile claims copy the exact verified non-secret bytes to protected managed state before the post-claim boundary, so this path remains openable after an external-parent rename and appears in offline `status`. Use `status` for lock/process drift plus empty-root, residual, and sibling-quarantine details when no manifest survives; never add secret values to diagnostics.
