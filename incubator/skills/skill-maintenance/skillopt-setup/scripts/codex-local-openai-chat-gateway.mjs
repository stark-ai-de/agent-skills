#!/usr/bin/env node
import { spawn } from "node:child_process";
import { randomUUID, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const version = "0.1.0";
const safeSandboxes = new Set(["read-only"]);
const gatewayPermissionProfile = "codex_gateway_text";
const allowedMessageRoles = new Set(["system", "developer", "user", "assistant"]);
const defaultBodyLimitBytes = 1024 * 1024;
const defaultPromptLimitChars = 200_000;
const defaultMaxStdoutBytes = 10 * 1024 * 1024;
const defaultMaxStderrBytes = 64 * 1024;
const blockedConfigKeys = new Set(["__proto__", "prototype", "constructor"]);

class GatewayError extends Error {
  constructor(status, message, code, param = null, type = "invalid_request_error") {
    super(message);
    this.status = status;
    this.code = code;
    this.param = param;
    this.type = type;
  }
}

class ProcessLimiter {
  constructor(maxActive, maxQueue) {
    this.active = 0;
    this.maxActive = Math.max(1, maxActive);
    this.maxQueue = Math.max(0, maxQueue);
    this.queue = [];
  }

  acquire(signal) {
    if (signal?.aborted) {
      return Promise.reject(new GatewayError(499, "Client disconnected", "client_disconnected"));
    }

    if (this.active < this.maxActive) {
      this.active += 1;
      return Promise.resolve(() => this.release());
    }

    if (this.queue.length >= this.maxQueue) {
      return Promise.reject(
        new GatewayError(
          429,
          "Gateway concurrency limit reached",
          "concurrency_limit_reached",
          null,
          "rate_limit_error",
        ),
      );
    }

    return new Promise((resolve, reject) => {
      const entry = { resolve, reject, signal, onAbort: null };
      entry.onAbort = () => {
        this.queue = this.queue.filter((item) => item !== entry);
        reject(new GatewayError(499, "Client disconnected", "client_disconnected"));
      };
      signal?.addEventListener("abort", entry.onAbort, { once: true });
      this.queue.push(entry);
    });
  }

  release() {
    this.active = Math.max(0, this.active - 1);
    while (this.queue.length > 0) {
      const entry = this.queue.shift();
      entry.signal?.removeEventListener("abort", entry.onAbort);
      if (entry.signal?.aborted) continue;
      this.active += 1;
      entry.resolve(() => this.release());
      return;
    }
  }
}

function printUsage() {
  console.log(`Usage: node codex-local-openai-chat-gateway.mjs [options]

Starts a local OpenAI-compatible Chat Completions subset that invokes codex exec.

Options:
  --config <path>      JSON or limited YAML config file
  --host <host>        Bind host, default CODEX_GATEWAY_HOST or 127.0.0.1
  --port <port>        Bind port, default CODEX_GATEWAY_PORT or 5050
  --api-key <token>    Bearer token. Also supported: CODEX_GATEWAY_API_KEY
                       or CODEX_OPENAI_GATEWAY_KEY
  --auth-disabled      Disable auth for explicit local-only development
  --codex-bin <path>   Codex binary, default CODEX_BIN or codex
  --model <name>       Codex model for the default "codex" alias
  --workspace <path>   Workspace path for the default workspace alias
  --help               Show this help

Key env vars:
  CODEX_GATEWAY_CONFIG, CODEX_GATEWAY_HOST, CODEX_GATEWAY_PORT
  CODEX_GATEWAY_API_KEY, CODEX_OPENAI_GATEWAY_KEY, CODEX_GATEWAY_AUTH=disabled
  CODEX_GATEWAY_REQUEST_LOGGING=1
  CODEX_BIN, CODEX_MODEL, CODEX_GATEWAY_WORKSPACE
`);
}

function parseArgs(argv) {
  const args = {};
  const valueAfter = (index, option) => {
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new GatewayError(2, `${option} requires a value`, "invalid_cli_argument");
    }
    return value;
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--config") args.config = valueAfter(index++, arg);
    else if (arg === "--host") args.host = valueAfter(index++, arg);
    else if (arg === "--port") args.port = Number(valueAfter(index++, arg));
    else if (arg === "--api-key") args.apiKey = valueAfter(index++, arg);
    else if (arg === "--auth-disabled") args.authDisabled = true;
    else if (arg === "--codex-bin") args.codexBin = valueAfter(index++, arg);
    else if (arg === "--model") args.model = valueAfter(index++, arg);
    else if (arg === "--workspace") args.workspace = valueAfter(index++, arg);
    else throw new GatewayError(2, `Unknown argument: ${arg}`, "invalid_cli_argument");
  }
  return args;
}

function defaultConfig() {
  return {
    server: {
      host: "127.0.0.1",
      port: 5050,
      request_body_limit_bytes: defaultBodyLimitBytes,
      max_prompt_chars: defaultPromptLimitChars,
      cors: { enabled: false, allowed_origins: [] },
    },
    auth: { enabled: true, bearer_tokens: [] },
    codex: {
      binary: "codex",
      default_timeout_seconds: 300,
      max_timeout_seconds: 900,
      max_concurrent_processes: 1,
      max_queue_length: 10,
      kill_grace_seconds: 3,
      max_stdout_bytes: defaultMaxStdoutBytes,
      max_stderr_bytes: defaultMaxStderrBytes,
      allowed_profiles: [],
      approval_policy: "never",
      ignore_user_config: true,
      ignore_rules: true,
      skip_git_repo_check: true,
      inherit_env: false,
      include_usage: false,
    },
    workspaces: {
      default: { path: process.cwd(), allow_write: false },
    },
    models: {
      codex: {
        codex_model: process.env.CODEX_MODEL || "gpt-5.5",
        workspace: "default",
        sandbox: "read-only",
        profile: "",
      },
    },
    features: {
      streaming: true,
      response_format_json_schema: true,
      image_inputs: false,
      prompt_logging: false,
      request_logging: false,
    },
  };
}

