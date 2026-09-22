import { createHash, randomUUID } from "node:crypto";
import { constants, lstatSync, realpathSync } from "node:fs";
import { lstat, open, readFile, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import {
  inspectCurrentUserDirectoryBoundaryAsync,
  pathIdentity,
  readProtectedSecret,
  samePathIdentity,
  secureAndVerifyCurrentUserFileAsync,
  verifyCurrentUserFileAsync,
} from "../../assets/templates/protected-file.mjs";

const SCHEMA = "hetzner-remote/v1";
const BASE = "https://inference.hetzner.com/api/v1";
const MARKER = "hetzner_setup_owner";
const TTL = 15 * 60 * 1000;
const LIMIT = 8 * 1024 * 1024;
const COMMANDS = ["plan", "apply", "check", "rollback", "diagnose", "status"];

class RemoteError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}
function fail(code, message, details) {
  throw new RemoteError(code, message, details);
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}
function hash(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}
function seal(value) {
  return { ...value, id: hash(value) };
}
function textOption(value, name, pattern = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/) {
  if (typeof value !== "string" || !pattern.test(value))
    fail("invalid_input", `${name} is missing or invalid.`);
  return value;
}
function endpoint(value, name) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail("invalid_url", `${name} must be an absolute HTTPS URL.`);
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    fail(
      "invalid_url",
      `${name} requires HTTPS (HTTP only on loopback), without credentials, query or fragment.`,
    );
  }
  return url.href.replace(/\/+$/, "");
}
function network(options, kind) {
  const allowed = String(options["approve-network"] ?? "").split(",");
  if (!allowed.includes(kind))
    fail("network_approval_required", `Use --approve-network ${kind} for this selected endpoint.`);
}
function source(options, role) {
  const file = options[`${role}-key-file`];
  const env = options[`${role}-key-env`];
  if ((!file && !env) || (file && env))
    fail(
      "credential_source_required",
      `Choose exactly one --${role}-key-file or --${role}-key-env source.`,
    );
  if (file)
    return {
      kind: "file",
      path: resolve(textOption(file, `${role} credential path`, /^[^\0\r\n]{1,4096}$/)),
    };
  return {
    kind: "env",
    name: textOption(env, `${role} environment name`, /^[A-Za-z_][A-Za-z0-9_]{0,127}$/),
  };
}
async function secret(ref) {
  let value;
  if (ref.kind === "env") {
    value = process.env[ref.name];
  } else {
    try {
      value = readProtectedSecret(ref.path, "Selected credential", { allowTrailingNewline: true });
    } catch (error) {
      if (error.code === "ENOENT")
        fail("credential_unavailable", "The selected credential file is unavailable.");
      fail(
        "unsafe_credential_file",
        "Credential source must be a protected owner-only file containing one credential, optionally followed by one LF or CRLF newline; ownership, ACL, boundary and read-race checks still apply.",
      );
    }
  }
  if (
    typeof value !== "string" ||
    !value.trim() ||
    /[\r\n\0]/.test(value.trim()) ||
    value.trim().length > 65536
  ) {
    fail("credential_unavailable", "The selected source must contain one nonempty credential.");
  }
  return value.trim();
}
function timeout(options) {
  const value = Number(options["timeout-ms"] ?? 20000);
  if (!Number.isInteger(value) || value < 10 || value > 120000)
    fail("invalid_input", "timeout-ms must be between 10 and 120000.");
  return value;
}
async function request(base, path, key, options, body) {
  let response;
  try {
    response = await fetch(`${base}/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        authorization: `Bearer ${key}`,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      redirect: "error",
      signal: AbortSignal.timeout(timeout(options)),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    let size = 0;
    const chunks = [];
    for await (const chunk of response.body ?? []) {
      size += chunk.byteLength;
      if (size > LIMIT) {
        await response.body?.cancel().catch(() => {});
        fail("response_too_large", "Gateway response exceeds the bounded inspection limit.");
      }
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    if (!response.ok) {
      if (response.status === 401 || response.status === 403)
        fail(
          "credential_role_denied",
          "Gateway authentication or role denied. Model management needs administrator permissions; inference needs a permitted client key.",
          { httpStatus: response.status },
        );
      if (/store_model_in_db|prisma|database.{0,40}(connect|config|not)/i.test(raw))
        fail(
          "database_prerequisite",
          "The owner must configure a connected database and STORE_MODEL_IN_DB=true before API-managed models can be added. No infrastructure changes were attempted.",
          { httpStatus: response.status },
        );
      fail(
        "gateway_http_error",
        "Gateway rejected the request. Inspect redacted server diagnostics; no response body is echoed.",
        {
          httpStatus: response.status,
          ambiguous: response.status >= 500 || response.status === 408,
        },
      );
    }
    try {
      return JSON.parse(raw);
    } catch {
      fail("unsupported_response", "Gateway response is not the expected JSON contract.", {
        ambiguous: body !== undefined,
      });
    }
  } catch (error) {
    if (error instanceof RemoteError) throw error;
    fail(
      "transport_error",
      "Gateway transport failed or redirected; response and credential details are suppressed.",
      { ambiguous: body !== undefined },
    );
  }
}
function secretField(key) {
  return /(?:api[_-]?key|secret|password|authorization|credential|headers|^(?:access_|refresh_|auth_)?token$)/i.test(
    key,
  );
}
function scrub(value, key = "") {
  if (secretField(key)) return "[excluded]";
  if (Array.isArray(value)) return value.map((entry) => scrub(entry));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([name]) => !secretField(name))
        .map(([name, entry]) => [name, scrub(entry, name)]),
    );
  return value;
}
function routingParameters(parameters) {
  return Object.fromEntries(
    Object.entries(parameters)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => [
        key,
        key === "api_base" && typeof value === "string" ? value.replace(/\/+$/, "") : value,
      ]),
  );
}
function expectedConfiguration(value) {
  return hash(
    scrub({
      model: `openai/${value.model}`,
      api_base: BASE,
      use_chat_completions_api: true,
      additional_drop_params: ["reasoning_effort"],
    }),
  );
}
function route(entry) {
  if (
    !entry ||
    typeof entry.model_name !== "string" ||
    !entry.litellm_params ||
    !entry.model_info ||
    typeof entry.model_info.id !== "string"
  ) {
    fail(
      "unsupported_inventory",
      "Model inventory lacks stable model names, routing parameters or IDs. Ask the gateway owner for a supported management view.",
    );
  }
  return {
    id: entry.model_info.id,
    alias: entry.model_name,
    model: entry.litellm_params.model ?? null,
    apiBase: entry.litellm_params.api_base ?? null,
    ownership:
      entry.model_info.db_model === true
        ? "api"
        : entry.model_info.db_model === false
          ? "gitops"
          : "unknown",
    marker: entry.model_info[MARKER] ?? null,
    // Bind every non-secret routing parameter, not only alias/model/base.
    configHash: hash(scrub(routingParameters(entry.litellm_params))),
    stateHash: hash(
      scrub({ params: routingParameters(entry.litellm_params), info: entry.model_info }),
    ),
    credentialProof: "not-observable-from-masked-inventory",
  };
}
async function inventory(base, key, options) {
  const data = await request(base, "model/info", key, options);
  if (!Array.isArray(data?.data))
    fail(
      "unsupported_inventory",
      "Expected the global /model/info data array. A user-scoped view cannot establish model ownership.",
    );
  const rows = data.data.map(route).sort((a, b) => a.id.localeCompare(b.id));
  if (new Set(rows.map((row) => row.id)).size !== rows.length)
    fail("unsupported_inventory", "Inventory contains duplicate model IDs.");
  return rows;
}
function resolveSchema(document, schema) {
  if (!schema?.$ref) return schema;
  if (!schema.$ref.startsWith("#/components/schemas/")) return null;
  return document.components?.schemas?.[schema.$ref.slice("#/components/schemas/".length)];
}
async function capabilities(base, key, options) {
  const document = await request(base, "openapi.json", key, options);
  const paths = document?.paths;
  const create = paths?.["/model/new"]?.post;
  const remove = paths?.["/model/delete"]?.post;
  const modelSchema = resolveSchema(
    document,
    create?.requestBody?.content?.["application/json"]?.schema,
  );
  const deleteSchema = resolveSchema(
    document,
    remove?.requestBody?.content?.["application/json"]?.schema,
  );
  const properties = modelSchema?.properties;
  if (
    !paths?.["/model/info"]?.get ||
    !properties?.model_name ||
    !properties?.litellm_params ||
    !properties?.model_info ||
    !deleteSchema?.properties?.id
  ) {
    fail(
      "unsupported_api",
      "The deployed OpenAPI contract does not expose supported model info/create/delete schemas. Ask the owner to expose its API schema, or use the manual/config workflow.",
    );
  }
  return {
    version: String(document.info?.version ?? "unreported"),
    contractHash: hash({
      info: paths["/model/info"].get,
      create,
      remove,
      schemas: document.components?.schemas,
    }),
  };
}
function desired(options) {
  const model = textOption(options.model, "Hetzner model ID");
  if (model.startsWith("openai/"))
    fail("invalid_input", "Supply the provider model ID without LiteLLM openai/ prefix.");
  const alias = textOption(
    options.alias ?? "hetzner-default",
    "Model alias",
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/,
  );
  const env = options["provider-env"];
  const file = options["provider-key-file"];
  if ((!env && !file) || (env && file))
    fail(
      "provider_source_required",
      "Choose exactly one --provider-env (on the remote server) or --provider-key-file source.",
    );
  let provider;
  if (env) {
    provider = {
      kind: "remote-env",
      name: textOption(env, "Remote provider environment name", /^[A-Za-z_][A-Za-z0-9_]{0,127}$/),
    };
    if (options["remote-env-confirmed"] !== true)
      fail(
        "remote_secret_unconfirmed",
        "The gateway owner must confirm this environment variable exists on every remote replica; use --remote-env-confirmed only after that check. Local availability is insufficient.",
      );
  } else {
    provider = {
      kind: "file",
      path: resolve(textOption(file, "Provider credential path", /^[^\0\r\n]{1,4096}$/)),
    };
  }
  return { alias, model, provider };
}
function patchFor(wanted) {
  return {
    model_list: [
      {
        model_name: wanted.alias,
        litellm_params: {
          model: `openai/${wanted.model}`,
          api_base: BASE,
          use_chat_completions_api: true,
          additional_drop_params: ["reasoning_effort"],
          api_key: `os.environ/${wanted.provider?.name ?? "HETZNER_API_KEY"}`,
        },
      },
    ],
  };
}
function handoff(wanted, reason) {
  return {
    ok: false,
    target: "remote",
    status: "owner-handoff",
    reason,
    patch: patchFor(wanted),
    instructions: [
      "Merge this model_list entry into the gateway owner's existing configuration; do not replace the complete list.",
      "Provide the referenced secret to every remote replica through the existing secret-management system.",
      "Review and deploy through the owner's configuration workflow, then run a separate inference check with a client credential.",
    ],
  };
}
function matches(row, wanted) {
  return (
    row.alias === wanted.alias &&
    row.model === `openai/${wanted.model}` &&
    typeof row.apiBase === "string" &&
    row.apiBase.replace(/\/+$/, "") === BASE
  );
}
async function management(options, base) {
  network(options, "management");
  return {
    base: endpoint(base ?? options["management-url"], "management-url"),
    key: await secret(source(options, "management")),
  };
}
async function plan(options) {
  const wanted = desired(options);
  const owner = options["configuration-owner"] ?? "api";
  if (!["api", "gitops"].includes(owner))
    fail("invalid_input", "configuration-owner must be api or gitops.");
  if (owner === "gitops")
    return handoff(wanted, "The selected source of truth is declarative configuration.");
  const { base, key } = await management(options);
  const inferenceUrl = endpoint(options["inference-url"] ?? base, "inference-url");
  const rows = await inventory(base, key, options);
  const candidates = rows.filter((row) => row.alias === wanted.alias);
  if (candidates.length > 1)
    fail(
      "alias_ambiguous",
      "Multiple deployments share this alias. Choose a unique alias; no route was modified.",
    );
  if (candidates[0]?.ownership === "gitops")
    return handoff(wanted, "The existing alias belongs to config.yaml/GitOps.");
  if (candidates[0]?.ownership === "unknown")
    fail(
      "ownership_unknown",
      "The existing alias has no trustworthy database/config ownership marker. Ask its owner to resolve ownership.",
    );
  if (
    candidates[0] &&
    (!matches(candidates[0], wanted) || candidates[0].configHash !== expectedConfiguration(wanted))
  )
    fail(
      "alias_conflict",
      "The existing alias routes to different model settings. Choose a new alias; the existing route will not be overwritten.",
    );
  const api = await capabilities(base, key, options);
  const now = Date.now();
  const value = seal({
    schema: SCHEMA,
    kind: "plan",
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + TTL).toISOString(),
    managementUrl: base,
    inferenceUrl,
    ...wanted,
    action: candidates[0] ? "reuse" : "create",
    modelId: candidates[0]?.id ?? randomUUID(),
    ownerToken: randomUUID(),
    inventoryHash: hash(rows),
    capabilities: api,
  });
  return {
    ok: true,
    target: "remote",
    command: "plan",
    plan: value,
    proof: {
      configuration: "inspected",
      inference: "not-run",
      providerCredential: "not-read-or-verified",
      managementWritePermission: "not-proven-by-read-only-inventory",
    },
    warnings: [
      ...(candidates[0]
        ? [
            "Equivalent non-secret routing exists. Reuse does not establish provider-key equality and does not rotate the existing key.",
          ]
        : [
            "API schema availability does not prove database/store_model_in_db prerequisites; apply reports any prerequisite refusal.",
          ]),
      "Read-only model inventory does not prove administrator write permission; apply reports authorization failures.",
      "The deployed API has no conditional-create/delete transaction. Use a maintenance window or ensure no concurrent model editor is active.",
    ],
  };
}
async function document(value, kind, approve) {
  let parsed = value;
  if (typeof value === "string") {
    try {
      const content = await readFile(value, "utf8");
      if (content.length > LIMIT) fail("invalid_document", "Plan or receipt is too large.");
      parsed = JSON.parse(content);
    } catch (error) {
      if (error instanceof RemoteError) throw error;
      fail("invalid_document", "Cannot read the selected plan or receipt JSON.");
    }
  }
  parsed = parsed?.[kind] ?? parsed;
  if (!parsed || parsed.schema !== SCHEMA || parsed.kind !== kind)
    fail("invalid_document", "Unsupported plan or receipt schema.");
  const { id, ...body } = parsed;
  if (id !== hash(body) || id !== approve)
    fail(
      "approval_mismatch",
      "The approved ID must equal the exact unchanged plan or receipt hash.",
    );
  endpoint(parsed.managementUrl, "record management URL");
  endpoint(parsed.inferenceUrl, "record inference URL");
  textOption(parsed.alias, "record alias");
  textOption(parsed.model, "record model");
  if (
    kind === "plan" &&
    (!Number.isFinite(Date.parse(parsed.expiresAt)) ||
      Date.parse(parsed.expiresAt) < Date.now() ||
      Date.parse(parsed.createdAt) > Date.now() ||
      Date.parse(parsed.expiresAt) - Date.parse(parsed.createdAt) > TTL)
  ) {
    fail(
      "plan_expired",
      "This plan is expired or has an invalid time window. Inspect again before approving a new plan.",
    );
  }
  return parsed;
}
function receipt(value, row, action) {
  return seal({
    schema: SCHEMA,
    kind: "receipt",
    createdAt: new Date().toISOString(),
    planId: value.id,
    managementUrl: value.managementUrl,
    inferenceUrl: value.inferenceUrl,
    alias: value.alias,
    model: value.model,
    action,
    modelId: row.id,
    ownerToken: action === "created" ? value.ownerToken : null,
    configHash: row.configHash,
    stateHash: row.stateHash,
    credentialProof: row.credentialProof,
  });
}
function attemptPath(options, value) {
  const path = resolve(
    options["attempt-file"] ??
      (typeof options.plan === "string" ? `${options.plan}.${value.id}.attempt.json` : ""),
  );
  if (!options["attempt-file"] && typeof options.plan !== "string")
    fail(
      "attempt_file_required",
      "An in-memory plan needs --attempt-file; file plans use an adjacent .<plan-id>.attempt.json journal.",
    );
  return path;
}
async function inspectAttemptDirectory(path) {
  try {
    const parent = resolve(path, "..");
    const directory = await lstat(parent, { bigint: true });
    if (
      !directory.isDirectory() ||
      (await realpath(parent)) !== parent ||
      (process.platform !== "win32" &&
        ((directory.mode & 0o022n) !== 0n || directory.uid !== BigInt(process.getuid())))
    ) {
      throw new Error("Unsafe attempt directory");
    }
    if (process.platform === "win32")
      return await inspectCurrentUserDirectoryBoundaryAsync(parent, "Remote attempt directory");
    return {
      birthtimeNs: String(directory.birthtimeNs),
      dev: String(directory.dev),
      ino: String(directory.ino),
      mode: String(directory.mode),
      uid: String(directory.uid),
    };
  } catch {
    fail(
      "unsafe_attempt_directory",
      "The attempt journal needs an owned canonical directory without group/other write access. Native Windows requires a directory inside LOCALAPPDATA with a verified current-user-only ACL; existing directory permissions are never changed.",
    );
  }
}
async function beginAttempt(path, value, expectedDirectory) {
  let handle;
  try {
    if (hash(await inspectAttemptDirectory(path)) !== hash(expectedDirectory))
      fail("unsafe_attempt_directory", "The attempt directory changed before journal creation.");
    try {
      handle = await open(
        path,
        constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0),
        0o600,
      );
    } catch (error) {
      if (error.code === "EEXIST")
        fail(
          "create_already_attempted",
          "This plan has already attempted creation. Only reconcile its exact model ID and owner marker; do not issue another create.",
        );
      throw error;
    }
    const expectedIdentity = pathIdentity(await handle.stat({ bigint: true }));
    if (process.platform === "win32")
      await secureAndVerifyCurrentUserFileAsync(path, 0o600, { expectedIdentity });
    await handle.writeFile(
      JSON.stringify({
        schema: SCHEMA,
        planId: value.id,
        modelId: value.modelId,
        ownerToken: value.ownerToken,
      }),
    );
    await handle.sync();
    if (process.platform === "win32")
      await verifyCurrentUserFileAsync(path, 0o600, { expectedIdentity });
    if (hash(await inspectAttemptDirectory(path)) !== hash(expectedDirectory))
      fail(
        "unsafe_attempt_directory",
        "The attempt directory changed while recording the journal.",
      );
    return expectedIdentity;
  } catch (error) {
    if (error instanceof RemoteError) throw error;
    fail(
      "attempt_journal_unavailable",
      "Cannot securely record the create attempt. No remote write was attempted.",
    );
  } finally {
    await handle?.close();
  }
}
function verifyAttemptIdentity(path, expectedIdentity) {
  try {
    const current = lstatSync(path, { bigint: true });
    if (
      !current.isFile() ||
      current.isSymbolicLink() ||
      realpathSync.native(path) !== path ||
      !samePathIdentity(pathIdentity(current), expectedIdentity)
    )
      throw new Error("Attempt journal path changed");
  } catch {
    fail(
      "attempt_journal_unavailable",
      "The attempt journal disappeared or changed before creation. No remote write was attempted.",
    );
  }
}
async function apply(options) {
  const value = await document(options.plan, "plan", options.approve);
  const { base, key } = await management(options, value.managementUrl);
  if (options["management-url"] && endpoint(options["management-url"], "management-url") !== base)
    fail("target_mismatch", "The management endpoint differs from the approved plan.");
  const api = await capabilities(base, key, options);
  if (hash(api) !== hash(value.capabilities))
    fail("api_changed", "The management API contract changed after planning. Re-plan.");
  const rows = await inventory(base, key, options);
  // A repeated apply reconciles only the exact attributable previous creation.
  const previous = rows.find((row) => row.id === value.modelId && row.marker === value.ownerToken);
  if (value.action === "create" && previous) {
    if (
      !matches(previous, value) ||
      previous.configHash !== expectedConfiguration(value) ||
      previous.ownership !== "api" ||
      rows.filter((row) => row.alias === value.alias).length !== 1
    )
      fail(
        "owned_route_changed",
        "An attributable route changed or its alias became ambiguous. Do not retry create.",
      );
    return {
      ok: true,
      target: "remote",
      command: "apply",
      status: "already-created",
      receipt: receipt(value, previous, "created"),
      proof: { configuration: "read-back", inference: "not-run" },
    };
  }
  if (hash(rows) !== value.inventoryHash)
    fail(
      "inventory_changed",
      "Model inventory changed after planning. Re-plan; no write was attempted.",
    );
  if (value.action === "reuse") {
    const row = rows.find((entry) => entry.id === value.modelId);
    if (!row || !matches(row, value) || row.ownership !== "api")
      fail("inventory_changed", "The reusable route changed. Re-plan.");
    return {
      ok: true,
      target: "remote",
      command: "apply",
      status: "reused",
      receipt: receipt(value, row, "reused"),
      proof: {
        configuration: "read-back",
        inference: "not-run",
        providerCredential: "unverified-existing-key",
      },
    };
  }
  if (value.action !== "create") fail("invalid_document", "Unsupported planned action.");
  const journal = attemptPath(options, value);
  const journalDirectory = await inspectAttemptDirectory(journal);
  const providerKey =
    value.provider?.kind === "remote-env"
      ? `os.environ/${textOption(value.provider.name, "Remote provider environment name", /^[A-Za-z_][A-Za-z0-9_]{0,127}$/)}`
      : await secret(value.provider);
  const body = {
    model_name: value.alias,
    litellm_params: {
      model: `openai/${value.model}`,
      api_base: BASE,
      use_chat_completions_api: true,
      additional_drop_params: ["reasoning_effort"],
      api_key: providerKey,
    },
    model_info: { id: value.modelId, [MARKER]: value.ownerToken },
  };
  const journalIdentity = await beginAttempt(journal, value, journalDirectory);
  let response;
  let createError;
  // No asynchronous boundary may separate this named-file proof from starting the POST.
  verifyAttemptIdentity(journal, journalIdentity);
  try {
    response = await request(base, "model/new", key, options, body);
  } catch (error) {
    createError = error;
  }
  let after;
  try {
    after = await inventory(base, key, options);
  } catch {
    fail(
      "create_unresolved",
      "Creation outcome is unresolved because readback failed. Reconcile this exact planned model ID before any create retry.",
      { modelId: value.modelId, planId: value.id },
    );
  }
  const row = after.find(
    (entry) => entry.id === value.modelId && entry.marker === value.ownerToken,
  );
  if (!row) {
    if (createError && !createError.details?.ambiguous) throw createError;
    fail(
      "create_unresolved",
      "No attributable creation is visible yet. Do not blindly retry: inspect the planned model ID and owner marker after gateway propagation, then reuse this plan while valid or ask the owner to reconcile.",
      { modelId: value.modelId, planId: value.id },
    );
  }
  if (
    !matches(row, value) ||
    row.configHash !== expectedConfiguration(value) ||
    row.ownership !== "api" ||
    after.filter((entry) => entry.alias === value.alias).length !== 1 ||
    (response?.model_id && response.model_id !== value.modelId) ||
    (response?.model_info?.id && response.model_info.id !== value.modelId)
  ) {
    fail(
      "create_readback_mismatch",
      "An attributable model exists but readback does not match the intended ID, ownership and route. Ask the owner to reconcile; no automatic deletion was attempted.",
      { modelId: value.modelId, planId: value.id },
    );
  }
  return {
    ok: true,
    target: "remote",
    command: "apply",
    status: createError ? "created-reconciled" : "created",
    receipt: receipt(value, row, "created"),
    proof: {
      configuration: "read-back",
      inference: "not-run",
      providerCredential: "not-inference-verified",
    },
  };
}
async function rollback(options) {
  const value = await document(options.receipt, "receipt", options.approve);
  if (value.action !== "created" || !value.ownerToken)
    fail("not_owned", "Reused routes do not belong to this run and cannot be rolled back.");
  const { base, key } = await management(options, value.managementUrl);
  if (options["management-url"] && endpoint(options["management-url"], "management-url") !== base)
    fail("target_mismatch", "The management endpoint differs from the receipt.");
  await capabilities(base, key, options);
  const rows = await inventory(base, key, options);
  const row = rows.find((entry) => entry.id === value.modelId);
  if (!row) return { ok: true, target: "remote", command: "rollback", status: "already-absent" };
  if (
    row.marker !== value.ownerToken ||
    row.configHash !== value.configHash ||
    row.stateHash !== value.stateHash ||
    row.ownership !== "api" ||
    !matches(row, value)
  ) {
    fail(
      "owned_route_changed",
      "The model no longer matches its ownership receipt. Rollback refuses to delete it.",
    );
  }
  let deleteError;
  try {
    await request(base, "model/delete", key, options, { id: value.modelId });
  } catch (error) {
    deleteError = error;
  }
  let after;
  try {
    after = await inventory(base, key, options);
  } catch {
    fail(
      "delete_unresolved",
      "Delete outcome is unresolved. Inspect the exact model ID before repeating rollback.",
    );
  }
  if (after.some((entry) => entry.id === value.modelId)) {
    if (deleteError && !deleteError.details?.ambiguous) throw deleteError;
    fail(
      "delete_unresolved",
      "The model remains visible after deletion. Do not assume rollback succeeded; reconcile with its owner.",
    );
  }
  return {
    ok: true,
    target: "remote",
    command: "rollback",
    status: "removed",
    modelId: value.modelId,
  };
}
async function check(options) {
  network(options, "inference");
  const base = endpoint(options["inference-url"], "inference-url");
  const alias = textOption(options.alias ?? "hetzner-default", "Model alias");
  const ref = source(options, "inference");
  const key = await secret(ref);
  if (options["management-key-file"] || options["management-key-env"]) {
    const managementRef = source(options, "management");
    if (hash(ref) === hash(managementRef) || key === (await secret(managementRef)))
      fail(
        "credential_role_conflict",
        "Remote management credentials must not be reused as inference client credentials.",
      );
  }
  const maxTokens = Number(options["max-tokens"] ?? 1024);
  if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 2048)
    fail("invalid_input", "max-tokens must be between 1 and 2048.");
  const data = await request(base, "chat/completions", key, options, {
    model: alias,
    messages: [{ role: "user", content: "Reply with OK." }],
    max_tokens: maxTokens,
    stream: false,
  });
  if (
    !Array.isArray(data?.choices) ||
    !data.choices.some(
      (choice) => typeof choice?.message?.content === "string" && choice.message.content.trim(),
    )
  )
    fail(
      data?.choices?.some?.((choice) => choice.finish_reason === "length")
        ? "inference_budget_exhausted"
        : "inference_invalid",
      "Inference returned no nonempty assistant response. A length-limited reasoning completion is inconclusive; select a suitable bounded --max-tokens value and retry the inference check.",
    );
  return {
    ok: true,
    target: "remote",
    command: "check",
    proof: {
      inference: "passed",
      protocol: "chat/completions non-streaming",
      clients: "not-tested",
      streaming: "not-tested",
      tools: "not-tested",
      providerDirect: "not-tested",
    },
  };
}
async function inspect(options, command) {
  const { base, key } = await management(options);
  const rows = await inventory(base, key, options);
  const selected = options.alias ? rows.filter((row) => row.alias === options.alias) : rows;
  const api = await capabilities(base, key, options);
  return {
    ok: true,
    target: "remote",
    command,
    api,
    modelCount: rows.length,
    selected: selected.map(({ id, alias, ownership }) => ({ id, alias, ownership })),
    proof: { configuration: "inspected", inference: "not-run" },
  };
}

const REMOTE_OPTIONS = new Set([
  "target",
  "mode",
  "management-url",
  "inference-url",
  "management-key-file",
  "management-key-env",
  "inference-key-file",
  "inference-key-env",
  "provider-key-file",
  "provider-env",
  "remote-env-confirmed",
  "approve-network",
  "model",
  "alias",
  "configuration-owner",
  "timeout-ms",
  "max-tokens",
  "plan",
  "receipt",
  "approve",
  "attempt-file",
]);
function validateOptions(options) {
  for (const [name, value] of Object.entries(options)) {
    if (!REMOTE_OPTIONS.has(name))
      fail(
        "unknown_option",
        "Unsupported remote option. Use only documented source-reference flags; literal credential flags and unknown options are refused.",
      );
    if (name === "remote-env-confirmed") {
      if (typeof value !== "boolean")
        fail("invalid_option_type", "remote-env-confirmed is a boolean flag without a value.");
    } else if (["plan", "receipt"].includes(name)) {
      if (
        typeof value !== "string" &&
        (!value || typeof value !== "object" || Array.isArray(value))
      )
        fail("invalid_option_type", "Plan and receipt require a JSON path or parsed document.");
    } else if (["timeout-ms", "max-tokens"].includes(name)) {
      if (!["number", "string"].includes(typeof value))
        fail("invalid_option_type", "Numeric remote options require a value.");
    } else if (typeof value !== "string" || value.length === 0) {
      fail(
        "invalid_option_type",
        "Remote value options require a nonempty value; missing values are refused before any credential or network access.",
      );
    }
  }
  if (options.target && options.target !== "remote")
    fail("invalid_target", "This adapter supports only the remote target.");
}
function diagnose(options) {
  return {
    ok: true,
    target: "remote",
    command: "diagnose",
    status: "inspection-required",
    ...(options["management-url"]
      ? { managementUrl: endpoint(options["management-url"], "management-url") }
      : {}),
    commands: COMMANDS,
    requirements: [
      "Select management and inference URLs and protected credential source references.",
      "Run status with --approve-network management for authenticated model/API inspection.",
      "Run plan for a selected model, alias and provider source; run check separately with an inference credential.",
    ],
    proof: {
      configuration: "not-inspected",
      inference: "not-run",
      credentials: "not-read",
      network: "not-used",
    },
  };
}

/** All outputs are sanitized summaries; raw gateway bodies and credentials never escape. */
export async function remoteCommand(command, options = {}) {
  try {
    validateOptions(options);
    if (options.mode && options.mode !== "autonomous")
      fail(
        "manual_dispatch_required",
        "Manual mode belongs to the no-network guide dispatcher; no credentials or endpoint were accessed.",
      );
    if (command === "help") return { ok: true, target: "remote", commands: COMMANDS };
    if (command === "plan") return await plan(options);
    if (command === "apply") return await apply(options);
    if (command === "rollback") return await rollback(options);
    if (command === "check") return await check(options);
    if (command === "diagnose") return diagnose(options);
    if (command === "status") return await inspect(options, command);
    fail(
      "unsupported_command",
      "Remote workflows are plan, apply, check, rollback, diagnose and status; remote process lifecycle is not managed.",
    );
  } catch (error) {
    return {
      ok: false,
      target: "remote",
      command,
      error: {
        code: error instanceof RemoteError ? error.code : "remote_failure",
        message:
          error instanceof RemoteError
            ? error.message
            : "Remote operation failed. Secret-bearing details have been suppressed.",
        ...(error instanceof RemoteError ? error.details : {}),
      },
    };
  }
}
