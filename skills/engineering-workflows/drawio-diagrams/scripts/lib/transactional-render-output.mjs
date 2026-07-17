import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  linkSync,
  lstatSync,
  mkdtempSync,
  openSync,
  readSync,
  renameSync,
  rmdirSync,
  unlinkSync,
} from "node:fs";
import { basename, join, parse, resolve, sep } from "node:path";

const IO_BUFFER_BYTES = 64 * 1024;
const MAX_RENDER_ARTIFACT_BYTES = 256 * 1024 * 1024;
const defaultOperations = Object.freeze({
  closeSync,
  existsSync,
  fstatSync,
  linkSync,
  lstatSync,
  mkdtempSync,
  openSync,
  readSync,
  renameSync,
  rmdirSync,
  unlinkSync,
});

export class RenderCommitError extends Error {
  constructor(message, { cause, preserveStagingDirectory = false } = {}) {
    super(message, { cause });
    this.name = "RenderCommitError";
    this.preserveStagingDirectory = preserveStagingDirectory;
  }
}

function stagingComponentPaths(stagingDir) {
  const absolute = resolve(stagingDir);
  const root = parse(absolute).root;
  const components = [root];
  let current = root;
  for (const segment of absolute.slice(root.length).split(sep).filter(Boolean)) {
    current = join(current, segment);
    components.push(current);
  }
  return { absolute, components };
}

function inspectStagingComponent(component, operations) {
  let stat;
  try {
    stat = operations.lstatSync(component);
  } catch (cause) {
    throw new Error(`render staging path component could not be inspected: ${component}`, {
      cause,
    });
  }
  if (stat.isSymbolicLink?.() || !stat.isDirectory?.()) {
    throw new Error(`render staging path component is not a regular directory: ${component}`);
  }
  return { path: component, dev: stat.dev, ino: stat.ino };
}

function directoryIdentity(handle, operations, description) {
  let stat;
  try {
    stat = operations.fstatSync(handle);
  } catch (cause) {
    throw new Error(`${description} descriptor could not be inspected`, { cause });
  }
  if (!stat.isDirectory?.()) {
    throw new Error(`${description} descriptor is not a directory`);
  }
  return { dev: stat.dev, ino: stat.ino };
}

function descriptorPath(handle) {
  return `/proc/self/fd/${handle}`;
}

export function verifyRenderDirectoryBinding(
  binding,
  { operations = defaultOperations, description = "render directory" } = {},
) {
  if (
    !binding ||
    !Number.isInteger(binding.handle) ||
    binding.descriptorPath !== descriptorPath(binding.handle)
  ) {
    throw new Error(`${description} binding is missing or invalid`);
  }
  const current = directoryIdentity(binding.handle, operations, description);
  if (!sameFileIdentity(binding, current)) {
    throw new Error(`${description} descriptor identity changed`);
  }
}

export function openRenderDirectoryBinding(
  directoryPath,
  { operations = defaultOperations, description = "render output parent" } = {},
) {
  if (process.platform !== "linux" || !operations.existsSync("/proc/self/fd")) {
    throw new Error("descriptor-anchored rendering requires Linux /proc/self/fd support");
  }
  const { absolute, components } = stagingComponentPaths(directoryPath);
  const before = components.map((component) => inspectStagingComponent(component, operations));
  const directoryFlags = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;
  let handle;
  try {
    handle = operations.openSync(absolute, directoryFlags);
    const identity = directoryIdentity(handle, operations, description);
    for (let index = 0; index < components.length; index += 1) {
      const current = inspectStagingComponent(components[index], operations);
      if (!sameFileIdentity(before[index], current)) {
        throw new Error(`${description} path changed while its descriptor was opened`);
      }
    }
    if (!sameFileIdentity(before.at(-1), identity)) {
      throw new Error(`${description} descriptor does not match its verified path`);
    }
    const binding = Object.freeze({
      handle,
      descriptorPath: descriptorPath(handle),
      lexicalPath: absolute,
      dev: identity.dev,
      ino: identity.ino,
    });
    verifyRenderDirectoryBinding(binding, { operations, description });
    return binding;
  } catch (error) {
    if (Number.isInteger(handle)) operations.closeSync(handle);
    throw error;
  }
}