function readConfigFile(file) {
  if (!file) return {};
  const text = fs.readFileSync(file, "utf8");
  if (file.endsWith(".json")) return JSON.parse(text);
  if (file.endsWith(".yaml") || file.endsWith(".yml")) return parseYamlSubset(text);
  throw new Error(`Unsupported config extension for ${file}; use .json, .yaml, or .yml`);
}

function mergeConfig(base, override) {
  if (!override || typeof override !== "object" || Array.isArray(override)) return base;
  const merged = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (blockedConfigKeys.has(key)) {
      throw new Error(`Unsupported config key: ${key}`);
    }
    rejectBlockedConfigKeys(value);
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === "object" &&
      !Array.isArray(base[key])
    ) {
      merged[key] = mergeConfig(base[key], value);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

function rejectBlockedConfigKeys(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (blockedConfigKeys.has(key)) {
      throw new Error(`Unsupported config key: ${key}`);
    }
    rejectBlockedConfigKeys(child);
  }
}

function applyEnvAndArgs(config, args) {
  const next = structuredClone(config);
  const env = process.env;
  if (env.CODEX_GATEWAY_HOST) next.server.host = env.CODEX_GATEWAY_HOST;
  if (env.CODEX_GATEWAY_PORT) next.server.port = Number(env.CODEX_GATEWAY_PORT);
  if (env.CODEX_BIN) next.codex.binary = env.CODEX_BIN;
  if (env.CODEX_MODEL) next.models.codex.codex_model = env.CODEX_MODEL;
  if (env.CODEX_GATEWAY_WORKSPACE) next.workspaces.default.path = env.CODEX_GATEWAY_WORKSPACE;
  const envApiKey = env.CODEX_GATEWAY_API_KEY || env.CODEX_OPENAI_GATEWAY_KEY;
  if (envApiKey) next.auth.bearer_tokens = [envApiKey];
  if (env.CODEX_GATEWAY_AUTH === "disabled") next.auth.enabled = false;
  if (env.CODEX_GATEWAY_REQUEST_LOGGING === "1") next.features.request_logging = true;
  if (env.CODEX_GATEWAY_INCLUDE_USAGE === "1") next.codex.include_usage = true;
  if (env.CODEX_GATEWAY_INHERIT_ENV === "1") next.codex.inherit_env = true;
  if (env.CODEX_APPROVAL_POLICY) next.codex.approval_policy = env.CODEX_APPROVAL_POLICY;

  if (args.host) next.server.host = args.host;
  if (Number.isFinite(args.port)) next.server.port = args.port;
  if (args.codexBin) next.codex.binary = args.codexBin;
  if (args.model) next.models.codex.codex_model = args.model;
  if (args.workspace) next.workspaces.default.path = args.workspace;
  if (args.apiKey) next.auth.bearer_tokens = [args.apiKey];
  if (args.authDisabled) next.auth.enabled = false;
  return next;
}

function isLoopbackHost(host) {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function ensurePositiveInteger(value, name) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function ensureNonNegativeInteger(value, name) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return value;
}

function ensureBoolean(value, name, fallback) {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "boolean") {
    throw new Error(`${name} must be a boolean`);
  }
  return value;
}

