#!/usr/bin/env node
// Compatibility path only; Greppy owns scheduling and the knowledge owner owns writes.
import { delimiter, resolve } from "node:path";

const command = "greppy";
const candidates = command.includes("/")
  ? [command]
  : (process.env.PATH ?? "/usr/bin:/bin")
      .split(delimiter)
      .map((directory) => resolve(directory, command));
for (const candidate of candidates) {
  try {
    // Keep the maintenance timeout attached to the worker process.
    process.execve(candidate, [command, "records", ...process.argv.slice(2)], process.env);
  } catch (error) {
    if (!["ENOENT", "ENOTDIR", "EACCES"].includes(error.code)) break;
  }
}
process.stderr.write("Install the reviewed greppy-workspace runtime through the package owner.\n");
process.exit(1);
