// Opt-in checks against a caller-owned, isolated Chromium CDP endpoint.
// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { renderReport } from "../scripts/render-report.mjs";
import { parseMarkdown } from "../scripts/lib/markdown-input.mjs";
import { exampleReport } from "../assets/report-recipes.mjs";

const endpoint = new URL(process.argv[2] ?? "invalid:");
assert.ok(endpoint.protocol === "ws:" && ["127.0.0.1", "localhost"].includes(endpoint.hostname));
const report = parseMarkdown(
  await readFile(new URL("../assets/completion-example.md", import.meta.url), "utf8"),
);
const comparison = exampleReport("r01");
report.sections.push(comparison.sections.find((section) => section.kind === "comparison"));
report.sources.push(...comparison.sources);
report.topics = [
  { id: "start", title: "Ergebnis", shortTitle: "Start", sectionIds: ["summary"] },
  { id: "metrics", title: "Messwerte", shortTitle: "Werte", sectionIds: ["latency", "capacity"] },
  { id: "cost", title: "Kosten", sectionIds: ["cost"] },
  { id: "flow", title: "Datenfluss", shortTitle: "Ablauf", sectionIds: ["flow", "schedule"] },
  { id: "review", title: "Prüfung", sectionIds: ["observations", "compare"] },
];
const rendered = await renderReport(report);
const directory = await mkdtemp(path.join(tmpdir(), "visual-report-topics-"));
const reportPath = path.join(directory, "report.html");
await writeFile(reportPath, rendered.html);
const url = pathToFileURL(reportPath).href;
const ungrouped = structuredClone(report);
delete ungrouped.topics;
const manyPath = path.join(directory, "many-topics.html");
await writeFile(manyPath, (await renderReport(ungrouped)).html);
const manyUrl = pathToFileURL(manyPath).href;
const socket = new WebSocket(endpoint);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let sequence = 0,
  target,
  session;
const pending = new Map(),
  errors = [],
  external = [];
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === "Runtime.exceptionThrown")
    errors.push(message.params.exceptionDetails.text);
  if (message.method === "Network.requestWillBeSent" && /^https?:/.test(message.params.request.url))
    external.push(message.params.request.url);
  if (pending.has(message.id)) {
    const entry = pending.get(message.id);
    pending.delete(message.id);
    clearTimeout(entry.timeout);
    message.error ? entry.reject(Error(message.error.message)) : entry.resolve(message.result);
  }
});
function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++sequence,
      timeout = setTimeout(() => {
        pending.delete(id);
        reject(Error(`CDP timeout: ${method}`));
      }, 12000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}