function normalizeConfig(config) {
  config.server.port = ensurePositiveInteger(config.server.port, "server.port");
  if (!Number.isInteger(config.server.request_body_limit_bytes)) {
    config.server.request_body_limit_bytes = defaultBodyLimitBytes;
  }
  config.server.request_body_limit_bytes = ensurePositiveInteger(
    config.server.request_body_limit_bytes,
    "server.request_body_limit_bytes",
  );
  if (!Number.isInteger(config.server.max_prompt_chars)) {
    config.server.max_prompt_chars = defaultPromptLimitChars;
  }
  config.server.max_prompt_chars = ensurePositiveInteger(
    config.server.max_prompt_chars,
    "server.max_prompt_chars",
  );
  config.server.cors.enabled = ensureBoolean(config.server.cors.enabled, "server.cors.enabled");
  config.auth.enabled = ensureBoolean(config.auth.enabled, "auth.enabled");
  for (const key of [
    "ignore_user_config",
    "ignore_rules",
    "skip_git_repo_check",
    "inherit_env",
    "include_usage",
  ]) {
    config.codex[key] = ensureBoolean(config.codex[key], `codex.${key}`);
  }
  if (!config.codex.ignore_user_config) {
    throw new Error("codex.ignore_user_config=false is unsupported for the strict gateway");
  }
  if (!config.codex.ignore_rules) {
    throw new Error("codex.ignore_rules=false is unsupported for the strict gateway");
  }
  if (config.codex.inherit_env) {
    throw new Error("codex.inherit_env=true is unsupported for the strict gateway");
  }
  for (const key of [
    "streaming",
    "response_format_json_schema",
    "image_inputs",
    "prompt_logging",
    "request_logging",
  ]) {
    config.features[key] = ensureBoolean(config.features[key], `features.${key}`);
  }
  if (!isLoopbackHost(config.server.host)) {
    throw new Error(
      "Non-loopback bindings are disabled without an external OS/container filesystem and resource boundary",
    );
  }
  if (
    config.auth.enabled &&
    (!Array.isArray(config.auth.bearer_tokens) || config.auth.bearer_tokens.length === 0)
  ) {
    throw new Error(
      "Auth is enabled; set CODEX_GATEWAY_API_KEY, CODEX_OPENAI_GATEWAY_KEY, --api-key, or auth.bearer_tokens",
    );
  }
  config.auth.bearer_tokens = (config.auth.bearer_tokens || []).filter(
    (token) => typeof token === "string" && token.length > 0,
  );
  if (config.auth.enabled && config.auth.bearer_tokens.length === 0) {
    throw new Error("Auth is enabled; bearer tokens must be non-empty strings");
  }
  config.codex.default_timeout_seconds = ensurePositiveInteger(
    config.codex.default_timeout_seconds,
    "codex.default_timeout_seconds",
  );
  config.codex.max_timeout_seconds = ensurePositiveInteger(
    config.codex.max_timeout_seconds,
    "codex.max_timeout_seconds",
  );
  if (config.codex.max_timeout_seconds < config.codex.default_timeout_seconds) {
    throw new Error(
      "codex.max_timeout_seconds must be greater than or equal to codex.default_timeout_seconds",
    );
  }
  config.codex.max_concurrent_processes = ensurePositiveInteger(
    config.codex.max_concurrent_processes,
    "codex.max_concurrent_processes",
  );
  config.codex.max_queue_length = ensureNonNegativeInteger(
    config.codex.max_queue_length,
    "codex.max_queue_length",
  );
  config.codex.kill_grace_seconds = ensurePositiveInteger(
    config.codex.kill_grace_seconds,
    "codex.kill_grace_seconds",
  );
  config.codex.max_stdout_bytes = ensurePositiveInteger(
    config.codex.max_stdout_bytes,
    "codex.max_stdout_bytes",
  );
  config.codex.max_stderr_bytes = ensurePositiveInteger(
    config.codex.max_stderr_bytes,
    "codex.max_stderr_bytes",
  );
  if (!Array.isArray(config.codex.allowed_profiles)) {
    throw new Error("codex.allowed_profiles must be an array");
  }
  if (config.codex.allowed_profiles.length > 0) {
    throw new Error("codex.allowed_profiles must be empty for the strict gateway");
  }

  const normalizedWorkspaces = {};
  for (const [name, workspace] of Object.entries(config.workspaces || {})) {
    const workspacePath = workspace?.path;
    if (!workspacePath || typeof workspacePath !== "string") {
      throw new Error(`workspace ${name} must define a path`);
    }
    const resolved = fs.realpathSync(path.resolve(workspacePath));
    const allowWrite = ensureBoolean(
      workspace.allow_write,
      `workspaces.${name}.allow_write`,
      false,
    );
    if (allowWrite) {
      throw new Error(
        `workspaces.${name}.allow_write=true is unsupported without an external OS/container write boundary`,
      );
    }
    normalizedWorkspaces[name] = {
      path: resolved,
      allow_write: false,
    };
  }
  config.workspaces = normalizedWorkspaces;

  for (const [name, model] of Object.entries(config.models || {})) {
    if (!model.codex_model || typeof model.codex_model !== "string") {
      throw new Error(`model ${name} must define codex_model`);
    }
    if (!model.workspace || !hasOwn(config.workspaces, model.workspace)) {
      throw new Error(
        `model ${name} references unknown workspace ${JSON.stringify(model.workspace)}`,
      );
    }
    if (!Array.isArray(model.allowed_workspaces)) model.allowed_workspaces = [];
    for (const workspaceName of model.allowed_workspaces) {
      if (!hasOwn(config.workspaces, workspaceName)) {
        throw new Error(
          `model ${name} allowed_workspaces references unknown workspace ${JSON.stringify(workspaceName)}`,
        );
      }
    }
    model.sandbox = model.sandbox || "read-only";
    if (!safeSandboxes.has(model.sandbox)) {
      if (model.sandbox === "workspace-write") {
        throw new Error(`model ${name} uses workspace-write, which the strict gateway rejects`);
      }
      throw new Error(`model ${name} uses unsupported sandbox ${JSON.stringify(model.sandbox)}`);
    }
    if (model.sandbox === "workspace-write" && !config.workspaces[model.workspace].allow_write) {
      throw new Error(
        `model ${name} uses workspace-write but workspace ${model.workspace} does not allow writes`,
      );
    }
    if (model.profile) {
      throw new Error(`model ${name} profiles are unsupported for the strict gateway`);
    }
    model.profile = "";
  }
  return config;
}

function parseYamlSubset(text) {
  const lines = text
    .split(/\r?\n/)
    .map((raw) => ({ indent: raw.match(/^ */)[0].length, content: stripYamlComment(raw.trim()) }))
    .filter((line) => line.content);

  function parseBlock(start, indent) {
    if (start >= lines.length) return [{}, start];
    const isArray = lines[start].indent === indent && lines[start].content.startsWith("- ");
    return isArray ? parseArray(start, indent) : parseObject(start, indent);
  }

  function parseObject(start, indent) {
    const value = Object.create(null);
    let index = start;
    while (index < lines.length && lines[index].indent === indent) {
      const match = lines[index].content.match(/^([^:]+):(.*)$/);
      if (!match) throw new Error(`Invalid YAML line: ${lines[index].content}`);
      const key = match[1].trim();
      if (blockedConfigKeys.has(key)) {
        throw new Error(`Unsupported config key: ${key}`);
      }
      if (hasOwn(value, key)) {
        throw new Error(`Duplicate YAML config key: ${key}`);
      }
      const rest = match[2].trim();
      if (rest) {
        value[key] = parseYamlScalar(rest);
        index += 1;
      } else {
        const nextIndent = lines[index + 1]?.indent;
        if (nextIndent === undefined || nextIndent <= indent) {
          value[key] = {};
          index += 1;
        } else {
          const [child, next] = parseBlock(index + 1, nextIndent);
          value[key] = child;
          index = next;
        }
      }
    }
    return [value, index];
  }

  function parseArray(start, indent) {
    const value = [];
    let index = start;
    while (
      index < lines.length &&
      lines[index].indent === indent &&
      lines[index].content.startsWith("- ")
    ) {
      const rest = lines[index].content.slice(2).trim();
      if (rest) value.push(parseYamlScalar(rest));
      else {
        const [child, next] = parseBlock(index + 1, lines[index + 1]?.indent ?? indent + 2);
        value.push(child);
        index = next - 1;
      }
      index += 1;
    }
    return [value, index];
  }

  const [value] = parseBlock(0, lines[0]?.indent ?? 0);
  return value;
}

function stripYamlComment(line) {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if ((char === "'" || char === '"') && line[index - 1] !== "\\")
      quote = quote === char ? null : quote || char;
    if (char === "#" && !quote) return line.slice(0, index).trim();
  }
  return line;
}

