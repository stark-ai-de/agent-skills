import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const manifestName = "backup-manifest.json";
const forceNoFollowFallback =
  process.env.NODE_ENV === "test" &&
  process.env.AGENT_MEMORY_CURATOR_TEST_FORCE_NO_NOFOLLOW === "1";
const noFollowFlag = forceNoFollowFallback ? undefined : fs.constants.O_NOFOLLOW;
const nonBlockFlag = fs.constants.O_NONBLOCK;
const directoryFlag = fs.constants.O_DIRECTORY;
const testCheckpointName = process.env.AGENT_MEMORY_CURATOR_TEST_CHECKPOINT;
let testCheckpointOccurrences = 0;

function usage() {
  fs.writeSync(
    1,
    `Usage: backup-cursor-context.mjs [--repo PATH] [--memory-bank PATH] [--backup-root PATH --backup-root-alias NAME] [--include PATH ...]

Create a no-clobber backup of Cursor context files.

Options:
  --repo PATH         Use PATH instead of the current working directory.
  --memory-bank PATH  Discover this readable regular file or directory in legacy mode.
                      May be passed more than once.
  --backup-root PATH  Store backups below this directory instead of the deterministic
                      per-repository user state directory. The root must be outside
                      the target and every other Git worktree.
  --backup-root-alias NAME
                      Required with --backup-root. Use a stable, non-sensitive name
                      for portable recovery records; path separators are rejected.
  --include PATH      Back up one exact regular file. May be passed more than once.
                      Globs, directories, symlinks, and symlinked parents are rejected.
  -h, --help          Show this help.

One or more --include values select exact mode: only the deduplicated explicit
files are copied. With no --include, legacy mode discovers the established Cursor
context surfaces and any --memory-bank inputs. Explicit discovery roots must exist
and be readable. Legacy discovery rejects symlinks, symlinked parents, and directory
traversal errors before backup-root creation. By default, backups use a deterministic
per-repository root below XDG_STATE_HOME (or the user's portable local-state
directory). The script rejects any default or explicit backup root inside a Git
worktree before copying. It atomically creates
.cursor-context.backup.<timestamp>.<suffix>, never overwrites a file, and writes
${manifestName} with size and SHA-256 evidence. It does not edit or delete context
files.\n`,
  );
}

function fail(message, code = 2) {
  fs.writeSync(2, `Error: ${message}\n`);
  process.exit(code);
}

function output(message) {
  fs.writeSync(1, `${message}\n`);
}

