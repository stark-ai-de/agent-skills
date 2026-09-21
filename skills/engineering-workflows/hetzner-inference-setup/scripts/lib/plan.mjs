import fs from "node:fs";
import path from "node:path";
import {
  CLIENTS,
  DISCOVERY_EVIDENCE_TTL_MS,
  EVIDENCE_SCHEMA_VERSION,
  GATEWAY_PORT,
  LITELLM_PIN,
  LITELLM_RUNTIME_DEPENDENCIES,
  PLAN_SCHEMA_VERSION,
  PLAN_TTL_MS,
  PLAN_WORKFLOWS,
  PROVIDER_BASE_URL,
  PYTHON_MAX_EXCLUSIVE,
  PYTHON_MIN,
  SKILL_VERSION,
} from "./constants.mjs";
import {
  desiredStaticFiles,
  externalArtifactParents,
  gatewayExecutable,
  loadTemplateAssets,
  ownedArtifactContracts,
  requireCodexProfileVersion,
  venvPythonExecutable,
} from "./config.mjs";
import { invariant } from "./errors.mjs";
import { assertWithin, inspectPath, observedStateDigest, readJson } from "./files.mjs";
import {
  assertWslSameEnvironmentPath,
  captureVersion,
  compareVersion,
  parsePythonVersion,
  resolveExecutable,
} from "./hosts.mjs";
import { digestJson, withoutKeys } from "./json.mjs";
import {
  inspectProtectedDirectoryBoundary,
  preflightExternalProtectedDirectory,
  validProtectedDirectoryBoundaryObservation,
  verifyProtectedDirectory,
  verifyProtectedPermissions,
} from "./permissions.mjs";
import {
  assertCurrentHostStorageBoundaries,
  assertManagedNamespace,
  loadManifest,
  offlineObservations,
  readRollbackState,
  rollbackContract,
  verifyCompletedRollbackReceipt,
  verifyManifest,
} from "./state.mjs";

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function validateClients(values, { required = false } = {}) {
  const clients = sortedUnique(values ?? []);
  invariant(
    !required || clients.length > 0,
    "clients_required",
    "Select at least one client to add",
  );
  for (const client of clients) {
    invariant(CLIENTS.includes(client), "client_unsupported", `Unsupported client: ${client}`);
  }
  return clients;
}

async function readEvidenceSnapshot(file) {
  const target = path.resolve(file);
  const before = await inspectPath(target);
  invariant(
    before.kind === "file",
    "evidence_file_unsafe",
    `Evidence is not a regular file: ${target}`,
  );
  const evidence = await readJson(target, {
    invalidCode: "evidence_json_invalid",
    shapeCode: "evidence_json_shape_invalid",
    tooLargeCode: "evidence_json_too_large",
    unsafeCode: "evidence_file_unsafe",
  });
  const after = await inspectPath(target);
  invariant(
    JSON.stringify(before) === JSON.stringify(after),
    "evidence_changed_during_read",
    `Evidence changed while it was read: ${target}`,
  );
  return { evidence, path: target, sha256: after.sha256 };
}

export async function validateDiscoveryEvidence(file, model, now) {
  invariant(file, "discovery_evidence_required", "A persisted discovery evidence file is required");
  const snapshot = await readEvidenceSnapshot(file);
  const evidence = snapshot.evidence;
  invariant(
    evidence.schemaVersion === EVIDENCE_SCHEMA_VERSION &&
      evidence.kind === "hetzner-inference-provider-discovery",
    "discovery_evidence_invalid",
    "Unsupported provider discovery evidence",
  );
  invariant(
    evidence.provider?.baseUrl === PROVIDER_BASE_URL,
    "discovery_evidence_wrong_provider",
    "Discovery evidence does not bind the authoritative Hetzner endpoint",
  );
  const observedAt = Date.parse(evidence.observedAt);
  invariant(
    Number.isFinite(observedAt),
    "discovery_evidence_invalid_time",
    "Discovery evidence has no valid observation time",
  );
  invariant(
    now - observedAt >= 0 && now - observedAt <= DISCOVERY_EVIDENCE_TTL_MS,
    "discovery_evidence_stale",
    "Provider discovery evidence is stale or from the future",
  );
  const models = Array.isArray(evidence.provider.models) ? evidence.provider.models : [];
  invariant(
    models.length > 0 &&
      JSON.stringify(models) === JSON.stringify(sortedUnique(models)) &&
      models.every((candidate) => typeof candidate === "string" && candidate.length > 0),
    "discovery_evidence_models_invalid",
    "Discovery evidence contains an invalid model inventory",
  );
  const results = Array.isArray(evidence.provider.results) ? evidence.provider.results : [];
  invariant(
    evidence.provider.model === null &&
      evidence.provider.state === "transport_verified" &&
      results.length === 1 &&
      results[0]?.name === "models" &&
      results[0]?.status === "verified" &&
      JSON.stringify(results[0]?.details?.models) === JSON.stringify(models) &&
      results[0]?.details?.count === models.length,
    "discovery_evidence_probe_invalid",
    "Discovery evidence does not contain one verified models probe",
  );
  invariant(
    models.includes(model),
    "model_not_discovered",
    `Selected model was not in live discovery: ${model}`,
  );
  return { path: snapshot.path, sha256: snapshot.sha256, observedAt: evidence.observedAt };
}

