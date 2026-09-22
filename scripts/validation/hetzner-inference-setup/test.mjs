import assert from "node:assert/strict";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile as nodeExecFile, spawn, spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  atomicJson as runnerAtomicJson,
  removeTokenBoundStopRequest,
  runGatewayRunner,
} from "../../../skills/engineering-workflows/hetzner-inference-setup/assets/templates/gateway-runner.mjs";
import {
  executeFileAsync,
  inspectCurrentUserDirectoryBoundaryAsync,
  parseCurrentWslWindowsMounts,
  pathIdentity,
  powershellCommand,
  readProtectedSecret,
  readProtectedGatewaySecret,
  secureAndVerifyCurrentUserFileAsync,
  windowsAclAccessRulesScript,
} from "../../../skills/engineering-workflows/hetzner-inference-setup/assets/templates/protected-file.mjs";

import {
  CLAUDE_E2E_CASES,
  CODEX_E2E_CASES,
  CREDENTIAL_CONTINUITY_SCHEME,
  EVIDENCE_SCHEMA_VERSION,
  GATEWAY_ALIAS,
  LITELLM_PIN,
  LITELLM_RUNTIME_DEPENDENCIES,
  MANIFEST_SCHEMA_VERSION,
  PROCESS_STOP_PHASE_COUNT,
  PROCESS_STOP_TIMEOUT_MS,
  PROVIDER_BASE_URL,
  SKILL_VERSION,
} from "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/constants.mjs";
import {
  cursorGuidance,
  loadTemplateAssets,
  ownedArtifactContracts,
  renderClaudeLauncher,
  renderCodexProfile,
  renderCredentialHelper,
  renderGatewayConfig,
  renderGatewayRunner,
  requireCodexProfileVersion,
} from "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/config.mjs";
import {
  checkCommand,
  exitCodeFor,
  hasFailedExternalProbe,
  requireCurrentGatewayProof,
  runCli,
  stableErrorExitCodeEntries,
} from "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/cli.mjs";
import { SetupError } from "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/errors.mjs";
import {
  assertNoLinkSegments,
  atomicWrite,
  atomicWriteJson,
  credentialPairContinuity,
  inspectPath,
  inventoryTree,
  readJson,
  readGatewaySecret,
  readSecret,
  redactText,
  removeFileIfOwned,
  removeJsonFileIfOwned,
  removeTreeIfOwned,
  restoreFileFromOwnedBackup,
  validateGatewaySecretValue,
  validateSecretValue,
} from "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/files.mjs";
import {
  captureVersion,
  commandInvocation,
  detectHost,
  isWslWindowsMountedPath,
  managedPaths,
  parseWslWindowsMounts,
  resolveExecutable,
} from "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/hosts.mjs";
import {
  compensateStartedGateway,
  startOwnedGateway,
  stopOwnedGateway,
  writeStopRequest,
} from "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/lifecycle.mjs";
import {
  digestJson,
  stableJson,
  withoutKeys,
} from "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/json.mjs";
import { acquireMutationLock } from "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/lock.mjs";
import {
  consumePlan,
  MutationGuard,
  restorePriorProcessReceipt,
  runCommand,
} from "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/mutate.mjs";
import {
  createPlan,
  validatePlanDocument,
} from "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/plan.mjs";
import {
  assertExternalProtectedDirectoryPath,
  inspectProtectedDirectoryBoundary,
  parseWhoamiCsv,
  preflightExternalProtectedDirectory,
  secureDirectoryPermissions,
  securePathPermissions,
  validProtectedDirectoryBoundaryObservation,
  verifyProtectedPermissions,
  verifyRestrictedFilePermissions,
} from "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/permissions.mjs";
import {
  assertProxyIndependentTransport,
  runGatewayCheck,
  runProviderCheck,
  validateClientEvidence,
} from "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/probes.mjs";
import {
  immutableProcessBindingDigest,
  installationStatus,
  loadManifest,
  managedNamespaceFindings,
  offlineObservations,
  readProcessReceipt,
  readRollbackState,
  rollbackRemovalTargets,
  verifyManifest,
} from "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/state.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const hostFixtures = JSON.parse(
  await fs.promises.readFile(path.join(currentDirectory, "fixtures", "hosts.json"), "utf8"),
);
const WSL_WINDOWS_MOUNT_INFO = String.raw`1 0 8:16 / / rw,relatime - ext4 /dev/sdb rw
100 1 0:80 / /windir/c rw,relatime - 9p C:\134 rw,aname=drvfs;path=C:\134;uid=1000
101 1 0:81 / /media/windows rw,relatime - drvfs D:\134 rw,uid=1000
102 1 0:82 / /usr/lib/wsl/drivers ro,relatime - 9p drivers ro,aname=drivers;uid=1000
`;

function withWslDrvFsMount(mountPoint, identifier = 200) {
  assert.doesNotMatch(mountPoint, /\s/u);
  return `${WSL_WINDOWS_MOUNT_INFO}${identifier} 1 0:${identifier} / ${mountPoint} rw,relatime - 9p E:\\134 rw,aname=drvfs;path=E:\\134;uid=1000\n`;
}

function callArgumentSources(source, callee) {
  const calls = [];
  let searchFrom = 0;
  while (searchFrom < source.length) {
    const start = source.indexOf(callee, searchFrom);
    if (start < 0) break;
    searchFrom = start + callee.length;
    if (/[A-Za-z0-9_$]/u.test(source[start - 1] ?? "")) continue;
    let open = searchFrom;
    while (/\s/u.test(source[open] ?? "")) open += 1;
    if (source[open] !== "(") continue;
    const args = [];
    let argumentStart = open + 1;
    let roundDepth = 1;
    let squareDepth = 0;
    let curlyDepth = 0;
    let quote = null;
    let escaped = false;
    for (let index = open + 1; index < source.length; index += 1) {
      const character = source[index];
      const next = source[index + 1];
      if (quote !== null) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === quote) quote = null;
        continue;
      }
      if (character === "/" && next === "/") {
        const newline = source.indexOf("\n", index + 2);
        index = newline < 0 ? source.length : newline;
        continue;
      }
      if (character === "/" && next === "*") {
        const close = source.indexOf("*/", index + 2);
        index = close < 0 ? source.length : close + 1;
        continue;
      }
      if (character === '"' || character === "'" || character === "`") {
        quote = character;
        continue;
      }
      if (character === "(") roundDepth += 1;
      else if (character === ")") {
        roundDepth -= 1;
        if (roundDepth === 0) {
          args.push(source.slice(argumentStart, index).trim());
          calls.push(args);
          searchFrom = index + 1;
          break;
        }
      } else if (character === "[") squareDepth += 1;
      else if (character === "]") squareDepth -= 1;
      else if (character === "{") curlyDepth += 1;
      else if (character === "}") curlyDepth -= 1;
      else if (character === "," && roundDepth === 1 && squareDepth === 0 && curlyDepth === 0) {
        args.push(source.slice(argumentStart, index).trim());
        argumentStart = index + 1;
      }
    }
  }
  return calls;
}

function stableCodesEmittedBy(source) {
  const codes = new Set();
  const collect = (expression) => {
    for (const match of expression?.matchAll(/["']([a-z][a-z0-9]*_[a-z0-9_]+)["']/gu) ?? []) {
      codes.add(match[1]);
    }
  };
  for (const args of callArgumentSources(source, "invariant")) collect(args[1]);
  for (const args of callArgumentSources(source, "SetupError")) collect(args[0]);
  for (const match of source.matchAll(
    /\b[A-Za-z][A-Za-z0-9]*Code\s*(?::|=)\s*["']([a-z][a-z0-9]*_[a-z0-9_]+)["']/gu,
  )) {
    codes.add(match[1]);
  }
  return codes;
}

async function temporaryDirectory(name, operation, base = os.tmpdir()) {
  // macOS exposes /var and /tmp through aliases; bind fixtures to their physical path first.
  const root = await fs.promises.realpath(await fs.promises.mkdtemp(path.join(base, `${name}-`)));
  try {
    return await operation(root);
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
}

async function runnerTemporaryDirectory(
  name,
  operation,
  base = process.platform === "win32" ? process.env.LOCALAPPDATA : os.tmpdir(),
) {
  assert.ok(base, "Windows runner tests require LOCALAPPDATA");
  return await temporaryDirectory(name, operation, base);
}

function fakeOwnedChild(pid = 51_001) {
  const child = new EventEmitter();
  const killSignals = [];
  Object.assign(child, {
    exitCode: null,
    pid,
    signalCode: null,
    killSignals,
    kill(signal) {
      killSignals.push(signal);
      queueMicrotask(() => child.emit("exit", null, signal));
      return true;
    },
  });
  return child;
}

async function waitUntil(operation, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    const value = await operation();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("timed out waiting for test state");
}

function actualHost(root) {
  if (process.platform === "win32") {
    const localAppData = path.join(root, "LocalAppData");
    const env = { ...process.env, LOCALAPPDATA: localAppData };
    delete env.CODEX_HOME;
    return detectHost({
      env,
      home: path.join(root, "home"),
      platform: "win32",
    });
  }
  if (process.platform === "darwin") {
    return detectHost({
      env: { ...process.env, CODEX_HOME: path.join(root, "codex") },
      home: path.join(root, "home"),
      platform: "darwin",
    });
  }
  return detectHost({
    env: {
      ...process.env,
      CODEX_HOME: path.join(root, "codex"),
      WSL_DISTRO_NAME: "",
      WSL_INTEROP: "",
      XDG_CONFIG_HOME: path.join(root, "config"),
      XDG_STATE_HOME: path.join(root, "state"),
    },
    home: path.join(root, "home"),
    platform: "linux",
  });
}

function isolatedHostEnvironment(root) {
  if (process.platform === "win32") {
    return {
      ...process.env,
      CODEX_HOME: path.join(root, "codex"),
      LOCALAPPDATA: path.join(root, "LocalAppData"),
    };
  }
  if (process.platform === "darwin") {
    return {
      ...process.env,
      CODEX_HOME: path.join(root, "codex"),
      HOME: path.join(root, "home"),
    };
  }
  return {
    ...process.env,
    CODEX_HOME: path.join(root, "codex"),
    HOME: path.join(root, "home"),
    WSL_DISTRO_NAME: "",
    WSL_INTEROP: "",
    XDG_CONFIG_HOME: path.join(root, "config"),
    XDG_STATE_HOME: path.join(root, "state"),
  };
}

function setupEntrypoint() {
  return path.resolve(
    currentDirectory,
    "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/setup-hetzner-inference.mjs",
  );
}

function runSetupEntrypoint(root, args, options = {}) {
  return spawnSync(process.execPath, [setupEntrypoint(), ...args], {
    encoding: "utf8",
    env: { ...isolatedHostEnvironment(root), ...options.env },
    input: options.input,
    timeout: options.timeout ?? 15_000,
  });
}

async function protectedDirectory(target, host, options = {}) {
  await fs.promises.mkdir(target, { recursive: true, mode: 0o700 });
  await secureDirectoryPermissions(target, host, options);
}

async function protectedFile(target, content, host, mode = 0o600) {
  await atomicWrite(target, content, { mode });
  await securePathPermissions(target, host, mode);
  return await inspectPath(target);
}

async function protectedPublication(target, content, host, mode = 0o600, options = {}) {
  await atomicWrite(target, content, {
    ...options,
    beforeRename: async (temporary, binding) => {
      await securePathPermissions(temporary, host, mode, {
        expectedIdentity: binding.identity,
      });
    },
    mode,
  });
  return await inspectPath(target);
}

function discoveryEvidence(now, models = ["example-model"]) {
  const observedAt = new Date(now).toISOString();
  return {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    kind: "hetzner-inference-provider-discovery",
    observedAt,
    provider: {
      baseUrl: PROVIDER_BASE_URL,
      model: null,
      models,
      results: [
        {
          name: "models",
          status: "verified",
          startedAt: observedAt,
          details: { count: models.length, models },
        },
      ],
      state: "transport_verified",
    },
  };
}

function gatewayCredential(character = "a") {
  return `sk-${character.repeat(43)}`;
}

async function readyReceiptFor(manifest, paths, token, now, pids = [61_001, 61_002]) {
  const config = await inspectPath(paths.gatewayConfig);
  return {
    schemaVersion: 1,
    processToken: token,
    runnerPid: pids[0],
    childPid: pids[1],
    runnerExecutable: manifest.executables.node.path,
    runnerScript: fs.realpathSync.native(paths.gatewayRunner),
    gatewayExecutable: manifest.runtime.litellmExecutable,
    gatewayArgsDigest: crypto
      .createHash("sha256")
      .update(
        JSON.stringify(["--config", paths.gatewayConfig, "--host", "127.0.0.1", "--port", "4000"]),
      )
      .digest("hex"),
    configPath: fs.realpathSync.native(paths.gatewayConfig),
    configSha256: config.sha256,
    host: "127.0.0.1",
    port: 4000,
    startedAt: new Date(now).toISOString(),
    heartbeatAt: new Date(now).toISOString(),
    status: "ready",
  };
}

function stopReceiptContext(receipt, request) {
  return {
    claim: `.process-stop.json.${receipt.runnerPid}.00000000-0000-4000-8000-000000000000.quarantine`,
    deadlineAt: request.deadlineAt,
    requestedAt: request.requestedAt,
    sha256: crypto.createHash("sha256").update(stableJson(request)).digest("hex"),
  };
}

function stoppedReceipt(receipt, request = null) {
  return {
    ...receipt,
    status: "stopped",
    error: null,
    exitCode: 0,
    exitSignal: null,
    stopRequest:
      request === null ? (receipt.stopRequest ?? null) : stopReceiptContext(receipt, request),
  };
}

function failedReceipt(receipt, error = "injected child failure", request = null) {
  return {
    ...receipt,
    status: "failed",
    error,
    exitCode: null,
    exitSignal: "SIGTERM",
    stopRequest:
      request === null ? (receipt.stopRequest ?? null) : stopReceiptContext(receipt, request),
  };
}

function stoppingReceipt(receipt, request) {
  return {
    ...receipt,
    status: "stopping",
    stopReason: "approved-stop-request",
    stopRequest: stopReceiptContext(receipt, request),
  };
}

function stopRequestFor(
  processToken,
  now = Date.now(),
  deadlineAt = now + PROCESS_STOP_TIMEOUT_MS,
) {
  return {
    deadlineAt: new Date(deadlineAt).toISOString(),
    schemaVersion: 1,
    processToken,
    requestedAt: new Date(now).toISOString(),
  };
}

async function withRunnerFixture(name, operation) {
  return await runnerTemporaryDirectory(name, async (root) => {
    const host = detectHost({ env: process.env, home: os.homedir(), platform: process.platform });
    const configRoot = path.join(root, "managed-config");
    const stateRoot = path.join(root, "managed-state");
    const secretsDirectory = path.join(configRoot, "secrets");
    const runtimeDirectory = path.join(stateRoot, "runtime");
    for (const directory of [configRoot, stateRoot, secretsDirectory, runtimeDirectory]) {
      await protectedDirectory(directory, host);
    }
    const config = path.join(configRoot, "gateway.yaml");
    const litellm = path.join(
      runtimeDirectory,
      process.platform === "win32" ? "litellm.exe" : "litellm",
    );
    const providerKey = path.join(secretsDirectory, "provider.key");
    const masterKey = path.join(secretsDirectory, "gateway.key");
    const receipt = path.join(stateRoot, "process-receipt.json");
    const stopRequest = path.join(stateRoot, "stop-request.json");
    const runnerScript = path.resolve(
      currentDirectory,
      "../../../skills/engineering-workflows/hetzner-inference-setup/assets/templates/gateway-runner.mjs",
    );
    const token = "a".repeat(64);
    await protectedFile(config, "model_list: []\n", host);
    await protectedFile(litellm, "fake LiteLLM executable\n", host, 0o700);
    await protectedFile(providerKey, "provider-runner-fixture", host);
    await protectedFile(masterKey, gatewayCredential("r"), host);
    const configRootBoundary = await inspectProtectedDirectoryBoundary(configRoot, host);
    const stateRootBoundary = await inspectProtectedDirectoryBoundary(stateRoot, host);
    const args = [
      "--config",
      config,
      "--config-root",
      configRoot,
      "--config-root-boundary",
      JSON.stringify(configRootBoundary),
      "--litellm",
      litellm,
      "--master-key",
      masterKey,
      "--port",
      "4000",
      "--provider-key",
      providerKey,
      "--receipt",
      receipt,
      "--receipt-expected",
      "absent",
      "--runner-executable",
      process.execPath,
      "--runner-script",
      runnerScript,
      "--state-root",
      stateRoot,
      "--state-root-boundary",
      JSON.stringify(stateRootBoundary),
      "--stop-request",
      stopRequest,
      "--token",
      token,
    ];
    const rootBoundaries = new Map([
      [path.resolve(configRoot), configRootBoundary],
      [path.resolve(stateRoot), stateRootBoundary],
    ]);
    return await operation({
      args,
      config,
      configRoot,
      host,
      receipt,
      rootBoundaryDependencies: {
        configRoot,
        inspectCurrentUserDirectoryBoundary(target) {
          const observation = rootBoundaries.get(path.resolve(target));
          if (!observation) throw new Error(`unexpected runner root: ${target}`);
          return structuredClone(observation);
        },
        runnerExecutable: process.execPath,
        runnerScript,
        stateRoot,
      },
      stateRoot,
      stopRequest,
      token,
      litellm,
      runnerScript,
    });
  });
}

async function runnerLifecycleState(fixture) {
  const paths = {
    codexProfile: path.join(fixture.configRoot, "unused-codex-profile.toml"),
    configRoot: fixture.configRoot,
    gatewayConfig: fixture.config,
    gatewayRunner: fixture.runnerScript,
    processReceipt: fixture.receipt,
    processStopRequest: fixture.stopRequest,
    stateRoot: fixture.stateRoot,
  };
  const receipt = await readProcessReceipt(paths, fixture.host);
  const runner = await inspectPath(fixture.runnerScript);
  const config = await inspectPath(fixture.config);
  return {
    manifest: {
      artifacts: [
        { path: fixture.runnerScript, role: "gateway-runner", sha256: runner.sha256 },
        { path: fixture.config, role: "gateway-config", sha256: config.sha256 },
      ],
      executables: { node: { path: receipt.runnerExecutable } },
      process: {
        childPid: receipt.childPid,
        configSha256: receipt.configSha256,
        gatewayArgsDigest: receipt.gatewayArgsDigest,
        gatewayExecutable: receipt.gatewayExecutable,
        processToken: receipt.processToken,
        runnerExecutable: receipt.runnerExecutable,
        runnerPid: receipt.runnerPid,
        runnerScript: receipt.runnerScript,
        startedAt: receipt.startedAt,
        status: "ready",
      },
      runtime: { litellmExecutable: fs.realpathSync.native(fixture.litellm) },
    },
    paths,
    receipt,
  };
}

async function fakePythonExecutable(root) {
  const target = path.join(root, "fake-python");
  const content = `#!/bin/sh
set -eu
if [ "\${1:-}" = "--version" ]; then
  printf '%s\\n' 'Python 3.12.9'
elif [ "\${1:-}" = "-m" ] && [ "\${2:-}" = "venv" ]; then
  [ "\${3:-}" = "--copies" ]
  runtime_root="\${4}"
  mkdir -p "\${runtime_root}/bin"
  cp "\${0}" "\${runtime_root}/bin/python"
  chmod 700 "\${runtime_root}/bin/python"
  printf '%s\\n' '#!/bin/sh' 'if [ "\${1:-}" = "--version" ]; then printf "%s\\n" "LiteLLM ${LITELLM_PIN}"; fi' > "\${runtime_root}/bin/litellm"
  chmod 700 "\${runtime_root}/bin/litellm"
elif [ "\${1:-}" = "-m" ] && [ "\${2:-}" = "pip" ]; then
  case " $* " in
    *" freeze "*) printf '%s\\n' 'litellm==${LITELLM_PIN}' ;;
    *) exit 0 ;;
  esac
else
  printf '%s\\n' 'unsupported fake Python invocation' >&2
  exit 2
fi
`;
  await fs.promises.writeFile(target, content, { mode: 0o700 });
  await fs.promises.chmod(target, 0o700);
  return target;
}

async function writeCompletedRollbackReceipt(paths, host, now, options = {}) {
  const preserveCredentials = [paths.gatewaySecret, paths.providerSecret].sort();
  const rollback = {
    preserveCredentials,
    artifacts: [...ownedArtifactContracts(paths, []).keys()]
      .sort()
      .map((target) => ({ path: target, sha256: digestJson({ target }) })),
    backups: [],
    runtime: { path: paths.venvRoot, treeDigest: digestJson({ runtime: paths.venvRoot }) },
    processState: [paths.processReceipt, paths.processStopRequest].sort(),
    manifest: { path: paths.manifest, sha256: digestJson({ manifest: paths.manifest }) },
    emptyDirectories: [
      ...new Set([
        paths.binDir,
        path.dirname(paths.gatewayConfig),
        paths.runtimeRoot,
        paths.backupsRoot,
      ]),
    ].sort(),
  };
  const preservedCredentialObservations = Object.fromEntries(
    await Promise.all(
      preserveCredentials.map(async (target) => [
        target,
        await inspectPath(target, { hash: false }),
      ]),
    ),
  );
  const receipt = {
    schemaVersion: 1,
    kind: "hetzner-inference-rollback-receipt",
    planId: digestJson({ kind: "test-rollback-plan", paths }),
    observedAt: new Date(now).toISOString(),
    rollbackDigest: digestJson(rollback),
    rollback,
    removed: rollbackRemovalTargets(rollback),
    preservedCredentials: preserveCredentials,
    preservedCredentialObservations,
    credentialContinuity:
      options.credentialContinuity ?? (await credentialPairContinuity(paths, host)),
    components: {
      provider: "rolled_back",
      gateway: "rolled_back",
      codex: "rolled_back",
      "claude-code": "rolled_back",
      cursor: "rolled_back",
    },
  };
  await atomicWriteJson(paths.rollbackReceipt, receipt, { mode: 0o600 });
  await securePathPermissions(paths.rollbackReceipt, host, 0o600);
  return receipt;
}

async function fakeVersionedExecutable(root, name, version) {
  const target = path.join(
    root,
    process.platform === "win32" && !name.endsWith(".cmd") ? `${name}.cmd` : name,
  );
  if (process.platform === "win32") {
    assert.match(version, /^[A-Za-z0-9 .-]+$/);
    await fs.promises.writeFile(target, `@echo off\r\nif "%~1"=="--version" echo ${version}\r\n`);
    return target;
  }
  await fs.promises.writeFile(
    target,
    `#!/bin/sh\nif [ "\${1:-}" = "--version" ]; then printf '%s\\n' ${JSON.stringify(version)}; fi\n`,
    { mode: 0o700 },
  );
  await fs.promises.chmod(target, 0o700);
  return target;
}

function replaceWindowsAclWithReadAndInheritOnlyFullControl(target) {
  assert.equal(process.platform, "win32");
  const powershell = resolveExecutable("powershell", { platform: "win32" });
  assert.ok(powershell, "Windows PowerShell is required for the hosted ACL regression");
  const script = [
    "$ErrorActionPreference='Stop'",
    "$acl=Get-Acl -LiteralPath $args[0]",
    "$sid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User",
    "$acl.SetOwner($sid)",
    "$acl.SetAccessRuleProtection($true,$false)",
    "$existing=@($acl.Access)",
    "foreach($rule in $existing){[void]$acl.RemoveAccessRuleSpecific($rule)}",
    "$read=[System.Security.AccessControl.FileSystemAccessRule]::new($sid,[System.Security.AccessControl.FileSystemRights]::ReadAndExecute,[System.Security.AccessControl.InheritanceFlags]::None,[System.Security.AccessControl.PropagationFlags]::None,[System.Security.AccessControl.AccessControlType]::Allow)",
    "$inheritance=[System.Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [System.Security.AccessControl.InheritanceFlags]::ObjectInherit",
    "$inheritOnly=[System.Security.AccessControl.FileSystemAccessRule]::new($sid,[System.Security.AccessControl.FileSystemRights]::FullControl,$inheritance,[System.Security.AccessControl.PropagationFlags]::InheritOnly,[System.Security.AccessControl.AccessControlType]::Allow)",
    "[void]$acl.AddAccessRule($read)",
    "[void]$acl.AddAccessRule($inheritOnly)",
    "Set-Acl -LiteralPath $args[0] -AclObject $acl",
  ].join(";");
  const command = powershellCommand(script, [target]);
  const result = spawnSync(powershell, command.args, {
    encoding: "utf8",
    env: { ...process.env, ...command.environment },
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr);
}

test("PowerShell passes hostile filenames as data without source interpolation", () => {
  const values = [
    "C:\\",
    "C:\\path with spaces\\file.txt",
    "C:\\O'Brien;$(throw 'injected')\\[literal]`$value.txt",
    "C:\\Unicode-ä-東京\\trailing\\",
    "",
  ];
  const script = "ConvertTo-Json -InputObject @($args) -Compress";
  const command = powershellCommand(script, values);
  assert.deepEqual(command.args.slice(0, 4), [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-EncodedCommand",
  ]);
  assert.equal(command.args.length, 5, "no user values may follow the encoded command");
  assert.deepEqual(JSON.parse(command.environment.HETZNER_POWERSHELL_ARGUMENTS), values);
  const decoded = Buffer.from(command.args[4], "base64").toString("utf16le");
  assert.ok(decoded.includes(script));
  for (const value of values.filter(Boolean)) assert.equal(decoded.includes(value), false);
  assert.deepEqual(powershellCommand(script, ["different"]).args, command.args);
  assert.throws(() => powershellCommand(script, [null]), TypeError);
  if (process.platform === "win32") {
    const executable = resolveExecutable("powershell", { platform: "win32" });
    assert.ok(executable);
    for (const selectedValues of [values, [values[2]], [""], []]) {
      const nativeCommand = powershellCommand(script, selectedValues);
      const result = spawnSync(executable, nativeCommand.args, {
        encoding: "utf8",
        env: { ...process.env, ...nativeCommand.environment },
        timeout: 10_000,
        windowsHide: true,
      });
      assert.ifError(result.error);
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(JSON.parse(result.stdout.replace(/^\uFEFF/u, "")), selectedValues);
    }
  }
});

test("Windows ACL snapshots preserve raw SIDs and explicit or inherited rule flags", (context) => {
  if (process.platform !== "win32") {
    context.skip("In-memory Windows ACL rules require native Windows");
    return;
  }
  const orphanSid = "S-1-5-21-4294967290-4294967291-4294967292-4294967293";
  const script = [
    "$acl=[System.Security.AccessControl.DirectorySecurity]::new()",
    "$acl.SetSecurityDescriptorSddlForm($args[0])",
    windowsAclAccessRulesScript,
    "ConvertTo-Json -InputObject $items -Compress -Depth 4",
  ].join(";");
  const command = powershellCommand(script, [
    `O:SYG:SYD:(A;OICIIO;FA;;;${orphanSid})(A;ID;FR;;;SY)`,
  ]);
  const executable = resolveExecutable("powershell", { platform: "win32" });
  assert.ok(executable);
  const result = spawnSync(executable, command.args, {
    encoding: "utf8",
    env: { ...process.env, ...command.environment },
    timeout: 10_000,
    windowsHide: true,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  const rules = JSON.parse(result.stdout.replace(/^\uFEFF/u, ""));
  assert.deepEqual(rules, [
    {
      sid: orphanSid,
      type: "Allow",
      inherited: false,
      rights: "2032127",
      inheritanceFlags: "3",
      propagationFlags: "2",
    },
    {
      sid: "S-1-5-18",
      type: "Allow",
      inherited: true,
      rights: "1179785",
      inheritanceFlags: "0",
      propagationFlags: "0",
    },
  ]);
});

test("native Windows protects literal hostile filenames with both ACL helpers", async (context) => {
  if (process.platform !== "win32") {
    context.skip("Windows ACL mutation requires the native Windows hosted job");
    return;
  }
  await runnerTemporaryDirectory("hetzner-literal-windows-path", async (root) => {
    const host = actualHost(root);
    const paths = managedPaths(host);
    await protectedDirectory(paths.secretsDir, host);
    await protectedDirectory(path.dirname(paths.codexProfile), host, { external: true });
    const target = path.join(
      paths.secretsDir,
      "O'Brien;$(throw 'injected') [literal]`$value-ä-東京.txt",
    );
    const value = "synthetic-protected-file-value";
    await protectedFile(target, value, host);
    assert.equal(readProtectedSecret(target), value);
    await secureAndVerifyCurrentUserFileAsync(target, 0o600, {
      expectedIdentity: pathIdentity(fs.lstatSync(target, { bigint: true })),
    });
    assert.equal(readProtectedSecret(target), value);
  });
});

test("temporary fixtures canonicalize aliased parents before protected-path proofs", async () => {
  await temporaryDirectory("hetzner-canonical-temp", async (root) => {
    const physicalParent = path.join(root, "physical");
    const aliasParent = path.join(root, "alias");
    await fs.promises.mkdir(physicalParent);
    await fs.promises.symlink(
      physicalParent,
      aliasParent,
      process.platform === "win32" ? "junction" : "dir",
    );
    await assert.rejects(assertNoLinkSegments(aliasParent));
    for (const createDirectory of [temporaryDirectory, runnerTemporaryDirectory]) {
      let fixtureRoot;
      const result = await createDirectory(
        "canonical",
        async (directory) => {
          fixtureRoot = directory;
          assert.equal(directory, await fs.promises.realpath(directory));
          assert.equal(path.dirname(directory), physicalParent);
          await assertNoLinkSegments(directory);
          const host = actualHost(directory);
          const paths = managedPaths(host);
          await protectedDirectory(paths.configRoot, host);
          await assertNoLinkSegments(paths.configRoot);
          return "fixture-complete";
        },
        aliasParent,
      );
      assert.equal(result, "fixture-complete");
      assert.equal(fs.existsSync(fixtureRoot), false);
    }
  });
});

test("manual routing bypasses local storage and remote execution for both targets", async () => {
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = "relative-path-must-not-be-inspected";
  try {
    for (const target of ["local", "remote"]) {
      const calls = [];
      const guidance = { mode: "manual", target, steps: ["Enter credentials yourself."] };
      const result = await runCli(
        ["plan", "--target", target, "--mode", "manual", "--model", "<live-model-id>"],
        {
          loadManual: async () => ({
            manualCommand: async (command, options) => {
              calls.push({ command, options });
              return guidance;
            },
          }),
          loadRemote: () => assert.fail("manual mode must not load the remote execution adapter"),
        },
      );
      assert.deepEqual(result, guidance);
      assert.deepEqual(calls, [{ command: "plan", options: { model: "<live-model-id>", target } }]);
    }
  } finally {
    if (originalCodexHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = originalCodexHome;
  }
});

test("remote routing preserves adapter inputs without inspecting local storage", async () => {
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = "relative-path-must-not-be-inspected";
  try {
    const calls = [];
    const result = await runCli(
      [
        "plan",
        "--target",
        "remote",
        "--mode",
        "autonomous",
        "--management-url",
        "https://gateway.example.test/prefix",
        "--remote-env-confirmed",
      ],
      {
        loadRemote: async () => ({
          remoteCommand: async (command, options) => {
            calls.push({ command, options });
            return { target: "remote", state: "planned" };
          },
        }),
        loadManual: () => assert.fail("autonomous mode must not load manual guidance"),
      },
    );
    assert.deepEqual(result, { target: "remote", state: "planned" });
    assert.deepEqual(calls, [
      {
        command: "plan",
        options: {
          "management-url": "https://gateway.example.test/prefix",
          "remote-env-confirmed": true,
        },
      },
    ]);
  } finally {
    if (originalCodexHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = originalCodexHome;
  }
});

test("target and mode reject invalid selections before loading an adapter", async () => {
  const dependencies = {
    loadManual: () => assert.fail("invalid selection must not load an adapter"),
    loadRemote: () => assert.fail("invalid selection must not load an adapter"),
  };
  for (const args of [
    ["plan", "--target", "cloud"],
    ["plan", "--mode", "auto"],
    ["plan", "--target", "remote", "--mode", "auto"],
  ]) {
    await assert.rejects(
      runCli(args, dependencies),
      (error) => error.code === "invalid_option_value",
    );
  }
  const help = await runCli(["help"]);
  assert.deepEqual(help.defaults, { target: "local", mode: "autonomous" });
  assert.deepEqual(help, await runCli(["help", "--target", "local", "--mode", "autonomous"]));
});

test("top-level CLI preserves remote failure and owner-handoff exit status", async () => {
  await temporaryDirectory("hetzner-remote-exit", async (root) => {
    const cliModule = path.resolve(
      currentDirectory,
      "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/cli.mjs",
    );
    for (const result of [
      {
        ok: false,
        target: "remote",
        command: "check",
        error: { code: "inference_failed", message: "Remote request failed" },
      },
      { ok: false, target: "remote", status: "owner-handoff", reason: "config-managed" },
      { ok: true, target: "remote", command: "check" },
    ]) {
      const harness = path.join(root, "remote-exit.mjs");
      await fs.promises.writeFile(
        harness,
        `import { main } from ${JSON.stringify(pathToFileURL(cliModule).href)};\nawait main([], {runCli: async () => (${JSON.stringify(result)})});\n`,
      );
      const execution = spawnSync(process.execPath, [harness], {
        encoding: "utf8",
        timeout: 5_000,
      });
      assert.ifError(execution.error);
      assert.equal(execution.status, result.ok ? 0 : 1, execution.stderr);
      assert.deepEqual(JSON.parse(execution.stdout), result);
    }
  });
});

test("Codex profile selection requires a recognized version with separate-profile support", () => {
  for (const version of ["codex-cli 0.134.0", "codex-cli 0.154.0", "codex-cli 1.0.0"]) {
    assert.doesNotThrow(() => requireCodexProfileVersion(version));
  }
  for (const version of [
    "codex-cli 0.133.9",
    "codex-cli test",
    "v24.20.0",
    "codex-cli 0.134.0-alpha.1",
    "",
  ]) {
    assert.throws(
      () => requireCodexProfileVersion(version),
      (error) => error.code === "codex_version_unsupported",
    );
  }
});

test("installed Codex parses the generated profile without invoking its credential helper", async (context) => {
  const codex = resolveExecutable("codex");
  if (!codex) {
    context.skip(
      "native Codex CLI is unavailable; profile parser proof requires a separate installed client",
    );
    return;
  }
  const version = await captureVersion(codex);
  requireCodexProfileVersion(version);
  await temporaryDirectory("hetzner-codex-config", async (root) => {
    const codexHome = path.join(root, "codex");
    await fs.promises.mkdir(codexHome, { mode: 0o700 });
    await fs.promises.writeFile(path.join(codexHome, "config.toml"), "# isolated parser fixture\n");
    const helper = path.join(root, "must-not-run.mjs");
    const helperMarker = path.join(root, "helper-was-invoked");
    await fs.promises.writeFile(
      helper,
      `import fs from "node:fs"; fs.writeFileSync(${JSON.stringify(helperMarker)}, "unexpected"); throw new Error("credential helper must not run during parser proof");\n`,
    );
    const profile = path.join(codexHome, "hetzner.config.toml");
    const content = renderCodexProfile({ credentialHelper: helper }, process.execPath);
    await fs.promises.writeFile(profile, content);
    const command = commandInvocation(codex, ["--profile", "hetzner", "mcp", "list", "--json"]);
    const env = {
      PATH: process.env.PATH,
      HOME: root,
      USERPROFILE: root,
      CODEX_HOME: codexHome,
      ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
    };
    const result = spawnSync(command.executable, command.args, {
      encoding: "utf8",
      timeout: 10_000,
      env,
      cwd: root,
      windowsVerbatimArguments: command.windowsVerbatimArguments,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(helperMarker), false);
    await fs.promises.writeFile(profile, content.replace(/^command = .*$/m, "command = 7"));
    const invalid = spawnSync(command.executable, command.args, {
      encoding: "utf8",
      timeout: 10_000,
      env,
      cwd: root,
      windowsVerbatimArguments: command.windowsVerbatimArguments,
    });
    assert.ifError(invalid.error);
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /invalid type|expected a string/i);
    assert.equal(fs.existsSync(helperMarker), false);
  });
});

test("host fixtures resolve native per-user roots", () => {
  assert.equal(hostFixtures.schemaVersion, 1);
  for (const fixture of hostFixtures.cases) {
    const host = detectHost({
      env: fixture.env,
      home: fixture.home,
      mountInfo: fixture.expected.kind === "wsl" ? WSL_WINDOWS_MOUNT_INFO : undefined,
      platform: fixture.platform,
    });
    for (const [key, value] of Object.entries(fixture.expected)) {
      assert.equal(host[key], value, `${fixture.name}: ${key}`);
    }
    if (fixture.platform === "win32") {
      assert.ok(host.configRoot.startsWith(fixture.env.LOCALAPPDATA));
      assert.ok(!host.configRoot.includes("Roaming"));
    }
  }
});

test("actual WSL mount metadata classifies every current DrvFs mount", (context) => {
  if (process.platform !== "linux" || !(process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP)) {
    context.skip("actual WSL mount metadata is available only inside WSL");
    return;
  }
  const host = detectHost();
  if (host.wslWindowsMounts.length === 0) {
    context.skip("this WSL distribution has no current DrvFs mounts");
    return;
  }
  assert.equal(Object.isFrozen(host.wslWindowsMounts), true);
  for (const mountPoint of host.wslWindowsMounts) {
    assert.equal(isWslWindowsMountedPath(mountPoint, host), true, mountPoint);
  }
});

test("WSL accepts kernel nsfs namespace handles but rejects other nonabsolute mount roots", () => {
  for (const parser of [parseWslWindowsMounts, parseCurrentWslWindowsMounts]) {
    const expected = parser(WSL_WINDOWS_MOUNT_INFO);
    for (const name of ["net", "mnt", "pid_for_children", "time_for_children"]) {
      const record = `300 1 0:4 ${name}:[4026531840] /run/namespaces/test rw shared:9 - nsfs nsfs rw\n`;
      assert.deepEqual(parser(WSL_WINDOWS_MOUNT_INFO + record), expected);
    }
    for (const [root, mountPoint, fileSystem] of [
      ["net:[4026531840]", "/run/namespaces/test", "ext4"],
      ["net:[4026531840]", "/run/namespaces/test", "9p"],
      ["net:[4026531840]", "/run/namespaces/test", "drvfs"],
      ["net:[4026531840]", "relative", "nsfs"],
      ["relative", "/run/namespaces/test", "nsfs"],
      ["net:[bad]", "/run/namespaces/test", "nsfs"],
      ["net:[123]extra", "/run/namespaces/test", "nsfs"],
      ["net:[]", "/run/namespaces/test", "nsfs"],
      ["[123]", "/run/namespaces/test", "nsfs"],
    ]) {
      const record = `300 1 0:4 ${root} ${mountPoint} rw shared:9 - ${fileSystem} nsfs rw\n`;
      assert.throws(
        () => parser(WSL_WINDOWS_MOUNT_INFO + record),
        (error) => error.code === "wsl_mount_table_invalid",
      );
    }
  }
});

test("mount metadata failures expose only structural diagnostic values", () => {
  const sensitive = "/private-customer-location";
  const malformed = `100 1 0:80 / ${sensitive} rw - 9p`;
  for (const parser of [parseWslWindowsMounts, parseCurrentWslWindowsMounts]) {
    assert.throws(
      () => parser(`${WSL_WINDOWS_MOUNT_INFO}${malformed}\n`),
      (error) => {
        assert.equal(error.code, "wsl_mount_table_invalid");
        assert.deepEqual(error.details, {
          lineNumber: WSL_WINDOWS_MOUNT_INFO.split("\n").length,
          fieldCount: 8,
          separatorIndex: 6,
          emptyFieldIndexes: [],
          mountIdNumeric: true,
          parentIdNumeric: true,
          deviceNumeric: true,
          rootAbsolute: true,
          mountPointAbsolute: true,
        });
        assert.equal(JSON.stringify(error).includes(sensitive), false);
        return true;
      },
    );
  }
});

test("WSL rejects empty, rootless, malformed, and truncated mount tables before target I/O", () => {
  const invalidTables = [
    "",
    "   \n",
    "not mountinfo\n",
    String.raw`100 1 0:80 / /windir/c rw,relatime - 9p C:\134 rw,aname=drvfs;path=C:\134;uid=1000
`,
    `${WSL_WINDOWS_MOUNT_INFO}200 1 0:200 / /home/alice/.config/stark-ai rw - 9p\n`,
  ];
  for (const mountInfo of invalidTables) {
    for (const parser of [parseWslWindowsMounts, parseCurrentWslWindowsMounts]) {
      assert.throws(
        () => parser(mountInfo),
        (error) => error.code === "wsl_mount_table_invalid",
      );
    }
    let targetIo = 0;
    assert.throws(
      () =>
        detectHost({
          env: { WSL_DISTRO_NAME: "nixos" },
          home: "/home/alice",
          lstatSync() {
            targetIo += 1;
            throw new Error("invalid mount metadata must block before path inspection");
          },
          mountInfo,
          platform: "linux",
        }),
      (error) => error.code === "wsl_mount_table_invalid",
    );
    assert.equal(targetIo, 0);
  }
});

test("WSL host roots and PATH use parsed DrvFs mounts before target I/O", () => {
  const mounts = parseWslWindowsMounts(WSL_WINDOWS_MOUNT_INFO);
  assert.deepEqual(mounts, ["/media/windows", "/windir/c"]);
  assert.equal(isWslWindowsMountedPath("/windir/c/Users/alice/.codex", mounts), true);
  assert.equal(isWslWindowsMountedPath("/media/windows/Users/alice", mounts), true);
  assert.equal(isWslWindowsMountedPath("/mnt/c/Users/alice", mounts), false);
  assert.equal(isWslWindowsMountedPath("/usr/lib/wsl/drivers", mounts), false);
  assert.throws(
    () =>
      detectHost({
        env: { WSL_DISTRO_NAME: "nixos" },
        home: "/home/alice",
        platform: "linux",
        readFileSync: () => {
          const error = new Error("mount table unavailable");
          error.code = "EACCES";
          throw error;
        },
      }),
    (error) => error.code === "wsl_mount_table_unavailable" && error.details.reason === "EACCES",
  );

  let windowsTargetIo = 0;
  const lstatSync = (target) => {
    if (isWslWindowsMountedPath(String(target), mounts)) windowsTargetIo += 1;
    return fs.lstatSync(target);
  };
  for (const [variable, target] of [
    ["CODEX_HOME", "/windir/c/Users/alice/.codex"],
    ["XDG_CONFIG_HOME", "/media/windows/config"],
    ["XDG_STATE_HOME", "/windir/c/state"],
  ]) {
    assert.throws(
      () =>
        detectHost({
          env: { WSL_DISTRO_NAME: "nixos", [variable]: target },
          home: "/home/alice",
          lstatSync,
          mountInfo: WSL_WINDOWS_MOUNT_INFO,
          platform: "linux",
        }),
      (error) => error.code === "wsl_cross_boundary_path" && error.details.label === variable,
    );
  }
  assert.throws(
    () =>
      detectHost({
        env: { WSL_DISTRO_NAME: "nixos" },
        home: "/windir/c/Users/alice",
        lstatSync,
        mountInfo: WSL_WINDOWS_MOUNT_INFO,
        platform: "linux",
      }),
    (error) => error.code === "wsl_cross_boundary_path" && error.details.label === "home",
  );
  for (const [label, mountPoint] of [
    ["configuration namespace", "/home/alice/.config/stark-ai/hetzner-inference/secrets"],
    ["state namespace", "/home/alice/.local/state/stark-ai/hetzner-inference/runtime"],
    ["Codex profile", "/home/alice/.codex/hetzner.config.toml"],
  ]) {
    const nestedMountInfo = withWslDrvFsMount(mountPoint);
    const nestedMounts = parseWslWindowsMounts(nestedMountInfo);
    let nestedTargetIo = 0;
    assert.throws(
      () =>
        detectHost({
          env: { WSL_DISTRO_NAME: "nixos" },
          home: "/home/alice",
          lstatSync: (target) => {
            if (isWslWindowsMountedPath(String(target), nestedMounts)) nestedTargetIo += 1;
            return fs.lstatSync(target);
          },
          mountInfo: nestedMountInfo,
          platform: "linux",
        }),
      (error) =>
        error.code === "wsl_cross_boundary_path" &&
        error.details.label === label &&
        error.details.mountPoint === mountPoint,
    );
    assert.equal(nestedTargetIo, 0, mountPoint);
  }
  const host = detectHost({
    env: { WSL_DISTRO_NAME: "nixos" },
    home: "/home/alice",
    lstatSync,
    mountInfo: WSL_WINDOWS_MOUNT_INFO,
    platform: "linux",
  });
  const unexpectedTargetIo = () => {
    windowsTargetIo += 1;
    throw new Error("Windows target I/O occurred");
  };
  assert.throws(
    () =>
      resolveExecutable("/windir/c/Windows/System32/cmd.exe", {
        existsSync: unexpectedTargetIo,
        host,
        lstatSync,
        platform: "linux",
        realpathSync: unexpectedTargetIo,
      }),
    (error) => error.code === "wsl_cross_boundary_path",
  );
  assert.equal(
    resolveExecutable("cmd.exe", {
      env: { PATH: "/media/windows/System32" },
      host,
      lstatSync,
      platform: "linux",
      realpathSync: unexpectedTargetIo,
      statSync: unexpectedTargetIo,
    }),
    null,
  );
  assert.throws(
    () =>
      resolveExecutable("cmd.exe", {
        env: { PATH: "/media/windows/System32" },
        host,
        lstatSync,
        platform: "linux",
        rejectCrossBoundaryCandidate: true,
        statSync: unexpectedTargetIo,
      }),
    (error) => error.code === "wsl_cross_boundary_path",
  );
  assert.equal(windowsTargetIo, 0);
});

test("WSL symlink aliases for roots, PATH, and explicit executables fail before target I/O", async () => {
  if (process.platform === "win32") return;
  await temporaryDirectory("hetzner-wsl-aliases", async (root) => {
    const mounts = parseWslWindowsMounts(WSL_WINDOWS_MOUNT_INFO);
    const rootAlias = path.join(root, "windows-root");
    await fs.promises.symlink("/windir/c/Users/alice", rootAlias);
    let windowsTargetIo = 0;
    const lstatSync = (target) => {
      if (isWslWindowsMountedPath(String(target), mounts)) windowsTargetIo += 1;
      return fs.lstatSync(target);
    };
    const safeEnvironment = {
      CODEX_HOME: path.join(root, "codex"),
      WSL_DISTRO_NAME: "nixos",
      XDG_CONFIG_HOME: path.join(root, "config"),
      XDG_STATE_HOME: path.join(root, "state"),
    };
    for (const [variable, target] of [
      ["CODEX_HOME", path.join(rootAlias, ".codex")],
      ["XDG_CONFIG_HOME", path.join(rootAlias, ".config")],
      ["XDG_STATE_HOME", path.join(rootAlias, ".state")],
    ]) {
      assert.throws(
        () =>
          detectHost({
            env: { ...safeEnvironment, [variable]: target },
            home: path.join(root, "home"),
            lstatSync,
            mountInfo: WSL_WINDOWS_MOUNT_INFO,
            platform: "linux",
          }),
        (error) => error.code === "wsl_cross_boundary_path" && error.details.label === variable,
      );
    }
    assert.throws(
      () =>
        detectHost({
          env: safeEnvironment,
          home: path.join(rootAlias, "home"),
          lstatSync,
          mountInfo: WSL_WINDOWS_MOUNT_INFO,
          platform: "linux",
        }),
      (error) => error.code === "wsl_cross_boundary_path" && error.details.label === "home",
    );

    const host = detectHost({
      env: safeEnvironment,
      home: path.join(root, "home"),
      lstatSync,
      mountInfo: WSL_WINDOWS_MOUNT_INFO,
      platform: "linux",
    });
    const unexpectedTargetIo = () => {
      windowsTargetIo += 1;
      throw new Error("Windows target I/O occurred");
    };
    for (const name of ["python", "codex", "claude", "cursor"]) {
      const alias = path.join(root, `${name}-alias`);
      await fs.promises.symlink(`/windir/c/Tools/${name}.exe`, alias);
      assert.throws(
        () =>
          resolveExecutable(alias, {
            existsSync: unexpectedTargetIo,
            host,
            lstatSync,
            platform: "linux",
            realpathSync: unexpectedTargetIo,
          }),
        (error) => error.code === "wsl_cross_boundary_path",
      );
    }
    const pathAlias = path.join(root, "windows-bin");
    await fs.promises.symlink("/media/windows/Tools", pathAlias);
    assert.equal(
      resolveExecutable("codex", {
        env: { PATH: pathAlias },
        host,
        lstatSync,
        platform: "linux",
        realpathSync: unexpectedTargetIo,
        statSync: unexpectedTargetIo,
      }),
      null,
    );
    assert.equal(windowsTargetIo, 0);
  });
});

test("WSL owned namespaces reject mounts nested below resolved aliases before target I/O", async (context) => {
  if (process.platform === "win32") {
    context.skip("WSL path behavior is exercised on POSIX runners");
    return;
  }
  await temporaryDirectory("hetzner-wsl-resolved-namespace", async (root) => {
    const resolvedConfigBase = path.join(root, "resolved-config");
    const configAlias = path.join(root, "config-alias");
    await fs.promises.mkdir(resolvedConfigBase);
    await fs.promises.symlink(resolvedConfigBase, configAlias);
    const resolvedConfigRoot = path.join(resolvedConfigBase, "stark-ai", "hetzner-inference");
    const nestedMount = path.join(resolvedConfigRoot, "secrets");
    const mountInfo = withWslDrvFsMount(nestedMount);
    const mounts = parseWslWindowsMounts(mountInfo);
    let mountedTargetIo = 0;

    assert.throws(
      () =>
        detectHost({
          env: {
            CODEX_HOME: path.join(root, "codex"),
            WSL_DISTRO_NAME: "nixos",
            XDG_CONFIG_HOME: configAlias,
            XDG_STATE_HOME: path.join(root, "state"),
          },
          home: path.join(root, "home"),
          lstatSync: (target) => {
            if (isWslWindowsMountedPath(String(target), mounts)) mountedTargetIo += 1;
            return fs.lstatSync(target);
          },
          mountInfo,
          platform: "linux",
        }),
      (error) =>
        error.code === "wsl_cross_boundary_path" &&
        error.details.label === "configuration namespace" &&
        error.details.mountPoint === nestedMount &&
        error.details.resolvedPath === resolvedConfigRoot,
    );
    assert.equal(mountedTargetIo, 0);
  });
});

test("CODEX_HOME cannot overlap managed configuration or state on any host", () => {
  const cases = [
    {
      env: {
        CODEX_HOME: "C:\\Users\\alice\\AppData\\Local\\stark-ai\\hetzner-inference\\bin",
        LOCALAPPDATA: "C:\\Users\\alice\\AppData\\Local",
      },
      home: "C:\\Users\\alice",
      platform: "win32",
    },
    {
      env: {
        CODEX_HOME: "/Users/alice/Library/Application Support/stark-ai/hetzner-inference/bin",
      },
      home: "/Users/alice",
      platform: "darwin",
    },
    {
      env: {
        CODEX_HOME: "/users/alice/library/application support/stark-ai/hetzner-inference/bin",
      },
      home: "/Users/Alice",
      platform: "darwin",
    },
    {
      env: {
        CODEX_HOME: "/Users/A\u030Alice/Library/Application Support/stark-ai/hetzner-inference/bin",
      },
      home: "/Users/\u00c5lice",
      platform: "darwin",
    },
    {
      env: {
        CODEX_HOME: "/Users/\u03c2/Library/Application Support/stark-ai/hetzner-inference/bin",
      },
      home: "/Users/\u03a3",
      platform: "darwin",
    },
    {
      env: {
        CODEX_HOME: "/home/alice/.config/stark-ai/hetzner-inference/bin",
        XDG_CONFIG_HOME: "/home/alice/.config",
        XDG_STATE_HOME: "/home/alice/.local/state",
      },
      home: "/home/alice",
      platform: "linux",
    },
  ];
  for (const fixture of cases) {
    assert.throws(
      () => detectHost(fixture),
      (error) => error.code === "codex_home_overlaps_managed_root",
      fixture.platform,
    );
  }
  assert.throws(
    () =>
      detectHost({
        env: {
          CODEX_HOME: "/home/alice",
          XDG_CONFIG_HOME: "/home/alice/.config",
          XDG_STATE_HOME: "/home/alice/.local/state",
        },
        home: "/home/alice",
        platform: "linux",
      }),
    (error) => error.code === "codex_home_overlaps_managed_root",
  );

  let mountReads = 0;
  assert.throws(
    () =>
      detectHost({
        env: {
          CODEX_HOME: "/home/alice/.local/state/stark-ai/hetzner-inference",
          WSL_DISTRO_NAME: "nixos",
        },
        home: "/home/alice",
        platform: "linux",
        readFileSync() {
          mountReads += 1;
          throw new Error("overlap must fail before mount or target I/O");
        },
      }),
    (error) => error.code === "codex_home_overlaps_managed_root",
  );
  assert.equal(mountReads, 0);
});

test("setup and rollback reject an overlapping CODEX_HOME before workflow I/O", async () => {
  await temporaryDirectory("hetzner-codex-overlap", async (root) => {
    const env = isolatedHostEnvironment(root);
    const managedRoot =
      process.platform === "win32"
        ? path.win32.join(env.LOCALAPPDATA, "stark-ai", "hetzner-inference")
        : process.platform === "darwin"
          ? path.join(env.HOME, "Library", "Application Support", "stark-ai", "hetzner-inference")
          : path.join(env.XDG_CONFIG_HOME, "stark-ai", "hetzner-inference");
    for (const workflow of ["setup", "rollback"]) {
      const aliases = [path.join(managedRoot, "bin")];
      if (process.platform === "darwin") aliases.push(path.join(managedRoot, "bin").toLowerCase());
      for (const codexHome of aliases) {
        const result = runSetupEntrypoint(root, ["plan", "--workflow", workflow], {
          env: { CODEX_HOME: codexHome },
        });
        assert.notEqual(result.status, 0, `${workflow}: ${codexHome}`);
        assert.equal(
          JSON.parse(result.stderr).error.code,
          "codex_home_overlaps_managed_root",
          `${workflow}: ${codexHome}`,
        );
      }
    }
  });
});

test("Windows ACL observations exclude inherit-only ACE rights from the current object", () => {
  const sid = "S-1-5-21-1000";
  const observation = {
    identity: { birthtimeNs: "1", dev: "2", ino: "3" },
    kind: "directory",
    mode: 0,
    protection: {
      access: [
        {
          inheritanceFlags: "0",
          inherited: false,
          propagationFlags: "0",
          rights: "131209",
          sid,
          type: "Allow",
        },
        {
          inheritanceFlags: "3",
          inherited: false,
          propagationFlags: "2",
          rights: "2032127",
          sid,
          type: "Allow",
        },
      ],
      kind: "windows-acl",
      owner: sid,
      protected: true,
    },
  };
  assert.equal(
    validProtectedDirectoryBoundaryObservation(observation, { platform: "win32" }),
    false,
  );
  observation.protection.access[1].propagationFlags = "0";
  assert.equal(
    validProtectedDirectoryBoundaryObservation(observation, { platform: "win32" }),
    true,
  );
});

test("Windows command shims use an explicit, verbatim, metacharacter-escaped shell invocation", () => {
  const invocation = commandInvocation(
    "C:\\Program Files\\Claude\\claude.cmd",
    ["--print", "literal & value"],
    { env: { SystemRoot: "C:\\Windows" }, platform: "win32" },
  );
  assert.equal(invocation.executable, "C:\\Windows\\System32\\cmd.exe");
  assert.equal(invocation.windowsVerbatimArguments, true);
  assert.deepEqual(invocation.args.slice(0, 4), ["/d", "/s", "/v:off", "/c"]);
  assert.match(invocation.args[4], /Claude/);
  assert.match(invocation.args[4], /\^\^\^&/);
  assert.throws(
    () =>
      commandInvocation("C:\\tools\\claude.cmd", ["unsafe\nargument"], {
        env: { SystemRoot: "C:\\Windows" },
        platform: "win32",
      }),
    (error) => error.code === "windows_command_argument_invalid",
  );
});

test("real POSIX venv --copies produces a regular interpreter and only internal links", async (context) => {
  if (process.platform === "win32") {
    context.skip("POSIX venv shape is covered by the Ubuntu and macOS jobs");
    return;
  }
  await temporaryDirectory("hetzner-real-venv", async (root) => {
    const python = resolveExecutable("python3") ?? resolveExecutable("python");
    assert.ok(python, "a supported hosted Python is required");
    const venv = path.join(root, "venv");
    const result = spawnSync(python, ["-m", "venv", "--copies", venv], {
      encoding: "utf8",
      timeout: 60_000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal((await inspectPath(path.join(venv, "bin", "python"))).kind, "file");
    const inventory = await inventoryTree(venv, { allowSymlinks: true });
    for (const entry of inventory.entries.filter((candidate) => candidate.kind === "symlink")) {
      assert.equal(path.isAbsolute(entry.target), false, entry.path);
      const resolved = path.resolve(venv, path.dirname(entry.path), entry.target);
      assert.ok(resolved.startsWith(`${venv}${path.sep}`), entry.path);
    }
  });
});

test("stable error codes map to the documented exit categories", () => {
  const stableMappings = new Map(stableErrorExitCodeEntries());
  assert.equal(stableMappings.size, stableErrorExitCodeEntries().length);
  const libraryRoot = path.resolve(
    currentDirectory,
    "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib",
  );
  const pending = [libraryRoot];
  const emitted = new Set();
  while (pending.length > 0) {
    const directory = pending.pop();
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) pending.push(target);
      else if (entry.isFile() && entry.name.endsWith(".mjs")) {
        for (const code of stableCodesEmittedBy(fs.readFileSync(target, "utf8"))) emitted.add(code);
      }
    }
  }
  assert.deepEqual(
    [...emitted].filter((code) => !stableMappings.has(code)).sort(),
    [],
    "Every emitted stable SetupError code must have an explicit exit category",
  );
  assert.equal(stableMappings.get("invalid_json"), 5);
  assert.equal(stableMappings.get("unowned_target_exists"), 5);
  assert.equal(stableMappings.get("icacls_missing"), 3);
  assert.equal(stableMappings.get("whoami_missing"), 3);
  assert.equal(stableMappings.get("plan_json_invalid"), 2);
  assert.equal(stableMappings.get("evidence_json_invalid"), 2);
  assert.equal(stableMappings.get("client_evidence_json_invalid"), 2);
  assert.ok([...stableMappings.values()].every((value) => [2, 3, 4, 5, 6].includes(value)));
  assert.equal(exitCodeFor({ code: "approval_mismatch" }), 3);
  assert.equal(exitCodeFor({ code: "invalid_gateway_secret" }), 3);
  assert.equal(exitCodeFor({ code: "environment_proxy_enabled" }), 3);
  assert.equal(exitCodeFor({ code: "external_parent_required" }), 3);
  assert.equal(exitCodeFor({ code: "external_parent_protection_invalid" }), 3);
  assert.equal(exitCodeFor({ code: "codex_home_overlaps_managed_root" }), 3);
  assert.equal(exitCodeFor({ code: "windows_external_parent_not_local" }), 3);
  assert.equal(exitCodeFor({ code: "wsl_cross_boundary_path" }), 3);
  assert.equal(exitCodeFor({ code: "wsl_mount_table_unavailable" }), 3);
  assert.equal(exitCodeFor({ code: "wsl_path_classification_failed" }), 3);
  assert.equal(exitCodeFor({ code: "port_occupied" }), 3);
  assert.equal(exitCodeFor({ code: "unowned_credential_exists" }), 3);
  assert.equal(exitCodeFor({ code: "plan_expired" }), 4);
  assert.equal(exitCodeFor({ code: "concurrent_secret_change" }), 5);
  assert.equal(exitCodeFor({ code: "atomic_target_changed" }), 5);
  assert.equal(exitCodeFor({ code: "backup_source_changed" }), 5);
  assert.equal(exitCodeFor({ code: "rollback_receipt_drift" }), 5);
  assert.equal(exitCodeFor({ code: "process_receipt_missing" }), 5);
  assert.equal(exitCodeFor({ code: "runtime_identity_mismatch" }), 5);
  assert.equal(exitCodeFor({ code: "executable_content_changed" }), 5);
  assert.equal(exitCodeFor({ code: "runner_executable_identity_mismatch" }), 5);
  assert.equal(exitCodeFor({ code: "runner_root_boundary_changed" }), 5);
  assert.equal(exitCodeFor({ code: "process_compensation_identity_mismatch" }), 5);
  assert.equal(exitCodeFor({ code: "process_compensation_identity_missing" }), 5);
  assert.equal(exitCodeFor({ code: "process_compensation_failed" }), 5);
  assert.equal(exitCodeFor({ code: "process_cleanup_requires_manual_recovery" }), 5);
  assert.equal(exitCodeFor({ code: "subprocess_termination_unconfirmed" }), 5);
  assert.equal(exitCodeFor({ code: "command_timeout" }), 3);
  for (const code of [
    "owned_directory_changed",
    "process_cleanup_identity_mismatch",
    "process_cleanup_state_unsafe",
    "process_cleanup_unsafe",
    "process_state_not_owned",
    "runtime_cleanup_unsafe",
    "secret_cleanup_requires_manual_recovery",
    "secret_cleanup_target_changed",
    "static_cleanup_backup_changed",
    "static_cleanup_backup_missing",
    "static_cleanup_target_changed",
  ]) {
    assert.equal(exitCodeFor({ code }), 5, code);
  }
  assert.equal(exitCodeFor({ code: "runner_identity_mismatch" }), 5);
  assert.equal(exitCodeFor({ code: "rollback_receipt_invalid" }), 5);
  assert.equal(exitCodeFor({ code: "rollback_artifact_protection_invalid" }), 5);
  assert.equal(exitCodeFor({ code: "rollback_backup_protection_invalid" }), 5);
  assert.equal(exitCodeFor({ code: "gateway_runner_spawn_failed" }), 3);
  assert.equal(exitCodeFor({ code: "process_compensation_timeout" }), 3);
  assert.equal(exitCodeFor({ code: "owned_process_unhealthy" }), 5);
  assert.equal(exitCodeFor({ code: "recovery_claim_changed" }), 5);
  assert.equal(exitCodeFor({ code: "recovery_directory_changed" }), 5);
  assert.equal(exitCodeFor({ code: "network_timeout" }), 6);
  assert.equal(exitCodeFor({ code: "unexpected_argument" }), 2);
  for (const code of [
    "client_evidence_process_changed",
    "client_evidence_stale",
    "discovery_evidence_stale",
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
  ]) {
    assert.equal(exitCodeFor({ code }), 4, code);
  }
});

test("CLI reports only the sanitized quarantine recovery path", async () => {
  await temporaryDirectory("hetzner-cli-recovery", async (root) => {
    const cliModule = path.resolve(
      currentDirectory,
      "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/cli.mjs",
    );
    const errorsModule = path.resolve(
      currentDirectory,
      "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/errors.mjs",
    );
    const harness = path.join(root, "recovery-boundary.mjs");
    const recoveryPath = path.join(root, ".owned.123.fixture.quarantine");
    const hiddenDetail = "never-emit-this-internal-detail";
    await fs.promises.writeFile(
      harness,
      [
        `import { main } from ${JSON.stringify(pathToFileURL(cliModule).href)};`,
        `import { SetupError } from ${JSON.stringify(pathToFileURL(errorsModule).href)};`,
        `await main([], { runCli: async () => { throw new SetupError("atomic_target_changed", "publication conflict", { quarantinePath: ${JSON.stringify(recoveryPath)}, hidden: ${JSON.stringify(hiddenDetail)} }); } });`,
        "",
      ].join("\n"),
    );
    const result = spawnSync(process.execPath, [harness], { encoding: "utf8", timeout: 5_000 });
    assert.equal(result.status, 5, result.stderr);
    assert.equal(result.stdout, "");
    const errorDocument = JSON.parse(result.stderr);
    assert.deepEqual(errorDocument.error.recovery, {
      kind: "quarantined-path",
      path: recoveryPath,
    });
    assert.doesNotMatch(result.stderr, new RegExp(hiddenDetail));
  });
});

test("CLI normalizes raw post-claim publication and removal failures", async () => {
  await temporaryDirectory("hetzner-cli-raw-recovery", async (root) => {
    const cliModule = path.resolve(
      currentDirectory,
      "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/cli.mjs",
    );
    const filesModule = path.resolve(
      currentDirectory,
      "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/files.mjs",
    );
    for (const fixture of [
      { causeCode: "EPERM", operation: "publication", expectedCode: "atomic_target_changed" },
      { causeCode: "EACCES", operation: "removal", expectedCode: "owned_path_changed" },
    ]) {
      const harness = path.join(root, `${fixture.operation}-raw-recovery.mjs`);
      const target = path.join(root, `${fixture.operation}-target`);
      const injectedMessage = `raw-${fixture.causeCode}-must-not-escape`;
      await fs.promises.writeFile(
        harness,
        [
          `import { main } from ${JSON.stringify(pathToFileURL(cliModule).href)};`,
          `import { atomicWrite, inspectPath, removeFileIfOwned } from ${JSON.stringify(pathToFileURL(filesModule).href)};`,
          `const target = ${JSON.stringify(target)};`,
          'await atomicWrite(target, "owned\\n");',
          "await main([], { runCli: async () => {",
          fixture.operation === "publication"
            ? `  await atomicWrite(target, "replacement\\n", { afterClaim() { const error = new Error(${JSON.stringify(injectedMessage)}); error.code = ${JSON.stringify(fixture.causeCode)}; throw error; }, beforeRemoveTemporary: async () => { const error = new Error("cleanup-must-not-mask"); error.code = "EACCES"; throw error; } });`
            : `  const state = await inspectPath(target); await removeFileIfOwned(target, state.sha256, { beforeRemove() { const error = new Error(${JSON.stringify(injectedMessage)}); error.code = ${JSON.stringify(fixture.causeCode)}; throw error; } });`,
          "} });",
          "",
        ].join("\n"),
      );
      const result = spawnSync(process.execPath, [harness], { encoding: "utf8", timeout: 5_000 });
      assert.equal(result.status, 5, result.stderr);
      const document = JSON.parse(result.stderr);
      assert.equal(document.error.code, fixture.expectedCode);
      assert.equal(document.error.recovery.kind, "quarantined-path");
      assert.ok(document.error.recovery.path.endsWith(".quarantine"));
      assert.equal((await inspectPath(document.error.recovery.path, { hash: false })).kind, "file");
      assert.doesNotMatch(result.stderr, new RegExp(injectedMessage));
      assert.doesNotMatch(result.stderr, /cleanup-must-not-mask/u);
    }
  });
});

test("CLI recovery remains reachable after a claimed parent is replaced", async () => {
  await temporaryDirectory("hetzner-cli-parent-recovery", async (root) => {
    const cliModule = path.resolve(
      currentDirectory,
      "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/cli.mjs",
    );
    const filesModule = path.resolve(
      currentDirectory,
      "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/files.mjs",
    );
    const harness = path.join(root, "parent-recovery.mjs");
    const targetParent = path.join(root, "target-parent");
    const displacedParent = path.join(root, "target-parent-displaced");
    const recoveryDirectory = path.join(root, "recovery");
    const target = path.join(targetParent, "owned.txt");
    await fs.promises.writeFile(
      harness,
      [
        `import fs from "node:fs";`,
        `import { main } from ${JSON.stringify(pathToFileURL(cliModule).href)};`,
        `import { atomicWrite, inspectPath, removeFileIfOwned } from ${JSON.stringify(pathToFileURL(filesModule).href)};`,
        `const targetParent = ${JSON.stringify(targetParent)};`,
        `const displacedParent = ${JSON.stringify(displacedParent)};`,
        `const recoveryDirectory = ${JSON.stringify(recoveryDirectory)};`,
        `const target = ${JSON.stringify(target)};`,
        `await fs.promises.mkdir(targetParent);`,
        `await fs.promises.mkdir(recoveryDirectory);`,
        `await atomicWrite(target, "claimed bytes\\n");`,
        `const state = await inspectPath(target);`,
        `await main([], { runCli: async () => {`,
        `  await removeFileIfOwned(target, state.sha256, {`,
        `    recoveryDirectory,`,
        `    afterClaim: async () => {`,
        `      await fs.promises.rename(targetParent, displacedParent);`,
        `      await fs.promises.mkdir(targetParent);`,
        `    },`,
        `  });`,
        `} });`,
        "",
      ].join("\n"),
    );
    const result = spawnSync(process.execPath, [harness], { encoding: "utf8", timeout: 5_000 });
    assert.equal(result.status, 5, result.stderr);
    const document = JSON.parse(result.stderr);
    assert.equal(document.error.recovery.kind, "quarantined-path");
    assert.equal(path.dirname(document.error.recovery.path), recoveryDirectory);
    assert.equal(
      await fs.promises.readFile(document.error.recovery.path, "utf8"),
      "claimed bytes\n",
    );
  });
});

test("bounded command timeouts await close, escalate, and fail closed when unconfirmed", async () => {
  function commandChild(onKill) {
    const child = new EventEmitter();
    Object.assign(child, {
      exitCode: null,
      pid: 42_201,
      signalCode: null,
      stderr: new EventEmitter(),
      stdout: new EventEmitter(),
      killSignals: [],
      kill(signal) {
        child.killSignals.push(signal);
        onKill(child, signal);
        return true;
      },
    });
    return child;
  }
  function closeWithSignal(child, signal) {
    child.signalCode = signal;
    child.emit("close", null, signal);
  }

  let delayedClosed = false;
  const delayed = commandChild((child, signal) => {
    if (signal !== "SIGTERM") return;
    setTimeout(() => {
      delayedClosed = true;
      closeWithSignal(child, signal);
    }, 40);
  });
  const startedAt = Date.now();
  await assert.rejects(
    runCommand(
      process.execPath,
      ["--version"],
      { forceKillGraceMs: 100, terminationGraceMs: 100, timeoutMs: 5 },
      { spawn: () => delayed },
    ),
    (error) => error.code === "command_timeout" && delayedClosed,
  );
  assert.ok(Date.now() - startedAt >= 30);
  assert.deepEqual(delayed.killSignals, ["SIGTERM"]);

  const escalated = commandChild((child, signal) => {
    if (signal === "SIGKILL") setTimeout(() => closeWithSignal(child, signal), 10);
  });
  await assert.rejects(
    runCommand(
      process.execPath,
      ["--version"],
      { forceKillGraceMs: 100, terminationGraceMs: 15, timeoutMs: 5 },
      { spawn: () => escalated },
    ),
    (error) => error.code === "command_timeout",
  );
  assert.deepEqual(escalated.killSignals, ["SIGTERM", "SIGKILL"]);

  const unconfirmed = commandChild(() => {});
  await assert.rejects(
    runCommand(
      process.execPath,
      ["--version"],
      { forceKillGraceMs: 5, terminationGraceMs: 5, timeoutMs: 5 },
      { spawn: () => unconfirmed },
    ),
    (error) =>
      error.code === "subprocess_termination_unconfirmed" && error.details.cleanupSafe === false,
  );
  assert.deepEqual(unconfirmed.killSignals, ["SIGTERM", "SIGKILL"]);

  const deadlineBound = commandChild((child, signal) => {
    if (signal === "SIGKILL") queueMicrotask(() => closeWithSignal(child, signal));
  });
  const deadlineStartedAt = Date.now();
  const deadlineAt = deadlineStartedAt + 500;
  await assert.rejects(
    runCommand(
      process.execPath,
      ["--version"],
      {
        deadlineAt,
        deadlineReserveMs: 100,
        forceKillGraceMs: 50,
        terminationGraceMs: 50,
        timeoutMs: 1_000,
      },
      { spawn: () => deadlineBound },
    ),
    (error) => error.code === "command_timeout",
  );
  assert.ok(Date.now() - deadlineStartedAt < 500);
  assert.deepEqual(deadlineBound.killSignals, ["SIGTERM", "SIGKILL"]);
});

test("installed Windows ACL commands retain the child through bounded kill confirmation", async () => {
  const command = {
    args: ["-NoProfile"],
    executable: "powershell.exe",
    options: { encoding: "utf8", maxBuffer: 65_536, timeout: 5, windowsHide: true },
  };
  const aclChild = (closeAfterKill) => {
    const child = new EventEmitter();
    Object.assign(child, {
      exitCode: null,
      killSignals: [],
      signalCode: null,
      kill(signal) {
        child.killSignals.push(signal);
        if (closeAfterKill && signal === "SIGKILL") {
          child.signalCode = signal;
          queueMicrotask(() => child.emit("close", null, signal));
        }
        return true;
      },
      unref() {},
    });
    return child;
  };

  const success = aclChild(false);
  let completeSuccess;
  let successSettled = false;
  const successOperation = executeFileAsync(
    { ...command, options: { ...command.options, timeout: 100 } },
    "injected ACL command",
    {
      execFile(_executable, _args, _options, callback) {
        completeSuccess = callback;
        return success;
      },
    },
  ).then((stdout) => {
    successSettled = true;
    return stdout;
  });
  success.exitCode = 0;
  completeSuccess(null, "bounded ACL output");
  success.emit("exit", 0, null);
  await Promise.resolve();
  assert.equal(successSettled, false, "exit alone must not settle the ACL child");
  success.emit("close", 0, null);
  assert.equal(await successOperation, "bounded ACL output");
  assert.deepEqual(success.killSignals, []);

  const confirmed = aclChild(true);
  await assert.rejects(
    executeFileAsync(command, "injected ACL command", { execFile: () => confirmed }),
    /lifecycle deadline exceeded/u,
  );
  assert.deepEqual(confirmed.killSignals, ["SIGTERM", "SIGKILL"]);

  const unconfirmed = aclChild(false);
  await assert.rejects(
    executeFileAsync(command, "injected ACL command", { execFile: () => unconfirmed }),
    (error) =>
      error.code === "protected_acl_termination_unconfirmed" && error.details.cleanupSafe === false,
  );
  assert.deepEqual(unconfirmed.killSignals, ["SIGTERM", "SIGKILL"]);
});

test("credential-bearing CLI checks reject Node environment-proxy mode before secret reads", async () => {
  assert.throws(
    () => assertProxyIndependentTransport({ env: {}, execArgv: ["--use-env-proxy"] }),
    (error) => error.code === "environment_proxy_enabled",
  );
  assert.throws(
    () =>
      assertProxyIndependentTransport({
        env: { NODE_OPTIONS: "--use-env-proxy" },
        execArgv: [],
      }),
    (error) => error.code === "environment_proxy_enabled",
  );
  for (const quoted of ['"--use-env-proxy"', "'--use-env-proxy'"]) {
    assert.throws(
      () => assertProxyIndependentTransport({ env: { NODE_OPTIONS: quoted }, execArgv: [] }),
      (error) => error.code === "environment_proxy_enabled",
      quoted,
    );
  }
  await temporaryDirectory("hetzner-proxy-guard", async (root) => {
    const checkScript = path.resolve(
      currentDirectory,
      "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/check-hetzner-inference.mjs",
    );
    const result = spawnSync(
      process.execPath,
      ["--use-env-proxy", checkScript, "--components", "gateway", "--approve-network", "gateway"],
      {
        encoding: "utf8",
        env: {
          CODEX_HOME: path.join(root, "codex"),
          HOME: path.join(root, "home"),
          HTTP_PROXY: "http://127.0.0.1:9",
          LOCALAPPDATA: path.join(root, "LocalAppData"),
          PATH: process.env.PATH,
          SystemRoot: process.env.SystemRoot,
          USERPROFILE: path.join(root, "home"),
          WINDIR: process.env.WINDIR,
          WSL_DISTRO_NAME: "",
          WSL_INTEROP: "",
          XDG_CONFIG_HOME: path.join(root, "config"),
          XDG_STATE_HOME: path.join(root, "state"),
        },
        windowsHide: true,
      },
    );
    assert.equal(result.status, 3, result.stderr);
    assert.equal(JSON.parse(result.stderr).error.code, "environment_proxy_enabled");
    for (const quoted of ['"--use-env-proxy"', "'--use-env-proxy'"]) {
      const quotedResult = spawnSync(
        process.execPath,
        [checkScript, "--components", "gateway", "--approve-network", "gateway"],
        {
          encoding: "utf8",
          env: {
            CODEX_HOME: path.join(root, "codex"),
            HOME: path.join(root, "home"),
            HTTP_PROXY: "http://127.0.0.1:9",
            LOCALAPPDATA: path.join(root, "LocalAppData"),
            NODE_OPTIONS: quoted,
            PATH: process.env.PATH,
            SystemRoot: process.env.SystemRoot,
            USERPROFILE: path.join(root, "home"),
            WINDIR: process.env.WINDIR,
            WSL_DISTRO_NAME: "",
            WSL_INTEROP: "",
            XDG_CONFIG_HOME: path.join(root, "config"),
            XDG_STATE_HOME: path.join(root, "state"),
          },
          windowsHide: true,
        },
      );
      assert.equal(quotedResult.status, 3, quotedResult.stderr);
      assert.equal(JSON.parse(quotedResult.stderr).error.code, "environment_proxy_enabled");
    }
  });
});

test("CLI preserves failed probe JSON and exits with the external-failure code", async () => {
  await temporaryDirectory("hetzner-probe-exit", async (root) => {
    const cliModule = path.resolve(
      currentDirectory,
      "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/cli.mjs",
    );
    const harness = path.join(root, "probe-exit.mjs");
    await fs.promises.writeFile(
      harness,
      [
        `import { main } from ${JSON.stringify(pathToFileURL(cliModule).href)};`,
        'globalThis.fetch = async () => { throw new Error("injected network failure"); };',
        "await main([",
        '  "check", "--components", "provider", "--approve-network", "provider",',
        '  "--provider-credential-source", "stdin", "--provider-probes", "models",',
        "]);",
        "",
      ].join("\n"),
    );
    const credential = "provider-cli-exit-fixture";
    const result = spawnSync(process.execPath, [harness], {
      encoding: "utf8",
      env: process.env,
      input: credential,
      timeout: 10_000,
    });
    assert.equal(result.status, 6, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.provider.state, "blocked");
    assert.equal(report.provider.results[0].error.code, "network_request_failed");
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp(credential));
  });
});

test("failed streaming probes release response bodies and request timers", () => {
  const probesUrl = pathToFileURL(
    path.resolve(
      currentDirectory,
      "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/probes.mjs",
    ),
  ).href;
  for (const [name, responseExpression] of [
    ["non-ok", 'new Response("bounded failure", { status: 500 })'],
    ["bodyless", "new Response(null, { status: 200 })"],
  ]) {
    const source = `
      import { runProviderCheck } from ${JSON.stringify(probesUrl)};
      const report = await runProviderCheck({
        credential: "provider-stream-cleanup-secret",
        fetchImpl: async () => ${responseExpression},
        model: "example-model",
        probes: ["stream"],
      });
      process.stdout.write(JSON.stringify(report));
    `;
    const startedAt = Date.now();
    const result = spawnSync(process.execPath, ["--input-type=module", "--eval", source], {
      encoding: "utf8",
      timeout: 3_000,
    });
    assert.notEqual(result.error?.code, "ETIMEDOUT", name);
    assert.equal(result.status, 0, `${name}: ${result.stderr}`);
    assert.ok(Date.now() - startedAt < 2_500, `${name} retained a request timer`);
    assert.equal(JSON.parse(result.stdout).provider.results[0].status, "failed");
  }
});

test("Cursor-only check returns blocked guidance without an installation", async () => {
  await temporaryDirectory("hetzner-cursor-absent", async (root) => {
    const result = runSetupEntrypoint(root, ["check", "--components", "cursor"]);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.deepEqual(report.selectedComponents, ["cursor"]);
    assert.equal(report.installationBinding, null);
    assert.equal(report.components.cursor.state, "blocked");
  });
});

test("delayed provider work revalidates lifecycle before gateway secrets or client proof", async () => {
  const baseline = {
    manifest: { process: { processToken: "a".repeat(64) } },
    binding: {
      manifestDigest: "a".repeat(64),
      processBindingDigest: "b".repeat(64),
      processReceiptDigest: "c".repeat(64),
    },
  };
  let current = baseline;
  let releaseProvider;
  let providerStarted;
  const providerStartedPromise = new Promise((resolve) => {
    providerStarted = resolve;
  });
  const providerReleasePromise = new Promise((resolve) => {
    releaseProvider = resolve;
  });
  let gatewaySecretReads = 0;
  let gatewayTransmissions = 0;
  let clientPromotions = 0;
  const checking = checkCommand(
    { platform: process.platform },
    {
      gatewaySecret: path.resolve("gateway-secret-fixture"),
      providerSecret: path.resolve("provider-secret-fixture"),
    },
    {
      "approve-network": "provider,gateway",
      "codex-evidence": path.resolve("codex-evidence-fixture.json"),
      components: "provider,gateway,codex",
      "gateway-probes": "responses-text",
      "provider-probes": "models",
    },
    {
      assertProxyIndependentTransport() {},
      async readGatewaySecret() {
        gatewaySecretReads += 1;
        return gatewayCredential("r");
      },
      async readSecret() {
        return "provider-revalidation-fixture";
      },
      async requireCurrentGatewayProof() {
        return structuredClone(current);
      },
      async runGatewayCheck() {
        gatewayTransmissions += 1;
        return { gateway: { state: "transport_verified" } };
      },
      async runProviderCheck() {
        providerStarted();
        await providerReleasePromise;
        return { provider: { state: "transport_verified" } };
      },
      async validateClientEvidence() {
        clientPromotions += 1;
        return { component: "codex", state: "client_e2e_verified" };
      },
      async verifyProtectedPermissions() {},
    },
  );
  await providerStartedPromise;
  current = {
    manifest: { process: { processToken: "d".repeat(64) } },
    binding: {
      ...baseline.binding,
      manifestDigest: "e".repeat(64),
      processBindingDigest: "f".repeat(64),
      processReceiptDigest: "0".repeat(64),
    },
  };
  releaseProvider();
  await assert.rejects(
    checking,
    (error) =>
      error.code === "process_binding_changed_during_check" &&
      error.details.phase === "before-gateway-proof",
  );
  assert.equal(gatewaySecretReads, 0);
  assert.equal(gatewayTransmissions, 0);
  assert.equal(clientPromotions, 0);
});

test("gateway lifecycle drift during secret read blocks every credential transmission", async () => {
  const baseline = {
    manifest: { process: { processToken: "a".repeat(64) } },
    binding: {
      manifestDigest: "a".repeat(64),
      processBindingDigest: "b".repeat(64),
      processReceiptDigest: "c".repeat(64),
    },
  };
  let current = baseline;
  let gatewaySecretReads = 0;
  let gatewayTransmissions = 0;
  await assert.rejects(
    checkCommand(
      { platform: process.platform },
      { gatewaySecret: path.resolve("gateway-secret-fixture") },
      {
        "approve-network": "gateway",
        components: "gateway",
        "gateway-probes": "models,responses-text",
      },
      {
        assertProxyIndependentTransport() {},
        async readGatewaySecret() {
          gatewaySecretReads += 1;
          current = {
            manifest: { process: { processToken: "d".repeat(64) } },
            binding: {
              ...baseline.binding,
              processBindingDigest: "e".repeat(64),
              processReceiptDigest: "f".repeat(64),
            },
          };
          return gatewayCredential("s");
        },
        async requireCurrentGatewayProof() {
          return structuredClone(current);
        },
        async runGatewayCheck() {
          gatewayTransmissions += 1;
          return { gateway: { state: "transport_verified" } };
        },
        async verifyProtectedPermissions() {},
      },
    ),
    (error) =>
      error.code === "process_binding_changed_during_check" &&
      error.details.phase === "before-gateway-credential-use",
  );
  assert.equal(gatewaySecretReads, 1);
  assert.equal(gatewayTransmissions, 0);
});

test("gateway tool loops revalidate lifecycle before each authenticated request", async () => {
  for (const probe of ["responses-tool-loop", "messages-tool-loop"]) {
    const baseline = {
      manifest: { process: { processToken: "a".repeat(64) } },
      binding: {
        manifestDigest: "a".repeat(64),
        processBindingDigest: "b".repeat(64),
        processReceiptDigest: "c".repeat(64),
      },
    };
    let current = baseline;
    let authenticatedRequests = 0;
    await assert.rejects(
      checkCommand(
        { platform: process.platform },
        { gatewaySecret: path.resolve("gateway-secret-fixture") },
        {
          "approve-network": "gateway",
          components: "gateway",
          "gateway-probes": probe,
        },
        {
          assertProxyIndependentTransport() {},
          async readGatewaySecret() {
            return gatewayCredential("u");
          },
          async requireCurrentGatewayProof() {
            return structuredClone(current);
          },
          async runGatewayCheck(options) {
            return await runGatewayCheck({
              ...options,
              fetchImpl: async (url) => {
                authenticatedRequests += 1;
                assert.equal(
                  authenticatedRequests,
                  1,
                  `${probe} sent a second request after drift`,
                );
                current = {
                  manifest: { process: { processToken: "d".repeat(64) } },
                  binding: {
                    ...baseline.binding,
                    processBindingDigest: "e".repeat(64),
                    processReceiptDigest: "f".repeat(64),
                  },
                };
                if (url.endsWith("/v1/responses")) {
                  return new Response(
                    JSON.stringify({
                      id: "response-1",
                      output: [
                        {
                          type: "function_call",
                          name: "report_probe",
                          call_id: "call-1",
                          arguments: JSON.stringify({ value: "ok" }),
                        },
                      ],
                    }),
                    { status: 200 },
                  );
                }
                return new Response(
                  JSON.stringify({
                    type: "message",
                    content: [
                      {
                        type: "tool_use",
                        id: "tool-1",
                        name: "report_probe",
                        input: { value: "ok" },
                      },
                    ],
                  }),
                  { status: 200 },
                );
              },
            });
          },
          async verifyProtectedPermissions() {},
        },
      ),
      (error) =>
        error.code === "process_binding_changed_during_check" &&
        error.details.phase === "before-gateway-request",
      probe,
    );
    assert.equal(authenticatedRequests, 1, probe);
  }
});

test("client evidence is not promoted when its gateway lifecycle changes during validation", async () => {
  const baseline = {
    manifest: { process: { processToken: "a".repeat(64) } },
    binding: {
      manifestDigest: "a".repeat(64),
      processBindingDigest: "b".repeat(64),
      processReceiptDigest: "c".repeat(64),
    },
  };
  let current = baseline;
  let validations = 0;
  await assert.rejects(
    checkCommand(
      { platform: process.platform },
      {},
      {
        "codex-evidence": path.resolve("codex-evidence-fixture.json"),
        components: "codex",
      },
      {
        async requireCurrentGatewayProof() {
          return structuredClone(current);
        },
        async validateClientEvidence() {
          validations += 1;
          current = {
            manifest: { process: { processToken: "d".repeat(64) } },
            binding: {
              ...baseline.binding,
              processBindingDigest: "e".repeat(64),
              processReceiptDigest: "f".repeat(64),
            },
          };
          return { component: "codex", state: "client_e2e_verified" };
        },
      },
    ),
    (error) =>
      error.code === "process_binding_changed_during_check" &&
      error.details.phase === "after-codex-proof",
  );
  assert.equal(validations, 1);
});

test("heartbeat-only receipt refresh remains valid and publishes the final receipt snapshot", async () => {
  const baseline = {
    manifest: { process: { processToken: "a".repeat(64) } },
    binding: {
      manifestDigest: "a".repeat(64),
      processBindingDigest: "b".repeat(64),
      processReceiptDigest: "c".repeat(64),
    },
  };
  const receiptSnapshots = ["c", "d", "e", "f"].map((character) => character.repeat(64));
  let proofReads = 0;
  const report = await checkCommand(
    { platform: process.platform },
    {},
    {
      "codex-evidence": path.resolve("codex-heartbeat-evidence-fixture.json"),
      components: "codex",
    },
    {
      async requireCurrentGatewayProof() {
        const processReceiptDigest = receiptSnapshots[Math.min(proofReads, 3)];
        proofReads += 1;
        return {
          manifest: structuredClone(baseline.manifest),
          binding: { ...baseline.binding, processReceiptDigest },
        };
      },
      async validateClientEvidence() {
        return { component: "codex", state: "client_e2e_verified" };
      },
    },
  );
  assert.equal(proofReads, 4);
  assert.equal(report.components.codex.state, "client_e2e_verified");
  assert.equal(report.installationBinding.processReceiptDigest, receiptSnapshots[3]);
});

test("lifecycle mocks exercise complete spawn identity and token-bound stop", async (context) => {
  await temporaryDirectory("hetzner-lifecycle", async (root) => {
    const host = actualHost(root);
    const paths = managedPaths(host);
    for (const directory of [paths.configRoot, paths.stateRoot, paths.secretsDir, paths.binDir]) {
      await protectedDirectory(directory, host);
    }
    const runner = await protectedFile(paths.gatewayRunner, "owned runner\n", host, 0o700);
    const config = await protectedFile(paths.gatewayConfig, "model_list: []\n", host);
    await protectedFile(paths.providerSecret, "provider-lifecycle-secret", host);
    await protectedFile(paths.gatewaySecret, gatewayCredential("l"), host);
    const litellmExecutable = path.join(paths.venvRoot, "bin", "litellm");
    await protectedFile(litellmExecutable, "owned litellm\n", host, 0o700);
    const runtime = await inventoryTree(paths.venvRoot, { allowSymlinks: true });
    const nodeExecutable = fs.realpathSync.native(process.execPath);
    const nodeObservation = await inspectPath(nodeExecutable);
    const nodeIdentity = {
      path: nodeExecutable,
      version: process.version,
      sha256: nodeObservation.sha256,
    };
    const now = Date.now();
    let processToken = null;
    let readyReceipt = null;
    let runnerEnvironment = null;
    const manifest = {
      artifacts: [
        { path: paths.gatewayRunner, role: "gateway-runner", sha256: runner.sha256 },
        { path: paths.gatewayConfig, role: "gateway-config", sha256: config.sha256 },
      ],
      executables: { node: nodeIdentity },
      runtime: {
        litellmExecutable: fs.realpathSync.native(litellmExecutable),
        treeDigest: runtime.digest,
      },
      process: { status: "not-started" },
    };
    const plan = {
      executables: { node: nodeIdentity },
      litellm: { executable: fs.realpathSync.native(litellmExecutable) },
    };
    const mockChild = new EventEmitter();
    Object.assign(mockChild, {
      exitCode: null,
      signalCode: null,
      pid: 42_001,
      unref() {},
    });
    const started = await startOwnedGateway(
      { host, manifest, paths, plan, now },
      {
        delay: async () => {},
        loopbackPortOpen: async () => false,
        readProcessReceipt: async () => readyReceipt,
        spawn(_executable, args, options) {
          runnerEnvironment = options.env;
          processToken = args[args.indexOf("--token") + 1];
          const gatewayArgs = [
            "--config",
            paths.gatewayConfig,
            "--host",
            "127.0.0.1",
            "--port",
            "4000",
          ];
          readyReceipt = {
            schemaVersion: 1,
            processToken,
            runnerPid: mockChild.pid,
            childPid: 42_002,
            runnerExecutable: nodeExecutable,
            runnerScript: fs.realpathSync.native(paths.gatewayRunner),
            gatewayExecutable: fs.realpathSync.native(litellmExecutable),
            gatewayArgsDigest: crypto
              .createHash("sha256")
              .update(JSON.stringify(gatewayArgs))
              .digest("hex"),
            configPath: fs.realpathSync.native(paths.gatewayConfig),
            configSha256: config.sha256,
            host: "127.0.0.1",
            port: 4000,
            startedAt: new Date(now).toISOString(),
            heartbeatAt: new Date().toISOString(),
            status: "ready",
          };
          return mockChild;
        },
      },
    );
    assert.equal(started.changed, true);
    assert.equal(started.receipt.processToken, processToken);
    assert.equal(
      runnerEnvironment.WSL_DISTRO_NAME,
      host.kind === "wsl" ? host.wslDistribution : undefined,
    );
    assert.equal(runnerEnvironment.HETZNER_INFERENCE_API_KEY, undefined);
    assert.equal(runnerEnvironment.LITELLM_MASTER_KEY, undefined);
    const runningManifest = {
      ...manifest,
      process: {
        status: "ready",
        processToken,
        runnerExecutable: readyReceipt.runnerExecutable,
        runnerScript: readyReceipt.runnerScript,
        runnerPid: readyReceipt.runnerPid,
        childPid: readyReceipt.childPid,
        gatewayExecutable: readyReceipt.gatewayExecutable,
        gatewayArgsDigest: readyReceipt.gatewayArgsDigest,
        configSha256: readyReceipt.configSha256,
        startedAt: readyReceipt.startedAt,
      },
    };

    // Receipt I/O can observe a heartbeat newer than entry into the lifecycle operation.
    let lifecycleClock = now - 1;
    const lifecycleClockMock = context.mock.method(Date, "now", () => lifecycleClock);
    const refreshedReceipt = { ...readyReceipt, heartbeatAt: new Date(now).toISOString() };
    const delayedReceipt = async () => {
      lifecycleClock = now;
      return refreshedReceipt;
    };
    const stopBoundary = new Error("reached authorized stop publication");
    try {
      const currentStart = await startOwnedGateway(
        { host, manifest: runningManifest, paths, plan },
        { readProcessReceipt: delayedReceipt, loopbackPortOpen: async () => true },
      );
      assert.equal(currentStart.changed, false);
      for (const operation of [stopOwnedGateway, compensateStartedGateway]) {
        lifecycleClock = now - 1;
        await assert.rejects(
          operation(
            { host, manifest: runningManifest, paths, receipt: refreshedReceipt },
            {
              readProcessReceipt: delayedReceipt,
              writeStopRequest: async () => {
                throw stopBoundary;
              },
            },
          ),
          (error) => error === stopBoundary,
        );
        await assert.rejects(
          operation(
            { host, manifest: runningManifest, paths, receipt: refreshedReceipt, now: now - 1 },
            { readProcessReceipt: delayedReceipt },
          ),
          (error) => error.code === "process_identity_stale",
        );
      }
    } finally {
      lifecycleClockMock.mock.restore();
    }

    const staleReceipt = {
      ...readyReceipt,
      heartbeatAt: new Date(now - 20_000).toISOString(),
    };
    await assert.rejects(
      startOwnedGateway(
        { host, manifest: runningManifest, paths, plan, now },
        {
          loopbackPortOpen: async () => false,
          readProcessReceipt: async () => staleReceipt,
          spawn() {
            throw new Error("stale identity must block before spawn");
          },
        },
      ),
      (error) => error.code === "process_identity_stale",
    );
    await assert.rejects(
      startOwnedGateway(
        { host, manifest: runningManifest, paths, plan, now },
        {
          loopbackPortOpen: async () => false,
          readProcessReceipt: async () => ({
            ...staleReceipt,
            configSha256: "0".repeat(64),
          }),
          spawn() {
            throw new Error("mismatched identity must block before spawn");
          },
        },
      ),
      (error) => error.code === "process_identity_mismatch",
    );
    await assert.rejects(
      stopOwnedGateway(
        { host, manifest: runningManifest, paths, now: Date.now() },
        { readProcessReceipt: async () => null },
      ),
      (error) => error.code === "process_receipt_missing",
    );
    const neverStarted = await stopOwnedGateway(
      { host, manifest, paths, now: Date.now() },
      { readProcessReceipt: async () => null },
    );
    assert.equal(neverStarted.changed, false);
    for (const [field, changedValue] of [
      ["childPid", readyReceipt.childPid + 1],
      ["runnerPid", readyReceipt.runnerPid + 1],
      ["configSha256", "0".repeat(64)],
    ]) {
      let driftReads = 0;
      await assert.rejects(
        stopOwnedGateway(
          { host, manifest: runningManifest, paths, now: Date.now() },
          {
            delay: async () => {},
            readProcessReceipt: async () => {
              driftReads += 1;
              if (driftReads === 1) return readyReceipt;
              const request = await readJson(paths.processStopRequest);
              await fs.promises.unlink(paths.processStopRequest);
              return { ...stoppedReceipt(readyReceipt, request), [field]: changedValue };
            },
          },
        ),
        (error) => error.code === "process_identity_changed",
        field,
      );
      assert.equal((await inspectPath(paths.processStopRequest, { hash: false })).kind, "absent");
    }
    let reads = 0;
    let callerDeadline = null;
    let publishedStopRequest = null;
    const stopped = await stopOwnedGateway(
      { host, manifest: runningManifest, paths, now: Date.now() },
      {
        delay: async () => {},
        readProcessReceipt: async () => {
          reads += 1;
          if (reads === 1) return readyReceipt;
          publishedStopRequest = await readJson(paths.processStopRequest);
          await fs.promises.unlink(paths.processStopRequest);
          return stoppedReceipt(readyReceipt, publishedStopRequest);
        },
        writeStopRequest: async (...args) => {
          callerDeadline = args[4].deadlineAt;
          await writeStopRequest(...args);
        },
      },
    );
    assert.equal(stopped.changed, true);
    assert.equal(Date.parse(publishedStopRequest.deadlineAt), callerDeadline);
    assert.ok(
      Date.parse(publishedStopRequest.deadlineAt) > Date.parse(publishedStopRequest.requestedAt),
    );
    assert.ok(
      Date.parse(publishedStopRequest.deadlineAt) - Date.parse(publishedStopRequest.requestedAt) <=
        PROCESS_STOP_TIMEOUT_MS,
    );
    assert.equal((await inspectPath(paths.processStopRequest, { hash: false })).kind, "absent");

    let transientStopReads = 0;
    const transientStop = await stopOwnedGateway(
      { host, manifest: runningManifest, paths, now: Date.now() },
      {
        delay: async () => {},
        readProcessReceipt: async () => {
          transientStopReads += 1;
          if (transientStopReads === 1) return readyReceipt;
          if (transientStopReads === 2) return null;
          if (transientStopReads === 3) {
            const missing = new Error("receipt name is transiently absent");
            missing.code = "ENOENT";
            throw missing;
          }
          if (transientStopReads === 4) {
            throw new SetupError(
              "process_receipt_invalid",
              "receipt disappeared between inspection and protected read",
            );
          }
          const request = await readJson(paths.processStopRequest);
          await fs.promises.unlink(paths.processStopRequest);
          return stoppedReceipt(readyReceipt, request);
        },
      },
    );
    assert.equal(transientStop.terminalStatus, "stopped");
    assert.equal(transientStopReads, 5);

    await protectedFile(paths.processReceipt, "malformed managed receipt\n", host);
    let malformedStopReads = 0;
    try {
      await assert.rejects(
        stopOwnedGateway(
          { host, manifest: runningManifest, paths, now: Date.now() },
          {
            delay: async () => {},
            readProcessReceipt: async () => {
              malformedStopReads += 1;
              if (malformedStopReads === 1) return readyReceipt;
              throw new SetupError("process_receipt_invalid", "present receipt is malformed");
            },
          },
        ),
        (error) => error.code === "process_receipt_invalid",
      );
    } finally {
      await fs.promises.unlink(paths.processReceipt);
      if ((await inspectPath(paths.processStopRequest, { hash: false })).kind === "file") {
        await fs.promises.unlink(paths.processStopRequest);
      }
    }

    let failedReads = 0;
    const failedStop = await stopOwnedGateway(
      { host, manifest: runningManifest, paths, now: Date.now() },
      {
        delay: async () => {},
        readProcessReceipt: async () => {
          failedReads += 1;
          if (failedReads === 1) return readyReceipt;
          const request = await readJson(paths.processStopRequest);
          await fs.promises.unlink(paths.processStopRequest);
          return failedReceipt(readyReceipt, "child failed during requested stop", request);
        },
      },
    );
    assert.equal(failedStop.changed, true);
    assert.equal(failedStop.terminalStatus, "failed");
    assert.equal(failedStop.receipt.error, "child failed during requested stop");

    let delayedStopReads = 0;
    await assert.rejects(
      stopOwnedGateway(
        { host, manifest: runningManifest, paths, now: Date.now() },
        {
          delay: async () => {},
          readProcessReceipt: async (_paths, _host, options = {}) => {
            delayedStopReads += 1;
            if (delayedStopReads === 1) return readyReceipt;
            assert.ok(Number.isFinite(options.deadlineAt));
            await new Promise((resolve) => setTimeout(resolve, 40));
            return stoppedReceipt(readyReceipt);
          },
          stopTimeoutMs: 30,
          writeStopRequest: async () => {},
        },
      ),
      (error) => error.code === "gateway_stop_timeout",
    );

    const compensationToken = "c".repeat(64);
    const compensationReceipt = {
      ...readyReceipt,
      processToken: compensationToken,
      heartbeatAt: new Date().toISOString(),
      status: "ready",
    };
    let compensationReads = 0;
    const compensated = await compensateStartedGateway(
      {
        host,
        manifest,
        paths,
        receipt: compensationReceipt,
        now: Date.now(),
      },
      {
        delay: async () => {},
        readProcessReceipt: async () => {
          compensationReads += 1;
          if (compensationReads === 1) return compensationReceipt;
          const request = await readJson(paths.processStopRequest);
          await fs.promises.unlink(paths.processStopRequest);
          return stoppedReceipt(compensationReceipt, request);
        },
      },
    );
    assert.equal(compensated.receipt.processToken, compensationToken);
    assert.equal((await inspectPath(paths.processStopRequest, { hash: false })).kind, "absent");
    let delayedCompensationReads = 0;
    await assert.rejects(
      compensateStartedGateway(
        { host, manifest, paths, receipt: compensationReceipt, now: Date.now() },
        {
          delay: async () => {},
          readProcessReceipt: async (_paths, _host, options = {}) => {
            delayedCompensationReads += 1;
            if (delayedCompensationReads === 1) return compensationReceipt;
            assert.ok(Number.isFinite(options.deadlineAt));
            await new Promise((resolve) => setTimeout(resolve, 40));
            return stoppedReceipt(compensationReceipt);
          },
          stopTimeoutMs: 30,
          writeStopRequest: async () => {},
        },
      ),
      (error) => error.code === "gateway_stop_timeout",
    );
    await assert.rejects(
      compensateStartedGateway(
        { host, manifest, paths, receipt: compensationReceipt, now: Date.now() },
        {
          readProcessReceipt: async () => ({
            ...compensationReceipt,
            processToken: "d".repeat(64),
          }),
        },
      ),
      (error) => error.code === "process_compensation_identity_mismatch",
    );

    const joinedRequestedAt = Date.now();
    const joinedRequest = stopRequestFor(
      compensationToken,
      joinedRequestedAt,
      joinedRequestedAt + PROCESS_STOP_TIMEOUT_MS,
    );
    const joinedStopping = stoppingReceipt(compensationReceipt, joinedRequest);
    const joinedClaimPath = path.join(
      path.dirname(paths.processStopRequest),
      joinedStopping.stopRequest.claim,
    );
    await protectedFile(joinedClaimPath, stableJson(joinedRequest), host);
    let joinedReads = 0;
    const joinedCompensation = await compensateStartedGateway(
      { host, manifest, paths, receipt: compensationReceipt, now: Date.now() },
      {
        delay: async () => {},
        readProcessReceipt: async () => {
          joinedReads += 1;
          if (joinedReads === 1) return joinedStopping;
          await fs.promises.unlink(joinedClaimPath);
          return stoppedReceipt(compensationReceipt, joinedRequest);
        },
        writeStopRequest: async () => {
          throw new Error("an existing stopping receipt must not publish a fresh request");
        },
      },
    );
    assert.equal(joinedCompensation.receipt.status, "stopped");

    const repeatedRequestedAt = Date.now();
    const repeatedRequest = stopRequestFor(
      processToken,
      repeatedRequestedAt,
      repeatedRequestedAt + PROCESS_STOP_TIMEOUT_MS,
    );
    const repeatedStopping = stoppingReceipt(readyReceipt, repeatedRequest);
    const repeatedClaimPath = path.join(
      path.dirname(paths.processStopRequest),
      repeatedStopping.stopRequest.claim,
    );
    await protectedFile(repeatedClaimPath, stableJson(repeatedRequest), host);
    let repeatedStopReads = 0;
    const repeatedStop = await stopOwnedGateway(
      { host, manifest: runningManifest, paths, now: Date.now() },
      {
        delay: async () => {},
        readProcessReceipt: async () => {
          repeatedStopReads += 1;
          if (repeatedStopReads === 1) return repeatedStopping;
          await fs.promises.unlink(repeatedClaimPath);
          return stoppedReceipt(readyReceipt, repeatedRequest);
        },
        writeStopRequest: async () => {
          throw new Error("a repeated stop must join rather than publish a fresh request");
        },
      },
    );
    assert.equal(repeatedStop.terminalStatus, "stopped");
    assert.equal(repeatedStopReads, 2);

    const repeatedExpiredRequestedAt = Date.now() - PROCESS_STOP_TIMEOUT_MS - 1_000;
    const repeatedExpiredRequest = stopRequestFor(
      processToken,
      repeatedExpiredRequestedAt,
      repeatedExpiredRequestedAt + PROCESS_STOP_TIMEOUT_MS,
    );
    const repeatedExpiredStopping = stoppingReceipt(readyReceipt, repeatedExpiredRequest);
    const repeatedExpiredClaimPath = path.join(
      path.dirname(paths.processStopRequest),
      repeatedExpiredStopping.stopRequest.claim,
    );
    await protectedFile(repeatedExpiredClaimPath, stableJson(repeatedExpiredRequest), host);
    try {
      await assert.rejects(
        stopOwnedGateway(
          { host, manifest: runningManifest, paths, now: Date.now() },
          { readProcessReceipt: async () => repeatedExpiredStopping },
        ),
        (error) => error.code === "gateway_stop_timeout",
      );
    } finally {
      await fs.promises.unlink(repeatedExpiredClaimPath);
    }

    const repeatedMismatchedRequest = {
      ...repeatedRequest,
      processToken: "d".repeat(64),
    };
    const repeatedMismatchedStopping = {
      ...repeatedStopping,
      stopRequest: {
        ...repeatedStopping.stopRequest,
        sha256: crypto
          .createHash("sha256")
          .update(stableJson(repeatedMismatchedRequest))
          .digest("hex"),
      },
    };
    await protectedFile(repeatedClaimPath, stableJson(repeatedMismatchedRequest), host);
    try {
      await assert.rejects(
        stopOwnedGateway(
          { host, manifest: runningManifest, paths, now: Date.now() },
          { readProcessReceipt: async () => repeatedMismatchedStopping },
        ),
        (error) => error.code === "process_stop_request_changed",
      );
    } finally {
      await fs.promises.unlink(repeatedClaimPath);
    }

    const expiredRequestedAt = Date.now() - PROCESS_STOP_TIMEOUT_MS - 1_000;
    const expiredRequest = stopRequestFor(
      compensationToken,
      expiredRequestedAt,
      expiredRequestedAt + PROCESS_STOP_TIMEOUT_MS,
    );
    const expiredStopping = stoppingReceipt(compensationReceipt, expiredRequest);
    const expiredClaimPath = path.join(
      path.dirname(paths.processStopRequest),
      expiredStopping.stopRequest.claim,
    );
    await protectedFile(expiredClaimPath, stableJson(expiredRequest), host);
    try {
      await assert.rejects(
        compensateStartedGateway(
          { host, manifest, paths, receipt: compensationReceipt, now: Date.now() },
          { readProcessReceipt: async () => expiredStopping },
        ),
        (error) => error.code === "gateway_stop_timeout",
      );
    } finally {
      await fs.promises.unlink(expiredClaimPath);
    }

    const mismatchedRequest = { ...joinedRequest, processToken: "d".repeat(64) };
    const mismatchedStopping = {
      ...joinedStopping,
      stopRequest: {
        ...joinedStopping.stopRequest,
        sha256: crypto.createHash("sha256").update(stableJson(mismatchedRequest)).digest("hex"),
      },
    };
    await protectedFile(joinedClaimPath, stableJson(mismatchedRequest), host);
    try {
      await assert.rejects(
        compensateStartedGateway(
          { host, manifest, paths, receipt: compensationReceipt, now: Date.now() },
          { readProcessReceipt: async () => mismatchedStopping },
        ),
        (error) => error.code === "process_stop_request_changed",
      );
    } finally {
      await fs.promises.unlink(joinedClaimPath);
    }

    const runnerErrorWithoutExit = new EventEmitter();
    Object.assign(runnerErrorWithoutExit, {
      exitCode: null,
      signalCode: null,
      pid: 42_101,
      unref() {},
    });
    await assert.rejects(
      startOwnedGateway(
        { host, manifest, paths, plan, now: Date.now() },
        {
          delay: async () => {},
          loopbackPortOpen: async () => false,
          readProcessReceipt: async () => null,
          spawn() {
            queueMicrotask(() =>
              runnerErrorWithoutExit.emit("error", new Error("runner error without exit")),
            );
            return runnerErrorWithoutExit;
          },
          stopTimeoutMs: 5,
        },
      ),
      (error) =>
        error.code === "process_cleanup_requires_manual_recovery" &&
        error.details.ownedRunnerTerminal === false,
    );

    const stopWriteFailureChild = fakeOwnedChild(42_102);
    stopWriteFailureChild.unref = () => {};
    await assert.rejects(
      startOwnedGateway(
        { host, manifest, paths, plan, now: Date.now() },
        {
          delay: async () => {},
          loopbackPortOpen: async () => false,
          readProcessReceipt: async () => null,
          spawn() {
            queueMicrotask(() =>
              stopWriteFailureChild.emit("error", new Error("runner error before receipt")),
            );
            return stopWriteFailureChild;
          },
          stopTimeoutMs: 100,
          writeStopRequest: async () => {
            throw new SetupError(
              "injected_stop_request_failure",
              "injected stop-request write failure",
            );
          },
        },
      ),
      (error) =>
        error.code === "process_cleanup_requires_manual_recovery" &&
        error.details.ownedRunnerTerminal === true &&
        error.details.ownedTerminalReceiptConfirmed === false &&
        error.details.cleanupSafe === false &&
        error.details.cleanupCode === "injected_stop_request_failure",
    );
    assert.deepEqual(stopWriteFailureChild.killSignals, ["SIGTERM"]);

    const transientCleanupChild = new EventEmitter();
    Object.assign(transientCleanupChild, {
      exitCode: null,
      signalCode: null,
      pid: 42_104,
      unref() {},
    });
    let transientCleanupReceipt = null;
    let transientCleanupRequest = null;
    let transientCleanupReads = 0;
    let transientCleanupPublication = null;
    let cleanupClaimStartedResolve;
    const cleanupClaimStarted = new Promise((resolve) => {
      cleanupClaimStartedResolve = resolve;
    });
    let releaseCleanupPublication;
    const cleanupPublicationGate = new Promise((resolve) => {
      releaseCleanupPublication = resolve;
    });
    let cleanupPublicationClaimed = false;
    try {
      await assert.rejects(
        startOwnedGateway(
          { host, manifest, paths, plan, now: Date.now() },
          {
            delay: async () => {
              if (cleanupPublicationClaimed) releaseCleanupPublication();
            },
            loopbackPortOpen: async () => false,
            readProcessReceipt: async (...args) => {
              transientCleanupReads += 1;
              if (transientCleanupReads === 1) return null;
              if (transientCleanupReads === 2) {
                throw new SetupError("injected_start_failure", "injected startup failure");
              }
              if (transientCleanupReads === 3) return transientCleanupReceipt;
              return await readProcessReceipt(...args);
            },
            spawn(_executable, args) {
              const token = args[args.indexOf("--token") + 1];
              transientCleanupReceipt = {
                ...readyReceipt,
                heartbeatAt: new Date().toISOString(),
                processToken: token,
                runnerPid: transientCleanupChild.pid,
                startedAt: new Date().toISOString(),
              };
              fs.writeFileSync(paths.processReceipt, stableJson(transientCleanupReceipt), {
                mode: 0o600,
              });
              return transientCleanupChild;
            },
            writeStopRequest: async (_paths, _host, token, requestedAt, options) => {
              transientCleanupRequest = stopRequestFor(token, requestedAt, options.deadlineAt);
              transientCleanupPublication = runnerAtomicJson(
                paths.processReceipt,
                stoppedReceipt(transientCleanupReceipt, transientCleanupRequest),
                {
                  afterClaim: async () => {
                    cleanupPublicationClaimed = true;
                    transientCleanupChild.exitCode = 0;
                    queueMicrotask(() => transientCleanupChild.emit("exit", 0, null));
                    cleanupClaimStartedResolve();
                    await cleanupPublicationGate;
                  },
                },
              );
              await cleanupClaimStarted;
            },
          },
        ),
        (error) =>
          error.code === "injected_start_failure" &&
          error.details.ownedRunnerTerminal === true &&
          error.details.ownedTerminalReceiptConfirmed === true,
      );
      await transientCleanupPublication;
      assert.equal(cleanupPublicationClaimed, true);
      assert.ok(transientCleanupReads >= 5);
    } finally {
      releaseCleanupPublication();
      await transientCleanupPublication?.catch(() => {});
      if ((await inspectPath(paths.processReceipt, { hash: false })).kind === "file") {
        await fs.promises.unlink(paths.processReceipt);
      }
    }

    const delayedCleanupChild = fakeOwnedChild(42_103);
    delayedCleanupChild.unref = () => {};
    let delayedCleanupReads = 0;
    await assert.rejects(
      startOwnedGateway(
        { host, manifest, paths, plan, now: Date.now() },
        {
          delay: async () => {},
          loopbackPortOpen: async () => false,
          readProcessReceipt: async (_paths, _host, options = {}) => {
            delayedCleanupReads += 1;
            if (delayedCleanupReads === 1 || delayedCleanupReads === 3) return null;
            if (delayedCleanupReads === 2) {
              throw new SetupError("injected_start_failure", "injected startup failure");
            }
            assert.ok(Number.isFinite(options.deadlineAt));
            await new Promise((resolve) => setTimeout(resolve, 40));
            return failedReceipt(readyReceipt, "late startup cleanup receipt");
          },
          spawn: () => delayedCleanupChild,
          stopTimeoutMs: 30,
          writeStopRequest: async () => {
            delayedCleanupChild.exitCode = 1;
            queueMicrotask(() => delayedCleanupChild.emit("exit", 1, null));
          },
        },
      ),
      (error) =>
        error.code === "process_cleanup_requires_manual_recovery" &&
        error.details.cleanupCode === "gateway_stop_timeout" &&
        error.details.ownedRunnerTerminal === true &&
        error.details.ownedTerminalReceiptConfirmed === false,
    );

    if (process.platform === "win32") {
      const grandchildPidFile = path.join(root, "windows-grandchild.pid");
      const parentHarness = path.join(root, "windows-runner-parent.mjs");
      await fs.promises.writeFile(
        parentHarness,
        [
          'import fs from "node:fs";',
          'import { spawn } from "node:child_process";',
          'const child = spawn(process.execPath, ["--input-type=module", "--eval", "setInterval(() => {}, 1000)"], { stdio: "ignore", windowsHide: true });',
          "fs.writeFileSync(process.argv[2], String(child.pid));",
          "setInterval(() => {}, 1000);",
          "",
        ].join("\n"),
      );
      let receiptReads = 0;
      let grandchildPid = null;
      try {
        await assert.rejects(
          startOwnedGateway(
            { host, manifest, paths, plan, now: Date.now() },
            {
              delay: async () => {},
              loopbackPortOpen: async () => false,
              readProcessReceipt: async () => {
                receiptReads += 1;
                if (receiptReads === 1) return null;
                await waitUntil(() => fs.existsSync(grandchildPidFile), 5_000);
                throw new SetupError(
                  "injected_windows_runner_failure",
                  "injected failure after the real process tree started",
                );
              },
              spawn: () =>
                spawn(process.execPath, [parentHarness, grandchildPidFile], {
                  stdio: "ignore",
                  windowsHide: true,
                }),
              stopTimeoutMs: 5_000,
              writeStopRequest: async () => {
                throw new SetupError(
                  "injected_stop_request_failure",
                  "injected stop-request write failure",
                );
              },
            },
          ),
          (error) =>
            error.code === "process_cleanup_requires_manual_recovery" &&
            error.details.ownedRunnerTerminal === true &&
            error.details.ownedTerminalReceiptConfirmed === false &&
            error.details.cleanupSafe === false,
        );
        grandchildPid = Number(await fs.promises.readFile(grandchildPidFile, "utf8"));
        assert.doesNotThrow(() => process.kill(grandchildPid, 0));
      } finally {
        if (Number.isInteger(grandchildPid)) {
          try {
            process.kill(grandchildPid, "SIGTERM");
          } catch {
            // It already exited.
          }
          await waitUntil(() => {
            try {
              process.kill(grandchildPid, 0);
              return false;
            } catch {
              return true;
            }
          }, 5_000);
        }
      }
    }

    const replaceableNode = path.join(
      root,
      process.platform === "win32" ? "node-copy.exe" : "node-copy",
    );
    await fs.promises.copyFile(process.execPath, replaceableNode);
    if (process.platform !== "win32") await fs.promises.chmod(replaceableNode, 0o700);
    const replaceableNodeObservation = await inspectPath(replaceableNode);
    const replaceableNodeIdentity = {
      path: fs.realpathSync.native(replaceableNode),
      version: process.version,
      sha256: replaceableNodeObservation.sha256,
    };
    const replaceableManifest = {
      ...manifest,
      executables: { node: replaceableNodeIdentity },
    };
    const replaceablePlan = {
      ...plan,
      executables: { node: replaceableNodeIdentity },
    };
    await atomicWrite(replaceableNode, "replaced node executable\n", { mode: 0o700 });
    await assert.rejects(
      startOwnedGateway(
        { host, manifest: replaceableManifest, paths, plan: replaceablePlan, now },
        {
          loopbackPortOpen: async () => false,
          readProcessReceipt: async () => null,
          spawn() {
            throw new Error("stale Node identity must block before spawn");
          },
        },
      ),
      (error) => error.code === "runner_executable_identity_mismatch",
    );

    await atomicWrite(litellmExecutable, "concurrently replaced runtime\n", { mode: 0o700 });
    await assert.rejects(
      startOwnedGateway(
        { host, manifest, paths, plan, now },
        {
          readProcessReceipt() {
            throw new Error("runtime drift must block before receipt handling");
          },
        },
      ),
      (error) => error.code === "runtime_identity_mismatch",
    );
  });
});

test("WSL gateway spawn refreshes mount topology after the final mutation boundary", async (context) => {
  if (process.platform === "win32") {
    context.skip("WSL path behavior is exercised on POSIX runners");
    return;
  }
  await temporaryDirectory("hetzner-wsl-spawn-topology", async (root) => {
    let mountInfo = WSL_WINDOWS_MOUNT_INFO;
    const host = detectHost({
      env: {
        CODEX_HOME: path.join(root, "codex"),
        WSL_DISTRO_NAME: "nixos",
        XDG_CONFIG_HOME: path.join(root, "config"),
        XDG_STATE_HOME: path.join(root, "state"),
      },
      home: path.join(root, "home"),
      mountInfoProvider: () => mountInfo,
      platform: "linux",
    });
    const paths = managedPaths(host);
    for (const directory of [paths.configRoot, paths.stateRoot, paths.secretsDir, paths.binDir]) {
      await protectedDirectory(directory, host);
    }
    const runner = await protectedFile(paths.gatewayRunner, "owned runner\n", host, 0o700);
    const config = await protectedFile(paths.gatewayConfig, "model_list: []\n", host);
    await protectedFile(paths.providerSecret, "provider-wsl-spawn-secret", host);
    await protectedFile(paths.gatewaySecret, gatewayCredential("s"), host);
    const litellmExecutable = path.join(paths.venvRoot, "bin", "litellm");
    await protectedFile(litellmExecutable, "owned litellm\n", host, 0o700);
    const runtime = await inventoryTree(paths.venvRoot, { allowSymlinks: true });
    const nodeExecutable = path.join(root, "tools", "node");
    await fs.promises.mkdir(path.dirname(nodeExecutable));
    await fs.promises.copyFile(process.execPath, nodeExecutable);
    await fs.promises.chmod(nodeExecutable, 0o700);
    const nodeObservation = await inspectPath(nodeExecutable);
    const nodeIdentity = {
      path: fs.realpathSync.native(nodeExecutable),
      version: process.version,
      sha256: nodeObservation.sha256,
    };
    const manifest = {
      artifacts: [
        { path: paths.gatewayRunner, role: "gateway-runner", sha256: runner.sha256 },
        { path: paths.gatewayConfig, role: "gateway-config", sha256: config.sha256 },
      ],
      executables: { node: nodeIdentity },
      process: { status: "not-started" },
      runtime: {
        litellmExecutable: fs.realpathSync.native(litellmExecutable),
        treeDigest: runtime.digest,
      },
    };
    const plan = {
      executables: { node: nodeIdentity },
      litellm: { executable: fs.realpathSync.native(litellmExecutable) },
    };
    const driftedMountInfo = withWslDrvFsMount(nodeExecutable);
    const driftedMounts = parseWslWindowsMounts(driftedMountInfo);
    let executableTargetIo = 0;
    let spawnCalls = 0;
    const originalLstatSync = fs.lstatSync;
    fs.lstatSync = (target, ...args) => {
      if (
        mountInfo === driftedMountInfo &&
        isWslWindowsMountedPath(String(target), driftedMounts)
      ) {
        executableTargetIo += 1;
      }
      return originalLstatSync.call(fs, target, ...args);
    };
    try {
      await assert.rejects(
        startOwnedGateway(
          {
            assertMutationOwned: async () => {
              mountInfo = driftedMountInfo;
            },
            host,
            manifest,
            now: Date.now(),
            paths,
            plan,
          },
          {
            loopbackPortOpen: async () => false,
            readProcessReceipt: async () => null,
            spawn() {
              spawnCalls += 1;
              throw new Error("spawn must not observe the newly mounted executable");
            },
          },
        ),
        (error) =>
          error.code === "wsl_cross_boundary_path" && error.details.label === "node executable",
      );
    } finally {
      mountInfo = WSL_WINDOWS_MOUNT_INFO;
      fs.lstatSync = originalLstatSync;
    }
    assert.equal(spawnCalls, 0);
    assert.equal(executableTargetIo, 0);
  });
});

test("gateway runner starts, writes protected receipts, stops, and fails closed on receipt faults", async () => {
  const fastDelay = async (milliseconds) => {
    await new Promise((resolve) => setTimeout(resolve, Math.min(milliseconds, 5)));
  };
  const dependenciesFor = (child, fixture, atomicJson = runnerAtomicJson) => ({
    ...fixture.rootBoundaryDependencies,
    atomicJson,
    authenticatedGatewayReady: async () => true,
    delay: fastDelay,
    heartbeatIntervalMs: 10,
    portOpen: async () => false,
    spawn: () => child,
    startupAttempts: 3,
    startupDelayMs: 1,
    stopAttempts: 3,
    stopDelayMs: 1,
    stopWatcherIntervalMs: 5,
  });

  const exerciseReceiptClaimGap = async (name, startLifecycle) => {
    await withRunnerFixture(name, async (fixture) => {
      const child = fakeOwnedChild();
      let claimGapStartedResolve;
      const claimGapStarted = new Promise((resolve) => {
        claimGapStartedResolve = resolve;
      });
      let releaseClaimGap;
      const claimGap = new Promise((resolve) => {
        releaseClaimGap = resolve;
      });
      let gapInjected = false;
      let transientAbsenceReads = 0;
      const running = runGatewayRunner(fixture.args, {
        ...dependenciesFor(child, fixture),
        atomicJson: async (target, value, options) =>
          await runnerAtomicJson(target, value, {
            ...options,
            afterClaim: async (details) => {
              await options.afterClaim?.(details);
              if (!gapInjected && target === fixture.receipt && value.status === "stopping") {
                gapInjected = true;
                claimGapStartedResolve();
                await claimGap;
              }
            },
          }),
        heartbeatIntervalMs: 100_000,
      });
      try {
        await waitUntil(async () => {
          try {
            return (await readJson(fixture.receipt)).status === "ready";
          } catch {
            return false;
          }
        });
        const lifecycleState = await runnerLifecycleState(fixture);
        const lifecycle = startLifecycle(lifecycleState, fixture.host, {
          delay: fastDelay,
          readProcessReceipt: async (...args) => {
            const receipt = await readProcessReceipt(...args);
            if (receipt === null) transientAbsenceReads += 1;
            return receipt;
          },
        });
        await claimGapStarted;
        assert.equal((await inspectPath(fixture.receipt, { hash: false })).kind, "absent");
        await waitUntil(() => transientAbsenceReads > 0);
        const completedDuringGap = await Promise.race([
          lifecycle.then(
            () => true,
            () => true,
          ),
          new Promise((resolve) => setTimeout(() => resolve(false), 25)),
        ]);
        assert.equal(completedDuringGap, false);
        releaseClaimGap();
        const result = await lifecycle;
        assert.equal(result.receipt.status, "stopped");
        await running;
        assert.equal((await readJson(fixture.receipt)).status, "stopped");
      } finally {
        releaseClaimGap();
      }
    });
  };

  await withRunnerFixture("hetzner-runner-success", async (fixture) => {
    const child = fakeOwnedChild();
    const running = runGatewayRunner(fixture.args, dependenciesFor(child, fixture));
    await waitUntil(async () => {
      try {
        return (await readJson(fixture.receipt)).status === "ready";
      } catch {
        return false;
      }
    });
    await protectedPublication(
      fixture.stopRequest,
      stableJson(stopRequestFor(fixture.token)),
      fixture.host,
      0o600,
      { allowImmediateConsumption: true },
    );
    await running;
    assert.equal((await readJson(fixture.receipt)).status, "stopped");
    assert.deepEqual(child.killSignals, ["SIGTERM"]);
  });

  await exerciseReceiptClaimGap(
    "hetzner-runner-stop-receipt-claim-gap",
    (state, host, dependencies) =>
      stopOwnedGateway({ host, ...state, now: Date.now() }, dependencies),
  );

  await exerciseReceiptClaimGap(
    "hetzner-runner-compensation-receipt-claim-gap",
    (state, host, dependencies) =>
      compensateStartedGateway(
        {
          host,
          ...state,
          now: Date.now(),
        },
        dependencies,
      ),
  );

  await withRunnerFixture("hetzner-runner-shared-stop-budget", async (fixture) => {
    const child = fakeOwnedChild();
    const stopTimeoutMs = 14_000;
    const phaseMs = stopTimeoutMs / PROCESS_STOP_PHASE_COUNT;
    const boundaryMarginMs = 750;
    const publicationWindowMs = phaseMs * 3;
    const runnerClaimWindowMs = phaseMs * 4;
    const baseInspect = fixture.rootBoundaryDependencies.inspectCurrentUserDirectoryBoundary;
    let delayNextPollProof = false;
    let delayedPollProof = false;
    let pollProofStartedResolve;
    const pollProofStarted = new Promise((resolve) => {
      pollProofStartedResolve = resolve;
    });
    const running = runGatewayRunner(fixture.args, {
      ...dependenciesFor(child, fixture),
      heartbeatIntervalMs: 100_000,
      inspectCurrentUserDirectoryBoundary: async (target) => {
        if (delayNextPollProof && !delayedPollProof) {
          delayedPollProof = true;
          pollProofStartedResolve();
          // Start before publication and finish after its just-inside commit to
          // model the maximum in-flight poll/root-proof latency.
          await new Promise((resolve) => setTimeout(resolve, publicationWindowMs + 300));
        }
        return baseInspect(target);
      },
      stopDeadlineMs: stopTimeoutMs,
      verifyCurrentUserFileAsync: async () => {
        // Model a permission proof that uses almost the complete, separately
        // reserved claim window without depending on host ACL tooling.
        await new Promise((resolve) => setTimeout(resolve, runnerClaimWindowMs - boundaryMarginMs));
      },
    });
    await waitUntil(async () => {
      try {
        return (await readJson(fixture.receipt)).status === "ready";
      } catch {
        return false;
      }
    });
    const { manifest, paths } = await runnerLifecycleState(fixture);
    await assert.rejects(
      stopOwnedGateway(
        { host: fixture.host, manifest, now: Date.now(), paths },
        {
          beforeStopRequestPublish: async () => {
            await new Promise((resolve) => setTimeout(resolve, publicationWindowMs + 50));
          },
          securePathPermissions: async () => {},
          stopTimeoutMs,
        },
      ),
      (error) => error.code === "process_stop_request_invalid",
    );
    assert.equal((await inspectPath(fixture.stopRequest, { hash: false })).kind, "absent");
    assert.equal((await readJson(fixture.receipt)).status, "ready");

    delayNextPollProof = true;
    await pollProofStarted;
    const stopped = await stopOwnedGateway(
      { host: fixture.host, manifest, now: Date.now(), paths },
      {
        atomicWriteJson: async (...args) => {
          const publication = await atomicWriteJson(...args);
          // Once the exclusive link commits, a post-link delay may cross the
          // writer cutoff without turning the observed request into a failure.
          await new Promise((resolve) => setTimeout(resolve, boundaryMarginMs + 100));
          return publication;
        },
        securePathPermissions: async () => {
          await new Promise((resolve) =>
            setTimeout(resolve, publicationWindowMs - boundaryMarginMs),
          );
        },
        stopTimeoutMs,
      },
    );
    assert.equal(stopped.terminalStatus, "stopped");
    await running;
    assert.equal((await readJson(fixture.receipt)).status, "stopped");
  });

  await withRunnerFixture("hetzner-runner-delayed-stop-claim-cleanup", async (fixture) => {
    const child = fakeOwnedChild();
    let cleanupStartedResolve;
    const cleanupStarted = new Promise((resolve) => {
      cleanupStartedResolve = resolve;
    });
    let releaseCleanup;
    const cleanupGate = new Promise((resolve) => {
      releaseCleanup = resolve;
    });
    let claimedPath = null;
    const running = runGatewayRunner(fixture.args, {
      ...dependenciesFor(child, fixture),
      async beforeStopRequestCleanup({ claim }) {
        claimedPath = claim;
        cleanupStartedResolve();
        await cleanupGate;
      },
    });
    try {
      await waitUntil(async () => {
        try {
          return (await readJson(fixture.receipt)).status === "ready";
        } catch {
          return false;
        }
      });
      const { manifest, paths } = await runnerLifecycleState(fixture);
      const stopping = stopOwnedGateway(
        { host: fixture.host, manifest, now: Date.now(), paths },
        {},
      );
      await cleanupStarted;
      assert.ok(claimedPath && fs.existsSync(claimedPath));
      const visibleTerminal = await readJson(fixture.receipt);
      assert.equal(visibleTerminal.status, "stopped");
      assert.equal(visibleTerminal.stopRequest.claim, path.basename(claimedPath));
      const completedBeforeClaimCleanup = await Promise.race([
        stopping.then(
          () => true,
          () => true,
        ),
        new Promise((resolve) => setTimeout(() => resolve(false), 50)),
      ]);
      assert.equal(completedBeforeClaimCleanup, false);
      releaseCleanup();
      const stopped = await stopping;
      assert.equal(stopped.terminalStatus, "stopped");
      await running;
      assert.equal(fs.existsSync(claimedPath), false);
      assert.equal((await readJson(fixture.receipt)).status, "stopped");
    } finally {
      releaseCleanup();
    }
  });

  await withRunnerFixture("hetzner-runner-failed-stop-claim-cleanup", async (fixture) => {
    const child = fakeOwnedChild();
    let claimedPath = null;
    const running = runGatewayRunner(fixture.args, {
      ...dependenciesFor(child, fixture),
      beforeStopRequestCleanup({ claim }) {
        claimedPath = claim;
        throw new Error("injected stop-claim cleanup failure");
      },
    });
    const expectedFailure = assert.rejects(running, /injected stop-claim cleanup failure/u);
    await waitUntil(async () => {
      try {
        return (await readJson(fixture.receipt)).status === "ready";
      } catch {
        return false;
      }
    });
    await protectedPublication(
      fixture.stopRequest,
      stableJson(stopRequestFor(fixture.token)),
      fixture.host,
      0o600,
      { allowImmediateConsumption: true },
    );
    await expectedFailure;
    assert.ok(claimedPath && fs.existsSync(claimedPath));
    const visibleTerminal = await readJson(fixture.receipt);
    assert.equal(visibleTerminal.status, "stopped");
    assert.equal(visibleTerminal.stopRequest.claim, path.basename(claimedPath));
    const { manifest, paths } = await runnerLifecycleState(fixture);
    await assert.rejects(
      stopOwnedGateway({ host: fixture.host, manifest, now: Date.now(), paths }),
      (error) => error.code === "process_stop_request_changed",
    );
  });

  await withRunnerFixture("hetzner-runner-initial-ready-stop", async (fixture) => {
    const child = fakeOwnedChild();
    let readyStartedResolve;
    const readyStarted = new Promise((resolve) => {
      readyStartedResolve = resolve;
    });
    let releaseReady;
    const readyGate = new Promise((resolve) => {
      releaseReady = resolve;
    });
    let readyWrites = 0;
    const running = runGatewayRunner(fixture.args, {
      ...dependenciesFor(child, fixture),
      atomicJson: async (target, value, options) => {
        if (value.status === "ready") {
          readyWrites += 1;
          if (readyWrites === 1) {
            readyStartedResolve();
            await readyGate;
          }
        }
        return await runnerAtomicJson(target, value, options);
      },
      heartbeatIntervalMs: 100_000,
    });
    try {
      await readyStarted;
      const stopStarted = Date.now();
      await protectedPublication(
        fixture.stopRequest,
        stableJson(stopRequestFor(fixture.token, stopStarted)),
        fixture.host,
        0o600,
        { allowImmediateConsumption: true },
      );
      await waitUntil(() => child.killSignals.includes("SIGTERM"), 2_000);
      releaseReady();
      await running;
      assert.ok(Date.now() - stopStarted < PROCESS_STOP_TIMEOUT_MS);
      assert.equal(readyWrites, 1, "the superseded initial ready write must not be retried");
      assert.equal((await readJson(fixture.receipt)).status, "stopped");
    } finally {
      releaseReady();
    }
  });

  await withRunnerFixture("hetzner-runner-near-stop-deadline", async (fixture) => {
    const child = fakeOwnedChild();
    const baseInspect = fixture.rootBoundaryDependencies.inspectCurrentUserDirectoryBoundary;
    let slowStopProofs = false;
    const receiptStatuses = [];
    const receiptDeadlines = [];
    const receiptReserves = [];
    const rootDeadlines = [];
    const rootReserves = [];
    const running = runGatewayRunner(fixture.args, {
      ...dependenciesFor(child, fixture),
      atomicJson: async (target, value, options) => {
        receiptStatuses.push(value.status);
        if (slowStopProofs && ["stopping", "stopped"].includes(value.status)) {
          receiptDeadlines.push(options.deadlineAt);
          receiptReserves.push(options.deadlineReserveMs);
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
        return await runnerAtomicJson(target, value, options);
      },
      heartbeatIntervalMs: 100_000,
      inspectCurrentUserDirectoryBoundary: async (target, _label, options = {}) => {
        if (slowStopProofs) {
          if (options.deadlineAt !== undefined) rootDeadlines.push(options.deadlineAt);
          if (options.deadlineAt !== undefined) {
            rootReserves.push(options.deadlineReserveMs ?? 0);
          }
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
        return baseInspect(target);
      },
      stopWatcherIntervalMs: 250,
    });
    await waitUntil(async () => {
      try {
        return (await readJson(fixture.receipt)).status === "ready";
      } catch {
        return false;
      }
    });
    slowStopProofs = true;
    const stopStarted = Date.now();
    const sharedDeadline = stopStarted + PROCESS_STOP_TIMEOUT_MS;
    await protectedPublication(
      fixture.stopRequest,
      stableJson(stopRequestFor(fixture.token, stopStarted, sharedDeadline)),
      fixture.host,
      0o600,
      { allowImmediateConsumption: true },
    );
    await running;
    const elapsed = Date.now() - stopStarted;
    assert.ok(elapsed >= 3_000, `expected phase-consuming proof latency, got ${elapsed}ms`);
    assert.ok(elapsed < 15_000, `stop exceeded its 15-second budget: ${elapsed}ms`);
    assert.ok(rootDeadlines.length > 0);
    assert.ok(rootDeadlines.every((deadline) => deadline === sharedDeadline));
    assert.deepEqual(receiptDeadlines, [sharedDeadline, sharedDeadline]);
    const stopPhaseMs = PROCESS_STOP_TIMEOUT_MS / PROCESS_STOP_PHASE_COUNT;
    assert.deepEqual(receiptReserves, [stopPhaseMs * 6, stopPhaseMs * 4]);
    assert.ok(rootReserves.includes(stopPhaseMs * 8));
    assert.ok(rootReserves.includes(stopPhaseMs * 6));
    assert.ok(rootReserves.includes(stopPhaseMs * 4));
    assert.ok(rootReserves.includes(stopPhaseMs * 2));
    assert.ok(receiptStatuses.includes("stopping"));
    assert.ok(receiptStatuses.includes("stopped"));
    assert.equal((await readJson(fixture.receipt)).status, "stopped");
  });

  for (const phase of ["initial-ready", "heartbeat", "stopping", "terminal"]) {
    await withRunnerFixture(`hetzner-runner-${phase}`, async (fixture) => {
      const child = fakeOwnedChild();
      let readyWrites = 0;
      const injectedAtomicJson = (target, value, options) => {
        if (value.status === "ready") readyWrites += 1;
        const shouldFail =
          (phase === "initial-ready" && value.status === "ready" && readyWrites === 1) ||
          (phase === "heartbeat" && value.status === "ready" && readyWrites === 2) ||
          (phase === "stopping" && value.status === "stopping") ||
          (phase === "terminal" && value.status === "stopped");
        if (shouldFail) throw new Error(`injected ${phase} receipt failure`);
        return runnerAtomicJson(target, value, options);
      };
      const running = runGatewayRunner(
        fixture.args,
        dependenciesFor(child, fixture, injectedAtomicJson),
      );
      const expectedFailure = assert.rejects(
        running,
        new RegExp(`injected ${phase} receipt failure`),
      );
      if (phase === "stopping" || phase === "terminal") {
        await waitUntil(async () => {
          try {
            return (await readJson(fixture.receipt)).status === "ready";
          } catch {
            return false;
          }
        });
        await protectedPublication(
          fixture.stopRequest,
          stableJson(stopRequestFor(fixture.token)),
          fixture.host,
          0o600,
          { allowImmediateConsumption: true },
        );
      }
      await expectedFailure;
      assert.ok(child.killSignals.includes("SIGTERM"), `${phase} must terminate the exact child`);
    });
  }

  await withRunnerFixture("hetzner-runner-kill-error", async (fixture) => {
    const child = fakeOwnedChild();
    child.kill = (signal) => {
      child.killSignals.push(signal);
      queueMicrotask(() => child.emit("error", new Error(`injected ${signal} kill error`)));
      return false;
    };
    const running = runGatewayRunner(
      fixture.args,
      dependenciesFor(child, fixture, (_target, value, options) => {
        if (value.status === "ready") throw new Error("injected receipt failure before kill");
        return runnerAtomicJson(_target, value, options);
      }),
    );
    await assert.rejects(running, /terminate|termination|kill error/u);
    assert.deepEqual(child.killSignals, ["SIGTERM", "SIGKILL"]);
  });

  for (const [label, code, signal] of [
    ["clean", 0, null],
    ["signaled", null, "SIGKILL"],
  ]) {
    await withRunnerFixture(`hetzner-runner-unrequested-${label}`, async (fixture) => {
      const child = fakeOwnedChild();
      const running = runGatewayRunner(fixture.args, dependenciesFor(child, fixture));
      await waitUntil(async () => {
        try {
          return (await readJson(fixture.receipt)).status === "ready";
        } catch {
          return false;
        }
      });
      child.exitCode = code;
      child.signalCode = signal;
      child.emit("exit", code, signal);
      await assert.rejects(running, /exited unexpectedly/u);
      assert.equal((await readJson(fixture.receipt)).status, "failed");
    });
  }

  await withRunnerFixture("hetzner-runner-child-error-exit", async (fixture) => {
    const child = fakeOwnedChild();
    const running = runGatewayRunner(fixture.args, dependenciesFor(child, fixture));
    await waitUntil(async () => {
      try {
        return (await readJson(fixture.receipt)).status === "ready";
      } catch {
        return false;
      }
    });
    const expectedFailure = assert.rejects(running, /injected child error/u);
    child.emit("error", new Error("injected child error"));
    await expectedFailure;
    const receipt = await readJson(fixture.receipt);
    assert.equal(receipt.status, "failed");
    assert.equal(receipt.error, "injected child error");
    assert.equal(receipt.exitSignal, "SIGTERM");
  });

  await withRunnerFixture("hetzner-runner-stop-plus-child-error", async (fixture) => {
    const child = fakeOwnedChild();
    child.kill = (signal) => {
      child.killSignals.push(signal);
      queueMicrotask(() => {
        child.emit("error", new Error("child failed during requested stop"));
        child.emit("exit", null, signal);
      });
      return true;
    };
    const running = runGatewayRunner(fixture.args, dependenciesFor(child, fixture));
    const expectedFailure = assert.rejects(running, /child failed during requested stop/u);
    await waitUntil(async () => {
      try {
        return (await readJson(fixture.receipt)).status === "ready";
      } catch {
        return false;
      }
    });
    await protectedPublication(
      fixture.stopRequest,
      stableJson(stopRequestFor(fixture.token)),
      fixture.host,
      0o600,
      { allowImmediateConsumption: true },
    );
    await expectedFailure;
    const receipt = await readJson(fixture.receipt);
    assert.equal(receipt.status, "failed");
    assert.equal(receipt.error, "child failed during requested stop");
    assert.equal((await inspectPath(fixture.stopRequest, { hash: false })).kind, "absent");
  });

  await withRunnerFixture("hetzner-runner-heartbeat-race", async (fixture) => {
    const child = fakeOwnedChild();
    const replacement = stableJson({ concurrent: "receipt replacement" });
    let replacementPublished = false;
    const running = runGatewayRunner(fixture.args, {
      ...dependenciesFor(child, fixture),
      beforeHeartbeatReceipt: ({ target }) => {
        if (replacementPublished) return;
        replacementPublished = true;
        fs.writeFileSync(target, replacement);
      },
    });
    const expectedFailure = assert.rejects(running, /process receipt changed before publication/u);
    await expectedFailure;
    assert.equal(replacementPublished, true);
    assert.equal(await fs.promises.readFile(fixture.receipt, "utf8"), replacement);
    assert.ok(child.killSignals.includes("SIGTERM"));
  });

  await withRunnerFixture("hetzner-runner-stop-request-race", async (fixture) => {
    const child = fakeOwnedChild();
    const replacementToken = "b".repeat(64);
    const running = runGatewayRunner(fixture.args, {
      ...dependenciesFor(child, fixture),
      afterStopRequestClaim: ({ target }) => {
        fs.writeFileSync(target, stableJson({ processToken: replacementToken }));
      },
    });
    await waitUntil(async () => {
      try {
        return (await readJson(fixture.receipt)).status === "ready";
      } catch {
        return false;
      }
    });
    await protectedPublication(
      fixture.stopRequest,
      stableJson(stopRequestFor(fixture.token)),
      fixture.host,
      0o600,
      { allowImmediateConsumption: true },
    );
    await running;
    assert.equal((await readJson(fixture.receipt)).status, "stopped");
    assert.equal((await readJson(fixture.stopRequest)).processToken, replacementToken);
  });
});

test(
  "gateway runner coalesces production heartbeats and prioritizes stop or failure",
  { timeout: 30_000 },
  async () => {
    const fastDelay = async (milliseconds) => {
      await new Promise((resolve) => setTimeout(resolve, Math.min(milliseconds, 5)));
    };
    const runScenario = async (mode) => {
      await withRunnerFixture(`hetzner-runner-heartbeat-${mode}`, async (fixture) => {
        const child = fakeOwnedChild();
        let heartbeatStartedResolve;
        const heartbeatStarted = new Promise((resolve) => {
          heartbeatStartedResolve = resolve;
        });
        let releaseHeartbeat;
        const heartbeatGate = new Promise((resolve) => {
          releaseHeartbeat = resolve;
        });
        let readyWriteAttempts = 0;
        const running = runGatewayRunner(fixture.args, {
          ...fixture.rootBoundaryDependencies,
          atomicJson: async (target, value, options) => {
            if (value.status === "ready") {
              readyWriteAttempts += 1;
              if (readyWriteAttempts === 2) {
                heartbeatStartedResolve();
                await heartbeatGate;
                if (mode === "failure") throw new Error("injected delayed heartbeat failure");
              }
            }
            return await runnerAtomicJson(target, value, options);
          },
          authenticatedGatewayReady: async () => true,
          delay: fastDelay,
          heartbeatIntervalMs: 2_000,
          portOpen: async () => false,
          spawn: () => child,
          startupAttempts: 3,
          startupDelayMs: 1,
          stopAttempts: 3,
          stopDelayMs: 1,
          stopWatcherIntervalMs: 5,
        });
        try {
          await heartbeatStarted;
          await new Promise((resolve) => setTimeout(resolve, 2_250));
          assert.equal(readyWriteAttempts, 2, "one in-flight heartbeat must absorb later ticks");
          if (mode === "failure") {
            const expectedFailure = assert.rejects(running, /injected delayed heartbeat failure/u);
            releaseHeartbeat();
            await expectedFailure;
            await new Promise((resolve) => setTimeout(resolve, 50));
            assert.equal(readyWriteAttempts, 2, "no ready write may run after heartbeat failure");
            assert.ok(child.killSignals.includes("SIGTERM"));
            return;
          }

          await protectedPublication(
            fixture.stopRequest,
            stableJson(stopRequestFor(fixture.token)),
            fixture.host,
            0o600,
            { allowImmediateConsumption: true },
          );
          await waitUntil(() => child.killSignals.includes("SIGTERM"), 1_000);
          releaseHeartbeat();
          await running;
          assert.equal(readyWriteAttempts, 2, "stopping must supersede the delayed heartbeat");
          assert.equal((await readJson(fixture.receipt)).status, "stopped");
        } finally {
          releaseHeartbeat();
        }
      });
    };

    await runScenario("stop");
    await runScenario("failure");
  },
);

test("gateway runner binds process-state root identity and POSIX mode for its lifetime", async (context) => {
  if (process.platform === "win32") {
    context.skip("POSIX replacement and mode drift are exercised on POSIX runners");
    return;
  }
  const dependenciesFor = (fixture, child) => ({
    ...fixture.rootBoundaryDependencies,
    authenticatedGatewayReady: async () => true,
    delay: async (milliseconds) =>
      await new Promise((resolve) => setTimeout(resolve, Math.min(milliseconds, 5))),
    heartbeatIntervalMs: 5,
    inspectCurrentUserDirectoryBoundary: undefined,
    portOpen: async () => false,
    spawn: () => child,
    startupAttempts: 3,
    startupDelayMs: 1,
    stopAttempts: 3,
    stopDelayMs: 1,
    stopWatcherIntervalMs: 100_000,
  });

  await withRunnerFixture("hetzner-runner-state-root-replacement", async (fixture) => {
    const child = fakeOwnedChild();
    const running = runGatewayRunner(fixture.args, dependenciesFor(fixture, child));
    await waitUntil(async () => {
      try {
        return (await readJson(fixture.receipt)).status === "ready";
      } catch {
        return false;
      }
    });
    const displaced = `${fixture.stateRoot}-displaced`;
    await fs.promises.rename(fixture.stateRoot, displaced);
    await fs.promises.mkdir(fixture.stateRoot, { mode: 0o700 });
    await assert.rejects(running, /state root identity or protection changed/u);
    assert.ok(child.killSignals.includes("SIGTERM"));
    assert.equal((await inspectPath(fixture.receipt, { hash: false })).kind, "absent");
    assert.equal(
      (await inspectPath(path.join(displaced, path.basename(fixture.receipt)), { hash: false }))
        .kind,
      "file",
    );
  });

  await withRunnerFixture("hetzner-runner-state-root-mode", async (fixture) => {
    const child = fakeOwnedChild();
    const running = runGatewayRunner(fixture.args, dependenciesFor(fixture, child));
    await waitUntil(async () => {
      try {
        return (await readJson(fixture.receipt)).status === "ready";
      } catch {
        return false;
      }
    });
    await fs.promises.chmod(fixture.stateRoot, 0o755);
    try {
      await assert.rejects(running, /state root mode must be 0700/u);
    } finally {
      await fs.promises.chmod(fixture.stateRoot, 0o700);
    }
    assert.ok(child.killSignals.includes("SIGTERM"));
  });
});

test("gateway runner revalidates POSIX stop-request protection before claiming it", async (context) => {
  if (process.platform === "win32") {
    context.skip("POSIX stop-request mode drift is exercised on POSIX runners");
    return;
  }
  await withRunnerFixture("hetzner-runner-stop-request-mode", async (fixture) => {
    const child = fakeOwnedChild();
    let claimCalls = 0;
    const running = runGatewayRunner(fixture.args, {
      ...fixture.rootBoundaryDependencies,
      authenticatedGatewayReady: async () => true,
      afterStopRequestClaim() {
        claimCalls += 1;
      },
      beforeStopRequestClaim({ target }) {
        fs.chmodSync(target, 0o644);
      },
      delay: async (milliseconds) =>
        await new Promise((resolve) => setTimeout(resolve, Math.min(milliseconds, 5))),
      heartbeatIntervalMs: 100_000,
      portOpen: async () => false,
      spawn: () => child,
      startupAttempts: 3,
      startupDelayMs: 1,
      stopAttempts: 3,
      stopDelayMs: 1,
      stopWatcherIntervalMs: 5,
    });
    const expectedFailure = assert.rejects(running, /process state mode must be 600/u);
    await waitUntil(async () => {
      try {
        return (await readJson(fixture.receipt)).status === "ready";
      } catch {
        return false;
      }
    });
    await protectedPublication(
      fixture.stopRequest,
      stableJson(stopRequestFor(fixture.token)),
      fixture.host,
      0o600,
    );
    await expectedFailure;
    assert.equal(claimCalls, 0);
    assert.ok(child.killSignals.includes("SIGTERM"));
    assert.equal((await inspectPath(fixture.stopRequest, { hash: false })).kind, "file");
  });
});

test("gateway runner rejects native Windows state-root ACL drift", async (context) => {
  if (process.platform !== "win32") {
    context.skip("The native Windows hosted job exercises root ACL drift");
    return;
  }
  await withRunnerFixture("hetzner-runner-state-root-acl", async (fixture) => {
    const child = fakeOwnedChild();
    const running = runGatewayRunner(fixture.args, {
      ...fixture.rootBoundaryDependencies,
      authenticatedGatewayReady: async () => true,
      delay: async (milliseconds) =>
        await new Promise((resolve) => setTimeout(resolve, Math.min(milliseconds, 5))),
      heartbeatIntervalMs: 10,
      inspectCurrentUserDirectoryBoundary: undefined,
      portOpen: async () => false,
      spawn: () => child,
      startupAttempts: 3,
      startupDelayMs: 1,
      stopAttempts: 3,
      stopDelayMs: 1,
      stopWatcherIntervalMs: 100_000,
    });
    await waitUntil(async () => {
      try {
        return (await readJson(fixture.receipt)).status === "ready";
      } catch {
        return false;
      }
    });
    const whoami = path.join(process.env.SystemRoot, "System32", "whoami.exe");
    const identityResult = spawnSync(whoami, ["/user", "/fo", "csv", "/nh"], {
      encoding: "utf8",
      windowsHide: true,
    });
    assert.equal(identityResult.status, 0, identityResult.stderr);
    const identity = parseWhoamiCsv(identityResult.stdout);
    const icacls = path.join(process.env.SystemRoot, "System32", "icacls.exe");
    const restricted = spawnSync(
      icacls,
      [fixture.stateRoot, "/inheritance:r", "/grant:r", `*${identity.sid}:(R)`],
      { encoding: "utf8", windowsHide: true },
    );
    assert.equal(restricted.status, 0, restricted.stderr);
    try {
      await assert.rejects(running, /ACL is not restricted|identity or protection changed/u);
    } finally {
      await secureDirectoryPermissions(fixture.stateRoot, fixture.host);
    }
    assert.ok(child.killSignals.includes("SIGTERM"));
  });
});

test("native Windows runner re-proves root ACLs after the pre-claim checkpoint", async (context) => {
  if (process.platform !== "win32") {
    context.skip("The native Windows hosted job exercises pre-claim ACL drift");
    return;
  }
  await withRunnerFixture("hetzner-runner-pre-claim-acl", async (fixture) => {
    const child = fakeOwnedChild();
    let checkpointCalls = 0;
    let claimCalls = 0;
    const whoami = path.join(process.env.SystemRoot, "System32", "whoami.exe");
    const identityResult = spawnSync(whoami, ["/user", "/fo", "csv", "/nh"], {
      encoding: "utf8",
      windowsHide: true,
    });
    assert.equal(identityResult.status, 0, identityResult.stderr);
    const identity = parseWhoamiCsv(identityResult.stdout);
    const icacls = path.join(process.env.SystemRoot, "System32", "icacls.exe");
    const running = runGatewayRunner(fixture.args, {
      authenticatedGatewayReady: async () => true,
      afterStopRequestClaim() {
        claimCalls += 1;
      },
      beforeStopRequestClaim() {
        checkpointCalls += 1;
        const restricted = spawnSync(
          icacls,
          [fixture.stateRoot, "/inheritance:r", "/grant:r", `*${identity.sid}:(R)`],
          { encoding: "utf8", windowsHide: true },
        );
        assert.equal(restricted.status, 0, restricted.stderr);
      },
      heartbeatIntervalMs: 100_000,
      portOpen: async () => false,
      spawn: () => child,
      stopWatcherIntervalMs: 5,
    });
    const expectedFailure = assert.rejects(
      running,
      /ACL is not restricted|identity or protection changed/u,
    );
    try {
      await waitUntil(async () => {
        try {
          return (await readJson(fixture.receipt)).status === "ready";
        } catch {
          return false;
        }
      }, 20_000);
      await protectedPublication(
        fixture.stopRequest,
        stableJson(stopRequestFor(fixture.token)),
        fixture.host,
        0o600,
      );
      await expectedFailure;
    } finally {
      await secureDirectoryPermissions(fixture.stateRoot, fixture.host);
    }
    assert.equal(checkpointCalls, 1);
    assert.equal(claimCalls, 0);
    assert.ok(child.killSignals.includes("SIGTERM"));
    assert.equal((await inspectPath(fixture.stopRequest, { hash: false })).kind, "file");
  });
});

test("native Windows runner revalidates stop-request ACLs before claim", async (context) => {
  if (process.platform !== "win32") {
    context.skip("The native Windows hosted job exercises stop-request ACL drift");
    return;
  }
  await withRunnerFixture("hetzner-runner-stop-request-acl", async (fixture) => {
    const child = fakeOwnedChild();
    let claimCalls = 0;
    const whoami = path.join(process.env.SystemRoot, "System32", "whoami.exe");
    const identityResult = spawnSync(whoami, ["/user", "/fo", "csv", "/nh"], {
      encoding: "utf8",
      windowsHide: true,
    });
    assert.equal(identityResult.status, 0, identityResult.stderr);
    const identity = parseWhoamiCsv(identityResult.stdout);
    const icacls = path.join(process.env.SystemRoot, "System32", "icacls.exe");
    const running = runGatewayRunner(fixture.args, {
      ...fixture.rootBoundaryDependencies,
      authenticatedGatewayReady: async () => true,
      afterStopRequestClaim() {
        claimCalls += 1;
      },
      beforeStopRequestClaim({ target }) {
        const restricted = spawnSync(
          icacls,
          [target, "/inheritance:r", "/grant:r", `*${identity.sid}:(R)`],
          { encoding: "utf8", windowsHide: true },
        );
        assert.equal(restricted.status, 0, restricted.stderr);
      },
      heartbeatIntervalMs: 100_000,
      portOpen: async () => false,
      spawn: () => child,
      stopWatcherIntervalMs: 5,
    });
    const expectedFailure = assert.rejects(running, /ACL is not restricted/u);
    await waitUntil(async () => {
      try {
        return (await readJson(fixture.receipt)).status === "ready";
      } catch {
        return false;
      }
    }, 20_000);
    await protectedPublication(
      fixture.stopRequest,
      stableJson(stopRequestFor(fixture.token)),
      fixture.host,
      0o600,
    );
    try {
      await expectedFailure;
    } finally {
      await securePathPermissions(fixture.stopRequest, fixture.host, 0o600);
    }
    assert.equal(claimCalls, 0);
    assert.ok(child.killSignals.includes("SIGTERM"));
    assert.equal((await inspectPath(fixture.stopRequest, { hash: false })).kind, "file");
  });
});

test("native Windows ACL subprocesses honor the remaining lifecycle deadline", async (context) => {
  if (process.platform !== "win32") {
    context.skip("The native Windows hosted job exercises bounded ACL subprocesses");
    return;
  }
  await withRunnerFixture("hetzner-runner-acl-remaining-deadline", async (fixture) => {
    const expected = fixture.rootBoundaryDependencies.inspectCurrentUserDirectoryBoundary(
      fixture.stateRoot,
    );
    const deadlineAt = Date.now() + 750;
    const current = await inspectCurrentUserDirectoryBoundaryAsync(
      fixture.stateRoot,
      "state root",
      {
        deadlineAt,
        execFile(_executable, _args, _options, callback) {
          const child = new EventEmitter();
          Object.assign(child, { exitCode: null, signalCode: null });
          queueMicrotask(() => {
            callback(
              null,
              JSON.stringify({
                ...expected.protection,
                current: expected.protection.owner,
              }),
            );
            child.exitCode = 0;
            child.emit("close", 0, null);
          });
          return child;
        },
      },
    );
    assert.deepEqual(current, expected);
    assert.ok(Date.now() < deadlineAt);

    let expiredExecCalls = 0;
    await assert.rejects(
      inspectCurrentUserDirectoryBoundaryAsync(fixture.stateRoot, "state root", {
        deadlineAt: Date.now() - 1,
        execFile() {
          expiredExecCalls += 1;
        },
      }),
      /lifecycle deadline/u,
    );
    assert.equal(expiredExecCalls, 0);
  });
});

test("native Windows receipt ACL verification bounds a hung child inside reserved time", async (context) => {
  if (process.platform !== "win32") {
    context.skip("The native Windows hosted job exercises hung ACL-child escalation");
    return;
  }
  await withRunnerFixture("hetzner-receipt-acl-hung-child", async (fixture) => {
    await protectedFile(fixture.receipt, "protected receipt fixture\n", fixture.host);
    let hungChild = null;
    const commandSpawn = (_executable, args) => {
      const child = new EventEmitter();
      Object.assign(child, {
        exitCode: null,
        pid: 52_001,
        signalCode: null,
        stderr: new EventEmitter(),
        stdout: new EventEmitter(),
        killSignals: [],
        kill(signal) {
          child.killSignals.push(signal);
          if (signal === "SIGKILL") {
            child.signalCode = signal;
            queueMicrotask(() => child.emit("close", null, signal));
          }
          return true;
        },
      });
      if (args.includes("/user")) {
        queueMicrotask(() => {
          child.stdout.emit("data", '"fixture\\user","S-1-5-21-1000"');
          child.exitCode = 0;
          child.emit("close", 0, null);
        });
      } else {
        hungChild = child;
      }
      return child;
    };
    const startedAt = Date.now();
    const deadlineAt = startedAt + 1_500;
    await assert.rejects(
      verifyRestrictedFilePermissions(fixture.receipt, fixture.host, 0o600, {
        commandSpawn,
        deadlineAt,
        deadlineReserveMs: 300,
      }),
      (error) => error.code === "permission_command_timeout",
    );
    assert.ok(Date.now() - startedAt < 1_500);
    assert.deepEqual(hungChild?.killSignals, ["SIGTERM", "SIGKILL"]);
  });
});

test("native Windows runner bounds a hung stop-request ACL child before claim", async (context) => {
  if (process.platform !== "win32") {
    context.skip("The native Windows hosted job exercises runner ACL-child escalation");
    return;
  }
  await withRunnerFixture("hetzner-runner-stop-request-hung-acl", async (fixture) => {
    const child = fakeOwnedChild();
    let hangAcl = false;
    let hungAclChild = null;
    const running = runGatewayRunner(fixture.args, {
      ...fixture.rootBoundaryDependencies,
      authenticatedGatewayReady: async () => true,
      delay: async (milliseconds) =>
        await new Promise((resolve) => setTimeout(resolve, Math.min(milliseconds, 5))),
      execFile(executable, args, options, callback) {
        if (!hangAcl) return nodeExecFile(executable, args, options, callback);
        const aclChild = new EventEmitter();
        Object.assign(aclChild, {
          exitCode: null,
          killSignals: [],
          signalCode: null,
          kill(signal) {
            aclChild.killSignals.push(signal);
            if (signal === "SIGKILL") {
              aclChild.signalCode = signal;
              queueMicrotask(() => aclChild.emit("close", null, signal));
            }
            return true;
          },
          unref() {},
        });
        hungAclChild = aclChild;
        return aclChild;
      },
      heartbeatIntervalMs: 100_000,
      portOpen: async () => false,
      spawn: () => child,
      startupAttempts: 3,
      startupDelayMs: 1,
      stopAttempts: 3,
      stopDelayMs: 1,
      stopWatcherIntervalMs: 5,
    });
    const expectedFailure = assert.rejects(running, /lifecycle deadline exceeded/u);
    await waitUntil(async () => {
      try {
        return (await readJson(fixture.receipt)).status === "ready";
      } catch {
        return false;
      }
    }, 20_000);
    hangAcl = true;
    const startedAt = Date.now();
    await protectedPublication(
      fixture.stopRequest,
      stableJson(stopRequestFor(fixture.token, startedAt)),
      fixture.host,
      0o600,
    );
    await expectedFailure;
    assert.ok(Date.now() - startedAt < PROCESS_STOP_TIMEOUT_MS);
    assert.deepEqual(hungAclChild?.killSignals, ["SIGTERM", "SIGKILL"]);
    assert.ok(child.killSignals.includes("SIGTERM"));
    assert.equal((await inspectPath(fixture.stopRequest, { hash: false })).kind, "file");
  });
});

test(
  "native Windows runner rejects an ancestor junction swapped during asynchronous ACL proof",
  { timeout: 30_000 },
  async (context) => {
    if (process.platform !== "win32") {
      context.skip("The native Windows hosted job exercises junction replacement during ACL proof");
      return;
    }
    await withRunnerFixture("hetzner-runner-windows-acl-junction", async (fixture) => {
      const fixtureRoot = path.dirname(fixture.configRoot);
      const displacedRoot = `${fixtureRoot}-acl-original`;
      let rootDisplaced = false;
      let junctionCreated = false;
      let spawnCalls = 0;
      try {
        await assert.rejects(
          runGatewayRunner(fixture.args, {
            ...fixture.rootBoundaryDependencies,
            inspectCurrentUserDirectoryBoundary: async (target, label, options) => {
              const expected =
                fixture.rootBoundaryDependencies.inspectCurrentUserDirectoryBoundary(target);
              return await inspectCurrentUserDirectoryBoundaryAsync(target, label, {
                ...options,
                windowsAclSnapshotAsync: async () => {
                  if (!rootDisplaced) {
                    await fs.promises.rename(fixtureRoot, displacedRoot);
                    rootDisplaced = true;
                    await fs.promises.symlink(displacedRoot, fixtureRoot, "junction");
                    junctionCreated = true;
                  }
                  return {
                    ...expected.protection,
                    current: expected.protection.owner,
                  };
                },
              });
            },
            spawn() {
              spawnCalls += 1;
              throw new Error("junction-swapped root must block before spawn");
            },
          }),
          /redirected path segment/u,
        );
      } finally {
        if (junctionCreated) await fs.promises.unlink(fixtureRoot);
        if (rootDisplaced) await fs.promises.rename(displacedRoot, fixtureRoot);
      }
      assert.equal(spawnCalls, 0);
    });
  },
);

test(
  "native Windows atomic receipt protection rejects a temp ancestor junction swap",
  { timeout: 30_000 },
  async (context) => {
    if (process.platform !== "win32") {
      context.skip("The native Windows hosted job exercises the atomic temp ACL boundary");
      return;
    }
    await runnerTemporaryDirectory("hetzner-runner-temp-acl-junction", async (root) => {
      const publicationRoot = path.join(root, "publication");
      const displacedRoot = `${publicationRoot}-original`;
      const target = path.join(publicationRoot, "receipt.json");
      await fs.promises.mkdir(publicationRoot, { mode: 0o700 });
      let displaced = false;
      let junction = false;
      try {
        await assert.rejects(
          runnerAtomicJson(
            target,
            { status: "ready" },
            {
              secureWindowsAclAsync: async () => {
                await fs.promises.rename(publicationRoot, displacedRoot);
                displaced = true;
                await fs.promises.symlink(displacedRoot, publicationRoot, "junction");
                junction = true;
                return {
                  access: [],
                  current: "S-1-5-21-1000",
                  owner: "S-1-5-21-1000",
                  protected: true,
                };
              },
            },
          ),
          /redirected path segment/u,
        );
        assert.equal(fs.existsSync(path.join(displacedRoot, "receipt.json")), false);
      } finally {
        if (junction) await fs.promises.unlink(publicationRoot);
        if (displaced) await fs.promises.rename(displacedRoot, publicationRoot);
      }
    });
  },
);

test(
  "native Windows permission normalization does not harden an ancestor replacement",
  { timeout: 30_000 },
  async (context) => {
    if (process.platform !== "win32") {
      context.skip("The native Windows hosted job exercises the post-whoami ACL boundary");
      return;
    }
    await runnerTemporaryDirectory("hetzner-permission-ancestor-swap", async (root) => {
      const host = actualHost(root);
      await protectedDirectory(host.localBoundary, host);
      const parent = path.join(host.localBoundary, "bound-parent");
      const displacedParent = `${parent}-original`;
      const target = path.join(parent, "credential");
      await protectedDirectory(parent, host);
      await protectedFile(target, "original protected file\n", host);
      const expectedIdentity = pathIdentity(await fs.promises.lstat(target, { bigint: true }));
      const replacement = "replacement must remain broad and unchanged\n";
      let parentDisplaced = false;
      try {
        await assert.rejects(
          securePathPermissions(target, host, 0o600, {
            async afterWindowsIdentity() {
              await fs.promises.rename(parent, displacedParent);
              parentDisplaced = true;
              await fs.promises.mkdir(parent, { mode: 0o700 });
              await fs.promises.writeFile(target, replacement, { mode: 0o600 });
              const icacls = path.join(process.env.SystemRoot, "System32", "icacls.exe");
              const broad = spawnSync(
                icacls,
                [target, "/inheritance:e", "/grant", "*S-1-1-0:(M)"],
                { encoding: "utf8", windowsHide: true },
              );
              assert.equal(broad.status, 0, broad.stderr);
            },
            expectedIdentity,
          }),
          (error) => error.code === "unsafe_protected_file",
        );
        assert.equal(await fs.promises.readFile(target, "utf8"), replacement);
        await assert.rejects(
          verifyRestrictedFilePermissions(target, host, 0o600),
          (error) => error.code === "windows_acl_broad",
        );
      } finally {
        if (parentDisplaced) {
          await fs.promises.rm(parent, { force: true, recursive: true });
          await fs.promises.rename(displacedParent, parent);
        }
      }
    });
  },
);

test(
  "native Windows runner keeps production stop polling within lifecycle deadlines",
  { timeout: 40_000 },
  async (context) => {
    if (process.platform !== "win32") {
      context.skip("The native Windows hosted job exercises asynchronous ACL polling");
      return;
    }
    await withRunnerFixture("hetzner-runner-windows-poll-deadline", async (fixture) => {
      const args = [...fixture.args];
      const setArgument = (name, value) => {
        args[args.indexOf(`--${name}`) + 1] = value;
      };
      const sharedRoot = fixture.configRoot;
      const sharedBoundary = args[args.indexOf("--config-root-boundary") + 1];
      const receipt = path.join(sharedRoot, "process-receipt.json");
      const stopRequest = path.join(sharedRoot, "process-stop.json");
      setArgument("receipt", receipt);
      setArgument("state-root", sharedRoot);
      setArgument("state-root-boundary", sharedBoundary);
      setArgument("stop-request", stopRequest);

      const child = fakeOwnedChild();
      let eventLoopTicks = 0;
      const ticker = setInterval(() => {
        eventLoopTicks += 1;
      }, 10);
      const readyStarted = Date.now();
      const running = runGatewayRunner(args, {
        authenticatedGatewayReady: async () => true,
        heartbeatIntervalMs: 2_000,
        portOpen: async () => false,
        spawn: () => child,
      });
      try {
        await waitUntil(async () => {
          try {
            return (await readJson(receipt)).status === "ready";
          } catch {
            return false;
          }
        }, 20_000);
        assert.ok(Date.now() - readyStarted < 20_000);
        const initialHeartbeat = (await readJson(receipt)).heartbeatAt;
        await waitUntil(async () => {
          try {
            return (await readJson(receipt)).heartbeatAt !== initialHeartbeat;
          } catch {
            return false;
          }
        }, 10_000);
        await protectedPublication(
          stopRequest,
          stableJson(stopRequestFor(fixture.token)),
          fixture.host,
          0o600,
        );
        const stopStarted = Date.now();
        let stopDeadline;
        try {
          await Promise.race([
            running,
            new Promise((_, reject) => {
              stopDeadline = setTimeout(
                () => reject(new Error("runner exceeded the 15-second stop deadline")),
                15_000,
              );
            }),
          ]);
        } finally {
          clearTimeout(stopDeadline);
        }
        assert.ok(Date.now() - stopStarted < 15_000);
        assert.equal((await readJson(receipt)).status, "stopped");
        assert.ok(eventLoopTicks > 0, "ACL verification must not monopolize the event loop");
      } finally {
        clearInterval(ticker);
      }
    });
  },
);

test("WSL gateway runner terminates its exact child before drifted heartbeat or stop-claim I/O", async (context) => {
  if (process.platform === "win32") {
    context.skip("WSL path behavior is exercised on POSIX runners");
    return;
  }
  const fastDelay = async (milliseconds) => {
    await new Promise((resolve) => setTimeout(resolve, Math.min(milliseconds, 5)));
  };
  const baseDependencies = (child, mountInfoProvider, boundaryIo, fixture) => ({
    ...fixture.rootBoundaryDependencies,
    authenticatedGatewayReady: async () => true,
    delay: fastDelay,
    heartbeatIntervalMs: 5,
    portOpen: async () => false,
    spawn: () => child,
    startupAttempts: 3,
    startupDelayMs: 1,
    stopAttempts: 3,
    stopDelayMs: 1,
    stopWatcherIntervalMs: 5,
    wslBoundaryOptions: {
      env: { WSL_DISTRO_NAME: "nixos" },
      lstatSync(target) {
        const mountInfo = mountInfoProvider();
        if (isWslWindowsMountedPath(String(target), parseWslWindowsMounts(mountInfo))) {
          boundaryIo.count += 1;
        }
        return fs.lstatSync(target);
      },
      mountInfoProvider,
      platform: "linux",
    },
  });

  await withRunnerFixture("hetzner-runner-wsl-credential-drift", async (fixture) => {
    const child = fakeOwnedChild();
    let mountInfo = WSL_WINDOWS_MOUNT_INFO;
    let credentialReads = 0;
    let spawnCalls = 0;
    const boundaryIo = { count: 0 };
    const running = runGatewayRunner(fixture.args, {
      ...baseDependencies(child, () => mountInfo, boundaryIo, fixture),
      beforeCredentialBoundary() {
        const providerKey = fixture.args[fixture.args.indexOf("--provider-key") + 1];
        mountInfo = withWslDrvFsMount(providerKey);
      },
      readProtectedGatewaySecret() {
        credentialReads += 1;
        return gatewayCredential("r");
      },
      readProtectedSecret() {
        credentialReads += 1;
        return "provider-runner-fixture";
      },
      spawn() {
        spawnCalls += 1;
        return child;
      },
    });
    await assert.rejects(running, (error) => error.code === "wsl_cross_boundary_path");
    assert.equal(credentialReads, 0);
    assert.equal(spawnCalls, 0);
    assert.equal(boundaryIo.count, 0);
  });

  await withRunnerFixture("hetzner-runner-wsl-pre-spawn-drift", async (fixture) => {
    const child = fakeOwnedChild();
    let mountInfo = WSL_WINDOWS_MOUNT_INFO;
    let credentialReads = 0;
    let spawnCalls = 0;
    const boundaryIo = { count: 0 };
    const running = runGatewayRunner(fixture.args, {
      ...baseDependencies(child, () => mountInfo, boundaryIo, fixture),
      beforeSpawnBoundary() {
        const litellm = fixture.args[fixture.args.indexOf("--litellm") + 1];
        mountInfo = withWslDrvFsMount(litellm);
      },
      readProtectedGatewaySecret() {
        credentialReads += 1;
        return gatewayCredential("r");
      },
      readProtectedSecret() {
        credentialReads += 1;
        return "provider-runner-fixture";
      },
      spawn() {
        spawnCalls += 1;
        return child;
      },
    });
    await assert.rejects(running, (error) => error.code === "wsl_cross_boundary_path");
    assert.equal(credentialReads, 2);
    assert.equal(spawnCalls, 0);
    assert.equal(boundaryIo.count, 0);
  });

  for (const boundaryHook of ["beforeSpawnBoundary", "beforeConfirmedCredentialBoundary"]) {
    await withRunnerFixture(
      `hetzner-runner-credential-replacement-${boundaryHook}`,
      async (fixture) => {
        const child = fakeOwnedChild();
        const providerKey = fixture.args[fixture.args.indexOf("--provider-key") + 1];
        let mountInfo = WSL_WINDOWS_MOUNT_INFO;
        let spawnCalls = 0;
        const boundaryIo = { count: 0 };
        await assert.rejects(
          runGatewayRunner(fixture.args, {
            ...baseDependencies(child, () => mountInfo, boundaryIo, fixture),
            [boundaryHook]() {
              fs.writeFileSync(providerKey, "provider-runner-replaced");
            },
            spawn() {
              spawnCalls += 1;
              return child;
            },
          }),
          /credential content changed before gateway consumption/u,
          boundaryHook,
        );
        assert.equal(spawnCalls, 0, boundaryHook);
      },
    );
  }

  for (const environmentCase of [
    {
      dependencies: {},
      env: { HOME: path.join(os.tmpdir(), "runner-explicit-home") },
      label: "LiteLLM environment namespace HOME",
      mountTarget: path.join(os.tmpdir(), "runner-explicit-home", "nested-mount"),
      name: "explicit-home",
    },
    {
      dependencies: { homedir: () => path.join(os.tmpdir(), "runner-effective-home") },
      env: {},
      label: "LiteLLM environment namespace HOME",
      mountTarget: path.join(os.tmpdir(), "runner-effective-home", "nested-mount"),
      name: "effective-home",
    },
    {
      dependencies: { tmpdir: () => path.join(os.tmpdir(), "runner-effective-temp") },
      env: { HOME: path.join(os.tmpdir(), "runner-safe-home") },
      label: "LiteLLM environment namespace TEMP",
      mountTarget: path.join(os.tmpdir(), "runner-effective-temp"),
      name: "effective-temp",
    },
    {
      dependencies: {},
      env: {
        HOME: path.join(os.tmpdir(), "runner-safe-home"),
        PATH: path.join(os.tmpdir(), "runner-search-path"),
      },
      label: "LiteLLM PATH entry 1",
      mountTarget: path.join(os.tmpdir(), "runner-search-path", "mounted-tool"),
      name: "path",
    },
  ]) {
    await withRunnerFixture(`hetzner-runner-wsl-env-${environmentCase.name}`, async (fixture) => {
      const child = fakeOwnedChild();
      let mountInfo = withWslDrvFsMount(environmentCase.mountTarget);
      let credentialReads = 0;
      let spawnCalls = 0;
      const boundaryIo = { count: 0 };
      const dependencies = {
        ...baseDependencies(child, () => mountInfo, boundaryIo, fixture),
        tmpdir: () => "/var/tmp/hetzner-runner-safe-temp",
        ...environmentCase.dependencies,
        env: environmentCase.env,
        readProtectedGatewaySecret() {
          credentialReads += 1;
          return gatewayCredential("r");
        },
        readProtectedSecret() {
          credentialReads += 1;
          return "provider-runner-fixture";
        },
        spawn() {
          spawnCalls += 1;
          return child;
        },
      };
      await assert.rejects(
        runGatewayRunner(fixture.args, dependencies),
        (error) =>
          error.code === "wsl_cross_boundary_path" && error.details.label === environmentCase.label,
        environmentCase.name,
      );
      assert.equal(credentialReads, 0, environmentCase.name);
      assert.equal(spawnCalls, 0, environmentCase.name);

      for (const boundaryHook of ["beforeSpawnBoundary", "beforeConfirmedCredentialBoundary"]) {
        mountInfo = WSL_WINDOWS_MOUNT_INFO;
        credentialReads = 0;
        spawnCalls = 0;
        boundaryIo.count = 0;
        await assert.rejects(
          runGatewayRunner(fixture.args, {
            ...dependencies,
            [boundaryHook]() {
              mountInfo = withWslDrvFsMount(environmentCase.mountTarget);
            },
          }),
          (error) =>
            error.code === "wsl_cross_boundary_path" &&
            error.details.label === environmentCase.label,
          `${environmentCase.name} ${boundaryHook}`,
        );
        assert.equal(credentialReads, 2, `${environmentCase.name} ${boundaryHook}`);
        assert.equal(spawnCalls, 0, `${environmentCase.name} ${boundaryHook}`);
        assert.equal(boundaryIo.count, 0, `${environmentCase.name} ${boundaryHook}`);
      }
    });
  }

  await withRunnerFixture("hetzner-runner-wsl-post-await-bin-drift", async (fixture) => {
    const child = fakeOwnedChild();
    let mountInfo = WSL_WINDOWS_MOUNT_INFO;
    let credentialReads = 0;
    let spawnCalls = 0;
    const boundaryIo = { count: 0 };
    const running = runGatewayRunner(fixture.args, {
      ...baseDependencies(child, () => mountInfo, boundaryIo, fixture),
      async portOpen() {
        mountInfo = withWslDrvFsMount(path.join(fixture.configRoot, "bin"));
        return false;
      },
      readProtectedGatewaySecret() {
        credentialReads += 1;
        return gatewayCredential("r");
      },
      readProtectedSecret() {
        credentialReads += 1;
        return "provider-runner-fixture";
      },
      spawn() {
        spawnCalls += 1;
        return child;
      },
    });
    await assert.rejects(running, (error) => error.code === "wsl_cross_boundary_path");
    assert.equal(credentialReads, 2);
    assert.equal(spawnCalls, 0);
    assert.equal(boundaryIo.count, 0);
  });

  await withRunnerFixture("hetzner-runner-wsl-heartbeat-drift", async (fixture) => {
    const child = fakeOwnedChild();
    let mountInfo = WSL_WINDOWS_MOUNT_INFO;
    let mountedPublicationIo = 0;
    const boundaryIo = { count: 0 };
    const running = runGatewayRunner(fixture.args, {
      ...baseDependencies(child, () => mountInfo, boundaryIo, fixture),
      afterReceiptBoundary({ target }) {
        if (isWslWindowsMountedPath(target, parseWslWindowsMounts(mountInfo))) {
          mountedPublicationIo += 1;
        }
      },
      stopWatcherIntervalMs: 100_000,
    });
    await waitUntil(async () => {
      try {
        return (await readJson(fixture.receipt)).status === "ready";
      } catch {
        return false;
      }
    });
    mountInfo = withWslDrvFsMount(fixture.receipt);
    await assert.rejects(running, (error) => error.code === "wsl_cross_boundary_path");
    assert.ok(child.killSignals.includes("SIGTERM"));
    assert.equal(mountedPublicationIo, 0);
    assert.equal(boundaryIo.count, 0);
  });

  await withRunnerFixture("hetzner-runner-wsl-stop-drift", async (fixture) => {
    const child = fakeOwnedChild();
    let mountInfo = WSL_WINDOWS_MOUNT_INFO;
    let allowStopPoll = false;
    let mountedExistsIo = 0;
    let stopClaimCalls = 0;
    const boundaryIo = { count: 0 };
    const running = runGatewayRunner(fixture.args, {
      ...baseDependencies(child, () => mountInfo, boundaryIo, fixture),
      beforeStopRequestClaim() {
        stopClaimCalls += 1;
      },
      existsSync(target) {
        if (!allowStopPoll) return false;
        if (isWslWindowsMountedPath(target, parseWslWindowsMounts(mountInfo))) {
          mountedExistsIo += 1;
        }
        return fs.existsSync(target);
      },
      heartbeatIntervalMs: 100_000,
    });
    await waitUntil(async () => {
      try {
        return (await readJson(fixture.receipt)).status === "ready";
      } catch {
        return false;
      }
    });
    await protectedPublication(
      fixture.stopRequest,
      stableJson(stopRequestFor(fixture.token)),
      fixture.host,
      0o600,
    );
    mountInfo = withWslDrvFsMount(fixture.stopRequest);
    allowStopPoll = true;
    await assert.rejects(running, (error) => error.code === "wsl_cross_boundary_path");
    assert.ok(child.killSignals.includes("SIGTERM"));
    assert.equal(stopClaimCalls, 0);
    assert.equal(mountedExistsIo, 0);
    assert.equal(boundaryIo.count, 0);
  });

  await withRunnerFixture("hetzner-runner-wsl-receipt-sibling-drift", async (fixture) => {
    const child = fakeOwnedChild();
    let mountInfo = WSL_WINDOWS_MOUNT_INFO;
    let postDriftReceiptIo = 0;
    const boundaryIo = { count: 0 };
    const running = runGatewayRunner(fixture.args, {
      ...baseDependencies(child, () => mountInfo, boundaryIo, fixture),
      afterReceiptBoundary() {
        if (mountInfo !== WSL_WINDOWS_MOUNT_INFO) postDriftReceiptIo += 1;
      },
      stopWatcherIntervalMs: 100_000,
    });
    await waitUntil(async () => {
      try {
        return (await readJson(fixture.receipt)).status === "ready";
      } catch {
        return false;
      }
    });
    mountInfo = withWslDrvFsMount(path.join(fixture.configRoot, "unrelated-sibling"));
    await assert.rejects(running, (error) => error.code === "wsl_cross_boundary_path");
    assert.ok(child.killSignals.includes("SIGTERM"));
    assert.equal(postDriftReceiptIo, 0);
    assert.equal(boundaryIo.count, 0);
  });

  await withRunnerFixture("hetzner-runner-wsl-stop-sibling-drift", async (fixture) => {
    const child = fakeOwnedChild();
    let mountInfo = WSL_WINDOWS_MOUNT_INFO;
    let allowStopPoll = false;
    let postDriftExistsIo = 0;
    let stopClaimCalls = 0;
    const boundaryIo = { count: 0 };
    const running = runGatewayRunner(fixture.args, {
      ...baseDependencies(child, () => mountInfo, boundaryIo, fixture),
      beforeStopRequestClaim() {
        stopClaimCalls += 1;
      },
      existsSync(target) {
        if (!allowStopPoll) return false;
        postDriftExistsIo += 1;
        return fs.existsSync(target);
      },
      heartbeatIntervalMs: 100_000,
    });
    await waitUntil(async () => {
      try {
        return (await readJson(fixture.receipt)).status === "ready";
      } catch {
        return false;
      }
    });
    await protectedPublication(
      fixture.stopRequest,
      stableJson(stopRequestFor(fixture.token)),
      fixture.host,
      0o600,
    );
    mountInfo = withWslDrvFsMount(path.join(fixture.stateRoot, "unrelated-sibling"));
    allowStopPoll = true;
    await assert.rejects(running, (error) => error.code === "wsl_cross_boundary_path");
    assert.ok(child.killSignals.includes("SIGTERM"));
    assert.equal(stopClaimCalls, 0);
    assert.equal(postDriftExistsIo, 0);
    assert.equal(boundaryIo.count, 0);
  });
});

test("rendered gateway and client config preserve fixed boundaries", async () => {
  const host = detectHost({ env: {}, home: "/home/alice", platform: "linux" });
  const paths = managedPaths(host);
  const gateway = renderGatewayConfig("example-model");
  assert.match(gateway, new RegExp(PROVIDER_BASE_URL.replaceAll("/", "\\/")));
  assert.match(gateway, /openai\/example-model/);
  assert.match(gateway, /use_chat_completions_api: true/);
  assert.match(gateway, /turn_off_message_logging: true/);
  assert.doesNotMatch(gateway, /sk-[A-Za-z0-9]/);

  const codex = renderCodexProfile(paths, "/usr/bin/node");
  assert.match(codex, /wire_api = "responses"/);
  assert.match(codex, /http:\/\/127\.0\.0\.1:4000\/v1/);
  assert.match(codex, /\[model_providers\.hetzner\.auth\]/);
  assert.doesNotMatch(codex, /sandbox|approval|mcp|plugin|api_key/iu);

  const assets = await loadTemplateAssets();
  for (const asset of ["read-credential.mjs", "claude-hetzner.mjs", "gateway-runner.mjs"]) {
    assert.match(assets[asset].content, /readProtectedGatewaySecret/);
  }
  const claudeExecutable = path.resolve("approved-claude");
  const credentialHelper = renderCredentialHelper(assets["read-credential.mjs"].content, paths);
  const claude = renderClaudeLauncher(
    assets["claude-hetzner.mjs"].content,
    claudeExecutable,
    paths,
  );
  const runner = renderGatewayRunner(assets["gateway-runner.mjs"].content, paths, "/usr/bin/node");
  assert.doesNotMatch(credentialHelper, /__CONFIG_ROOT__|__STATE_ROOT__/);
  assert.ok(claude.includes(JSON.stringify(claudeExecutable)));
  assert.doesNotMatch(
    claude,
    /__CLAUDE_EXECUTABLE__|__CONFIG_ROOT__|__STATE_ROOT__|--credential|HETZNER_INFERENCE_API_KEY/,
  );
  assert.doesNotMatch(
    runner,
    /__CONFIG_ROOT__|__STATE_ROOT__|__NODE_EXECUTABLE__|__PROCESS_STOP_PHASE_COUNT__|__RUNNER_SCRIPT__/,
  );
  assert.doesNotMatch(
    claude,
    /(?:HTTP_PROXY|HTTPS_PROXY|NO_PROXY|http_proxy|https_proxy|no_proxy)/u,
  );

  const cursor = cursorGuidance();
  assert.equal(cursor.state, "blocked");
  assert.ok(cursor.warnings.some((warning) => warning.includes("Never enter the Hetzner")));
});

test("local template bindings preserve dollar replacement tokens in native paths", async () => {
  await temporaryDirectory("hetzner-template-literals", async (root) => {
    const suffix = ["$&", "$$", "$`", "$'"].join("-");
    const paths = {
      configRoot: path.join(root, `config-${suffix}`),
      stateRoot: path.join(root, `state-${suffix}`),
      gatewayRunner: path.join(root, `runner-${suffix}.mjs`),
    };
    const executable = path.join(root, `client-${suffix}`);
    const assets = await loadTemplateAssets();
    const outputs = [
      renderCredentialHelper(assets["read-credential.mjs"].content, paths),
      renderClaudeLauncher(assets["claude-hetzner.mjs"].content, executable, paths),
      renderGatewayRunner(assets["gateway-runner.mjs"].content, paths, executable),
    ];
    for (const [index, source] of outputs.entries()) {
      assert.ok(source.includes(JSON.stringify(paths.configRoot)));
      assert.ok(source.includes(JSON.stringify(paths.stateRoot)));
      assert.doesNotMatch(
        source,
        /__CONFIG_ROOT__|__STATE_ROOT__|__CLAUDE_EXECUTABLE__|__NODE_EXECUTABLE__/,
      );
      const file = path.join(root, `generated-${index}.mjs`);
      await fs.promises.writeFile(file, source);
      const parsed = spawnSync(process.execPath, ["--check", file], {
        encoding: "utf8",
        timeout: 5000,
      });
      assert.ifError(parsed.error);
      assert.equal(parsed.status, 0, parsed.stderr);
    }
  });
});

test("installed WSL credential and Claude helpers refresh topology before secret read and spawn", async (context) => {
  if (process.platform === "win32") {
    context.skip("WSL path behavior is exercised on POSIX runners");
    return;
  }
  await temporaryDirectory("hetzner-installed-helper-topology", async (root) => {
    const nativeHost = actualHost(root);
    const configRoot = path.join(root, "owned-config");
    const stateRoot = path.join(root, "owned-state");
    const bin = path.join(configRoot, "bin");
    const credentialPath = path.join(configRoot, "secrets", "litellm-master-key");
    const claudeExecutable = path.join(root, "tools", "claude");
    await protectedDirectory(configRoot, nativeHost);
    await protectedDirectory(stateRoot, nativeHost);
    await protectedDirectory(bin, nativeHost);
    await protectedDirectory(path.dirname(credentialPath), nativeHost);
    await protectedDirectory(path.dirname(claudeExecutable), nativeHost);
    await protectedFile(credentialPath, gatewayCredential("h"), nativeHost);
    await protectedFile(claudeExecutable, "approved Claude executable\n", nativeHost, 0o700);
    const assets = await loadTemplateAssets();
    await protectedFile(
      path.join(bin, "protected-file.mjs"),
      assets["protected-file.mjs"].content,
      nativeHost,
      0o700,
    );
    const credentialHelperPath = path.join(bin, "read-credential.mjs");
    await protectedFile(
      credentialHelperPath,
      renderCredentialHelper(assets["read-credential.mjs"].content, {
        configRoot,
        stateRoot,
      }),
      nativeHost,
      0o700,
    );
    const { runCredentialHelper: runInstalledCredentialHelper } = await import(
      `${pathToFileURL(credentialHelperPath).href}?topology=${crypto.randomUUID()}`
    );
    const launcherPath = path.join(bin, "claude-hetzner.mjs");
    await protectedFile(
      launcherPath,
      renderClaudeLauncher(assets["claude-hetzner.mjs"].content, claudeExecutable, {
        configRoot,
        stateRoot,
      }),
      nativeHost,
      0o700,
    );
    const { runClaudeLauncher: runUnboundClaudeLauncher } = await import(
      `${pathToFileURL(launcherPath).href}?topology=${crypto.randomUUID()}`
    );
    const runClaudeLauncher = (argv, dependencies = {}) =>
      runUnboundClaudeLauncher(argv, {
        homedir: () => path.join(root, "safe-client-home"),
        tmpdir: () => path.join(root, "safe-client-temp"),
        ...dependencies,
      });
    let mountInfo = WSL_WINDOWS_MOUNT_INFO;
    let mountedTargetIo = 0;
    const boundaryOptions = {
      env: { WSL_DISTRO_NAME: "nixos" },
      lstatSync(target) {
        if (isWslWindowsMountedPath(String(target), parseWslWindowsMounts(mountInfo))) {
          mountedTargetIo += 1;
        }
        return fs.lstatSync(target);
      },
      mountInfoProvider: () => mountInfo,
      platform: "linux",
    };

    let helperSecretReads = 0;
    assert.equal(
      runInstalledCredentialHelper([], {
        readProtectedGatewaySecret() {
          helperSecretReads += 1;
          return gatewayCredential("h");
        },
        wslBoundaryOptions: boundaryOptions,
      }),
      gatewayCredential("h"),
    );
    mountInfo = WSL_WINDOWS_MOUNT_INFO;
    const originalInstalledLstat = fs.lstatSync;
    const originalInstalledOpen = fs.openSync;
    const boundaryLstat = boundaryOptions.lstatSync;
    let installedTargetClassifications = 0;
    let mountedInstalledReaderIo = 0;
    boundaryOptions.lstatSync = (target, ...args) => {
      const result = originalInstalledLstat.call(fs, target, ...args);
      if (path.resolve(String(target)) === path.resolve(credentialPath)) {
        installedTargetClassifications += 1;
        if (installedTargetClassifications === 2) {
          mountInfo = withWslDrvFsMount(credentialPath);
        }
      }
      return result;
    };
    fs.lstatSync = (target, ...args) => {
      if (isWslWindowsMountedPath(String(target), parseWslWindowsMounts(mountInfo))) {
        mountedInstalledReaderIo += 1;
      }
      return originalInstalledLstat.call(fs, target, ...args);
    };
    fs.openSync = (target, ...args) => {
      if (isWslWindowsMountedPath(String(target), parseWslWindowsMounts(mountInfo))) {
        mountedInstalledReaderIo += 1;
      }
      return originalInstalledOpen.call(fs, target, ...args);
    };
    try {
      assert.throws(
        () => runInstalledCredentialHelper([], { wslBoundaryOptions: boundaryOptions }),
        (error) => error.code === "wsl_cross_boundary_path",
      );
    } finally {
      boundaryOptions.lstatSync = boundaryLstat;
      fs.lstatSync = originalInstalledLstat;
      fs.openSync = originalInstalledOpen;
      mountInfo = WSL_WINDOWS_MOUNT_INFO;
    }
    assert.equal(installedTargetClassifications, 2);
    assert.equal(mountedInstalledReaderIo, 0);
    mountInfo = withWslDrvFsMount(path.join(stateRoot, "unrelated-sibling"));
    assert.throws(
      () =>
        runInstalledCredentialHelper([], {
          readProtectedGatewaySecret() {
            helperSecretReads += 1;
            throw new Error("credential output must reject sibling namespace mounts");
          },
          wslBoundaryOptions: boundaryOptions,
        }),
      (error) => error.code === "wsl_cross_boundary_path",
    );
    assert.equal(helperSecretReads, 1);
    mountInfo = withWslDrvFsMount(credentialPath);
    assert.throws(
      () =>
        runInstalledCredentialHelper([], {
          readProtectedGatewaySecret() {
            helperSecretReads += 1;
            throw new Error("mounted credential must not be read");
          },
          wslBoundaryOptions: boundaryOptions,
        }),
      (error) => error.code === "wsl_cross_boundary_path",
    );
    assert.equal(helperSecretReads, 1);
    assert.throws(
      () =>
        runInstalledCredentialHelper([], {
          readProtectedGatewaySecret() {
            helperSecretReads += 1;
            throw new Error("osrelease-detected WSL credential must not be read");
          },
          wslBoundaryOptions: {
            ...boundaryOptions,
            env: {},
            osRelease: "5.15.0-microsoft-standard-WSL2",
          },
        }),
      (error) => error.code === "wsl_cross_boundary_path",
    );
    assert.equal(helperSecretReads, 1);

    for (const name of [
      "HOME",
      "CLAUDE_CONFIG_DIR",
      "XDG_CACHE_HOME",
      "XDG_CONFIG_HOME",
      "XDG_DATA_HOME",
      "XDG_STATE_HOME",
      "TEMP",
      "TMP",
      "TMPDIR",
    ]) {
      const expectedMutableName = ["TMP", "TMPDIR"].includes(name) ? "TEMP" : name;
      const mutableStatePath = path.join(root, "client-state", name.toLowerCase());
      let stateSecretReads = 0;
      let stateSpawnCalls = 0;
      mountInfo = withWslDrvFsMount(mutableStatePath);
      assert.throws(
        () =>
          runClaudeLauncher([], {
            credentialPath,
            env: { [name]: mutableStatePath },
            readProtectedGatewaySecret() {
              stateSecretReads += 1;
              return gatewayCredential("h");
            },
            spawn() {
              stateSpawnCalls += 1;
              throw new Error("mounted client state must not spawn");
            },
            wslBoundaryOptions: boundaryOptions,
          }),
        (error) =>
          error.code === "wsl_cross_boundary_path" &&
          error.details.label === `Claude mutable-state path ${expectedMutableName}`,
        name,
      );
      assert.equal(stateSecretReads, 0, name);
      assert.equal(stateSpawnCalls, 0, name);

      mountInfo = WSL_WINDOWS_MOUNT_INFO;
      assert.throws(
        () =>
          runClaudeLauncher([], {
            beforeSpawnBoundary() {
              mountInfo = withWslDrvFsMount(mutableStatePath);
            },
            credentialPath,
            env: { [name]: mutableStatePath },
            readProtectedGatewaySecret() {
              stateSecretReads += 1;
              return gatewayCredential("h");
            },
            spawn() {
              stateSpawnCalls += 1;
              throw new Error("drifted client state must not spawn");
            },
            wslBoundaryOptions: boundaryOptions,
          }),
        (error) =>
          error.code === "wsl_cross_boundary_path" &&
          error.details.label === `Claude mutable-state path ${expectedMutableName}`,
        name,
      );
      assert.equal(stateSecretReads, 1, name);
      assert.equal(stateSpawnCalls, 0, name);
    }

    const home = path.join(root, "client-home");
    const nestedClaudeState = path.join(home, ".claude", "plugins", "mounted");
    let nestedStateSecretReads = 0;
    let nestedStateSpawnCalls = 0;
    mountInfo = withWslDrvFsMount(nestedClaudeState);
    assert.throws(
      () =>
        runClaudeLauncher([], {
          credentialPath,
          env: { HOME: home },
          readProtectedGatewaySecret() {
            nestedStateSecretReads += 1;
            return gatewayCredential("h");
          },
          spawn() {
            nestedStateSpawnCalls += 1;
            throw new Error("nested mounted Claude state must not spawn");
          },
          wslBoundaryOptions: boundaryOptions,
        }),
      (error) =>
        error.code === "wsl_cross_boundary_path" &&
        error.details.label === "Claude mutable-state namespace HOME/.claude",
    );
    assert.equal(nestedStateSecretReads, 0);
    assert.equal(nestedStateSpawnCalls, 0);

    mountInfo = WSL_WINDOWS_MOUNT_INFO;
    assert.throws(
      () =>
        runClaudeLauncher([], {
          beforeSpawnBoundary() {
            mountInfo = withWslDrvFsMount(nestedClaudeState);
          },
          credentialPath,
          env: { HOME: home },
          readProtectedGatewaySecret() {
            nestedStateSecretReads += 1;
            return gatewayCredential("h");
          },
          spawn() {
            nestedStateSpawnCalls += 1;
            throw new Error("drifted nested Claude state must not spawn");
          },
          wslBoundaryOptions: boundaryOptions,
        }),
      (error) =>
        error.code === "wsl_cross_boundary_path" &&
        error.details.label === "Claude mutable-state namespace HOME/.claude",
    );
    assert.equal(nestedStateSecretReads, 1);
    assert.equal(nestedStateSpawnCalls, 0);

    const fallbackHome = path.join(root, "effective-os-home");
    const fallbackHomeMount = path.join(fallbackHome, ".claude", "mounted-plugin");
    let fallbackHomeSecretReads = 0;
    let fallbackHomeSpawnCalls = 0;
    mountInfo = withWslDrvFsMount(fallbackHomeMount);
    assert.throws(
      () =>
        runClaudeLauncher([], {
          credentialPath,
          env: {},
          homedir: () => fallbackHome,
          readProtectedGatewaySecret() {
            fallbackHomeSecretReads += 1;
            return gatewayCredential("h");
          },
          spawn() {
            fallbackHomeSpawnCalls += 1;
            throw new Error("mounted effective home must not spawn");
          },
          wslBoundaryOptions: boundaryOptions,
        }),
      (error) =>
        error.code === "wsl_cross_boundary_path" &&
        error.details.label === "Claude mutable-state namespace HOME/.claude",
    );
    assert.equal(fallbackHomeSecretReads, 0);
    assert.equal(fallbackHomeSpawnCalls, 0);

    mountInfo = WSL_WINDOWS_MOUNT_INFO;
    assert.throws(
      () =>
        runClaudeLauncher([], {
          beforeSpawnBoundary() {
            mountInfo = withWslDrvFsMount(fallbackHomeMount);
          },
          credentialPath,
          env: {},
          homedir: () => fallbackHome,
          readProtectedGatewaySecret() {
            fallbackHomeSecretReads += 1;
            return gatewayCredential("h");
          },
          spawn() {
            fallbackHomeSpawnCalls += 1;
            throw new Error("drifted effective home must not spawn");
          },
          wslBoundaryOptions: boundaryOptions,
        }),
      (error) =>
        error.code === "wsl_cross_boundary_path" &&
        error.details.label === "Claude mutable-state namespace HOME/.claude",
    );
    assert.equal(fallbackHomeSecretReads, 1);
    assert.equal(fallbackHomeSpawnCalls, 0);

    const fallbackTemp = path.join(root, "effective-os-temp");
    let fallbackTempSecretReads = 0;
    let fallbackTempSpawnCalls = 0;
    mountInfo = withWslDrvFsMount(fallbackTemp);
    assert.throws(
      () =>
        runClaudeLauncher([], {
          credentialPath,
          env: { HOME: home },
          readProtectedGatewaySecret() {
            fallbackTempSecretReads += 1;
            return gatewayCredential("h");
          },
          spawn() {
            fallbackTempSpawnCalls += 1;
            throw new Error("mounted effective temp must not spawn");
          },
          tmpdir: () => fallbackTemp,
          wslBoundaryOptions: boundaryOptions,
        }),
      (error) =>
        error.code === "wsl_cross_boundary_path" &&
        error.details.label === "Claude mutable-state path TEMP",
    );
    assert.equal(fallbackTempSecretReads, 0);
    assert.equal(fallbackTempSpawnCalls, 0);

    mountInfo = WSL_WINDOWS_MOUNT_INFO;
    assert.throws(
      () =>
        runClaudeLauncher([], {
          beforeSpawnBoundary() {
            mountInfo = withWslDrvFsMount(fallbackTemp);
          },
          credentialPath,
          env: { HOME: home },
          readProtectedGatewaySecret() {
            fallbackTempSecretReads += 1;
            return gatewayCredential("h");
          },
          spawn() {
            fallbackTempSpawnCalls += 1;
            throw new Error("drifted effective temp must not spawn");
          },
          tmpdir: () => fallbackTemp,
          wslBoundaryOptions: boundaryOptions,
        }),
      (error) =>
        error.code === "wsl_cross_boundary_path" &&
        error.details.label === "Claude mutable-state path TEMP",
    );
    assert.equal(fallbackTempSecretReads, 1);
    assert.equal(fallbackTempSpawnCalls, 0);

    for (const name of ["GIT_ASKPASS", "SHELL"]) {
      const forwardedPath = path.join(root, "forwarded-client-paths", name.toLowerCase());
      let forwardedSecretReads = 0;
      let forwardedSpawnCalls = 0;
      mountInfo = withWslDrvFsMount(forwardedPath);
      assert.throws(
        () =>
          runClaudeLauncher([], {
            credentialPath,
            env: { HOME: home, [name]: forwardedPath },
            readProtectedGatewaySecret() {
              forwardedSecretReads += 1;
              return gatewayCredential("h");
            },
            spawn() {
              forwardedSpawnCalls += 1;
              throw new Error("mounted forwarded helper must not spawn");
            },
            wslBoundaryOptions: boundaryOptions,
          }),
        (error) =>
          error.code === "wsl_cross_boundary_path" &&
          error.details.label === `Claude forwarded path ${name}`,
        name,
      );
      assert.equal(forwardedSecretReads, 0, name);
      assert.equal(forwardedSpawnCalls, 0, name);

      mountInfo = WSL_WINDOWS_MOUNT_INFO;
      assert.throws(
        () =>
          runClaudeLauncher([], {
            beforeSpawnBoundary() {
              mountInfo = withWslDrvFsMount(forwardedPath);
            },
            credentialPath,
            env: { HOME: home, [name]: forwardedPath },
            readProtectedGatewaySecret() {
              forwardedSecretReads += 1;
              return gatewayCredential("h");
            },
            spawn() {
              forwardedSpawnCalls += 1;
              throw new Error("drifted forwarded helper must not spawn");
            },
            wslBoundaryOptions: boundaryOptions,
          }),
        (error) =>
          error.code === "wsl_cross_boundary_path" &&
          error.details.label === `Claude forwarded path ${name}`,
        name,
      );
      assert.equal(forwardedSecretReads, 1, name);
      assert.equal(forwardedSpawnCalls, 0, name);
    }

    const pathEntry = path.join(root, "client-bin");
    const nestedPathMount = path.join(pathEntry, "mounted-tools");
    let pathSecretReads = 0;
    let pathSpawnCalls = 0;
    mountInfo = withWslDrvFsMount(nestedPathMount);
    assert.throws(
      () =>
        runClaudeLauncher([], {
          credentialPath,
          env: { PATH: pathEntry },
          readProtectedGatewaySecret() {
            pathSecretReads += 1;
            return gatewayCredential("h");
          },
          spawn() {
            pathSpawnCalls += 1;
            throw new Error("mounted PATH namespace must not spawn");
          },
          wslBoundaryOptions: boundaryOptions,
        }),
      (error) =>
        error.code === "wsl_cross_boundary_path" && error.details.label === "Claude PATH entry 1",
    );
    assert.equal(pathSecretReads, 0);
    assert.equal(pathSpawnCalls, 0);

    mountInfo = WSL_WINDOWS_MOUNT_INFO;
    assert.throws(
      () =>
        runClaudeLauncher([], {
          beforeSpawnBoundary() {
            mountInfo = withWslDrvFsMount(nestedPathMount);
          },
          credentialPath,
          env: { PATH: pathEntry },
          readProtectedGatewaySecret() {
            pathSecretReads += 1;
            return gatewayCredential("h");
          },
          spawn() {
            pathSpawnCalls += 1;
            throw new Error("drifted PATH namespace must not spawn");
          },
          wslBoundaryOptions: boundaryOptions,
        }),
      (error) =>
        error.code === "wsl_cross_boundary_path" && error.details.label === "Claude PATH entry 1",
    );
    assert.equal(pathSecretReads, 1);
    assert.equal(pathSpawnCalls, 0);

    let launcherSecretReads = 0;
    let spawnCalls = 0;
    mountInfo = WSL_WINDOWS_MOUNT_INFO;
    assert.throws(
      () =>
        runClaudeLauncher([], {
          beforeCredentialBoundary() {
            mountInfo = withWslDrvFsMount(credentialPath);
          },
          credentialPath,
          readProtectedGatewaySecret() {
            launcherSecretReads += 1;
            throw new Error("mounted launcher credential must not be read");
          },
          spawn() {
            spawnCalls += 1;
            throw new Error("mounted launcher must not spawn");
          },
          wslBoundaryOptions: boundaryOptions,
        }),
      (error) => error.code === "wsl_cross_boundary_path",
    );
    assert.equal(launcherSecretReads, 0);
    assert.equal(spawnCalls, 0);

    mountInfo = WSL_WINDOWS_MOUNT_INFO;
    assert.throws(
      () =>
        runClaudeLauncher([], {
          beforeSpawnBoundary() {
            mountInfo = withWslDrvFsMount(path.join(configRoot, "unrelated-sibling"));
          },
          credentialPath,
          readProtectedGatewaySecret() {
            launcherSecretReads += 1;
            return gatewayCredential("h");
          },
          spawn() {
            spawnCalls += 1;
            throw new Error("client spawn must reject sibling namespace mounts");
          },
          wslBoundaryOptions: boundaryOptions,
        }),
      (error) => error.code === "wsl_cross_boundary_path",
    );
    assert.equal(launcherSecretReads, 1);
    assert.equal(spawnCalls, 0);

    mountInfo = WSL_WINDOWS_MOUNT_INFO;
    assert.throws(
      () =>
        runClaudeLauncher([], {
          beforeSpawnBoundary() {
            mountInfo = withWslDrvFsMount(claudeExecutable);
          },
          credentialPath,
          readProtectedGatewaySecret() {
            launcherSecretReads += 1;
            return gatewayCredential("h");
          },
          spawn() {
            spawnCalls += 1;
            throw new Error("mounted Claude executable must not spawn");
          },
          wslBoundaryOptions: boundaryOptions,
        }),
      (error) => error.code === "wsl_cross_boundary_path",
    );
    assert.equal(launcherSecretReads, 2);
    assert.equal(spawnCalls, 0);
    assert.equal(mountedTargetIo, 0);
  });
});

test("local Claude launcher refuses settings auth overrides before secret access and spawn", async () => {
  await temporaryDirectory("hetzner-claude-settings", async (root) => {
    const configRoot = path.join(root, "config");
    const stateRoot = path.join(root, "state");
    const bin = path.join(configRoot, "bin");
    const home = path.join(root, "home");
    const project = path.join(root, "project");
    await fs.promises.mkdir(bin, { recursive: true });
    await fs.promises.mkdir(project);
    const assets = await loadTemplateAssets();
    await fs.promises.writeFile(
      path.join(bin, "protected-file.mjs"),
      assets["protected-file.mjs"].content,
    );
    const launcher = path.join(bin, "claude-hetzner.mjs");
    await fs.promises.writeFile(
      launcher,
      renderClaudeLauncher(assets["claude-hetzner.mjs"].content, process.execPath, {
        configRoot,
        stateRoot,
      }),
    );
    const { runClaudeLauncher } = await import(
      `${pathToFileURL(launcher).href}?settings=${crypto.randomUUID()}`
    );
    let secretReads = 0;
    let spawns = 0;
    const dependencies = {
      env: { HOME: home, PATH: path.dirname(process.execPath) },
      cwd: () => project,
      managedSettingsRoot: path.join(root, "managed"),
      assertCurrentWslPath() {},
      assertCurrentWslOwnedNamespace() {},
      readProtectedGatewaySecret() {
        secretReads += 1;
        return gatewayCredential("q");
      },
      spawn() {
        spawns += 1;
        return new EventEmitter();
      },
    };
    const sources = [
      path.join(home, ".claude", "settings.json"),
      path.join(project, ".claude", "settings.json"),
      path.join(root, ".claude", "settings.local.json"),
      path.join(root, "managed", "managed-settings.json"),
      path.join(root, "managed", "managed-settings.d", "10-routing.json"),
    ];
    for (const source of sources) {
      await fs.promises.mkdir(path.dirname(source), { recursive: true });
      for (const config of [
        { env: { ANTHROPIC_BASE_URL: "https://foreign.example.test" } },
        { env: { ANTHROPIC_AUTH_TOKEN: "never-echo-conflict" } },
        { apiKeyHelper: "never-execute-helper" },
        { env: { CLAUDE_CODE_USE_BEDROCK: "1" } },
      ]) {
        const bytes = JSON.stringify(config);
        await fs.promises.writeFile(source, bytes);
        assert.throws(() => runClaudeLauncher([], dependencies), /settings override gateway/);
        assert.equal(secretReads, 0);
        assert.equal(spawns, 0);
        assert.equal(await fs.promises.readFile(source, "utf8"), bytes);
      }
      await fs.promises.unlink(source);
    }
    for (const args of [
      ["--settings", "settings.json"],
      ["--settings={}"],
      ["--setting-sources", "user"],
      ["--setting-sources=user"],
    ]) {
      assert.throws(() => runClaudeLauncher(args, dependencies), /settings-source overrides/);
      assert.equal(secretReads, 0);
    }
    const source = sources[1];
    await fs.promises.writeFile(
      source,
      JSON.stringify({ permissions: { allow: [] }, env: { UNRELATED: "kept" } }),
    );
    const original = await fs.promises.readFile(source, "utf8");
    runClaudeLauncher(["--print", "hello"], dependencies);
    assert.equal(secretReads, 1);
    assert.equal(spawns, 1);
    assert.equal(await fs.promises.readFile(source, "utf8"), original);
    assert.throws(
      () =>
        runClaudeLauncher([], {
          ...dependencies,
          beforeSpawnBoundary() {
            fs.writeFileSync(
              source,
              JSON.stringify({ env: { ANTHROPIC_BASE_URL: "https://foreign.example.test" } }),
            );
          },
        }),
      /settings override gateway/,
    );
    assert.equal(secretReads, 2);
    assert.equal(spawns, 1);
  });
});

test("Windows .cmd discovery and the Claude launcher execute through the approved shim path", async (context) => {
  if (process.platform !== "win32") {
    context.skip("The Windows hosted job runs the command-shim integration");
    return;
  }
  await temporaryDirectory("hetzner-windows-cmd", async (root) => {
    const host = actualHost(root);
    const paths = managedPaths(host);
    await protectedDirectory(paths.binDir, host);
    await protectedDirectory(paths.secretsDir, host);
    const command = path.join(root, "approved claude.cmd");
    await fs.promises.writeFile(
      command,
      [
        "@echo off",
        'if "%~1"=="--version" goto version',
        'if not "%~1"=="hello world" exit /b 7',
        'if not "%ANTHROPIC_BASE_URL%"=="http://127.0.0.1:4000" exit /b 8',
        'if "%ANTHROPIC_AUTH_TOKEN%"=="" exit /b 9',
        "exit /b 0",
        ":version",
        "echo claude-code shim 1.0.0",
        "exit /b 0",
        "",
      ].join("\r\n"),
    );
    assert.equal(await captureVersion(command), "claude-code shim 1.0.0");

    const assets = await loadTemplateAssets();
    await protectedFile(
      paths.protectedFileHelper,
      assets["protected-file.mjs"].content,
      host,
      0o700,
    );
    await protectedFile(paths.gatewaySecret, gatewayCredential("c"), host);
    await protectedFile(
      paths.claudeLauncher,
      renderClaudeLauncher(assets["claude-hetzner.mjs"].content, command, paths),
      host,
      0o700,
    );
    const launched = spawnSync(process.execPath, [paths.claudeLauncher, "--", "hello world"], {
      encoding: "utf8",
      env: isolatedHostEnvironment(root),
      timeout: 15_000,
    });
    assert.equal(launched.status, 0, launched.stderr);
  });
});

test("secret validation and redaction reject altered or encoded material", () => {
  const secret = "sk-test-secret-1234567890";
  const gatewaySecret = gatewayCredential();
  assert.equal(validateSecretValue(secret, "test"), secret);
  assert.equal(validateGatewaySecretValue(gatewaySecret), gatewaySecret);
  for (const invalid of ["", ` ${secret}`, `${secret}\n`, `${secret}\0`]) {
    assert.throws(() => validateSecretValue(invalid, "test"));
  }
  for (const invalid of [
    "x",
    `sk-${"a".repeat(42)}`,
    `sk-${"a".repeat(44)}`,
    `sk-${"!".repeat(43)}`,
  ]) {
    assert.throws(() => validateGatewaySecretValue(invalid));
  }
  const text = [
    secret,
    Buffer.from(secret).toString("base64"),
    Buffer.from(secret).toString("hex"),
    `Bearer ${secret}`,
  ].join(" ");
  const redacted = redactText(text, [secret]);
  assert.doesNotMatch(redacted, new RegExp(secret));
  assert.doesNotMatch(redacted, new RegExp(Buffer.from(secret).toString("base64")));
  assert.match(redacted, /\[REDACTED\]/);
});

test("credential reads bind verification, opened identity, protection, and consumed bytes", async () => {
  await temporaryDirectory("hetzner-secret-read-race", async (root) => {
    const host = actualHost(root);
    const paths = managedPaths(host);
    await protectedDirectory(paths.secretsDir, host);

    const coreTarget = path.join(paths.secretsDir, "core-secret");
    const coreDisplaced = path.join(paths.secretsDir, "core-secret-displaced");
    const coreReplacement = path.join(paths.secretsDir, "core-secret-replacement");
    await protectedFile(coreTarget, "original-core-secret", host);
    await protectedFile(coreReplacement, "replacement-core-secret", host);
    await assert.rejects(
      readSecret(coreTarget, host, "core credential", {
        afterVerify: async () => {
          await fs.promises.rename(coreTarget, coreDisplaced);
          await fs.promises.rename(coreReplacement, coreTarget);
        },
      }),
      (error) => error.code === "concurrent_secret_change",
    );
    assert.equal(await fs.promises.readFile(coreTarget, "utf8"), "replacement-core-secret");

    const contentTarget = path.join(paths.secretsDir, "content-secret");
    await protectedFile(contentTarget, "same-length-a", host);
    await assert.rejects(
      readSecret(contentTarget, host, "content credential", {
        afterRead: async () => await fs.promises.writeFile(contentTarget, "same-length-b"),
      }),
      (error) => error.code === "concurrent_secret_change",
    );
    assert.equal(await fs.promises.readFile(contentTarget, "utf8"), "same-length-b");

    const installedTarget = path.join(paths.secretsDir, "installed-secret");
    const installedDisplaced = path.join(paths.secretsDir, "installed-secret-displaced");
    const installedReplacement = path.join(paths.secretsDir, "installed-secret-replacement");
    await protectedFile(installedTarget, "original-installed-secret", host);
    await protectedFile(installedReplacement, "replacement-installed-secret", host);
    assert.throws(
      () =>
        readProtectedSecret(installedTarget, "installed credential", {
          afterVerify: () => {
            fs.renameSync(installedTarget, installedDisplaced);
            fs.renameSync(installedReplacement, installedTarget);
          },
        }),
      /changed while opened/,
    );
    assert.equal(
      await fs.promises.readFile(installedTarget, "utf8"),
      "replacement-installed-secret",
    );
  });
});

test("WSL permission scans and post-verification secret reads reject topology drift before target I/O", async (context) => {
  if (process.platform === "win32") {
    context.skip("WSL path behavior is exercised on POSIX runners");
    return;
  }
  await temporaryDirectory("hetzner-secret-topology-drift", async (root) => {
    let mountInfo = WSL_WINDOWS_MOUNT_INFO;
    let segmentDriftArmed = false;
    let segmentBoundaryReads = 0;
    const host = detectHost({
      env: {
        CODEX_HOME: path.join(root, "codex"),
        WSL_DISTRO_NAME: "nixos",
        XDG_CONFIG_HOME: path.join(root, "config"),
        XDG_STATE_HOME: path.join(root, "state"),
      },
      home: path.join(root, "home"),
      mountInfoProvider() {
        if (segmentDriftArmed) {
          segmentBoundaryReads += 1;
          if (segmentBoundaryReads > 1) return mountInfo;
          return WSL_WINDOWS_MOUNT_INFO;
        }
        return mountInfo;
      },
      platform: "linux",
    });
    const paths = managedPaths(host);
    await protectedDirectory(paths.configRoot, host);
    await protectedDirectory(paths.stateRoot, host);
    await protectedDirectory(paths.secretsDir, host);
    const target = path.join(paths.secretsDir, "topology-secret");
    await protectedFile(target, "topology-secret-value", host);
    const driftedMountInfo = withWslDrvFsMount(target);

    const originalLstat = fs.promises.lstat;
    let mountedSegmentIo = 0;
    fs.promises.lstat = async (candidate, ...args) => {
      if (
        segmentDriftArmed &&
        isWslWindowsMountedPath(String(candidate), parseWslWindowsMounts(mountInfo))
      ) {
        mountedSegmentIo += 1;
      }
      return await originalLstat.call(fs.promises, candidate, ...args);
    };
    try {
      mountInfo = driftedMountInfo;
      segmentDriftArmed = true;
      await assert.rejects(
        verifyRestrictedFilePermissions(target, host),
        (error) => error.code === "wsl_cross_boundary_path",
      );
    } finally {
      segmentDriftArmed = false;
      mountInfo = WSL_WINDOWS_MOUNT_INFO;
      fs.promises.lstat = originalLstat;
    }
    assert.ok(segmentBoundaryReads > 1);
    assert.equal(mountedSegmentIo, 0);

    const originalOpen = fs.promises.open;
    let namedOpenCalls = 0;
    fs.promises.open = async (candidate, ...args) => {
      if (path.resolve(candidate) === path.resolve(target)) namedOpenCalls += 1;
      return await originalOpen.call(fs.promises, candidate, ...args);
    };
    try {
      await assert.rejects(
        readSecret(target, host, "topology credential", {
          afterVerify: async () => {
            mountInfo = driftedMountInfo;
          },
        }),
        (error) => error.code === "wsl_cross_boundary_path",
      );
    } finally {
      mountInfo = WSL_WINDOWS_MOUNT_INFO;
      fs.promises.open = originalOpen;
    }
    assert.equal(namedOpenCalls, 0);
  });
});

test("WSL runner temp protection rejects topology drift before named permission I/O", async (context) => {
  if (process.platform === "win32") {
    context.skip("WSL path behavior is exercised on POSIX runners");
    return;
  }
  await temporaryDirectory("hetzner-runner-temp-topology-drift", async (root) => {
    const host = actualHost(root);
    const stateRoot = path.join(root, "managed-state");
    await protectedDirectory(stateRoot, host);
    const target = path.join(stateRoot, "process-receipt.json");
    let mountInfo = WSL_WINDOWS_MOUNT_INFO;
    const originalChmod = fs.chmodSync;
    const originalFchmod = fs.fchmodSync;
    const originalLstat = fs.lstatSync;
    const originalOpen = fs.openSync;
    let mountedNamedIo = 0;
    const boundaryOptions = {
      env: { WSL_DISTRO_NAME: "nixos" },
      lstatSync: originalLstat.bind(fs),
      mountInfoProvider: () => mountInfo,
      platform: "linux",
    };
    const recordMounted = (candidate) => {
      if (isWslWindowsMountedPath(String(candidate), parseWslWindowsMounts(mountInfo))) {
        mountedNamedIo += 1;
      }
    };
    fs.chmodSync = (candidate, ...args) => {
      recordMounted(candidate);
      return originalChmod.call(fs, candidate, ...args);
    };
    fs.lstatSync = (candidate, ...args) => {
      recordMounted(candidate);
      return originalLstat.call(fs, candidate, ...args);
    };
    fs.openSync = (candidate, ...args) => {
      recordMounted(candidate);
      return originalOpen.call(fs, candidate, ...args);
    };
    fs.fchmodSync = (descriptor, mode) => {
      const result = originalFchmod.call(fs, descriptor, mode);
      mountInfo = withWslDrvFsMount(stateRoot);
      return result;
    };
    try {
      await assert.rejects(
        runnerAtomicJson(target, { status: "ready" }, { wslBoundaryOptions: boundaryOptions }),
        (error) => error.code === "wsl_cross_boundary_path",
      );
    } finally {
      fs.chmodSync = originalChmod;
      fs.fchmodSync = originalFchmod;
      fs.lstatSync = originalLstat;
      fs.openSync = originalOpen;
      mountInfo = WSL_WINDOWS_MOUNT_INFO;
    }
    assert.equal(mountedNamedIo, 0);
  });
});

test("apply rejects malformed preserved credentials without adopting them", async () => {
  await temporaryDirectory("hetzner-malformed-preserved-secret", async (root) => {
    const host = actualHost(root);
    const paths = managedPaths(host);
    const providerValue = "provider-valid-value";
    const weakGateway = "x";
    const python =
      process.platform === "win32"
        ? resolveExecutable("python", { platform: "win32" })
        : await fakePythonExecutable(root);
    assert.ok(python, "the Windows credential-provenance matrix requires hosted Python");
    const now = Date.now();
    const evidencePath = path.join(root, "discovery.json");
    await fs.promises.writeFile(evidencePath, stableJson(discoveryEvidence(now)));
    const planInput = {
      host,
      now,
      options: {
        clients: ["cursor"],
        discoveryEvidence: evidencePath,
        executables: { python },
        model: "example-model",
        workflow: "setup",
      },
      paths,
    };
    const cleanPlan = await createPlan(planInput);
    await protectedFile(paths.providerSecret, providerValue, host);
    await protectedFile(paths.gatewaySecret, weakGateway, host);

    const fabricatedPlan = structuredClone(cleanPlan);
    fabricatedPlan.state.observations[paths.providerSecret] = await inspectPath(
      paths.providerSecret,
      { hash: false },
    );
    fabricatedPlan.state.observations[paths.gatewaySecret] = await inspectPath(
      paths.gatewaySecret,
      { hash: false },
    );
    fabricatedPlan.state.digest = digestJson(fabricatedPlan.state.observations);
    fabricatedPlan.credentials.actions = { provider: "preserve", gateway: "preserve" };
    fabricatedPlan.credentials.providerInput = "protected-file";
    fabricatedPlan.credentials.gatewayInput = "protected-file";
    fabricatedPlan.requiredApprovals = fabricatedPlan.requiredApprovals.filter(
      (approval) =>
        !["generate-administrative-gateway-key", "store-provider-credential"].includes(approval),
    );
    fabricatedPlan.planId = digestJson(withoutKeys(fabricatedPlan, ["planId"]));
    await assert.rejects(
      consumePlan({
        approval: fabricatedPlan.planId,
        command: "apply",
        host,
        now,
        paths,
        plan: fabricatedPlan,
      }),
      (error) => error.code === "unowned_credential_exists",
    );

    await assert.rejects(
      createPlan(planInput),
      (error) => error.code === "unowned_credential_exists",
    );

    await writeCompletedRollbackReceipt(paths, host, now, {
      credentialContinuity: {
        scheme: CREDENTIAL_CONTINUITY_SCHEME,
        proof: "0".repeat(64),
      },
    });
    const weakGatewayPlan = await createPlan(planInput);
    assert.equal(weakGatewayPlan.credentials.actions.provider, "preserve");
    assert.equal(weakGatewayPlan.credentials.actions.gateway, "preserve");
    await assert.rejects(
      consumePlan({
        approval: weakGatewayPlan.planId,
        command: "apply",
        host,
        now,
        paths,
        plan: weakGatewayPlan,
      }),
      (error) => error.code === "rollback_receipt_drift",
    );
    assert.equal(await readSecret(paths.providerSecret, host, "provider"), providerValue);
    assert.equal(await fs.promises.readFile(paths.gatewaySecret, "utf8"), weakGateway);

    const malformedProvider = "malformed-provider-value\n";
    const validGateway = gatewayCredential("b");
    await protectedFile(paths.providerSecret, malformedProvider, host);
    await protectedFile(paths.gatewaySecret, validGateway, host);
    await writeCompletedRollbackReceipt(paths, host, now + 1, {
      credentialContinuity: {
        scheme: CREDENTIAL_CONTINUITY_SCHEME,
        proof: "1".repeat(64),
      },
    });
    const malformedProviderPlan = await createPlan({ ...planInput, now: now + 1 });
    await assert.rejects(
      consumePlan({
        approval: malformedProviderPlan.planId,
        command: "apply",
        host,
        now: now + 1,
        paths,
        plan: malformedProviderPlan,
      }),
      (error) => error.code === "rollback_receipt_drift",
    );
    assert.equal(await fs.promises.readFile(paths.providerSecret, "utf8"), malformedProvider);
    assert.equal(await readGatewaySecret(paths.gatewaySecret, host), validGateway);
    assert.equal((await inspectPath(paths.manifest, { hash: false })).kind, "absent");
    assert.equal((await inspectPath(paths.venvRoot, { hash: false })).kind, "absent");
    assert.equal((await inspectPath(paths.gatewayConfig, { hash: false })).kind, "absent");
  });
});

test("rotation guard defers only the selected ACL repair target", async () => {
  await temporaryDirectory("hetzner-rotation-acl", async (root) => {
    const host = actualHost(root);
    const paths = managedPaths(host);
    await protectedFile(paths.providerSecret, "provider-acl-fixture", host);
    const gateway = await protectedFile(paths.gatewaySecret, gatewayCredential("w"), host);
    const observations = await offlineObservations(paths);
    const checks = [];
    const guard = new MutationGuard({
      host,
      paths,
      plan: {
        desiredFiles: {},
        operations: [],
        rotation: { credential: "gateway" },
        state: { observations },
        workflow: "rotate",
      },
      verifyCredentialPermissions: async (target) => {
        checks.push(target);
        if (target === paths.gatewaySecret) {
          const error = new Error("simulated broad Windows ACL");
          error.code = "windows_acl_broad";
          throw error;
        }
      },
    });
    await guard.check();
    await guard.check();
    assert.deepEqual(checks, [paths.providerSecret]);
    guard.markSecret(paths.gatewaySecret, gateway.sha256);
    await assert.rejects(guard.check(), (error) => error.code === "windows_acl_broad");
  });
});

test("caller-owned credential files allow exactly one opted-in trailing newline", async () => {
  await runnerTemporaryDirectory("hetzner-credential-newline", async (root) => {
    const host = actualHost(root);
    const target = path.join(root, "caller-credential");
    for (const suffix of ["", "\n", "\r\n"]) {
      await protectedFile(target, `caller-token${suffix}`, host);
      assert.equal(
        readProtectedSecret(target, "caller credential", { allowTrailingNewline: true }),
        "caller-token",
      );
      assert.equal(await fs.promises.readFile(target, "utf8"), `caller-token${suffix}`);
      if (suffix) assert.throws(() => readProtectedSecret(target), /malformed/);
    }
    for (const value of [
      "caller-token\n\n",
      "caller-token\r\n\r\n",
      "caller\ntoken\n",
      " caller-token\n",
      "caller-token \n",
      "\n",
      "caller-token\r",
    ]) {
      await protectedFile(target, value, host);
      assert.throws(
        () => readProtectedSecret(target, "caller credential", { allowTrailingNewline: true }),
        /malformed/,
      );
    }
    await protectedFile(target, `sk-${"a".repeat(43)}\n`, host);
    assert.throws(
      () => readProtectedGatewaySecret(target, "managed key", { allowTrailingNewline: true }),
      /malformed/,
    );
  });
});

test("gateway-only namespace ignores an unrelated Codex parent while selected Codex fails closed", async () => {
  await temporaryDirectory("hetzner-optional-codex", async (root) => {
    const host = actualHost(root);
    const paths = managedPaths(host);
    const codexParent = path.dirname(paths.codexProfile);
    await protectedDirectory(codexParent, host, { external: true });
    if (process.platform === "win32")
      replaceWindowsAclWithReadAndInheritOnlyFullControl(codexParent);
    else await fs.promises.chmod(codexParent, 0o777);
    const gatewayFindings = await managedNamespaceFindings(paths, {
      host,
      manifest: { clients: [], artifacts: [], backups: [] },
      staticTargets: [],
    });
    assert.deepEqual(gatewayFindings, []);
    const codexFindings = await managedNamespaceFindings(paths, {
      host,
      staticTargets: [paths.codexProfile],
    });
    assert.ok(
      codexFindings.some(
        (finding) =>
          finding.code === "external_parent_protection_invalid" && finding.path === codexParent,
      ),
    );
    await secureDirectoryPermissions(codexParent, host, { external: true });
  });
});

test("atomic files, protected directories, and nested namespace checks fail closed", async (context) => {
  await temporaryDirectory("hetzner-files", async (root) => {
    const host = actualHost(root);
    const paths = managedPaths(host);
    await protectedDirectory(paths.configRoot, host);
    await protectedDirectory(paths.binDir, host);
    await protectedFile(paths.credentialHelper, "export const ok = true;\n", host, 0o700);
    const state = await inspectPath(paths.credentialHelper);
    assert.equal(state.kind, "file");
    if (process.platform !== "win32") assert.equal(state.mode, 0o700);

    await protectedFile(path.join(paths.binDir, "unexpected.txt"), "unexpected\n", host);
    const findings = await managedNamespaceFindings(paths, {
      host,
      staticTargets: [paths.credentialHelper],
    });
    assert.ok(findings.some((finding) => finding.code === "unexpected_managed_entry"));

    if (process.platform === "win32") {
      context.diagnostic("symlink path test is skipped on Windows runners without developer mode");
      return;
    }
    const target = path.join(root, "real");
    const redirected = path.join(root, "redirected");
    await fs.promises.mkdir(target);
    await fs.promises.symlink(target, redirected);
    await assert.rejects(assertNoLinkSegments(path.join(redirected, "file")));
  });
});

test("atomic publication rejects parent directory replacement without redirecting data", async () => {
  await temporaryDirectory("hetzner-parent-swap", async (root) => {
    const parent = path.join(root, "managed-parent");
    const displaced = path.join(root, "managed-parent-displaced");
    const redirected = path.join(root, "redirected-parent");
    const target = path.join(parent, "credential");
    const secret = "parent-swap-secret-must-stay-out-of-redirect";
    let parentMoved = false;
    await fs.promises.mkdir(parent);
    await fs.promises.mkdir(redirected);

    await assert.rejects(
      atomicWrite(target, secret, {
        afterDirectoryBind: async () => {
          await fs.promises.rename(parent, displaced);
          parentMoved = true;
          await fs.promises.symlink(
            redirected,
            parent,
            process.platform === "win32" ? "junction" : "dir",
          );
        },
        changedCode: "concurrent_secret_change",
        expected: { kind: "absent" },
        label: "Credential",
      }),
      (error) => error.code === "concurrent_secret_change",
    );
    assert.equal(
      (await inspectPath(path.join(redirected, "credential"), { hash: false })).kind,
      "absent",
    );
    const redirectedEntries = await fs.promises.readdir(redirected);
    assert.deepEqual(redirectedEntries, []);
    const retainedParent = parentMoved ? displaced : parent;
    const displacedEntries = await fs.promises.readdir(retainedParent);
    for (const name of displacedEntries) {
      const candidate = path.join(retainedParent, name);
      const state = await inspectPath(candidate, { hash: false });
      if (state.kind === "file") {
        assert.doesNotMatch(await fs.promises.readFile(candidate, "utf8"), new RegExp(secret));
      }
    }
  });
});

test("atomic no-replace publication rejects a last-boundary parent redirect", async () => {
  await temporaryDirectory("hetzner-parent-publication-swap", async (root) => {
    const parent = path.join(root, "managed-parent");
    const displaced = path.join(root, "managed-parent-displaced");
    const redirected = path.join(root, "redirected-parent");
    const target = path.join(parent, "credential");
    const secret = "publication-swap-secret-must-stay-out-of-redirect";
    await fs.promises.mkdir(parent);
    await fs.promises.mkdir(redirected);

    await assert.rejects(
      atomicWrite(target, secret, {
        beforePublish: async () => {
          await fs.promises.rename(parent, displaced);
          await fs.promises.symlink(
            redirected,
            parent,
            process.platform === "win32" ? "junction" : "dir",
          );
        },
        changedCode: "concurrent_secret_change",
        expected: { kind: "absent" },
        label: "Credential",
      }),
      (error) => error.code === "concurrent_secret_change",
    );
    assert.equal(
      (await inspectPath(path.join(redirected, "credential"), { hash: false })).kind,
      "absent",
    );
    assert.deepEqual(await fs.promises.readdir(redirected), []);
  });
});

test("orchestrator and standalone runner preserve atomic-publication parity", async () => {
  await runnerTemporaryDirectory("hetzner-publication-parity", async (root) => {
    const host = process.platform === "win32" ? detectHost() : actualHost(root);
    const implementations = [
      {
        name: "orchestrator",
        async write(target, value, options) {
          return await atomicWriteJson(target, value, {
            ...options,
            beforeRename: async (temporary, binding) => {
              await securePathPermissions(temporary, host, 0o600, {
                expectedIdentity: binding.identity,
              });
            },
            mode: 0o600,
          });
        },
      },
      {
        name: "standalone-runner",
        async write(target, value, options) {
          return runnerAtomicJson(target, value, options);
        },
      },
    ];

    for (const implementation of implementations) {
      const target = path.join(root, implementation.name, "receipt.json");
      await protectedDirectory(path.dirname(target), host);
      const first = await implementation.write(
        target,
        { generation: 1 },
        { expected: { kind: "absent" }, label: `${implementation.name} receipt` },
      );
      assert.deepEqual(await readJson(target), { generation: 1 }, implementation.name);
      const second = await implementation.write(
        target,
        { generation: 2 },
        { expected: first, label: `${implementation.name} receipt` },
      );
      assert.deepEqual(await readJson(target), { generation: 2 }, implementation.name);
      assert.notEqual(second.sha256, first.sha256, implementation.name);

      await fs.promises.unlink(target);
      const concurrent = { generation: "concurrent" };
      await assert.rejects(
        implementation.write(
          target,
          { generation: 3 },
          {
            beforePublish() {
              fs.writeFileSync(target, stableJson(concurrent), { mode: 0o600 });
            },
            expected: { kind: "absent" },
            label: `${implementation.name} receipt`,
          },
        ),
        implementation.name,
      );
      assert.deepEqual(await readJson(target), concurrent, implementation.name);

      await fs.promises.unlink(target);
      const staleExpected = await implementation.write(
        target,
        { generation: "same-content" },
        { expected: { kind: "absent" }, label: `${implementation.name} receipt` },
      );
      const sameContent = await fs.promises.readFile(target);
      await fs.promises.unlink(target);
      await fs.promises.writeFile(target, sameContent, { mode: 0o600 });
      await assert.rejects(
        implementation.write(
          target,
          { generation: "must-not-replace-new-inode" },
          { expected: staleExpected, label: `${implementation.name} receipt` },
        ),
        implementation.name,
      );
      assert.deepEqual(await fs.promises.readFile(target), sameContent, implementation.name);

      await fs.promises.unlink(target);
      const claimedExpected = await implementation.write(
        target,
        { generation: "claimed-original" },
        { expected: { kind: "absent" }, label: `${implementation.name} receipt` },
      );
      const postClaimReplacement = { generation: "post-claim-replacement" };
      let retainedClaim = null;
      await assert.rejects(
        implementation.write(
          target,
          { generation: "must-not-win-after-claim" },
          {
            afterClaim({ quarantine }) {
              retainedClaim = quarantine;
              fs.writeFileSync(target, stableJson(postClaimReplacement), { mode: 0o600 });
            },
            expected: claimedExpected,
            label: `${implementation.name} receipt`,
          },
        ),
        implementation.name,
      );
      assert.deepEqual(await readJson(target), postClaimReplacement, implementation.name);
      assert.ok(retainedClaim, implementation.name);
      assert.deepEqual(
        await readJson(retainedClaim),
        { generation: "claimed-original" },
        implementation.name,
      );
      await fs.promises.unlink(retainedClaim);
    }
  });
});

test("cleanup claims delete only owned file, tree, and process-state objects", async () => {
  await temporaryDirectory("hetzner-cleanup-claims", async (root) => {
    const absentTarget = path.join(root, "absent-publication");
    await assert.rejects(
      atomicWrite(absentTarget, "owned publication\n", {
        beforePublish: async ({ target }) => {
          await fs.promises.writeFile(target, "concurrent absent-target writer\n");
        },
        expected: { kind: "absent" },
      }),
      (error) => error.code === "atomic_target_changed",
    );
    assert.equal(
      await fs.promises.readFile(absentTarget, "utf8"),
      "concurrent absent-target writer\n",
    );

    const restoreTarget = path.join(root, "restore-target");
    const restoreBackup = path.join(root, "restore-backup");
    await atomicWrite(restoreTarget, "transaction value\n");
    await atomicWrite(restoreBackup, "prior value\n");
    const restoreTargetState = await inspectPath(restoreTarget);
    const restoreBackupState = await inspectPath(restoreBackup);
    let restoreQuarantine;
    await assert.rejects(
      restoreFileFromOwnedBackup(
        restoreTarget,
        restoreTargetState.sha256,
        restoreBackup,
        restoreBackupState.sha256,
        {
          afterClaim: async ({ quarantine, target }) => {
            restoreQuarantine = quarantine;
            await fs.promises.writeFile(target, "concurrent restore replacement\n");
          },
          targetChangedCode: "static_cleanup_target_changed",
        },
      ),
      (error) =>
        error.code === "static_cleanup_target_changed" &&
        error.details.quarantinePath === restoreQuarantine,
    );
    assert.equal(
      await fs.promises.readFile(restoreTarget, "utf8"),
      "concurrent restore replacement\n",
    );
    assert.equal(await fs.promises.readFile(restoreQuarantine, "utf8"), "transaction value\n");
    assert.equal(await fs.promises.readFile(restoreBackup, "utf8"), "prior value\n");

    const host = actualHost(root);
    const paths = managedPaths(host);
    await protectedDirectory(paths.stateRoot, host);
    const startedToken = "c".repeat(64);
    const priorToken = "d".repeat(64);
    const concurrentToken = "e".repeat(64);
    await protectedFile(paths.processReceipt, stableJson({ processToken: startedToken }), host);
    await protectedFile(paths.processStopRequest, stableJson({ processToken: startedToken }), host);
    await assert.rejects(
      restorePriorProcessReceipt(
        paths,
        host,
        startedToken,
        { processToken: priorToken },
        async ({ target }) => {
          await protectedFile(target, stableJson({ processToken: concurrentToken }), host);
        },
      ),
      (error) => error.code === "process_cleanup_unsafe",
    );
    assert.equal((await readJson(paths.processReceipt)).processToken, concurrentToken);
    assert.equal((await inspectPath(paths.processStopRequest, { hash: false })).kind, "absent");
    await protectedDirectory(path.dirname(paths.codexProfile), host, { external: true });
    const externalQuarantine = path.join(
      path.dirname(paths.codexProfile),
      `.${path.basename(paths.codexProfile)}.123.fixture.quarantine`,
    );
    await protectedFile(externalQuarantine, "preserved profile claim\n", host);
    const residualStatus = await installationStatus(host, paths);
    assert.ok(
      residualStatus.drift.findings.some(
        (finding) =>
          finding.code === "managed_quarantine_recovery_required" &&
          finding.path === externalQuarantine,
      ),
    );

    const fileTarget = path.join(root, "owned-file");
    await atomicWrite(fileTarget, "owned file\n");
    const fileState = await inspectPath(fileTarget);
    let fileQuarantine;
    await removeFileIfOwned(fileTarget, fileState.sha256, {
      afterClaim: async ({ quarantine, target }) => {
        fileQuarantine = quarantine;
        await atomicWrite(target, "concurrent replacement\n");
      },
    });
    assert.equal(await fs.promises.readFile(fileTarget, "utf8"), "concurrent replacement\n");
    assert.equal((await inspectPath(fileQuarantine, { hash: false })).kind, "absent");

    const treeTarget = path.join(root, "owned-tree");
    await fs.promises.mkdir(treeTarget);
    await fs.promises.writeFile(path.join(treeTarget, "owned.txt"), "owned tree\n");
    const tree = await inventoryTree(treeTarget, { allowSymlinks: true });
    await removeTreeIfOwned(treeTarget, tree.digest, {
      afterClaim: async ({ target }) => {
        await fs.promises.mkdir(target);
        await fs.promises.writeFile(path.join(target, "replacement.txt"), "replacement tree\n");
      },
    });
    assert.equal(
      await fs.promises.readFile(path.join(treeTarget, "replacement.txt"), "utf8"),
      "replacement tree\n",
    );

    const processTarget = path.join(root, "process-state.json");
    const ownedToken = "a".repeat(64);
    const replacementToken = "b".repeat(64);
    await atomicWriteJson(processTarget, { processToken: ownedToken });
    await removeJsonFileIfOwned(
      processTarget,
      (value) => {
        if (value.processToken !== ownedToken) {
          throw new SetupError("process_state_not_owned", "process state token changed");
        }
      },
      {
        afterClaim: async ({ target }) => {
          await atomicWriteJson(target, { processToken: replacementToken });
        },
        changedCode: "process_state_not_owned",
      },
    );
    assert.equal((await readJson(processTarget)).processToken, replacementToken);

    const stopRequest = path.join(root, "runner-stop.json");
    fs.writeFileSync(stopRequest, stableJson(stopRequestFor(ownedToken)));
    removeTokenBoundStopRequest(stopRequest, ownedToken, {
      afterClaim: ({ target }) => {
        fs.writeFileSync(target, stableJson({ processToken: replacementToken }));
      },
    });
    assert.equal(JSON.parse(fs.readFileSync(stopRequest, "utf8")).processToken, replacementToken);

    const tamperedStopRequest = path.join(root, "runner-stop-tampered.json");
    fs.writeFileSync(tamperedStopRequest, stableJson(stopRequestFor(ownedToken)));
    let stopRequestQuarantine;
    assert.throws(
      () =>
        removeTokenBoundStopRequest(tamperedStopRequest, ownedToken, {
          afterClaim: ({ quarantine }) => {
            stopRequestQuarantine = quarantine;
            const request = JSON.parse(fs.readFileSync(quarantine, "utf8"));
            fs.writeFileSync(quarantine, stableJson({ ...request, unexpected: true }));
          },
        }),
      (error) => error.details?.quarantinePath === stopRequestQuarantine,
    );
    assert.equal(JSON.parse(fs.readFileSync(stopRequestQuarantine, "utf8")).unexpected, true);

    const contestedTarget = path.join(root, "contested-file");
    await atomicWrite(contestedTarget, "owned before claim\n");
    const contestedState = await inspectPath(contestedTarget);
    let preservedClaim;
    await assert.rejects(
      removeFileIfOwned(contestedTarget, contestedState.sha256, {
        beforeClaim: async ({ quarantine, target }) => {
          preservedClaim = quarantine;
          await atomicWrite(target, "replacement before claim\n");
        },
      }),
      (error) => error.code === "owned_path_changed" && error.details.claimedPathPreserved,
    );
    assert.equal((await inspectPath(contestedTarget, { hash: false })).kind, "absent");
    assert.equal(await fs.promises.readFile(preservedClaim, "utf8"), "replacement before claim\n");
  });
});

test("setup planning is offline, bounded, and structurally validated", async () => {
  let uncDriveClassifierCalled = false;
  assert.throws(
    () =>
      assertExternalProtectedDirectoryPath("\\\\server\\share\\.codex", {
        platform: "win32",
      }),
    (error) => error.code === "windows_external_parent_not_local",
  );
  await assert.rejects(
    preflightExternalProtectedDirectory(
      "\\\\server\\share\\.codex",
      { platform: "win32" },
      {
        windowsDriveType: async () => {
          uncDriveClassifierCalled = true;
          return "Network";
        },
      },
    ),
    (error) => error.code === "windows_external_parent_not_local",
  );
  assert.equal(uncDriveClassifierCalled, false);
  let mappedDriveClassifierCalled = false;
  await assert.rejects(
    preflightExternalProtectedDirectory(
      "Z:\\.codex",
      { platform: "win32" },
      {
        windowsDriveType: async (root) => {
          mappedDriveClassifierCalled = true;
          assert.equal(root, "Z:\\");
          return "Network";
        },
      },
    ),
    (error) =>
      error.code === "windows_external_parent_not_local" && error.details.driveType === "Network",
  );
  assert.equal(mappedDriveClassifierCalled, true);
  await assert.rejects(
    inspectProtectedDirectoryBoundary(
      "\\\\server\\share\\.codex",
      { platform: "win32" },
      { external: true },
    ),
    (error) => error.code === "windows_external_parent_not_local",
  );
  await temporaryDirectory("hetzner-plan", async (root) => {
    if (process.platform === "win32") {
      const uncHost = detectHost({
        env: {
          ...process.env,
          CODEX_HOME: "\\\\server\\share\\.codex",
          LOCALAPPDATA: path.join(root, "unc-local-app-data"),
        },
        home: path.join(root, "unc-home"),
        platform: "win32",
      });
      const uncPaths = managedPaths(uncHost);
      let uncTargetIo = 0;
      const originalLstat = fs.promises.lstat;
      fs.promises.lstat = async (target, ...args) => {
        if (String(target).startsWith("\\\\")) uncTargetIo += 1;
        return await originalLstat.call(fs.promises, target, ...args);
      };
      try {
        await assert.rejects(
          createPlan({
            host: uncHost,
            options: { clients: ["codex"], workflow: "setup" },
            paths: uncPaths,
          }),
          (error) => error.code === "windows_external_parent_not_local",
        );
        await assert.rejects(
          installationStatus(uncHost, uncPaths),
          (error) => error.code === "windows_external_parent_not_local",
        );
        await assert.rejects(
          verifyManifest(
            uncPaths,
            {
              artifacts: [{ path: uncPaths.codexProfile }],
              backups: [],
            },
            uncHost,
          ),
          (error) => error.code === "windows_external_parent_not_local",
        );
      } finally {
        fs.promises.lstat = originalLstat;
      }
      assert.equal(uncTargetIo, 0);

      const mappedHost = detectHost({
        env: {
          ...process.env,
          CODEX_HOME: "Z:\\.codex",
          LOCALAPPDATA: path.join(root, "mapped-local-app-data"),
        },
        home: path.join(root, "mapped-home"),
        platform: "win32",
      });
      const mappedPaths = managedPaths(mappedHost);
      let mappedTargetIo = 0;
      fs.promises.lstat = async (target, ...args) => {
        if (String(target).toUpperCase().startsWith("Z:\\")) mappedTargetIo += 1;
        return await originalLstat.call(fs.promises, target, ...args);
      };
      try {
        await assert.rejects(
          installationStatus(mappedHost, mappedPaths, Date.now(), {
            windowsDriveType: async () => "Network",
          }),
          (error) => error.code === "windows_external_parent_not_local",
        );
      } finally {
        fs.promises.lstat = originalLstat;
      }
      assert.equal(mappedTargetIo, 0);
    }
    const host = actualHost(root);
    const paths = managedPaths(host);
    const evidencePath = path.join(root, "provider-discovery.json");
    const now = Date.now();
    await fs.promises.writeFile(evidencePath, stableJson(discoveryEvidence(now)));
    const plan = await createPlan({
      host,
      now,
      options: {
        clients: ["cursor"],
        discoveryEvidence: evidencePath,
        model: "example-model",
        workflow: "setup",
      },
      paths,
    });
    assert.equal(plan.litellm.version, LITELLM_PIN);
    assert.deepEqual(plan.litellm.runtimeDependencies, ["fastapi==0.136.3", "starlette==1.3.1"]);
    for (const dependencies of [
      undefined,
      [],
      ["fastapi==0.137.0", "starlette==1.3.1"],
      [...LITELLM_RUNTIME_DEPENDENCIES, "unapproved-package==1.0.0"],
    ]) {
      const changed = structuredClone(plan);
      changed.litellm.runtimeDependencies = dependencies;
      if (dependencies === undefined) delete changed.litellm.runtimeDependencies;
      changed.planId = digestJson(withoutKeys(changed, ["planId"]));
      assert.throws(
        () => validatePlanDocument(changed, { command: "apply", host, now, paths }),
        (error) => error.code === "plan_runtime_mismatch",
      );
    }
    assert.equal(plan.port, 4000);
    assert.deepEqual(plan.clients, ["cursor"]);
    assert.ok(plan.requiredApprovals.includes("install-exact-litellm-pin"));
    assert.equal((await inspectPath(paths.configRoot, { hash: false })).kind, "absent");
    assert.equal((await inspectPath(paths.stateRoot, { hash: false })).kind, "absent");
    validatePlanDocument(plan, { command: "apply", host, now, paths });

    const gatewayOnlyPlan = await createPlan({
      host,
      now,
      options: { discoveryEvidence: evidencePath, model: "example-model", workflow: "setup" },
      paths,
    });
    assert.deepEqual(gatewayOnlyPlan.clients, []);
    assert.equal(gatewayOnlyPlan.executables.codex.path, null);
    assert.equal(gatewayOnlyPlan.executables["claude-code"].path, null);
    assert.equal(gatewayOnlyPlan.desiredFiles[paths.codexProfile], undefined);
    assert.equal(gatewayOnlyPlan.desiredFiles[paths.claudeLauncher], undefined);
    validatePlanDocument(gatewayOnlyPlan, { command: "apply", host, now, paths });

    const codex = await fakeVersionedExecutable(root, "fake-codex-parent", "codex-cli 0.154.0");
    const codexOptions = {
      clients: ["codex"],
      discoveryEvidence: evidencePath,
      executables: { codex },
      model: "example-model",
      workflow: "setup",
    };
    const codexParent = path.dirname(paths.codexProfile);
    await assert.rejects(
      createPlan({ host, now, options: codexOptions, paths }),
      (error) => error.code === "external_parent_required",
    );
    assert.equal((await inspectPath(codexParent, { hash: false })).kind, "absent");
    await protectedDirectory(codexParent, host, { external: true });
    const codexPlan = await createPlan({ host, now, options: codexOptions, paths });
    validatePlanDocument(codexPlan, { command: "apply", host, now, paths });
    assert.equal(codexPlan.state.observations[codexParent].kind, "directory");
    assert.deepEqual(Object.keys(codexPlan.state.observations[codexParent]).sort(), [
      "identity",
      "kind",
      "mode",
      "protection",
    ]);
    assert.deepEqual(Object.keys(codexPlan.state.observations[codexParent].identity).sort(), [
      "birthtimeNs",
      "dev",
      "ino",
    ]);
    assert.equal(
      codexPlan.state.observations[codexParent].protection.kind,
      process.platform === "win32" ? "windows-acl" : "posix-owner",
    );
    if (process.platform === "win32") {
      assert.equal(host.codexHome, path.join(root, "home", ".codex"));
      assert.notEqual(path.dirname(host.codexHome), host.localBoundary);
      assert.equal(codexPlan.state.observations[codexParent].protection.protected, true);
      assert.ok(
        codexPlan.state.observations[codexParent].protection.access.every((entry) =>
          [entry.inheritanceFlags, entry.propagationFlags, entry.rights].every((value) =>
            /^\d+$/.test(value),
          ),
        ),
      );
    }
    const codexGuard = new MutationGuard({ host, paths, plan: codexPlan });
    await codexGuard.check();
    if (process.platform === "win32") {
      const whoami = path.join(process.env.SystemRoot, "System32", "whoami.exe");
      const identityResult = spawnSync(whoami, ["/user", "/fo", "csv", "/nh"], {
        encoding: "utf8",
        windowsHide: true,
      });
      assert.equal(identityResult.status, 0, identityResult.stderr);
      const identity = parseWhoamiCsv(identityResult.stdout);
      const icacls = path.join(process.env.SystemRoot, "System32", "icacls.exe");
      const restricted = spawnSync(
        icacls,
        [codexParent, "/inheritance:r", "/grant:r", `*${identity.sid}:(R)`],
        { encoding: "utf8", windowsHide: true },
      );
      assert.equal(restricted.status, 0, restricted.stderr);
      await assert.rejects(
        codexGuard.check(),
        (error) =>
          error.code === "stale_plan_external_parent" &&
          error.details.reason === "windows_acl_broad",
      );
      await secureDirectoryPermissions(codexParent, host, { external: true });
      await codexGuard.check();
      replaceWindowsAclWithReadAndInheritOnlyFullControl(codexParent);
      await assert.rejects(
        codexGuard.check(),
        (error) =>
          error.code === "stale_plan_external_parent" &&
          error.details.reason === "windows_acl_broad",
      );
      await secureDirectoryPermissions(codexParent, host, { external: true });
      await codexGuard.check();
    }
    await fs.promises.rename(codexParent, `${codexParent}.planned`);
    await protectedDirectory(codexParent, host, { external: true });
    await assert.rejects(
      codexGuard.check(),
      (error) => error.code === "stale_plan_external_parent",
    );
    assert.equal((await inspectPath(paths.codexProfile, { hash: false })).kind, "absent");

    const tampered = structuredClone(plan);
    tampered.desiredFiles[path.join(root, "outside.txt")] = {
      mode: 0o600,
      role: "outside",
      sha256: "0".repeat(64),
    };
    tampered.planId = digestJson(withoutKeys(tampered, ["planId"]));
    assert.throws(
      () => validatePlanDocument(tampered, { command: "apply", host, now, paths }),
      (error) => error.code === "plan_desired_targets_mismatch",
    );

    const tamperedOperation = structuredClone(plan);
    tamperedOperation.operations[0].action = "noop";
    tamperedOperation.planId = digestJson(withoutKeys(tamperedOperation, ["planId"]));
    assert.throws(
      () => validatePlanDocument(tamperedOperation, { command: "apply", host, now, paths }),
      (error) => error.code === "plan_operations_mismatch",
    );
  });
});

test("external parent identity blocks setup, failed-cleanup, and rollback replacement races", async () => {
  await temporaryDirectory("hetzner-external-parent-races", async (root) => {
    const host = actualHost(root);
    const paths = managedPaths(host);
    const target = paths.codexProfile;
    const parent = path.dirname(target);
    await protectedDirectory(paths.stateRoot, host);
    await protectedDirectory(parent, host, { external: true });
    const plannedParent = await inspectProtectedDirectoryBoundary(parent, host, { external: true });
    const setupGuard = new MutationGuard({
      host,
      paths,
      plan: {
        desiredFiles: { [target]: { mode: 0o600, role: "codex-profile", sha256: "0".repeat(64) } },
        operations: [],
        state: { observations: { [parent]: plannedParent } },
        workflow: "setup",
      },
    });
    const replaceParent = async (movedParent) => {
      await fs.promises.rename(parent, movedParent);
      await protectedDirectory(parent, host, { external: true });
    };
    const restoreParent = async (movedParent) => {
      await fs.promises.rmdir(parent);
      await fs.promises.rename(movedParent, parent);
    };

    const assertRecoveryRemovalFailsClosed = async (behavior) => {
      const content = `recovery-${behavior}\n`;
      await atomicWrite(target, content, setupGuard.externalParentOptions(target));
      const targetState = await inspectPath(target);
      let recoveryPath = null;
      let displacedRecovery = null;
      await assert.rejects(
        removeFileIfOwned(target, targetState.sha256, {
          ...setupGuard.externalParentOptions(target),
          beforeRecoveryRemove: async (recovery) => {
            recoveryPath = recovery.path;
            if (behavior === "replace") {
              displacedRecovery = `${recovery.path}.displaced`;
              await fs.promises.rename(recovery.path, displacedRecovery);
              await atomicWrite(recovery.path, content, { mode: recovery.mode });
              await securePathPermissions(recovery.path, host, recovery.mode);
              const replacement = await fs.promises.lstat(recovery.path, { bigint: true });
              assert.equal(
                ["birthtimeNs", "dev", "ino"].some(
                  (field) => replacement[field] !== recovery.identity[field],
                ),
                true,
              );
            } else if (behavior === "content") {
              await fs.promises.writeFile(recovery.path, `${content}changed\n`);
            } else if (behavior === "inherit-only") {
              replaceWindowsAclWithReadAndInheritOnlyFullControl(recovery.path);
            } else if (behavior === "protection" && process.platform === "win32") {
              const icacls = path.join(process.env.SystemRoot, "System32", "icacls.exe");
              const acl = spawnSync(icacls, [recovery.path, "/grant", "*S-1-1-0:(R)"], {
                encoding: "utf8",
                windowsHide: true,
              });
              assert.equal(acl.status, 0, acl.stderr);
            } else if (behavior === "protection") {
              await fs.promises.chmod(recovery.path, 0o644);
            } else {
              await fs.promises.unlink(recovery.path);
            }
          },
        }),
        (error) =>
          error.code === "recovery_claim_changed" &&
          !Object.hasOwn(error.details ?? {}, "claimedPathPreserved") &&
          !Object.hasOwn(error.details ?? {}, "quarantinePath"),
      );
      assert.equal((await inspectPath(target, { hash: false })).kind, "absent");
      assert.ok(recoveryPath);
      if (displacedRecovery) {
        assert.equal(await fs.promises.readFile(displacedRecovery, "utf8"), content);
      }
      for (const name of await fs.promises.readdir(paths.stateRoot)) {
        const candidate = path.join(paths.stateRoot, name);
        if (candidate === displacedRecovery || name.includes(path.basename(recoveryPath))) {
          await fs.promises.unlink(candidate);
        }
      }
    };
    await assertRecoveryRemovalFailsClosed("replace");
    await assertRecoveryRemovalFailsClosed("disappear");
    await assertRecoveryRemovalFailsClosed("content");
    await assertRecoveryRemovalFailsClosed("protection");
    if (process.platform === "win32") {
      await assertRecoveryRemovalFailsClosed("inherit-only");
    }

    const ownershipParent = `${parent}.ownership-planned`;
    let ownershipChecks = 0;
    await assert.rejects(
      atomicWrite(target, "must not reach a temp\n", {
        ...setupGuard.externalParentOptions(target),
        assertMutationOwned: async () => {
          ownershipChecks += 1;
          if (ownershipChecks === 2) await replaceParent(ownershipParent);
        },
        changedCode: "stale_plan_external_parent",
      }),
      (error) => error.code === "stale_plan_external_parent",
    );
    assert.equal(ownershipChecks >= 2, true);
    for (const directory of [parent, ownershipParent]) {
      assert.deepEqual(
        (await fs.promises.readdir(directory)).filter((name) => name.endsWith(".tmp")),
        [],
      );
    }
    await restoreParent(ownershipParent);

    const setupParent = `${parent}.setup-planned`;
    await assert.rejects(
      atomicWrite(target, "planned profile\n", {
        ...setupGuard.externalParentOptions(target),
        afterDirectoryBind: async () => await replaceParent(setupParent),
        changedCode: "stale_plan_external_parent",
      }),
      (error) => error.code === "stale_plan_external_parent",
    );
    assert.equal((await inspectPath(target, { hash: false })).kind, "absent");
    assert.equal(
      (await inspectPath(path.join(setupParent, path.basename(target)), { hash: false })).kind,
      "absent",
    );
    await restoreParent(setupParent);

    await atomicWrite(target, "planned profile\n", setupGuard.externalParentOptions(target));
    const installed = await inspectPath(target);
    const cleanupParent = `${parent}.cleanup-planned`;
    let cleanupQuarantine = null;
    let cleanupError = null;
    await assert.rejects(
      removeFileIfOwned(target, installed.sha256, {
        ...setupGuard.externalParentOptions(target),
        afterClaim: async ({ quarantine }) => {
          cleanupQuarantine = quarantine;
          await replaceParent(cleanupParent);
        },
        changedCode: "stale_plan_external_parent",
      }),
      (error) => {
        cleanupError = error;
        return (
          error.code === "stale_plan_external_parent" && error.details.claimedPathPreserved === true
        );
      },
    );
    assert.equal((await inspectPath(target, { hash: false })).kind, "absent");
    const claimedCleanup = path.join(cleanupParent, path.basename(cleanupQuarantine));
    assert.equal(await fs.promises.readFile(claimedCleanup, "utf8"), "planned profile\n");
    assert.notEqual(cleanupError.details.quarantinePath, cleanupQuarantine);
    assert.equal(
      await fs.promises.readFile(cleanupError.details.quarantinePath, "utf8"),
      "planned profile\n",
    );
    await verifyRestrictedFilePermissions(cleanupError.details.quarantinePath, host, 0o600);
    const recoveryStatus = await installationStatus(host, paths);
    assert.ok(
      recoveryStatus.drift.findings.some(
        (finding) =>
          finding.code === "managed_quarantine_recovery_required" &&
          finding.path === cleanupError.details.quarantinePath,
      ),
    );
    await fs.promises.unlink(cleanupError.details.quarantinePath);
    await restoreParent(cleanupParent);
    await fs.promises.rename(path.join(parent, path.basename(cleanupQuarantine)), target);

    const rollbackGuard = new MutationGuard({
      host,
      paths,
      plan: {
        desiredFiles: {},
        operations: [],
        rollback: { artifacts: [{ path: target, sha256: installed.sha256 }] },
        state: { observations: { [parent]: plannedParent } },
        workflow: "rollback",
      },
    });
    const rollbackParent = `${parent}.rollback-planned`;
    let rollbackQuarantine = null;
    let rollbackError = null;
    await assert.rejects(
      removeFileIfOwned(target, installed.sha256, {
        ...rollbackGuard.externalParentOptions(target),
        afterClaim: async ({ quarantine }) => {
          rollbackQuarantine = quarantine;
          await replaceParent(rollbackParent);
          await atomicWrite(target, "planned profile\n");
          await securePathPermissions(target, host, 0o600);
        },
        changedCode: "stale_plan_external_parent",
      }),
      (error) => {
        rollbackError = error;
        return (
          error.code === "stale_plan_external_parent" && error.details.claimedPathPreserved === true
        );
      },
    );
    assert.equal(await fs.promises.readFile(target, "utf8"), "planned profile\n");
    assert.equal(
      await fs.promises.readFile(
        path.join(rollbackParent, path.basename(rollbackQuarantine)),
        "utf8",
      ),
      "planned profile\n",
    );
    assert.equal(
      await fs.promises.readFile(rollbackError.details.quarantinePath, "utf8"),
      "planned profile\n",
    );
    assert.equal(path.dirname(rollbackError.details.quarantinePath), paths.stateRoot);
    await fs.promises.unlink(rollbackError.details.quarantinePath);
  });
});

test("setup preserves all transaction state when runner termination is unconfirmed", async () => {
  await temporaryDirectory("hetzner-unconfirmed-start", async (root) => {
    const host = actualHost(root);
    const paths = managedPaths(host);
    const python =
      process.platform === "win32"
        ? resolveExecutable("python", { platform: "win32" })
        : await fakePythonExecutable(root);
    assert.ok(python, "the Windows setup cleanup test requires hosted Python");
    const evidencePath = path.join(root, "discovery.json");
    const now = Date.now();
    await fs.promises.writeFile(evidencePath, stableJson(discoveryEvidence(now)));
    const plan = await createPlan({
      host,
      now,
      options: {
        clients: ["cursor"],
        discoveryEvidence: evidencePath,
        executables: { python },
        model: "example-model",
        startAfterApply: true,
        workflow: "setup",
      },
      paths,
    });
    const runtimeCommand = async (executable, args) => {
      if (executable === plan.executables.python.path && args[0] === "-m" && args[1] === "venv") {
        await fs.promises.mkdir(path.dirname(plan.litellm.python), { recursive: true });
        await fs.promises.writeFile(plan.litellm.python, "mock venv Python\n");
        await fs.promises.writeFile(plan.litellm.executable, "mock LiteLLM\n");
        if (process.platform !== "win32") {
          await fs.promises.chmod(plan.litellm.python, 0o700);
          await fs.promises.chmod(plan.litellm.executable, 0o700);
        }
        return { stdout: "", stderr: "" };
      }
      if (args.includes("install")) return { stdout: "", stderr: "" };
      if (args.includes("check")) return { stdout: "No broken requirements found.\n", stderr: "" };
      if (args.includes("freeze")) {
        return { stdout: `litellm==${LITELLM_PIN}\n`, stderr: "" };
      }
      if (executable === plan.litellm.executable && args[0] === "--version") {
        return { stdout: `LiteLLM ${LITELLM_PIN}\n`, stderr: "" };
      }
      throw new Error(`unexpected mocked runtime command: ${executable} ${args.join(" ")}`);
    };
    const providerValue = "provider-unconfirmed-start-fixture";
    const unconfirmedRunner = new EventEmitter();
    const runnerSignals = [];
    Object.assign(unconfirmedRunner, {
      exitCode: null,
      pid: 42_301,
      signalCode: null,
      kill(signal) {
        runnerSignals.push(signal);
        return true;
      },
      unref() {},
    });
    await assert.rejects(
      consumePlan({
        approval: plan.planId,
        command: "apply",
        host,
        now,
        paths,
        plan,
        providerCredential: providerValue,
        dependencies: {
          runCommand: runtimeCommand,
          startOwnedGateway: async (input) =>
            await startOwnedGateway(input, {
              delay: async () => {},
              loopbackPortOpen: async () => false,
              readProcessReceipt: async () => null,
              spawn() {
                queueMicrotask(() =>
                  unconfirmedRunner.emit("error", new Error("runner failed before receipt")),
                );
                return unconfirmedRunner;
              },
              stopTimeoutMs: 5,
              writeStopRequest: async () => {
                throw new SetupError(
                  "injected_stop_request_failure",
                  "injected stop-request write failure",
                );
              },
            }),
        },
      }),
      (error) =>
        error.code === "process_cleanup_requires_manual_recovery" && exitCodeFor(error) === 5,
    );
    assert.equal((await inspectPath(paths.manifest, { hash: false })).kind, "absent");
    assert.equal((await inspectPath(paths.venvRoot, { hash: false })).kind, "directory");
    assert.equal((await inspectPath(paths.gatewayConfig, { hash: false })).kind, "file");
    assert.equal((await inspectPath(paths.providerSecret, { hash: false })).kind, "file");
    assert.equal((await inspectPath(paths.gatewaySecret, { hash: false })).kind, "file");
    assert.equal(await readSecret(paths.providerSecret, host, "provider"), providerValue);
    assert.deepEqual(runnerSignals, ["SIGTERM"]);

    const status = await installationStatus(host, paths);
    assert.equal(status.installed, false);
    assert.equal(status.drift.ok, false);
    for (const target of [paths.venvRoot, paths.gatewayConfig, paths.providerSecret]) {
      assert.ok(
        status.drift.findings.some(
          (finding) => finding.code === "unowned_managed_residual" && finding.path === target,
        ),
        `missing no-manifest residual finding for ${target}`,
      );
    }
    const diagnosis = runSetupEntrypoint(root, ["diagnose"]);
    assert.equal(diagnosis.status, 0, diagnosis.stderr);
    const diagnosisDocument = JSON.parse(diagnosis.stdout);
    assert.equal(diagnosisDocument.ownershipAndDrift.drift.ok, false);
    assert.ok(
      diagnosisDocument.ownershipAndDrift.drift.findings.some(
        (finding) => finding.path === paths.gatewayConfig,
      ),
    );
  });
});

test("no-manifest status reports empty managed roots and sibling root quarantines", async () => {
  await temporaryDirectory("hetzner-root-residuals", async (root) => {
    const host = actualHost(root);
    const paths = managedPaths(host);
    const roots = [...new Set([paths.configRoot, paths.stateRoot])].sort();
    assert.equal(roots.length, process.platform === "linux" ? 2 : 1);
    for (const managedRoot of roots) await fs.promises.mkdir(managedRoot, { recursive: true });

    const emptyRootStatus = await installationStatus(host, paths);
    for (const managedRoot of roots) {
      assert.ok(
        emptyRootStatus.drift.findings.some(
          (finding) => finding.code === "unowned_managed_residual" && finding.path === managedRoot,
        ),
        `missing empty managed-root residual for ${managedRoot}`,
      );
    }

    for (const managedRoot of roots) await fs.promises.rmdir(managedRoot);
    const quarantines = [];
    for (const managedRoot of roots) {
      await fs.promises.mkdir(path.dirname(managedRoot), { recursive: true });
      const quarantine = path.join(
        path.dirname(managedRoot),
        `.${path.basename(managedRoot)}.123.fixture.quarantine`,
      );
      await fs.promises.mkdir(quarantine);
      quarantines.push(quarantine);
    }
    const quarantineStatus = await installationStatus(host, paths);
    for (const quarantine of quarantines) {
      assert.ok(
        quarantineStatus.drift.findings.some(
          (finding) =>
            finding.code === "managed_quarantine_recovery_required" && finding.path === quarantine,
        ),
        `missing managed-root quarantine finding for ${quarantine}`,
      );
    }
    const diagnosis = runSetupEntrypoint(root, ["diagnose"]);
    assert.equal(diagnosis.status, 0, diagnosis.stderr);
    const diagnosed = JSON.parse(diagnosis.stdout).ownershipAndDrift.drift.findings;
    for (const quarantine of quarantines) {
      assert.ok(diagnosed.some((finding) => finding.path === quarantine));
    }
  });
});

test("no-manifest status and diagnose do not inspect a profile below an invalid external parent", async () => {
  await temporaryDirectory("hetzner-no-manifest-external-parent", async (root) => {
    const env = isolatedHostEnvironment(root);
    const host = detectHost({
      env,
      home: path.join(root, "home"),
      platform: process.platform,
    });
    const paths = managedPaths(host);
    const codexParent = path.dirname(paths.codexProfile);
    await protectedDirectory(codexParent, host, { external: true });
    if (process.platform === "win32") {
      replaceWindowsAclWithReadAndInheritOnlyFullControl(codexParent);
    } else {
      await fs.promises.chmod(codexParent, 0o777);
    }

    let profileReads = 0;
    const originalLstat = fs.promises.lstat;
    fs.promises.lstat = async (target, ...args) => {
      if (path.resolve(String(target)) === path.resolve(paths.codexProfile)) profileReads += 1;
      return await originalLstat.call(fs.promises, target, ...args);
    };
    try {
      const status = await installationStatus(host, paths);
      assert.ok(
        status.drift.findings.some(
          (finding) =>
            finding.code === "external_parent_protection_invalid" && finding.path === codexParent,
        ),
      );
    } finally {
      fs.promises.lstat = originalLstat;
    }
    assert.equal(profileReads, 0);

    const diagnosis = runSetupEntrypoint(root, ["diagnose"]);
    assert.equal(diagnosis.status, 0, diagnosis.stderr);
    const findings = JSON.parse(diagnosis.stdout).ownershipAndDrift.drift.findings;
    assert.ok(
      findings.some(
        (finding) =>
          finding.code === "external_parent_protection_invalid" && finding.path === codexParent,
      ),
    );
    await secureDirectoryPermissions(codexParent, host, { external: true });
  });
});

test("mocked runtime setup, add-client, repair, rotation, and rollback preserve mutation boundaries", async () => {
  await temporaryDirectory("hetzner-mutations", async (root) => {
    const host = actualHost(root);
    const paths = managedPaths(host);
    const python =
      process.platform === "win32"
        ? resolveExecutable("python", { platform: "win32" })
        : await fakePythonExecutable(root);
    assert.ok(python, "the Windows mutation matrix requires its hosted Python executable");
    assert.match(await captureVersion(python), /^Python 3\.(?:1[0-4])\./);
    const codex = await fakeVersionedExecutable(root, "fake-codex", "codex-cli 0.154.0");
    const evidencePath = path.join(root, "discovery.json");
    const now = Date.now();
    await fs.promises.writeFile(evidencePath, stableJson(discoveryEvidence(now)));

    const unrelatedCodexParent = path.dirname(paths.codexProfile);
    await protectedDirectory(unrelatedCodexParent, host, { external: true });
    if (process.platform === "win32")
      replaceWindowsAclWithReadAndInheritOnlyFullControl(unrelatedCodexParent);
    else await fs.promises.chmod(unrelatedCodexParent, 0o777);

    const setupPlan = await createPlan({
      host,
      now,
      options: {
        clients: [],
        discoveryEvidence: evidencePath,
        executables: { python },
        model: "example-model",
        workflow: "setup",
      },
      paths,
    });
    const runtimeSteps = [];
    const runtimeCommand = async (executable, args) => {
      if (
        executable === setupPlan.executables.python.path &&
        args[0] === "-m" &&
        args[1] === "venv" &&
        args[2] === "--copies" &&
        args[3] === paths.venvRoot
      ) {
        await fs.promises.mkdir(path.dirname(setupPlan.litellm.python), { recursive: true });
        await fs.promises.writeFile(setupPlan.litellm.python, "mock venv Python\n");
        await fs.promises.writeFile(setupPlan.litellm.executable, "mock LiteLLM\n");
        if (process.platform !== "win32") {
          await fs.promises.chmod(setupPlan.litellm.python, 0o700);
          await fs.promises.chmod(setupPlan.litellm.executable, 0o700);
        }
        return { stdout: "", stderr: "" };
      }
      if (args.includes("check")) {
        runtimeSteps.push("check");
        assert.equal(executable, setupPlan.litellm.python);
        return { stdout: "No broken requirements found.\n", stderr: "" };
      }
      if (args.includes("freeze")) {
        runtimeSteps.push("freeze");
        return { stdout: `litellm==${LITELLM_PIN}\n`, stderr: "" };
      }
      if (executable === setupPlan.litellm.executable && args[0] === "--version") {
        runtimeSteps.push("version");
        return { stdout: `LiteLLM ${LITELLM_PIN}\n`, stderr: "" };
      }
      if (executable === setupPlan.litellm.python && args.includes("install")) {
        runtimeSteps.push("install");
        assert.deepEqual(args.slice(-3), [
          `litellm[proxy]==${LITELLM_PIN}`,
          ...LITELLM_RUNTIME_DEPENDENCIES,
        ]);
        return { stdout: "", stderr: "" };
      }
      throw new Error(`unexpected mocked runtime command: ${executable} ${args.join(" ")}`);
    };

    await assert.rejects(
      consumePlan({
        approval: setupPlan.planId,
        command: "apply",
        host,
        now,
        paths,
        plan: setupPlan,
        dependencies: {
          beforeRuntimeCleanup: async () => {
            await fs.promises.writeFile(path.join(paths.venvRoot, "concurrent.txt"), "foreign\n");
          },
          runCommand: async (executable, args) => {
            if (args.includes("install")) throw new Error("injected package-install failure");
            return await runtimeCommand(executable, args);
          },
        },
      }),
      (error) => error.code === "owned_tree_changed",
    );
    assert.equal((await inspectPath(paths.venvRoot, { hash: false })).kind, "directory");
    assert.equal(
      (await inspectPath(path.join(paths.venvRoot, "concurrent.txt"), { hash: false })).kind,
      "file",
    );
    await fs.promises.rm(paths.venvRoot, { recursive: true, force: false });
    await fs.promises.rmdir(paths.runtimeRoot);
    await fs.promises.rmdir(paths.stateRoot);

    const providerValue = "provider-mutation-fixture";
    const setup = await consumePlan({
      approval: setupPlan.planId,
      command: "apply",
      host,
      now,
      paths,
      plan: setupPlan,
      providerCredential: providerValue,
      dependencies: { runCommand: runtimeCommand },
    });
    assert.equal(setup.changed, true);
    assert.deepEqual(runtimeSteps, ["install", "check", "freeze", "version"]);
    let manifest = await loadManifest(paths, { required: true });
    assert.equal(manifest.runtime.litellmVersion, LITELLM_PIN);
    assert.ok(manifest.runtime.packages.includes(`litellm==${LITELLM_PIN}`));
    assert.equal(await readSecret(paths.providerSecret, host, "provider"), providerValue);
    assert.equal((await verifyManifest(paths, manifest, host)).ok, true);

    assert.equal((await installationStatus(host, paths)).drift.ok, true);

    const simulatedOwnerDrift = await verifyManifest(paths, manifest, host, {
      verifyRestrictedFilePermissions: async (target, targetHost, mode) => {
        if (target === paths.gatewayConfig) {
          const error = new Error("simulated owner drift");
          error.code = "unsafe_file_owner";
          throw error;
        }
        await verifyRestrictedFilePermissions(target, targetHost, mode);
      },
    });
    assert.ok(
      simulatedOwnerDrift.findings.some(
        (finding) =>
          finding.code === "owned_artifact_permissions_invalid" &&
          finding.reason === "unsafe_file_owner" &&
          finding.path === paths.gatewayConfig,
      ),
    );
    if (process.platform === "win32") {
      const icacls = path.join(process.env.SystemRoot, "System32", "icacls.exe");
      const acl = spawnSync(icacls, [paths.gatewayConfig, "/grant", "*S-1-1-0:(R)"], {
        encoding: "utf8",
        windowsHide: true,
      });
      assert.equal(acl.status, 0, acl.stderr);
    } else {
      await fs.promises.chmod(paths.gatewayConfig, 0o644);
    }
    const artifactProtectionDrift = await verifyManifest(paths, manifest, host);
    assert.ok(
      artifactProtectionDrift.findings.some(
        (finding) =>
          ["owned_artifact_mode_mismatch", "owned_artifact_permissions_invalid"].includes(
            finding.code,
          ) && finding.path === paths.gatewayConfig,
      ),
    );
    await securePathPermissions(paths.gatewayConfig, host, 0o600);
    assert.equal((await verifyManifest(paths, manifest, host)).ok, true);

    const cursorWhileStopped = runSetupEntrypoint(root, ["check", "--components", "cursor"]);
    assert.equal(cursorWhileStopped.status, 0, cursorWhileStopped.stderr);
    assert.equal(JSON.parse(cursorWhileStopped.stdout).components.cursor.state, "blocked");

    const startPlan = await createPlan({
      host,
      now: now + 1,
      options: { workflow: "start" },
      paths,
    });
    const failedStartToken = "e".repeat(64);
    const failedStartReceipt = await readyReceiptFor(manifest, paths, failedStartToken, now + 1);
    let compensatedStartToken = null;
    await assert.rejects(
      consumePlan({
        approval: startPlan.planId,
        command: "start",
        host,
        now: now + 1,
        paths,
        plan: startPlan,
        dependencies: {
          beforeManifestWrite: async (candidate) => {
            if (candidate.process?.processToken === failedStartToken) {
              throw new Error("injected post-start manifest failure");
            }
          },
          compensateStartedGateway: async ({ receipt }) => {
            compensatedStartToken = receipt.processToken;
            await protectedFile(paths.processReceipt, stableJson(stoppedReceipt(receipt)), host);
            return { changed: true, receipt: stoppedReceipt(receipt) };
          },
          startOwnedGateway: async () => {
            await protectedFile(paths.processReceipt, stableJson(failedStartReceipt), host);
            return { changed: true, receipt: failedStartReceipt };
          },
        },
      }),
      /injected post-start manifest failure/u,
    );
    assert.equal(compensatedStartToken, failedStartToken);
    assert.equal((await inspectPath(paths.processReceipt, { hash: false })).kind, "absent");
    manifest = await loadManifest(paths, { required: true });
    assert.equal(manifest.lastPlanId, setupPlan.planId);
    assert.equal(manifest.process.status, "not-started");

    const postClaimTarget = path.join(root, "post-claim-primary-error");
    await atomicWrite(postClaimTarget, "preserve this claimed value\n");
    const postClaimState = await inspectPath(postClaimTarget);
    const releaseMaskToken = "d".repeat(64);
    const releaseMaskReceipt = await readyReceiptFor(manifest, paths, releaseMaskToken, now + 1);
    let primaryQuarantine = null;
    let preservedPrimary = null;
    await assert.rejects(
      consumePlan({
        approval: startPlan.planId,
        command: "start",
        host,
        now: now + 1,
        paths,
        plan: startPlan,
        dependencies: {
          afterLockReleaseOwnershipAssertion: async () => {
            await fs.promises.unlink(paths.lock);
          },
          beforeManifestWrite: async (candidate) => {
            if (candidate.process?.processToken !== releaseMaskToken) return;
            await removeFileIfOwned(postClaimTarget, postClaimState.sha256, {
              beforeRemove: async ({ quarantine }) => {
                primaryQuarantine = quarantine;
                const error = new Error("injected post-claim primary failure");
                error.code = "EACCES";
                throw error;
              },
            });
          },
          compensateStartedGateway: async ({ receipt }) => {
            await protectedFile(paths.processReceipt, stableJson(stoppedReceipt(receipt)), host);
            return { changed: true, receipt: stoppedReceipt(receipt) };
          },
          startOwnedGateway: async () => {
            await protectedFile(paths.processReceipt, stableJson(releaseMaskReceipt), host);
            return { changed: true, receipt: releaseMaskReceipt };
          },
        },
      }),
      (error) => {
        preservedPrimary = error;
        return (
          error.code === "owned_path_changed" &&
          error.details.quarantinePath === primaryQuarantine &&
          error.details.lockReleaseFailureCode === "lock_ownership_lost"
        );
      },
    );
    assert.equal(
      preservedPrimary.message,
      `Owned file cleanup claim failed and requires recovery: ${postClaimTarget}`,
    );
    assert.equal((await inspectPath(paths.lock, { hash: false })).kind, "absent");
    assert.equal((await inspectPath(paths.processReceipt, { hash: false })).kind, "absent");
    assert.equal((await inspectPath(postClaimTarget, { hash: false })).kind, "absent");
    assert.equal(
      await fs.promises.readFile(primaryQuarantine, "utf8"),
      "preserve this claimed value\n",
    );
    assert.equal((await loadManifest(paths, { required: true })).lastPlanId, setupPlan.planId);
    await fs.promises.unlink(primaryQuarantine);

    await assert.rejects(
      consumePlan({
        approval: startPlan.planId,
        command: "start",
        host,
        now: now + 1,
        paths,
        plan: startPlan,
        dependencies: {
          beforeManifestWrite: async (candidate) => {
            if (candidate.process?.processToken === failedStartToken) {
              throw new Error("injected post-start manifest failure");
            }
          },
          compensateStartedGateway: async () => {
            throw new SetupError(
              "process_compensation_identity_mismatch",
              "injected compensation identity mismatch",
            );
          },
          startOwnedGateway: async () => {
            await protectedFile(paths.processReceipt, stableJson(failedStartReceipt), host);
            return { changed: true, receipt: failedStartReceipt };
          },
        },
      }),
      (error) =>
        error.code === "process_compensation_identity_mismatch" && exitCodeFor(error) === 5,
    );
    assert.equal((await loadManifest(paths, { required: true })).lastPlanId, setupPlan.planId);
    await fs.promises.unlink(paths.processReceipt);

    const repeatedSetup = await consumePlan({
      approval: setupPlan.planId,
      command: "apply",
      host,
      now: now + 1,
      paths,
      plan: setupPlan,
      providerCredential: providerValue,
      dependencies: { runCommand: runtimeCommand },
    });
    assert.equal(repeatedSetup.changed, false);

    await protectedDirectory(path.dirname(paths.codexProfile), host, { external: true });
    await protectedFile(paths.codexProfile, "unowned user profile\n", host);
    await assert.rejects(
      createPlan({
        host,
        now: now + 2,
        options: {
          clients: ["codex"],
          discoveryEvidence: evidencePath,
          executables: { codex },
          model: "example-model",
          workflow: "add-clients",
        },
        paths,
      }),
      (error) => error.code === "unowned_target_exists",
    );
    await fs.promises.unlink(paths.codexProfile);

    const addPlan = await createPlan({
      host,
      now: now + 2,
      options: {
        clients: ["codex"],
        discoveryEvidence: evidencePath,
        executables: { codex },
        model: "example-model",
        workflow: "add-clients",
      },
      paths,
    });
    assert.equal(addPlan.requiredApprovals.includes("install-exact-litellm-pin"), false);
    assert.deepEqual(
      addPlan.operations
        .filter((operation) => operation.action === "replace" || operation.backup)
        .map((operation) => operation.path),
      [],
    );
    assert.deepEqual(
      addPlan.operations
        .filter((operation) => operation.action === "create")
        .map((operation) => operation.path),
      [paths.codexProfile],
    );
    const codexParentBeforeAdd = await inspectProtectedDirectoryBoundary(
      path.dirname(paths.codexProfile),
      host,
      { external: true },
    );
    const manifestBeforeFailedAdd = await inspectPath(paths.manifest);
    await assert.rejects(
      consumePlan({
        approval: addPlan.planId,
        command: "apply",
        host,
        now: now + 2,
        paths,
        plan: addPlan,
        dependencies: {
          beforeManifestWrite: async () => {
            throw new Error("injected Codex add-client manifest failure");
          },
        },
      }),
      /injected Codex add-client manifest failure/u,
    );
    assert.equal((await inspectPath(paths.codexProfile, { hash: false })).kind, "absent");
    assert.equal((await inspectPath(paths.manifest)).sha256, manifestBeforeFailedAdd.sha256);
    assert.deepEqual(
      await inspectProtectedDirectoryBoundary(path.dirname(paths.codexProfile), host, {
        external: true,
      }),
      codexParentBeforeAdd,
    );
    await consumePlan({
      approval: addPlan.planId,
      command: "apply",
      host,
      now: now + 2,
      paths,
      plan: addPlan,
    });
    manifest = await loadManifest(paths, { required: true });
    assert.deepEqual(manifest.clients, ["codex"]);
    assert.equal((await inspectPath(paths.codexProfile)).kind, "file");
    const assertNoopRejectsExternalParentSwap = async ({ command, now: commandNow, plan }) => {
      const externalParent = path.dirname(paths.codexProfile);
      const displacedParent = `${externalParent}.${plan.workflow}-terminal`;
      try {
        await assert.rejects(
          consumePlan({
            approval: plan.planId,
            command,
            host,
            now: commandNow,
            paths,
            plan,
            dependencies: {
              beforeTerminalExternalParentCheck: async (boundary) => {
                assert.deepEqual(boundary, {
                  command,
                  status: "noop",
                  workflow: plan.workflow,
                });
                await fs.promises.rename(externalParent, displacedParent);
                await protectedDirectory(externalParent, host, { external: true });
                const installedProfile = await fs.promises.readFile(
                  path.join(displacedParent, path.basename(paths.codexProfile)),
                );
                await protectedFile(paths.codexProfile, installedProfile, host);
              },
            },
          }),
          (error) => error.code === "stale_plan_external_parent",
        );
      } finally {
        if ((await inspectPath(paths.codexProfile, { hash: false })).kind === "file") {
          await fs.promises.unlink(paths.codexProfile);
        }
        if ((await inspectPath(externalParent, { hash: false })).kind === "directory") {
          await fs.promises.rmdir(externalParent);
        }
        if ((await inspectPath(displacedParent, { hash: false })).kind === "directory") {
          await fs.promises.rename(displacedParent, externalParent);
        }
      }
    };
    await assertNoopRejectsExternalParentSwap({ command: "apply", now: now + 3, plan: addPlan });
    const repeatedAdd = await consumePlan({
      approval: addPlan.planId,
      command: "apply",
      host,
      now: now + 3,
      paths,
      plan: addPlan,
    });
    assert.equal(repeatedAdd.changed, false);
    assert.equal(repeatedAdd.status, "noop");

    const protectedCodexParent = path.dirname(paths.codexProfile);
    if (process.platform === "win32") {
      const icacls = path.join(process.env.SystemRoot, "System32", "icacls.exe");
      const acl = spawnSync(icacls, [protectedCodexParent, "/grant", "*S-1-1-0:(R)"], {
        encoding: "utf8",
        windowsHide: true,
      });
      assert.equal(acl.status, 0, acl.stderr);
    } else {
      await fs.promises.chmod(protectedCodexParent, 0o777);
    }
    let driftedProfileReads = 0;
    const originalLstat = fs.promises.lstat;
    fs.promises.lstat = async (target, ...args) => {
      if (path.resolve(String(target)) === path.resolve(paths.codexProfile)) {
        driftedProfileReads += 1;
      }
      return await originalLstat.call(fs.promises, target, ...args);
    };
    try {
      const parentDriftStatus = await installationStatus(host, paths);
      assert.ok(
        parentDriftStatus.drift.findings.some(
          (finding) =>
            finding.code === "external_parent_protection_invalid" &&
            finding.path === protectedCodexParent,
        ),
      );
      await assert.rejects(
        checkCommand(host, paths, { components: "codex" }),
        (error) =>
          error.code === "installation_drift" &&
          error.details.findings.some(
            (finding) =>
              finding.code === "external_parent_protection_invalid" &&
              finding.path === protectedCodexParent,
          ),
      );
    } finally {
      fs.promises.lstat = originalLstat;
      await secureDirectoryPermissions(protectedCodexParent, host, { external: true });
    }
    assert.equal(driftedProfileReads, 0);
    assert.equal((await verifyManifest(paths, manifest, host)).ok, true);

    await assert.rejects(
      createPlan({
        host,
        now: now + 3,
        options: {
          clients: ["codex"],
          discoveryEvidence: evidencePath,
          executables: { codex },
          model: "example-model",
          workflow: "add-clients",
        },
        paths,
      }),
      (error) => error.code === "clients_already_configured",
    );

    await atomicWrite(paths.gatewayConfig, `drifted ${providerValue}\n`, { mode: 0o600 });
    await securePathPermissions(paths.gatewayConfig, host, 0o600);
    const cursorWhileDrifted = runSetupEntrypoint(root, ["check", "--components", "cursor"]);
    assert.equal(cursorWhileDrifted.status, 0, cursorWhileDrifted.stderr);
    assert.equal(JSON.parse(cursorWhileDrifted.stdout).components.cursor.state, "blocked");
    assert.doesNotMatch(
      `${cursorWhileDrifted.stdout}\n${cursorWhileDrifted.stderr}`,
      new RegExp(providerValue),
    );
    const secretBearingDrift = await verifyManifest(paths, manifest, host);
    const unsafeRepairPlan = await createPlan({
      host,
      now: now + 3,
      options: {
        acceptDrift: secretBearingDrift.driftDigest,
        executables: { codex },
        workflow: "repair",
      },
      paths,
    });
    await assert.rejects(
      consumePlan({
        approval: unsafeRepairPlan.planId,
        command: "repair",
        host,
        now: now + 3,
        paths,
        plan: unsafeRepairPlan,
      }),
      (error) => error.code === "secret_leak",
    );
    assert.equal((await inspectPath(paths.backupsRoot, { hash: false })).kind, "absent");

    await atomicWrite(paths.gatewayConfig, "drifted config\n", { mode: 0o600 });
    await securePathPermissions(paths.gatewayConfig, host, 0o600);
    const drift = await verifyManifest(paths, manifest, host);
    assert.equal(drift.ok, false);
    const repairPlan = await createPlan({
      host,
      now: now + 4,
      options: {
        acceptDrift: drift.driftDigest,
        executables: { codex },
        workflow: "repair",
      },
      paths,
    });
    assert.deepEqual(repairPlan.requiredApprovals, ["write-owned-state"]);
    assert.deepEqual(
      repairPlan.operations
        .filter((operation) => operation.action === "replace")
        .map((operation) => ({ backup: operation.backup, path: operation.path })),
      [{ backup: true, path: paths.gatewayConfig }],
    );
    assert.equal(
      repairPlan.operations.filter(
        (operation) => operation.path !== paths.gatewayConfig && operation.action !== "noop",
      ).length,
      0,
    );
    await consumePlan({
      approval: repairPlan.planId,
      command: "repair",
      host,
      now: now + 4,
      paths,
      plan: repairPlan,
    });
    manifest = await loadManifest(paths, { required: true });
    assert.equal((await verifyManifest(paths, manifest, host)).ok, true);
    assert.equal(manifest.backups.length, 1);
    assert.equal((await inspectPath(manifest.backups[0].path)).kind, "file");
    assert.equal(manifest.backups[0].mode, 0o600);

    const backup = manifest.backups[0];
    const backupBytes = await fs.promises.readFile(backup.path);
    const backupSecret = "modified-backup-secret-must-not-print";
    await atomicWrite(backup.path, `${backupSecret}\n`, { mode: 0o600 });
    await securePathPermissions(backup.path, host, 0o600);
    const backupContentDrift = await verifyManifest(paths, manifest, host);
    assert.ok(
      backupContentDrift.findings.some(
        (finding) => finding.code === "backup_hash_mismatch" && finding.path === backup.path,
      ),
    );
    await assert.rejects(
      createPlan({
        host,
        now: now + 5,
        options: {
          acceptDrift: backupContentDrift.driftDigest,
          executables: { codex },
          workflow: "repair",
        },
        paths,
      }),
      (error) => error.code === "repair_scope_unsafe",
    );
    const backupDriftStatus = runSetupEntrypoint(root, ["status"]);
    assert.doesNotMatch(
      `${backupDriftStatus.stdout}\n${backupDriftStatus.stderr}`,
      new RegExp(backupSecret),
    );
    await atomicWrite(backup.path, backupBytes, { mode: 0o600 });
    await securePathPermissions(backup.path, host, 0o600);

    if (process.platform === "win32") {
      const icacls = path.join(process.env.SystemRoot, "System32", "icacls.exe");
      const acl = spawnSync(icacls, [backup.path, "/grant", "*S-1-1-0:(R)"], {
        encoding: "utf8",
        windowsHide: true,
      });
      assert.equal(acl.status, 0, acl.stderr);
    } else {
      await fs.promises.chmod(backup.path, 0o644);
    }
    const backupProtectionDrift = await verifyManifest(paths, manifest, host);
    assert.ok(
      backupProtectionDrift.findings.some(
        (finding) =>
          finding.path === backup.path &&
          ["backup_mode_mismatch", "backup_permissions_invalid"].includes(finding.code),
      ),
    );
    await securePathPermissions(backup.path, host, 0o600);
    assert.equal((await verifyManifest(paths, manifest, host)).ok, true);

    if (process.platform !== "win32") {
      const originalExecutable = await fs.promises.readFile(codex);
      const manifestBeforeExecutableDrift = await inspectPath(paths.manifest);
      const assertUnsafeExecutableRepair = async (timestamp) => {
        const executableDrift = await verifyManifest(paths, manifest, host);
        assert.ok(
          executableDrift.findings.some((finding) => finding.code.startsWith("executable_")),
        );
        await assert.rejects(
          createPlan({
            host,
            now: timestamp,
            options: {
              acceptDrift: executableDrift.driftDigest,
              executables: { codex },
              workflow: "repair",
            },
            paths,
          }),
          (error) => error.code === "repair_scope_unsafe",
        );
        assert.equal(
          (await inspectPath(paths.manifest)).sha256,
          manifestBeforeExecutableDrift.sha256,
        );
      };

      await fs.promises.writeFile(
        codex,
        Buffer.concat([originalExecutable, Buffer.from("# drift\n")]),
      );
      await fs.promises.chmod(codex, 0o700);
      await assertUnsafeExecutableRepair(now + 6);

      await fakeVersionedExecutable(root, path.basename(codex), "codex-cli 0.155.0");
      await assertUnsafeExecutableRepair(now + 7);

      await fs.promises.writeFile(codex, originalExecutable, { mode: 0o700 });
      await fs.promises.chmod(codex, 0o700);
      const movedCodex = path.join(root, "moved-codex");
      await fs.promises.rename(codex, movedCodex);
      const pathDrift = await verifyManifest(paths, manifest, host);
      assert.ok(pathDrift.findings.some((finding) => finding.code === "executable_missing"));
      await assert.rejects(
        createPlan({
          host,
          now: now + 8,
          options: {
            acceptDrift: pathDrift.driftDigest,
            executables: { codex: movedCodex },
            workflow: "repair",
          },
          paths,
        }),
        (error) => error.code === "repair_scope_unsafe",
      );
      assert.equal(
        (await inspectPath(paths.manifest)).sha256,
        manifestBeforeExecutableDrift.sha256,
      );
      await fs.promises.rename(movedCodex, codex);
      assert.equal((await verifyManifest(paths, manifest, host)).ok, true);
    }

    const oldGatewayValue = await readSecret(paths.gatewaySecret, host, "gateway");
    if (process.platform === "win32") {
      const icacls = path.join(process.env.SystemRoot, "System32", "icacls.exe");
      const acl = spawnSync(icacls, [paths.gatewaySecret, "/grant", "*S-1-1-0:(R)"], {
        encoding: "utf8",
        windowsHide: true,
      });
      assert.equal(acl.status, 0, acl.stderr);
    } else {
      await fs.promises.chmod(paths.gatewaySecret, 0o644);
    }
    const permissionDrift = await verifyManifest(paths, manifest, host);
    assert.ok(
      permissionDrift.findings.some(
        (finding) =>
          finding.path === paths.gatewaySecret &&
          ["credential_metadata_mismatch", "credential_permissions_invalid"].includes(finding.code),
      ),
    );
    const rotationPlan = await createPlan({
      host,
      now: now + 5,
      options: { rotateCredential: "gateway", workflow: "rotate" },
      paths,
    });
    assert.deepEqual(rotationPlan.requiredApprovals, [
      "rotate-gateway-credential",
      "stop-owned-gateway",
      "write-owned-state",
    ]);
    await consumePlan({
      approval: rotationPlan.planId,
      command: "rotate",
      host,
      now: now + 5,
      paths,
      plan: rotationPlan,
    });
    const newGatewayValue = await readSecret(paths.gatewaySecret, host, "gateway");
    assert.notEqual(newGatewayValue, oldGatewayValue);
    manifest = await loadManifest(paths, { required: true });
    assert.doesNotMatch(JSON.stringify(manifest), new RegExp(oldGatewayValue));
    assert.equal((await verifyManifest(paths, manifest, host)).ok, true);
    if (process.platform === "win32") {
      await verifyProtectedPermissions(paths.gatewaySecret, host);
    } else {
      assert.equal((await inspectPath(paths.gatewaySecret, { hash: false })).mode, 0o600);
    }

    await assertNoopRejectsExternalParentSwap({
      command: "rotate",
      now: now + 6,
      plan: rotationPlan,
    });
    const repeatedRotation = await consumePlan({
      approval: rotationPlan.planId,
      command: "rotate",
      host,
      now: now + 6,
      paths,
      plan: rotationPlan,
    });
    assert.equal(repeatedRotation.changed, false);

    const stopRaceStartPlan = await createPlan({
      host,
      now: now + 7,
      options: { workflow: "start" },
      paths,
    });
    const stopRaceToken = "1".repeat(64);
    const stopRaceReady = await readyReceiptFor(
      manifest,
      paths,
      stopRaceToken,
      now + 7,
      [63_001, 63_002],
    );
    await consumePlan({
      approval: stopRaceStartPlan.planId,
      command: "start",
      host,
      now: now + 7,
      paths,
      plan: stopRaceStartPlan,
      dependencies: {
        startOwnedGateway: async () => {
          await protectedFile(paths.processReceipt, stableJson(stopRaceReady), host);
          return { changed: true, receipt: stopRaceReady };
        },
      },
    });
    manifest = await loadManifest(paths, { required: true });
    await protectedFile(
      paths.processReceipt,
      stableJson({ ...stopRaceReady, heartbeatAt: new Date().toISOString() }),
      host,
    );
    await assertNoopRejectsExternalParentSwap({
      command: "start",
      now: now + 7,
      plan: stopRaceStartPlan,
    });
    const lifecycleDriftBaseline = {
      codexParent: await inspectProtectedDirectoryBoundary(path.dirname(paths.codexProfile), host, {
        external: true,
      }),
      gatewayCredential: await readSecret(paths.gatewaySecret, host, "gateway"),
      manifest: await inspectPath(paths.manifest),
      processReceipt: await inspectPath(paths.processReceipt),
      providerCredential: await readSecret(paths.providerSecret, host, "provider"),
      runtimeDigest: (await inventoryTree(paths.venvRoot, { allowSymlinks: true })).digest,
      artifactHashes: new Map(
        await Promise.all(
          manifest.artifacts.map(async (artifact) => [
            artifact.path,
            (await inspectPath(artifact.path)).sha256,
          ]),
        ),
      ),
    };
    const assertLifecycleDriftPreservedOwnedState = async () => {
      assert.equal(
        await readSecret(paths.gatewaySecret, host, "gateway"),
        lifecycleDriftBaseline.gatewayCredential,
      );
      assert.equal(
        await readSecret(paths.providerSecret, host, "provider"),
        lifecycleDriftBaseline.providerCredential,
      );
      assert.equal(
        (await inspectPath(paths.manifest)).sha256,
        lifecycleDriftBaseline.manifest.sha256,
      );
      assert.equal(
        (await inspectPath(paths.processReceipt)).sha256,
        lifecycleDriftBaseline.processReceipt.sha256,
      );
      assert.deepEqual(
        await inspectProtectedDirectoryBoundary(path.dirname(paths.codexProfile), host, {
          external: true,
        }),
        lifecycleDriftBaseline.codexParent,
      );
      assert.equal(
        (await inventoryTree(paths.venvRoot, { allowSymlinks: true })).digest,
        lifecycleDriftBaseline.runtimeDigest,
      );
      for (const [artifactPath, sha256] of lifecycleDriftBaseline.artifactHashes) {
        assert.equal((await inspectPath(artifactPath)).sha256, sha256, artifactPath);
      }
    };
    const stopWithTerminalIdentityDrift = (field, changedValue) => async (stopContext) => {
      let identityReads = 0;
      return await stopOwnedGateway(stopContext, {
        delay: async () => {},
        readProcessReceipt: async () => {
          identityReads += 1;
          if (identityReads === 1) return stopRaceReady;
          await fs.promises.unlink(paths.processStopRequest);
          return { ...stoppedReceipt(stopRaceReady), [field]: changedValue };
        },
      });
    };

    const identityDriftRotationPlan = await createPlan({
      host,
      now: now + 8,
      options: { rotateCredential: "gateway", workflow: "rotate" },
      paths,
    });
    await assert.rejects(
      consumePlan({
        approval: identityDriftRotationPlan.planId,
        command: "rotate",
        host,
        now: now + 8,
        paths,
        plan: identityDriftRotationPlan,
        dependencies: {
          stopOwnedGateway: stopWithTerminalIdentityDrift("childPid", stopRaceReady.childPid + 1),
        },
      }),
      (error) => error.code === "process_identity_changed",
    );
    await assertLifecycleDriftPreservedOwnedState();

    const identityDriftRollbackPlan = await createPlan({
      host,
      now: now + 8,
      options: { workflow: "rollback" },
      paths,
    });
    assert.deepEqual(
      identityDriftRollbackPlan.state.observations[path.dirname(paths.codexProfile)],
      lifecycleDriftBaseline.codexParent,
    );
    await assert.rejects(
      consumePlan({
        approval: identityDriftRollbackPlan.planId,
        command: "rollback",
        host,
        now: now + 8,
        paths,
        plan: identityDriftRollbackPlan,
        dependencies: {
          stopOwnedGateway: stopWithTerminalIdentityDrift("configSha256", "0".repeat(64)),
        },
      }),
      (error) => error.code === "process_identity_changed",
    );
    await assertLifecycleDriftPreservedOwnedState();
    const blockedRollback = await readRollbackState(paths, host);
    assert.equal(blockedRollback.kind, "hetzner-inference-rollback-journal");
    assert.equal(blockedRollback.status, "in_progress");
    await fs.promises.unlink(paths.rollbackReceipt);

    const stopRacePlan = await createPlan({
      host,
      now: now + 8,
      options: { workflow: "stop" },
      paths,
    });
    const concurrentStopToken = "2".repeat(64);
    await assert.rejects(
      consumePlan({
        approval: stopRacePlan.planId,
        command: "stop",
        host,
        now: now + 8,
        paths,
        plan: stopRacePlan,
        dependencies: {
          stopOwnedGateway: async () => {
            const stopped = stoppedReceipt(stopRaceReady);
            await protectedFile(paths.processReceipt, stableJson(stopped), host);
            await protectedFile(
              paths.processStopRequest,
              stableJson(stopRequestFor(concurrentStopToken, now + 8)),
              host,
            );
            return { changed: true, receipt: stopped };
          },
        },
      }),
      (error) => error.code === "process_stop_request_changed",
    );
    await protectedFile(paths.processReceipt, stableJson(stopRaceReady), host);
    const stopRaceStatus = await installationStatus(host, paths, now + 8);
    assert.ok(
      stopRaceStatus.processVerification.findings.some(
        (finding) => finding.code === "process_stop_request_identity_mismatch",
      ),
    );
    await fs.promises.unlink(paths.processStopRequest);
    const terminalStopResult = await consumePlan({
      approval: stopRacePlan.planId,
      command: "stop",
      host,
      paths,
      plan: stopRacePlan,
      dependencies: {
        stopOwnedGateway: async (stopContext) => {
          assert.equal(stopContext.now, undefined, "mutation must not freeze the heartbeat clock");
          await fs.promises.unlink(paths.processReceipt);
          return { changed: true, receipt: null, terminalStatus: "not-running" };
        },
      },
    });
    assert.equal(terminalStopResult.gatewayProcessStatus, "not-running");
    manifest = await loadManifest(paths, { required: true });
    assert.equal(manifest.process.status, "not-running");
    await assertNoopRejectsExternalParentSwap({
      command: "stop",
      now: now + 8,
      plan: stopRacePlan,
    });

    const restartRotationPlan = await createPlan({
      host,
      now: now + 9,
      options: {
        restartAfterRotation: true,
        rotateCredential: "gateway",
        workflow: "rotate",
      },
      paths,
    });
    const failedRestartToken = "f".repeat(64);
    const failedRestartReceipt = await readyReceiptFor(
      manifest,
      paths,
      failedRestartToken,
      now + 9,
      [62_001, 62_002],
    );
    let compensatedRestartToken = null;
    await assert.rejects(
      consumePlan({
        approval: restartRotationPlan.planId,
        command: "rotate",
        host,
        now: now + 9,
        paths,
        plan: restartRotationPlan,
        dependencies: {
          beforeManifestWrite: async (candidate) => {
            if (candidate.process?.processToken === failedRestartToken) {
              throw new Error("injected post-restart manifest failure");
            }
          },
          compensateStartedGateway: async ({ receipt }) => {
            compensatedRestartToken = receipt.processToken;
            await protectedFile(paths.processReceipt, stableJson(stoppedReceipt(receipt)), host);
            return { changed: true, receipt: stoppedReceipt(receipt) };
          },
          startOwnedGateway: async () => {
            await protectedFile(paths.processReceipt, stableJson(failedRestartReceipt), host);
            return { changed: true, receipt: failedRestartReceipt };
          },
        },
      }),
      /injected post-restart manifest failure/u,
    );
    assert.equal(compensatedRestartToken, failedRestartToken);
    assert.equal((await inspectPath(paths.processReceipt, { hash: false })).kind, "absent");
    manifest = await loadManifest(paths, { required: true });
    assert.equal(manifest.lastPlanId, restartRotationPlan.planId);
    assert.equal(manifest.process.status, "not-running");

    await protectedFile(paths.gatewaySecret, gatewayCredential("e"), host);
    await assert.rejects(
      consumePlan({
        approval: restartRotationPlan.planId,
        command: "rotate",
        host,
        now: now + 10,
        paths,
        plan: restartRotationPlan,
      }),
      (error) => error.code === "idempotent_state_drift",
    );
  });
});

test("WSL planning rejects every Windows-mounted explicit executable", async (context) => {
  if (process.platform === "win32") {
    context.skip("WSL path behavior is exercised on POSIX runners");
    return;
  }
  await temporaryDirectory("hetzner-wsl-executables", async (root) => {
    const host = detectHost({
      env: {
        CODEX_HOME: path.join(root, "codex"),
        WSL_DISTRO_NAME: "nixos",
        XDG_CONFIG_HOME: path.join(root, "config"),
        XDG_STATE_HOME: path.join(root, "state"),
      },
      home: path.join(root, "home"),
      mountInfo: WSL_WINDOWS_MOUNT_INFO,
      platform: "linux",
    });
    const paths = managedPaths(host);
    await protectedDirectory(path.dirname(paths.codexProfile), host, { external: true });
    const now = Date.now();
    const discovery = path.join(root, "discovery.json");
    const python = await fakePythonExecutable(root);
    await fs.promises.writeFile(discovery, stableJson(discoveryEvidence(now)));
    const cases = [
      { clients: ["cursor"], executables: { python: "/windir/c/Python/python.exe" } },
      {
        clients: ["codex"],
        executables: { codex: "/media/windows/Tools/codex.exe", python },
      },
      {
        clients: ["claude-code"],
        executables: { "claude-code": "/windir/c/Tools/claude.exe", python },
      },
      {
        clients: ["cursor"],
        executables: { cursor: "/media/windows/Tools/cursor.exe", python },
      },
    ];
    for (const candidate of cases) {
      await assert.rejects(
        createPlan({
          host,
          now,
          options: {
            clients: candidate.clients,
            discoveryEvidence: discovery,
            executables: candidate.executables,
            model: "example-model",
            workflow: "setup",
          },
          paths,
        }),
        (error) => error.code === "wsl_cross_boundary_path",
      );
    }
  });
});

test("WSL apply refreshes mount topology after plan validation before executable I/O", async (context) => {
  if (process.platform === "win32") {
    context.skip("WSL path behavior is exercised on POSIX runners");
    return;
  }
  await temporaryDirectory("hetzner-wsl-apply-mount-drift", async (root) => {
    const environment = {
      CODEX_HOME: path.join(root, "host", "codex"),
      WSL_DISTRO_NAME: "nixos",
      XDG_CONFIG_HOME: path.join(root, "host", "config"),
      XDG_STATE_HOME: path.join(root, "host", "state"),
    };
    let mountInfo = WSL_WINDOWS_MOUNT_INFO;
    const host = detectHost({
      env: environment,
      home: path.join(root, "host", "home"),
      mountInfoProvider: () => mountInfo,
      platform: "linux",
    });
    const paths = managedPaths(host);
    const toolsRoot = path.join(root, "tools");
    await fs.promises.mkdir(toolsRoot);
    const python = await fakePythonExecutable(toolsRoot);
    const now = Date.now();
    const discovery = path.join(root, "discovery.json");
    await fs.promises.writeFile(discovery, stableJson(discoveryEvidence(now)));
    const plan = await createPlan({
      host,
      now,
      options: {
        clients: ["cursor"],
        discoveryEvidence: discovery,
        executables: { python },
        model: "example-model",
        workflow: "setup",
      },
      paths,
    });

    const driftedMountInfo = withWslDrvFsMount(toolsRoot);
    const driftedMounts = parseWslWindowsMounts(driftedMountInfo);
    let executableTargetIo = 0;
    let topologyChangedAfterValidation = false;
    const originalLstatSync = fs.lstatSync;
    fs.lstatSync = (target, ...args) => {
      if (
        topologyChangedAfterValidation &&
        isWslWindowsMountedPath(String(target), driftedMounts)
      ) {
        executableTargetIo += 1;
      }
      return originalLstatSync.call(fs, target, ...args);
    };
    try {
      await assert.rejects(
        consumePlan({
          approval: plan.planId,
          command: "apply",
          host,
          now,
          paths,
          plan,
          dependencies: {
            beforeExecutableRevalidation: async () => {
              topologyChangedAfterValidation = true;
              mountInfo = driftedMountInfo;
            },
          },
        }),
        (error) =>
          error.code === "wsl_cross_boundary_path" && error.details.label === "python executable",
      );
    } finally {
      fs.lstatSync = originalLstatSync;
    }
    assert.equal(topologyChangedAfterValidation, true);
    assert.equal(executableTargetIo, 0);
    assert.equal((await inspectPath(paths.lock, { hash: false })).kind, "absent");
  });
});

test("WSL apply rejects managed namespace drift after plan validation with no lock or cleanup I/O", async (context) => {
  if (process.platform === "win32") {
    context.skip("WSL path behavior is exercised on POSIX runners");
    return;
  }
  await temporaryDirectory("hetzner-wsl-managed-mount-drift", async (root) => {
    let mountInfo = WSL_WINDOWS_MOUNT_INFO;
    const host = detectHost({
      env: {
        CODEX_HOME: path.join(root, "host", "codex"),
        WSL_DISTRO_NAME: "nixos",
        XDG_CONFIG_HOME: path.join(root, "host", "config"),
        XDG_STATE_HOME: path.join(root, "host", "state"),
      },
      home: path.join(root, "host", "home"),
      mountInfoProvider: () => mountInfo,
      platform: "linux",
    });
    const paths = managedPaths(host);
    const toolsRoot = path.join(root, "tools");
    await fs.promises.mkdir(toolsRoot);
    const python = await fakePythonExecutable(toolsRoot);
    const now = Date.now();
    const discovery = path.join(root, "discovery.json");
    await fs.promises.writeFile(discovery, stableJson(discoveryEvidence(now)));
    const plan = await createPlan({
      host,
      now,
      options: {
        clients: ["cursor"],
        discoveryEvidence: discovery,
        executables: { python },
        model: "example-model",
        workflow: "setup",
      },
      paths,
    });

    const originalLstat = fs.promises.lstat;
    const originalMkdir = fs.promises.mkdir;
    let mountedTargetIo = 0;
    let cleanupCalls = 0;
    fs.promises.lstat = async (target, ...args) => {
      if (isWslWindowsMountedPath(String(target), parseWslWindowsMounts(mountInfo))) {
        mountedTargetIo += 1;
      }
      return await originalLstat.call(fs.promises, target, ...args);
    };
    fs.promises.mkdir = async (target, ...args) => {
      if (isWslWindowsMountedPath(String(target), parseWslWindowsMounts(mountInfo))) {
        mountedTargetIo += 1;
      }
      return await originalMkdir.call(fs.promises, target, ...args);
    };
    try {
      for (const [target, label] of [
        [paths.configRoot, "configuration namespace"],
        [paths.stateRoot, "state namespace"],
      ]) {
        const driftedMountInfo = withWslDrvFsMount(target);
        await assert.rejects(
          consumePlan({
            approval: plan.planId,
            command: "apply",
            dependencies: {
              afterExternalCleanupClaim() {
                cleanupCalls += 1;
              },
              afterPlanValidation: async () => {
                mountInfo = driftedMountInfo;
              },
              beforeRuntimeCleanup() {
                cleanupCalls += 1;
              },
            },
            host,
            now,
            paths,
            plan,
          }),
          (error) => error.code === "wsl_cross_boundary_path" && error.details.label === label,
        );
        mountInfo = WSL_WINDOWS_MOUNT_INFO;
        assert.equal((await inspectPath(paths.lock, { hash: false })).kind, "absent");
      }
    } finally {
      mountInfo = WSL_WINDOWS_MOUNT_INFO;
      fs.promises.lstat = originalLstat;
      fs.promises.mkdir = originalMkdir;
    }
    assert.equal(mountedTargetIo, 0);
    assert.equal(cleanupCalls, 0);
  });
});

test("WSL status, check, plan, and idempotent apply reject newly mounted manifest executables before target I/O", async (context) => {
  if (process.platform === "win32") {
    context.skip("WSL path behavior is exercised on POSIX runners");
    return;
  }
  await temporaryDirectory("hetzner-wsl-manifest-executable", async (root) => {
    let mountInfo = WSL_WINDOWS_MOUNT_INFO;
    const host = detectHost({
      env: {
        CODEX_HOME: path.join(root, "host", "codex"),
        WSL_DISTRO_NAME: "nixos",
        XDG_CONFIG_HOME: path.join(root, "host", "config"),
        XDG_STATE_HOME: path.join(root, "host", "state"),
      },
      home: path.join(root, "host", "home"),
      mountInfoProvider: () => mountInfo,
      platform: "linux",
    });
    const paths = managedPaths(host);
    await protectedDirectory(path.dirname(paths.codexProfile), host, { external: true });
    const toolsRoot = path.join(root, "tools");
    await fs.promises.mkdir(toolsRoot);
    const python = await fakePythonExecutable(toolsRoot);
    const codex = await fakeVersionedExecutable(toolsRoot, "codex", "codex-cli 0.154.0");
    const now = Date.now();
    const discovery = path.join(root, "discovery.json");
    await fs.promises.writeFile(discovery, stableJson(discoveryEvidence(now)));
    const plan = await createPlan({
      host,
      now,
      options: {
        clients: ["codex"],
        discoveryEvidence: discovery,
        executables: { codex, python },
        model: "example-model",
        workflow: "setup",
      },
      paths,
    });
    const runtimeCommand = async (executable, args) => {
      if (executable === plan.executables.python.path && args[0] === "-m" && args[1] === "venv") {
        await fs.promises.mkdir(path.dirname(plan.litellm.python), { recursive: true });
        await fs.promises.writeFile(plan.litellm.python, "mock venv Python\n");
        await fs.promises.writeFile(plan.litellm.executable, "mock LiteLLM\n");
        await fs.promises.chmod(plan.litellm.python, 0o700);
        await fs.promises.chmod(plan.litellm.executable, 0o700);
        return { stdout: "", stderr: "" };
      }
      if (args.includes("check")) return { stdout: "No broken requirements found.\n", stderr: "" };
      if (args.includes("freeze")) {
        return { stdout: `litellm==${LITELLM_PIN}\n`, stderr: "" };
      }
      if (executable === plan.litellm.executable && args[0] === "--version") {
        return { stdout: `LiteLLM ${LITELLM_PIN}\n`, stderr: "" };
      }
      if (executable === plan.litellm.python && args.includes("install")) {
        return { stdout: "", stderr: "" };
      }
      throw new Error(`unexpected mocked runtime command: ${executable} ${args.join(" ")}`);
    };
    await consumePlan({
      approval: plan.planId,
      command: "apply",
      dependencies: { runCommand: runtimeCommand },
      host,
      now,
      paths,
      plan,
      providerCredential: "provider-wsl-manifest-fixture",
    });

    const driftedMountInfo = withWslDrvFsMount(plan.executables.codex.path);
    const driftedMounts = parseWslWindowsMounts(driftedMountInfo);
    let executableTargetIo = 0;
    const countsMountedTarget = (target) => {
      if (
        mountInfo === driftedMountInfo &&
        isWslWindowsMountedPath(String(target), driftedMounts)
      ) {
        executableTargetIo += 1;
      }
    };
    const originalLstatSync = fs.lstatSync;
    const originalRealpathNative = fs.realpathSync.native;
    const originalPromisesLstat = fs.promises.lstat;
    fs.lstatSync = (target, ...args) => {
      countsMountedTarget(target);
      return originalLstatSync.call(fs, target, ...args);
    };
    fs.realpathSync.native = (target, ...args) => {
      countsMountedTarget(target);
      return originalRealpathNative.call(fs.realpathSync, target, ...args);
    };
    fs.promises.lstat = async (target, ...args) => {
      countsMountedTarget(target);
      return await originalPromisesLstat.call(fs.promises, target, ...args);
    };
    const rejectCurrentTopology = async (operation) => {
      const before = executableTargetIo;
      mountInfo = driftedMountInfo;
      try {
        await assert.rejects(
          operation(),
          (error) =>
            error.code === "wsl_cross_boundary_path" && error.details.label === "codex executable",
        );
        assert.equal(executableTargetIo, before);
      } finally {
        mountInfo = WSL_WINDOWS_MOUNT_INFO;
      }
    };
    try {
      await rejectCurrentTopology(() => installationStatus(host, paths, now));
      await rejectCurrentTopology(() => requireCurrentGatewayProof(host, paths, now));
      await rejectCurrentTopology(() =>
        createPlan({ host, now: now + 1, options: { workflow: "start" }, paths }),
      );
      await assert.rejects(
        consumePlan({
          approval: plan.planId,
          command: "apply",
          dependencies: {
            afterPlanValidation: async () => {
              mountInfo = driftedMountInfo;
            },
          },
          host,
          now,
          paths,
          plan,
        }),
        (error) =>
          error.code === "wsl_cross_boundary_path" && error.details.label === "codex executable",
      );
      assert.equal(executableTargetIo, 0);
      mountInfo = WSL_WINDOWS_MOUNT_INFO;
      assert.equal((await inspectPath(paths.lock, { hash: false })).kind, "absent");
    } finally {
      mountInfo = WSL_WINDOWS_MOUNT_INFO;
      fs.lstatSync = originalLstatSync;
      fs.realpathSync.native = originalRealpathNative;
      fs.promises.lstat = originalPromisesLstat;
    }
  });
});

test("WSL cross-boundary planning requires evidence and still blocks other-OS ownership", async (context) => {
  if (process.platform === "win32") {
    context.skip("WSL path behavior is exercised on POSIX runners and by the host fixture");
    return;
  }
  await temporaryDirectory("hetzner-wsl", async (root) => {
    const host = detectHost({
      env: {
        CODEX_HOME: path.join(root, "codex"),
        WSL_DISTRO_NAME: "nixos",
        XDG_CONFIG_HOME: path.join(root, "config"),
        XDG_STATE_HOME: path.join(root, "state"),
      },
      home: path.join(root, "home"),
      mountInfo: WSL_WINDOWS_MOUNT_INFO,
      platform: "linux",
    });
    const paths = managedPaths(host);
    const now = Date.now();
    const discovery = path.join(root, "discovery.json");
    await fs.promises.writeFile(discovery, stableJson(discoveryEvidence(now)));
    await assert.rejects(
      createPlan({
        host,
        now,
        options: {
          clients: ["cursor"],
          crossBoundary: true,
          discoveryEvidence: discovery,
          model: "example-model",
          workflow: "setup",
        },
        paths,
      }),
      (error) => error.code === "wsl_reachability_required",
    );
    const reachability = path.join(root, "reachability.json");
    await fs.promises.writeFile(
      reachability,
      stableJson({
        schemaVersion: 1,
        kind: "wsl-loopback-reachability",
        observedAt: new Date(now).toISOString(),
        status: "verified",
        wslDistribution: "nixos",
      }),
    );
    await assert.rejects(
      createPlan({
        host,
        now,
        options: {
          clients: ["cursor"],
          crossBoundary: true,
          discoveryEvidence: discovery,
          model: "example-model",
          reachabilityEvidence: reachability,
          workflow: "setup",
        },
        paths,
      }),
      (error) => error.code === "cross_boundary_route_not_implemented",
    );
  });
});

test("provider and gateway probes stay selected, bounded, and credential-free in output", async () => {
  const providerSecret = "provider-test-secret";
  const providerUrls = [];
  const provider = await runProviderCheck({
    credential: providerSecret,
    fetchImpl: async (url, options) => {
      providerUrls.push(url);
      assert.ok(options.signal);
      return new Response(JSON.stringify({ data: [{ id: "model-b" }, { id: "model-a" }] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    },
    probes: ["models"],
  });
  assert.deepEqual(providerUrls, [`${PROVIDER_BASE_URL}/models`]);
  assert.deepEqual(provider.provider.models, ["model-a", "model-b"]);
  assert.doesNotMatch(JSON.stringify(provider), new RegExp(providerSecret));
  const providerErrorOnly = await runProviderCheck({
    credential: providerSecret,
    fetchImpl: async () =>
      new Response(JSON.stringify({ error: "unknown model" }), { status: 404 }),
    model: "example-model",
    probes: ["errors"],
  });
  assert.equal(providerErrorOnly.provider.state, "verification_required");

  const gatewaySecret = gatewayCredential("t");
  const gatewayUrls = [];
  const gatewayAuthorizationKinds = [];
  const gatewayRequestBoundaries = [];
  const gateway = await runGatewayCheck({
    beforeRequest: async ({ method, url }) => {
      gatewayRequestBoundaries.push(`${method} ${url}`);
    },
    credential: gatewaySecret,
    fetchImpl: async (url, options) => {
      gatewayUrls.push(url);
      const authorization = options.headers.Authorization;
      gatewayAuthorizationKinds.push(
        authorization === `Bearer ${gatewaySecret}` ? "valid" : "invalid",
      );
      if (authorization === `Bearer ${gatewaySecret}`) {
        return new Response(JSON.stringify({ data: [{ id: GATEWAY_ALIAS }] }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
    },
    probes: ["models", "invalid-key"],
  });
  assert.equal(gateway.gateway.state, "transport_verified");
  assert.deepEqual(gatewayUrls, [
    "http://127.0.0.1:4000/v1/models",
    "http://127.0.0.1:4000/v1/models",
    "http://127.0.0.1:4000/v1/models",
  ]);
  assert.deepEqual(gatewayRequestBoundaries, [
    "GET http://127.0.0.1:4000/v1/models",
    "GET http://127.0.0.1:4000/v1/models",
    "GET http://127.0.0.1:4000/v1/models",
  ]);
  assert.deepEqual(gatewayAuthorizationKinds, ["valid", "invalid", "valid"]);
  assert.equal(gateway.gateway.results[1].details.validCredentialControl, true);
  assert.doesNotMatch(JSON.stringify(gateway), new RegExp(gatewaySecret));
  const gatewayAuthOnly = await runGatewayCheck({
    credential: gatewaySecret,
    fetchImpl: async () => new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }),
    probes: ["invalid-key"],
  });
  assert.equal(gatewayAuthOnly.gateway.state, "blocked");
  assert.equal(gatewayAuthOnly.gateway.results[0].error.code, "probe_http_error");
  for (const invalidResponse of [
    { status: 401, body: { error: "unauthorized" } },
    { status: 403, body: { error: "forbidden" } },
    { status: 400, body: { error: { type: "no_db_connection", code: "400" } } },
  ]) {
    const requests = [];
    const controlled = await runGatewayCheck({
      credential: gatewaySecret,
      fetchImpl: async (url, options) => {
        assert.equal(url, "http://127.0.0.1:4000/v1/models");
        const valid = options.headers.Authorization === `Bearer ${gatewaySecret}`;
        requests.push(valid ? "valid" : "invalid");
        return new Response(
          JSON.stringify(valid ? { data: [{ id: GATEWAY_ALIAS }] } : invalidResponse.body),
          { status: valid ? 200 : invalidResponse.status },
        );
      },
      probes: ["invalid-key"],
    });
    assert.deepEqual(requests, ["invalid", "valid"]);
    assert.equal(controlled.gateway.state, "verification_required");
    assert.equal(controlled.gateway.results[0].status, "verified");
    assert.equal(controlled.gateway.results[0].details.validCredentialControl, true);
    assert.equal(controlled.gateway.results[0].details.httpStatus, invalidResponse.status);
    assert.equal(JSON.stringify(controlled).includes(gatewaySecret), false);
  }
  const wrongControlAlias = await runGatewayCheck({
    credential: gatewaySecret,
    fetchImpl: async (_url, options) =>
      options.headers.Authorization === `Bearer ${gatewaySecret}`
        ? new Response(JSON.stringify({ data: [{ id: "other-alias" }] }), { status: 200 })
        : new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }),
    probes: ["invalid-key"],
  });
  assert.equal(wrongControlAlias.gateway.state, "blocked");
  assert.equal(wrongControlAlias.gateway.results[0].error.code, "gateway_alias_missing");
  const wrongAlias = await runGatewayCheck({
    credential: gatewaySecret,
    fetchImpl: async () =>
      new Response(JSON.stringify({ data: [{ id: "unowned-alias" }] }), { status: 200 }),
    probes: ["models"],
  });
  assert.equal(wrongAlias.gateway.state, "blocked");
  assert.equal(wrongAlias.gateway.results[0].error.code, "gateway_alias_missing");
  assert.equal(hasFailedExternalProbe(wrongAlias), true);

  const responseRequests = [];
  const responseCall = {
    type: "function_call",
    name: "report_probe",
    call_id: "call-1",
    arguments: JSON.stringify({ value: "ok" }),
  };
  const gatewayTools = await runGatewayCheck({
    credential: gatewaySecret,
    fetchImpl: async (url, options) => {
      const body = JSON.parse(options.body);
      if (url.endsWith("/v1/responses")) {
        responseRequests.push(body);
        return new Response(
          JSON.stringify(
            body.input.some((item) => item.type === "function_call_output")
              ? {
                  id: "response-2",
                  output: [
                    {
                      type: "message",
                      role: "assistant",
                      content: [{ type: "output_text", text: "done" }],
                    },
                  ],
                }
              : {
                  id: "response-1",
                  output: [responseCall],
                },
          ),
          { status: 200 },
        );
      }
      const hasToolResult = body.messages.some((message) =>
        message.content?.some?.((item) => item.type === "tool_result"),
      );
      return new Response(
        JSON.stringify({
          type: "message",
          content: hasToolResult
            ? [{ type: "text", text: "done" }]
            : [
                {
                  type: "tool_use",
                  id: "tool-1",
                  name: "report_probe",
                  input: { value: "ok" },
                },
              ],
        }),
        { status: 200 },
      );
    },
    probes: ["responses-tool-loop", "messages-tool-loop"],
  });
  assert.equal(gatewayTools.gateway.state, "tools_verified");
  assert.equal(responseRequests.length, 2);
  const [initialResponse, continuedResponse] = responseRequests;
  for (const request of responseRequests) {
    assert.equal(request.store, false);
    assert.equal(Object.hasOwn(request, "previous_response_id"), false);
    assert.equal(request.model, GATEWAY_ALIAS);
    assert.ok(Number.isSafeInteger(request.max_output_tokens) && request.max_output_tokens <= 1024);
    assert.equal(request.tools[0].name, "report_probe");
  }
  assert.equal(initialResponse.input[0].role, "user");
  assert.deepEqual(continuedResponse.tools, initialResponse.tools);
  assert.deepEqual(continuedResponse.input, [
    ...initialResponse.input,
    responseCall,
    {
      type: "function_call_output",
      call_id: responseCall.call_id,
      output: JSON.stringify({ ok: true }),
    },
  ]);
  assert.equal(JSON.stringify(gatewayTools).includes(gatewaySecret), false);
});

test("stream cancellation propagates to the bounded request signal", async () => {
  let aborted = false;
  const result = await runProviderCheck({
    credential: "provider-cancel-secret",
    fetchImpl: async (_url, options) => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("data: first\n\n"));
          options.signal.addEventListener(
            "abort",
            () => {
              aborted = true;
              controller.error(new DOMException("aborted", "AbortError"));
            },
            { once: true },
          );
        },
      });
      return new Response(stream, { status: 200 });
    },
    model: "example-model",
    probes: ["cancellation"],
  });
  assert.equal(aborted, true);
  assert.equal(result.provider.results[0].status, "verified");
});

test("client evidence binds cases, process, executable, configuration epoch, and host", async () => {
  await temporaryDirectory("hetzner-client-evidence", async (root) => {
    const host = actualHost(root);
    const invalidatedAt = new Date(Date.now() - 1_000).toISOString();
    const executablePath = fs.realpathSync.native(process.execPath);
    const executableState = await inspectPath(executablePath);
    const manifest = {
      artifacts: [{ role: "gateway-config", sha256: "a".repeat(64) }],
      clients: ["codex", "claude-code"],
      evidence: { invalidatedAt },
      executables: {
        codex: {
          path: executablePath,
          version: process.version,
          sha256: executableState.sha256,
        },
        "claude-code": {
          path: executablePath,
          version: process.version,
          sha256: executableState.sha256,
        },
      },
      host: {
        configRoot: host.configRoot,
        crossBoundary: false,
        kind: host.kind,
        platform: host.platform,
        stateRoot: host.stateRoot,
        wslDistribution: host.wslDistribution,
      },
      model: "example-model",
      process: {
        status: "ready",
        processToken: "a".repeat(64),
        runnerPid: 51_001,
        childPid: 51_002,
        runnerExecutable: executablePath,
        runnerScript: executablePath,
        gatewayExecutable: executablePath,
        gatewayArgsDigest: "b".repeat(64),
        configSha256: "a".repeat(64),
        startedAt: invalidatedAt,
      },
    };
    for (const [component, cases] of [
      ["codex", CODEX_E2E_CASES],
      ["claude-code", CLAUDE_E2E_CASES],
    ]) {
      const evidencePath = path.join(root, `${component}.json`);
      const document = {
        schemaVersion: 1,
        kind: "hetzner-inference-client-e2e",
        component,
        observedAt: new Date().toISOString(),
        source: "manual",
        disposableWorkspace: true,
        hiddenRouting: false,
        model: manifest.model,
        gatewayConfigSha256: manifest.artifacts[0].sha256,
        configurationInvalidatedAt: invalidatedAt,
        processBindingDigest: immutableProcessBindingDigest(manifest.process),
        executable: manifest.executables[component].path,
        executableSha256: manifest.executables[component].sha256,
        version: manifest.executables[component].version,
        host: manifest.host,
        cases: cases.map((name) => ({ name, status: "verified" })),
      };
      await fs.promises.writeFile(evidencePath, stableJson(document));
      const result = await validateClientEvidence(evidencePath, component, manifest);
      assert.equal(result.state, "client_e2e_verified");
      document.host = { ...document.host, wslDistribution: "different-wsl" };
      await fs.promises.writeFile(evidencePath, stableJson(document));
      await assert.rejects(
        validateClientEvidence(evidencePath, component, manifest),
        (error) => error.code === "client_evidence_host_changed",
      );
      document.host = manifest.host;
      document.version = "changed";
      await fs.promises.writeFile(evidencePath, stableJson(document));
      await assert.rejects(
        validateClientEvidence(evidencePath, component, manifest),
        (error) => error.code === "client_evidence_executable_changed",
      );
      document.version = manifest.executables[component].version;
      const restartedManifest = structuredClone(manifest);
      restartedManifest.process.processToken = "c".repeat(64);
      restartedManifest.process.startedAt = new Date().toISOString();
      await fs.promises.writeFile(evidencePath, stableJson(document));
      await assert.rejects(
        validateClientEvidence(evidencePath, component, restartedManifest),
        (error) => error.code === "client_evidence_process_changed",
      );
      await fs.promises.writeFile(
        evidencePath,
        stableJson({ ...document, secretMaterial: "must-not-be-accepted" }),
      );
      await assert.rejects(
        validateClientEvidence(evidencePath, component, manifest),
        (error) => error.code === "client_evidence_invalid",
      );
    }
  });
});

test("WSL client promotion refreshes mount topology immediately before executable proof", async (context) => {
  if (process.platform === "win32") {
    context.skip("WSL path behavior is exercised on POSIX runners");
    return;
  }
  await temporaryDirectory("hetzner-wsl-client-evidence", async (root) => {
    let mountInfo = WSL_WINDOWS_MOUNT_INFO;
    const host = detectHost({
      env: {
        CODEX_HOME: path.join(root, "codex-home"),
        WSL_DISTRO_NAME: "nixos",
        XDG_CONFIG_HOME: path.join(root, "config"),
        XDG_STATE_HOME: path.join(root, "state"),
      },
      home: path.join(root, "home"),
      mountInfoProvider: () => mountInfo,
      platform: "linux",
    });
    const toolsRoot = path.join(root, "tools");
    await fs.promises.mkdir(toolsRoot);
    const executablePath = await fakeVersionedExecutable(toolsRoot, "codex", "codex-cli 0.154.0");
    const executableState = await inspectPath(executablePath);
    const invalidatedAt = new Date(Date.now() - 1_000).toISOString();
    const processState = {
      childPid: 52_002,
      configSha256: "a".repeat(64),
      gatewayArgsDigest: "b".repeat(64),
      gatewayExecutable: executablePath,
      processToken: "c".repeat(64),
      runnerExecutable: executablePath,
      runnerPid: 52_001,
      runnerScript: executablePath,
      startedAt: invalidatedAt,
      status: "ready",
    };
    const manifest = {
      artifacts: [{ role: "gateway-config", sha256: "a".repeat(64) }],
      clients: ["codex"],
      evidence: { invalidatedAt },
      executables: {
        codex: {
          path: executablePath,
          sha256: executableState.sha256,
          version: "codex-cli 0.154.0",
        },
      },
      host: {
        configRoot: host.configRoot,
        crossBoundary: false,
        kind: host.kind,
        platform: host.platform,
        stateRoot: host.stateRoot,
        wslDistribution: host.wslDistribution,
      },
      model: "example-model",
      process: processState,
    };
    const evidencePath = path.join(root, "codex-evidence.json");
    await fs.promises.writeFile(
      evidencePath,
      stableJson({
        cases: CODEX_E2E_CASES.map((name) => ({ name, status: "verified" })),
        component: "codex",
        configurationInvalidatedAt: invalidatedAt,
        disposableWorkspace: true,
        executable: executablePath,
        executableSha256: executableState.sha256,
        gatewayConfigSha256: "a".repeat(64),
        hiddenRouting: false,
        host: manifest.host,
        kind: "hetzner-inference-client-e2e",
        model: manifest.model,
        observedAt: new Date().toISOString(),
        processBindingDigest: immutableProcessBindingDigest(processState),
        schemaVersion: EVIDENCE_SCHEMA_VERSION,
        source: "manual",
        version: "codex-cli 0.154.0",
      }),
    );
    const driftedMountInfo = withWslDrvFsMount(executablePath);
    const driftedMounts = parseWslWindowsMounts(driftedMountInfo);
    let executableTargetIo = 0;
    const countsMountedTarget = (target) => {
      if (
        mountInfo === driftedMountInfo &&
        isWslWindowsMountedPath(String(target), driftedMounts)
      ) {
        executableTargetIo += 1;
      }
    };
    const originalLstatSync = fs.lstatSync;
    const originalRealpathNative = fs.realpathSync.native;
    const originalPromisesLstat = fs.promises.lstat;
    fs.lstatSync = (target, ...args) => {
      countsMountedTarget(target);
      return originalLstatSync.call(fs, target, ...args);
    };
    fs.realpathSync.native = (target, ...args) => {
      countsMountedTarget(target);
      return originalRealpathNative.call(fs.realpathSync, target, ...args);
    };
    fs.promises.lstat = async (target, ...args) => {
      countsMountedTarget(target);
      return await originalPromisesLstat.call(fs.promises, target, ...args);
    };
    try {
      await assert.rejects(
        validateClientEvidence(evidencePath, "codex", manifest, Date.now(), host, {
          beforeExecutableVerification: async () => {
            mountInfo = driftedMountInfo;
          },
        }),
        (error) =>
          error.code === "wsl_cross_boundary_path" && error.details.label === "codex executable",
      );
    } finally {
      mountInfo = WSL_WINDOWS_MOUNT_INFO;
      fs.lstatSync = originalLstatSync;
      fs.realpathSync.native = originalRealpathNative;
      fs.promises.lstat = originalPromisesLstat;
    }
    assert.equal(executableTargetIo, 0);
  });
});

test("simultaneous first bootstrap leaves the winning writer state root unchanged", async (context) => {
  if (process.platform === "win32") {
    context.skip("Windows ACL bootstrap stays exclusively with the directory creator");
    return;
  }
  await temporaryDirectory("hetzner-lock-first-bootstrap", async (root) => {
    const host = actualHost(root);
    const paths = managedPaths(host);
    const lockModule = path.resolve(
      currentDirectory,
      "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/lock.mjs",
    );
    const creatorReady = path.join(root, "creator-ready");
    const releaseCreator = path.join(root, "release-creator");
    const creatorResult = path.join(root, "creator-result.json");
    const winnerReady = path.join(root, "winner-ready");
    const releaseWinner = path.join(root, "release-winner");
    const winnerResult = path.join(root, "winner-result.json");
    const creatorHarness = path.join(root, "bootstrap-creator.mjs");
    const winnerHarness = path.join(root, "bootstrap-winner.mjs");
    const common = [
      'import fs from "node:fs";',
      `import { acquireMutationLock } from ${JSON.stringify(pathToFileURL(lockModule).href)};`,
      `const host = ${JSON.stringify(host)};`,
      `const paths = ${JSON.stringify(paths)};`,
      "const pause = async () => await new Promise((resolve) => setTimeout(resolve, 5));",
      "async function waitFor(target) {",
      "  const deadline = Date.now() + 10_000;",
      "  while (!fs.existsSync(target)) {",
      "    if (Date.now() > deadline) throw new Error(`timed out waiting for ${target}`);",
      "    await pause();",
      "  }",
      "}",
    ];
    await fs.promises.writeFile(
      creatorHarness,
      [
        ...common,
        `const ready = ${JSON.stringify(creatorReady)};`,
        `const release = ${JSON.stringify(releaseCreator)};`,
        `const result = ${JSON.stringify(creatorResult)};`,
        "try {",
        '  await acquireMutationLock(paths, "plan-bootstrap-creator", host, Date.now(), {',
        "    beforeCreatedDirectoryProtection: async ({ segment }) => {",
        "      if (segment !== paths.stateRoot) return;",
        '      fs.writeFileSync(ready, "ready");',
        "      await waitFor(release);",
        "    },",
        "  });",
        '  fs.writeFileSync(result, JSON.stringify({ code: "unexpected_lock_owner" }));',
        "  process.exitCode = 2;",
        "} catch (error) {",
        "  fs.writeFileSync(result, JSON.stringify({ code: error.code ?? null }));",
        '  if (error.code !== "mutation_locked") process.exitCode = 1;',
        "}",
        "",
      ].join("\n"),
    );
    await fs.promises.writeFile(
      winnerHarness,
      [
        ...common,
        `const ready = ${JSON.stringify(winnerReady)};`,
        `const release = ${JSON.stringify(releaseWinner)};`,
        `const result = ${JSON.stringify(winnerResult)};`,
        "try {",
        '  const lock = await acquireMutationLock(paths, "plan-bootstrap-winner", host);',
        '  fs.writeFileSync(ready, "ready");',
        "  await waitFor(release);",
        "  await lock.release();",
        '  fs.writeFileSync(result, JSON.stringify({ code: "released" }));',
        "} catch (error) {",
        "  fs.writeFileSync(result, JSON.stringify({ code: error.code ?? null }));",
        "  process.exitCode = 1;",
        "}",
        "",
      ].join("\n"),
    );

    const creator = spawn(process.execPath, [creatorHarness], { stdio: "ignore" });
    let winner = null;
    try {
      await waitUntil(() => fs.existsSync(creatorReady), 10_000);
      winner = spawn(process.execPath, [winnerHarness], { stdio: "ignore" });
      await waitUntil(() => fs.existsSync(winnerReady), 10_000);
      const before = await fs.promises.lstat(paths.stateRoot, { bigint: true });
      await fs.promises.writeFile(releaseCreator, "release");
      await waitUntil(() => fs.existsSync(creatorResult), 10_000);
      await waitUntil(() => creator.exitCode !== null || creator.signalCode !== null, 10_000);
      assert.equal(creator.exitCode, 0);
      assert.deepEqual(await readJson(creatorResult), { code: "mutation_locked" });
      const after = await fs.promises.lstat(paths.stateRoot, { bigint: true });
      for (const field of ["birthtimeNs", "ctimeNs", "dev", "ino", "mode", "mtimeNs", "nlink"]) {
        assert.equal(after[field], before[field], `first-bootstrap state root ${field}`);
      }
      await fs.promises.writeFile(releaseWinner, "release");
      await waitUntil(() => fs.existsSync(winnerResult), 10_000);
      await waitUntil(() => winner.exitCode !== null || winner.signalCode !== null, 10_000);
      assert.equal(winner.exitCode, 0);
      assert.deepEqual(await readJson(winnerResult), { code: "released" });
    } finally {
      for (const marker of [releaseCreator, releaseWinner]) {
        if (!fs.existsSync(marker)) fs.writeFileSync(marker, "release");
      }
      const children = [creator, winner].filter(Boolean);
      for (const child of children) {
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
      }
      await Promise.all(
        children.map(
          (child) =>
            new Promise((resolve) => {
              if (child.exitCode !== null || child.signalCode !== null) resolve();
              else child.once("close", resolve);
            }),
        ),
      );
    }
  });
});

test("failed lock publication preserves an in-place content replacement", async () => {
  await temporaryDirectory("hetzner-lock-failed-publication", async (root) => {
    const host = actualHost(root);
    const paths = managedPaths(host);
    let replacement = null;
    await assert.rejects(
      acquireMutationLock(paths, "plan-failed-publication", host, Date.now(), {
        afterLockWrite() {
          throw new Error("injected post-write lock publication failure");
        },
        beforeFailedPublicationCleanup({ descriptor, snapshot }) {
          replacement = Buffer.alloc(Number(snapshot.size), "x");
          fs.ftruncateSync(descriptor, 0);
          assert.equal(
            fs.writeSync(descriptor, replacement, 0, replacement.length, 0),
            replacement.length,
          );
          fs.fsyncSync(descriptor);
        },
      }),
      (error) => error.code === "lock_ownership_lost" && error.details.cleanupSafe === false,
    );
    assert.ok(replacement?.length > 0);
    assert.deepEqual(await fs.promises.readFile(paths.lock), replacement);
  });
});

test("mutation lock is exclusive, identity-bound during mutation, and fail-closed on release", async () => {
  await temporaryDirectory("hetzner-lock", async (root) => {
    const host = actualHost(root);
    const paths = managedPaths(host);
    const lock = await acquireMutationLock(paths, "plan-a", host);
    await assert.rejects(
      acquireMutationLock(paths, "plan-b", host),
      (error) => error.code === "mutation_locked",
    );
    const stateRootBefore = await fs.promises.lstat(paths.stateRoot, { bigint: true });
    const lockBefore = await fs.promises.lstat(paths.lock, { bigint: true });
    const lockBytesBefore = await fs.promises.readFile(paths.lock);
    const lockModule = path.resolve(
      currentDirectory,
      "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/lock.mjs",
    );
    const losingWriterHarness = path.join(root, "losing-lock-writer.mjs");
    await fs.promises.writeFile(
      losingWriterHarness,
      [
        `import { acquireMutationLock } from ${JSON.stringify(pathToFileURL(lockModule).href)};`,
        `const host = ${JSON.stringify(host)};`,
        `const paths = ${JSON.stringify(paths)};`,
        "try {",
        '  await acquireMutationLock(paths, "plan-losing-process", host);',
        '  throw new Error("losing writer unexpectedly acquired the lock");',
        "} catch (error) {",
        '  if (error.code !== "mutation_locked") throw error;',
        '  process.stdout.write("mutation_locked\\n");',
        "}",
        "",
      ].join("\n"),
    );
    const losingWriter = spawnSync(process.execPath, [losingWriterHarness], {
      encoding: "utf8",
      timeout: 10_000,
    });
    assert.equal(losingWriter.status, 0, losingWriter.stderr || losingWriter.error?.message);
    assert.equal(losingWriter.stdout, "mutation_locked\n");
    const stateRootAfter = await fs.promises.lstat(paths.stateRoot, { bigint: true });
    const lockAfter = await fs.promises.lstat(paths.lock, { bigint: true });
    for (const field of ["birthtimeNs", "ctimeNs", "dev", "ino", "mode", "mtimeNs", "nlink"]) {
      assert.equal(stateRootAfter[field], stateRootBefore[field], `state root ${field}`);
      assert.equal(lockAfter[field], lockBefore[field], `lock ${field}`);
    }
    assert.deepEqual(await fs.promises.readFile(paths.lock), lockBytesBefore);
    await lock.assertOwned();
    const observations = await offlineObservations(paths);
    const guard = new MutationGuard({
      host,
      lock,
      paths,
      plan: {
        desiredFiles: {},
        operations: [],
        state: { observations },
        workflow: "setup",
      },
    });
    await fs.promises.unlink(paths.lock);
    await assert.rejects(guard.check(), (error) => error.code === "lock_ownership_lost");
    await assert.rejects(lock.release(), (error) => error.code === "lock_ownership_lost");

    const replacementLock = await acquireMutationLock(paths, "plan-replacement-race", host);
    await atomicWriteJson(paths.lock, {
      schemaVersion: 1,
      planId: "other-plan",
      nonce: crypto.randomUUID(),
      pid: process.pid,
      acquiredAt: new Date().toISOString(),
    });
    await assert.rejects(
      replacementLock.assertOwned(),
      (error) => error.code === "lock_ownership_lost",
    );
    await assert.rejects(
      replacementLock.release(),
      (error) => error.code === "lock_ownership_lost",
    );
    assert.equal((await readJson(paths.lock)).planId, "other-plan");
    await fs.promises.unlink(paths.lock);

    const tamperedLock = await acquireMutationLock(paths, "plan-content-race", host);
    const tamperedDocument = await readJson(paths.lock);
    await fs.promises.writeFile(
      paths.lock,
      stableJson({ ...tamperedDocument, acquiredAt: "2000-01-01T00:00:00.000Z" }),
    );
    await assert.rejects(
      tamperedLock.assertOwned(),
      (error) => error.code === "lock_ownership_lost" && error.details.cleanupSafe === false,
    );
    await assert.rejects(
      tamperedLock.release(),
      (error) => error.code === "lock_ownership_lost" && error.details.cleanupSafe === false,
    );
    assert.equal((await readJson(paths.lock)).acquiredAt, "2000-01-01T00:00:00.000Z");
    await fs.promises.unlink(paths.lock);

    const stopBoundaryLock = await acquireMutationLock(paths, "plan-stop-boundary", host);
    await assert.rejects(
      writeStopRequest(paths, host, "e".repeat(64), Date.now(), {
        assertMutationOwned: async () => await stopBoundaryLock.assertOwned(),
        beforePublish: async () => await fs.promises.unlink(paths.lock),
      }),
      (error) => error.code === "lock_ownership_lost" && error.details.cleanupSafe === false,
    );
    assert.equal((await inspectPath(paths.processStopRequest, { hash: false })).kind, "absent");
    await assert.rejects(
      stopBoundaryLock.release(),
      (error) => error.code === "lock_ownership_lost",
    );

    const removalTarget = path.join(root, "lock-bound-removal");
    await atomicWrite(removalTarget, "owned removal value\n");
    const removalState = await inspectPath(removalTarget);
    const claimBoundaryLock = await acquireMutationLock(paths, "plan-claim-boundary", host);
    await assert.rejects(
      removeFileIfOwned(removalTarget, removalState.sha256, {
        assertMutationOwned: async () => await claimBoundaryLock.assertOwned(),
        beforeClaim: async () => await fs.promises.unlink(paths.lock),
      }),
      (error) => error.code === "lock_ownership_lost" && error.details.cleanupSafe === false,
    );
    assert.equal(await fs.promises.readFile(removalTarget, "utf8"), "owned removal value\n");
    await assert.rejects(
      claimBoundaryLock.release(),
      (error) => error.code === "lock_ownership_lost",
    );

    const removeBoundaryLock = await acquireMutationLock(paths, "plan-remove-boundary", host);
    let removalQuarantine;
    await assert.rejects(
      removeFileIfOwned(removalTarget, removalState.sha256, {
        assertMutationOwned: async () => await removeBoundaryLock.assertOwned(),
        beforeRemove: async ({ quarantine }) => {
          removalQuarantine = quarantine;
          await fs.promises.unlink(paths.lock);
        },
      }),
      (error) =>
        error.code === "lock_ownership_lost" &&
        error.details.cleanupSafe === false &&
        error.details.quarantinePath === removalQuarantine,
    );
    assert.equal((await inspectPath(removalTarget, { hash: false })).kind, "absent");
    assert.equal(await fs.promises.readFile(removalQuarantine, "utf8"), "owned removal value\n");
    await assert.rejects(
      removeBoundaryLock.release(),
      (error) => error.code === "lock_ownership_lost",
    );
    await fs.promises.unlink(removalQuarantine);

    const releaseRaceLock = await acquireMutationLock(paths, "plan-release-race", host);
    const releaseRaceBytes = await fs.promises.readFile(paths.lock);
    const displacedReleaseLock = `${paths.lock}.displaced`;
    await assert.rejects(
      releaseRaceLock.release({
        afterOwnershipAssertion: async () => {
          await fs.promises.rename(paths.lock, displacedReleaseLock);
          await fs.promises.writeFile(paths.lock, releaseRaceBytes);
        },
      }),
      (error) => error.code === "lock_ownership_lost" && error.details.cleanupSafe === false,
    );
    assert.deepEqual(await fs.promises.readFile(paths.lock), releaseRaceBytes);
    assert.deepEqual(await fs.promises.readFile(displacedReleaseLock), releaseRaceBytes);
    await fs.promises.unlink(paths.lock);
    await fs.promises.unlink(displacedReleaseLock);

    const finalBoundaryLock = await acquireMutationLock(paths, "plan-final-boundary", host);
    const finalBoundaryBytes = await fs.promises.readFile(paths.lock);
    let finalBoundaryQuarantine = null;
    let displacedFinalClaim = null;
    await assert.rejects(
      finalBoundaryLock.release({
        beforeRemove: async ({ quarantine }) => {
          finalBoundaryQuarantine = quarantine;
          displacedFinalClaim = `${quarantine}.displaced`;
          await fs.promises.rename(quarantine, displacedFinalClaim);
          await fs.promises.writeFile(quarantine, finalBoundaryBytes);
        },
      }),
      (error) =>
        error.code === "lock_ownership_lost" &&
        error.details.cleanupSafe === false &&
        error.details.quarantinePath === finalBoundaryQuarantine,
    );
    assert.equal((await inspectPath(paths.lock, { hash: false })).kind, "absent");
    assert.deepEqual(await fs.promises.readFile(finalBoundaryQuarantine), finalBoundaryBytes);
    assert.deepEqual(await fs.promises.readFile(displacedFinalClaim), finalBoundaryBytes);
    await fs.promises.unlink(finalBoundaryQuarantine);
    await fs.promises.unlink(displacedFinalClaim);

    const finalLock = await acquireMutationLock(paths, "plan-final", host);
    await finalLock.release();
    assert.equal((await inspectPath(paths.lock, { hash: false })).kind, "absent");
  });
});

test("lock release has no asynchronous unlink boundary after final verification", async () => {
  await temporaryDirectory("hetzner-lock-sync-release", async (root) => {
    const host = actualHost(root);
    const paths = managedPaths(host);
    const lockModule = path.resolve(
      currentDirectory,
      "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/lock.mjs",
    );
    const harness = path.join(root, "lock-sync-release.mjs");
    await fs.promises.writeFile(
      harness,
      [
        'import fs from "node:fs";',
        `import { acquireMutationLock } from ${JSON.stringify(pathToFileURL(lockModule).href)};`,
        `const host = ${JSON.stringify(host)};`,
        `const paths = ${JSON.stringify(paths)};`,
        'const lock = await acquireMutationLock(paths, "plan-sync-release", host);',
        "const originalUnlink = fs.promises.unlink.bind(fs.promises);",
        "let asyncUnlinkCalled = false;",
        "fs.promises.unlink = async (claimPath) => {",
        "  asyncUnlinkCalled = true;",
        "  await fs.promises.rename(claimPath, `${claimPath}.displaced`);",
        '  await fs.promises.writeFile(claimPath, "replacement");',
        "  return await originalUnlink(claimPath);",
        "};",
        "try {",
        "  await lock.release();",
        "} finally {",
        "  fs.promises.unlink = originalUnlink;",
        "}",
        'if (asyncUnlinkCalled) throw new Error("lock release yielded to async unlink");',
        "const lockExists = await fs.promises.lstat(paths.lock).then(() => true, () => false);",
        'if (lockExists) throw new Error("released lock pathname still exists");',
        'process.stdout.write("sync-release-ok\\n");',
        "",
      ].join("\n"),
    );
    const result = spawnSync(process.execPath, [harness], {
      encoding: "utf8",
      timeout: 5_000,
    });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    assert.equal(result.stdout, "sync-release-ok\n");
  });
});

test("rollback integration removes only owned state, preserves credentials, and is idempotent", async (context) => {
  await temporaryDirectory("hetzner-rollback", async (root) => {
    const host = actualHost(root);
    const paths = managedPaths(host);
    for (const directory of [
      paths.configRoot,
      paths.stateRoot,
      paths.secretsDir,
      paths.binDir,
      path.dirname(paths.gatewayConfig),
      paths.backupsRoot,
      path.join(paths.backupsRoot, "fixture"),
      paths.runtimeRoot,
      paths.venvRoot,
    ]) {
      await protectedDirectory(directory, host);
    }
    const codexParent = path.dirname(paths.codexProfile);
    await protectedDirectory(codexParent, host, { external: true });
    const codexParentBefore = await inspectProtectedDirectoryBoundary(codexParent, host, {
      external: true,
    });
    const providerValue = "provider-value-preserved";
    const gatewayValue = gatewayCredential("p");
    const provider = await protectedFile(paths.providerSecret, providerValue, host);
    const gateway = await protectedFile(paths.gatewaySecret, gatewayValue, host);
    const config = await protectedFile(paths.gatewayConfig, "model_list: []\n", host);
    const backupPath = path.join(paths.backupsRoot, "fixture", "gateway-config.bak");
    const backup = await protectedFile(backupPath, "prior gateway config\n", host);
    const credentialHelper = await protectedFile(
      paths.credentialHelper,
      "credential helper\n",
      host,
      0o700,
    );
    const protectedFileHelper = await protectedFile(
      paths.protectedFileHelper,
      "protected file helper\n",
      host,
      0o700,
    );
    const gatewayRunner = await protectedFile(paths.gatewayRunner, "gateway runner\n", host, 0o700);
    const codexProfile = await protectedFile(paths.codexProfile, "codex profile\n", host);
    const runtimeFile = path.join(paths.venvRoot, "runtime.txt");
    await protectedFile(runtimeFile, "owned runtime\n", host);
    const runtime = await inventoryTree(paths.venvRoot, { allowSymlinks: true });
    const nodeExecutable = fs.realpathSync.native(process.execPath);
    const nodeExecutableState = await inspectPath(nodeExecutable);
    let now = Date.now();
    const manifest = {
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      kind: "hetzner-inference-install-manifest",
      skillVersion: SKILL_VERSION,
      createdAt: new Date(now - 2_000).toISOString(),
      updatedAt: new Date(now - 1_000).toISOString(),
      lastPlanId: "initial-plan",
      model: "example-model",
      clients: ["codex"],
      host: {
        kind: host.kind,
        platform: host.platform,
        configRoot: paths.configRoot,
        stateRoot: paths.stateRoot,
        codexHome: host.codexHome,
        wslDistribution: host.wslDistribution,
        crossBoundary: false,
      },
      executables: {
        node: {
          path: nodeExecutable,
          version: process.version,
          sha256: nodeExecutableState.sha256,
        },
        python: { path: null, version: null },
        codex: {
          path: nodeExecutable,
          version: process.version,
          sha256: nodeExecutableState.sha256,
        },
        "claude-code": { path: null, version: null },
        cursor: { path: null, version: null },
      },
      discoveryEvidence: null,
      litellm: { pin: LITELLM_PIN, package: `litellm[proxy]==${LITELLM_PIN}` },
      runtime: {
        treeDigest: runtime.digest,
        treeEntries: runtime.count,
        pythonExecutable: runtimeFile,
        pythonVersion: "Python test",
        litellmExecutable: fs.realpathSync.native(runtimeFile),
        litellmVersion: LITELLM_PIN,
        packages: [`litellm==${LITELLM_PIN}`],
      },
      artifacts: [
        {
          path: paths.codexProfile,
          role: "codex-profile",
          sha256: codexProfile.sha256,
          mode: 0o600,
          rollback: "remove",
        },
        {
          path: paths.credentialHelper,
          role: "credential-helper",
          sha256: credentialHelper.sha256,
          mode: 0o700,
          rollback: "remove",
        },
        {
          path: paths.gatewayConfig,
          role: "gateway-config",
          sha256: config.sha256,
          mode: 0o600,
          rollback: "remove",
        },
        {
          path: paths.gatewayRunner,
          role: "gateway-runner",
          sha256: gatewayRunner.sha256,
          mode: 0o700,
          rollback: "remove",
        },
        {
          path: paths.protectedFileHelper,
          role: "protected-file-helper",
          sha256: protectedFileHelper.sha256,
          mode: 0o700,
          rollback: "remove",
        },
      ],
      backups: [
        {
          path: backupPath,
          target: paths.gatewayConfig,
          sha256: backup.sha256,
          mode: 0o600,
        },
      ],
      credentials: {
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
      },
      components: {
        provider: "configured",
        gateway: "configured",
        codex: "configured",
        "claude-code": "blocked",
        cursor: "blocked",
      },
      evidence: {
        invalidatedAt: new Date(now - 1_000).toISOString(),
        reason: "test-fixture",
      },
      process: { status: "not-started" },
      rollbackActions: [],
    };
    manifest.rollbackActions = [
      ...manifest.artifacts.map((artifact) => ({
        action: "remove-owned-file",
        path: artifact.path,
        sha256: artifact.sha256,
      })),
      {
        action: "remove-owned-runtime",
        path: paths.venvRoot,
        treeDigest: runtime.digest,
      },
      { action: "preserve-credential", path: paths.providerSecret },
      { action: "preserve-credential", path: paths.gatewaySecret },
    ];
    await atomicWriteJson(paths.manifest, manifest, { mode: 0o600 });
    await securePathPermissions(paths.manifest, host, 0o600);

    const unknownSecret = "unknown-manifest-secret-must-not-print";
    const unknownRootField = { ...manifest, secretMaterial: unknownSecret };
    await atomicWriteJson(paths.manifest, unknownRootField, { mode: 0o600 });
    await securePathPermissions(paths.manifest, host, 0o600);
    await assert.rejects(
      loadManifest(paths, { required: true }),
      (error) => error.code === "manifest_unknown_field",
    );
    const diagnosis = runSetupEntrypoint(root, ["diagnose"]);
    assert.equal(diagnosis.status, 5, diagnosis.stderr);
    assert.ok(
      diagnosis.stderr,
      JSON.stringify({
        error: diagnosis.error?.message ?? null,
        signal: diagnosis.signal,
        status: diagnosis.status,
        stdout: diagnosis.stdout,
      }),
    );
    assert.equal(JSON.parse(diagnosis.stderr).error.code, "manifest_unknown_field");
    assert.doesNotMatch(`${diagnosis.stdout}\n${diagnosis.stderr}`, new RegExp(unknownSecret));

    const unknownNestedField = structuredClone(manifest);
    unknownNestedField.runtime.secretMaterial = unknownSecret;
    await atomicWriteJson(paths.manifest, unknownNestedField, { mode: 0o600 });
    await securePathPermissions(paths.manifest, host, 0o600);
    await assert.rejects(
      loadManifest(paths, { required: true }),
      (error) => error.code === "manifest_unknown_field",
    );
    await atomicWriteJson(paths.manifest, manifest, { mode: 0o600 });
    await securePathPermissions(paths.manifest, host, 0o600);

    const tamperedManifest = structuredClone(manifest);
    tamperedManifest.artifacts[0].path = path.join(root, "outside-owned-set");
    await atomicWriteJson(paths.manifest, tamperedManifest, { mode: 0o600 });
    await assert.rejects(
      loadManifest(paths, { required: true }),
      (error) => error.code === "manifest_artifact_invalid",
    );
    await atomicWriteJson(paths.manifest, manifest, { mode: 0o600 });
    await securePathPermissions(paths.manifest, host, 0o600);

    const missingComponents = structuredClone(manifest);
    delete missingComponents.components.cursor;
    await atomicWriteJson(paths.manifest, missingComponents, { mode: 0o600 });
    await assert.rejects(
      loadManifest(paths, { required: true }),
      (error) => error.code === "manifest_components_invalid",
    );
    const falseProofState = structuredClone(manifest);
    falseProofState.components.gateway = "live_verified_without_evidence";
    await atomicWriteJson(paths.manifest, falseProofState, { mode: 0o600 });
    await assert.rejects(
      loadManifest(paths, { required: true }),
      (error) => error.code === "manifest_components_invalid",
    );
    await atomicWriteJson(paths.manifest, manifest, { mode: 0o600 });
    await securePathPermissions(paths.manifest, host, 0o600);

    const activeManifest = {
      ...manifest,
      process: {
        status: "ready",
        processToken: "a".repeat(64),
        runnerPid: 41_001,
        childPid: 41_002,
        runnerExecutable: fs.realpathSync.native(process.execPath),
        runnerScript: fs.realpathSync.native(paths.gatewayRunner),
        gatewayExecutable: manifest.runtime.litellmExecutable,
        gatewayArgsDigest: crypto
          .createHash("sha256")
          .update(
            JSON.stringify([
              "--config",
              paths.gatewayConfig,
              "--host",
              "127.0.0.1",
              "--port",
              "4000",
            ]),
          )
          .digest("hex"),
        configSha256: config.sha256,
        startedAt: new Date(now - 500).toISOString(),
      },
    };
    await atomicWriteJson(paths.manifest, activeManifest, { mode: 0o600 });
    await securePathPermissions(paths.manifest, host, 0o600);
    const readyReceipt = {
      schemaVersion: 1,
      ...activeManifest.process,
      configPath: fs.realpathSync.native(paths.gatewayConfig),
      host: "127.0.0.1",
      port: 4000,
      heartbeatAt: new Date(now).toISOString(),
    };
    await atomicWriteJson(paths.processReceipt, readyReceipt, { mode: 0o600 });
    await securePathPermissions(paths.processReceipt, host, 0o600);
    const publicationManifest = {
      ...activeManifest,
      process: { ...activeManifest.process, runnerPid: process.pid },
    };
    const publicationReceipt = { ...readyReceipt, runnerPid: process.pid };
    await protectedFile(paths.manifest, stableJson(publicationManifest), host);
    for (const operation of ["namespace", "observations"]) {
      for (const phase of ["temporary", "quarantine"]) {
        await protectedFile(paths.processReceipt, stableJson(publicationReceipt), host);
        let entered;
        const waiting = new Promise((resolve) => {
          entered = resolve;
        });
        let release;
        const gate = new Promise((resolve) => {
          release = resolve;
        });
        const write = runnerAtomicJson(
          paths.processReceipt,
          {
            ...publicationReceipt,
            heartbeatAt: new Date().toISOString(),
          },
          {
            async assertBoundaryAsync(boundary) {
              if (phase === "temporary" && boundary.phase === "after-temporary-protection") {
                entered();
                await gate;
              }
            },
            async afterClaim() {
              if (phase === "quarantine") {
                entered();
                await gate;
              }
            },
          },
        );
        await waiting;
        let retries = 0;
        const dependencies = {
          host,
          manifest: publicationManifest,
          receiptPublicationDelay: async () => {
            retries += 1;
            release();
            await write;
          },
        };
        try {
          if (operation === "namespace") {
            assert.deepEqual(await managedNamespaceFindings(paths, dependencies), []);
          } else {
            const observations = await offlineObservations(paths, [], host, dependencies);
            assert.deepEqual(observations[paths.processReceipt], { kind: "file" });
            assert.deepEqual(observations[`${paths.stateRoot}::entries`].unexpected, []);
          }
          assert.equal(retries, 1, `${operation} must re-read the entire ${phase} snapshot`);
        } finally {
          release();
          await write;
        }
      }
    }
    const foreignPublication = path.join(
      paths.stateRoot,
      `.process-receipt.json.${process.pid + 1}.${crypto.randomUUID()}.tmp`,
    );
    await protectedFile(foreignPublication, "foreign-publication", host);
    const foreignFindings = await managedNamespaceFindings(paths, {
      host,
      manifest: publicationManifest,
      receiptPublicationDelay() {
        throw new Error("foreign publication must not retry");
      },
    });
    assert.ok(foreignFindings.some((finding) => finding.path === foreignPublication));
    assert.equal(await fs.promises.readFile(foreignPublication, "utf8"), "foreign-publication");
    await fs.promises.unlink(foreignPublication);
    const unsafePublication = path.join(
      paths.stateRoot,
      `.process-receipt.json.${process.pid}.${crypto.randomUUID()}.tmp`,
    );
    await fs.promises.mkdir(unsafePublication);
    await assert.rejects(
      managedNamespaceFindings(paths, { host, manifest: publicationManifest }),
      (error) => error.code === "unexpected_managed_entry",
    );
    await fs.promises.rmdir(unsafePublication);
    if (process.platform !== "win32") {
      await fs.promises.symlink(paths.processReceipt, unsafePublication);
      await assert.rejects(
        managedNamespaceFindings(paths, { host, manifest: publicationManifest }),
        (error) => error.code === "unexpected_managed_entry",
      );
      assert.equal((await fs.promises.lstat(unsafePublication)).isSymbolicLink(), true);
      await fs.promises.unlink(unsafePublication);
    }
    for (const [change, code] of [
      [
        { processToken: "b".repeat(64), heartbeatAt: new Date().toISOString() },
        "process_identity_mismatch",
      ],
      [{ heartbeatAt: new Date(Date.now() - 20_000).toISOString() }, "process_identity_stale"],
    ]) {
      await protectedFile(unsafePublication, "synthetic-publication", host);
      await assert.rejects(
        managedNamespaceFindings(paths, {
          host,
          manifest: publicationManifest,
          receiptPublicationDelay: async () => {
            await fs.promises.unlink(unsafePublication);
            await protectedFile(
              paths.processReceipt,
              stableJson({ ...publicationReceipt, ...change }),
              host,
            );
          },
        }),
        (error) => error.code === code,
      );
    }
    await protectedFile(paths.processReceipt, stableJson(publicationReceipt), host);
    await protectedFile(unsafePublication, "persistent-recovery-file", host);
    await assert.rejects(
      managedNamespaceFindings(paths, { host, manifest: publicationManifest }),
      (error) => error.code === "unexpected_managed_entry",
    );
    assert.equal(await fs.promises.readFile(unsafePublication, "utf8"), "persistent-recovery-file");
    await fs.promises.unlink(unsafePublication);
    await protectedFile(paths.manifest, stableJson(activeManifest), host);
    await protectedFile(paths.processReceipt, stableJson(readyReceipt), host);

    const ownedStatus = await installationStatus(host, paths, now);
    assert.equal(ownedStatus.process, "owned_ready");
    let proofClock = now - 1;
    const originalReadFile = fs.promises.readFile;
    const clockMock = context.mock.method(Date, "now", () => proofClock);
    const readMock = context.mock.method(fs.promises, "readFile", async (target, ...args) => {
      const value = await originalReadFile(target, ...args);
      if (target === paths.manifest) proofClock = now + 1;
      return value;
    });
    try {
      const refreshed = await requireCurrentGatewayProof(host, paths);
      assert.equal(refreshed.binding.processReceiptDigest, digestJson(readyReceipt));
      proofClock = now - 1;
      assert.equal((await installationStatus(host, paths)).process, "owned_ready");
      let refreshedDuringHashing = false;
      const delayedStatus = await installationStatus(host, paths, undefined, {
        verifyRestrictedFilePermissions: async (...args) => {
          if (!refreshedDuringHashing) {
            refreshedDuringHashing = true;
            proofClock = now + 20_000;
            await protectedFile(
              paths.processReceipt,
              stableJson({ ...readyReceipt, heartbeatAt: new Date(proofClock).toISOString() }),
              host,
            );
          }
          return await verifyRestrictedFilePermissions(...args);
        },
      });
      assert.equal(refreshedDuringHashing, true);
      assert.equal(delayedStatus.process, "owned_ready", "read heartbeat after expensive hashing");
      await assert.rejects(
        requireCurrentGatewayProof(host, paths, now - 1),
        (error) => error.code === "process_identity_stale",
      );
    } finally {
      readMock.mock.restore();
      clockMock.mock.restore();
      await protectedFile(paths.processReceipt, stableJson(readyReceipt), host);
    }
    const proof = await requireCurrentGatewayProof(host, paths, now);
    assert.equal(proof.binding.manifestPlanId, activeManifest.lastPlanId);
    assert.equal(proof.binding.gatewayConfigSha256, config.sha256);
    assert.equal(
      proof.binding.processBindingDigest,
      immutableProcessBindingDigest(activeManifest.process),
    );

    const receiptSecret = "unknown-process-receipt-secret";
    await atomicWriteJson(
      paths.processReceipt,
      { ...readyReceipt, secretMaterial: receiptSecret },
      { mode: 0o600 },
    );
    await securePathPermissions(paths.processReceipt, host, 0o600);
    await assert.rejects(
      readProcessReceipt(paths, host),
      (error) => error.code === "process_receipt_invalid",
    );
    const unknownReceiptStatus = await installationStatus(host, paths, now);
    assert.equal(unknownReceiptStatus.process, "not_proven_running");
    await assert.rejects(
      requireCurrentGatewayProof(host, paths, now),
      (error) => error.code === "process_receipt_invalid",
    );
    await assert.rejects(
      stopOwnedGateway({ host, manifest: activeManifest, paths, now }),
      (error) => error.code === "process_receipt_invalid",
    );
    const unknownReceiptCli = runSetupEntrypoint(root, ["status"]);
    assert.doesNotMatch(
      `${unknownReceiptCli.stdout}\n${unknownReceiptCli.stderr}`,
      new RegExp(receiptSecret),
    );

    await atomicWriteJson(paths.processReceipt, { ...readyReceipt, exitCode: 0 }, { mode: 0o600 });
    await securePathPermissions(paths.processReceipt, host, 0o600);
    await assert.rejects(
      readProcessReceipt(paths, host),
      (error) => error.code === "process_receipt_invalid",
    );
    await atomicWriteJson(paths.processReceipt, readyReceipt, { mode: 0o600 });
    await securePathPermissions(paths.processReceipt, host, 0o600);

    if (process.platform === "win32") {
      const icacls = path.join(process.env.SystemRoot, "System32", "icacls.exe");
      const acl = spawnSync(icacls, [paths.gatewayConfig, "/grant", "*S-1-1-0:(R)"], {
        encoding: "utf8",
        windowsHide: true,
      });
      assert.equal(acl.status, 0, acl.stderr);
    } else {
      await fs.promises.chmod(paths.gatewayConfig, 0o644);
    }
    await assert.rejects(
      requireCurrentGatewayProof(host, paths, now),
      (error) =>
        error.code === "installation_drift" &&
        error.details.findings.some((finding) =>
          ["owned_artifact_mode_mismatch", "owned_artifact_permissions_invalid"].includes(
            finding.code,
          ),
        ),
    );
    await securePathPermissions(paths.gatewayConfig, host, 0o600);

    await atomicWrite(paths.gatewayConfig, "drifted gateway config\n", { mode: 0o600 });
    await securePathPermissions(paths.gatewayConfig, host, 0o600);
    await assert.rejects(
      requireCurrentGatewayProof(host, paths, now),
      (error) => error.code === "installation_drift",
    );
    await atomicWrite(paths.gatewayConfig, "model_list: []\n", { mode: 0o600 });
    await securePathPermissions(paths.gatewayConfig, host, 0o600);

    await fs.promises.unlink(paths.processReceipt);
    await assert.rejects(
      requireCurrentGatewayProof(host, paths, now),
      (error) => error.code === "process_receipt_missing",
    );
    await atomicWriteJson(paths.processReceipt, readyReceipt, { mode: 0o600 });
    await securePathPermissions(paths.processReceipt, host, 0o600);

    await atomicWriteJson(
      paths.processReceipt,
      { ...readyReceipt, configSha256: "0".repeat(64) },
      { mode: 0o600 },
    );
    await securePathPermissions(paths.processReceipt, host, 0o600);
    const mismatchedStatus = await installationStatus(host, paths, now);
    assert.equal(mismatchedStatus.process, "not_proven_running");
    assert.equal(mismatchedStatus.components.gateway, "blocked");
    assert.ok(
      mismatchedStatus.processVerification.findings.some(
        (finding) => finding.code === "process_identity_mismatch",
      ),
    );

    const malformedReceipt = { ...readyReceipt };
    delete malformedReceipt.childPid;
    await atomicWriteJson(paths.processReceipt, malformedReceipt, { mode: 0o600 });
    await securePathPermissions(paths.processReceipt, host, 0o600);
    const malformedStatus = await installationStatus(host, paths, now);
    assert.equal(malformedStatus.process, "not_proven_running");
    assert.ok(
      malformedStatus.processVerification.findings.some(
        (finding) => finding.code === "process_receipt_invalid",
      ),
    );

    await atomicWriteJson(paths.processReceipt, readyReceipt, { mode: 0o600 });
    await securePathPermissions(paths.processReceipt, host, 0o600);
    if (process.platform === "win32") {
      const icacls = path.join(process.env.SystemRoot, "System32", "icacls.exe");
      const acl = spawnSync(icacls, [paths.processReceipt, "/grant", "*S-1-1-0:(R)"], {
        encoding: "utf8",
        windowsHide: true,
      });
      assert.equal(acl.status, 0, acl.stderr);
    } else {
      await fs.promises.chmod(paths.processReceipt, 0o644);
    }
    const exposedReceiptStatus = await installationStatus(host, paths, now);
    assert.equal(exposedReceiptStatus.process, "not_proven_running");
    assert.equal(exposedReceiptStatus.processVerification.ok, false);
    await fs.promises.unlink(paths.processReceipt);

    const missingReceiptPlan = await createPlan({
      host,
      now,
      options: { workflow: "rollback" },
      paths,
    });
    await assert.rejects(
      consumePlan({
        approval: missingReceiptPlan.planId,
        command: "rollback",
        host,
        now,
        paths,
        plan: missingReceiptPlan,
      }),
      (error) => error.code === "process_receipt_missing",
    );
    assert.equal((await readRollbackState(paths, host)).kind, "hetzner-inference-rollback-journal");
    assert.equal((await inspectPath(paths.gatewayRunner)).sha256, gatewayRunner.sha256);
    if (process.platform === "win32") {
      const icacls = path.join(process.env.SystemRoot, "System32", "icacls.exe");
      const acl = spawnSync(icacls, [backupPath, "/grant", "*S-1-1-0:(R)"], {
        encoding: "utf8",
        windowsHide: true,
      });
      assert.equal(acl.status, 0, acl.stderr);
    } else {
      await fs.promises.chmod(backupPath, 0o644);
    }
    await assert.rejects(
      consumePlan({
        approval: missingReceiptPlan.planId,
        command: "rollback",
        host,
        now,
        paths,
        plan: missingReceiptPlan,
      }),
      (error) => error.code === "rollback_backup_protection_invalid",
    );
    assert.equal((await inspectPath(backupPath)).sha256, backup.sha256);
    await securePathPermissions(backupPath, host, 0o600);
    await fs.promises.unlink(paths.rollbackReceipt);
    await atomicWriteJson(paths.manifest, manifest, { mode: 0o600 });
    await securePathPermissions(paths.manifest, host, 0o600);

    const cliPlan = runSetupEntrypoint(root, ["plan", "--workflow", "rollback"]);
    assert.ifError(cliPlan.error);
    assert.equal(cliPlan.status, 0, cliPlan.stderr);
    const persistedPlan = path.join(root, "rollback-cli-plan.json");
    await protectedFile(persistedPlan, cliPlan.stdout, host);
    const plan = JSON.parse(cliPlan.stdout);
    now = Date.now();
    assert.deepEqual(
      plan.rollback.artifacts.map((artifact) => artifact.path).sort(),
      [
        paths.codexProfile,
        paths.credentialHelper,
        paths.gatewayConfig,
        paths.gatewayRunner,
        paths.protectedFileHelper,
      ].sort(),
    );
    assert.deepEqual(
      plan.rollback.preserveCredentials,
      [paths.gatewaySecret, paths.providerSecret].sort(),
    );
    assert.deepEqual(plan.rollback.backups, [{ path: backupPath, sha256: backup.sha256 }]);

    const tamperedPlan = structuredClone(plan);
    tamperedPlan.rollback.artifacts[0].path = path.join(root, "outside-approved-set");
    tamperedPlan.planId = digestJson(withoutKeys(tamperedPlan, ["planId"]));
    await assert.rejects(
      consumePlan({
        approval: tamperedPlan.planId,
        command: "rollback",
        host,
        now,
        paths,
        plan: tamperedPlan,
      }),
      (error) => error.code === "plan_rollback_artifacts_mismatch",
    );

    if (process.platform === "win32") {
      const icacls = path.join(process.env.SystemRoot, "System32", "icacls.exe");
      const acl = spawnSync(icacls, [backupPath, "/grant", "*S-1-1-0:(R)"], {
        encoding: "utf8",
        windowsHide: true,
      });
      assert.equal(acl.status, 0, acl.stderr);
    } else {
      await fs.promises.chmod(backupPath, 0o644);
    }
    await assert.rejects(
      consumePlan({
        approval: plan.planId,
        command: "rollback",
        host,
        now,
        paths,
        plan,
      }),
      (error) => error.code === "stale_plan_state",
    );
    assert.equal((await inspectPath(paths.rollbackReceipt, { hash: false })).kind, "absent");
    assert.equal((await inspectPath(backupPath)).sha256, backup.sha256);
    assert.equal((await inspectPath(paths.gatewayConfig)).sha256, config.sha256);
    await securePathPermissions(backupPath, host, 0o600);

    const rollbackRaceParent = `${codexParent}.rollback-race-planned`;
    let rollbackRaceQuarantine = null;
    let rollbackRaceError = null;
    await assert.rejects(
      consumePlan({
        approval: plan.planId,
        command: "rollback",
        host,
        now,
        paths,
        plan,
        dependencies: {
          afterExternalRollbackClaim: async ({ quarantine, target }) => {
            assert.equal(target, paths.codexProfile);
            assert.equal(rollbackRaceQuarantine, null);
            rollbackRaceQuarantine = quarantine;
            await fs.promises.rename(codexParent, rollbackRaceParent);
            await protectedDirectory(codexParent, host, { external: true });
            await protectedFile(paths.codexProfile, "codex profile\n", host);
          },
        },
      }),
      (error) => {
        rollbackRaceError = error;
        return (
          error.code === "stale_plan_external_parent" && error.details.claimedPathPreserved === true
        );
      },
    );
    assert.equal(await fs.promises.readFile(paths.codexProfile, "utf8"), "codex profile\n");
    const claimedProfile = path.join(rollbackRaceParent, path.basename(rollbackRaceQuarantine));
    assert.equal(await fs.promises.readFile(claimedProfile, "utf8"), "codex profile\n");
    assert.equal(
      await fs.promises.readFile(rollbackRaceError.details.quarantinePath, "utf8"),
      "codex profile\n",
    );
    await fs.promises.unlink(rollbackRaceError.details.quarantinePath);
    await fs.promises.unlink(paths.codexProfile);
    await fs.promises.rmdir(codexParent);
    await fs.promises.rename(rollbackRaceParent, codexParent);
    await fs.promises.rename(
      path.join(codexParent, path.basename(rollbackRaceQuarantine)),
      paths.codexProfile,
    );

    const cliRollback = runSetupEntrypoint(root, [
      "rollback",
      "--plan",
      persistedPlan,
      "--approve",
      plan.planId,
    ]);
    assert.ifError(cliRollback.error);
    assert.equal(cliRollback.status, 0, cliRollback.stderr);
    for (const output of [cliPlan.stdout, cliPlan.stderr, cliRollback.stdout, cliRollback.stderr]) {
      assert.equal(output.includes(providerValue), false);
      assert.equal(output.includes(gatewayValue), false);
    }
    const first = JSON.parse(cliRollback.stdout);
    assert.equal(first.changed, true);
    assert.equal(first.credentialsPreserved, true);
    assert.equal(await readSecret(paths.providerSecret, host, "provider"), providerValue);
    assert.equal(await readSecret(paths.gatewaySecret, host, "gateway"), gatewayValue);
    assert.equal((await inspectPath(paths.gatewayConfig, { hash: false })).kind, "absent");
    assert.equal((await inspectPath(paths.codexProfile, { hash: false })).kind, "absent");
    assert.deepEqual(
      await inspectProtectedDirectoryBoundary(codexParent, host, { external: true }),
      codexParentBefore,
    );
    assert.equal((await inspectPath(paths.credentialHelper, { hash: false })).kind, "absent");
    assert.equal((await inspectPath(paths.protectedFileHelper, { hash: false })).kind, "absent");
    assert.equal((await inspectPath(paths.gatewayRunner, { hash: false })).kind, "absent");
    assert.equal((await inspectPath(backupPath, { hash: false })).kind, "absent");
    assert.equal((await inspectPath(paths.venvRoot, { hash: false })).kind, "absent");
    assert.equal((await inspectPath(paths.manifest, { hash: false })).kind, "absent");
    const rolledBackStatus = await installationStatus(host, paths, now);
    assert.equal(rolledBackStatus.installed, false);
    assert.equal(
      rolledBackStatus.components.gateway,
      "rolled_back",
      JSON.stringify(rolledBackStatus.drift),
    );

    const completedReceipt = await readRollbackState(paths, host);
    if (process.platform === "win32") {
      const icacls = path.join(process.env.SystemRoot, "System32", "icacls.exe");
      const acl = spawnSync(icacls, [paths.rollbackReceipt, "/grant", "*S-1-1-0:(R)"], {
        encoding: "utf8",
        windowsHide: true,
      });
      assert.equal(acl.status, 0, acl.stderr);
    } else {
      await fs.promises.chmod(paths.rollbackReceipt, 0o644);
    }
    await assert.rejects(
      readRollbackState(paths, host),
      (error) => error.code === "rollback_receipt_invalid",
    );
    await securePathPermissions(paths.rollbackReceipt, host, 0o600);

    const rollbackReceiptSecret = "unknown-rollback-receipt-secret";
    await atomicWriteJson(
      paths.rollbackReceipt,
      { ...completedReceipt, secretMaterial: rollbackReceiptSecret },
      { mode: 0o600 },
    );
    await securePathPermissions(paths.rollbackReceipt, host, 0o600);
    await assert.rejects(
      readRollbackState(paths, host),
      (error) => error.code === "rollback_receipt_invalid",
    );
    await assert.rejects(
      createPlan({ host, now, options: { workflow: "setup" }, paths }),
      (error) => error.code === "rollback_receipt_invalid",
    );
    const unknownRollbackCli = runSetupEntrypoint(root, ["status"]);
    assert.doesNotMatch(
      `${unknownRollbackCli.stdout}\n${unknownRollbackCli.stderr}`,
      new RegExp(rollbackReceiptSecret),
    );
    const nestedUnknownReceipt = structuredClone(completedReceipt);
    nestedUnknownReceipt.rollback.artifacts[0].secretMaterial = rollbackReceiptSecret;
    await atomicWriteJson(paths.rollbackReceipt, nestedUnknownReceipt, { mode: 0o600 });
    await securePathPermissions(paths.rollbackReceipt, host, 0o600);
    await assert.rejects(
      readRollbackState(paths, host),
      (error) => error.code === "rollback_receipt_invalid",
    );

    const resumedAt = now + 31 * 60 * 1_000;
    const interruptedJournal = {
      schemaVersion: 1,
      kind: "hetzner-inference-rollback-journal",
      status: "in_progress",
      planId: completedReceipt.planId,
      createdAt: completedReceipt.observedAt,
      updatedAt: new Date(resumedAt).toISOString(),
      rollbackDigest: completedReceipt.rollbackDigest,
      rollback: completedReceipt.rollback,
      processToken: null,
      preservedCredentialObservations: completedReceipt.preservedCredentialObservations,
      credentialContinuity: completedReceipt.credentialContinuity,
    };
    await atomicWriteJson(paths.rollbackReceipt, interruptedJournal, { mode: 0o600 });
    await securePathPermissions(paths.rollbackReceipt, host, 0o600);
    await atomicWriteJson(
      paths.rollbackReceipt,
      { ...interruptedJournal, secretMaterial: rollbackReceiptSecret },
      { mode: 0o600 },
    );
    await securePathPermissions(paths.rollbackReceipt, host, 0o600);
    await assert.rejects(
      readRollbackState(paths, host),
      (error) => error.code === "rollback_receipt_invalid",
    );
    await atomicWriteJson(paths.rollbackReceipt, interruptedJournal, { mode: 0o600 });
    await securePathPermissions(paths.rollbackReceipt, host, 0o600);
    const interruptedSiblingQuarantine = path.join(
      paths.stateRoot,
      ".process-stop.json.interrupted.quarantine",
    );
    await protectedFile(interruptedSiblingQuarantine, "preserved interrupted claim\n", host);
    const interruptedStatus = await installationStatus(host, paths, resumedAt);
    assert.equal(interruptedStatus.components.gateway, "blocked");
    assert.equal(interruptedStatus.rollback.status, "in_progress_or_drifted");
    assert.ok(
      interruptedStatus.drift.findings.some(
        (finding) =>
          finding.code === "managed_quarantine_recovery_required" &&
          finding.path === interruptedSiblingQuarantine,
      ),
    );
    await fs.promises.unlink(interruptedSiblingQuarantine);

    const recovered = await consumePlan({
      approval: plan.planId,
      command: "rollback",
      host,
      now: resumedAt,
      paths,
      plan,
    });
    assert.equal(recovered.changed, true);

    const rollbackTerminalParent = path.dirname(paths.codexProfile);
    const displacedRollbackTerminalParent = `${rollbackTerminalParent}.rollback-terminal`;
    await assert.rejects(
      consumePlan({
        approval: plan.planId,
        command: "rollback",
        host,
        now: resumedAt + 1,
        paths,
        plan,
        dependencies: {
          beforeTerminalExternalParentCheck: async (boundary) => {
            assert.deepEqual(boundary, {
              command: "rollback",
              status: "noop",
              workflow: "rollback",
            });
            await fs.promises.rename(rollbackTerminalParent, displacedRollbackTerminalParent);
            await protectedDirectory(rollbackTerminalParent, host, { external: true });
          },
        },
      }),
      (error) => error.code === "stale_plan_external_parent",
    );
    await fs.promises.rmdir(rollbackTerminalParent);
    await fs.promises.rename(displacedRollbackTerminalParent, rollbackTerminalParent);

    const second = await consumePlan({
      approval: plan.planId,
      command: "rollback",
      host,
      now: resumedAt + 1,
      paths,
      plan,
    });
    assert.equal(second.changed, false);
    assert.equal(second.status, "noop");

    if (process.platform !== "win32") {
      const reuseNow = resumedAt + 2;
      const python = await fakePythonExecutable(root);
      const discoveryPath = path.join(root, "rollback-reuse-discovery.json");
      await fs.promises.writeFile(discoveryPath, stableJson(discoveryEvidence(reuseNow)));
      const reusePlan = await createPlan({
        host,
        now: reuseNow,
        options: {
          clients: ["cursor"],
          discoveryEvidence: discoveryPath,
          executables: { python },
          model: "example-model",
          workflow: "setup",
        },
        paths,
      });
      const receiptBeforeReplacement = await readRollbackState(paths, host);
      const expectedObservation =
        receiptBeforeReplacement.preservedCredentialObservations[paths.providerSecret];
      const replacement = "x".repeat(providerValue.length);
      const handle = await fs.promises.open(paths.providerSecret, "r+");
      try {
        await handle.write(replacement, 0, "utf8");
        await handle.sync();
      } finally {
        await handle.close();
      }
      await fs.promises.utimes(
        paths.providerSecret,
        new Date(),
        new Date(expectedObservation.mtimeMs),
      );
      assert.equal(
        digestJson(await inspectPath(paths.providerSecret, { hash: false })),
        digestJson(expectedObservation),
        "adversarial fixture must preserve every receipt-visible credential field",
      );
      await assert.rejects(
        consumePlan({
          approval: reusePlan.planId,
          command: "apply",
          host,
          now: reuseNow,
          paths,
          plan: reusePlan,
        }),
        (error) => error.code === "rollback_receipt_drift",
      );
    }

    await protectedFile(paths.gatewayConfig, "reappeared after rollback\n", host);
    const driftedRollbackStatus = await installationStatus(host, paths, resumedAt + 2);
    assert.equal(driftedRollbackStatus.components.gateway, "blocked");
    assert.ok(
      driftedRollbackStatus.drift.findings.some(
        (finding) => finding.code === "rollback_target_reappeared",
      ),
    );
  });
});