function parseYamlScalar(value) {
  if (value === "null") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  if (value.startsWith("[") || value.startsWith("{")) return JSON.parse(value);
  return value;
}

function openAiError(error) {
  const status = error instanceof GatewayError ? error.status : 500;
  return {
    status,
    body: {
      error: {
        message: error instanceof Error ? error.message : String(error),
        type: error instanceof GatewayError ? error.type : "server_error",
        param: error instanceof GatewayError ? error.param : null,
        code: error instanceof GatewayError ? error.code : "internal_error",
      },
    },
  };
}

function sendJson(res, status, body, headers = {}) {
  if (res.destroyed || res.writableEnded) return;
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
    ...headers,
  });
  res.end(payload);
}

function readJsonBody(req, limitBytes) {
  return new Promise((resolve, reject) => {
    let body = "";
    let bytes = 0;
    let settled = false;

    const failOnce = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      if (settled) return;
      bytes += Buffer.byteLength(chunk);
      if (bytes > limitBytes) {
        failOnce(new GatewayError(413, "Request body too large", "request_body_too_large"));
        req.resume();
        return;
      }
      body += chunk;
    });
    req.on("end", () => {
      if (settled) return;
      settled = true;
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new GatewayError(400, "Request body must be valid JSON", "invalid_json"));
      }
    });
    req.on("aborted", () =>
      failOnce(new GatewayError(499, "Client disconnected", "client_disconnected")),
    );
    req.on("error", failOnce);
  });
}

function requireAuth(config, req) {
  if (!config.auth.enabled) return;
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  if (!config.auth.bearer_tokens.some((allowedToken) => safeTokenEqual(token, allowedToken))) {
    throw new GatewayError(401, "Invalid authentication credentials", "invalid_api_key");
  }
}

function safeTokenEqual(actual, expected) {
  if (typeof actual !== "string" || typeof expected !== "string") return false;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length === 0 || actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function validateChatPayload(config, payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new GatewayError(400, "request body must be an object", "invalid_request");
  }
  if (payload.n !== undefined && payload.n !== 1) {
    throw new GatewayError(400, "Only n=1 is supported", "unsupported_n", "n");
  }
  if (payload.tools !== undefined || payload.tool_choice !== undefined) {
    throw new GatewayError(
      400,
      "Tool calling is not supported by this gateway",
      "unsupported_feature",
    );
  }
  if (payload.logprobs !== undefined) {
    throw new GatewayError(
      400,
      "logprobs is not supported by this gateway",
      "unsupported_feature",
      "logprobs",
    );
  }
  if (payload.stream === true && !config.features.streaming) {
    throw new GatewayError(
      400,
      "stream=true is disabled by gateway config",
      "unsupported_feature",
      "stream",
    );
  }
  if (payload.response_format !== undefined) {
    if (
      !payload.response_format ||
      typeof payload.response_format !== "object" ||
      Array.isArray(payload.response_format)
    ) {
      throw new GatewayError(
        400,
        "response_format must be an object",
        "invalid_response_format",
        "response_format",
      );
    }
    const allowedResponseFormats = new Set(["text", "json_object", "json_schema"]);
    if (!allowedResponseFormats.has(payload.response_format.type)) {
      throw new GatewayError(
        400,
        `Unsupported response_format.type: ${payload.response_format.type}`,
        "invalid_response_format",
        "response_format",
      );
    }
  }
  if (!payload.model || typeof payload.model !== "string") {
    throw new GatewayError(400, "model must be a string", "invalid_model", "model");
  }
  if (!hasOwn(config.models, payload.model)) {
    throw new GatewayError(404, `Unknown model: ${payload.model}`, "model_not_found", "model");
  }
  if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
    throw new GatewayError(
      400,
      "messages must be a non-empty array",
      "invalid_messages",
      "messages",
    );
  }
  for (const [index, message] of payload.messages.entries()) {
    if (!message || typeof message !== "object" || Array.isArray(message)) {
      throw new GatewayError(
        422,
        `messages[${index}] must be an object`,
        "invalid_message",
        "messages",
      );
    }
    if (!allowedMessageRoles.has(message.role)) {
      throw new GatewayError(
        400,
        `Unsupported message role: ${message.role}`,
        "invalid_role",
        "messages",
      );
    }
    contentToText(config, message.content, `messages[${index}].content`);
  }
}

function contentToText(config, content, param) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) {
    throw new GatewayError(
      422,
      "message content must be a string or content part array",
      "invalid_content",
      param,
    );
  }
  const parts = [];
  for (const [index, part] of content.entries()) {
    if (!part || typeof part !== "object") {
      throw new GatewayError(
        422,
        `content part ${index} must be an object`,
        "invalid_content",
        param,
      );
    }
    if (part.type === "text" && typeof part.text === "string") {
      parts.push(part.text);
      continue;
    }
    if (part.type === "image_url" || part.type === "input_image") {
      if (!config.features.image_inputs) {
        throw new GatewayError(
          400,
          "image inputs are disabled by gateway config",
          "unsupported_feature",
          param,
        );
      }
      throw new GatewayError(
        400,
        "image inputs are not implemented in v0.1",
        "unsupported_feature",
        param,
      );
    }
    throw new GatewayError(
      422,
      `unsupported content part type: ${part.type}`,
      "invalid_content",
      param,
    );
  }
  return parts.join("\n");
}

function cdata(text) {
  return String(text).replaceAll("]]>", "]]]]><![CDATA[>");
}

