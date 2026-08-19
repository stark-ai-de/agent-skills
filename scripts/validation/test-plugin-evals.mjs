import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { PLUGIN_SOURCE_PATH, PLUGIN_SOURCE_SCHEMA_PATH } from "../lib/release-descriptor.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const marketplaceValidator = path.join(repositoryRoot, "scripts/validate-openai-marketplace.mjs");

function copyMarketplaceRoot(root) {
  fs.mkdirSync(path.join(root, "plugins"), { recursive: true, mode: 0o755 });
  fs.copyFileSync(
    path.join(repositoryRoot, PLUGIN_SOURCE_PATH),
    path.join(root, PLUGIN_SOURCE_PATH),
  );
  fs.copyFileSync(
    path.join(repositoryRoot, PLUGIN_SOURCE_SCHEMA_PATH),
    path.join(root, PLUGIN_SOURCE_SCHEMA_PATH),
  );
  fs.cpSync(
    path.join(repositoryRoot, ".agents", "plugins", "marketplace.json"),
    path.join(root, ".agents", "plugins", "marketplace.json"),
    { recursive: false },
  );
  fs.cpSync(
    path.join(repositoryRoot, "plugins", "stark-ai-developer"),
    path.join(root, "plugins", "stark-ai-developer"),
    { recursive: true },
  );
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
  fs.mkdirSync(path.join(personalRoot, ".agents", "plugins"), { recursive: true });
  fs.mkdirSync(path.join(drifted, ".agents", "plugins"), { recursive: true });
  copyMarketplaceRoot(cleanClone);
  copyMarketplaceRoot(personalRoot);
  copyMarketplaceRoot(drifted);

  const cleanResult = runValidator(cleanClone);
  assert.equal(cleanResult.status, 0, cleanResult.stderr || cleanResult.stdout);

  const personalResult = runValidator(
    personalRoot,
    path.join(personalRoot, ".agents", "plugins", "marketplace.json"),
  );
  assert.equal(personalResult.status, 0, personalResult.stderr || personalResult.stdout);

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
