import {
  CLIENTS,
  COMPONENTS,
  EXIT_CODES,
  GATEWAY_HOST,
  GATEWAY_PORT,
  MAX_SECRET_BYTES,
  MUTATION_COMMANDS,
  PLAN_WORKFLOWS,
  PROVIDER_PROBES,
  GATEWAY_PROBES,
  SKILL_VERSION,
} from "./constants.mjs";
import { cursorGuidance } from "./config.mjs";
import { asSetupError, SetupError, invariant } from "./errors.mjs";
import {
  inspectPath,
  readGatewaySecret,
  readSecret,
  redactText,
  validateSecretValue,
} from "./files.mjs";
import {
  assertWslSameEnvironmentPath,
  captureVersion,
  detectHost,
  managedPaths,
  resolveExecutable,
} from "./hosts.mjs";
import { digestJson, stableJson } from "./json.mjs";
import { consumePlan } from "./mutate.mjs";
import { createPlan, readPlan } from "./plan.mjs";
import { verifyProtectedPermissions } from "./permissions.mjs";
import {
  assertProxyIndependentTransport,
  runGatewayCheck,
  runProviderCheck,
  validateClientEvidence,
} from "./probes.mjs";
import {
  assertCurrentHostStorageBoundaries,
  immutableProcessBindingDigest,
  installationStatus,
  loadManifest,
  processIdentityFindings,
  processReceiptFresh,
  readProcessReceipt,
  readRollbackState,
  verifyManifest,
} from "./state.mjs";

const BOOLEAN_OPTIONS = new Set([
  "cross-boundary",
  "remote-env-confirmed",
  "restart-after-rotation",
  "start-after-apply",
]);

function parseArguments(argv) {
  const command = argv[0];
  const options = {};
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    invariant(token.startsWith("--"), "unexpected_argument", `Unexpected argument: ${token}`);
    const name = token.slice(2);
    invariant(options[name] === undefined, "duplicate_option", `Duplicate option: --${name}`);
    if (BOOLEAN_OPTIONS.has(name)) {
      options[name] = true;
      continue;
    }
    invariant(argv[index + 1] !== undefined, "missing_option_value", `Missing value for --${name}`);
    options[name] = argv[index + 1];
    index += 1;
  }
  return { command, options };
}

function csv(value, allowed, label) {
  if (!value) return [];
  const values = [...new Set(value.split(",").filter(Boolean))];
  for (const item of values) {
    invariant(allowed.includes(item), "invalid_option_value", `Unsupported ${label}: ${item}`);
  }
  return values;
}

function rejectUnknownOptions(options, allowed) {
  for (const name of Object.keys(options)) {
    invariant(allowed.includes(name), "unknown_option", `Unknown option: --${name}`);
  }
}

async function readStdinSecret(label) {
  invariant(
    !process.stdin.isTTY,
    "secret_stdin_required",
    `${label} must be piped on stdin without a trailing newline`,
  );
  const chunks = [];
  let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += chunk.byteLength;
    invariant(bytes <= MAX_SECRET_BYTES, "invalid_secret", `${label} exceeds the maximum size`);
    chunks.push(Buffer.from(chunk));
  }
  return validateSecretValue(Buffer.concat(chunks).toString("utf8"), label);
}

async function executableInfo(name, candidates, host) {
  let executable = null;
  for (const candidate of candidates) {
    executable = resolveExecutable(candidate, { host });
    if (executable) break;
  }
  if (!executable) return { path: null, version: null };
  try {
    assertWslSameEnvironmentPath(executable, host, `${name} executable`);
    return { path: executable, version: await captureVersion(executable) };
  } catch (error) {
    if (String(error?.code ?? "").startsWith("wsl_")) throw error;
    return { path: executable, version: null, versionError: error.code ?? "version_failed" };
  }
}

