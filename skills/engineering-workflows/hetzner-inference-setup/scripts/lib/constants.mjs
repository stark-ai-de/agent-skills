export const SKILL_VERSION = "0.1.0";
export const PLAN_SCHEMA_VERSION = 1;
export const MANIFEST_SCHEMA_VERSION = 1;
export const EVIDENCE_SCHEMA_VERSION = 1;
export const PROCESS_RECEIPT_SCHEMA_VERSION = 1;
export const CREDENTIAL_CONTINUITY_SCHEME = "hmac-sha256-gateway-keyed-provider-v1";

export const PROVIDER_BASE_URL = "https://inference.hetzner.com/api/v1";
export const GATEWAY_HOST = "127.0.0.1";
export const GATEWAY_PORT = 4000;
export const GATEWAY_ALIAS = "hetzner-default";

// Reviewed against the stable PyPI release and upstream requirements on 2026-08-26.
export const LITELLM_PIN = "1.101.0";
// Proxy compatibility pins from LiteLLM v1.101.0's upstream uv.lock, reviewed 2026-09-21.
export const FASTAPI_PIN = "0.136.3";
export const STARLETTE_PIN = "1.3.1";
export const LITELLM_RUNTIME_DEPENDENCIES = Object.freeze([
  `fastapi==${FASTAPI_PIN}`,
  `starlette==${STARLETTE_PIN}`,
]);
export const PYTHON_MIN = [3, 10, 0];
export const PYTHON_MAX_EXCLUSIVE = [3, 15, 0];

export const PLAN_TTL_MS = 30 * 60 * 1000;
export const DISCOVERY_EVIDENCE_TTL_MS = 60 * 60 * 1000;
export const NETWORK_TIMEOUT_MS = 20_000;
export const PROCESS_READY_TIMEOUT_MS = 20_000;
export const PROCESS_STOP_TIMEOUT_MS = 15_000;
// Fifteen equal budget units form six non-overlapping intervals: publication
// (3), runner claim (4), termination (2), terminal publication (2), claim
// cleanup (2), and caller proofs (2).
export const PROCESS_STOP_PHASE_COUNT = 15;
export const MAX_HTTP_BYTES = 1_048_576;
export const MAX_SECRET_BYTES = 8_192;
export const MAX_MANAGED_TREE_ENTRIES = 50_000;

export const CLIENTS = Object.freeze(["codex", "claude-code", "cursor"]);
export const COMPONENTS = Object.freeze(["provider", "gateway", "codex", "claude-code", "cursor"]);
export const PROOF_STATES = Object.freeze([
  "planned",
  "configured",
  "transport_verified",
  "tools_verified",
  "client_e2e_verified",
  "verification_required",
  "blocked",
  "rolled_back",
]);
export const PLAN_WORKFLOWS = Object.freeze([
  "setup",
  "add-clients",
  "repair",
  "rotate",
  "rollback",
  "start",
  "stop",
]);

export const MUTATION_COMMANDS = Object.freeze([
  "apply",
  "repair",
  "rotate",
  "rollback",
  "start",
  "stop",
]);

export const PROVIDER_PROBES = Object.freeze([
  "models",
  "text",
  "stream",
  "tool-loop",
  "cancellation",
  "errors",
]);
export const GATEWAY_PROBES = Object.freeze([
  "models",
  "responses-text",
  "responses-tool-loop",
  "messages-text",
  "messages-tool-loop",
  "invalid-key",
]);

export const CODEX_E2E_CASES = Object.freeze([
  "responses-streaming",
  "tool-call-result",
  "file-read",
  "shell",
  "edit-patch",
  "diff",
  "cancellation",
  "errors",
  "context-growth",
  "compaction",
]);

export const CLAUDE_E2E_CASES = Object.freeze([
  "messages-streaming",
  "tool-call-result",
  "repository-read",
  "terminal",
  "edit",
  "diff",
  "multi-turn-state",
  "cancellation",
  "errors",
]);

export const SECRET_NAMES = Object.freeze({
  provider: "HETZNER_INFERENCE_API_KEY",
  gateway: "LITELLM_MASTER_KEY",
});

export const EXIT_CODES = Object.freeze({
  usage: 2,
  blocked: 3,
  stale: 4,
  conflict: 5,
  external: 6,
});
