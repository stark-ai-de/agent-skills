import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { LITELLM_PIN, MANIFEST_SCHEMA_VERSION, SKILL_VERSION } from "./constants.mjs";
import {
  desiredStaticFiles,
  externalArtifactParents,
  loadTemplateAssets,
  ownedArtifactContracts,
} from "./config.mjs";
import { SetupError, invariant } from "./errors.mjs";
import {
  assertNoSecretMaterial,
  atomicWrite,
  atomicWriteJson,
  copyNonSecretBackup,
  credentialPairContinuity,
  ensureDirectory,
  inspectPath,
  inventoryTree,
  readGatewaySecret,
  readSecret,
  removeEmptyDirectoryIfOwned,
  removeFileIfOwned,
  removeJsonFileIfOwned,
  removeTreeIfOwned,
  restoreFileFromOwnedBackup,
  validateGatewaySecretValue,
  validateSecretValue,
} from "./files.mjs";
import {
  assertWslSameEnvironmentPath,
  captureVersion,
  commandInvocation,
  minimalCommandEnvironment,
} from "./hosts.mjs";
import { digestJson } from "./json.mjs";
import { compensateStartedGateway, startOwnedGateway, stopOwnedGateway } from "./lifecycle.mjs";
import { acquireMutationLock } from "./lock.mjs";
import {
  inspectProtectedDirectoryBoundary,
  secureDirectoryPermissions,
  securePathPermissions,
  verifyProtectedPermissions,
  verifyRestrictedFilePermissions,
} from "./permissions.mjs";
import { validateDiscoveryEvidence, validatePlanDocument } from "./plan.mjs";
import {
  assertCurrentHostStorageBoundaries,
  assertManagedNamespace,
  loadManifest,
  manifestProcessHasIdentity,
  offlineObservations,
  processIdentityFindings,
  processReceiptFresh,
  readProcessReceipt,
  readRollbackReceipt,
  readRollbackState,
  rollbackContract,
  rollbackRemovalTargets,
  verifyCompletedRollbackReceipt,
  verifyManifest,
} from "./state.mjs";
import { runBoundedCommand } from "./subprocess.mjs";

const fsPromises = fs.promises;

