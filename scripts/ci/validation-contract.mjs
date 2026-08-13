import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const PLAN_SCHEMA_VERSION = 1;
export const MANIFEST_SCHEMA_VERSION = 2;
export const REPORT_SCHEMA_VERSION = 2;
export const TASK_KEY_SCHEMA_VERSION = 1;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireExactKeys(value, required, optional, label) {
  if (!isPlainObject(value)) throw new Error(`${label} must be an object.`);
  const allowed = new Set([...required, ...optional]);
  const missing = required.filter((field) => !Object.hasOwn(value, field));
  const unknown = Object.keys(value).filter((field) => !allowed.has(field));
  if (missing.length > 0 || unknown.length > 0) {
    throw new Error(
      `${label} fields are invalid (missing: ${missing.join(", ") || "none"}; unknown: ${unknown.join(", ") || "none"}).`,
    );
  }
}

function requireUniqueStringArray(value, label, { allowEmpty = true } = {}) {
  if (
    !Array.isArray(value) ||
    (!allowEmpty && value.length === 0) ||
    value.some((item) => typeof item !== "string" || item.length === 0)
  ) {
    throw new Error(`${label} must be ${allowEmpty ? "a" : "a non-empty"} string array.`);
  }
  if (new Set(value).size !== value.length) throw new Error(`${label} contains duplicates.`);
}

function requireInputArray(value, label, { allowEmpty = true } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new Error(`${label} must be ${allowEmpty ? "an" : "a non-empty"} input array.`);
  }
  const paths = [];
  for (const [index, input] of value.entries()) {
    if (typeof input === "string") {
      if (input.length === 0) throw new Error(`${label}[${index}] path must not be empty.`);
      paths.push(input);
      continue;
    }
    requireExactKeys(input, ["path", "allowEmpty"], [], `${label}[${index}]`);
    if (typeof input.path !== "string" || input.path.length === 0 || input.allowEmpty !== true) {
      throw new Error(`${label}[${index}] requires a path and explicit allowEmpty: true.`);
    }
    paths.push(input.path);
  }
  if (new Set(paths).size !== paths.length) throw new Error(`${label} contains duplicate paths.`);
}

function validateEvidenceContract(evidence, gateId) {
  if (!isPlainObject(evidence) || typeof evidence.kind !== "string") {
    throw new Error(`${gateId}: evidence must declare a kind.`);
  }
  const label = `${gateId}: evidence`;
  switch (evidence.kind) {
    case "exit-code":
    case "pinned-actionlint-exit-code":
    case "smoke-candidate-and-cli":
    case "output-tree":
    case "release-metadata":
      requireExactKeys(evidence, ["kind"], [], label);
      break;
    case "capability-complete-exit-code":
      requireExactKeys(
        evidence,
        ["kind", "requiredCapabilities", "outputMarkers"],
        ["forbiddenOutputMarkers"],
        label,
      );
      requireUniqueStringArray(evidence.requiredCapabilities, `${label}.requiredCapabilities`, {
        allowEmpty: false,
      });
      if (!isPlainObject(evidence.outputMarkers)) {
        throw new Error(`${label}.outputMarkers must be an object.`);
      }
      if (
        JSON.stringify(Object.keys(evidence.outputMarkers).sort()) !==
          JSON.stringify([...evidence.requiredCapabilities].sort()) ||
        Object.values(evidence.outputMarkers).some(
          (marker) => typeof marker !== "string" || marker.length === 0,
        )
      ) {
        throw new Error(
          `${label}.outputMarkers must bind one non-empty observed marker per capability.`,
        );
      }
      if (evidence.forbiddenOutputMarkers !== undefined) {
        requireUniqueStringArray(
          evidence.forbiddenOutputMarkers,
          `${label}.forbiddenOutputMarkers`,
          { allowEmpty: false },
        );
      }
      break;
    case "architecture-compass-accounting-v1":
      requireExactKeys(
        evidence,
        ["kind", "expectedCaseCount", "expectedHostedShardCount"],
        [],
        label,
      );
      if (evidence.expectedCaseCount !== 325 || evidence.expectedHostedShardCount !== 3) {
        throw new Error(`${label} must bind the audited 325 cases and three hosted shards.`);
      }
      break;
    default:
      throw new Error(`${gateId}: unsupported evidence kind ${evidence.kind}.`);
  }
}