async function diagnose(host, paths, options) {
  rejectUnknownOptions(options, []);
  assertCurrentHostStorageBoundaries(paths, host);
  const [python, codex, claude, cursor, providerSecret, gatewaySecret, manifest, installation] =
    await Promise.all([
      executableInfo("python", ["python3", "python"], host),
      executableInfo("codex", ["codex"], host),
      executableInfo("claude", ["claude"], host),
      executableInfo("cursor", ["cursor"], host),
      inspectPath(paths.providerSecret, { hash: false }),
      inspectPath(paths.gatewaySecret, { hash: false }),
      inspectPath(paths.manifest, { hash: false }),
      installationStatus(host, paths),
    ]);
  return {
    schemaVersion: 1,
    kind: "hetzner-inference-diagnosis",
    skillVersion: SKILL_VERSION,
    offline: true,
    mutating: false,
    host,
    paths,
    executables: {
      node: { path: process.execPath, version: process.version },
      python,
      codex,
      "claude-code": claude,
      cursor,
    },
    credentialMetadata: {
      provider: providerSecret,
      gateway: gatewaySecret,
      valuesRead: false,
    },
    manifest: {
      state: manifest.kind,
      mode: manifest.mode,
      size: manifest.size,
      mtimeMs: manifest.mtimeMs,
    },
    ownershipAndDrift: installation,
    port: {
      host: GATEWAY_HOST,
      port: GATEWAY_PORT,
      networkProbed: false,
      state:
        installation.process === "owned_ready"
          ? "fresh-owned-receipt-listener-unverified"
          : "not-probed-offline",
    },
  };
}

function planOptions(options) {
  rejectUnknownOptions(options, [
    "accept-drift",
    "clients",
    "codex",
    "cross-boundary",
    "cursor",
    "discovery-evidence",
    "model",
    "port",
    "python",
    "reachability-evidence",
    "restart-after-rotation",
    "rotate-credential",
    "start-after-apply",
    "workflow",
    "claude",
  ]);
  const workflow = options.workflow ?? "setup";
  invariant(
    PLAN_WORKFLOWS.includes(workflow),
    "workflow_unsupported",
    `Unsupported workflow: ${workflow}`,
  );
  return {
    workflow,
    clients: csv(options.clients, CLIENTS, "client"),
    model: options.model,
    port: options.port,
    discoveryEvidence: options["discovery-evidence"],
    reachabilityEvidence: options["reachability-evidence"],
    crossBoundary: options["cross-boundary"] === true,
    startAfterApply: options["start-after-apply"] === true,
    restartAfterRotation: options["restart-after-rotation"] === true,
    rotateCredential: options["rotate-credential"],
    acceptDrift: options["accept-drift"],
    executables: {
      ...(options.python ? { python: options.python } : {}),
      ...(options.codex ? { codex: options.codex } : {}),
      ...(options.claude ? { "claude-code": options.claude } : {}),
      ...(options.cursor ? { cursor: options.cursor } : {}),
    },
  };
}

async function planCommand(host, paths, options) {
  return await createPlan({ host, paths, options: planOptions(options) });
}

async function statusCommand(host, paths, options) {
  rejectUnknownOptions(options, []);
  return {
    schemaVersion: 1,
    kind: "hetzner-inference-status",
    offline: true,
    mutating: false,
    ...(await installationStatus(host, paths)),
  };
}

async function mutationCommand(command, host, paths, options) {
  rejectUnknownOptions(options, ["approve", "plan"]);
  assertCurrentHostStorageBoundaries(paths, host);
  invariant(options.plan, "plan_required", `${command} requires --plan <persisted-plan.json>`);
  const rollbackState = command === "rollback" ? await readRollbackState(paths, host) : null;
  const plan = await readPlan(options.plan, {
    host,
    paths,
    command,
    allowExpiredPlanId: rollbackState?.planId ?? null,
  });
  const existing = await loadManifest(paths, { host });
  let providerCredential;
  if (plan.credentials.providerInput === "stdin" && existing?.lastPlanId !== plan.planId) {
    providerCredential = await readStdinSecret("HETZNER_INFERENCE_API_KEY");
  }
  return await consumePlan({
    approval: options.approve,
    command,
    host,
    paths,
    plan,
    providerCredential,
  });
}

