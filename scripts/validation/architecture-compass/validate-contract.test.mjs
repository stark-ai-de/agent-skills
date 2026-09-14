import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const source = process.cwd();
const root = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-contract-"));
const skill = "skills/engineering-workflows/architecture-compass";
const refs = `${skill}/references`;
const stems = new Map(
  [59, 60, 61, 62].map((id) => [
    id,
    fs
      .readdirSync(path.join(source, refs))
      .find(
        (name) =>
          name.startsWith(`ac-adr-${id.toString().padStart(3, "0")}-`) && name.endsWith(".long.md"),
      )
      .slice(0, -8),
  ]),
);
const file = (id, variant) => `${refs}/${stems.get(id)}.${variant}.md`;
function run() {
  const result = spawnSync(
    process.execPath,
    [path.join(source, "scripts/validation/architecture-compass/validate.mjs")],
    { cwd: root, encoding: "utf8", timeout: 30000 },
  );
  assert.ifError(result.error);
  return result;
}
function rejects(label, relative, change, pattern) {
  const target = path.join(root, relative),
    original = fs.readFileSync(target, "utf8");
  try {
    const candidate = change(original);
    if (candidate === null) fs.unlinkSync(target);
    else {
      assert.notEqual(candidate, original, label);
      fs.writeFileSync(target, candidate);
    }
    const result = run();
    assert.notEqual(result.status, 0, label);
    assert.match(result.stderr, pattern, label);
  } finally {
    fs.writeFileSync(target, original);
  }
}
try {
  for (const directory of [
    skill,
    "docs/adrs",
    "scripts/validation/architecture-compass",
    "skill-evals/architecture-compass",
  ]) {
    fs.cpSync(path.join(source, directory), path.join(root, directory), {
      recursive: true,
      filter: (p) =>
        !p.split(path.sep).some((part) => ["node_modules", ".cache", "reports"].includes(part)),
    });
  }
  const baseline = run();
  assert.equal(baseline.status, 0, baseline.stderr);
  rejects("missing variant", file(59, "short"), () => null, /missing|triplet/i);
  rejects(
    "Proposed cannot ship",
    file(59, "short"),
    (s) => s.replace("Status: Accepted", "Status: Proposed"),
    /Accepted or Superseded/,
  );
  rejects(
    "accepted decision drift",
    file(59, "long"),
    (s) => s.replace("A target SHALL", "A target MAY"),
    /Decision section changed|decision.*lock|changed.*decision|Decision changed/i,
  );
  rejects(
    "Long structure",
    file(60, "long"),
    (s) => s.replace("## Context", "## Missing context"),
    /Context/,
  );
  rejects(
    "measurement obligations",
    file(61, "long"),
    (s) => s.replace("## Adoption evidence", "## Missing adoption evidence"),
    /missing measurable testing section Adoption evidence/,
  );
  rejects(
    "independent inline lineage",
    file(62, "guide"),
    (s) => s + "\nDecision lineage: independent.\n",
    /independent disposition must omit/,
  );
  rejects(
    "detached catalog row",
    `${refs}/adr-catalog.md`,
    (s) => s.replace(/\n(?=\| AC-ADR-059)/, "\n\n"),
    /headed Markdown table/,
  );
  rejects(
    "detached matrix row",
    `${skill}/assets/setup-report-template.md`,
    (s) => s.replace(/\n(?=\| AC-ADR-059)/, "\n\n"),
    /headed Markdown table/,
  );
  rejects(
    "stale adoption count",
    `${skill}/assets/setup-report-template.md`,
    (s) => s.replace("Matrix row count: `43`", "Matrix row count: `39`"),
    /matrix|count/i,
  );
  rejects(
    "missing metric denominator",
    `${skill}/assets/testing-outcome-receipt-template.md`,
    (s) => s.replace("Population/denominator", "Population"),
    /Population\/denominator/,
  );
  rejects(
    "missing measurement state",
    `${skill}/assets/testing-outcome-receipt-template.md`,
    (s) => s.replaceAll("Measurement state", "Outcome label"),
    /Measurement state/,
  );
  rejects(
    "wrong lineage disposition",
    "scripts/validation/architecture-compass/decision-lineage.json",
    (s) => {
      const value = JSON.parse(s);
      value.decisions.find((row) => row.id === "AC-ADR-062").disposition = "material";
      return JSON.stringify(value);
    },
    /lineage|relations/i,
  );
  console.log(
    "Architecture Compass contract regressions passed: baseline and 12 malformed candidates; real source untouched.",
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