function compilePrompt(config, payload) {
  const sections = [
    "You are being invoked through a local OpenAI-compatible Chat Completions gateway.",
    "Return only the final assistant message that should be sent back to the API client.",
    "Do not include internal logs, command traces, hidden reasoning, JSON event metadata, or gateway implementation details.",
  ];
  if (payload.max_tokens || payload.max_completion_tokens) {
    sections.push(
      `The caller requested at most ${payload.max_completion_tokens ?? payload.max_tokens} completion tokens. Treat this as a best-effort length limit.`,
    );
  }
  if (payload.response_format?.type === "json_object") {
    sections.push("The final assistant message must be valid JSON. Do not wrap it in Markdown.");
  }
  if (payload.response_format?.type === "json_schema") {
    sections.push("The final assistant message must conform to the provided JSON schema.");
  }
  sections.push("The following is the conversation:");
  for (const message of payload.messages) {
    sections.push(
      `<message role="${message.role}">\n<![CDATA[\n${cdata(contentToText(config, message.content, "messages.content"))}\n]]>\n</message>`,
    );
  }
  const prompt = `${sections.join("\n\n")}\n`;
  if (prompt.length > config.server.max_prompt_chars) {
    throw new GatewayError(413, "Compiled prompt is too large", "prompt_too_large");
  }
  return prompt;
}

function resolveInvocation(config, payload) {
  const model = config.models[payload.model];
  const metadata = payload.metadata?.codex ?? {};
  if (metadata && (typeof metadata !== "object" || Array.isArray(metadata))) {
    throw new GatewayError(400, "metadata.codex must be an object", "invalid_metadata", "metadata");
  }
  const allowedMetadata = new Set([
    "workspace",
    "timeout_seconds",
    "sandbox",
    "reasoning_effort",
    "cwd_subdir",
  ]);
  for (const key of Object.keys(metadata)) {
    if (!allowedMetadata.has(key)) {
      throw new GatewayError(
        400,
        `Unsupported metadata.codex option: ${key}`,
        "unsupported_metadata",
        "metadata",
      );
    }
  }

  const workspaceName = resolveWorkspaceName(model, metadata.workspace);
  const workspace = config.workspaces[workspaceName];
  if (!workspace)
    throw new GatewayError(
      400,
      `Unknown workspace: ${workspaceName}`,
      "invalid_workspace",
      "metadata",
    );

  const sandbox = resolveSandbox(model.sandbox, metadata.sandbox, workspace);
  const cwd = resolveWorkspaceCwd(workspace.path, metadata.cwd_subdir);
  const timeoutSeconds = resolveTimeout(config, metadata.timeout_seconds);
  return {
    alias: payload.model,
    codexModel: model.codex_model,
    cwd,
    reasoningEffort: metadata.reasoning_effort || model.reasoning_effort || "",
    sandbox,
    timeoutMs: timeoutSeconds * 1000,
    workspaceName,
  };
}

function resolveWorkspaceName(model, requestedWorkspace) {
  if (!requestedWorkspace) return model.workspace;
  const allowedWorkspaces = new Set([model.workspace, ...(model.allowed_workspaces || [])]);
  if (!allowedWorkspaces.has(requestedWorkspace)) {
    throw new GatewayError(
      400,
      "metadata.codex.workspace is not allowlisted for this model",
      "invalid_workspace",
      "metadata",
    );
  }
  return requestedWorkspace;
}

function resolveSandbox(modelSandbox, requestedSandbox, workspace) {
  const sandbox = requestedSandbox || modelSandbox;
  if (!safeSandboxes.has(sandbox)) {
    throw new GatewayError(400, "Unsupported sandbox", "invalid_sandbox", "metadata");
  }
  if (requestedSandbox === "workspace-write" && modelSandbox !== "workspace-write") {
    throw new GatewayError(
      400,
      "metadata.codex.sandbox may not be less restrictive than model default",
      "invalid_sandbox",
      "metadata",
    );
  }
  if (sandbox === "workspace-write" && !workspace.allow_write) {
    throw new GatewayError(
      400,
      "selected workspace does not allow writes",
      "invalid_sandbox",
      "metadata",
    );
  }
  return sandbox;
}

function resolveWorkspaceCwd(workspacePath, cwdSubdir) {
  if (!cwdSubdir) return workspacePath;
  if (path.isAbsolute(cwdSubdir)) {
    throw new GatewayError(
      400,
      "cwd_subdir must be relative",
      "invalid_workspace_path",
      "metadata",
    );
  }
  let candidate = null;
  try {
    candidate = fs.realpathSync(path.resolve(workspacePath, cwdSubdir));
  } catch {
    throw new GatewayError(400, "cwd_subdir does not exist", "invalid_workspace_path", "metadata");
  }
  const relative = path.relative(workspacePath, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new GatewayError(
      400,
      "cwd_subdir escapes the workspace",
      "invalid_workspace_path",
      "metadata",
    );
  }
  return candidate;
}

function resolveTimeout(config, timeoutSeconds) {
  const fallback = config.codex.default_timeout_seconds;
  if (timeoutSeconds === undefined) return fallback;
  if (!Number.isInteger(timeoutSeconds) || timeoutSeconds <= 0) {
    throw new GatewayError(
      400,
      "timeout_seconds must be a positive integer",
      "invalid_timeout",
      "metadata",
    );
  }
  return Math.min(timeoutSeconds, config.codex.max_timeout_seconds);
}

function applyStopSequences(text, stop) {
  const stops = Array.isArray(stop) ? stop : stop ? [stop] : [];
  let cut = -1;
  for (const item of stops) {
    if (typeof item !== "string" || item.length === 0) continue;
    const index = text.indexOf(item);
    if (index !== -1 && (cut === -1 || index < cut)) cut = index;
  }
  return cut === -1 ? text : text.slice(0, cut);
}

function writeOutputSchema(config, payload, tempDir) {
  if (payload.response_format?.type !== "json_schema") return null;
  if (!config.features.response_format_json_schema) {
    throw new GatewayError(
      400,
      "json_schema response_format is disabled",
      "unsupported_feature",
      "response_format",
    );
  }
  const schema = payload.response_format.json_schema?.schema;
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    throw new GatewayError(
      400,
      "response_format.json_schema.schema must be an object",
      "invalid_response_format",
      "response_format",
    );
  }
  const schemaPath = path.join(tempDir, "output-schema.json");
  fs.writeFileSync(schemaPath, JSON.stringify(schema), "utf8");
  return schemaPath;
}

