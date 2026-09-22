import fs from "node:fs";
import path from "node:path";
import { pathSegments } from "../../assets/templates/protected-file.mjs";
import { invariant } from "./errors.mjs";

export async function assertNoLinkSegments(target, options = {}) {
  for (const segment of pathSegments(target)) {
    try {
      await options.assertPathBoundary?.(segment);
      const stat = await fs.promises.lstat(segment);
      invariant(
        !stat.isSymbolicLink(),
        "redirected_path",
        `Refusing symlink or reparse redirect: ${segment}`,
      );
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

export function assertWithin(target, boundary, label = "managed path") {
  const relative = path.relative(path.resolve(boundary), path.resolve(target));
  invariant(
    relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)),
    "path_escape",
    `${label} escapes its approved boundary`,
    { target, boundary },
  );
}
