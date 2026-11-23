import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { unzipSync } from "fflate";
import {
  ADS_PLUGIN_SOURCE,
  buildAdsPluginEntries,
  packageAdsPlugin,
  validateAdsPluginArchive,
  validateAdsPluginSource,
} from "../plugin/package-ads-plugin.mjs";
import { encodeZipStoreV1 } from "../lib/reproducible-archive.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// A syntax-valid deployment fixture. No tests resolve this host or call the service.
const serverUrl = "https://ads-fixture.stark-ai.de/mcp";
const skillSource = "skills/engineering-workflows/openai-advertiser-api";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ads-plugin-contract-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const relative of [
    ADS_PLUGIN_SOURCE,
    "plugins/stark-ai-ads.source.schema.json",
    "plugins/assets/stark-ai-ads/logo.png",
    "plugins/assets/stark-ai-ads/logo-dark.png",
    "plugins/assets/stark-ai-ads/composer-icon.png",
    "plugins/assets/stark-ai-ads/composer-icon-dark.png",
    "LICENSE",
  ]) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(repositoryRoot, relative), target);
  }
  const skill = path.join(root, skillSource);
  fs.mkdirSync(path.join(skill, "agents"), { recursive: true });
  fs.mkdirSync(path.join(skill, "references"));
  fs.writeFileSync(
    path.join(skill, "SKILL.md"),
    "---\nname: openai-advertiser-api\ndescription: Inspect Ads data or apply authorized Ads changes.\n---\n\n# OpenAI Advertiser API\n\nUse the connected tools.\n",
  );
  fs.writeFileSync(
    path.join(skill, "agents/openai.yaml"),
    'interface:\n  display_name: "OpenAI Advertiser API"\n  short_description: "Inspect and manage OpenAI advertising"\n  default_prompt: "Use $openai-advertiser-api to inspect my Ads account."\npolicy:\n  products: [CHAT, CODEX]\n  allow_implicit_invocation: true\n',
  );
  fs.writeFileSync(
    path.join(skill, "references/example.md"),
    "# Example\n\nCanonical bytes stay unchanged.\n",
  );
  execFileSync("git", ["init", "--quiet", root]);
  execFileSync("git", ["-C", root, "add", "."]);
  return root;
}

test("source validation needs canonical ChatGPT metadata but no deployment URL", (t) => {
  const root = fixture(t);
  assert.deepEqual(validateAdsPluginSource(root).errors, []);
  const metadata = path.join(root, skillSource, "agents/openai.yaml");
  fs.writeFileSync(metadata, fs.readFileSync(metadata, "utf8").replace("[CHAT, CODEX]", "[CODEX]"));
  assert.match(validateAdsPluginSource(root).errors.join("\n"), /enable CHAT/);
  fs.rmSync(path.join(root, skillSource, "agents/openai.yaml"));
  assert.match(validateAdsPluginSource(root).errors.join("\n"), /openai.yaml/);
});

