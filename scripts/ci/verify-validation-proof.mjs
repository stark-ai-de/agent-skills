import fs from "node:fs";
import path from "node:path";

import { digestJson, readJson, validateManifest } from "./validation-contract.mjs";
import { validateReceipt } from "./validation-proof-contract.mjs";

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (new Set(["--manifest", "--receipt", "--report"]).has(argument)) {
      options[argument.slice(2)] = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  for (const name of ["manifest", "receipt", "report"]) {
    if (!options[name]) throw new Error(`--${name} is required.`);
  }
  return options;
}

try {
  const options = parseArguments(process.argv.slice(2));
  const manifest = validateManifest(readJson(options.manifest));
  const receipt = readJson(options.receipt);
  const report = readJson(options.report);
  const packageDocument = readJson(path.resolve("package.json"));
  const skillsCliVersion = packageDocument.devDependencies?.skills;
  if (!/^\d+\.\d+\.\d+$/.test(skillsCliVersion ?? "")) {
    throw new Error("package.json must pin the exact skills CLI version.");
  }
  const inventory = JSON.parse(
    fs.readFileSync(
      path.resolve("scripts/validation/architecture-compass/test-validator-case-inventory.json"),
      "utf8",
    ),
  );
  if (!Array.isArray(inventory.cases) || inventory.cases.length === 0) {
    throw new Error("The frozen Architecture Compass fixture inventory is malformed.");
  }
  validateReceipt(receipt, report, manifest, {
    skillsCliVersion,
    fixtureInventoryDigest: digestJson(inventory.cases),
    workflow: "Validate",
    workflowPath: ".github/workflows/validate.yml",
    event: "push",
    branch: "main",
    sha: process.env.RELEASE_SHA,
    version: process.env.VERSION,
    runId: process.env.VALIDATE_RUN_ID,
    runAttempt: process.env.VALIDATE_JOB_ATTEMPT,
    pagesArtifactName: process.env.PAGES_ARTIFACT_NAME,
    validationArtifactName: process.env.VALIDATION_ARTIFACT_NAME,
  });
  console.log(`Validated full receipt and report at ${path.resolve(options.receipt)}.`);
} catch (error) {
  console.error(`Validation proof verification failed: ${error.message}`);
  process.exitCode = 1;
}
