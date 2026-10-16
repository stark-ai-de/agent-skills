import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";
import {
  withOpenAiStage,
  validateOpenAiProjection,
} from "../../../scripts/lib/openai-projection.mjs";
import { createDirectoryArchive } from "../../../scripts/lib/plugin-projections.mjs";
import { buildOpenAiReleasePlan } from "../../../scripts/release/reconcile-openai-plugin-issue.mjs";
import { listingForOpenAiIdentity } from "../../../scripts/lib/openai-profiles.mjs";
import { selectOpenAiReleaseRoute } from "../../../scripts/lib/openai-release-handoff.mjs";
import { validatePluginManifest } from "../src/core.mjs";
import { openAiIdentityFromSource } from "../../../scripts/lib/listing-identity.mjs";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const source = JSON.parse(
  fs.readFileSync(path.join(root, "plugins/stark-ai-developer.source.json")),
);
test("fallback requires route restrictions and preserves pending reviews and repair work", () => {
  assert.equal(selectOpenAiReleaseRoute().status, "verify");
  assert.equal(selectOpenAiReleaseRoute({ skillsOnlyUpdate: "confirmed" }).route, "A0");
  assert.equal(
    selectOpenAiReleaseRoute({ skillsOnlyUpdate: "unavailable", existingMigration: "confirmed" })
      .route,
    "A1",
  );
  assert.equal(selectOpenAiReleaseRoute({ skillsOnlyUpdate: "unavailable" }).route, "B");
  assert.equal(
    selectOpenAiReleaseRoute({
      skillsOnlyUpdate: "unavailable",
      newRemote: "unavailable",
      desktopPartner: "confirmed",
    }).route,
    "C",
  );
  assert.equal(
    selectOpenAiReleaseRoute({ skillsOnlyUpdate: "unavailable", newRemote: "unavailable" }).route,
    "D",
  );
  for (const status of ["in-review", "published", "repair-required"])
    assert.equal(
      selectOpenAiReleaseRoute({
        activeRoute: "B",
        activeStatus: status,
        skillsOnlyUpdate: "confirmed",
      }).route,
      "B",
    );
  assert.equal(
    selectOpenAiReleaseRoute({
      activeRoute: "B",
      activeStatus: "route-unavailable",
      unavailabilityKind: "product-review",
    }).status,
    "repair-required",
  );
  assert.equal(
    selectOpenAiReleaseRoute({
      activeRoute: "B",
      activeStatus: "route-unavailable",
      unavailabilityKind: "route-specific",
      desktopPartner: "confirmed",
    }).route,
    "C",
  );
  assert.equal(
    selectOpenAiReleaseRoute({
      activeRoute: "C",
      activeStatus: "route-unavailable",
      unavailabilityKind: "route-specific",
    }).route,
    "D",
  );
});
test("new remote ZIP carries one real MCP, unchanged skills, provenance and reproducible bytes", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "metadata-profile-"));
  try {
    const build = () =>
      withOpenAiStage(
        root,
        (staged) => {
          assert.deepEqual(
            validateOpenAiProjection({
              root,
              targetRoot: staged.stage,
              bundle: staged.bundle,
              listing: staged.listing,
            }).errors,
            [],
          );
          const manifest = JSON.parse(
            fs.readFileSync(path.join(staged.stage, ".codex-plugin/plugin.json")),
          );
          assert.equal(
            validatePluginManifest({
              manifest_json: JSON.stringify(manifest),
              format: "openai-native",
            }).valid,
            true,
          );
          assert.equal(manifest.name, "stark-ai-developer-tools");
          assert.equal(manifest.version, "1.0.0");
          assert.equal(manifest.mcpServers, "./.mcp.json");
          const config = JSON.parse(fs.readFileSync(path.join(staged.stage, ".mcp.json")));
          assert.deepEqual(config, {
            mcpServers: { "skill-metadata": { url: "https://skills-mcp.stark-ai.de/mcp" } },
          });
          for (const entry of staged.bundle.skills)
            assert.deepEqual(
              fs.readFileSync(path.join(staged.stage, "skills", entry.name, "agents/openai.yaml")),
              fs.readFileSync(path.join(root, entry.source, "agents/openai.yaml")),
            );
          assert.equal(fs.existsSync(path.join(staged.stage, "runtime")), false);
          assert.equal(fs.existsSync(path.join(staged.stage, "server")), false);
          const provenance = JSON.parse(
            fs.readFileSync(path.join(staged.stage, "SOURCE-MANIFEST.json")),
          );
          assert.equal(provenance.openaiProfile.profile, "new-remote");
          assert.ok(provenance.files.some((f) => f.path === ".mcp.json"));
          return createDirectoryArchive({
            sourceRoot: staged.stage,
            output: path.join(temp, "candidate.zip"),
            archiveRoot: "",
          }).sha256;
        },
        { profile: "new-remote" },
      );
    assert.equal(build(), build());
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
test("legacy target remains skills-only and identity selection has one canonical owner", () => {
  assert.equal(openAiIdentityFromSource(source, "existing-remote").pluginId, source.pluginId);
  assert.equal(openAiIdentityFromSource(source, "existing-remote").version, "2.0.0");
  assert.throws(() => openAiIdentityFromSource(source, "invalid"));
  withOpenAiStage(
    root,
    (staged) => {
      assert.equal(fs.existsSync(path.join(staged.stage, ".mcp.json")), false);
      const manifest = JSON.parse(
        fs.readFileSync(path.join(staged.stage, ".codex-plugin/plugin.json")),
      );
      assert.equal(manifest.name, source.pluginId);
      assert.equal(manifest.mcpServers, undefined);
    },
    { profile: "existing-skills-only" },
  );
});
test("desktop candidate contains a self-contained validator and notices, not SSH", () => {
  const built = spawnSync(process.execPath, ["build.mjs", "stdio"], {
    cwd: path.join(root, "packages/skill-metadata-mcp"),
    encoding: "utf8",
  });
  assert.equal(built.status, 0, built.stderr || built.stdout);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "metadata desktop "));
  try {
    withOpenAiStage(
      root,
      (staged) => {
        assert.deepEqual(
          validateOpenAiProjection({
            root,
            targetRoot: staged.stage,
            bundle: staged.bundle,
            listing: staged.listing,
          }).errors,
          [],
        );
        const manifest = JSON.parse(
          fs.readFileSync(path.join(staged.stage, ".codex-plugin/plugin.json")),
        );
        assert.equal(manifest.name, "stark-ai-developer-desktop");
        assert.equal(manifest.requires_local_executor, true);
        assert.ok(
          fs
            .readFileSync(path.join(staged.stage, "server/dist/THIRD-PARTY-NOTICES.txt"), "utf8")
            .includes("@modelcontextprotocol/server@"),
        );
        assert.equal(fs.existsSync(path.join(staged.stage, "runtime")), false);
        const archive = createDirectoryArchive({
          sourceRoot: staged.stage,
          output: path.join(temp, "desktop.zip"),
          archiveRoot: "",
        });
        const files = unzipSync(fs.readFileSync(archive.output));
        fs.mkdirSync(path.join(temp, "server/dist"), { recursive: true });
        fs.writeFileSync(path.join(temp, "server/dist/index.mjs"), files["server/dist/index.mjs"]);
        // No workspace node_modules is available from this isolated install directory.
        const input =
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
              protocolVersion: "2025-06-18",
              capabilities: {},
              clientInfo: { name: "offline-install", version: "1" },
            },
          }) + "\n";
        const result = spawnSync(process.execPath, [path.join(temp, "server/dist/index.mjs")], {
          cwd: temp,
          input,
          encoding: "utf8",
          timeout: 5000,
        });
        assert.equal(result.status, 0, result.stderr);
        assert.ok(
          result.stdout
            .split("\n")
            .filter(Boolean)
            .some(
              (line) => JSON.parse(line).result?.serverInfo.name === "stark-ai-metadata-validator",
            ),
        );
      },
      { profile: "desktop-local" },
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("a new OpenAI identity receives its own version and release issue marker", () => {
  const profile = openAiIdentityFromSource(source, "new-remote");
  const listing = listingForOpenAiIdentity(
    JSON.parse(fs.readFileSync(path.join(root, "docs/listing/openai/stark-ai-developer.json"))),
    profile,
  );
  const plan = buildOpenAiReleasePlan({
    repository: "stark-ai-de/agent-skills",
    tag: "v0.29.0",
    releaseSha: "a".repeat(40),
    release: {
      assets: [
        {
          name: "openai.zip",
          browser_download_url:
            "https://github.com/stark-ai-de/agent-skills/releases/download/v0.29.0/openai.zip",
        },
      ],
    },
    listing,
    subject: {
      pluginVersion: source.version,
      openaiProfile: profile,
      subjects: { openai: { sha256: "b".repeat(64) } },
    },
    previousRelease: { tag_name: "v0.28.0" },
    previousSubject: { pluginVersion: "1.15.0" },
    issues: [],
  });
  assert.equal(plan.status, "create");
  assert.equal(plan.pluginVersion, "1.0.0");
  assert.ok(plan.marker.includes("stark-ai-developer-tools@1.0.0"));
  assert.ok(plan.body.includes("new-remote"));
  assert.ok(!plan.body.includes("- ChatGPT plugin: https://chatgpt.com/"));
});
test("route selection CLI is read-only and requires no portal credentials", () => {
  const result = spawnSync(
    process.execPath,
    [path.join(root, "scripts/release/manage-release.mjs"), "openai-route"],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).route, "A0");
});

