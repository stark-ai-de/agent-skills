import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { unzipSync } from "fflate";

import {
  assertNoPathCollisions,
  assertSafeArchivePath,
  encodeZipStoreV1,
  inspectZipStoreV1,
} from "../lib/reproducible-archive.mjs";
import { hashBytes } from "../lib/bundle-contract.mjs";
import { validateContractSnapshots } from "../lib/contract-snapshots.mjs";
import { sourceTreeEntries, sourceTreeSha256 } from "../lib/release-input-digest.mjs";
import {
  loadReleaseDescriptorFile,
  PLUGIN_SOURCE_PATH,
  PLUGIN_SOURCE_SCHEMA_PATH,
  validateToolchainPins,
} from "../lib/release-descriptor.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const { release, errors } = loadReleaseDescriptorFile(repositoryRoot);
assert.equal(errors.length, 0, errors.join("\n"));
assert.equal(release.pluginId, "stark-ai-developer");
assert.equal(release.version, "1.0.0");
assert.equal(release.build.archiveProfile, "zip-store-v1");
const gitAttributes = fs.readFileSync(path.join(repositoryRoot, ".gitattributes"), "utf8");
assert.match(gitAttributes, /^\* text=auto eol=lf$/m);
assert.match(gitAttributes, /^\*\.png binary$/m);
const validateWorkflow = fs.readFileSync(
  path.join(repositoryRoot, ".github/workflows/validate.yml"),
  "utf8",
);
const archiveIdentityJob = validateWorkflow
  .split("archive-identity:")[1]
  ?.split("archive-identity-compare:")[0];
assert.ok(archiveIdentityJob, "Validate workflow must define archive-identity");
const autocrlfIndex = archiveIdentityJob.indexOf("core.autocrlf false");
const eolIndex = archiveIdentityJob.indexOf("core.eol lf");
const checkoutIndex = archiveIdentityJob.indexOf("actions/checkout@");
assert.ok(
  autocrlfIndex !== -1 &&
    eolIndex !== -1 &&
    checkoutIndex !== -1 &&
    autocrlfIndex < checkoutIndex &&
    eolIndex < checkoutIndex,
  "archive-identity must pin Git to LF before checkout",
);
assert.equal(validateToolchainPins(repositoryRoot).length, 0);
assert.equal(validateContractSnapshots(repositoryRoot).length, 0);

assert.throws(() => assertSafeArchivePath("CON"), /Windows/);
assert.throws(() => assertSafeArchivePath("foo/bar."), /trailing/);
assert.throws(() => assertSafeArchivePath("a/../b"), /traversal/);
assert.throws(() => assertSafeArchivePath("cafe\u0301.txt"), /NFC/);
assert.throws(() => assertSafeArchivePath("foo\u0001bar"), /control character/);
assert.throws(() => assertNoPathCollisions(["ReadMe.txt", "readme.txt"]), /case-fold/);
assert.throws(
  () => encodeZipStoreV1([{ path: "AUX.txt", data: Buffer.from("x\n"), mode: 0o644 }]),
  /Windows/,
);

const first = encodeZipStoreV1([
  { path: "readme.txt", data: Buffer.from("hello\n"), mode: 0o644 },
  { path: "bin/run.sh", data: Buffer.from("#!/bin/sh\n"), mode: 0o755 },
]);
const second = encodeZipStoreV1([
  { path: "bin/run.sh", data: Buffer.from("#!/bin/sh\n"), mode: 0o755 },
  { path: "readme.txt", data: Buffer.from("hello\n"), mode: 0o644 },
]);
assert.equal(Buffer.compare(first, second), 0, "zip-store-v1 output must ignore input order");
const inventory = inspectZipStoreV1(first);
assert.equal(inventory.length, 2);
assert.equal(inventory[0].path, "bin/run.sh");
assert.equal(inventory[0].method, 0);
const extracted = unzipSync(first);
assert.equal(Buffer.from(extracted["readme.txt"]).toString("utf8"), "hello\n");

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "release-descriptor-"));
try {
  fs.mkdirSync(path.join(fixture, "plugins"), { recursive: true, mode: 0o755 });
  const descriptorPath = path.join(fixture, PLUGIN_SOURCE_PATH);
  fs.copyFileSync(path.join(repositoryRoot, PLUGIN_SOURCE_PATH), descriptorPath);
  fs.copyFileSync(
    path.join(repositoryRoot, PLUGIN_SOURCE_SCHEMA_PATH),
    path.join(fixture, PLUGIN_SOURCE_SCHEMA_PATH),
  );
  const descriptor = JSON.parse(fs.readFileSync(descriptorPath, "utf8"));
  descriptor.version = "9.9.9";
  fs.writeFileSync(descriptorPath, `${JSON.stringify(descriptor, null, 2)}\n`);
  const drifted = loadReleaseDescriptorFile(fixture);
  assert.ok(
    drifted.errors.some((error) => /openaiArchive/.test(error)),
    drifted.errors.join("\n"),
  );
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}

const digestEntries = sourceTreeEntries(repositoryRoot);
assert.ok(digestEntries.length > 0, "release-input tree must enumerate tracked files");
assert.ok(
  digestEntries.every((entry) => entry.mode === "0644" || entry.mode === "0755"),
  "release-input modes must be Git-normalized 0644 or 0755",
);
const independentDigest = hashBytes(
  Buffer.concat(
    digestEntries.flatMap((entry) => [
      Buffer.from(entry.path, "utf8"),
      Buffer.from([0]),
      Buffer.from(entry.mode, "utf8"),
      Buffer.from([0]),
      Buffer.from(entry.sha256, "utf8"),
      Buffer.from([0]),
    ]),
  ),
);
assert.equal(
  sourceTreeSha256(repositoryRoot),
  independentDigest,
  "sourceTreeSha256 must match the published NUL-framed recipe",
);

console.log("Release descriptor, snapshots, and zip-store-v1 fixtures passed.");
