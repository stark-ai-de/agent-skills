import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { simplificationContractErrors } from "./simplification-contract.mjs";

const root = path.join(process.cwd(), "skills/engineering-workflows/architecture-compass");
const source = {
  skill: fs.readFileSync(path.join(root, "SKILL.md"), "utf8"),
  worksheet: fs.readFileSync(
    path.join(root, "references/ac-adr-006-assign-workspace-ownership-and-source-roles.guide.md"),
    "utf8",
  ),
  lifecycle: fs.readFileSync(
    path.join(
      root,
      "references/ac-adr-064-preserve-approved-scope-through-capability-aware-planning.guide.md",
    ),
    "utf8",
  ),
  report: fs.readFileSync(path.join(root, "assets/refactor-report-template.md"), "utf8"),
};
assert.deepEqual(simplificationContractErrors(source), [], "current instruction contract");
const cases = [
  ["skill", "#simplification-loop", "#missing-loop", "SIM-001"],
  ["lifecycle", "#simplification-loop", "#missing-loop", "SIM-002"],
  ["worksheet", "or sixth workflow", "and a sixth workflow", "SIM-003"],
  ["worksheet", "without writing files", "while writing files", "SIM-004"],
  [
    "worksheet",
    "### 2. Compare the smallest supported alternatives",
    "### Missing alternatives",
    "SIM-005",
  ],
  ["worksheet", "and non-ignored untracked files", "files only", "SIM-006"],
  ["worksheet", "Do not follow symlinks", "Follow symlinks", "SIM-007"],
  ["worksheet", "actual installed version/runtime", "latest available version/runtime", "SIM-008"],
  ["worksheet", "required behavior proved", "behavior assumed", "SIM-009"],
  [
    "worksheet",
    "Convergence requires a complete final pass",
    "Convergence follows any successful pass",
    "SIM-010",
  ],
  ["worksheet", "not evidence of convergence", "evidence of convergence", "SIM-011"],
  ["worksheet", "Do not stage files to measure", "Stage files to measure", "SIM-012"],
  ["worksheet", "mark totals incomplete", "mark totals complete", "SIM-013"],
  [
    "worksheet",
    "Keep the original cumulative baseline",
    "Discard the original cumulative baseline",
    "SIM-014",
  ],
  ["report", "untracked additions", "tracked additions", "SIM-015"],
  [
    "report",
    "distinguish convergence from blocked or incomplete work",
    "declare convergence for all stops",
    "SIM-016",
  ],
];
for (const [field, before, after, code] of cases) {
  const candidate = { ...source, [field]: source[field].replaceAll(before, after) };
  assert.notEqual(candidate[field], source[field], `${code}: mutation must apply`);
  assert.ok(
    simplificationContractErrors(candidate).some((message) => message.startsWith(`[${code}]`)),
    `${code}: malformed instruction must fail`,
  );
}
// Wrapping/line endings are presentation, not a missing invariant.
assert.deepEqual(
  simplificationContractErrors(
    Object.fromEntries(
      Object.entries(source).map(([key, value]) => [key, value.replaceAll("\n", "\r\n")]),
    ),
  ),
  [],
);
const missing = simplificationContractErrors({});
assert.ok(missing.some((message) => message.startsWith("[SIM-001]")));
assert.ok(missing.some((message) => message.startsWith("[SIM-016]")));
console.log(
  `Simplification instruction contracts passed: baseline, ${cases.length} malformed candidates, line-ending and missing-input checks (not live agent evaluations).`,
);
