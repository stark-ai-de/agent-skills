import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  inspect,
  plan,
  apply,
  resume,
  check,
  status,
  splitNote,
} from "../../skills/engineering-workflows/karakeep-knowledge/scripts/knowledge/reconcile.mjs";
import {
  writeJson,
  readJson,
  readPrivate,
  hash,
  identity,
  lock,
  loadPolicy,
  locations,
  loadStore,
} from "../../skills/engineering-workflows/karakeep-knowledge/scripts/knowledge/state.mjs";
import {
  literal,
  origin,
  credentials,
  Karakeep,
} from "../../skills/engineering-workflows/karakeep-knowledge/scripts/knowledge/karakeep.mjs";
import {
  snapshot,
  git,
} from "../../skills/engineering-workflows/karakeep-knowledge/scripts/knowledge/git.mjs";
const exec = promisify(execFile);
const helper = fileURLToPath(
  new URL(
    "../../skills/engineering-workflows/karakeep-knowledge/scripts/knowledge.mjs",
    import.meta.url,
  ),
);
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "kk-helper-"));
  await fs.chmod(root, 0o700);
  const objects = new Map(),
    members = new Map(),
    writes = [],
    requests = [],
    faults = {};
  let next = 0,
    loseCreate = false;
  const lists = [
    { id: "list1", type: "manual", public: false },
    { id: "list2", type: "manual", public: false },
  ];
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, "http://localhost"),
      parts = u.pathname.split("/").filter(Boolean).slice(2),
      key = req.headers.authorization;
    const send = (value, code = 200) => {
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(value));
    };
    requests.push({ method: req.method, path: u.pathname });
    if (!["Bearer test-secret", "Bearer read-secret", "Bearer wrong-secret"].includes(key))
      return send({}, 401);
    if (req.method !== "GET" && key === "Bearer read-secret") return send({}, 403);
    let payload = {};
    if (req.method !== "GET") {
      let raw = "";
      for await (const chunk of req) raw += chunk;
      payload = raw ? JSON.parse(raw) : {};
      writes.push({ method: req.method, path: u.pathname, payload });
    }
    if (parts.join("/") === "users/me")
      return send({ id: key === "Bearer wrong-secret" ? "other" : "account" });
    if (parts[0] === "lists") {
      if (parts.length === 1) return send({ lists });
      if (parts.length === 2)
        return send(
          lists.find((x) => x.id === parts[1]) || {},
          lists.some((x) => x.id === parts[1]) ? 200 : 404,
        );
      if (parts[2] === "bookmarks" && req.method === "PUT") {
        const m = members.get(parts[3]) || new Set();
        m.add(parts[1]);
        members.set(parts[3], m);
        res.writeHead(204);
        return res.end();
      }
    }
    if (parts[0] !== "bookmarks") return send({}, 404);
    if (parts.length === 1) {
      if (req.method === "GET") {
        const offset = Number(u.searchParams.get("cursor") || 0),
          all = [...objects.values()];
        return send({
          bookmarks: all.slice(offset, offset + 2),
          nextCursor: offset + 2 < all.length ? String(offset + 2) : null,
        });
      }
      const old = [...objects.values()].find(
        (x) => payload.type === "link" && x.content.url === payload.url,
      );
      if (faults.rejectCreate) return send({}, faults.rejectCreate);
      if (faults.dropWithoutCreate) {
        req.socket.destroy();
        return;
      }
      if (old) {
        // v0.33.2 ordinary re-saves mutate these fields; import/rss are exempt.
        if (!["import", "rss"].includes(payload.source)) {
          for (const k of ["title", "note"]) if (Object.hasOwn(payload, k)) old[k] = payload[k];
          old.archived = false;
          old.createdAt = old.modifiedAt = new Date().toISOString();
        }
        return send({ ...old, alreadyExists: true });
      }
      const id = "b" + ++next,
        b = {
          id,
          title: payload.title ?? null,
          note: payload.note ?? null,
          content:
            payload.type === "text"
              ? { type: "text", text: payload.text }
              : { type: "link", url: payload.url },
          tags: [],
        };
      objects.set(id, b);
      if (loseCreate) {
        loseCreate = false;
        req.socket.destroy();
        return;
      }
      return send(b, 201);
    }
    const b = objects.get(parts[1]);
    if (!b) return send({}, 404);
    if (parts[2] === "lists")
      return send({ lists: [...(members.get(b.id) || [])].map((id) => ({ id })) });
    if (parts[2] === "tags" && req.method === "POST") {
      for (const tag of payload.tags)
        if (!b.tags.some((x) => x.name === tag.tagName)) b.tags.push({ name: tag.tagName });
      return send({ attached: b.tags });
    }
    if (faults.readback403 && parts.length === 2 && req.method === "GET") return send({}, 403);
    if (parts[2] === "content") {
      const text = b.content.type === "text" ? b.content.text : (b.captured ?? "");
      const offset = Number(u.searchParams.get("cursor") || 0),
        chunk = text.slice(offset, offset + 50);
      if (offset && faults.contentPageError) return send({}, 503);
      if (faults.missingCapture) return send({}, 404);
      return send({
        bookmarkId: b.id,
        content: chunk,
        contentVersion: offset && faults.contentVersionChange ? "changed" : hash(text),
        nextCursor: offset + 50 < text.length ? String(offset + 50) : null,
        truncated: offset + 50 < text.length,
      });
    }
    if (req.method === "PATCH") {
      for (const k of ["title", "note"]) if (Object.hasOwn(payload, k)) b[k] = payload[k];
      if (Object.hasOwn(payload, "text")) b.content.text = payload.text;
    }
    return send(b);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(root, { recursive: true, force: true });
  });
  const address = "http://127.0.0.1:" + server.address().port;
  const credentialFile = path.join(root, "auth.env");
  await fs.writeFile(
    credentialFile,
    "KARAKEEP_API_ADDR=" + address + "\nKARAKEEP_API_KEY=test-secret\n",
    { mode: 0o600 },
  );
  const p = {
    schemaVersion: 1,
    id: "policy",
    revision: "1",
    scope: "collection",
    connection: {
      address,
      accountId: "account",
      credentialFile,
      apiProfile: "karakeep-0.33",
      scopes: ["bookmarks:readwrite", "lists:readwrite", "tags:readwrite", "users:read"],
    },
    stateRoot: path.join(root, "state"),
    writerHost: os.hostname(),
    writeEnabled: true,
    kinds: ["source", "document", "session", "overview", "finding", "dossier", "dataset"],
    operations: ["create", "update", "membership", "tag"],
    listIds: ["list1"],
    tags: { session: ["kind-session"] },
    approvedAggregates: [],
    approval: "Synthetic test grant",
  };
  const policyFile = path.join(root, "policy.json");
  await writeJson(policyFile, p);
  const run = path.join(p.stateRoot, "run");
  await fs.mkdir(run, { recursive: true, mode: 0o700 });
  const f = {
    root,
    p,
    policyFile,
    run,
    objects,
    writes,
    members,
    credentialFile,
    requests,
    faults,
    lose: () => {
      loseCreate = true;
    },
    savePolicy: () => writeJson(policyFile, p),
  };
  f.prepare = async (items, { repo, runDir = run } = {}) => {
    await fs.mkdir(runDir, { recursive: true, mode: 0o700 });
    const inspectionFile = path.join(runDir, "inspection.json"),
      intentFile = path.join(runDir, "intent.json"),
      planFile = path.join(runDir, "plan.json");
    const inspection = await inspect({ repo, policy: policyFile, out: inspectionFile });
    await writeJson(intentFile, { schemaVersion: 1, inspectionId: inspection.inspectionId, items });
    const planned = await plan({
      inspection: inspectionFile,
      intent: intentFile,
      policy: policyFile,
      out: planFile,
    });
    return {
      inspection,
      planned,
      inspectionFile,
      intentFile,
      planFile,
      apply: () => apply({ plan: planFile, policy: policyFile, expectPlan: planned.planHash }),
    };
  };
  f.text = async (name = "report.txt", text = "Actual work and measured results.") => {
    await fs.writeFile(path.join(run, name), text, { mode: 0o600 });
    return name;
  };
  return f;
}
const report = (contentFile, id = "session-one") => ({
  kind: "session",
  id,
  title: "Work report",
  contentFile,
  references: [],
});
test("literal secrets match shell-literal parsing without executing substitutions", () => {
  assert.equal(literal("'literal $(never-run)' # comment"), "literal $(never-run)");
  assert.equal(literal('"a\\$b"'), "a\\$b");
  assert.equal(literal("one\\ two"), "one two");
  assert.throws(() => literal("one two"));
  assert.throws(() => literal("'unfinished"));
  assert.throws(() => origin("https://example.com"));
  assert.throws(() => origin("https://karakeep.localhost"));
  assert.throws(() => origin("http://localhost/path"));
});
test("private credentials reject symlinks and permissive files", async (t) => {
  const f = await fixture(t);
  await fs.chmod(f.credentialFile, 0o644);
  await assert.rejects(credentials(f.p.connection), (e) => e.code === "private_file");
  await fs.chmod(f.credentialFile, 0o600);
  const link = path.join(f.root, "link");
  await fs.symlink(f.credentialFile, link);
  await assert.rejects(readPrivate(link), (e) => e.code === "invalid_path");
});
test("inspect and plan are read-only; repeat preserves identity with no remote writes", async (t) => {
  const f = await fixture(t),
    file = await f.text(),
    run = await f.prepare([report(file)]);
  assert.equal(f.writes.length, 0);
  assert.equal((await run.apply()).status, "complete");
  const before = f.writes.length,
    id = [...f.objects.keys()][0];
  const second = await f.prepare([report(file)]);
  assert.equal(second.planned.operations[0].status, "unchanged");
  await second.apply();
  assert.equal(f.writes.length, before);
  assert.deepEqual([...f.objects.keys()], [id]);
  assert.deepEqual([...f.members.get(id)], ["list1"]);
});
test("human note additions survive while managed text edits become conflicts", async (t) => {
  const f = await fixture(t),
    file = await f.text();
  await (await f.prepare([report(file)])).apply();
  const b = [...f.objects.values()][0];
  b.note = "Human note\n\n" + b.note + "\nHuman suffix";
  await f.text(file, "Revised facts.");
  await (await f.prepare([report(file)])).apply();
  assert.ok(b.note.startsWith("Human note"));
  assert.ok(b.note.endsWith("Human suffix"));
  b.content.text = "Human text edit";
  const conflict = await f.prepare([report(file)]);
  assert.equal(conflict.planned.operations[0].status, "conflict");
  const count = f.writes.length;
  assert.equal((await conflict.apply()).status, "pending");
  assert.equal(f.writes.length, count);
});
test("changed input, tampered plan, wrong account and read-only key never silently write", async (t) => {
  const f = await fixture(t),
    file = await f.text(),
    r = await f.prepare([report(file)]);
  await f.text(file, "Changed after plan");
  await assert.rejects(r.apply(), (e) => e.code === "needs_replan");
  assert.equal(f.writes.length, 0);
  await fs.writeFile(
    f.credentialFile,
    "KARAKEEP_API_ADDR=" + f.p.connection.address + "\nKARAKEEP_API_KEY=wrong-secret\n",
    { mode: 0o600 },
  );
  await assert.rejects(f.prepare([report(file)]), (e) => e.code === "account");
  await fs.writeFile(
    f.credentialFile,
    "KARAKEEP_API_ADDR=" + f.p.connection.address + "\nKARAKEEP_API_KEY=read-secret\n",
    { mode: 0o600 },
  );
  const read = await f.prepare([report(file)]);
  await assert.rejects(read.apply(), (e) => e.code === "http_403");
  assert.equal(f.objects.size, 0);
});
test("uncertain create resumes by its persisted identity without a duplicate", async (t) => {
  const f = await fixture(t),
    file = await f.text(),
    r = await f.prepare([report(file)]);
  f.lose();
  await assert.rejects(r.apply(), (e) => e.code === "unreachable");
  assert.equal(f.objects.size, 1);
  const result = await resume({ operation: r.planned.operation, policy: f.policyFile });
  assert.equal(result.status, "complete");
  assert.equal(f.objects.size, 1);
  const repeat = await f.prepare([report(file)]);
  await repeat.apply();
  assert.equal(f.objects.size, 1);
});
test("shared sources preserve human fields, all memberships and complete content", async (t) => {
  const f = await fixture(t);
  const b = {
    id: "human",
    title: "Human title",
    note: "Human note",
    content: { type: "link", url: "https://example.test/article?a=1#part" },
    tags: [],
    captured: "Original article. ".repeat(25) + "Important tail.",
  };
  f.objects.set(b.id, b);
  const input = {
    kind: "source",
    url: b.content.url,
    title: "Proposed title",
    capture: {
      status: "verified",
      contentHash: hash(b.captured),
      reason: "Complete article including tail inspected.",
    },
  };
  await (await f.prepare([input])).apply();
  f.p.listIds = ["list2"];
  f.p.revision = "2";
  await f.savePolicy();
  await (await f.prepare([input])).apply();
  assert.equal(f.objects.size, 1);
  assert.equal(b.title, "Human title");
  assert.equal(b.note, "Human note");
  assert.deepEqual([...f.members.get(b.id)].sort(), ["list1", "list2"]);
  const capture = await readJson(path.join(f.run, "captures", "human.json"));
  assert.ok(capture.text.endsWith("Important tail."));
});
test("capture existence alone stays pending until the agent assesses content", async (t) => {
  const f = await fixture(t),
    input = { kind: "source", url: "https://example.test/new", title: "New source" };
  const result = await (await f.prepare([input])).apply();
  assert.equal(result.status, "pending");
  const b = [...f.objects.values()][0];
  b.captured = "The actual article is now available.";
  const r = await f.prepare([input]);
  assert.equal(r.planned.operations[0].evidence.status, "needs_agent");
  input.capture = {
    status: "verified",
    contentHash: hash(b.captured),
    reason: "Article inspected.",
  };
  assert.equal((await (await f.prepare([input])).apply()).status, "complete");
  assert.equal(f.objects.size, 1);
});
test("new dossiers remain proposals and original-input hashes constrain approved aggregates", async (t) => {
  const f = await fixture(t),
    file = await f.text(),
    session = report(file);
  await (await f.prepare([session])).apply();
  const key = identity("session", "policy", "session-one"),
    dossier = {
      kind: "dossier",
      id: "topic",
      title: "Dossier",
      contentFile: file,
      purpose: "Compare evidence",
      inputs: [{ key, contentHash: hash("Actual work and measured results.") }],
    };
  const proposed = await f.prepare([dossier]);
  assert.equal(proposed.planned.operations[0].status, "proposal");
  const count = f.writes.length;
  await proposed.apply();
  assert.equal(f.writes.length, count);
  f.p.approvedAggregates = [
    { id: "topic", purpose: "Compare evidence", inputKeys: [key], approval: "Explicit approval" },
  ];
  f.p.revision = "2";
  await f.savePolicy();
  await (await f.prepare([dossier])).apply();
  assert.equal(f.objects.size, 2);
  dossier.inputs[0].contentHash = "0".repeat(64);
  await assert.rejects(f.prepare([dossier]), (e) => e.code === "lineage");
});
test("exclusive writer lock does not get stolen and disabled policy prevents membership writes", async (t) => {
  const f = await fixture(t),
    release = await lock(f.p);
  await assert.rejects(lock(f.p), (e) => e.code === "locked");
  await release();
  const file = await f.text();
  f.p.writeEnabled = false;
  await f.savePolicy();
  const r = await f.prepare([report(file)]);
  await assert.rejects(r.apply(), (e) => e.code === "policy");
  assert.equal(f.writes.length, 0);
});
test("canonical and branch drafts stay separate; stale snapshots are rejected", async (t) => {
  const f = await fixture(t),
    repo = path.join(f.root, "repo"),
    remote = path.join(f.root, "remote.git");
  await fs.mkdir(repo);
  await exec("git", ["init", "--bare", "--initial-branch=main", remote]);
  await exec("git", ["init", "--initial-branch=main", repo]);
  const g = (...args) => exec("git", ["-C", repo, ...args]);
  await g("config", "user.name", "Fixture");
  await g("config", "user.email", "fixture@example.test");
  await fs.writeFile(path.join(repo, "README.md"), "Canonical knowledge.");
  await fs.writeFile(path.join(repo, "secret.txt"), "Excluded.");
  await g("add", ".");
  await g("commit", "-m", "Initial");
  await g("remote", "add", "origin", remote);
  await g("push", "origin", "main");
  f.p.scope = "project";
  f.p.repo = { id: "example/repo", remote, branch: "main", include: ["README.md"], exclude: [] };
  f.p.revision = "2";
  await f.savePolicy();
  await g("switch", "-c", "feature-one");
  await fs.writeFile(path.join(repo, "README.md"), "Draft one.");
  const inspection = path.join(f.run, "inspection.json");
  await inspect({ repo, policy: f.policyFile, out: inspection });
  const data = await readJson(inspection);
  assert.equal(data.source.documents.length, 2);
  assert.equal(
    data.source.documents.find((x) => x.channel === "canonical").text,
    "Canonical knowledge.",
  );
  const draft = data.source.documents.find((x) => x.channel === "draft");
  assert.equal(draft.text, "Draft one.");
  await g("switch", "-c", "feature-two");
  await inspect({ repo, policy: f.policyFile, out: inspection });
  const second = await readJson(inspection);
  assert.notEqual(draft.key, second.source.documents.find((x) => x.channel === "draft").key);
  const items = second.source.documents.map((d) => ({
    kind: "document",
    documentKey: d.key,
    title: d.channel,
    coverage: { contentHash: d.contentHash, allDirectReferencesReviewed: true },
    references: [],
  }));
  await writeJson(path.join(f.run, "intent.json"), {
    schemaVersion: 1,
    inspectionId: second.id,
    items,
  });
  const planned = await plan({
    inspection,
    intent: path.join(f.run, "intent.json"),
    policy: f.policyFile,
    out: path.join(f.run, "plan.json"),
  });
  await fs.writeFile(path.join(repo, "README.md"), "Changed while planning.");
  await assert.rejects(
    apply({ plan: planned.plan, policy: f.policyFile, expectPlan: planned.planHash }),
    (e) => e.code === "needs_replan",
  );
  assert.equal(f.writes.length, 0);
});
test("startup without configuration is a read-only needs_setup result; CLI validates options", async (t) => {
  const f = await fixture(t),
    result = await check({ repo: f.root, config: path.join(f.root, "missing.json") });
  assert.equal(result.status, "needs_setup");
  assert.equal(f.writes.length, 0);
  const out = await exec(process.execPath, [
    helper,
    "check",
    "--repo",
    f.root,
    "--config",
    path.join(f.root, "missing.json"),
  ]);
  assert.equal(JSON.parse(out.stdout).status, "needs_setup");
  await assert.rejects(
    exec(process.execPath, [helper, "check", "--repo", f.root, "--unknown", "value"]),
  );
});
test("unadopted startup verifies shared connection without enrolling or writing", async (t) => {
  const f = await fixture(t);
  await exec("git", ["init", f.root]);
  const descriptor = path.join(f.root, "config.json");
  await writeJson(descriptor, { schemaVersion: 1, projects: [], collectionPolicy: f.policyFile });
  const result = await check({ repo: f.root, config: descriptor });
  assert.equal(result.status, "needs_setup");
  assert.equal(result.connection, "ready");
  assert.equal(f.writes.length, 0);
});
test("a saved URL alone cannot be claimed as a verified source reference", async (t) => {
  const f = await fixture(t),
    url = "https://example.test/unverified",
    key = identity("source", url),
    file = await f.text();
  const source = { kind: "source", url, title: "Uncaptured source" };
  await assert.rejects(
    f.prepare([
      source,
      { ...report(file), references: [{ target: url, key, outcome: "verified" }] },
    ]),
    (e) => e.code === "coverage",
  );
  assert.equal(f.writes.length, 0);
});