async function validateReachabilityEvidence(file, host, now) {
  invariant(
    file,
    "wsl_reachability_required",
    "Cross-boundary WSL routing requires persisted reachability evidence",
  );
  const snapshot = await readEvidenceSnapshot(file);
  const evidence = snapshot.evidence;
  const observedAt = Date.parse(evidence.observedAt);
  invariant(
    evidence.schemaVersion === EVIDENCE_SCHEMA_VERSION &&
      evidence.kind === "wsl-loopback-reachability" &&
      evidence.status === "verified",
    "wsl_reachability_invalid",
    "WSL reachability evidence is invalid",
  );
  invariant(
    evidence.wslDistribution === host.wslDistribution,
    "wsl_reachability_wrong_host",
    "WSL reachability evidence belongs to another distribution",
  );
  invariant(
    Number.isFinite(observedAt) &&
      now - observedAt >= 0 &&
      now - observedAt <= DISCOVERY_EVIDENCE_TTL_MS,
    "wsl_reachability_stale",
    "WSL reachability evidence is stale or from the future",
  );
  return { path: snapshot.path, sha256: snapshot.sha256, observedAt: evidence.observedAt };
}

async function resolveTool(name, options, required, host, optionName = name) {
  const explicit = options.executables?.[optionName];
  const candidates = explicit ? [explicit] : name === "python" ? ["python3", "python"] : [name];
  let executable = null;
  for (const candidate of candidates) {
    executable = resolveExecutable(candidate, {
      host,
      rejectCrossBoundaryCandidate: explicit !== undefined,
    });
    if (executable) break;
  }
  if (!executable) {
    invariant(!required, "executable_missing", `Required executable was not found: ${name}`);
    return { path: null, version: null };
  }
  assertWslSameEnvironmentPath(executable, host, `${optionName} executable`);
  return { path: executable, version: await captureVersion(executable) };
}

async function observeOptionalTool(name, options, host) {
  const explicit = options.executables?.[name];
  const executable = resolveExecutable(explicit ?? name, {
    host,
    rejectCrossBoundaryCandidate: explicit !== undefined,
  });
  if (!executable) return { path: null, version: null };
  try {
    assertWslSameEnvironmentPath(executable, host, `${name} executable`);
    const observedPath = fs.realpathSync.native(executable);
    assertWslSameEnvironmentPath(observedPath, host, `${name} executable`);
    assertWslSameEnvironmentPath(executable, host, `${name} executable`);
    return {
      path: null,
      version: await captureVersion(executable),
      observedPath,
    };
  } catch (error) {
    if (String(error?.code ?? "").startsWith("wsl_")) throw error;
    assertWslSameEnvironmentPath(executable, host, `${name} executable`);
    const observedPath = fs.realpathSync.native(executable);
    assertWslSameEnvironmentPath(observedPath, host, `${name} executable`);
    return {
      path: null,
      version: null,
      observedPath,
      versionError: error.code ?? "version_failed",
    };
  }
}

async function executableSnapshotEntry(name, tool, host) {
  if (!tool.path) return tool;
  assertWslSameEnvironmentPath(tool.path, host, `${name} executable`);
  const resolved = fs.realpathSync.native(tool.path);
  assertWslSameEnvironmentPath(resolved, host, `${name} executable`);
  assertWslSameEnvironmentPath(resolved, host, `${name} executable`);
  const observation = await inspectPath(resolved);
  invariant(
    observation.kind === "file" && isSha256(observation.sha256),
    "executable_missing",
    `Executable is not a hashable regular file: ${name}`,
  );
  return { path: resolved, version: tool.version, sha256: observation.sha256 };
}

async function resolveExecutables(clients, options, workflow, host) {
  const needsRuntime = workflow === "setup";
  const needsClientConfiguration = ["setup", "add-clients", "repair"].includes(workflow);
  assertWslSameEnvironmentPath(process.execPath, host, "node executable");
  const nodeExecutable = fs.realpathSync.native(process.execPath);
  assertWslSameEnvironmentPath(nodeExecutable, host, "node executable");
  const tools = {
    node: {
      path: nodeExecutable,
      version: process.version,
    },
    python: needsRuntime
      ? await resolveTool("python", options, true, host)
      : { path: null, version: null },
    codex:
      needsClientConfiguration && clients.includes("codex")
        ? await resolveTool("codex", options, true, host)
        : { path: null, version: null },
    "claude-code":
      needsClientConfiguration && clients.includes("claude-code")
        ? await resolveTool("claude", options, true, host, "claude-code")
        : { path: null, version: null },
    cursor:
      needsClientConfiguration && clients.includes("cursor")
        ? await observeOptionalTool("cursor", options, host)
        : { path: null, version: null },
  };

  if (tools.codex.path) requireCodexProfileVersion(tools.codex.version);
  if (needsRuntime) {
    const pythonVersion = parsePythonVersion(tools.python.version);
    invariant(
      pythonVersion,
      "python_version_invalid",
      "Unable to parse the selected Python version",
    );
    invariant(
      compareVersion(pythonVersion, PYTHON_MIN) >= 0 &&
        compareVersion(pythonVersion, PYTHON_MAX_EXCLUSIVE) < 0,
      "python_version_unsupported",
      "Python must be >=3.10 and <3.15 for the reviewed LiteLLM baseline",
      { version: tools.python.version },
    );
  }

  return Object.fromEntries(
    await Promise.all(
      Object.entries(tools).map(async ([name, tool]) => [
        name,
        await executableSnapshotEntry(name, tool, host),
      ]),
    ),
  );
}

