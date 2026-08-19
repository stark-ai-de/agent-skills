import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { canonicalJson } from "../lib/bundle-contract.mjs";
import { PORTABLE_TARGET } from "../lib/plugin-projections.mjs";
import { renderMarketplace, validateMarketplaceDocument } from "../lib/openai-marketplace.mjs";
import {
  PLUGIN_SOURCE_PATH,
  PLUGIN_SOURCE_SCHEMA_PATH,
  pluginIdentity,
} from "../lib/release-descriptor.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const marketplaceValidator = path.join(repositoryRoot, "scripts/validate-openai-marketplace.mjs");
const committedMarketplacePath = path.join(
  repositoryRoot,
  ".agents",
  "plugins",
  "marketplace.json",
);

function hashFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function copyMarketplaceRoot(root) {
  fs.mkdirSync(path.join(root, "plugins"), { recursive: true, mode: 0o755 });
  fs.mkdirSync(path.join(root, ".agents", "plugins"), { recursive: true, mode: 0o755 });
  fs.copyFileSync(
    path.join(repositoryRoot, PLUGIN_SOURCE_PATH),
    path.join(root, PLUGIN_SOURCE_PATH),
  );
  fs.copyFileSync(
    path.join(repositoryRoot, PLUGIN_SOURCE_SCHEMA_PATH),
    path.join(root, PLUGIN_SOURCE_SCHEMA_PATH),
  );
  fs.cpSync(
    path.join(repositoryRoot, "scripts/vendor/snapshots"),
    path.join(root, "scripts/vendor/snapshots"),
    { recursive: true },
  );
  fs.cpSync(committedMarketplacePath, path.join(root, ".agents", "plugins", "marketplace.json"), {
    recursive: false,
  });
  fs.cpSync(path.join(repositoryRoot, PORTABLE_TARGET), path.join(root, PORTABLE_TARGET), {
    recursive: true,
  });
  fs.copyFileSync(path.join(repositoryRoot, "package.json"), path.join(root, "package.json"));
  fs.copyFileSync(path.join(repositoryRoot, ".node-version"), path.join(root, ".node-version"));
}

function runValidator(root, file = path.join(root, ".agents", "plugins", "marketplace.json")) {
  return spawnSync(process.execPath, [marketplaceValidator, "--root", root, "--file", file], {
    encoding: "utf8",
  });
}

const cleanClone = fs.mkdtempSync(path.join(os.tmpdir(), "stark-ai-clean-clone-"));
const personalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stark-ai-personal-marketplace-"));
const drifted = fs.mkdtempSync(path.join(os.tmpdir(), "stark-ai-marketplace-drift-"));
const fixtureOut = fs.mkdtempSync(path.join(os.tmpdir(), "openai-adapter-marketplace-"));
try {
  fs.mkdirSync(path.join(cleanClone, ".agents", "plugins"), { recursive: true });
  fs.mkdirSync(path.join(drifted, ".agents", "plugins"), { recursive: true });
  copyMarketplaceRoot(cleanClone);
  copyMarketplaceRoot(drifted);

  const cleanResult = runValidator(cleanClone);
  assert.equal(cleanResult.status, 0, cleanResult.stderr || cleanResult.stdout);

  const committedBefore = hashFile(committedMarketplacePath);
  const identity = pluginIdentity(repositoryRoot);
  copyMarketplaceRoot(personalRoot);
  fs.cpSync(path.join(repositoryRoot, PORTABLE_TARGET), path.join(personalRoot, "plugin"), {
    recursive: true,
  });
  const personalName = "stark-ai-developer-personal";
  const personalDisplayName = "stark AI Developer (personal portable plugin)";
  const personalMarketplacePath = path.join(personalRoot, "marketplace.json");
  const personalDocument = renderMarketplace({
    name: personalName,
    displayName: personalDisplayName,
    pluginName: identity.name,
    sourcePath: "./plugin",
  });
  assert.equal(personalDocument.plugins[0].policy.authentication, "ON_INSTALL");
  fs.writeFileSync(personalMarketplacePath, canonicalJson(personalDocument));
  const personalResult = validateMarketplaceDocument({
    root: personalRoot,
    file: personalMarketplacePath,
    expectedSource: "plugin",
    expectedName: personalName,
    expectedDisplayName: personalDisplayName,
    pluginName: identity.name,
  });
  assert.equal(personalResult.errors.length, 0, personalResult.errors.join("\n"));
  assert.equal(
    hashFile(committedMarketplacePath),
    committedBefore,
    "personal marketplace fixture must not mutate the committed marketplace",
  );

  const omittedAuth = structuredClone(personalDocument);
  delete omittedAuth.plugins[0].policy.authentication;
  fs.writeFileSync(personalMarketplacePath, canonicalJson(omittedAuth));
  const omittedAuthResult = validateMarketplaceDocument({
    root: personalRoot,
    file: personalMarketplacePath,
    expectedSource: "plugin",
    expectedName: personalName,
    expectedDisplayName: personalDisplayName,
    pluginName: identity.name,
  });
  assert.ok(
    omittedAuthResult.errors.some((error) => /authentication must be ON_INSTALL/.test(error)),
    omittedAuthResult.errors.join("\n"),
  );

  const noneAuth = structuredClone(personalDocument);
  noneAuth.plugins[0].policy.authentication = "NONE";
  fs.writeFileSync(personalMarketplacePath, canonicalJson(noneAuth));
  const noneAuthResult = validateMarketplaceDocument({
    root: personalRoot,
    file: personalMarketplacePath,
    expectedSource: "plugin",
    expectedName: personalName,
    expectedDisplayName: personalDisplayName,
    pluginName: identity.name,
  });
  assert.ok(
    noneAuthResult.errors.some((error) => /authentication must be ON_INSTALL/.test(error)),
    noneAuthResult.errors.join("\n"),
  );

  fs.writeFileSync(personalMarketplacePath, canonicalJson(personalDocument));

  fs.rmSync(path.join(drifted, "plugins", "stark-ai-developer"), { recursive: true, force: true });
  const driftResult = runValidator(drifted);
  assert.notEqual(
    driftResult.status,
    0,
    "missing portable plugin must fail marketplace validation",
  );

  const marketplacePath = path.join(cleanClone, ".agents", "plugins", "marketplace.json");
  const marketplace = JSON.parse(fs.readFileSync(marketplacePath, "utf8"));
  marketplace.plugins[0].source.path = "./adapters/openai/stark-ai-developer";
  fs.writeFileSync(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`);
  const wrongProjectionResult = runValidator(cleanClone);
  assert.notEqual(
    wrongProjectionResult.status,
    0,
    "OpenAI adapter source must not satisfy portable marketplace validation",
  );

  const generator = spawnSync(
    process.execPath,
    [
      path.join(repositoryRoot, "scripts/generate-openai-marketplace-fixture.mjs"),
      "--root",
      repositoryRoot,
      "--output",
      fixtureOut,
    ],
    { encoding: "utf8" },
  );
  assert.equal(generator.status, 0, generator.stderr || generator.stdout);
  assert.equal(
    fs.existsSync(path.join(repositoryRoot, "adapters")),
    false,
    "isolated OpenAI marketplace fixtures must not create adapters/",
  );
} finally {
  fs.rmSync(cleanClone, { recursive: true, force: true });
  fs.rmSync(personalRoot, { recursive: true, force: true });
  fs.rmSync(drifted, { recursive: true, force: true });
  fs.rmSync(fixtureOut, { recursive: true, force: true });
}

console.log(
  "Marketplace clean-clone and personal-path fixtures passed without home-directory writes.",
);