function within(target, boundary) {
  const relative = path.relative(path.resolve(boundary), path.resolve(target));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function prepareManagedParent(
  target,
  paths,
  host,
  assertMutationOwned = null,
  assertExternalParent = null,
) {
  const parent = path.dirname(target);
  const root = [paths.configRoot, paths.stateRoot].find((candidate) => within(parent, candidate));
  if (!root) {
    await assertMutationOwned?.();
    invariant(
      typeof assertExternalParent === "function",
      "stale_plan_state",
      `Planned external parent has no mutation proof: ${parent}`,
    );
    await assertExternalParent(target);
    return;
  }
  await ensureDirectory(parent, 0o700, { assertMutationOwned });
  const directories = [];
  let current = path.resolve(parent);
  const boundary = path.resolve(root);
  while (within(current, boundary)) {
    directories.push(current);
    if (current === boundary) break;
    current = path.dirname(current);
  }
  for (const directory of directories.reverse()) {
    await assertMutationOwned?.();
    await secureDirectoryPermissions(directory, host);
  }
}

export async function runCommand(executable, args, options = {}, dependencies = {}) {
  const environment = options.env ?? minimalCommandEnvironment();
  const invocation = commandInvocation(executable, args, { env: environment });
  return await runBoundedCommand(
    invocation.executable,
    invocation.args,
    {
      cwd: options.cwd,
      deadlineAt: options.deadlineAt,
      deadlineReserveMs: options.deadlineReserveMs,
      displayExecutable: executable,
      env: environment,
      forceKillGraceMs: options.forceKillGraceMs,
      maxBytes: options.maxBytes,
      terminationGraceMs: options.terminationGraceMs,
      timeoutMs: options.timeoutMs,
      windowsVerbatimArguments: invocation.windowsVerbatimArguments,
    },
    dependencies,
  );
}

export class MutationGuard {
  constructor({
    expectedCredentialContinuity = null,
    host,
    lock = null,
    paths,
    plan,
    verifyCredentialPermissions = verifyProtectedPermissions,
  }) {
    this.host = host;
    this.lock = lock;
    this.paths = paths;
    this.plan = plan;
    this.expectedCredentialContinuity = expectedCredentialContinuity;
    this.verifyCredentialPermissions = verifyCredentialPermissions;
    this.staticTargets = Object.keys(plan.desiredFiles);
    this.externalParents = externalArtifactParents(paths, [
      ...this.staticTargets,
      ...(plan.rollback?.artifacts ?? []).map((artifact) => artifact.path),
      ...(plan.clients ? [...ownedArtifactContracts(paths, plan.clients).keys()] : []),
    ]);
    this.completedStatic = new Set();
    this.secretDigests = new Map();
    this.runtimeDigest = null;
    this.manifestPlanId = null;
    this.processChanged = false;
    this.rollbackReceiptChanged = false;
    this.pendingPermissionRepairTargets = new Set(
      plan.workflow === "rotate"
        ? [plan.rotation.credential === "provider" ? paths.providerSecret : paths.gatewaySecret]
        : [],
    );
    this.namespaceFiles = plan.operations
      .filter((operation) => operation.backup)
      .map((operation) => backupTarget(paths, plan.planId, operation.path));
  }

  markStatic(target) {
    this.completedStatic.add(target);
  }

  markSecret(target, sha256) {
    this.secretDigests.set(target, sha256);
    this.pendingPermissionRepairTargets.delete(target);
  }

  markRuntime(digest) {
    this.runtimeDigest = digest;
  }

  markManifest(planId) {
    this.manifestPlanId = planId;
  }

  requiresExistingParent(target) {
    return this.externalParents.includes(path.resolve(path.dirname(target)));
  }

  async assertExternalParentDirectory(parent, anchorIdentity = null) {
    const expected = this.plan.state.observations[parent];
    let current;
    try {
      current = await inspectProtectedDirectoryBoundary(parent, this.host, { external: true });
    } catch (error) {
      throw new SetupError(
        "stale_plan_external_parent",
        `Planned external parent protection changed before mutation: ${parent}`,
        { reason: error?.code ?? "external_parent_verification_failed" },
      );
    }
    invariant(
      digestJson(current) === digestJson(expected),
      "stale_plan_external_parent",
      `Planned external parent changed before mutation: ${parent}`,
    );
    if (anchorIdentity) {
      invariant(
        ["birthtimeNs", "dev", "ino"].every(
          (field) => String(anchorIdentity[field]) === current.identity[field],
        ),
        "stale_plan_external_parent",
        `Opened external parent does not match the approved directory: ${parent}`,
      );
    }
  }

  async assertExternalParent(target) {
    if (!this.requiresExistingParent(target)) return;
    await this.assertExternalParentDirectory(path.resolve(path.dirname(target)));
  }

  async assertAllExternalParents() {
    for (const parent of this.externalParents) {
      await this.assertExternalParentDirectory(parent);
    }
  }

  externalParentOptions(target) {
    if (!this.requiresExistingParent(target)) return {};
    const parent = path.resolve(path.dirname(target));
    return {
      expectedParentBoundary: this.plan.state.observations[parent],
      protectRecoveryTemporary: async ({ identity, mode, path: temporary }) => {
        await this.assertLockOwned();
        await securePathPermissions(temporary, this.host, mode, {
          expectedIdentity: identity,
        });
      },
      recoveryDirectory: this.paths.stateRoot,
      requireExistingParent: true,
      verifyRecoveryFile: async ({ identity, mode, path: recoveryPath }) => {
        await this.assertLockOwned();
        const stat = await verifyRestrictedFilePermissions(recoveryPath, this.host, mode);
        invariant(
          ["birthtimeNs", "dev", "ino"].every((field) => stat[field] === identity[field]),
          "recovery_claim_changed",
          `Managed recovery file changed during cleanup: ${recoveryPath}`,
        );
      },
      verifyRecoveryDirectory: async ({ directory, identity }) => {
        const recoveryDirectory = path.resolve(this.paths.stateRoot);
        invariant(
          path.resolve(directory) === recoveryDirectory,
          "recovery_directory_changed",
          `Recovery publication opened an unexpected managed directory: ${directory}`,
        );
        await this.assertLockOwned();
        const current = await inspectProtectedDirectoryBoundary(recoveryDirectory, this.host);
        invariant(
          ["birthtimeNs", "dev", "ino"].every(
            (field) => String(identity[field]) === current.identity[field],
          ),
          "recovery_directory_changed",
          `Managed recovery directory changed during publication: ${directory}`,
        );
      },
      verifyParentBoundary: async ({ directory, identity }) => {
        invariant(
          path.resolve(directory) === parent,
          "stale_plan_external_parent",
          `Mutation opened an unexpected external parent: ${directory}`,
        );
        await this.assertExternalParentDirectory(parent, identity);
      },
    };
  }

  async assertLockOwned() {
    assertCurrentHostStorageBoundaries(this.paths, this.host);
    await this.lock?.assertOwned();
  }

  async check() {
    await this.assertLockOwned();
    await this.assertAllExternalParents();
    await this.assertLockOwned();
    const current = await offlineObservations(this.paths, this.staticTargets, this.host);
    await this.assertLockOwned();
    const currentManifest = await loadManifest(this.paths, { host: this.host });
    await this.assertLockOwned();
    await assertManagedNamespace(this.paths, {
      host: this.host,
      manifest: currentManifest,
      staticTargets: this.staticTargets,
      extraFiles: this.namespaceFiles,
    });
    await this.assertLockOwned();

    for (const target of this.staticTargets) {
      const state = current[target];
      if (this.completedStatic.has(target)) {
        const desired = this.plan.desiredFiles[target];
        invariant(
          state.kind === "file" &&
            state.sha256 === desired.sha256 &&
            (process.platform === "win32" || state.mode === desired.mode),
          "completed_write_drift",
          `A completed write changed unexpectedly: ${target}`,
        );
      } else {
        invariant(
          digestJson(state) === digestJson(this.plan.state.observations[target]),
          "stale_plan_state",
          `Planned target changed before mutation: ${target}`,
        );
      }
    }

    for (const target of [this.paths.providerSecret, this.paths.gatewaySecret]) {
      const expectedDigest = this.secretDigests.get(target);
      if (expectedDigest) {
        await this.assertLockOwned();
        const state = await inspectPath(target);
        invariant(
          state.kind === "file" && state.sha256 === expectedDigest,
          "concurrent_secret_change",
          `Credential changed during apply: ${target}`,
        );
        if (!this.pendingPermissionRepairTargets.has(target)) {
          await this.assertLockOwned();
          await this.verifyCredentialPermissions(target, this.host);
        }
      } else {
        invariant(
          digestJson(current[target]) === digestJson(this.plan.state.observations[target]),
          "stale_plan_secret_state",
          `Credential metadata changed after planning: ${target}`,
        );
        if (current[target].kind === "file") {
          await this.assertLockOwned();
          const state = await inspectPath(target);
          const priorDigest = this.secretDigests.get(target);
          if (priorDigest) {
            invariant(
              state.sha256 === priorDigest,
              "concurrent_secret_change",
              `Credential changed during apply: ${target}`,
            );
          } else {
            this.secretDigests.set(target, state.sha256);
          }
        }
      }
    }
    if (this.expectedCredentialContinuity) {
      await this.assertLockOwned();
      invariant(
        digestJson(await credentialPairContinuity(this.paths, this.host)) ===
          digestJson(this.expectedCredentialContinuity),
        "rollback_credential_changed",
        "Rollback-preserved credential content changed during setup",
      );
    }

    if (this.runtimeDigest) {
      await this.assertLockOwned();
      const inventory = await inventoryTree(this.paths.venvRoot, { allowSymlinks: true });
      invariant(
        inventory.digest === this.runtimeDigest,
        "runtime_changed_during_apply",
        "Owned runtime changed during the mutation",
      );
    } else {
      invariant(
        digestJson(current[this.paths.runtimeRoot]) ===
          digestJson(this.plan.state.observations[this.paths.runtimeRoot]),
        "stale_plan_runtime_state",
        "Runtime state changed after planning",
      );
    }

    if (this.manifestPlanId) {
      const manifest = await loadManifest(this.paths, { host: this.host, required: true });
      invariant(
        manifest.lastPlanId === this.manifestPlanId,
        "manifest_changed_during_apply",
        "Install manifest changed during the mutation",
      );
    } else {
      invariant(
        digestJson(current[this.paths.manifest]) ===
          digestJson(this.plan.state.observations[this.paths.manifest]),
        "stale_plan_manifest_state",
        "Install manifest changed after planning",
      );
    }

    if (!this.processChanged) {
      invariant(
        current[this.paths.processReceipt].kind ===
          this.plan.state.observations[this.paths.processReceipt].kind,
        "stale_plan_process_state",
        "Process receipt presence changed after planning",
      );
      invariant(
        digestJson(current[this.paths.processStopRequest]) ===
          digestJson(this.plan.state.observations[this.paths.processStopRequest]),
        "stale_plan_process_state",
        "Process stop-request state changed after planning",
      );
    } else {
      invariant(
        current[this.paths.processStopRequest].kind === "absent",
        "process_stop_request_changed",
        "Process action left concurrent or unowned stop-request state",
      );
    }
    if (!this.rollbackReceiptChanged) {
      invariant(
        digestJson(current[this.paths.rollbackReceipt]) ===
          digestJson(this.plan.state.observations[this.paths.rollbackReceipt]),
        "stale_plan_rollback_state",
        "Rollback receipt changed after planning",
      );
    }
  }
}

async function revalidateExecutables(plan, host) {
  for (const [name, expected] of Object.entries(plan.executables)) {
    if (!expected.path) continue;
    assertWslSameEnvironmentPath(expected.path, host, `${name} executable`);
    let actualPath;
    try {
      actualPath = fs.realpathSync.native(expected.path);
    } catch {
      throw new SetupError("executable_missing", `Planned executable is missing: ${name}`);
    }
    invariant(
      actualPath === expected.path,
      "executable_path_changed",
      `Executable path changed after planning: ${name}`,
    );
    assertWslSameEnvironmentPath(expected.path, host, `${name} executable`);
    const before = await inspectPath(expected.path);
    invariant(
      before.kind === "file" && before.sha256 === expected.sha256,
      "executable_content_changed",
      `Executable content changed after planning: ${name}`,
    );
    assertWslSameEnvironmentPath(expected.path, host, `${name} executable`);
    const version = await captureVersion(expected.path);
    invariant(
      version === expected.version,
      "executable_version_changed",
      `Executable version changed after planning: ${name}`,
      { expected: expected.version, actual: version },
    );
    assertWslSameEnvironmentPath(expected.path, host, `${name} executable`);
    const after = await inspectPath(expected.path);
    invariant(
      after.kind === "file" &&
        after.sha256 === expected.sha256 &&
        digestJson(after) === digestJson(before),
      "executable_content_changed",
      `Executable changed while its identity was revalidated: ${name}`,
    );
  }
}

async function revalidateSourceAssets(plan) {
  const assets = await loadTemplateAssets();
  for (const [name, expected] of Object.entries(plan.sourceAssets)) {
    invariant(
      assets[name]?.sha256 === expected,
      "source_asset_changed",
      `Skill source asset changed after planning: ${name}`,
    );
  }
  invariant(
    Object.keys(assets).sort().join("\n") === Object.keys(plan.sourceAssets).sort().join("\n"),
    "source_asset_set_changed",
    "Skill source asset set changed after planning",
  );
}

async function revalidateEvidenceFiles(plan, now) {
  if (!["setup", "add-clients"].includes(plan.workflow)) return;
  const evidence = await validateDiscoveryEvidence(plan.discoveryEvidence.path, plan.model, now);
  invariant(
    digestJson(evidence) === digestJson(plan.discoveryEvidence),
    "evidence_file_changed",
    `Approved evidence changed after planning: ${plan.discoveryEvidence.path}`,
  );
}

async function assertInternalRuntimeLinks(root, inventory) {
  for (const entry of inventory.entries.filter((candidate) => candidate.kind === "symlink")) {
    invariant(
      !path.isAbsolute(entry.target),
      "runtime_link_external",
      `Owned runtime contains an absolute symbolic link: ${entry.path}`,
    );
    const resolved = path.resolve(root, path.dirname(entry.path), entry.target);
    invariant(
      within(resolved, root) && (await inspectPath(resolved, { hash: false })).kind !== "absent",
      "runtime_link_external",
      `Owned runtime contains an escaping or dangling symbolic link: ${entry.path}`,
    );
  }
}

async function installRuntime({
  beforeCleanup = null,
  commandRunner = runCommand,
  guard,
  host,
  paths,
  plan,
}) {
  await guard.check();
  invariant(
    (await inspectPath(paths.venvRoot, { hash: false })).kind === "absent",
    "runtime_exists",
    `Runtime target already exists: ${paths.venvRoot}`,
  );
  await ensureDirectory(paths.runtimeRoot, 0o700, {
    assertMutationOwned: async () => await guard.assertLockOwned(),
  });
  await guard.assertLockOwned();
  await secureDirectoryPermissions(paths.runtimeRoot, host);
  try {
    await guard.assertLockOwned();
    await commandRunner(plan.executables.python.path, ["-m", "venv", "--copies", paths.venvRoot]);
    invariant(
      (await inspectPath(plan.litellm.python, { hash: false })).kind === "file",
      "venv_python_missing",
      "Virtual environment did not create its Python executable",
    );
    await guard.assertLockOwned();
    await commandRunner(
      plan.litellm.python,
      [
        "-m",
        "pip",
        "--isolated",
        "install",
        "--disable-pip-version-check",
        "--no-cache-dir",
        "--no-input",
        plan.litellm.package,
        ...plan.litellm.runtimeDependencies,
      ],
      { timeoutMs: 600_000 },
    );
    await guard.assertLockOwned();
    await commandRunner(
      plan.litellm.python,
      ["-m", "pip", "--isolated", "--disable-pip-version-check", "check"],
      { timeoutMs: 60_000 },
    );
    await guard.assertLockOwned();
    const freeze = await commandRunner(
      plan.litellm.python,
      ["-m", "pip", "--isolated", "--disable-pip-version-check", "freeze", "--all"],
      { timeoutMs: 60_000 },
    );
    await guard.assertLockOwned();
    const version = await commandRunner(plan.litellm.executable, ["--version"], {
      timeoutMs: 30_000,
    });
    invariant(
      new RegExp(`(?:^|[^0-9.])${LITELLM_PIN.replaceAll(".", "\\.")}(?:$|[^0-9.])`, "m").test(
        `${version.stdout}\n${version.stderr}`,
      ),
      "litellm_pin_mismatch",
      `Installed LiteLLM does not report the reviewed pin ${LITELLM_PIN}`,
    );
    const tree = await inventoryTree(paths.venvRoot, { allowSymlinks: true });
    await assertInternalRuntimeLinks(paths.venvRoot, tree);
    guard.markRuntime(tree.digest);
    return {
      treeDigest: tree.digest,
      treeEntries: tree.count,
      pythonExecutable: plan.litellm.python,
      pythonVersion: plan.executables.python.version,
      litellmExecutable: fs.realpathSync.native(plan.litellm.executable),
      litellmVersion: LITELLM_PIN,
      packages: freeze.stdout.split(/\r?\n/).filter(Boolean).sort(),
    };
  } catch (error) {
    if (error?.details?.cleanupSafe === false) throw error;
    await guard.assertLockOwned();
    const state = await inspectPath(paths.venvRoot, { hash: false });
    if (state.kind === "directory") {
      const partialTree = await inventoryTree(paths.venvRoot, { allowSymlinks: true });
      await beforeCleanup?.({ path: paths.venvRoot, treeDigest: partialTree.digest });
      await removeTreeIfOwned(paths.venvRoot, partialTree.digest, {
        assertMutationOwned: async () => await guard.assertLockOwned(),
      });
    } else {
      invariant(
        state.kind === "absent",
        "runtime_cleanup_unsafe",
        "Failed runtime creation left a non-directory target; refusing recursive cleanup",
      );
    }
    await removeEmptyDirectoryIfOwned(paths.runtimeRoot, {
      assertMutationOwned: async () => await guard.assertLockOwned(),
    });
    throw error;
  }
}

function backupTarget(paths, planId, target) {
  return path.join(
    paths.backupsRoot,
    planId,
    `${crypto.createHash("sha256").update(target).digest("hex")}.bak`,
  );
}

async function applyStaticFiles({
  afterExternalDirectoryBind,
  backups,
  guard,
  manifest,
  paths,
  plan,
  staticChanges,
}) {
  const rendered = await desiredStaticFiles({
    claudeExecutable: plan.executables["claude-code"].path,
    clients: plan.clients,
    host: guard.host,
    model: plan.model,
    paths,
    nodeExecutable: plan.executables.node.path,
  });
  for (const [target, desired] of Object.entries(rendered)) {
    const planned = plan.desiredFiles[target];
    invariant(
      planned && planned.sha256 === desired.sha256 && planned.mode === desired.mode,
      "desired_file_changed",
      `Rendered file no longer matches the approved plan: ${target}`,
    );
    const sourceOperation = plan.operations.find((operation) => operation.path === target);
    if (sourceOperation?.action === "noop") {
      guard.markStatic(target);
      continue;
    }

    await guard.check();
    const current = await inspectPath(target);
    let backup = null;
    if (current.kind === "file") {
      const owned = manifest?.artifacts?.find((artifact) => artifact.path === target);
      invariant(owned, "unowned_target_exists", `Refusing to replace an unowned target: ${target}`);
      const destination = backupTarget(paths, plan.planId, target);
      invariant(
        (await inspectPath(destination, { hash: false })).kind === "absent",
        "backup_target_exists",
        `Backup target already exists: ${destination}`,
      );
      const backupSecrets = [];
      for (const [secretPath, label] of [
        [paths.providerSecret, "provider credential"],
        [paths.gatewaySecret, "gateway credential"],
      ]) {
        if ((await inspectPath(secretPath, { hash: false })).kind === "file") {
          backupSecrets.push(await readSecret(secretPath, guard.host, label));
        }
      }
      await guard.check();
      assertNoSecretMaterial(await fsPromises.readFile(target, "utf8"), backupSecrets);
      await prepareManagedParent(
        destination,
        paths,
        guard.host,
        async () => await guard.assertLockOwned(),
      );
      backup = {
        target,
        ...(await copyNonSecretBackup(target, destination, {
          assertMutationOwned: async () => await guard.assertLockOwned(),
          beforeRename: async (temporary, binding) => {
            await securePathPermissions(temporary, guard.host, 0o600, {
              expectedIdentity: binding.identity,
            });
          },
          beforePublish: async () => {
            await guard.assertLockOwned();
          },
          changedCode: "stale_plan_state",
          expectedHash: current.sha256,
          secrets: backupSecrets,
        })),
      };
      backups.push(backup);
    }
    await guard.check();
    await prepareManagedParent(
      target,
      paths,
      guard.host,
      async () => await guard.assertLockOwned(),
      async () => await guard.assertExternalParent(target),
    );
    const externalParentOptions = guard.externalParentOptions(target);
    await atomicWrite(target, desired.content, {
      ...externalParentOptions,
      afterDirectoryBind: guard.requiresExistingParent(target)
        ? afterExternalDirectoryBind
        : undefined,
      assertMutationOwned: async () => await guard.assertLockOwned(),
      beforeRename: async (temporary, binding) => {
        await securePathPermissions(temporary, guard.host, desired.mode, {
          expectedIdentity: binding.identity,
        });
      },
      beforePublish: async () => {
        await guard.assertLockOwned();
      },
      changedCode: "stale_plan_state",
      expected:
        current.kind === "absent" ? { kind: "absent" } : { kind: "file", sha256: current.sha256 },
      label: "Planned static target",
      mode: desired.mode,
    });
    staticChanges.push({
      backup,
      desiredSha256: desired.sha256,
      previous: current,
      target,
    });
    guard.markStatic(target);
  }
  return backups;
}

async function writeCredential(target, value, guard, onWritten) {
  const { host } = guard;
  const validated = validateSecretValue(value, path.basename(target));
  const expectedSha256 = crypto.createHash("sha256").update(validated).digest("hex");
  const current = await inspectPath(target);
  invariant(
    current.kind === "absent" || current.kind === "file",
    "concurrent_secret_change",
    `Credential changed type before it was written: ${target}`,
  );
  await atomicWrite(target, validated, {
    assertMutationOwned: async () => await guard.assertLockOwned(),
    beforeRename: async (temporary, binding) => {
      await securePathPermissions(temporary, host, 0o600, {
        expectedIdentity: binding.identity,
      });
    },
    beforePublish: async () => {
      await guard.assertLockOwned();
    },
    afterPublish: async () => {
      await verifyProtectedPermissions(target, host);
    },
    changedCode: "concurrent_secret_change",
    expected:
      current.kind === "absent" ? { kind: "absent" } : { kind: "file", sha256: current.sha256 },
    label: "Credential",
    mode: 0o600,
  });
  const state = await inspectPath(target);
  invariant(
    state.kind === "file" && state.sha256 === expectedSha256,
    "concurrent_secret_change",
    `Credential changed while it was written: ${target}`,
  );
  await onWritten?.(expectedSha256);
}

function generateGatewayCredential() {
  return validateGatewaySecretValue(`sk-${crypto.randomBytes(32).toString("base64url")}`);
}

async function applyCredentialActions({
  guard,
  host,
  paths,
  plan,
  providerCredential,
  secretChanges = [],
}) {
  const secrets = [];
  const actions = plan.credentials.actions;
  await guard.check();
  if (actions.provider === "create" || actions.provider === "replace-from-stdin") {
    invariant(
      providerCredential,
      "provider_credential_input_required",
      "Provider credential must be supplied on stdin",
    );
    await guard.check();
    await prepareManagedParent(
      paths.providerSecret,
      paths,
      host,
      async () => await guard.assertLockOwned(),
    );
    await writeCredential(paths.providerSecret, providerCredential, guard, async (sha256) => {
      secretChanges.push({
        previous: plan.state.observations[paths.providerSecret],
        sha256,
        target: paths.providerSecret,
      });
      guard.markSecret(paths.providerSecret, sha256);
    });
    secrets.push(providerCredential);
  } else {
    await readSecret(paths.providerSecret, host, "provider credential");
  }

  await guard.check();
  if (actions.gateway === "generate" || actions.gateway === "replace-generated") {
    const generated = generateGatewayCredential();
    await guard.check();
    await prepareManagedParent(
      paths.gatewaySecret,
      paths,
      host,
      async () => await guard.assertLockOwned(),
    );
    await writeCredential(paths.gatewaySecret, generated, guard, async (sha256) => {
      secretChanges.push({
        previous: plan.state.observations[paths.gatewaySecret],
        sha256,
        target: paths.gatewaySecret,
      });
      guard.markSecret(paths.gatewaySecret, sha256);
    });
    secrets.push(generated);
  } else {
    await readGatewaySecret(paths.gatewaySecret, host, "gateway credential");
  }
  return secrets;
}

async function collectArtifacts(plan) {
  const artifacts = [];
  for (const [target, desired] of Object.entries(plan.desiredFiles)) {
    const state = await inspectPath(target);
    invariant(
      state.kind === "file" && state.sha256 === desired.sha256,
      "artifact_collection_failed",
      `Owned artifact does not match the plan: ${target}`,
    );
    artifacts.push({
      path: target,
      role: desired.role,
      sha256: state.sha256,
      mode: desired.mode,
      rollback: "remove",
    });
  }
  return artifacts.sort((left, right) => left.path.localeCompare(right.path));
}

async function credentialMetadata(paths) {
  const provider = await inspectPath(paths.providerSecret, { hash: false });
  const gateway = await inspectPath(paths.gatewaySecret, { hash: false });
  invariant(
    provider.kind === "file" && gateway.kind === "file",
    "credential_metadata_missing",
    "Credential files are missing",
  );
  return {
    provider: {
      path: paths.providerSecret,
      mode: provider.mode,
      size: provider.size,
      mtimeMs: provider.mtimeMs,
      purpose: "upstream-provider",
    },
    gateway: {
      path: paths.gatewaySecret,
      mode: gateway.mode,
      size: gateway.size,
      mtimeMs: gateway.mtimeMs,
      purpose: "administrative-loopback-gateway",
    },
    rollback: "preserve",
  };
}

function configuredComponents(clients) {
  return {
    provider: "configured",
    gateway: "configured",
    codex: clients.includes("codex") ? "configured" : "blocked",
    "claude-code": clients.includes("claude-code") ? "configured" : "blocked",
    cursor: clients.includes("cursor") ? "verification_required" : "blocked",
  };
}

async function buildManifest({ backups, existing, paths, plan, runtime, now = Date.now() }) {
  const artifacts = await collectArtifacts(plan);
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    kind: "hetzner-inference-install-manifest",
    skillVersion: SKILL_VERSION,
    createdAt: existing?.createdAt ?? new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    lastPlanId: plan.planId,
    model: plan.model,
    clients: plan.clients,
    host: plan.host,
    executables: plan.executables,
    discoveryEvidence: plan.discoveryEvidence,
    litellm: { pin: LITELLM_PIN, package: plan.litellm.package },
    runtime,
    artifacts,
    backups: [...(existing?.backups ?? []), ...backups],
    credentials: await credentialMetadata(paths),
    components: configuredComponents(plan.clients),
    evidence: {
      invalidatedAt: new Date(now).toISOString(),
      reason: "configuration-or-credential-state-changed",
    },
    process: existing?.process ?? { status: "not-started" },
    rollbackActions: [
      ...artifacts.map((artifact) => ({
        action: "remove-owned-file",
        path: artifact.path,
        sha256: artifact.sha256,
      })),
      { action: "remove-owned-runtime", path: paths.venvRoot, treeDigest: runtime.treeDigest },
      { action: "preserve-credential", path: paths.providerSecret },
      { action: "preserve-credential", path: paths.gatewaySecret },
    ],
  };
}

