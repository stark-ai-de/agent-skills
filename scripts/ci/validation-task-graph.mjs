import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

import {
  fingerprintGitCandidateRepository,
  listGitCandidatePaths,
} from "../validation/smoke-install-contract.mjs";

import {
  REPORT_SCHEMA_VERSION,
  TASK_KEY_SCHEMA_VERSION,
  canonicalJson,
  digestJson,
  gateInstallProfiles,
  isFormatSupported,
  planDigest,
  validateManifest,
  validatePlan,
} from "./validation-contract.mjs";

export const GATE_RECEIPT_SCHEMA_VERSION = 1;
export const RESOLUTION_SCHEMA_VERSION = 1;

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MODES = new Set(["auto", "off", "verify"]);
const LOOKUP_ORDER = "newest-first";
const LOOKUP_LIMIT = 1_000;
const STORE_TIMEOUT_MS = 20_000;
const MAX_OUTPUT_FILES = 100_000;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024 * 1024;
const EXECUTION_PATH_POLICY = "validation-execution-path-v2";

function requireDigest(value, label) {
  if (!DIGEST_PATTERN.test(value ?? "")) throw new Error(`${label} must be a SHA-256 digest.`);
}

function requireFileCount(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
}

function requireObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value;
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function requireExactKeys(value, required, optional, label) {
  requireObject(value, label);
  const allowed = new Set([...required, ...optional]);
  const actual = Object.keys(value);
  const missing = required.filter((field) => !Object.hasOwn(value, field));
  const unknown = actual.filter((field) => !allowed.has(field));
  if (missing.length > 0 || unknown.length > 0) {
    throw new Error(
      `${label} fields are invalid (missing: ${missing.join(", ") || "none"}; unknown: ${unknown.join(", ") || "none"}).`,
    );
  }
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
    } else if (pattern[index] === "?") {
      expression += "[^/]";
      index += 1;
    } else {
      expression += pattern[index].replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
      index += 1;
    }
  }
  return new RegExp(`${expression}$`).test(file);
}

function gitCandidatePaths(repository) {
  return listGitCandidatePaths(repository);
}

function materializedCandidateIdentity(repository) {
  const candidate = fingerprintGitCandidateRepository(repository);
  return {
    fingerprint: `${candidate.algorithm}:${candidate.digest}`,
    fileCount: candidate.fileCount,
  };
}

function hashFile(file) {
  const hash = crypto.createHash("sha256");
  const descriptor = fs.openSync(file, "r");
  try {
    const buffer = Buffer.allocUnsafe(64 * 1024);
    let bytes;
    while ((bytes = fs.readSync(descriptor, buffer, 0, buffer.length, null)) > 0) {
      hash.update(buffer.subarray(0, bytes));
    }
  } finally {
    fs.closeSync(descriptor);
  }
  return `sha256:${hash.digest("hex")}`;
}

function inputWitness(repository, relativePath) {
  const absolute = path.resolve(repository, relativePath);
  const relative = path.relative(repository, absolute).split(path.sep).join("/");
  if (relative.startsWith("../") || path.isAbsolute(relative)) {
    throw new Error(`Workspace input escapes the repository: ${relativePath}`);
  }
  let stat;
  try {
    stat = fs.lstatSync(absolute);
  } catch (error) {
    if (error.code === "ENOENT") return { path: relativePath, type: "missing" };
    throw error;
  }
  const mode = (stat.mode & 0o7777).toString(8).padStart(4, "0");
  if (stat.isSymbolicLink()) {
    throw new Error(`Workspace input symlinks are not cacheable: ${relative}`);
  }
  if (!stat.isFile()) throw new Error(`Unsupported workspace input type: ${relative}`);
  return { path: relative, type: "file", mode, size: stat.size, digest: hashFile(absolute) };
}

function normalizeInputContract(input) {
  return typeof input === "string" ? { path: input, allowEmpty: false } : input;
}

function workspaceWitness(repository, patterns) {
  const candidates = gitCandidatePaths(repository);
  const selected = new Set();
  const missingLiterals = [];
  const unmatchedRequired = [];
  for (const input of patterns) {
    const { path: pattern, allowEmpty } = normalizeInputContract(input);
    const matched = candidates.filter((candidate) => matches(candidate, pattern));
    for (const candidate of matched) selected.add(candidate);
    if (!/[?*]/.test(pattern) && matched.length === 0) missingLiterals.push(pattern);
    if (matched.length === 0 && !allowEmpty) unmatchedRequired.push(pattern);
  }
  const witnesses = [...selected].sort().map((file) => inputWitness(repository, file));
  witnesses.push(...missingLiterals.sort().map((file) => inputWitness(repository, file)));
  const hash = crypto.createHash("sha256");
  for (const witness of witnesses) {
    for (const value of [
      witness.path,
      witness.type,
      witness.mode ?? "",
      witness.size ?? "",
      witness.digest ?? "",
      witness.target ?? "",
    ]) {
      hash.update(String(value));
      hash.update("\0");
    }
  }
  return {
    digest: `sha256:${hash.digest("hex")}`,
    fileCount: witnesses.filter(({ type }) => type !== "missing").length,
    witnesses,
    unmatchedRequired,
  };
}

function safeOutputMetadata(output) {
  return {
    id: output.id,
    kind: output.kind,
    digest: output.digest,
    fileCount: output.fileCount ?? null,
    size: output.size ?? null,
  };
}

function successfulEvidenceValidation(evidence, task, resolution, outputs) {
  try {
    const kind = task.evidence?.kind;
    const requireExitSuccess = (allowed = []) => {
      requireExactKeys(evidence, ["exitCode"], allowed, `${kind} evidence`);
      if (evidence.exitCode !== 0) throw new Error(`${kind} evidence exitCode must be 0.`);
    };
    switch (kind) {
      case "exit-code":
        requireExitSuccess(["resultDigest"]);
        if (evidence.resultDigest !== undefined) {
          requireDigest(evidence.resultDigest, "exit-code result digest");
        }
        break;
      case "pinned-actionlint-exit-code":
        requireExactKeys(
          evidence,
          ["exitCode", "actionlintIdentity", "executableDigest"],
          [],
          "pinned-actionlint evidence",
        );
        if (evidence.exitCode !== 0) throw new Error("actionlint evidence exitCode must be 0.");
        if (!/^actionlint@\d+\.\d+\.\d+\+sha256:[a-f0-9]{64}$/.test(evidence.actionlintIdentity)) {
          throw new Error(
            "actionlint evidence identity is not an exact observed binary version and digest.",
          );
        }
        if (
          task.keyMaterial.toolchain.tools.actionlint !== null &&
          evidence.actionlintIdentity !== task.keyMaterial.toolchain.tools.actionlint
        ) {
          throw new Error("actionlint evidence does not match the pinned tool identity.");
        }
        requireDigest(evidence.executableDigest, "actionlint executable digest");
        break;
      case "capability-complete-exit-code": {
        requireExactKeys(
          evidence,
          ["exitCode", "capabilities"],
          [],
          "capability-complete evidence",
        );
        if (evidence.exitCode !== 0) throw new Error("capability evidence exitCode must be 0.");
        requireObject(evidence.capabilities, "capability evidence capabilities");
        const required = [...(task.evidence.requiredCapabilities ?? [])].sort();
        const actual = Object.keys(evidence.capabilities).sort();
        if (
          required.length === 0 ||
          canonicalJson(actual) !== canonicalJson(required) ||
          actual.some((name) => evidence.capabilities[name] !== true)
        ) {
          throw new Error("capability evidence is not complete for the declared capabilities.");
        }
        break;
      }
      case "architecture-compass-accounting-v1":
        requireExactKeys(
          evidence,
          [
            "schemaVersion",
            "gateId",
            "status",
            "taskKey",
            "inventoryDigest",
            "accountingDigest",
            "evidenceDigest",
            "caseCount",
            "hostedShardCount",
            "capabilityComplete",
          ],
          [],
          "Architecture Compass evidence",
        );
        if (
          evidence.schemaVersion !== 1 ||
          evidence.gateId !== task.gateId ||
          evidence.status !== "passed" ||
          evidence.taskKey !== task.taskKey ||
          evidence.caseCount !== task.evidence.expectedCaseCount ||
          evidence.hostedShardCount !== task.evidence.expectedHostedShardCount ||
          evidence.capabilityComplete !== true
        ) {
          throw new Error(
            "Architecture Compass evidence does not prove exact complete accounting.",
          );
        }
        for (const field of ["inventoryDigest", "accountingDigest", "evidenceDigest"]) {
          requireDigest(evidence[field], `Architecture Compass ${field}`);
        }
        break;
      case "smoke-candidate-and-cli":
        requireExactKeys(
          evidence,
          [
            "exitCode",
            "candidateFingerprint",
            "candidateFileCount",
            "skillsCliIdentity",
            "skillsCliExecutableDigest",
            "forceTty",
            "overrideState",
          ],
          [],
          "smoke evidence",
        );
        if (
          evidence.exitCode !== 0 ||
          evidence.candidateFingerprint !== resolution.candidateFingerprint ||
          evidence.candidateFileCount !== resolution.candidateFileCount ||
          !/^skills@\d+\.\d+\.\d+$/.test(evidence.skillsCliIdentity) ||
          !DIGEST_PATTERN.test(evidence.skillsCliExecutableDigest ?? "") ||
          (task.keyMaterial.toolchain.tools["skills-cli"] !== null &&
            evidence.skillsCliIdentity !== task.keyMaterial.toolchain.tools["skills-cli"]) ||
          evidence.forceTty !== task.keyMaterial.environment.SKILLS_SMOKE_FORCE_TTY ||
          evidence.overrideState !== task.keyMaterial.environment.SKILLS_SMOKE_OVERRIDE_STATE ||
          !new Set(["0", "1"]).has(evidence.forceTty)
        ) {
          throw new Error("smoke evidence contradicts its candidate, CLI, or TTY task inputs.");
        }
        break;
      case "output-tree": {
        requireExactKeys(evidence, ["exitCode", "outputDigests"], [], "output-tree evidence");
        if (evidence.exitCode !== 0) throw new Error("output-tree evidence exitCode must be 0.");
        requireObject(evidence.outputDigests, "output-tree evidence digests");
        const expected = Object.fromEntries(outputs.map(({ id, digest }) => [id, digest]));
        if (canonicalJson(evidence.outputDigests) !== canonicalJson(expected)) {
          throw new Error("output-tree evidence does not match the witnessed outputs.");
        }
        break;
      }
      case "release-metadata":
        requireExactKeys(
          evidence,
          ["exitCode", "eventClass", "baseCommit", "baseTree", "baseDiff", "baseReleaseMetadata"],
          [],
          "release-metadata evidence",
        );
        if (
          evidence.exitCode !== 0 ||
          evidence.eventClass !== task.keyMaterial.gitInputs.eventClass ||
          evidence.baseCommit !== task.keyMaterial.gitInputs.baseCommit ||
          evidence.baseTree !== task.keyMaterial.gitInputs.baseTree ||
          evidence.baseDiff !== task.keyMaterial.gitInputs.baseDiff ||
          evidence.baseReleaseMetadata !== task.keyMaterial.gitInputs.baseReleaseMetadata
        ) {
          throw new Error("release-metadata evidence contradicts its logical Git inputs.");
        }
        break;
      default:
        throw new Error(`Unsupported gate evidence kind: ${kind ?? "missing"}.`);
    }
    return { complete: true, reason: null };
  } catch (error) {
    return { complete: false, reason: `gate evidence is invalid: ${error.message}` };
  }
}