export async function requireCurrentGatewayProof(host, paths, now) {
  assertCurrentHostStorageBoundaries(paths, host);
  const manifest = await loadManifest(paths, { host, required: true });
  const installation = await verifyManifest(paths, manifest, host);
  invariant(
    installation.ok,
    "installation_drift",
    "Gateway or client proof requires a current drift-free owned installation",
    { findings: installation.findings },
  );
  const receipt = await readProcessReceipt(paths, host);
  invariant(
    receipt,
    "process_receipt_missing",
    "Gateway or client proof requires the owned process receipt",
  );
  const processFindings = await processIdentityFindings(receipt, manifest, paths, { host });
  invariant(
    processFindings.length === 0,
    "process_identity_mismatch",
    "Gateway or client proof requires the complete owned process identity",
    { findings: processFindings },
  );
  invariant(
    processReceiptFresh(receipt, now),
    "process_identity_stale",
    "Gateway or client proof requires a fresh ready process receipt",
  );
  return {
    manifest,
    binding: {
      schemaVersion: 1,
      manifestPlanId: manifest.lastPlanId,
      manifestDigest: digestJson(manifest),
      processReceiptDigest: digestJson(receipt),
      processBindingDigest: immutableProcessBindingDigest(receipt),
      processStartedAt: receipt.startedAt,
      runtimeTreeDigest: manifest.runtime.treeDigest,
      gatewayConfigSha256: receipt.configSha256,
      nodeExecutableSha256: manifest.executables.node.sha256,
      configurationInvalidatedAt: manifest.evidence.invalidatedAt,
      model: manifest.model,
    },
  };
}

function gatewayProofBoundaryDigest(binding) {
  return digestJson(
    Object.fromEntries(Object.entries(binding).filter(([key]) => key !== "processReceiptDigest")),
  );
}