test("uncertain creation can be reconciled after semantic input changes without replaying old content", async (t) => {
  const f = await fixture(t),
    file = await f.text(),
    r = await f.prepare([report(file)]);
  f.lose();
  await assert.rejects(r.apply(), (e) => e.code === "unreachable");
  assert.equal(f.objects.size, 1);
  await f.text(file, "Updated factual work after the interruption.");
  const before = f.writes.length,
    result = await resume({ policy: f.policyFile, operation: r.planned.operation });
  assert.equal(result.status, "pending");
  assert.equal(f.writes.length, before);
  assert.equal(Object.values(result.results)[0].status, "reconciled");
  const current = await f.prepare([report(file)]);
  assert.equal(current.planned.operations[0].status, "update");
  assert.equal((await current.apply()).status, "complete");
  assert.equal(f.objects.size, 1);
  assert.equal(
    [...f.objects.values()][0].content.text,
    "Updated factual work after the interruption.",
  );
});

test("recovery never adopts a known reused bookmark from an operation marker", async (t) => {
  const f = await fixture(t),
    url = "https://example.test/human-owned";
  const b = {
    id: "human-owned",
    title: "Human title",
    note: "Human note",
    content: { type: "link", url },
    tags: [],
  };
  f.objects.set(b.id, b);
  f.p.operations = ["create", "update"];
  await f.savePolicy();
  const r = await f.prepare([{ kind: "source", url, title: "Suggested source" }]);
  const data = await readJson(r.planFile),
    meta = data.items[0].meta,
    fence = String.fromCharCode(96).repeat(3);
  b.note =
    "## Karakeep knowledge provenance\n" +
    fence +
    "json\n" +
    JSON.stringify(meta, null, 2) +
    "\n" +
    fence;
  await assert.rejects(r.apply(), (e) => e.code === "policy");
  const changed = await readJson(r.intentFile);
  changed.items[0].title = "Changed after interruption";
  await writeJson(r.intentFile, changed);
  const before = f.writes.length,
    result = await resume({ policy: f.policyFile, operation: r.planned.operation });
  assert.equal(result.status, "pending");
  assert.equal(f.writes.length, before);
  const store = await loadStore(f.p);
  assert.equal(store.entries[identity("source", url)].owned, false);
  assert.equal(b.title, "Human title");
});

