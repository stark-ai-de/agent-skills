#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fingerprintGitCandidateRepository } from "../validation/smoke-install-contract.mjs";
import {
  settleDetachedProcessGroup,
  terminateProcessGroup,
} from "../validation/lib/process-group.mjs";
import { digestJson, readJson, writeJsonAtomic } from "./validation-contract.mjs";
import { verifyActionlintBinary } from "./actionlint-contract.mjs";
import {
  createTaskOutcome,
  sanitizeExecutionEnvironment,
  validateResolution,
} from "./validation-task-graph.mjs";

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const OUTCOME_SCHEMA_VERSION = 1;
const RUNTIME_SCHEMA_VERSION = 2;
const MAX_CAPTURE_BYTES = 2_000_000;
const HOSTED_SYSTEM_TOOLS = new Set([
  "bash",
  "env",
  "git",
  "python3",
  "script",
  "sh",
  "mkfifo",
  "sleep",
  "tar",
]);
const EXACT_RUNTIME_TOOLS = new Set([
  "node",
  "npm",
  "pnpm",
  "actionlint",
  "oxfmt",
  "oxlint",
  "skills-cli",
]);

export function executionPathDigest(pathValue) {
  if (typeof pathValue !== "string" || pathValue.length === 0 || pathValue.includes("\0")) {
    throw new Error("Execution PATH must be a non-empty string without NUL bytes.");
  }
  const entries = pathValue.split(path.delimiter);
  if (
    entries.some(
      (entry) => entry.length === 0 || !path.isAbsolute(entry) || path.resolve(entry) !== entry,
    )
  ) {
    throw new Error("Execution PATH entries must be absolute normalized paths.");
  }
  return digestJson({ format: "validation-execution-path-v1", entries });
}

export function systemToolPolicyIdentity(tool) {
  if (!HOSTED_SYSTEM_TOOLS.has(tool)) {
    throw new Error(`Unsupported hosted system tool policy: ${tool}.`);
  }
  return `${tool}@ubuntu-24.04`;
}

function requireObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value;
}

function requireExactKeys(value, required, optional, label) {
  requireObject(value, label);
  const allowed = new Set([...required, ...optional]);
  const missing = required.filter((key) => !Object.hasOwn(value, key));
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (missing.length > 0 || unknown.length > 0) {
    throw new Error(
      `${label} fields are invalid (missing: ${missing.join(", ") || "none"}; unknown: ${unknown.join(", ") || "none"}).`,
    );
  }
}

function candidateFingerprint(repository) {
  const candidate = fingerprintGitCandidateRepository(repository);
  return {
    candidateFingerprint: `${candidate.algorithm}:${candidate.digest}`,
    candidateFileCount: candidate.fileCount,
  };
}

function validateBoundary(boundary, resolution) {
  requireExactKeys(
    boundary,
    ["schemaVersion", "candidateFingerprint", "candidateFileCount"],
    [],
    "before-fingerprint boundary",
  );
  if (
    boundary.schemaVersion !== 1 ||
    !DIGEST_PATTERN.test(boundary.candidateFingerprint) ||
    !Number.isSafeInteger(boundary.candidateFileCount) ||
    boundary.candidateFileCount < 0
  ) {
    throw new Error("The before-fingerprint boundary is malformed.");
  }
  if (
    boundary.candidateFingerprint !== resolution.candidateFingerprint ||
    boundary.candidateFileCount !== resolution.candidateFileCount
  ) {
    throw new Error("The before-fingerprint boundary contradicts the task resolution.");
  }
  return boundary;
}

function localToolExecutable(repository, tool) {
  const names = {
    oxfmt: process.platform === "win32" ? "oxfmt.cmd" : "oxfmt",
    oxlint: process.platform === "win32" ? "oxlint.cmd" : "oxlint",
    "skills-cli": process.platform === "win32" ? "skills.cmd" : "skills",
  };
  return names[tool] ? path.join(repository, "node_modules", ".bin", names[tool]) : null;
}