export async function checkCommand(host, paths, options, dependencies = {}) {
  const checkDependencies = {
    assertProxyIndependentTransport:
      dependencies.assertProxyIndependentTransport ?? assertProxyIndependentTransport,
    requireCurrentGatewayProof:
      dependencies.requireCurrentGatewayProof ?? requireCurrentGatewayProof,
    readGatewaySecret: dependencies.readGatewaySecret ?? readGatewaySecret,
    readSecret: dependencies.readSecret ?? readSecret,
    runGatewayCheck: dependencies.runGatewayCheck ?? runGatewayCheck,
    runProviderCheck: dependencies.runProviderCheck ?? runProviderCheck,
    validateClientEvidence: dependencies.validateClientEvidence ?? validateClientEvidence,
    verifyProtectedPermissions:
      dependencies.verifyProtectedPermissions ?? verifyProtectedPermissions,
  };
  rejectUnknownOptions(options, [
    "approve-network",
    "claude-evidence",
    "components",
    "codex-evidence",
    "gateway-probes",
    "model",
    "provider-credential-source",
    "provider-probes",
  ]);
  const components = csv(options.components, COMPONENTS, "component");
  invariant(components.length > 0, "components_required", "Check requires explicit --components");
  const approvedNetwork = csv(
    options["approve-network"],
    ["provider", "gateway"],
    "network approval",
  );
  for (const component of components.filter((item) => item === "provider" || item === "gateway")) {
    invariant(
      approvedNetwork.includes(component),
      "network_approval_required",
      `Network check for ${component} requires --approve-network ${component}`,
    );
  }
  if (components.some((item) => item === "provider" || item === "gateway")) {
    checkDependencies.assertProxyIndependentTransport();
  }

  const requiresGatewayProof = components.some((component) =>
    ["gateway", "codex", "claude-code"].includes(component),
  );
  const gatewayProof = requiresGatewayProof
    ? await checkDependencies.requireCurrentGatewayProof(host, paths)
    : null;
  let reportGatewayProof = gatewayProof;
  const gatewayBindingDigest = gatewayProof
    ? gatewayProofBoundaryDigest(gatewayProof.binding)
    : null;
  async function requireUnchangedGatewayProof(phase) {
    let current;
    try {
      current = await checkDependencies.requireCurrentGatewayProof(host, paths);
    } catch (error) {
      throw new SetupError(
        "process_binding_changed_during_check",
        `Owned gateway proof changed during check phase: ${phase}`,
        { causeCode: error?.code ?? "gateway_proof_unavailable", phase },
      );
    }
    const currentBindingDigest = gatewayProofBoundaryDigest(current.binding);
    invariant(
      currentBindingDigest === gatewayBindingDigest,
      "process_binding_changed_during_check",
      `Owned gateway proof changed during check phase: ${phase}`,
      { phase },
    );
    reportGatewayProof = current;
    return current;
  }

  const report = {};
  let providerCredential;
  if (components.includes("provider")) {
    const source = options["provider-credential-source"] ?? "owned";
    invariant(
      ["owned", "stdin"].includes(source),
      "credential_source_invalid",
      "Provider credential source must be owned or stdin",
    );
    if (source === "stdin") {
      providerCredential = await readStdinSecret("HETZNER_INFERENCE_API_KEY");
    } else {
      await checkDependencies.verifyProtectedPermissions(paths.providerSecret, host);
      providerCredential = await checkDependencies.readSecret(
        paths.providerSecret,
        host,
        "HETZNER_INFERENCE_API_KEY",
      );
    }
    report.provider = await checkDependencies.runProviderCheck({
      credential: providerCredential,
      model: options.model,
      probes: csv(options["provider-probes"], PROVIDER_PROBES, "provider probe"),
    });
  }

  if (components.includes("gateway")) {
    await requireUnchangedGatewayProof("before-gateway-proof");
    await checkDependencies.verifyProtectedPermissions(paths.gatewaySecret, host);
    const gatewayCredential = await checkDependencies.readGatewaySecret(
      paths.gatewaySecret,
      host,
      "LITELLM_MASTER_KEY",
    );
    await requireUnchangedGatewayProof("before-gateway-credential-use");
    report.gateway = await checkDependencies.runGatewayCheck({
      beforeRequest: async () => {
        await requireUnchangedGatewayProof("before-gateway-request");
      },
      credential: gatewayCredential,
      probes: csv(options["gateway-probes"], GATEWAY_PROBES, "gateway probe"),
    });
    await requireUnchangedGatewayProof("after-gateway-proof");
  }

  if (components.includes("codex")) {
    if (options["codex-evidence"]) {
      const current = await requireUnchangedGatewayProof("before-codex-proof");
      report.codex = await checkDependencies.validateClientEvidence(
        options["codex-evidence"],
        "codex",
        current.manifest,
        undefined,
        host,
      );
      await requireUnchangedGatewayProof("after-codex-proof");
    } else {
      report.codex = { component: "codex", state: "verification_required" };
    }
  }
  if (components.includes("claude-code")) {
    if (options["claude-evidence"]) {
      const current = await requireUnchangedGatewayProof("before-claude-code-proof");
      report["claude-code"] = await checkDependencies.validateClientEvidence(
        options["claude-evidence"],
        "claude-code",
        current.manifest,
        undefined,
        host,
      );
      await requireUnchangedGatewayProof("after-claude-code-proof");
    } else {
      report["claude-code"] = {
        component: "claude-code",
        state: "verification_required",
      };
    }
  }
  if (components.includes("cursor")) report.cursor = cursorGuidance();

  if (gatewayProof) await requireUnchangedGatewayProof("before-report-publication");

  if (
    components.length === 1 &&
    components[0] === "provider" &&
    report.provider.kind === "hetzner-inference-provider-discovery"
  ) {
    return report.provider;
  }
  return {
    schemaVersion: 1,
    kind: "hetzner-inference-check-report",
    mutating: false,
    selectedComponents: components,
    installationBinding: reportGatewayProof?.binding ?? null,
    components: report,
  };
}