test("duplicate source save racing with a human preserves all human fields and stays unowned", async (t) => {
  const f = await fixture(t),
    url = "https://example.test/racing";
  const input = { kind: "source", url, title: "Suggested" };
  const r = await f.prepare([input]);
  const human = {
    id: "human",
    title: "Human",
    note: "Private note",
    archived: true,
    createdAt: "2025-01-01T00:00:00Z",
    modifiedAt: "2025-02-01T00:00:00Z",
    content: { type: "link", url },
    tags: [],
  };
  const before = structuredClone(human);
  f.objects.set(human.id, human);
  await r.apply();
  assert.deepEqual(human, before);
  const stored = (await loadStore(f.p)).entries[identity("source", url)];
  assert.equal(stored.owned, false);
  assert.equal(stored.fields, null);
  const count = f.writes.length;
  await (await f.prepare([input])).apply();
  assert.equal(f.writes.length, count);
  assert.deepEqual(human, before);
});

for (const fault of [
  "changed",
  "missingCapture",
  "contentPageError",
  "contentVersionChange",
  "deleted",
]) {
  for (const existing of [false, true]) {
    test(`fresh source gate blocks dependent ${existing ? "updates and attachments" : "creates"}: ${fault}`, async (t) => {
      const f = await fixture(t),
        url = "https://example.test/dependency";
      const b = {
        id: "source",
        title: "Original",
        note: null,
        tags: [],
        content: { type: "link", url },
        captured: "Original content and important tail. ".repeat(5),
      };
      f.objects.set(b.id, b);
      const key = identity("source", url),
        file = await f.text();
      const source = {
        kind: "source",
        url,
        title: "Original",
        capture: {
          status: "verified",
          contentHash: hash(b.captured),
          reason: "Complete original inspected.",
        },
      };
      f.p.approvedAggregates = [
        { id: "topic", purpose: "Compare", inputKeys: [key], approval: "Test grant" },
      ];
      await f.savePolicy();
      const dependent = {
        kind: "dossier",
        id: "topic",
        title: "Derived",
        contentFile: file,
        purpose: "Compare",
        inputs: [{ key, contentHash: hash(b.captured) }],
      };
      const reference = {
        ...report(file, "referencing"),
        references: [{ target: url, key, outcome: "verified" }],
      };
      const items = [source, dependent, reference, report(file, "independent")];
      if (existing) {
        await (await f.prepare(items)).apply();
        await f.text(file, "Updated analysis.");
        f.p.listIds = ["list1", "list2"];
        f.p.tags.dossier = ["new-tag"];
        f.p.tags.session = ["new-tag"];
        await f.savePolicy();
      }
      const r = await f.prepare(items),
        before = f.writes.length;
      const dependentIds = [...f.objects.values()]
        .filter(
          (x) =>
            ["Derived", "Work report"].includes(x.title) &&
            splitNote(x.note).meta?.key !== identity("session", "policy", "independent"),
        )
        .map((x) => x.id);
      if (fault === "changed") b.captured = "Different content.";
      else if (fault === "deleted") f.objects.delete(b.id);
      else f.faults[fault] = true;
      const result = await r.apply();
      assert.equal(result.status, "pending");
      assert.equal(result.results[identity("dossier", "policy", "topic")].status, "needs_agent");
      assert.equal(
        result.results[identity("session", "policy", "referencing")].status,
        "needs_agent",
      );
      assert.equal(result.results[identity("session", "policy", "independent")].status, "verified");
      const mutations = f.writes.slice(before);
      assert.equal(
        mutations.filter(
          (w) =>
            w.payload.title === "Derived" ||
            splitNote(w.payload.note).meta?.key === identity("session", "policy", "referencing") ||
            dependentIds.some((id) => w.path.split("/").includes(id)),
        ).length,
        0,
      );
      // Prior receipt success must not unblock the next apply/resume pass either.
      const resumed = await resume({ policy: f.policyFile, operation: r.planned.operation });
      assert.equal(resumed.results[identity("dossier", "policy", "topic")].status, "needs_agent");
    });
  }
}