function validatePlanWorkflow(workflow) {
  invariant(
    PLAN_WORKFLOWS.includes(workflow),
    "workflow_unsupported",
    `Unsupported plan workflow: ${workflow}`,
  );
  return workflow;
}

function expectedDesiredTargets(plan, paths) {
  if (!["setup", "add-clients", "repair"].includes(plan.workflow)) return [];
  return [...ownedArtifactContracts(paths, plan.clients).keys()].sort();
}

function expectedInstalledArtifactTargets(plan, paths) {
  return [...expectedInstalledArtifactContracts(plan, paths).keys()].sort();
}

function expectedInstalledArtifactContracts(plan, paths) {
  return ownedArtifactContracts(paths, plan.clients);
}

function validateRollbackShape(plan, paths) {
  if (plan.workflow !== "rollback") {
    invariant(
      plan.rollback === null,
      "plan_rollback_mismatch",
      "Non-rollback plan contains rollback state",
    );
    return;
  }
  const rollback = plan.rollback;
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
    "plan_rollback_mismatch",
    "Rollback plan does not expose the complete finite deletion contract",
  );
  invariant(
    JSON.stringify(rollback.preserveCredentials) ===
      JSON.stringify([paths.gatewaySecret, paths.providerSecret].sort()),
    "plan_rollback_credential_mismatch",
    "Rollback plan changes the preserved credential set",
  );
  invariant(
    JSON.stringify(rollback.processState) ===
      JSON.stringify([paths.processReceipt, paths.processStopRequest].sort()),
    "plan_rollback_process_mismatch",
    "Rollback plan changes the finite process-state cleanup set",
  );
  const artifacts = Array.isArray(rollback.artifacts) ? rollback.artifacts : [];
  invariant(
    artifacts.every((entry) => path.isAbsolute(entry?.path) && isSha256(entry.sha256)) &&
      new Set(artifacts.map((entry) => entry.path)).size === artifacts.length &&
      JSON.stringify(artifacts.map((entry) => entry.path).sort()) ===
        JSON.stringify(expectedInstalledArtifactTargets(plan, paths)),
    "plan_rollback_artifacts_mismatch",
    "Rollback plan changes the finite owned artifact set",
  );
  const backups = Array.isArray(rollback.backups) ? rollback.backups : [];
  invariant(
    backups.every((entry) => path.isAbsolute(entry?.path) && isSha256(entry.sha256)) &&
      new Set(backups.map((entry) => entry.path)).size === backups.length,
    "plan_rollback_backups_mismatch",
    "Rollback plan contains invalid or duplicate backup targets",
  );
  for (const backup of backups) {
    assertWithin(backup.path, paths.backupsRoot, "rollback backup");
    invariant(
      path.resolve(backup.path) !== path.resolve(paths.backupsRoot),
      "plan_rollback_backups_mismatch",
      "Rollback plan cannot remove the backup root as a file",
    );
  }
  invariant(
    rollback.runtime?.path === paths.venvRoot && isSha256(rollback.runtime.treeDigest),
    "plan_rollback_runtime_mismatch",
    "Rollback plan changes the owned runtime target",
  );
  invariant(
    rollback.manifest?.path === paths.manifest &&
      isSha256(rollback.manifest.sha256) &&
      rollback.manifest.sha256 === plan.state?.observations?.[paths.manifest]?.sha256,
    "plan_rollback_manifest_mismatch",
    "Rollback plan is not bound to the observed install manifest",
  );
  const expectedEmptyDirectories = sortedUnique([
    paths.binDir,
    path.dirname(paths.gatewayConfig),
    paths.runtimeRoot,
    ...backups.map((backup) => path.dirname(backup.path)),
    paths.backupsRoot,
  ]);
  invariant(
    JSON.stringify(rollback.emptyDirectories) === JSON.stringify(expectedEmptyDirectories),
    "plan_rollback_directories_mismatch",
    "Rollback plan changes the finite empty-directory cleanup set",
  );
}

function expectedApprovalsFromPlan(plan) {
  const approvals = ["write-owned-state"];
  if (plan.workflow === "setup") approvals.push("install-exact-litellm-pin");
  if (plan.credentials.actions.provider === "create") approvals.push("store-provider-credential");
  if (plan.credentials.actions.gateway === "generate") {
    approvals.push("generate-administrative-gateway-key");
  }
  if (plan.workflow === "rotate") {
    approvals.push(`rotate-${plan.rotation?.credential}-credential`);
  }
  if (plan.workflow === "rollback") approvals.push("remove-owned-non-secret-artifacts");
  if (plan.process.action === "start" || plan.process.action === "restart") {
    approvals.push("start-owned-gateway");
  }
  if (
    plan.process.action === "stop" ||
    plan.process.action === "restart" ||
    plan.workflow === "rotate" ||
    plan.workflow === "rollback"
  ) {
    approvals.push("stop-owned-gateway");
  }
  return sortedUnique(approvals);
}

