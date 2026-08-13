import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { stripVTControlCharacters, TextDecoder } from "node:util";

const EXCLUDED_ROOTS = new Set([
  ".agents",
  ".claude",
  ".codegraph",
  ".git",
  ".worktrees",
  "skills-lock.json",
]);
const EXCLUDED_DIRECTORY_SEGMENTS = new Set([
  ".astro",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "temp",
  "tmp",
]);
const SKILL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const GIT_CANDIDATE_FINGERPRINT_FORMAT = "agent-skills-git-candidate-v1";
const STRICT_UTF8_DECODER = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const GIT_STEERING_ENVIRONMENT_NAMES = new Set([
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_CEILING_DIRECTORIES",
  "GIT_COMMON_DIR",
  "GIT_CONFIG",
  "GIT_CONFIG_COUNT",
  "GIT_CONFIG_GLOBAL",
  "GIT_CONFIG_NOSYSTEM",
  "GIT_CONFIG_PARAMETERS",
  "GIT_CONFIG_SYSTEM",
  "GIT_DIR",
  "GIT_DISCOVERY_ACROSS_FILESYSTEM",
  "GIT_IMPLICIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_INTERNAL_SUPER_PREFIX",
  "GIT_OBJECT_DIRECTORY",
  "GIT_PREFIX",
  "GIT_WORK_TREE",
]);
const GIT_CONFIG_ENTRY_PATTERN = /^GIT_CONFIG_(?:KEY|VALUE)_\d+$/;

function normalizedCandidatePath(candidatePath) {
  if (
    typeof candidatePath !== "string" ||
    !candidatePath ||
    candidatePath.includes("\0") ||
    candidatePath.includes("\\") ||
    path.posix.isAbsolute(candidatePath)
  ) {
    throw new Error(`Git returned an unsafe candidate path: ${JSON.stringify(candidatePath)}.`);
  }

  const normalized = path.posix.normalize(candidatePath);
  if (
    normalized !== candidatePath ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    throw new Error(`Git returned an unsafe candidate path: ${JSON.stringify(candidatePath)}.`);
  }
  return normalized;
}

function decodeGitCandidatePath(candidateBytes) {
  let candidatePath;
  try {
    candidatePath = STRICT_UTF8_DECODER.decode(candidateBytes);
  } catch {
    throw new Error("Git returned a candidate path that is not valid UTF-8.");
  }
  if (!Buffer.from(candidatePath, "utf8").equals(candidateBytes)) {
    throw new Error("Git returned a candidate path that is not valid UTF-8.");
  }
  return candidatePath;
}

function decodeGitCandidateOutput(output) {
  const candidatePaths = [];
  let start = 0;
  while (start < output.length) {
    const end = output.indexOf(0, start);
    if (end < 0) {
      throw new Error("Git returned a candidate path stream without NUL termination.");
    }
    if (end === start) {
      throw new Error("Git returned an empty candidate path.");
    }
    candidatePaths.push(decodeGitCandidatePath(output.subarray(start, end)));
    start = end + 1;
  }
  return candidatePaths;
}

function sanitizedGitEnvironment() {
  const environment = { ...process.env };
  for (const name of Object.keys(environment)) {
    const normalizedName = name.toUpperCase();
    if (
      GIT_STEERING_ENVIRONMENT_NAMES.has(normalizedName) ||
      GIT_CONFIG_ENTRY_PATTERN.test(normalizedName) ||
      normalizedName === "GIT_OPTIONAL_LOCKS"
    ) {
      delete environment[name];
    }
  }
  const nullGitConfig = process.platform === "win32" ? "NUL" : "/dev/null";
  environment.GIT_CONFIG_COUNT = "0";
  environment.GIT_CONFIG_GLOBAL = nullGitConfig;
  environment.GIT_CONFIG_NOSYSTEM = "1";
  environment.GIT_CONFIG_SYSTEM = nullGitConfig;
  environment.GIT_OPTIONAL_LOCKS = "0";
  return environment;
}

