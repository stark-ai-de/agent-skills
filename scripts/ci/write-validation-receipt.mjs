import fs from "node:fs";
import path from "node:path";

import {
  digestJson,
  manifestGateIds,
  readJson,
  validateManifest,
  writeJsonAtomic,
} from "./validation-contract.mjs";
import { validateFullReport } from "./validation-proof-contract.mjs";

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (new Set(["--manifest", "--report", "--output"]).has(argument)) {
      options[argument.slice(2)] = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  for (const name of ["manifest", "report", "output"]) {
    if (!options[name]) throw new Error(`--${name} is required.`);
  }
  return options;
}

try {
  const options = parseArguments(process.argv.slice(2));
  const manifest = validateManifest(readJson(options.manifest));
  const report = readJson(options.report);
  const packageDocument = readJson(path.resolve("package.json"));
  const skillsCliVersion = packageDocument.devDependencies?.skills;
  if (!/^\d+\.\d+\.\d+$/.test(skillsCliVersion ?? "")) {
    throw new Error("package.json must pin the exact skills CLI version.");
  }
  const inventory = readJson(
    path.resolve("scripts/validation/architecture-compass/test-validator-case-inventory.json"),
  );
  if (!Array.isArray(inventory.cases) || inventory.cases.length === 0) {
    throw new Error("The frozen Architecture Compass fixture inventory is malformed.");
  }
  validateFullReport(report, manifest, {
    skillsCliVersion,
    fixtureInventoryDigest: digestJson(inventory.cases),
  });
  const receipt = {
    schema_version: 2,
    workflow: requiredEnvironment("GITHUB_WORKFLOW"),
    workflow_path: ".github/workflows/validate.yml",
    run_id: requiredEnvironment("GITHUB_RUN_ID"),
    run_attempt: requiredEnvironment("GITHUB_RUN_ATTEMPT"),
    validation_job_attempt: requiredEnvironment("GITHUB_RUN_ATTEMPT"),
    event: requiredEnvironment("GITHUB_EVENT_NAME"),
    branch: requiredEnvironment("GITHUB_REF_NAME"),
    sha: requiredEnvironment("GITHUB_SHA"),
    version: JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8")).version,
    validation_scope: report.scope,
    plan_digest: report.planDigest,
    manifest_digest: report.manifestDigest,
    full_gate_ids: manifestGateIds(manifest),
    gate_report_digest: report.reportDigest,
    fixture_inventory_digest: report.fixtureInventoryDigest,
    skills_gate_success: report.gates.find(({ id }) => id === "skills")?.status === "passed",
    smoke_install_success:
      report.gates.find(({ id }) => id === "smoke-install")?.status === "passed",
    candidate_fingerprint: report.candidateFingerprintAfter,
    candidate_file_count: report.candidateFileCountAfter,
    skills_cli_version: report.skillsCliVersion,
    skills_smoke_cli: report.skillsSmokeCli,
    skills_smoke_force_tty: report.skillsSmokeForceTty,
    site_digest: requiredEnvironment("SITE_DIGEST"),
    pages_artifact_name: requiredEnvironment("PAGES_ARTIFACT_NAME"),
    pages_artifact_id: requiredEnvironment("PAGES_ARTIFACT_ID"),
    validation_artifact_name: requiredEnvironment("VALIDATION_ARTIFACT_NAME"),
    validation_report_name: "validation-report.json",
  };
  writeJsonAtomic(options.output, receipt);
  console.log(`Validation receipt schema v2 written to ${path.resolve(options.output)}.`);
} catch (error) {
  console.error(`Could not write validation receipt: ${error.message}`);
  process.exitCode = 1;
}
