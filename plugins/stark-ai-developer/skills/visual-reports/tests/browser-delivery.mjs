// Opt-in test against an already-running, isolated Chromium CDP endpoint.
// Starts no browser, installs nothing; writes/removes only temporary report fixtures.
// Usage: node tests/browser-delivery.mjs ws://LOOPBACK/devtools/browser/ID
// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
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
let target, preview, pageSessionId;
try {
  target = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", {
    targetId: target.targetId,
    flatten: true,
  });
  pageSessionId = sessionId;
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
  async function captureDownloads() {
    await evaluate(`(() => {
      window.__downloads = [];
      window.__pendingDownloads = [];
      window.__downloadBlobs = new Map();
      const create = URL.createObjectURL.bind(URL);
      URL.createObjectURL = (blob) => {
        const url = create(blob);
        window.__downloadBlobs.set(url, blob);
        return url;
      };
      const click = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function() {
        if (this.download) window.__pendingDownloads.push((async () => {
          const text = await window.__downloadBlobs.get(this.href).text();
          window.__downloads.push({name: this.download, text});
        })());
        else click.call(this);
      };
    })()`);
  }
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
  const promptFixture = exampleReport("r20");
  mixed.sections.push(promptFixture.sections[0]);
  mixed.sources.push(...promptFixture.sources);
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
        toolingClosed:document.querySelector('#report-toolbox')?.open===false,
        toolingInFooter:document.querySelector('footer #export-json')!==null,
        toolingHidden:!document.querySelector('#export-json').checkVisibility(),
        sections:document.querySelectorAll('main [data-section-index]').length,
        overflow:document.documentElement.scrollWidth>innerWidth+1,
        caveats:document.querySelectorAll('header>.caveat').length,
        images:[...document.images].every(i=>i.complete&&i.naturalWidth>0),
        source:JSON.parse(document.getElementById('report-data').textContent),
        markdown:document.getElementById('report-markdown').textContent,
        motionDisabled:document.querySelector('[data-play]')?.disabled??null
      })`);
      assert.equal(state.enhanced, !disabled, reports[i].id);
      assert.equal(state.toolingClosed, true);
      assert.equal(state.toolingInFooter, true);
      assert.equal(state.toolingHidden, true);
      if (!disabled) {
        assert.equal(
          await evaluate(`(() => {
          document.querySelector('#report-toolbox').open = true;
          const visible = document.querySelector('#export-json').checkVisibility();
          document.querySelector('#report-toolbox').open = false;
          return visible;
        })()`),
          true,
        );
      }
      assert.equal(state.overflow, false, reports[i].id);
      assert.equal(state.sections, reports[i].sections.length);
      assert.ok(state.caveats && state.markdown && state.images, reports[i].id);
      assert.deepEqual(state.source, reports[i]);
      if (reports[i].id === "r07" && !disabled) assert.equal(state.motionDisabled, true);
      if (disabled) noScriptChecks++;
      else fileChecks++;
    }
  }
  await page("Emulation.setScriptExecutionDisabled", { value: false });
  await navigate(files.at(-1));
  const reducedMotion = [{ name: "prefers-reduced-motion", value: "reduce" }];
  try {
    await page("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const layout = await evaluate(`(() => {
      const box = (selector) => {
        const { left, right, width } = document.querySelector(selector).getBoundingClientRect();
        return { left, right, width };
      };
      return { header:box('header'), main:box(document.querySelector('.topic-guide') ? '.topic-guide' : 'main'), footer:box('footer'), pageWidth:innerWidth };
    })()`);
    for (const area of ["main", "footer"]) {
      assert.ok(
        Math.abs(layout[area].left - layout.header.left) <= 1,
        `${area} left edge: ${JSON.stringify(layout)}`,
      );
      assert.ok(
        Math.abs(layout[area].width - layout.header.width) <= 1,
        `${area} width: ${JSON.stringify(layout)}`,
      );
    }
    assert.ok(
      layout.footer.right <= layout.pageWidth + 1,
      `footer fits viewport: ${JSON.stringify(layout)}`,
    );

    await evaluate("document.querySelector('#report-toolbox').open = true");
    await page("Emulation.setEmulatedMedia", { media: "print", features: reducedMotion });
    const printed = await evaluate(`(() => {
      const note = document.querySelector('.print-note');
      const toolbox = document.querySelector('#report-toolbox');
      const exportButton = document.querySelector('#export-json');
      return {
        noteVisible: getComputedStyle(note).display !== 'none' && note.getClientRects().length > 0,
        noteText: note.textContent,
        toolboxOpen: toolbox.open,
        toolboxHidden: getComputedStyle(toolbox).display === 'none' && !toolbox.checkVisibility(),
        exportHidden: !exportButton.checkVisibility()
      };
    })()`);
    assert.equal(printed.noteVisible, true, "print provenance note is visible");
    assert.match(printed.noteText, /Nutzerbearbeitungen sind keine neue Quellenprüfung/);
    assert.match(printed.noteText, /Original-Snapshot bleibt getrennt erhalten/);
    assert.equal(
      printed.toolboxOpen,
      true,
      "print visibility must not depend on closing the live toolbox",
    );
    assert.equal(printed.toolboxHidden, true);
    assert.equal(printed.exportHidden, true);
  } finally {
    await page("Emulation.setEmulatedMedia", { media: "screen", features: reducedMotion });
    await page("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: false,
    });
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
    const original = await evaluate(
      "JSON.parse(document.getElementById('report-original').textContent)",
    );
    const change =
      rid === "r18"
        ? "const e=document.querySelector('[data-card-index] select');e.selectedIndex=(e.selectedIndex+1)%e.options.length;e.dispatchEvent(new Event('change',{bubbles:true}));"
        : rid === "r19"
          ? "const e=document.querySelector('[data-enabled]');e.click();"
          : "const e=document.querySelector('[data-prompt-field=system]');e.value='Local test draft';e.dispatchEvent(new Event('input',{bubbles:true}));";
    await evaluate(change);
    assert.equal(await evaluate("window.visualReportView.isDirty()"), true, rid);
    const current = await evaluate(
      "JSON.parse(document.getElementById('report-data').textContent)",
    );
    assert.deepEqual(
      await evaluate("JSON.parse(document.getElementById('report-original').textContent)"),
      original,
      "original snapshot remains immutable",
    );
    assert.deepEqual(current.editing.original, original, "editing provenance stays on original");
    assert.ok(
      current.editing.changes.every((change) => change.state === "user-edited"),
      rid,
    );
    assert.notDeepEqual(current, original, "current ledger materializes working state");
  }
  const r20File = files[reports.findIndex((r) => r.id === "r20")];
  for (const [field, value] of [
    ["temperature", ""],
    ["maxTokens", ""],
  ]) {
    await navigate(r20File);
    await captureDownloads();
    await evaluate(
      `(() => { const e=document.querySelector('[data-prompt-field="${field}"]');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true})); })()`,
    );
    assert.equal(
      await evaluate("window.visualReportView.isDirty()"),
      true,
      `${field} invalid draft is protected`,
    );
    for (const button of ["export-json", "export-md", "export-draft"])
      await evaluate(`document.getElementById('${button}').click()`);
    assert.equal(await evaluate("window.__downloads.length"), 0, `${field} blocks current exports`);
    assert.match(
      await evaluate("document.getElementById('report-status').textContent"),
      /Export blockiert/,
    );
    await evaluate("document.getElementById('export-original').click()");
    await evaluate("Promise.all(window.__pendingDownloads)");
    assert.equal(
      await evaluate("window.__downloads.length"),
      1,
      "original remains available for recovery",
    );
    assert.match(await evaluate("window.__downloads[0].name"), /original\.json$/);
  }
  await navigate(r20File);
  await captureDownloads();
  await evaluate(
    `(() => { const e=document.querySelector('[data-prompt-field="temperature"]');e.value='0';e.dispatchEvent(new Event('input',{bubbles:true})); })()`,
  );
  await evaluate("document.getElementById('export-json').click()");
  await evaluate("Promise.all(window.__pendingDownloads)");
  assert.equal(
    JSON.parse((await evaluate("window.__downloads[0].text")).toString()).sections.find(
      (section) => section.kind === "prompt",
    ).data.temperature,
    0,
    "explicit numeric zero remains valid",
  );
  await navigate(files.at(-1));
  await captureDownloads();
  await evaluate(
    `(() => { const e=document.querySelector('[data-prompt-field="user"]');e.value='Exported mixed working state';e.dispatchEvent(new Event('input',{bubbles:true})); })()`,
  );
  const mixedWorking = await evaluate(
    "JSON.parse(document.getElementById('report-data').textContent)",
  );
  assert.equal(
    mixedWorking.sections.some((section) => section.kind === "diagram"),
    true,
    "v2 text diagram fixture",
  );
  await evaluate(`(() => {
    const evidence=document.createElement('details');
    evidence.id='delivery-evidence'; evidence.open=true;
    evidence.innerHTML='<summary>Expanded report evidence</summary><p>Evidence stays expanded.</p>';
    document.querySelector('main').append(evidence);
    document.querySelector('#report-toolbox').open=true;
  })()`);
  for (const button of ["export-json", "export-md", "export-draft", "export-original"])
    await evaluate(`document.getElementById('${button}').click()`);
  const exports = await evaluate(
    "Promise.all(window.__pendingDownloads).then(()=>window.__downloads)",
  );
  const currentJson = JSON.parse(
    exports.find((item) => item.name.endsWith(".json") && !item.name.endsWith(".original.json"))
      .text,
  );
  const currentMarkdown = exports.find((item) => item.name.endsWith(".md")).text;
  const currentHtml = exports.find((item) => item.name.endsWith(".html")).text;
  const originalJson = JSON.parse(
    exports.find((item) => item.name.endsWith(".original.json")).text,
  );
  assert.equal(
    await evaluate("document.querySelector('#report-toolbox').open"),
    true,
    "export must leave live tooling state unchanged",
  );
  assert.equal(
    currentJson.sections.find((section) => section.kind === "prompt").data.user,
    "Exported mixed working state",
  );
  assert.deepEqual(currentJson.editing.original, originalJson);
  assert.match(currentMarkdown, /Datenfluss/);
  assert.match(currentMarkdown, /Exported mixed working state/);
  const typedFence = currentMarkdown.match(/^(`{3,})json\n([\s\S]*?)\n\1$/m);
  assert.ok(typedFence, "current Markdown export carries a complete typed JSON snapshot");
  assert.deepEqual(JSON.parse(typedFence[2]), { current: currentJson, original: originalJson });
  const downloadedLedgers = await evaluate(`(() => {
    const html=${JSON.stringify(currentHtml)};
    const parsed=new DOMParser().parseFromString(html,'text/html');
    return {data:JSON.parse(parsed.getElementById('report-data').textContent),original:JSON.parse(parsed.getElementById('report-original').textContent),markdown:parsed.getElementById('report-markdown').textContent,toolboxClosed:parsed.querySelector('#report-toolbox').open===false,evidenceOpen:parsed.querySelector('#delivery-evidence').open};
  })()`);
  assert.deepEqual(downloadedLedgers.data, currentJson);
  assert.deepEqual(downloadedLedgers.original, originalJson);
  assert.match(downloadedLedgers.markdown, /Datenfluss/);
  assert.equal(downloadedLedgers.toolboxClosed, true);
  assert.equal(downloadedLedgers.evidenceOpen, true);
  const reopenedPath = path.join(directory, "current-export.html");
  await writeFile(reopenedPath, currentHtml);
  const reopenedUrl = pathToFileURL(reopenedPath).href;
  await navigate(reopenedUrl);
  assert.equal(await evaluate("document.querySelector('#report-toolbox').open"), false);
  assert.equal(await evaluate("document.querySelector('#delivery-evidence').open"), true);
  assert.deepEqual(
    await evaluate("JSON.parse(document.getElementById('report-data').textContent)"),
    currentJson,
  );
  assert.deepEqual(
    await evaluate("JSON.parse(document.getElementById('report-original').textContent)"),
    originalJson,
  );
  assert.equal(
    await evaluate("document.getElementById('report-markdown').textContent.includes('Datenfluss')"),
    true,
  );
  await page("Emulation.setScriptExecutionDisabled", { value: true });
  await navigate(reopenedUrl);
  assert.deepEqual(
    await evaluate("JSON.parse(document.getElementById('report-data').textContent)"),
    currentJson,
  );
  assert.deepEqual(
    await evaluate("JSON.parse(document.getElementById('report-original').textContent)"),
    originalJson,
  );
  assert.equal(
    await evaluate("document.getElementById('report-markdown').textContent.includes('Datenfluss')"),
    true,
  );
  await page("Emulation.setScriptExecutionDisabled", { value: false });
  const store = path.join(directory, "managed");
  const managedReport = exampleReport("r20");
  const first = await publishRevision(managedReport, store);
  preview = await serveReport(store);
  await navigate(preview.url);
  assert.deepEqual(
    await evaluate(`({
    closed: document.querySelector('#preview-toolbox')?.open === false,
    footer: document.querySelector('footer #versions') !== null,
    noticeOutside: document.querySelector('#preview-toolbox #notice') === null,
    controlsHidden: !document.querySelector('#apply').checkVisibility()
  })`),
    { closed: true, footer: true, noticeOutside: true, controlsHidden: true },
  );
  for (
    let i = 0;
    i < 100 &&
    !(await evaluate("!!document.querySelector('iframe').contentWindow.visualReportView"));
    i++
  )
    await new Promise((resolve) => setTimeout(resolve, 30));
  await evaluate(
    `const f=document.querySelector('iframe').contentWindow;f.document.querySelector('details').open=true;f.scrollTo(0,300);const e=f.document.querySelector('[data-prompt-field="maxTokens"]');e.value='0';e.dispatchEvent(new Event('input',{bubbles:true}));`,
  );
  assert.equal(
    await evaluate("document.querySelector('iframe').contentWindow.visualReportView.isDirty()"),
    true,
  );
  assert.match(
    await evaluate(
      "document.querySelector('iframe').contentDocument.getElementById('report-json').textContent",
    ),
    /maxTokens": 1200/,
  );
  assert.equal(
    await evaluate(
      "document.querySelector('iframe').contentDocument.querySelector('[data-prompt-field=maxTokens]').value",
    ),
    "0",
    "raw invalid input remains visible while source ledgers stay valid",
  );
  const changed = structuredClone(managedReport);
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
  const thirdReport = structuredClone(changed);
  thirdReport.nextAction = "Temporarily unavailable revision for browser fixture";
  const third = await publishRevision(thirdReport, store, { expected: second.revision });
  const revisionHtml = path.join(store, "revisions", third.revision, "report.html");
  const unavailableHtml = revisionHtml + ".temporarily-unavailable";
  await rename(revisionHtml, unavailableHtml);
  for (
    let i = 0;
    i < 100 &&
    !(await evaluate("document.getElementById('notice').textContent.includes('Neuer Stand')"));
    i++
  )
    await new Promise((resolve) => setTimeout(resolve, 30));
  await evaluate("document.getElementById('apply').click()");
  for (
    let i = 0;
    i < 100 &&
    !(await evaluate(
      "document.getElementById('notice').textContent.includes('erneut zu versuchen')",
    ));
    i++
  )
    await new Promise((resolve) => setTimeout(resolve, 30));
  assert.match(
    await evaluate("document.getElementById('notice').textContent"),
    /erneut zu versuchen/,
  );
  assert.equal(
    await evaluate("!!document.querySelector('iframe').contentWindow.visualReportView"),
    false,
  );
  const failedRequests = requests.filter((url) =>
    url.includes(`/revision/${third.revision}/report.html`),
  );
  assert.equal(failedRequests.length, 1, "failed revision request is not repeated by polling");
  await new Promise((resolve) => setTimeout(resolve, 1600));
  assert.equal(
    requests.filter((url) => url.includes(`/revision/${third.revision}/report.html`)).length,
    1,
    "failed revision remains user-retryable without accidental navigation",
  );
  await rename(unavailableHtml, revisionHtml);
  await evaluate("document.getElementById('apply').click()");
  for (
    let i = 0;
    i < 100 &&
    !(await evaluate(
      `document.querySelector('iframe').contentWindow.location.href.includes('${third.revision}') && !!document.querySelector('iframe').contentWindow.visualReportView`,
    ));
    i++
  )
    await new Promise((resolve) => setTimeout(resolve, 30));
  const retried = await evaluate(
    "({open:document.querySelector('iframe').contentDocument.querySelector('details').open,scroll:document.querySelector('iframe').contentWindow.scrollY,dirty:document.querySelector('iframe').contentWindow.visualReportView.isDirty(),notice:document.getElementById('notice').textContent})",
  );
  assert.equal(retried.open, true, "reader details survive the failed revision and retry");
  assert.ok(retried.scroll > 0, "reader scroll survives the failed revision and retry");
  assert.equal(retried.dirty, false);
  assert.match(retried.notice, /Aktueller Stand übernommen/);
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
        failedRevisionRetry: "pass",
        restoredDetailsAndScroll: "pass",
        browserExceptions: errors.length,
      },
      null,
      2,
    ),
  );
} finally {
  if (preview && pageSessionId)
    await send("Page.navigate", { url: "about:blank" }, pageSessionId).catch(() => {});
  if (target) await send("Target.closeTarget", { targetId: target.targetId }).catch(() => {});
  if (preview) {
    const closed = preview.close();
    preview.server.closeAllConnections?.();
    await closed;
  }
  socket.close();
  await rm(directory, { recursive: true, force: true });
}
