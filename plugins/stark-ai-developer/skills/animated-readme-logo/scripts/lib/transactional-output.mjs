import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  linkSync,
  lstatSync,
  openSync,
  readFileSync,
  readSync,
  renameSync,
  rmdirSync,
  rmSync,
} from "node:fs";
import { basename, dirname, join, parse, relative, resolve, sep } from "node:path";

const MAX_TRANSACTIONAL_OUTPUT_BYTES = 128 * 1024 * 1024;

export class TransactionalOutputError extends Error {
  constructor(code, message, { category = "io", preserveStageDirectories = false } = {}) {
    super(message);
    this.name = "TransactionalOutputError";
    this.code = code;
    this.category = category;
    this.preserveStageDirectories = preserveStageDirectories;
  }
}

function regularFileStats(stats) {
  if (stats.isSymbolicLink?.() || !stats.isFile()) {
    throw new Error("transactional outputs and backups must remain regular files");
  }
  return stats;
}

function statIdentity(stats) {
  return { dev: stats.dev, ino: stats.ino };
}

function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sameFileState(left, right) {
  return (
    sameIdentity(statIdentity(left), statIdentity(right)) &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs
  );
}

function readDescriptorBounded(descriptor) {
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const remaining = MAX_TRANSACTIONAL_OUTPUT_BYTES + 1 - totalBytes;
    const chunk = Buffer.allocUnsafe(Math.min(64 * 1024, remaining));
    const bytesRead = readSync(descriptor, chunk, 0, chunk.length, null);
    if (bytesRead === 0) return Buffer.concat(chunks, totalBytes);
    totalBytes += bytesRead;
    if (totalBytes > MAX_TRANSACTIONAL_OUTPUT_BYTES) {
      throw new Error("transactional output exceeds the content-snapshot byte limit");
    }
    chunks.push(chunk.subarray(0, bytesRead));
  }
}

