// SPDX-License-Identifier: Apache-2.0
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  KINDS,
  validateReport,
  renderReport,
  extractReport,
  writeReport,
} from "../scripts/render-report.mjs";
import { recipes, exampleReport } from "../assets/report-recipes.mjs";
import { workingReport, readerStatusLines } from "../scripts/lib/report-state.mjs";
const cli = fileURLToPath(new URL("../scripts/render-report.mjs", import.meta.url));

test("presentation contract prefers suitable native view and preserves complete HTML fallback", async () => {
  const skill = await readFile(new URL("../SKILL.md", import.meta.url), "utf8");
  const contract = await readFile(
    new URL("../references/report-contract.md", import.meta.url),
    "utf8",
  );
  assert.match(skill, /prefer.*native.*visualization/i);
  assert.match(contract, /current.*host.*callable/i);
  assert.match(contract, /same validated.*snapshot/i);
  assert.match(contract, /HTML.*fallback/i);
  assert.match(contract, /(?:unavailable|fails|insufficient).*HTML/i);
  assert.match(contract, /(?:concise|short).*reader/i);
  assert.match(contract, /(?:verified|observed).*display/i);
  const scenarios = [
    [/native.*primary/i, "native primary presentation"],
    [/caveat.*evidence status/i, "missing caveats require HTML"],
    [/queued.*not proof/i, "queued rendering is not display evidence"],
    [/explicitly requests standalone HTML/i, "explicit HTML request wins"],
    [/managed preview.*always stay/i, "managed routes remain available"],
    [/private material.*authorized host/i, "private data stays within authorization"],
    [/no duplicated orientation/i, "concision without repetition"],
  ];
  for (const [pattern, scenario] of scenarios) {
    assert.match(`${skill}\n${contract}`, pattern, scenario);
  }
});

