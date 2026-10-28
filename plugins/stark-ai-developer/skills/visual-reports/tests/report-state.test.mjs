// SPDX-License-Identifier: Apache-2.0
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Script } from "node:vm";
import { exampleReport } from "../assets/report-recipes.mjs";
import { extractReport, renderReport, validateReport } from "../scripts/render-report.mjs";
import {
  originalReport,
  stateMarkdown,
  validateRevision,
  workingReport,
} from "../scripts/lib/report-state.mjs";

function typedSnapshot(markdown) {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => /^`{3,}json$/.test(line));
  assert.notEqual(start, -1, "Markdown includes the canonical typed JSON snapshot");
  const fence = lines[start].slice(0, -4);
  const end = lines.indexOf(fence, start + 1);
  assert.ok(end > start, "typed JSON fence stays intact");
  return JSON.parse(lines.slice(start + 1, end).join("\n"));
}

test("working exports retain one immutable original and exact field-level user provenance", () => {
  const source = exampleReport("r18");
  const original = structuredClone(source);
  const draft = structuredClone(source);
  draft.sections[0].data.cards[0].column = "In Prüfung";
  const current = workingReport(source, draft);
  validateRevision(current);
  assert.deepEqual(originalReport(current), original);
  assert.equal(current.editing.original.editing, undefined);
  assert.deepEqual(
    current.editing.changes.map(({ sectionId, targetId, field, state, sourceIds }) => ({
      sectionId,
      targetId,
      field,
      state,
      sourceIds,
    })),
    [
      {
        sectionId: "board",
        targetId: draft.sections[0].data.cards[0].id,
        field: "column",
        state: "user-edited",
        sourceIds: ["demo"],
      },
    ],
  );
  const markdown = stateMarkdown(current);
  assert.match(markdown, /user-edit/);
  assert.match(markdown, /Original snapshot/);
  assert.match(markdown, /Complete, unfiltered current field index/);
  assert.deepEqual(source, original);
});

test("reader Markdown retains chart diagrams and cannot relabel changed source evidence", () => {
  const source = exampleReport("r24");
  const markdown = stateMarkdown(source);
  assert.match(markdown, /```text/);
  assert.match(markdown, /## Quellen/);
  const draft = structuredClone(source);
  draft.sections[1].sourceIds = [];
  assert.throws(() => workingReport(source, draft), /cannot change sources/);
  const revision = workingReport(source, structuredClone(source));
  assert.equal(revision.editing, undefined);
});

const clone = (value) => structuredClone(value);

for (const [id, edit] of [
  ["r18", (report) => (report.sections[0].data.cards[0].column = "Erledigt")],
  [
    "r19",
    (report) => {
      report.sections[0].data.flags[0].enabled = false;
      report.sections[0].data.flags[0].rollout = 64;
    },
  ],
  [
    "r20",
    (report) => {
      report.sections[0].data.user = "Neue Nutzerfassung";
      report.sections[0].data.maxTokens = 256;
    },
  ],
]) {
  test(`${id}: each editor exports its current state and immutable original`, async () => {
    const original = exampleReport(id);
    const draft = clone(original);
    edit(draft);
    const current = workingReport(original, draft);
    assert.deepEqual(originalReport(current), original);
    assert.deepEqual(current.sections, draft.sections);
    assert.equal(validateReport(current), current);
    assert.ok(current.editing.changes.every((change) => change.state === "user-edited"));
    const output = await renderReport(current);
    assert.deepEqual(extractReport(output.html), current);
    assert.deepEqual(JSON.parse(output.json), current);
    assert.equal(output.markdown, stateMarkdown(current));
    assert.match(output.html, /Original-Snapshot getrennt erhalten/);
    assert.match(output.markdown, /Original snapshot/);
  });
}

test("style-only provenance remains explicit in the current contract", () => {
  const original = exampleReport("r01");
  const draft = clone(original);
  draft.style = "calm";
  const current = workingReport(original, draft);
  assert.equal(current.style, "calm");
  assert.equal(current.editing.original.style, original.style);
  assert.deepEqual(
    current.editing.changes.map(({ targetId, field, before, after }) => ({
      targetId,
      field,
      before,
      after,
    })),
    [{ targetId: "report", field: "style", before: "current", after: "calm" }],
  );
  validateRevision(current);
});

test("repeated editing and re-export keep one original snapshot", async () => {
  const original = exampleReport("r20");
  const firstDraft = clone(original);
  firstDraft.sections[0].data.user = "Erste Bearbeitung";
  const first = workingReport(original, firstDraft);
  const reopened = extractReport((await renderReport(first)).html);
  const secondDraft = clone(reopened);
  secondDraft.sections[0].data.system = "Zweite Bearbeitung";
  const current = workingReport(reopened, secondDraft);
  assert.deepEqual(current.editing.original, original);
  assert.equal(current.editing.original.editing, undefined);
  assert.equal(current.editing.changes.length, 2);
  const reexported = await renderReport(current);
  assert.deepEqual(extractReport(reexported.html), current);
  assert.deepEqual(JSON.parse(reexported.json).editing.original, original);
});

test("restoring all edited values removes the diff while preserving the baseline", () => {
  const original = exampleReport("r20");
  const draft = clone(original);
  draft.sections[0].data.user = "Temporary edit";
  const edited = workingReport(original, draft);
  const restored = workingReport(edited, original);
  assert.deepEqual(restored, original);
  assert.deepEqual(edited.editing.original, original);
});

