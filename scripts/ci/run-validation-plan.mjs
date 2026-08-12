#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fingerprintGitCandidateRepository } from "../validation/smoke-install-contract.mjs";
import {
  digestJson,
  isFormatSupported,
  planDigest,
  readJson,
  validateManifest,
  validatePlan,
  writeJsonAtomic,
} from "./validation-contract.mjs";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultManifestPath = path.join(moduleDirectory, "validation-manifest.json");
const activeChildren = new Set();

function parseArguments(argv) {
  const options = {
    repository: process.cwd(),
    manifest: defaultManifestPath,
    event: process.env.GITHUB_EVENT_NAME ?? "workflow_dispatch",
    baseSha: "",
    architectureWorkers: process.env.ARCHITECTURE_FIXTURE_WORKERS ?? "1",
    dependencyInstallOutcome: "success",
    githubOutput: false,
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
        "--plan",
        "--report",
        "--event",
        "--base-sha",
        "--architecture-workers",
        "--dependency-install-outcome",
        "--before-fingerprint",
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
  if (!options.plan || !options.report) throw new Error("--plan and --report are required.");
  if (!/^(?:auto|[123])$/.test(options.architectureWorkers)) {
    throw new Error("--architecture-workers must be auto, 1, 2, or 3.");
  }
  if (!new Set(["success", "failure"]).has(options.dependencyInstallOutcome)) {
    throw new Error("--dependency-install-outcome must be success or failure.");
  }
  return options;
}

function fingerprint(repository) {
  const result = fingerprintGitCandidateRepository(repository);
  return {
    algorithm: result.algorithm,
    digest: `${result.algorithm}:${result.digest}`,
    fileCount: result.fileCount,
  };
}

function initialFingerprint(repository, boundaryFile) {
  if (!boundaryFile) return fingerprint(repository);
  const boundary = readJson(boundaryFile);
  if (
    boundary?.schemaVersion !== 1 ||
    !/^sha256:[a-f0-9]{64}$/.test(boundary.candidateFingerprint ?? "") ||
    !Number.isSafeInteger(boundary.candidateFileCount) ||
    boundary.candidateFileCount < 0
  ) {
    throw new Error("The hosted before-fingerprint boundary is malformed.");
  }
  return {
    algorithm: "sha256",
    digest: boundary.candidateFingerprint,
    fileCount: boundary.candidateFileCount,
  };
}

function expandedCommand(gate, values, plan, repository) {
  const command = gate.command.map((part) =>
    part.replaceAll("{{event}}", values.event).replaceAll("{{baseSha}}", values.baseSha || "none"),
  );
  if (gate.changedFiles) {
    const files =
      plan.scope === "affected"
        ? plan.changedPaths.filter(
            (file) => isFormatSupported(file) && fs.existsSync(path.join(repository, file)),
          )
        : ["."];
    if (plan.scope === "affected" && files.length === 0) return null;
    if (plan.scope === "affected") command.push("--", ...files);
    else command.push(...files);
  }
  return command;
}

function terminateChild(child, signal = "SIGTERM") {
  if (!child.pid) return;
  try {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } else process.kill(-child.pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}

function processGroupExists(pid) {
  if (process.platform === "win32") return false;
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    if (error.code === "EPERM") return true;
    throw error;
  }
}

async function settleProcessGroup(child, graceMs = 5000) {
  if (!child.pid) return;
  terminateChild(child);
  if (process.platform === "win32") return;
  const groupPid = child.pid;
  const deadline = Date.now() + graceMs;
  while (processGroupExists(groupPid) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  if (processGroupExists(groupPid)) {
    try {
      process.kill(-groupPid, "SIGKILL");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
    const killDeadline = Date.now() + 1000;
    while (processGroupExists(groupPid) && Date.now() < killDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    if (processGroupExists(groupPid)) {
      throw new Error(`Process group ${groupPid} remained alive after SIGKILL.`);
    }
  }
}

async function runCommand({
  command,
  cwd,
  environment,
  timeoutMs,
  captureOutput = false,
  cancellationControl = null,
}) {
  const started = Date.now();
  const child = spawn(command[0], command.slice(1), {
    cwd,
    env: environment,
    detached: process.platform !== "win32",
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  activeChildren.add(child);
  let stdout = "";
  let stderr = "";
  const append = (chunk, destination) => {
    destination.write(chunk);
    if (!captureOutput) return;
    if (destination === process.stdout && stdout.length < 2_000_000) stdout += chunk.toString();
    if (destination === process.stderr && stderr.length < 2_000_000) stderr += chunk.toString();
  };
  child.stdout.on("data", (chunk) => append(chunk, process.stdout));
  child.stderr.on("data", (chunk) => append(chunk, process.stderr));

  let timedOut = false;
  let escalationTimer = null;
  const timer = setTimeout(() => {
    timedOut = true;
    terminateChild(child);
    escalationTimer = setTimeout(() => terminateChild(child, "SIGKILL"), 5000);
    escalationTimer.unref();
  }, timeoutMs);

  const result = await new Promise((resolve) => {
    child.once("error", (error) => resolve({ error }));
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  clearTimeout(timer);
  let terminationError = null;
  if (
    result.error ||
    timedOut ||
    result.code !== 0 ||
    result.signal ||
    cancellationControl?.receivedSignal
  ) {
    try {
      await settleProcessGroup(child);
    } catch (error) {
      terminationError = error;
    }
  }
  if (escalationTimer) clearTimeout(escalationTimer);
  activeChildren.delete(child);
  return {
    ...result,
    timedOut,
    terminationError,
    durationMs: Date.now() - started,
    stdout,
    stderr,
    output: stdout,
  };
}

function parseSmokeEvidence(output) {
  const fingerprintMatch = [
    ...output.matchAll(/^Git candidate fingerprint: (sha256:[a-f0-9]{64})$/gm),
  ].at(-1);
  const countMatch = [
    ...output.matchAll(/^Smoke install copied (\d+) Git candidate file\(s\)\.$/gm),
  ].at(-1);
  if (!fingerprintMatch || !countMatch) {
    throw new Error("Smoke output did not contain deterministic candidate evidence.");
  }
  return {
    candidateFingerprint: fingerprintMatch[1],
    candidateFileCount: Number(countMatch[1]),
  };
}

function validateArchitectureEvidence(reportFile, repository) {
  if (!fs.existsSync(reportFile)) {
    throw new Error("Architecture Compass did not write its fixture report.");
  }
  let report;
  try {
    report = readJson(reportFile);
  } catch (error) {
    throw new Error(`Architecture Compass fixture report is malformed: ${error.message}`);
  }
  const inventoryFile = path.join(
    repository,
    "scripts",
    "validation",
    "architecture-compass",
    "test-validator-case-inventory.json",
  );
  let inventory;
  try {
    inventory = readJson(inventoryFile);
  } catch (error) {
    throw new Error(`Architecture Compass frozen inventory is unavailable: ${error.message}`);
  }
  if (inventory?.schemaVersion !== 1 || !Array.isArray(inventory.cases)) {
    throw new Error("Architecture Compass frozen inventory is malformed.");
  }
  if (
    report?.schemaVersion !== 1 ||
    !Number.isSafeInteger(report.workerCount) ||
    report.workerCount < 1 ||
    report.workerCount > 3 ||
    !/^sha256:[a-f0-9]{64}$/.test(report.inventoryDigest ?? "") ||
    !/^sha256:[a-f0-9]{64}$/.test(report.accountingDigest ?? "") ||
    !Array.isArray(report.results)
  ) {
    throw new Error("Architecture Compass fixture report has an invalid schema or digest.");
  }
  const expectedInventoryDigest = digestJson(inventory.cases);
  if (report.inventoryDigest !== expectedInventoryDigest) {
    throw new Error("Architecture Compass fixture report inventory digest is contradictory.");
  }
  if (report.results.length !== inventory.cases.length) {
    throw new Error("Architecture Compass fixture report has incomplete case accounting.");
  }
  const deterministicResults = [];
  for (const [ordinal, expected] of inventory.cases.entries()) {
    const result = report.results[ordinal];
    if (
      !expected ||
      typeof expected.id !== "string" ||
      !new Set(["failure", "success"]).has(expected.expectedOutcome) ||
      result?.id !== expected.id ||
      result.ordinal !== ordinal ||
      result.expectedOutcome !== expected.expectedOutcome ||
      !Number.isSafeInteger(result.durationMs) ||
      result.durationMs < 0
    ) {
      throw new Error(
        `Architecture Compass fixture report has contradictory case accounting at ordinal ${ordinal}.`,
      );
    }
    const isApplicableSuccess =
      result.status === "passed" && result.reason === null && result.skipBucket === null;
    const isWindowsNonApplicable =
      process.platform === "win32" &&
      expected.applicability === "posix" &&
      result.status === "not-applicable" &&
      result.skipBucket === "platform" &&
      typeof result.reason === "string" &&
      result.reason.length > 0;
    if (!isApplicableSuccess && !isWindowsNonApplicable) {
      throw new Error(`Architecture Compass fixture ${expected.id} did not pass successfully.`);
    }
    deterministicResults.push({
      id: result.id,
      ordinal,
      expectedOutcome: result.expectedOutcome,
      status: result.status,
      skipBucket: result.skipBucket,
    });
  }
  if (report.accountingDigest !== digestJson(deterministicResults)) {
    throw new Error("Architecture Compass fixture report accounting digest is contradictory.");
  }
  return report.inventoryDigest;
}

function exactSkillsCli(repository) {
  const executable = path.join(
    repository,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "skills.cmd" : "skills",
  );
  return fs.existsSync(executable) ? executable : null;
}

function expectedSkillsCliVersion(repository) {
  const packageManifest = readJson(path.join(repository, "package.json"));
  const version = packageManifest?.devDependencies?.skills;
  if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) {
    throw new Error("Root devDependencies.skills must be an exact semantic version.");
  }
  return version;
}

async function skillsCliVersion(executable, repository, cancellationControl) {
  if (!executable) return null;
  const result = await runCommand({
    command: [executable, "--version"],
    cwd: repository,
    environment: process.env,
    timeoutMs: 30000,
    captureOutput: true,
    cancellationControl,
  });
  if (
    cancellationControl?.receivedSignal ||
    result.error ||
    result.timedOut ||
    result.terminationError ||
    result.code !== 0 ||
    result.signal
  ) {
    if (cancellationControl?.receivedSignal) {
      throw new Error(`Skills CLI version check received ${cancellationControl.receivedSignal}.`);
    }
    throw new Error("The exact installed skills CLI did not report a version.");
  }
  const version = result.output.match(/\b(\d+\.\d+\.\d+)\b/)?.[1];
  if (!version) throw new Error("Could not parse the exact installed skills CLI version.");
  return version;
}

function writeGithubOutput(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `${Object.entries(values)
      .map(([key, value]) => `${key}=${value ?? ""}`)
      .join("\n")}\n`,
  );
}

function installSignalHandlers(control) {
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => {
      control.receivedSignal ??= signal;
      for (const child of activeChildren) terminateChild(child);
      setTimeout(() => {
        for (const child of activeChildren) terminateChild(child, "SIGKILL");
      }, 5000).unref();
      process.exitCode = 1;
    });
  }
}

export async function executeValidationPlan(options, control = { receivedSignal: null }) {
  const repository = path.resolve(options.repository);
  const manifest = validateManifest(readJson(options.manifest));
  const plan = validatePlan(readJson(options.plan), manifest, "effective plan", {
    requireCandidatePlanDigest: true,
  });
  if (plan.manifestDigest !== digestJson(manifest)) {
    throw new Error("Validation plan manifest digest does not match the runner manifest.");
  }
  const selected = new Set(plan.selectedGates);
  const exactCli = exactSkillsCli(repository);
  const skillsSmokeCli = exactCli ? "configured" : "unset";
  const skillsSmokeForceTty = exactCli && process.platform !== "win32" ? "1" : "0";
  const architectureReport = path.join(
    path.dirname(path.resolve(options.report)),
    "architecture-fixture-report.json",
  );
  const before = initialFingerprint(repository, options.beforeFingerprint);
  const gates = [];
  const dependencyInstallOutcome = options.dependencyInstallOutcome ?? "success";
  let failed = dependencyInstallOutcome !== "success";
  let smokeEvidence = null;
  let cliVersion = null;
  let fixtureInventoryDigest = null;

  for (const gate of manifest.gates) {
    if (!selected.has(gate.id)) continue;
    if (control.receivedSignal) failed = true;
    const failedPrerequisites = gate.prerequisites.filter(
      (id) => gates.find((result) => result.id === id)?.status !== "passed",
    );
    if (failed || failedPrerequisites.length > 0) {
      if (failedPrerequisites.length > 0) failed = true;
      gates.push({
        id: gate.id,
        status: "skipped",
        exitCode: null,
        durationMs: 0,
        reason:
          dependencyInstallOutcome !== "success"
            ? "skipped because selected dependency installation failed"
            : control.receivedSignal
              ? `skipped because validation received ${control.receivedSignal}`
              : failed
                ? "skipped after an earlier gate failure"
                : `prerequisite did not pass: ${failedPrerequisites.join(", ")}`,
      });
      continue;
    }

    const command = expandedCommand(gate, options, plan, repository);
    if (!command) {
      gates.push({
        id: gate.id,
        status: "passed",
        exitCode: 0,
        durationMs: 0,
        reason: "no extant supported changed files",
      });
      continue;
    }
    console.log(`\n[validation:${gate.id}] ${command.join(" ")}`);
    if (gate.id === "architecture-compass") {
      fs.rmSync(architectureReport, { force: true });
    }
    const environment = {
      ...process.env,
      VALIDATION_EVENT: options.event,
      VALIDATION_BASE_SHA: options.baseSha,
      VALIDATION_PLAN_FILE: path.resolve(options.plan),
      ...(gate.id === "architecture-compass"
        ? {
            ARCHITECTURE_FIXTURE_WORKERS: options.architectureWorkers,
            ARCHITECTURE_FIXTURE_REPORT: architectureReport,
          }
        : {}),
      ...(gate.id === "smoke-install" && exactCli
        ? { SKILLS_SMOKE_CLI: exactCli, SKILLS_SMOKE_FORCE_TTY: skillsSmokeForceTty }
        : {}),
    };
    const result = await runCommand({
      command,
      cwd: repository,
      environment,
      timeoutMs: gate.timeoutMs,
      captureOutput: gate.id === "smoke-install",
      cancellationControl: control,
    });
    const passed =
      !control.receivedSignal &&
      !result.error &&
      !result.timedOut &&
      !result.terminationError &&
      result.code === 0;
    const gateResult = {
      id: gate.id,
      status: passed ? "passed" : "failed",
      exitCode: result.code ?? null,
      durationMs: result.durationMs,
      reason: passed
        ? null
        : control.receivedSignal
          ? `validation received ${control.receivedSignal}`
          : result.terminationError
            ? `process-group termination failed: ${result.terminationError.message}`
            : result.timedOut
              ? `timed out after ${gate.timeoutMs}ms`
              : result.error?.message ||
                `exited with ${result.signal ?? result.code ?? "unknown status"}`,
    };
    gates.push(gateResult);
    if (!passed) {
      failed = true;
      continue;
    }
    if (gate.id === "architecture-compass") {
      try {
        fixtureInventoryDigest = validateArchitectureEvidence(architectureReport, repository);
      } catch (error) {
        gateResult.status = "failed";
        gateResult.exitCode = 1;
        gateResult.reason = error.message;
        failed = true;
      }
    }
    if (gate.id === "smoke-install") {
      try {
        smokeEvidence = parseSmokeEvidence(result.output);
        if (
          smokeEvidence.candidateFingerprint !== before.digest ||
          smokeEvidence.candidateFileCount !== before.fileCount
        ) {
          throw new Error(
            "Smoke-install candidate evidence does not match the validation boundary.",
          );
        }
        cliVersion = await skillsCliVersion(exactCli, repository, control);
        if (!cliVersion) throw new Error("The exact installed skills CLI is unavailable.");
        const expectedCliVersion = expectedSkillsCliVersion(repository);
        if (cliVersion !== expectedCliVersion) {
          throw new Error(
            `The installed skills CLI version ${cliVersion} does not match root devDependency ${expectedCliVersion}.`,
          );
        }
      } catch (error) {
        gateResult.status = "failed";
        gateResult.exitCode = 1;
        gateResult.reason = error.message;
        failed = true;
      }
    }
  }

  let after;
  let fingerprintError = null;
  try {
    after = fingerprint(repository);
    if (before.digest !== after.digest || before.fileCount !== after.fileCount) {
      fingerprintError = "The materialized Git candidate changed while validation gates ran.";
      failed = true;
    }
    if (
      smokeEvidence &&
      (smokeEvidence.candidateFingerprint !== before.digest ||
        smokeEvidence.candidateFileCount !== before.fileCount)
    ) {
      fingerprintError = "Smoke-install candidate evidence does not match the validation boundary.";
      const smokeGate = gates.find((gate) => gate.id === "smoke-install");
      smokeGate.status = "failed";
      smokeGate.exitCode = 1;
      smokeGate.reason = fingerprintError;
      failed = true;
    }
  } catch (error) {
    fingerprintError = `Final candidate fingerprint failed: ${error.message}`;
    failed = true;
    after = { algorithm: "sha256", digest: null, fileCount: null };
  }

  if (control.receivedSignal) failed = true;

  const reportWithoutDigest = {
    schemaVersion: 1,
    planDigest: planDigest(plan),
    manifestDigest: plan.manifestDigest,
    scope: plan.scope,
    selectedGates: plan.selectedGates,
    gates,
    candidateFingerprintBefore: before.digest,
    candidateFileCountBefore: before.fileCount,
    candidateFingerprintAfter: after.digest,
    candidateFileCountAfter: after.fileCount,
    fingerprintError,
    smokeEvidence,
    skillsCliVersion: cliVersion,
    skillsSmokeCli: selected.has("smoke-install") ? skillsSmokeCli : null,
    skillsSmokeForceTty: selected.has("smoke-install") ? skillsSmokeForceTty : null,
    fixtureInventoryDigest,
  };
  const report = { ...reportWithoutDigest, reportDigest: digestJson(reportWithoutDigest) };
  writeJsonAtomic(options.report, report);
  if (options.githubOutput) {
    writeGithubOutput({
      validation_scope: plan.scope,
      plan_digest: report.planDigest,
      manifest_digest: report.manifestDigest,
      report_digest: report.reportDigest,
      candidate_fingerprint: report.candidateFingerprintAfter,
      candidate_file_count: report.candidateFileCountAfter,
      skills_cli_version: report.skillsCliVersion,
      fixture_inventory_digest: report.fixtureInventoryDigest,
      report_file: path.resolve(options.report),
    });
  }
  return { failed, report };
}

function isMain() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMain()) {
  const control = { receivedSignal: null };
  installSignalHandlers(control);
  try {
    const options = parseArguments(process.argv.slice(2));
    const result = await executeValidationPlan(options, control);
    if (result.failed) process.exitCode = 1;
    else console.log(`Validation ${result.report.scope} plan passed.`);
  } catch (error) {
    console.error(`Validation runner failed: ${error.message}`);
    process.exitCode = 1;
  }
}
