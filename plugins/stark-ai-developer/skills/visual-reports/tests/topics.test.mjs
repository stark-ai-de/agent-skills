// SPDX-License-Identifier: Apache-2.0
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderReport, validateReport, extractReport } from "../scripts/render-report.mjs";
import { starter } from "../scripts/lib/templates.mjs";
import { parseMarkdown } from "../scripts/lib/markdown-input.mjs";
import { exampleReport } from "../assets/report-recipes.mjs";

test("v2 starts with one topic at a time and keeps full exports", async () => {
  const report = starter({ id: "topic-test" });
  delete report.presentation;
  const { html, json, markdown } = await renderReport(report);
  assert.match(html, /class="topic-guide"/);
  assert.equal((html.match(/class="topic-panel"/g) ?? []).length, report.sections.length);
  assert.equal((html.match(/class="topic-radio"/g) ?? []).length, report.sections.length);
  assert.match(html, /class="topic-slider"/);
  for (const section of report.sections) {
    assert.ok(html.includes(`id="block-${section.id}"`));
    assert.ok(markdown.includes(section.title));
  }
  assert.deepEqual(extractReport(html), report);
  assert.deepEqual(JSON.parse(json), report);
});

test("explicit topics group ordered sections without losing content or escaping", async () => {
  const report = starter({ id: "topic-groups" });
  report.presentation = "topics";
  report.topics = [
    {
      id: "evidence",
      title: "Evidence & <limits>",
      shortTitle: "Evidence",
      sectionIds: ["section-1", "section-2"],
    },
    { id: "action", title: "Next action", sectionIds: ["section-3"] },
  ];
  const { html, json } = await renderReport(report);
  assert.equal((html.match(/class="topic-panel"/g) ?? []).length, 2);
  assert.match(html, /Evidence &amp; &lt;limits&gt;/);
  assert.doesNotMatch(html, /Evidence & <limits>/);
  assert.deepEqual(extractReport(html), report);
  assert.deepEqual(JSON.parse(json), report);
  for (const section of report.sections) assert.ok(html.includes(`id="block-${section.id}"`));
});

test("topic grouping rejects missing, duplicate, reordered and unknown sections", () => {
  const base = starter({ id: "topic-invalid" });
  const bad = (topics) => {
    const report = structuredClone(base);
    report.topics = topics;
    return report;
  };
  const topic = (sectionIds) => [{ id: "one", title: "One", sectionIds }];
  for (const ids of [
    ["section-1", "section-2"],
    ["section-1", "section-1", "section-2", "section-3"],
    ["section-2", "section-1", "section-3"],
    ["section-1", "unknown", "section-3"],
  ])
    assert.throws(() => validateReport(bad(topic(ids))), /topics/);
  assert.throws(
    () => validateReport(bad([{ id: "x", title: "", sectionIds: ["section-1"] }])),
    /topic/,
  );
});

test("topic identifiers cannot collide with radio or page identifiers", async () => {
  const report = starter({ id: "topic-prefixes" });
  report.topics = [
    { id: "x", title: "One", sectionIds: ["section-1", "section-2"] },
    { id: "select-x", title: "Two", sectionIds: ["section-3"] },
  ];
  const { html } = await renderReport(report);
  for (const id of [
    "topic-select-x",
    "topic-page-x",
    "topic-select-select-x",
    "topic-page-select-x",
  ]) {
    assert.equal(html.split(`id="${id}"`).length - 1, 1, id);
  }
});

test("reading and legacy slides retain their existing presentation", async () => {
  const reading = starter({ id: "reading-test" });
  reading.presentation = "reading";
  assert.doesNotMatch((await renderReport(reading)).html, /class="topic-guide"/);
  const legacy = exampleReport("r09");
  assert.equal(legacy.presentation, "slides");
  assert.doesNotMatch((await renderReport(legacy)).html, /class="topic-guide"/);
});

test("Markdown authors can group sections and select reading explicitly", async () => {
  const sample = await readFile(
    new URL("../assets/completion-example.md", import.meta.url),
    "utf8",
  );
  const withTopics = sample.replace(
    "::takeaway[",
    '::topic{id="overview" title="Overview" short="Start" sections="summary,latency"}\n::topic{id="details" title="Details" sections="capacity,cost,flow,schedule,observations"}\n::takeaway[',
  );
  const report = parseMarkdown(withTopics);
  assert.deepEqual(
    report.topics.map((topic) => topic.sectionIds.length),
    [2, 5],
  );
  assert.equal(report.topics[0].shortTitle, "Start");
  assert.equal((await renderReport(report)).html.match(/class="topic-panel"/g).length, 2);
  const reading = parseMarkdown(
    sample.replace('profile="code"', 'profile="code" presentation="reading"'),
  );
  assert.equal(reading.presentation, "reading");
  assert.doesNotMatch((await renderReport(reading)).html, /class="topic-guide"/);
});

test("the skill invocation prompt requests the same topic and graphic order", async () => {
  const metadata = await readFile(new URL("../agents/openai.yaml", import.meta.url), "utf8");
  const prompt = metadata
    .split("\n")
    .find((line) => line.trimStart().startsWith("default_prompt:"));
  assert.match(prompt, /Visual Reports/);
  assert.match(prompt, /one topic visible at a time/);
  assert.match(prompt, /graphic above concise bullets/);
  assert.doesNotMatch(prompt, /diagrams below/);
});
