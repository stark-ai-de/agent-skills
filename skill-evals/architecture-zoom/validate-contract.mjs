/** Repository contract checks; none of these assertions qualifies native agent behavior. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { snapshot } from "./evaluate.mjs";

const root = process.cwd();
const compass = "skills/engineering-workflows/architecture-compass";
const interviewer = "skills/codex-operations/codex-spec-interviewer";
const zooms = ["skills", "incubator/skills"]
  .map((base) => `${base}/engineering-workflows/architecture-zoom`)
  .filter((p) => fs.existsSync(path.join(root, p, "SKILL.md")));
assert.equal(zooms.length, 1, "Exactly one authoritative Zoom payload");
const zoom = zooms[0];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const workItem = read(`${compass}/assets/product-planning-work-item.md`);
assert.equal(read(`${interviewer}/assets/product-planning-work-item.md`), workItem);
assert.equal(read(`${zoom}/assets/work-item-template.md`), workItem);
for (const token of [
  "product-planning/v1",
  "non-goals",
  "uncommitted",
  "authorization",
  "Review budget",
])
  assert.ok(workItem.includes(token), `Missing handoff field ${token}`);
for (const mode of ["setup", "audit", "refactor", "plan-refactor", "plan-run-refactor"])
  assert.ok(read(`${compass}/SKILL.md`).includes(`\`${mode}\``));
assert.ok(!read(`${compass}/SKILL.md`).includes("- `auto`:"), "No additional public auto workflow");
assert.match(read(`${compass}/SKILL.md`), /AC-ADR-067/);
assert.match(read(`${interviewer}/SKILL.md`), /product-planning-handoffs/);
assert.match(read(`${zoom}/SKILL.md`), /orchestration\.md/);
const state = snapshot(root);
assert.equal(state.cases.length, 5, "Keep the five agreed initial evaluation groups");
assert.equal(new Set(state.cases.map((test) => test.id)).size, state.cases.length);
for (const scenario of state.cases) {
  assert.ok(scenario.input.length > 50);
  assert.ok(scenario.required.length && scenario.forbidden.length);
  assert.equal(
    new Set([...scenario.required, ...scenario.forbidden]).size,
    scenario.required.length + scenario.forbidden.length,
  );
}
// Copy real payloads into unrelated directories to catch source-only cross-skill dependencies.
const disposable = fs.mkdtempSync(path.join(os.tmpdir(), "planning-standalone-"));
let checkedLinks = 0;
try {
  const references = {
    [compass]: [
      "assets/product-planning-work-item.md",
      "assets/product-planning-profile.md",
      "assets/module-contract-review.md",
      "references/ac-adr-067-coordinate-product-planning-through-intent-bound-skill-contracts.guide.md",
      "references/ac-adr-068-reuse-explicit-skill-preselection-with-separate-provisioning-grants.guide.md",
    ],
    [interviewer]: [
      "references/product-planning-handoffs.md",
      "assets/product-planning-work-item.md",
    ],
    [zoom]: [
      "SKILL.md",
      "references/orchestration.md",
      "references/design-contracts.md",
      "assets/blueprint-template.md",
      "assets/work-item-template.md",
    ],
  };
  for (const [source, files] of Object.entries(references)) {
    const installed = path.join(disposable, path.basename(source));
    fs.cpSync(path.join(root, source), installed, { recursive: true });
    for (const file of files) {
      const text = fs.readFileSync(path.join(installed, file), "utf8");
      for (const match of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
        const target = match[1].split("#")[0];
        if (!target || /^[a-z]+:/i.test(target)) continue;
        const resolved = path.resolve(
          path.dirname(path.join(installed, file)),
          decodeURIComponent(target),
        );
        const relative = path.relative(installed, resolved);
        assert.ok(
          relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
          `Cross-payload reference: ${source}/${file} -> ${target}`,
        );
        assert.ok(
          fs.existsSync(resolved),
          `Broken standalone link: ${source}/${file} -> ${target}`,
        );
        checkedLinks++;
      }
    }
  }
} finally {
  fs.rmSync(disposable, { recursive: true, force: true });
}
console.log(
  `Product-planning contracts passed: three payloads, ${checkedLinks} isolated relative links, identical handoff templates and five frozen evaluation groups. No native-host qualification is implied.`,
);
