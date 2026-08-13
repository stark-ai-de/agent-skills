#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readJson, validateManifest, validatePlan } from "./validation-contract.mjs";
import { validateResolution } from "./validation-task-graph.mjs";

function parseArguments(argv) {
  const options = { repository: process.cwd(), timeoutMs: 600000 };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (
      new Set(["--plan", "--resolution", "--repository", "--timeout-ms", "--gate-id"]).has(argument)
    ) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
      options[argument.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  if (!options.plan && !options.resolution) {
    throw new Error("--plan or --resolution is required.");
  }
  if (options.plan && options.resolution) {
    throw new Error("--plan and --resolution are mutually exclusive.");
  }
  if (options.gateId && !options.resolution) {
    throw new Error("--gate-id requires --resolution.");
  }
  options.timeoutMs = Number(options.timeoutMs);
  if (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new Error("--timeout-ms must be a positive integer.");
  }
  return options;
}

export function selectedMissInstallProfiles(resolution, manifest, gateId = null) {
  const validated = validateResolution(resolution, manifest);
  if (gateId !== null) {
    const task = validated.tasks.find((candidate) => candidate.gateId === gateId);
    if (!task) throw new Error(`Gate ${gateId} is not in the task resolution.`);
    if (task.status === "reused") throw new Error(`Gate ${gateId} was already reused.`);
    if (!new Set(["miss", "verify"]).has(task.status)) {
      throw new Error(`Gate ${gateId} is not a resolved task miss or verification.`);
    }
    return [...task.installProfiles].sort();
  }
  return [
    ...new Set(
      validated.tasks
        .filter(({ status }) => status !== "reused")
        .flatMap(({ installProfiles }) => installProfiles),
    ),
  ].sort();
}

export function installValidationDependencies(options) {
  const manifest = validateManifest(
    readJson(path.join(path.dirname(fileURLToPath(import.meta.url)), "validation-manifest.json")),
  );
  let profiles;
  if (options.resolution) {
    profiles = new Set(
      selectedMissInstallProfiles(readJson(options.resolution), manifest, options.gateId ?? null),
    );
  } else {
    const plan = validatePlan(readJson(options.plan), manifest, "effective plan", {
      requireCandidatePlanDigest: true,
    });
    profiles = new Set(plan.installProfiles ?? []);
  }
  const unknown = [...profiles].filter((profile) => !new Set(["root", "site"]).has(profile));
  if (unknown.length) throw new Error(`Unknown install profile(s): ${unknown.join(", ")}`);
  if (profiles.size === 0) {
    console.log("No validation dependency profile selected.");
  } else {
    const arguments_ = [];
    if (profiles.has("root")) arguments_.push("--filter", "agent-skills");
    if (profiles.has("site")) arguments_.push("--filter", "agent-skills-site");
    arguments_.push("--fail-if-no-match", "install", "--frozen-lockfile", "--prefer-offline");
    const result = spawnSync("pnpm", arguments_, {
      cwd: path.resolve(options.repository),
      stdio: "inherit",
      timeout: options.timeoutMs,
      killSignal: "SIGKILL",
    });
    if (result.error?.code === "ETIMEDOUT") {
      throw new Error(`pnpm install timed out after ${options.timeoutMs}ms.`);
    }
    if (result.error) throw result.error;
    if (result.signal) throw new Error(`pnpm install exited on ${result.signal}.`);
    if (result.status !== 0) process.exitCode = result.status ?? 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    installValidationDependencies(parseArguments(process.argv.slice(2)));
  } catch (error) {
    console.error(`Could not install validation dependencies: ${error.message}`);
    process.exitCode = 1;
  }
}
