import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

// Read-only, offline: execute the published example with controlled DOM/SDK doubles.
// No upstream SDK code, dependency installation, network, or Telegram account is used.
const referenceUrl = new URL(
  "../../skills/engineering-workflows/telegram-serverless/references/mini-apps.md",
  import.meta.url,
);
const reference = fs.readFileSync(referenceUrl, "utf8");
const html = reference.match(/```html\r?\n([\s\S]*?)\r?\n```/)?.[1];
assert.ok(html, "the canonical Mini App HTML example must exist");
const inlineScripts = [...html.matchAll(/<script>\s*([\s\S]*?)<\/script>/g)];
assert.equal(inlineScripts.length, 1, "exercise the complete inline browser example");
const script = new vm.Script(inlineScripts[0][1], { filename: "mini-apps-example.js" });
const buttonTag = html.match(/<button\b[^>]*id="load-note"[^>]*>/)?.[0];
assert.ok(buttonTag, "the example must contain its load button");

function mount(options = {}) {
  const { sdk = true, callable = true, throws = false } = options;
  const initData = Object.hasOwn(options, "initData") ? options.initData : "synthetic-init-data";
  const listeners = new Map();
  const calls = [];
  const button = {
    disabled: /\bdisabled(?:\s|=|>)/.test(buttonTag),
    addEventListener(event, listener) {
      assert.equal(event, "click");
      assert.equal(listeners.has(event), false, "register each handler only once");
      listeners.set(event, listener);
    },
  };
  const result = { textContent: "" };
  Object.defineProperty(result, "innerHTML", {
    set() {
      assert.fail("render returned text without interpreting HTML");
    },
  });
  const webApp = { initData, Serverless: {} };
  if (callable) {
    webApp.Serverless.call = (name, input, callback) => {
      calls.push({ name, input, callback });
      assert.equal(name, "getNote");
      assert.equal(input.noteId, 1);
      assert.equal(typeof callback, "function");
      if (throws) throw new Error("private synchronous SDK failure");
    };
  }
  const context = vm.createContext({
    window: sdk ? { Telegram: { WebApp: webApp } } : {},
    document: {
      getElementById(id) {
        assert.ok(id === "load-note" || id === "result", "only known DOM elements are used");
        return id === "load-note" ? button : result;
      },
    },
  });
  script.runInContext(context, { timeout: 1000 });
  return {
    button,
    result,
    calls,
    click() {
      // Like a browser, disabled controls do not dispatch user clicks.
      if (!button.disabled) listeners.get("click")?.();
    },
  };
}

let passed = 0;
function check(name, run) {
  run();
  passed += 1;
  console.log(`PASS ${name}`);
}

for (const [name, options] of [
  ["missing SDK", { sdk: false }],
  ["missing call function", { callable: false }],
  ["missing init data", { initData: undefined }],
  ["empty init data", { initData: "" }],
  ["invalid init data type", { initData: null }],
]) {
  check(name, () => {
    const app = mount(options);
    assert.equal(app.button.disabled, true);
    assert.match(app.result.textContent, /open.*Telegram/i);
    if (name.includes("init data")) {
      assert.match(app.result.textContent, /launch.*init data/i);
    }
    app.click();
    assert.equal(app.calls.length, 0);
  });
}

check("disabled before the SDK script loads", () => {
  assert.match(buttonTag, /\bdisabled(?:\s|=|>)/);
});

check("pending request and safe success rendering", () => {
  const app = mount();
  assert.equal(app.button.disabled, false);
  app.click();
  assert.equal(app.button.disabled, true);
  assert.match(app.result.textContent, /Loading/);
  app.click();
  assert.equal(app.calls.length, 1, "a pending request cannot be submitted again");
  const text = '<img src="x" onerror="alert(1)">';
  app.calls[0].callback(null, { body: text });
  assert.equal(app.button.disabled, false);
  assert.equal(app.result.textContent, text);
});

for (const [name, error, expected] of [
  ["business error", { type: "ENDPOINT_ERROR", message: "Note not found." }, "Note not found."],
  [
    "authentication error",
    { type: "UNAUTHORIZED", message: "private details" },
    "Reopen this app in Telegram.",
  ],
  ["transport error", { status: 0, message: "private details" }, "Unable to load the note."],
]) {
  check(name, () => {
    const app = mount();
    app.click();
    app.calls[0].callback(error, null);
    assert.equal(app.button.disabled, false);
    assert.equal(app.result.textContent, expected);
    assert.equal(app.calls.length, 1, "errors never retry automatically");
  });
}

check("synchronous SDK failure", () => {
  const app = mount({ throws: true });
  assert.doesNotThrow(() => app.click());
  assert.equal(app.button.disabled, false);
  assert.equal(app.result.textContent, "Unable to load the note.");
  assert.equal(app.calls.length, 1, "synchronous failures never retry automatically");
});

console.log(`Telegram Serverless browser example: ${passed} offline scenarios passed.`);