async function writeManifest({ beforeWrite = null, guard, manifest, paths, plan }) {
  await guard.check();
  assertNoSecretMaterial(manifest, []);
  const current = await inspectPath(paths.manifest);
  invariant(
    current.kind === "absent" || current.kind === "file",
    "stale_plan_manifest_state",
    "Install manifest changed type before publication",
  );
  await beforeWrite?.(manifest);
  await guard.assertLockOwned();
  await prepareManagedParent(
    paths.manifest,
    paths,
    guard.host,
    async () => await guard.assertLockOwned(),
  );
  await atomicWriteJson(paths.manifest, manifest, {
    assertMutationOwned: async () => await guard.assertLockOwned(),
    beforeRename: async (temporary, binding) => {
      await securePathPermissions(temporary, guard.host, 0o600, {
        expectedIdentity: binding.identity,
      });
    },
    beforePublish: async () => {
      await guard.assertLockOwned();
    },
    changedCode: "stale_plan_manifest_state",
    expected:
      current.kind === "absent" ? { kind: "absent" } : { kind: "file", sha256: current.sha256 },
    label: "Install manifest",
    mode: 0o600,
  });
  guard.markManifest(plan.planId);
}

function manifestWithProcess(manifest, plan, processResult, now) {
  return {
    ...manifest,
    updatedAt: new Date(now).toISOString(),
    lastPlanId: plan.planId,
    process: processResult.receipt
      ? {
          status: processResult.receipt.status,
          processToken: processResult.receipt.processToken,
          runnerPid: processResult.receipt.runnerPid,
          childPid: processResult.receipt.childPid,
          runnerExecutable: processResult.receipt.runnerExecutable,
          runnerScript: processResult.receipt.runnerScript,
          gatewayExecutable: processResult.receipt.gatewayExecutable,
          gatewayArgsDigest: processResult.receipt.gatewayArgsDigest,
          configSha256: processResult.receipt.configSha256,
          startedAt: processResult.receipt.startedAt,
        }
      : { status: "not-running" },
  };
}

