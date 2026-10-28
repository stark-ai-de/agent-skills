// Explicit temporary fixture writes only. SPDX-License-Identifier: Apache-2.0
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { parseMarkdown } from "./lib/markdown-input.mjs";
import { renderReport } from "./render-report.mjs";
import { publishRevision } from "./lib/report-store.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const example = path.join(here, "../assets/completion-example.md");
const directory = await mkdtemp(path.join(tmpdir(), "report-benchmark-"));
try {
  let t = performance.now();
  execFileSync(process.execPath, [
    path.join(here, "render-report.mjs"),
    "--input",
    example,
    "--output",
    path.join(directory, "cold"),
  ]);
  const coldMs = performance.now() - t;
  const report = parseMarkdown(await readFile(example, "utf8")),
    render = [],
    update = [];
  for (let i = 0; i < 5; i++) await renderReport(report);
  let current = await publishRevision(report, path.join(directory, "store"));
  for (let i = 0; i < 50; i++) {
    t = performance.now();
    await renderReport(report);
    render.push(performance.now() - t);
    t = performance.now();
    current = await publishRevision(report, path.join(directory, "store"), {
      expected: current.revision,
    });
    update.push(performance.now() - t);
  }
  const p95 = (values) =>
    Number(values.sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1].toFixed(2));
  const result = {
    fixture: "completion-example.md (7 mixed sections, automatic diagram layout)",
    samples: 50,
    coldProcessMs: Number(coldMs.toFixed(2)),
    warmRenderP95Ms: p95(render),
    warmUpdateP95Ms: p95(update),
    excludedUnmeasured: ["model generation", "research", "initial asset retrieval"],
    runtime: process.version,
    platform: process.platform,
  };
  console.log(JSON.stringify(result, null, 2));
  if (result.warmRenderP95Ms >= 1000 || result.warmUpdateP95Ms >= 1000) process.exitCode = 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