function pathIsWithin(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function resolveExecutable(command) {
  const names =
    process.platform === "win32" ? [command, `${command}.exe`, `${command}.cmd`] : [command];
  const candidates = command.includes(path.sep)
    ? names.map((name) => path.resolve(name))
    : (process.env.PATH || "")
        .split(path.delimiter)
        .flatMap((directory) => names.map((name) => path.join(directory, name)));
  for (const candidate of candidates) {
    try {
      return fs.realpathSync(candidate);
    } catch {
      // Continue through PATH candidates.
    }
  }
  return null;
}

function codexRuntimeReadPath(command) {
  const executable = resolveExecutable(command);
  if (!executable) return null;
  let runtimePath = executable;
  for (let current = path.dirname(executable); ; current = path.dirname(current)) {
    const packageFile = path.join(current, "package.json");
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageFile, "utf8"));
      const packageName = String(packageJson.name || "");
      if (packageName === "@openai/codex" || packageName.startsWith("@openai/codex-")) {
        runtimePath = current;
        break;
      }
    } catch {
      // This directory is not a matching package root.
    }
    const parent = path.dirname(current);
    if (parent === current) break;
  }

  const home = process.env.HOME ? path.resolve(process.env.HOME) : null;
  const forbiddenRoots = [
    home ? path.join(home, ".codex") : null,
    process.env.CODEX_HOME ? path.resolve(process.env.CODEX_HOME) : null,
  ].filter(Boolean);
  if (
    runtimePath === path.parse(runtimePath).root ||
    runtimePath === home ||
    forbiddenRoots.some((root) => pathIsWithin(runtimePath, root))
  ) {
    return null;
  }
  return runtimePath;
}

function gatewayFilesystemPermissions(codexBinary) {
  const entries = ['":minimal"="read"', '":workspace_roots"={"."="deny"}'];
  const runtimePath = codexRuntimeReadPath(codexBinary);
  if (runtimePath) entries.push(`${JSON.stringify(runtimePath)}="read"`);
  return `{${entries.join(",")}}`;
}