async function updateManifestForProcess({
  beforeWrite,
  guard,
  manifest,
  paths,
  plan,
  processResult,
  now,
}) {
  const updated = manifestWithProcess(manifest, plan, processResult, now);
  await writeManifest({ beforeWrite, guard, manifest: updated, paths, plan });
  return updated;
}

async function removeVolatileProcessFiles(paths, processToken, assertMutationOwned = null) {
  for (const target of [paths.processStopRequest, paths.processReceipt]) {
    await assertMutationOwned?.();
    await removeJsonFileIfOwned(
      target,
      (value) => {
        invariant(
          value.processToken === processToken,
          "process_cleanup_identity_mismatch",
          "Process state identity changed during transaction cleanup",
        );
      },
      {
        assertMutationOwned,
        changedCode: "process_cleanup_unsafe",
        label: "Process state",
        maxBytes: 65_536,
      },
    );
  }
}

export async function restorePriorProcessReceipt(
  paths,
  host,
  processToken,
  priorReceipt,
  beforePublish = null,
  assertMutationOwned = null,
) {
  await removeVolatileProcessFiles(paths, processToken, assertMutationOwned);
  if (!priorReceipt) return;
  await assertMutationOwned?.();
  await atomicWriteJson(paths.processReceipt, priorReceipt, {
    assertMutationOwned,
    beforeRename: async (temporary, binding) => {
      await securePathPermissions(temporary, host, 0o600, {
        expectedIdentity: binding.identity,
      });
    },
    beforePublish,
    changedCode: "process_cleanup_unsafe",
    expected: { kind: "absent" },
    label: "Prior process receipt restoration",
    mode: 0o600,
  });
}

async function compensateUncommittedStart({ context, manifest, priorReceipt, processResult }) {
  try {
    await context.guard.assertLockOwned();
    await context.compensateGateway({
      assertMutationOwned: async () => await context.guard.assertLockOwned(),
      host: context.host,
      manifest,
      paths: context.paths,
      receipt: processResult.receipt,
      now: context.lifecycleNow,
    });
    await restorePriorProcessReceipt(
      context.paths,
      context.host,
      processResult.receipt.processToken,
      priorReceipt,
      async (details) => {
        await context.beforeProcessReceiptRestore?.(details);
        await context.guard.assertLockOwned();
      },
      async () => await context.guard.assertLockOwned(),
    );
  } catch (compensationError) {
    throw new SetupError(
      compensationError instanceof SetupError
        ? compensationError.code
        : "process_compensation_failed",
      "Manifest persistence failed and the exact started process could not be compensated",
      {
        ...compensationError?.details,
        compensationCode: compensationError?.code ?? "unexpected_error",
      },
    );
  }
}