export function createRenderStagingDirectory(
  parentBinding,
  prefix = ".drawio-render-",
  { operations = defaultOperations } = {},
) {
  verifyRenderDirectoryBinding(parentBinding, {
    operations,
    description: "render output parent",
  });
  const createdPath = operations.mkdtempSync(join(parentBinding.descriptorPath, prefix));
  const directoryName = basename(createdPath);
  if (!directoryName.startsWith(prefix) || directoryName === prefix) {
    throw new Error("render staging directory has an unexpected name");
  }
  verifyRenderDirectoryBinding(parentBinding, {
    operations,
    description: "render output parent",
  });

  const directoryFlags = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;
  let handle;
  try {
    handle = operations.openSync(join(parentBinding.descriptorPath, directoryName), directoryFlags);
    const identity = directoryIdentity(handle, operations, "render staging directory");
    const binding = Object.freeze({
      handle,
      descriptorPath: descriptorPath(handle),
      lexicalPath: join(parentBinding.lexicalPath, directoryName),
      directoryName,
      dev: identity.dev,
      ino: identity.ino,
    });
    verifyRenderDirectoryBinding(binding, {
      operations,
      description: "render staging directory",
    });
    verifyRenderDirectoryBinding(parentBinding, {
      operations,
      description: "render output parent",
    });
    return binding;
  } catch (error) {
    if (Number.isInteger(handle)) operations.closeSync(handle);
    throw error;
  }
}

export function verifyRenderStagingIdentity(
  stagingDir,
  expectedIdentity,
  { operations = defaultOperations } = {},
) {
  if (resolve(stagingDir) !== expectedIdentity?.descriptorPath) {
    throw new Error("render staging descriptor path does not match its binding");
  }
  verifyRenderDirectoryBinding(expectedIdentity, {
    operations,
    description: "render staging directory",
  });
}

function validateEntryName(entry) {
  if (typeof entry !== "string" || !entry || basename(entry) !== entry || entry === ".") {
    throw new Error(`unsafe render staging entry name: ${entry}`);
  }
}