function gatewayShellEnvironment(invocation) {
  const values = {
    HOME: invocation.cwd,
    PATH: process.env.PATH || "",
    TMPDIR: os.tmpdir(),
    TMP: os.tmpdir(),
    TEMP: os.tmpdir(),
  };
  for (const key of ["LANG", "LC_ALL", "LC_CTYPE", "TERM", "NO_COLOR"]) {
    if (process.env[key]) values[key] = process.env[key];
  }
  return `{${Object.entries(values)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${JSON.stringify(key)}=${JSON.stringify(value)}`)
    .join(",")}}`;
}

function buildSafeEnv() {
  const env = {};
  for (const key of [
    "HOME",
    "PATH",
    "USER",
    "LOGNAME",
    "SHELL",
    "TMPDIR",
    "TEMP",
    "TMP",
    "LANG",
    "LC_ALL",
    "TERM",
    "CODEX_HOME",
    "SSL_CERT_FILE",
    "SSL_CERT_DIR",
  ]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return env;
}

function redact(text) {
  const home = process.env.HOME ? path.resolve(process.env.HOME) : "";
  return String(text || "")
    .replaceAll(home, "~")
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, "[redacted-token]")
    .replace(
      /\b(?:ghp_|github_pat_|xox[baprs]-|AKIA|ASIA)[A-Za-z0-9_/-]{12,}\b/g,
      "[redacted-token]",
    )
    .replace(/[A-Za-z0-9+/=._-]{48,}/g, "[redacted-long-token]");
}

function appendLimited(current, chunk, maxBytes) {
  const next = current + chunk;
  if (Buffer.byteLength(next) <= maxBytes) return next;
  return next.slice(Math.max(0, next.length - maxBytes));
}

function signalProcessTree(child, signalName) {
  const pid = child.pid;
  if (!Number.isInteger(pid) || pid <= 0) return;

  if (process.platform === "win32") {
    const args = ["/PID", String(pid), "/T"];
    if (signalName === "SIGKILL") args.push("/F");
    const terminator = spawn("taskkill", args, {
      stdio: "ignore",
      windowsHide: true,
    });
    terminator.once("error", () => {
      if (child.exitCode === null) child.kill(signalName);
    });
    return;
  }

  try {
    process.kill(-pid, signalName);
  } catch (error) {
    if (error?.code === "ESRCH") return;
    if (child.exitCode === null) child.kill(signalName);
  }
}

function processGroupAlive(pid) {
  if (process.platform === "win32" || !Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForProcessGroupExit(pid, timeoutMs) {
  const deadline = Date.now() + Math.max(0, timeoutMs);
  while (processGroupAlive(pid) && Date.now() < deadline) {
    await delay(50);
  }
  return !processGroupAlive(pid);
}

async function runTaskkill(pid) {
  await new Promise((resolve) => {
    try {
      const terminator = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
      terminator.once("error", resolve);
      terminator.once("close", resolve);
    } catch {
      resolve();
    }
  });
}

async function reapRemainingProcessTree(child, graceMs, terminationAlreadyRequested) {
  const pid = child.pid;
  if (!Number.isInteger(pid) || pid <= 0) return;
  if (process.platform === "win32") {
    await runTaskkill(pid);
    return;
  }
  if (!processGroupAlive(pid)) return;
  if (!terminationAlreadyRequested) signalProcessTree(child, "SIGTERM");
  if (!(await waitForProcessGroupExit(pid, graceMs))) {
    signalProcessTree(child, "SIGKILL");
    await waitForProcessGroupExit(pid, Math.min(1000, Math.max(250, graceMs)));
  }
}

function runCodex(config, invocation, payload, prompt, signal) {
  return new Promise((resolve, reject) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-local-openai-gateway-"));
    const finalPath = path.join(tempDir, "final.txt");
    let stdout = "";
    let stderr = "";
    let stdoutLineBuffer = "";
    let fallbackText = "";
    let usage = null;
    let settled = false;
    let timedOut = false;
    let childClosed = false;
    let terminationRequested = false;
    let stdinError = null;
    let killTimer = null;
    let treeReapPromise = null;

    const args = [
      "exec",
      ...(config.codex.ignore_user_config ? ["--ignore-user-config"] : []),
      ...(config.codex.ignore_rules ? ["--ignore-rules"] : []),
      "--cd",
      invocation.cwd,
      "--strict-config",
      "-c",
      `default_permissions=${JSON.stringify(gatewayPermissionProfile)}`,
      "-c",
      `permissions.${gatewayPermissionProfile}.filesystem=${gatewayFilesystemPermissions(config.codex.binary)}`,
      "-c",
      `permissions.${gatewayPermissionProfile}.network.enabled=false`,
      "-c",
      'shell_environment_policy.inherit="none"',
      "-c",
      `shell_environment_policy.set=${gatewayShellEnvironment(invocation)}`,
      ...(config.codex.skip_git_repo_check ? ["--skip-git-repo-check"] : []),
      "--color",
      "never",
      "--json",
      "--output-last-message",
      finalPath,
      "--model",
      invocation.codexModel,
      "--ephemeral",
    ];
    if (config.codex.approval_policy)
      args.push("-c", `approval_policy=${JSON.stringify(config.codex.approval_policy)}`);
    if (invocation.reasoningEffort)
      args.push("-c", `model_reasoning_effort=${JSON.stringify(invocation.reasoningEffort)}`);
    const schemaPath = writeOutputSchema(config, payload, tempDir);
    if (schemaPath) args.push("--output-schema", schemaPath);
    args.push("-");

    const child = spawn(config.codex.binary, args, {
      cwd: invocation.cwd,
      detached: true,
      env: buildSafeEnv(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    const kill = () => {
      if (childClosed || terminationRequested) return;
      terminationRequested = true;
      signalProcessTree(child, "SIGTERM");
      if (!killTimer) {
        killTimer = setTimeout(() => {
          signalProcessTree(child, "SIGKILL");
        }, config.codex.kill_grace_seconds * 1000);
        killTimer.unref();
      }
    };

    const timer = setTimeout(() => {
      timedOut = true;
      kill();
    }, invocation.timeoutMs);

    const abort = () => {
      kill();
    };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stdout = appendLimited(stdout, text, config.codex.max_stdout_bytes);
      stdoutLineBuffer += text;
      const lines = stdoutLineBuffer.split(/\r?\n/);
      stdoutLineBuffer = lines.pop() || "";
      for (const rawLine of lines) parseCodexJsonEvent(rawLine);
    });

    child.stderr.on("data", (chunk) => {
      stderr = appendLimited(stderr, chunk.toString("utf8"), config.codex.max_stderr_bytes);
    });

    child.stdin.on("error", (error) => {
      stdinError = error;
      kill();
    });

    const startTreeReap = () => {
      if (!treeReapPromise) {
        treeReapPromise = reapRemainingProcessTree(
          child,
          terminationRequested ? config.codex.kill_grace_seconds * 1000 : 0,
          terminationRequested,
        );
      }
      return treeReapPromise;
    };

    child.on("exit", () => {
      // `close` waits for inherited stdout/stderr handles. Reap as soon as the
      // direct child exits so a background descendant cannot hold the response
      // and ProcessLimiter slot open indefinitely.
      clearTimeout(timer);
      void startTreeReap();
    });

    child.on("error", (error) => {
      childClosed = true;
      cleanup(true);
      logCodexSpawnFailure(invocation, error);
      if (!settled) {
        settled = true;
        reject(
          new GatewayError(
            500,
            "Codex process failed",
            "codex_process_failed",
            null,
            "server_error",
          ),
        );
      }
    });

    child.on("close", (code, signalName) => {
      void finishClose(code, signalName).catch((error) => {
        signalProcessTree(child, "SIGKILL");
        try {
          cleanup(true);
        } catch {
          // Preserve the original process-handling error.
        }
        logCodexSpawnFailure(invocation, error);
        if (!settled) {
          settled = true;
          reject(
            new GatewayError(
              500,
              "Codex process failed",
              "codex_process_failed",
              null,
              "server_error",
            ),
          );
        }
      });
    });

    async function finishClose(code, signalName) {
      childClosed = true;
      if (stdoutLineBuffer.trim()) parseCodexJsonEvent(stdoutLineBuffer);
      stdoutLineBuffer = "";
      await startTreeReap();
      cleanup(false);
      if (settled) return;
      settled = true;
      try {
        if (signal?.aborted) {
          reject(new GatewayError(499, "Client disconnected", "client_disconnected"));
          return;
        }
        if (timedOut) {
          reject(
            new GatewayError(504, "Codex process timed out", "codex_timeout", null, "server_error"),
          );
          return;
        }
        if (stdinError) {
          logCodexFailure(invocation, code, signalName, stderr);
          reject(
            new GatewayError(
              500,
              "Codex process failed",
              "codex_process_failed",
              null,
              "server_error",
            ),
          );
          return;
        }
        if (code !== 0) {
          logCodexFailure(invocation, code, signalName, stderr);
          reject(
            new GatewayError(
              500,
              "Codex process failed",
              "codex_process_failed",
              null,
              "server_error",
            ),
          );
          return;
        }
        const finalText = readFinalMessage(finalPath, fallbackText);
        if (!finalText) {
          reject(
            new GatewayError(
              502,
              "Codex output did not contain a final assistant message",
              "codex_output_unparseable",
              null,
              "server_error",
            ),
          );
          return;
        }
        resolve({ text: applyStopSequences(finalText, payload.stop), usage });
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }

    try {
      child.stdin.end(prompt);
    } catch (error) {
      stdinError = error;
      kill();
    }

    function parseCodexJsonEvent(rawLine) {
      const line = stripAnsi(rawLine.trim());
      if (!line.startsWith("{")) return;
      try {
        const event = JSON.parse(line);
        if (event.type === "item.completed" && event.item?.type === "agent_message") {
          fallbackText = String(event.item.text || fallbackText);
        }
        if (event.type === "turn.completed" && event.usage) {
          const promptTokens = Number(event.usage.input_tokens || 0);
          const completionTokens = Number(event.usage.output_tokens || 0);
          usage = {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: promptTokens + completionTokens,
          };
        }
      } catch {
        // Unknown or malformed JSON event; ignore for gateway output.
      }
    }

    function cleanup(removeTemp) {
      clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      signal?.removeEventListener("abort", abort);
      if (removeTemp) fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
}

function stripAnsi(text) {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

function readFinalMessage(finalPath, fallbackText) {
  try {
    const text = fs.readFileSync(finalPath, "utf8").trim();
    if (text) return text;
  } catch {
    // Fallback to parsed JSON event text.
  }
  return fallbackText.trim();
}

function logCodexFailure(invocation, code, signalName, stderr) {
  console.error(
    JSON.stringify({
      event: "codex_gateway_process_failed",
      model: invocation.alias,
      workspace: invocation.workspaceName,
      code,
      signal: signalName || null,
      stderr: redact(stderr).slice(0, 2000),
    }),
  );
}

function logCodexSpawnFailure(invocation, error) {
  console.error(
    JSON.stringify({
      event: "codex_gateway_spawn_failed",
      model: invocation.alias,
      workspace: invocation.workspaceName,
      message: redact(error instanceof Error ? error.message : String(error)).slice(0, 500),
    }),
  );
}

function completionResponse(config, id, model, result) {
  const body = {
    id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: result.text },
        finish_reason: "stop",
      },
    ],
  };
  if (config.codex.include_usage && result.usage) body.usage = result.usage;
  return body;
}

function completionChunk(id, model, delta, finishReason = null) {
  return {
    id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  };
}

function writeSse(res, payload) {
  res.write(`data: ${typeof payload === "string" ? payload : JSON.stringify(payload)}\n\n`);
}

function createServer(config) {
  const limiter = new ProcessLimiter(
    config.codex.max_concurrent_processes,
    config.codex.max_queue_length,
  );

  return http.createServer(async (req, res) => {
    const started = Date.now();
    const requestId = `chatcmpl-local-${randomUUID()}`;
    const abortController = new AbortController();
    req.on("aborted", () => abortController.abort());
    res.on("close", () => {
      if (!res.writableEnded) abortController.abort();
    });

    try {
      const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      applyCors(config, req, res);
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method === "GET" && (url.pathname === "/healthz" || url.pathname === "/v1/healthz")) {
        sendJson(res, 200, {
          status: "ok",
          codex_available: commandLooksAvailable(config.codex.binary),
          version,
        });
        return;
      }

      if (req.method === "GET" && url.pathname === "/v1/models") {
        requireAuth(config, req);
        sendJson(res, 200, {
          object: "list",
          data: Object.keys(config.models).map((id) => ({
            id,
            object: "model",
            created: 0,
            owned_by: "local",
          })),
        });
        return;
      }

      if (req.method === "POST" && url.pathname === "/v1/chat/completions") {
        requireAuth(config, req);
        const payload = await readJsonBody(req, config.server.request_body_limit_bytes);
        validateChatPayload(config, payload);
        const invocation = resolveInvocation(config, payload);
        const prompt = compilePrompt(config, payload);
        const release = await limiter.acquire(abortController.signal);
        try {
          if (payload.stream === true) {
            await handleStream(
              config,
              req,
              res,
              requestId,
              payload,
              invocation,
              prompt,
              abortController.signal,
            );
          } else {
            const result = await runCodex(
              config,
              invocation,
              payload,
              prompt,
              abortController.signal,
            );
            sendJson(res, 200, completionResponse(config, requestId, payload.model, result));
          }
        } finally {
          release();
          logRequest(config, {
            requestId,
            model: payload.model,
            workspace: invocation.workspaceName,
            stream: payload.stream === true,
            durationMs: Date.now() - started,
          });
        }
        return;
      }

      sendJson(res, 404, {
        error: {
          message: `No route for ${req.method} ${url.pathname}`,
          type: "invalid_request_error",
          param: null,
          code: "not_found",
        },
      });
    } catch (error) {
      const { status, body } = openAiError(error);
      if (status !== 499) sendJson(res, status, body);
    }
  });
}

async function handleStream(config, req, res, requestId, payload, invocation, prompt, signal) {
  const result = await runCodex(config, invocation, payload, prompt, signal);
  if (req.destroyed) return;

  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });
  writeSse(res, completionChunk(requestId, payload.model, { role: "assistant" }));
  try {
    if (result.text)
      writeSse(res, completionChunk(requestId, payload.model, { content: result.text }));
    writeSse(res, completionChunk(requestId, payload.model, {}, "stop"));
    writeSse(res, "[DONE]");
  } finally {
    if (!res.writableEnded) res.end();
  }
}

function applyCors(config, req, res) {
  if (!config.server.cors?.enabled) return;
  const origin = req.headers.origin;
  if (!origin) return;
  const allowed = config.server.cors.allowed_origins || [];
  if (allowed.includes("*") || allowed.includes(origin)) {
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("vary", "origin");
    res.setHeader("access-control-allow-headers", "authorization,content-type");
    res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  }
}

function commandLooksAvailable(command) {
  if (command.includes(path.sep)) return fs.existsSync(command);
  const paths = (process.env.PATH || "").split(path.delimiter);
  const names =
    process.platform === "win32" ? [command, `${command}.exe`, `${command}.cmd`] : [command];
  return paths.some((dir) => names.some((name) => fs.existsSync(path.join(dir, name))));
}

function logRequest(config, event) {
  if (!config.features.request_logging) return;
  console.error(JSON.stringify({ event: "codex_gateway_request", ...event }));
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printUsage();
      return;
    }
    const configPath = args.config || process.env.CODEX_GATEWAY_CONFIG;
    const config = normalizeConfig(
      applyEnvAndArgs(mergeConfig(defaultConfig(), readConfigFile(configPath)), args),
    );
    const server = createServer(config);
    server.listen(config.server.port, config.server.host, () => {
      console.error(
        `codex-local-openai-chat-gateway listening on http://${config.server.host}:${config.server.port}/v1`,
      );
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
}

main();