for (const recipe of recipes) {
  test(`${recipe.id}: ${recipe.title}; complete deterministic offline outputs`, async () => {
    const report = exampleReport(recipe.id);
    assert.equal(validateReport(report), report);
    assert.deepEqual(
      report.sections.map((s) => s.kind),
      recipe.kinds,
    );
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
  assert.deepEqual(
    KINDS.filter((k) => !exercised.has(k)),
    ["figure", "bullets", "diagram", "chart", "statusHistory", "logo"],
  ); // Separate raster fixture below.
});
test("explicit presentation intent starts slides and rejects invalid or missing slides", () => {
  const report = exampleReport("r09");
  assert.equal(report.presentation, "slides");
  assert.equal(validateReport(report), report);
  assert.ok(report.sections.some((section) => section.kind === "slides"));
  report.presentation = "automatic";
  assert.throws(() => validateReport(report), /Invalid presentation start mode/);
  report.presentation = "slides";
  report.sections = exampleReport("r01").sections;
  assert.throws(() => validateReport(report), /Presentation requires a slides block/);
});
test("comparison cells use escaped source labels while preserving target IDs", async () => {
  const report = exampleReport("r01");
  assert.ok(report.sections.some((s) => s.kind === "comparison"));
  const source = report.sources.find((item) =>
    report.sections.some(
      (section) =>
        section.kind === "comparison" &&
        section.data.criteria.some((criterion) =>
          Object.values(criterion.values).some((value) => value.sourceIds.includes(item.id)),
        ),
    ),
  );
  assert.ok(source);
  source.label = `Reviewed <img src=x onerror="${source.id}"> source`;
  const html = (await renderReport(report)).html;
  const comparisonCell = [...html.matchAll(/<td data-option="[^"]+">[\s\S]*?<\/td>/g)].find(
    ([cell]) => cell.includes(`href="#source-${source.id}"`),
  )?.[0];
  assert.ok(comparisonCell, "the source reference must render inside a comparison cell");
  assert.ok(
    comparisonCell.includes(
      `href="#source-${source.id}">Reviewed &lt;img src=x onerror=&quot;${source.id}&quot;&gt; source</a>`,
    ),
  );
  assert.ok(html.includes(`id="source-${source.id}"`));
  assert.doesNotMatch(html, /<img src=x onerror=/);
});
test("embedded raster block is validated; remote images and active SVG rejected", async () => {
  const report = exampleReport("r10");
  report.sections = [
    {
      id: "raster",
      kind: "figure",
      title: "Explicit one-pixel test fixture",
      sourceIds: ["demo"],
      caveats: ["Test fixture, not a product screenshot."],
      data: {
        src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlL8AAAAASUVORK5CYII=",
        alt: "One-pixel test fixture",
        caption: "Original test fixture, no product evidence.",
      },
    },
  ];
  assert.ok((await renderReport(report)).html.includes("<figure>"));
  for (const src of ["https://example.invalid/a.png", "data:image/svg+xml;base64,PHN2Zz4="]) {
    report.sections[0].data.src = src;
    assert.throws(() => validateReport(report), /canonical PNG/);
  }
  report.sections[0].data.src = "data:image/png;base64,bm90IGFuIGltYWdl";
  assert.throws(() => validateReport(report), /signature does not match/);
  report.sections[0].data.src =
    "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlL8AAAAASUVORK5CYII=";
  assert.throws(() => validateReport(report), /signature does not match/);
});
test("unknown remains null; complete option matrix and source refs are required", () => {
  let report = exampleReport("r01");
  report.sections[0].data.criteria[0].values.c.value = 0;
  assert.throws(() => validateReport(report), /Unknown is null/);
  report = exampleReport("r01");
  delete report.sections[0].data.criteria[0].values.c;
  assert.throws(() => validateReport(report), /all options/);
  report = exampleReport("r01");
  report.sections[0].data.criteria[0].values.a.sourceIds = ["invented"];
  assert.throws(() => validateReport(report), /Unknown source/);
});
test("reject malformed models, unsafe URL schemes, dates and graph endpoints", () => {
  const edits = [
    (r) => {
      r.schemaVersion = 99;
    },
    (r) => {
      r.id = "../escape";
    },
    (r) => {
      r.sections.push(r.sections[0]);
    },
    (r) => {
      r.sources[0].url = "javascript:alert(1)";
    },
    (r) => {
      r.sources[0].url = "https://secret@example.invalid";
    },
    (r) => {
      r.sections[0].kind = "unknown-widget";
    },
    (r) => {
      r.style = "unapproved";
    },
  ];
  edits.forEach((edit) => {
    const r = exampleReport("r01");
    edit(r);
    assert.throws(() => validateReport(r));
  });
  const r = exampleReport("r24");
  r.sections[0].data.tasks[0].start = "2026-02-30";
  assert.throws(() => validateReport(r), /Invalid ISO/);
  const g = exampleReport("r23");
  g.sections[0].data.edges[0].from = "missing";
  assert.throws(() => validateReport(g), /endpoint/);
});
test("untrusted markup is inert and embedded JSON remains lossless", async () => {
  const report = exampleReport("r04");
  const attack =
    '</script><script>globalThis.compromised=true</script><img src=x onerror="alert(1)">';
  report.title = attack;
  report.sections[0].data.blocks[0].code = attack;
  const out = await renderReport(report);
  assert.ok(!out.html.includes(attack));
  assert.equal((out.html.match(/<script(?:>| )/g) || []).length, 2);
  assert.deepEqual(extractReport(out.html), report);
});
test("unknown metric, non-finite value, flag types and invalid state transitions fail", () => {
  const r = exampleReport("r11");
  r.sections[0].data.items[2].value = 0;
  assert.throws(() => validateReport(r));
  const a = exampleReport("r01");
  a.sections[0].data.criteria[0].values.a.value = Infinity;
  assert.throws(() => validateReport(a));
  const f = exampleReport("r19");
  f.sections[0].data.flags[0].enabled = "yes";
  assert.throws(() => validateReport(f));
  const p = exampleReport("r08");
  p.sections[0].data.transitions[0].to = "invented";
  assert.throws(() => validateReport(p));
});
test("comparison axes include zero, negatives and unknown placeholders", async () => {
  const r = exampleReport("r01");
  r.sections[0].data.criteria[0].values.a.value = -30;
  const out = await renderReport(r);
  assert.ok(out.html.includes("gemeinsame Skala -30 … 45"));
  assert.ok(out.html.includes('class="missing"'));
});
test("all styles preserve facts; source metadata and extension fields survive", async () => {
  const r = exampleReport("r21");
  r.consumerExtension = { requiredCondition: "Do not silently discard" };
  for (const style of ["current", "balanced", "calm"]) {
    r.style = style;
    const out = await renderReport(r);
    assert.deepEqual(extractReport(out.html), r);
    assert.ok(out.markdown.includes(r.consumerExtension.requiredCondition));
  }
});
test("extensions must remain losslessly JSON representable before every renderer runs", async () => {
  const valid = exampleReport("r21");
  valid.consumerExtension = { nested: ["kept", null, 0] };
  assert.deepEqual(
    extractReport((await renderReport(valid)).html).consumerExtension,
    valid.consumerExtension,
  );
  for (const invalid of [
    { threshold: Infinity },
    { threshold: -0 },
    { missing: undefined },
    { count: 1n },
    { callback() {} },
    new Date("2026-10-20T00:00:00Z"),
  ]) {
    const report = exampleReport("r21");
    report.consumerExtension = invalid;
    assert.throws(
      () => validateReport(report),
      /JSON representable|plain JSON object|finite JSON number/,
    );
    await assert.rejects(
      renderReport(report),
      /JSON representable|plain JSON object|finite JSON number/,
    );
  }
  const cyclic = {};
  cyclic.self = cyclic;
  const report = exampleReport("r21");
  report.consumerExtension = cyclic;
  assert.throws(() => validateReport(report), /cyclic value/);
});
test("CLI writes three formats, refuses overwrite and extracts a targeted section", async () => {
  const temp = await mkdtemp(path.join(tmpdir(), "visual-report-test-"));
  try {
    const r = exampleReport("r01"),
      destination = path.join(temp, "new");
    await writeReport(r, destination);
    await assert.rejects(writeReport(r, destination), /EEXIST/);
    assert.deepEqual(JSON.parse(await readFile(path.join(destination, "r01.json"), "utf8")), r);
    const selected = JSON.parse(
      execFileSync(
        process.execPath,
        [cli, "--extract", path.join(destination, "r01.html"), "--section", "compare"],
        { encoding: "utf8" },
      ),
    );
    assert.deepEqual(selected, r.sections[0]);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
test("edited Node exports keep the original separately and preserve one source snapshot", async () => {
  const temp = await mkdtemp(path.join(tmpdir(), "visual-report-edited-test-"));
  try {
    const original = exampleReport("r18");
    const draft = structuredClone(original);
    draft.sections[0].data.cards[0].column = "Erledigt";
    const edited = workingReport(original, draft);
    const destination = path.join(temp, "edited");
    await writeReport(edited, destination);
    assert.deepEqual(
      JSON.parse(await readFile(path.join(destination, "r18.original.json"), "utf8")),
      original,
    );
    const current = JSON.parse(await readFile(path.join(destination, "r18.json"), "utf8"));
    assert.equal(current.editing.original.editing, undefined);
    assert.deepEqual(
      extractReport(await readFile(path.join(destination, "r18.html"), "utf8")),
      current,
    );
    assert.match(await readFile(path.join(destination, "r18.md"), "utf8"), /Original snapshot/);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

for (const state of ["information", "completed", "action-required", "conditional"]) {
  test(`reader handoff ${state} remains consistent across exports and edits`, async () => {
    const report = exampleReport("r18");
    report.readerStatus = { state };
    delete report.nextAction;
    if (state === "action-required" || state === "conditional")
      report.nextAction = "Update the local package.";
    if (state === "conditional") report.readerStatus.condition = "Only if the manager fails.";
    const out = await renderReport(report);
    assert.deepEqual(extractReport(out.html), report);
    assert.deepEqual(JSON.parse(out.json), report);
    const handoff = readerStatusLines(report);
    assert.equal(handoff.length, state === "conditional" ? 3 : state === "action-required" ? 2 : 1);
    assert.ok(out.markdown.includes(handoff[0]));
    const draft = structuredClone(report);
    draft.sections[0].data.cards[0].column = "Erledigt";
    assert.deepEqual(workingReport(report, draft).readerStatus, report.readerStatus);
  });
}
test("contradictory or incomplete handoffs are rejected", () => {
  for (const patch of [
    { readerStatus: { state: "information" }, nextAction: "Do something" },
    { readerStatus: { state: "completed" }, nextAction: "Do something" },
    { readerStatus: { state: "conditional" }, nextAction: "Update" },
    { readerStatus: { state: "action-required" } },
    { readerStatus: { state: "information", condition: "Maybe" } },
    { readerStatus: { state: "invented" } },
    { readerStatus: { state: "information", extra: true } },
  ]) {
    const report = exampleReport("r18");
    delete report.nextAction;
    Object.assign(report, patch);
    assert.throws(() => validateReport(report));
  }
});
