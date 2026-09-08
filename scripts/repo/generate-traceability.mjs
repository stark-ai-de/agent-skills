#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { canonicalJson } from "../lib/bundle-contract.mjs";

const TRACEABILITY_PATH = "docs/listing/openai/requirement-traceability.json";

const REQUIREMENTS = [
  {
    id: "FOUND-001",
    contract: "Normative authorities, approved decisions, release descriptor",
    commands: ["validate:release-descriptor", "validate:contract-snapshots"],
  },
  {
    id: "BND-001",
    contract: "Explicit ordered bundle and canonical source resolution",
    commands: ["validate:bundles"],
  },
  {
    id: "PORT-001",
    contract: "Portable Agent Plugins projection",
    commands: ["validate:agent-plugin", "validate:projections"],
  },
  {
    id: "OAI-001",
    contract: "OpenAI adapter and skills-only manifest",
    commands: ["validate:openai-plugin", "validate:openai-submission"],
  },
  {
    id: "META-001",
    contract: "Canonical agents/openai.yaml and routing",
    commands: ["validate:openai-plugin", "validate:openai-listing", "validate:plugin-evals"],
  },
  {
    id: "MKT-001",
    contract: "Portable repository marketplace and isolated adapter fixture",
    commands: ["validate:openai-marketplace", "generate:openai-marketplace-fixture"],
  },
  {
    id: "REL-001",
    contract: "Version, archive name, toolchain, and evidence derivation",
    commands: ["validate:release-descriptor", "generate:release-evidence"],
  },
  {
    id: "REP-001",
    contract: "zip-store-v1 deterministic build",
    commands: ["verify:release-reproducibility", "validate:archives"],
  },
  {
    id: "SEC-001",
    contract: "Secret, path, endpoint, dependency, license, and provenance gates",
    commands: ["verify:supply-chain", "validate:network-endpoints"],
  },
  {
    id: "PUB-001",
    contract: "Legal, publisher, portal review, explicit publication",
    commands: ["generate:openai-worksheet", "validate:openai-worksheet"],
  },
  {
    id: "DIR-001",
    contract:
      "Live ChatGPT directory identity versus listing JSON, skill interface, and skills-only invariants",
    commands: ["verify:openai-directory"],
  },
  {
    id: "DIR-002",
    contract:
      "Live ChatGPT category catalog membership versus listing plugin id, display name, ENABLED status, and AVAILABLE installation policy",
    commands: ["verify:openai-directory"],
  },
];

const rootIndex = process.argv.indexOf("--root");
const check = process.argv.includes("--check");
const root = path.resolve(rootIndex === -1 ? process.cwd() : process.argv[rootIndex + 1]);
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const errors = [];

for (const requirement of REQUIREMENTS) {
  for (const command of requirement.commands) {
    if (!packageJson.scripts?.[command]) {
      errors.push(`[FOUND-001] missing npm script ${command} for ${requirement.id}`);
    }
  }
}

const document = {
  schemaVersion: 1,
  source: "docs/specs/stark-ai-developer-agent-plugin-spec.md",
  requirements: REQUIREMENTS,
};

const outputPath = path.join(root, TRACEABILITY_PATH);
const serialized = canonicalJson(document);
if (check) {
  if (!fs.existsSync(outputPath)) {
    errors.push(`[FOUND-001] ${TRACEABILITY_PATH} is missing`);
  } else if (fs.readFileSync(outputPath, "utf8") !== serialized) {
    errors.push(`[FOUND-001] ${TRACEABILITY_PATH} is stale; run pnpm run generate:traceability`);
  }
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true, mode: 0o755 });
  fs.writeFileSync(outputPath, serialized);
}

if (errors.length > 0) {
  console.error("Requirement traceability errors:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else if (check) {
  console.log("Requirement traceability is current.");
} else {
  console.log(`Wrote ${TRACEABILITY_PATH}`);
}