function outputTreeWitness(root, expectedKind) {
  const absoluteRoot = path.resolve(root);
  const rootStat = fs.lstatSync(absoluteRoot);
  if (rootStat.isSymbolicLink()) throw new Error("Restorable outputs must not contain symlinks.");
  if (expectedKind === "file" && !rootStat.isFile()) {
    throw new Error("Restorable file output is not a regular file.");
  }
  if (expectedKind === "directory" && !rootStat.isDirectory()) {
    throw new Error("Restorable directory output is not a directory.");
  }
  const entries = [];
  let size = 0;
  const visit = (absolute, relative) => {
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) {
      throw new Error(`Restorable output contains a symlink: ${relative || "."}`);
    }
    const mode = (stat.mode & 0o7777).toString(8).padStart(4, "0");
    if (stat.isDirectory()) {
      entries.push({ path: relative || ".", type: "directory", mode });
      for (const name of fs.readdirSync(absolute).sort()) {
        if (name.includes("\0") || name === "." || name === "..") {
          throw new Error("Restorable output contains an unsafe path name.");
        }
        visit(path.join(absolute, name), relative ? `${relative}/${name}` : name);
      }
      return;
    }
    if (!stat.isFile()) {
      throw new Error(`Restorable output contains an unsupported file type: ${relative || "."}`);
    }
    if (stat.nlink !== 1) {
      throw new Error(`Restorable output contains a hard-linked file: ${relative || "."}`);
    }
    size += stat.size;
    if (size > MAX_OUTPUT_BYTES) throw new Error("Restorable output exceeds the size limit.");
    entries.push({
      path: relative || ".",
      type: "file",
      mode,
      size: stat.size,
      digest: hashFile(absolute),
    });
    if (entries.length > MAX_OUTPUT_FILES) {
      throw new Error("Restorable output exceeds the file-count limit.");
    }
  };
  visit(absoluteRoot, "");
  return {
    digest: digestJson({ kind: expectedKind, entries }),
    fileCount: entries.filter(({ type }) => type === "file").length,
    size,
  };
}