async function cleanupSetupTransaction({
  afterExternalCleanupClaim,
  backups,
  beforeStaticRestorePublish,
  guard,
  host,
  paths,
  processResult,
  provisionalManifest,
  runtimeCreated,
  secretChanges,
  staticChanges,
}) {
  if (processResult?.receipt) {
    const ownedProcessManifest = manifestWithProcess(
      provisionalManifest,
      guard.plan,
      processResult,
      Date.now(),
    );
    if (processResult.receipt.status === "ready") {
      await guard.assertLockOwned();
      await stopOwnedGateway({
        assertMutationOwned: async () => await guard.assertLockOwned(),
        host,
        manifest: ownedProcessManifest,
        paths,
      });
    } else {
      invariant(
        processResult.receipt.status === "stopped" || processResult.receipt.status === "failed",
        "process_cleanup_state_unsafe",
        "Owned runner did not reach a terminal cleanup state",
      );
    }
    await removeVolatileProcessFiles(
      paths,
      processResult.receipt.processToken,
      async () => await guard.assertLockOwned(),
    );
    guard.processChanged = true;
  }

  for (const change of [...secretChanges].reverse()) {
    await guard.assertLockOwned();
    invariant(
      change.previous.kind === "absent",
      "secret_cleanup_requires_manual_recovery",
      "Automatic cleanup never restores a previous secret value",
    );
    await removeFileIfOwned(change.target, change.sha256, {
      assertMutationOwned: async () => await guard.assertLockOwned(),
      changedCode: "secret_cleanup_target_changed",
      label: "Newly written credential",
    });
  }

  for (const change of [...staticChanges].reverse()) {
    await guard.assertLockOwned();
    if (change.previous.kind === "absent") {
      await removeFileIfOwned(change.target, change.desiredSha256, {
        ...guard.externalParentOptions(change.target),
        afterClaim: guard.requiresExistingParent(change.target)
          ? afterExternalCleanupClaim
          : undefined,
        assertMutationOwned: async () => await guard.assertLockOwned(),
        changedCode: "static_cleanup_target_changed",
        label: "Newly written artifact",
      });
      continue;
    }
    invariant(change.backup, "static_cleanup_backup_missing", "A replaced artifact has no backup");
    await restoreFileFromOwnedBackup(
      change.target,
      change.desiredSha256,
      change.backup.path,
      change.backup.sha256,
      {
        ...guard.externalParentOptions(change.target),
        afterClaim: guard.requiresExistingParent(change.target)
          ? afterExternalCleanupClaim
          : undefined,
        assertMutationOwned: async () => await guard.assertLockOwned(),
        backupChangedCode: "static_cleanup_backup_changed",
        backupLabel: "Artifact backup",
        beforeRename: async (temporary, binding) => {
          await securePathPermissions(temporary, host, change.previous.mode, {
            expectedIdentity: binding.identity,
          });
        },
        beforePublish: async (details) => {
          await beforeStaticRestorePublish?.(details);
          await guard.assertLockOwned();
        },
        targetChangedCode: "static_cleanup_target_changed",
        targetLabel: "Newly written artifact",
        mode: change.previous.mode,
      },
    );
  }

  for (const backup of [...backups].reverse()) {
    await guard.assertLockOwned();
    await removeFileIfOwned(backup.path, backup.sha256, {
      assertMutationOwned: async () => await guard.assertLockOwned(),
    });
  }

  if (runtimeCreated && guard.runtimeDigest) {
    await guard.assertLockOwned();
    await removeTreeIfOwned(paths.venvRoot, guard.runtimeDigest, {
      assertMutationOwned: async () => await guard.assertLockOwned(),
    });
  }

  await guard.assertLockOwned();
  await removeEmptyDirectories(
    [
      paths.secretsDir,
      paths.binDir,
      path.dirname(paths.gatewayConfig),
      paths.runtimeRoot,
      ...new Set(backups.map((backup) => path.dirname(backup.path))),
      paths.backupsRoot,
      paths.configRoot,
      paths.stateRoot,
    ],
    async () => await guard.assertLockOwned(),
  );
}

async function consumeSetupPlan(context) {
  const { commandRunner, guard, host, paths, plan } = context;
  const existing = await loadManifest(paths, { host });
  const backups = [];
  const secretChanges = [];
  const staticChanges = [];
  const runtimeCreated = !existing?.runtime;
  let processResult = null;
  let provisionalManifest = null;
  let runtime = existing?.runtime;
  try {
    if (!runtime)
      runtime = await installRuntime({
        beforeCleanup: context.beforeRuntimeCleanup,
        commandRunner,
        guard,
        host,
        paths,
        plan,
      });
    else guard.markRuntime(runtime.treeDigest);

    await applyStaticFiles({
      afterExternalDirectoryBind: context.afterExternalDirectoryBind,
      backups,
      guard,
      manifest: existing,
      paths,
      plan,
      staticChanges,
    });
    const secrets = await applyCredentialActions({ ...context, secretChanges });
    provisionalManifest = await buildManifest({
      backups,
      existing,
      paths,
      plan,
      runtime,
      now: context.now,
    });
    assertNoSecretMaterial(provisionalManifest, secrets);

    if (plan.process.action === "start") {
      await guard.check();
      guard.processChanged = true;
      processResult = await context.startGateway({
        assertMutationOwned: async () => await guard.assertLockOwned(),
        host,
        manifest: provisionalManifest,
        paths,
        plan,
        now: context.lifecycleNow,
      });
      provisionalManifest = manifestWithProcess(
        provisionalManifest,
        plan,
        processResult,
        Date.now(),
      );
    }
    await writeManifest({
      beforeWrite: context.beforeManifestWrite,
      guard,
      manifest: provisionalManifest,
      paths,
      plan,
    });
    return { changed: true, manifest: provisionalManifest, secretsForRedaction: secrets };
  } catch (error) {
    if (!guard.manifestPlanId) {
      if (error?.details?.cleanupSafe === false) throw error;
      const ownedProcessToken = error?.details?.ownedProcessToken;
      if (!processResult && ownedProcessToken) {
        let receipt;
        try {
          receipt = await readProcessReceipt(paths, host);
        } catch (receiptError) {
          throw new SetupError(
            "process_cleanup_requires_manual_recovery",
            "Owned gateway receipt could not be verified; setup state was preserved for manual recovery",
            {
              causeCode: receiptError?.code ?? "process_receipt_unreadable",
              cleanupSafe: false,
            },
          );
        }
        const matchingReceipt = receipt?.processToken === ownedProcessToken ? receipt : null;
        const terminalReceipt = ["failed", "stopped"].includes(matchingReceipt?.status);
        const stoppableReceipt = matchingReceipt?.status === "ready";
        if (terminalReceipt || stoppableReceipt) {
          processResult = { changed: true, receipt };
        }
        if (!terminalReceipt && !stoppableReceipt) {
          throw new SetupError(
            "process_cleanup_requires_manual_recovery",
            "No current owned gateway receipt authorizes cleanup; setup state was preserved for manual recovery",
            {
              causeCode: error?.code ?? "unexpected_error",
              cleanupSafe: false,
            },
          );
        }
      }
      await cleanupSetupTransaction({
        afterExternalCleanupClaim: context.afterExternalCleanupClaim,
        backups,
        beforeStaticRestorePublish: context.beforeStaticRestorePublish,
        guard,
        host,
        paths,
        processResult,
        provisionalManifest,
        runtimeCreated,
        secretChanges,
        staticChanges,
      });
    }
    throw error;
  }
}

async function consumeLifecyclePlan(context) {
  const { guard, host, paths, plan } = context;
  let manifest = await loadManifest(paths, { host, required: true });
  const manifestBeforeProcess = manifest;
  const priorReceipt = plan.workflow === "start" ? await readProcessReceipt(paths, host) : null;
  guard.markRuntime(manifest.runtime.treeDigest);
  await guard.check();
  guard.processChanged = true;
  const processResult =
    plan.workflow === "start"
      ? await context.startGateway({
          assertMutationOwned: async () => await guard.assertLockOwned(),
          host,
          manifest,
          paths,
          plan,
          now: context.lifecycleNow,
        })
      : await context.stopGateway({
          assertMutationOwned: async () => await guard.assertLockOwned(),
          host,
          manifest,
          paths,
          now: context.lifecycleNow,
        });
  try {
    manifest = await updateManifestForProcess({
      beforeWrite: context.beforeManifestWrite,
      guard,
      manifest,
      paths,
      plan,
      processResult,
      now: Date.now(),
    });
  } catch (error) {
    if (plan.workflow === "start" && processResult.changed) {
      await compensateUncommittedStart({
        context,
        manifest: manifestBeforeProcess,
        priorReceipt,
        processResult,
      });
    }
    throw error;
  }
  return {
    changed: processResult.changed,
    gatewayProcessStatus: processResult.terminalStatus ?? processResult.receipt?.status ?? null,
    manifest,
    secretsForRedaction: [],
  };
}

async function consumeRotatePlan(context) {
  const { guard, host, paths, plan } = context;
  let manifest = await loadManifest(paths, { host, required: true });
  guard.markRuntime(manifest.runtime.treeDigest);
  await guard.check();
  guard.processChanged = true;
  const stopped = await context.stopGateway({
    assertMutationOwned: async () => await guard.assertLockOwned(),
    host,
    manifest,
    paths,
    now: context.lifecycleNow,
  });
  const secrets = await applyCredentialActions(context);
  manifest = {
    ...manifest,
    updatedAt: new Date(context.now).toISOString(),
    lastPlanId: plan.planId,
    components: configuredComponents(manifest.clients),
    credentials: await credentialMetadata(paths),
    evidence: {
      invalidatedAt: new Date(context.now).toISOString(),
      reason: `${plan.rotation.credential}-credential-rotated`,
    },
    process: stopped.receipt
      ? { ...manifest.process, status: stopped.receipt.status }
      : { status: "not-running" },
  };
  assertNoSecretMaterial(manifest, secrets);
  await writeManifest({
    beforeWrite: context.beforeManifestWrite,
    guard,
    manifest,
    paths,
    plan,
  });

  if (plan.process.action === "restart") {
    const manifestBeforeProcess = manifest;
    const priorReceipt = await readProcessReceipt(paths, host);
    await guard.check();
    const started = await context.startGateway({
      assertMutationOwned: async () => await guard.assertLockOwned(),
      host,
      manifest,
      paths,
      plan,
      now: context.lifecycleNow,
    });
    try {
      manifest = await updateManifestForProcess({
        beforeWrite: context.beforeManifestWrite,
        guard,
        manifest,
        paths,
        plan,
        processResult: started,
        now: Date.now(),
      });
    } catch (error) {
      if (started.changed) {
        await compensateUncommittedStart({
          context,
          manifest: manifestBeforeProcess,
          priorReceipt,
          processResult: started,
        });
      }
      throw error;
    }
  }
  return { changed: true, manifest, secretsForRedaction: secrets };
}