export function removeRenderStagingDirectory(
  stagingBinding,
  parentBinding,
  entries,
  { operations = defaultOperations } = {},
) {
  if (!Array.isArray(entries)) throw new Error("render staging cleanup entries are required");
  const uniqueEntries = [...new Set(entries)];
  for (const entry of uniqueEntries) validateEntryName(entry);

  const verifyBindings = () => {
    verifyRenderDirectoryBinding(parentBinding, {
      operations,
      description: "render output parent",
    });
    verifyRenderDirectoryBinding(stagingBinding, {
      operations,
      description: "render staging directory",
    });
  };
  verifyBindings();
  for (const entry of uniqueEntries) {
    verifyBindings();
    try {
      operations.unlinkSync(join(stagingBinding.descriptorPath, entry));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    verifyBindings();
  }
  operations.rmdirSync(join(parentBinding.descriptorPath, stagingBinding.directoryName));
  verifyRenderDirectoryBinding(parentBinding, {
    operations,
    description: "render output parent",
  });
  verifyRenderDirectoryBinding(stagingBinding, {
    operations,
    description: "removed render staging directory",
  });
  try {
    operations.lstatSync(join(parentBinding.descriptorPath, stagingBinding.directoryName));
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  throw new Error("render staging directory still exists after descriptor-anchored cleanup");
}

function restoreBackups(state, operations, verifyStaging) {
  let incomplete = false;
  for (const item of [...state].reverse()) {
    if (!item.backedUp) continue;
    if (operations.existsSync(item.destination)) {
      incomplete = true;
      continue;
    }
    try {
      // A hard link makes restoration no-clobber at the commit point. The backup
      // always remains recoverable, including after a successful restoration.
      verifyStaging();
      operations.linkSync(item.backup, item.destination);
      verifyStaging();
    } catch {
      incomplete = true;
    }
  }
  return incomplete;
}

function sameFileIdentity(left, right) {
  return left?.dev === right?.dev && left?.ino === right?.ino;
}

function sameArtifactSnapshot(left, right) {
  return (
    sameFileIdentity(left, right) &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs
  );
}

function sameInstalledArtifact(left, right) {
  // Creating the hard link itself updates ctime, so post-install ownership can
  // only compare the stable inode plus content-bearing size and mtime fields.
  return (
    sameFileIdentity(left, right) && left.size === right.size && left.mtimeMs === right.mtimeMs
  );
}

function sameContentSnapshot(left, right) {
  // rename(2) preserves the file contents and inode, but metadata semantics
  // differ across platforms. The digest is the authoritative content check;
  // size and mtime retain a cheap metadata guard around it.
  return (
    sameFileIdentity(left, right) &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.digest === right.digest
  );
}

function descriptorDigest(handle, size, operations) {
  if (!Number.isSafeInteger(size) || size < 0 || size > MAX_RENDER_ARTIFACT_BYTES) {
    throw new Error("installed render artifact size exceeds the fingerprint limit");
  }
  const digest = createHash("sha256");
  const buffer = Buffer.allocUnsafe(Math.min(IO_BUFFER_BYTES, size));
  let position = 0;
  while (position < size) {
    const requested = Math.min(buffer.length, size - position);
    const bytesRead = operations.readSync(handle, buffer, 0, requested, position);
    if (!Number.isInteger(bytesRead) || bytesRead <= 0 || bytesRead > requested) {
      throw new Error("installed render artifact changed while it was fingerprinted");
    }
    digest.update(buffer.subarray(0, bytesRead));
    position += bytesRead;
  }
  const probe = Buffer.allocUnsafe(1);
  if (operations.readSync(handle, probe, 0, 1, size) !== 0) {
    throw new Error("installed render artifact grew while it was fingerprinted");
  }
  return digest.digest("hex");
}

function fingerprintArtifact(file, operations, description) {
  let pathBefore;
  try {
    pathBefore = operations.lstatSync(file);
  } catch (cause) {
    throw new Error(`${description} could not be inspected: ${file}`, { cause });
  }
  if (pathBefore.isSymbolicLink?.() || !pathBefore.isFile?.()) {
    throw new Error(`${description} is not a regular non-symlink file: ${file}`);
  }

  let handle;
  try {
    const noFollow = process.platform === "win32" ? 0 : constants.O_NOFOLLOW || 0;
    handle = operations.openSync(file, constants.O_RDONLY | noFollow);
  } catch (cause) {
    throw new Error(`${description} could not be opened safely: ${file}`, { cause });
  }
  try {
    const descriptorBefore = operations.fstatSync(handle);
    if (!descriptorBefore.isFile?.() || !sameArtifactSnapshot(pathBefore, descriptorBefore)) {
      throw new Error(`${description} changed while it was opened: ${file}`);
    }

    const digest = descriptorDigest(handle, descriptorBefore.size, operations);
    const descriptorAfter = operations.fstatSync(handle);
    let pathAfter;
    try {
      pathAfter = operations.lstatSync(file);
    } catch (cause) {
      throw new Error(`${description} path disappeared: ${file}`, { cause });
    }
    if (
      !descriptorAfter.isFile?.() ||
      pathAfter.isSymbolicLink?.() ||
      !pathAfter.isFile?.() ||
      !sameArtifactSnapshot(descriptorBefore, descriptorAfter) ||
      !sameArtifactSnapshot(descriptorAfter, pathAfter)
    ) {
      throw new Error(`${description} changed while it was fingerprinted: ${file}`);
    }
    return {
      dev: descriptorAfter.dev,
      ino: descriptorAfter.ino,
      size: descriptorAfter.size,
      mtimeMs: descriptorAfter.mtimeMs,
      ctimeMs: descriptorAfter.ctimeMs,
      digest,
    };
  } finally {
    operations.closeSync(handle);
  }
}

function verifyBackupArtifact(item, operations) {
  if (!item.backupIdentity) {
    throw new Error(`render backup has no content fingerprint: ${item.backup}`);
  }
  const current = fingerprintArtifact(item.backup, operations, "render backup");
  if (!sameContentSnapshot(item.backupIdentity, current)) {
    throw new Error(`render backup changed after the destination was inspected: ${item.backup}`);
  }
}

function verifyStagedArtifact(item, operations) {
  if (!item.expectedIdentity) return;
  let current;
  try {
    current = operations.lstatSync(item.staged);
  } catch (cause) {
    throw new Error(`validated render artifact disappeared before commit: ${item.staged}`, {
      cause,
    });
  }
  if (
    current.isSymbolicLink?.() ||
    !current.isFile?.() ||
    !sameArtifactSnapshot(item.expectedIdentity, current)
  ) {
    throw new Error(`validated render artifact changed before commit: ${item.staged}`);
  }
}

function verifyInstalledArtifact(item, operations) {
  if (!item.expectedIdentity) return;
  if (!/^[0-9a-f]{64}$/.test(item.expectedIdentity.digest || "")) {
    throw new Error(`validated render artifact has no content fingerprint: ${item.staged}`);
  }
  let pathBefore;
  try {
    pathBefore = operations.lstatSync(item.destination);
  } catch (cause) {
    throw new Error(
      `installed render artifact identity could not be verified: ${item.destination}`,
      {
        cause,
      },
    );
  }
  if (
    pathBefore.isSymbolicLink?.() ||
    !pathBefore.isFile?.() ||
    !sameInstalledArtifact(item.expectedIdentity, pathBefore)
  ) {
    throw new Error(`installed render artifact has an unexpected identity: ${item.destination}`);
  }

  let handle;
  try {
    const noFollow = process.platform === "win32" ? 0 : constants.O_NOFOLLOW || 0;
    handle = operations.openSync(item.destination, constants.O_RDONLY | noFollow);
  } catch (cause) {
    throw new Error(`installed render artifact could not be opened safely: ${item.destination}`, {
      cause,
    });
  }
  try {
    const descriptorBefore = operations.fstatSync(handle);
    if (
      !descriptorBefore.isFile?.() ||
      !sameInstalledArtifact(item.expectedIdentity, descriptorBefore) ||
      !sameArtifactSnapshot(pathBefore, descriptorBefore)
    ) {
      throw new Error(`installed render artifact changed while it was opened: ${item.destination}`);
    }

    const digest = descriptorDigest(handle, item.expectedIdentity.size, operations);
    const descriptorAfter = operations.fstatSync(handle);
    let pathAfter;
    try {
      pathAfter = operations.lstatSync(item.destination);
    } catch (cause) {
      throw new Error(`installed render artifact path disappeared: ${item.destination}`, { cause });
    }
    if (
      !descriptorAfter.isFile?.() ||
      pathAfter.isSymbolicLink?.() ||
      !pathAfter.isFile?.() ||
      !sameArtifactSnapshot(descriptorBefore, descriptorAfter) ||
      !sameArtifactSnapshot(descriptorAfter, pathAfter) ||
      !sameInstalledArtifact(item.expectedIdentity, pathAfter)
    ) {
      throw new Error(
        `installed render artifact changed while it was fingerprinted: ${item.destination}`,
      );
    }
    if (digest !== item.expectedIdentity.digest) {
      throw new Error(
        `installed render artifact content fingerprint does not match validated bytes: ${item.destination}`,
      );
    }
  } finally {
    operations.closeSync(handle);
  }
}

export function verifyCommittedRenderArtifacts(artifacts, { operations = defaultOperations } = {}) {
  for (const item of artifacts) verifyInstalledArtifact(item, operations);
}

function retainRacedBackup(item, operations, verifyStaging) {
  item.backupRace = true;
  try {
    // Restore the moved inode without clobbering a path another writer recreated.
    // Keep the backup link in staging either way so cleanup cannot discard it.
    verifyStaging();
    operations.linkSync(item.backup, item.destination);
    verifyStaging();
  } catch {
    // A destination collision is safe: both paths remain available for recovery.
  }
}

export function commitRenderArtifacts(
  artifacts,
  stagingDir,
  { operations = defaultOperations, expectedStagingIdentity } = {},
) {
  const absoluteStagingDir = resolve(stagingDir);
  const verifyStaging = () =>
    verifyRenderStagingIdentity(absoluteStagingDir, expectedStagingIdentity, { operations });
  const state = artifacts.map(({ staged, destination, expectedIdentity }, index) => ({
    staged,
    destination,
    expectedIdentity,
    backup: join(absoluteStagingDir, `backup-${index}`),
    backupIdentity: undefined,
    backedUp: false,
    backupRace: false,
    installed: false,
  }));

  try {
    verifyStaging();
    // Fail before touching public destinations when an exporter has replaced a
    // validated stage with a symlink or different inode.
    for (const item of state) {
      verifyStaging();
      verifyStagedArtifact(item, operations);
      verifyStaging();
    }

    for (const item of state) {
      verifyStaging();
      if (!operations.existsSync(item.destination)) continue;
      item.backupIdentity = fingerprintArtifact(item.destination, operations, "render destination");
      verifyStaging();
      operations.renameSync(item.destination, item.backup);
      item.backedUp = true;
      try {
        verifyStaging();
        verifyBackupArtifact(item, operations);
        verifyStaging();
      } catch (cause) {
        retainRacedBackup(item, operations, verifyStaging);
        throw new Error("render destination content could not be verified after backup", {
          cause,
        });
      }
    }

    for (const item of state) {
      // Re-check at the installation boundary because destination backup work
      // gives a concurrent exporter time to replace a previously verified path.
      verifyStaging();
      verifyStagedArtifact(item, operations);
      verifyStaging();
      // Staging lives beside the outputs, so hard links provide atomic no-clobber
      // installation without a cross-device fallback that could overwrite a race.
      operations.linkSync(item.staged, item.destination);
      item.installed = true;
      verifyStaging();
      // The source path can still be swapped after the final lstat and before
      // link(2) resolves it. Never report success unless the public link proves
      // it references the exact regular file that was validated.
      verifyInstalledArtifact(item, operations);
      verifyStaging();
    }

    for (const item of state) {
      if (!item.backedUp) continue;
      verifyStaging();
      verifyBackupArtifact(item, operations);
      verifyStaging();
    }

    // Backup reads can race writes through an already-published hard link, so
    // they must finish before the definitive all-output pass. No filesystem
    // operation may run in this helper after the final public digest completes.
    verifyStaging();
    for (const item of state) verifyInstalledArtifact(item, operations);
  } catch (cause) {
    let stagingTrusted = true;
    try {
      verifyStaging();
    } catch {
      stagingTrusted = false;
    }
    const hasInstalledOrRacedOutput = state.some((item) => item.installed || item.backupRace);
    let restoreIncomplete = false;
    if (stagingTrusted && !hasInstalledOrRacedOutput) {
      restoreIncomplete = restoreBackups(state, operations, verifyStaging);
    }
    const preserveStagingDirectory =
      !stagingTrusted ||
      hasInstalledOrRacedOutput ||
      restoreIncomplete ||
      state.some((item) => item.backedUp);
    if (preserveStagingDirectory) {
      throw new RenderCommitError(
        "render output commit was interrupted; partial outputs, staged files, and backups were retained for manual recovery",
        { cause, preserveStagingDirectory: true },
      );
    }
    throw new RenderCommitError("validated render outputs could not be committed", { cause });
  }

  const backupPaths = state.filter((item) => item.backedUp).map((item) => item.backup);
  return Object.freeze({
    preserveStagingDirectory: backupPaths.length > 0,
    recoveryDirectory: backupPaths.length > 0 ? absoluteStagingDir : undefined,
    backupPaths: Object.freeze(backupPaths),
  });
}
