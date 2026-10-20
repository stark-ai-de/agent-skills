// SPDX-License-Identifier: Apache-2.0
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { KINDS, validateReport, renderReport, extractReport, writeReport } from "../scripts/render-report.mjs";
import { recipes, exampleReport } from "../assets/report-recipes.mjs";
const cli = fileURLToPath(new URL("../scripts/render-report.mjs", import.meta.url));

for (const recipe of recipes) {
  test(`${recipe.id}: ${recipe.title}; complete deterministic offline outputs`, async () => {
    const report = exampleReport(recipe.id);
    assert.equal(validateReport(report), report);
    assert.deepEqual(report.sections.map((s) => s.kind), recipe.kinds);
    const result = await renderReport(report);
    assert.deepEqual(await renderReport(report), result);
    assert.deepEqual(JSON.parse(result.json), report);
    assert.deepEqual(extractReport(result.html), report);
    assert.ok(result.markdown.includes("criticalCaveats"));
    assert.ok(result.markdown.includes("sourceIds"));
    for (const section of report.sections) {
      assert.ok(result.html.includes(`id="block-${section.id}"`));
      assert.ok(result.markdown.includes(section.title));
    }
    assert.ok(result.html.includes("connect-src &#39;none&#39;"));
    assert.doesNotMatch(result.html, /<(?:script|link)[^>]+(?:src|href)=["']https?:/i);
    assert.doesNotMatch(result.html, /@import\s|url\(["']?https?:/i);
  });
}
test("finite catalog: all 24, unique IDs, all registered blocks are exercised", () => {
  assert.equal(recipes.length, 24);
  assert.equal(new Set(recipes.map((r) => r.id)).size, 24);
  const exercised = new Set(recipes.flatMap((r) => r.kinds));
  assert.deepEqual(KINDS.filter((k) => !exercised.has(k)), ["figure"]); // Separate raster fixture below.
});
test("embedded raster block is validated; remote images and active SVG rejected", async () => {
  const report = exampleReport("r10");
  report.sections = [{ id: "raster", kind: "figure", title: "Explicit one-pixel test fixture", sourceIds: ["demo"], caveats: ["Test fixture, not a product screenshot."], data: { src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlL8AAAAASUVORK5CYII=", alt: "One-pixel test fixture", caption: "Original test fixture, no product evidence." } }];
  assert.ok((await renderReport(report)).html.includes("<figure>"));
  for (const src of ["https://example.invalid/a.png", "data:image/svg+xml;base64,PHN2Zz4="]) { report.sections[0].data.src = src; assert.throws(() => validateReport(report), /raster/); }
});
test("unknown remains null; complete option matrix and source refs are required", () => {
  let report = exampleReport("r01"); report.sections[0].data.criteria[0].values.c.value = 0;
  assert.throws(() => validateReport(report), /Unknown is null/);
  report = exampleReport("r01"); delete report.sections[0].data.criteria[0].values.c;
  assert.throws(() => validateReport(report), /all options/);
  report = exampleReport("r01"); report.sections[0].data.criteria[0].values.a.sourceIds = ["invented"];
  assert.throws(() => validateReport(report), /Unknown source/);
});
test("reject malformed models, unsafe URL schemes, dates and graph endpoints", () => {
  const edits = [
    (r) => { r.schemaVersion = 99; }, (r) => { r.id = "../escape"; }, (r) => { r.sections.push(r.sections[0]); },
    (r) => { r.sources[0].url = "javascript:alert(1)"; }, (r) => { r.sources[0].url = "https://secret@example.invalid"; },
    (r) => { r.sections[0].kind = "unknown-widget"; }, (r) => { r.style = "unapproved"; },
  ];
  edits.forEach((edit) => { const r = exampleReport("r01"); edit(r); assert.throws(() => validateReport(r)); });
  const r = exampleReport("r24"); r.sections[0].data.tasks[0].start = "2026-02-30";
  assert.throws(() => validateReport(r), /Invalid ISO/);
  const g = exampleReport("r23"); g.sections[0].data.edges[0].from = "missing";
  assert.throws(() => validateReport(g), /endpoint/);
});
test("untrusted markup is inert and embedded JSON remains lossless", async () => {
  const report = exampleReport("r04");
  const attack = '</script><script>globalThis.compromised=true</script><img src=x onerror="alert(1)">';
  report.title = attack; report.sections[0].data.blocks[0].code = attack;
  const out = await renderReport(report);
  assert.ok(!out.html.includes(attack));
  assert.equal((out.html.match(/<script(?:>| )/g) || []).length, 2);
  assert.deepEqual(extractReport(out.html), report);
});
test("unknown metric, non-finite value, flag types and invalid state transitions fail", () => {
  const r = exampleReport("r11"); r.sections[0].data.items[2].value = 0; assert.throws(() => validateReport(r));
  const a = exampleReport("r01"); a.sections[0].data.criteria[0].values.a.value = Infinity; assert.throws(() => validateReport(a));
  const f = exampleReport("r19"); f.sections[0].data.flags[0].enabled = "yes"; assert.throws(() => validateReport(f));
  const p = exampleReport("r08"); p.sections[0].data.transitions[0].to = "invented"; assert.throws(() => validateReport(p));
});
test("comparison axes include zero, negatives and unknown placeholders", async () => {
  const r = exampleReport("r01"); r.sections[0].data.criteria[0].values.a.value = -30;
  const out = await renderReport(r); assert.ok(out.html.includes("gemeinsame Skala -30 … 45")); assert.ok(out.html.includes('class="missing"'));
});
test("all styles preserve facts; source metadata and extension fields survive", async () => {
  const r = exampleReport("r21"); r.consumerExtension = { requiredCondition: "Do not silently discard" };
  for (const style of ["current", "balanced", "calm"]) { r.style = style; const out = await renderReport(r); assert.deepEqual(extractReport(out.html), r); assert.ok(out.markdown.includes(r.consumerExtension.requiredCondition)); }
});
test("CLI writes three formats, refuses overwrite and extracts a targeted section", async () => {
  const temp = await mkdtemp(path.join(tmpdir(), "visual-report-test-"));
  try {
    const r = exampleReport("r01"), destination = path.join(temp, "new");
    await writeReport(r, destination);
    await assert.rejects(writeReport(r, destination), /EEXIST/);
    assert.deepEqual(JSON.parse(await readFile(path.join(destination, "r01.json"), "utf8")), r);
    const selected = JSON.parse(execFileSync(process.execPath, [cli, "--extract", path.join(destination, "r01.html"), "--section", "compare"], { encoding: "utf8" }));
    assert.deepEqual(selected, r.sections[0]);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