async function removeEmptyDirectories(
  directories,
  beforeRemove = null,
  assertMutationOwned = beforeRemove,
) {
  for (const directory of [...directories].sort((left, right) => right.length - left.length)) {
    await beforeRemove?.(directory);
    await removeEmptyDirectoryIfOwned(directory, { assertMutationOwned });
  }
}

function rollbackCredentialObservations(plan, paths) {
  return Object.fromEntries(
    [paths.gatewaySecret, paths.providerSecret]
      .sort()
      .map((target) => [target, plan.state.observations[target]]),
  );
}

function assertRollbackJournalMatches(journal, plan, paths) {
  invariant(
    journal?.kind === "hetzner-inference-rollback-journal" &&
      journal.planId === plan.planId &&
      journal.rollbackDigest === digestJson(plan.rollback) &&
      digestJson(journal.rollback) === digestJson(plan.rollback),
    "rollback_journal_mismatch",
    "Rollback journal does not match the approved plan",
  );
  invariant(
    digestJson(journal.preservedCredentialObservations) ===
      digestJson(rollbackCredentialObservations(plan, paths)),
    "rollback_journal_credential_mismatch",
    "Rollback journal does not match the approved credential observations",
  );
}

async function writeRollbackDocument(paths, host, document, guard = null) {
  await guard?.assertLockOwned();
  const current = await inspectPath(paths.rollbackReceipt);
  invariant(
    current.kind === "absent" || current.kind === "file",
    "rollback_receipt_drift",
    "Rollback state changed type before publication",
  );
  await prepareManagedParent(
    paths.rollbackReceipt,
    paths,
    host,
    guard ? async () => await guard.assertLockOwned() : null,
  );
  await guard?.assertLockOwned();
  await atomicWriteJson(paths.rollbackReceipt, document, {
    assertMutationOwned: guard ? async () => await guard.assertLockOwned() : null,
    beforeRename: async (temporary, binding) => {
      await securePathPermissions(temporary, host, 0o600, {
        expectedIdentity: binding.identity,
      });
    },
    beforePublish: async () => {
      await guard?.assertLockOwned();
    },
    changedCode: "rollback_receipt_drift",
    expected:
      current.kind === "absent" ? { kind: "absent" } : { kind: "file", sha256: current.sha256 },
    label: "Rollback state",
    mode: 0o600,
  });
}

function newRollbackJournal(plan, paths, manifest, credentialContinuity, now) {
  const observedAt = new Date(now).toISOString();
  return {
    schemaVersion: 1,
    kind: "hetzner-inference-rollback-journal",
    status: "in_progress",
    planId: plan.planId,
    createdAt: observedAt,
    updatedAt: observedAt,
    rollbackDigest: digestJson(plan.rollback),
    rollback: plan.rollback,
    processToken: manifest.process?.processToken ?? null,
    preservedCredentialObservations: rollbackCredentialObservations(plan, paths),
    credentialContinuity,
  };
}

async function assertCredentialContinuity(host, paths, journal) {
  invariant(
    digestJson(await credentialPairContinuity(paths, host)) ===
      digestJson(journal.credentialContinuity),
    "rollback_credential_changed",
    "Preserved credential content changed during rollback",
  );
}

async function assertRollbackProgress({ guard, host, journal, manifest, paths, plan }) {
  await guard?.assertLockOwned();
  await guard?.assertAllExternalParents();
  const currentManifest = await inspectPath(paths.manifest);
  invariant(
    currentManifest.kind === "file" && currentManifest.sha256 === plan.rollback.manifest.sha256,
    "rollback_manifest_changed",
    "Install manifest changed after rollback planning",
  );
  const currentManifestDocument = await loadManifest(paths, { host, required: true });
  invariant(
    digestJson(plan.rollback) ===
      digestJson(rollbackContract(paths, currentManifestDocument, currentManifest.sha256)) &&
      digestJson(currentManifestDocument) === digestJson(manifest),
    "rollback_contract_changed",
    "Rollback plan no longer matches the exact manifest-owned deletion set",
  );

  assertRollbackJournalMatches(journal, plan, paths);
  for (const target of plan.rollback.preserveCredentials) {
    invariant(
      digestJson(await inspectPath(target, { hash: false })) ===
        digestJson(journal.preservedCredentialObservations[target]),
      "rollback_credential_changed",
      `Preserved credential changed during rollback: ${target}`,
    );
  }
  await assertCredentialContinuity(host, paths, journal);

  for (const artifact of plan.rollback.artifacts) {
    await guard?.assertExternalParent(artifact.path);
    const state = await inspectPath(artifact.path);
    invariant(
      state.kind === "absent" || (state.kind === "file" && state.sha256 === artifact.sha256),
      "rollback_artifact_not_owned",
      `Rollback target is no longer absent or manifest-owned: ${artifact.path}`,
    );
    if (state.kind === "file") {
      const manifestArtifact = currentManifestDocument.artifacts.find(
        (candidate) => candidate.path === artifact.path,
      );
      invariant(
        manifestArtifact,
        "rollback_artifact_not_owned",
        `Rollback target has no manifest protection contract: ${artifact.path}`,
      );
      try {
        await verifyRestrictedFilePermissions(artifact.path, host, manifestArtifact.mode);
      } catch (error) {
        throw new SetupError(
          "rollback_artifact_protection_invalid",
          `Rollback target protection changed after planning: ${artifact.path}`,
          { reason: error.code ?? "permission_check_failed" },
        );
      }
    }
    await guard?.assertExternalParent(artifact.path);
  }
  for (const backup of plan.rollback.backups) {
    const state = await inspectPath(backup.path);
    invariant(
      state.kind === "absent" || (state.kind === "file" && state.sha256 === backup.sha256),
      "rollback_backup_not_owned",
      `Rollback backup is no longer absent or manifest-owned: ${backup.path}`,
    );
    if (state.kind === "file") {
      const manifestBackup = currentManifestDocument.backups.find(
        (candidate) => candidate.path === backup.path,
      );
      invariant(
        manifestBackup,
        "rollback_backup_not_owned",
        `Rollback backup has no manifest protection contract: ${backup.path}`,
      );
      try {
        await verifyRestrictedFilePermissions(backup.path, host, manifestBackup.mode);
      } catch (error) {
        throw new SetupError(
          "rollback_backup_protection_invalid",
          `Rollback backup protection changed after planning: ${backup.path}`,
          { reason: error.code ?? "permission_check_failed" },
        );
      }
    }
  }
  const runtimeState = await inspectPath(plan.rollback.runtime.path, { hash: false });
  if (runtimeState.kind !== "absent") {
    invariant(
      runtimeState.kind === "directory",
      "rollback_runtime_not_owned",
      "Rollback runtime changed type",
    );
    const inventory = await inventoryTree(plan.rollback.runtime.path, { allowSymlinks: true });
    invariant(
      inventory.digest === plan.rollback.runtime.treeDigest,
      "rollback_runtime_not_owned",
      "Rollback runtime no longer matches its manifest digest",
    );
  }
  await assertManagedNamespace(paths, { host, manifest: currentManifestDocument });
}

async function removeOwnedProcessState(target, processToken, assertMutationOwned = null) {
  return await removeJsonFileIfOwned(
    target,
    (value) => {
      invariant(
        processToken && value.processToken === processToken,
        "process_state_not_owned",
        `Process state does not match the owned token: ${target}`,
      );
    },
    {
      assertMutationOwned,
      changedCode: "process_state_not_owned",
      label: "Process state",
      maxBytes: 65_536,
    },
  );
}

async function assertRollbackTerminalState(host, paths, plan, journal, guard = null) {
  await guard?.assertLockOwned();
  await guard?.assertAllExternalParents();
  assertRollbackJournalMatches(journal, plan, paths);
  for (const target of rollbackRemovalTargets(plan.rollback)) {
    await guard?.assertExternalParent(target);
    invariant(
      (await inspectPath(target, { hash: false })).kind === "absent",
      "rollback_incomplete",
      `Approved rollback target remains after deletion: ${target}`,
    );
    await guard?.assertExternalParent(target);
  }
  for (const target of plan.rollback.preserveCredentials) {
    invariant(
      digestJson(await inspectPath(target, { hash: false })) ===
        digestJson(journal.preservedCredentialObservations[target]),
      "rollback_credential_changed",
      `Preserved credential changed before rollback completion: ${target}`,
    );
  }
  await assertCredentialContinuity(host, paths, journal);
  await assertManagedNamespace(paths, { host });
}

