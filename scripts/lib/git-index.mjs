import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const indexCache = new Map();

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function fromPosix(relativePath) {
  return path.join(...relativePath.split("/"));
}

function assertSafeGitPath(relative) {
  if (
    typeof relative !== "string" ||
    !relative ||
    relative.includes("\0") ||
    relative.includes("\\") ||
    path.posix.isAbsolute(relative)
  ) {
    throw new Error(`[REP-001] unsafe git path: ${JSON.stringify(relative)}`);
  }
  const normalized = path.posix.normalize(relative);
  if (
    normalized !== relative ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    relative.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new Error(`[REP-001] unsafe git path: ${JSON.stringify(relative)}`);
  }
  return relative;
}

function git(root, args) {
  try {
    return execFileSync("git", args, {
      cwd: path.resolve(root),
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const stderr = typeof error.stderr === "string" ? error.stderr.trim() : "";
    throw new Error(`[REP-001] git ${args.join(" ")} failed: ${stderr || error.message}`);
  }
}

function decodeNulPaths(stdout) {
  return stdout.split("\0").filter(Boolean).map(assertSafeGitPath);
}

function prefixMatches(relative, prefix) {
  if (!prefix || prefix === ".") return true;
  const posixPrefix = toPosix(prefix);
  return relative === posixPrefix || relative.startsWith(`${posixPrefix}/`);
}

function comparePosixPaths(left, right) {
  return Buffer.from(left).compare(Buffer.from(right));
}

export function loadGitIndex(root) {
  const resolved = path.resolve(root);
  if (indexCache.has(resolved)) return indexCache.get(resolved);

  const stdout = git(resolved, ["ls-files", "-z", "--stage"]);
  const files = new Map();
  for (const record of stdout.split("\0")) {
    if (!record) continue;
    const tab = record.indexOf("\t");
    if (tab === -1) continue;
    const [mode] = record.slice(0, tab).split(" ");
    const relative = assertSafeGitPath(record.slice(tab + 1));
    files.set(relative, mode);
  }
  indexCache.set(resolved, files);
  return files;
}

export function listTrackedBlobs(gitRoot, prefix = "") {
  const index = loadGitIndex(gitRoot);
  const posixPrefix = prefix ? toPosix(prefix) : "";
  const blobs = [];
  for (const [relative, mode] of index) {
    if (posixPrefix && !prefixMatches(relative, posixPrefix)) continue;
    if (mode === "120000" || mode === "160000") {
      throw new Error(`[REP-001] unsupported git entry type ${mode} for ${relative}`);
    }
    if (mode !== "100644" && mode !== "100755") {
      throw new Error(`[REP-001] unsupported git blob mode ${mode} for ${relative}`);
    }
    blobs.push({
      path: relative,
      mode: mode === "100755" ? 0o755 : 0o644,
    });
  }
  blobs.sort((left, right) => comparePosixPaths(left.path, right.path));
  return blobs;
}

export function listUntrackedAndIgnored(gitRoot, prefixes) {
  const resolved = path.resolve(gitRoot);
  const pathArgs = prefixes.length > 0 ? ["--", ...prefixes.map((prefix) => toPosix(prefix))] : [];
  const untracked = decodeNulPaths(
    git(resolved, ["ls-files", "-z", "--others", "--exclude-standard", ...pathArgs]),
  );
  const ignored = decodeNulPaths(
    git(resolved, ["ls-files", "-z", "--others", "--ignored", "--exclude-standard", ...pathArgs]),
  );
  return [...new Set([...untracked, ...ignored])].sort(comparePosixPaths);
}

export function assertNoUntrackedReleaseInputs(gitRoot, prefixes) {
  const extras = listUntrackedAndIgnored(gitRoot, prefixes);
  if (extras.length === 0) return;
  throw new Error(
    `[SEC-001] untracked or ignored release inputs are not allowed:\n${extras
      .map((relative) => `- ${relative}`)
      .join("\n")}`,
  );
}

export function gitBlobMode(gitRoot, relativePosix) {
  return loadGitIndex(gitRoot).get(toPosix(relativePosix)) ?? null;
}

export function normalizedGitFileMode(gitRoot, relativePosix) {
  const blobMode = gitBlobMode(gitRoot, relativePosix);
  if (blobMode === "100755") return 0o755;
  if (blobMode === "100644") return 0o644;
  if (blobMode === "120000" || blobMode === "160000") {
    throw new Error(`[REP-001] unsupported git entry type ${blobMode} for ${relativePosix}`);
  }
  if (blobMode) {
    throw new Error(`[REP-001] unsupported git blob mode ${blobMode} for ${relativePosix}`);
  }
  throw new Error(`[REP-001] ${relativePosix} is not a git-tracked blob`);
}

function assertSafeTrackedFile(filePath, relativePath) {
  let stat;
  try {
    stat = fs.lstatSync(filePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`[REP-001] tracked path is missing from the worktree: ${relativePath}`);
    }
    throw error;
  }
  if (stat.isSymbolicLink()) {
    throw new Error(`symlink is not allowed in generated source: ${relativePath}`);
  }
  if (!stat.isFile()) {
    throw new Error(`[REP-001] tracked path is not a regular file: ${relativePath}`);
  }
  return stat;
}

export function listTrackedSourceFiles(gitRoot, sourceRoot, gitPrefix) {
  assertNoUntrackedReleaseInputs(gitRoot, [gitPrefix]);
  const prefix = toPosix(gitPrefix);
  const blobs = listTrackedBlobs(gitRoot, prefix);
  if (blobs.length === 0) {
    throw new Error(`[REP-001] no git-tracked blobs under ${prefix}`);
  }
  return blobs.map((blob) => {
    const relative =
      blob.path === prefix ? path.posix.basename(blob.path) : blob.path.slice(prefix.length + 1);
    if (!relative) {
      throw new Error(`[REP-001] tracked path ${blob.path} is not inside ${prefix}`);
    }
    return {
      relative,
      absolute: path.join(sourceRoot, fromPosix(relative)),
      mode: blob.mode,
      gitPath: blob.path,
    };
  });
}

export function copyTrackedPrefixes({ gitRoot, sourceRoot, targetRoot, prefixes }) {
  assertNoUntrackedReleaseInputs(gitRoot, prefixes);
  const copied = new Set();
  for (const prefix of prefixes) {
    for (const blob of listTrackedBlobs(gitRoot, prefix)) {
      if (copied.has(blob.path)) continue;
      copied.add(blob.path);
      const source = path.join(sourceRoot, fromPosix(blob.path));
      const target = path.join(targetRoot, fromPosix(blob.path));
      assertSafeTrackedFile(source, blob.path);
      fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o755 });
      fs.chmodSync(path.dirname(target), 0o755);
      const bytes = fs.readFileSync(source);
      fs.writeFileSync(target, bytes, { mode: blob.mode });
      fs.chmodSync(target, blob.mode);
    }
  }
}
