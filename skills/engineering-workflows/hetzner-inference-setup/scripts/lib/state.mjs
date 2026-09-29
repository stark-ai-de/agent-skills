import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  CLIENTS,
  COMPONENTS,
  CREDENTIAL_CONTINUITY_SCHEME,
  GATEWAY_HOST,
  GATEWAY_PORT,
  LITELLM_PIN,
  MAX_SECRET_BYTES,
  MAX_MANAGED_TREE_ENTRIES,
  MANIFEST_SCHEMA_VERSION,
  PROCESS_RECEIPT_SCHEMA_VERSION,
  PROCESS_STOP_TIMEOUT_MS,
  PROOF_STATES,
  SKILL_VERSION,
} from "./constants.mjs";
import { externalArtifactParents, ownedArtifactContracts } from "./config.mjs";
import { SetupError, invariant } from "./errors.mjs";
import {
  assertWithin,
  credentialPairContinuity,
  inspectPath,
  inventoryTree,
  observedStateDigest,
  readJson,
} from "./files.mjs";
import { assertWslOwnedNamespace, assertWslSameEnvironmentPath } from "./hosts.mjs";
import { digestJson } from "./json.mjs";
import {
  inspectProtectedDirectoryBoundary,
  preflightExternalProtectedDirectory,
  verifyProtectedDirectory,
  verifyProtectedPermissions,
  verifyRestrictedFilePermissions,
} from "./permissions.mjs";

const fsPromises = fs.promises;

const CONFIG_ROOT_ENTRIES = new Set(["bin", "gateway", "secrets"]);
const STATE_ROOT_ENTRIES = new Set([
  "backups",
  "install-manifest.json",
  "mutation.lock",
  "process-receipt.json",
  "process-stop.json",
  "rollback-receipt.json",
  "runtime",
]);

function normalized(target) {
  return path.resolve(target);
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function hasExactKeys(value, expected) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort())
  );
}

function assertExactKeys(value, expected, label) {
  invariant(
    hasExactKeys(value, expected),
    "manifest_unknown_field",
    `Install manifest ${label} has missing or unknown fields`,
  );
}

function absolutePath(value) {
  return typeof value === "string" && value.length > 0 && path.isAbsolute(value);
}

