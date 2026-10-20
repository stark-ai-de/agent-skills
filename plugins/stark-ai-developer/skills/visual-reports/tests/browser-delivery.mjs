// Opt-in test against an already-running, isolated Chromium CDP endpoint.
// Starts no browser, installs nothing; writes/removes only temporary report fixtures.
// Usage: node tests/browser-delivery.mjs ws://LOOPBACK/devtools/browser/ID
// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { writeReport } from "../scripts/render-report.mjs";
import { exampleReport, recipes } from "../assets/report-recipes.mjs";
import { parseMarkdown } from "../scripts/lib/markdown-input.mjs";
import { publishRevision } from "../scripts/lib/report-store.mjs";
import { serveReport } from "../scripts/lib/preview.mjs";

const endpoint = new URL(process.argv[2] ?? "invalid:");
assert.ok(
  endpoint.protocol === "ws:" && ["127.0.0.1", "localhost"].includes(endpoint.hostname),
  "Supply an isolated loopback CDP browser endpoint",
);
const socket = new WebSocket(endpoint);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let id = 0;
const pending = new Map(),
  requests = [],
  errors = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject, timeout } = pending.get(message.id);
    clearTimeout(timeout);
    pending.delete(message.id);
    message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
  }
  if (message.method === "Network.requestWillBeSent") requests.push(message.params.request.url);
  if (message.method === "Runtime.exceptionThrown")
    errors.push(message.params.exceptionDetails.text);
});
function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const key = ++id,
      timeout = setTimeout(() => {
        pending.delete(key);
        reject(new Error(`CDP timeout: ${method}`));
      }, 15000);
    pending.set(key, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id: key, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}
