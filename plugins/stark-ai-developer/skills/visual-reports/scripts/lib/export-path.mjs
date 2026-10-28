// SPDX-License-Identifier: Apache-2.0
import { lstat, mkdir, realpath } from "node:fs/promises";
import path from "node:path";

/** Resolve a bundle output without traversing symlinked directories or files. */
export async function resolveExportTarget(destination, relativePath, { create = false } = {}) {
  if (
    typeof relativePath !== "string" ||
    path.isAbsolute(relativePath) ||
    relativePath.split(/[\\/]/).some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error("Invalid bundle output path");
  }
  const root = await realpath(destination);
  const parts = relativePath.split(/[\\/]/);
  let parent = root;
  for (const part of parts.slice(0, -1)) {
    const next = path.join(parent, part);
    try {
      const info = await lstat(next);
      if (info.isSymbolicLink() || !info.isDirectory())
        throw new Error(`Unsafe bundle directory: ${part}`);
    } catch (error) {
      if (error.code !== "ENOENT" || !create) throw error;
      await mkdir(next);
      const info = await lstat(next);
      if (info.isSymbolicLink() || !info.isDirectory())
        throw new Error(`Unsafe bundle directory: ${part}`);
    }
    parent = next;
  }
  const target = path.join(parent, parts.at(-1));
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error("Bundle path escapes destination");
  try {
    const info = await lstat(target);
    if (info.isSymbolicLink() || !info.isFile())
      throw new Error(`Not a regular bundle output: ${relativePath}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return target;
}
