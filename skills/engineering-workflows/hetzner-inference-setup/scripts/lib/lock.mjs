import crypto from "node:crypto";
import fs from "node:fs";
import {
  isRegularFileStat as regularFile,
  pathIdentity as identity,
  samePathIdentity as sameIdentity,
} from "../../assets/templates/protected-file.mjs";
import { assertNoLinkSegments, ensureDirectory, removeFileIfOwned } from "./files.mjs";
import { SetupError, invariant } from "./errors.mjs";
import { stableJson } from "./json.mjs";
import {
  secureDirectoryPermissions,
  securePathPermissions,
  verifyProtectedDirectory,
  verifyRestrictedFilePermissions,
} from "./permissions.mjs";
import { assertCurrentHostStorageBoundaries } from "./state.mjs";

const unlinkSync = fs.unlinkSync.bind(fs);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function failedPublicationSnapshot(target, publication) {
  const retained = fs.fstatSync(publication.handle.fd, { bigint: true });
  const named = fs.lstatSync(target, { bigint: true });
  invariant(
    regularFile(retained) &&
      regularFile(named) &&
      sameIdentity(publication.identity, identity(retained)) &&
      sameIdentity(publication.identity, identity(named)) &&
      retained.size <= 16_384n,
    "lock_ownership_lost",
    "Failed lock publication has no bounded retained cleanup proof",
    { cleanupSafe: false },
  );
  const data = Buffer.alloc(Number(retained.size));
  const bytesRead = fs.readSync(publication.handle.fd, data, 0, data.length, 0);
  const afterRead = fs.fstatSync(publication.handle.fd, { bigint: true });
  const namedAfterRead = fs.lstatSync(target, { bigint: true });
  const contentSha256 = sha256(data);
  invariant(
    bytesRead === data.length &&
      regularFile(afterRead) &&
      regularFile(namedAfterRead) &&
      sameIdentity(publication.identity, identity(afterRead)) &&
      sameIdentity(publication.identity, identity(namedAfterRead)) &&
      retained.size === afterRead.size &&
      retained.mtimeNs === afterRead.mtimeNs &&
      (!publication.writeCompleted ||
        (afterRead.size === publication.size && contentSha256 === publication.sha256)),
    "lock_ownership_lost",
    "Failed lock publication changed while its cleanup snapshot was read",
    { cleanupSafe: false },
  );
  return {
    identity: publication.identity,
    mtimeNs: afterRead.mtimeNs,
    sha256: contentSha256,
    size: afterRead.size,
  };
}

async function discardExclusivePublication(target, publication, options = {}) {
  await options.assertBoundary?.();
  const snapshot = failedPublicationSnapshot(target, publication);
  if (options.beforeRemove) {
    await options.beforeRemove({
      descriptor: publication.handle.fd,
      snapshot,
      target,
    });
  }
  await options.assertBoundary?.();
  const retained = fs.fstatSync(publication.handle.fd, { bigint: true });
  const named = fs.lstatSync(target, { bigint: true });
  const data = Buffer.alloc(Number(snapshot.size));
  const bytesRead = fs.readSync(publication.handle.fd, data, 0, data.length, 0);
  const afterRead = fs.fstatSync(publication.handle.fd, { bigint: true });
  const finalNamed = fs.lstatSync(target, { bigint: true });
  invariant(
    bytesRead === data.length &&
      regularFile(retained) &&
      regularFile(named) &&
      regularFile(afterRead) &&
      regularFile(finalNamed) &&
      sameIdentity(snapshot.identity, identity(retained)) &&
      sameIdentity(snapshot.identity, identity(named)) &&
      sameIdentity(snapshot.identity, identity(afterRead)) &&
      sameIdentity(snapshot.identity, identity(finalNamed)) &&
      snapshot.size === retained.size &&
      snapshot.size === afterRead.size &&
      snapshot.mtimeNs === retained.mtimeNs &&
      snapshot.mtimeNs === afterRead.mtimeNs &&
      sha256(data) === snapshot.sha256,
    "lock_ownership_lost",
    "Failed lock publication changed at its content-bound cleanup boundary",
    { cleanupSafe: false },
  );
  unlinkSync(target);
  const detached = fs.fstatSync(publication.handle.fd, { bigint: true });
  invariant(
    sameIdentity(snapshot.identity, identity(detached)) &&
      (process.platform === "win32" || detached.nlink === 0n),
    "lock_ownership_lost",
    "Failed lock publication cleanup detached a different object",
    { cleanupSafe: false },
  );
  await publication.handle.close();
  publication.handle = null;
}

