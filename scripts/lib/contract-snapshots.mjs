import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";

import { loadValidatedRelease, PINNED_AGENT_PLUGINS_SCHEMA_PATH } from "./release-descriptor.mjs";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const SNAPSHOT_SCHEMA_PATH = "scripts/vendor/snapshots/snapshot.schema.json";
export const SNAPSHOT_DIR = "scripts/vendor/snapshots";

function resolveRoot(root = moduleRoot) {
  return path.resolve(root);
}

function formatAjvErrors(errors = []) {
  return errors.map((error) => `${error.instancePath || "/"} ${error.message}`);
}

function factsChecksum(facts) {
  return crypto.createHash("sha256").update(JSON.stringify(facts)).digest("hex");
}

export function snapshotPath(contractId) {
  return `${SNAPSHOT_DIR}/${contractId}.json`;
}

export function loadSnapshot(root, contractId) {
  const relative = snapshotPath(contractId);
  const absolute = path.join(resolveRoot(root), relative);
  return JSON.parse(fs.readFileSync(absolute, "utf8"));
}

export function loadSnapshotFacts(root, contractId) {
  const snapshot = loadSnapshot(root, contractId);
  if (!snapshot.facts || typeof snapshot.facts !== "object") {
    throw new Error(`[FOUND-001] ${snapshotPath(contractId)} is missing facts`);
  }
  return snapshot.facts;
}

export function loadActiveSnapshotFacts(root, snapshotKey) {
  const release = loadValidatedRelease(root);
  const contractId = release.contractSnapshots?.[snapshotKey];
  if (typeof contractId !== "string" || !contractId) {
    throw new Error(`[FOUND-001] release descriptor is missing contractSnapshots.${snapshotKey}`);
  }
  return loadSnapshotFacts(root, contractId);
}

export function validateContractSnapshots(root = moduleRoot) {
  const resolvedRoot = resolveRoot(root);
  const errors = [];
  const schemaPath = path.join(resolvedRoot, SNAPSHOT_SCHEMA_PATH);
  if (!fs.existsSync(schemaPath)) {
    return [`[FOUND-001] ${SNAPSHOT_SCHEMA_PATH} is missing`];
  }
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);

  let release;
  try {
    release = loadValidatedRelease(resolvedRoot);
  } catch (error) {
    return [`[FOUND-001] ${error.message}`];
  }

  const pinnedSchema = path.join(resolvedRoot, PINNED_AGENT_PLUGINS_SCHEMA_PATH);
  if (!fs.existsSync(pinnedSchema)) {
    errors.push(`[PORT-001] ${PINNED_AGENT_PLUGINS_SCHEMA_PATH} is missing`);
  }

  for (const contractId of Object.values(release.contractSnapshots)) {
    const relative = snapshotPath(contractId);
    const absolute = path.join(resolvedRoot, relative);
    if (!fs.existsSync(absolute) || !fs.lstatSync(absolute).isFile()) {
      errors.push(`[FOUND-001] missing contract snapshot ${relative}`);
      continue;
    }
    let snapshot;
    try {
      snapshot = JSON.parse(fs.readFileSync(absolute, "utf8"));
    } catch (error) {
      errors.push(`[FOUND-001] ${relative}: ${error.message}`);
      continue;
    }
    if (!validate(snapshot)) {
      errors.push(
        ...formatAjvErrors(validate.errors).map((error) => `[FOUND-001] ${relative}${error}`),
      );
      continue;
    }
    if (snapshot.contractId !== contractId) {
      errors.push(`[FOUND-001] ${relative} contractId must equal ${contractId}`);
    }
    if (contractId === "agent-plugins-1.0.0" && fs.existsSync(pinnedSchema)) {
      const fileHash = crypto
        .createHash("sha256")
        .update(fs.readFileSync(pinnedSchema))
        .digest("hex");
      if (snapshot.source.checksum.value !== fileHash) {
        errors.push(
          `[FOUND-001] ${relative} checksum must match ${PINNED_AGENT_PLUGINS_SCHEMA_PATH}`,
        );
      }
    } else if (factsChecksum(snapshot.facts) !== snapshot.source.checksum.value) {
      errors.push(`[FOUND-001] ${relative} checksum must match the encoded facts pin`);
    }
  }

  return errors;
}
