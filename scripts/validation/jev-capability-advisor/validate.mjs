import { spawnSync } from "node:child_process";
import process from "node:process";

// Exercise the installed helper contract with synthetic catalogs and injected replies.
// This gate never needs a provider key or sends a model request.
const result = spawnSync(
  "python3",
  [
    "-B",
    "-m",
    "unittest",
    "discover",
    "-s",
    "skill-evals/jev-capability-advisor",
    "-p",
    "test_*.py",
    "-v",
  ],
  { cwd: process.cwd(), stdio: "inherit", env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } },
);
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