function validatePlanShape(plan, host, paths) {
  assertCurrentHostStorageBoundaries(paths, host);
  validatePlanWorkflow(plan.workflow);
  invariant(
    plan.skillVersion === SKILL_VERSION,
    "plan_skill_version_mismatch",
    "Plan belongs to another skill version",
  );
  invariant(
    plan.port === GATEWAY_PORT,
    "plan_port_mismatch",
    "Plan changes the reviewed loopback port",
  );
  invariant(
    typeof plan.model === "string" && plan.model.length > 0,
    "plan_model_invalid",
    "Plan has no selected model",
  );
  const clients = sortedUnique(plan.clients ?? []);
  invariant(
    JSON.stringify(clients) === JSON.stringify(plan.clients) &&
      clients.every((client) => CLIENTS.includes(client)),
    "plan_clients_invalid",
    "Plan clients are unsupported, duplicated, or unsorted",
  );
  invariant(
    plan.state?.observations && typeof plan.state.observations === "object",
    "plan_state_missing",
    "Plan has no observed-state binding",
  );
  invariant(
    plan.state.digest === observedStateDigest(plan.state.observations),
    "plan_state_digest_mismatch",
    "Plan observed-state digest does not match its observations",
  );
  const manifestObservation = plan.state.observations[paths.manifest];
  invariant(
    plan.workflow === "setup"
      ? manifestObservation?.kind === "absent"
      : manifestObservation?.kind === "file" && isSha256(manifestObservation.sha256),
    "plan_manifest_observation_mismatch",
    "Plan manifest observation does not match its workflow",
  );
  invariant(
    plan.host.kind === host.kind &&
      plan.host.platform === host.platform &&
      plan.host.configRoot === paths.configRoot &&
      plan.host.stateRoot === paths.stateRoot &&
      plan.host.codexHome === host.codexHome &&
      plan.host.wslDistribution === host.wslDistribution &&
      plan.host.crossBoundary === false,
    "plan_host_mismatch",
    "Plan belongs to another host, root, or unsupported cross-boundary route",
  );
  invariant(
    plan.litellm.version === LITELLM_PIN &&
      plan.litellm.package === `litellm[proxy]==${LITELLM_PIN}` &&
      JSON.stringify(plan.litellm.runtimeDependencies) ===
        JSON.stringify(LITELLM_RUNTIME_DEPENDENCIES) &&
      plan.litellm.executable === gatewayExecutable(paths, host) &&
      plan.litellm.python === venvPythonExecutable(paths, host),
    "plan_runtime_mismatch",
    "Plan changes the reviewed LiteLLM runtime contract",
  );
  assertWslSameEnvironmentPath(process.execPath, host, "node executable");
  for (const [name, executable] of Object.entries(plan.executables ?? {})) {
    if (executable?.path) {
      assertWslSameEnvironmentPath(executable.path, host, `${name} executable`);
    }
  }
  invariant(
    plan.executables?.node?.path === fs.realpathSync.native(process.execPath) &&
      plan.executables.node.version === process.version &&
      isSha256(plan.executables.node.sha256),
    "plan_node_mismatch",
    "Plan was not created by this Node.js executable, version, and content identity",
  );
  for (const [name, executable] of Object.entries(plan.executables ?? {})) {
    invariant(
      executable.path === null ||
        (path.isAbsolute(executable.path) &&
          typeof executable.version === "string" &&
          isSha256(executable.sha256)),
      "plan_executable_identity_invalid",
      `Plan executable identity is incomplete: ${name}`,
    );
  }
  invariant(
    plan.credentials?.providerPath === paths.providerSecret &&
      plan.credentials?.gatewayPath === paths.gatewaySecret &&
      plan.credentials?.ordinaryRollbackPreservesCredentials === true &&
      plan.credentials?.localKeyDisclosure === "administrative",
    "plan_credential_contract_mismatch",
    "Plan changes credential paths or disclosure semantics",
  );
  invariant(
    plan.process?.runner === paths.gatewayRunner &&
      plan.process?.receipt === paths.processReceipt &&
      plan.process?.stopRequest === paths.processStopRequest &&
      ["none", "start", "stop", "restart"].includes(plan.process.action),
    "plan_process_contract_mismatch",
    "Plan changes the owned process contract",
  );
  const allowedProcessActions = {
    setup: ["none", "start"],
    "add-clients": ["none"],
    repair: ["none"],
    rotate: ["stop", "restart"],
    rollback: ["stop"],
    start: ["start"],
    stop: ["stop"],
  };
  invariant(
    allowedProcessActions[plan.workflow].includes(plan.process.action),
    "plan_process_action_mismatch",
    "Plan process action does not match its workflow",
  );
  invariant(
    plan.reachabilityEvidence === null,
    "plan_reachability_mismatch",
    "Same-boundary plans cannot contain cross-boundary reachability evidence",
  );
  const credentialActions = plan.credentials.actions;
  if (plan.workflow === "rotate") {
    invariant(
      ["provider", "gateway"].includes(plan.rotation?.credential) &&
        credentialActions.provider ===
          (plan.rotation.credential === "provider" ? "replace-from-stdin" : "preserve") &&
        credentialActions.gateway ===
          (plan.rotation.credential === "gateway" ? "replace-generated" : "preserve"),
      "plan_rotation_contract_mismatch",
      "Plan rotation actions do not match the selected credential",
    );
  } else {
    invariant(
      plan.rotation === null,
      "plan_rotation_contract_mismatch",
      "Non-rotation plan contains rotation state",
    );
    invariant(
      plan.workflow === "setup"
        ? ["create", "preserve"].includes(credentialActions.provider) &&
            ["generate", "preserve"].includes(credentialActions.gateway)
        : credentialActions.provider === "preserve" && credentialActions.gateway === "preserve",
      "plan_credential_action_mismatch",
      "Plan contains unsupported credential actions",
    );
  }
  invariant(
    (["create", "replace-from-stdin"].includes(credentialActions.provider)
      ? "stdin"
      : "protected-file") === plan.credentials.providerInput &&
      (["generate", "replace-generated"].includes(credentialActions.gateway)
        ? "cryptographically-generated"
        : "protected-file") === plan.credentials.gatewayInput,
    "plan_credential_input_mismatch",
    "Plan credential input does not match its action",
  );
  if (plan.workflow === "setup") {
    for (const [name, target, missingAction] of [
      ["provider", paths.providerSecret, "create"],
      ["gateway", paths.gatewaySecret, "generate"],
    ]) {
      const observation = plan.state.observations[target];
      invariant(
        ["absent", "file"].includes(observation?.kind) &&
          credentialActions[name] === (observation.kind === "file" ? "preserve" : missingAction),
        "plan_credential_action_mismatch",
        `Plan credential action does not match observed ${name} state`,
      );
    }
  }
  if (["setup", "add-clients"].includes(plan.workflow)) {
    invariant(
      typeof plan.discoveryEvidence?.path === "string" &&
        path.isAbsolute(plan.discoveryEvidence.path) &&
        isSha256(plan.discoveryEvidence.sha256) &&
        Number.isFinite(Date.parse(plan.discoveryEvidence.observedAt)),
      "plan_discovery_evidence_mismatch",
      "Plan has no valid live-discovery evidence binding",
    );
  }
  const desiredTargets = Object.keys(plan.desiredFiles ?? {}).sort();
  invariant(
    JSON.stringify(desiredTargets) === JSON.stringify(expectedDesiredTargets(plan, paths)),
    "plan_desired_targets_mismatch",
    "Plan changes the finite set of owned configuration targets",
  );
  const desiredContracts = expectedInstalledArtifactContracts(plan, paths);
  const externalParentTargets = expectedInstalledArtifactTargets(plan, paths);
  for (const parent of externalArtifactParents(paths, externalParentTargets)) {
    const observation = plan.state.observations[parent];
    invariant(
      validProtectedDirectoryBoundaryObservation(observation, host),
      "plan_external_parent_mismatch",
      `Plan does not bind a pre-existing protected external parent: ${parent}`,
    );
  }
  for (const target of desiredTargets) {
    const desired = plan.desiredFiles[target];
    const contract = desiredContracts.get(target);
    invariant(
      contract &&
        desired?.mode === contract.mode &&
        desired?.role === contract.role &&
        isSha256(desired.sha256) &&
        JSON.stringify(Object.keys(desired).sort()) === JSON.stringify(["mode", "role", "sha256"]),
      "plan_desired_file_mismatch",
      `Plan changes the owned file contract: ${target}`,
    );
  }
  const operations = Array.isArray(plan.operations) ? plan.operations : [];
  const operationTargets = operations.map((operation) => operation.path).sort();
  invariant(
    operationTargets.length === new Set(operationTargets).size &&
      JSON.stringify(operationTargets) === JSON.stringify(desiredTargets),
    "plan_operations_mismatch",
    "Plan operations do not map one-to-one to desired targets",
  );
  const expectedOperations = desiredTargets.map((target) => {
    const observation = plan.state.observations[target];
    invariant(
      observation && typeof observation.kind === "string",
      "plan_operation_observation_missing",
      `Plan has no observation for operation target: ${target}`,
    );
    return operationFor(target, observation, plan.desiredFiles[target], plan.host.platform);
  });
  invariant(
    digestJson(operations) === digestJson(expectedOperations),
    "plan_operations_mismatch",
    "Plan operation actions or backup semantics do not match observed state",
  );
  const sourceAssets = plan.sourceAssets ?? {};
  invariant(
    JSON.stringify(Object.keys(sourceAssets).sort()) ===
      JSON.stringify([
        "claude-hetzner.mjs",
        "gateway-runner.mjs",
        "protected-file.mjs",
        "read-credential.mjs",
      ]) && Object.values(sourceAssets).every(isSha256),
    "plan_source_assets_mismatch",
    "Plan source-asset set is incomplete or invalid",
  );
  invariant(
    JSON.stringify(sortedUnique(plan.requiredApprovals ?? [])) ===
      JSON.stringify(expectedApprovalsFromPlan(plan)),
    "plan_approvals_mismatch",
    "Plan approval disclosures do not match its actions",
  );
  invariant(
    digestJson(plan.claims) ===
      digestJson({
        provider: "planned",
        gateway: "planned",
        codex: plan.clients.includes("codex") ? "planned" : "blocked",
        "claude-code": plan.clients.includes("claude-code") ? "planned" : "blocked",
        cursor: plan.clients.includes("cursor") ? "verification_required" : "blocked",
      }),
    "plan_claims_mismatch",
    "Plan proof claims do not match its selected clients",
  );
  validateRollbackShape(plan, paths);
}

