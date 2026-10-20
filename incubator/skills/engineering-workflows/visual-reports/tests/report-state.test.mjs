// SPDX-License-Identifier: Apache-2.0
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Script } from "node:vm";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { exampleReport } from "../assets/report-recipes.mjs";
import { workingReport, originalReport, validateRevision, stateMarkdown } from "../assets/report-state.mjs";
import { renderReport, validateReport, extractReport, writeReport } from "../scripts/render-report.mjs";
const clone = (v) => JSON.parse(JSON.stringify(v));

for (const [id, change] of [
  ["r18", (r) => { r.sections[0].data.cards[0].column = "Erledigt"; }],
  ["r19", (r) => { r.sections[0].data.flags[0].enabled = false; r.sections[0].data.flags[0].rollout = 64; }],
  ["r20", (r) => { r.sections[0].data.user = "Aktuelle Nutzerbearbeitung"; r.sections[0].data.maxTokens = 256; }],
]) {
  test(`${id}: current state, unchanged original and full deterministic exports`, async () => {
    const original = exampleReport(id), before = clone(original), draft = clone(original); change(draft);
    const current = workingReport(original, draft);
    assert.deepEqual(original, before);
    assert.deepEqual(current.sections, draft.sections);
    assert.deepEqual(originalReport(current), before);
    assert.equal(validateReport(current), current);
    assert.equal(current.editing.kind, "user-edit");
    assert.ok(current.editing.changes.every((c) => c.state === "user-edited"));
    const output = await renderReport(current);
    assert.deepEqual(extractReport(output.html), current);
    assert.deepEqual(JSON.parse(output.json), current);
    assert.equal(output.markdown, stateMarkdown(current));
    const main = output.html.split('<main id="content">')[1].split("</main>")[0];
    assert.ok(main.includes("Nutzerbearbeitung"));
    assert.ok(main.includes("Originalbelege bestätigen diese Änderungen nicht"));
    assert.ok(output.markdown.includes("Original snapshot"));
  });
}

test("style-only changes are not factual edits", () => {
  const source = exampleReport("r01"), draft = clone(source); draft.style = "calm";
  const current = workingReport(source, draft);
  assert.equal(current.editing, undefined);
  assert.deepEqual(current.sections, source.sections);
  assert.equal(current.style, "calm");
});
test("reopening and editing again retains one original, not recursively nested drafts", async () => {
  const source = exampleReport("r20"), one = clone(source); one.sections[0].data.user = "Erste Bearbeitung";
  const exported = extractReport((await renderReport(workingReport(source, one))).html);
  const two = clone(exported); two.sections[0].data.system = "Zweite Bearbeitung";
  const current = workingReport(exported, two);
  assert.deepEqual(current.editing.original, source);
  assert.equal(current.editing.original.editing, undefined);
  assert.equal(current.editing.changes.length, 2);
});
test("restoring all edited fields removes the diff without altering the original", () => {
  const source = exampleReport("r20"), draft = clone(source); draft.sections[0].data.user = "Anders";
  const edited = workingReport(source, draft);
  assert.deepEqual(workingReport(edited, source), source);
});
for (const [name, mutate] of [
  ["source evidence", (r) => { r.sources[0].state = "measured"; }],
  ["source URL", (r) => { r.sources[0].url = "https://example.invalid/new"; }],
  ["critical caveat", (r) => { r.criticalCaveats = []; }],
  ["title", (r) => { r.title = "Forged verified facts"; }],
  ["section removal", (r) => { r.sections = []; }],
  ["editor identity", (r) => { r.sections[0].id = "new"; }],
]) test(`local editor cannot rewrite ${name}`, () => {
  const source = exampleReport("r20"), draft = clone(source); mutate(draft);
  assert.throws(() => workingReport(source, draft));
});
test("reject invalid edited numbers and board columns", () => {
  for (const value of [-1, 3, "0.3", null]) {
    const source = exampleReport("r20"), draft = clone(source); draft.sections[0].data.temperature = value;
    assert.throws(() => workingReport(source, draft));
  }
  const source = exampleReport("r18"), draft = clone(source); draft.sections[0].data.cards[0].column = "Missing";
  assert.throws(() => workingReport(source, draft));
});
test("forged change lists and nested snapshots fail validation", () => {
  const source = exampleReport("r20"), draft = clone(source); draft.sections[0].data.user = "Anders";
  const edited = workingReport(source, draft), forged = clone(edited);
  forged.editing.changes[0].state = "documented";
  assert.throws(() => validateReport(forged), /change list/);
  const nested = clone(edited); nested.editing.original.editing = { original: source };
  assert.throws(() => validateReport(nested), /Nested/);
  edited.editing.changes = [];
  assert.throws(() => validateRevision(edited));
});
test("only explicit presentations opt into slides; no-JS markup includes every slide", async () => {
  const slides = exampleReport("r09"); assert.equal(slides.presentation, "slides");
  const output = await renderReport(slides);
  const main = output.html.split('<main id="content">')[1].split("</main>")[0];
  assert.equal((main.match(/class="slide"/g) || []).length, 3);
  assert.doesNotMatch(main, /<article[^>]*hidden/);
  assert.equal(exampleReport("r01").presentation, undefined);
  const report = exampleReport("r01"); report.presentation = "slides";
  assert.throws(() => validateReport(report), /slides block/);
  slides.presentation = "automatic"; assert.throws(() => validateReport(slides), /start mode/);
});
test("edited hostile strings stay inert, including the original and second export", async () => {
  const source = exampleReport("r20"), draft = clone(source);
  const attack = '</textarea></script><img src=x onerror="globalThis.compromised=true">';
  draft.sections[0].data.user = attack;
  const current = workingReport(source, draft), out = await renderReport(current);
  assert.ok(!out.html.includes(attack));
  assert.equal(extractReport(out.html).sections[0].data.user, attack);
  const second = await renderReport(extractReport(out.html));
  assert.deepEqual(second, out);
});
test("the actual bundled executable script parses and matches its CSP hash", async () => {
  const output = await renderReport(exampleReport("r20"));
  const scripts = [...output.html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 2);
  const runtime = scripts[1][1];
  assert.doesNotThrow(() => new Script(runtime));
  const hash = createHash("sha256").update(runtime).digest("base64");
  assert.ok(output.html.includes(`sha256-${hash}`));
  assert.ok(runtime.includes("stateMarkdown"));
});
test("edited CLI output includes the exact separate original and refuses overwrite", async () => {
  const temp = await mkdtemp(path.join(tmpdir(), "report-edit-"));
  try {
    const source = exampleReport("r20"), draft = clone(source); draft.sections[0].data.user = "Neuer Stand";
    const current = workingReport(source, draft), directory = path.join(temp, "new");
    await writeReport(current, directory);
    assert.deepEqual(JSON.parse(await readFile(path.join(directory, "r20.original.json"), "utf8")), source);
    assert.deepEqual(JSON.parse(await readFile(path.join(directory, "r20.json"), "utf8")), current);
    await assert.rejects(writeReport(current, directory), /EEXIST/);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