function parseArgs() {
  let repo = process.cwd();
  let backupRoot = null;
  let backupRootAlias = null;
  const memoryBanks = [];
  const includePaths = [];
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      usage();
      process.exit(0);
    }
    if (arg === "--repo") {
      const value = args[i + 1];
      if (!value) fail("--repo requires a path.");
      repo = value;
      i += 1;
      continue;
    }
    if (arg === "--memory-bank") {
      const value = args[i + 1];
      if (!value) fail("--memory-bank requires a path.");
      memoryBanks.push(path.resolve(value));
      i += 1;
      continue;
    }
    if (arg === "--backup-root") {
      const value = args[i + 1];
      if (!value) fail("--backup-root requires a path.");
      backupRoot = value;
      i += 1;
      continue;
    }
    if (arg === "--backup-root-alias") {
      const value = args[i + 1];
      if (!value) fail("--backup-root-alias requires a name.");
      backupRootAlias = value;
      i += 1;
      continue;
    }
    if (arg === "--include") {
      const value = args[i + 1];
      if (!value) fail("--include requires a path.");
      includePaths.push(path.resolve(value));
      i += 1;
      continue;
    }
    fail(`unknown argument: ${arg}`);
  }

  if (backupRoot && !backupRootAlias) {
    fail("--backup-root requires --backup-root-alias for portable recovery.");
  }
  if (!backupRoot && backupRootAlias) {
    fail("--backup-root-alias requires --backup-root.");
  }
  if (backupRootAlias && !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(backupRootAlias)) {
    fail("--backup-root-alias must be a portable name without path separators.");
  }

  return {
    backupRoot: backupRoot ? path.resolve(backupRoot) : null,
    backupRootAlias,
    includePaths,
    memoryBanks,
    repo: path.resolve(repo),
  };
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function timestamp() {
  const now = new Date();
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

function stateHome() {
  const configured = process.env.XDG_STATE_HOME;
  if (!configured) return path.join(os.homedir(), ".local", "state");
  if (!path.isAbsolute(configured)) fail("XDG_STATE_HOME must be an absolute path.", 1);
  return path.resolve(configured);
}

function identityHash(value) {
  return crypto.createHash("sha256").update(path.resolve(value)).digest("hex").slice(0, 20);
}

function defaultBackupRoot(repo) {
  return path.join(stateHome(), "agent-memory-curator-backups", "cursor", identityHash(repo));
}

function statIdentity(stat) {
  return `${stat.dev}:${stat.ino}:${stat.mode & BigInt(fs.constants.S_IFMT)}`;
}

function statVersion(stat) {
  return `${statIdentity(stat)}:${stat.size}:${stat.mtimeNs}:${stat.ctimeNs}`;
}

function sameIdentity(left, right) {
  return statIdentity(left) === statIdentity(right);
}

function capturePathSnapshot(value, label) {
  const resolved = path.resolve(value);
  const filesystemRoot = path.parse(resolved).root;
  const components = path.relative(filesystemRoot, resolved).split(path.sep).filter(Boolean);
  const snapshots = [];
  let current = filesystemRoot;

  for (const component of [null, ...components]) {
    if (component !== null) current = path.join(current, component);
    let stat;
    try {
      stat = fs.lstatSync(current, { bigint: true });
    } catch (error) {
      throw new Error(`${label} is not accessible: ${current}: ${error.message}`);
    }
    if (stat.isSymbolicLink()) throw new Error(`${label} found symlink component: ${current}`);
    snapshots.push({ identity: statIdentity(stat), path: current });
  }

  return snapshots;
}

function assertPathSnapshot(value, expected, label) {
  const current = capturePathSnapshot(value, label);
  if (
    current.length !== expected.length ||
    current.some(
      (entry, index) =>
        entry.path !== expected[index]?.path || entry.identity !== expected[index]?.identity,
    )
  ) {
    throw new Error(`${label} path identity changed during backup: ${path.resolve(value)}`);
  }
}

function secureOpenFlags(base, label, { directory = false, nonBlocking = false } = {}) {
  let flags = base;
  if (Number.isInteger(noFollowFlag)) flags |= noFollowFlag;
  if (nonBlocking) {
    if (!Number.isInteger(nonBlockFlag)) {
      throw new Error(`${label} cannot be opened safely because O_NONBLOCK is unavailable`);
    }
    flags |= nonBlockFlag;
  }
  if (directory && Number.isInteger(directoryFlag)) flags |= directoryFlag;
  return flags;
}

function openStableRegularFile(value, label) {
  const resolved = path.resolve(value);
  const before = capturePathSnapshot(resolved, label);
  let descriptor;
  try {
    descriptor = fs.openSync(
      resolved,
      secureOpenFlags(fs.constants.O_RDONLY, label, { nonBlocking: true }),
    );
    const descriptorStat = fs.fstatSync(descriptor, { bigint: true });
    const after = capturePathSnapshot(resolved, label);
    const leafStat = fs.lstatSync(resolved, { bigint: true });
    if (
      !descriptorStat.isFile() ||
      !sameIdentity(descriptorStat, leafStat) ||
      before.length !== after.length ||
      before.some(
        (entry, index) =>
          entry.path !== after[index]?.path || entry.identity !== after[index]?.identity,
      )
    ) {
      throw new Error(`${label} changed while it was opened: ${resolved}`);
    }
    return { descriptor, descriptorStat, pathSnapshot: after, source: resolved };
  } catch (error) {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    throw error;
  }
}

function readStableDescriptor(opened, label) {
  const before = fs.fstatSync(opened.descriptor, { bigint: true });
  const chunks = [];
  const buffer = Buffer.allocUnsafe(64 * 1024);
  let position = 0;
  while (true) {
    const bytesRead = fs.readSync(opened.descriptor, buffer, 0, buffer.length, position);
    if (bytesRead === 0) break;
    chunks.push(Buffer.from(buffer.subarray(0, bytesRead)));
    position += bytesRead;
  }
  const after = fs.fstatSync(opened.descriptor, { bigint: true });
  if (statVersion(before) !== statVersion(after)) {
    throw new Error(`${label} changed while it was read: ${opened.source}`);
  }
  return Buffer.concat(chunks);
}

function readStablePath(value, label) {
  const opened = openStableRegularFile(value, label);
  try {
    const content = readStableDescriptor(opened, label);
    assertPathSnapshot(opened.source, opened.pathSnapshot, label);
    return content;
  } finally {
    fs.closeSync(opened.descriptor);
  }
}

function testCheckpoint(name) {
  if (testCheckpointName !== name) return;
  if (process.env.NODE_ENV !== "test") {
    throw new Error("test checkpoints require NODE_ENV=test");
  }
  testCheckpointOccurrences += 1;
  const requestedOccurrence = Number.parseInt(
    process.env.AGENT_MEMORY_CURATOR_TEST_CHECKPOINT_OCCURRENCE ?? "1",
    10,
  );
  if (!Number.isSafeInteger(requestedOccurrence) || requestedOccurrence < 1) {
    throw new Error("test checkpoint occurrence must be a positive integer");
  }
  if (testCheckpointOccurrences !== requestedOccurrence) return;
  fs.writeSync(2, `TEST_CHECKPOINT:${name}\n`);
  const resume = Buffer.alloc(1);
  if (fs.readSync(0, resume, 0, 1, null) !== 1 || resume[0] !== 0x63) {
    throw new Error(`test checkpoint did not receive continue byte: ${name}`);
  }
}

function inspectPath(value, label, { allowMissing = false } = {}) {
  const resolved = path.resolve(value);
  const filesystemRoot = path.parse(resolved).root;
  const components = path.relative(filesystemRoot, resolved).split(path.sep).filter(Boolean);
  let current = filesystemRoot;
  let stat = fs.lstatSync(filesystemRoot);

  for (const component of components) {
    current = path.join(current, component);
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (allowMissing && error.code === "ENOENT") return null;
      throw new Error(`${label} is not accessible: ${current}: ${error.message}`);
    }
    if (stat.isSymbolicLink()) throw new Error(`${label} found symlink component: ${current}`);
  }

  return stat;
}

