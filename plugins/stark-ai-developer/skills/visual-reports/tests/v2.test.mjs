// SPDX-License-Identifier: Apache-2.0
import test from "node:test";
import http from "node:http";
import assert from "node:assert/strict";
import { readFile, mkdtemp, rm, writeFile, symlink, readdir, lstat, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { renderReport, validateReport, extractReport } from "../scripts/render-report.mjs";
import { parseMarkdown } from "../scripts/lib/markdown-input.mjs";
import { starter, templates, profiles } from "../scripts/lib/templates.mjs";
import { CHART_TYPES, validateSvg } from "../scripts/lib/blocks-v2.mjs";
import {
  publishRevision,
  currentRevision,
  readRevision,
  history,
} from "../scripts/lib/report-store.mjs";
import { serveReport } from "../scripts/lib/preview.mjs";
import { exampleReport } from "../assets/report-recipes.mjs";
import { workingReport } from "../scripts/lib/report-state.mjs";
const markdown = await readFile(
  new URL("../assets/completion-example.md", import.meta.url),
  "utf8",
);
const example = () => parseMarkdown(markdown);
const section = (model, id) => model.sections.find((s) => s.id === id);

test("all eight templates and five domain profiles render, without fabricated values", async () => {
  assert.equal(Object.keys(templates).length, 8);
  assert.equal(Object.keys(profiles).length, 5);
  for (const type of Object.keys(templates))
    for (const profile of Object.keys(profiles)) {
      const report = starter({ type, profile });
      const out = await renderReport(report);
      assert.deepEqual(extractReport(out.html), report);
      assert.match(out.html, /Nächster Schritt/);
      assert.match(out.markdown, /Unbefülltes Startermodell/);
    }
  assert.throws(() => starter({ type: "invented" }));
});
test("Markdown and JSON share validation and identical full outputs", async () => {
  const report = example();
  assert.deepEqual(
    await renderReport(report),
    await renderReport(JSON.parse(JSON.stringify(report))),
  );
  const out = await renderReport(report);
  assert.deepEqual(extractReport(out.html), report);
  assert.equal(JSON.parse(out.json).sections.length, 7);
  assert.match(out.markdown, /delta Cache: -180 EUR/);
  assert.match(out.markdown, /\+~X\?/);
  assert.match(out.markdown, /Keine zeitgewichtete Verfügbarkeit/);
  assert.match(out.html, /1 \/ 3 bekannte Stichproben gesund/);
  const svg = Buffer.from(
    out.html.match(/data:image\/svg\+xml;base64,([^"]+)/)[1],
    "base64",
  ).toString();
  assert.ok(!svg.includes("@import"));
  assert.ok(!svg.includes("fonts.googleapis"));
  assert.match(svg, /Client/);
});
test("Markdown cannot silently discard prose, columns, values, directives or MDX", () => {
  for (const [before, after] of [
    ["# Release-Review", "<script>alert(1)</script>\n\n# Release-Review"],
    ["::next[", "::unrecognized["],
    ['type="review"', 'type="review" unexpected="lost"'],
    ["| series | value |", "| series | hidden |"],
    ["| 240 |", "| 240ms |"],
    ["| after | 150 |", "| before | 150 |"],
    ["- Latenz fällt", "Unwrapped prose\n\n- Latenz fällt"],
    ["| fictional | fixture | gleicher Test |", "| unknown | fixture | gleicher Test |"],
  ])
    assert.throws(
      () => parseMarkdown(markdown.replace(before, after)),
      /Markdown|invalid|unknown is null/,
    );
  assert.throws(() => parseMarkdown(markdown + "\nexport const x = 1"));
  const bold = parseMarkdown(
    markdown.replace("**never present**", "ignored").replace("240 |", "**240** |"),
  );
  assert.equal(section(bold, "latency").data.rows[0].values[0].value, 240);
  assert.equal(section(bold, "latency").data.rows[0].values[0].state, "fictional");
});
test("all chart types include signed, zero and explicit missing data without NaN", async () => {
  const report = example();
  const base = section(report, "latency");
  for (const type of CHART_TYPES.filter((t) => t !== "waterfall")) {
    const data = structuredClone(base.data);
    data.type = type;
    data.rows = [
      {
        id: "negative",
        label: "Negative",
        x: 0,
        values: [
          { value: -5, state: "measured", note: "actual", sourceIds: ["fixture"] },
          { value: 0, state: "planned", note: "zero target", sourceIds: ["fixture"] },
        ],
      },
      {
        id: "positive",
        label: "Positive",
        x: 5,
        values: [
          { value: 12, state: "measured", note: "", sourceIds: ["fixture"] },
          { value: null, state: "unknown", note: "gap", sourceIds: [] },
        ],
      },
      {
        id: "later",
        label: "Later",
        x: 12,
        values: [
          { value: 2, state: "measured", note: "", sourceIds: ["fixture"] },
          { value: 4, state: "measured", note: "", sourceIds: ["fixture"] },
        ],
      },
    ];
    if (["line", "scatter"].includes(type)) data.xUnit = "day";
    else data.rows.forEach((r) => delete r.x);
    report.sections = [{ ...base, data }];
    const out = await renderReport(report);
    assert.ok(!/NaN|Infinity/.test(out.html));
    assert.match(out.html, /Unbekannt/);
    assert.deepEqual(extractReport(out.html), report);
  }
});
test("waterfall validates totals and missing contributions; targets retain overshoots", async () => {
  const report = example();
  const bad = structuredClone(report);
  section(bad, "cost").data.rows.at(-1).values[0].value = 881;
  assert.throws(() => validateReport(bad), /total disagrees/);
  section(bad, "cost").data.rows.at(-1).values[0].value = null;
  assert.throws(() => validateReport(bad), /waterfall cannot/);
  const out = await renderReport(report);
  assert.match(out.html, /Ist 600 \/ Ziel 500 MiB/);
});
test("line gaps break paths; irregular x positions use actual numeric scale", async () => {
  const report = example(),
    s = section(report, "latency");
  s.data = {
    ...s.data,
    type: "line",
    xUnit: "h",
    series: [{ id: "a", label: "Observed" }],
    rows: [0, 1, 10].map((x, i) => ({
      id: `r-${i}`,
      label: `t${x}`,
      x,
      values: [
        {
          value: i === 1 ? null : 4,
          state: i === 1 ? "unknown" : "measured",
          note: "",
          sourceIds: [],
        },
      ],
    })),
  };
  report.sections = [s];
  const out = await renderReport(report),
    svg = out.html.match(/<svg class="data-chart"[\s\S]*?<\/svg>/)[0];
  assert.equal((svg.match(/<line /g) ?? []).length, 1, "only zero baseline, no bridging gap");
  assert.match(svg, /cx="65"/);
  assert.match(svg, /cx="695"/);
  s.data.rows[2].x = 0;
  assert.throws(() => validateReport(report), /line x must increase/);
});
test("unknown statuses, unordered dates and unsafe diagrams fail; supported families render", async () => {
  const report = example();
  section(report, "observations").data.samples[1].at = "2026-02-30T00:00:00Z";
  assert.throws(() => validateReport(report), /timestamps/);
  for (const source of [
    "flowchart LR\n A --> B",
    "sequenceDiagram\n Alice->>Bob: Hello\n Bob-->>Alice: Received",
    "stateDiagram-v2\n [*] --> Active\n Active --> [*]",
    "classDiagram\n Animal <|-- Duck",
    "erDiagram\n CUSTOMER ||--o{ ORDER : places",
  ]) {
    const r = example();
    r.sections = [section(r, "flow")];
    r.sections[0].data.source = source;
    assert.match((await renderReport(r)).html, /data:image\/svg\+xml;base64/);
  }
  for (const source of [
    'flowchart LR\nclick A "https://example.com"',
    "%%{init:{}}%%\ngraph TD\nA-->B",
    "flowchart LR\nA[<script>x</script>]",
  ]) {
    const r = example();
    section(r, "flow").data.source = source;
    assert.throws(() => validateReport(r));
  }
});
test("reviewed logos preserve bytes and provenance; active SVG and digest mismatch fail", async () => {
  const r = starter(),
    svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10H0z"/></svg>';
  const data = {
    label: "Synthetic mark",
    alt: "Synthetic square, not a product logo",
    src: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    sourceUrl: "https://example.org/mark.svg",
    identityUrl: "https://example.org/",
    retrievedAt: "2026-10-20T10:00:00Z",
    reviewed: true,
    sha256: createHash("sha256").update(svg).digest("hex"),
  };
  r.sections = [
    {
      id: "logo",
      title: "Synthetic asset fixture",
      kind: "logo",
      caveats: [],
      sourceIds: [],
      data,
    },
  ];
  assert.deepEqual(extractReport((await renderReport(r)).html), r);
  data.sha256 = "0".repeat(64);
  assert.throws(() => validateReport(r), /checksum/);
  assert.throws(() => validateSvg('<svg><image href="https://example.org/a"/></svg>'));
  assert.throws(() => validateSvg('<svg><animate attributeName="href"/></svg>'));
  assert.doesNotThrow(() =>
    validateSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"/></defs><rect fill="url(#g)"/></svg>',
    ),
  );
  assert.throws(() =>
    validateSvg('<svg xmlns="http://www.w3.org/2000/svg" xmlns:x="urn:svg"><x:script/></svg>'),
  );
  assert.throws(() =>
    validateSvg(String.raw`<svg><rect style="fill:u\72l(https://example.org/a)"/></svg>`),
  );
  assert.throws(() => validateSvg('<!DOCTYPE svg [<!ENTITY x "y">]><svg/>'));
});
test("managed snapshots reject stale writers and preserve complete revision history", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "report-store-test-"));
  try {
    const report = example(),
      first = await publishRevision(report, directory);
    const old = await readRevision(directory, first.revision);
    report.takeaway = "Updated";
    const writes = await Promise.allSettled([
      publishRevision(report, directory, { expected: first.revision }),
      publishRevision(report, directory, { expected: first.revision }),
    ]);
    assert.equal(writes.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(writes.filter((r) => r.status === "rejected").length, 1);
    assert.deepEqual(await readRevision(directory, first.revision), old);
    assert.equal((await history(directory)).length, 2);
    await assert.rejects(publishRevision(report, directory, { expected: first.revision }), /Stale/);
    await assert.rejects(publishRevision(report, directory), /Stale/);
    await assert.rejects(readRevision(directory, "../current.json"), /Invalid revision/);
    const current = await currentRevision(directory);
    const payload = await readRevision(directory, current.revision);
    assert.deepEqual(extractReport(payload.html), JSON.parse(payload.json));
    const editedOriginal = exampleReport("r18");
    const draft = structuredClone(editedOriginal);
    draft.sections[0].data.cards[0].column = "Erledigt";
    const edited = workingReport(editedOriginal, draft);
    const editedStore = path.join(directory, "edited-store");
    const editedRevision = await publishRevision(edited, editedStore);
    const editedPayload = await readRevision(editedStore, editedRevision.revision);
    assert.deepEqual(JSON.parse(editedPayload.json).editing.original, editedOriginal);
    assert.deepEqual(extractReport(editedPayload.html), JSON.parse(editedPayload.json));
    await writeFile(path.join(directory, "revisions", current.revision, "report.md"), "tampered");
    await assert.rejects(readRevision(directory, current.revision), /checksum/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("store refuses symlink destinations; preview serves actual snapshots and limits routes", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "report-preview-test-"));
  let preview;
  try {
    const store = path.join(directory, "store"),
      link = path.join(directory, "link");
    const revision = await publishRevision(example(), store);
    await symlink(store, link);
    await assert.rejects(publishRevision(example(), link), /symlink/);
    preview = await serveReport(store);
    const index = await fetch(preview.url);
    assert.equal(index.status, 200);
    assert.match(await index.text(), /Ungesicherten Entwurf verwerfen/);
    const current = await (await fetch(preview.url + "current")).json();
    assert.equal(current.revision, revision.revision);
    const page = await fetch(preview.url + `revision/${revision.revision}/report.html`);
    assert.deepEqual(extractReport(await page.text()), example());
    assert.equal((await fetch(preview.url + "current", { method: "POST" })).status, 405);
    assert.equal((await fetch(preview.url + "unknown")).status, 404);
    const forbidden = await new Promise((resolve, reject) => {
      http
        .get(preview.url, { headers: { Host: "attacker.invalid" } }, (response) => {
          response.resume();
          resolve(response.statusCode);
        })
        .on("error", reject);
    });
    assert.equal(forbidden, 403);
  } finally {
    if (preview) await preview.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("store creation rejects symlink and non-directory ancestors before writing", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "report-store-ancestors-"));
  try {
    const target = path.join(directory, "target");
    await mkdir(target);
    const sentinel = path.join(target, "sentinel.txt");
    await writeFile(sentinel, "unchanged target bytes");
    const before = { names: await readdir(target), bytes: await readFile(sentinel) };

    const link = path.join(directory, "link");
    await symlink(target, link);
    await assert.rejects(
      publishRevision(example(), path.join(link, "new-store", "nested")),
      /symlink ancestors/,
    );
    assert.deepEqual({ names: await readdir(target), bytes: await readFile(sentinel) }, before);

    const missingTarget = path.join(directory, "not-created");
    const dangling = path.join(directory, "dangling");
    await symlink(missingTarget, dangling);
    await assert.rejects(
      publishRevision(example(), path.join(dangling, "new-store")),
      /symlink ancestors/,
    );
    assert.equal((await lstat(dangling)).isSymbolicLink(), true);
    await assert.rejects(lstat(missingTarget), { code: "ENOENT" });

    const notDirectory = path.join(directory, "regular-file");
    await writeFile(notDirectory, "keep file");
    await assert.rejects(
      publishRevision(example(), path.join(notDirectory, "new-store")),
      /symlink ancestors/,
    );
    assert.equal(await readFile(notDirectory, "utf8"), "keep file");

    const nestedStore = path.join(directory, "real", "nested", "store");
    const revision = await publishRevision(example(), nestedStore);
    assert.equal((await currentRevision(nestedStore)).revision, revision.revision);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("numeric overflow and nonempty creation targets fail without data loss", async () => {
  const report = example(),
    d = section(report, "latency").data;
  d.rows[0].values[0].value = Number.MAX_VALUE;
  d.rows[0].values[1].value = -Number.MAX_VALUE;
  assert.throws(() => validateReport(report), /scale span/);
  const directory = await mkdtemp(path.join(tmpdir(), "report-nonempty-"));
  try {
    await writeFile(path.join(directory, "existing.txt"), "preserve");
    await assert.rejects(publishRevision(example(), directory), /empty report store/);
    assert.equal(await readFile(path.join(directory, "existing.txt"), "utf8"), "preserve");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("bundled parser, layout and icon bytes retain pinned integrity and notices", async () => {
  const vendor = new URL("../assets/vendor/", import.meta.url);
  const manifest = JSON.parse(await readFile(new URL("manifest.json", vendor), "utf8"));
  for (const [file, sha] of Object.entries(manifest.files))
    assert.equal(
      createHash("sha256")
        .update(await readFile(new URL(file, vendor)))
        .digest("hex"),
      sha,
    );
  assert.ok(manifest.dependencies.every((d) => d.name && d.version && d.integrity && d.license));
  const notices = await readFile(new URL("NOTICE.txt", vendor), "utf8");
  for (const name of ["beautiful-mermaid", "elkjs", "@lucide/icons", "remark-directive"])
    assert.ok(notices.includes(name));
});

test("intraday overlap preserves UTC precision, unknown progress and milestone identity", async () => {
  const report = example(),
    s = section(report, "schedule");
  s.data = {
    tasks: [
      {
        id: "test",
        label: "Test",
        owner: "Nicht angegeben",
        start: "2026-10-20T08:00:00Z",
        end: "2026-10-20T08:20:00Z",
        progress: null,
      },
      {
        id: "review",
        label: "Review",
        owner: "Nicht angegeben",
        start: "2026-10-20T08:10:00.000Z",
        end: "2026-10-20T08:30:00Z",
        progress: null,
      },
      {
        id: "finish",
        label: "Abnahme",
        owner: "Nicht angegeben",
        start: "2026-10-20T08:30:00Z",
        end: "2026-10-20T08:30:00.000Z",
        progress: null,
      },
    ],
    dependencies: [],
  };
  report.sections = [s];
  const out = await renderReport(report);
  assert.deepEqual(extractReport(out.html), report);
  const bars = [
    ...out.html.matchAll(/class="timeline-bar" style="left:([\d.]+)%;width:([\d.]+)%/g),
  ].map((match) => match.slice(1).map(Number));
  assert.equal(bars.length, 3);
  assert.ok(Math.abs(bars[0][1] - 200 / 3) < 0.00001);
  assert.ok(Math.abs(bars[1][0] - 100 / 3) < 0.00001);
  assert.ok(Math.abs(bars[1][1] - 200 / 3) < 0.00001);
  assert.deepEqual(bars[2], [100, 0]);
  assert.match(out.html, /Meilenstein/);
  assert.match(out.markdown, /Fortschritt unbekannt/);
  assert.match(out.markdown, /2026-10-20T08:10:00\.000Z -> 2026-10-20T08:30:00Z/);
  for (const invalid of [
    "2026-10-20T08:10:00",
    "2026-10-20T10:10:00+02:00",
    "2026-02-30T08:10:00Z",
    "2026-10-20",
  ]) {
    const bad = structuredClone(report);
    bad.sections[0].data.tasks[1].start = invalid;
    assert.throws(() => validateReport(bad), /UTC timestamp|mix calendar dates/);
  }
});
test("Markdown timeline retains intraday boundaries and explicit unknown progress", async () => {
  const input = `::::report{id="overlap" type="status" profile="operations"}
# UTC overlap
::takeaway[Two observations overlap.]
::next[Review the result.]
:::timeline{id="periods" title="Exact periods"}
| id | label | owner | start | end | progress | dependsOn |
| --- | --- | --- | --- | --- | --- | --- |
| test | Test | Unknown | 2026-10-20T08:00:00Z | 2026-10-20T08:20:00Z | null | |
| review | Review | Unknown | 2026-10-20T08:10:00Z | 2026-10-20T08:30:00Z | null | |
:::
::::`;
  const model = parseMarkdown(input),
    out = await renderReport(model);
  assert.equal(model.sections[0].data.tasks[1].start, "2026-10-20T08:10:00Z");
  assert.equal(model.sections[0].data.tasks[0].progress, null);
  assert.deepEqual(extractReport(out.html), model);
});
