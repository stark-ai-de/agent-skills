import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { load } from "js-yaml";

const hosts = ["codex", "claude", "cursor"];
const targetNames = hosts.map((host) => `${host}-spec-interviewer`);
const hostOnlyKeys = ["context", "agent", "model", "disable-model-invocation", "user-invocable"];

export function inspectTemplateRecords(text, compact = false) {
  const errors = [];
  const verification = [...text.matchAll(/^## (?:User verification|Verification checkpoint)$/gm)];
  if (verification.length !== (compact ? 0 : 1)) {
    errors.push("template must have one verification record, or none for compact output");
  }
  const approval = text.split(/^## User verification\n/m)[1]?.split(/^## /m)[0] ?? "";
  if (/^[-*] (?:Spec saved|Spec persistence|ADR persistence):/m.test(approval)) {
    errors.push("actual persistence belongs outside the approval record");
  }
  const sections = [...text.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
  if (new Set(sections).size !== sections.length)
    errors.push("duplicate top-level template section");
  return errors;
}

export function inspectPortableMetadata(data) {
  return hostOnlyKeys
    .filter((key) => Object.hasOwn(data, key))
    .map((key) => `host-only frontmatter: ${key}`);
}

function filesUnder(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(file) : [file];
  });
}

export function validateInterviewerContracts(root) {
  const errors = [];
  const lifecycles = [];
  for (const host of hosts) {
    const dir = path.join(root, "skills", `${host}-operations`, `${host}-spec-interviewer`);
    const rel = path.relative(root, dir);
    const skill = fs.readFileSync(path.join(dir, "SKILL.md"), "utf8");
    try {
      const metadata = load(skill.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "") ?? {};
      errors.push(...inspectPortableMetadata(metadata).map((error) => `${rel}: ${error}`));
    } catch (error) {
      errors.push(`${rel}: invalid metadata: ${error.message}`);
    }
    lifecycles.push(fs.readFileSync(path.join(dir, "references/workflow-details.md"), "utf8"));
    for (const file of filesUnder(dir).filter((file) => file.endsWith(".md"))) {
      const text = fs.readFileSync(file, "utf8");
      const fileRel = path.relative(root, file);
      if (/spec-template\.(?:compact|standard|deep)\.md$/.test(file)) {
        errors.push(
          ...inspectTemplateRecords(text, file.endsWith("compact.md")).map(
            (error) => `${fileRel}: ${error}`,
          ),
        );
      }
      for (const match of text.matchAll(/\[[^\]]*\]\(([^\s)]+\.md)(?:#[^)]*)?\)/g)) {
        if (/^https?:/.test(match[1])) continue;
        const destination = path.resolve(path.dirname(file), match[1]);
        if (!destination.startsWith(`${dir}${path.sep}`) || !fs.existsSync(destination)) {
          errors.push(`${fileRel}: unresolved or non-local skill reference ${match[1]}`);
        }
      }
    }
  }
  if (new Set(lifecycles).size !== 1)
    errors.push("interviewer shared lifecycle copies have drifted");
  const matrixPath = path.join(root, "skill-evals/codex-spec-interviewer/approval-scenarios.json");
  try {
    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
    if (
      matrix.schema_version !== 1 ||
      JSON.stringify(matrix.targets) !== JSON.stringify(targetNames)
    ) {
      errors.push(
        "interviewer scenario matrix must target all three runtime variants with schema 1",
      );
    }
    const ids = new Set();
    for (const scenario of matrix.cases ?? []) {
      if (!scenario.id || ids.has(scenario.id))
        errors.push("interviewer scenario IDs must be present and unique");
      ids.add(scenario.id);
      for (const key of ["context", "prompt", "answer_card"]) {
        if (typeof scenario[key] !== "string" || !scenario[key].trim())
          errors.push(`${scenario.id}: missing ${key}`);
      }
      for (const key of ["required", "forbidden"]) {
        if (
          !Array.isArray(scenario[key]) ||
          !scenario[key].length ||
          scenario[key].some((item) => typeof item !== "string" || !item.trim())
        ) {
          errors.push(`${scenario.id}: missing outcome observations in ${key}`);
        }
      }
    }
    for (const id of [
      "known-save",
      "prior-answers",
      "native-checkpoint",
      "manual-exit",
      "approved-still-plan",
      "approved-after-exit",
      "prior-overwrite",
      "ambiguous-destination",
      "proposed-adr",
      "accepted-adr",
      "bounded-revision",
      "new-ambiguity",
      "chat-only",
      "outer-authority",
      "target-drift",
      "lost-context",
      "permission-denial",
      "async-pending",
      "older-host",
      "unknown-host",
      "declined-plan",
      "partial-save",
    ]) {
      if (!ids.has(id)) errors.push(`interviewer scenario inventory missing ${id}`);
    }
  } catch (error) {
    errors.push(`interviewer scenario inventory invalid: ${error.message}`);
  }
  return errors;
}

export function testInterviewerContractChecks() {
  const valid =
    "## User verification\n\n- Reviewed revision:\n\n## Artifact plan\n\n- Spec persistence: pending\n";
  assert.deepEqual(inspectTemplateRecords(valid), []);
  assert.deepEqual(inspectTemplateRecords("## Goal\n\nA small task.\n", true), []);
  assert.notDeepEqual(
    inspectTemplateRecords(`${valid}\n## Verification checkpoint\n\n- Spec saved: yes\n`),
    [],
  );
  assert.notDeepEqual(
    inspectTemplateRecords(valid.replace("- Reviewed revision:", "- Spec saved: yes")),
    [],
  );
  assert.notDeepEqual(inspectTemplateRecords(`${valid}\n## Artifact plan\n`), []);
  assert.deepEqual(
    inspectPortableMetadata({
      name: "sample",
      description: "Portable",
      metadata: { version: "1.0.0" },
    }),
    [],
  );
  for (const key of hostOnlyKeys)
    assert.notDeepEqual(inspectPortableMetadata({ name: "sample", [key]: true }), []);
  console.log(
    "Validated interviewer metadata/template fixtures; scenario inventory is not live behavioral proof.",
  );
}