function completedRollbackReceipt(plan, journal, now) {
  return {
    schemaVersion: 1,
    kind: "hetzner-inference-rollback-receipt",
    planId: plan.planId,
    observedAt: new Date(now).toISOString(),
    rollbackDigest: journal.rollbackDigest,
    rollback: journal.rollback,
    removed: rollbackRemovalTargets(plan.rollback),
    preservedCredentials: plan.rollback.preserveCredentials,
    preservedCredentialObservations: journal.preservedCredentialObservations,
    credentialContinuity: journal.credentialContinuity,
    components: {
      provider: "rolled_back",
      gateway: "rolled_back",
      codex: "rolled_back",
      "claude-code": "rolled_back",
      cursor: "rolled_back",
    },
  };
}

async function completeInterruptedRollback({ guard, host, journal, now, paths, plan }) {
  await assertRollbackTerminalState(host, paths, plan, journal, guard);
  const receipt = completedRollbackReceipt(plan, journal, now);
  await writeRollbackDocument(paths, host, receipt, guard);
  return { changed: true, receipt, secretsForRedaction: [] };
}

async function consumeRollbackPlan(context) {
  const { guard, host, paths, plan } = context;
  const manifest = await loadManifest(paths, { host, required: true });
  let journal = context.rollbackJournal;
  if (journal) {
    assertRollbackJournalMatches(journal, plan, paths);
  } else {
    await guard.check();
    const credentialContinuity = await credentialPairContinuity(paths, host);
    await guard.check();
    journal = newRollbackJournal(plan, paths, manifest, credentialContinuity, context.now);
    await writeRollbackDocument(paths, host, journal, guard);
  }
  guard.rollbackReceiptChanged = true;
  guard.processChanged = true;
  await assertRollbackProgress({ guard, host, journal, manifest, paths, plan });
  const stopped = await context.stopGateway({
    assertMutationOwned: async () => await guard.assertLockOwned(),
    host,
    manifest,
    paths,
    now: context.lifecycleNow,
  });
  await assertRollbackProgress({ guard, host, journal, manifest, paths, plan });
  journal = {
    ...journal,
    processToken: stopped.receipt?.processToken ?? manifest.process?.processToken ?? null,
    updatedAt: new Date(Date.now()).toISOString(),
  };
  await writeRollbackDocument(paths, host, journal, guard);

  for (const artifact of plan.rollback.artifacts) {
    await assertRollbackProgress({ guard, host, journal, manifest, paths, plan });
    await removeFileIfOwned(artifact.path, artifact.sha256, {
      ...guard.externalParentOptions(artifact.path),
      afterClaim: guard.requiresExistingParent(artifact.path)
        ? context.afterExternalRollbackClaim
        : undefined,
      assertMutationOwned: async () => await guard.assertLockOwned(),
    });
  }
  await assertRollbackProgress({ guard, host, journal, manifest, paths, plan });
  await removeTreeIfOwned(plan.rollback.runtime.path, plan.rollback.runtime.treeDigest, {
    assertMutationOwned: async () => await guard.assertLockOwned(),
  });
  for (const backup of plan.rollback.backups) {
    await assertRollbackProgress({ guard, host, journal, manifest, paths, plan });
    await removeFileIfOwned(backup.path, backup.sha256, {
      assertMutationOwned: async () => await guard.assertLockOwned(),
    });
  }
  for (const volatile of plan.rollback.processState) {
    await assertRollbackProgress({ guard, host, journal, manifest, paths, plan });
    await removeOwnedProcessState(
      volatile,
      journal.processToken,
      async () => await guard.assertLockOwned(),
    );
  }
  await removeEmptyDirectories(
    plan.rollback.emptyDirectories,
    async () => {
      await assertRollbackProgress({ guard, host, journal, manifest, paths, plan });
    },
    async () => await guard.assertLockOwned(),
  );
  await assertRollbackProgress({ guard, host, journal, manifest, paths, plan });
  await removeFileIfOwned(plan.rollback.manifest.path, plan.rollback.manifest.sha256, {
    assertMutationOwned: async () => await guard.assertLockOwned(),
  });

  await assertRollbackTerminalState(host, paths, plan, journal, guard);
  const receipt = completedRollbackReceipt(plan, journal, context.now);
  await writeRollbackDocument(paths, host, receipt, guard);
  return { changed: true, receipt, secretsForRedaction: [] };
}

function commandForPlan(command) {
  return command === "apply" ? ["setup", "add-clients"] : [command];
}

async function assertAppliedProcessState(plan, paths, manifest, host) {
  if (plan.process.action === "none") return;
  const receipt = await readProcessReceipt(paths, host);
  if (!receipt && plan.process.action === "stop") {
    invariant(
      !manifestProcessHasIdentity(manifest.process),
      "idempotent_process_drift",
      "The plan was applied, but its recorded process identity lost its receipt",
    );
    return;
  }
  const identityFindings = receipt
    ? await processIdentityFindings(receipt, manifest, paths, { host })
    : [{ code: "process_receipt_missing", path: paths.processReceipt }];
  if (plan.process.action === "start" || plan.process.action === "restart") {
    invariant(
      processReceiptFresh(receipt) && receipt.status === "ready" && identityFindings.length === 0,
      "idempotent_process_drift",
      "The plan was applied, but its owned gateway is no longer proven ready",
    );
    return;
  }
  invariant(
    receipt &&
      (receipt.status === "stopped" || receipt.status === "failed") &&
      identityFindings.length === 0,
    "idempotent_process_drift",
    "The plan was applied, but its owned gateway is not in the expected terminal state",
  );
}

async function assertCompletedRollback(host, paths, plan) {
  const receipt = await readRollbackReceipt(paths, host);
  invariant(
    receipt?.planId === plan.planId &&
      receipt.rollbackDigest === digestJson(plan.rollback) &&
      digestJson(receipt.rollback) === digestJson(plan.rollback),
    "rollback_receipt_mismatch",
    "Existing rollback receipt belongs to another plan",
  );
  invariant(
    digestJson(receipt.removed) === digestJson(rollbackRemovalTargets(plan.rollback)),
    "rollback_receipt_targets_invalid",
    "Rollback receipt does not contain the complete approved deletion set",
  );
  invariant(
    digestJson(receipt.preservedCredentials) === digestJson(plan.rollback.preserveCredentials) &&
      digestJson(receipt.preservedCredentialObservations) ===
        digestJson(rollbackCredentialObservations(plan, paths)),
    "rollback_receipt_credentials_invalid",
    "Rollback receipt changes the approved preserved credential set",
  );
  const verification = await verifyCompletedRollbackReceipt(paths, receipt, {
    host,
    verifyCredentialContent: true,
  });
  invariant(
    verification.ok,
    "idempotent_rollback_drift",
    "Completed rollback state changed after its receipt was written",
    verification,
  );
  return receipt;
}

async function assertSetupCredentialProvenance(host, paths, plan) {
  const unownedProcessState = [];
  for (const target of [paths.processReceipt, paths.processStopRequest]) {
    if ((await inspectPath(target, { hash: false })).kind !== "absent") {
      unownedProcessState.push(target);
    }
  }
  invariant(
    unownedProcessState.length === 0,
    "unowned_process_state_exists",
    "Setup cannot adopt process state without an install manifest",
    { paths: unownedProcessState },
  );
  const preservedTargets = [
    ...(plan.credentials.actions.provider === "preserve" ? [paths.providerSecret] : []),
    ...(plan.credentials.actions.gateway === "preserve" ? [paths.gatewaySecret] : []),
  ];
  if (preservedTargets.length === 0) return null;
  const receipt = await readRollbackState(paths, host);
  invariant(
    receipt?.kind === "hetzner-inference-rollback-receipt",
    "unowned_credential_exists",
    "Setup cannot consume preserved credentials without a completed rollback receipt",
  );
  const verification = await verifyCompletedRollbackReceipt(paths, receipt, {
    host,
    verifyCredentialContent: true,
  });
  invariant(
    verification.ok,
    "rollback_receipt_drift",
    "Setup credential provenance changed before mutation",
    verification,
  );
  for (const target of preservedTargets) {
    invariant(
      digestJson(plan.state.observations[target]) ===
        digestJson(receipt.preservedCredentialObservations[target]),
      "rollback_receipt_drift",
      `Setup plan no longer matches rollback-preserved credential metadata: ${target}`,
    );
  }
  return receipt.credentialContinuity;
}