function help() {
  return {
    schemaVersion: 1,
    kind: "hetzner-inference-help",
    commands: [
      "diagnose",
      "plan",
      "apply",
      "check",
      "start",
      "stop",
      "status",
      "repair",
      "rotate",
      "rollback",
    ],
    mutationContract:
      "Every mutation requires --plan and --approve with the exact unexpired plan ID.",
    credentialContract:
      "Secret values are accepted only from protected files or bounded stdin, never arguments.",
    targets: ["local", "remote"],
    modes: ["autonomous", "manual"],
    defaults: { target: "local", mode: "autonomous" },
    manualContract:
      "Manual mode returns guidance without inspecting credentials, host storage, or endpoints.",
  };
}

export async function runCli(argv = process.argv.slice(2), dependencies = {}) {
  const { command, options } = parseArguments(argv);
  const target = options.target ?? "local";
  const mode = options.mode ?? "autonomous";
  invariant(
    ["local", "remote"].includes(target),
    "invalid_option_value",
    "Target must be local or remote",
  );
  invariant(
    ["autonomous", "manual"].includes(mode),
    "invalid_option_value",
    "Mode must be autonomous or manual",
  );
  delete options.target;
  delete options.mode;
  if (!command || command === "help" || command === "--help") return help();
  // Route before host/path discovery: guidance and existing remote gateways do
  // not depend on a local installation, credential store, or supported host.
  if (mode === "manual") {
    const { manualCommand } = await (dependencies.loadManual ?? (() => import("./manual.mjs")))();
    return await manualCommand(command, { ...options, target });
  }
  if (target === "remote") {
    const { remoteCommand } = await (dependencies.loadRemote ?? (() => import("./remote.mjs")))();
    return await remoteCommand(command, options);
  }
  const host = detectHost();
  const paths = managedPaths(host);
  if (command === "diagnose") return await diagnose(host, paths, options);
  if (command === "plan") return await planCommand(host, paths, options);
  if (command === "status") return await statusCommand(host, paths, options);
  if (command === "check") return await checkCommand(host, paths, options);
  if (MUTATION_COMMANDS.includes(command)) {
    return await mutationCommand(command, host, paths, options);
  }
  throw new SetupError("command_unsupported", `Unsupported command: ${command}`);
}

