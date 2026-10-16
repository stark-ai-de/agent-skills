import * as fs from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash, randomUUID } from "node:crypto";

export class KnowledgeError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
export function requireThat(ok, code, message) {
  if (!ok) throw new KnowledgeError(code, message);
}
export const hash = (value) =>
  createHash("sha256")
    .update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value))
    .digest("hex");
export const identity = (...parts) => hash(["karakeep-knowledge-v1", ...parts]);
export const now = () => new Date().toISOString();
export function object(value, keys, required = keys) {
  requireThat(
    value && typeof value === "object" && !Array.isArray(value),
    "invalid_input",
    "Expected an object.",
  );
  requireThat(
    Object.keys(value).every((k) => keys.includes(k)) &&
      required.every((k) => Object.hasOwn(value, k)),
    "invalid_input",
    "Unknown or missing input field.",
  );
  return value;
}
export function string(value) {
  requireThat(
    typeof value === "string" && value.length > 0 && !/[\x00-\x1f]/u.test(value),
    "invalid_input",
    "Expected a nonempty single-line string.",
  );
  return value;
}
export function inside(root, file) {
  const rel = path.relative(path.resolve(root), path.resolve(file));
  requireThat(
    rel === "" || (!rel.startsWith(".." + path.sep) && rel !== ".." && !path.isAbsolute(rel)),
    "invalid_path",
    "Path is outside the authorized directory.",
  );
  return path.resolve(file);
}
export async function noLinks(file) {
  let current = path.parse(path.resolve(file)).root;
  for (const part of path.resolve(file).slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try {
      requireThat(
        !(await fs.lstat(current)).isSymbolicLink(),
        "invalid_path",
        "Symbolic links are not permitted in private paths.",
      );
    } catch (e) {
      if (e.code === "ENOENT") return;
      throw e;
    }
  }
}
export async function readPrivate(file, max = 128 * 1024 * 1024) {
  await noLinks(file);
  const handle = await fs.open(
    file,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  try {
    const stat = await handle.stat();
    requireThat(
      stat.isFile() &&
        stat.uid === process.getuid() &&
        (stat.mode & 0o777) === 0o600 &&
        stat.size <= max,
      "private_file",
      "Expected a bounded user-owned regular file with mode 0600.",
    );
    return new TextDecoder("utf-8", { fatal: true }).decode(await handle.readFile());
  } finally {
    await handle.close();
  }
}
export async function readJson(file) {
  try {
    return JSON.parse(await readPrivate(file));
  } catch (e) {
    if (e instanceof SyntaxError)
      throw new KnowledgeError("invalid_json", "Invalid private JSON document.");
    throw e;
  }
}
export async function privateDir(dir) {
  await noLinks(dir);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const stat = await fs.lstat(dir);
  requireThat(
    stat.isDirectory() && stat.uid === process.getuid() && (stat.mode & 0o077) === 0,
    "private_directory",
    "State directories must be user-owned and private.",
  );
}
export async function writeJson(file, data) {
  await privateDir(path.dirname(file));
  await noLinks(file);
  const temp = file + "." + randomUUID() + ".tmp";
  const handle = await fs.open(temp, "wx", 0o600);
  try {
    await handle.writeFile(JSON.stringify(data, null, 2) + "\n");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.rename(temp, file);
  const dir = await fs.open(path.dirname(file), "r");
  try {
    await dir.sync();
  } finally {
    await dir.close();
  }
}
export function defaultConfig() {
  return path.join(
    process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"),
    "karakeep",
    "knowledge",
    "config.json",
  );
}
export async function loadPolicy(file) {
  const p = object(
    await readJson(file),
    [
      "schemaVersion",
      "id",
      "revision",
      "scope",
      "repo",
      "connection",
      "stateRoot",
      "writerHost",
      "writeEnabled",
      "kinds",
      "operations",
      "listIds",
      "tags",
      "approvedAggregates",
      "maxContentBytes",
      "approval",
    ],
    [
      "schemaVersion",
      "id",
      "revision",
      "scope",
      "connection",
      "stateRoot",
      "writerHost",
      "writeEnabled",
      "kinds",
      "operations",
      "listIds",
      "tags",
      "approvedAggregates",
      "approval",
    ],
  );
  requireThat(
    p.schemaVersion === 1 && ["project", "collection"].includes(p.scope),
    "policy",
    "Unsupported policy version or scope.",
  );
  for (const v of [p.id, p.revision, p.writerHost, p.approval, p.stateRoot]) string(v);
  requireThat(
    path.isAbsolute(p.stateRoot) && typeof p.writeEnabled === "boolean",
    "policy",
    "Invalid state root or write policy.",
  );
  object(
    p.connection,
    ["address", "accountId", "credentialFile", "credentialEnv", "apiProfile", "scopes"],
    ["address", "accountId", "apiProfile", "scopes"],
  );
  requireThat(p.connection.apiProfile === "karakeep-0.33", "policy", "Unsupported API profile.");
  string(p.connection.accountId);
  requireThat(
    Boolean(p.connection.credentialFile) !== Boolean(p.connection.credentialEnv),
    "policy",
    "Select one private credential reference.",
  );
  if (p.connection.credentialFile)
    requireThat(
      path.isAbsolute(p.connection.credentialFile),
      "policy",
      "Credential path must be absolute.",
    );
  if (p.connection.credentialEnv) {
    object(p.connection.credentialEnv, ["address", "key"]);
    for (const v of Object.values(p.connection.credentialEnv))
      requireThat(
        /^[A-Z][A-Z0-9_]*$/u.test(v),
        "policy",
        "Invalid credential environment reference.",
      );
  }
  for (const [values, allowed] of [
    [p.kinds, ["source", "document", "session", "finding", "overview", "dossier", "dataset"]],
    [p.operations, ["create", "update", "membership", "tag"]],
  ])
    requireThat(
      Array.isArray(values) && values.every((v) => allowed.includes(v)),
      "policy",
      "Invalid allowed operations or content kinds.",
    );
  for (const values of [p.listIds, p.connection.scopes])
    requireThat(
      Array.isArray(values) && values.every((v) => typeof v === "string" && v.length),
      "policy",
      "Invalid policy identifiers.",
    );
  object(p.tags, p.kinds, []);
  for (const values of Object.values(p.tags))
    requireThat(
      Array.isArray(values) &&
        values.every((v) => typeof v === "string" && /^[a-z0-9][a-z0-9-]*$/u.test(v)),
      "policy",
      "Use explicit normalized role tag names.",
    );
  requireThat(Array.isArray(p.approvedAggregates), "policy", "Expected aggregate grants.");
  for (const a of p.approvedAggregates) {
    object(a, ["id", "purpose", "inputKeys", "approval"]);
    string(a.id);
    string(a.purpose);
    string(a.approval);
    requireThat(
      Array.isArray(a.inputKeys) && a.inputKeys.every((v) => /^[a-f0-9]{64}$/u.test(v)),
      "policy",
      "Invalid aggregate input scope.",
    );
  }
  p.maxContentBytes ??= 16 * 1024 * 1024;
  requireThat(
    Number.isSafeInteger(p.maxContentBytes) &&
      p.maxContentBytes > 0 &&
      p.maxContentBytes <= 64 * 1024 * 1024,
    "policy",
    "Invalid content limit.",
  );
  if (p.scope === "project") {
    object(
      p.repo,
      ["id", "remote", "remoteName", "branch", "include", "exclude", "workContext"],
      ["id", "remote", "branch", "include", "exclude"],
    );
    for (const v of [p.repo.id, p.repo.remote, p.repo.branch]) string(v);
    requireThat(
      !p.repo.remote.startsWith("-") && !p.repo.branch.startsWith("-"),
      "policy",
      "Invalid Git source.",
    );
    for (const globs of [p.repo.include, p.repo.exclude])
      requireThat(
        Array.isArray(globs) &&
          globs.every(
            (v) => typeof v === "string" && !path.isAbsolute(v) && !v.split("/").includes(".."),
          ),
        "policy",
        "Invalid relative knowledge paths.",
      );
    p.repo.remoteName ??= "origin";
    requireThat(/^[a-zA-Z0-9_-]+$/u.test(p.repo.remoteName), "policy", "Invalid remote name.");
  } else requireThat(!p.repo, "policy", "Collection policies cannot authorize Git documents.");
  await noLinks(p.stateRoot);
  return { policy: p, digest: hash(p), file: path.resolve(file) };
}
export function locations(p) {
  const root = path.join(
    p.stateRoot,
    "collections",
    identity(p.connection.address, p.connection.accountId),
  );
  return {
    root,
    store: path.join(root, "store.json"),
    operations: path.join(root, "operations"),
    lock: path.join(root, "writer.lock"),
  };
}
export async function loadStore(p) {
  try {
    const s = await readJson(locations(p).store);
    requireThat(
      s.schemaVersion === 1 && s.entries && s.checkpoints,
      "state",
      "Unsupported receipt store.",
    );
    return s;
  } catch (e) {
    if (e.code === "ENOENT") return { schemaVersion: 1, entries: {}, checkpoints: {} };
    throw e;
  }
}
export async function lock(p, recover = false) {
  requireThat(
    os.hostname() === p.writerHost,
    "writer_host",
    "Apply is restricted to the designated writing host.",
  );
  const loc = locations(p);
  await privateDir(loc.root);
  const token = randomUUID();
  try {
    await fs.mkdir(loc.lock, { mode: 0o700 });
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
    if (!recover)
      throw new KnowledgeError(
        "locked",
        "Another writer or an unrecovered operation holds the collection lock.",
      );
    const owner = await readJson(path.join(loc.lock, "owner.json"));
    requireThat(
      owner.host === os.hostname() && Number.isSafeInteger(owner.pid),
      "locked",
      "Cannot verify the previous lock owner.",
    );
    let dead = false;
    try {
      process.kill(owner.pid, 0);
    } catch (err) {
      dead = err.code === "ESRCH";
    }
    requireThat(dead, "locked", "Previous writer is still running or cannot be verified.");
    await fs.unlink(path.join(loc.lock, "owner.json"));
    await fs.rmdir(loc.lock);
    return lock(p, false);
  }
  await writeJson(path.join(loc.lock, "owner.json"), {
    token,
    pid: process.pid,
    host: os.hostname(),
    createdAt: now(),
  });
  return async () => {
    const owner = await readJson(path.join(loc.lock, "owner.json"));
    requireThat(owner.token === token, "locked", "Lock ownership changed.");
    await fs.unlink(path.join(loc.lock, "owner.json"));
    await fs.rmdir(loc.lock);
  };
}
