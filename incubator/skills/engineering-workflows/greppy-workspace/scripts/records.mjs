#!/usr/bin/env node
// Compatibility path only; Greppy owns scheduling and the knowledge owner owns writes.
import { spawnSync } from "node:child_process";

const result = spawnSync("greppy", ["records", ...process.argv.slice(2)], { stdio: "inherit" });
if (result.error)
  process.stderr.write(
    "Install the reviewed greppy-workspace runtime through the package owner.\n",
  );
process.exit(result.status ?? 1);