for (const code of [400, 401, 403, 429]) {
  test(`definitive create HTTP ${code} is pending and explicit resume retries once`, async (t) => {
    const f = await fixture(t),
      file = await f.text();
    await (await f.prepare([report(file, "predecessor")])).apply();
    const r = await f.prepare([report(file, "predecessor"), report(file)]);
    f.faults.rejectCreate = code;
    await assert.rejects(r.apply(), (e) => e.code === "http_" + code);
    const key = identity("session", "policy", "session-one");
    const pending = await status({ policy: f.policyFile });
    assert.equal(pending.status, "pending");
    assert.equal(pending.pending.find((x) => x.key === key).status, "failed");
    const receipt = await readJson(
      path.join(locations(f.p).operations, r.planned.operation + ".json"),
    );
    assert.deepEqual(receipt.results[key].failure, {
      phase: "create_request",
      code: "http_" + code,
      outcome: "not_applied",
    });
    const attempts = f.requests.filter(
      (x) => x.method === "POST" && x.path === "/api/v1/bookmarks",
    ).length;
    await r.apply();
    assert.equal(
      f.requests.filter((x) => x.method === "POST" && x.path === "/api/v1/bookmarks").length,
      attempts,
    );
    delete f.faults.rejectCreate;
    assert.equal(
      (await resume({ operation: r.planned.operation, policy: f.policyFile })).status,
      "complete",
    );
    assert.equal(f.objects.size, 2);
    assert.equal(
      f.requests.filter((x) => x.method === "POST" && x.path === "/api/v1/bookmarks").length,
      attempts + 1,
    );
    assert.equal((await status({ policy: f.policyFile })).status, "ready");
  });
}

