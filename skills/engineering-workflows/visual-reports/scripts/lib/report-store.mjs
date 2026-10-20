// Local, explicit filesystem writes. SPDX-License-Identifier: Apache-2.0
import { mkdir, open, readFile, rename, rm, lstat, realpath, readdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { renderReport, validateReport } from "../render-report.mjs";
const revisionPattern = /^\d{13}-[a-f0-9-]{36}$/;
const validRevision = (v) => {
  if (!revisionPattern.test(v)) throw new TypeError("Invalid revision");
  return v;
};
async function regular(file) {
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Store file must be regular");
}
async function root(directory, create = false) {
  const resolved = path.resolve(directory);
  if (create) await mkdir(resolved, { recursive: true, mode: 0o700 });
  const stat = await lstat(resolved);
  if (!stat.isDirectory() || stat.isSymbolicLink() || (await realpath(resolved)) !== resolved)
    throw new Error("Store must be a real directory without symlink ancestors");
  return resolved;
}
async function readJson(file) {
  await regular(file);
  return JSON.parse(await readFile(file, "utf8"));
}
async function put(file, value) {
  const handle = await open(file, "wx", 0o600);
  try {
    await handle.writeFile(value);
    await handle.sync();
  } finally {
    await handle.close();
  }
}
export async function currentRevision(directory) {
  const base = await root(directory);
  try {
    const current = await readJson(path.join(base, "current.json"));
    validRevision(current.revision);
    if (typeof current.reportId !== "string") throw new Error("Invalid current pointer");
    return current;
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}
async function revisionMetadata(directory, revision) {
  const base = await root(directory),
    dir = path.join(base, "revisions", validRevision(revision));
  if ((await realpath(dir)) !== dir) throw new Error("Revision symlink refused");
  const manifest = await readJson(path.join(dir, "revision.json"));
  if (manifest.revision !== revision || !manifest.files)
    throw new Error("Invalid revision manifest");
  if (manifest.parent !== null) validRevision(manifest.parent);
  return { dir, manifest };
}
export async function readRevision(directory, revision) {
  const { dir, manifest } = await revisionMetadata(directory, revision);
  const output = {};
  for (const ext of ["html", "md", "json"]) {
    const file = path.join(dir, `report.${ext}`);
    await regular(file);
    const content = await readFile(file, "utf8");
    if (createHash("sha256").update(content).digest("hex") !== manifest.files[ext])
      throw new Error(`Revision ${ext} checksum mismatch`);
    output[ext] = content;
  }
  return { manifest, ...output };
}
export async function history(directory, { head } = {}) {
  const current = head === undefined ? await currentRevision(directory) : null,
    result = [],
    seen = new Set();
  let revision = head === undefined ? current?.revision : head;
  while (revision) {
    if (seen.has(revision)) throw new Error("Cyclic revision history");
    seen.add(revision);
    const { manifest } = await revisionMetadata(directory, revision);
    result.push(manifest);
    revision = manifest.parent;
  }
  return result;
}
export async function publishRevision(report, directory, { expected = null } = {}) {
  validateReport(report);
  if (expected !== null) validRevision(expected);
  const base = await root(directory, true),
    lock = path.join(base, ".writer-lock");
  try {
    await mkdir(lock, { mode: 0o700 });
  } catch (e) {
    if (e.code === "EEXIST")
      throw new Error(
        `Report store is locked: ${lock}. Inspect the owning process before manual recovery; lock is never stolen.`,
      );
    throw e;
  }
  let temporary;
  try {
    await put(
      path.join(lock, "owner.json"),
      JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
    );
    const current = await currentRevision(base);
    if (!current && (await readdir(base)).some((name) => name !== ".writer-lock"))
      throw new Error(
        "Create requires an empty report store; inspect existing contents before recovery",
      );
    if ((current?.revision ?? null) !== expected)
      throw new Error(
        `Stale update: expected ${expected ?? "empty store"}, current ${current?.revision ?? "empty store"}`,
      );
    if (current && current.reportId !== report.id)
      throw new Error("Report id cannot change within a store");
    const output = await renderReport(report);
    const revisions = path.join(base, "revisions");
    await mkdir(revisions, { recursive: true, mode: 0o700 });
    if ((await realpath(revisions)) !== revisions) throw new Error("Revisions symlink refused");
    const revision = `${Date.now()}-${randomUUID()}`;
    temporary = path.join(revisions, `.pending-${randomUUID()}`);
    await mkdir(temporary, { mode: 0o700 });
    const formats = { html: output.html, md: output.markdown, json: output.json };
    const manifest = {
      revision,
      parent: expected,
      reportId: report.id,
      createdAt: new Date().toISOString(),
      files: {},
    };
    for (const [ext, content] of Object.entries(formats)) {
      manifest.files[ext] = createHash("sha256").update(content).digest("hex");
      await put(path.join(temporary, `report.${ext}`), content);
    }
    await put(path.join(temporary, "revision.json"), JSON.stringify(manifest, null, 2) + "\n");
    await rename(temporary, path.join(revisions, revision));
    temporary = undefined;
    // A failure here leaves only an unreferenced complete revision; current stays valid.
    const pointer = path.join(lock, "current.next");
    await put(pointer, JSON.stringify({ revision, reportId: report.id }) + "\n");
    await rename(pointer, path.join(base, "current.json"));
    return manifest;
  } finally {
    if (temporary) await rm(temporary, { recursive: true, force: true });
    await rm(lock, { recursive: true, force: true });
  }
}