function requireDigestOrNull(value, label) {
  if (value !== null && !/^sha256:[a-f0-9]{64}$/.test(value ?? "")) {
    throw new Error(`${label} must be null or a SHA-256 digest.`);
  }
}

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

export function canonicalJson(value) {
  return `${JSON.stringify(canonicalize(value))}\n`;
}

export function digestJson(value) {
  return `sha256:${crypto.createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function writeJsonAtomic(file, value) {
  const destination = path.resolve(file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp-${process.pid}-${crypto.randomBytes(6).toString("hex")}`;
  fs.writeFileSync(temporary, canonicalJson(value), { mode: 0o600 });
  fs.renameSync(temporary, destination);
}

export function validateManifest(manifest) {
  if (
    !isPlainObject(manifest) ||
    !new Set([1, MANIFEST_SCHEMA_VERSION]).has(manifest.schemaVersion)
  ) {
    throw new Error(
      `Unsupported validation manifest schema: ${manifest?.schemaVersion ?? "missing"}`,
    );
  }
  if (!Array.isArray(manifest.gates) || manifest.gates.length === 0) {
    throw new Error("Validation manifest must declare gates.");
  }
  requireUniqueStringArray(manifest.globalInvalidators, "globalInvalidators");
  requireUniqueStringArray(manifest.knownPaths, "knownPaths", { allowEmpty: false });
  if (manifest.schemaVersion === MANIFEST_SCHEMA_VERSION) {
    requireExactKeys(
      manifest,
      [
        "schemaVersion",
        "taskKeySchemaVersion",
        "packageProfiles",
        "globalInvalidators",
        "knownPaths",
        "gates",
      ],
      [],
      "schema 2 validation manifest",
    );
    if (!isPlainObject(manifest.packageProfiles)) {
      throw new Error("Schema 2 validation manifest must declare packageProfiles.");
    }
    for (const [profile, contract] of Object.entries(manifest.packageProfiles)) {
      if (!new Set(["root", "site"]).has(profile) || !isPlainObject(contract)) {
        throw new Error(`Unknown package profile contract: ${profile}`);
      }
      requireExactKeys(contract, ["inputs"], [], `${profile}: package profile`);
      requireInputArray(contract.inputs, `${profile}: package profile inputs`, {
        allowEmpty: false,
      });
    }
  }
  const ids = new Set();
  for (const [gateIndex, gate] of manifest.gates.entries()) {
    if (!isPlainObject(gate) || !/^[a-z][a-z0-9-]*$/.test(gate.id ?? "")) {
      throw new Error("Every validation gate needs a stable kebab-case id.");
    }
    if (ids.has(gate.id)) throw new Error(`Duplicate validation gate: ${gate.id}`);
    ids.add(gate.id);
    if (
      !Array.isArray(gate.command) ||
      gate.command.length === 0 ||
      gate.command.some((part) => typeof part !== "string" || part.length === 0)
    ) {
      throw new Error(`${gate.id}: command must be a non-empty argument array.`);
    }
    const paths = gateSelectionPaths(gate);
    requireUniqueStringArray(paths, `${gate.id}: selection paths`);
    const installProfiles = gateInstallProfiles(gate);
    requireUniqueStringArray(installProfiles, `${gate.id}: package profiles`);
    const unknownProfiles = installProfiles.filter(
      (profile) => !new Set(["root", "site"]).has(profile),
    );
    if (unknownProfiles.length > 0) {
      throw new Error(`${gate.id}: unknown install profile ${unknownProfiles.join(", ")}.`);
    }
    if (!Number.isSafeInteger(gate.timeoutMs) || gate.timeoutMs <= 0) {
      throw new Error(`${gate.id}: timeoutMs must be a positive integer.`);
    }
    requireUniqueStringArray(gate.prerequisites, `${gate.id}: prerequisites`);
    if (typeof gate.aggregate !== "boolean" || typeof gate.trustedProofRequired !== "boolean") {
      throw new Error(`${gate.id}: aggregate and trustedProofRequired must be booleans.`);
    }
    if (!gate.trustedProofRequired) {
      throw new Error(
        `${gate.id}: validation manifest schema 1 requires every gate in trusted full proof.`,
      );
    }
    if (gate.changedFiles !== undefined && typeof gate.changedFiles !== "boolean") {
      throw new Error(`${gate.id}: changedFiles must be a boolean when present.`);
    }
    if (manifest.schemaVersion === MANIFEST_SCHEMA_VERSION) {
      requireExactKeys(
        gate,
        [
          "id",
          "command",
          "selection",
          "execution",
          "evidence",
          "restoreOutputs",
          "epoch",
          "timeoutMs",
          "prerequisites",
          "aggregate",
          "trustedProofRequired",
        ],
        ["changedFiles"],
        `${gate.id}: gate`,
      );
      if (manifest.taskKeySchemaVersion !== TASK_KEY_SCHEMA_VERSION) {
        throw new Error(
          `Unsupported task-key schema: ${manifest.taskKeySchemaVersion ?? "missing"}`,
        );
      }
      if (!isPlainObject(gate.selection) || !isPlainObject(gate.execution)) {
        throw new Error(`${gate.id}: schema 2 requires selection and execution objects.`);
      }
      requireExactKeys(
        gate.selection,
        ["paths", "deriveFromExecutionInputs"],
        [],
        `${gate.id}: selection`,
      );
      if (gate.selection.deriveFromExecutionInputs !== true) {
        throw new Error(`${gate.id}: schema 2 selection must derive from execution inputs.`);
      }
      requireExactKeys(
        gate.execution,
        [
          "entrypoints",
          "helpers",
          "workspaceInputs",
          "packageProfiles",
          "tools",
          "environment",
          "gitInputs",
        ],
        [],
        `${gate.id}: execution`,
      );
      for (const field of ["entrypoints", "helpers", "workspaceInputs"]) {
        requireInputArray(gate.execution[field], `${gate.id}: execution.${field}`);
      }
      for (const field of ["packageProfiles", "tools", "environment", "gitInputs"]) {
        requireUniqueStringArray(gate.execution[field], `${gate.id}: execution.${field}`);
      }
      validateEvidenceContract(gate.evidence, gate.id);
      if (!Array.isArray(gate.restoreOutputs)) {
        throw new Error(`${gate.id}: restoreOutputs must be an array.`);
      }
      const outputIds = new Set();
      for (const output of gate.restoreOutputs) {
        if (
          !isPlainObject(output) ||
          !/^[a-z][a-z0-9-]*$/.test(output.id ?? "") ||
          typeof output.path !== "string" ||
          output.path.length === 0 ||
          !new Set(["directory", "file"]).has(output.kind)
        ) {
          throw new Error(`${gate.id}: every restore output needs an id, path, and kind.`);
        }
        const normalizedPath = output.path.replaceAll("\\", "/");
        if (
          path.isAbsolute(output.path) ||
          output.path.includes("\\") ||
          normalizedPath.includes("//") ||
          normalizedPath.endsWith("/") ||
          normalizedPath
            .split("/")
            .some((segment) => segment === "" || segment === "." || segment === "..") ||
          normalizedPath === ".." ||
          normalizedPath.startsWith("../") ||
          normalizedPath.includes("/../") ||
          normalizedPath === "."
        ) {
          throw new Error(`${gate.id}: restore output ${output.id} escapes the repository.`);
        }
        requireExactKeys(output, ["id", "path", "kind"], [], `${gate.id}: output ${output.id}`);
        if (outputIds.has(output.id)) throw new Error(`${gate.id}: duplicate output ${output.id}.`);
        for (const previous of gate.restoreOutputs.slice(0, gate.restoreOutputs.indexOf(output))) {
          const left = previous.path.replaceAll("\\", "/").replace(/\/$/, "");
          const right = normalizedPath.replace(/\/$/, "");
          if (left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`)) {
            throw new Error(`${gate.id}: restore output paths overlap.`);
          }
        }
        outputIds.add(output.id);
      }
      if (!Number.isSafeInteger(gate.epoch) || gate.epoch < 1) {
        throw new Error(`${gate.id}: epoch must be a positive integer.`);
      }
    }
    for (const prerequisite of gate.prerequisites) {
      const prerequisiteIndex = manifest.gates.findIndex(
        (candidate) => candidate.id === prerequisite,
      );
      if (prerequisiteIndex < 0) continue;
      if (prerequisiteIndex >= gateIndex) {
        throw new Error(
          `${gate.id}: prerequisite ${prerequisite} must precede its dependent gate.`,
        );
      }
    }
  }
  for (const gate of manifest.gates) {
    for (const prerequisite of gate.prerequisites) {
      if (!ids.has(prerequisite))
        throw new Error(`${gate.id}: unknown prerequisite ${prerequisite}`);
    }
  }
  return manifest;
}

export function manifestGateIds(manifest, predicate = () => true) {
  return manifest.gates.filter(predicate).map((gate) => gate.id);
}

export function gateSelectionPaths(gate) {
  return gate.selection?.paths ?? gate.paths;
}

export function gateInstallProfiles(gate) {
  return gate.execution?.packageProfiles ?? gate.installProfiles;
}

export function validatePlan(
  plan,
  manifest,
  label = "validation plan",
  { requireCandidatePlanDigest = false } = {},
) {
  if (typeof label !== "string") throw new Error("Validation plan label must be a string.");
  if (!isPlainObject(plan) || plan.schemaVersion !== PLAN_SCHEMA_VERSION) {
    throw new Error(`${label}: unsupported schema ${plan?.schemaVersion ?? "missing"}`);
  }
  if (!new Set(["affected", "full"]).has(plan.scope)) {
    throw new Error(`${label}: scope must be affected or full.`);
  }
  for (const field of ["reason", "baseSha", "candidateSha", "manifestDigest"]) {
    if (typeof plan[field] !== "string") throw new Error(`${label}: ${field} must be a string.`);
  }
  if (plan.reason.length === 0) throw new Error(`${label}: reason must not be empty.`);
  requireUniqueStringArray(plan.changedPaths, `${label}: changedPaths`);
  requireUniqueStringArray(plan.selectedGates, `${label}: selectedGates`, { allowEmpty: false });
  requireUniqueStringArray(plan.installProfiles, `${label}: installProfiles`);
  const knownIds = new Set(manifestGateIds(manifest));
  for (const id of plan.selectedGates) {
    if (!knownIds.has(id)) throw new Error(`${label}: unknown gate ${id}.`);
  }
  for (const gate of manifest.gates.filter(({ id }) => plan.selectedGates.includes(id))) {
    const missingPrerequisites = gate.prerequisites.filter(
      (prerequisite) => !plan.selectedGates.includes(prerequisite),
    );
    if (missingPrerequisites.length > 0) {
      throw new Error(
        `${label}: ${gate.id} is missing prerequisite ${missingPrerequisites.join(", ")}.`,
      );
    }
  }
  const orderedSelection = manifestGateIds(manifest, ({ id }) => plan.selectedGates.includes(id));
  if (JSON.stringify(plan.selectedGates) !== JSON.stringify(orderedSelection)) {
    throw new Error(`${label}: selectedGates must follow manifest order.`);
  }
  if (
    plan.scope === "full" &&
    JSON.stringify(plan.selectedGates) !== JSON.stringify(manifestGateIds(manifest))
  ) {
    throw new Error(`${label}: full scope must select every declared gate in manifest order.`);
  }
  const expectedProfiles = [
    ...new Set(
      manifest.gates
        .filter(({ id }) => plan.selectedGates.includes(id))
        .flatMap((gate) => gateInstallProfiles(gate)),
    ),
  ].sort();
  if (JSON.stringify(plan.installProfiles) !== JSON.stringify(expectedProfiles)) {
    throw new Error(`${label}: installProfiles do not match the selected gates.`);
  }
  if (plan.manifestDigest !== digestJson(manifest)) {
    throw new Error(`${label}: manifest digest does not match its manifest.`);
  }
  requireDigestOrNull(plan.basePlanDigest, `${label}: basePlanDigest`);
  requireDigestOrNull(plan.candidatePlanDigest, `${label}: candidatePlanDigest`);
  if (requireCandidatePlanDigest && plan.candidatePlanDigest === null) {
    throw new Error(`${label}: candidatePlanDigest must be a SHA-256 digest.`);
  }
  if (JSON.stringify(plan.changedPaths) !== JSON.stringify([...plan.changedPaths].sort())) {
    throw new Error(`${label}: changedPaths must be sorted.`);
  }
  return plan;
}

export function planDigest(plan) {
  const { planDigest: ignored, ...digestible } = plan;
  void ignored;
  return digestJson(digestible);
}

export function isFormatSupported(file) {
  return /(?:^|\/)[^/]+\.(?:cjs|css|cts|html|js|json|jsonc|jsx|md|mdx|mjs|mts|scss|toml|ts|tsx|yaml|yml)$/.test(
    file,
  );
}
