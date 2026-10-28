import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";

import { archiveIdentityErrors } from "../lib/archive-identity.mjs";
import { hashBytes } from "../lib/bundle-contract.mjs";
import { validateContractSnapshots } from "../lib/contract-snapshots.mjs";
import {
  validateClaudeArchive,
  validateClaudeProjection,
  withClaudeStage,
} from "../lib/claude-projection.mjs";
import { withOpenAiStage } from "../lib/openai-projection.mjs";
import {
  createDirectoryArchive,
  enumerateTree,
  packageTreeHash,
  PORTABLE_TARGET,
  syncPortableProjection,
  validatePortableMcpConfiguration,
  validatePortableProjection,
} from "../lib/plugin-projections.mjs";
import {
  PLUGIN_SOURCE_PATH,
  PINNED_AGENT_PLUGINS_MCP_SCHEMA_PATH,
} from "../lib/release-descriptor.mjs";
import { encodeZipStoreV1 } from "../lib/reproducible-archive.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-projection-contract-"));
const root = path.join(temporary, "source");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
function run(script, args) {
  return spawnSync(process.execPath, [path.join(repositoryRoot, script), ...args], {
    encoding: "utf8",
  });
}
function assertPass(result) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
}
function zipModes(bytes) {
  const end = bytes.length - 22;
  assert.equal(bytes.readUInt32LE(end), 0x06054b50);
  const count = bytes.readUInt16LE(end + 10);
  let offset = bytes.readUInt32LE(end + 16);
  const modes = new Map();
  for (let index = 0; index < count; index++) {
    assert.equal(bytes.readUInt32LE(offset), 0x02014b50);
    const length = bytes.readUInt16LE(offset + 28);
    const name = bytes.subarray(offset + 46, offset + 46 + length).toString();
    modes.set(name, (bytes.readUInt32LE(offset + 38) >>> 16) & 0o777);
    offset += 46 + length + bytes.readUInt16LE(offset + 30) + bytes.readUInt16LE(offset + 32);
  }
  return modes;
}