function within(target, root) {
  const relative = path.relative(normalized(root), normalized(target));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function ancestorsWithin(target, root) {
  const result = [];
  let current = normalized(target);
  const boundary = normalized(root);
  while (within(current, boundary) && current !== boundary) {
    current = path.dirname(current);
    if (within(current, boundary)) result.push(current);
  }
  return result;
}

function namespacePolicy(paths, options = {}) {
  const roots = [...new Set([paths.configRoot, paths.stateRoot].map(normalized))];
  const exactFiles = new Set(
    [
      paths.providerSecret,
      paths.gatewaySecret,
      paths.manifest,
      paths.processReceipt,
      paths.processStopRequest,
      paths.rollbackReceipt,
      paths.lock,
      ...(options.staticTargets ?? []),
      ...(options.manifest?.artifacts ?? []).map((artifact) => artifact.path),
      ...(options.manifest?.backups ?? []).map((backup) => backup.path),
      ...(options.extraFiles ?? []),
    ].map(normalized),
  );
  const allowedSubtrees = new Set(
    [paths.venvRoot, ...(options.allowedSubtrees ?? [])].map(normalized),
  );
  const directories = new Set(roots);
  for (const root of roots) {
    for (const target of [...exactFiles, ...allowedSubtrees]) {
      if (within(target, root)) {
        for (const ancestor of ancestorsWithin(target, root)) directories.add(ancestor);
      }
    }
  }
  return { allowedSubtrees, directories, exactFiles, roots };
}

export function assertCurrentHostStorageBoundaries(paths, host) {
  if (host?.kind !== "wsl") return;
  assertWslOwnedNamespace(paths.configRoot, host, "configuration namespace");
  assertWslOwnedNamespace(paths.stateRoot, host, "state namespace");
  assertWslSameEnvironmentPath(paths.codexProfile, host, "Codex profile");
}

const RECEIPT_PUBLICATION_TIMEOUT_MS = 3_000;
const RECEIPT_PUBLICATION_POLL_MS = 25;

function isReceiptPublicationPath(target, paths, manifest) {
  if (path.dirname(target) !== path.dirname(paths.processReceipt)) return false;
  const prefix = `.${path.basename(paths.processReceipt)}.${manifest.process.runnerPid}.`;
  const name = path.basename(target);
  if (!name.startsWith(prefix)) return false;
  return /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.(?:tmp|quarantine)$/u.test(
    name.slice(prefix.length),
  );
}

async function receiptPublicationEntries(paths, host, manifest) {
  assertCurrentHostStorageBoundaries(paths, host);
  const directory = path.dirname(paths.processReceipt);
  let names;
  try {
    names = await fsPromises.readdir(directory);
  } catch (error) {
    if (error.code === "ENOENT") return { paths: [], unsafe: false };
    throw error;
  }
  const publications = [];
  let unsafe = false;
  for (const name of names) {
    const target = path.join(directory, name);
    if (!isReceiptPublicationPath(target, paths, manifest)) continue;
    publications.push(target);
    assertCurrentHostStorageBoundaries(paths, host);
    try {
      const stat = await fsPromises.lstat(target);
      if (!stat.isFile() || stat.isSymbolicLink()) unsafe = true;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return { paths: publications, unsafe };
}

async function receiptConsistentSnapshot(paths, options, read, classify) {
  const { host, manifest } = options;
  if (!host || !validManifestProcess(manifest?.process) || manifest.process.status !== "ready")
    return await read();
  let deadline = null;
  let retried = false;
  for (;;) {
    const before = await receiptPublicationEntries(paths, host, manifest);
    let result;
    let disappeared = false;
    try {
      result = await read();
    } catch (error) {
      if (
        error.code !== "ENOENT" ||
        typeof error.path !== "string" ||
        !isReceiptPublicationPath(error.path, paths, manifest)
      )
        throw error;
      disappeared = true;
    }
    const after = await receiptPublicationEntries(paths, host, manifest);
    const state = disappeared ? { transient: true, unsafe: false } : classify(result, manifest);
    invariant(
      !before.unsafe && !after.unsafe,
      "unexpected_managed_entry",
      "Unsafe entry observed during process receipt publication",
    );
    if (state.unsafe) return result;
    if (state.receiptAbsent && !before.paths.length && !after.paths.length && !state.transient) {
      const current = await readProcessReceipt(paths, host);
      // Preserve the ordinary missing-receipt observation when no publication was seen.
      if (!current && !retried) return result;
      invariant(current, "process_receipt_missing", "Owned receipt disappeared across publication");
      state.transient = true;
    }
    if (!before.paths.length && !after.paths.length && !state.transient) {
      if (retried) {
        const receipt = await readProcessReceipt(paths, host);
        invariant(
          receipt && processReceiptFresh(receipt),
          "process_identity_stale",
          "Receipt publication requires a fresh protected owned heartbeat after a clean snapshot",
        );
        const findings = await processIdentityFindings(receipt, manifest, paths, { host });
        invariant(
          findings.length === 0,
          "process_identity_mismatch",
          "Process identity changed across receipt publication",
          { findings },
        );
      }
      return result;
    }
    deadline ??= Date.now() + RECEIPT_PUBLICATION_TIMEOUT_MS;
    invariant(
      Date.now() < deadline,
      "unexpected_managed_entry",
      "Process receipt publication did not settle; preserve its recovery files",
    );
    retried = true;
    await (
      options.receiptPublicationDelay ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
    )(RECEIPT_PUBLICATION_POLL_MS);
  }
}

export async function managedNamespaceFindings(paths, options = {}) {
  return await receiptConsistentSnapshot(
    paths,
    options,
    () => scanManagedNamespace(paths, options),
    (findings, manifest) => ({
      transient: findings.length > 0,
      unsafe: findings.some(
        (finding) =>
          !["unexpected_managed_entry", "managed_quarantine_recovery_required"].includes(
            finding.code,
          ) || !isReceiptPublicationPath(finding.path, paths, manifest),
      ),
    }),
  );
}

async function scanManagedNamespace(paths, options = {}) {
  assertCurrentHostStorageBoundaries(paths, options.host);
  const policy = namespacePolicy(paths, options);
  const externalParentState =
    options.externalParentState ??
    (await inspectExternalArtifactParents(paths, [...policy.exactFiles], options.host, options));
  assertCurrentHostStorageBoundaries(paths, options.host);
  const blockedExternalParents = new Set([
    ...externalParentState.absentParents,
    ...externalParentState.invalidParents,
  ]);
  const findings = [...externalParentState.findings];
  let entries = 0;

  async function walk(current) {
    assertCurrentHostStorageBoundaries(paths, options.host);
    const names = (await fsPromises.readdir(current)).sort();
    for (const name of names) {
      entries += 1;
      invariant(
        entries <= MAX_MANAGED_TREE_ENTRIES,
        "managed_namespace_too_large",
        `Managed namespace exceeds ${MAX_MANAGED_TREE_ENTRIES} entries`,
      );
      const full = normalized(path.join(current, name));
      assertCurrentHostStorageBoundaries(paths, options.host);
      const stat = await fsPromises.lstat(full);
      if (stat.isSymbolicLink()) {
        findings.push({ code: "managed_namespace_redirect", path: full });
        continue;
      }
      if (policy.allowedSubtrees.has(full)) {
        if (!stat.isDirectory()) {
          findings.push({ code: "managed_subtree_wrong_type", path: full });
        }
        continue;
      }
      if (policy.exactFiles.has(full)) {
        if (!stat.isFile()) findings.push({ code: "managed_file_wrong_type", path: full });
        continue;
      }
      if (policy.directories.has(full)) {
        if (!stat.isDirectory()) {
          findings.push({ code: "managed_directory_wrong_type", path: full });
        } else {
          await walk(full);
        }
        continue;
      }
      findings.push({
        code: name.endsWith(".quarantine")
          ? "managed_quarantine_recovery_required"
          : "unexpected_managed_entry",
        path: full,
      });
    }
  }

  for (const root of policy.roots) {
    assertCurrentHostStorageBoundaries(paths, options.host);
    const state = await inspectPath(root, { hash: false });
    if (state.kind === "absent") continue;
    if (state.kind !== "directory") {
      findings.push({ code: "managed_root_wrong_type", path: root });
      continue;
    }
    await walk(root);
  }
  const directoryEntries = new Map();
  for (const target of [...new Set([...policy.exactFiles, ...policy.roots])].sort()) {
    const directory = path.dirname(target);
    if (blockedExternalParents.has(normalized(directory))) continue;
    let names = directoryEntries.get(directory);
    if (!names) {
      assertCurrentHostStorageBoundaries(paths, options.host);
      const directoryState = await inspectPath(directory, { hash: false });
      if (directoryState.kind !== "directory") continue;
      assertCurrentHostStorageBoundaries(paths, options.host);
      names = await fsPromises.readdir(directory);
      directoryEntries.set(directory, names);
    }
    const prefix = `.${path.basename(target)}.`;
    for (const name of names) {
      if (!name.startsWith(prefix) || !name.endsWith(".quarantine")) continue;
      const recoveryPath = normalized(path.join(directory, name));
      if (!findings.some((finding) => finding.path === recoveryPath)) {
        findings.push({ code: "managed_quarantine_recovery_required", path: recoveryPath });
      }
    }
  }
  return findings;
}

export async function preflightExternalArtifactTargets(paths, targets, host, dependencies = {}) {
  assertCurrentHostStorageBoundaries(paths, host);
  const parents = externalArtifactParents(paths, targets);
  if (parents.length === 0) return parents;
  invariant(host, "host_required", "External artifact preflight requires a host boundary");
  for (const parent of parents) {
    assertWslSameEnvironmentPath(parent, host, "external artifact parent");
    await preflightExternalProtectedDirectory(parent, host, dependencies);
  }
  return parents;
}

export async function inspectExternalArtifactParents(paths, targets, host, dependencies = {}) {
  const parents = await preflightExternalArtifactTargets(paths, targets, host, dependencies);
  const absentParents = new Set();
  const findings = [];
  const invalidParents = new Set();
  const observations = {};
  for (const parent of parents) {
    try {
      observations[parent] = await inspectProtectedDirectoryBoundary(parent, host, {
        ...dependencies,
        external: true,
      });
    } catch (error) {
      if (error?.code === "ENOENT") {
        absentParents.add(parent);
        continue;
      }
      invalidParents.add(parent);
      findings.push({
        code: "external_parent_protection_invalid",
        path: parent,
        reason: error?.code ?? "external_parent_verification_failed",
      });
    }
  }
  return { absentParents, findings, invalidParents, observations, parents };
}

export async function assertManagedNamespace(paths, options = {}) {
  const findings = await managedNamespaceFindings(paths, options);
  invariant(
    findings.length === 0,
    "unexpected_managed_entry",
    "Managed namespace contains unowned or unsafe entries",
    { findings },
  );
}

async function inspectRootEntries(root, allowed, paths, host) {
  assertCurrentHostStorageBoundaries(paths, host);
  const state = await inspectPath(root, { hash: false });
  if (state.kind === "absent") return { kind: "absent", entries: [], unexpected: [] };
  invariant(
    state.kind === "directory",
    "managed_root_invalid",
    `Managed root is not a directory: ${root}`,
  );
  assertCurrentHostStorageBoundaries(paths, host);
  const entries = (await fsPromises.readdir(root)).sort();
  return {
    kind: "directory",
    entries,
    unexpected: entries.filter((entry) => !allowed.has(entry)),
  };
}

function validCredentialMetadata(value, expectedPath, expectedPurpose) {
  return (
    hasExactKeys(value, ["mode", "mtimeMs", "path", "purpose", "size"]) &&
    value?.path === expectedPath &&
    value.purpose === expectedPurpose &&
    Number.isInteger(value.mode) &&
    Number.isInteger(value.size) &&
    value.size > 0 &&
    value.size <= MAX_SECRET_BYTES &&
    Number.isInteger(value.mtimeMs) &&
    value.mtimeMs >= 0
  );
}

export function manifestProcessHasIdentity(processState) {
  return !["not-started", "not-running"].includes(processState?.status);
}

function validManifestProcess(processState) {
  if (!processState || typeof processState !== "object" || Array.isArray(processState))
    return false;
  if (["not-started", "not-running"].includes(processState.status)) {
    return JSON.stringify(Object.keys(processState)) === JSON.stringify(["status"]);
  }
  const expectedKeys = [
    "childPid",
    "configSha256",
    "gatewayArgsDigest",
    "gatewayExecutable",
    "processToken",
    "runnerExecutable",
    "runnerPid",
    "runnerScript",
    "startedAt",
    "status",
  ];
  return (
    ["ready", "stopping", "stopped", "failed"].includes(processState.status) &&
    JSON.stringify(Object.keys(processState).sort()) === JSON.stringify(expectedKeys) &&
    /^[a-f0-9]{64}$/.test(processState.processToken) &&
    Number.isInteger(processState.runnerPid) &&
    processState.runnerPid > 0 &&
    Number.isInteger(processState.childPid) &&
    processState.childPid > 0 &&
    absolutePath(processState.runnerExecutable) &&
    absolutePath(processState.runnerScript) &&
    absolutePath(processState.gatewayExecutable) &&
    isSha256(processState.gatewayArgsDigest) &&
    isSha256(processState.configSha256) &&
    Number.isFinite(Date.parse(processState.startedAt))
  );
}

const IMMUTABLE_PROCESS_BINDING_FIELDS = [
  "childPid",
  "configSha256",
  "gatewayArgsDigest",
  "gatewayExecutable",
  "processToken",
  "runnerExecutable",
  "runnerPid",
  "runnerScript",
  "startedAt",
];

export function immutableProcessBindingDigest(processState) {
  invariant(
    manifestProcessHasIdentity(processState) &&
      IMMUTABLE_PROCESS_BINDING_FIELDS.every(
        (field) => processState[field] !== null && processState[field] !== undefined,
      ),
    "process_binding_invalid",
    "A complete immutable process identity is required",
  );
  return digestJson(
    Object.fromEntries(
      IMMUTABLE_PROCESS_BINDING_FIELDS.map((field) => [field, processState[field]]),
    ),
  );
}

function validateManifestStructure(paths, manifest) {
  assertExactKeys(
    manifest,
    [
      "artifacts",
      "backups",
      "clients",
      "components",
      "createdAt",
      "credentials",
      "discoveryEvidence",
      "evidence",
      "executables",
      "host",
      "kind",
      "lastPlanId",
      "litellm",
      "model",
      "process",
      "rollbackActions",
      "runtime",
      "schemaVersion",
      "skillVersion",
      "updatedAt",
    ],
    "root",
  );
  invariant(
    manifest.kind === "hetzner-inference-install-manifest" &&
      manifest.skillVersion === SKILL_VERSION,
    "manifest_identity_invalid",
    "Install manifest belongs to another kind or skill version",
  );
  const clients = [...new Set(manifest.clients ?? [])].sort();
  invariant(
    JSON.stringify(clients) === JSON.stringify(manifest.clients) &&
      clients.every((client) => CLIENTS.includes(client)),
    "manifest_clients_invalid",
    "Install manifest clients are unsupported, duplicated, or unsorted",
  );
  invariant(
    typeof manifest.model === "string" && manifest.model.length > 0,
    "manifest_model_invalid",
    "Install manifest has no model",
  );
  invariant(
    typeof manifest.lastPlanId === "string" &&
      manifest.lastPlanId.length > 0 &&
      Number.isFinite(Date.parse(manifest.createdAt)) &&
      Number.isFinite(Date.parse(manifest.updatedAt)),
    "manifest_revision_invalid",
    "Install manifest revision metadata is invalid",
  );
  assertExactKeys(
    manifest.host,
    [
      "codexHome",
      "configRoot",
      "crossBoundary",
      "kind",
      "platform",
      "stateRoot",
      "wslDistribution",
    ],
    "host",
  );
  invariant(
    manifest.host?.configRoot === paths.configRoot &&
      manifest.host?.stateRoot === paths.stateRoot &&
      manifest.host?.crossBoundary === false,
    "manifest_root_mismatch",
    "Install manifest belongs to other managed roots",
  );
  assertExactKeys(
    manifest.executables,
    ["claude-code", "codex", "cursor", "node", "python"],
    "executables",
  );
  for (const [name, executable] of Object.entries(manifest.executables)) {
    if (executable?.path === null) {
      const allowed =
        executable.observedPath === undefined
          ? ["path", "version"]
          : executable.versionError === undefined
            ? ["observedPath", "path", "version"]
            : ["observedPath", "path", "version", "versionError"];
      assertExactKeys(executable, allowed, `executable ${name}`);
      invariant(
        allowed.length === 2
          ? executable.version === null
          : absolutePath(executable.observedPath) &&
              (allowed.length === 3
                ? typeof executable.version === "string" && executable.version.length > 0
                : executable.version === null &&
                  typeof executable.versionError === "string" &&
                  executable.versionError.length > 0),
        "manifest_executable_contract_invalid",
        `Install manifest has invalid unavailable-executable metadata for ${name}`,
      );
    } else {
      assertExactKeys(executable, ["path", "sha256", "version"], `executable ${name}`);
      invariant(
        absolutePath(executable.path) &&
          typeof executable.version === "string" &&
          executable.version.length > 0 &&
          isSha256(executable.sha256),
        "manifest_executable_contract_invalid",
        `Install manifest has invalid executable metadata for ${name}`,
      );
    }
  }
  invariant(
    absolutePath(manifest.executables?.node?.path) &&
      typeof manifest.executables.node.version === "string" &&
      isSha256(manifest.executables.node.sha256),
    "manifest_executable_contract_invalid",
    "Install manifest has no owned Node.js executable identity",
  );
  for (const client of ["codex", "claude-code"]) {
    if (!clients.includes(client)) continue;
    invariant(
      absolutePath(manifest.executables?.[client]?.path) &&
        typeof manifest.executables[client].version === "string" &&
        isSha256(manifest.executables[client].sha256),
      "manifest_executable_contract_invalid",
      `Install manifest has no ${client} executable identity`,
    );
  }

  const expected = ownedArtifactContracts(paths, clients);
  const artifacts = Array.isArray(manifest.artifacts) ? manifest.artifacts : [];
  invariant(
    artifacts.every((artifact) => absolutePath(artifact?.path)),
    "manifest_artifact_invalid",
    "Install manifest contains a non-absolute artifact path",
  );
  const artifactPaths = artifacts.map((artifact) => normalized(artifact.path));
  invariant(
    artifacts.length === expected.size && new Set(artifactPaths).size === artifacts.length,
    "manifest_artifact_set_invalid",
    "Install manifest artifact set is incomplete or duplicated",
  );
  for (const artifact of artifacts) {
    assertExactKeys(artifact, ["mode", "path", "role", "rollback", "sha256"], "artifact");
    const contract = [...expected.entries()].find(
      ([target]) => normalized(target) === normalized(artifact.path),
    )?.[1];
    invariant(
      contract &&
        artifact.role === contract.role &&
        artifact.mode === contract.mode &&
        artifact.rollback === "remove" &&
        isSha256(artifact.sha256),
      "manifest_artifact_invalid",
      `Install manifest contains an unsupported artifact: ${artifact.path}`,
    );
  }

  invariant(
    hasExactKeys(manifest.credentials, ["gateway", "provider", "rollback"]) &&
      validCredentialMetadata(
        manifest.credentials?.provider,
        paths.providerSecret,
        "upstream-provider",
      ) &&
      validCredentialMetadata(
        manifest.credentials?.gateway,
        paths.gatewaySecret,
        "administrative-loopback-gateway",
      ) &&
      manifest.credentials?.rollback === "preserve",
    "manifest_credential_contract_invalid",
    "Install manifest changes credential paths or rollback behavior",
  );
  assertExactKeys(manifest.litellm, ["package", "pin"], "LiteLLM contract");
  assertExactKeys(
    manifest.runtime,
    [
      "litellmExecutable",
      "litellmVersion",
      "packages",
      "pythonExecutable",
      "pythonVersion",
      "treeDigest",
      "treeEntries",
    ],
    "runtime",
  );
  invariant(
    isSha256(manifest.runtime?.treeDigest) &&
      Number.isInteger(manifest.runtime?.treeEntries) &&
      manifest.runtime.treeEntries > 0 &&
      absolutePath(manifest.runtime.pythonExecutable) &&
      absolutePath(manifest.runtime.litellmExecutable) &&
      manifest.runtime.litellmVersion === LITELLM_PIN &&
      manifest.litellm?.pin === LITELLM_PIN &&
      manifest.litellm?.package === `litellm[proxy]==${LITELLM_PIN}` &&
      typeof manifest.runtime.pythonVersion === "string" &&
      manifest.runtime.pythonVersion.length > 0 &&
      Array.isArray(manifest.runtime.packages) &&
      manifest.runtime.packages.includes(`litellm==${LITELLM_PIN}`) &&
      manifest.runtime.packages.every(
        (packageName) => typeof packageName === "string" && packageName.length > 0,
      ) &&
      JSON.stringify(manifest.runtime.packages) ===
        JSON.stringify([...manifest.runtime.packages].sort()),
    "manifest_runtime_invalid",
    "Install manifest runtime inventory is invalid",
  );
  assertWithin(manifest.runtime.pythonExecutable, paths.venvRoot, "manifest Python executable");
  assertWithin(manifest.runtime.litellmExecutable, paths.venvRoot, "manifest LiteLLM executable");

  const backups = Array.isArray(manifest.backups) ? manifest.backups : [];
  invariant(
    backups.every(
      (backup) =>
        absolutePath(backup?.path) && absolutePath(backup?.target) && Number.isInteger(backup.mode),
    ) && new Set(backups.map((backup) => normalized(backup.path))).size === backups.length,
    "manifest_backup_set_invalid",
    "Install manifest contains duplicate backup paths",
  );
  for (const backup of backups) {
    assertExactKeys(backup, ["mode", "path", "sha256", "target"], "backup");
    assertWithin(backup.path, paths.backupsRoot, "manifest backup");
    invariant(
      normalized(backup.path) !== normalized(paths.backupsRoot) &&
        artifactPaths.includes(normalized(backup.target)) &&
        backup.mode === 0o600 &&
        isSha256(backup.sha256),
      "manifest_backup_invalid",
      `Install manifest contains an unsupported backup: ${backup.path}`,
    );
  }
  invariant(
    manifest.components &&
      JSON.stringify(Object.keys(manifest.components).sort()) ===
        JSON.stringify([...COMPONENTS].sort()) &&
      Object.values(manifest.components).every(
        (state) => PROOF_STATES.includes(state) && !["planned", "rolled_back"].includes(state),
      ),
    "manifest_components_invalid",
    "Install manifest has an incomplete or unsupported component proof-state map",
  );
  invariant(
    manifest.discoveryEvidence === null ||
      (hasExactKeys(manifest.discoveryEvidence, ["observedAt", "path", "sha256"]) &&
        absolutePath(manifest.discoveryEvidence.path) &&
        isSha256(manifest.discoveryEvidence.sha256) &&
        Number.isFinite(Date.parse(manifest.discoveryEvidence.observedAt))),
    "manifest_discovery_evidence_invalid",
    "Install manifest discovery-evidence binding is invalid",
  );
  assertExactKeys(manifest.evidence, ["invalidatedAt", "reason"], "evidence state");
  invariant(
    Number.isFinite(Date.parse(manifest.evidence.invalidatedAt)) &&
      typeof manifest.evidence.reason === "string" &&
      manifest.evidence.reason.length > 0,
    "manifest_evidence_invalid",
    "Install manifest evidence state is invalid",
  );
  invariant(
    validManifestProcess(manifest.process),
    "manifest_process_invalid",
    "Install manifest has an incomplete or unsupported process identity",
  );
  const rollbackActions = Array.isArray(manifest.rollbackActions) ? manifest.rollbackActions : [];
  const expectedRollbackActions = [
    ...artifacts.map((artifact) => ({
      action: "remove-owned-file",
      path: artifact.path,
      sha256: artifact.sha256,
    })),
    {
      action: "remove-owned-runtime",
      path: paths.venvRoot,
      treeDigest: manifest.runtime.treeDigest,
    },
    { action: "preserve-credential", path: paths.providerSecret },
    { action: "preserve-credential", path: paths.gatewaySecret },
  ];
  for (const action of rollbackActions) {
    const expectedKeys =
      action?.action === "remove-owned-file"
        ? ["action", "path", "sha256"]
        : action?.action === "remove-owned-runtime"
          ? ["action", "path", "treeDigest"]
          : ["action", "path"];
    assertExactKeys(action, expectedKeys, "rollback action");
  }
  invariant(
    digestJson(rollbackActions) === digestJson(expectedRollbackActions),
    "manifest_rollback_actions_invalid",
    "Install manifest rollback actions do not match the finite owned state",
  );
}

export function rollbackContract(paths, manifest, manifestSha256) {
  invariant(
    isSha256(manifestSha256),
    "rollback_manifest_hash_invalid",
    "Rollback requires the exact observed manifest hash",
  );
  const backups = (manifest.backups ?? [])
    .map((backup) => ({ path: backup.path, sha256: backup.sha256 }))
    .sort((left, right) => left.path.localeCompare(right.path));
  return {
    preserveCredentials: [paths.gatewaySecret, paths.providerSecret].sort(),
    artifacts: manifest.artifacts
      .map((artifact) => ({ path: artifact.path, sha256: artifact.sha256 }))
      .sort((left, right) => left.path.localeCompare(right.path)),
    backups,
    runtime: { path: paths.venvRoot, treeDigest: manifest.runtime.treeDigest },
    processState: [paths.processReceipt, paths.processStopRequest].sort(),
    manifest: { path: paths.manifest, sha256: manifestSha256 },
    emptyDirectories: [
      ...new Set([
        paths.binDir,
        path.dirname(paths.gatewayConfig),
        paths.runtimeRoot,
        ...backups.map((backup) => path.dirname(backup.path)),
        paths.backupsRoot,
      ]),
    ].sort(),
  };
}

export function rollbackRemovalTargets(rollback) {
  return [
    ...(rollback?.artifacts ?? []).map((entry) => entry.path),
    ...(rollback?.backups ?? []).map((entry) => entry.path),
    rollback?.runtime?.path,
    ...(rollback?.processState ?? []),
    rollback?.manifest?.path,
  ]
    .filter(Boolean)
    .sort();
}

function validateRollbackContractStructure(paths, rollback) {
  invariant(
    rollback &&
      JSON.stringify(Object.keys(rollback).sort()) ===
        JSON.stringify([
          "artifacts",
          "backups",
          "emptyDirectories",
          "manifest",
          "preserveCredentials",
          "processState",
          "runtime",
        ]),
    "rollback_receipt_invalid",
    "Rollback state has no complete deletion contract",
  );
  invariant(
    JSON.stringify(rollback.preserveCredentials) ===
      JSON.stringify([paths.gatewaySecret, paths.providerSecret].sort()),
    "rollback_receipt_invalid",
    "Rollback state changes the preserved credential set",
  );
  invariant(
    JSON.stringify(rollback.processState) ===
      JSON.stringify([paths.processReceipt, paths.processStopRequest].sort()),
    "rollback_receipt_invalid",
    "Rollback state changes the process cleanup set",
  );

  const possibleArtifacts = ownedArtifactContracts(paths, CLIENTS);
  const requiredArtifacts = ownedArtifactContracts(paths, []);
  const artifacts = Array.isArray(rollback.artifacts) ? rollback.artifacts : [];
  const artifactPaths = artifacts.map((entry) => entry?.path);
  invariant(
    artifacts.every(
      (entry) =>
        hasExactKeys(entry, ["path", "sha256"]) &&
        absolutePath(entry.path) &&
        possibleArtifacts.has(entry.path) &&
        isSha256(entry.sha256),
    ) &&
      new Set(artifactPaths).size === artifactPaths.length &&
      JSON.stringify(artifactPaths) === JSON.stringify([...artifactPaths].sort()) &&
      [...requiredArtifacts.keys()].every((target) => artifactPaths.includes(target)),
    "rollback_receipt_invalid",
    "Rollback state contains an invalid owned artifact set",
  );

  const backups = Array.isArray(rollback.backups) ? rollback.backups : [];
  invariant(
    backups.every(
      (entry) =>
        hasExactKeys(entry, ["path", "sha256"]) &&
        absolutePath(entry.path) &&
        normalized(entry.path) !== normalized(paths.backupsRoot) &&
        within(entry.path, paths.backupsRoot) &&
        isSha256(entry.sha256),
    ) &&
      new Set(backups.map((entry) => normalized(entry.path))).size === backups.length &&
      JSON.stringify(backups.map((entry) => entry.path)) ===
        JSON.stringify(backups.map((entry) => entry.path).sort()),
    "rollback_receipt_invalid",
    "Rollback state contains an invalid backup set",
  );
  invariant(
    hasExactKeys(rollback.runtime, ["path", "treeDigest"]) &&
      rollback.runtime.path === paths.venvRoot &&
      isSha256(rollback.runtime.treeDigest),
    "rollback_receipt_invalid",
    "Rollback state changes the owned runtime",
  );
  invariant(
    hasExactKeys(rollback.manifest, ["path", "sha256"]) &&
      rollback.manifest.path === paths.manifest &&
      isSha256(rollback.manifest.sha256),
    "rollback_receipt_invalid",
    "Rollback state changes the install manifest target",
  );
  const expectedDirectories = [
    ...new Set([
      paths.binDir,
      path.dirname(paths.gatewayConfig),
      paths.runtimeRoot,
      ...backups.map((backup) => path.dirname(backup.path)),
      paths.backupsRoot,
    ]),
  ].sort();
  invariant(
    JSON.stringify(rollback.emptyDirectories) === JSON.stringify(expectedDirectories),
    "rollback_receipt_invalid",
    "Rollback state changes the empty-directory cleanup set",
  );
}

function validatePreservedCredentialObservations(paths, observations) {
  const expectedTargets = [paths.gatewaySecret, paths.providerSecret].sort();
  invariant(
    observations &&
      JSON.stringify(Object.keys(observations).sort()) === JSON.stringify(expectedTargets),
    "rollback_receipt_invalid",
    "Rollback state has no complete preserved-credential observations",
  );
  for (const target of expectedTargets) {
    const observation = observations[target];
    invariant(
      hasExactKeys(observation, ["kind", "mode", "mtimeMs", "sha256", "size"]) &&
        observation.kind === "file" &&
        observation.sha256 === null &&
        Number.isInteger(observation.mode) &&
        Number.isInteger(observation.size) &&
        Number.isInteger(observation.mtimeMs),
      "rollback_receipt_invalid",
      `Rollback state has invalid credential metadata: ${target}`,
    );
  }
}

function validateRollbackStateStructure(paths, state) {
  invariant(
    state && typeof state === "object" && !Array.isArray(state),
    "rollback_receipt_invalid",
    "Rollback state must be an object",
  );
  const expectedRootKeys =
    state.kind === "hetzner-inference-rollback-journal"
      ? [
          "createdAt",
          "credentialContinuity",
          "kind",
          "planId",
          "preservedCredentialObservations",
          "processToken",
          "rollback",
          "rollbackDigest",
          "schemaVersion",
          "status",
          "updatedAt",
        ]
      : state.kind === "hetzner-inference-rollback-receipt"
        ? [
            "components",
            "credentialContinuity",
            "kind",
            "observedAt",
            "planId",
            "preservedCredentialObservations",
            "preservedCredentials",
            "removed",
            "rollback",
            "rollbackDigest",
            "schemaVersion",
          ]
        : null;
  invariant(
    expectedRootKeys && hasExactKeys(state, expectedRootKeys),
    "rollback_receipt_invalid",
    "Rollback state has missing or unknown fields",
  );
  invariant(
    state?.schemaVersion === 1 && isSha256(state.planId),
    "rollback_receipt_invalid",
    "Rollback state has an unsupported schema or plan identity",
  );
  validateRollbackContractStructure(paths, state.rollback);
  invariant(
    state.rollbackDigest === digestJson(state.rollback),
    "rollback_receipt_invalid",
    "Rollback state contract digest does not match its contents",
  );
  validatePreservedCredentialObservations(paths, state.preservedCredentialObservations);
  invariant(
    state.credentialContinuity?.scheme === CREDENTIAL_CONTINUITY_SCHEME &&
      isSha256(state.credentialContinuity.proof) &&
      JSON.stringify(Object.keys(state.credentialContinuity).sort()) ===
        JSON.stringify(["proof", "scheme"]),
    "rollback_receipt_invalid",
    "Rollback state has no supported secret-safe credential continuity proof",
  );

  if (state.kind === "hetzner-inference-rollback-journal") {
    invariant(
      state.status === "in_progress" &&
        Number.isFinite(Date.parse(state.createdAt)) &&
        Number.isFinite(Date.parse(state.updatedAt)) &&
        Date.parse(state.updatedAt) >= Date.parse(state.createdAt) &&
        (state.processToken === null || /^[a-f0-9]{64}$/.test(state.processToken)),
      "rollback_receipt_invalid",
      "Rollback journal is malformed",
    );
    return;
  }

  const expectedRemoved = rollbackRemovalTargets(state.rollback);
  invariant(
    state.kind === "hetzner-inference-rollback-receipt" &&
      Number.isFinite(Date.parse(state.observedAt)) &&
      JSON.stringify(state.removed) === JSON.stringify(expectedRemoved) &&
      JSON.stringify(state.preservedCredentials) ===
        JSON.stringify([paths.gatewaySecret, paths.providerSecret].sort()) &&
      hasExactKeys(state.components, ["claude-code", "codex", "cursor", "gateway", "provider"]) &&
      Object.values(state.components ?? {}).every(
        (componentState) => componentState === "rolled_back",
      ),
    "rollback_receipt_invalid",
    "Rollback receipt does not match the supported completed state",
  );
}

export async function loadManifest(paths, options = {}) {
  assertCurrentHostStorageBoundaries(paths, options.host);
  const state = await inspectPath(paths.manifest, { hash: false });
  if (state.kind === "absent" && options.required !== true) return null;
  invariant(
    state.kind === "file",
    "manifest_invalid",
    `Manifest is not a regular file: ${paths.manifest}`,
  );
  assertCurrentHostStorageBoundaries(paths, options.host);
  const manifest = await readJson(paths.manifest, {
    invalidCode: "manifest_invalid",
    shapeCode: "manifest_invalid",
    tooLargeCode: "manifest_invalid",
    unsafeCode: "manifest_invalid",
  });
  invariant(
    manifest.schemaVersion === MANIFEST_SCHEMA_VERSION,
    "manifest_schema_unsupported",
    "Unsupported install manifest schema",
  );
  validateManifestStructure(paths, manifest);
  return manifest;
}

export async function offlineObservations(
  paths,
  staticTargets = [],
  host = null,
  dependencies = {},
) {
  const manifest = host ? await loadManifest(paths, { host }) : null;
  return await receiptConsistentSnapshot(
    paths,
    { ...dependencies, host, manifest },
    () => scanOfflineObservations(paths, staticTargets, host, dependencies),
    (observations, currentManifest) => {
      const unexpected = [...new Set([paths.configRoot, paths.stateRoot])].flatMap((root) =>
        observations[`${root}::entries`].unexpected.map((name) => path.join(root, name)),
      );
      return {
        transient: unexpected.length > 0,
        receiptAbsent: observations[paths.processReceipt].kind === "absent",
        unsafe: unexpected.some(
          (target) => !isReceiptPublicationPath(target, paths, currentManifest),
        ),
      };
    },
  );
}

async function scanOfflineObservations(paths, staticTargets = [], host = null, dependencies = {}) {
  assertCurrentHostStorageBoundaries(paths, host);
  const externalParentState = await inspectExternalArtifactParents(
    paths,
    staticTargets,
    host,
    dependencies,
  );
  assertCurrentHostStorageBoundaries(paths, host);
  invariant(
    externalParentState.findings.length === 0,
    "external_parent_protection_invalid",
    "External artifact parent protection is invalid",
    { findings: externalParentState.findings },
  );
  const absentExternalParents = externalParentState.absentParents;
  const targets = [
    ...staticTargets,
    paths.manifest,
    paths.processReceipt,
    paths.processStopRequest,
    paths.rollbackReceipt,
    paths.runtimeRoot,
    paths.providerSecret,
    paths.gatewaySecret,
  ];
  const observations = {};
  for (const target of [...new Set(targets)].sort()) {
    if (absentExternalParents.has(normalized(path.dirname(target)))) {
      observations[target] = { kind: "absent" };
      continue;
    }
    const secret = target === paths.providerSecret || target === paths.gatewaySecret;
    const volatileReceipt = target === paths.processReceipt;
    assertCurrentHostStorageBoundaries(paths, host);
    const state = await inspectPath(target, { hash: !secret && !volatileReceipt });
    observations[target] = volatileReceipt ? { kind: state.kind } : state;
  }
  const sharedRoot = normalized(paths.configRoot) === normalized(paths.stateRoot);
  const configEntries = sharedRoot
    ? new Set([...CONFIG_ROOT_ENTRIES, ...STATE_ROOT_ENTRIES])
    : CONFIG_ROOT_ENTRIES;
  const stateEntries = sharedRoot ? configEntries : STATE_ROOT_ENTRIES;
  observations[`${paths.configRoot}::entries`] = await inspectRootEntries(
    paths.configRoot,
    configEntries,
    paths,
    host,
  );
  observations[`${paths.stateRoot}::entries`] = await inspectRootEntries(
    paths.stateRoot,
    stateEntries,
    paths,
    host,
  );
  return observations;
}

export function assertNoUnexpectedEntries(observations, paths) {
  for (const root of [paths.configRoot, paths.stateRoot]) {
    const value = observations[`${root}::entries`];
    invariant(
      value && value.unexpected.length === 0,
      "unexpected_managed_entry",
      `Unexpected entry under managed root: ${root}`,
      { entries: value?.unexpected ?? [] },
    );
  }
}

export function compareObservations(expected, actual) {
  const mismatches = [];
  const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
  for (const key of keys) {
    if (digestJson(expected[key]) !== digestJson(actual[key])) {
      mismatches.push({ path: key, expected: expected[key], actual: actual[key] });
    }
  }
  return mismatches;
}

export function assertObservationMatch(expected, actual) {
  const mismatches = compareObservations(expected, actual);
  invariant(
    mismatches.length === 0,
    "stale_plan_state",
    "Observed state changed after the plan was created",
    { mismatches },
  );
}

export async function verifyManifest(paths, manifest, host, dependencies = {}) {
  assertCurrentHostStorageBoundaries(paths, host);
  const artifacts = Array.isArray(manifest.artifacts) ? manifest.artifacts : [];
  const backups = Array.isArray(manifest.backups) ? manifest.backups : [];
  const externalTargets = [...artifacts, ...backups].map((entry) => entry.path);
  const externalParentState = await inspectExternalArtifactParents(
    paths,
    externalTargets,
    host,
    dependencies,
  );
  assertCurrentHostStorageBoundaries(paths, host);
  const blockedExternalParents = new Set([
    ...externalParentState.absentParents,
    ...externalParentState.invalidParents,
  ]);
  const findings = [...externalParentState.findings];
  const requiredExternalParents = new Set(
    externalArtifactParents(
      paths,
      [...artifacts, ...backups].map((entry) => entry.path),
    ),
  );
  for (const parent of externalParentState.absentParents) {
    if (requiredExternalParents.has(parent)) {
      findings.push({ code: "external_parent_missing", path: parent });
    }
  }
  const verifyFilePermissions =
    dependencies.verifyRestrictedFilePermissions ?? verifyRestrictedFilePermissions;
  if (
    host &&
    (manifest.host?.kind !== host.kind ||
      manifest.host?.platform !== host.platform ||
      manifest.host?.configRoot !== paths.configRoot ||
      manifest.host?.stateRoot !== paths.stateRoot ||
      manifest.host?.codexHome !== host.codexHome ||
      manifest.host?.wslDistribution !== host.wslDistribution ||
      manifest.host?.crossBoundary !== false)
  ) {
    findings.push({ code: "manifest_host_mismatch", path: paths.manifest });
  }
  for (const name of [
    "node",
    ...(manifest.clients.includes("codex") ? ["codex"] : []),
    ...(manifest.clients.includes("claude-code") ? ["claude-code"] : []),
  ]) {
    const executable = manifest.executables[name];
    assertWslSameEnvironmentPath(executable.path, host, `${name} executable`);
    if (name === "node") {
      assertWslSameEnvironmentPath(process.execPath, host, "current node executable");
      const currentNodePath = fs.realpathSync.native(process.execPath);
      assertWslSameEnvironmentPath(currentNodePath, host, "current node executable");
      if (executable.path !== currentNodePath || executable.version !== process.version) {
        findings.push({ code: "executable_version_changed", path: executable.path, name });
        continue;
      }
    }
    try {
      assertWslSameEnvironmentPath(executable.path, host, `${name} executable`);
      const currentExecutable = fs.realpathSync.native(executable.path);
      assertWslSameEnvironmentPath(currentExecutable, host, `${name} executable`);
      if (currentExecutable !== executable.path) {
        findings.push({ code: "executable_path_changed", path: executable.path, name });
      } else {
        assertWslSameEnvironmentPath(executable.path, host, `${name} executable`);
        const observation = await inspectPath(executable.path);
        if (observation.kind !== "file" || observation.sha256 !== executable.sha256) {
          findings.push({ code: "executable_content_changed", path: executable.path, name });
        }
      }
    } catch (error) {
      if (String(error?.code ?? "").startsWith("wsl_")) throw error;
      findings.push({ code: "executable_missing", path: executable.path, name });
    }
  }
  for (const artifact of artifacts) {
    if (blockedExternalParents.has(normalized(path.dirname(artifact.path)))) continue;
    const state = await inspectPath(artifact.path);
    if (state.kind !== "file") {
      findings.push({ code: "owned_artifact_missing_or_changed_type", path: artifact.path });
    } else if (state.sha256 !== artifact.sha256) {
      findings.push({ code: "owned_artifact_hash_mismatch", path: artifact.path });
    } else if (process.platform !== "win32" && state.mode !== artifact.mode) {
      findings.push({ code: "owned_artifact_mode_mismatch", path: artifact.path });
    }
    if (state.kind === "file" && host) {
      const ownerMismatch =
        process.platform !== "win32" &&
        typeof process.getuid === "function" &&
        (await fsPromises.lstat(artifact.path)).uid !== process.getuid();
      if (ownerMismatch) {
        findings.push({
          code: "owned_artifact_permissions_invalid",
          path: artifact.path,
          reason: "unsafe_file_owner",
        });
      } else {
        try {
          await verifyFilePermissions(artifact.path, host, artifact.mode);
        } catch (error) {
          if (
            !(
              process.platform !== "win32" &&
              state.mode !== artifact.mode &&
              error.code === "unsafe_file_mode"
            )
          ) {
            findings.push({
              code: "owned_artifact_permissions_invalid",
              path: artifact.path,
              reason: error.code ?? "permission_check_failed",
            });
          }
        }
      }
    }
  }

  for (const backup of backups) {
    if (blockedExternalParents.has(normalized(path.dirname(backup.path)))) continue;
    const state = await inspectPath(backup.path);
    if (state.kind !== "file") {
      findings.push({ code: "backup_missing_or_changed_type", path: backup.path });
      continue;
    }
    if (state.sha256 !== backup.sha256) {
      findings.push({ code: "backup_hash_mismatch", path: backup.path });
    }
    if (process.platform !== "win32" && state.mode !== backup.mode) {
      findings.push({ code: "backup_mode_mismatch", path: backup.path });
    }
    if (host) {
      try {
        await verifyFilePermissions(backup.path, host, backup.mode);
      } catch (error) {
        findings.push({
          code: "backup_permissions_invalid",
          path: backup.path,
          reason: error.code ?? "permission_check_failed",
        });
      }
    }
  }

  if (manifest.runtime?.treeDigest) {
    try {
      const inventory = await inventoryTree(paths.venvRoot, { allowSymlinks: true });
      if (inventory.digest !== manifest.runtime.treeDigest) {
        findings.push({ code: "runtime_tree_drift", path: paths.venvRoot });
      }
    } catch (error) {
      findings.push({
        code: "runtime_tree_unverifiable",
        path: paths.venvRoot,
        reason: error.code || error.message,
      });
    }
  }

  for (const [name, target] of [
    ["provider", paths.providerSecret],
    ["gateway", paths.gatewaySecret],
  ]) {
    const state = await inspectPath(target, { hash: false });
    if (state.kind !== "file") {
      findings.push({ code: "credential_missing_or_changed_type", path: target });
    } else if (host) {
      const expected = manifest.credentials?.[name];
      if (
        state.mode !== expected?.mode ||
        state.size !== expected?.size ||
        state.mtimeMs !== expected?.mtimeMs
      ) {
        findings.push({ code: "credential_metadata_mismatch", path: target });
      }
      try {
        await verifyProtectedPermissions(target, host);
      } catch (error) {
        findings.push({
          code: "credential_permissions_invalid",
          path: target,
          reason: error.code ?? "permission_check_failed",
        });
      }
    }
  }

  if (host) {
    const directories = new Set([
      paths.configRoot,
      paths.stateRoot,
      paths.secretsDir,
      paths.binDir,
      path.dirname(paths.gatewayConfig),
      paths.runtimeRoot,
      paths.backupsRoot,
      ...(manifest.backups ?? []).map((backup) => path.dirname(backup.path)),
    ]);
    for (const directory of directories) {
      const state = await inspectPath(directory, { hash: false });
      if (state.kind !== "directory") continue;
      try {
        await verifyProtectedDirectory(directory, host);
      } catch (error) {
        findings.push({
          code: "managed_directory_permissions_invalid",
          path: directory,
          reason: error.code ?? "permission_check_failed",
        });
      }
    }
  }

  findings.push(
    ...(await managedNamespaceFindings(paths, {
      ...dependencies,
      externalParentState,
      host,
      manifest,
    })),
  );

  return {
    ok: findings.length === 0,
    findings,
    driftDigest: observedStateDigest(findings),
  };
}

function validReceiptStopRequest(receipt, paths = null) {
  if (receipt?.stopRequest === null) return true;
  const context = receipt?.stopRequest;
  const requestedAt = Date.parse(context?.requestedAt);
  const deadlineAt = Date.parse(context?.deadlineAt);
  const stopRequestName = path.basename(paths?.processStopRequest ?? "process-stop.json");
  const claimPrefix = `.${stopRequestName}.${receipt?.runnerPid}.`;
  const claimSuffix = ".quarantine";
  const claimId = context?.claim?.slice(claimPrefix.length, -claimSuffix.length);
  return (
    hasExactKeys(context, ["claim", "deadlineAt", "requestedAt", "sha256"]) &&
    typeof context.claim === "string" &&
    path.basename(context.claim) === context.claim &&
    context.claim.startsWith(claimPrefix) &&
    context.claim.endsWith(claimSuffix) &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u.test(claimId) &&
    isSha256(context.sha256) &&
    Number.isFinite(requestedAt) &&
    Number.isFinite(deadlineAt) &&
    deadlineAt > requestedAt &&
    deadlineAt - requestedAt <= PROCESS_STOP_TIMEOUT_MS &&
    new Date(requestedAt).toISOString() === context.requestedAt &&
    new Date(deadlineAt).toISOString() === context.deadlineAt
  );
}

function validateProcessReceiptStructure(receipt, paths = null) {
  invariant(
    receipt?.schemaVersion === PROCESS_RECEIPT_SCHEMA_VERSION,
    "process_receipt_schema_unsupported",
    "Unsupported process receipt schema",
  );
  invariant(
    hasExactKeys(receipt, [
      "childPid",
      "configPath",
      "configSha256",
      ...(receipt?.status === "stopping" ? ["stopReason", "stopRequest"] : []),
      ...(["stopped", "failed"].includes(receipt?.status)
        ? ["error", "exitCode", "exitSignal", "stopRequest"]
        : []),
      "gatewayArgsDigest",
      "gatewayExecutable",
      "heartbeatAt",
      "host",
      "port",
      "processToken",
      "runnerExecutable",
      "runnerPid",
      "runnerScript",
      "schemaVersion",
      "startedAt",
      "status",
    ]) &&
      /^[a-f0-9]{64}$/.test(receipt.processToken) &&
      Number.isInteger(receipt.runnerPid) &&
      receipt.runnerPid > 0 &&
      Number.isInteger(receipt.childPid) &&
      receipt.childPid > 0 &&
      absolutePath(receipt.runnerExecutable) &&
      absolutePath(receipt.runnerScript) &&
      absolutePath(receipt.gatewayExecutable) &&
      isSha256(receipt.gatewayArgsDigest) &&
      absolutePath(receipt.configPath) &&
      isSha256(receipt.configSha256) &&
      receipt.host === GATEWAY_HOST &&
      receipt.port === GATEWAY_PORT &&
      Number.isFinite(Date.parse(receipt.startedAt)) &&
      Number.isFinite(Date.parse(receipt.heartbeatAt)) &&
      ["ready", "stopping", "stopped", "failed"].includes(receipt.status),
    "process_receipt_invalid",
    "Process receipt has an incomplete or unsupported identity",
  );
  invariant(
    (receipt.status !== "stopping" ||
      (typeof receipt.stopReason === "string" &&
        receipt.stopReason.length > 0 &&
        validReceiptStopRequest(receipt, paths))) &&
      (!["stopped", "failed"].includes(receipt.status) ||
        ((receipt.error === null ||
          (typeof receipt.error === "string" && receipt.error.length > 0)) &&
          (receipt.exitCode === null || Number.isInteger(receipt.exitCode)) &&
          (receipt.exitSignal === null ||
            (typeof receipt.exitSignal === "string" && receipt.exitSignal.length > 0)) &&
          validReceiptStopRequest(receipt, paths) &&
          (receipt.error !== null || receipt.exitCode !== null || receipt.exitSignal !== null))),
    "process_receipt_invalid",
    "Process receipt terminal metadata is inconsistent with its status",
  );
}

function gatewayArgumentsDigest(paths) {
  const args = [
    "--config",
    paths.gatewayConfig,
    "--host",
    GATEWAY_HOST,
    "--port",
    String(GATEWAY_PORT),
  ];
  return crypto.createHash("sha256").update(JSON.stringify(args)).digest("hex");
}

function assertOperationDeadline(options, label) {
  if (options.deadlineAt === undefined || options.deadlineAt === null) return;
  const deadlineReserveMs = Number(options.deadlineReserveMs ?? 0);
  invariant(
    Number.isFinite(Number(options.deadlineAt)) &&
      Number.isFinite(deadlineReserveMs) &&
      deadlineReserveMs >= 0 &&
      Date.now() < Number(options.deadlineAt) - deadlineReserveMs,
    "permission_command_timeout",
    `${label} exceeded its lifecycle deadline`,
  );
}

export async function processIdentityFindings(receipt, manifest, paths, options = {}) {
  assertOperationDeadline(options, "Process identity proof");
  assertCurrentHostStorageBoundaries(paths, options.host);
  try {
    validateProcessReceiptStructure(receipt, paths);
  } catch (error) {
    return [{ code: error.code ?? "process_receipt_invalid", path: paths.processReceipt }];
  }

  const findings = [];
  const configArtifact = manifest.artifacts?.find((artifact) => artifact.role === "gateway-config");
  const runnerArtifact = manifest.artifacts?.find((artifact) => artifact.role === "gateway-runner");
  let expectedConfigPath = path.resolve(paths.gatewayConfig);
  let expectedRunnerScript = path.resolve(paths.gatewayRunner);
  let runnerState = { kind: "file", sha256: runnerArtifact?.sha256 };
  let configState = { kind: "file", sha256: configArtifact?.sha256 };
  if (options.checkCurrentFiles !== false) {
    assertCurrentHostStorageBoundaries(paths, options.host);
    runnerState = await inspectPath(paths.gatewayRunner);
    assertOperationDeadline(options, "Process identity proof");
    assertCurrentHostStorageBoundaries(paths, options.host);
    configState = await inspectPath(paths.gatewayConfig);
    assertOperationDeadline(options, "Process identity proof");
    try {
      assertCurrentHostStorageBoundaries(paths, options.host);
      expectedConfigPath = fs.realpathSync.native(paths.gatewayConfig);
      expectedRunnerScript = fs.realpathSync.native(paths.gatewayRunner);
    } catch {
      findings.push({ code: "process_identity_file_missing", path: paths.processReceipt });
    }
  }
  const expectedRunnerExecutable =
    options.expectedRunnerExecutable ??
    manifest.process?.runnerExecutable ??
    manifest.executables?.node?.path;
  const identityMatches =
    runnerState.kind === "file" &&
    runnerState.sha256 === runnerArtifact?.sha256 &&
    configState.kind === "file" &&
    configState.sha256 === configArtifact?.sha256 &&
    receipt.configSha256 === configArtifact?.sha256 &&
    receipt.configPath === expectedConfigPath &&
    receipt.runnerScript === expectedRunnerScript &&
    receipt.runnerExecutable === expectedRunnerExecutable &&
    receipt.gatewayExecutable === manifest.runtime?.litellmExecutable &&
    receipt.gatewayArgsDigest === gatewayArgumentsDigest(paths);
  if (!identityMatches) {
    findings.push({ code: "process_identity_mismatch", path: paths.processReceipt });
  }

  if (!options.allowUnrecordedProcess) {
    if (!manifestProcessHasIdentity(manifest.process)) {
      findings.push({ code: "process_manifest_state_mismatch", path: paths.processReceipt });
    } else if (
      !(
        manifest.process.status === receipt.status ||
        (options.allowStatusTransition === true &&
          manifest.process.status === "ready" &&
          ["stopping", "stopped", "failed"].includes(receipt.status))
      ) ||
      manifest.process.processToken !== receipt.processToken ||
      manifest.process.startedAt !== receipt.startedAt ||
      manifest.process.runnerPid !== receipt.runnerPid ||
      manifest.process.childPid !== receipt.childPid ||
      manifest.process.runnerExecutable !== receipt.runnerExecutable ||
      manifest.process.runnerScript !== receipt.runnerScript ||
      manifest.process.gatewayExecutable !== receipt.gatewayExecutable ||
      manifest.process.gatewayArgsDigest !== receipt.gatewayArgsDigest ||
      manifest.process.configSha256 !== receipt.configSha256
    ) {
      findings.push({ code: "process_manifest_identity_mismatch", path: paths.processReceipt });
    }
  }
  assertOperationDeadline(options, "Process identity proof");
  return findings;
}

export async function readProcessReceipt(paths, host, options = {}) {
  assertOperationDeadline(options, "Process receipt read");
  assertCurrentHostStorageBoundaries(paths, host);
  const state = await inspectPath(paths.processReceipt, { hash: false });
  assertOperationDeadline(options, "Process receipt read");
  if (state.kind === "absent") return null;
  invariant(
    state.kind === "file",
    "process_receipt_invalid",
    `Process receipt is not a regular file: ${paths.processReceipt}`,
  );
  invariant(host, "host_required", "Protected process receipt reads require a host boundary");
  await verifyRestrictedFilePermissions(paths.processReceipt, host, 0o600, options);
  assertOperationDeadline(options, "Process receipt read");
  let receipt;
  try {
    receipt = await readJson(paths.processReceipt, {
      invalidCode: "process_receipt_invalid",
      maxBytes: 65_536,
      shapeCode: "process_receipt_invalid",
      tooLargeCode: "process_receipt_invalid",
      unsafeCode: "process_receipt_invalid",
    });
  } catch {
    throw new SetupError("process_receipt_invalid", "Process receipt is not valid bounded JSON");
  }
  assertOperationDeadline(options, "Process receipt read");
  validateProcessReceiptStructure(receipt, paths);
  return receipt;
}

export async function readRollbackState(paths, host) {
  assertCurrentHostStorageBoundaries(paths, host);
  const state = await inspectPath(paths.rollbackReceipt, { hash: false });
  if (state.kind === "absent") return null;
  invariant(
    state.kind === "file",
    "rollback_receipt_invalid",
    `Rollback receipt is not a regular file: ${paths.rollbackReceipt}`,
  );
  invariant(host, "host_required", "Protected rollback state reads require a host boundary");
  try {
    await verifyRestrictedFilePermissions(paths.rollbackReceipt, host, 0o600);
  } catch {
    throw new SetupError(
      "rollback_receipt_invalid",
      "Rollback state protection metadata is invalid",
    );
  }
  let rollbackState;
  try {
    rollbackState = await readJson(paths.rollbackReceipt, {
      invalidCode: "rollback_receipt_invalid",
      shapeCode: "rollback_receipt_invalid",
      tooLargeCode: "rollback_receipt_invalid",
      unsafeCode: "rollback_receipt_invalid",
    });
  } catch {
    throw new SetupError("rollback_receipt_invalid", "Rollback state is not valid bounded JSON");
  }
  validateRollbackStateStructure(paths, rollbackState);
  return rollbackState;
}

export async function readRollbackReceipt(paths, host) {
  const state = await readRollbackState(paths, host);
  return state?.kind === "hetzner-inference-rollback-receipt" ? state : null;
}

export async function verifyCompletedRollbackReceipt(paths, receipt, options = {}) {
  assertCurrentHostStorageBoundaries(paths, options.host);
  validateRollbackStateStructure(paths, receipt);
  invariant(
    receipt.kind === "hetzner-inference-rollback-receipt",
    "rollback_receipt_invalid",
    "Rollback state is not complete",
  );
  const externalParentState = await inspectExternalArtifactParents(
    paths,
    receipt.removed,
    options.host,
    options,
  );
  assertCurrentHostStorageBoundaries(paths, options.host);
  const blockedExternalParents = new Set([
    ...externalParentState.absentParents,
    ...externalParentState.invalidParents,
  ]);
  const requiredExternalParents = new Set(externalArtifactParents(paths, receipt.removed));
  const findings = [...externalParentState.findings];
  for (const parent of externalParentState.absentParents) {
    if (requiredExternalParents.has(parent)) {
      findings.push({ code: "external_parent_missing", path: parent });
    }
  }
  for (const target of receipt.removed) {
    if (blockedExternalParents.has(normalized(path.dirname(target)))) continue;
    assertCurrentHostStorageBoundaries(paths, options.host);
    if ((await inspectPath(target, { hash: false })).kind !== "absent") {
      findings.push({ code: "rollback_target_reappeared", path: target });
    }
  }
  for (const target of receipt.preservedCredentials) {
    assertCurrentHostStorageBoundaries(paths, options.host);
    const current = await inspectPath(target, { hash: false });
    if (digestJson(current) !== digestJson(receipt.preservedCredentialObservations[target])) {
      findings.push({ code: "rollback_credential_drift", path: target });
    }
  }
  if (options.verifyCredentialContent === true) {
    invariant(options.host, "host_required", "Credential continuity verification requires a host");
    try {
      const current = await credentialPairContinuity(paths, options.host);
      if (digestJson(current) !== digestJson(receipt.credentialContinuity)) {
        findings.push({ code: "rollback_credential_content_drift", path: paths.secretsDir });
      }
    } catch (error) {
      findings.push({
        code: error.code ?? "rollback_credential_content_unverifiable",
        path: paths.secretsDir,
      });
    }
  }
  findings.push(
    ...(await managedNamespaceFindings(paths, {
      ...options,
      staticTargets: receipt.removed,
      externalParentState,
    })),
  );
  return {
    ok: findings.length === 0,
    findings,
    driftDigest: observedStateDigest(findings),
  };
}

export function processReceiptFresh(receipt, now = Date.now()) {
  if (!receipt?.heartbeatAt || receipt.status !== "ready") return false;
  const heartbeat = Date.parse(receipt.heartbeatAt);
  return Number.isFinite(heartbeat) && now - heartbeat >= 0 && now - heartbeat <= 10_000;
}

async function noManifestResidualFindings(paths, host, dependencies = {}) {
  assertCurrentHostStorageBoundaries(paths, host);
  const externalParentState = await inspectExternalArtifactParents(
    paths,
    [paths.codexProfile],
    host,
    dependencies,
  );
  assertCurrentHostStorageBoundaries(paths, host);
  const blockedExternalParents = new Set([
    ...externalParentState.absentParents,
    ...externalParentState.invalidParents,
  ]);
  const findings = await managedNamespaceFindings(paths, {
    host,
    ...dependencies,
    staticTargets: [paths.codexProfile],
    externalParentState,
  });
  const targets = [
    paths.backupsRoot,
    paths.claudeLauncher,
    paths.codexProfile,
    paths.credentialHelper,
    paths.gatewayConfig,
    paths.gatewayRunner,
    paths.gatewaySecret,
    paths.lock,
    paths.processReceipt,
    paths.processStopRequest,
    paths.protectedFileHelper,
    paths.providerSecret,
    paths.configRoot,
    paths.stateRoot,
    paths.venvRoot,
  ];
  for (const target of [...new Set(targets)].sort()) {
    if (blockedExternalParents.has(normalized(path.dirname(target)))) continue;
    if ((await inspectPath(target, { hash: false })).kind !== "absent") {
      findings.push({ code: "unowned_managed_residual", path: target });
    }
  }
  return findings.filter(
    (finding, index, all) =>
      all.findIndex(
        (candidate) => candidate.code === finding.code && candidate.path === finding.path,
      ) === index,
  );
}

async function processStopRequestFindings(paths, processReceipt, host) {
  assertCurrentHostStorageBoundaries(paths, host);
  const state = await inspectPath(paths.processStopRequest, { hash: false });
  if (state.kind === "absent") return [];
  if (state.kind !== "file") {
    return [{ code: "process_stop_request_invalid", path: paths.processStopRequest }];
  }
  let request;
  try {
    assertCurrentHostStorageBoundaries(paths, host);
    await verifyProtectedPermissions(paths.processStopRequest, host);
    assertCurrentHostStorageBoundaries(paths, host);
    request = await readJson(paths.processStopRequest, {
      invalidCode: "process_stop_request_invalid",
      maxBytes: 16_384,
      shapeCode: "process_stop_request_invalid",
      tooLargeCode: "process_stop_request_invalid",
      unsafeCode: "process_stop_request_invalid",
    });
    const requestedAt = Date.parse(request.requestedAt);
    const deadlineAt = Date.parse(request.deadlineAt);
    invariant(
      hasExactKeys(request, ["deadlineAt", "processToken", "requestedAt", "schemaVersion"]) &&
        request.schemaVersion === 1 &&
        /^[a-f0-9]{64}$/.test(request.processToken) &&
        Number.isFinite(requestedAt) &&
        Number.isFinite(deadlineAt) &&
        deadlineAt > requestedAt &&
        deadlineAt - requestedAt <= PROCESS_STOP_TIMEOUT_MS,
      "process_stop_request_invalid",
      "Process stop request is malformed",
    );
  } catch (error) {
    return [
      {
        code: "process_stop_request_invalid",
        path: paths.processStopRequest,
        reason: error.code ?? "invalid_stop_request",
      },
    ];
  }
  if (!processReceipt || !["ready", "stopping"].includes(processReceipt.status)) {
    return [{ code: "process_stop_request_not_active", path: paths.processStopRequest }];
  }
  if (request.processToken !== processReceipt.processToken) {
    return [{ code: "process_stop_request_identity_mismatch", path: paths.processStopRequest }];
  }
  return [];
}

export async function installationStatus(host, paths, now, dependencies = {}) {
  assertCurrentHostStorageBoundaries(paths, host);
  const manifest = await loadManifest(paths, { host });
  // Runtime hashing may outlast a heartbeat window; read the receipt after that work.
  const manifestVerification = manifest
    ? await verifyManifest(paths, manifest, host, dependencies)
    : null;
  let processReceipt = null;
  let processReadFinding = null;
  try {
    processReceipt = await readProcessReceipt(paths, host);
  } catch (error) {
    processReadFinding = {
      code: error.code ?? "process_receipt_invalid",
      path: paths.processReceipt,
    };
  }
  const stopRequestFindings = await processStopRequestFindings(paths, processReceipt, host);
  if (!manifest) {
    const rollbackState = await readRollbackState(paths, host);
    const rollbackReceipt =
      rollbackState?.kind === "hetzner-inference-rollback-receipt" ? rollbackState : null;
    const residualFindings = rollbackReceipt
      ? []
      : await noManifestResidualFindings(paths, host, dependencies);
    const rollbackVerification = rollbackReceipt
      ? await verifyCompletedRollbackReceipt(paths, rollbackReceipt, { host, ...dependencies })
      : rollbackState
        ? (() => {
            const findings = [
              { code: "rollback_incomplete", path: paths.rollbackReceipt },
              ...residualFindings.filter((finding) => finding.path !== paths.rollbackReceipt),
            ].filter(
              (finding, index, all) =>
                all.findIndex(
                  (candidate) => candidate.code === finding.code && candidate.path === finding.path,
                ) === index,
            );
            return {
              ok: false,
              findings,
              driftDigest: observedStateDigest(findings),
            };
          })()
        : null;
    const residualVerification =
      !rollbackState && residualFindings.length > 0
        ? {
            ok: false,
            findings: residualFindings,
            driftDigest: observedStateDigest(residualFindings),
          }
        : null;
    const rolledBack = rollbackReceipt && rollbackVerification.ok;
    const blockedByResidualState = residualVerification !== null;
    const processFindings = [
      ...(processReadFinding ? [processReadFinding] : []),
      ...stopRequestFindings,
    ];
    return {
      installed: false,
      components: rolledBack
        ? rollbackReceipt.components
        : {
            provider: rollbackState || blockedByResidualState ? "blocked" : "verification_required",
            gateway: rollbackState || blockedByResidualState ? "blocked" : "verification_required",
            codex: rollbackState || blockedByResidualState ? "blocked" : "verification_required",
            "claude-code":
              rollbackState || blockedByResidualState ? "blocked" : "verification_required",
            cursor: "blocked",
          },
      drift: rollbackVerification ?? residualVerification,
      process: processReadFinding
        ? "unowned_receipt_invalid"
        : processReceipt
          ? "unowned_receipt"
          : stopRequestFindings.length > 0
            ? "unowned_stop_request"
            : "absent",
      processVerification: {
        ok: processFindings.length === 0,
        findings: processFindings,
      },
      rollback: rollbackState
        ? {
            observedAt: rollbackReceipt?.observedAt ?? rollbackState.updatedAt,
            planId: rollbackState.planId,
            status: rolledBack ? "completed" : "in_progress_or_drifted",
            credentialContinuity: "recorded_not_read_offline",
          }
        : null,
    };
  }

  const processFindings = [
    ...(processReadFinding ? [processReadFinding] : []),
    ...stopRequestFindings,
  ];
  if (!processReadFinding && processReceipt) {
    processFindings.push(
      ...(await processIdentityFindings(processReceipt, manifest, paths, { host })),
    );
  } else if (!processReadFinding && manifestProcessHasIdentity(manifest.process)) {
    processFindings.push({ code: "process_receipt_missing", path: paths.processReceipt });
  }
  const processVerification = {
    ok: processFindings.length === 0,
    findings: processFindings,
  };
  const findings = [...manifestVerification.findings, ...processFindings];
  const verification = {
    ok: findings.length === 0,
    findings,
    driftDigest: observedStateDigest(findings),
  };
  const components = { ...manifest.components };
  if (!verification.ok) {
    for (const component of Object.keys(components)) {
      if (components[component] !== "rolled_back") components[component] = "blocked";
    }
  }
  return {
    installed: true,
    host: host.kind,
    manifestPlanId: manifest.lastPlanId,
    components,
    drift: verification,
    process:
      processVerification.ok && processReceiptFresh(processReceipt, now)
        ? "owned_ready"
        : "not_proven_running",
    processVerification,
  };
}

export function manifestArtifact(manifest, target) {
  return manifest?.artifacts?.find(
    (artifact) => path.resolve(artifact.path) === path.resolve(target),
  );
}

export function requireOwnedArtifact(manifest, target) {
  const artifact = manifestArtifact(manifest, target);
  if (!artifact) {
    throw new SetupError(
      "unowned_target",
      `Target is not owned by the install manifest: ${target}`,
    );
  }
  return artifact;
}