const ERROR_EXIT_CODE_ENTRIES = [
  ...[
    "accept_drift_wrong_workflow",
    "atomic_consumption_contract_invalid",
    "atomic_expected_state_invalid",
    "client_evidence_duplicate_case",
    "client_evidence_incomplete",
    "client_evidence_hidden_routing",
    "client_evidence_invalid",
    "client_evidence_invalid_time",
    "client_evidence_json_invalid",
    "client_evidence_json_shape_invalid",
    "client_evidence_json_too_large",
    "client_evidence_not_disposable",
    "client_evidence_source_invalid",
    "client_evidence_wrong_component",
    "command_unsupported",
    "components_required",
    "credential_source_invalid",
    "discovery_evidence_invalid",
    "discovery_evidence_invalid_time",
    "discovery_evidence_models_invalid",
    "discovery_evidence_probe_invalid",
    "discovery_evidence_required",
    "discovery_evidence_wrong_provider",
    "duplicate_option",
    "evidence_file_unsafe",
    "evidence_json_invalid",
    "evidence_json_shape_invalid",
    "evidence_json_too_large",
    "invalid_option_value",
    "missing_option_value",
    "plan_approvals_mismatch",
    "plan_claims_mismatch",
    "plan_clients_invalid",
    "plan_command_mismatch",
    "plan_credential_action_mismatch",
    "plan_credential_contract_mismatch",
    "plan_credential_input_mismatch",
    "plan_desired_file_mismatch",
    "plan_desired_targets_mismatch",
    "plan_discovery_evidence_mismatch",
    "plan_executable_identity_invalid",
    "plan_external_parent_mismatch",
    "plan_file_unsafe",
    "plan_hash_mismatch",
    "plan_host_mismatch",
    "plan_json_invalid",
    "plan_json_shape_invalid",
    "plan_json_too_large",
    "plan_manifest_binding_mismatch",
    "plan_manifest_clients_mismatch",
    "plan_manifest_configuration_mismatch",
    "plan_manifest_evidence_mismatch",
    "plan_manifest_host_mismatch",
    "plan_manifest_observation_mismatch",
    "plan_model_invalid",
    "plan_node_mismatch",
    "plan_operation_observation_missing",
    "plan_operations_mismatch",
    "plan_port_mismatch",
    "plan_process_action_mismatch",
    "plan_process_contract_mismatch",
    "plan_reachability_mismatch",
    "plan_rollback_artifacts_mismatch",
    "plan_rollback_backups_mismatch",
    "plan_rollback_credential_mismatch",
    "plan_rollback_directories_mismatch",
    "plan_rollback_manifest_mismatch",
    "plan_rollback_mismatch",
    "plan_rollback_process_mismatch",
    "plan_rollback_runtime_mismatch",
    "plan_rotation_contract_mismatch",
    "plan_runtime_mismatch",
    "plan_schema_unsupported",
    "plan_skill_version_mismatch",
    "plan_source_assets_mismatch",
    "plan_state_digest_mismatch",
    "plan_state_missing",
    "plan_ttl_mismatch",
    "probe_unsupported",
    "probes_required",
    "repair_not_needed",
    "restart_after_rotation_wrong_workflow",
    "rotate_credential_required",
    "rotate_credential_wrong_workflow",
    "unexpected_argument",
    "unexpected_error",
    "unknown_option",
    "windows_command_argument_invalid",
  ].map((code) => [code, EXIT_CODES.usage]),
  ...[
    "discovery_evidence_stale",
    "client_evidence_executable_changed",
    "client_evidence_host_changed",
    "client_evidence_process_changed",
    "client_evidence_stale",
    "plan_expired",
    "process_identity_stale",
    "stale_plan_manifest_state",
    "stale_plan_external_parent",
    "stale_plan_process_state",
    "stale_plan_rollback_state",
    "stale_plan_runtime_state",
    "stale_plan_secret_state",
    "stale_plan_state",
    "wsl_reachability_stale",
  ].map((code) => [code, EXIT_CODES.stale]),
  ...[
    "cancellation_not_propagated",
    "cancellation_stream_empty",
    "cancellation_stream_missing",
    "gateway_alias_missing",
    "gateway_auth_not_enforced",
    "error_mapping_invalid",
    "http_body_missing",
    "http_body_too_large",
    "invalid_http_json",
    "messages_shape_invalid",
    "messages_tool_call_missing",
    "messages_tool_result_missing",
    "models_empty",
    "models_shape_invalid",
    "network_request_failed",
    "network_timeout",
    "probe_http_error",
    "probe_output_exhausted",
    "provider_text_shape_invalid",
    "responses_shape_invalid",
    "responses_tool_arguments_invalid",
    "responses_tool_call_missing",
    "responses_tool_result_missing",
    "stream_incomplete",
    "stream_missing",
    "tool_arguments_invalid",
    "tool_call_missing",
    "tool_result_loop_missing",
  ].map((code) => [code, EXIT_CODES.external]),
  ...[
    "already_installed",
    "backup_source_invalid",
    "atomic_target_changed",
    "backup_source_changed",
    "backup_target_exists",
    "completed_write_drift",
    "concurrent_secret_change",
    "credential_metadata_missing",
    "credential_rotation_target_unsafe",
    "desired_file_changed",
    "evidence_changed_during_read",
    "evidence_file_changed",
    "executable_content_changed",
    "executable_path_changed",
    "executable_version_changed",
    "idempotent_process_drift",
    "idempotent_rollback_drift",
    "idempotent_state_drift",
    "installation_drift",
    "invalid_json",
    "invalid_json_shape",
    "json_too_large",
    "lock_ownership_lost",
    "managed_namespace_too_large",
    "managed_root_invalid",
    "managed_tree_invalid",
    "managed_tree_redirect",
    "managed_tree_special_file",
    "managed_tree_too_large",
    "manifest_artifact_invalid",
    "manifest_artifact_set_invalid",
    "manifest_backup_invalid",
    "manifest_backup_set_invalid",
    "manifest_clients_invalid",
    "manifest_components_invalid",
    "manifest_credential_contract_invalid",
    "manifest_discovery_evidence_invalid",
    "manifest_evidence_invalid",
    "manifest_executable_contract_invalid",
    "manifest_host_mismatch",
    "manifest_identity_invalid",
    "manifest_invalid",
    "manifest_model_invalid",
    "manifest_revision_invalid",
    "manifest_rollback_actions_invalid",
    "manifest_root_mismatch",
    "manifest_runtime_invalid",
    "manifest_schema_unsupported",
    "manifest_unknown_field",
    "manifest_changed_during_apply",
    "manifest_process_invalid",
    "mutation_locked",
    "owned_process_unhealthy",
    "owned_directory_changed",
    "owned_path_changed",
    "owned_tree_changed",
    "process_identity_changed",
    "process_binding_changed_during_check",
    "process_identity_mismatch",
    "process_binding_invalid",
    "process_cleanup_identity_mismatch",
    "process_compensation_identity_mismatch",
    "process_compensation_identity_missing",
    "process_compensation_failed",
    "process_cleanup_requires_manual_recovery",
    "process_cleanup_state_unsafe",
    "process_cleanup_unsafe",
    "process_receipt_invalid",
    "process_receipt_missing",
    "process_receipt_schema_unsupported",
    "process_receipt_changed",
    "process_state_changed",
    "process_state_not_owned",
    "process_stop_request_changed",
    "process_stop_request_invalid",
    "recovery_claim_changed",
    "recovery_directory_changed",
    "recovery_directory_invalid",
    "redirected_path",
    "repair_drift_approval_mismatch",
    "rollback_receipt_drift",
    "rollback_receipt_invalid",
    "rollback_artifact_protection_invalid",
    "rollback_artifact_not_owned",
    "rollback_backup_protection_invalid",
    "rollback_backup_not_owned",
    "rollback_contract_changed",
    "rollback_credential_changed",
    "rollback_credential_content_drift",
    "rollback_journal_credential_mismatch",
    "rollback_journal_mismatch",
    "rollback_manifest_changed",
    "rollback_manifest_hash_invalid",
    "rollback_receipt_credentials_invalid",
    "rollback_receipt_mismatch",
    "rollback_receipt_targets_invalid",
    "rollback_runtime_not_owned",
    "runner_root_boundary_changed",
    "runner_executable_identity_mismatch",
    "runner_identity_mismatch",
    "runtime_changed_during_apply",
    "runtime_cleanup_unsafe",
    "runtime_identity_mismatch",
    "runtime_exists",
    "runtime_link_external",
    "source_asset_changed",
    "source_asset_set_changed",
    "secret_cleanup_requires_manual_recovery",
    "secret_cleanup_target_changed",
    "static_cleanup_backup_changed",
    "static_cleanup_backup_missing",
    "static_cleanup_target_changed",
    "subprocess_termination_unconfirmed",
    "unexpected_managed_entry",
    "unexpected_path_type",
    "unowned_runtime_exists",
    "unowned_target",
    "unowned_target_exists",
    "unsafe_directory",
    "unsafe_directory_mode",
    "unsafe_directory_owner",
    "unsafe_file_mode",
    "unsafe_file_owner",
    "unsafe_json_file",
    "unsafe_protected_file",
    "windows_acl_broad",
    "windows_acl_empty",
  ].map((code) => [code, EXIT_CODES.conflict]),
  ...[
    "artifact_collection_failed",
    "approval_mismatch",
    "client_evidence_component_unsupported",
    "client_not_configured",
    "client_unsupported",
    "clients_already_configured",
    "clients_required",
    "codex_version_unsupported",
    "codex_home_overlaps_managed_root",
    "command_failed",
    "command_timeout",
    "cross_boundary_route_not_implemented",
    "cross_boundary_host_invalid",
    "environment_proxy_enabled",
    "executable_missing",
    "external_parent_protection_invalid",
    "external_parent_required",
    "gateway_endpoint_blocked",
    "gateway_credential_required",
    "gateway_start_failed",
    "gateway_start_timeout",
    "gateway_runner_spawn_failed",
    "invalid_gateway_secret",
    "invalid_secret",
    "gateway_stop_timeout",
    "process_compensation_timeout",
    "installation_required",
    "litellm_executable_missing",
    "litellm_pin_mismatch",
    "host_required",
    "icacls_missing",
    "missing_host_root",
    "model_not_discovered",
    "model_required",
    "network_approval_required",
    "path_escape",
    "plan_required",
    "port_occupied",
    "port_unsupported",
    "powershell_missing",
    "permission_command_failed",
    "permission_command_timeout",
    "provider_credential_input_required",
    "provider_credential_required",
    "python_version_invalid",
    "python_version_unsupported",
    "repair_scope_unsafe",
    "relative_host_root",
    "rollback_incomplete",
    "secret_stdin_required",
    "secret_leak",
    "start_after_apply_unsupported",
    "unowned_credential_exists",
    "unowned_process_state_exists",
    "unsupported_host",
    "venv_python_missing",
    "version_failed",
    "version_timeout",
    "windows_external_parent_not_local",
    "windows_command_path_invalid",
    "windows_identity_invalid",
    "windows_root_not_localappdata",
    "windows_system_root_invalid",
    "whoami_missing",
    "workflow_not_implemented",
    "workflow_unsupported",
    "wsl_cross_boundary_path",
    "wsl_mount_table_invalid",
    "wsl_mount_table_unavailable",
    "wsl_path_alias_cycle",
    "wsl_path_alias_limit",
    "wsl_path_classification_failed",
    "wsl_path_invalid",
    "wsl_reachability_invalid",
    "wsl_reachability_required",
    "wsl_reachability_wrong_host",
  ].map((code) => [code, EXIT_CODES.blocked]),
];