test("HTTP builds serve exact static challenge bytes and remove cached tokens", () => {
  const packageRoot = path.join(root, "packages/skill-metadata-mcp");
  const env = { ...process.env };
  delete env.OPENAI_APPS_CHALLENGE;
  const token = "synthetic-qualification-token\n";
  const build = (buildEnv) => {
    const result = spawnSync(process.execPath, [path.join(packageRoot, "build.mjs"), "http"], {
      cwd: packageRoot,
      env: buildEnv,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
  };
  try {
    build({ ...env, OPENAI_APPS_CHALLENGE: token });
    assert.equal(
      fs.readFileSync(path.join(packageRoot, "public/.well-known/openai-apps-challenge"), "utf8"),
      token,
    );
    const config = JSON.parse(fs.readFileSync(path.join(packageRoot, "vercel.json")));
    assert.equal(
      config.rewrites.some((route) => route.source.startsWith("/.well-known")),
      false,
    );
    assert.equal(config.outputDirectory, "public");
    build(env);
    assert.equal(
      fs.existsSync(path.join(packageRoot, "public/.well-known/openai-apps-challenge")),
      false,
    );
  } finally {
    fs.rmSync(path.join(packageRoot, "public/.well-known/openai-apps-challenge"), { force: true });
  }
});
test(
  "isolated desktop release rebuilds both bundles and preserves both identities",
  { timeout: 60000 },
  () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "metadata-isolated-release-"));
    const checkout = path.join(temp, "checkout");
    fs.mkdirSync(checkout);
    try {
      const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
        .split("\0")
        .filter(Boolean);
      for (const relative of tracked) {
        const from = path.join(root, relative),
          to = path.join(checkout, relative);
        fs.mkdirSync(path.dirname(to), { recursive: true });
        if (fs.lstatSync(from).isSymbolicLink()) fs.symlinkSync(fs.readlinkSync(from), to);
        else fs.copyFileSync(from, to);
      }
      const sourcePath = path.join(checkout, "plugins/stark-ai-developer.source.json");
      const fixtureSource = JSON.parse(fs.readFileSync(sourcePath));
      fixtureSource.openai.activeProfile = "desktop-local";
      fixtureSource.distributions.openaiPlugin = "stark-ai-developer-desktop";
      fixtureSource.outputs.openaiArchive = "dist/openai/stark-ai-developer-desktop-1.0.0.zip";
      fs.writeFileSync(sourcePath, JSON.stringify(fixtureSource, null, 2) + "\n");
      const git = (args) => execFileSync("git", args, { cwd: checkout, stdio: "pipe" });
      git(["init", "--quiet"]);
      git(["add", "."]);
      git([
        "-c",
        "user.name=Fixture",
        "-c",
        "user.email=fixture@example.test",
        "commit",
        "--quiet",
        "-m",
        "isolated fixture",
      ]);
      for (const relative of ["node_modules", "packages/skill-metadata-mcp/node_modules"])
        fs.symlinkSync(
          path.join(root, relative),
          path.join(checkout, relative),
          process.platform === "win32" ? "junction" : "dir",
        );
      assert.equal(fs.existsSync(path.join(checkout, "packages/skill-metadata-mcp/dist")), false);
      const evidencePath = path.join(temp, "evidence.json");
      const subjects = path.join(temp, "subjects");
      const result = spawnSync(
        process.execPath,
        [
          path.join(checkout, "scripts/release/verify-release-reproducibility.mjs"),
          "--evidence",
          evidencePath,
          "--subjects-dir",
          subjects,
        ],
        { cwd: checkout, encoding: "utf8", timeout: 50000 },
      );
      assert.equal(result.status, 0, result.stderr + result.stdout);
      const evidence = JSON.parse(fs.readFileSync(evidencePath));
      assert.equal(evidence.reproducibility.byteIdentical, true);
      assert.equal(evidence.package.version, fixtureSource.version);
      assert.deepEqual(evidence.projections.openai.package, {
        name: "stark-ai-developer-desktop",
        version: "1.0.0",
      });
      const files = unzipSync(fs.readFileSync(path.join(subjects, "openai.zip")));
      const manifest = JSON.parse(Buffer.from(files[".codex-plugin/plugin.json"]));
      assert.equal(manifest.name, evidence.projections.openai.package.name);
      assert.equal(manifest.version, evidence.projections.openai.package.version);
      const install = path.join(temp, "install");
      fs.mkdirSync(install);
      const bundle = path.join(install, "index.mjs");
      fs.writeFileSync(bundle, files["server/dist/index.mjs"]);
      const input =
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "isolated-release", version: "1.0.0" },
          },
        }) + "\n";
      const offline = spawnSync(process.execPath, [bundle], {
        cwd: install,
        input,
        encoding: "utf8",
        timeout: 5000,
      });
      assert.equal(offline.status, 0, offline.stderr);
      assert.match(offline.stdout, /stark-ai-metadata-validator/);
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  },
);
