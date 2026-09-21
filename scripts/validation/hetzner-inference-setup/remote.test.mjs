import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { chmod, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { remoteCommand } from "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/remote.mjs";

const ADMIN = "fixture-management-secret";
const CLIENT = "fixture-inference-secret";
const PROVIDER = "fixture-provider-secret";
const BASE = "https://inference.hetzner.com/api/v1";
const ENV = "HETZNER_REMOTE_TEST_MANAGEMENT";
const CLIENT_ENV = "HETZNER_REMOTE_TEST_INFERENCE";
process.env[ENV] = ADMIN;
process.env[CLIENT_ENV] = CLIENT;
const definition = (properties) => ({
  requestBody: { content: { "application/json": { schema: { properties } } } },
});
const schema = () => ({
  info: { version: "1.97.0" },
  paths: {
    "/model/info": { get: {} },
    "/model/new": { post: definition({ model_name: {}, litellm_params: {}, model_info: {} }) },
    "/model/delete": { post: definition({ id: {} }) },
  },
});
function existing(overrides = {}) {
  return {
    model_name: "hetzner-default",
    litellm_params: {
      model: "openai/fixture-model",
      api_base: BASE,
      use_chat_completions_api: true,
      additional_drop_params: ["reasoning_effort"],
      api_key: "*****",
    },
    model_info: { id: "existing-id", db_model: true },
    ...overrides,
  };
}
async function fixture(t, overrides = {}) {
  const dir = await mkdtemp(join(tmpdir(), "hetzner-remote-"));
  const state = { rows: [], calls: [], schema: schema(), ...overrides };
  const server = createServer(async (request, response) => {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const body = raw ? JSON.parse(raw) : undefined;
    const path = request.url;
    state.calls.push({
      path,
      method: request.method,
      authorization: request.headers.authorization,
      body,
    });
    const send = (code, value) => {
      response.writeHead(code, { "content-type": "application/json" });
      response.end(JSON.stringify(value));
    };
    if (state.redirect) {
      response.writeHead(307, { location: `${state.redirect}/stolen` });
      response.end();
      return;
    }
    if (state.override && (await state.override({ path, body, request, response, send, state })))
      return;
    const infer = path === "/gateway/v1/chat/completions";
    if (request.headers.authorization !== `Bearer ${infer ? CLIENT : ADMIN}`) {
      send(403, { error: `Denied: ${ADMIN} ${PROVIDER}` });
      return;
    }
    if (path === "/gateway/model/info") {
      send(200, { data: state.rows });
      return;
    }
    if (path === "/gateway/openapi.json") {
      send(200, state.schema);
      return;
    }
    if (path === "/gateway/model/new") {
      const row = {
        ...body,
        litellm_params: { ...body.litellm_params, api_key: "*****" },
        model_info: { ...body.model_info, db_model: true },
      };
      state.rows.push(row);
      if (state.disconnectCreate) {
        response.destroy();
        return;
      }
      send(200, { model_id: row.model_info.id, litellm_params: { api_key: PROVIDER } });
      return;
    }
    if (path === "/gateway/model/delete") {
      state.rows = state.rows.filter((row) => row.model_info.id !== body.id);
      send(200, { deleted: true });
      return;
    }
    if (infer) {
      send(200, { choices: [{ message: { content: `OK ${PROVIDER}` } }] });
      return;
    }
    send(404, { error: "not found" });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const options = {
    "management-url": `${origin}/gateway`,
    "inference-url": `${origin}/gateway/v1`,
    "management-key-env": ENV,
    "approve-network": "management",
    model: "fixture-model",
    "provider-env": "REMOTE_HETZNER",
    "remote-env-confirmed": true,
    "attempt-file": join(dir, "attempt.json"),
  };
  return { dir, state, options, origin };
}
async function planned(options) {
  const result = await remoteCommand("plan", options);
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.plan;
}
async function applied(options) {
  const plan = await planned(options);
  const result = await remoteCommand("apply", { ...options, plan, approve: plan.id });
  assert.equal(result.ok, true, JSON.stringify(result));
  return { plan, result, receipt: result.receipt };
}
function noSecrets(value) {
  for (const secret of [ADMIN, CLIENT, PROVIDER])
    assert.equal(JSON.stringify(value).includes(secret), false);
}
function reseal(value) {
  const sort = (entry) =>
    Array.isArray(entry)
      ? entry.map(sort)
      : entry && typeof entry === "object"
        ? Object.fromEntries(
            Object.keys(entry)
              .sort()
              .map((key) => [key, sort(entry[key])]),
          )
        : entry;
  const { id: _id, ...body } = value;
  return {
    ...body,
    id: createHash("sha256")
      .update(JSON.stringify(sort(body)))
      .digest("hex"),
  };
}

test("remote creation preserves URL prefixes, binds readback and separates inference proof", async (t) => {
  const { state, options, dir } = await fixture(t);
  const { receipt, result } = await applied(options);
  assert.equal(result.status, "created");
  assert.equal(result.proof.inference, "not-run");
  assert.equal(state.rows[0].model_info.id, receipt.modelId);
  assert.equal(
    state.calls.find((entry) => entry.path.endsWith("/model/new")).body.litellm_params.api_key,
    "os.environ/REMOTE_HETZNER",
  );
  assert.equal(JSON.parse(await readFile(join(dir, "attempt.json"))).modelId, receipt.modelId);
  noSecrets(result);
  const checked = await remoteCommand("check", {
    ...options,
    "approve-network": "inference",
    "inference-key-env": CLIENT_ENV,
  });
  assert.equal(checked.proof.inference, "passed");
  assert.equal(checked.proof.clients, "not-tested");
  noSecrets(checked);
});

test(
  "provider file is not opened during plan, but protected and read at apply",
  { skip: process.platform === "win32" },
  async (t) => {
    const { options, dir, state } = await fixture(t);
    delete options["provider-env"];
    options["provider-key-file"] = join(dir, "provider");
    const plan = await planned(options);
    assert.equal(
      state.calls.some((entry) => entry.method === "POST"),
      false,
    );
    const absent = await remoteCommand("apply", { ...options, plan, approve: plan.id });
    assert.equal(absent.error.code, "credential_unavailable");
    await writeFile(options["provider-key-file"], PROVIDER, { mode: 0o600 });
    const result = await remoteCommand("apply", { ...options, plan, approve: plan.id });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(
      state.calls.find((entry) => entry.path.endsWith("/model/new")).body.litellm_params.api_key,
      PROVIDER,
    );
    noSecrets(plan);
    noSecrets(result);
  },
);

test("read-only plans require management approval and remote env confirmation", async (t) => {
  const { options, state } = await fixture(t);
  const unapprovedOptions = { ...options };
  delete unapprovedOptions["approve-network"];
  const unapproved = await remoteCommand("plan", unapprovedOptions);
  assert.equal(unapproved.error.code, "network_approval_required");
  const unconfirmed = await remoteCommand("plan", { ...options, "remote-env-confirmed": false });
  assert.equal(unconfirmed.error.code, "remote_secret_unconfirmed");
  assert.equal(state.calls.length, 0);
  const manual = await remoteCommand("plan", { ...options, mode: "manual" });
  assert.equal(manual.error.code, "manual_dispatch_required");
  assert.equal(state.calls.length, 0);
});

test(
  "credential read refuses broad Unix modes and symlinks",
  { skip: process.platform === "win32" },
  async (t) => {
    const { options, dir, state } = await fixture(t);
    const path = join(dir, "management");
    await writeFile(path, ADMIN, { mode: 0o644 });
    delete options["management-key-env"];
    options["management-key-file"] = path;
    assert.equal((await remoteCommand("plan", options)).error.code, "unsafe_credential_file");
    await chmod(path, 0o600);
    await symlink(path, join(dir, "link"));
    options["management-key-file"] = join(dir, "link");
    assert.equal((await remoteCommand("plan", options)).error.code, "unsafe_credential_file");
    assert.equal(state.calls.length, 0);
  },
);

test("non-loopback HTTP, URL credentials, query strings and fragments are rejected", async (t) => {
  const { options, state } = await fixture(t);
  for (const base of [
    "http://example.test",
    "https://user:pass@example.test",
    "https://example.test?key=secret",
    "https://example.test#fragment",
  ]) {
    assert.equal(
      (await remoteCommand("plan", { ...options, "management-url": base })).error.code,
      "invalid_url",
    );
  }
  assert.equal(state.calls.length, 0);
});

test("redirects never forward a management bearer or expose server errors", async (t) => {
  const sink = await fixture(t);
  const source = await fixture(t, { redirect: sink.origin });
  const result = await remoteCommand("plan", source.options);
  assert.equal(result.error.code, "transport_error");
  assert.equal(sink.state.calls.length, 0);
  noSecrets(result);
});

test("management role refusal is explicit and secret-bearing body is suppressed", async (t) => {
  const { options } = await fixture(t);
  const result = await remoteCommand("plan", { ...options, "management-key-env": CLIENT_ENV });
  assert.equal(result.error.code, "credential_role_denied");
  assert.equal(result.error.httpStatus, 403);
  noSecrets(result);
});

test("matching API-owned route is reused without claiming provider credential equality", async (t) => {
  const { options, state } = await fixture(t, { rows: [existing()] });
  const { result, receipt } = await applied(options);
  assert.equal(result.status, "reused");
  assert.equal(result.proof.providerCredential, "unverified-existing-key");
  assert.equal(state.calls.filter((entry) => entry.method === "POST").length, 0);
  const rollback = await remoteCommand("rollback", { ...options, receipt, approve: receipt.id });
  assert.equal(rollback.error.code, "not_owned");
});

test("config-owned and declared GitOps workflows receive a concrete non-mutating handoff", async (t) => {
  const { options, state } = await fixture(t, {
    rows: [existing({ model_info: { id: "config-id", db_model: false } })],
  });
  const result = await remoteCommand("plan", options);
  assert.equal(result.status, "owner-handoff");
  assert.equal(result.patch.model_list[0].litellm_params.api_key, "os.environ/REMOTE_HETZNER");
  const before = state.calls.length;
  const explicit = await remoteCommand("plan", {
    ...options,
    "configuration-owner": "gitops",
    "management-key-env": "ABSENT",
  });
  assert.equal(explicit.status, "owner-handoff");
  assert.equal(state.calls.length, before);
  assert.equal(state.calls.filter((entry) => entry.method === "POST").length, 0);
});

test("conflicting, ambiguous and unknown-owner aliases fail without overwriting", async (t) => {
  const { options, state } = await fixture(t);
  state.rows = [existing({ litellm_params: { model: "openai/other", api_base: BASE } })];
  assert.equal((await remoteCommand("plan", options)).error.code, "alias_conflict");
  state.rows = [existing(), existing({ model_info: { id: "second", db_model: true } })];
  assert.equal((await remoteCommand("plan", options)).error.code, "alias_ambiguous");
  state.rows = [existing({ model_info: { id: "unknown" } })];
  assert.equal((await remoteCommand("plan", options)).error.code, "ownership_unknown");
  assert.equal(state.calls.filter((entry) => entry.method === "POST").length, 0);
});

test("unsupported management schemas and user-scoped inventory cannot authorize mutations", async (t) => {
  const { options, state } = await fixture(t);
  delete state.schema.paths["/model/delete"];
  assert.equal((await remoteCommand("plan", options)).error.code, "unsupported_api");
  state.override = ({ path, send }) => {
    if (path.endsWith("/model/info")) {
      send(200, { data: { model: "user-specific" } });
      return true;
    }
    return false;
  };
  assert.equal((await remoteCommand("plan", options)).error.code, "unsupported_inventory");
});

test("database prerequisites fail with an owner handoff and no inferred setup success", async (t) => {
  const { options, state } = await fixture(t);
  state.override = ({ path, send }) => {
    if (path.endsWith("/model/new")) {
      send(400, { error: `STORE_MODEL_IN_DB not enabled; ${PROVIDER}` });
      return true;
    }
    return false;
  };
  const plan = await planned(options);
  const result = await remoteCommand("apply", { ...options, plan, approve: plan.id });
  assert.equal(result.error.code, "database_prerequisite");
  noSecrets(result);
  assert.equal(state.rows.length, 0);
});

test("plan hash, expiration, target and changing inventory/API are rechecked before writes", async (t) => {
  const { options, state } = await fixture(t);
  const plan = await planned(options);
  assert.equal(
    (
      await remoteCommand("apply", {
        ...options,
        plan: { ...plan, alias: "changed" },
        approve: plan.id,
      })
    ).error.code,
    "approval_mismatch",
  );
  const expired = reseal({
    ...plan,
    createdAt: "2001-01-01T00:00:00.000Z",
    expiresAt: "2001-01-01T00:15:00.000Z",
  });
  assert.equal(
    (await remoteCommand("apply", { ...options, plan: expired, approve: expired.id })).error.code,
    "plan_expired",
  );
  assert.equal(
    (
      await remoteCommand("apply", {
        ...options,
        plan,
        approve: plan.id,
        "management-url": "https://different.example",
      })
    ).error.code,
    "target_mismatch",
  );
  state.rows.push(existing({ model_name: "unrelated" }));
  assert.equal(
    (await remoteCommand("apply", { ...options, plan, approve: plan.id })).error.code,
    "inventory_changed",
  );
  state.rows = [];
  state.schema.info.version = "2.0.0";
  assert.equal(
    (await remoteCommand("apply", { ...options, plan, approve: plan.id })).error.code,
    "api_changed",
  );
  assert.equal(state.calls.filter((entry) => entry.method === "POST").length, 0);
});

test("ambiguous create reconciles the preallocated ID and marker without retrying POST", async (t) => {
  const { options, state } = await fixture(t, { disconnectCreate: true });
  const { plan, result } = await applied(options);
  assert.equal(result.status, "created-reconciled");
  const again = await remoteCommand("apply", { ...options, plan, approve: plan.id });
  assert.equal(again.status, "already-created");
  assert.equal(state.calls.filter((entry) => entry.path.endsWith("/model/new")).length, 1);
  state.rows[0].litellm_params.timeout = 7;
  assert.equal(
    (await remoteCommand("apply", { ...options, plan, approve: plan.id })).error.code,
    "owned_route_changed",
  );
});

test("uncertain create is journaled and rerunning the same plan cannot issue a blind retry", async (t) => {
  const { options, state } = await fixture(t);
  state.override = ({ path, response }) => {
    if (path.endsWith("/model/new")) {
      response.destroy();
      return true;
    }
    return false;
  };
  const plan = await planned(options);
  assert.equal(
    (await remoteCommand("apply", { ...options, plan, approve: plan.id })).error.code,
    "create_unresolved",
  );
  assert.equal(
    (await remoteCommand("apply", { ...options, plan, approve: plan.id })).error.code,
    "create_already_attempted",
  );
  assert.equal(state.calls.filter((entry) => entry.path.endsWith("/model/new")).length, 1);
});

test("concurrent identical apply admits at most one creation attempt", async (t) => {
  const { options, state } = await fixture(t);
  const plan = await planned(options);
  const results = await Promise.all(
    [1, 2].map(() => remoteCommand("apply", { ...options, plan, approve: plan.id })),
  );
  assert.ok(results.some((result) => result.ok));
  assert.equal(state.calls.filter((entry) => entry.path.endsWith("/model/new")).length, 1);
});

test("readback rejects lost ownership or changed settings and never auto-deletes a created route", async (t) => {
  const { options, state } = await fixture(t);
  state.override = ({ path, body, send }) => {
    if (path.endsWith("/model/new")) {
      state.rows.push(
        existing({
          model_info: { ...body.model_info, db_model: true },
          litellm_params: { ...body.litellm_params, api_key: "*****", timeout: 3 },
        }),
      );
      send(200, { model_id: body.model_info.id });
      return true;
    }
    return false;
  };
  const plan = await planned(options);
  assert.equal(
    (await remoteCommand("apply", { ...options, plan, approve: plan.id })).error.code,
    "create_readback_mismatch",
  );
  assert.equal(state.rows.length, 1);
  assert.equal(
    state.calls.some((entry) => entry.path.endsWith("/model/delete")),
    false,
  );
});

test("rollback requires exact owned identity and full non-secret routing configuration", async (t) => {
  const { options, state } = await fixture(t);
  const { receipt } = await applied(options);
  state.rows[0].litellm_params.timeout = 10;
  assert.equal(
    (await remoteCommand("rollback", { ...options, receipt, approve: receipt.id })).error.code,
    "owned_route_changed",
  );
  delete state.rows[0].litellm_params.timeout;
  const marker = state.rows[0].model_info.hetzner_setup_owner;
  state.rows[0].model_info.hetzner_setup_owner = "foreign";
  assert.equal(
    (await remoteCommand("rollback", { ...options, receipt, approve: receipt.id })).error.code,
    "owned_route_changed",
  );
  state.rows[0].model_info.hetzner_setup_owner = marker;
  assert.equal(
    (await remoteCommand("rollback", { ...options, receipt, approve: receipt.id })).status,
    "removed",
  );
  assert.equal(
    (await remoteCommand("rollback", { ...options, receipt, approve: receipt.id })).status,
    "already-absent",
  );
  assert.equal(state.calls.filter((entry) => entry.path.endsWith("/model/delete")).length, 1);
});

test("inference cannot reuse the supplied management secret and failure does not delete routes", async (t) => {
  const { options, state } = await fixture(t);
  await applied(options);
  const conflicting = await remoteCommand("check", {
    ...options,
    "approve-network": "inference",
    "inference-key-env": ENV,
  });
  assert.equal(conflicting.error.code, "credential_role_conflict");
  state.override = ({ path, send }) => {
    if (path.endsWith("/chat/completions")) {
      send(502, { error: PROVIDER });
      return true;
    }
    return false;
  };
  const failed = await remoteCommand("check", {
    ...options,
    "approve-network": "inference",
    "inference-key-env": CLIENT_ENV,
  });
  assert.equal(failed.ok, false);
  noSecrets(failed);
  assert.equal(state.rows.length, 1);
  assert.equal(
    state.calls.some((entry) => entry.path.endsWith("/model/delete")),
    false,
  );
});

test("status exposes bounded inspection and rejects remote process lifecycle", async (t) => {
  const { options, state } = await fixture(t, { rows: [existing()] });
  for (const command of ["status"]) {
    const result = await remoteCommand(command, options);
    assert.equal(result.ok, true);
    assert.equal(result.proof.inference, "not-run");
    assert.deepEqual(Object.keys(result.selected[0]).sort(), ["alias", "id", "ownership"]);
    noSecrets(result);
  }
  const before = state.calls.length;
  assert.equal((await remoteCommand("stop", options)).error.code, "unsupported_command");
  assert.equal(state.calls.length, before);
});

test("route reuse requires exact non-secret parameters, while null defaults and base slash are inert", async (t) => {
  const { options, state } = await fixture(t, { rows: [existing()] });
  state.rows[0].litellm_params.timeout = 5;
  assert.equal((await remoteCommand("plan", options)).error.code, "alias_conflict");
  state.rows[0].litellm_params.timeout = null;
  state.rows[0].litellm_params.api_base = `${BASE}/`;
  assert.equal((await remoteCommand("plan", options)).plan.action, "reuse");
});

test("rollback refuses changed team ownership metadata despite retained setup marker", async (t) => {
  const { options, state } = await fixture(t);
  const { receipt } = await applied(options);
  state.rows[0].model_info.team_id = "new-owner";
  assert.equal(
    (await remoteCommand("rollback", { ...options, receipt, approve: receipt.id })).error.code,
    "owned_route_changed",
  );
  assert.equal(
    state.calls.some((entry) => entry.path.endsWith("/model/delete")),
    false,
  );
});

test("LiteLLM inventory may omit API keys entirely while returning a valid route", async (t) => {
  const { options, state } = await fixture(t, { rows: [existing()] });
  delete state.rows[0].litellm_params.api_key;
  const reused = await applied(options);
  assert.equal(reused.result.status, "reused");
  assert.equal(reused.result.proof.providerCredential, "unverified-existing-key");
});

test("routing output-token limits remain material state rather than being redacted as credentials", async (t) => {
  const { options, state } = await fixture(t, { rows: [existing()] });
  state.rows[0].litellm_params.max_tokens = 1;
  assert.equal((await remoteCommand("plan", options)).error.code, "alias_conflict");
});

test("readable model inventory does not imply permission to create a model", async (t) => {
  const { options, state } = await fixture(t);
  options["management-key-env"] = CLIENT_ENV;
  state.override = ({ path, send }) => {
    if (path.endsWith("/model/info")) {
      send(200, { data: [] });
      return true;
    }
    if (path.endsWith("/openapi.json")) {
      send(200, state.schema);
      return true;
    }
    if (path.endsWith("/model/new")) {
      send(403, { error: `PROXY_ADMIN required: ${ADMIN}` });
      return true;
    }
    return false;
  };
  const plan = await planned(options);
  const result = await remoteCommand("apply", { ...options, plan, approve: plan.id });
  assert.equal(result.error.code, "credential_role_denied");
  assert.equal(state.rows.length, 0);
  noSecrets(result);
});

test("a real request timeout reconciles the attributed creation without a second create", async (t) => {
  const { options, state } = await fixture(t);
  options["timeout-ms"] = 100;
  state.override = ({ path, body }) => {
    if (path.endsWith("/model/new")) {
      state.rows.push({
        ...body,
        litellm_params: { ...body.litellm_params, api_key: undefined },
        model_info: { ...body.model_info, db_model: true },
      });
      return true;
    }
    return false;
  };
  const { result } = await applied(options);
  assert.equal(result.status, "created-reconciled");
  assert.equal(state.calls.filter((entry) => entry.path.endsWith("/model/new")).length, 1);
});

test("diagnose is offline even with unavailable credential sources and approved network flags", async (t) => {
  const { options, state } = await fixture(t);
  const result = await remoteCommand("diagnose", {
    ...options,
    "management-key-env": "MISSING_MANAGEMENT_CREDENTIAL",
  });
  assert.equal(result.ok, true);
  assert.equal(result.proof.credentials, "not-read");
  assert.equal(result.proof.network, "not-used");
  assert.equal(state.calls.length, 0);
});

test("unknown and valueless options fail before credentials or network are accessed", async (t) => {
  const { options, state } = await fixture(t);
  for (const extra of [
    { "dry-run": true },
    { "management-key": ADMIN },
    { "management-url": true },
    { "remote-env-confirmed": "true" },
  ]) {
    const result = await remoteCommand("plan", { ...options, ...extra });
    assert.equal(result.ok, false);
    assert.ok(["unknown_option", "invalid_option_type"].includes(result.error.code));
    noSecrets(result);
  }
  assert.equal(state.calls.length, 0);
});

test(
  "caller-owned protected credential files allow exactly one trailing LF or CRLF",
  { skip: process.platform === "win32" },
  async (t) => {
    const { options, dir, state } = await fixture(t);
    delete options["management-key-env"];
    options["management-key-file"] = join(dir, "management-newline");
    for (const suffix of ["\n", "\r\n"]) {
      await writeFile(options["management-key-file"], `${ADMIN}${suffix}`, { mode: 0o600 });
      assert.equal((await remoteCommand("plan", options)).ok, true);
    }
    const requests = state.calls.length;
    for (const value of [`${ADMIN}\n\n`, `${ADMIN}\nembedded`, ` ${ADMIN}\n`, `${ADMIN} \n`]) {
      await writeFile(options["management-key-file"], value, { mode: 0o600 });
      const result = await remoteCommand("plan", options);
      assert.equal(result.error.code, "unsafe_credential_file");
      noSecrets(result);
    }
    assert.equal(state.calls.length, requests);
  },
);

test("standalone remote CLI rejects literal credential flags and missing option values with failure exits", () => {
  const script = fileURLToPath(
    new URL(
      "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/manage-remote-hetzner.mjs",
      import.meta.url,
    ),
  );
  for (const args of [
    ["plan", "--management-key", ADMIN],
    ["plan", "--management-url"],
  ]) {
    const child = spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
    assert.equal(child.status, 1);
    const result = JSON.parse(child.stdout);
    assert.ok(["unknown_option", "invalid_option_type"].includes(result.error.code));
    noSecrets({ stdout: child.stdout, stderr: child.stderr });
  }
});