const ERROR_EXIT_CODE = new Map(ERROR_EXIT_CODE_ENTRIES);
if (ERROR_EXIT_CODE.size !== ERROR_EXIT_CODE_ENTRIES.length) {
  throw new SetupError("error_mapping_invalid", "Stable error exit mappings contain duplicates");
}

export function stableErrorExitCodeEntries() {
  return [...ERROR_EXIT_CODE.entries()];
}

export function exitCodeFor(error) {
  return ERROR_EXIT_CODE.get(error.code) ?? EXIT_CODES.usage;
}

export function hasFailedExternalProbe(result) {
  const documents =
    result?.kind === "hetzner-inference-check-report"
      ? Object.values(result.components ?? {})
      : [result];
  return documents.some((document) =>
    [...(document?.provider?.results ?? []), ...(document?.gateway?.results ?? [])].some(
      (probe) => probe.status === "failed",
    ),
  );
}

function safeRecovery(error) {
  const quarantinePath = error?.details?.quarantinePath;
  if (typeof quarantinePath !== "string" || !quarantinePath) return null;
  return {
    kind: "quarantined-path",
    path: redactText(quarantinePath),
  };
}

export async function main(argv = process.argv.slice(2), dependencies = {}) {
  try {
    const result = await (dependencies.runCli ?? runCli)(argv);
    process.stdout.write(stableJson(result));
    if (result?.target === "remote" && result?.ok === false) process.exitCode = 1;
    else if (hasFailedExternalProbe(result)) process.exitCode = EXIT_CODES.external;
  } catch (rawError) {
    const error = asSetupError(rawError);
    const recovery = safeRecovery(error);
    process.stderr.write(
      stableJson({
        schemaVersion: 1,
        kind: "hetzner-inference-error",
        error: {
          code: error.code,
          message: redactText(error.message),
          ...(recovery ? { recovery } : {}),
        },
      }),
    );
    process.exitCode = exitCodeFor(error);
  }
}