test("read-only credentials can be corrected for resume without recreating prior success", async (t) => {
  const f = await fixture(t),
    file = await f.text();
  const r = await f.prepare([report(file)]);
  const auth = await fs.readFile(f.credentialFile, "utf8");
  await fs.writeFile(f.credentialFile, auth.replace("test-secret", "read-secret"));
  await assert.rejects(r.apply(), (e) => e.code === "http_403");
  await fs.writeFile(f.credentialFile, auth);
  assert.equal(
    (await resume({ operation: r.planned.operation, policy: f.policyFile })).status,
    "complete",
  );
  assert.equal(f.objects.size, 1);
});

test("local create rejection records no dispatch and a corrected policy can use a fresh plan", async (t) => {
  const f = await fixture(t),
    file = await f.text();
  f.p.operations = ["membership", "tag"];
  await f.savePolicy();
  const r = await f.prepare([report(file)]);
  await assert.rejects(r.apply(), (e) => e.code === "policy");
  const record = (await loadStore(f.p)).entries[identity("session", "policy", "session-one")];
  assert.deepEqual(record.failure, {
    phase: "create_preflight",
    code: "policy",
    outcome: "not_applied",
  });
  assert.equal(f.writes.length, 0);
  f.p.operations.push("create");
  await f.savePolicy();
  assert.equal((await (await f.prepare([report(file)])).apply()).status, "complete");
});

