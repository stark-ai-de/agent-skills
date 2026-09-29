# Live Proof

Live proof is opt-in. It uses user-controlled credentials, explicit endpoint approval, and disposable workspaces. Repository validation uses mocks and makes no Hetzner or client request.

## Provider

Run only selected probes against the fixed official base URL:

- `models` — nonempty authoritative model IDs;
- `text` — chat-completion response shape;
- `stream` — bounded SSE events ending in `[DONE]`;
- `tool-loop` — required function call followed by a tool-result continuation;
- `cancellation` — abort an opened stream after its first chunk;
- `errors` — invalid model maps to a bounded 4xx response.

`models` alone yields discovery/transport evidence. Successful `tool-loop` is required for `tools_verified`.

## Gateway

Start only the owned loopback process, then select:

- authenticated model listing;
- Responses text and stateless function-call/result continuation with explicit history;
- Anthropic Messages text and tool-use/result continuation;
- invalid local key rejection, followed by a successful authenticated model-list control. The pinned database-free proxy can return HTTP 400 with `no_db_connection` instead of 401/403; unrelated errors never count as rejection proof.

Before reading the administrative key, the checker requires a drift-free manifest, exact artifact and runtime hashes, unchanged executable content, and a fresh complete receipt matching the manifest-owned process identity. Authenticated model listing must contain the fixed `hetzner-default` alias. The report includes a non-secret installation binding for the exact manifest, process receipt, configuration, runtime, executable, model, and invalidation epoch it checked.

The baseline does not qualify database-backed `previous_response_id` continuation. Text/tool requests have a bounded 1024-token output budget; exhaustion is inconclusive and remains a failed probe, never evidence that the model lacks the capability. Streaming checks only transport.

Gateway success proves only the adapter. Provider and client states remain independent. Any selected failed probe stays visible in the JSON report and makes the command exit `6`.

## Disposable client workspace

Create a new local Git repository containing synthetic files and no remote, private code, credentials, user configuration, or unrelated agents. Record commands and outcomes without prompts or model output that could contain secrets.

The persisted client evidence object is schema version `1`:

```json
{
  "schemaVersion": 1,
  "kind": "hetzner-inference-client-e2e",
  "component": "codex",
  "observedAt": "<UTC timestamp>",
  "source": "manual",
  "disposableWorkspace": true,
  "hiddenRouting": false,
  "model": "<manifest model>",
  "gatewayConfigSha256": "<manifest gateway-config hash>",
  "configurationInvalidatedAt": "<manifest evidence.invalidatedAt>",
  "processBindingDigest": "<current installationBinding.processBindingDigest>",
  "executable": "<manifest executable path>",
  "executableSha256": "<manifest executable content hash>",
  "version": "<manifest executable version>",
  "host": {
    "kind": "<manifest host kind>",
    "platform": "<manifest platform>",
    "configRoot": "<manifest config root>",
    "stateRoot": "<manifest state root>",
    "wslDistribution": "<manifest WSL distribution or null>",
    "crossBoundary": false
  },
  "cases": [{ "name": "<required case>", "status": "verified" }]
}
```

Use `source: automated` only when an automated client harness actually ran the disposable end-to-end cases. Otherwise use `manual`.

Codex required case names:

`responses-streaming`, `tool-call-result`, `file-read`, `shell`, `edit-patch`, `diff`, `cancellation`, `errors`, `context-growth`, `compaction`.

Claude Code required case names:

`messages-streaming`, `tool-call-result`, `repository-read`, `terminal`, `edit`, `diff`, `multi-turn-state`, `cancellation`, `errors`.

Before accepting a client document, the checker applies the same current owned-installation and process proof gate used for gateway checks. The evidence and its nested host/case objects use closed schemas. The validator rejects duplicates, missing cases, unknown fields, wrong executable path/version/content, old configuration epochs, different process bindings, models/config hashes, future timestamps, non-disposable workspaces, hidden routing, and different host boundaries. Obtain `processBindingDigest` from the check report for the exact ready process used by the client run; any restart makes the document stale.

## Evidence receipt

For each component report:

- selected probes/cases;
- local, mocked, manual, or live source;
- exact host/executable/version/model/config binding;
- observed time;
- independent proof state;
- failures and unrun cases.

Do not commit live evidence containing user paths or operational metadata. Promotion proof must be sanitized and reviewed separately.