async function publishExclusiveLock(target, value, host, options = {}) {
  const data = Buffer.from(stableJson(value));
  let handle = null;
  let publication = null;
  try {
    await options.assertBoundary?.();
    await assertNoLinkSegments(target, {
      assertPathBoundary: options.assertBoundary,
    });
    await options.assertBoundary?.();
    handle = await fs.promises.open(
      target,
      fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        fs.constants.O_RDWR |
        (fs.constants.O_NOFOLLOW ?? 0),
      0o600,
    );
    const opened = await handle.stat({ bigint: true });
    invariant(regularFile(opened), "lock_ownership_lost", "Mutation lock is not a regular file", {
      cleanupSafe: false,
    });
    publication = {
      handle,
      identity: identity(opened),
      sha256: sha256(data),
      size: BigInt(data.length),
      writeCompleted: false,
    };
    if (host.platform === "win32") {
      await securePathPermissions(target, host, 0o600);
    } else {
      await handle.chmod(0o600);
    }
    await handle.writeFile(data);
    await handle.sync();
    publication.writeCompleted = true;
    await options.assertBoundary?.();
    await verifyRestrictedFilePermissions(target, host, 0o600);
    await options.afterWrite?.({ target });
    await options.assertBoundary?.();
    const named = await fs.promises.lstat(target, { bigint: true });
    const written = await handle.stat({ bigint: true });
    const confirmed = Buffer.alloc(data.length);
    const { bytesRead } = await handle.read(confirmed, 0, confirmed.length, 0);
    const afterRead = await handle.stat({ bigint: true });
    invariant(
      regularFile(named) &&
        regularFile(written) &&
        regularFile(afterRead) &&
        sameIdentity(publication.identity, identity(named)) &&
        sameIdentity(publication.identity, identity(written)) &&
        sameIdentity(publication.identity, identity(afterRead)) &&
        written.size === BigInt(data.length) &&
        written.size === afterRead.size &&
        written.mtimeNs === afterRead.mtimeNs &&
        bytesRead === confirmed.length &&
        confirmed.equals(data),
      "lock_ownership_lost",
      "Mutation lock changed while its exclusive publication was verified",
      { cleanupSafe: false },
    );
    return publication;
  } catch (error) {
    if (publication?.handle) {
      try {
        await discardExclusivePublication(target, publication, {
          assertBoundary: options.assertBoundary,
          beforeRemove: options.beforeFailedPublicationCleanup,
        });
      } catch (cleanupError) {
        await publication.handle?.close().catch(() => {});
        publication.handle = null;
        throw new SetupError(
          "lock_ownership_lost",
          "Failed lock publication could not be cleaned with its retained identity",
          {
            causeCode: cleanupError?.code ?? error?.code ?? "lock_cleanup_failed",
            cleanupSafe: false,
          },
        );
      }
    } else {
      await handle?.close().catch(() => {});
    }
    throw error;
  }
}