test("accepted create followed by readback 403 stays uncertain and resumes without POST", async (t) => {
  const f = await fixture(t),
    file = await f.text(),
    r = await f.prepare([report(file)]);
  f.faults.readback403 = true;
  await assert.rejects(r.apply(), (e) => e.code === "http_403");
  const record = (await loadStore(f.p)).entries[identity("session", "policy", "session-one")];
  assert.deepEqual(record.failure, {
    phase: "create_readback",
    code: "http_403",
    outcome: "uncertain",
  });
  assert.equal(f.objects.size, 1);
  delete f.faults.readback403;
  const before = f.requests.filter(
    (x) => x.method === "POST" && x.path === "/api/v1/bookmarks",
  ).length;
  assert.equal(
    (await resume({ operation: r.planned.operation, policy: f.policyFile })).status,
    "complete",
  );
  assert.equal(
    f.requests.filter((x) => x.method === "POST" && x.path === "/api/v1/bookmarks").length,
    before,
  );
});

test("unknown transport outcome with empty inventory never authorizes a blind retry", async (t) => {
  const f = await fixture(t),
    file = await f.text(),
    r = await f.prepare([report(file)]);
  f.faults.dropWithoutCreate = true;
  await assert.rejects(r.apply(), (e) => e.code === "unreachable");
  delete f.faults.dropWithoutCreate;
  const before = f.writes.length;
  assert.equal(
    (await resume({ operation: r.planned.operation, policy: f.policyFile })).status,
    "pending",
  );
  assert.equal(f.writes.length, before);
  assert.equal(f.objects.size, 0);
  // Legacy uncertain entries without the new failure evidence remain conservative.
  const store = await loadStore(f.p);
  delete store.entries[identity("session", "policy", "session-one")].failure;
  await writeJson(locations(f.p).store, store);
  await resume({ operation: r.planned.operation, policy: f.policyFile });
  assert.equal(f.writes.length, before);
});

