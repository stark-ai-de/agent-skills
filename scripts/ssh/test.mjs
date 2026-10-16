import { spawnSync } from "node:child_process";
const result = spawnSync(
  process.execPath,
  ["--test", "--test-timeout=60000", "scripts/ssh/artifact.test.mjs"],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
