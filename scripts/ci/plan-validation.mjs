#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (
      new Set([
        "--manifest",
        "--changes",
        "--base-sha",
        "--candidate-sha",
        "--output",
        "--event",
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
  for (const required of ["manifest", "changes", "candidateSha", "output", "event"]) {
    if (!options[required])
      throw new Error(
        `--${required.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} is required.`,
      );
  }
  options.baseSha ??= "";
  return options;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function digestJson(value) {
  return `sha256:${crypto
    .createHash("sha256")
    .update(`${JSON.stringify(canonicalize(value))}\n`)
    .digest("hex")}`;
}

function matches(file, pattern) {
  let expression = "^";
  for (let index = 0; index < pattern.length; ) {
    if (pattern.startsWith("**/", index)) {
      expression += "(?:.*/)?";
      index += 3;
    } else if (pattern.startsWith("**", index)) {
      expression += ".*";
      index += 2;
    } else if (pattern[index] === "*") {
      expression += "[^/]*";
      index += 1;
    } else {
      expression += pattern[index].replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
      index += 1;
    }
  }
  return new RegExp(`${expression}$`).test(file);
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function contractPath(input) {
  return typeof input === "string" ? input : input.path;
}

function selectionPatterns(gate, manifest) {
  const declared = gate.selection?.paths ?? gate.paths;
  if (manifest.schemaVersion !== 2 || gate.selection.deriveFromExecutionInputs !== true) {
    return declared;
  }
  return uniqueSorted([
    ...declared,
    ...gate.execution.entrypoints.map(contractPath),
    ...gate.execution.helpers.map(contractPath),
    ...gate.execution.workspaceInputs.map(contractPath),
    ...gate.execution.packageProfiles.flatMap((profile) =>
      manifest.packageProfiles[profile].inputs.map(contractPath),
    ),
  ]);
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  const manifest = JSON.parse(fs.readFileSync(options.manifest, "utf8"));
  const changes = JSON.parse(fs.readFileSync(options.changes, "utf8"));
  if (!new Set([1, 2]).has(manifest.schemaVersion) || !Array.isArray(manifest.gates)) {
    throw new Error("Unsupported validation manifest.");
  }
  if (!Array.isArray(changes.entries)) throw new Error("Changed-path input must contain entries.");

  const changedPaths = uniqueSorted(
    changes.entries.flatMap((entry) => {
      if (!Array.isArray(entry.paths) || entry.paths.some((value) => typeof value !== "string")) {
        throw new Error("Every changed-path entry must contain string paths.");
      }
      return entry.paths;
    }),
  );
  const allGateIds = manifest.gates.map((gate) => gate.id);
  const manifestDigest = digestJson(manifest);
  let scope = options.event === "pull_request" ? "affected" : "full";
  const reasons = [];

  if (scope === "full") reasons.push(`${options.event} requires full validation`);
  for (const file of changedPaths) {
    if (manifest.globalInvalidators.some((pattern) => matches(file, pattern))) {
      scope = "full";
      reasons.push(`global validation input changed: ${file}`);
    } else if (!manifest.knownPaths.some((pattern) => matches(file, pattern))) {
      scope = "full";
      reasons.push(`unclassified path: ${file}`);
    }
  }

  const selected = new Set();
  if (scope === "full") {
    for (const id of allGateIds) selected.add(id);
  } else {
    for (const gate of manifest.gates) {
      const selectionPaths = selectionPatterns(gate, manifest);
      if (changedPaths.some((file) => selectionPaths.some((pattern) => matches(file, pattern)))) {
        selected.add(gate.id);
      }
    }
    if (selected.size === 0) {
      scope = "full";
      reasons.push("no owning gate matched the change set");
      for (const id of allGateIds) selected.add(id);
    } else {
      reasons.push(`selected ${selected.size} affected gate(s)`);
    }
  }

  let prerequisiteAdded = true;
  while (prerequisiteAdded) {
    prerequisiteAdded = false;
    for (const gate of manifest.gates) {
      if (!selected.has(gate.id)) continue;
      for (const prerequisite of gate.prerequisites) {
        if (!selected.has(prerequisite)) {
          selected.add(prerequisite);
          prerequisiteAdded = true;
        }
      }
    }
  }

  const selectedGates = allGateIds.filter((id) => selected.has(id));
  const installProfiles = uniqueSorted(
    manifest.gates
      .filter((gate) => selected.has(gate.id))
      .flatMap((gate) => gate.execution?.packageProfiles ?? gate.installProfiles),
  );
  const plan = {
    schemaVersion: 1,
    scope,
    reason: uniqueSorted(reasons).join("; "),
    baseSha: options.baseSha,
    candidateSha: options.candidateSha,
    changedPaths,
    selectedGates,
    installProfiles,
    manifestDigest,
    basePlanDigest: null,
    candidatePlanDigest: null,
  };
  fs.mkdirSync(path.dirname(path.resolve(options.output)), { recursive: true });
  fs.writeFileSync(options.output, `${JSON.stringify(canonicalize(plan))}\n`, { mode: 0o600 });
}

try {
  main();
} catch (error) {
  console.error(`Validation planning failed: ${error.message}`);
  process.exitCode = 1;
}