function gitCommandOutput(repositoryRoot, environment, arguments_, label) {
  const result = spawnSync("git", arguments_, {
    cwd: repositoryRoot,
    env: environment,
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const errorOutput = result.stderr?.length > 0 ? result.stderr : result.stdout;
    throw new Error(`${label}: ${errorOutput?.toString("utf8").trim() || "unknown Git error"}`);
  }
  return result.stdout;
}

export function sanitizedGitCommandOutput(
  repositoryRoot,
  arguments_,
  label = "Git command failed",
) {
  return gitCommandOutput(repositoryRoot, sanitizedGitEnvironment(), arguments_, label);
}

function decodeGitReportedPath(output, label) {
  if (output.length === 0 || output.at(-1) !== 0x0a) {
    throw new Error(`${label} was not terminated by a line feed.`);
  }
  const pathBytes = output.subarray(0, output.length - 1);
  if (pathBytes.includes(0)) {
    throw new Error(`${label} contained a NUL byte.`);
  }
  let reportedPath;
  try {
    reportedPath = STRICT_UTF8_DECODER.decode(pathBytes);
  } catch {
    throw new Error(`${label} was not valid UTF-8.`);
  }
  if (!Buffer.from(reportedPath, "utf8").equals(pathBytes)) {
    throw new Error(`${label} was not valid UTF-8.`);
  }
  if (!path.isAbsolute(reportedPath)) {
    throw new Error(`${label} was not absolute.`);
  }
  return reportedPath;
}

function isExcludedCandidatePath(candidatePath) {
  const parts = candidatePath.split("/");
  if (EXCLUDED_ROOTS.has(parts[0])) return true;
  if (parts[0] === "docs" && parts[1] === "specs" && parts[2] === "do-not-publish") {
    return true;
  }
  return parts.some((part) => EXCLUDED_DIRECTORY_SEGMENTS.has(part));
}

function deterministicSort(values) {
  return values.sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

function canonicalSkillNames(names, label) {
  if (!Array.isArray(names)) throw new Error(`${label} skill names must be an array.`);

  const normalized = names.map((name) => {
    if (typeof name !== "string" || !SKILL_NAME_PATTERN.test(name)) {
      throw new Error(`${label} contains an invalid skill name: ${JSON.stringify(name)}.`);
    }
    return name;
  });
  const duplicates = normalized.filter((name, index) => normalized.indexOf(name) !== index);
  if (duplicates.length > 0) {
    throw new Error(
      `${label} contains duplicate skill name(s): ${[...new Set(duplicates)].join(", ")}.`,
    );
  }
  return deterministicSort(normalized);
}

function canonicalRepositoryRoot(repositoryRoot) {
  return fs.realpathSync.native(path.resolve(repositoryRoot));
}

function inspectRepositoryRootIdentityChain(repositoryRoot) {
  const parsedRoot = path.parse(repositoryRoot).root;
  const relativeRoot = path.relative(parsedRoot, repositoryRoot);
  const parts = relativeRoot ? relativeRoot.split(path.sep) : [];
  const components = [];
  let current = parsedRoot;

  for (let index = 0; index <= parts.length; index += 1) {
    if (index > 0) current = path.join(current, parts[index - 1]);
    const stat = fs.lstatSync(current, { bigint: true });
    if (stat.isSymbolicLink()) {
      throw new Error(
        `Clean-copy repository root identity chain contains a symbolic link at component ${index}.`,
      );
    }
    if (!stat.isDirectory()) {
      throw new Error(
        `Clean-copy repository root identity chain contains a non-directory at component ${index}.`,
      );
    }
    components.push({
      device: stat.dev,
      inode: stat.ino,
      mode: stat.mode,
      path: index === parts.length ? "." : `<repository-root:${index}>`,
    });
  }

  return components;
}

function inspectCandidateSource(repositoryRoot, candidatePath) {
  const parts = candidatePath.split("/");
  const components = inspectRepositoryRootIdentityChain(repositoryRoot);
  let source = repositoryRoot;
  let sourceStat;

  for (const [index, part] of parts.entries()) {
    source = path.join(source, part);
    let stat;
    try {
      stat = fs.lstatSync(source, { bigint: true });
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }

    const componentPath = parts.slice(0, index + 1).join("/");
    if (stat.isSymbolicLink()) {
      throw new Error(
        `Clean-copy candidate path contains a symbolic link at ${componentPath}: ${candidatePath}`,
      );
    }
    if (index < parts.length - 1 && !stat.isDirectory()) {
      throw new Error(
        `Clean-copy candidate parent is not a directory at ${componentPath}: ${candidatePath}`,
      );
    }

    components.push({
      device: stat.dev,
      inode: stat.ino,
      mode: stat.mode,
      path: componentPath,
    });
    sourceStat = stat;
  }

  if (!sourceStat.isFile()) {
    throw new Error(`Clean-copy candidate is not a regular file: ${candidatePath}`);
  }
  return { candidatePath, components, source, sourceStat };
}

function sameComponentIdentity(left, right) {
  return left.device === right.device && left.inode === right.inode && left.mode === right.mode;
}

function sameIdentityChain(left, right) {
  return (
    left.length === right.length &&
    left.every((component, index) => sameComponentIdentity(component, right[index]))
  );
}

function assertCandidateIdentity(expected, current) {
  if (!current) {
    throw new Error(`Clean-copy candidate disappeared before copy: ${expected.candidatePath}`);
  }
  if (!sameIdentityChain(expected.components, current.components)) {
    throw new Error(`Clean-copy candidate path changed before copy: ${expected.candidatePath}`);
  }
}

function sameFileObservation(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

function inspectGitIndex(indexPath) {
  const canonicalParent = fs.realpathSync.native(path.dirname(indexPath));
  const canonicalPath = path.join(canonicalParent, path.basename(indexPath));
  let stat;
  try {
    stat = fs.lstatSync(canonicalPath, { bigint: true });
  } catch (error) {
    if (error?.code === "ENOENT") return { canonicalPath, stat: null };
    throw error;
  }
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error("Git reported an index path that is not a regular file.");
  }
  return { canonicalPath, stat };
}

function captureGitRepositoryBinding(repositoryRoot, environment) {
  const topLevel = decodeGitReportedPath(
    gitCommandOutput(
      repositoryRoot,
      environment,
      ["rev-parse", "--path-format=absolute", "--show-toplevel"],
      "Could not resolve the Git worktree",
    ),
    "Git worktree path",
  );
  const canonicalTopLevel = fs.realpathSync.native(topLevel);
  if (canonicalTopLevel !== repositoryRoot) {
    throw new Error("Git resolved a worktree different from the requested repository root.");
  }

  const commonDirectory = decodeGitReportedPath(
    gitCommandOutput(
      repositoryRoot,
      environment,
      ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      "Could not resolve the Git common directory",
    ),
    "Git common-directory path",
  );
  const canonicalCommonDirectory = fs.realpathSync.native(commonDirectory);
  const commonDirectoryStat = fs.lstatSync(canonicalCommonDirectory, { bigint: true });
  if (!commonDirectoryStat.isDirectory()) {
    throw new Error("Git reported a common-directory path that is not a directory.");
  }

  const indexPath = decodeGitReportedPath(
    gitCommandOutput(
      repositoryRoot,
      environment,
      ["rev-parse", "--path-format=absolute", "--git-path", "index"],
      "Could not resolve the Git index",
    ),
    "Git index path",
  );

  return {
    commonDirectory: {
      canonicalPath: canonicalCommonDirectory,
      stat: commonDirectoryStat,
    },
    index: inspectGitIndex(indexPath),
    worktreeRoot: canonicalTopLevel,
  };
}

function assertGitRepositoryBinding(expected, current) {
  const commonDirectoryMatches =
    expected.commonDirectory.canonicalPath === current.commonDirectory.canonicalPath &&
    expected.commonDirectory.stat.dev === current.commonDirectory.stat.dev &&
    expected.commonDirectory.stat.ino === current.commonDirectory.stat.ino &&
    expected.commonDirectory.stat.mode === current.commonDirectory.stat.mode;
  const indexPresenceMatches = Boolean(expected.index.stat) === Boolean(current.index.stat);
  const indexMatches =
    expected.index.canonicalPath === current.index.canonicalPath &&
    indexPresenceMatches &&
    (!expected.index.stat || sameFileObservation(expected.index.stat, current.index.stat));
  if (expected.worktreeRoot !== current.worktreeRoot || !commonDirectoryMatches || !indexMatches) {
    throw new Error("Git repository binding changed while enumerating the candidate set.");
  }
}

function createGitEnumerationContext(repositoryRoot) {
  const environment = sanitizedGitEnvironment();
  return {
    binding: captureGitRepositoryBinding(repositoryRoot, environment),
    environment,
  };
}

function readCandidateSnapshot(
  repositoryRoot,
  expected,
  testOnlyBeforeCandidateOpen = null,
  testOnlyOnSnapshotEvent = null,
  pass = "forward",
  phase = "capture",
) {
  testOnlyOnSnapshotEvent?.({
    candidatePath: expected.candidatePath,
    pass,
    phase,
    source: expected.source,
    stage: "before-pre-open",
  });

  const current = inspectCandidateSource(repositoryRoot, expected.candidatePath);
  assertCandidateIdentity(expected, current);
  if (!sameFileObservation(expected.sourceStat, current.sourceStat)) {
    throw new Error(
      `Clean-copy candidate changed before opening for snapshot: ${expected.candidatePath}`,
    );
  }

  testOnlyBeforeCandidateOpen?.({
    candidatePath: expected.candidatePath,
    source: current.source,
  });

  if (typeof fs.constants.O_NOFOLLOW !== "number" || typeof fs.constants.O_NONBLOCK !== "number") {
    throw new Error(
      `Clean-copy candidate snapshot requires O_NOFOLLOW and O_NONBLOCK: ${expected.candidatePath}`,
    );
  }

  const openFlags = fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK;
  testOnlyOnSnapshotEvent?.({
    candidatePath: expected.candidatePath,
    openFlags,
    pass,
    phase,
    source: current.source,
    stage: "before-open",
  });
  const sourceDescriptor = fs.openSync(current.source, openFlags);
  let snapshot;
  let snapshotFailure;
  let snapshotFailed = false;
  try {
    const openedSourceStat = fs.fstatSync(sourceDescriptor, { bigint: true });
    if (
      !openedSourceStat.isFile() ||
      !sameFileObservation(current.sourceStat, openedSourceStat) ||
      !sameFileObservation(expected.sourceStat, openedSourceStat)
    ) {
      throw new Error(
        `Clean-copy candidate changed while opening for snapshot: ${expected.candidatePath}`,
      );
    }

    const contents = fs.readFileSync(sourceDescriptor);
    const completedSourceStat = fs.fstatSync(sourceDescriptor, { bigint: true });
    if (
      !sameFileObservation(openedSourceStat, completedSourceStat) ||
      BigInt(contents.byteLength) !== completedSourceStat.size
    ) {
      throw new Error(`Clean-copy candidate changed while reading: ${expected.candidatePath}`);
    }

    testOnlyOnSnapshotEvent?.({
      candidatePath: expected.candidatePath,
      pass,
      phase,
      source: current.source,
      stage: "after-read",
    });
    const completedPath = inspectCandidateSource(repositoryRoot, expected.candidatePath);
    assertCandidateIdentity(expected, completedPath);
    if (!sameFileObservation(expected.sourceStat, completedPath.sourceStat)) {
      throw new Error(`Clean-copy candidate path changed after reading: ${expected.candidatePath}`);
    }

    snapshot = {
      candidatePath: expected.candidatePath,
      contents,
      mode: Number(completedSourceStat.mode & 0o777n),
    };
  } catch (error) {
    snapshotFailure = error;
    snapshotFailed = true;
  }

  let closeFailure;
  let closeFailed = false;
  try {
    fs.closeSync(sourceDescriptor);
  } catch (error) {
    closeFailure = error;
    closeFailed = true;
  }

  if (snapshotFailed && closeFailed) {
    throw new AggregateError(
      [snapshotFailure, closeFailure],
      `Clean-copy candidate snapshot and descriptor close both failed: ${expected.candidatePath}`,
      { cause: snapshotFailure },
    );
  }
  if (snapshotFailed) throw snapshotFailure;
  if (closeFailed) throw closeFailure;
  return snapshot;
}

function prepareGitCandidateSet(repositoryRoot, gitContext) {
  const rootComponents = inspectRepositoryRootIdentityChain(repositoryRoot);
  const listedCandidatePaths = listGitCandidatePathsAtCanonicalRoot(repositoryRoot, gitContext);
  const candidates = listedCandidatePaths
    .map((candidatePath) => inspectCandidateSource(repositoryRoot, candidatePath))
    .filter(Boolean);
  if (!sameIdentityChain(rootComponents, inspectRepositoryRootIdentityChain(repositoryRoot))) {
    throw new Error("Clean-copy repository root identity changed during Git enumeration.");
  }
  return { candidates, listedCandidatePaths, rootComponents };
}

function sameOrderedPaths(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function materializedCandidatePaths(prepared) {
  return prepared.candidates.map(({ candidatePath }) => candidatePath);
}

function assertGitCandidateSetUnchanged(expected, current) {
  if (!sameIdentityChain(expected.rootComponents, current.rootComponents)) {
    throw new Error("Clean-copy repository root identity changed during Git-set seal.");
  }
  if (
    !sameOrderedPaths(expected.listedCandidatePaths, current.listedCandidatePaths) ||
    !sameOrderedPaths(materializedCandidatePaths(expected), materializedCandidatePaths(current))
  ) {
    throw new Error("Clean-copy Git candidate set changed while capturing the repository.");
  }

  for (const [index, expectedCandidate] of expected.candidates.entries()) {
    const currentCandidate = current.candidates[index];
    assertCandidateIdentity(expectedCandidate, currentCandidate);
    if (!sameFileObservation(expectedCandidate.sourceStat, currentCandidate.sourceStat)) {
      throw new Error(
        `Clean-copy candidate changed during Git-set seal: ${expectedCandidate.candidatePath}`,
      );
    }
  }
}

function snapshotWitness(snapshot) {
  return {
    candidatePath: snapshot.candidatePath,
    mode: snapshot.mode,
    sha256: crypto.createHash("sha256").update(snapshot.contents).digest("hex"),
    size: snapshot.contents.byteLength,
  };
}

function assertSnapshotWitnessUnchanged(expected, current) {
  const actual = snapshotWitness(current);
  if (
    expected.candidatePath !== actual.candidatePath ||
    expected.mode !== actual.mode ||
    expected.sha256 !== actual.sha256 ||
    expected.size !== actual.size
  ) {
    throw new Error(
      `Clean-copy candidate content changed during final seal: ${expected.candidatePath}`,
    );
  }
}

function sealPreparedGitCandidateSet(
  repositoryRoot,
  gitContext,
  prepared,
  witnesses,
  testOnlyOnSnapshotEvent,
) {
  testOnlyOnSnapshotEvent?.({
    candidatePath: null,
    pass: "forward",
    phase: "seal",
    source: repositoryRoot,
    stage: "after-forward-capture",
  });
  assertGitCandidateSetUnchanged(prepared, prepareGitCandidateSet(repositoryRoot, gitContext));

  for (const [index, expected] of prepared.candidates.entries()) {
    const snapshot = readCandidateSnapshot(
      repositoryRoot,
      expected,
      null,
      testOnlyOnSnapshotEvent,
      "forward",
      "seal",
    );
    assertSnapshotWitnessUnchanged(witnesses[index], snapshot);
  }

  for (let index = prepared.candidates.length - 1; index >= 0; index -= 1) {
    const snapshot = readCandidateSnapshot(
      repositoryRoot,
      prepared.candidates[index],
      null,
      testOnlyOnSnapshotEvent,
      "reverse",
      "seal",
    );
    assertSnapshotWitnessUnchanged(witnesses[index], snapshot);
  }

  testOnlyOnSnapshotEvent?.({
    candidatePath: null,
    pass: "reverse",
    phase: "seal",
    source: repositoryRoot,
    stage: "after-reverse-witness",
  });
  assertGitCandidateSetUnchanged(prepared, prepareGitCandidateSet(repositoryRoot, gitContext));
}

function capturePreparedGitCandidateSet(
  repositoryRoot,
  gitContext,
  prepared,
  onCandidate = () => {},
  testOnlyBeforeCandidateOpen = null,
  testOnlyOnSnapshotEvent = null,
) {
  const { candidates } = prepared;
  const fingerprint = crypto.createHash("sha256");
  fingerprint.update(
    `${JSON.stringify({
      fileCount: candidates.length,
      format: GIT_CANDIDATE_FINGERPRINT_FORMAT,
    })}\n`,
  );

  const candidatePaths = [];
  const witnesses = [];
  for (const expected of candidates) {
    const snapshot = readCandidateSnapshot(
      repositoryRoot,
      expected,
      testOnlyBeforeCandidateOpen,
      testOnlyOnSnapshotEvent,
    );
    const witness = snapshotWitness(snapshot);
    fingerprint.update(
      `${JSON.stringify({
        mode: witness.mode.toString(8).padStart(4, "0"),
        path: witness.candidatePath,
        sha256: witness.sha256,
        size: witness.size,
      })}\n`,
    );
    onCandidate(snapshot);
    candidatePaths.push(snapshot.candidatePath);
    witnesses.push(witness);
  }

  sealPreparedGitCandidateSet(
    repositoryRoot,
    gitContext,
    prepared,
    witnesses,
    testOnlyOnSnapshotEvent,
  );

  return {
    algorithm: "sha256",
    candidatePaths,
    digest: fingerprint.digest("hex"),
    fileCount: candidatePaths.length,
    format: GIT_CANDIDATE_FINGERPRINT_FORMAT,
  };
}

function listGitCandidatePathsAtCanonicalRoot(repositoryRoot, gitContext) {
  assertGitRepositoryBinding(
    gitContext.binding,
    captureGitRepositoryBinding(repositoryRoot, gitContext.environment),
  );
  const output = gitCommandOutput(
    repositoryRoot,
    gitContext.environment,
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    "Could not enumerate the Git candidate set",
  );
  assertGitRepositoryBinding(
    gitContext.binding,
    captureGitRepositoryBinding(repositoryRoot, gitContext.environment),
  );

  const seen = new Set();
  for (const rawPath of decodeGitCandidateOutput(output)) {
    const candidatePath = normalizedCandidatePath(rawPath);
    if (!isExcludedCandidatePath(candidatePath)) seen.add(candidatePath);
  }
  return deterministicSort([...seen]);
}

export function listGitCandidatePaths(repositoryRoot) {
  const canonicalRoot = canonicalRepositoryRoot(repositoryRoot);
  return listGitCandidatePathsAtCanonicalRoot(
    canonicalRoot,
    createGitEnumerationContext(canonicalRoot),
  );
}

export function fingerprintGitCandidateRepository(
  repositoryRoot,
  { testOnlyBeforeCandidateOpen = null, testOnlyOnSnapshotEvent = null } = {},
) {
  const canonicalRoot = canonicalRepositoryRoot(repositoryRoot);
  const gitContext = createGitEnumerationContext(canonicalRoot);
  return capturePreparedGitCandidateSet(
    canonicalRoot,
    gitContext,
    prepareGitCandidateSet(canonicalRoot, gitContext),
    () => {},
    testOnlyBeforeCandidateOpen,
    testOnlyOnSnapshotEvent,
  );
}

function capturePrivateDestinationParent(destinationRoot) {
  const resolvedDestinationRoot = path.resolve(destinationRoot);
  const destinationBasename = path.basename(resolvedDestinationRoot);
  if (!destinationBasename) {
    throw new Error("Clean-copy destination must name an entry within a parent directory.");
  }

  const resolvedParentRoot = path.dirname(resolvedDestinationRoot);
  const canonicalParentRoot = fs.realpathSync.native(resolvedParentRoot);
  if (canonicalParentRoot !== resolvedParentRoot) {
    throw new Error("Clean-copy destination parent must be canonical and symlink-free.");
  }

  const stat = fs.lstatSync(canonicalParentRoot, { bigint: true });
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error("Clean-copy destination parent must be a directory, not a symbolic link.");
  }
  const mode = Number(stat.mode & 0o777n);
  if (mode !== 0o700) {
    throw new Error("Clean-copy destination parent must have mode 0700.");
  }
  if (typeof process.getuid === "function" && stat.uid !== BigInt(process.getuid())) {
    throw new Error("Clean-copy destination parent must be owned by the current process user.");
  }

  return {
    destinationRoot: path.join(canonicalParentRoot, destinationBasename),
    device: stat.dev,
    inode: stat.ino,
    mode,
    parentRoot: canonicalParentRoot,
    uid: stat.uid,
  };
}

function assertPrivateDestinationParentStable(destinationParent) {
  let current;
  try {
    current = capturePrivateDestinationParent(destinationParent.destinationRoot);
  } catch {
    throw new Error("Clean-copy destination parent changed.");
  }
  if (
    current.destinationRoot !== destinationParent.destinationRoot ||
    current.parentRoot !== destinationParent.parentRoot ||
    current.device !== destinationParent.device ||
    current.inode !== destinationParent.inode ||
    current.mode !== destinationParent.mode ||
    current.uid !== destinationParent.uid
  ) {
    throw new Error("Clean-copy destination parent changed.");
  }
}

function prepareStagingDestination(stagingRoot, candidatePath) {
  const components = candidatePath.split("/");
  let parentRoot = stagingRoot;
  for (const component of components.slice(0, -1)) {
    parentRoot = path.join(parentRoot, component);
    try {
      fs.mkdirSync(parentRoot, { mode: 0o700 });
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
    const stat = fs.lstatSync(parentRoot);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(`Clean-copy staging path is not a directory: ${candidatePath}`);
    }
    fs.chmodSync(parentRoot, 0o700);
  }
  return path.join(parentRoot, components.at(-1));
}

function assertDestinationAbsent(destinationRoot) {
  try {
    fs.lstatSync(destinationRoot);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  throw new Error(`Clean-copy destination already exists: ${destinationRoot}`);
}

function inspectPublishedDestination(destinationRoot) {
  const stat = fs.lstatSync(destinationRoot, { bigint: true });
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error("Clean-copy published destination is not a directory.");
  }
  return { device: stat.dev, inode: stat.ino };
}

function directoryIdentityMatches(directoryRoot, identity) {
  let stat;
  try {
    stat = fs.lstatSync(directoryRoot, { bigint: true });
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
  return (
    stat.isDirectory() &&
    !stat.isSymbolicLink() &&
    stat.dev === identity.device &&
    stat.ino === identity.inode
  );
}

function cleanupCopyArtifacts(stagingRoot, destinationParent, publication) {
  const { destinationRoot } = destinationParent;
  assertPrivateDestinationParentStable(destinationParent);
  if (publication && directoryIdentityMatches(destinationRoot, publication)) {
    assertDestinationAbsent(stagingRoot);
    assertPrivateDestinationParentStable(destinationParent);
    fs.renameSync(destinationRoot, stagingRoot);
    assertPrivateDestinationParentStable(destinationParent);
    if (!directoryIdentityMatches(stagingRoot, publication)) {
      throw new Error("Clean-copy published destination changed during atomic unpublication.");
    }
  }

  assertPrivateDestinationParentStable(destinationParent);
  if (!publication || directoryIdentityMatches(stagingRoot, publication)) {
    fs.rmSync(stagingRoot, { force: true, recursive: true });
    assertPrivateDestinationParentStable(destinationParent);
  }
  assertPrivateDestinationParentStable(destinationParent);
}

/**
 * The fully sealed staging tree is published at an absent destination with one same-parent rename.
 * Its existing parent must be canonical, symlink-free, owned by the current process user, and mode
 * 0700. The caller must guarantee that no concurrent same-owner process mutates entries inside that
 * parent until this function returns. Under that custody contract, the absence check is no-clobber
 * and consumers observe either no destination or the complete candidate tree. Consumers must not
 * read the destination until this synchronous function returns so a post-publication failure can
 * atomically unpublish the candidate before hidden-tree cleanup.
 */
export function copyGitCandidateRepository(
  repositoryRoot,
  destinationRoot,
  { testOnlyBeforeCandidateOpen = null, testOnlyOnSnapshotEvent = null } = {},
) {
  const canonicalRoot = canonicalRepositoryRoot(repositoryRoot);
  const gitContext = createGitEnumerationContext(canonicalRoot);
  const candidates = prepareGitCandidateSet(canonicalRoot, gitContext);
  const destinationParent = capturePrivateDestinationParent(destinationRoot);
  destinationRoot = destinationParent.destinationRoot;
  const stagingRoot = fs.mkdtempSync(
    path.join(destinationParent.parentRoot, `.${path.basename(destinationRoot)}-`),
  );
  let publication = null;

  try {
    fs.chmodSync(stagingRoot, 0o700);
    assertPrivateDestinationParentStable(destinationParent);
    const result = capturePreparedGitCandidateSet(
      canonicalRoot,
      gitContext,
      candidates,
      (snapshot) => {
        const destination = prepareStagingDestination(stagingRoot, snapshot.candidatePath);
        fs.writeFileSync(destination, snapshot.contents, {
          flag: "wx",
          mode: snapshot.mode,
        });
        fs.chmodSync(destination, snapshot.mode);
      },
      testOnlyBeforeCandidateOpen,
      testOnlyOnSnapshotEvent,
    );

    testOnlyOnSnapshotEvent?.({
      candidatePath: null,
      pass: null,
      phase: "publication",
      source: destinationRoot,
      stage: "before-destination-publication",
      stagingRoot,
    });
    assertPrivateDestinationParentStable(destinationParent);
    assertDestinationAbsent(destinationRoot);
    assertPrivateDestinationParentStable(destinationParent);
    publication = inspectPublishedDestination(stagingRoot);
    fs.renameSync(stagingRoot, destinationRoot);
    assertPrivateDestinationParentStable(destinationParent);
    if (!directoryIdentityMatches(destinationRoot, publication)) {
      throw new Error("Clean-copy published destination changed during publication.");
    }
    testOnlyOnSnapshotEvent?.({
      candidatePath: null,
      pass: null,
      phase: "publication",
      source: destinationRoot,
      stage: "after-destination-publication",
      stagingRoot,
    });
    assertPrivateDestinationParentStable(destinationParent);
    if (!directoryIdentityMatches(destinationRoot, publication)) {
      throw new Error("Clean-copy published destination changed after publication.");
    }
    return result;
  } catch (error) {
    try {
      cleanupCopyArtifacts(stagingRoot, destinationParent, publication);
    } catch {
      // Cleanup must not replace the primary capture or publication failure.
    }
    throw error;
  }
}

function parseSkillsListOutput(output) {
  const plainOutput = stripVTControlCharacters(String(output)).replaceAll("\r", "");
  const lines = plainOutput.split("\n");
  const sectionStart = lines.findIndex((line) => /\bAvailable Skills\s*$/.test(line));
  if (sectionStart < 0) {
    if (/no skills found/i.test(plainOutput)) return [];
    throw new Error("Smoke install CLI output did not contain an Available Skills section.");
  }

  const listedNames = [];
  for (const line of lines.slice(sectionStart + 1)) {
    if (/\bUse --skill\b/.test(line)) break;
    const match = line.match(/^\s*(?:│|\|) {4}([a-z0-9]+(?:-[a-z0-9]+)*)\s*$/);
    if (match) listedNames.push(match[1]);
  }
  const names = canonicalSkillNames(listedNames, "CLI list output");
  const reportedCountMatches = [...plainOutput.matchAll(/\bFound\s+(\d+)\s+skills?\b/gi)];
  if (reportedCountMatches.length !== 1) {
    throw new Error("Smoke install CLI output must report exactly one discovered-skill count.");
  }
  const reportedCount = Number.parseInt(reportedCountMatches[0][1], 10);
  if (reportedCount !== names.length) {
    throw new Error(
      `Smoke install CLI reported ${reportedCount} skill(s) but listed ${names.length}.`,
    );
  }
  return names;
}

export function assertExactPublicSkillSet(expectedNames, output) {
  const expected = canonicalSkillNames(expectedNames, "Expected public catalog");
  const actual = parseSkillsListOutput(output);
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const missing = expected.filter((name) => !actualSet.has(name));
  const unexpected = actual.filter((name) => !expectedSet.has(name));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `Smoke install CLI skill set mismatch; missing ${missing.join(", ") || "none"}; unexpected ${unexpected.join(", ") || "none"}.`,
    );
  }
  return actual;
}
