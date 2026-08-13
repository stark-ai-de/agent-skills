import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const workflowDir = path.join(root, ".github", "workflows");
const binName = process.platform === "win32" ? "github-actionlint.cmd" : "github-actionlint";
const localWrapper = path.join(root, "node_modules", ".bin", binName);

function workflowFiles() {
  if (!fs.existsSync(workflowDir)) return [];

  return fs
    .readdirSync(workflowDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name))
    .map((entry) => path.join(".github", "workflows", entry.name))
    .sort();
}

function run(command, args) {
  return spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
}

const args = process.argv.slice(2);
const lintArgs = args.length > 0 ? args : workflowFiles();
if (lintArgs.length === 0) {
  console.log("No GitHub Actions workflow files found.");
  process.exit(0);
}

const configuredActionlint = process.env.ACTIONLINT;
const candidates = configuredActionlint
  ? [configuredActionlint]
  : ["actionlint", fs.existsSync(localWrapper) ? localWrapper : null, "github-actionlint"].filter(
      Boolean,
    );

for (const command of candidates) {
  const result = run(command, lintArgs);
  if (result.error?.code === "ENOENT") {
    if (configuredActionlint) {
      console.error(`Configured ACTIONLINT executable is unavailable: ${configuredActionlint}`);
      process.exit(1);
    }
    continue;
  }
  if (result.error) {
    console.error(`Failed to run ${command}: ${result.error.message}`);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

console.error(
  "actionlint is unavailable. Install the official actionlint binary or run pnpm install to use the pinned github-actionlint dev dependency.",
);
process.exit(1);
