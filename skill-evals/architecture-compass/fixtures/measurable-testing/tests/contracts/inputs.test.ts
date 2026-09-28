import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { affected, discover, validateInputs } from "../../src/inputs.ts";
test("current Markdown/schema inventory covers add, delete, rename and empty roots", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ac-inputs-"));
  try {
    fs.writeFileSync(path.join(root, "b.md"), "valid");
    fs.writeFileSync(path.join(root, "a.json"), "{}");
    expect(discover(root)).toEqual(["a.json", "b.md"]);
    fs.writeFileSync(path.join(root, "c.md"), "bad");
    expect(discover(root)).toEqual(["a.json", "b.md", "c.md"]);
    fs.renameSync(path.join(root, "c.md"), path.join(root, "d.md"));
    expect(discover(root)).toEqual(["a.json", "b.md", "d.md"]);
    fs.unlinkSync(path.join(root, "b.md"));
    expect(discover(root)).toEqual(["a.json", "d.md"]);
    for (const file of discover(root)) fs.unlinkSync(path.join(root, file));
    expect(() => discover(root)).toThrow("empty");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  expect(() => discover(root)).toThrow();
  for (const changed of [["inputs/new.md"], ["schemas/deleted.json"]])
    expect(affected(changed)).toEqual(["tests/contracts/inputs.test.ts"]);
});

test("checks current repository inputs", () => {
  const current = validateInputs("inputs");
  expect(current.length).toBeGreaterThan(0);
  if (process.env.QUALIFICATION_WATCH_STATE)
    fs.writeFileSync(process.env.QUALIFICATION_WATCH_STATE, JSON.stringify(current));
  expect(validateInputs("schemas").length).toBeGreaterThan(0);
});

test("unknown changed paths select the contracts suite", () =>
  expect(affected(["unknown.file"])).toEqual(["tests/contracts"]));