test("inherited Git selectors cannot mix same-remote checkout identity and bytes", async (t) => {
  const f = await fixture(t),
    a = path.join(f.root, "a"),
    b = path.join(f.root, "b"),
    remote = path.join(f.root, "remote.git");
  await exec("git", ["init", "--bare", "--initial-branch=main", remote]);
  await exec("git", ["clone", remote, a]);
  const g = (...args) => exec("git", ["-C", a, ...args]);
  await g("config", "user.name", "Fixture");
  await g("config", "user.email", "fixture@example.test");
  await fs.writeFile(path.join(a, "README.md"), "Canonical.");
  await g("add", "README.md");
  await g("commit", "-m", "Initial");
  await g("push", "origin", "main");
  await exec("git", ["clone", remote, b]);
  await g("switch", "-c", "other");
  await fs.writeFile(path.join(a, "README.md"), "Other checkout.");
  await g("commit", "-am", "Other revision");
  await fs.writeFile(path.join(b, "README.md"), "Requested draft.");
  f.p.scope = "project";
  f.p.repo = { id: "example/repo", remote, branch: "main", include: ["README.md"], exclude: [] };
  await f.savePolicy();
  const p = (await loadPolicy(f.policyFile)).policy;
  const expected = await snapshot(b, p);
  const cases = [
    { GIT_DIR: path.join(a, ".git") },
    { GIT_WORK_TREE: a },
    { GIT_COMMON_DIR: path.join(a, ".git") },
    {
      GIT_DIR: path.join(a, ".git"),
      GIT_WORK_TREE: a,
      GIT_INDEX_FILE: path.join(a, ".git/index"),
      GIT_OBJECT_DIRECTORY: path.join(a, ".git/objects"),
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "remote.origin.url",
      GIT_CONFIG_VALUE_0: "/wrong",
    },
  ];
  for (const env of cases) {
    const prior = Object.fromEntries(Object.keys(env).map((k) => [k, process.env[k]]));
    try {
      Object.assign(process.env, env);
      assert.deepEqual(await snapshot(b, p), expected);
      assert.equal(
        (await git(b, ["rev-parse", "HEAD"])).trim(),
        (
          await exec("git", ["-C", b, "rev-parse", "HEAD"], { env: { PATH: process.env.PATH } })
        ).stdout.trim(),
      );
    } finally {
      for (const [k, v] of Object.entries(prior))
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
    }
  }
});

for (const proxyMode of ["1", "0"]) {
  test(`configured connection works with NODE_USE_ENV_PROXY=${proxyMode} and checks its account`, async (t) => {
    const prior = process.env.NODE_USE_ENV_PROXY;
    t.after(() => {
      if (prior === undefined) delete process.env.NODE_USE_ENV_PROXY;
      else process.env.NODE_USE_ENV_PROXY = prior;
    });
    process.env.NODE_USE_ENV_PROXY = proxyMode;
    const runtime = { ...process.env };
    const requested = t.mock.method(globalThis, "fetch", async (url, options) => {
      assert.equal(url, "http://localhost:3000/api/v1/users/me");
      assert.equal(options.method, "GET");
      assert.equal(options.headers.Authorization, "Bearer synthetic-secret");
      assert.equal(options.redirect, "manual");
      return Response.json({ id: "selected-account" });
    });
    const api = new Karakeep({ address: "http://localhost:3000", key: "synthetic-secret" });
    assert.equal(await api.account("selected-account"), "selected-account");
    await assert.rejects(api.account("different-account"), (e) => e.code === "account");
    assert.equal(requested.mock.callCount(), 2);
    assert.deepEqual({ ...process.env }, runtime);
  });
}

test("unsupported API routes remain unsent", async (t) => {
  const requested = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Invalid routes must not reach the transport");
  });
  const api = new Karakeep({ address: "http://localhost:3000", key: "synthetic-secret" });
  for (const route of ["/other", "/api/v1/../users/me"]) {
    await assert.rejects(
      api.request(route),
      (e) => e.code === "connection" && e.requestOutcome === "not_sent",
    );
  }
  assert.equal(requested.mock.callCount(), 0);
});

