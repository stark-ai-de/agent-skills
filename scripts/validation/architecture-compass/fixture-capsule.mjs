import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const CLONE_FALLBACK_CODES = new Set([
  "EINVAL",
  "ENOSYS",
  "ENOTSUP",
  "EOPNOTSUPP",
  "EPERM",
  "EXDEV",
]);

function assertSafeRelative(relative) {
  if (
    typeof relative !== "string" ||
    relative.length === 0 ||
    path.isAbsolute(relative) ||
    relative.split(/[\\/]/).some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new Error(`Unsafe Architecture Compass capsule path: ${JSON.stringify(relative)}`);
  }
}

function copyFileCloneFirst(source, destination, copyFile) {
  try {
    copyFile(source, destination, fs.constants.COPYFILE_FICLONE);
    return "clone";
  } catch (error) {
    if (!CLONE_FALLBACK_CODES.has(error?.code)) throw error;
    copyFile(source, destination, 0);
    return "copy";
  }
}

function copyTree(source, destination, copyFile, strategies = null) {
  const sourceStat = fs.lstatSync(source);
  if (sourceStat.isSymbolicLink()) {
    throw new Error(`Architecture Compass capsule source cannot contain symlinks: ${source}`);
  }
  if (sourceStat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: false, mode: 0o700 });
    for (const name of fs.readdirSync(source).sort()) {
      copyTree(path.join(source, name), path.join(destination, name), copyFile, strategies);
    }
    return;
  }
  if (!sourceStat.isFile()) {
    throw new Error(`Architecture Compass capsule source must be regular: ${source}`);
  }
  const strategy = copyFileCloneFirst(source, destination, copyFile);
  strategies?.add(strategy);
  fs.chmodSync(destination, 0o600);
}

function walk(root, callback, relative = "") {
  const absolute = relative ? path.join(root, relative) : root;
  const stat = fs.lstatSync(absolute);
  callback({ absolute, relative, stat });
  if (!stat.isDirectory()) return;
  for (const name of fs.readdirSync(absolute).sort()) {
    walk(root, callback, relative ? path.join(relative, name) : name);
  }
}

function seal(root) {
  const entries = [];
  walk(root, (entry) => entries.push(entry));
  for (const { absolute, stat } of entries.reverse()) {
    if (stat.isDirectory()) fs.chmodSync(absolute, 0o555);
    else if (stat.isFile()) fs.chmodSync(absolute, 0o444);
    else throw new Error(`Architecture Compass capsule contains an unsupported entry: ${absolute}`);
  }
}

export function hashBaselineCapsule(capsuleRoot) {
  const root = path.resolve(capsuleRoot);
  const records = [];
  walk(root, ({ absolute, relative, stat }) => {
    if (!relative) return;
    const portableRelative = relative.split(path.sep).join("/");
    if (stat.isDirectory()) {
      records.push(`directory\0${portableRelative}\0${stat.mode & 0o777}\0`);
      return;
    }
    if (!stat.isFile()) {
      throw new Error(
        `Architecture Compass capsule contains an unsupported entry: ${portableRelative}`,
      );
    }
    const contentDigest = crypto
      .createHash("sha256")
      .update(fs.readFileSync(absolute))
      .digest("hex");
    records.push(
      `file\0${portableRelative}\0${stat.mode & 0o777}\0${stat.size}\0${contentDigest}\0`,
    );
  });
  return `sha256:${crypto.createHash("sha256").update(records.join("\n")).digest("hex")}`;
}

export function createSealedBaselineCapsule({
  sourceRoot,
  destinationRoot,
  entries,
  copyFile = fs.copyFileSync,
}) {
  const source = path.resolve(sourceRoot);
  const destination = path.resolve(destinationRoot);
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("Architecture Compass capsule entries must be a non-empty array.");
  }
  if (fs.existsSync(destination)) {
    throw new Error(`Architecture Compass capsule destination already exists: ${destination}`);
  }
  const uniqueEntries = [...new Set(entries)].sort();
  if (uniqueEntries.length !== entries.length) {
    throw new Error("Architecture Compass capsule entries must be unique.");
  }
  for (const relative of uniqueEntries) assertSafeRelative(relative);
  fs.mkdirSync(destination, { recursive: true, mode: 0o700 });
  try {
    for (const relative of uniqueEntries) {
      const sourceEntry = path.join(source, relative);
      if (!fs.existsSync(sourceEntry)) {
        throw new Error(`Architecture Compass capsule source is missing: ${relative}`);
      }
      const destinationEntry = path.join(destination, relative);
      fs.mkdirSync(path.dirname(destinationEntry), { recursive: true, mode: 0o700 });
      copyTree(sourceEntry, destinationEntry, copyFile);
    }
    seal(destination);
    return { root: destination, digest: hashBaselineCapsule(destination) };
  } catch (error) {
    removeSealedBaselineCapsule(destination);
    throw error;
  }
}

export function materializeBaselineCapsule({
  capsuleRoot,
  destinationRoot,
  copyFile = fs.copyFileSync,
}) {
  const source = path.resolve(capsuleRoot);
  const destination = path.resolve(destinationRoot);
  if (fs.existsSync(destination)) {
    throw new Error(
      `Architecture Compass materialization destination already exists: ${destination}`,
    );
  }
  fs.mkdirSync(destination, { recursive: true, mode: 0o700 });
  const strategies = new Set();
  try {
    for (const name of fs.readdirSync(source).sort()) {
      copyTree(path.join(source, name), path.join(destination, name), copyFile, strategies);
    }
    return {
      root: destination,
      strategy: strategies.has("copy") ? "copy" : "clone",
    };
  } catch (error) {
    fs.rmSync(destination, { recursive: true, force: true });
    throw error;
  }
}

export function removeSealedBaselineCapsule(capsuleRoot) {
  const root = path.resolve(capsuleRoot);
  if (!fs.existsSync(root)) return;
  walk(root, ({ absolute, stat }) => {
    if (stat.isDirectory()) fs.chmodSync(absolute, 0o700);
    else if (stat.isFile()) fs.chmodSync(absolute, 0o600);
  });
  fs.rmSync(root, { recursive: true, force: true });
}