function requireReadableDirectory(value, label) {
  try {
    const stat = inspectPath(value, label);
    if (!stat.isDirectory()) throw new Error(`${label} must be an existing directory: ${value}`);
    fs.accessSync(value, fs.constants.R_OK | fs.constants.X_OK);
    return stat;
  } catch (error) {
    fail(error.message, 1);
  }
}

function requireReadableRegularFile(value, label) {
  try {
    const opened = openStableRegularFile(value, label);
    fs.closeSync(opened.descriptor);
    return opened.descriptorStat;
  } catch (error) {
    try {
      const stat = inspectPath(value, label);
      if (!stat.isFile()) {
        throw new Error(`${label} must name an existing regular, non-symlink file: ${value}`);
      }
    } catch (typeError) {
      fail(typeError.message, 1);
    }
    fail(error.message, 1);
  }
}

function requireReadableFileOrDirectory(value, label) {
  try {
    const stat = inspectPath(value, label);
    if (!stat.isFile() && !stat.isDirectory()) {
      throw new Error(`${label} must name an existing regular file or directory: ${value}`);
    }
    fs.accessSync(
      value,
      stat.isDirectory() ? fs.constants.R_OK | fs.constants.X_OK : fs.constants.R_OK,
    );
    if (stat.isFile()) {
      const opened = openStableRegularFile(value, label);
      fs.closeSync(opened.descriptor);
    }
    return stat;
  } catch (error) {
    fail(error.message, 1);
  }
}

function isLegacyRegularFile(value) {
  try {
    const stat = inspectPath(value, "legacy discovery", { allowMissing: true });
    if (!stat) return false;
    if (!stat.isFile()) return false;
    const opened = openStableRegularFile(value, "legacy discovery");
    fs.closeSync(opened.descriptor);
    return true;
  } catch (error) {
    fail(error.message, 1);
  }
}

const ignoredDirectories = new Set([
  ".git",
  ".hg",
  ".svn",
  ".next",
  ".turbo",
  "dist",
  "build",
  "coverage",
  "node_modules",
]);

function walk(directory, predicate = () => true) {
  const files = [];

  if (!directory) return files;

  let rootStat;
  try {
    rootStat = inspectPath(directory, "legacy discovery", { allowMissing: true });
  } catch (error) {
    fail(error.message, 1);
  }
  if (!rootStat) return files;
  if (!rootStat.isDirectory()) {
    fail(`legacy discovery root must be a directory: ${directory}`, 1);
  }

  function visit(current) {
    requireReadableDirectory(current, "legacy discovery directory");
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (error) {
      fail(`legacy discovery could not read directory: ${current}: ${error.message}`, 1);
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      const ignored =
        ignoredDirectories.has(entry.name) || entry.name.startsWith(".cursor-context.backup.");
      if (entry.isSymbolicLink()) {
        if (!ignored) fail(`legacy discovery found symlink: ${fullPath}`, 1);
        continue;
      }
      if (entry.isDirectory()) {
        if (!ignored) visit(fullPath);
      } else if (entry.isFile() && predicate(fullPath)) {
        files.push(path.resolve(fullPath));
      }
    }
  }

  visit(directory);
  return files.sort();
}