function declaredRepositoryPath(repository, relativePath, { allowMissing = false } = {}) {
  const root = path.resolve(repository);
  if (!path.isAbsolute(repository) || root !== repository) {
    throw new Error("Repository root must be an absolute normalized path from resolution.");
  }
  const target = path.resolve(root, relativePath);
  const relative = path.relative(root, target);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Declared output path escapes the repository: ${relativePath}`);
  }
  let current = root;
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (allowMissing && error.code === "ENOENT") break;
      throw error;
    }
    if (stat.isSymbolicLink()) {
      throw new Error(`Declared output path crosses a symlink: ${relativePath}`);
    }
    if (current !== target && !stat.isDirectory()) {
      throw new Error(`Declared output path crosses a non-directory: ${relativePath}`);
    }
  }
  return target;
}

function captureOutputPayload(source, kind) {
  if (kind === "file") {
    const stat = fs.lstatSync(source);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error("Publication file output is not a regular file.");
    }
    return {
      kind,
      mode: stat.mode & 0o7777,
      data: fs.readFileSync(source).toString("base64"),
    };
  }
  const entries = [];
  const visit = (directory, relative) => {
    for (const name of fs.readdirSync(directory).sort()) {
      const absolute = path.join(directory, name);
      const childRelative = relative ? `${relative}/${name}` : name;
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) {
        throw new Error(`Publication output contains a symlink: ${childRelative}`);
      }
      if (stat.isDirectory()) {
        entries.push({ path: childRelative, type: "directory", mode: stat.mode & 0o7777 });
        visit(absolute, childRelative);
      } else if (stat.isFile()) {
        entries.push({
          path: childRelative,
          type: "file",
          mode: stat.mode & 0o7777,
          data: fs.readFileSync(absolute).toString("base64"),
        });
      } else {
        throw new Error(`Publication output contains an unsupported type: ${childRelative}`);
      }
    }
  };
  visit(source, "");
  return { kind, entries };
}

function materializeOutputPayload(payload, destination) {
  if (payload.kind === "file") {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, Buffer.from(payload.data, "base64"), { mode: payload.mode });
    return;
  }
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of payload.entries.filter(({ type }) => type === "directory")) {
    const target = path.join(destination, ...entry.path.split("/"));
    fs.mkdirSync(target, { recursive: true, mode: entry.mode });
  }
  for (const entry of payload.entries.filter(({ type }) => type === "file")) {
    const target = path.join(destination, ...entry.path.split("/"));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, Buffer.from(entry.data, "base64"), { mode: entry.mode });
  }
}

function publicationBundleManifest(receipt, resolutionDigest) {
  const withoutDigest = {
    schemaVersion: 1,
    resolutionDigest,
    gateId: receipt.gateId,
    taskKey: receipt.taskKey,
    receiptDigest: receipt.receiptDigest,
    outputs: clone(receipt.outputs),
  };
  return { ...withoutDigest, bundleDigest: digestJson(withoutDigest) };
}

function stagePublicationBundle({ directory, repository, receipt, resolutionDigest, outputs }) {
  if (typeof directory !== "string" || !path.isAbsolute(directory)) {
    throw new Error("Task publication directory must be an absolute path.");
  }
  const destination = path.resolve(directory);
  if (destination !== directory) {
    throw new Error("Task publication directory must be normalized.");
  }
  const relativeToRepository = path.relative(repository, destination);
  if (
    relativeToRepository === "" ||
    (!relativeToRepository.startsWith("..") && !path.isAbsolute(relativeToRepository))
  ) {
    throw new Error("Task publication bundles must be staged outside the repository.");
  }
  if (fs.existsSync(destination)) throw new Error("Task publication directory already exists.");
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const temporary = fs.mkdtempSync(
    path.join(path.dirname(destination), ".validation-task-publication-"),
  );
  try {
    fs.writeFileSync(path.join(temporary, "receipt.json"), canonicalJson(receipt), { mode: 0o600 });
    for (const output of outputs) {
      const outputDestination = path.join(temporary, "outputs", output.id);
      materializeOutputPayload(
        captureOutputPayload(output.sourcePath, output.kind),
        outputDestination,
      );
      const stagedWitness = digestOutput(outputDestination, output.kind);
      if (
        stagedWitness.digest !== output.digest ||
        stagedWitness.fileCount !== output.fileCount ||
        stagedWitness.size !== output.size
      ) {
        throw new Error(`Staged output ${output.id} contradicts its task receipt.`);
      }
    }
    const bundle = publicationBundleManifest(receipt, resolutionDigest);
    fs.writeFileSync(path.join(temporary, "bundle.json"), canonicalJson(bundle), { mode: 0o600 });
    const stagedTreeDigest = digestOutput(temporary, "directory").digest;
    fs.renameSync(temporary, destination);
    return {
      schemaVersion: 1,
      state: "provisional",
      resolutionDigest,
      bundleDigest: bundle.bundleDigest,
      stagedTreeDigest,
      directory: destination,
    };
  } finally {
    if (fs.existsSync(temporary)) fs.rmSync(temporary, { recursive: true, force: true });
  }
}

function validatePublicationBundle(recorded, resolution) {
  requireExactKeys(recorded, ["kind", "receipt", "publication"], [], "provisional task record");
  requireExactKeys(
    recorded.publication,
    ["schemaVersion", "state", "resolutionDigest", "bundleDigest", "stagedTreeDigest", "directory"],
    [],
    "provisional task publication",
  );
  if (recorded.publication.schemaVersion !== 1 || recorded.publication.state !== "provisional") {
    throw new Error("Task publication is not provisional schema 1.");
  }
  if (recorded.publication.resolutionDigest !== resolution.resolutionDigest) {
    throw new Error("Task publication resolution digest is not current.");
  }
  requireDigest(recorded.publication.bundleDigest, "task publication bundle digest");
  requireDigest(recorded.publication.stagedTreeDigest, "task publication tree digest");
  const directory = path.resolve(recorded.publication.directory);
  if (directory !== recorded.publication.directory) {
    throw new Error("Task publication directory is not normalized.");
  }
  const actualNames = fs.readdirSync(directory).sort();
  const expectedNames =
    recorded.receipt.outputs.length > 0
      ? ["bundle.json", "outputs", "receipt.json"]
      : ["bundle.json", "receipt.json"];
  if (canonicalJson(actualNames) !== canonicalJson(expectedNames)) {
    throw new Error("Task publication bundle contains unexpected top-level entries.");
  }
  const storedReceipt = JSON.parse(fs.readFileSync(path.join(directory, "receipt.json"), "utf8"));
  if (canonicalJson(storedReceipt) !== canonicalJson(recorded.receipt)) {
    throw new Error("Task publication receipt contradicts its provisional record.");
  }
  const expectedBundle = publicationBundleManifest(recorded.receipt, resolution.resolutionDigest);
  const storedBundle = JSON.parse(fs.readFileSync(path.join(directory, "bundle.json"), "utf8"));
  if (canonicalJson(storedBundle) !== canonicalJson(expectedBundle)) {
    throw new Error("Task publication bundle manifest contradicts its receipt.");
  }
  if (recorded.publication.bundleDigest !== expectedBundle.bundleDigest) {
    throw new Error("Task publication bundle digest contradicts its receipt.");
  }
  for (const output of recorded.receipt.outputs) {
    const staged = digestOutput(path.join(directory, "outputs", output.id), output.kind);
    if (
      staged.digest !== output.digest ||
      staged.fileCount !== output.fileCount ||
      staged.size !== output.size
    ) {
      throw new Error(`Task publication output ${output.id} contradicts its receipt.`);
    }
  }
  if (digestOutput(directory, "directory").digest !== recorded.publication.stagedTreeDigest) {
    throw new Error("Task publication tree digest contradicts staged bytes.");
  }
  return recorded.publication;
}

export function digestOutput(outputPath, kind) {
  if (!new Set(["directory", "file"]).has(kind)) {
    throw new Error("Output kind must be directory or file.");
  }
  return outputTreeWitness(outputPath, kind);
}

export function sanitizeExecutionEnvironment(source, declaredNames = [], injected = {}) {
  const environment = {};
  const transportNames = ["SystemRoot", "COMSPEC", "PATHEXT"];
  for (const name of [...transportNames, ...declaredNames]) {
    if (typeof source[name] === "string") environment[name] = source[name];
  }
  environment.CI = typeof source.CI === "string" ? source.CI : "true";
  environment.TZ = typeof source.TZ === "string" ? source.TZ : "UTC";
  environment.LANG = typeof source.LANG === "string" ? source.LANG : "C.UTF-8";
  environment.LC_ALL = typeof source.LC_ALL === "string" ? source.LC_ALL : "C.UTF-8";
  for (const [name, value] of Object.entries(injected)) {
    if (typeof value !== "string")
      throw new Error(`Injected environment ${name} must be a string.`);
    environment[name] = value;
  }
  return environment;
}

function expandedCommand(gate, plan, sourceContext, repository) {
  const command = gate.command.map((part) =>
    part
      .replaceAll("{{event}}", sourceContext.event)
      .replaceAll("{{baseSha}}", plan.baseSha || "none"),
  );
  if (!gate.changedFiles) return command;
  const files =
    plan.scope === "affected"
      ? plan.changedPaths.filter(
          (file) => isFormatSupported(file) && fs.existsSync(path.join(repository, file)),
        )
      : ["."];
  if (plan.scope === "affected") command.push("--", ...files);
  else command.push(...files);
  return command;
}

function selectedValues(
  names,
  values,
  label,
  { fixedValues = {}, accept = (value) => typeof value === "string" && value.length > 0 } = {},
) {
  const selected = {};
  const missing = [];
  for (const name of names) {
    const supplied = Object.hasOwn(values, name) ? values[name] : undefined;
    if (accept(supplied)) selected[name] = supplied;
    else if (Object.hasOwn(fixedValues, name)) selected[name] = fixedValues[name];
    else {
      selected[name] = null;
      missing.push(`${label}:${name}`);
    }
  }
  return { selected, missing };
}

function receiptDigest(receipt) {
  const { receiptDigest: ignored, ...body } = receipt;
  void ignored;
  return digestJson(body);
}

function validateSource(source) {
  const requiredFields = [
    "repository",
    "workflowPath",
    "workflowDigest",
    "controlPlaneDigest",
    "runId",
    "runAttempt",
    "jobId",
    "jobName",
    "jobConclusion",
    "artifactName",
    "event",
    "ref",
    "sha",
    "createdAt",
  ];
  requireExactKeys(source, requiredFields, ["expiresAt"], "task receipt source");
  for (const field of requiredFields) {
    if (typeof source[field] !== "string" || source[field].length === 0) {
      throw new Error(`task receipt source.${field} must be a non-empty string.`);
    }
  }
  requireDigest(source.workflowDigest, "task receipt workflow digest");
  requireDigest(source.controlPlaneDigest, "task receipt control-plane digest");
  if (!new Set(["success", "failure"]).has(source.jobConclusion)) {
    throw new Error("task receipt source.jobConclusion must be success or failure.");
  }
  if (source.expiresAt !== undefined && !Number.isFinite(Date.parse(source.expiresAt))) {
    throw new Error("task receipt source.expiresAt must be an ISO timestamp.");
  }
}

function validateLocator(locator) {
  requireObject(locator, "producer locator");
  requireExactKeys(
    locator,
    [
      "kind",
      "id",
      "name",
      "digest",
      "size",
      "repository",
      "runId",
      "runAttempt",
      "jobId",
      "jobName",
    ],
    ["expiresAt"],
    "producer locator",
  );
  for (const field of [
    "kind",
    "id",
    "name",
    "repository",
    "runId",
    "runAttempt",
    "jobId",
    "jobName",
  ]) {
    if (typeof locator[field] !== "string" || locator[field].length === 0) {
      throw new Error(`Producer locator requires ${field}.`);
    }
  }
  requireDigest(locator.digest, "producer locator digest");
  if (!Number.isSafeInteger(locator.size) || locator.size < 1) {
    throw new Error("Producer locator size must be a positive integer.");
  }
  if (locator.expiresAt !== undefined && !Number.isFinite(Date.parse(locator.expiresAt))) {
    throw new Error("Producer locator expiresAt must be an ISO timestamp.");
  }
  return locator;
}

function trustContext(repository, workflowPath, workflowDigest, controlPlaneDigest) {
  return { repository, workflowPath, workflowDigest, controlPlaneDigest };
}

async function boundedStoreCall(operation, input) {
  const deadline = Date.parse(input?.deadline ?? "");
  const remainingMs = Number.isFinite(deadline)
    ? Math.max(0, deadline - Date.now())
    : STORE_TIMEOUT_MS;
  const requestedTimeoutMs = Number.isFinite(input?.timeoutMs)
    ? Math.max(0, input.timeoutMs)
    : STORE_TIMEOUT_MS;
  const timeoutMs = Math.min(STORE_TIMEOUT_MS, requestedTimeoutMs, remainingMs);
  if (timeoutMs === 0) {
    const error = new Error("Result-store operation exceeded the shared deadline.");
    error.code = "ERR_STORE_UNAVAILABLE";
    throw error;
  }
  let timer;
  try {
    return await Promise.race([
      operation(input),
      new Promise((resolve, reject) => {
        void resolve;
        timer = setTimeout(() => {
          const error = new Error(`Result-store operation exceeded its ${timeoutMs}ms bound.`);
          error.code = "ERR_STORE_UNAVAILABLE";
          reject(error);
        }, timeoutMs);
        timer.unref?.();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function correlateLocatorWithReceipt(locator, receipt) {
  const correlations = {
    repository: receipt.source.repository,
    runId: receipt.source.runId,
    runAttempt: receipt.source.runAttempt,
    jobId: receipt.source.jobId,
    jobName: receipt.source.jobName,
    name: receipt.source.artifactName,
  };
  for (const [field, value] of Object.entries(correlations)) {
    if (locator[field] !== value) {
      throw new Error(`Producer locator ${field} contradicts receipt source.`);
    }
  }
}

function validateVerifiedMetadata(
  metadata,
  receipt,
  locator,
  currentTrustContext,
  expectedObservedAt = null,
) {
  requireExactKeys(
    metadata,
    [
      "schemaVersion",
      "verified",
      "checkedAt",
      "repository",
      "workflowPath",
      "workflowDigest",
      "controlPlaneDigest",
      "runId",
      "runAttempt",
      "jobId",
      "jobName",
      "jobConclusion",
      "event",
      "ref",
      "sha",
      "artifact",
    ],
    [],
    "verified producer metadata",
  );
  if (metadata.schemaVersion !== 1 || metadata.verified !== true) {
    throw new Error("Producer metadata verification did not succeed with schema 1.");
  }
  if (!Number.isFinite(Date.parse(metadata.checkedAt))) {
    throw new Error("Verified producer metadata checkedAt is invalid.");
  }
  for (const field of [
    "repository",
    "workflowPath",
    "workflowDigest",
    "controlPlaneDigest",
    "runId",
    "runAttempt",
    "jobId",
    "jobName",
    "jobConclusion",
    "event",
    "ref",
    "sha",
  ]) {
    if (metadata[field] !== receipt.source[field]) {
      throw new Error(`Verified metadata ${field} contradicts receipt source.`);
    }
  }
  requireExactKeys(
    metadata.artifact,
    ["id", "name", "digest", "size", "createdAt", "expired"],
    [],
    "verified artifact metadata",
  );
  for (const field of ["id", "name", "digest", "size"]) {
    if (metadata.artifact[field] !== locator[field]) {
      throw new Error(`Verified artifact metadata ${field} contradicts producer locator.`);
    }
  }
  if (typeof metadata.artifact.expired !== "boolean") {
    throw new Error("Verified artifact metadata expired must be boolean.");
  }
  if (!Number.isFinite(Date.parse(metadata.artifact.createdAt))) {
    throw new Error("Verified artifact metadata createdAt is invalid.");
  }
  if (expectedObservedAt !== null && metadata.artifact.createdAt !== expectedObservedAt) {
    throw new Error("Verified artifact creation time contradicts lookup ordering evidence.");
  }
  for (const field of ["repository", "workflowPath", "workflowDigest", "controlPlaneDigest"]) {
    if (metadata[field] !== currentTrustContext[field]) {
      throw new Error(`Verified metadata ${field} contradicts the current trust context.`);
    }
  }
  return metadata;
}

async function verifyObservation(
  store,
  receipt,
  locator,
  currentTrustContext,
  expectedObservedAt = null,
  deadline = new Date(Date.now() + STORE_TIMEOUT_MS).toISOString(),
) {
  if (typeof store.verify !== "function") {
    throw new Error("Result-store adapter must implement authoritative verify().");
  }
  correlateLocatorWithReceipt(locator, receipt);
  const metadata = await boundedStoreCall(store.verify.bind(store), {
    locator: clone(locator),
    receipt: clone(receipt),
    trustContext: clone(currentTrustContext),
    deadline,
    timeoutMs: STORE_TIMEOUT_MS,
  });
  return validateVerifiedMetadata(
    metadata,
    receipt,
    locator,
    currentTrustContext,
    expectedObservedAt,
  );
}

function validateGateReceipt(receipt, expected) {
  requireExactKeys(
    receipt,
    [
      "schemaVersion",
      "proofLevel",
      "kind",
      "reusable",
      "gateId",
      "taskKey",
      "controlPlaneDigest",
      "manifestDigest",
      "status",
      "capabilityComplete",
      "candidateFingerprintBefore",
      "candidateFileCountBefore",
      "candidateFingerprintAfter",
      "candidateFileCountAfter",
      "durationMs",
      "reason",
      "evidence",
      "evidenceDigest",
      "outputs",
      "source",
      "receiptDigest",
    ],
    [],
    "task receipt",
  );
  if (receipt.schemaVersion !== GATE_RECEIPT_SCHEMA_VERSION) {
    throw new Error("Unsupported task receipt schema.");
  }
  if (receipt.proofLevel !== "diagnostic") {
    throw new Error("Task receipt proof level must remain diagnostic.");
  }
  if (!new Set(["result", "tombstone"]).has(receipt.kind)) {
    throw new Error("Task receipt kind is invalid.");
  }
  if (typeof receipt.reusable !== "boolean") {
    throw new Error("Task receipt reusable must be boolean.");
  }
  if (receipt.kind === "tombstone" && receipt.reusable) {
    throw new Error("Failure tombstones cannot be reusable.");
  }
  requireDigest(receipt.taskKey, "task receipt task key");
  requireDigest(receipt.controlPlaneDigest, "task receipt control-plane digest");
  requireDigest(receipt.manifestDigest, "task receipt manifest digest");
  requireDigest(receipt.receiptDigest, "task receipt digest");
  if (receipt.receiptDigest !== receiptDigest(receipt)) {
    throw new Error("Task receipt digest contradicts its content.");
  }
  validateSource(receipt.source);
  for (const field of ["gateId", "taskKey", "controlPlaneDigest", "manifestDigest"]) {
    const value = expected[field];
    if (value !== undefined && receipt[field] !== value) {
      throw new Error(`Task receipt ${field} contradicts its lookup identity.`);
    }
  }
  if (receipt.source.repository !== expected.repositoryIdentity) {
    throw new Error("Task receipt repository contradicts its lookup identity.");
  }
  if (receipt.source.workflowPath !== expected.workflowPath) {
    throw new Error("Task receipt producer workflow path is not current.");
  }
  if (receipt.source.workflowDigest !== expected.workflowDigest) {
    throw new Error("Task receipt producer workflow digest is not current.");
  }
  if (receipt.source.controlPlaneDigest !== expected.controlPlaneDigest) {
    throw new Error("Task receipt producer control plane is not current.");
  }
  if (receipt.kind === "result") {
    if (receipt.source.jobConclusion !== "success") {
      throw new Error("Task result producer job did not conclude successfully.");
    }
    if (
      receipt.status !== "passed" ||
      receipt.capabilityComplete !== true ||
      receipt.candidateFingerprintBefore !== receipt.candidateFingerprintAfter ||
      receipt.candidateFileCountBefore !== receipt.candidateFileCountAfter
    ) {
      throw new Error("Task result is not a capability-complete unchanged success.");
    }
    requireDigest(receipt.candidateFingerprintBefore, "task receipt candidate fingerprint before");
    requireDigest(receipt.candidateFingerprintAfter, "task receipt candidate fingerprint after");
    requireFileCount(receipt.candidateFileCountBefore, "task receipt candidate file count before");
    requireFileCount(receipt.candidateFileCountAfter, "task receipt candidate file count after");
    requireDigest(receipt.evidenceDigest, "task receipt evidence digest");
    if (receipt.evidenceDigest !== digestJson(receipt.evidence)) {
      throw new Error("Task receipt evidence digest contradicts its content.");
    }
    if (!Array.isArray(receipt.outputs)) throw new Error("Task receipt outputs are malformed.");
    for (const output of receipt.outputs) {
      requireExactKeys(
        output,
        ["id", "kind", "digest", "fileCount", "size"],
        [],
        "task receipt output",
      );
      if (
        typeof output?.id !== "string" ||
        !new Set(["directory", "file"]).has(output.kind) ||
        !DIGEST_PATTERN.test(output.digest ?? "") ||
        Object.hasOwn(output, "sourcePath")
      ) {
        throw new Error("Task receipt output is malformed or leaks transport-local state.");
      }
      requireFileCount(output.fileCount, "task receipt output file count");
      requireFileCount(output.size, "task receipt output size");
    }
    if (
      expected.restoreOutputs !== undefined &&
      canonicalJson(receipt.outputs.map(({ id, kind }) => ({ id, kind }))) !==
        canonicalJson(expected.restoreOutputs.map(({ id, kind }) => ({ id, kind })))
    ) {
      throw new Error("Task receipt outputs contradict the declared output contract.");
    }
    const evidenceValidation = successfulEvidenceValidation(
      receipt.evidence,
      {
        gateId: expected.gateId,
        taskKey: expected.taskKey,
        evidence: expected.evidence,
        restoreOutputs: expected.restoreOutputs,
        keyMaterial: expected.keyMaterial,
      },
      {
        candidateFingerprint: receipt.candidateFingerprintBefore,
        candidateFileCount: receipt.candidateFileCountBefore,
      },
      receipt.outputs,
    );
    if (!evidenceValidation.complete) throw new Error(evidenceValidation.reason);
  }
  return receipt;
}

function normalizedLookupCandidates(value, remainingObservationBudget = LOOKUP_LIMIT) {
  if (
    value?.schemaVersion !== 1 ||
    value.order !== LOOKUP_ORDER ||
    value.complete !== true ||
    !Array.isArray(value.observations)
  ) {
    throw new Error("Result-store lookup did not prove a complete newest-first observation order.");
  }
  if (
    !Number.isSafeInteger(remainingObservationBudget) ||
    remainingObservationBudget < 0 ||
    remainingObservationBudget > LOOKUP_LIMIT
  ) {
    throw new Error("Result-store observation budget is invalid.");
  }
  if (value.observations.length > remainingObservationBudget) {
    throw new Error(
      `Result-store lookup exceeded the resolution-wide ${LOOKUP_LIMIT}-observation budget.`,
    );
  }
  let previous = null;
  const artifactIds = new Set();
  const locatorIdentities = new Set();
  const numeric = (value, label) => {
    if (!/^[1-9][0-9]*$/.test(value ?? "")) {
      throw new Error(`${label} must be a positive decimal identifier.`);
    }
    return BigInt(value);
  };
  for (const observation of value.observations) {
    requireExactKeys(
      observation,
      ["receipt", "locator", "observedAt"],
      [],
      "result-store observation",
    );
    const observedAt = Date.parse(observation.observedAt ?? "");
    if (!Number.isFinite(observedAt)) {
      throw new Error("Result-store observation time is invalid.");
    }
    const locator = validateLocator(observation.locator);
    const locatorIdentity = canonicalJson({
      repository: locator.repository,
      id: locator.id,
      runId: locator.runId,
      runAttempt: locator.runAttempt,
    });
    if (artifactIds.has(locator.id) || locatorIdentities.has(locatorIdentity)) {
      throw new Error("Result-store observations contain a duplicate artifact identity.");
    }
    artifactIds.add(locator.id);
    locatorIdentities.add(locatorIdentity);
    const current = {
      observedAt,
      runId: numeric(locator.runId, "Producer run ID"),
      runAttempt: numeric(locator.runAttempt, "Producer run attempt"),
      artifactId: numeric(locator.id, "Producer artifact ID"),
    };
    if (
      previous &&
      (current.observedAt > previous.observedAt ||
        (current.observedAt === previous.observedAt && current.runId > previous.runId) ||
        (current.observedAt === previous.observedAt &&
          current.runId === previous.runId &&
          current.runAttempt > previous.runAttempt) ||
        (current.observedAt === previous.observedAt &&
          current.runId === previous.runId &&
          current.runAttempt === previous.runAttempt &&
          current.artifactId >= previous.artifactId))
    ) {
      throw new Error("Result-store observations are not in verified newest-first total order.");
    }
    previous = current;
  }
  return value.observations;
}

function gateExecutionGroups(tasks) {
  const executable = tasks.filter(({ status }) => status !== "reused");
  const identify = (id) => executable.find(({ gateId }) => gateId === id) ?? null;
  return {
    skills: identify("skills"),
    root: executable.filter(
      ({ gateId }) => !new Set(["skills", "architecture-compass", "smoke-install"]).has(gateId),
    ),
    architectureCompass: identify("architecture-compass"),
    smokeInstall: identify("smoke-install"),
  };
}

export function createMemoryStore() {
  const entries = [];
  const artifacts = [];
  let sequence = 0;
  return {
    async lookup({ repositoryIdentity, gateId, taskKey }) {
      return {
        schemaVersion: 1,
        order: LOOKUP_ORDER,
        complete: true,
        observations: entries
          .filter(
            (entry) =>
              entry.repositoryIdentity === repositoryIdentity &&
              entry.gateId === gateId &&
              entry.taskKey === taskKey,
          )
          .sort((left, right) => right.sequence - left.sequence)
          .map(({ receipt, locator, observedAt }) => clone({ receipt, locator, observedAt })),
      };
    },
    async upload(recorded) {
      requireObject(recorded, "memory upload record");
      if (recorded.publication?.state !== "provisional") {
        throw new Error("Memory upload requires a provisional task publication.");
      }
      sequence += 1;
      const receipt = recorded.receipt;
      const tree = digestOutput(recorded.publication.directory, "directory");
      if (tree.digest !== recorded.publication.stagedTreeDigest) {
        throw new Error("Memory upload bytes contradict the staged publication digest.");
      }
      const locator = {
        kind: "memory",
        id: String(sequence),
        name: receipt.source.artifactName,
        digest: tree.digest,
        size: tree.size,
        repository: receipt.source.repository,
        runId: receipt.source.runId,
        runAttempt: receipt.source.runAttempt,
        jobId: receipt.source.jobId,
        jobName: receipt.source.jobName,
      };
      const outputs = receipt.outputs.map((output) => ({
        ...clone(output),
        payload: captureOutputPayload(
          path.join(recorded.publication.directory, "outputs", output.id),
          output.kind,
        ),
      }));
      artifacts.push({
        receipt: clone(receipt),
        outputs,
        locator,
        createdAt: receipt.source.createdAt,
        sequence,
      });
      return clone(locator);
    },
    async publish(value) {
      const artifact = artifacts.find(
        (candidate) => canonicalJson(candidate.locator) === canonicalJson(value.locator),
      );
      if (!artifact) {
        const error = new Error("Memory artifact is absent.");
        error.code = "ERR_STORE_ABSENT";
        throw error;
      }
      if (canonicalJson(artifact.receipt) !== canonicalJson(value.receipt)) {
        throw new Error("Memory artifact receipt contradicts its publication binding.");
      }
      if (entries.some((entry) => canonicalJson(entry.locator) === canonicalJson(value.locator))) {
        throw new Error("Memory artifact publication binding already exists.");
      }
      entries.push({
        repositoryIdentity: value.receipt.source.repository,
        gateId: value.receipt.gateId,
        taskKey: value.receipt.taskKey,
        kind: value.receipt.kind,
        receipt: clone(value.receipt),
        locator: clone(value.locator),
        observedAt: artifact.createdAt,
        sequence: artifact.sequence,
      });
      return clone(value.locator);
    },
    async verify({ locator }) {
      const entry = artifacts.find(
        (candidate) => canonicalJson(candidate.locator) === canonicalJson(locator),
      );
      if (!entry) {
        const error = new Error("Memory observation is absent.");
        error.code = "ERR_STORE_ABSENT";
        throw error;
      }
      const source = entry.receipt.source;
      return {
        schemaVersion: 1,
        verified: true,
        checkedAt: source.createdAt,
        repository: source.repository,
        workflowPath: source.workflowPath,
        workflowDigest: source.workflowDigest,
        controlPlaneDigest: source.controlPlaneDigest,
        runId: source.runId,
        runAttempt: source.runAttempt,
        jobId: source.jobId,
        jobName: source.jobName,
        jobConclusion: source.jobConclusion,
        event: source.event,
        ref: source.ref,
        sha: source.sha,
        artifact: {
          id: locator.id,
          name: locator.name,
          digest: locator.digest,
          size: locator.size,
          createdAt: entry.createdAt,
          expired: false,
        },
      };
    },
    async restore({ locator, outputId, destination, expectedDigest }) {
      const entry = artifacts.find(
        (candidate) => canonicalJson(candidate.locator) === canonicalJson(locator),
      );
      const output = entry?.outputs?.find(({ id }) => id === outputId);
      if (!output?.payload) throw new Error(`Memory output ${outputId} is unavailable.`);
      const target = path.resolve(destination);
      if (fs.existsSync(target)) throw new Error("Memory restore destination must be empty.");
      materializeOutputPayload(output.payload, target);
      return { digest: expectedDigest, fileCount: output.fileCount ?? null };
    },
    snapshot() {
      return entries.map(clone);
    },
    snapshotArtifacts() {
      return artifacts.map(clone);
    },
  };
}

export async function resolve(options, adapters) {
  requireObject(options, "resolve options");
  const store = adapters?.store;
  if (!store || typeof store.lookup !== "function") {
    throw new Error("resolve requires a store adapter with lookup().");
  }
  if (!MODES.has(options.mode)) throw new Error("reuse mode must be auto, off, or verify.");
  const manifest = validateManifest(options.manifest);
  if (manifest.schemaVersion !== 2) throw new Error("Task resolution requires manifest schema 2.");
  const plan = validatePlan(options.plan, manifest, "task resolution plan", {
    requireCandidatePlanDigest: true,
  });
  requireDigest(options.controlPlaneDigest, "control-plane digest");
  requireDigest(options.candidateFingerprint, "candidate fingerprint");
  requireFileCount(options.candidateFileCount, "candidate file count");
  if (options.repositoryIdentity !== options.sourceContext?.repository) {
    throw new Error("Repository identity does not match the source context.");
  }
  if (options.sourceContext.controlPlaneDigest !== options.controlPlaneDigest) {
    throw new Error("Source control-plane digest does not match the current control plane.");
  }
  const repository = path.resolve(options.repository);
  const currentTrustContext = trustContext(
    options.repositoryIdentity,
    options.sourceContext.workflowPath,
    options.sourceContext.workflowDigest,
    options.controlPlaneDigest,
  );
  const manifestDigest = digestJson(manifest);
  const globalInputWitness = workspaceWitness(repository, manifest.globalInvalidators);
  const environment = options.environment ?? {};
  const toolchain = options.toolchain ?? {};
  const gitInputs = options.gitInputs ?? {};
  const taskById = new Map();
  const tasks = [];
  let remainingObservationBudget = LOOKUP_LIMIT;

  for (const gate of manifest.gates.filter(({ id }) => plan.selectedGates.includes(id))) {
    const prerequisiteKeys = gate.prerequisites.map((id) => taskById.get(id)?.taskKey ?? null);
    const tools = selectedValues(gate.execution.tools, toolchain, "tool");
    const packageProfileWitnesses = Object.fromEntries(
      gate.execution.packageProfiles.map((profile) => [
        profile,
        workspaceWitness(repository, manifest.packageProfiles[profile].inputs),
      ]),
    );
    const packageProfileDigests = Object.fromEntries(
      Object.entries(packageProfileWitnesses).map(([profile, witness]) => [
        profile,
        witness.digest,
      ]),
    );
    const env = selectedValues(gate.execution.environment, environment, "environment", {
      fixedValues: {
        CI: "true",
        TZ: "UTC",
        LANG: "C.UTF-8",
        LC_ALL: "C.UTF-8",
      },
      accept: (value) => typeof value === "string",
    });
    const git = selectedValues(gate.execution.gitInputs, gitInputs, "git-input");
    const platform = options.platform ?? {
      os: process.platform,
      arch: process.arch,
      runnerLabel: toolchain.runnerLabel ?? null,
    };
    const missingPlatform = ["os", "arch", "runnerLabel"]
      .filter((name) => typeof platform[name] !== "string" || platform[name].length === 0)
      .map((name) => `platform:${name}`);
    const unavailable = [
      ...tools.missing,
      ...env.missing,
      ...git.missing,
      ...missingPlatform,
      ...prerequisiteKeys.flatMap((key, index) =>
        key === null ? [`prerequisite:${gate.prerequisites[index]}`] : [],
      ),
      ...globalInputWitness.unmatchedRequired.map((input) => `global-input:${input}`),
      ...Object.entries(packageProfileWitnesses).flatMap(([profile, witness]) =>
        witness.unmatchedRequired.map((input) => `package-profile:${profile}:${input}`),
      ),
    ];
    const workspace = workspaceWitness(repository, [
      ...new Map(
        [
          ...gate.execution.entrypoints,
          ...gate.execution.helpers,
          ...gate.execution.workspaceInputs,
        ].map((input) => [normalizeInputContract(input).path, input]),
      ).values(),
    ]);
    unavailable.push(...workspace.unmatchedRequired.map((input) => `workspace-input:${input}`));
    const gateContract = {
      id: gate.id,
      command: gate.command,
      changedFiles: gate.changedFiles ?? false,
      execution: gate.execution,
      evidence: gate.evidence,
      restoreOutputs: gate.restoreOutputs,
      prerequisites: gate.prerequisites,
      timeoutMs: gate.timeoutMs,
      aggregate: gate.aggregate,
      trustedProofRequired: gate.trustedProofRequired,
    };
    const keyMaterial = {
      keySchemaVersion: TASK_KEY_SCHEMA_VERSION,
      repositoryIdentity: options.repositoryIdentity,
      gateId: gate.id,
      epoch: gate.epoch,
      gateContractDigest: digestJson(gateContract),
      enginePolicyDigest: options.controlPlaneDigest,
      globalInputDigest: globalInputWitness.digest,
      workspaceInputDigest: workspace.digest,
      expandedCommand: expandedCommand(gate, plan, options.sourceContext, repository),
      packageProfileDigests,
      prerequisiteKeys,
      environment: env.selected,
      toolchain: {
        tools: tools.selected,
        executionPathPolicy: EXECUTION_PATH_POLICY,
        platform: clone(platform),
      },
      gitInputs: git.selected,
      evidenceOutputContractDigest: digestJson({
        evidence: gate.evidence,
        restoreOutputs: gate.restoreOutputs,
      }),
    };
    const taskKey = digestJson(keyMaterial);
    const baseTask = {
      gateId: gate.id,
      taskKey,
      keyMaterial,
      workspaceFileCount: workspace.fileCount,
      prerequisiteKeys,
      installProfiles: gateInstallProfiles(gate),
      gateContract: clone(gateContract),
      restoreOutputs: clone(gate.restoreOutputs),
      evidence: clone(gate.evidence),
      unavailableInputs: [...unavailable],
      cacheEligible: unavailable.length === 0,
    };
    let task = {
      ...baseTask,
      status: "miss",
      lookupDurationMs: 0,
      lookupResult: "miss",
      lookupMissCount: 1,
      lookupRejectCount: 0,
    };
    const unresolvedPrerequisites = gate.prerequisites.filter(
      (id) => taskById.get(id)?.status !== "reused",
    );
    if (unavailable.length > 0) {
      task.missReason = `unavailable key inputs: ${unavailable.join(", ")}`;
    } else if (options.mode === "off") {
      task.missReason = "reuse disabled";
    } else if (options.mode === "auto" && unresolvedPrerequisites.length > 0) {
      task.missReason = `prerequisite is not yet a verified reusable success: ${unresolvedPrerequisites.join(", ")}`;
    } else if (remainingObservationBudget === 0) {
      task.missReason = "resolution-wide result-store observation budget exhausted";
    } else {
      const lookupDeadline = new Date(Date.now() + STORE_TIMEOUT_MS).toISOString();
      let candidates = [];
      try {
        const lookupStarted = performance.now();
        candidates = normalizedLookupCandidates(
          await boundedStoreCall(store.lookup.bind(store), {
            repositoryIdentity: options.repositoryIdentity,
            gateId: gate.id,
            taskKey,
            trustContext: clone(currentTrustContext),
            limit: remainingObservationBudget,
            deadline: lookupDeadline,
            timeoutMs: STORE_TIMEOUT_MS,
          }),
          remainingObservationBudget,
        );
        remainingObservationBudget -= candidates.length;
        task.lookupDurationMs = Math.max(0, Math.round(performance.now() - lookupStarted));
      } catch (error) {
        if (
          new Set(["ERR_STORE_UNAVAILABLE", "ERR_STORE_ABSENT", "ERR_STORE_EXPIRED"]).has(
            error?.code,
          )
        ) {
          task.missReason = `result store unavailable: ${error.message}`;
        } else {
          throw error;
        }
      }
      for (const candidate of candidates) {
        const receipt = validateGateReceipt(candidate?.receipt, {
          repositoryIdentity: options.repositoryIdentity,
          workflowPath: options.sourceContext.workflowPath,
          workflowDigest: options.sourceContext.workflowDigest,
          gateId: gate.id,
          taskKey,
          controlPlaneDigest: options.controlPlaneDigest,
          manifestDigest,
          restoreOutputs: gate.restoreOutputs,
          evidence: gate.evidence,
          keyMaterial,
        });
        const locator = validateLocator(candidate.locator);
        if (
          receipt.source.expiresAt &&
          Date.parse(receipt.source.expiresAt) <= Date.parse(options.now)
        ) {
          task.missReason = "newest observation expired";
          task.lookupResult = "reject";
          task.lookupRejectCount = 1;
          break;
        }
        let verifiedMetadata;
        try {
          verifiedMetadata = await verifyObservation(
            store,
            receipt,
            locator,
            currentTrustContext,
            candidate.observedAt,
            lookupDeadline,
          );
        } catch (error) {
          if (
            new Set(["ERR_STORE_UNAVAILABLE", "ERR_STORE_ABSENT", "ERR_STORE_EXPIRED"]).has(
              error?.code,
            )
          ) {
            task.missReason = `result store unavailable: ${error.message}`;
            break;
          }
          throw error;
        }
        if (verifiedMetadata.artifact.expired) {
          task.missReason = "newest observation expired";
          task.lookupResult = "reject";
          task.lookupRejectCount = 1;
          break;
        }
        if (receipt.kind === "tombstone") {
          task.missReason = "newest eligible observation is a failure tombstone";
          task.lookupResult = "reject";
          task.lookupRejectCount = 1;
          break;
        }
        if (receipt.reusable !== true) {
          task.missReason = "newest successful observation is explicitly non-reusable";
          task.lookupResult = "reject";
          task.lookupRejectCount = 1;
          break;
        }
        if (options.mode === "verify") {
          task = {
            ...task,
            status: "verify",
            lookupResult: "verify",
            lookupMissCount: 0,
            comparisonReceipt: receipt,
            locator,
            verifiedMetadata,
          };
        } else {
          task = {
            ...baseTask,
            status: "reused",
            lookupDurationMs: task.lookupDurationMs,
            lookupResult: "hit",
            lookupMissCount: 0,
            lookupRejectCount: 0,
            receipt,
            locator,
            verifiedMetadata,
          };
        }
        break;
      }
    }
    taskById.set(gate.id, task);
    tasks.push(task);
  }

  const hits = tasks.filter(({ status }) => status === "reused").map(({ gateId }) => gateId);
  const misses = tasks.filter(({ status }) => status === "miss").map(({ gateId }) => gateId);
  const verify = tasks.filter(({ status }) => status === "verify").map(({ gateId }) => gateId);
  const matrix = {
    include: tasks
      .filter(({ status }) => status !== "reused")
      .map(({ gateId, taskKey, installProfiles }) => ({ gateId, taskKey, installProfiles })),
  };
  const resolutionWithoutDigest = {
    schemaVersion: RESOLUTION_SCHEMA_VERSION,
    manifestDigest,
    controlPlaneDigest: options.controlPlaneDigest,
    repositoryIdentity: options.repositoryIdentity,
    repositoryRoot: repository,
    mode: options.mode,
    plan,
    planDigest: planDigest(plan),
    candidateFingerprint: options.candidateFingerprint,
    candidateFileCount: options.candidateFileCount,
    sourceContext: clone(options.sourceContext),
    tasks,
    hits,
    misses,
    verify,
    matrix,
    executionGroups: gateExecutionGroups(tasks),
  };
  return {
    ...resolutionWithoutDigest,
    resolutionDigest: digestJson(resolutionWithoutDigest),
  };
}

export function validateResolution(resolution, manifestInput = null) {
  requireObject(resolution, "task resolution");
  requireExactKeys(
    resolution,
    [
      "schemaVersion",
      "manifestDigest",
      "controlPlaneDigest",
      "repositoryIdentity",
      "repositoryRoot",
      "mode",
      "plan",
      "planDigest",
      "candidateFingerprint",
      "candidateFileCount",
      "sourceContext",
      "tasks",
      "hits",
      "misses",
      "verify",
      "matrix",
      "executionGroups",
      "resolutionDigest",
    ],
    [],
    "task resolution",
  );
  if (resolution.schemaVersion !== RESOLUTION_SCHEMA_VERSION) {
    throw new Error("Unsupported task resolution schema.");
  }
  requireDigest(resolution.manifestDigest, "task resolution manifest digest");
  requireDigest(resolution.controlPlaneDigest, "task resolution control-plane digest");
  if (
    typeof resolution.repositoryRoot !== "string" ||
    !path.isAbsolute(resolution.repositoryRoot)
  ) {
    throw new Error("Task resolution repository root must be absolute.");
  }
  requireDigest(resolution.planDigest, "task resolution plan digest");
  requireDigest(resolution.candidateFingerprint, "task resolution candidate fingerprint");
  requireFileCount(resolution.candidateFileCount, "task resolution candidate file count");
  requireDigest(resolution.resolutionDigest, "task resolution digest");
  const { resolutionDigest, ...withoutDigest } = resolution;
  if (resolutionDigest !== digestJson(withoutDigest)) {
    throw new Error("Task resolution digest contradicts its content.");
  }
  if (!Array.isArray(resolution.tasks)) throw new Error("Task resolution tasks are malformed.");
  if (!MODES.has(resolution.mode)) throw new Error("Task resolution mode is invalid.");
  validateSource({
    ...resolution.sourceContext,
    createdAt: resolution.sourceContext.createdAt ?? "1970-01-01T00:00:00.000Z",
  });
  if (
    resolution.sourceContext.repository !== resolution.repositoryIdentity ||
    resolution.sourceContext.controlPlaneDigest !== resolution.controlPlaneDigest
  ) {
    throw new Error("Task resolution source context is not current.");
  }
  if (resolution.planDigest !== planDigest(resolution.plan)) {
    throw new Error("Task resolution plan digest contradicts its plan.");
  }
  const ids = new Set();
  for (const task of resolution.tasks) {
    requireExactKeys(
      task,
      [
        "gateId",
        "taskKey",
        "keyMaterial",
        "gateContract",
        "workspaceFileCount",
        "prerequisiteKeys",
        "installProfiles",
        "restoreOutputs",
        "evidence",
        "unavailableInputs",
        "cacheEligible",
        "status",
        "lookupDurationMs",
        "lookupResult",
        "lookupMissCount",
        "lookupRejectCount",
      ],
      ["missReason", "receipt", "locator", "verifiedMetadata", "comparisonReceipt"],
      `${task.gateId ?? "unknown"}: resolved task`,
    );
    if (ids.has(task.gateId)) throw new Error(`Duplicate resolved gate: ${task.gateId}`);
    ids.add(task.gateId);
    requireDigest(task.taskKey, `${task.gateId}: task key`);
    requireObject(task.keyMaterial, `${task.gateId}: task key material`);
    if (task.taskKey !== digestJson(task.keyMaterial)) {
      throw new Error(`${task.gateId}: task key contradicts its key material.`);
    }
    if (!new Set(["miss", "reused", "verify"]).has(task.status)) {
      throw new Error(`${task.gateId}: resolved task status is invalid.`);
    }
    if (
      !new Set(["miss", "hit", "verify", "reject"]).has(task.lookupResult) ||
      !Number.isSafeInteger(task.lookupMissCount) ||
      !new Set([0, 1]).has(task.lookupMissCount) ||
      !Number.isSafeInteger(task.lookupRejectCount) ||
      !new Set([0, 1]).has(task.lookupRejectCount) ||
      task.lookupRejectCount > task.lookupMissCount
    ) {
      throw new Error(`${task.gateId}: lookup accounting is invalid.`);
    }
    if (!Array.isArray(task.installProfiles)) {
      throw new Error(`${task.gateId}: resolved install profiles are malformed.`);
    }
    requireFileCount(task.workspaceFileCount, `${task.gateId}: workspace file count`);
    if (!Array.isArray(task.prerequisiteKeys) || !Array.isArray(task.unavailableInputs)) {
      throw new Error(`${task.gateId}: task prerequisites or unavailable inputs are malformed.`);
    }
    if (task.keyMaterial.gateContractDigest !== digestJson(task.gateContract)) {
      throw new Error(`${task.gateId}: gate contract contradicts its task key material.`);
    }
    requireExactKeys(
      task.keyMaterial.toolchain?.platform,
      ["os", "arch", "runnerLabel"],
      [],
      `${task.gateId}: task platform identity`,
    );
    if (
      canonicalJson(task.evidence) !== canonicalJson(task.gateContract.evidence) ||
      canonicalJson(task.restoreOutputs) !== canonicalJson(task.gateContract.restoreOutputs) ||
      canonicalJson(task.installProfiles) !==
        canonicalJson(task.gateContract.execution.packageProfiles) ||
      canonicalJson(task.prerequisiteKeys) !== canonicalJson(task.keyMaterial.prerequisiteKeys)
    ) {
      throw new Error(`${task.gateId}: derived task contract fields contradict key material.`);
    }
    if (task.cacheEligible !== (task.unavailableInputs.length === 0)) {
      throw new Error(`${task.gateId}: cache eligibility contradicts unavailable inputs.`);
    }
    if (task.status !== "miss" && task.cacheEligible !== true) {
      throw new Error(`${task.gateId}: an ineligible task cannot be reused or verified.`);
    }
    if (task.status === "reused" && (!task.receipt || !task.locator || !task.verifiedMetadata)) {
      throw new Error(`${task.gateId}: reused task provenance is incomplete.`);
    }
    if (
      task.status === "verify" &&
      (!task.comparisonReceipt || !task.locator || !task.verifiedMetadata)
    ) {
      throw new Error(`${task.gateId}: verification task provenance is incomplete.`);
    }
  }
  const expectedHits = resolution.tasks
    .filter(({ status }) => status === "reused")
    .map(({ gateId }) => gateId);
  const expectedMisses = resolution.tasks
    .filter(({ status }) => status === "miss")
    .map(({ gateId }) => gateId);
  const expectedVerify = resolution.tasks
    .filter(({ status }) => status === "verify")
    .map(({ gateId }) => gateId);
  for (const [label, actual, expected] of [
    ["hit", resolution.hits, expectedHits],
    ["miss", resolution.misses, expectedMisses],
    ["verify", resolution.verify, expectedVerify],
  ]) {
    if (canonicalJson(actual) !== canonicalJson(expected)) {
      throw new Error(`Task resolution ${label} accounting contradicts task statuses.`);
    }
  }
  const expectedMatrix = {
    include: resolution.tasks
      .filter(({ status }) => status !== "reused")
      .map(({ gateId, taskKey, installProfiles }) => ({ gateId, taskKey, installProfiles })),
  };
  if (canonicalJson(resolution.matrix) !== canonicalJson(expectedMatrix)) {
    throw new Error("Task resolution execution matrix contradicts task statuses.");
  }
  if (
    canonicalJson(resolution.executionGroups) !==
    canonicalJson(gateExecutionGroups(resolution.tasks))
  ) {
    throw new Error("Task resolution execution groups contradict task statuses.");
  }
  if (manifestInput) {
    const manifest = validateManifest(manifestInput);
    if (resolution.manifestDigest !== digestJson(manifest)) {
      throw new Error("Task resolution manifest digest is not current.");
    }
    validatePlan(resolution.plan, manifest, "resolved validation plan", {
      requireCandidatePlanDigest: true,
    });
    const expectedIds = resolution.plan.selectedGates;
    if (
      canonicalJson(resolution.tasks.map(({ gateId }) => gateId)) !== canonicalJson(expectedIds)
    ) {
      throw new Error("Task resolution does not contain the exact selected gate order.");
    }
  }
  return resolution;
}

function normalizeOutcome(outcome, task, resolution, repository) {
  requireObject(outcome, "task outcome");
  if (!new Set(["passed", "failed"]).has(outcome.status)) {
    throw new Error("Task outcome status must be passed or failed.");
  }
  if (!Number.isSafeInteger(outcome.durationMs) || outcome.durationMs < 0) {
    throw new Error("Task outcome durationMs must be a non-negative integer.");
  }
  const outputs = outcome.outputs ?? [];
  if (!Array.isArray(outputs)) throw new Error("Task outcome outputs must be an array.");
  const expectedOutputs = new Map(task.restoreOutputs.map((output) => [output.id, output]));
  const normalizedOutputs = [];
  for (const output of outputs) {
    if (
      typeof output?.id !== "string" ||
      !new Set(["directory", "file"]).has(output.kind) ||
      !DIGEST_PATTERN.test(output.digest ?? "")
    ) {
      throw new Error("Task outcome output is malformed.");
    }
    const expected = expectedOutputs.get(output.id);
    if (!expected || expected.kind !== output.kind) {
      throw new Error(`Task outcome output ${output.id} is not declared by the gate.`);
    }
    if (typeof output.sourcePath !== "string" || output.sourcePath.length === 0) {
      throw new Error(
        `Task outcome output ${output.id} is missing its transport-local sourcePath.`,
      );
    }
    const declaredSource = declaredRepositoryPath(repository, expected.path);
    const suppliedSource = path.resolve(repository, output.sourcePath);
    if (suppliedSource !== declaredSource) {
      throw new Error(
        `Task outcome output ${output.id} source must equal declared repository path ${expected.path}.`,
      );
    }
    const witness = digestOutput(declaredSource, output.kind);
    if (witness.digest !== output.digest) {
      throw new Error(`Task outcome output ${output.id} digest contradicts its content.`);
    }
    normalizedOutputs.push({ ...output, sourcePath: declaredSource, ...witness });
    expectedOutputs.delete(output.id);
  }
  if (outcome.status === "passed" && expectedOutputs.size > 0) {
    throw new Error(
      `Task outcome is missing declared output(s): ${[...expectedOutputs.keys()].join(", ")}.`,
    );
  }
  const evidence = clone(outcome.evidence ?? {});
  const evidenceValidation =
    outcome.status === "passed"
      ? successfulEvidenceValidation(evidence, task, resolution, normalizedOutputs)
      : { complete: false, reason: outcome.reason ?? "task execution failed" };
  return { ...outcome, evidence, outputs: normalizedOutputs, evidenceValidation };
}

function smokeEvidenceFromOutput(output) {
  const fingerprint = [
    ...String(output ?? "").matchAll(/^Git candidate fingerprint: (sha256:[a-f0-9]{64})$/gm),
  ].at(-1)?.[1];
  const fileCount = [
    ...String(output ?? "").matchAll(/^Smoke install copied (\d+) Git candidate file\(s\)\.$/gm),
  ].at(-1)?.[1];
  if (!fingerprint || fileCount === undefined) {
    throw new Error("Smoke output did not contain deterministic candidate evidence.");
  }
  return { candidateFingerprint: fingerprint, candidateFileCount: Number(fileCount) };
}

/**
 * Convert raw execution facts into the one canonical record-ready outcome for a
 * resolved task. Callers provide process facts, never gate-specific evidence.
 */
export function createTaskOutcome(options) {
  requireObject(options, "task outcome creation options");
  const resolution = validateResolution(options.resolution);
  const repository = path.resolve(options.repository ?? "");
  if (repository !== resolution.repositoryRoot) {
    throw new Error("Task outcome repository root contradicts the task resolution.");
  }
  const task = resolution.tasks.find(({ gateId }) => gateId === options.gateId);
  if (!task) throw new Error(`Gate ${options.gateId} is not in the task resolution.`);
  if (!Number.isSafeInteger(options.durationMs) || options.durationMs < 0) {
    throw new Error("Task execution durationMs must be a non-negative integer.");
  }
  if (!new Set(["passed", "failed"]).has(options.status)) {
    throw new Error("Task execution status must be passed or failed.");
  }
  const exitCode = options.exitCode ?? null;
  if (exitCode !== null && (!Number.isSafeInteger(exitCode) || exitCode < 0)) {
    throw new Error("Task execution exitCode must be null or a non-negative integer.");
  }
  if (options.status === "failed") {
    return {
      status: "failed",
      durationMs: options.durationMs,
      reason: options.reason ?? "task execution failed",
      evidence: { exitCode },
      outputs: [],
    };
  }
  if (exitCode !== 0) throw new Error("A passed task execution must have exitCode 0.");

  const outputs = task.restoreOutputs.map((output) => {
    const sourcePath = declaredRepositoryPath(repository, output.path);
    return {
      id: output.id,
      kind: output.kind,
      sourcePath,
      ...digestOutput(sourcePath, output.kind),
    };
  });
  let evidence;
  switch (task.evidence.kind) {
    case "exit-code":
      evidence = {
        exitCode: 0,
        ...(options.structuredEvidence?.resultDigest
          ? { resultDigest: options.structuredEvidence.resultDigest }
          : {}),
      };
      break;
    case "pinned-actionlint-exit-code":
      if (
        !/^actionlint@\d+\.\d+\.\d+\+sha256:[a-f0-9]{64}$/.test(
          options.toolEvidence?.actionlint?.identity ?? "",
        ) ||
        (task.keyMaterial.toolchain.tools.actionlint !== null &&
          options.toolEvidence.actionlint.identity !==
            task.keyMaterial.toolchain.tools.actionlint) ||
        !DIGEST_PATTERN.test(options.toolEvidence?.actionlint?.executableDigest ?? "")
      ) {
        throw new Error("Observed actionlint executable evidence is missing or contradictory.");
      }
      evidence = {
        exitCode: 0,
        actionlintIdentity: options.toolEvidence.actionlint.identity,
        executableDigest: options.toolEvidence.actionlint.executableDigest,
      };
      break;
    case "capability-complete-exit-code": {
      const combinedOutput = `${options.stdout ?? ""}\n${options.stderr ?? ""}`;
      const forbidden = task.evidence.forbiddenOutputMarkers ?? [];
      if (forbidden.some((marker) => combinedOutput.includes(marker))) {
        throw new Error("Observed output reported a skipped or incomplete capability.");
      }
      const capabilities = Object.fromEntries(
        task.evidence.requiredCapabilities.map((capability) => [
          capability,
          combinedOutput.includes(task.evidence.outputMarkers[capability]),
        ]),
      );
      if (Object.values(capabilities).some((complete) => complete !== true)) {
        throw new Error("Observed output did not prove every declared capability.");
      }
      evidence = {
        exitCode: 0,
        capabilities,
      };
      break;
    }
    case "architecture-compass-accounting-v1":
      evidence = clone(options.structuredEvidence);
      break;
    case "smoke-candidate-and-cli": {
      const smoke = smokeEvidenceFromOutput(options.stdout);
      evidence = {
        exitCode: 0,
        ...smoke,
        skillsCliIdentity: options.toolEvidence?.["skills-cli"]?.identity,
        skillsCliExecutableDigest: options.toolEvidence?.["skills-cli"]?.executableDigest,
        forceTty: task.keyMaterial.environment.SKILLS_SMOKE_FORCE_TTY,
        overrideState: task.keyMaterial.environment.SKILLS_SMOKE_OVERRIDE_STATE,
      };
      break;
    }
    case "output-tree":
      evidence = {
        exitCode: 0,
        outputDigests: Object.fromEntries(outputs.map(({ id, digest }) => [id, digest])),
      };
      break;
    case "release-metadata":
      evidence = {
        exitCode: 0,
        eventClass: task.keyMaterial.gitInputs.eventClass,
        baseCommit: task.keyMaterial.gitInputs.baseCommit,
        baseTree: task.keyMaterial.gitInputs.baseTree,
        baseDiff: task.keyMaterial.gitInputs.baseDiff,
        baseReleaseMetadata: task.keyMaterial.gitInputs.baseReleaseMetadata,
      };
      break;
    default:
      throw new Error(`Unsupported gate evidence kind: ${task.evidence.kind ?? "missing"}.`);
  }
  const normalized = normalizeOutcome(
    {
      status: "passed",
      durationMs: options.durationMs,
      reason: null,
      evidence,
      outputs,
    },
    task,
    resolution,
    repository,
  );
  if (!normalized.evidenceValidation.complete) {
    throw new Error(normalized.evidenceValidation.reason);
  }
  const { evidenceValidation: _, ...recordReady } = normalized;
  return recordReady;
}

/**
 * Build the canonical transport envelope for a selected task that failed before
 * the executor could start (for example dependency install or shard setup).
 */
export function createFailedTaskOutcome(options) {
  requireObject(options, "failed task outcome options");
  const resolution = validateResolution(options.resolution);
  const task = resolution.tasks.find(({ gateId }) => gateId === options.gateId);
  if (!task) throw new Error(`Gate ${options.gateId} is not in the task resolution.`);
  if (task.status === "reused") throw new Error(`Gate ${task.gateId} was already reused.`);
  if (typeof options.reason !== "string" || options.reason.trim().length === 0) {
    throw new Error("Failed task outcome reason must be a non-empty string.");
  }
  const durationMs = options.durationMs ?? 0;
  if (!Number.isSafeInteger(durationMs) || durationMs < 0) {
    throw new Error("Failed task outcome durationMs must be a non-negative integer.");
  }
  return {
    schemaVersion: 1,
    gateId: task.gateId,
    taskKey: task.taskKey,
    resolutionDigest: resolution.resolutionDigest,
    candidateFingerprintBefore: resolution.candidateFingerprint,
    candidateFileCountBefore: resolution.candidateFileCount,
    candidateFingerprintAfter: resolution.candidateFingerprint,
    candidateFileCountAfter: resolution.candidateFileCount,
    outcome: {
      status: "failed",
      durationMs,
      reason: options.reason.trim(),
      evidence: { exitCode: null },
      outputs: [],
    },
  };
}

export async function record(options, adapters) {
  requireObject(options, "record options");
  void adapters;
  const resolution = validateResolution(options.resolution);
  const repository = path.resolve(options.repository ?? "");
  if (repository !== resolution.repositoryRoot) {
    throw new Error("Record repository root contradicts the task resolution.");
  }
  const task = resolution.tasks.find(({ gateId }) => gateId === options.gateId);
  if (!task) throw new Error(`Gate ${options.gateId} is not in the task resolution.`);
  if (task.status === "reused") throw new Error(`Gate ${options.gateId} was already reused.`);
  requireDigest(options.candidateFingerprintBefore, "candidate fingerprint before task");
  requireDigest(options.candidateFingerprintAfter, "candidate fingerprint after task");
  requireFileCount(options.candidateFileCountBefore, "candidate file count before task");
  requireFileCount(options.candidateFileCountAfter, "candidate file count after task");
  const outcome = normalizeOutcome(options.outcome, task, resolution, repository);
  const materializedAfter = materializedCandidateIdentity(repository);
  const reportedAfterMismatch =
    options.candidateFingerprintAfter !== materializedAfter.fingerprint ||
    options.candidateFileCountAfter !== materializedAfter.fileCount;
  const mutated = options.candidateFingerprintBefore !== materializedAfter.fingerprint;
  const countMutated = options.candidateFileCountBefore !== materializedAfter.fileCount;
  const beforeResolutionIdentityMismatch =
    options.candidateFingerprintBefore !== resolution.candidateFingerprint ||
    options.candidateFileCountBefore !== resolution.candidateFileCount;
  const materializedResolutionIdentityMismatch =
    materializedAfter.fingerprint !== resolution.candidateFingerprint ||
    materializedAfter.fileCount !== resolution.candidateFileCount;
  const resolutionIdentityMismatch =
    beforeResolutionIdentityMismatch || materializedResolutionIdentityMismatch;
  const comparisonMismatch =
    task.status === "verify" &&
    task.comparisonReceipt &&
    (task.comparisonReceipt.evidenceDigest !== digestJson(outcome.evidence ?? {}) ||
      digestJson(task.comparisonReceipt.outputs) !==
        digestJson(outcome.outputs.map(safeOutputMetadata)));
  const passed =
    outcome.status === "passed" &&
    outcome.evidenceValidation.complete === true &&
    options.sourceContext.repository === resolution.repositoryIdentity &&
    options.sourceContext.workflowPath === resolution.sourceContext.workflowPath &&
    options.sourceContext.workflowDigest === resolution.sourceContext.workflowDigest &&
    options.sourceContext.controlPlaneDigest === resolution.controlPlaneDigest &&
    options.sourceContext.jobConclusion === "success" &&
    !mutated &&
    !countMutated &&
    !reportedAfterMismatch &&
    !resolutionIdentityMismatch &&
    !comparisonMismatch;
  const kind = passed ? "result" : "tombstone";
  const reusable = passed && task.cacheEligible === true;
  const source = {
    ...clone(options.sourceContext),
    createdAt: options.now,
    ...(options.expiresAt ? { expiresAt: options.expiresAt } : {}),
  };
  validateSource(source);
  const receiptWithoutDigest = {
    schemaVersion: GATE_RECEIPT_SCHEMA_VERSION,
    proofLevel: "diagnostic",
    kind,
    reusable,
    gateId: task.gateId,
    taskKey: task.taskKey,
    controlPlaneDigest: resolution.controlPlaneDigest,
    manifestDigest: resolution.manifestDigest,
    status: passed ? "passed" : "failed",
    capabilityComplete: outcome.evidenceValidation.complete === true,
    candidateFingerprintBefore: options.candidateFingerprintBefore,
    candidateFileCountBefore: options.candidateFileCountBefore,
    candidateFingerprintAfter: materializedAfter.fingerprint,
    candidateFileCountAfter: materializedAfter.fileCount,
    durationMs: outcome.durationMs,
    reason: beforeResolutionIdentityMismatch
      ? "current candidate does not match the resolution candidate identity"
      : reportedAfterMismatch
        ? "candidate changed or its reported after-boundary contradicts the materialized candidate"
        : mutated || countMutated
          ? "candidate changed while the task executed"
          : materializedResolutionIdentityMismatch
            ? "materialized candidate changed from the resolution candidate identity"
            : comparisonMismatch
              ? "reuse verification mismatch"
              : passed && !task.cacheEligible
                ? "current execution passed but task key inputs were unavailable"
                : options.sourceContext.jobConclusion !== "success"
                  ? "producer job did not conclude successfully"
                  : options.sourceContext.repository !== resolution.repositoryIdentity ||
                      options.sourceContext.workflowPath !==
                        resolution.sourceContext.workflowPath ||
                      options.sourceContext.workflowDigest !==
                        resolution.sourceContext.workflowDigest ||
                      options.sourceContext.controlPlaneDigest !== resolution.controlPlaneDigest
                    ? "producer source context is not current"
                    : (outcome.evidenceValidation.reason ?? outcome.reason ?? null),
    evidence: clone(outcome.evidence),
    evidenceDigest: digestJson(outcome.evidence),
    outputs: outcome.outputs.map(safeOutputMetadata),
    source,
  };
  const receipt = {
    ...receiptWithoutDigest,
    receiptDigest: digestJson(receiptWithoutDigest),
  };
  const publication = stagePublicationBundle({
    directory: options.publicationDirectory,
    repository,
    receipt,
    resolutionDigest: resolution.resolutionDigest,
    outputs: outcome.outputs,
  });
  return { kind, receipt, publication };
}

export async function finalizePublication(options, adapters) {
  requireObject(options, "finalize publication options");
  const store = adapters?.store;
  if (!store || typeof store.verify !== "function" || typeof store.publish !== "function") {
    throw new Error("finalizePublication requires a store adapter with verify() and publish().");
  }
  const resolution = validateResolution(options.resolution);
  const recorded = options.recorded;
  validatePublicationBundle(recorded, resolution);
  const task = resolution.tasks.find(({ gateId }) => gateId === recorded.receipt.gateId);
  if (!task) throw new Error("Provisional task receipt is not in the task resolution.");
  const receipt = validateGateReceipt(recorded.receipt, {
    repositoryIdentity: resolution.repositoryIdentity,
    workflowPath: resolution.sourceContext.workflowPath,
    workflowDigest: resolution.sourceContext.workflowDigest,
    gateId: task.gateId,
    taskKey: task.taskKey,
    controlPlaneDigest: resolution.controlPlaneDigest,
    manifestDigest: resolution.manifestDigest,
    restoreOutputs: task.restoreOutputs,
    evidence: task.evidence,
    keyMaterial: task.keyMaterial,
  });
  const locator = validateLocator(options.locator);
  const currentTrustContext = trustContext(
    resolution.repositoryIdentity,
    resolution.sourceContext.workflowPath,
    resolution.sourceContext.workflowDigest,
    resolution.controlPlaneDigest,
  );
  const publicationDeadline = new Date(Date.now() + STORE_TIMEOUT_MS).toISOString();
  const verifiedMetadata = await verifyObservation(
    store,
    receipt,
    locator,
    currentTrustContext,
    null,
    publicationDeadline,
  );
  if (verifiedMetadata.artifact.expired) {
    throw new Error("Newly uploaded task artifact is already expired.");
  }
  let indexPublished = false;
  const warnings = [];
  if (receipt.kind === "result" && receipt.reusable !== true) {
    warnings.push("Task key inputs were unavailable; the successful result was not indexed.");
  } else {
    try {
      const publishedLocator = validateLocator(
        await boundedStoreCall(store.publish.bind(store), {
          receipt: clone(receipt),
          locator: clone(locator),
          bundleDigest: recorded.publication.bundleDigest,
          trustContext: clone(currentTrustContext),
          verifiedMetadata: clone(verifiedMetadata),
          deadline: publicationDeadline,
          timeoutMs: STORE_TIMEOUT_MS,
        }),
      );
      if (canonicalJson(publishedLocator) !== canonicalJson(locator)) {
        throw new Error("Result store published a locator different from the verified artifact.");
      }
      indexPublished = true;
    } catch (error) {
      if (error?.code !== "ERR_STORE_UNAVAILABLE") throw error;
      warnings.push(`Task result index publication was unavailable: ${error.message}`);
    }
  }
  return {
    kind: recorded.kind,
    receipt: clone(receipt),
    locator,
    verifiedMetadata,
    publication: {
      schemaVersion: 1,
      state: "published",
      resolutionDigest: resolution.resolutionDigest,
      bundleDigest: recorded.publication.bundleDigest,
      stagedTreeDigest: recorded.publication.stagedTreeDigest,
      indexPublished,
      warnings,
    },
  };
}

function recordsByGate(records, expectedGateIds) {
  const entries =
    records instanceof Map
      ? [...records.entries()]
      : Array.isArray(records)
        ? records.map((record_) => [record_.receipt?.gateId, record_])
        : Object.entries(records ?? {});
  const map = new Map();
  for (const [gateId, record_] of entries) {
    if (typeof gateId !== "string" || !expectedGateIds.has(gateId)) {
      throw new Error(`Unexpected task result: ${gateId ?? "missing gate ID"}`);
    }
    if (map.has(gateId)) throw new Error(`Duplicate task result: ${gateId}`);
    map.set(gateId, record_);
  }
  return map;
}

export async function assemble(options, adapters) {
  requireObject(options, "assemble options");
  const store = adapters?.store;
  if (!store || typeof store.restore !== "function" || typeof store.verify !== "function") {
    throw new Error("assemble requires a store adapter with verify() and restore().");
  }
  const resolution = validateResolution(options.resolution);
  const repository = path.resolve(options.repository ?? "");
  if (repository !== resolution.repositoryRoot) {
    throw new Error("Assembly repository root contradicts the task resolution.");
  }
  for (const task of resolution.tasks) {
    for (const output of task.restoreOutputs) {
      declaredRepositoryPath(repository, output.path, { allowMissing: true });
    }
  }
  requireDigest(options.candidateFingerprintBefore, "candidate fingerprint before assembly");
  requireDigest(options.candidateFingerprintAfter, "candidate fingerprint after assembly");
  requireFileCount(options.candidateFileCountBefore, "candidate file count before assembly");
  requireFileCount(options.candidateFileCountAfter, "candidate file count after assembly");
  const candidateBeforeRestore = materializedCandidateIdentity(repository);
  if (
    candidateBeforeRestore.fingerprint !== resolution.candidateFingerprint ||
    candidateBeforeRestore.fileCount !== resolution.candidateFileCount
  ) {
    throw new Error("Materialized candidate does not match the resolution before restoration.");
  }
  const mutation =
    options.candidateFingerprintBefore !== options.candidateFingerprintAfter ||
    options.candidateFileCountBefore !== options.candidateFileCountAfter;
  const resolutionIdentityMismatch =
    options.candidateFingerprintBefore !== resolution.candidateFingerprint ||
    options.candidateFingerprintAfter !== resolution.candidateFingerprint ||
    options.candidateFileCountBefore !== resolution.candidateFileCount ||
    options.candidateFileCountAfter !== resolution.candidateFileCount;
  const freshRecords = recordsByGate(
    options.records,
    new Set(resolution.tasks.map(({ gateId }) => gateId)),
  );
  const gates = [];
  const accepted = [];
  const currentTrustContext = trustContext(
    resolution.repositoryIdentity,
    resolution.sourceContext.workflowPath,
    resolution.sourceContext.workflowDigest,
    resolution.controlPlaneDigest,
  );
  const verificationDeadline = () => new Date(Date.now() + STORE_TIMEOUT_MS).toISOString();

  for (const task of resolution.tasks) {
    const record_ =
      task.status === "reused"
        ? {
            receipt: task.receipt,
            locator: task.locator,
            verifiedMetadata: task.verifiedMetadata,
            publication: { schemaVersion: 1, state: "published" },
          }
        : freshRecords.get(task.gateId);
    let receipt = record_?.receipt;
    let error = null;
    let locator = null;
    let verifiedMetadata = null;
    if (record_) {
      if (record_.publication?.state !== "published") {
        throw new Error(`${task.gateId}: assembly requires a published task record.`);
      }
      if (
        task.status !== "reused" &&
        record_.publication.resolutionDigest !== resolution.resolutionDigest
      ) {
        throw new Error(`${task.gateId}: published record resolution is not current.`);
      }
      receipt = validateGateReceipt(receipt, {
        repositoryIdentity: resolution.repositoryIdentity,
        workflowPath: resolution.sourceContext.workflowPath,
        workflowDigest: resolution.sourceContext.workflowDigest,
        gateId: task.gateId,
        taskKey: task.taskKey,
        controlPlaneDigest: resolution.controlPlaneDigest,
        manifestDigest: resolution.manifestDigest,
        restoreOutputs: task.restoreOutputs,
        evidence: task.evidence,
        keyMaterial: task.keyMaterial,
      });
      locator = validateLocator(record_.locator);
      verifiedMetadata = await verifyObservation(
        store,
        receipt,
        locator,
        currentTrustContext,
        null,
        verificationDeadline(),
      );
      if (verifiedMetadata.artifact.expired) {
        throw new Error(`Task artifact ${task.gateId} expired before assembly.`);
      }
      if (!receipt || receipt.kind !== "result") error = "task did not produce a reusable success";
    }
    if (!record_) error ??= "task result is missing";
    if (mutation) error ??= "candidate changed while validation was assembled";
    if (resolutionIdentityMismatch) {
      error ??= "current candidate does not match the resolution candidate identity";
    }
    const sourceKind = task.status === "reused" ? "reused" : "executed";
    const gateResult = {
      id: task.gateId,
      status: error ? "failed" : "passed",
      source: sourceKind,
      taskKey: task.taskKey,
      receiptDigest: receipt?.receiptDigest ?? null,
      producer: receipt?.source ?? null,
      producerLocator: locator ? clone(locator) : null,
      lookupDurationMs: task.lookupDurationMs ?? 0,
      lookupResult: task.lookupResult,
      lookupMissCount: task.lookupMissCount,
      lookupRejectCount: task.lookupRejectCount,
      durationMs: receipt?.durationMs ?? 0,
      evidenceDigest: receipt?.evidenceDigest ?? null,
      outputs: receipt?.outputs ?? [],
      reason: error,
    };
    gates.push(gateResult);
    if (!error) accepted.push({ task, receipt, locator, verifiedMetadata });
  }

  for (const acceptedTask of accepted) {
    for (const output of acceptedTask.receipt.outputs) {
      const outputContract = acceptedTask.task.restoreOutputs.find(({ id }) => id === output.id);
      const absoluteDestination = declaredRepositoryPath(repository, outputContract.path, {
        allowMissing: true,
      });
      const parent = path.dirname(absoluteDestination);
      fs.mkdirSync(parent, { recursive: true });
      const staging = fs.mkdtempSync(path.join(parent, `.validation-restore-${output.id}-`));
      const payload = path.join(staging, "payload");
      try {
        await store.restore({
          locator: acceptedTask.locator,
          outputId: output.id,
          destination: payload,
          verifiedMetadata: clone(acceptedTask.verifiedMetadata),
          trustContext: clone(currentTrustContext),
          deadline: verificationDeadline(),
          timeoutMs: STORE_TIMEOUT_MS,
        });
        if (canonicalJson(fs.readdirSync(staging).sort()) !== canonicalJson(["payload"])) {
          throw new Error(
            `Restored output ${acceptedTask.task.gateId}/${output.id} created undeclared staging entries.`,
          );
        }
        const restored = digestOutput(payload, output.kind);
        if (restored.digest !== output.digest) {
          throw new Error(
            `Restored output ${acceptedTask.task.gateId}/${output.id} digest contradicts its receipt.`,
          );
        }
        const backup = `${absoluteDestination}.validation-backup-${process.pid}-${crypto
          .randomBytes(4)
          .toString("hex")}`;
        const existed = fs.existsSync(absoluteDestination);
        if (existed) fs.renameSync(absoluteDestination, backup);
        try {
          fs.renameSync(payload, absoluteDestination);
        } catch (error) {
          if (existed && fs.existsSync(backup)) fs.renameSync(backup, absoluteDestination);
          throw error;
        }
        if (existed) fs.rmSync(backup, { recursive: true, force: true });
        const guardedCandidate = materializedCandidateIdentity(repository);
        if (
          guardedCandidate.fingerprint !== candidateBeforeRestore.fingerprint ||
          guardedCandidate.fileCount !== candidateBeforeRestore.fileCount
        ) {
          throw new Error(
            `Candidate changed during output restoration for ${acceptedTask.task.gateId}/${output.id}; the store wrote outside the declared output boundary.`,
          );
        }
      } finally {
        fs.rmSync(staging, { recursive: true, force: true });
      }
    }
  }

  const candidateAfterRestore = materializedCandidateIdentity(repository);
  if (
    candidateAfterRestore.fingerprint !== candidateBeforeRestore.fingerprint ||
    candidateAfterRestore.fileCount !== candidateBeforeRestore.fileCount
  ) {
    throw new Error("Candidate changed during output restoration outside declared outputs.");
  }

  const counts = {
    executed: gates.filter(({ source }) => source === "executed").length,
    reused: gates.filter(({ source }) => source === "reused").length,
    passed: gates.filter(({ status }) => status === "passed").length,
    failed: gates.filter(({ status }) => status === "failed").length,
    misses: gates.reduce((count, gate) => count + gate.lookupMissCount, 0),
    rejects: gates.reduce((count, gate) => count + gate.lookupRejectCount, 0),
  };
  const taskResultSetDigest = digestJson(
    gates.map(({ id, taskKey, receiptDigest, status }) => ({ id, taskKey, receiptDigest, status })),
  );
  const reportWithoutDigest = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    proofLevel: "diagnostic",
    planDigest: resolution.planDigest,
    manifestDigest: resolution.manifestDigest,
    controlPlaneDigest: resolution.controlPlaneDigest,
    scope: resolution.plan.scope,
    selectedGates: resolution.plan.selectedGates,
    gates,
    counts,
    taskResultSetDigest,
    candidateFingerprintBefore: candidateBeforeRestore.fingerprint,
    candidateFileCountBefore: candidateBeforeRestore.fileCount,
    candidateFingerprintAfter: candidateAfterRestore.fingerprint,
    candidateFileCountAfter: candidateAfterRestore.fileCount,
    fingerprintError: mutation
      ? "The materialized Git candidate changed during validation."
      : resolutionIdentityMismatch
        ? "The materialized Git candidate does not match the resolution candidate identity."
        : null,
  };
  const report = { ...reportWithoutDigest, reportDigest: digestJson(reportWithoutDigest) };
  const failed = mutation || resolutionIdentityMismatch || counts.failed > 0;
  return {
    failed,
    report,
    acceptedTaskReceipts: accepted.map(({ task, receipt, locator }) => ({
      gateId: task.gateId,
      receipt: clone(receipt),
      locator: clone(validateLocator(locator)),
    })),
  };
}

export const _internal = Object.freeze({
  matches,
  receiptDigest,
  validateGateReceipt,
  workspaceWitness,
});