function assertPlanManifestBinding(plan, manifest) {
  if (plan.workflow === "setup") {
    invariant(
      manifest === null,
      "plan_manifest_binding_mismatch",
      "Initial setup plan cannot consume an existing install manifest",
    );
    return;
  }
  invariant(
    manifest && plan.state.manifestPlanId === manifest.lastPlanId,
    "plan_manifest_binding_mismatch",
    "Plan no longer names the current install-manifest revision",
  );
  invariant(
    digestJson(plan.host) === digestJson(manifest.host),
    "plan_manifest_host_mismatch",
    "Plan host boundary differs from the install manifest",
  );
  if (plan.workflow === "add-clients") {
    invariant(
      manifest.clients.every((client) => plan.clients.includes(client)) &&
        plan.clients.some((client) => !manifest.clients.includes(client)),
      "plan_manifest_clients_mismatch",
      "Add-client plan must preserve every configured client and add at least one",
    );
    return;
  }
  invariant(
    digestJson(plan.clients) === digestJson(manifest.clients) && plan.model === manifest.model,
    "plan_manifest_configuration_mismatch",
    "Plan changes installed clients or model outside setup/add-client authority",
  );
  invariant(
    digestJson(plan.discoveryEvidence) === digestJson(manifest.discoveryEvidence),
    "plan_manifest_evidence_mismatch",
    "Plan changes provider-discovery provenance outside setup/add-client authority",
  );
}

export async function consumePlan({
  approval,
  command,
  host,
  paths,
  plan,
  providerCredential,
  now,
  dependencies = {},
}) {
  // Mutation timestamps stay fixed, but heartbeat freshness uses the current clock unless injected.
  const lifecycleNow = now;
  now ??= Date.now();
  assertCurrentHostStorageBoundaries(paths, host);
  const initialRollbackState = command === "rollback" ? await readRollbackState(paths, host) : null;
  validatePlanDocument(plan, {
    host,
    paths,
    now,
    command,
    allowExpiredPlanId: initialRollbackState?.planId ?? null,
  });
  await dependencies.afterPlanValidation?.();
  assertCurrentHostStorageBoundaries(paths, host);
  invariant(
    approval === plan.planId,
    "approval_mismatch",
    "Mutation requires --approve with the exact plan ID",
  );
  invariant(
    commandForPlan(command).includes(plan.workflow),
    "plan_command_mismatch",
    `${command} cannot consume a ${plan.workflow} plan`,
  );

  const lock = await acquireMutationLock(paths, plan.planId, host, now);
  let primaryError = null;
  let primaryFailure = false;
  let terminalExternalGuard = null;
  let terminalExternalContext = null;
  try {
    const existing = await loadManifest(paths, { host });
    let setupCredentialContinuity = null;
    if (!existing && plan.workflow === "setup") {
      setupCredentialContinuity = await assertSetupCredentialProvenance(host, paths, plan);
    }
    const currentRollbackState =
      plan.workflow === "rollback" ? await readRollbackState(paths, host) : null;
    const rollbackJournal =
      currentRollbackState?.kind === "hetzner-inference-rollback-journal"
        ? currentRollbackState
        : null;
    if (!existing && plan.workflow === "rollback") {
      const rollbackGuard = new MutationGuard({ host, lock, paths, plan });
      await rollbackGuard.assertAllExternalParents();
      if (rollbackJournal) {
        const result = await completeInterruptedRollback({
          guard: rollbackGuard,
          host,
          journal: rollbackJournal,
          now,
          paths,
          plan,
        });
        terminalExternalGuard = rollbackGuard;
        terminalExternalContext = { command, status: "completed", workflow: plan.workflow };
        return {
          schemaVersion: 1,
          kind: "hetzner-inference-mutation-result",
          command,
          planId: plan.planId,
          changed: result.changed,
          status: "completed",
          components: result.receipt.components,
          localGatewayCredentialScope: "administrative",
          credentialsPreserved: true,
        };
      }
      const receipt = await assertCompletedRollback(host, paths, plan);
      terminalExternalGuard = rollbackGuard;
      terminalExternalContext = { command, status: "noop", workflow: plan.workflow };
      return {
        schemaVersion: 1,
        kind: "hetzner-inference-mutation-result",
        command,
        planId: plan.planId,
        changed: false,
        status: "noop",
        components: receipt.components,
        credentialsPreserved: true,
      };
    }
    if (existing?.lastPlanId === plan.planId && plan.workflow !== "rollback") {
      const idempotentGuard = new MutationGuard({ host, lock, paths, plan });
      await idempotentGuard.assertAllExternalParents();
      const verification = await verifyManifest(paths, existing, host);
      invariant(
        verification.ok,
        "idempotent_state_drift",
        "Previously applied plan now has drift",
        verification,
      );
      await assertAppliedProcessState(plan, paths, existing, host);
      terminalExternalGuard = idempotentGuard;
      terminalExternalContext = { command, status: "noop", workflow: plan.workflow };
      return {
        schemaVersion: 1,
        kind: "hetzner-inference-mutation-result",
        command,
        planId: plan.planId,
        changed: false,
        status: "noop",
        components: existing.components,
      };
    }

    assertPlanManifestBinding(plan, existing);
    if (existing && !rollbackJournal) {
      const currentOwnedState = await verifyManifest(paths, existing, host);
      invariant(
        currentOwnedState.driftDigest === plan.state.driftDigest,
        "stale_plan_state",
        "Manifest-owned state changed after planning",
        { driftDigest: currentOwnedState.driftDigest },
      );
    }

    await dependencies.beforeExecutableRevalidation?.();
    await revalidateExecutables(plan, host);
    await revalidateSourceAssets(plan);
    await revalidateEvidenceFiles(plan, now);
    const guard = new MutationGuard({
      expectedCredentialContinuity: setupCredentialContinuity,
      host,
      lock,
      paths,
      plan,
    });
    if (!rollbackJournal) await guard.check();
    else await guard.assertAllExternalParents();
    const context = {
      approval,
      command,
      commandRunner: dependencies.runCommand ?? runCommand,
      beforeRuntimeCleanup: dependencies.beforeRuntimeCleanup ?? null,
      beforeManifestWrite: dependencies.beforeManifestWrite ?? null,
      beforeProcessReceiptRestore: dependencies.beforeProcessReceiptRestore ?? null,
      compensateGateway: dependencies.compensateStartedGateway ?? compensateStartedGateway,
      guard,
      host,
      lifecycleNow,
      now,
      paths,
      plan,
      providerCredential,
      rollbackJournal,
      afterExternalCleanupClaim: dependencies.afterExternalCleanupClaim ?? null,
      afterExternalDirectoryBind: dependencies.afterExternalDirectoryBind ?? null,
      afterExternalRollbackClaim: dependencies.afterExternalRollbackClaim ?? null,
      beforeStaticRestorePublish: dependencies.beforeStaticRestorePublish ?? null,
      startGateway: dependencies.startOwnedGateway ?? startOwnedGateway,
      stopGateway: dependencies.stopOwnedGateway ?? stopOwnedGateway,
    };
    let result;
    if (["setup", "add-clients", "repair"].includes(plan.workflow)) {
      result = await consumeSetupPlan(context);
    } else if (["start", "stop"].includes(plan.workflow)) {
      result = await consumeLifecyclePlan(context);
    } else if (plan.workflow === "rotate") {
      result = await consumeRotatePlan(context);
    } else if (plan.workflow === "rollback") {
      result = await consumeRollbackPlan(context);
    } else {
      throw new SetupError(
        "workflow_not_implemented",
        `No mutation implementation for ${plan.workflow}`,
      );
    }
    const output = {
      schemaVersion: 1,
      kind: "hetzner-inference-mutation-result",
      command,
      planId: plan.planId,
      changed: result.changed,
      status: "completed",
      components: result.manifest?.components ?? result.receipt?.components,
      ...(result.gatewayProcessStatus ? { gatewayProcessStatus: result.gatewayProcessStatus } : {}),
      localGatewayCredentialScope: "administrative",
      credentialsPreserved: plan.workflow === "rollback",
    };
    assertNoSecretMaterial(output, result.secretsForRedaction ?? []);
    return output;
  } catch (error) {
    primaryError = error;
    primaryFailure = true;
    throw error;
  } finally {
    try {
      await lock.release({
        afterOwnershipAssertion: dependencies.afterLockReleaseOwnershipAssertion ?? null,
      });
    } catch (releaseError) {
      // A failed lock release must cancel pending success; an existing failure remains authoritative.
      // eslint-disable-next-line no-unsafe-finally
      if (!primaryFailure) throw releaseError;
      try {
        if (
          primaryError &&
          typeof primaryError === "object" &&
          (primaryError.details === undefined ||
            (primaryError.details !== null &&
              typeof primaryError.details === "object" &&
              !Array.isArray(primaryError.details)))
        ) {
          primaryError.details = {
            ...(primaryError.details ?? {}),
            lockReleaseFailureCode:
              releaseError instanceof SetupError && releaseError.code === "lock_ownership_lost"
                ? "lock_ownership_lost"
                : "lock_release_failed",
          };
        }
      } catch {
        // The primary error is authoritative even if its metadata is immutable.
      }
    }
    if (!primaryFailure && terminalExternalGuard) {
      await dependencies.beforeTerminalExternalParentCheck?.(terminalExternalContext);
      await terminalExternalGuard.assertAllExternalParents();
    }
  }
}