function collectProjectFiles(repo) {
  return [
    ...walk(path.join(repo, ".cursor", "rules")),
    path.join(repo, ".cursorrules"),
    ...walk(repo, (file) => path.basename(file) === "AGENTS.md"),
  ];
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`))
  );
}

function findGitWorktreeRoot(start) {
  let current = path.resolve(start);
  while (true) {
    try {
      const markerPath = path.join(current, ".git");
      const marker = fs.lstatSync(markerPath);
      const head = marker.isDirectory() ? fs.lstatSync(path.join(markerPath, "HEAD")) : null;
      if (
        marker.isSymbolicLink() ||
        (head && (head.isFile() || head.isSymbolicLink())) ||
        (marker.isFile() && /^gitdir:\s*\S+/m.test(readStablePath(markerPath, "Git marker")))
      ) {
        return current;
      }
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ENOTDIR") {
        fail(`could not inspect Git worktree boundary at ${current}: ${error.message}`, 1);
      }
    }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function enterDirectory(name, { checkpoint = null, create = false, label }) {
  if (!name || name === "." || name === ".." || name.includes(path.sep)) {
    throw new Error(`${label} has an unsafe directory segment: ${name}`);
  }
  const parentBefore = fs.statSync(".", { bigint: true });
  const childPath = path.resolve(name);
  if (create) {
    try {
      fs.mkdirSync(name, { mode: 0o700 });
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
  }
  const before = fs.lstatSync(name, { bigint: true });
  if (before.isSymbolicLink() || !before.isDirectory()) {
    throw new Error(`${label} must contain only real directories: ${name}`);
  }
  process.chdir(name);
  try {
    if (checkpoint) testCheckpoint(checkpoint);
    const current = fs.statSync(".", { bigint: true });
    const after = fs.lstatSync(childPath, { bigint: true });
    const parentAfter = fs.statSync("..", { bigint: true });
    if (
      !current.isDirectory() ||
      !sameIdentity(before, current) ||
      !sameIdentity(after, current) ||
      !sameIdentity(parentBefore, parentAfter)
    ) {
      throw new Error(`${label} directory identity changed while entering: ${name}`);
    }
    return { path: childPath, stat: current };
  } catch (error) {
    let unwindError = null;
    try {
      process.chdir("..");
      const restoredParent = fs.statSync(".", { bigint: true });
      if (!sameIdentity(parentBefore, restoredParent)) {
        unwindError = new Error(`${label} parent identity changed while unwinding: ${name}`);
      }
    } catch (candidate) {
      unwindError = candidate;
    }
    if (unwindError) {
      throw new Error(
        `${error.message}; could not return to the verified ${label} parent: ${unwindError.message}`,
      );
    }
    throw error;
  }
}

function assertStorageCustody(storage, targetRepo) {
  assertPathSnapshot(storage.path, storage.pathSnapshot, "backup root");
  const leafStat = fs.lstatSync(storage.path, { bigint: true });
  if (!sameIdentity(leafStat, storage.stat)) {
    throw new Error(`backup root path no longer names the anchored directory: ${storage.path}`);
  }
  const physicalPath = fs.realpathSync.native(storage.path);
  if (physicalPath !== storage.physicalPath) {
    throw new Error(`backup root physical custody changed: ${storage.path}`);
  }
  const targetBoundary = findGitWorktreeRoot(targetRepo) ?? path.resolve(targetRepo);
  if (isWithin(targetBoundary, physicalPath) || findGitWorktreeRoot(physicalPath)) {
    throw new Error(`backup root moved inside a Git worktree: ${physicalPath}`);
  }
}

function ensurePrivateBackupRoot(value, targetRepo) {
  const resolved = path.resolve(value);
  const targetBoundary = findGitWorktreeRoot(targetRepo) ?? path.resolve(targetRepo);
  const containingWorktree = findGitWorktreeRoot(resolved);
  if (isWithin(targetBoundary, resolved) || containingWorktree) {
    fail(`backup root must be outside Git worktrees; rejected ${resolved}`, 1);
  }

  const filesystemRoot = path.parse(resolved).root;
  const components = path.relative(filesystemRoot, resolved).split(path.sep).filter(Boolean);
  const originalCwd = process.cwd();
  const originalCwdSnapshot = capturePathSnapshot(originalCwd, "original working directory");
  const originalCwdStat = fs.statSync(originalCwd, { bigint: true });
  try {
    const filesystemRootSnapshot = capturePathSnapshot(filesystemRoot, "filesystem root");
    process.chdir(filesystemRoot);
    const filesystemRootStat = fs.statSync(".", { bigint: true });
    if (
      !filesystemRootStat.isDirectory() ||
      filesystemRootSnapshot.at(-1)?.identity !== statIdentity(filesystemRootStat)
    ) {
      throw new Error(`filesystem root identity changed while opening: ${filesystemRoot}`);
    }
    for (const component of components) {
      enterDirectory(component, {
        create: true,
        label: "backup root",
      });
    }
    const storageStat = fs.statSync(".", { bigint: true });
    fs.accessSync(".", fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK);
    const pathSnapshot = capturePathSnapshot(resolved, "backup root");
    const leafStat = fs.lstatSync(resolved, { bigint: true });
    if (!sameIdentity(leafStat, storageStat)) {
      throw new Error(`backup root path identity changed while opening: ${resolved}`);
    }
    const storage = {
      originalCwd,
      originalCwdSnapshot,
      originalCwdStat,
      path: resolved,
      pathSnapshot,
      physicalPath: fs.realpathSync.native("."),
      stat: storageStat,
    };
    assertStorageCustody(storage, targetRepo);
    return storage;
  } catch (error) {
    try {
      process.chdir(originalCwd);
    } catch {
      // The original error remains authoritative.
    }
    fail(`backup root is not writable: ${resolved}: ${error.message}`, 1);
  }
}

function describeMemoryBanks(inputs) {
  return [...new Set(inputs.map((item) => path.resolve(item)))].sort().map((input, index) => {
    const stat = requireReadableFileOrDirectory(input, "--memory-bank");
    if (stat.isFile()) {
      return {
        files: [input],
        index,
        input,
        kind: "file",
        ownerName: path.basename(path.dirname(input)),
      };
    }
    return {
      files: walk(input),
      index,
      input,
      kind: "directory",
      ownerName: path.basename(input),
    };
  });
}

function bankOwns(descriptor, file) {
  return descriptor.kind === "file" ? descriptor.input === file : isWithin(descriptor.input, file);
}

function bankRelativePath(descriptor, file) {
  return descriptor.kind === "file" ? path.basename(file) : path.relative(descriptor.input, file);
}

function sanitizeSegment(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "artifact";
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function toManifestPath(value) {
  return value.split(path.sep).join("/");
}

function buildPlan(files, destinationFor) {
  const sources = [...new Set(files.map((file) => path.resolve(file)))].sort();
  const destinations = new Map();

  return sources.map((source, index) => {
    const destination = path.normalize(destinationFor(source, index));
    if (!destination || path.isAbsolute(destination) || !isWithin(".", destination)) {
      fail(`unsafe backup destination for ${source}: ${destination}`);
    }
    for (const [existing, otherSource] of destinations) {
      if (isWithin(existing, destination) || isWithin(destination, existing)) {
        fail(
          `destination collision: ${source} and ${otherSource} map to ${destination} and ${existing}`,
          1,
        );
      }
    }
    destinations.set(destination, source);

    let opened;
    try {
      opened = openStableRegularFile(source, "source");
      const content = readStableDescriptor(opened, "source");
      assertPathSnapshot(source, opened.pathSnapshot, "source");
      const descriptorStat = fs.fstatSync(opened.descriptor, { bigint: true });
      return {
        content,
        destination: toManifestPath(path.join("files", destination)),
        sha256: sha256(content),
        size: content.length,
        source,
        sourceObservation: {
          identity: statIdentity(descriptorStat),
          pathSnapshot: opened.pathSnapshot,
          version: statVersion(descriptorStat),
        },
      };
    } catch (error) {
      fail(error.message, 1);
    } finally {
      if (opened?.descriptor !== undefined) fs.closeSync(opened.descriptor);
    }
  });
}

function revalidateSource(entry) {
  let opened;
  try {
    opened = openStableRegularFile(entry.source, "source revalidation");
    const content = readStableDescriptor(opened, "source revalidation");
    assertPathSnapshot(entry.source, entry.sourceObservation.pathSnapshot, "source revalidation");
    const descriptorStat = fs.fstatSync(opened.descriptor, { bigint: true });
    if (
      statIdentity(descriptorStat) !== entry.sourceObservation.identity ||
      statVersion(descriptorStat) !== entry.sourceObservation.version ||
      content.length !== entry.size ||
      sha256(content) !== entry.sha256
    ) {
      throw new Error(`source changed after immutable snapshot: ${entry.source}`);
    }
  } finally {
    if (opened?.descriptor !== undefined) fs.closeSync(opened.descriptor);
  }
}

function revalidatePlanSources(plan) {
  for (const entry of plan) revalidateSource(entry);
}

function writeExclusiveFile(name, content, expectedHash, label, relativePath, taskOwnedFiles) {
  if (!name || name === "." || name === ".." || name.includes(path.sep)) {
    throw new Error(`${label} has an unsafe file segment: ${name}`);
  }
  const parentBefore = fs.statSync(".", { bigint: true });
  const destination = path.resolve(name);
  let descriptor;
  try {
    descriptor = fs.openSync(
      name,
      secureOpenFlags(fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_EXCL, label),
      0o600,
    );
    const before = fs.fstatSync(descriptor, { bigint: true });
    const pathBefore = fs.lstatSync(name, { bigint: true });
    if (!before.isFile() || !sameIdentity(before, pathBefore) || before.size !== 0n) {
      throw new Error(`${label} destination identity was not exclusively created: ${name}`);
    }
    const observation = {
      identity: statIdentity(before),
      path: relativePath,
      sha256: sha256(Buffer.alloc(0)),
      size: 0,
    };
    taskOwnedFiles.set(relativePath, observation);
    testCheckpoint(label === "backup payload" ? "before-destination-write" : "");
    let written = 0;
    while (written < content.length) {
      const count = fs.writeSync(descriptor, content, written, content.length - written, written);
      if (count === 0) throw new Error(`${label} destination made no write progress: ${name}`);
      written += count;
    }
    fs.fsyncSync(descriptor);
    const afterWrite = fs.fstatSync(descriptor, { bigint: true });
    const pathAfter = fs.lstatSync(name, { bigint: true });
    const parentAfter = fs.statSync(".", { bigint: true });
    if (
      !sameIdentity(before, afterWrite) ||
      !sameIdentity(afterWrite, pathAfter) ||
      !sameIdentity(parentBefore, parentAfter) ||
      afterWrite.size !== BigInt(content.length)
    ) {
      throw new Error(`${label} destination identity changed while writing: ${name}`);
    }
    const copied = readStableDescriptor(
      { descriptor, source: destination },
      `${label} destination`,
    );
    if (sha256(copied) !== expectedHash) {
      throw new Error(`${label} content failed verification: ${name}`);
    }
    observation.sha256 = expectedHash;
    observation.size = content.length;
    return observation;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function observeDirectory(observations, relativePath, stat) {
  const identity = statIdentity(stat);
  const existing = observations.get(relativePath);
  if (existing && existing !== identity) {
    throw new Error(`backup directory identity changed: ${relativePath}`);
  }
  observations.set(relativePath, identity);
}

function enterTrackedDirectory(name, relativePath, directoryObservations, directoryStack) {
  const entered = enterDirectory(name, {
    checkpoint: "after-backup-destination-chdir",
    create: true,
    label: "backup destination",
  });
  directoryStack.push({ identity: statIdentity(entered.stat), relativePath });
  observeDirectory(directoryObservations, relativePath, entered.stat);
}

function ascendToBackupRoot(directoryStack, backup) {
  while (directoryStack.length > 1) {
    const currentWitness = directoryStack.at(-1);
    const current = fs.statSync(".", { bigint: true });
    if (statIdentity(current) !== currentWitness.identity)
      throw new Error(`backup traversal identity changed: ${currentWitness.relativePath}`);
    process.chdir("..");
    directoryStack.pop();
    const parentWitness = directoryStack.at(-1);
    const parent = fs.statSync(".", { bigint: true });
    if (statIdentity(parent) !== parentWitness.identity)
      throw new Error(`backup parent identity changed: ${parentWitness.relativePath || "."}`);
  }
  if (!sameIdentity(fs.statSync(".", { bigint: true }), backup.stat))
    throw new Error(`could not return to anchored backup root: ${backup.path}`);
}

function scanAnchoredBackupTree() {
  const tree = { directories: new Map(), files: new Map() };
  function visit(relativeDirectory) {
    const parentStat = fs.statSync(".", { bigint: true });
    const entries = fs
      .readdirSync(".", { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const before = fs.lstatSync(entry.name, { bigint: true });
      if (before.isSymbolicLink())
        throw new Error(`backup reconciliation found symlink: ${relativePath}`);
      if (before.isDirectory()) {
        const childPath = path.resolve(entry.name);
        process.chdir(entry.name);
        try {
          const current = fs.statSync(".", { bigint: true });
          const after = fs.lstatSync(childPath, { bigint: true });
          if (!sameIdentity(before, current) || !sameIdentity(after, current))
            throw new Error(`backup directory changed during reconciliation: ${relativePath}`);
          tree.directories.set(relativePath, statIdentity(current));
          visit(relativePath);
        } finally {
          process.chdir("..");
        }
        if (!sameIdentity(parentStat, fs.statSync(".", { bigint: true })))
          throw new Error(`backup parent changed during reconciliation: ${relativeDirectory}`);
        continue;
      }
      if (!before.isFile())
        throw new Error(`backup reconciliation found unsupported entry: ${relativePath}`);
      let opened;
      try {
        opened = openStableRegularFile(path.resolve(entry.name), "backup reconciliation");
        const content = readStableDescriptor(opened, "backup reconciliation");
        const after = fs.fstatSync(opened.descriptor, { bigint: true });
        tree.files.set(relativePath, {
          identity: statIdentity(after),
          sha256: sha256(content),
          size: content.length,
        });
      } finally {
        if (opened?.descriptor !== undefined) fs.closeSync(opened.descriptor);
      }
    }
  }
  visit("");
  return tree;
}

function reconcileBackupTree(directoryObservations, fileObservations) {
  const tree = scanAnchoredBackupTree();
  const expectedDirectories = [...directoryObservations.keys()].sort();
  const actualDirectories = [...tree.directories.keys()].sort();
  const expectedFiles = [...fileObservations.keys()].sort();
  const actualFiles = [...tree.files.keys()].sort();
  if (expectedDirectories.join("\n") !== actualDirectories.join("\n"))
    throw new Error("backup directory set differs from recorded observations");
  if (expectedFiles.join("\n") !== actualFiles.join("\n"))
    throw new Error("backup file set differs from recorded observations");
  for (const [relativePath, identity] of directoryObservations) {
    if (tree.directories.get(relativePath) !== identity)
      throw new Error(`backup directory identity differs: ${relativePath}`);
  }
  for (const [relativePath, expected] of fileObservations) {
    const actual = tree.files.get(relativePath);
    if (
      !actual ||
      actual.identity !== expected.identity ||
      actual.size !== expected.size ||
      actual.sha256 !== expected.sha256
    )
      throw new Error(`backup leaf differs from recorded observation: ${relativePath}`);
  }
}

function scrubTaskOwnedFiles(taskOwnedFiles) {
  const ownedIdentities = new Set(
    [...taskOwnedFiles.values()].map((observation) => observation.identity),
  );
  const sensitiveHashes = new Set(
    [...taskOwnedFiles.values()]
      .filter((observation) => observation.size > 0)
      .map((observation) => observation.sha256),
  );
  function visit() {
    const parentStat = fs.statSync(".", { bigint: true });
    const entries = fs
      .readdirSync(".", { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const before = fs.lstatSync(entry.name, { bigint: true });
      if (before.isSymbolicLink()) continue;
      if (before.isDirectory()) {
        const childPath = path.resolve(entry.name);
        process.chdir(entry.name);
        try {
          const current = fs.statSync(".", { bigint: true });
          if (
            !sameIdentity(before, current) ||
            !sameIdentity(current, fs.lstatSync(childPath, { bigint: true }))
          )
            throw new Error(`scrub directory identity changed: ${childPath}`);
          visit();
        } finally {
          process.chdir("..");
        }
        if (!sameIdentity(parentStat, fs.statSync(".", { bigint: true })))
          throw new Error("scrub parent identity changed");
        continue;
      }
      if (!before.isFile() || !ownedIdentities.has(statIdentity(before))) continue;
      let descriptor;
      try {
        descriptor = fs.openSync(entry.name, secureOpenFlags(fs.constants.O_RDWR, "backup scrub"));
        const opened = fs.fstatSync(descriptor, { bigint: true });
        if (!sameIdentity(before, opened)) throw new Error("scrub leaf identity changed");
        const zeroes = Buffer.alloc(64 * 1024);
        let position = 0;
        while (position < Number(opened.size)) {
          const length = Math.min(zeroes.length, Number(opened.size) - position);
          const written = fs.writeSync(descriptor, zeroes, 0, length, position);
          if (written === 0) throw new Error("scrub made no write progress");
          position += written;
        }
        fs.fsyncSync(descriptor);
        fs.ftruncateSync(descriptor, 0);
        fs.fsyncSync(descriptor);
        const scrubbed = fs.fstatSync(descriptor, { bigint: true });
        if (!sameIdentity(opened, scrubbed) || scrubbed.size !== 0n)
          throw new Error("scrub verification failed");
      } finally {
        if (descriptor !== undefined) fs.closeSync(descriptor);
      }
      const after = fs.lstatSync(entry.name, { bigint: true });
      if (!sameIdentity(before, after)) throw new Error("scrub leaf changed before unlink");
      fs.unlinkSync(entry.name);
    }
  }
  visit();
  const remaining = scanAnchoredBackupTree();
  for (const file of remaining.files.values()) {
    if (ownedIdentities.has(file.identity) || sensitiveHashes.has(file.sha256))
      throw new Error("sensitive task-owned payload remained after scrub");
  }
}

function restoreOriginalWorkingDirectory(storage) {
  process.chdir(storage.originalCwd);
  if (!sameIdentity(fs.statSync(".", { bigint: true }), storage.originalCwdStat)) {
    throw new Error("original working directory identity changed before restoration");
  }
  assertPathSnapshot(
    storage.originalCwd,
    storage.originalCwdSnapshot,
    "original working directory",
  );
}

function createBackup(storage, prefix, storageLocatorRoot, mode, plan, repo) {
  let backupId;
  let backupDir;
  let backup;
  let result;
  let failure;
  const directoryObservations = new Map();
  const taskOwnedFiles = new Map();
  const directoryStack = [];
  try {
    assertStorageCustody(storage, repo);
    testCheckpoint("before-backup-mkdtemp");
    const temporaryPath = fs.mkdtempSync(`./${prefix}.${timestamp()}.`);
    backupId = path.basename(temporaryPath);
    enterDirectory(backupId, { label: "backup directory" });
    fs.chmodSync(".", 0o700);
    backupDir = path.join(storage.path, backupId);
    assertStorageCustody(storage, repo);
    const backupPathSnapshot = capturePathSnapshot(backupDir, "backup directory");
    const backupStat = fs.statSync(".", { bigint: true });
    if (!sameIdentity(backupStat, fs.lstatSync(backupDir, { bigint: true }))) {
      throw new Error(`backup directory path identity changed: ${backupDir}`);
    }
    backup = { id: backupId, path: backupDir, pathSnapshot: backupPathSnapshot, stat: backupStat };
    directoryStack.push({ identity: statIdentity(backupStat), relativePath: "" });

    for (const entry of plan) {
      assertStorageCustody(storage, repo);
      assertPathSnapshot(backupDir, backupPathSnapshot, "backup directory");
      revalidateSource(entry);
      const parts = entry.destination.split("/");
      const name = parts.pop();
      let relativeDirectory = "";
      try {
        for (const component of parts) {
          relativeDirectory = relativeDirectory ? `${relativeDirectory}/${component}` : component;
          enterTrackedDirectory(
            component,
            relativeDirectory,
            directoryObservations,
            directoryStack,
          );
        }
        writeExclusiveFile(
          name,
          entry.content,
          entry.sha256,
          "backup payload",
          entry.destination,
          taskOwnedFiles,
        );
      } finally {
        ascendToBackupRoot(directoryStack, backup);
      }
      revalidateSource(entry);
      assertStorageCustody(storage, repo);
      assertPathSnapshot(backupDir, backupPathSnapshot, "backup directory");
    }

    testCheckpoint("before-pre-manifest-reconciliation");
    reconcileBackupTree(directoryObservations, taskOwnedFiles);
    assertStorageCustody(storage, repo);
    const storageLocator = toManifestPath(path.join(storageLocatorRoot, backupId));
    const manifestFiles = plan.map(({ destination, sha256: hash, size, source }) => ({
      destination,
      sha256: hash,
      size,
      source,
    }));
    const manifest = {
      schemaVersion: 1,
      mode,
      storagePolicy: "outside-git-worktree",
      backupId,
      storageLocator,
      fileCount: plan.length,
      files: manifestFiles,
    };
    const manifestContent = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
    writeExclusiveFile(
      manifestName,
      manifestContent,
      sha256(manifestContent),
      "backup manifest",
      manifestName,
      taskOwnedFiles,
    );
    testCheckpoint("after-manifest-publication");
    reconcileBackupTree(directoryObservations, taskOwnedFiles);
    assertStorageCustody(storage, repo);
    assertPathSnapshot(backupDir, backupPathSnapshot, "backup directory");
    result = { backupDir, backupId, storageLocator };
  } catch (error) {
    failure = error;
    if (backup) {
      try {
        ascendToBackupRoot(directoryStack, backup);
        scrubTaskOwnedFiles(taskOwnedFiles);
      } catch (scrubError) {
        failure = new Error(`${error.message}; anchored scrub failed: ${scrubError.message}`);
      }
    }
  } finally {
    try {
      restoreOriginalWorkingDirectory(storage);
    } catch (restoreError) {
      failure ??= restoreError;
    }
  }

  if (failure) fail(`Could not create complete backup: ${failure.message}`, 1);
  return result;
}

const {
  backupRoot: requestedBackupRoot,
  backupRootAlias,
  includePaths,
  memoryBanks,
  repo,
} = parseArgs();
const exactMode = includePaths.length > 0;

requireReadableDirectory(repo, "repo path");
for (const file of includePaths) {
  requireReadableRegularFile(file, "--include");
}

const bankDescriptors = exactMode ? [] : describeMemoryBanks(memoryBanks);
const files = exactMode
  ? includePaths
  : [
      ...collectProjectFiles(repo),
      ...bankDescriptors.flatMap((descriptor) => descriptor.files),
    ].filter((file) => isLegacyRegularFile(file));
if (files.length === 0) fail("No Cursor context files found to back up.", 1);

const plan = buildPlan(files, (file, index) => {
  if (exactMode) {
    return path.join(
      "exact-includes",
      `${String(index + 1).padStart(3, "0")}-${sanitizeSegment(path.basename(file))}`,
    );
  }
  if (isWithin(repo, file)) return path.relative(repo, file);

  const owner = bankDescriptors
    .filter((descriptor) => bankOwns(descriptor, file))
    .sort((left, right) => right.input.length - left.input.length || left.index - right.index)[0];
  if (!owner) fail(`discovered Cursor context escaped its configured roots: ${file}`, 1);
  return path.join(
    "external-memory-bank",
    `${String(owner.index + 1).padStart(3, "0")}-${sanitizeSegment(owner.ownerName)}`,
    bankRelativePath(owner, file),
  );
});
testCheckpoint("after-source-plan");
try {
  revalidatePlanSources(plan);
} catch (error) {
  fail(`source revalidation failed before backup-root creation: ${error.message}`, 1);
}

const repoIdentityHash = identityHash(repo);
const backupStorage = ensurePrivateBackupRoot(requestedBackupRoot ?? defaultBackupRoot(repo), repo);
const storageLocatorRoot = requestedBackupRoot
  ? path.join("external-root", backupRootAlias)
  : path.join("user-state", "agent-memory-curator-backups", "cursor", repoIdentityHash);
const backup = createBackup(
  backupStorage,
  ".cursor-context.backup",
  storageLocatorRoot,
  exactMode ? "exact" : "legacy",
  plan,
  repo,
);
output(`Backup created at ${backup.backupDir}`);
output(`Backup ID: ${backup.backupId}`);
output(`Backup storage root: ${backupStorage.path}`);
output(`Backup storage locator: ${backup.storageLocator}`);
output("Backup storage policy: outside-git-worktree");
output(`Backup mode: ${exactMode ? "exact" : "legacy"}`);
output(`Files backed up: ${plan.length}`);
output(`Exact includes backed up: ${exactMode ? plan.length : 0}`);
output(`Manifest: ${path.join(backup.backupDir, manifestName)}`);