test("package copies canonical skill bytes and uses scoped public OAuth without secrets", (t) => {
  const root = fixture(t);
  const { entries } = buildAdsPluginEntries({ root, serverUrl, oauthClientId: "review-client" });
  const files = unzipSync(encodeZipStoreV1(entries));
  const manifest = JSON.parse(Buffer.from(files[".codex-plugin/plugin.json"]));
  assert.equal(manifest.name, "stark-ai-ads");
  assert.equal(manifest.version, "0.1.1");
  const source = JSON.parse(fs.readFileSync(path.join(root, ADS_PLUGIN_SOURCE), "utf8"));
  const submission = manifest.extensions["com.openai"];
  assert.deepEqual(submission.review, source.review);
  assert.deepEqual(submission.publication, source.publication);
  assert.equal(submission.review.test_cases.positive.length, 5);
  assert.equal(submission.review.test_cases.negative.length, 3);
  assert.equal(submission.review.test_credentials, undefined);
  assert.equal(submission.review.reviewer_instructions, undefined);
  assert.equal(submission.review.demo_recording_url, undefined);
  assert.equal(manifest.interface.displayName, "Ads API by stark AI");
  assert.equal(manifest.interface.shortDescription, "OpenAI Ads API integration");
  assert.equal(manifest.mcpServers, "./.mcp.json");
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.requires_local_executor, undefined);
  assert.equal(manifest.interface.privacyPolicyURL.includes("stark-ai-ads.md#privacy"), true);
  const mcp = JSON.parse(Buffer.from(files[".mcp.json"]));
  assert.deepEqual(Object.keys(mcp.mcpServers), ["openai-ads"]);
  const server = mcp.mcpServers["openai-ads"];
  assert.equal(server.url, serverUrl);
  assert.equal(server.headers, undefined);
  assert.deepEqual(server.extensions["com.openai"].auth, {
    type: "oauth",
    client: { mode: "provided", clientId: "review-client", tokenEndpointAuthMethod: "none" },
    authorizationServerBase: "https://ads-fixture.stark-ai.de",
    authorizationUrl: "https://ads-fixture.stark-ai.de/oauth/authorize",
    tokenUrl: "https://ads-fixture.stark-ai.de/oauth/token",
    resource: serverUrl,
    baseScopes: ["ads:read", "offline_access"],
    defaultScopes: ["ads:read", "ads:write", "offline_access"],
  });
  for (const relative of ["SKILL.md", "agents/openai.yaml", "references/example.md"])
    assert.deepEqual(
      Buffer.from(files[`skills/openai-advertiser-api/${relative}`]),
      fs.readFileSync(path.join(root, skillSource, relative)),
    );
  for (const [field, asset, source] of [
    ["logo", "logo.png", "logo.png"],
    ["logoDark", "logo-dark.png", "logo-dark.png"],
    ["composerIcon", "composer-icon.png", "composer-icon.png"],
    ["composerIconDark", "composer-icon-dark.png", "composer-icon-dark.png"],
  ]) {
    assert.equal(manifest.interface[field], `./assets/${asset}`);
    assert.deepEqual(
      Buffer.from(files[`assets/${asset}`]),
      fs.readFileSync(path.join(root, "plugins/assets/stark-ai-ads", source)),
    );
  }
  assert.equal(
    Object.keys(files).some((name) => /server|node_modules|\.env/.test(name)),
    false,
  );
  for (const [asset, size] of [
    ["logo.png", 512],
    ["logo-dark.png", 512],
    ["composer-icon.png", 128],
    ["composer-icon-dark.png", 128],
  ]) {
    const bytes = Buffer.from(files[`assets/${asset}`]);
    assert.equal(bytes.readUInt32BE(16), size);
    assert.equal(bytes.readUInt32BE(20), size);
  }
  assert.notDeepEqual(files["assets/logo.png"], files["assets/logo-dark.png"]);
  assert.notDeepEqual(files["assets/composer-icon.png"], files["assets/composer-icon-dark.png"]);
  const sourceManifest = JSON.parse(Buffer.from(files["SOURCE-MANIFEST.json"]));
  assert.equal(sourceManifest.deploymentVerified, false);
  assert.equal(sourceManifest.serverUrl, serverUrl);
  assert.equal(sourceManifest.archiveProfile, "zip-store-v1");
});

test("source validation rejects missing or invalid theme assets", (t) => {
  const root = fixture(t);
  fs.rmSync(path.join(root, "plugins/assets/stark-ai-ads/logo-dark.png"));
  assert.ok(validateAdsPluginSource(root).errors.length);
  fs.writeFileSync(path.join(root, "plugins/assets/stark-ai-ads/logo-dark.png"), "not a PNG");
  assert.match(validateAdsPluginSource(root).errors.join("\n"), /PNG/);
});

test("archive is reproducible and tampering fails an independently rebuilt comparison", (t) => {
  const root = fixture(t);
  const first = packageAdsPlugin({ root, serverUrl });
  const original = fs.readFileSync(first.output);
  assert.deepEqual(validateAdsPluginArchive({ root, serverUrl, archive: first.output }).errors, []);
  assert.ok(
    validateAdsPluginArchive({
      root,
      serverUrl,
      oauthClientId: "wrong-client",
      archive: first.output,
    }).errors.length,
  );
  const second = packageAdsPlugin({ root, serverUrl });
  assert.equal(first.sha256, second.sha256);
  assert.deepEqual(fs.readFileSync(second.output), original);
  const entries = buildAdsPluginEntries({ root, serverUrl }).entries;
  const changed = entries.map((entry) =>
    entry.path === "skills/openai-advertiser-api/SKILL.md"
      ? { ...entry, data: Buffer.from("tampered") }
      : entry,
  );
  fs.writeFileSync(first.output, encodeZipStoreV1(changed));
  assert.ok(validateAdsPluginArchive({ root, serverUrl, archive: first.output }).errors.length);
});

