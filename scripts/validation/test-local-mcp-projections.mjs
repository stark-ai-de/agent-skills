import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";
import { load as parseYaml } from "js-yaml";
import {
  compareClaudeArchiveIdentities,
  writeClaudeArchiveIdentity,
} from "../ssh/claude-archive-identity.mjs";

import {
  createDirectoryArchive,
  enumerateTree,
  syncPortableProjection,
  validatePortableProjection,
  writeClaudeStage,
} from "../lib/plugin-projections.mjs";
import { loadValidatedBundle } from "../lib/bundle-contract.mjs";
import {
  PINNED_AGENT_PLUGINS_MCP_SCHEMA_PATH,
  PLUGIN_SOURCE_PATH,
  pluginIdentity,
} from "../lib/release-descriptor.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "local-mcp-projection-test-"));

function archiveModes(bytes) {
  const modes = new Map();
  const end = bytes.length - 22;
  assert.equal(bytes.readUInt32LE(end), 0x06054b50);
  let offset = bytes.readUInt32LE(end + 16);
  const count = bytes.readUInt16LE(end + 10);
  for (let index = 0; index < count; index += 1) {
    assert.equal(bytes.readUInt32LE(offset), 0x02014b50);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const name = bytes.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    modes.set(name, (bytes.readUInt32LE(offset + 38) >>> 16) & 0o777);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return modes;
}

try {
  const repository = path.join(fixture, "repository");
  // Scope Windows long-path support to this disposable clone, not global Git config.
  const clone = spawnSync(
    "git",
    [
      "clone",
      "--config",
      "core.longpaths=true",
      "--local",
      "--no-hardlinks",
      "--quiet",
      root,
      repository,
    ],
    {
      encoding: "utf8",
    },
  );
  assert.equal(clone.status, 0, clone.stderr);
  // Exercise the current working candidate even before the new schema is committed.
  fs.copyFileSync(
    path.join(root, PINNED_AGENT_PLUGINS_MCP_SCHEMA_PATH),
    path.join(repository, PINNED_AGENT_PLUGINS_MCP_SCHEMA_PATH),
  );
  const sourcePath = path.join(repository, PLUGIN_SOURCE_PATH);
  const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const membership = structuredClone(source.mcp);
  const identity = pluginIdentity(repository);
  const portable = path.join(repository, identity.portableProjection);
  const packageScript = path.join(root, "scripts/plugin/package-claude-plugin.mjs");
  const packageClaude = (output) =>
    spawnSync(process.execPath, [packageScript, "--output", output], {
      cwd: repository,
      encoding: "utf8",
    });

  const verifySupplyChain = () =>
    spawnSync(
      process.execPath,
      [path.join(root, "scripts/release/verify-supply-chain.mjs"), "--root", repository],
      { cwd: repository, encoding: "utf8", timeout: 30000 },
    );

  for (const targets of [["portable", "claude"], ["claude"], ["portable"], []]) {
    source.mcp = targets.length ? [{ ...membership[0], targets }] : [];
    const label = targets.join("-") || "skills-only";
    fs.writeFileSync(sourcePath, JSON.stringify(source, null, 2) + "\n");
    syncPortableProjection({ root: repository });
    assert.deepEqual(validatePortableProjection({ root: repository }).errors, []);
    assert.equal(fs.existsSync(path.join(portable, "runtime")), targets.includes("portable"));
    assert.equal(fs.existsSync(path.join(portable, "mcp.json")), targets.includes("portable"));
    const supplyChain = verifySupplyChain();
    assert.equal(supplyChain.status, 0, supplyChain.stderr || supplyChain.stdout);

    if (targets.includes("portable")) {
      const mcpPath = path.join(portable, "mcp.json");
      const valid = fs.readFileSync(mcpPath, "utf8");
      for (const field of ["$schema", "type"]) {
        const mcp = JSON.parse(valid);
        if (field === "$schema") delete mcp.$schema;
        else delete mcp.mcpServers["ssh-management"].type;
        fs.writeFileSync(mcpPath, JSON.stringify(mcp));
        const errors = validatePortableProjection({ root: repository }).errors;
        assert.ok(
          errors.some((error) => error.startsWith("mcp.json") && error.includes(`'${field}'`)),
          errors.join("\n"),
        );
        fs.writeFileSync(mcpPath, valid);
      }
    }

    const output = path.join(fixture, `claude-${label}.zip`);
    const packaged = packageClaude(output);
    assert.equal(packaged.status, 0, packaged.stderr || packaged.stdout);
    const archive = fs.readFileSync(output);
    const files = unzipSync(archive);
    const readJson = (name) => JSON.parse(Buffer.from(files[name]).toString("utf8"));
    assert.equal(readJson(".claude-plugin/plugin.json").mcpServers, undefined);
    assert.equal(Object.hasOwn(files, ".mcp.json"), targets.includes("claude"));
    assert.equal(Object.hasOwn(files, "runtime/mcp.mjs"), targets.includes("claude"));
    if (targets.includes("claude")) {
      const mcp = readJson(".mcp.json");
      assert.deepEqual(Object.keys(mcp.mcpServers), ["ssh-management"]);
      assert.equal(mcp.mcpServers["ssh-management"].command, "node");
      assert.deepEqual(mcp.mcpServers["ssh-management"].args, [
        "${CLAUDE_PLUGIN_ROOT}/runtime/mcp.mjs",
      ]);
      assert.deepEqual(
        Buffer.from(files["runtime/mcp.mjs"]),
        fs.readFileSync(path.join(repository, "vendor/ssh-manager/runtime/mcp.mjs")),
      );
    }
    const manifest = readJson("SOURCE-MANIFEST.json");
    assert.deepEqual(
      manifest.bundle.mcp.flatMap((entry) => entry.targets),
      targets.includes("claude") ? targets : [],
    );
    assert.deepEqual(
      manifest.files.map((file) => file.path).sort(),
      Object.keys(files)
        .filter((name) => name !== "SOURCE-MANIFEST.json")
        .sort(),
    );
    const modes = archiveModes(archive);
    for (const file of manifest.files) {
      assert.equal(files[file.path].length, file.byteLength);
      assert.equal(crypto.createHash("sha256").update(files[file.path]).digest("hex"), file.sha256);
      assert.equal(modes.get(file.path), Number.parseInt(file.mode, 8));
    }
    const executable = manifest.files.filter((file) => file.mode === "0755");
    assert.ok(executable.length > 0, "the Claude archive must preserve executable skill scripts");

    const stage = path.join(fixture, `stage-${label}`);
    writeClaudeStage({ root: repository, stage, bundle: loadValidatedBundle(repository) });
    // Simulate a filesystem that loses Unix execute bits, as native Windows does.
    for (const file of enumerateTree(stage)) fs.chmodSync(file.absolute, 0o644);
    const normalizedOutput = path.join(fixture, `normalized-${label}.zip`);
    createDirectoryArchive({ sourceRoot: stage, output: normalizedOutput });
    assert.deepEqual(fs.readFileSync(normalizedOutput), archive);

    if (targets.includes("portable")) {
      const projected = path.join(portable, "runtime/mcp.mjs");
      const original = fs.readFileSync(projected);
      fs.appendFileSync(projected, "tampered");
      const rejectedProjection = verifySupplyChain();
      assert.notEqual(rejectedProjection.status, 0);
      assert.match(rejectedProjection.stderr, /Runtime projection differs from pinned artifact/);
      fs.writeFileSync(projected, original);
    }
  }

  const identities = path.join(fixture, "identities");
  for (const platform of ["Linux", "macOS", "Windows"]) {
    const directory = path.join(identities, `ssh-claude-identity-${platform}`);
    fs.mkdirSync(directory, { recursive: true });
    fs.copyFileSync(
      path.join(fixture, "claude-portable-claude.zip"),
      path.join(directory, "candidate.zip"),
    );
    writeClaudeArchiveIdentity(directory);
  }
  const expectedIdentity = compareClaudeArchiveIdentities(identities);
  const windowsIdentity = path.join(identities, "ssh-claude-identity-Windows/archive-identity.json");
  fs.writeFileSync(windowsIdentity, JSON.stringify({ ...expectedIdentity, sha256: "0".repeat(64) }));
  assert.throws(
    () => compareClaudeArchiveIdentities(identities),
    /differs between Linux and Windows/,
  );
  fs.writeFileSync(windowsIdentity, JSON.stringify(expectedIdentity));
  fs.unlinkSync(path.join(identities, "ssh-claude-identity-macOS/archive-identity.json"));
  assert.throws(() => compareClaudeArchiveIdentities(identities), /ENOENT/);

  const workflow = parseYaml(
    fs.readFileSync(path.join(root, ".github/workflows/ssh-management.yml"), "utf8"),
  );
  for (const script of [
    "scripts/plugin/validate-agent-plugin.mjs",
    "scripts/validation/test-local-mcp-projections.mjs",
    "scripts/plugin/package-claude-plugin.mjs",
    "scripts/plugin/package-openai-plugin.mjs",
  ]) {
    assert.equal(
      workflow.jobs.native.steps.filter((step) => step.run?.trim() === `node ${script}`).length,
      1,
      `${script} must occupy its own fail-fast CI step`,
    );
  }

  source.mcp = [{ ...membership[0], targets: ["claude"] }];
  fs.writeFileSync(sourcePath, JSON.stringify(source, null, 2) + "\n");
  syncPortableProjection({ root: repository });
  fs.appendFileSync(path.join(repository, "vendor/ssh-manager/runtime/mcp.mjs"), "tampered");
  const rejected = packageClaude(path.join(fixture, "tampered.zip"));
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /file digest mismatch/);
  assert.equal(fs.existsSync(path.join(fixture, "tampered.zip")), false);
  const rejectedArtifact = verifySupplyChain();
  assert.notEqual(rejectedArtifact.status, 0);
  assert.match(rejectedArtifact.stderr, /file digest mismatch/);
} finally {
  fs.rmSync(fixture, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

console.log("Local MCP projection schemas, target selection and archive modes passed.");