try {
  assertPass(
    spawnSync(
      "git",
      [
        "clone",
        "--config",
        "core.longpaths=true",
        "--local",
        "--no-hardlinks",
        "--quiet",
        repositoryRoot,
        root,
      ],
      {
        encoding: "utf8",
      },
    ),
  );
  // Overlay the current candidate contract, including a new schema before it is
  // committed. The user's index is never changed by this disposable fixture.
  for (const relative of [
    PLUGIN_SOURCE_PATH,
    "plugins/stark-ai-developer.source.schema.json",
    "package.json",
    "docs/listing/openai/stark-ai-developer.json",
    "docs/assets/chatgpt-plugin-badge.svg",
  ]) {
    fs.copyFileSync(path.join(repositoryRoot, relative), path.join(root, relative));
  }
  fs.cpSync(path.join(repositoryRoot, "scripts/vendor"), path.join(root, "scripts/vendor"), {
    recursive: true,
  });
  const original = readJson(path.join(root, PLUGIN_SOURCE_PATH));
  const runtimeEntry = original.mcp[0];
  const portable = path.join(root, PORTABLE_TARGET);
  fs.rmSync(portable, { recursive: true, force: true });

  for (const targets of [["portable", "claude"], ["portable"], ["claude"], [], null]) {
    const source = structuredClone(original);
    if (targets === null) delete source.mcp;
    else source.mcp = targets.length ? [{ ...runtimeEntry, targets }] : [];
    writeJson(path.join(root, PLUGIN_SOURCE_PATH), source);
    const hasPortable = targets?.includes("portable") ?? false;
    const hasClaude = targets?.includes("claude") ?? false;

    // Both supply-chain validation and Claude packaging must work before any
    // portable output exists, regardless of target membership.
    assert.equal(fs.existsSync(portable), false);
    assertPass(run("scripts/release/verify-supply-chain.mjs", ["--root", root]));
    const archive = path.join(temporary, "claude.zip");
    assertPass(
      run("scripts/plugin/package-claude-plugin.mjs", ["--root", root, "--output", archive]),
    );
    assertPass(
      run("scripts/plugin/validate-claude-plugin.mjs", ["--root", root, "--archive", archive]),
    );
    const files = unzipSync(fs.readFileSync(archive));
    assert.equal(Object.hasOwn(files, "runtime/mcp.mjs"), hasClaude);
    assert.equal(Object.hasOwn(files, ".mcp.json"), hasClaude);
    const manifest = JSON.parse(Buffer.from(files[".claude-plugin/plugin.json"]));
    assert.equal(Object.hasOwn(manifest, "mcpServers"), false);
    assert.equal(manifest.description.includes("SSH management"), hasClaude);
    const provenance = JSON.parse(Buffer.from(files["SOURCE-MANIFEST.json"]));
    assert.equal(provenance.mcp.length, Number(hasClaude));
    assert.equal(provenance.bundle.mcp.length, Number(hasClaude));
    assert.equal(provenance.archiveProfile, "zip-store-v1");
    assert.equal(provenance.treeHash, packageTreeHash(provenance.files));
    assert.deepEqual(
      provenance.files.map((entry) => entry.path).sort(),
      Object.keys(files)
        .filter((name) => name !== "SOURCE-MANIFEST.json")
        .sort(),
    );
    for (const file of provenance.files) {
      assert.equal(file.sha256, hashBytes(files[file.path]), file.path);
      assert.equal(file.byteLength, files[file.path].length, file.path);
      assert.ok(["0644", "0755"].includes(file.mode));
    }
    if (hasClaude) {
      const mcp = JSON.parse(Buffer.from(files[".mcp.json"]));
      assert.deepEqual(mcp, {
        mcpServers: {
          "ssh-management": {
            command: "node",
            args: ["${CLAUDE_PLUGIN_ROOT}/runtime/mcp.mjs"],
          },
        },
      });
    }
    syncPortableProjection({ root });
    assert.deepEqual(validatePortableProjection({ root }).errors, []);
    assert.equal(fs.existsSync(path.join(portable, "runtime")), hasPortable);
    assert.equal(fs.existsSync(path.join(portable, "mcp.json")), hasPortable);
    withOpenAiStage(root, ({ stage, listing }) => {
      for (const forbidden of ["runtime", "mcp.json"]) {
        assert.equal(fs.existsSync(path.join(stage, forbidden)), false);
      }
      assert.deepEqual(readJson(path.join(stage, "SOURCE-MANIFEST.json")).bundle.mcp, []);
      const openai = readJson(path.join(stage, ".codex-plugin/plugin.json"));
      const hasMetadata = listing.submissionProfile.transport !== "none";
      assert.equal(Object.hasOwn(openai, "mcpServers"), hasMetadata);
      assert.equal(fs.existsSync(path.join(stage, ".mcp.json")), hasMetadata);
      if (hasMetadata) {
        assert.deepEqual(Object.keys(readJson(path.join(stage, ".mcp.json")).mcpServers), [
          "skill-metadata",
        ]);
      }
    });
    fs.rmSync(portable, { recursive: true, force: true });
  }

  writeJson(path.join(root, PLUGIN_SOURCE_PATH), original);
  syncPortableProjection({ root });
  const configPath = path.join(portable, "mcp.json");
  const configuration = readJson(configPath);
  const mutations = [
    (value) => {
      delete value.$schema;
    },
    (value) => {
      value.$schema = "https://example.invalid/schema";
    },
    (value) => {
      delete value.mcpServers;
    },
    (value) => {
      delete value.mcpServers["ssh-management"].type;
    },
    (value) => {
      value.mcpServers["ssh-management"].type = "http";
    },
    (value) => {
      value.mcpServers["ssh-management"].type = "sse";
    },
    (value) => {
      delete value.mcpServers["ssh-management"].command;
    },
  ];
  for (const mutate of mutations) {
    const invalid = structuredClone(configuration);
    mutate(invalid);
    assert.ok(
      validatePortableMcpConfiguration(root, invalid).length,
      "independent schema must reject invalid configuration",
    );
    writeJson(configPath, invalid);
    assert.ok(
      validatePortableProjection({ root }).errors.some((error) => error.startsWith("mcp.json")),
      "actual mcp.json must fail schema validation, independently of drift",
    );
  }
  writeJson(configPath, configuration);

  for (const kind of ["portable", "claude"]) {
    const checkRuntimeMutations = (stage) => {
      const validate = () =>
        kind === "portable"
          ? validatePortableProjection({ root }).errors
          : validateClaudeProjection({ root, targetRoot: stage }).errors;
      const runtime = path.join(stage, "runtime");
      const payload = path.join(runtime, "mcp.mjs");
      const bytes = fs.readFileSync(payload);
      for (const mutate of [
        () => fs.appendFileSync(payload, "\n// tampered\n"),
        () => fs.rmSync(payload),
        () => fs.writeFileSync(path.join(runtime, "unexpected.txt"), "extra"),
      ]) {
        mutate();
        assert.ok(validate().some((error) => /SSH runtime artifact/.test(error)));
        fs.writeFileSync(payload, bytes);
        fs.rmSync(path.join(runtime, "unexpected.txt"), { force: true });
      }
      assert.deepEqual(validate(), []);
    };
    if (kind === "portable") checkRuntimeMutations(portable);
    else withClaudeStage(root, ({ stage }) => checkRuntimeMutations(stage));
  }

  const archive = path.join(temporary, "claude.zip");
  withClaudeStage(root, ({ stage }) => {
    createDirectoryArchive({ sourceRoot: stage, output: archive });
    const originalZip = fs.readFileSync(archive);
    const modes = zipModes(originalZip);
    const executables = [
      "probe-drawio-toolset.mjs",
      "render-drawio.mjs",
      "search-shapes.mjs",
      "validate_drawio.py",
    ].map((name) => `skills/drawio-diagrams/scripts/${name}`);
    for (const executable of executables) assert.equal(modes.get(executable), 0o755, executable);
    for (const [name, mode] of modes)
      assert.equal(mode, executables.includes(name) ? 0o755 : 0o644, name);
    for (const file of enumerateTree(stage)) fs.chmodSync(file.absolute, 0o644);
    createDirectoryArchive({ sourceRoot: stage, output: archive });
    assert.deepEqual(
      fs.readFileSync(archive),
      originalZip,
      "filesystem mode loss must not change ZIP identity",
    );
    // Also lose modes on canonical files; Git remains the authority at stage time.
    for (const name of executables)
      fs.chmodSync(
        path.join(
          root,
          name.replace("skills/drawio-diagrams/", "skills/engineering-workflows/drawio-diagrams/"),
        ),
        0o644,
      );
    withClaudeStage(root, ({ stage: fresh }) => {
      createDirectoryArchive({ sourceRoot: fresh, output: archive });
      assert.deepEqual(fs.readFileSync(archive), originalZip);
    });
    const files = unzipSync(originalZip);
    const entries = Object.entries(files).map(([name, data]) => ({
      path: name,
      data,
      mode: modes.get(name),
    }));
    for (const mutated of [
      entries.filter((entry) => entry.path !== "LICENSE"),
      [...entries, { path: "extra.txt", data: Buffer.from("extra"), mode: 0o644 }],
      entries.map((entry) =>
        entry.path === "LICENSE" ? { ...entry, data: Buffer.from("tampered") } : entry,
      ),
      entries.map((entry) => ({ ...entry, mode: 0o644 })),
    ]) {
      fs.writeFileSync(archive, encodeZipStoreV1(mutated));
      assert.ok(
        validateClaudeArchive({ root, archive }).errors.length,
        "archive changes must fail offline validation",
      );
    }
    fs.writeFileSync(archive, originalZip);
    assert.deepEqual(validateClaudeArchive({ root, archive }).errors, []);
  });

  assert.deepEqual(validateContractSnapshots(root), []);
  fs.appendFileSync(path.join(root, PINNED_AGENT_PLUGINS_MCP_SCHEMA_PATH), "\n");
  assert.ok(validateContractSnapshots(root).some((error) => /MCP schema checksum/.test(error)));
  fs.rmSync(path.join(root, PINNED_AGENT_PLUGINS_MCP_SCHEMA_PATH));
  assert.ok(validateContractSnapshots(root).some((error) => /mcp.schema.json/.test(error)));

  const reports = ["linux", "darwin", "win32"].map((os) => ({
    os,
    report: {
      os,
      archiveProfile: "zip-store-v1",
      archives: Object.fromEntries(
        ["portable", "openai", "openaiSkillsOnly", "claude"].map((name) => [
          name,
          { sha256: "a".repeat(64), bytes: 100 },
        ]),
      ),
    },
  }));
  assert.deepEqual(archiveIdentityErrors(reports), []);
  const missingAll = structuredClone(reports);
  for (const item of missingAll) delete item.report.archives.claude;
  assert.ok(archiveIdentityErrors(missingAll).some((error) => /claude/.test(error)));
  const missingOne = structuredClone(reports);
  delete missingOne[0].report.archives.claude;
  assert.ok(archiveIdentityErrors(missingOne).some((error) => /claude/.test(error)));
  const divergent = structuredClone(reports);
  divergent[2].report.archives.claude.sha256 = "b".repeat(64);
  assert.ok(archiveIdentityErrors(divergent).some((error) => /claude/.test(error)));
  assert.ok(archiveIdentityErrors(reports.slice(0, 2)).some((error) => /win32/.test(error)));
  assert.ok(archiveIdentityErrors([]).length);
  console.log(
    "MCP schema, target matrix, Claude archive integrity/modes and platform identity contracts passed.",
  );
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
