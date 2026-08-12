import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const PLAN_SCHEMA_VERSION = 1;
export const REPORT_SCHEMA_VERSION = 1;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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
  if (!isPlainObject(manifest) || manifest.schemaVersion !== PLAN_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported validation manifest schema: ${manifest?.schemaVersion ?? "missing"}`,
    );
  }
  if (!Array.isArray(manifest.gates) || manifest.gates.length === 0) {
    throw new Error("Validation manifest must declare gates.");
  }
  requireUniqueStringArray(manifest.globalInvalidators, "globalInvalidators");
  requireUniqueStringArray(manifest.knownPaths, "knownPaths", { allowEmpty: false });
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
    requireUniqueStringArray(gate.paths, `${gate.id}: paths`);
    requireUniqueStringArray(gate.installProfiles, `${gate.id}: installProfiles`);
    const unknownProfiles = gate.installProfiles.filter(
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
        .flatMap(({ installProfiles }) => installProfiles),
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