function runIdentityCommand(command, arguments_, repository) {
  const result = spawnSync(command, arguments_, {
    cwd: repository,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0 || result.error) {
    throw new Error(
      result.stderr?.trim() ||
        result.error?.message ||
        `Could not observe validation tool identity: ${command}.`,
    );
  }
  return result.stdout.trim();
}

function exactExecutableIdentity(tool, repository, versionArguments = null) {
  const discovered = runIdentityCommand(
    "sh",
    ["-c", 'command -v "$1"', "validation-tool-lookup", tool],
    repository,
  );
  if (!path.isAbsolute(discovered)) {
    throw new Error(`The ${tool} executable did not resolve to an absolute path.`);
  }
  const executable = fs.realpathSync.native(discovered);
  const stat = fs.statSync(executable);
  if (!stat.isFile()) throw new Error(`The ${tool} executable is not a regular file.`);
  const executableDigest = crypto
    .createHash("sha256")
    .update(fs.readFileSync(executable))
    .digest("hex");
  const version = versionArguments
    ? runIdentityCommand(executable, versionArguments, repository).split(/\r?\n/, 1)[0]
    : null;
  return `${tool}:${executable}@sha256:${executableDigest}${version ? `+${version}` : ""}`;
}

export function observeSystemToolIdentity(tool, repository) {
  switch (tool) {
    case "bash":
      return exactExecutableIdentity("bash", repository, ["--version"]);
    case "env":
      return exactExecutableIdentity("env", repository, ["--version"]);
    case "node":
      return `node@${process.versions.node}`;
    case "npm":
      return `npm@${runIdentityCommand("npm", ["--version"], repository)}`;
    case "pnpm":
      return `pnpm@${runIdentityCommand("pnpm", ["--version"], repository)}`;
    case "git":
      return exactExecutableIdentity("git", repository, ["--version"]);
    case "python3":
      return exactExecutableIdentity("python3", repository, ["--version"]);
    case "script":
      return exactExecutableIdentity("script", repository, ["--version"]);
    case "sh":
      return exactExecutableIdentity("sh", repository);
    case "mkfifo":
      return exactExecutableIdentity("mkfifo", repository);
    case "sleep":
      return exactExecutableIdentity("sleep", repository, ["--version"]);
    case "tar":
      return exactExecutableIdentity("tar", repository, ["--version"]);
    default:
      return null;
  }
}

function observeLocalPackageToolIdentity(repository, tool, expectedIdentity) {
  const packages = {
    oxfmt: { name: "oxfmt", prefix: "oxfmt" },
    oxlint: { name: "oxlint", prefix: "oxlint" },
    "skills-cli": { name: "skills", prefix: "skills" },
  };
  const contract = packages[tool];
  if (!contract) return null;
  const packageDocument = readJson(
    path.join(repository, "node_modules", contract.name, "package.json"),
  );
  const identity = `${contract.prefix}@${packageDocument.version ?? ""}`;
  if (
    packageDocument.name !== contract.name ||
    !/^\d+\.\d+\.\d+$/.test(packageDocument.version ?? "") ||
    (typeof expectedIdentity === "string" &&
      expectedIdentity.length > 0 &&
      identity !== expectedIdentity)
  ) {
    throw new Error(`The installed ${tool} package does not match ${expectedIdentity}.`);
  }
  const executable = fs.realpathSync.native(localToolExecutable(repository, tool));
  const nodeModulesRoot = `${fs.realpathSync.native(path.join(repository, "node_modules"))}${path.sep}`;
  if (!executable.startsWith(nodeModulesRoot) || !fs.statSync(executable).isFile()) {
    throw new Error(`The ${tool} executable is not a repository-local regular file.`);
  }
  return identity;
}

function observeExecutionPlatform(environment) {
  const imageOS = environment.ImageOS ?? null;
  const imageVersion = environment.ImageVersion ?? null;
  return {
    os: process.platform,
    arch: process.arch,
    runnerLabel: "ubuntu-24.04",
    imageOS,
    imageVersion,
  };
}

export function validateExecutionRuntime(runtime, task, repository) {
  requireExactKeys(
    runtime,
    ["schemaVersion", "path", "pathDigest", "toolPaths", "observedTools", "platform"],
    ["structuredEvidenceFile"],
    "task execution runtime",
  );
  if (
    runtime.schemaVersion !== RUNTIME_SCHEMA_VERSION ||
    typeof runtime.path !== "string" ||
    runtime.path.length === 0 ||
    runtime.path.includes("\0") ||
    executionPathDigest(runtime.path) !== runtime.pathDigest
  ) {
    throw new Error("Task execution runtime contains an invalid tool search path witness.");
  }
  if (task.keyMaterial.toolchain.executionPathPolicy !== "validation-execution-path-v2") {
    throw new Error("Task execution runtime contradicts the resolved tool search-path policy.");
  }
  requireObject(runtime.toolPaths, "task execution tool paths");
  const declaredToolSet = new Set(Object.keys(task.keyMaterial.toolchain.tools));
  for (const [tool, executable] of Object.entries(runtime.toolPaths)) {
    if (!declaredToolSet.has(tool)) {
      throw new Error(`Task execution runtime declares an unexpected tool path: ${tool}.`);
    }
    if (typeof executable !== "string" || !path.isAbsolute(executable)) {
      throw new Error(`Task execution tool ${tool} path must be absolute.`);
    }
    const expectedLocalExecutable = localToolExecutable(repository, tool);
    if (
      tool !== "actionlint" &&
      expectedLocalExecutable &&
      path.resolve(executable) !== path.resolve(expectedLocalExecutable)
    ) {
      throw new Error(
        `Task execution tool ${tool} must use the exact repository-local executable.`,
      );
    }
  }
  for (const tool of ["actionlint", "oxfmt", "oxlint", "skills-cli"]) {
    if (declaredToolSet.has(tool) && !runtime.toolPaths[tool]) {
      throw new Error(`Task execution requires the exact resolved ${tool} path.`);
    }
  }
  requireObject(runtime.observedTools, "task execution observed tools");
  const declaredTools = Object.keys(task.keyMaterial.toolchain.tools);
  if (
    Object.keys(runtime.observedTools).sort().join("\0") !== declaredTools.sort().join("\0") ||
    Object.values(runtime.observedTools).some(
      (identity) => typeof identity !== "string" || identity.length === 0,
    )
  ) {
    throw new Error("Task execution tool observations are incomplete or malformed.");
  }
  for (const tool of declaredTools.filter((name) => EXACT_RUNTIME_TOOLS.has(name))) {
    const expectedIdentity = task.keyMaterial.toolchain.tools[tool];
    if (
      typeof expectedIdentity === "string" &&
      expectedIdentity.length > 0 &&
      runtime.observedTools[tool] !== expectedIdentity
    ) {
      throw new Error(`Task execution exact tool ${tool} contradicts the resolved tool policy.`);
    }
  }
  requireExactKeys(
    runtime.platform,
    ["os", "arch", "runnerLabel", "imageOS", "imageVersion"],
    [],
    "task execution platform",
  );
  const keyedPlatform = task.keyMaterial.toolchain.platform;
  if (
    runtime.platform.os !== keyedPlatform.os ||
    runtime.platform.arch !== keyedPlatform.arch ||
    runtime.platform.runnerLabel !== keyedPlatform.runnerLabel ||
    typeof runtime.platform.imageOS !== "string" ||
    runtime.platform.imageOS.length === 0 ||
    typeof runtime.platform.imageVersion !== "string" ||
    runtime.platform.imageVersion.length === 0
  ) {
    throw new Error("Task execution platform does not satisfy the resolved platform policy.");
  }
  if (
    runtime.structuredEvidenceFile !== undefined &&
    (typeof runtime.structuredEvidenceFile !== "string" ||
      !path.isAbsolute(runtime.structuredEvidenceFile))
  ) {
    throw new Error("Task structured-evidence file path must be absolute.");
  }
  return runtime;
}

function validatePrerequisites(task, resolution, prerequisiteOutcomes) {
  const supplied = new Map();
  for (const envelope of prerequisiteOutcomes ?? []) {
    requireExactKeys(
      envelope,
      [
        "schemaVersion",
        "gateId",
        "taskKey",
        "resolutionDigest",
        "candidateFingerprintBefore",
        "candidateFileCountBefore",
        "candidateFingerprintAfter",
        "candidateFileCountAfter",
        "outcome",
      ],
      [],
      "prerequisite task outcome",
    );
    if (supplied.has(envelope.gateId)) {
      throw new Error(`Duplicate prerequisite task outcome: ${envelope.gateId}.`);
    }
    supplied.set(envelope.gateId, envelope);
  }
  const prerequisites = task.gateContract.prerequisites;
  for (const id of prerequisites) {
    const prerequisite = resolution.tasks.find(({ gateId }) => gateId === id);
    if (!prerequisite) throw new Error(`Resolved prerequisite ${id} is missing.`);
    if (prerequisite.status === "reused") continue;
    const envelope = supplied.get(id);
    if (
      !envelope ||
      envelope.schemaVersion !== OUTCOME_SCHEMA_VERSION ||
      envelope.resolutionDigest !== resolution.resolutionDigest ||
      envelope.taskKey !== prerequisite.taskKey ||
      envelope.candidateFingerprintBefore !== resolution.candidateFingerprint ||
      envelope.candidateFingerprintAfter !== resolution.candidateFingerprint ||
      envelope.candidateFileCountBefore !== resolution.candidateFileCount ||
      envelope.candidateFileCountAfter !== resolution.candidateFileCount ||
      envelope.outcome?.status !== "passed"
    ) {
      throw new Error(`Prerequisite ${id} is not proven by an exact successful task outcome.`);
    }
  }
  const unexpected = [...supplied.keys()].filter((id) => !prerequisites.includes(id));
  if (unexpected.length > 0) {
    throw new Error(`Unexpected prerequisite task outcome(s): ${unexpected.join(", ")}.`);
  }
}

function environmentForTask(task, runtime, runtimeRoot) {
  const home = path.join(runtimeRoot, "home");
  const temporary = path.join(runtimeRoot, "tmp");
  fs.mkdirSync(home, { recursive: true, mode: 0o700 });
  fs.mkdirSync(temporary, { recursive: true, mode: 0o700 });
  return sanitizeExecutionEnvironment(
    task.keyMaterial.environment,
    Object.keys(task.keyMaterial.environment),
    {
      PATH: runtime.path,
      HOME: home,
      TMPDIR: temporary,
      TEMP: temporary,
      TMP: temporary,
      ...(runtime.toolPaths["skills-cli"]
        ? { SKILLS_SMOKE_CLI: runtime.toolPaths["skills-cli"] }
        : {}),
      ...(runtime.toolPaths.actionlint ? { ACTIONLINT: runtime.toolPaths.actionlint } : {}),
      ...(runtime.structuredEvidenceFile
        ? { VALIDATION_STRUCTURED_EVIDENCE_FILE: runtime.structuredEvidenceFile }
        : {}),
    },
  );
}

function observeActionlintEvidence(task, runtime) {
  const expectedIdentity = task.keyMaterial.toolchain.tools.actionlint;
  const executable = runtime.toolPaths.actionlint;
  if (!executable) throw new Error("The verified actionlint binary is unavailable.");
  return verifyActionlintBinary(executable, expectedIdentity);
}

function observeSkillsCliEvidence(task, runtime) {
  const expectedIdentity = task.keyMaterial.toolchain.tools["skills-cli"];
  if (!/^skills@\d+\.\d+\.\d+$/.test(expectedIdentity ?? "")) {
    throw new Error("Resolved skills CLI identity must use skills@<exact-version>.");
  }
  const executable = runtime.toolPaths["skills-cli"];
  if (!executable) throw new Error("The exact skills CLI executable is unavailable.");
  const canonicalExecutable = fs.realpathSync.native(executable);
  if (!fs.statSync(canonicalExecutable).isFile()) {
    throw new Error("The skills CLI executable is not a regular file.");
  }
  return {
    identity: expectedIdentity,
    executableDigest: `sha256:${crypto
      .createHash("sha256")
      .update(fs.readFileSync(canonicalExecutable))
      .digest("hex")}`,
  };
}

async function runCommand({ command, cwd, environment, timeoutMs, control }) {
  const started = Date.now();
  const child = spawn(command[0], command.slice(1), {
    cwd,
    env: environment,
    detached: process.platform !== "win32",
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  control.child = child;
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
    if (stdout.length < MAX_CAPTURE_BYTES) stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
    if (stderr.length < MAX_CAPTURE_BYTES) stderr += chunk.toString();
  });
  let timedOut = false;
  let escalationTimer = null;
  const timer = setTimeout(() => {
    timedOut = true;
    terminateProcessGroup(child);
    escalationTimer = setTimeout(() => terminateProcessGroup(child, { signal: "SIGKILL" }), 5_000);
    escalationTimer.unref?.();
  }, timeoutMs);
  const result = await new Promise((resolve) => {
    child.once("error", (error) => resolve({ error }));
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  clearTimeout(timer);
  if (escalationTimer) clearTimeout(escalationTimer);
  let terminationError = null;
  let residualProcessGroup = false;
  try {
    const settlement = await settleDetachedProcessGroup(child, {
      terminationPollMs: 50,
      killPollMs: 25,
      processGroupFailureMessage: (pid) => `Process group ${pid} remained alive after SIGKILL.`,
    });
    residualProcessGroup =
      !result.error &&
      !timedOut &&
      result.code === 0 &&
      !result.signal &&
      !control.receivedSignal &&
      settlement.hadSurvivingProcessGroup;
  } catch (error) {
    terminationError = error;
  }
  control.child = null;
  return {
    ...result,
    durationMs: Date.now() - started,
    stdout,
    stderr,
    timedOut,
    terminationError,
    residualProcessGroup,
  };
}

function failureReason(result, timeoutMs, signal) {
  if (signal) return `validation received ${signal}`;
  if (result.terminationError)
    return `process-group termination failed: ${result.terminationError.message}`;
  if (result.residualProcessGroup) return "process group remained active after successful exit";
  if (result.timedOut) return `timed out after ${timeoutMs}ms`;
  return result.error?.message || `exited with ${result.signal ?? result.code ?? "unknown status"}`;
}

function assertTransportPathOutsideRepository(file, repository, label) {
  const absolute = path.resolve(file);
  const relative = path.relative(repository, absolute);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    throw new Error(`${label} must be outside the candidate repository.`);
  }
  return absolute;
}

function canonicalEnvelope(resolution, task, before, after, outcome) {
  return {
    schemaVersion: OUTCOME_SCHEMA_VERSION,
    gateId: task.gateId,
    taskKey: task.taskKey,
    resolutionDigest: resolution.resolutionDigest,
    candidateFingerprintBefore: before.candidateFingerprint,
    candidateFileCountBefore: before.candidateFileCount,
    candidateFingerprintAfter: after.candidateFingerprint,
    candidateFileCountAfter: after.candidateFileCount,
    outcome,
  };
}

export function createExecutionRuntime(options) {
  requireObject(options, "execution runtime options");
  const resolution = validateResolution(options.resolution);
  const task = resolution.tasks.find(({ gateId }) => gateId === options.gateId);
  if (!task) throw new Error(`Gate ${options.gateId} is not in the task resolution.`);
  const repository = path.resolve(options.repository ?? resolution.repositoryRoot);
  if (repository !== resolution.repositoryRoot) {
    throw new Error("Execution runtime repository contradicts the task resolution.");
  }
  const pathValue = options.environment?.PATH;
  if (typeof pathValue !== "string" || pathValue.length === 0) {
    throw new Error("Execution runtime requires a non-empty PATH.");
  }
  const toolPaths = {};
  const observedTools = {};
  for (const [tool, expectedIdentity] of Object.entries(task.keyMaterial.toolchain.tools)) {
    if (tool === "actionlint") {
      const executable = options.environment?.ACTIONLINT;
      if (typeof executable !== "string" || !path.isAbsolute(executable)) {
        throw new Error("Task execution requires an absolute verified ACTIONLINT binary.");
      }
      const observed = verifyActionlintBinary(executable, expectedIdentity);
      observedTools[tool] = observed.identity;
      toolPaths[tool] = executable;
      continue;
    }
    const systemIdentity = observeSystemToolIdentity(tool, repository);
    const actualIdentity =
      systemIdentity ?? observeLocalPackageToolIdentity(repository, tool, expectedIdentity);
    if (actualIdentity === null)
      throw new Error(`Task execution tool ${tool} identity is unavailable.`);
    if (
      EXACT_RUNTIME_TOOLS.has(tool) &&
      typeof expectedIdentity === "string" &&
      expectedIdentity.length > 0 &&
      actualIdentity !== expectedIdentity
    ) {
      throw new Error(
        `Task execution exact tool ${tool} identity ${actualIdentity} contradicts ${expectedIdentity}.`,
      );
    }
    observedTools[tool] = actualIdentity;
    const executable = localToolExecutable(repository, tool);
    if (executable) toolPaths[tool] = executable;
  }
  return validateExecutionRuntime(
    {
      schemaVersion: RUNTIME_SCHEMA_VERSION,
      path: pathValue,
      pathDigest: executionPathDigest(pathValue),
      toolPaths,
      observedTools,
      platform: observeExecutionPlatform(options.environment ?? {}),
      ...(options.structuredEvidenceFile
        ? { structuredEvidenceFile: path.resolve(options.structuredEvidenceFile) }
        : {}),
    },
    task,
    repository,
  );
}

export async function executeValidationTask(options, control = { receivedSignal: null }) {
  requireObject(options, "task execution options");
  const resolution = validateResolution(options.resolution);
  const repository = path.resolve(options.repository ?? "");
  if (repository !== resolution.repositoryRoot) {
    throw new Error("Task execution repository root contradicts the task resolution.");
  }
  const task = resolution.tasks.find(({ gateId }) => gateId === options.gateId);
  if (!task) throw new Error(`Gate ${options.gateId} is not in the task resolution.`);
  if (task.status === "reused") throw new Error(`Gate ${task.gateId} was already reused.`);
  if (!new Set(["miss", "verify"]).has(task.status)) {
    throw new Error(`Gate ${task.gateId} is not a resolved execution.`);
  }
  validatePrerequisites(task, resolution, options.prerequisiteOutcomes);
  const boundary = validateBoundary(options.beforeFingerprint, resolution);
  const actualBefore = candidateFingerprint(repository);
  if (
    actualBefore.candidateFingerprint !== boundary.candidateFingerprint ||
    actualBefore.candidateFileCount !== boundary.candidateFileCount
  ) {
    throw new Error("The materialized candidate changed before task execution.");
  }
  const outcomeFile = assertTransportPathOutsideRepository(
    options.outcomeFile,
    repository,
    "Task outcome file",
  );
  fs.mkdirSync(path.dirname(outcomeFile), { recursive: true });

  let outcome;
  let after;
  if (options.evidenceOnly) {
    if (task.evidence.kind !== "architecture-compass-accounting-v1") {
      throw new Error("Evidence-only execution is reserved for Architecture Compass aggregation.");
    }
    requireExactKeys(options.evidenceOnly, ["durationMs", "evidence"], [], "evidence-only input");
    after = candidateFingerprint(repository);
    const mutated =
      after.candidateFingerprint !== actualBefore.candidateFingerprint ||
      after.candidateFileCount !== actualBefore.candidateFileCount;
    outcome = createTaskOutcome({
      resolution,
      gateId: task.gateId,
      repository,
      status: mutated ? "failed" : "passed",
      durationMs: options.evidenceOnly.durationMs,
      reason: mutated ? "The materialized candidate changed while assembling evidence." : null,
      exitCode: mutated ? 1 : 0,
      structuredEvidence: options.evidenceOnly.evidence,
    });
  } else {
    if (task.evidence.kind === "architecture-compass-accounting-v1") {
      throw new Error("Architecture Compass must use hosted aggregate evidence-only execution.");
    }
    const runtime = validateExecutionRuntime(options.runtime, task, repository);
    if (runtime.structuredEvidenceFile) {
      assertTransportPathOutsideRepository(
        runtime.structuredEvidenceFile,
        repository,
        "Task structured-evidence file",
      );
    }
    const runtimeParent = path.dirname(outcomeFile);
    const runtimeRoot = fs.mkdtempSync(path.join(runtimeParent, `.task-runtime-${task.gateId}-`));
    const signalHandlers = new Map();
    for (const signal of ["SIGINT", "SIGTERM"]) {
      const handler = () => {
        control.receivedSignal ??= signal;
        if (control.child) {
          const child = control.child;
          terminateProcessGroup(child);
          setTimeout(() => terminateProcessGroup(child, { signal: "SIGKILL" }), 5_000).unref?.();
        }
      };
      signalHandlers.set(signal, handler);
      process.once(signal, handler);
    }
    let result;
    let policyFailure = null;
    try {
      const environment = environmentForTask(task, runtime, runtimeRoot);
      let preflightDurationMs = 0;
      const toolEvidence = {};
      if (runtime.toolPaths.actionlint) {
        try {
          toolEvidence.actionlint = observeActionlintEvidence(task, runtime);
        } catch (error) {
          policyFailure = error.message;
          result = {
            code: 1,
            signal: null,
            durationMs: 0,
            stdout: "",
            stderr: "",
            timedOut: false,
            terminationError: null,
            residualProcessGroup: false,
          };
        }
      }
      if (!policyFailure && runtime.toolPaths["skills-cli"]) {
        const identity = task.keyMaterial.toolchain.tools["skills-cli"];
        const expectedVersion =
          identity === null ? null : /^skills@(\d+\.\d+\.\d+)$/.exec(identity ?? "")?.[1];
        if (identity !== null && !expectedVersion) {
          throw new Error("Resolved skills CLI identity must use skills@<exact-version>.");
        }
        const preflight = await runCommand({
          command: [runtime.toolPaths["skills-cli"], "--version"],
          cwd: repository,
          environment,
          timeoutMs: Math.min(task.gateContract.timeoutMs, 30_000),
          control,
        });
        preflightDurationMs = preflight.durationMs;
        const actualVersion = preflight.stdout.match(/\b(\d+\.\d+\.\d+)\b/)?.[1] ?? null;
        if (
          control.receivedSignal ||
          preflight.error ||
          preflight.timedOut ||
          preflight.terminationError ||
          preflight.residualProcessGroup ||
          preflight.code !== 0 ||
          preflight.signal ||
          actualVersion === null ||
          (expectedVersion !== null && actualVersion !== expectedVersion)
        ) {
          policyFailure = `The exact skills CLI version does not match ${identity ?? "an observed version"}.`;
          result = preflight;
        } else {
          toolEvidence["skills-cli"] = observeSkillsCliEvidence(task, runtime);
        }
      }
      if (!policyFailure) {
        result = await runCommand({
          command: task.keyMaterial.expandedCommand,
          cwd: repository,
          environment,
          timeoutMs: task.gateContract.timeoutMs,
          control,
        });
        result.durationMs += preflightDurationMs;
      }
      result.toolEvidence = toolEvidence;
    } finally {
      for (const [signal, handler] of signalHandlers) process.removeListener(signal, handler);
      fs.rmSync(runtimeRoot, { recursive: true, force: true });
    }
    const passed =
      !policyFailure &&
      !control.receivedSignal &&
      !result.error &&
      !result.timedOut &&
      !result.terminationError &&
      !result.residualProcessGroup &&
      result.code === 0 &&
      !result.signal;
    after = candidateFingerprint(repository);
    const mutated =
      after.candidateFingerprint !== actualBefore.candidateFingerprint ||
      after.candidateFileCount !== actualBefore.candidateFileCount;
    let structuredEvidence;
    if (passed && runtime.structuredEvidenceFile) {
      structuredEvidence = readJson(runtime.structuredEvidenceFile);
    }
    outcome = createTaskOutcome({
      resolution,
      gateId: task.gateId,
      repository,
      status: passed && !mutated ? "passed" : "failed",
      durationMs: result.durationMs,
      reason: mutated
        ? "The materialized candidate changed during task execution."
        : passed
          ? null
          : (policyFailure ??
            failureReason(result, task.gateContract.timeoutMs, control.receivedSignal)),
      exitCode: passed ? 0 : (result.code ?? 1),
      stdout: result.stdout,
      stderr: result.stderr,
      toolEvidence: result.toolEvidence,
      structuredEvidence,
    });
  }

  const envelope = canonicalEnvelope(resolution, task, actualBefore, after, outcome);
  writeJsonAtomic(outcomeFile, envelope);
  return { failed: outcome.status !== "passed", envelope };
}

function parseArguments(argv) {
  const options = { repository: process.cwd(), prerequisiteOutcomes: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--prerequisite-outcome") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
      options.prerequisiteOutcomes.push(value);
      index += 1;
      continue;
    }
    if (
      new Set([
        "--resolution",
        "--gate-id",
        "--repository",
        "--outcome",
        "--runtime",
        "--before-fingerprint",
        "--evidence-only",
        "--duration-ms",
        "--write-runtime",
      ]).has(argument)
    ) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
      options[argument.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  if (!options.resolution || !options.gateId) {
    throw new Error("--resolution and --gate-id are required.");
  }
  if (options.writeRuntime) return options;
  if (!options.outcome || !options.beforeFingerprint) {
    throw new Error("--outcome and --before-fingerprint are required for task execution.");
  }
  if (!options.runtime && !options.evidenceOnly) {
    throw new Error("--runtime is required unless --evidence-only is used.");
  }
  if (options.runtime && options.evidenceOnly) {
    throw new Error("--runtime and --evidence-only are mutually exclusive.");
  }
  return options;
}

async function main(argv) {
  const options = parseArguments(argv);
  const resolution = readJson(options.resolution);
  if (options.writeRuntime) {
    writeJsonAtomic(
      options.writeRuntime,
      createExecutionRuntime({
        resolution,
        gateId: options.gateId,
        repository: path.resolve(options.repository),
        environment: process.env,
      }),
    );
    return;
  }
  const result = await executeValidationTask({
    resolution,
    gateId: options.gateId,
    repository: path.resolve(options.repository),
    outcomeFile: path.resolve(options.outcome),
    beforeFingerprint: readJson(options.beforeFingerprint),
    prerequisiteOutcomes: options.prerequisiteOutcomes.map(readJson),
    ...(options.evidenceOnly
      ? {
          evidenceOnly: {
            durationMs: Number(options.durationMs ?? 0),
            evidence: readJson(options.evidenceOnly),
          },
        }
      : { runtime: readJson(options.runtime) }),
  });
  if (result.failed) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`Could not execute validation task: ${error.message}`);
    process.exitCode = 1;
  });
}
