import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GATEWAY_ALIAS,
  GATEWAY_HOST,
  GATEWAY_PORT,
  PROCESS_STOP_PHASE_COUNT,
  PROVIDER_BASE_URL,
} from "./constants.mjs";
import { sha256 } from "./json.mjs";
import { invariant } from "./errors.mjs";

const assetRoot = fileURLToPath(new URL("../../assets/templates/", import.meta.url));

function within(target, boundary) {
  const relative = path.relative(path.resolve(boundary), path.resolve(target));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function externalArtifactParents(paths, targets) {
  const roots = [paths.configRoot, paths.stateRoot];
  return [
    ...new Set(
      targets
        .map((target) => path.resolve(path.dirname(target)))
        .filter((parent) => !roots.some((root) => within(parent, root))),
    ),
  ].sort();
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

function tomlString(value) {
  return JSON.stringify(String(value));
}

function tomlArray(values) {
  return `[${values.map(tomlString).join(", ")}]`;
}

export function renderGatewayConfig(model) {
  return [
    "model_list:",
    `  - model_name: ${yamlString(GATEWAY_ALIAS)}`,
    "    litellm_params:",
    `      model: ${yamlString(`openai/${model}`)}`,
    `      api_base: ${yamlString(PROVIDER_BASE_URL)}`,
    '      api_key: "os.environ/HETZNER_INFERENCE_API_KEY"',
    "      use_chat_completions_api: true",
    '      additional_drop_params: ["reasoning_effort"]',
    "general_settings:",
    '  master_key: "os.environ/LITELLM_MASTER_KEY"',
    "litellm_settings:",
    "  use_chat_completions_url_for_anthropic_messages: true",
    "  drop_params: false",
    "  redact_messages_in_exceptions: true",
    "  redact_user_api_key_info: true",
    "  set_verbose: false",
    "  turn_off_message_logging: true",
    "",
  ].join("\n");
}

export function renderCodexProfile(paths, nodeExecutable) {
  return [
    `model = ${tomlString(GATEWAY_ALIAS)}`,
    'model_provider = "hetzner"',
    "",
    "[model_providers.hetzner]",
    'name = "Hetzner Inference via local LiteLLM"',
    `base_url = ${tomlString(`http://${GATEWAY_HOST}:${GATEWAY_PORT}/v1`)}`,
    'wire_api = "responses"',
    "supports_websockets = false",
    "supports_standalone_web_search = false",
    "",
    "[model_providers.hetzner.auth]",
    `command = ${tomlString(nodeExecutable)}`,
    `args = ${tomlArray([paths.credentialHelper])}`,
    "refresh_interval_ms = 0",
    "timeout_ms = 5000",
    "",
  ].join("\n");
}

export function requireCodexProfileVersion(version) {
  const match = /^codex-cli (\d+)\.(\d+)\.(\d+)$/.exec(String(version).trim());
  const parts = match?.slice(1).map(Number);
  invariant(
    parts && (parts[0] > 0 || parts[1] >= 134),
    "codex_version_unsupported",
    "The owned profile requires a stable Codex CLI >=0.134.0; use manual guidance for an older or unrecognized client",
  );
}

function renderTemplateBindings(template, bindings, label) {
  let rendered = template;
  for (const [name, value] of Object.entries(bindings)) {
    if (typeof value !== "string" || !path.isAbsolute(value)) {
      throw new Error(`${label} requires an absolute ${name}`);
    }
    const marker = JSON.stringify(`__${name}__`);
    if (rendered.split(marker).length !== 2) {
      throw new Error(`${label} template marker ${name} is missing or duplicated`);
    }
    rendered = rendered.replace(marker, () => JSON.stringify(value));
  }
  return rendered;
}

function renderPositiveIntegerBinding(template, name, value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} requires a positive integer ${name}`);
  }
  const marker = JSON.stringify(`__${name}__`);
  if (template.split(marker).length !== 2) {
    throw new Error(`${label} template marker ${name} is missing or duplicated`);
  }
  return template.replace(marker, JSON.stringify(value));
}

export function renderCredentialHelper(template, paths) {
  return renderTemplateBindings(
    template,
    { CONFIG_ROOT: paths.configRoot, STATE_ROOT: paths.stateRoot },
    "Credential helper",
  );
}

export function renderClaudeLauncher(template, claudeExecutable, paths) {
  return renderTemplateBindings(
    template,
    {
      CLAUDE_EXECUTABLE: claudeExecutable,
      CONFIG_ROOT: paths.configRoot,
      STATE_ROOT: paths.stateRoot,
    },
    "Claude launcher",
  );
}

export function renderGatewayRunner(template, paths, nodeExecutable) {
  const renderedPaths = renderTemplateBindings(
    template,
    {
      CONFIG_ROOT: paths.configRoot,
      NODE_EXECUTABLE: nodeExecutable,
      RUNNER_SCRIPT: paths.gatewayRunner,
      STATE_ROOT: paths.stateRoot,
    },
    "Gateway runner",
  );
  return renderPositiveIntegerBinding(
    renderedPaths,
    "PROCESS_STOP_PHASE_COUNT",
    PROCESS_STOP_PHASE_COUNT,
    "Gateway runner",
  );
}

export function gatewayExecutable(paths, host) {
  const pathApi = host.pathStyle === "win32" ? path.win32 : path.posix;
  return host.platform === "win32"
    ? pathApi.join(paths.venvRoot, "Scripts", "litellm.exe")
    : pathApi.join(paths.venvRoot, "bin", "litellm");
}

export function venvPythonExecutable(paths, host) {
  const pathApi = host.pathStyle === "win32" ? path.win32 : path.posix;
  return host.platform === "win32"
    ? pathApi.join(paths.venvRoot, "Scripts", "python.exe")
    : pathApi.join(paths.venvRoot, "bin", "python");
}

export async function loadTemplateAssets() {
  const names = [
    "read-credential.mjs",
    "protected-file.mjs",
    "claude-hetzner.mjs",
    "gateway-runner.mjs",
  ];
  const result = {};
  for (const name of names) {
    const source = path.join(assetRoot, name);
    const content = await fs.promises.readFile(source, "utf8");
    result[name] = { source, content, sha256: sha256(content) };
  }
  return result;
}

export async function desiredStaticFiles({
  claudeExecutable,
  clients,
  host,
  model,
  paths,
  nodeExecutable,
}) {
  const assets = await loadTemplateAssets();
  const files = {
    [paths.credentialHelper]: {
      content: renderCredentialHelper(assets["read-credential.mjs"].content, paths),
      mode: 0o700,
      role: "credential-helper",
    },
    [paths.protectedFileHelper]: {
      content: assets["protected-file.mjs"].content,
      mode: 0o700,
      role: "protected-file-helper",
    },
    [paths.gatewayRunner]: {
      content: renderGatewayRunner(assets["gateway-runner.mjs"].content, paths, nodeExecutable),
      mode: 0o700,
      role: "gateway-runner",
    },
    [paths.gatewayConfig]: {
      content: renderGatewayConfig(model),
      mode: 0o600,
      role: "gateway-config",
    },
  };

  if (clients.includes("codex")) {
    files[paths.codexProfile] = {
      content: renderCodexProfile(paths, nodeExecutable),
      mode: 0o600,
      role: "codex-profile",
    };
  }
  if (clients.includes("claude-code")) {
    files[paths.claudeLauncher] = {
      content: renderClaudeLauncher(assets["claude-hetzner.mjs"].content, claudeExecutable, paths),
      mode: 0o700,
      role: "claude-code-launcher",
    };
  }

  return Object.fromEntries(
    Object.entries(files)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([target, file]) => [
        target,
        { ...file, sha256: sha256(file.content), host: host.kind },
      ]),
  );
}

export function ownedArtifactContracts(paths, clients) {
  const contracts = new Map([
    [paths.credentialHelper, { mode: 0o700, role: "credential-helper" }],
    [paths.protectedFileHelper, { mode: 0o700, role: "protected-file-helper" }],
    [paths.gatewayRunner, { mode: 0o700, role: "gateway-runner" }],
    [paths.gatewayConfig, { mode: 0o600, role: "gateway-config" }],
  ]);
  if (clients.includes("codex")) {
    contracts.set(paths.codexProfile, { mode: 0o600, role: "codex-profile" });
  }
  if (clients.includes("claude-code")) {
    contracts.set(paths.claudeLauncher, { mode: 0o700, role: "claude-code-launcher" });
  }
  return contracts;
}

export function cursorGuidance() {
  return {
    component: "cursor",
    state: "blocked",
    reason:
      "Current public Cursor BYOK documentation does not define a durable custom loopback base-URL contract.",
    safeInspection: [
      "Open Cursor Settings > Models.",
      "Confirm the installed version visibly exposes an OpenAI-compatible custom base URL and model entry.",
      `If it does, enter http://${GATEWAY_HOST}:${GATEWAY_PORT}/v1, ${GATEWAY_ALIAS}, and only the local administrative key.`,
      "Click Verify manually and record the exact Cursor version and result.",
    ],
    warnings: [
      "Custom API keys apply only to standard chat.",
      "Cursor documents that BYOK requests pass through Cursor servers for final prompt construction.",
      "Never enter the Hetzner provider token.",
      "Do not edit Cursor databases or opaque state.",
    ],
  };
}
