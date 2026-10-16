import path from "node:path";
import os from "node:os";
import * as fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  hash,
  identity,
  now,
  object,
  string,
  requireThat,
  KnowledgeError,
  inside,
  readPrivate,
  readJson,
  writeJson,
  loadPolicy,
  loadStore,
  locations,
  lock,
  defaultConfig,
} from "./state.mjs";
import { snapshot, validateSnapshot, localFingerprints, git, eligible } from "./git.mjs";
import { connect } from "./karakeep.mjs";
const fence = String.fromCharCode(96).repeat(3);
const label = "## Karakeep knowledge provenance\n" + fence + "json\n";
export function splitNote(note = "") {
  note ??= "";
  const start = note.indexOf(label);
  if (start < 0) return { prefix: note, section: null, suffix: "", meta: null };
  requireThat(
    note.indexOf(label, start + label.length) < 0,
    "conflict",
    "Duplicate managed provenance sections.",
  );
  const end = note.indexOf("\n" + fence, start + label.length);
  requireThat(end >= 0, "conflict", "Malformed managed provenance section.");
  let meta;
  try {
    meta = JSON.parse(note.slice(start + label.length, end));
  } catch {
    throw new KnowledgeError("conflict", "Malformed managed provenance JSON.");
  }
  return {
    prefix: note.slice(0, start),
    section: note.slice(start, end + 4),
    suffix: note.slice(end + 4),
    meta,
  };
}
function section(meta) {
  return label + JSON.stringify(meta, null, 2) + "\n" + fence;
}
export function fields(bookmark) {
  return {
    title: bookmark.title ?? null,
    text: bookmark.content?.type === "text" ? bookmark.content.text : null,
    section: splitNote(bookmark.note).section,
  };
}
function url(value) {
  let u;
  try {
    u = new URL(value);
  } catch {
    throw new KnowledgeError("url", "Invalid source URL.");
  }
  requireThat(
    ["http:", "https:"].includes(u.protocol) && !u.username && !u.password,
    "url",
    "Use an HTTP(S) source without embedded credentials.",
  );
  return u.href;
}
export async function inspect({ repo, policy: policyFile, out, offline = false }) {
  const grant = await loadPolicy(policyFile),
    p = grant.policy;
  inside(p.stateRoot, out);
  requireThat(
    p.scope === "collection" ? !repo : Boolean(repo),
    "repository",
    "Project inspection requires its repository; collection inspection omits it.",
  );
  const store = await loadStore(p);
  const source = await snapshot(repo, p, { offline, checkpoint: store.checkpoints[p.id] });
  let inventory = [],
    lists = [];
  let accountVerified = false;
  if (!offline) {
    const api = await connect(p);
    inventory = await api.inventory();
    await api.validateLists(p.listIds);
    lists = p.listIds;
    accountVerified = true;
  }
  const data = {
    schemaVersion: 1,
    id: randomUUID(),
    createdAt: now(),
    policyDigest: grant.digest,
    source,
    inventory,
    lists,
    accountVerified,
  };
  await writeJson(out, data);
  return {
    status: offline ? "unverified" : "inspected",
    inspection: out,
    inspectionId: data.id,
    documents: source.documents.map(({ text, ...d }) => d),
    bookmarks: inventory.length,
  };
}
async function normalizedItems(inspection, intent, p, store, operation, runDir) {
  object(
    intent,
    ["schemaVersion", "inspectionId", "items", "exclusions"],
    ["schemaVersion", "inspectionId", "items"],
  );
  requireThat(
    intent.schemaVersion === 1 &&
      intent.inspectionId === inspection.id &&
      Array.isArray(intent.items),
    "intent",
    "Intent does not match inspection.",
  );
  const items = [];
  for (const input of intent.items) {
    object(
      input,
      [
        "kind",
        "id",
        "documentKey",
        "title",
        "contentFile",
        "url",
        "references",
        "inputs",
        "purpose",
        "capture",
        "coverage",
        "sourceUrl",
      ],
      ["kind", "title"],
    );
    requireThat(
      p.kinds.includes(input.kind),
      "policy",
      "Content kind is outside the adopted policy.",
    );
    string(input.title);
    requireThat(input.title.length <= 1000, "intent", "Bookmark title is too long.");
    let key,
      text = null,
      source = null,
      channel = "current",
      owner = p.scope === "project" ? p.repo.id : "karakeep",
      proposal = false;
    if (input.kind === "document") {
      requireThat(
        p.scope === "project",
        "policy",
        "Collection policy cannot authorize repository documents.",
      );
      source = inspection.source.documents.find((d) => d.key === input.documentKey);
      requireThat(source, "source", "Document was not captured by this inspection.");
      requireThat(
        !input.contentFile && !input.url,
        "source",
        "Document bytes must come from the inspected snapshot.",
      );
      object(input.coverage, ["contentHash", "allDirectReferencesReviewed"]);
      requireThat(
        input.coverage.contentHash === source.contentHash &&
          input.coverage.allDirectReferencesReviewed === true &&
          Array.isArray(input.references),
        "coverage",
        "Document must be read and its direct references enumerated.",
      );
      key = source.key;
      text = source.text;
      channel = source.channel;
    } else if (input.kind === "source") {
      source = { url: url(input.url) };
      key = identity("source", source.url);
      owner = "original-source";
      requireThat(
        !input.contentFile,
        "intent",
        "Source bookmarks preserve native captured content.",
      );
    } else {
      string(input.id || (input.kind === "overview" && p.scope === "project" ? p.repo.id : ""));
      key =
        input.kind === "overview"
          ? identity("overview", p.repo?.id || p.id)
          : identity(input.kind, p.scope === "project" ? p.repo.id : p.id, input.id);
      requireThat(
        input.kind !== "overview" || p.scope === "project",
        "policy",
        "A project overview requires a project policy.",
      );
      const file = inside(runDir, path.resolve(runDir, string(input.contentFile)));
      text = await readPrivate(file, p.maxContentBytes);
      requireThat(text.trim().length > 0, "intent", "Derived content is empty.");
    }
    const references = input.references ?? [];
    requireThat(Array.isArray(references), "intent", "Expected direct source references.");
    for (const ref of references) {
      object(ref, ["target", "key", "outcome", "reason"], ["target", "outcome"]);
      string(ref.target);
      requireThat(
        ["verified", "pending", "missing", "excluded"].includes(ref.outcome),
        "coverage",
        "Invalid reference outcome.",
      );
      if (ref.outcome === "verified")
        requireThat(
          /^[a-f0-9]{64}$/u.test(ref.key ?? ""),
          "coverage",
          "Verified references require their source identity.",
        );
      else string(ref.reason);
    }
    const inputs = input.inputs ?? [];
    requireThat(Array.isArray(inputs), "intent", "Expected original-source input versions.");
    for (const value of inputs) {
      object(value, ["key", "contentHash"]);
      requireThat(
        /^[a-f0-9]{64}$/u.test(value.key) && /^[a-f0-9]{64}$/u.test(value.contentHash),
        "lineage",
        "Invalid source version.",
      );
    }
    const derived = ["finding", "overview", "dossier", "dataset"].includes(input.kind);
    if (derived) {
      string(input.purpose);
      requireThat(inputs.length > 0, "lineage", "Derived content needs original source versions.");
      const approval = p.approvedAggregates.find(
        (x) =>
          x.id === input.id &&
          x.purpose === input.purpose &&
          inputs.every((v) => x.inputKeys.includes(v.key)),
      );
      proposal = input.kind !== "overview" && !approval;
    }
    if (input.capture) {
      object(input.capture, ["status", "contentHash", "reason"], ["status", "reason"]);
      requireThat(
        ["verified", "missing", "pending"].includes(input.capture.status),
        "capture",
        "Invalid content assessment.",
      );
      string(input.capture.reason);
      if (input.capture.status === "verified")
        requireThat(
          /^[a-f0-9]{64}$/u.test(input.capture.contentHash ?? ""),
          "capture",
          "Inspected source hash is required.",
        );
    }
    const previous = store.entries[key];
    const contentHash =
      input.kind === "source"
        ? (input.capture?.contentHash ?? previous?.contentHash ?? null)
        : hash(text);
    const stable = {
      schemaVersion: 1,
      key,
      kind: input.kind,
      owner,
      source: source ? { ...source, text: undefined } : null,
      channel,
      contentHash,
      inputs,
      purpose: input.purpose ?? null,
      references,
      lifecycle: "current",
    };
    const fingerprint = hash(stable);
    const meta = {
      ...stable,
      asOf: previous?.fingerprint === fingerprint ? previous.meta.asOf : inspection.createdAt,
      creationOperation: previous?.meta?.creationOperation ?? operation,
    };
    items.push({
      key,
      kind: input.kind,
      title: input.title,
      text,
      url: source?.url ?? null,
      meta,
      fingerprint,
      contentHash,
      inputs,
      references,
      capture: input.capture ?? null,
      proposal,
      sourceUrl: input.sourceUrl ? url(input.sourceUrl) : null,
    });
  }
  requireThat(
    new Set(items.map((x) => x.key)).size === items.length,
    "intent",
    "Duplicate logical items in one intent.",
  );
  for (const item of items) {
    const visit = (key, seen) => {
      requireThat(!seen.has(key), "lineage", "Aggregate lineage contains a cycle.");
      const next = items.find((x) => x.key === key) || store.entries[key];
      if (next?.inputs?.length) {
        const more = new Set(seen);
        more.add(key);
        for (const input of next.inputs) visit(input.key, more);
      }
    };
    visit(item.key, new Set());
    for (const ref of item.references.filter((r) => r.outcome === "verified")) {
      const original =
        items.find((x) => x.key === ref.key) ||
        store.entries[ref.key] ||
        inspection.source.documents.find((x) => x.key === ref.key);
      requireThat(original, "coverage", "A verified reference has no inspected source.");
      if (/^https?:/u.test(ref.target))
        requireThat(
          url(ref.target) === (original.url || original.meta?.source?.url),
          "coverage",
          "Reference URL does not match its source identity.",
        );
      else if (item.kind === "document") {
        const target = path.posix.normalize(
          path.posix.join(path.posix.dirname(item.meta.source.path), ref.target.split("#")[0]),
        );
        requireThat(
          eligible(p, target) && target === (original.path || original.meta?.source?.path),
          "coverage",
          "Relative reference is outside the adopted document scope.",
        );
      }
    }
    for (const input of item.inputs) {
      const original =
        items.find((x) => x.key === input.key) ||
        store.entries[input.key] ||
        inspection.source.documents.find((x) => x.key === input.key);
      requireThat(
        original &&
          original.contentHash === input.contentHash &&
          !["finding", "overview", "dossier", "dataset"].includes(original.kind),
        "lineage",
        "Aggregate input must match an original inspected source, not another aggregate or mirror.",
      );
    }
  }
  return items;
}
export function delta(item, current, record) {
  requireThat(record?.owned, "conflict", "Managed field ownership is not established.");
  const seen = fields(current),
    desired = { title: item.title, text: item.text, section: section(item.meta) },
    patch = {};
  for (const field of ["title", "text", "section"]) {
    if (field === "text" && item.kind === "source") continue;
    requireThat(
      seen[field] === record.fields[field] || seen[field] === desired[field],
      "conflict",
      "Human edits conflict with the managed " + field + " field.",
    );
    if (seen[field] !== desired[field]) {
      if (field === "section") {
        const note = splitNote(current.note);
        patch.note = note.prefix + desired.section + note.suffix;
      } else patch[field] = desired[field];
    }
  }
  return { before: seen, desired, patch };
}
async function sourceEvidence(api, item, current, runDir) {
  if (item.kind !== "source") return null;
  let capture;
  try {
    capture = await api.content(current.id);
  } catch (e) {
    if (["http_404", "http_400", "incomplete_content"].includes(e.code))
      return { status: "pending", reason: e.code };
    throw e;
  }
  const file = path.join(runDir, "captures", current.id + ".json");
  await writeJson(file, capture);
  if (!capture.available) return { status: "missing", reason: "No readable source content.", file };
  if (item.capture?.status === "verified" && item.capture.contentHash === capture.contentHash)
    return { status: "verified", contentHash: capture.contentHash, version: capture.version, file };
  if (item.capture?.status === "missing")
    return { status: "missing", reason: item.capture.reason, file };
  return {
    status: "needs_agent",
    reason: "Read the captured content and provide its assessed hash.",
    contentHash: capture.contentHash,
    file,
  };
}
export async function plan({
  inspection: inspectionFile,
  intent: intentFile,
  policy: policyFile,
  out,
}) {
  const grant = await loadPolicy(policyFile),
    p = grant.policy;
  for (const file of [inspectionFile, intentFile, out]) inside(p.stateRoot, file);
  const inspection = await readJson(inspectionFile),
    intent = await readJson(intentFile),
    runDir = path.dirname(inspectionFile);
  requireThat(
    inspection.schemaVersion === 1 &&
      inspection.policyDigest === grant.digest &&
      inspection.accountVerified,
    "needs_replan",
    "Inspection is unverified or its policy changed.",
  );
  await validateSnapshot(inspection.source, p);
  const store = await loadStore(p),
    api = await connect(p),
    inventory = await api.inventory(),
    operation = randomUUID();
  const items = await normalizedItems(inspection, intent, p, store, operation, runDir),
    operations = [];
  for (const item of items) {
    const record = store.entries[item.key];
    if (item.proposal) {
      operations.push({
        key: item.key,
        status: "proposal",
        reason: "A new independent artifact requires adoption.",
      });
      continue;
    }
    if (record?.uncertain) {
      operations.push({
        key: item.key,
        status: "conflict",
        reason: "Resume the outstanding uncertain operation first.",
      });
      continue;
    }
    let current = record?.id ? await api.get(record.id) : null;
    if (!current && item.url) {
      const matches = inventory.filter(
        (b) => b.content?.type === "link" && url(b.content.url) === item.url,
      );
      if (matches.length > 1) {
        operations.push({
          key: item.key,
          status: "conflict",
          reason: "Multiple equivalent source objects require reconciliation.",
        });
        continue;
      }
      if (matches[0]) current = await api.get(matches[0].id);
    }
    if (!current) {
      operations.push({ key: item.key, status: "create", before: null });
      continue;
    }
    try {
      const evidence = await sourceEvidence(api, item, current, runDir);
      if (record?.owned) {
        const d = delta(item, current, record);
        operations.push({
          key: item.key,
          status: Object.keys(d.patch).length ? "update" : "unchanged",
          id: current.id,
          before: d.before,
          evidence,
        });
      } else
        operations.push({ key: item.key, status: "reuse", id: current.id, before: null, evidence });
    } catch (e) {
      if (e.code !== "conflict") throw e;
      operations.push({ key: item.key, status: "conflict", reason: e.message });
    }
  }
  // A partial selection does not retire other selected knowledge. Only verified disappearance does.
  if (p.scope === "project" && inspection.source.verified) {
    for (const [key, record] of Object.entries(store.entries)) {
      if (
        record.kind !== "document" ||
        record.project !== p.repo.id ||
        !record.owned ||
        items.some((x) => x.key === key)
      )
        continue;
      const src = record.meta.source;
      if (!eligible(p, src.path)) continue;
      const canonical = inspection.source.documents.find(
        (d) => d.channel === "canonical" && d.path === src.path,
      );
      const gone = record.meta.channel === "canonical" && !canonical;
      const superseded =
        record.meta.channel === "draft" && canonical?.contentHash === record.contentHash;
      if (!gone && !superseded) continue;
      if (record.meta.lifecycle === (gone ? "retired" : "superseded")) continue;
      const item = {
        key,
        kind: "document",
        title: record.fields.title,
        text: record.fields.text,
        url: null,
        meta: {
          ...record.meta,
          lifecycle: gone ? "retired" : "superseded",
          asOf: inspection.createdAt,
        },
        contentHash: record.contentHash,
        inputs: [],
        references: record.meta.references,
        proposal: false,
      };
      item.fingerprint = hash(item.meta);
      items.push(item);
      try {
        const current = await api.get(record.id),
          d = delta(item, current, record);
        operations.push({
          key,
          status: gone ? "retired" : "superseded",
          id: record.id,
          before: d.before,
        });
      } catch (e) {
        if (e.code !== "conflict") throw e;
        operations.push({ key, status: "conflict", reason: e.message });
      }
    }
  }
  for (const item of items) {
    for (const ref of item.references.filter((r) => r.outcome === "verified")) {
      const source = items.find((x) => x.key === ref.key) || store.entries[ref.key];
      if (source?.kind === "source")
        requireThat(
          operations.find((o) => o.key === ref.key)?.evidence?.status === "verified",
          "coverage",
          "Verified web references require a source item with freshly assessed full content in this plan.",
        );
    }
    for (const input of item.inputs) {
      if (store.entries[input.key]?.kind === "source" && !items.some((x) => x.key === input.key))
        throw new KnowledgeError(
          "lineage",
          "Include each web source in the intent so current complete content can be verified.",
        );
    }
  }
  for (const item of items.filter((x) => x.inputs.length)) {
    const unavailable = item.inputs.some(
      (input) =>
        (operations.find((o) => o.key === input.key)?.evidence?.status &&
          operations.find((o) => o.key === input.key).evidence.status !== "verified") ||
        (items.find((x) => x.key === input.key)?.kind === "source" &&
          !operations.find((o) => o.key === input.key)?.evidence),
    );
    if (unavailable) {
      const op = operations.find((o) => o.key === item.key);
      if (op.status !== "proposal") {
        op.status = "needs_agent";
        op.reason = "Original sources need capture or content assessment.";
      }
    }
  }
  // Bind reference hashes too; intent references name identities, not versions.
  for (const item of items) {
    const dependencies = [...item.inputs];
    for (const ref of item.references.filter((r) => r.outcome === "verified")) {
      const original =
        items.find((x) => x.key === ref.key) ||
        store.entries[ref.key] ||
        inspection.source.documents.find((x) => x.key === ref.key);
      requireThat(
        original?.contentHash,
        "coverage",
        "Verified reference needs a bound source hash.",
      );
      dependencies.push({ key: ref.key, contentHash: original.contentHash });
    }
    operations.find((o) => o.key === item.key).dependencies = dependencies;
  }
  const data = {
    schemaVersion: 1,
    operation,
    createdAt: now(),
    policyDigest: grant.digest,
    inspectionFile: path.resolve(inspectionFile),
    inspectionHash: hash(inspection),
    intentFile: path.resolve(intentFile),
    intentHash: hash(intent),
    items,
    operations,
  };
  await writeJson(out, data);
  return {
    status: "planned",
    plan: out,
    planHash: hash(await readPrivate(out)),
    operation,
    operations,
  };
}
async function saveStore(p, store) {
  await writeJson(locations(p).store, store);
}
function requireWrite(p, kind) {
  requireThat(
    p.writeEnabled && p.operations.includes(kind),
    "policy",
    "This write is outside the standing policy.",
  );
  requireThat(
    p.connection.scopes.includes("bookmarks:readwrite"),
    "capability",
    "The policy has no qualified bookmark write capability.",
  );
}
async function verifyDependencies(item, op, data, inspection, store, api, freshSources) {
  const refs = item.references.filter((r) => r.outcome === "verified");
  // Old plans bind input hashes directly; unbound verified references need a new plan.
  const dependencies = op.dependencies ?? (refs.length ? null : item.inputs);
  requireThat(
    dependencies &&
      dependencies.length === item.inputs.length + refs.length &&
      item.inputs.every((input) =>
        dependencies.some((d) => d.key === input.key && d.contentHash === input.contentHash),
      ) &&
      refs.every((ref) =>
        dependencies.some((d) => d.key === ref.key && /^[a-f0-9]{64}$/u.test(d.contentHash)),
      ),
    "source_dependency",
    "Replan to bind every verified reference and original input version.",
  );
  for (const dependency of dependencies) {
    const original =
      data.items.find((x) => x.key === dependency.key) || store.entries[dependency.key];
    const document = inspection.source.documents.find((x) => x.key === dependency.key);
    let contentHash;
    if (document) contentHash = document.contentHash; // validated snapshot, never a mirrored copy
    else if (original?.kind === "source") {
      requireThat(
        freshSources.get(dependency.key) === dependency.contentHash,
        "source_dependency",
        "Source lacks verified evidence from this apply pass.",
      );
      // Recheck before each dependent mutation, including membership and tag writes.
      const capture = await api.content(store.entries[dependency.key].id);
      if (capture.available) contentHash = capture.contentHash;
    } else {
      const record = store.entries[dependency.key];
      requireThat(
        record?.id && !record.uncertain && !record.failure && !record.needsReplan,
        "source_dependency",
        "Original input is unavailable or unresolved.",
      );
      const current = await api.get(record.id);
      if (current.content?.type === "text") contentHash = hash(current.content.text);
    }
    requireThat(
      contentHash === dependency.contentHash,
      "source_dependency",
      "Original input no longer matches its planned complete-content hash.",
    );
  }
}
export async function apply({
  plan: planFile,
  policy: policyFile,
  expectPlan,
  recoverLock = false,
  resuming = false,
}) {
  const grant = await loadPolicy(policyFile),
    p = grant.policy;
  inside(p.stateRoot, planFile);
  requireThat(p.writeEnabled, "policy", "Collection writes are disabled by the policy.");
  const raw = await readPrivate(planFile);
  requireThat(
    hash(raw) === expectPlan,
    "needs_replan",
    "The exact reviewed plan digest is required.",
  );
  const data = JSON.parse(raw);
  requireThat(
    data.schemaVersion === 1 && data.policyDigest === grant.digest,
    "needs_replan",
    "Policy or plan format changed.",
  );
  requireThat(/^[a-f0-9-]{36}$/u.test(data.operation), "plan", "Invalid operation identifier.");
  const inspection = await readJson(inside(p.stateRoot, data.inspectionFile)),
    intent = await readJson(inside(p.stateRoot, data.intentFile));
  requireThat(
    hash(inspection) === data.inspectionHash && hash(intent) === data.intentHash,
    "needs_replan",
    "Source inspection or agent intent changed.",
  );
  await validateSnapshot(inspection.source, p);
  const release = await lock(p, recoverLock);
  const loc = locations(p),
    receiptFile = path.join(loc.operations, data.operation + ".json");
  let receipt;
  try {
    const store = await loadStore(p),
      api = await connect(p);
    await api.validateLists(p.listIds);
    const normalized = await normalizedItems(
      inspection,
      intent,
      p,
      store,
      data.operation,
      path.dirname(data.inspectionFile),
    );
    requireThat(
      normalized.every((x) => data.items.some((i) => i.key === x.key)) &&
        new Set(data.items.map((x) => x.key)).size === data.items.length &&
        new Set(data.operations.map((x) => x.key)).size === data.operations.length,
      "plan",
      "Plan item coverage is invalid.",
    );
    for (const item of data.items) {
      const check = normalized.find((x) => x.key === item.key);
      if (check) {
        requireThat(
          hash({
            ...check,
            meta: {
              ...check.meta,
              asOf: item.meta.asOf,
              creationOperation: item.meta.creationOperation,
            },
          }) === hash(item),
          "needs_replan",
          "Planned content differs from the validated intent.",
        );
      } else {
        const previous = store.entries[item.key],
          src = previous?.meta?.source;
        requireThat(
          p.scope === "project" &&
            inspection.source.verified &&
            previous?.owned &&
            previous.project === p.repo.id &&
            eligible(p, src.path) &&
            ["retired", "superseded"].includes(item.meta.lifecycle),
          "plan",
          "Unrecognized planned retirement.",
        );
        const canonical = inspection.source.documents.find(
          (d) => d.channel === "canonical" && d.path === src.path,
        );
        requireThat(
          item.meta.lifecycle === "retired"
            ? !canonical && previous.meta.channel === "canonical"
            : canonical?.contentHash === previous.contentHash && previous.meta.channel === "draft",
          "plan",
          "Retirement is not supported by the source tree.",
        );
        requireThat(
          item.text === previous.fields.text &&
            item.title === previous.fields.title &&
            item.contentHash === previous.contentHash &&
            hash({ ...item.meta, lifecycle: previous.meta.lifecycle, asOf: previous.meta.asOf }) ===
              hash(previous.meta),
          "plan",
          "Retirement may only change provenance lifecycle.",
        );
      }
    }
    try {
      receipt = await readJson(receiptFile);
      requireThat(
        receipt.planHash === expectPlan,
        "plan",
        "Operation identity already has another plan.",
      );
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
      receipt = {
        schemaVersion: 1,
        operation: data.operation,
        policyFile: grant.file,
        planFile: path.resolve(planFile),
        planHash: expectPlan,
        startedAt: now(),
        results: {},
        status: "pending",
      };
      await writeJson(receiptFile, receipt);
    }
    receipt.status = "pending";
    const freshSources = new Map();
    const order = (item) => (item.kind === "source" ? 0 : item.inputs.length ? 2 : 1);
    for (const item of [...data.items].sort((a, b) => order(a) - order(b))) {
      const op = data.operations.find((x) => x.key === item.key);
      requireThat(op, "plan", "Missing planned operation.");
      if (["proposal", "conflict", "needs_agent"].includes(op.status)) {
        receipt.results[item.key] = { status: op.status, reason: op.reason };
        continue;
      }
      let record = store.entries[item.key],
        current = null;
      const checkDependencies = () =>
        verifyDependencies(item, op, data, inspection, store, api, freshSources);
      try {
        await checkDependencies();
      } catch (e) {
        receipt.results[item.key] = {
          status: "needs_agent",
          reason: e instanceof KnowledgeError ? e.code : "source_dependency",
        };
        store.entries[item.key] = {
          ...record,
          kind: item.kind,
          project: p.repo?.id ?? null,
          needsReplan: true,
          operation: data.operation,
        };
        continue;
      }
      try {
        current = record?.id ? await api.get(record.id) : op.id ? await api.get(op.id) : null;
      } catch (e) {
        if (item.kind !== "source") throw e;
        const evidence = {
          status: "pending",
          reason: e instanceof KnowledgeError ? e.code : "transport",
        };
        receipt.results[item.key] = { status: "needs_agent", evidence };
        store.entries[item.key] = {
          ...record,
          id: record?.id ?? op.id,
          kind: item.kind,
          project: p.repo?.id ?? null,
          evidence,
          operation: data.operation,
        };
        continue;
      }
      if (
        record?.failure?.outcome === "not_applied" &&
        record.operation === data.operation &&
        !resuming
      ) {
        receipt.results[item.key] = {
          status: "failed",
          failure: record.failure,
          reason: "Use explicit resume or inspect and plan again after correcting the cause.",
        };
        continue;
      }
      if (record?.uncertain && !resuming) {
        receipt.results[item.key] = {
          status: "uncertain",
          reason: "Use resume for the outstanding operation.",
        };
        continue;
      }
      if (record?.uncertain && !current) {
        const inventory = await api.inventory();
        const matches = [];
        for (const candidate of inventory) {
          if (item.url && candidate.content?.url === item.url) {
            matches.push(candidate);
            continue;
          }
          const marker = splitNote(candidate.note).meta;
          if (marker?.key === item.key && marker.creationOperation === data.operation)
            matches.push(candidate);
        }
        if (matches.length !== 1) {
          receipt.results[item.key] = {
            status: "uncertain",
            reason: "Creation outcome cannot yet be uniquely reconciled.",
          };
          continue;
        }
        current = await api.get(matches[0].id);
      }
      const previous = record;
      if (current && !record?.owned && op.status !== "reuse" && !record?.uncertain)
        throw new KnowledgeError(
          "conflict",
          "New ownership cannot be inferred from metadata alone.",
        );
      if (!current && op.status !== "create")
        throw new KnowledgeError("conflict", "The planned object no longer exists.");
      if (
        current &&
        op.before &&
        !record?.uncertain &&
        receipt.results[item.key]?.status !== "verified"
      )
        requireThat(
          hash(fields(current)) === hash(op.before),
          "needs_replan",
          "Remote managed fields changed after planning.",
        );
      receipt.results[item.key] = { status: "attempting", id: current?.id ?? null };
      store.entries[item.key] = {
        ...record,
        kind: item.kind,
        project: p.repo?.id ?? null,
        projects: [...new Set([...(record?.projects ?? []), ...(p.repo ? [p.repo.id] : [])])],
        uncertain: true,
        failure: null,
        attempt: current ? (record?.owned ? "update" : "reuse") : "create",
        operation: data.operation,
      };
      await saveStore(p, store);
      await writeJson(receiptFile, receipt);
      let owned = Boolean(record?.owned),
        phase = current ? "reconcile_readback" : "create_preflight";
      try {
        if (!current) {
          requireWrite(p, "create");
          await checkDependencies();
          const payload =
            item.kind === "source"
              ? {
                  type: "link",
                  source: "import",
                  url: item.url,
                  title: item.title,
                  note: section(item.meta),
                }
              : {
                  type: "text",
                  title: item.title,
                  text: item.text,
                  note: section(item.meta),
                  ...(item.sourceUrl ? { sourceUrl: item.sourceUrl } : {}),
                };
          phase = "create_request";
          const created = await api.create(payload);
          phase = "create_readback";
          requireThat(created?.id, "api", "Create response omitted its bookmark identity.");
          current = created;
          owned = !created.alreadyExists;
          // Preserve the accepted identity even when the following read fails.
          store.entries[item.key] = { ...store.entries[item.key], id: created.id, owned };
          await saveStore(p, store);
          current = await api.get(created.id);
          if (owned)
            requireThat(
              splitNote(current.note).meta?.creationOperation === data.operation,
              "conflict",
              "Created bookmark ownership could not be read back.",
            );
        } else if (record?.uncertain && !record?.fields) {
          owned = Boolean(
            record.owned ||
            (!record.id &&
              record.attempt === "create" &&
              splitNote(current.note).meta?.creationOperation === data.operation &&
              splitNote(current.note).meta?.key === item.key),
          );
        } else if (owned) {
          const d = delta(item, current, record);
          if (Object.keys(d.patch).length) {
            phase = "update_preflight";
            requireWrite(p, "update");
            await checkDependencies();
            phase = "update_request";
            await api.update(current.id, d.patch);
            current = await api.get(current.id);
          }
        }
        if (owned) {
          const f = fields(current);
          requireThat(
            f.title === item.title &&
              (item.kind === "source" || f.text === item.text) &&
              f.section === section(item.meta),
            "readback",
            "Stored managed fields differ from the plan.",
          );
        }
        phase = "attachments";
        await api.attach(
          current.id,
          p.listIds,
          p.tags[item.kind] ?? [],
          p.operations,
          checkDependencies,
        );
        phase = "source_read";
        const evidence = await sourceEvidence(
          api,
          item,
          current,
          path.dirname(data.inspectionFile),
        );
        if (evidence?.status === "verified") freshSources.set(item.key, evidence.contentHash);
        const contentHash =
          evidence?.status === "verified" ? evidence.contentHash : item.contentHash;
        store.entries[item.key] = {
          id: current.id,
          owned,
          kind: item.kind,
          project: p.repo?.id ?? null,
          projects: [...new Set([...(previous?.projects ?? []), ...(p.repo ? [p.repo.id] : [])])],
          fields: owned ? fields(current) : null,
          meta: item.meta,
          fingerprint: item.fingerprint,
          contentHash,
          inputs: item.inputs,
          evidence,
          uncertain: false,
          operation: data.operation,
        };
        receipt.results[item.key] = {
          status: evidence && evidence.status !== "verified" ? "needs_agent" : "verified",
          id: current.id,
          action: op.status,
          evidence,
        };
        await saveStore(p, store);
        await writeJson(receiptFile, receipt);
      } catch (e) {
        const code = e instanceof KnowledgeError ? e.code : "transport";
        const notApplied =
          phase === "create_preflight" ||
          (phase === "create_request" &&
            (e.requestOutcome === "not_sent" ||
              ["http_400", "http_401", "http_403", "http_429"].includes(code)));
        const failure = { phase, code, outcome: notApplied ? "not_applied" : "uncertain" };
        receipt.results[item.key] = {
          status: notApplied ? "failed" : "uncertain",
          id: current?.id ?? null,
          reason: code,
          failure,
        };
        store.entries[item.key] = { ...store.entries[item.key], uncertain: !notApplied, failure };
        if (current)
          store.entries[item.key] = {
            ...store.entries[item.key],
            id: current.id,
            owned,
            fields: previous?.fields ?? null,
          };
        await saveStore(p, store);
        await writeJson(receiptFile, receipt);
        if (item.kind !== "source" || phase !== "source_read") throw e;
        // Source read/capture failures block dependents, but not independent work.
      }
    }
    const complete = Object.values(receipt.results).every(
      (r) => r.status === "verified" || r.status === "proposal",
    );
    receipt.status = complete ? "complete" : "pending";
    receipt.updatedAt = now();
    if (complete)
      store.checkpoints[p.id] = {
        revision: inspection.source.canonical,
        local: inspection.source.local,
        completedAt: now(),
        operation: data.operation,
      };
    await saveStore(p, store);
    await writeJson(receiptFile, receipt);
    return { status: receipt.status, operation: data.operation, results: receipt.results };
  } finally {
    await release();
  }
}
export async function resume({ operation, policy: policyFile, recoverLock = false }) {
  const { policy: p, digest } = await loadPolicy(policyFile);
  requireThat(/^[a-f0-9-]{36}$/u.test(operation), "operation", "Invalid operation identifier.");
  const receiptFile = path.join(locations(p).operations, operation + ".json");
  const r = await readJson(receiptFile);
  try {
    return await apply({
      plan: r.planFile,
      policy: policyFile,
      expectPlan: r.planHash,
      recoverLock,
      resuming: true,
    });
  } catch (error) {
    if (error.code !== "needs_replan") throw error;
    // Reconcile an uncertain outcome without replaying stale content or memberships.
    // This establishes identity for a fresh plan even if local/remote sources advanced.
    const raw = await readPrivate(inside(p.stateRoot, r.planFile)),
      data = JSON.parse(raw);
    requireThat(
      hash(raw) === r.planHash && data.policyDigest === digest && data.operation === operation,
      "needs_replan",
      "Recovery plan or policy changed.",
    );
    const release = await lock(p, recoverLock);
    try {
      const store = await loadStore(p),
        api = await connect(p);
      let inventory;
      for (const item of data.items) {
        const previous = store.entries[item.key];
        if (!previous?.uncertain || previous.operation !== operation) continue;
        let current;
        if (previous.id) {
          try {
            current = await api.get(previous.id);
          } catch (e) {
            if (e.code !== "http_404") throw e;
          }
        } else {
          inventory ??= await api.inventory();
          const matches = inventory.filter((b) =>
            item.url
              ? b.content?.url === item.url
              : splitNote(b.note).meta?.key === item.key &&
                splitNote(b.note).meta?.creationOperation === operation,
          );
          if (matches.length === 1) current = await api.get(matches[0].id);
        }
        if (!current) {
          r.results[item.key] = {
            status: "uncertain",
            reason: "Creation outcome remains ambiguous; no replay was attempted.",
          };
          continue;
        }
        const observed = fields(current),
          desired = { title: item.title, text: item.text, section: section(item.meta) };
        const matchesDesired =
          observed.title === desired.title &&
          observed.section === desired.section &&
          (item.kind === "source" || observed.text === desired.text);
        const marker = splitNote(current.note).meta;
        const owned = Boolean(
          previous.owned ||
          (!previous.id &&
            previous.attempt === "create" &&
            marker?.key === item.key &&
            marker?.creationOperation === operation),
        );
        if (owned && !matchesDesired) {
          if (previous.fields && hash(observed) === hash(previous.fields)) {
            store.entries[item.key] = { ...previous, uncertain: false, needsReplan: true };
            r.results[item.key] = {
              status: "reconciled",
              id: current.id,
              reason: "Previous managed state verified; inspect and plan current inputs.",
            };
          } else
            r.results[item.key] = {
              status: "conflict",
              id: current.id,
              reason: "Remote managed fields differ; preserve them for explicit resolution.",
            };
          continue;
        }
        store.entries[item.key] = {
          ...previous,
          id: current.id,
          owned,
          kind: item.kind,
          project: p.repo?.id ?? null,
          projects: [...new Set([...(previous.projects ?? []), ...(p.repo ? [p.repo.id] : [])])],
          fields: owned ? observed : null,
          meta: item.meta,
          fingerprint: item.fingerprint,
          contentHash: item.contentHash,
          inputs: item.inputs,
          uncertain: false,
          needsReplan: true,
          operation,
        };
        r.results[item.key] = {
          status: "reconciled",
          id: current.id,
          reason: "Object identity verified; fresh plan must check source content and memberships.",
        };
      }
      r.status = "needs_replan";
      r.updatedAt = now();
      await saveStore(p, store);
      await writeJson(receiptFile, r);
      return {
        status: "pending",
        operation,
        reason:
          "Inputs changed. Uncertain outcomes were inspected without remote writes; inspect and plan current inputs.",
        results: r.results,
      };
    } finally {
      await release();
    }
  }
}

