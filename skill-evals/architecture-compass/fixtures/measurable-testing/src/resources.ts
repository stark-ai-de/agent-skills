import fs from "node:fs";
import os from "node:os";
import path from "node:path";
export function assertClean(root: string): void {
  if (fs.existsSync(root) && fs.readdirSync(root).length)
    throw new Error("leak in owned namespace");
}
export function withResource(
  task: (root: string) => void,
  cleanup: (root: string) => void = (root) => fs.rmSync(root, { recursive: true, force: true }),
): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ac-resource-"));
  let taskError: unknown;
  let failed = false;
  try {
    task(root);
  } catch (error) {
    taskError = error;
    failed = true;
  }
  try {
    cleanup(root);
  } catch (cleanupError) {
    if (failed) throw new AggregateError([taskError, cleanupError], "task and cleanup failed");
    throw cleanupError;
  }
  if (failed) throw taskError;
}