function requiredApprovals(workflow, options, credentialActions) {
  const approvals = ["write-owned-state"];
  if (workflow === "setup") {
    approvals.push("install-exact-litellm-pin");
  }
  if (credentialActions.provider === "create") approvals.push("store-provider-credential");
  if (credentialActions.gateway === "generate")
    approvals.push("generate-administrative-gateway-key");
  if (workflow === "rotate") approvals.push(`rotate-${options.rotateCredential}-credential`);
  if (workflow === "rollback") approvals.push("remove-owned-non-secret-artifacts");
  if (workflow === "start" || options.startAfterApply || options.restartAfterRotation) {
    approvals.push("start-owned-gateway");
  }
  if (
    workflow === "stop" ||
    workflow === "rollback" ||
    workflow === "rotate" ||
    options.stopBeforeMutation
  ) {
    approvals.push("stop-owned-gateway");
  }
  return sortedUnique(approvals);
}

function credentialActionsFor(workflow, observations, paths, options) {
  if (workflow === "rotate") {
    invariant(
      options.rotateCredential === "provider" || options.rotateCredential === "gateway",
      "rotate_credential_required",
      "Rotate plans must select provider or gateway",
    );
    return {
      provider: options.rotateCredential === "provider" ? "replace-from-stdin" : "preserve",
      gateway: options.rotateCredential === "gateway" ? "replace-generated" : "preserve",
    };
  }
  if (workflow !== "setup") {
    return { provider: "preserve", gateway: "preserve" };
  }
  return {
    provider: observations[paths.providerSecret]?.kind === "file" ? "preserve" : "create",
    gateway: observations[paths.gatewaySecret]?.kind === "file" ? "preserve" : "generate",
  };
}

