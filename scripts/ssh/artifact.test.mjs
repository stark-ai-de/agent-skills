import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import {
  artifactEntry,
  validateRuntimeArtifact,
  copyRuntimeArtifact,
} from "../lib/ssh-runtime-artifact.mjs";

const root = process.cwd();
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ssh-artifact-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const source = artifactEntry(root);
  const payload = path.join(directory, "runtime");
  fs.cpSync(source.directory, payload, { recursive: true });
  return { directory, payload, pin: { ...source.entry.artifact } };
}
function changeManifest(payload, pin, mutate) {
  const file = path.join(payload, "ARTIFACT-MANIFEST.json");
  const manifest = JSON.parse(fs.readFileSync(file));
  mutate(manifest);
  const bytes = Buffer.from(JSON.stringify(manifest, null, 2) + "\n");
  fs.writeFileSync(file, bytes);
  pin.manifestSha256 = hash(bytes);
}

test("pinned artifact verifies full provenance, build manifest and payload", (t) => {
  const { payload, pin } = fixture(t);
  const result = validateRuntimeArtifact(payload, pin);
  assert.equal(result.manifest.sourceCommit, pin.sourceCommit);
  assert.equal(result.manifest.runtimeVersion, pin.version);
  assert.ok(result.files.has("viewer/index.html"));
  assert.throws(
    () => validateRuntimeArtifact(payload, { ...pin, sourceRepository: "https://example.invalid" }),
    /invalid provenance/,
  );
  assert.throws(
    () => validateRuntimeArtifact(payload, { ...pin, manifestSha256: "0".repeat(64) }),
    /digest mismatch/,
  );
});

test("artifact rejects changed, missing and extra payload bytes", (t) => {
  for (const mutation of ["changed", "missing", "extra"]) {
    const { payload, pin } = fixture(t);
    if (mutation === "changed") fs.appendFileSync(path.join(payload, "mcp.mjs"), "tampered");
    if (mutation === "missing") fs.unlinkSync(path.join(payload, "mcp.mjs"));
    if (mutation === "extra") fs.writeFileSync(path.join(payload, "extra.mjs"), "unexpected");
    assert.throws(
      () => validateRuntimeArtifact(payload, pin),
      /digest mismatch|inventory mismatch/,
    );
  }
});

test("manifest traversal and source revision mismatches fail before projection", (t) => {
  const { payload, pin, directory } = fixture(t);
  const sentinel = path.join(directory, "outside.txt");
  fs.writeFileSync(sentinel, "unchanged");
  changeManifest(payload, pin, (manifest) => {
    manifest.files[0].path = "../outside.txt";
  });
  assert.throws(() => validateRuntimeArtifact(payload, pin), /inventory mismatch/);
  assert.equal(fs.readFileSync(sentinel, "utf8"), "unchanged");
  const other = fixture(t);
  changeManifest(other.payload, other.pin, (manifest) => {
    manifest.sourceCommit = "0".repeat(40);
  });
  assert.throws(() => validateRuntimeArtifact(other.payload, other.pin), /metadata mismatch/);
});

test("symlink files and roots are rejected", { skip: process.platform === "win32" }, (t) => {
  const { payload, pin, directory } = fixture(t);
  const external = path.join(directory, "outside.txt");
  fs.writeFileSync(external, "outside");
  fs.unlinkSync(path.join(payload, "mcp.mjs"));
  fs.symlinkSync(external, path.join(payload, "mcp.mjs"));
  assert.throws(() => validateRuntimeArtifact(payload, pin), /symlink/);
  const linked = path.join(directory, "linked-runtime");
  fs.symlinkSync(payload, linked);
  assert.throws(() => validateRuntimeArtifact(linked, pin), /regular directory/);
});

test("standalone artifact starts authenticated daemon and viewer without producer or Mechas", async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ssh-artifact-standalone-"));
  const runtime = path.join(directory, "isolated-runtime");
  copyRuntimeArtifact({ root, output: runtime });
  assert.equal(fs.existsSync(path.join(directory, "node_modules")), false);
  const cli = path.join(runtime, "cli.mjs");
  const state = path.join(directory, "state");
  const run = (...args) =>
    execFileSync(process.execPath, [cli, ...args, "--state-directory", state], {
      cwd: directory,
      encoding: "utf8",
      timeout: 20000,
    });
  assert.match(run("help"), /ssh-management start/);
  t.after(async () => {
    try {
      run("stop");
    } finally {
      // Windows releases the daemon's working directory after the stop response.
      await fs.promises.rm(directory, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 100,
      });
    }
  });
  const started = JSON.parse(run("start"));
  const unauthenticated = await fetch(`${started.url}/v1/openapi.json`);
  assert.equal(unauthenticated.status, 401);
  const viewer = await fetch(started.url);
  assert.equal(viewer.status, 200);
  assert.match(await viewer.text(), /terminal/i);
  const token = fs.readFileSync(path.join(state, "agent.token"), "utf8").trim();
  const registration = await fetch(`${started.url}/v1/clients`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(registration.status, 200);
  const clientToken = (await registration.json()).data.token;
  const authenticated = await fetch(`${started.url}/v1/openapi.json`, {
    headers: { authorization: `Bearer ${clientToken}` },
  });
  assert.equal(authenticated.status, 200);
  const mcp = spawn(process.execPath, [path.join(runtime, "mcp.mjs"), "--state-directory", state], {
    cwd: directory,
    stdio: ["pipe", "pipe", "pipe"],
  });
  t.after(() => mcp.kill());
  let stdout = "",
    stderr = "";
  mcp.stdout.on("data", (bytes) => {
    stdout += bytes;
  });
  mcp.stderr.on("data", (bytes) => {
    stderr += bytes;
  });
  mcp.stdin.write(
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "artifact-fixture", version: "1" },
      },
    }) + "\n",
  );
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("MCP initialization timed out")), 10000);
    const receive = () => {
      if (stdout.includes("protocolVersion")) {
        clearTimeout(timeout);
        mcp.stdout.off("data", receive);
        resolve();
      }
    };
    mcp.stdout.on("data", receive);
    receive();
  });
  mcp.stdin.end();
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      mcp.kill();
      reject(new Error("MCP exit timed out"));
    }, 10000);
    mcp.once("exit", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(`MCP failed: ${stderr}`));
    });
    mcp.once("error", reject);
  });
  assert.match(stdout, /protocolVersion/);
  assert.equal((await fetch(started.url)).status, 200);
});