export async function acquireMutationLock(
  paths,
  planId,
  host,
  now = Date.now(),
  dependencies = {},
) {
  const assertBoundary = () => assertCurrentHostStorageBoundaries(paths, host);
  assertBoundary();
  const bootstrap = await ensureDirectory(paths.stateRoot, 0o700, {
    assertPathBoundary: assertBoundary,
    beforeCreatedDirectoryProtection: dependencies.beforeCreatedDirectoryProtection,
  });
  assertBoundary();
  if (!bootstrap.targetCreated) await verifyProtectedDirectory(paths.stateRoot, host);
  const nonce = crypto.randomUUID();
  const value = {
    schemaVersion: 1,
    planId,
    nonce,
    pid: process.pid,
    acquiredAt: new Date(now).toISOString(),
  };
  let publication;
  try {
    assertBoundary();
    publication = await publishExclusiveLock(paths.lock, value, host, {
      assertBoundary,
      afterWrite: dependencies.afterLockWrite,
      beforeFailedPublicationCleanup: dependencies.beforeFailedPublicationCleanup,
    });
  } catch (error) {
    if (error.code === "EEXIST" || error.code === "mutation_locked") {
      throw new SetupError(
        "mutation_locked",
        `Another writer owns the Hetzner setup lock: ${paths.lock}`,
      );
    }
    throw error;
  }
  try {
    assertBoundary();
    if (bootstrap.targetCreated) await secureDirectoryPermissions(paths.stateRoot, host);
    assertBoundary();
    await verifyProtectedDirectory(paths.stateRoot, host);
  } catch (error) {
    try {
      await discardExclusivePublication(paths.lock, publication, { assertBoundary });
    } catch (cleanupError) {
      await publication.handle?.close().catch(() => {});
      publication.handle = null;
      throw new SetupError(
        "lock_ownership_lost",
        "State-root bootstrap failed and its exclusive lock could not be cleaned",
        {
          causeCode: cleanupError?.code ?? error?.code ?? "lock_cleanup_failed",
          cleanupSafe: false,
        },
      );
    }
    throw error;
  }

  let handle = publication.handle;
  try {
    invariant(handle, "lock_ownership_lost", "Mutation lock proof was not retained", {
      cleanupSafe: false,
    });
  } catch (error) {
    throw new SetupError("lock_ownership_lost", "Mutation lock could not be retained", {
      causeCode: error?.code ?? "lock_unreadable",
      cleanupSafe: false,
    });
  }
  let released = false;

  async function assertOwned() {
    try {
      assertBoundary();
      invariant(handle && !released, "lock_ownership_lost", "Mutation lock proof is closed", {
        cleanupSafe: false,
      });
      const named = await fs.promises.lstat(paths.lock, { bigint: true });
      const before = await handle.stat({ bigint: true });
      invariant(
        named.isFile() &&
          !named.isSymbolicLink() &&
          before.isFile() &&
          sameIdentity(publication.identity, identity(named)) &&
          sameIdentity(publication.identity, identity(before)) &&
          before.size <= 16_384n,
        "lock_ownership_lost",
        "Mutation lock ownership changed",
        { cleanupSafe: false },
      );
      const buffer = Buffer.alloc(Number(before.size));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      const after = await handle.stat({ bigint: true });
      const namedAfter = await fs.promises.lstat(paths.lock, { bigint: true }).catch(() => null);
      invariant(
        bytesRead === buffer.length &&
          namedAfter?.isFile() &&
          sameIdentity(publication.identity, identity(after)) &&
          sameIdentity(publication.identity, identity(namedAfter)) &&
          before.size === after.size &&
          before.mtimeNs === after.mtimeNs &&
          sha256(buffer) === publication.sha256,
        "lock_ownership_lost",
        "Mutation lock changed while its proof was read",
        { cleanupSafe: false },
      );
      let current;
      try {
        current = JSON.parse(buffer.toString("utf8"));
      } catch {
        throw new SetupError("lock_ownership_lost", "Mutation lock document changed", {
          cleanupSafe: false,
        });
      }
      invariant(
        current.nonce === nonce && current.planId === planId,
        "lock_ownership_lost",
        "Mutation lock ownership changed",
        { cleanupSafe: false },
      );
    } catch (error) {
      if (error instanceof SetupError && error.code === "lock_ownership_lost") throw error;
      throw new SetupError("lock_ownership_lost", "Mutation lock disappeared", {
        causeCode: error?.code ?? "lock_unreadable",
        cleanupSafe: false,
      });
    }
  }

  try {
    await assertOwned();
  } catch (error) {
    await handle.close().catch(() => {});
    handle = null;
    throw error;
  }

  return {
    nonce,
    assertOwned,
    async release(options = {}) {
      try {
        await assertOwned();
        const retainedLockStat = await handle.stat({ bigint: true });
        await options.afterOwnershipAssertion?.();
        assertBoundary();
        const removed = await removeFileIfOwned(paths.lock, publication.sha256, {
          beforeClaim: async () => await assertOwned(),
          beforeRemove: options.beforeRemove ?? null,
          changedCode: "lock_ownership_lost",
          initialStat: retainedLockStat,
          label: "Mutation lock",
        });
        const removedLockStat = await handle.stat({ bigint: true });
        invariant(
          sameIdentity(publication.identity, identity(removedLockStat)) &&
            (process.platform === "win32" || removedLockStat.nlink === 0n),
          "lock_ownership_lost",
          "Removed lock does not match the detached retained proof",
          { cleanupSafe: false },
        );
        await handle.close();
        handle = null;
        invariant(removed, "lock_ownership_lost", "Mutation lock disappeared before release", {
          cleanupSafe: false,
        });
        released = true;
      } catch (error) {
        const quarantinePath =
          typeof error?.details?.quarantinePath === "string" ? error.details.quarantinePath : null;
        throw new SetupError(
          "lock_ownership_lost",
          "Mutation lock could not be released with its retained proof",
          {
            cleanupSafe: false,
            ...(quarantinePath ? { claimedPathPreserved: true, quarantinePath } : {}),
          },
        );
      } finally {
        await handle?.close().catch(() => {});
        handle = null;
      }
    },
  };
}
