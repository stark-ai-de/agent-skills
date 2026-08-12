#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readJson, validateManifest, validatePlan } from "./validation-contract.mjs";

function parseArguments(argv) {
  const options = { repository: process.cwd(), timeoutMs: 600000 };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (new Set(["--plan", "--repository", "--timeout-ms"]).has(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
      options[argument.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  if (!options.plan) throw new Error("--plan is required.");
  options.timeoutMs = Number(options.timeoutMs);
  if (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new Error("--timeout-ms must be a positive integer.");
  }
  return options;
}

try {
  const options = parseArguments(process.argv.slice(2));
  const manifest = validateManifest(
    readJson(path.join(path.dirname(fileURLToPath(import.meta.url)), "validation-manifest.json")),
  );
  const plan = validatePlan(readJson(options.plan), manifest, "effective plan", {
    requireCandidatePlanDigest: true,
  });
  const profiles = new Set(plan.installProfiles ?? []);
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
} catch (error) {
  console.error(`Could not install validation dependencies: ${error.message}`);
  process.exitCode = 1;
}
