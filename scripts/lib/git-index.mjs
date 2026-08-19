import { execFileSync } from "node:child_process";
import path from "node:path";

const indexCache = new Map();

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

export function loadGitIndex(root) {
  const resolved = path.resolve(root);
  if (indexCache.has(resolved)) return indexCache.get(resolved);

  let stdout;
  try {
    stdout = execFileSync("git", ["ls-files", "-z", "--stage"], {
      cwd: resolved,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    indexCache.set(resolved, null);
    return null;
  }

  const files = new Map();
  for (const record of stdout.split("\0")) {
    if (!record) continue;
    const tab = record.indexOf("\t");
    if (tab === -1) continue;
    const [mode] = record.slice(0, tab).split(" ");
    const relative = record.slice(tab + 1);
    files.set(relative, mode);
  }
  indexCache.set(resolved, files);
  return files;
}

export function gitBlobMode(gitRoot, relativePosix) {
  const index = loadGitIndex(gitRoot);
  if (!index) return null;
  return index.get(toPosix(relativePosix)) ?? null;
}

export function normalizedGitFileMode(gitRoot, relativePosix, fallbackStat) {
  const blobMode = gitBlobMode(gitRoot, relativePosix);
  if (blobMode === "100755") return 0o755;
  if (blobMode === "100644") return 0o644;
  if (blobMode === "120000" || blobMode === "160000") {
    throw new Error(`[REP-001] unsupported git entry type ${blobMode} for ${relativePosix}`);
  }
  if (blobMode) {
    throw new Error(`[REP-001] unsupported git blob mode ${blobMode} for ${relativePosix}`);
  }
  if (!fallbackStat) {
    throw new Error(`[REP-001] ${relativePosix} is not a git-tracked blob`);
  }
  if (fallbackStat.isDirectory()) return 0o755;
  return fallbackStat.mode & 0o111 ? 0o755 : 0o644;
}
