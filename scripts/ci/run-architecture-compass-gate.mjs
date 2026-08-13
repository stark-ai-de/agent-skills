#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { settleDetachedProcessGroup } from "../validation/lib/process-group.mjs";
import {
  createSealedBaselineCapsule,
  hashBaselineCapsule,
  removeSealedBaselineCapsule,
} from "../validation/architecture-compass/fixture-capsule.mjs";
import {
  architectureFixtureEntries,
  runFixtureCoordinator,
} from "../validation/architecture-compass/fixture-coordinator.mjs";
import {
  aggregateHostedShardReports,
  createHostedShardPlan,
  resolveLocalWorkerCount,
} from "../validation/architecture-compass/hosted-shards.mjs";
import { sanitizeExecutionEnvironment, validateResolution } from "./validation-task-graph.mjs";
import { validateExecutionRuntime } from "./run-validation-task.mjs";

const inventoryRelative =
  "scripts/validation/architecture-compass/test-validator-case-inventory.json";

function readJson(file, label) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
  } catch (error) {
    throw new Error(`${label} is unavailable or malformed: ${error.message}`);
  }
}

function writeJsonAtomic(file, value) {
  const target = path.resolve(file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, target);
}

function requireObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value;
}

function taskExecutionEnvironment(options, operation) {
  const resolutionFile = options.get("--resolution");
  const runtimeFile = options.get("--runtime");
  if ((resolutionFile === undefined) !== (runtimeFile === undefined)) {
    throw new Error("--resolution and --runtime must be supplied together.");
  }
  if (resolutionFile === undefined) {
    return {
      environment: sanitizeExecutionEnvironment(process.env, [
        "PATH",
        "HOME",
        "TMPDIR",
        "TMP",
        "TEMP",
      ]),
      cleanup() {},
    };
  }

  const resolution = validateResolution(
    readJson(resolutionFile, "Architecture Compass task resolution"),
  );
  const task = resolution.tasks.find(({ gateId }) => gateId === "architecture-compass");
  if (!task || task.status === "reused") {
    throw new Error("Architecture Compass execution requires a selected cache-miss task.");
  }
  const runtime = requireObject(
    readJson(runtimeFile, "Architecture Compass execution runtime"),
    "Architecture Compass execution runtime",
  );
  validateExecutionRuntime(runtime, task, resolution.repositoryRoot);
  if (
    operation === "shard" &&
    (options.get("--workers") ?? "auto") !==
      task.keyMaterial.environment.ARCHITECTURE_FIXTURE_WORKERS
  ) {
    throw new Error("Architecture Compass shard worker mode contradicts its resolved task key.");
  }

  const environmentRoot = fs.mkdtempSync(
    path.join(path.dirname(path.resolve(runtimeFile)), `architecture-${operation}-environment-`),
  );
  const home = path.join(environmentRoot, "home");
  const temporary = path.join(environmentRoot, "tmp");
  fs.mkdirSync(home, { recursive: true, mode: 0o700 });
  fs.mkdirSync(temporary, { recursive: true, mode: 0o700 });
  return {
    environment: sanitizeExecutionEnvironment(
      task.keyMaterial.environment,
      Object.keys(task.keyMaterial.environment),
      {
        PATH: runtime.path,
        HOME: home,
        TMPDIR: temporary,
        TMP: temporary,
        TEMP: temporary,
      },
    ),
    cleanup() {
      fs.rmSync(environmentRoot, { recursive: true, force: true });
    },
  };
}

async function withProcessEnvironment(environment, callback) {
  const previous = { ...process.env };
  for (const name of Object.keys(process.env)) delete process.env[name];
  Object.assign(process.env, environment);
  try {
    return await callback();
  } finally {
    for (const name of Object.keys(process.env)) delete process.env[name];
    Object.assign(process.env, previous);
  }
}

function parseOptions(argv) {
  const options = new Map();
  const flags = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--force-ordinary-copy") {
      flags.add(argument);
      continue;
    }
    if (!argument.startsWith("--") || argv[index + 1] === undefined) {
      throw new Error(`Invalid Architecture Compass gate argument: ${argument}`);
    }
    const value = argv[index + 1];
    index += 1;
    if (argument === "--shard-report") {
      const reports = options.get(argument) ?? [];
      reports.push(value);
      options.set(argument, reports);
    } else if (options.has(argument)) {
      throw new Error(`Duplicate Architecture Compass gate argument: ${argument}`);
    } else {
      options.set(argument, value);
    }
  }
  return { options, flags };
}