function nativeRegularFileSnapshot(file) {
  const pathStats = regularFileStats(lstatSync(file));
  const flags =
    constants.O_RDONLY | (process.platform === "win32" ? 0 : (constants.O_NOFOLLOW ?? 0));
  let descriptor;
  try {
    descriptor = openSync(file, flags);
    const before = regularFileStats(fstatSync(descriptor));
    if (!sameFileState(pathStats, before)) {
      throw new Error("regular file changed while it was being opened");
    }
    const bytes = readDescriptorBounded(descriptor);
    const after = regularFileStats(fstatSync(descriptor));
    const finalPathStats = regularFileStats(lstatSync(file));
    const beforeIdentity = statIdentity(before);
    if (
      !sameFileState(before, after) ||
      !sameFileState(after, finalPathStats) ||
      bytes.length !== after.size
    ) {
      throw new Error("regular file changed while its content was being read");
    }
    return {
      ...beforeIdentity,
      size: after.size,
      mtimeMs: after.mtimeMs,
      ctimeMs: after.ctimeMs,
      digest: digest(bytes),
    };
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function nativeDirectoryChainSnapshot(directory) {
  const absolute = resolve(directory);
  const root = parse(absolute).root;
  const suffix = relative(root, absolute);
  const paths = [root];
  let current = root;
  for (const component of suffix.split(sep).filter(Boolean)) {
    current = join(current, component);
    paths.push(current);
  }
  return paths.map((path) => {
    const stats = lstatSync(path);
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      throw new Error("transactional directory chains must not contain symlinks");
    }
    return { path, dev: stats.dev, ino: stats.ino };
  });
}

const defaultOperations = Object.freeze({
  existsSync,
  linkSync,
  lstatSync,
  readFileSync,
  renameSync,
  rmSync,
  snapshotDirectoryChainSync: nativeDirectoryChainSnapshot,
  snapshotRegularFileSync: nativeRegularFileSnapshot,
});

function regularFileSnapshot(operations, file) {
  if (typeof operations.snapshotRegularFileSync === "function") {
    return operations.snapshotRegularFileSync(file);
  }
  const before = regularFileStats(operations.lstatSync(file));
  const bytes = operations.readFileSync(file);
  const after = regularFileStats(operations.lstatSync(file));
  const beforeIdentity = statIdentity(before);
  if (
    !sameIdentity(beforeIdentity, statIdentity(after)) ||
    (typeof after.size === "number" && bytes.length !== after.size)
  ) {
    throw new Error("regular file changed while its content was being read");
  }
  return {
    ...beforeIdentity,
    size: bytes.length,
    digest: digest(bytes),
  };
}

function sameSnapshot(left, right) {
  return sameIdentity(left, right) && left.size === right.size && left.digest === right.digest;
}

function directoryChainSnapshot(operations, directory) {
  return typeof operations.snapshotDirectoryChainSync === "function"
    ? operations.snapshotDirectoryChainSync(directory)
    : null;
}

function sameDirectoryChain(left, right) {
  if (left === null || right === null) return left === right;
  return (
    left.length === right.length &&
    left.every(
      (entry, index) =>
        entry.path === right[index].path &&
        entry.dev === right[index].dev &&
        entry.ino === right[index].ino,
    )
  );
}

function assertDirectoryBindings(operations, state) {
  for (const item of state) {
    const currentStaged = directoryChainSnapshot(operations, dirname(item.staged));
    const currentDestination = directoryChainSnapshot(operations, dirname(item.destination));
    if (
      !sameDirectoryChain(currentStaged, item.stagedDirectoryChain) ||
      !sameDirectoryChain(currentDestination, item.destinationDirectoryChain)
    ) {
      throw new Error("transactional output directory chain changed during commit");
    }
  }
}

export function captureOutputSnapshot(file) {
  return nativeRegularFileSnapshot(file);
}

export function removeAnchoredStageDirectory(
  stage,
  fileNames,
  { operations = { rmSync, rmdirSync } } = {},
) {
  for (const fileName of fileNames) {
    operations.rmSync(join(stage.anchorPath, fileName), { force: true });
  }
  // rmdir removes only the directory entry itself. If a peer replaced that entry with a
  // symlink, it fails without traversing or recursively deleting the foreign target.
  operations.rmdirSync(stage.entryPath);
}

function recoveryRequired(message) {
  return new TransactionalOutputError("OUTPUT_ROLLBACK_INCOMPLETE", message, {
    preserveStageDirectories: true,
  });
}

export function replaceOutputsAtomically(
  replacements,
  { operations = defaultOperations, replace = true } = {},
) {
  const state = replacements.map(
    ({ staged, destination, stagedMutationPath, destinationMutationPath, validatedSnapshot }) => {
      const stagedPath = stagedMutationPath ?? staged;
      const destinationPath = destinationMutationPath ?? destination;
      return {
        staged,
        stagedPath,
        destination,
        destinationPath,
        backup: join(dirname(staged), `backup-${basename(destination)}`),
        backupPath: join(dirname(stagedPath), `backup-${basename(destination)}`),
        backedUp: false,
        backupSnapshot: null,
        installed: false,
        installedByLink: false,
        stagedSnapshot: validatedSnapshot ?? null,
        stagedDirectoryChain: null,
        destinationDirectoryChain: null,
      };
    },
  );

  let collision = false;
  try {
    for (const item of state) {
      item.stagedDirectoryChain = directoryChainSnapshot(operations, dirname(item.staged));
      item.destinationDirectoryChain = directoryChainSnapshot(
        operations,
        dirname(item.destination),
      );
    }
    assertDirectoryBindings(operations, state);

    // Capture every validated source before mutating any destination. Callers may pass
    // the snapshot taken immediately after validation; this closes the validation-to-
    // commit gap as well as protecting the remainder of the transaction.
    for (const item of state) {
      const current = regularFileSnapshot(operations, item.stagedPath);
      if (item.stagedSnapshot && !sameSnapshot(current, item.stagedSnapshot)) {
        throw new Error("staged output changed after validation");
      }
      item.stagedSnapshot = current;
    }

    if (replace) {
      for (const item of state) {
        if (operations.existsSync(item.destinationPath)) {
          assertDirectoryBindings(operations, state);
          const destinationSnapshot = regularFileSnapshot(operations, item.destinationPath);
          operations.renameSync(item.destinationPath, item.backupPath);
          item.backedUp = true;
          assertDirectoryBindings(operations, state);
          item.backupSnapshot = regularFileSnapshot(operations, item.backupPath);
          if (!sameSnapshot(destinationSnapshot, item.backupSnapshot)) {
            throw new Error("destination content changed while it was being moved to recovery");
          }
        }
      }
    }

    for (const item of state) {
      try {
        assertDirectoryBindings(operations, state);
        const stagedSnapshot = regularFileSnapshot(operations, item.stagedPath);
        if (!sameSnapshot(stagedSnapshot, item.stagedSnapshot)) {
          throw new Error("staged output changed before installation");
        }
        operations.linkSync(item.stagedPath, item.destinationPath);
        item.installed = true;
        item.installedByLink = true;
        assertDirectoryBindings(operations, state);
      } catch (error) {
        collision = error?.code === "EEXIST";
        throw error;
      }
      const installedSnapshot = regularFileSnapshot(operations, item.destinationPath);
      if (!sameSnapshot(installedSnapshot, item.stagedSnapshot)) {
        throw new Error("installed output does not match its validated content");
      }
    }

    // Recheck the full installed set after the last link. A writer through an earlier
    // public hard link must not turn unvalidated bytes into a successful transaction.
    for (const item of state) {
      const installedSnapshot = regularFileSnapshot(operations, item.destinationPath);
      const stagedSnapshot = regularFileSnapshot(operations, item.stagedPath);
      if (
        !sameSnapshot(installedSnapshot, item.stagedSnapshot) ||
        !sameSnapshot(stagedSnapshot, item.stagedSnapshot)
      ) {
        throw new Error("output content changed while the output set was being installed");
      }
    }
    assertDirectoryBindings(operations, state);
  } catch {
    if (replace && state.some((item) => item.backedUp || item.installed)) {
      // A path-based check followed by unlink or rename would introduce another TOCTOU
      // window. Once replacement has mutated any destination, retain the complete recovery
      // state rather than touching a path whose ownership and bytes cannot be proved.
      throw recoveryRequired(
        "output replacement was interrupted; current destinations, staged files, and backups were retained for manual recovery",
      );
    }
    if (!replace && state.some((item) => item.installedByLink)) {
      // Once a public hard link exists, another process may have modified that inode in place.
      // Retaining every link is the only rollback policy that cannot discard concurrent data.
      throw recoveryRequired(
        "output commit was interrupted; partial linked outputs and staged files were retained for manual recovery",
      );
    }
    if (collision) {
      throw new TransactionalOutputError(
        "OUTPUT_EXISTS",
        "one or more declared outputs appeared before commit; no existing output was replaced",
        { category: "validation" },
      );
    }
    throw new TransactionalOutputError(
      "OUTPUT_REPLACEMENT_FAILED",
      "validated outputs could not replace their destinations",
    );
  }

  if (replace && state.some((item) => item.backedUp)) {
    // Replacement recovery is intentionally durable. There is no safe verify-then-unlink
    // sequence for a backup whose inode may still be writable through another process's
    // open descriptor, so successful --replace commits retain both staged links and every
    // prior-output backup for deliberate operator cleanup.
    try {
      assertDirectoryBindings(operations, state);
      for (const item of state) {
        if (item.backedUp) {
          const backupSnapshot = regularFileSnapshot(operations, item.backupPath);
          if (!sameSnapshot(backupSnapshot, item.backupSnapshot)) {
            throw new Error("replacement backup changed before recovery retention");
          }
        }
      }
      assertDirectoryBindings(operations, state);
      // Backup reads can execute arbitrary filesystem work and therefore come first. The
      // final operation before return is one complete public+staged digest pass, so a write
      // to an early public hard link during a later backup read cannot escape validation.
      for (const item of state) {
        const installedSnapshot = regularFileSnapshot(operations, item.destinationPath);
        const stagedSnapshot = regularFileSnapshot(operations, item.stagedPath);
        if (
          !sameSnapshot(installedSnapshot, item.stagedSnapshot) ||
          !sameSnapshot(stagedSnapshot, item.stagedSnapshot)
        ) {
          throw new Error("replacement output changed before recovery retention");
        }
      }
    } catch {
      throw recoveryRequired(
        "outputs were installed, but replacement recovery content changed; all remaining recovery files were retained",
      );
    }
    return { preserveStageDirectories: true, retainedRecovery: true };
  }

  // Preflight the complete recovery set before deleting any link. A changed backup or
  // an in-place write through any public hard link must retain every recovery copy.
  try {
    assertDirectoryBindings(operations, state);
    for (const item of state) {
      if (!item.installedByLink) continue;
      const stagedSnapshot = regularFileSnapshot(operations, item.stagedPath);
      const installedSnapshot = regularFileSnapshot(operations, item.destinationPath);
      if (
        !sameSnapshot(stagedSnapshot, item.stagedSnapshot) ||
        !sameSnapshot(installedSnapshot, item.stagedSnapshot)
      ) {
        throw new Error("installed output content changed before staged-link cleanup");
      }
    }
    for (const item of state) {
      if (!item.backedUp) continue;
      const backupSnapshot = regularFileSnapshot(operations, item.backupPath);
      if (!sameSnapshot(backupSnapshot, item.backupSnapshot)) {
        throw new Error("prior-output backup content changed before cleanup");
      }
    }
  } catch {
    throw recoveryRequired(
      "outputs were installed, but recovery content changed before cleanup; all recovery links were retained",
    );
  }

  // Recheck immediately before each removal as well. Any mismatch or filesystem error
  // retains the paths that remain for deliberate manual recovery.
  for (const item of state) {
    if (!item.installedByLink) continue;
    try {
      assertDirectoryBindings(operations, state);
      const stagedSnapshot = regularFileSnapshot(operations, item.stagedPath);
      const installedSnapshot = regularFileSnapshot(operations, item.destinationPath);
      if (
        !sameSnapshot(stagedSnapshot, item.stagedSnapshot) ||
        !sameSnapshot(installedSnapshot, item.stagedSnapshot)
      ) {
        throw new Error("installed output content changed during staged-link cleanup");
      }
      operations.rmSync(item.stagedPath, { force: true });
      assertDirectoryBindings(operations, state);
    } catch {
      throw recoveryRequired(
        "outputs were installed, but staged files could not be safely removed; remaining recovery files were retained",
      );
    }
  }

  // A mutation through a public hard link during cleanup is still a failed commit, even
  // though the inode identity remains unchanged.
  for (const item of state) {
    try {
      assertDirectoryBindings(operations, state);
      const installedSnapshot = regularFileSnapshot(operations, item.destinationPath);
      if (!sameSnapshot(installedSnapshot, item.stagedSnapshot)) {
        throw new Error("installed output content changed during cleanup");
      }
    } catch {
      throw recoveryRequired(
        "outputs were installed, but their validated bytes changed during cleanup; remaining recovery files were retained",
      );
    }
  }
  return { preserveStageDirectories: false, retainedRecovery: false };
}