test("Markdown retains exact typed current and original JSON alongside its reader view", () => {
  const original = exampleReport("r20");
  original.extension = {
    nested: {
      integer: 1,
      text: "1",
      truth: true,
      emptyObject: {},
      emptyArray: [],
      absentValue: null,
    },
    hostile: '```json\n</script><img src=x onerror="alert(1)">',
  };
  const draft = structuredClone(original);
  draft.sections[0].data.user = "Edited current value";
  const current = workingReport(original, draft);
  const markdown = stateMarkdown(current);
  assert.match(markdown, /## Prompt und Parameter/);
  assert.match(markdown, /Complete, unfiltered current field index/);
  assert.deepEqual(typedSnapshot(markdown), { current, original });

  const numeric = exampleReport("r20");
  numeric.extension = { value: 1 };
  const textual = structuredClone(numeric);
  textual.extension.value = "1";
  assert.notEqual(stateMarkdown(numeric), stateMarkdown(textual));
  const truth = structuredClone(numeric);
  truth.extension.value = true;
  const stringTruth = structuredClone(numeric);
  stringTruth.extension.value = "true";
  assert.notEqual(stateMarkdown(truth), stateMarkdown(stringTruth));
  const nullable = structuredClone(numeric);
  nullable.extension.value = null;
  const textNull = structuredClone(numeric);
  textNull.extension.value = "unknown (null)";
  assert.notEqual(stateMarkdown(nullable), stateMarkdown(textNull));
});

test("no effective editor change returns the exact original including optional style presence", () => {
  const implicit = exampleReport("r20");
  delete implicit.style;
  const implicitDraft = structuredClone(implicit);
  implicitDraft.style = "current";
  const unchangedImplicit = workingReport(implicit, implicitDraft);
  assert.deepEqual(unchangedImplicit, implicit);
  assert.equal(Object.hasOwn(unchangedImplicit, "style"), false);

  const explicit = exampleReport("r20");
  const edited = structuredClone(explicit);
  edited.style = "calm";
  assert.equal(workingReport(explicit, edited).editing.changes[0].field, "style");
  const reverted = workingReport(workingReport(explicit, edited), explicit);
  assert.deepEqual(reverted, explicit);
  assert.equal(Object.hasOwn(reverted, "style"), true);
});

for (const [name, mutate] of [
  ["source evidence", (report) => (report.sources[0].state = "measured")],
  ["source URL", (report) => (report.sources[0].url = "https:" + "/" + "/example.invalid/changed")],
  ["critical caveats", (report) => (report.criticalCaveats = [])],
  ["title", (report) => (report.title = "Forged verification")],
  ["section removal", (report) => (report.sections = [])],
  ["section title", (report) => (report.sections[0].title = "Forged section")],
  ["editor identity", (report) => (report.sections[0].id = "replacement")],
  ["editor kind", (report) => (report.sections[0].kind = "text")],
]) {
  test(`editor rejects mutation of ${name}`, () => {
    const original = exampleReport("r20");
    const draft = clone(original);
    mutate(draft);
    assert.throws(() => workingReport(original, draft));
  });
}

test("numeric editor constraints and board column identities are enforced", () => {
  for (const value of [-1, 3, "0.3", null]) {
    const original = exampleReport("r20");
    const draft = clone(original);
    draft.sections[0].data.temperature = value;
    assert.throws(() => workingReport(original, draft));
  }
  for (const value of [0, 1.5, 100001, "256"]) {
    const original = exampleReport("r20");
    const draft = clone(original);
    draft.sections[0].data.maxTokens = value;
    assert.throws(() => workingReport(original, draft));
  }
  for (const value of ["Missing", null]) {
    const original = exampleReport("r18");
    const draft = clone(original);
    draft.sections[0].data.cards[0].column = value;
    assert.throws(() => workingReport(original, draft));
  }
  const original = exampleReport("r18");
  const draft = clone(original);
  draft.sections[0].data.cards[0].id = "forged-card";
  assert.throws(() => workingReport(original, draft), /card IDs/);
});

test("forged editing metadata and nested originals fail revision validation", () => {
  const original = exampleReport("r20");
  const draft = clone(original);
  draft.sections[0].data.user = "Current edit";
  const edited = workingReport(original, draft);
  const forged = clone(edited);
  forged.editing.changes[0].state = "documented";
  assert.throws(() => validateRevision(forged), /change list/);
  const nested = clone(edited);
  nested.editing.original.editing = { original };
  assert.throws(() => validateRevision(nested), /Nested original/);
  const empty = clone(edited);
  empty.editing.changes = [];
  assert.throws(() => validateRevision(empty), /Invalid editing metadata/);
  const extra = clone(edited);
  extra.editing.verified = true;
  assert.throws(() => validateRevision(extra), /Unsupported editing metadata/);
});

test("hostile edited strings stay inert and rendering is deterministic after reopening", async () => {
  const original = exampleReport("r20");
  const draft = clone(original);
  const attack = '</textarea></script><img src=x onerror="globalThis.compromised=true">';
  draft.sections[0].data.user = attack;
  const current = workingReport(original, draft);
  const output = await renderReport(current);
  assert.ok(!output.html.includes(attack));
  assert.equal(extractReport(output.html).sections[0].data.user, attack);
  const reopened = extractReport(output.html);
  const second = await renderReport(reopened);
  assert.deepEqual(second, output);
  assert.deepEqual(JSON.parse(second.json).editing.original, original);
});

test("bundled browser runtime parses and its CSP hash matches the rendered bytes", async () => {
  const output = await renderReport(exampleReport("r20"));
  const scripts = [...output.html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 2);
  const runtime = scripts[1][1];
  assert.doesNotThrow(() => new Script(runtime));
  const hash = createHash("sha256").update(runtime).digest("base64");
  assert.ok(output.html.includes(`sha256-${hash}`));
  assert.match(runtime, /stateMarkdown/);
});