test("output cannot overwrite canonical inputs or follow symlinked directories", (t) => {
  const root = fixture(t);
  assert.throws(
    () => packageAdsPlugin({ root, serverUrl, output: path.join(root, "plugins/overwrite.zip") }),
    /escapes/,
  );
  const external = fs.mkdtempSync(path.join(os.tmpdir(), "ads-package-output-"));
  t.after(() => fs.rmSync(external, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "dist"));
  fs.symlinkSync(external, path.join(root, "dist/openai"), "dir");
  assert.throws(() => packageAdsPlugin({ root, serverUrl }), /symlink/);
  assert.equal(fs.readdirSync(external).length, 0);
});

test("missing, local, placeholder and credential-bearing server URLs are rejected", (t) => {
  const root = fixture(t);
  for (const invalid of [
    undefined,
    "http://ads.stark-ai.de/mcp",
    "https://localhost/mcp",
    "https://127.0.0.1/mcp",
    "https://10.1.1.1/mcp",
    "https://[::1]/mcp",
    "https://example.com/mcp",
    "https://ads.example.org/mcp",
    "https://ads.invalid/mcp",
    "https://user:password@ads.stark-ai.de/mcp",
    "https://ads.stark-ai.de/mcp?key=x",
    "https://ads.stark-ai.de/mcp#fragment",
    "https://ads.stark-ai.de/proxy/mcp",
    "https://ads.stark-ai.de/mcp/",
  ])
    assert.throws(
      () => buildAdsPluginEntries({ root, serverUrl: invalid }),
      /server|HTTPS|MCP|public|placeholder/,
    );
  assert.throws(() => buildAdsPluginEntries({ root, serverUrl, oauthClientId: "" }), /client/i);
});

test("untracked skill files and symlinks cannot enter a distribution", (t) => {
  const root = fixture(t);
  const secret = path.join(root, skillSource, "credentials.txt");
  fs.writeFileSync(secret, "synthetic-secret");
  assert.throws(() => buildAdsPluginEntries({ root, serverUrl }), /untracked|ignored/);
  fs.rmSync(secret);
  const ref = path.join(root, skillSource, "references/example.md");
  fs.rmSync(ref);
  fs.symlinkSync(path.join(root, "LICENSE"), ref);
  assert.throws(() => buildAdsPluginEntries({ root, serverUrl }), /symlink/);
});

test("source rejects extra credentials and source path traversal", (t) => {
  const root = fixture(t);
  const sourcePath = path.join(root, ADS_PLUGIN_SOURCE);
  const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  source.clientSecret = "synthetic-secret";
  fs.writeFileSync(sourcePath, JSON.stringify(source));
  assert.match(validateAdsPluginSource(root).errors.join("\n"), /additional properties/);
  delete source.clientSecret;
  source.skill.source = "../outside";
  fs.writeFileSync(sourcePath, JSON.stringify(source));
  assert.ok(validateAdsPluginSource(root).errors.length);
});

test("review metadata requires the exact cases and excludes private reviewer credentials", (t) => {
  const root = fixture(t);
  const file = path.join(root, ADS_PLUGIN_SOURCE);
  const original = JSON.parse(fs.readFileSync(file, "utf8"));
  const broken = structuredClone(original);
  broken.review.test_cases.positive.pop();
  fs.writeFileSync(file, JSON.stringify(broken));
  assert.ok(validateAdsPluginSource(root).errors.length);
  const withCredentials = structuredClone(original);
  withCredentials.review.test_credentials = "synthetic-secret";
  fs.writeFileSync(file, JSON.stringify(withCredentials));
  assert.match(validateAdsPluginSource(root).errors.join("\n"), /additional properties/);
});

test("CLI source validation is offline and packaging refuses missing deployment input", (t) => {
  const root = fixture(t);
  const validate = spawnSync(
    process.execPath,
    [path.join(repositoryRoot, "scripts/plugin/validate-ads-plugin.mjs"), "--root", root],
    { encoding: "utf8" },
  );
  assert.equal(validate.status, 0, validate.stderr);
  assert.match(validate.stdout, /source.*valid/i);
  const pack = spawnSync(
    process.execPath,
    [path.join(repositoryRoot, "scripts/plugin/package-ads-plugin.mjs"), "--root", root],
    { encoding: "utf8" },
  );
  assert.notEqual(pack.status, 0);
  assert.match(pack.stderr, /server-url/);
  assert.equal(fs.existsSync(path.join(root, "dist")), false);
  const unknown = spawnSync(
    process.execPath,
    [path.join(repositoryRoot, "scripts/plugin/package-ads-plugin.mjs"), "--secret", "synthetic"],
    { encoding: "utf8" },
  );
  assert.notEqual(unknown.status, 0);
  assert.equal(unknown.stderr.includes("synthetic"), false);
});