for (const [code, diagnostic] of [
  ["SELF_SIGNED_CERT_IN_CHAIN", "tls_trust"],
  ["ECONNREFUSED", "connection_refused"],
  ["ENOTFOUND", "dns"],
  ["ETIMEDOUT", "timeout"],
  ["PRIVATE_UNKNOWN_CODE", "transport"],
]) {
  test(`transport diagnostics classify ${diagnostic} without exposing raw errors`, async (t) => {
    t.mock.method(globalThis, "fetch", async () => {
      throw new TypeError("private endpoint and secret must not leak", {
        cause: new AggregateError([Object.assign(new Error("private certificate text"), { code })]),
      });
    });
    const api = new Karakeep({ address: "https://localhost", key: "synthetic-secret" });
    await assert.rejects(api.account("account"), (e) => {
      assert.equal(e.code, "unreachable");
      assert.equal(e.diagnostic, diagnostic);
      assert.doesNotMatch(
        JSON.stringify(e) + e.message,
        /private|synthetic-secret|PRIVATE_UNKNOWN_CODE/u,
      );
      return true;
    });
  });
}

test("overall Node deadline reports only the timeout category", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("raw transport message")), {
          once: true,
        });
      }),
  );
  const api = new Karakeep(
    { address: "https://localhost", key: "synthetic-secret" },
    { deadlineMs: 5 },
  );
  await assert.rejects(
    api.account("account"),
    (e) => e.code === "unreachable" && e.diagnostic === "timeout",
  );
});

test("failed creates remain pending in an adopted project's startup check", async (t) => {
  const f = await fixture(t),
    repo = path.join(f.root, "repo"),
    remote = path.join(f.root, "remote.git");
  await exec("git", ["init", "--bare", "--initial-branch=main", remote]);
  await exec("git", ["clone", remote, repo]);
  const g = (...args) => exec("git", ["-C", repo, ...args]);
  await g("config", "user.name", "Fixture");
  await g("config", "user.email", "fixture@example.test");
  await fs.writeFile(path.join(repo, "README.md"), "Project knowledge.");
  await g("add", "README.md");
  await g("commit", "-m", "Initial");
  await g("push", "origin", "main");
  f.p.scope = "project";
  f.p.repo = { id: "example/repo", remote, branch: "main", include: ["README.md"], exclude: [] };
  await f.savePolicy();
  const config = path.join(f.root, "config.json"),
    file = await f.text();
  await writeJson(config, { schemaVersion: 1, projects: [{ remote, policy: f.policyFile }] });
  await (await f.prepare([report(file, "predecessor")], { repo })).apply();
  assert.equal((await check({ repo, config })).status, "ready");
  const r = await f.prepare([report(file)], { repo });
  f.faults.rejectCreate = 403;
  await assert.rejects(r.apply(), (e) => e.code === "http_403");
  assert.equal((await check({ repo, config })).status, "pending");
});

for (const visible of [false, true]) {
  test(`create timeout with ${visible ? "a visible object" : "empty inventory"} never blindly repeats POST`, async (t) => {
    const f = await fixture(t),
      file = await f.text(),
      r = await f.prepare([report(file)]);
    const originalFetch = globalThis.fetch;
    const intercepted = t.mock.method(globalThis, "fetch", async (url, options) => {
      if (options?.method === "POST" && new URL(url).pathname === "/api/v1/bookmarks") {
        if (visible) await (await originalFetch(url, options)).body.cancel();
        throw Object.assign(new Error("synthetic deadline"), { code: "ETIMEDOUT" });
      }
      return originalFetch(url, options);
    });
    await assert.rejects(r.apply(), (e) => e.code === "unreachable" && e.diagnostic === "timeout");
    intercepted.mock.restore();
    const before = f.writes.length;
    const result = await resume({ operation: r.planned.operation, policy: f.policyFile });
    assert.equal(result.status, visible ? "complete" : "pending");
    assert.equal(f.objects.size, visible ? 1 : 0);
    assert.equal(
      f.writes.slice(before).filter((w) => w.method === "POST" && w.path === "/api/v1/bookmarks")
        .length,
      0,
    );
  });
}

test("stored original text is read afresh before an approved aggregate write", async (t) => {
  const f = await fixture(t),
    file = await f.text();
  await (await f.prepare([report(file)])).apply();
  const key = identity("session", "policy", "session-one"),
    original = [...f.objects.values()][0];
  f.p.approvedAggregates = [
    { id: "topic", purpose: "Compare", inputKeys: [key], approval: "Test grant" },
  ];
  await f.savePolicy();
  const r = await f.prepare([
    {
      kind: "dossier",
      id: "topic",
      title: "Derived",
      contentFile: file,
      purpose: "Compare",
      inputs: [{ key, contentHash: hash(original.content.text) }],
    },
    report(file, "independent"),
  ]);
  original.content.text = "Human changed the original after planning.";
  const result = await r.apply();
  assert.equal(result.results[identity("dossier", "policy", "topic")].status, "needs_agent");
  assert.equal(result.results[identity("session", "policy", "independent")].status, "verified");
  assert.equal([...f.objects.values()].filter((b) => b.title === "Derived").length, 0);
});
