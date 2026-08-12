import { spawnSync } from "node:child_process";

function run(command, arguments_) {
  const result = spawnSync(command, arguments_, { cwd: process.cwd(), stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npm", ["run", "validate:skills"]);
run(process.execPath, ["scripts/validate-release-metadata.mjs", ...process.argv.slice(2)]);