function required(options, name) {
  const value = options.get(name);
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function assertAllowed(options, flags, allowedOptions, allowedFlags = []) {
  for (const name of options.keys()) {
    if (!allowedOptions.includes(name))
      throw new Error(`Unknown Architecture Compass option: ${name}`);
  }
  for (const name of flags) {
    if (!allowedFlags.includes(name)) throw new Error(`Unknown Architecture Compass flag: ${name}`);
  }
}

function loadInventory(root) {
  return readJson(path.join(root, inventoryRelative), "Architecture Compass frozen inventory");
}

async function defaultSharedPreflight(root) {
  const { runSharedArchitecturePreflight } =
    await import("../validation/architecture-compass/test-validator.mjs");
  return await runSharedArchitecturePreflight(root);
}

async function defaultCoordinatorRunner(options) {
  return await runFixtureCoordinator(options);
}

async function createPlan(root, options, flags, sharedPreflight) {
  assertAllowed(
    options,
    flags,
    ["--task-key", "--plan-file", "--temporary-parent", "--resolution", "--runtime"],
    ["--force-ordinary-copy"],
  );
  const taskKey = required(options, "--task-key");
  const planFile = required(options, "--plan-file");
  const temporaryParent = path.resolve(options.get("--temporary-parent") ?? os.tmpdir());
  const temporaryRoot = fs.mkdtempSync(path.join(temporaryParent, "architecture-hosted-plan-"));
  const capsuleRoot = path.join(temporaryRoot, "sealed-baseline");
  const forceOrdinaryCopy = flags.has("--force-ordinary-copy");
  const copyFile = forceOrdinaryCopy
    ? (source, destination, mode) => {
        if (mode === fs.constants.COPYFILE_FICLONE) {
          const error = new Error("copy-on-write disabled");
          error.code = "ENOTSUP";
          throw error;
        }
        fs.copyFileSync(source, destination, 0);
      }
    : fs.copyFileSync;
  try {
    const baseline = createSealedBaselineCapsule({
      sourceRoot: root,
      destinationRoot: capsuleRoot,
      entries: architectureFixtureEntries,
      copyFile,
    });
    const preflightEvidence = await sharedPreflight(capsuleRoot);
    const baselineAfterPreflightDigest = hashBaselineCapsule(capsuleRoot);
    if (baselineAfterPreflightDigest !== baseline.digest) {
      throw new Error("Architecture Compass sealed plan baseline changed during preflight.");
    }
    const plan = createHostedShardPlan({
      inventory: loadInventory(root),
      taskKey,
      baselineDigest: baselineAfterPreflightDigest,
      preflightEvidence,
    });
    writeJsonAtomic(planFile, plan);
  } finally {
    removeSealedBaselineCapsule(capsuleRoot);
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

async function runShard(root, options, flags, coordinatorRunner) {
  assertAllowed(
    options,
    flags,
    [
      "--plan-file",
      "--shard-index",
      "--report-file",
      "--workers",
      "--temporary-parent",
      "--resolution",
      "--runtime",
    ],
    ["--force-ordinary-copy"],
  );
  const plan = readJson(required(options, "--plan-file"), "Architecture Compass hosted plan");
  const canonical = createHostedShardPlan({
    inventory: loadInventory(root),
    taskKey: plan.taskKey,
    baselineDigest: plan.baselineDigest,
    preflightEvidence: plan.preflightEvidence,
    hostedShardCount: plan.hostedShardCount,
  });
  if (JSON.stringify(plan) !== JSON.stringify(canonical)) {
    throw new Error("Architecture Compass hosted plan is contradictory.");
  }
  const hostedShardIndex = Number(required(options, "--shard-index"));
  if (
    !Number.isSafeInteger(hostedShardIndex) ||
    hostedShardIndex < 0 ||
    hostedShardIndex >= canonical.hostedShardCount
  ) {
    throw new Error("--shard-index must identify one of the three planned shards.");
  }
  const configured = options.get("--workers") ?? "auto";
  const workerCount = resolveLocalWorkerCount({
    configured,
    assignedCaseCount: canonical.shards[hostedShardIndex].caseOrdinals.length,
  });
  await coordinatorRunner({
    root,
    workerCount,
    hostedShardIndex,
    hostedShardCount: canonical.hostedShardCount,
    taskKey: canonical.taskKey,
    taskDigest: canonical.taskDigest,
    expectedPreflightEvidenceDigest: canonical.preflightEvidenceDigest,
    expectedBaselineDigest: canonical.baselineDigest,
    temporaryParent: path.resolve(options.get("--temporary-parent") ?? os.tmpdir()),
    reportFile: path.resolve(required(options, "--report-file")),
    forceOrdinaryCopy: flags.has("--force-ordinary-copy"),
  });
}

async function aggregateShards(root, options, flags) {
  assertAllowed(options, flags, [
    "--plan-file",
    "--report-file",
    "--shard-report",
    "--resolution",
    "--runtime",
  ]);
  const plan = readJson(required(options, "--plan-file"), "Architecture Compass hosted plan");
  const reportFiles = options.get("--shard-report");
  if (!Array.isArray(reportFiles) || reportFiles.length !== 3) {
    throw new Error("Exactly three --shard-report values are required.");
  }
  const aggregate = aggregateHostedShardReports({
    inventory: loadInventory(root),
    plan,
    reports: reportFiles.map((file) => readJson(file, "Architecture Compass shard report")),
  });
  writeJsonAtomic(required(options, "--report-file"), aggregate.gateEvidence);
}

async function runLocal(root, argv) {
  const { options, flags } = parseOptions(argv);
  assertAllowed(options, flags, [], ["--force-ordinary-copy"]);
  const commands = [
    [process.execPath, "scripts/validate-architecture-compass.mjs"],
    [process.execPath, "scripts/validation/architecture-compass/test-validator.mjs"],
  ];
  const localEnvironment = sanitizeExecutionEnvironment(
    process.env,
    ["PATH", "HOME", "TMPDIR", "TMP", "TEMP"],
    {
      ARCHITECTURE_FIXTURE_WORKERS: "1",
      ARCHITECTURE_FIXTURE_FORCE_COPY: flags.has("--force-ordinary-copy") ? "1" : "0",
    },
  );
  let activeChild = null;
  let receivedSignal = null;
  let activeSettlement = null;
  let rejectSettlementFailure;
  const settlementFailure = new Promise((_, reject) => {
    rejectSettlementFailure = reject;
  });
  const settle = async (child) =>
    await settleDetachedProcessGroup(child, {
      terminationGraceMs: 5000,
      killGraceMs: 5000,
      terminationPollMs: 50,
      killPollMs: 50,
      processGroupLabel: "Architecture Compass gate process group",
    });
  const beginSettlement = (child) => {
    activeSettlement ??= settle(child);
    activeSettlement.catch(rejectSettlementFailure);
    return activeSettlement;
  };
  const signalHandlers = new Map(
    ["SIGINT", "SIGTERM"].map((signal) => [
      signal,
      () => {
        receivedSignal ??= signal;
        if (activeChild) beginSettlement(activeChild);
      },
    ]),
  );
  for (const [signal, handler] of signalHandlers) process.once(signal, handler);
  try {
    for (const command of commands) {
      if (receivedSignal) break;
      const child = spawn(command[0], command.slice(1), {
        cwd: root,
        env: localEnvironment,
        detached: process.platform !== "win32",
        shell: false,
        stdio: "inherit",
      });
      activeSettlement = null;
      activeChild = child;
      if (receivedSignal) beginSettlement(child);
      const completion = new Promise((resolve) => {
        let spawnError = null;
        child.once("error", (error) => {
          spawnError = error;
        });
        child.once("close", (code, signal) => resolve({ code, signal, error: spawnError }));
      });
      const result = await Promise.race([completion, settlementFailure]);
      const settlement = await beginSettlement(child);
      activeChild = null;
      if (receivedSignal) break;
      if (result.error) throw result.error;
      if (result.code !== 0 || result.signal) {
        throw new Error(
          `Architecture Compass gate command failed: ${result.signal ?? result.code ?? "unknown status"}`,
        );
      }
      if (settlement.hadSurvivingProcessGroup) {
        throw new Error(
          "Architecture Compass gate command left its process group active after successful leader exit.",
        );
      }
    }
  } finally {
    if (activeChild) {
      try {
        await beginSettlement(activeChild);
      } catch (error) {
        console.error(`Architecture Compass gate cleanup failed: ${error.message}`);
        process.exitCode = 1;
      }
    }
    for (const [signal, handler] of signalHandlers) process.removeListener(signal, handler);
  }
  if (receivedSignal) process.kill(process.pid, receivedSignal);
}

export async function runArchitectureGate(
  argv = process.argv.slice(2),
  root = process.cwd(),
  { sharedPreflight = defaultSharedPreflight, coordinatorRunner = defaultCoordinatorRunner } = {},
) {
  const [operation = "local", ...operationArguments] = argv;
  if (operation === "local") return await runLocal(path.resolve(root), operationArguments);
  const { options, flags } = parseOptions(operationArguments);
  if (!new Set(["plan", "shard", "aggregate"]).has(operation)) {
    throw new Error(`Unknown Architecture Compass gate operation: ${operation}`);
  }
  const resolvedRoot = path.resolve(root);
  const execution = taskExecutionEnvironment(options, operation);
  try {
    return await withProcessEnvironment(execution.environment, async () => {
      if (operation === "plan") {
        return await createPlan(resolvedRoot, options, flags, sharedPreflight);
      }
      if (operation === "shard") {
        return await runShard(resolvedRoot, options, flags, (coordinatorOptions) =>
          coordinatorRunner({
            ...coordinatorOptions,
            executionEnvironment: execution.environment,
          }),
        );
      }
      return await aggregateShards(resolvedRoot, options, flags);
    });
  } finally {
    execution.cleanup();
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    await runArchitectureGate();
  } catch (error) {
    console.error(`Architecture Compass gate failed: ${error.message}`);
    process.exitCode = 1;
  }
}