function operationFor(target, current, desired, platform) {
  const next = { role: desired.role, sha256: desired.sha256, mode: desired.mode };
  if (
    current.kind === "file" &&
    current.sha256 === desired.sha256 &&
    (platform === "win32" || current.mode === desired.mode)
  ) {
    return { action: "noop", path: target, previous: current, next };
  }
  return {
    action: current.kind === "absent" ? "create" : "replace",
    path: target,
    previous: current,
    next,
    backup: current.kind === "file",
  };
}

export async function createPlan({ host, paths, options = {}, now = Date.now() }) {
  assertCurrentHostStorageBoundaries(paths, host);
  const workflow = validatePlanWorkflow(options.workflow ?? "setup");
  const rollbackState = await readRollbackState(paths, host);
  invariant(
    rollbackState?.kind !== "hetzner-inference-rollback-journal",
    "rollback_incomplete",
    "An interrupted rollback must be resumed with its original approved plan",
  );
  invariant(
    !options.startAfterApply || workflow === "setup",
    "start_after_apply_unsupported",
    "Only initial setup may combine apply and start; use a separate start plan for existing installations",
  );
  invariant(
    !options.restartAfterRotation || workflow === "rotate",
    "restart_after_rotation_wrong_workflow",
    "--restart-after-rotation is valid only for rotate plans",
  );
  invariant(
    options.rotateCredential === undefined || workflow === "rotate",
    "rotate_credential_wrong_workflow",
    "--rotate-credential is valid only for rotate plans",
  );
  invariant(
    options.acceptDrift === undefined || workflow === "repair",
    "accept_drift_wrong_workflow",
    "--accept-drift is valid only for repair plans",
  );
  invariant(
    options.port === undefined || Number(options.port) === GATEWAY_PORT,
    "port_unsupported",
    `This reviewed baseline binds only to 127.0.0.1:${GATEWAY_PORT}`,
  );

  let manifest = await loadManifest(paths, { host });
  if (["start", "stop", "rollback", "repair", "rotate", "add-clients"].includes(workflow)) {
    invariant(
      manifest,
      "installation_required",
      `${workflow} requires an owned installation manifest`,
    );
  }
  if (workflow === "setup") {
    invariant(
      !manifest,
      "already_installed",
      "Use add-clients, repair, rotate, lifecycle, or rollback for an existing installation",
    );
  }

  let clients;
  if (workflow === "setup") clients = validateClients(options.clients);
  else if (workflow === "add-clients") {
    const requestedClients = validateClients(options.clients, { required: true });
    invariant(
      requestedClients.some((client) => !(manifest.clients ?? []).includes(client)),
      "clients_already_configured",
      "Add-clients requires at least one client not already owned by the manifest",
    );
    clients = sortedUnique([...(manifest.clients ?? []), ...requestedClients]);
  } else clients = sortedUnique(manifest?.clients ?? options.clients ?? []);

  const externalParentTargets = [...ownedArtifactContracts(paths, clients).keys()];
  const externalParents = externalArtifactParents(paths, externalParentTargets);
  for (const parent of externalParents) {
    // This preflight deliberately precedes discovery, executable, template, and
    // observation I/O so a remote Windows path cannot trigger SMB access first.
    await preflightExternalProtectedDirectory(parent, host);
  }

  const model = options.model ?? manifest?.model;
  if (["setup", "add-clients"].includes(workflow)) {
    invariant(
      typeof model === "string" && model.length > 0,
      "model_required",
      "Select one live-discovered model",
    );
  }

  const discoveryEvidence = ["setup", "add-clients"].includes(workflow)
    ? await validateDiscoveryEvidence(options.discoveryEvidence, model, now)
    : (manifest?.discoveryEvidence ?? null);

  let reachabilityEvidence = null;
  if (host.kind === "wsl" && options.crossBoundary === true) {
    reachabilityEvidence = await validateReachabilityEvidence(
      options.reachabilityEvidence,
      host,
      now,
    );
    invariant(
      false,
      "cross_boundary_route_not_implemented",
      "Reachability was verified, but this baseline cannot own configuration in another OS boundary; run the gateway and client in the same environment",
    );
  } else {
    invariant(
      options.crossBoundary !== true,
      "cross_boundary_host_invalid",
      "Cross-boundary routing is only meaningful for WSL",
    );
  }

  const executables = await resolveExecutables(clients, options, workflow, host);
  const desiredFiles = ["setup", "add-clients", "repair"].includes(workflow)
    ? await desiredStaticFiles({
        claudeExecutable: executables["claude-code"].path,
        clients,
        host,
        model,
        paths,
        nodeExecutable: executables.node.path,
      })
    : {};
  const observations = await offlineObservations(paths, Object.keys(desiredFiles), host);
  for (const parent of externalParents) {
    try {
      observations[parent] = await inspectProtectedDirectoryBoundary(parent, host, {
        external: true,
      });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      invariant(
        false,
        "external_parent_required",
        `Client configuration requires a pre-existing protected parent directory: ${parent}`,
      );
    }
  }
  let completedRollbackVerified = false;
  if (workflow === "setup" && rollbackState?.kind === "hetzner-inference-rollback-receipt") {
    const verification = await verifyCompletedRollbackReceipt(paths, rollbackState, { host });
    invariant(
      verification.ok,
      "rollback_receipt_drift",
      "Preserved credentials can be reused only from an unchanged completed rollback receipt",
      verification,
    );
    for (const target of [paths.providerSecret, paths.gatewaySecret]) {
      invariant(
        digestJson(observations[target]) ===
          digestJson(rollbackState.preservedCredentialObservations[target]),
        "rollback_receipt_drift",
        "Planned credential metadata no longer matches the completed rollback receipt",
        { path: target },
      );
    }
    completedRollbackVerified = true;
  }
  if (workflow === "setup") {
    const existingCredentials = [paths.providerSecret, paths.gatewaySecret].filter(
      (target) => observations[target]?.kind === "file",
    );
    invariant(
      existingCredentials.length === 0 || completedRollbackVerified,
      "unowned_credential_exists",
      "Initial setup refuses credentials not preserved by an unchanged completed rollback receipt",
      { paths: existingCredentials },
    );
    const existingProcessState = [paths.processReceipt, paths.processStopRequest].filter(
      (target) => observations[target]?.kind !== "absent",
    );
    invariant(
      existingProcessState.length === 0,
      "unowned_process_state_exists",
      "Initial setup refuses process state without an install manifest",
      { paths: existingProcessState },
    );
  }
  await assertManagedNamespace(paths, {
    host,
    manifest,
    staticTargets: Object.keys(desiredFiles),
  });
  const managedDirectories = new Set([
    paths.configRoot,
    paths.stateRoot,
    paths.secretsDir,
    paths.binDir,
    path.dirname(paths.gatewayConfig),
    paths.runtimeRoot,
    paths.backupsRoot,
    ...(manifest?.backups ?? []).map((backup) => path.dirname(backup.path)),
  ]);
  for (const directory of managedDirectories) {
    if ((await inspectPath(directory, { hash: false })).kind === "directory") {
      await verifyProtectedDirectory(directory, host);
    }
  }

  if (
    observations[paths.providerSecret]?.kind === "file" &&
    !(workflow === "rotate" && options.rotateCredential === "provider")
  ) {
    await verifyProtectedPermissions(paths.providerSecret, host);
  }
  if (
    observations[paths.gatewaySecret]?.kind === "file" &&
    !(workflow === "rotate" && options.rotateCredential === "gateway")
  ) {
    await verifyProtectedPermissions(paths.gatewaySecret, host);
  }

  const credentialActions = credentialActionsFor(workflow, observations, paths, options);
  let drift = null;
  if (manifest) {
    drift = await verifyManifest(paths, manifest, host);
    invariant(
      !drift.findings.some((finding) => finding.code === "manifest_host_mismatch"),
      "manifest_host_mismatch",
      "Install manifest belongs to another host boundary",
    );
    if (workflow === "repair") {
      invariant(!drift.ok, "repair_not_needed", "No attributable drift was found");
      invariant(
        options.acceptDrift === drift.driftDigest,
        "repair_drift_approval_mismatch",
        "Repair requires the exact current drift digest",
        { driftDigest: drift.driftDigest },
      );
      invariant(
        drift.findings.every((finding) =>
          [
            "owned_artifact_hash_mismatch",
            "owned_artifact_missing_or_changed_type",
            "owned_artifact_mode_mismatch",
          ].includes(finding.code),
        ),
        "repair_scope_unsafe",
        "Repair may replace only manifest-owned static artifacts; all other drift requires explicit recovery",
      );
    } else if (workflow === "rotate") {
      const selectedPath =
        options.rotateCredential === "provider" ? paths.providerSecret : paths.gatewaySecret;
      const selectedState = observations[selectedPath];
      invariant(
        selectedState.kind === "absent" || selectedState.kind === "file",
        "credential_rotation_target_unsafe",
        "Credential rotation refuses redirected or non-file targets",
      );
      const unrelated = drift.findings.filter(
        (finding) => !(finding.path === selectedPath && finding.code.startsWith("credential_")),
      );
      invariant(
        unrelated.length === 0,
        "installation_drift",
        "Credential rotation cannot proceed while unrelated owned state has drift",
        { findings: unrelated },
      );
    } else if (!["rollback", "stop"].includes(workflow)) {
      invariant(
        drift.ok,
        "installation_drift",
        "Existing owned state has drift; create a repair or rollback plan",
        drift,
      );
    }
  }

  if (!manifest) {
    for (const target of Object.keys(desiredFiles)) {
      const current = observations[target];
      invariant(
        current.kind === "absent",
        "unowned_target_exists",
        `Refusing to overwrite an unowned target: ${target}`,
      );
    }
    invariant(
      observations[paths.runtimeRoot].kind === "absent",
      "unowned_runtime_exists",
      `Refusing to adopt an unowned runtime: ${paths.runtimeRoot}`,
    );
  } else {
    for (const target of Object.keys(desiredFiles)) {
      const current = observations[target];
      const owned = manifest.artifacts?.some(
        (artifact) => path.resolve(artifact.path) === path.resolve(target),
      );
      invariant(
        current.kind === "absent" || owned,
        "unowned_target_exists",
        `Refusing to replace a client or gateway target outside the install manifest: ${target}`,
      );
    }
  }

  const operations = Object.entries(desiredFiles).map(([target, desired]) =>
    operationFor(target, observations[target], desired, host.platform),
  );
  const templateAssets = await loadTemplateAssets();
  const createdAt = new Date(now).toISOString();
  const planBody = {
    schemaVersion: PLAN_SCHEMA_VERSION,
    kind: "hetzner-inference-change-plan",
    skillVersion: SKILL_VERSION,
    workflow,
    createdAt,
    expiresAt: new Date(now + PLAN_TTL_MS).toISOString(),
    host: {
      kind: host.kind,
      platform: host.platform,
      configRoot: paths.configRoot,
      stateRoot: paths.stateRoot,
      codexHome: host.codexHome,
      wslDistribution: host.wslDistribution,
      crossBoundary: options.crossBoundary === true,
    },
    clients,
    model,
    port: GATEWAY_PORT,
    litellm: {
      version: LITELLM_PIN,
      package: `litellm[proxy]==${LITELLM_PIN}`,
      runtimeDependencies: [...LITELLM_RUNTIME_DEPENDENCIES],
      executable: gatewayExecutable(paths, host),
      python: venvPythonExecutable(paths, host),
    },
    executables,
    discoveryEvidence,
    reachabilityEvidence,
    state: {
      digest: observedStateDigest(observations),
      observations,
      manifestPlanId: manifest?.lastPlanId ?? null,
      driftDigest: drift?.driftDigest ?? null,
    },
    desiredFiles: Object.fromEntries(
      Object.entries(desiredFiles).map(([target, value]) => [
        target,
        { mode: value.mode, role: value.role, sha256: value.sha256 },
      ]),
    ),
    sourceAssets: Object.fromEntries(
      Object.entries(templateAssets).map(([name, value]) => [name, value.sha256]),
    ),
    operations,
    credentials: {
      actions: credentialActions,
      providerPath: paths.providerSecret,
      gatewayPath: paths.gatewaySecret,
      providerInput: ["create", "replace-from-stdin"].includes(credentialActions.provider)
        ? "stdin"
        : "protected-file",
      gatewayInput: ["generate", "replace-generated"].includes(credentialActions.gateway)
        ? "cryptographically-generated"
        : "protected-file",
      localKeyDisclosure: "administrative",
      ordinaryRollbackPreservesCredentials: true,
    },
    process: {
      action:
        workflow === "start" || options.startAfterApply
          ? "start"
          : workflow === "rotate"
            ? options.restartAfterRotation
              ? "restart"
              : "stop"
            : workflow === "stop" || workflow === "rollback"
              ? "stop"
              : "none",
      runner: paths.gatewayRunner,
      receipt: paths.processReceipt,
      stopRequest: paths.processStopRequest,
    },
    rotation: workflow === "rotate" ? { credential: options.rotateCredential } : null,
    rollback:
      workflow === "rollback"
        ? rollbackContract(paths, manifest, observations[paths.manifest].sha256)
        : null,
    requiredApprovals: requiredApprovals(workflow, options, credentialActions),
    claims: {
      provider: "planned",
      gateway: "planned",
      codex: clients.includes("codex") ? "planned" : "blocked",
      "claude-code": clients.includes("claude-code") ? "planned" : "blocked",
      cursor: clients.includes("cursor") ? "verification_required" : "blocked",
    },
  };
  const planId = digestJson(planBody);
  return { ...planBody, planId };
}