export async function status({ policy: policyFile, online = false }) {
  const { policy: p } = await loadPolicy(policyFile),
    store = await loadStore(p);
  if (online) await connect(p);
  const pending = Object.entries(store.entries)
    .filter(
      ([, r]) =>
        r.uncertain ||
        r.failure ||
        r.needsReplan ||
        (r.evidence && r.evidence.status !== "verified"),
    )
    .map(([key, r]) => ({
      key,
      operation: r.operation,
      status: r.uncertain
        ? "uncertain"
        : r.failure
          ? "failed"
          : r.needsReplan
            ? "needs_replan"
            : r.evidence.status,
      ...(r.failure ? { failure: r.failure } : {}),
    }));
  return {
    status: pending.length ? "pending" : "ready",
    entries: Object.keys(store.entries).length,
    pending,
    checkpoints: store.checkpoints,
  };
}
export async function check({ repo, config = defaultConfig() }) {
  let descriptor;
  try {
    descriptor = object(
      await readJson(config),
      ["schemaVersion", "projects", "collectionPolicy"],
      ["schemaVersion", "projects"],
    );
  } catch (e) {
    if (e.code === "ENOENT")
      return { status: "needs_setup", reason: "Global knowledge configuration is missing." };
    throw e;
  }
  requireThat(
    descriptor.schemaVersion === 1 && Array.isArray(descriptor.projects),
    "config",
    "Unsupported installation descriptor.",
  );
  const root = (await git(repo, ["rev-parse", "--show-toplevel"])).trim();
  const candidates = [];
  for (const entry of descriptor.projects) {
    object(entry, ["remote", "policy"]);
    string(entry.remote);
    string(entry.policy);
    let remote;
    try {
      remote = (await git(root, ["remote", "get-url", "origin"])).trim();
    } catch {
      return {
        status: "needs_setup",
        reason: "Repository source identity has not been configured.",
      };
    }
    if (entry.remote === remote) candidates.push(entry);
  }
  requireThat(candidates.length <= 1, "config", "Multiple project policies match the repository.");
  if (!candidates.length) {
    let connection = "not_configured",
      diagnostic;
    if (descriptor.collectionPolicy) {
      const { policy: shared } = await loadPolicy(descriptor.collectionPolicy);
      requireThat(shared.scope === "collection", "config", "Expected a collection policy.");
      try {
        await connect(shared);
        connection = "ready";
      } catch (e) {
        connection = e.code === "unreachable" ? "unreachable" : "conflict";
        diagnostic = e.diagnostic;
      }
    }
    return {
      status: "needs_setup",
      connection,
      ...(diagnostic ? { diagnostic } : {}),
      reason: "This repository has no adopted project policy.",
    };
  }
  const policyFile = candidates[0].policy,
    { policy: p } = await loadPolicy(policyFile);
  const current = await localFingerprints(root, p),
    store = await loadStore(p),
    checkpoint = store.checkpoints[p.id];
  try {
    await connect(p);
  } catch (e) {
    if (e.code === "unreachable")
      return {
        status: "unreachable",
        reason: e.message,
        policy: policyFile,
        ...(e.diagnostic ? { diagnostic: e.diagnostic } : {}),
      };
    return { status: "conflict", reason: e.code, policy: policyFile };
  }
  const pending = Object.values(store.entries).some(
    (r) =>
      (r.project === p.repo.id || r.projects?.includes(p.repo.id)) &&
      (r.uncertain ||
        r.failure ||
        r.needsReplan ||
        (r.evidence && r.evidence.status !== "verified")),
  );
  return {
    status:
      pending || !checkpoint || hash(current) !== hash(checkpoint.local) ? "pending" : "ready",
    policy: policyFile,
    writer: os.hostname() === p.writerHost,
    reason: "Local readiness only; canonical freshness is verified by inspect.",
  };
}
