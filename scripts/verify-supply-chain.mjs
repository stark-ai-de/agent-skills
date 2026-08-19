#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { load as parseYaml } from "js-yaml";

import { loadValidatedBundle } from "./lib/bundle-contract.mjs";
import { enumerateTree } from "./lib/plugin-projections.mjs";
import { pluginIdentity } from "./lib/release-descriptor.mjs";

const DANGEROUS =
  /curl\s+[^\n]*\|\s*(?:ba)?sh|wget\s+[^\n]*\|\s*(?:ba)?sh|npm\s+install\s+|pnpm\s+add\s+|pip\s+install\s+|Invoke-WebRequest/;

function parseArgs(argv) {
  const rootIndex = argv.indexOf("--root");
  return { root: rootIndex === -1 ? process.cwd() : path.resolve(argv[rootIndex + 1]) };
}

function walkLockPackages(lockfile) {
  const packages =
    lockfile.packages && typeof lockfile.packages === "object" ? lockfile.packages : {};
  return Object.keys(packages)
    .filter((key) => key && key !== ".")
    .sort()
    .map((key) => ({
      path: key,
      version: packages[key]?.version ?? null,
      license: packages[key]?.license ?? "NOASSERTION",
    }));
}

try {
  const { root } = parseArgs(process.argv.slice(2));
  const errors = [];
  const bundle = loadValidatedBundle(root);
  const identity = pluginIdentity(root);
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  if (packageJson.license !== "Apache-2.0") {
    errors.push("[SEC-001] package.json license must remain Apache-2.0");
  }
  const licenseText = fs.readFileSync(path.join(root, "LICENSE"), "utf8");
  if (!licenseText.includes("Apache License")) {
    errors.push("[SEC-001] repository LICENSE must remain Apache-2.0");
  }

  const inventory = [];
  for (const entry of bundle.skills) {
    for (const file of enumerateTree(path.join(root, entry.source), "", {
      excludeGeneratedCaches: true,
    })) {
      inventory.push({
        path: `${entry.source}/${file.relative}`,
        license: "Apache-2.0",
      });
      if (/\.(?:mjs|js|sh|py)$/.test(file.relative)) {
        const text = fs.readFileSync(file.absolute, "utf8");
        if (DANGEROUS.test(text)) {
          errors.push(
            `[SEC-001] ${entry.source}/${file.relative} contains a forbidden install or download pattern`,
          );
        }
      }
    }
  }

  const lockPath = path.join(root, "pnpm-lock.yaml");
  if (!fs.existsSync(lockPath)) {
    errors.push("[SEC-001] pnpm-lock.yaml is missing");
  }
  const lockfile = fs.existsSync(lockPath)
    ? parseYaml(fs.readFileSync(lockPath, "utf8"))
    : { packages: {} };
  const sbom = {
    spdxVersion: "SPDX-2.3",
    dataLicense: "CC0-1.0",
    SPDXID: "SPDXRef-DOCUMENT",
    name: `${identity.name}-${identity.version}`,
    documentNamespace: `https://github.com/stark-ai-de/agent-skills/sbom/${identity.name}-${identity.version}`,
    packages: [
      {
        name: identity.name,
        versionInfo: identity.version,
        licenseConcluded: "Apache-2.0",
      },
      ...walkLockPackages(lockfile).map((pkg) => ({
        name: pkg.path,
        versionInfo: pkg.version,
        licenseConcluded: pkg.license,
      })),
    ],
  };
  const sbomBytes = Buffer.from(`${JSON.stringify(sbom, null, 2)}\n`);
  const sbomHash = crypto.createHash("sha256").update(sbomBytes).digest("hex");

  if (errors.length > 0) {
    console.error("Supply-chain validation errors:");
    for (const error of [...new Set(errors)]) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`Supply-chain inventory: ${inventory.length} bundled files under Apache-2.0.`);
    console.log(`Generated SPDX package count: ${sbom.packages.length}`);
    console.log(`SBOM SHA-256: ${sbomHash}`);
    console.log("Signed release-tag provenance remains a publication gate.");
  }
} catch (error) {
  console.error(`Supply-chain validation failed: ${error.message}`);
  process.exitCode = 1;
}
