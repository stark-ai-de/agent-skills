// SPDX-License-Identifier: Apache-2.0
import test from "node:test";
import assert from "node:assert/strict";
import { exampleReport } from "../assets/report-recipes.mjs";
import {
  originalReport,
  stateMarkdown,
  validateRevision,
  workingReport,
} from "../scripts/lib/report-state.mjs";

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
