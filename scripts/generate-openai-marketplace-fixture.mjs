#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { canonicalJson } from "./lib/bundle-contract.mjs";
import { renderMarketplace, validateMarketplaceDocument } from "./lib/openai-marketplace.mjs";
import { pluginIdentity } from "./lib/release-descriptor.mjs";
import { withOpenAiStage } from "./lib/openai-projection.mjs";

function parseArgs(argv) {
  const rootIndex = argv.indexOf("--root");
  const outputIndex = argv.indexOf("--output");
  const root = rootIndex === -1 ? process.cwd() : path.resolve(argv[rootIndex + 1]);
  return {
    root,
    output:
      outputIndex === -1
        ? fs.mkdtempSync(path.join(os.tmpdir(), "openai-marketplace-fixture-"))
        : path.resolve(argv[outputIndex + 1]),
  };
}

function hashFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

try {
  const { root, output } = parseArgs(process.argv.slice(2));
  const committedMarketplace = path.join(root, ".agents", "plugins", "marketplace.json");
  const before = hashFile(committedMarketplace);
  const identity = pluginIdentity(root);

  fs.mkdirSync(output, { recursive: true, mode: 0o755 });
  const pluginRoot = path.join(output, "plugin");
  withOpenAiStage(root, (staged) => {
    fs.cpSync(staged.stage, pluginRoot, { recursive: true });
  });
  const marketplace = renderMarketplace({
    name: "stark-ai-developer-openai-adapter-test",
    displayName: "stark AI Developer (isolated OpenAI adapter)",
    pluginName: identity.name,
    sourcePath: "./plugin",
  });
  const marketplacePath = path.join(output, "marketplace.json");
  fs.writeFileSync(marketplacePath, canonicalJson(marketplace));
  const { errors } = validateMarketplaceDocument({
    root: output,
    contractRoot: root,
    file: marketplacePath,
    expectedSource: "plugin",
    expectedName: "stark-ai-developer-openai-adapter-test",
    expectedDisplayName: "stark AI Developer (isolated OpenAI adapter)",
    pluginName: identity.name,
  });
  const after = hashFile(committedMarketplace);
  if (before !== after) {
    throw new Error(
      "[MKT-001] OpenAI adapter fixture generation mutated the committed marketplace",
    );
  }
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
  console.log(`Wrote isolated OpenAI marketplace fixture: ${output}`);
  console.log("Committed repository marketplace is unchanged.");
} catch (error) {
  console.error(`OpenAI marketplace fixture generation failed: ${error.message}`);
  process.exitCode = 1;
}
