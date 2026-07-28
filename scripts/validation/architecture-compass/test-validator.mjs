import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..", "..", "..");
const validator = path.join(root, "scripts", "validate-architecture-compass.mjs");
const skillRelative = path.join("skills", "engineering-workflows", "architecture-compass");
const evalRelative = path.join("skill-evals", "architecture-compass");
const lockRelative = path.join(
  "scripts",
  "validation",
  "architecture-compass",
  "decision-lock.tsv",
);
const stem001 = "ac-adr-001-route-architecture-compass-through-canonical-adr-triplets";
const stem002 = "ac-adr-002-select-actions-resolve-authority-and-record-guardrail-adoption";
const stem005 = "ac-adr-005-make-repository-adrs-binding-agent-guardrails";

function copyFixture() {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-compass-validator-"));
  for (const relative of [skillRelative, evalRelative]) {
    const destination = path.join(fixture, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.cpSync(path.join(root, relative), destination, { recursive: true });
  }
  const lockDestination = path.join(fixture, lockRelative);
  fs.mkdirSync(path.dirname(lockDestination), { recursive: true });
  fs.copyFileSync(path.join(root, lockRelative), lockDestination);
  return fixture;
}

let importSequence = 0;
async function runValidator(fixture) {
  const previousCwd = process.cwd();
  process.chdir(fixture);
  try {
    importSequence += 1;
    const module = await import(`${pathToFileURL(validator).href}?fixture=${importSequence}`);
    return {
      status: module.validationErrors.length === 0 ? 0 : 1,
      output: module.validationErrors.join("\n"),
    };
  } finally {
    process.chdir(previousCwd);
  }
}

function edit(file, transform) {
  const before = fs.readFileSync(file, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`Mutation did not change ${file}`);
  fs.writeFileSync(file, after, "utf8");
}

function tripletFiles(fixture, stem) {
  const references = path.join(fixture, skillRelative, "references");
  return ["short", "long", "guide"].map((variant) =>
    path.join(references, `${stem}.${variant}.md`),
  );
}

async function expectFailure(name, mutate, expected) {
  const fixture = copyFixture();
  try {
    mutate(fixture);
    const result = await runValidator(fixture);
    const output = result.output;
    if (result.status === 0 || !output.includes(expected)) {
      throw new Error(
        `${name}: expected failure containing ${JSON.stringify(expected)}; status=${result.status}\n${output}`,
      );
    }
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

const baselineFixture = copyFixture();
try {
  const baseline = await runValidator(baselineFixture);
  if (baseline.status !== 0) {
    throw new Error(`Fixture baseline failed:\n${baseline.output}`);
  }
} finally {
  fs.rmSync(baselineFixture, { recursive: true, force: true });
}

const cases = [
  {
    name: "missing variant",
    expected: "expected exactly three variants",
    mutate(fixture) {
      fs.rmSync(tripletFiles(fixture, stem001)[2]);
    },
  },
  {
    name: "ID and stem collision",
    expected: "ID collision across stems",
    mutate(fixture) {
      const references = path.join(fixture, skillRelative, "references");
      for (const variant of ["short", "long", "guide"]) {
        fs.copyFileSync(
          path.join(references, `${stem001}.${variant}.md`),
          path.join(references, `ac-adr-001-collision.${variant}.md`),
        );
      }
    },
  },
  {
    name: "shared metadata drift",
    expected: "Category metadata drifts",
    mutate(fixture) {
      edit(tripletFiles(fixture, stem001)[2], (text) =>
        text.replace("Category: governance", "Category: backend"),
      );
    },
  },
  {
    name: "wrong canonical variant",
    expected: "Canonical variant must be Long",
    mutate(fixture) {
      edit(tripletFiles(fixture, stem001)[0], (text) =>
        text.replace("Canonical variant: Long", "Canonical variant: Short"),
      );
    },
  },
  {
    name: "invalid scope and adoptability",
    expected: "Scope must be target-repository",
    mutate(fixture) {
      for (const file of tripletFiles(fixture, stem005)) {
        edit(file, (text) => text.replace("Scope: target-repository", "Scope: skill-runtime"));
      }
    },
  },
  {
    name: "catalog orphan",
    expected: "orphan AC-ADR link",
    mutate(fixture) {
      const catalog = path.join(fixture, skillRelative, "references", "adr-catalog.md");
      edit(catalog, (text) => `${text}\n[Orphan](ac-adr-999-orphan.short.md)\n`);
    },
  },
  {
    name: "removed legacy reference",
    expected: "stale legacy reference path",
    mutate(fixture) {
      const skill = path.join(fixture, skillRelative, "SKILL.md");
      edit(skill, (text) => `${text}\nLegacy: references/nextjs-request-patterns.md\n`);
    },
  },
  {
    name: "accepted decision drift",
    expected: "Long Decision drifted from its accepted lock",
    mutate(fixture) {
      edit(tripletFiles(fixture, stem001)[1], (text) =>
        text.replace(
          "\n## Invariants",
          "\nThis sentence changes the accepted decision in place.\n\n## Invariants",
        ),
      );
    },
  },
  {
    name: "unsuffixed AC-ADR link",
    expected: "unsuffixed AC-ADR path is forbidden",
    mutate(fixture) {
      const skill = path.join(fixture, skillRelative, "SKILL.md");
      edit(skill, (text) => `${text}\nLegacy: references/${stem001}.md\n`);
    },
  },
  {
    name: "missing catalog route",
    expected: "missing direct link",
    mutate(fixture) {
      const catalog = path.join(fixture, skillRelative, "references", "adr-catalog.md");
      edit(catalog, (text) => text.replace(`${stem001}.guide.md`, "missing-guide.md"));
    },
  },
  {
    name: "non-reciprocal supersession",
    expected: "must reciprocally list",
    mutate(fixture) {
      for (const file of tripletFiles(fixture, stem002)) {
        edit(file, (text) => text.replace("Supersedes: none", "Supersedes: AC-ADR-001"));
      }
    },
  },
  {
    name: "normative guide section",
    expected: "Guide must not define normative Decision or Rules sections",
    mutate(fixture) {
      edit(tripletFiles(fixture, stem001)[2], (text) => `${text}\n## Rules\n\nHidden rule.\n`);
    },
  },
];

for (const testCase of cases) {
  await expectFailure(testCase.name, testCase.mutate, testCase.expected);
}

console.log(`Architecture Compass validator negative fixtures passed: ${cases.length} cases.`);
