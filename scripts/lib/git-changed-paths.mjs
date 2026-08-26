import { spawnSync } from "node:child_process";
import path from "node:path";

export function listChangedGitPaths({ root, baseRef, headRef = null }) {
  if (typeof baseRef !== "string" || !baseRef) {
    throw new TypeError("baseRef must be a non-empty string");
  }

  const args = ["diff", "--no-renames", "--name-only", "-z", "--diff-filter=ACDMRT", baseRef];
  if (headRef) args.push(headRef);

  const result = spawnSync("git", args, {
    cwd: path.resolve(root),
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) {
    throw new Error(`git ${args.join(" ")} failed: ${result.error.message}`, {
      cause: result.error,
    });
  }
  if (result.status !== 0) {
    throw new Error(
      result.stderr.trim() || `git ${args.join(" ")} failed with status ${result.status}`,
    );
  }

  return result.stdout.split("\0").filter(Boolean);
}
