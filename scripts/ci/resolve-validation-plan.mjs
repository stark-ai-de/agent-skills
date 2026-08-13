#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TextDecoder } from "node:util";
import { fileURLToPath } from "node:url";

import { sanitizedGitCommandOutput } from "../validation/smoke-install-contract.mjs";

import {
  digestJson,
  gateInstallProfiles,
  manifestGateIds,
  planDigest,
  readJson,
  validateManifest,
  validatePlan,
  writeJsonAtomic,
} from "./validation-contract.mjs";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultManifestPath = path.join(moduleDirectory, "validation-manifest.json");
const defaultPlannerPath = path.join(moduleDirectory, "plan-validation.mjs");
const STRICT_UTF8_DECODER = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

function parseArguments(argv) {
  const options = {
    repository: process.cwd(),
    manifest: defaultManifestPath,
    planner: defaultPlannerPath,
    event: process.env.GITHUB_EVENT_NAME ?? "workflow_dispatch",
    baseSha: "",
    candidateSha: "",
    githubOutput: false,
    plannerTimeoutMs: 10000,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--github-output") {
      options.githubOutput = true;
      continue;
    }
    if (
      new Set([
        "--repository",
        "--manifest",
        "--planner",
        "--event",
        "--base-sha",
        "--candidate-sha",
        "--output",
        "--planner-timeout-ms",
      ]).has(argument)
    ) {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--"))
        throw new Error(`${argument} requires a value.`);
      options[argument.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  if (!options.output) throw new Error("--output is required.");
  if (!new Set(["pull_request", "push", "workflow_dispatch"]).has(options.event)) {
    throw new Error(`Unsupported validation event: ${options.event}`);
  }
  options.plannerTimeoutMs = Number(options.plannerTimeoutMs);
  if (!Number.isSafeInteger(options.plannerTimeoutMs) || options.plannerTimeoutMs <= 0) {
    throw new Error("--planner-timeout-ms must be a positive integer.");
  }
  return options;
}

function git(repository, arguments_, options = {}) {
  let output;
  try {
    output = sanitizedGitCommandOutput(
      repository,
      arguments_,
      `git ${arguments_.join(" ")} failed`,
    );
  } catch (error) {
    if (options.allowFailure) return null;
    throw error;
  }
  if (options.binary) return output;
  let decoded;
  try {
    decoded = STRICT_UTF8_DECODER.decode(output);
  } catch {
    throw new Error(`git ${arguments_.join(" ")} returned invalid UTF-8.`);
  }
  if (!Buffer.from(decoded, "utf8").equals(output)) {
    throw new Error(`git ${arguments_.join(" ")} returned non-canonical UTF-8.`);
  }
  return decoded.trimEnd();
}

export function parseNameStatus(buffer) {
  let decoded;
  try {
    decoded = STRICT_UTF8_DECODER.decode(buffer);
  } catch {
    throw new Error("Git name-status output contains invalid UTF-8.");
  }
  if (!Buffer.from(decoded, "utf8").equals(buffer)) {
    throw new Error("Git name-status output contains non-canonical UTF-8.");
  }
  const fields = decoded.split("\0");
  if (fields.at(-1) === "") fields.pop();
  const entries = [];
  for (let index = 0; index < fields.length; ) {
    const status = fields[index];
    index += 1;
    const pathCount = /^[RC]/.test(status) ? 2 : 1;
    const paths = fields.slice(index, index + pathCount);
    if (paths.length !== pathCount || paths.some((value) => !value)) {
      throw new Error(`Malformed git name-status record for ${status || "(missing status)"}.`);
    }
    index += pathCount;
    entries.push({ status, paths });
  }
  return entries;
}

function writeChanges(repository, baseSha, candidateSha, destination) {
  let entries = [];
  if (baseSha) {
    const output = git(
      repository,
      ["diff", "--name-status", "-z", "--find-renames", baseSha, candidateSha],
      { binary: true },
    );
    entries = parseNameStatus(output);
  }
  writeJsonAtomic(destination, { schemaVersion: 1, entries });
}

function runPlanner({
  planner,
  manifest,
  changes,
  baseSha,
  candidateSha,
  output,
  event,
  cwd,
  timeoutMs,
}) {
  const result = spawnSync(
    process.execPath,
    [
      planner,
      "--manifest",
      manifest,
      "--changes",
      changes,
      "--base-sha",
      baseSha || "none",
      "--candidate-sha",
      candidateSha,
      "--event",
      event,
      "--output",
      output,
    ],
    {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: timeoutMs,
      killSignal: "SIGKILL",
    },
  );
  if (result.error?.code === "ETIMEDOUT") {
    throw new Error(`planner timed out after ${timeoutMs}ms`);
  }
  if (result.error) throw new Error("planner could not start");
  if (result.status !== 0) {
    throw new Error("planner exited unsuccessfully");
  }
  if (!fs.existsSync(output)) throw new Error("planner did not write output");
  try {
    return readJson(output);
  } catch {
    throw new Error("planner wrote malformed JSON");
  }
}

function candidateFailureDigest({ manifest, baseSha, candidateSha, changedPaths, error }) {
  return digestJson({
    schemaVersion: 1,
    kind: "candidate-planner-failure",
    reason: error.message,
    baseSha,
    candidateSha,
    changedPaths,
    manifestDigest: digestJson(manifest),
  });
}

function fullPlan(manifest, values, reason) {
  return {
    schemaVersion: 1,
    scope: "full",
    reason,
    baseSha: values.baseSha,
    candidateSha: values.candidateSha,
    changedPaths: values.changedPaths,
    selectedGates: manifestGateIds(manifest),
    installProfiles: [...new Set(manifest.gates.flatMap(gateInstallProfiles))].sort(),
    manifestDigest: digestJson(manifest),
    basePlanDigest: values.basePlanDigest,
    candidatePlanDigest: values.candidatePlanDigest,
  };
}

function compactOutput(plan, outputPath) {
  return {
    validation_scope: plan.scope,
    plan_digest: planDigest(plan),
    manifest_digest: plan.manifestDigest,
    needs_root: String(plan.installProfiles.includes("root")),
    needs_site: String(plan.installProfiles.includes("site")),
    plan_file: path.resolve(outputPath),
  };
}

function writeGithubOutput(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `${Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n")}\n`,
  );
}

export function resolveValidationPlan(options) {
  const repository = path.resolve(options.repository);
  const manifest = validateManifest(readJson(options.manifest));
  const plannerTimeoutMs = options.plannerTimeoutMs ?? 10000;
  if (!Number.isSafeInteger(plannerTimeoutMs) || plannerTimeoutMs <= 0) {
    throw new Error("plannerTimeoutMs must be a positive integer.");
  }
  const runRoot = fs.mkdtempSync(path.join(os.tmpdir(), "affected-validation-plan-"));
  try {
    if (options.event === "pull_request" && !options.baseSha) {
      throw new Error("Pull-request planning requires --base-sha.");
    }
    const candidateReference = options.candidateSha || "HEAD";
    const candidateSha = git(repository, [
      "rev-parse",
      "--verify",
      `${candidateReference}^{commit}`,
    ]);
    const baseSha =
      options.event === "pull_request"
        ? git(repository, ["rev-parse", "--verify", `${options.baseSha}^{commit}`])
        : "";
    const changesFile = path.join(runRoot, "changes.json");
    writeChanges(repository, baseSha, candidateSha, changesFile);
    const changes = readJson(changesFile);
    const changedPaths = [...new Set(changes.entries.flatMap((entry) => entry.paths))].sort();
    let candidatePlan = null;
    let candidateError = null;
    try {
      candidatePlan = validatePlan(
        runPlanner({
          planner: options.planner,
          manifest: options.manifest,
          changes: changesFile,
          baseSha,
          candidateSha,
          output: path.join(runRoot, "candidate-plan.json"),
          event: options.event,
          cwd: repository,
          timeoutMs: plannerTimeoutMs,
        }),
        manifest,
        "candidate plan",
      );
      if (
        candidatePlan.candidateSha !== candidateSha ||
        (options.event === "pull_request" && candidatePlan.baseSha !== baseSha)
      ) {
        throw new Error("candidate planner reported a different base or candidate SHA");
      }
      if (JSON.stringify(candidatePlan.changedPaths) !== JSON.stringify(changedPaths)) {
        throw new Error("candidate planner reported changed paths that differ from the Git diff");
      }
    } catch (error) {
      candidateError = error;
      candidatePlan = null;
    }
    const candidatePlanDigest = candidatePlan
      ? planDigest(candidatePlan)
      : candidateFailureDigest({
          manifest,
          baseSha,
          candidateSha,
          changedPaths,
          error: candidateError,
        });

    if (options.event !== "pull_request") {
      const effective = fullPlan(
        manifest,
        { baseSha: "", candidateSha, changedPaths, basePlanDigest: null, candidatePlanDigest },
        candidatePlan
          ? `${options.event} requires full validation`
          : `candidate planner failed; full fallback: ${candidateError.message}`,
      );
      validatePlan(effective, manifest, "effective plan", {
        requireCandidatePlanDigest: true,
      });
      writeJsonAtomic(options.output, effective);
      return effective;
    }

    let basePlan = null;
    let baseError = null;
    try {
      const baseDirectory = path.join(runRoot, "base");
      fs.mkdirSync(baseDirectory, { recursive: true, mode: 0o700 });
      const basePlanner = path.join(baseDirectory, "plan-validation.mjs");
      const baseManifest = path.join(baseDirectory, "validation-manifest.json");
      const plannerBytes = git(repository, ["show", `${baseSha}:scripts/ci/plan-validation.mjs`], {
        binary: true,
        allowFailure: true,
      });
      const manifestBytes = git(
        repository,
        ["show", `${baseSha}:scripts/ci/validation-manifest.json`],
        {
          binary: true,
          allowFailure: true,
        },
      );
      if (!plannerBytes || !manifestBytes) throw new Error("base planner or manifest is absent");
      fs.writeFileSync(basePlanner, plannerBytes, { mode: 0o500 });
      fs.writeFileSync(baseManifest, manifestBytes, { mode: 0o400 });
      const baseManifestDocument = validateManifest(readJson(baseManifest));
      basePlan = validatePlan(
        runPlanner({
          planner: basePlanner,
          manifest: baseManifest,
          changes: changesFile,
          baseSha,
          candidateSha,
          output: path.join(runRoot, "base-plan.json"),
          event: options.event,
          cwd: repository,
          timeoutMs: plannerTimeoutMs,
        }),
        baseManifestDocument,
        "base plan",
      );
      if (basePlan.baseSha !== baseSha || basePlan.candidateSha !== candidateSha) {
        throw new Error("base planner reported a different base or candidate SHA");
      }
      if (JSON.stringify(basePlan.changedPaths) !== JSON.stringify(changedPaths)) {
        throw new Error("base planner reported changed paths that differ from the Git diff");
      }
      if (digestJson(baseManifestDocument) !== digestJson(manifest)) {
        throw new Error("base and candidate validation manifests are incompatible");
      }
    } catch (error) {
      baseError = error;
      basePlan = null;
    }

    const basePlanDigest = basePlan ? planDigest(basePlan) : null;
    let effective;
    if (
      !candidatePlan ||
      !basePlan ||
      candidatePlan.scope === "full" ||
      basePlan.scope === "full"
    ) {
      const reasons = [
        candidateError
          ? `candidate planner failed: ${candidateError.message}`
          : candidatePlan?.reason,
        baseError ? `base planner failed: ${baseError.message}` : basePlan?.reason,
      ].filter(Boolean);
      effective = fullPlan(
        manifest,
        { baseSha, candidateSha, changedPaths, basePlanDigest, candidatePlanDigest },
        `full fallback: ${reasons.join("; ")}`,
      );
    } else {
      const selected = new Set([...basePlan.selectedGates, ...candidatePlan.selectedGates]);
      const selectedGates = manifestGateIds(manifest, (gate) => selected.has(gate.id));
      effective = {
        schemaVersion: 1,
        scope: "affected",
        reason: `base/candidate union: ${basePlan.reason}; ${candidatePlan.reason}`,
        baseSha,
        candidateSha,
        changedPaths,
        selectedGates,
        installProfiles: [
          ...new Set(
            manifest.gates.filter((gate) => selected.has(gate.id)).flatMap(gateInstallProfiles),
          ),
        ].sort(),
        manifestDigest: digestJson(manifest),
        basePlanDigest,
        candidatePlanDigest,
      };
    }
    validatePlan(effective, manifest, "effective plan", { requireCandidatePlanDigest: true });
    writeJsonAtomic(options.output, effective);
    return effective;
  } finally {
    fs.rmSync(runRoot, { recursive: true, force: true });
  }
}

function isMain() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMain()) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const plan = resolveValidationPlan(options);
    if (options.githubOutput) writeGithubOutput(compactOutput(plan, options.output));
    console.log(`${plan.scope} validation selected: ${plan.selectedGates.join(", ")}`);
  } catch (error) {
    console.error(`Could not resolve validation plan: ${error.message}`);
    process.exitCode = 1;
  }
}