try {
  target = await send("Target.createTarget", { url: "about:blank" });
  ({ sessionId: session } = await send("Target.attachToTarget", {
    targetId: target.targetId,
    flatten: true,
  }));
  const page = (method, params = {}) => send(method, params, session);
  const evaluate = async (expression) => {
    const result = await page("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  async function navigate(href) {
    const result = await page("Page.navigate", { url: href });
    assert.ok(!result.errorText, result.errorText);
    for (let i = 0; i < 100; i++) {
      if (
        await evaluate(
          `document.readyState === 'complete' && location.href === ${JSON.stringify(href)}`,
        )
      )
        return;
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    throw Error("Report load timeout");
  }
  async function click(selector) {
    await evaluate(
      `document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`,
    );
    const point = await evaluate(
      `(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height}})()`,
    );
    assert(point.w > 0 && point.h > 0, `Control is not visible: ${selector}`);
    await page("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: point.x,
      y: point.y,
      button: "left",
      clickCount: 1,
    });
    await page("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: point.x,
      y: point.y,
      button: "left",
      clickCount: 1,
    });
  }
  async function press(key, keyCode) {
    await page("Input.dispatchKeyEvent", {
      type: "keyDown",
      key,
      code: key,
      windowsVirtualKeyCode: keyCode,
    });
    await page("Input.dispatchKeyEvent", {
      type: "keyUp",
      key,
      code: key,
      windowsVirtualKeyCode: keyCode,
    });
  }
  async function state() {
    return evaluate(
      `(()=>({visible:[...document.querySelectorAll('.topic-panel')].filter(x=>getComputedStyle(x).display!=='none').map(x=>x.id), checked:document.querySelector('.topic-radio:checked')?.dataset.topicId, slider:document.querySelector('.topic-slider').value,sliderHidden:document.querySelector('.topic-slider').hidden,position:[...document.querySelectorAll('.topic-position')].filter(x=>getComputedStyle(x).display!=='none').map(x=>x.textContent),hash:location.hash}))()`,
    );
  }
  await page("Page.enable");
  await page("Runtime.enable");
  await page("Network.enable");
  await page("Network.emulateNetworkConditions", {
    offline: true,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  await page("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await navigate(url);
  for (let i = 0; i < report.topics.length; i++) {
    const topic = report.topics[i];
    await click(`.topic-tabs label[for="topic-select-${topic.id}"]`);
    const actual = await state();
    assert.deepEqual(actual.visible, [`topic-page-${topic.id}`]);
    assert.equal(actual.checked, topic.id);
    assert.equal(actual.slider, String(i + 1));
    assert.deepEqual(actual.position, [`${i + 1} / 5`]);
    if (i) assert.equal(actual.hash, `#topic-page-${topic.id}`);
    assert.equal(actual.sliderHidden, false);
  }
  await click('.topic-tabs label[for="topic-select-start"]');
  await page("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 480,
    deviceScaleFactor: 1,
    mobile: false,
  });
  assert.equal(
    await evaluate(
      `document.querySelector('.topic-controls [data-topic-step="0"][aria-disabled="true"]')?.checkVisibility()`,
    ),
    true,
  );
  await click('.topic-controls label[data-topic-step="0"]');
  assert.equal((await state()).checked, "metrics");
  const guideTop = await evaluate(
    "document.querySelector('.topic-guide').getBoundingClientRect().top",
  );
  assert.ok(Math.abs(guideTop) <= 2, `next topic starts at the top: ${guideTop}`);
  await click('.topic-controls label[data-topic-step="1"][for="topic-select-start"]');
  assert.equal((await state()).checked, "start");
  await evaluate(`document.querySelector('.topic-controls label[data-topic-step="0"]').focus()`);
  await press("Enter", 13);
  assert.equal((await state()).checked, "metrics");
  await evaluate(`document.querySelector('#topic-select-start').focus()`);
  await press("ArrowRight", 39);
  assert.equal((await state()).checked, "metrics");
  await evaluate(`document.querySelector('.topic-slider').focus()`);
  await press("End", 35);
  assert.equal((await state()).checked, "review");
  assert.equal(
    await evaluate(
      `document.querySelector('.topic-controls [data-topic-step="4"][aria-disabled="true"]')?.checkVisibility()`,
    ),
    true,
  );
  await evaluate(`location.hash='#block-capacity'`);
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal((await state()).checked, "metrics");
  const captured = await evaluate(`window.visualReportView.capture()`);
  await click('.topic-tabs label[for="topic-select-review"]');
  await evaluate(`window.visualReportView.restore(${JSON.stringify(captured)})`);
  assert.equal((await state()).checked, "metrics", "managed preview restores selected topic");
  for (const width of [650, 390, 320]) {
    await page("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await click('.topic-tabs label[for="topic-select-review"]');
    const layout = await evaluate(
      `(()=>{const nav=document.querySelector('.topic-tabs'),table=document.querySelector('#block-compare table'),region=table.closest('.scroll');return {page:document.documentElement.scrollWidth>innerWidth+1,nav:nav.scrollWidth>nav.clientWidth+1,table:region.scrollWidth>region.clientWidth+1,labels:[...nav.querySelectorAll('label')].every(x=>x.scrollWidth<=x.clientWidth+1),visible:[...document.querySelectorAll('.topic-panel')].filter(x=>getComputedStyle(x).display!=='none').length}})()`,
    );
    assert.deepEqual(
      layout,
      { page: false, nav: false, table: false, labels: true, visible: 1 },
      `width ${width}`,
    );
  }
  await page("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await click('.topic-tabs label[for="topic-select-review"]');
  if (process.env.REPORT_TOPIC_COMPARISON_SCREENSHOT) {
    const comparisonScreenshot = await page("Page.captureScreenshot", { format: "png" });
    await writeFile(
      process.env.REPORT_TOPIC_COMPARISON_SCREENSHOT,
      Buffer.from(comparisonScreenshot.data, "base64"),
    );
  }
  await click('.topic-tabs label[for="topic-select-flow"]');
  assert.equal(
    await evaluate(
      `document.querySelector('#topic-page-flow [data-kind="diagram"] img').getBoundingClientRect().width > 0`,
    ),
    true,
  );
  const screenshot = await page("Page.captureScreenshot", { format: "png" });
  if (process.env.REPORT_TOPIC_SCREENSHOT)
    await writeFile(process.env.REPORT_TOPIC_SCREENSHOT, Buffer.from(screenshot.data, "base64"));
  await page("Emulation.setEmulatedMedia", { media: "print" });
  assert.equal(
    await evaluate(
      `[...document.querySelectorAll('.topic-panel')].filter(x=>getComputedStyle(x).display!=='none').length`,
    ),
    5,
  );
  await page("Emulation.setEmulatedMedia", { media: "screen" });
  await page("Emulation.setDeviceMetricsOverride", {
    width: 320,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await evaluate("document.documentElement.style.fontSize='30px'");
  assert.equal(
    await evaluate("document.documentElement.scrollWidth > innerWidth + 1"),
    false,
    "320px at 200% text size",
  );
  await evaluate("document.documentElement.style.fontSize=''");
  await navigate(manyUrl);
  await evaluate("document.documentElement.style.fontSize='30px'");
  const many = await evaluate(
    `(()=>{const guide=document.querySelector('.topic-guide'),nav=guide.querySelector('.topic-tabs'),main=guide.querySelector('main'),checked=guide.querySelector('.topic-radio:checked'),label=nav.querySelector('label[for="'+checked.id+'"]'),lr=label.getBoundingClientRect(),mr=main.getBoundingClientRect();return {sidebar:guide.dataset.sidebar,labels:[...nav.querySelectorAll('label')].filter(x=>x.getClientRects().length>0).length,overflow:document.documentElement.scrollWidth>innerWidth+1,join:Math.abs(lr.right-mr.left)<=2,border:getComputedStyle(label).borderRightColor,surface:getComputedStyle(main).backgroundColor}})()`,
  );
  assert.equal(many.sidebar, "true");
  assert.equal(many.labels, ungrouped.sections.length);
  assert.equal(many.overflow, false);
  assert.equal(many.join, true);
  assert.equal(many.border, many.surface);
  for (const section of ungrouped.sections) {
    await click(`.topic-tabs label[for="topic-select-${section.id}"]`);
    const joined = await evaluate(
      `(()=>{const nav=document.querySelector('.topic-tabs'),main=document.querySelector('.topic-guide main'),radio=document.querySelector('.topic-radio:checked'),label=nav.querySelector('label[for="'+radio.id+'"]'),a=label.getBoundingClientRect(),b=main.getBoundingClientRect();return Math.abs(a.right-b.left)<=2 && a.top>=b.top-1 && a.bottom<=b.bottom+1 && getComputedStyle(label).borderRightColor===getComputedStyle(main).backgroundColor})()`,
    );
    assert.equal(joined, true, `connected side tab: ${section.id}`);
  }
  await evaluate("document.documentElement.style.fontSize=''");
  await navigate(url);
  await click('.topic-tabs label[for="topic-select-review"]');
  assert.equal(
    await evaluate("window.visualReportView.isDirty()"),
    false,
    "navigation does not change the report",
  );
  await evaluate(`(() => {
    window.__topicDownloads=[]; window.__topicBlobs=new Map();
    const create=URL.createObjectURL.bind(URL);
    URL.createObjectURL=(blob)=>{const url=create(blob);window.__topicBlobs.set(url,blob);return url};
    HTMLAnchorElement.prototype.click=function(){if(this.download) window.__topicDownloads.push(window.__topicBlobs.get(this.href).text())};
    document.getElementById('export-draft').click();
  })()`);
  const exported = (await evaluate(`Promise.all(window.__topicDownloads)`))[0];
  assert(exported?.startsWith("<!doctype html>"));
  const exportedPath = path.join(directory, "exported.html");
  await writeFile(exportedPath, exported);
  await page("Emulation.setScriptExecutionDisabled", { value: true });
  await navigate(pathToFileURL(exportedPath).href);
  assert.deepEqual((await state()).visible, ["topic-page-start"]);
  assert.equal((await state()).sliderHidden, true);
  await click('.topic-tabs label[for="topic-select-review"]');
  assert.deepEqual((await state()).visible, ["topic-page-review"]);
  await click('.topic-tabs label[for="topic-select-flow"]');
  await click('#block-flow a[href="#source-fixture"]');
  assert.equal(
    await evaluate("document.querySelector('.source-catalog').open"),
    true,
    "source links reveal their evidence without JavaScript",
  );
  assert.equal(
    await evaluate(`document.querySelectorAll('main [data-section-index]').length`),
    report.sections.length,
  );
  assert.deepEqual(
    await evaluate(`JSON.parse(document.getElementById('report-data').textContent)`),
    report,
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  assert.equal(external.length, 0, "standalone topic report is offline");
  console.log(
    JSON.stringify({
      topics: 5,
      tabsAndArrows: "pass",
      sliderAndKeyboard: "pass",
      deepLinkAndRestore: "pass",
      responsive: [650, 390, 320],
      noJsAndOffline: "pass",
      printAndData: "pass",
      browserExceptions: 0,
    }),
  );
} finally {
  if (target) await send("Target.closeTarget", { targetId: target.targetId }).catch(() => {});
  socket.close();
  await rm(directory, { recursive: true, force: true });
}