export function validatePlanDocument(
  plan,
  { host, paths, now = Date.now(), command, allowExpiredPlanId = null } = {},
) {
  invariant(
    plan?.schemaVersion === PLAN_SCHEMA_VERSION && plan.kind === "hetzner-inference-change-plan",
    "plan_schema_unsupported",
    "Unsupported change plan schema",
  );
  invariant(
    digestJson(withoutKeys(plan, ["planId"])) === plan.planId,
    "plan_hash_mismatch",
    "Change plan hash does not match its contents",
  );
  const createdAt = Date.parse(plan.createdAt);
  const expiresAt = Date.parse(plan.expiresAt);
  invariant(
    Number.isFinite(createdAt) &&
      Number.isFinite(expiresAt) &&
      now >= createdAt &&
      (now <= expiresAt || allowExpiredPlanId === plan.planId),
    "plan_expired",
    "Change plan is expired or from the future",
  );
  invariant(
    expiresAt - createdAt === PLAN_TTL_MS,
    "plan_ttl_mismatch",
    "Change plan has an unsupported validity window",
  );
  if (host) {
    validatePlanShape(plan, host, paths);
  }
  if (command) {
    const expected = command === "apply" ? ["setup", "add-clients"] : [command];
    invariant(
      expected.includes(plan.workflow),
      "plan_command_mismatch",
      `A ${plan.workflow} plan cannot be consumed by ${command}`,
    );
  }
  return plan;
}

export async function readPlan(file, context = {}) {
  const plan = await readJson(file, {
    invalidCode: "plan_json_invalid",
    maxBytes: 4_194_304,
    shapeCode: "plan_json_shape_invalid",
    tooLargeCode: "plan_json_too_large",
    unsafeCode: "plan_file_unsafe",
  });
  return validatePlanDocument(plan, context);
}