const directory = await mkdtemp(path.join(tmpdir(), "report-browser-delivery-"));
let target, preview;
try {
  target = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", {
    targetId: target.targetId,
    flatten: true,
  });
  const page = (method, params = {}) => send(method, params, sessionId);
  const evaluate = async (expression) => {
    const result = await page("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await page("Page.enable");
  await page("Runtime.enable");
  await page("Network.enable");
  await page("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  async function navigate(url) {
    await evaluate("globalThis.visualReportView?.discardDraft()");
    const result = await page("Page.navigate", { url });
    assert.ok(!result.errorText, result.errorText);
    for (let i = 0; i < 100; i++) {
      if (
        await evaluate(
          `location.href === ${JSON.stringify(url)} && document.readyState === 'complete'`,
        )
      )
        return;
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    throw new Error(`Page did not finish: ${url}`);
  }
  const mixed = parseMarkdown(
    await readFile(new URL("../assets/completion-example.md", import.meta.url), "utf8"),
  );
  const reports = [...recipes.map((r) => exampleReport(r.id)), mixed];
  const files = [];
  for (const report of reports) {
    const destination = path.join(directory, report.id);
    await writeReport(report, destination);
    files.push(pathToFileURL(path.join(destination, `${report.id}.html`)).href);
  }
  await page("Network.emulateNetworkConditions", {
    offline: true,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  let fileChecks = 0,
    noScriptChecks = 0;
  for (const disabled of [false, true]) {
    await page("Emulation.setScriptExecutionDisabled", { value: disabled });
    for (let i = 0; i < files.length; i++) {
      await navigate(files[i]);
      const state = await evaluate(`({
        enhanced:document.documentElement.classList.contains('js'),
        sections:document.querySelectorAll('main>section').length,
        overflow:document.documentElement.scrollWidth>innerWidth+1,
        caveats:document.querySelectorAll('header>.caveat').length,
        images:[...document.images].every(i=>i.complete&&i.naturalWidth>0),
        source:JSON.parse(document.getElementById('report-data').textContent),
        markdown:document.getElementById('report-markdown').textContent,
        motionDisabled:document.querySelector('[data-play]')?.disabled??null
      })`);
      assert.equal(state.enhanced, !disabled, reports[i].id);
      assert.equal(state.overflow, false, reports[i].id);
      assert.equal(state.sections, reports[i].sections.length);
      assert.ok(state.caveats && state.markdown && state.images, reports[i].id);
      assert.deepEqual(state.source, reports[i]);
      if (reports[i].id === "r07" && !disabled) assert.equal(state.motionDisabled, true);
      if (disabled) noScriptChecks++;
      else fileChecks++;
    }
  }
  assert.equal(
    requests.filter((url) => /^https?:/.test(url)).length,
    0,
    "standalone reports must request no network",
  );
  await page("Emulation.setScriptExecutionDisabled", { value: false });
  await page("Network.emulateNetworkConditions", {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  await navigate(files.at(-1));
  await page("Emulation.setDeviceMetricsOverride", {
    width: 320,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await evaluate("document.documentElement.style.fontSize='30px'");
  assert.equal(
    await evaluate("document.documentElement.scrollWidth>innerWidth+1"),
    false,
    "320px with 200% text size",
  );
  await evaluate("document.querySelector('.skip').focus()");
  await page("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
  });
  await page("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
  });
  assert.equal(await evaluate("location.hash"), "#content", "keyboard skip link");
  for (const rid of ["r18", "r19", "r20"]) {
    await navigate(files[reports.findIndex((r) => r.id === rid)]);
    const before = await evaluate("document.getElementById('report-data').textContent");
    const change =
      rid === "r18"
        ? "const e=document.querySelector('[data-card-index] select');e.selectedIndex=(e.selectedIndex+1)%e.options.length;e.dispatchEvent(new Event('change',{bubbles:true}));"
        : rid === "r19"
          ? "const e=document.querySelector('[data-enabled]');e.click();"
          : "const e=document.querySelector('[data-prompt-field=system]');e.value='Local test draft';e.dispatchEvent(new Event('input',{bubbles:true}));";
    await evaluate(change);
    assert.equal(await evaluate("window.visualReportView.isDirty()"), true, rid);
    assert.equal(
      await evaluate("document.getElementById('report-data').textContent"),
      before,
      "draft must not mutate source",
    );
  }
  const store = path.join(directory, "managed");
  const first = await publishRevision(mixed, store);
  preview = await serveReport(store);
  await navigate(preview.url);
  for (
    let i = 0;
    i < 100 &&
    !(await evaluate("!!document.querySelector('iframe').contentWindow.visualReportView"));
    i++
  )
    await new Promise((resolve) => setTimeout(resolve, 30));
  await evaluate(
    `const f=document.querySelector('iframe').contentWindow;f.document.querySelector('details').open=true;f.scrollTo(0,300);const e=f.document.getElementById('style');e.value='calm';e.dispatchEvent(new Event('change',{bubbles:true}));`,
  );
  const changed = structuredClone(mixed);
  changed.nextAction = "Second revision for browser fixture";
  const second = await publishRevision(changed, store, { expected: first.revision });
  for (
    let i = 0;
    i < 100 &&
    !(await evaluate("document.getElementById('notice').textContent.includes('Neuer Stand')"));
    i++
  )
    await new Promise((resolve) => setTimeout(resolve, 30));
  await evaluate("document.getElementById('apply').click()");
  assert.ok(
    (await evaluate("document.querySelector('iframe').src")).includes(first.revision),
    "dirty draft blocks replacement",
  );
  assert.match(
    await evaluate("document.getElementById('notice').textContent"),
    /Entwurf geschützt/,
  );
  await evaluate(
    "document.getElementById('discard').checked=true;document.getElementById('apply').click()",
  );
  for (
    let i = 0;
    i < 100 &&
    !(await evaluate(
      `document.querySelector('iframe').contentWindow.location.href.includes('${second.revision}') && !!document.querySelector('iframe').contentWindow.visualReportView`,
    ));
    i++
  )
    await new Promise((resolve) => setTimeout(resolve, 30));
  await new Promise((resolve) => setTimeout(resolve, 50));
  const restored = await evaluate(
    "({open:document.querySelector('iframe').contentDocument.querySelector('details').open,scroll:document.querySelector('iframe').contentWindow.scrollY,dirty:document.querySelector('iframe').contentWindow.visualReportView.isDirty()})",
  );
  assert.equal(restored.open, true);
  assert.ok(restored.scroll > 0);
  assert.equal(restored.dirty, false);
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    JSON.stringify(
      {
        fileChecks,
        noScriptChecks,
        fileNetworkRequests: 0,
        narrowWidth: 390,
        textZoom: "200% at 320px",
        keyboardSkipLink: "pass",
        reducedMotion: "pass",
        localEditors: "pass",
        httpPreview: "pass",
        revisionNoticeAndDraftProtection: "pass",
        restoredDetailsAndScroll: "pass",
        browserExceptions: errors.length,
      },
      null,
      2,
    ),
  );
} finally {
  if (target) await send("Target.closeTarget", { targetId: target.targetId }).catch(() => {});
  socket.close();
  if (preview) await preview.close();
  await rm(directory, { recursive: true, force: true });
}
