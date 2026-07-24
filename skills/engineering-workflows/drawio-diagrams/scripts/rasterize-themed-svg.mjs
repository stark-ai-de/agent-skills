#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { validatePng, validateSvgXml } from "./render-drawio.mjs";

const MAX_SVG_BYTES = 32 * 1024 * 1024;
const MAX_DIMENSION = 32_768;
const MAX_PIXELS = 16_000_000;
const FIXED_THEMES = new Set(["light", "dark"]);
const ACTIVE_ELEMENTS = new Set([
  "animate",
  "animatemotion",
  "animatetransform",
  "audio",
  "base",
  "button",
  "embed",
  "form",
  "handler",
  "iframe",
  "input",
  "listener",
  "link",
  "meta",
  "object",
  "script",
  "select",
  "set",
  "source",
  "textarea",
  "track",
  "video",
]);
const HTML_RENDER_REFERENCE_ATTRIBUTES = new Set(["background", "poster", "src"]);
const CSS_RENDER_REFERENCE_ATTRIBUTES = new Set([
  "clip-path",
  "cursor",
  "fill",
  "filter",
  "marker-end",
  "marker-mid",
  "marker-start",
  "mask",
  "stroke",
  "style",
]);
const DATA_IMAGE_ELEMENTS = new Set(["feimage", "image", "img"]);

function usage() {
  return `Usage: node scripts/rasterize-themed-svg.mjs input.light.svg output.light.png [--browser <chrome-or-edge>]

Rasterizes one fixed-theme SVG through a local Chromium-family browser.
The input must declare exactly one root color-scheme (light or dark), have bounded dimensions,
and contain no active content or remotely loaded render assets. The output is validated and installed no-clobber.`;
}

export function parseArgs(argv) {
  let input = null;
  let output = null;
  let browser = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return { help: true, input, output, browser };
    if (arg === "--browser") {
      browser = argv[++index];
      if (!browser) throw new Error("--browser requires a command or path");
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`Unknown argument: ${arg}`);
    if (!input) input = arg;
    else if (!output) output = arg;
    else throw new Error(`Unexpected extra input: ${arg}`);
  }

  return { help: false, input, output, browser };
}

function parseDimension(value, label) {
  const match = String(value || "")
    .trim()
    .match(/^(\d+(?:\.\d+)?)(?:px)?$/);
  if (!match) throw new Error(`SVG ${label} must be a positive px dimension`);
  const dimension = Math.ceil(Number(match[1]));
  if (!Number.isSafeInteger(dimension) || dimension <= 0 || dimension > MAX_DIMENSION) {
    throw new Error(`SVG ${label} exceeds the ${MAX_DIMENSION}px raster limit`);
  }
  return dimension;
}

function rootTheme(style) {
  const declarations = String(style || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  const schemes = declarations
    .map((part) =>
      part
        .match(/^color-scheme\s*:\s*(.+)$/i)?.[1]
        ?.trim()
        .toLowerCase(),
    )
    .filter(Boolean);
  if (schemes.length !== 1) {
    throw new Error("SVG root must declare exactly one color-scheme");
  }
  const tokens = schemes[0].split(/\s+/).filter(Boolean);
  if (tokens.length !== 1 || !FIXED_THEMES.has(tokens[0])) {
    throw new Error("SVG root color-scheme must be fixed light or fixed dark");
  }
  return tokens[0];
}

function localName(name) {
  return String(name)
    .slice(String(name).lastIndexOf(":") + 1)
    .toLowerCase();
}

function assertNoActiveUrlScheme(reference) {
  const separator = String(reference).indexOf(":");
  if (separator === -1) return;
  const scheme = String(reference)
    .slice(0, separator)
    .replace(/[\u0000-\u0020]+/g, "")
    .toLowerCase();
  if (scheme === "javascript" || scheme === "vbscript") {
    throw new Error("SVG contains an active URL scheme");
  }
}

function assertCssIsSelfContained(source) {
  const css = String(source);
  if (css.includes("\\") || css.includes("/*") || css.includes("*/")) {
    throw new Error("SVG CSS escapes and comments are not supported for rasterization");
  }
  if (/@import\b/i.test(css)) {
    throw new Error("SVG imported stylesheets are not supported for rasterization");
  }
  for (const match of css.matchAll(/url\s*\(\s*(["']?)(.*?)\1\s*\)/gis)) {
    const reference = match[2].trim();
    assertNoActiveUrlScheme(reference);
    if (reference && !reference.startsWith("#") && !reference.toLowerCase().startsWith("data:")) {
      throw new Error("SVG contains an external CSS render asset");
    }
  }
}

function isImageDataUrl(reference) {
  const match = String(reference).match(/^data:([^,]*),/i);
  if (!match) return false;
  const mediaType = match[1].split(";", 1)[0].trim().toLowerCase();
  return mediaType.startsWith("image/") && mediaType.length > "image/".length;
}

function assertRenderReference(reference, message, { allowImageData = false } = {}) {
  const value = String(reference).trim();
  assertNoActiveUrlScheme(value);
  if (!value || value.startsWith("#")) return;
  if (allowImageData && isImageDataUrl(value)) return;
  throw new Error(message);
}

function inspectRasterElement({ name, attributes }) {
  const elementName = localName(name);
  if (ACTIVE_ELEMENTS.has(elementName)) {
    throw new Error(`SVG contains an unsupported active content element: ${elementName}`);
  }

  for (const [name, value] of attributes) {
    const attributeName = localName(name);
    if (String(name).toLowerCase() === "xml:base") {
      throw new Error("SVG xml:base is not supported for rasterization");
    }
    if (attributeName.startsWith("on") && attributeName.length > 2) {
      throw new Error(`SVG contains an event handler attribute: ${name}`);
    }
    assertNoActiveUrlScheme(value);
    if (CSS_RENDER_REFERENCE_ATTRIBUTES.has(attributeName)) {
      assertCssIsSelfContained(value);
    }
    if (attributeName === "srcset") {
      throw new Error("SVG contains an unsupported HTML source set");
    }
    if (attributeName === "href" && elementName !== "a") {
      assertRenderReference(value, "SVG contains an external image or symbol reference", {
        allowImageData: DATA_IMAGE_ELEMENTS.has(elementName),
      });
    }
    if (HTML_RENDER_REFERENCE_ATTRIBUTES.has(attributeName)) {
      assertRenderReference(value, "SVG contains an external HTML render asset", {
        allowImageData: true,
      });
    }
  }
}

export function inspectThemedSvg(source) {
  const { rootAttributes: attributes } = validateSvgXml(source, {
    onElement: inspectRasterElement,
    onText: ({ text, parentName }) => {
      if (localName(parentName) === "style") assertCssIsSelfContained(text);
    },
  });
  if (!attributes) throw new Error("SVG root element is missing");
  const width = parseDimension(attributes.get("width"), "width");
  const height = parseDimension(attributes.get("height"), "height");
  if (width * height > MAX_PIXELS) {
    throw new Error(`SVG exceeds the ${MAX_PIXELS}-pixel raster limit`);
  }
  return {
    theme: rootTheme(attributes.get("style")),
    width,
    height,
  };
}

function browserCandidates() {
  const candidates = [
    process.env.SVG_RASTER_BROWSER,
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
    "microsoft-edge",
    "microsoft-edge-stable",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
    "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ];
  return candidates.filter(Boolean);
}

function isPathCandidate(candidate) {
  return path.isAbsolute(candidate) || candidate.includes("/") || candidate.includes("\\");
}

export function findBrowser(configured = null) {
  const candidates = configured ? [configured] : browserCandidates();
  for (const candidate of candidates) {
    if (isPathCandidate(candidate)) {
      if (fs.existsSync(candidate)) return candidate;
      continue;
    }
    const result = spawnSync(candidate, ["--version"], {
      encoding: "utf8",
      timeout: 5_000,
    });
    if (!result.error && result.status === 0) return candidate;
  }
  return null;
}

function windowsPath(file) {
  if (process.platform === "win32") return file;
  const result = spawnSync("wslpath", ["-w", file], {
    encoding: "utf8",
    timeout: 5_000,
  });
  if (result.error || result.status !== 0 || !result.stdout.trim()) {
    throw new Error("Windows browser selected, but wslpath could not translate the raster path");
  }
  return result.stdout.trim();
}

function windowsFileUrl(file) {
  const normalized = windowsPath(file).replaceAll("\\", "/");
  if (/^[A-Za-z]:\//.test(normalized)) return `file:///${normalized}`;
  if (normalized.startsWith("//")) return `file:${normalized}`;
  throw new Error("wslpath returned an unsupported Windows path");
}

function browserPaths(browser, input, output, profile) {
  const windowsBrowser = process.platform === "win32" || /\.exe$/i.test(browser);
  return windowsBrowser
    ? {
        inputUrl: windowsFileUrl(input),
        output: windowsPath(output),
        profile: windowsPath(profile),
      }
    : { inputUrl: pathToFileURL(input).href, output, profile };
}

function isolatedBrowserProfile(browser, stagingDirectory) {
  const windowsBrowser = process.platform === "win32" || /\.exe$/i.test(browser);
  if (!windowsBrowser || process.platform === "win32") {
    return fs.mkdtempSync(path.join(stagingDirectory, "browser-profile-"));
  }

  let windowsTemp = null;
  for (const powershell of [
    "powershell.exe",
    "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe",
  ]) {
    if (isPathCandidate(powershell) && !fs.existsSync(powershell)) continue;
    const result = spawnSync(
      powershell,
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", "[IO.Path]::GetTempPath()"],
      {
        cwd: os.tmpdir(),
        encoding: "utf8",
        timeout: 5_000,
      },
    );
    if (!result.error && result.status === 0 && result.stdout?.trim()) {
      windowsTemp = result.stdout.trim();
      break;
    }
  }
  if (!windowsTemp) {
    throw new Error("Windows browser selected, but its local temp path could not be resolved");
  }
  const translated = spawnSync("wslpath", ["-u", windowsTemp], {
    encoding: "utf8",
    timeout: 5_000,
  });
  if (translated.error || translated.status !== 0 || !translated.stdout.trim()) {
    throw new Error("Windows browser selected, but its local temp path could not be translated");
  }
  const localTemp = fs.realpathSync(translated.stdout.trim());
  return fs.mkdtempSync(path.join(localTemp, "drawio-themed-svg-profile-"));
}

function runBrowser(browser, input, output, profile, width, height) {
  const browserPath = browserPaths(browser, input, output, profile);
  const args = [
    "--headless=new",
    "--disable-component-update",
    "--disable-gpu",
    "--disable-background-networking",
    "--disable-extensions",
    "--disable-javascript",
    "--disable-sync",
    "--hide-scrollbars",
    "--metrics-recording-only",
    "--no-default-browser-check",
    "--no-first-run",
    "--force-device-scale-factor=1",
    "--force-color-profile=srgb",
    "--host-resolver-rules=MAP * ~NOTFOUND",
    "--run-all-compositor-stages-before-draw",
    `--user-data-dir=${browserPath.profile}`,
    "--virtual-time-budget=1000",
    `--window-size=${width},${height}`,
    `--screenshot=${browserPath.output}`,
    browserPath.inputUrl,
  ];
  const result = spawnSync(browser, args, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    timeout: 30_000,
  });
  if (result.error?.code === "ETIMEDOUT") {
    throw new Error("browser rasterization exceeded the 30s timeout");
  }
  if (result.error || result.status !== 0) {
    throw new Error(
      [
        `browser rasterization failed: ${browser}`,
        result.error?.message,
        result.stderr?.trim(),
        result.stdout?.trim(),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
}

function pngDimensions(file) {
  const bytes = fs.readFileSync(file);
  if (bytes.length < 24) throw new Error("browser PNG is too short");
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

function publishNoClobber(staged, destination) {
  try {
    fs.linkSync(staged, destination);
  } catch (error) {
    if (error?.code === "EEXIST")
      throw new Error(`refusing to replace existing output: ${destination}`);
    try {
      fs.copyFileSync(staged, destination, fs.constants.COPYFILE_EXCL);
    } catch (copyError) {
      if (copyError?.code === "EEXIST") {
        throw new Error(`refusing to replace existing output: ${destination}`);
      }
      throw copyError;
    }
  }
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    process.exitCode = 2;
    return;
  }
  if (args.help) {
    console.log(usage());
    return;
  }
  if (!args.input || !args.output) {
    console.error("input SVG and output PNG are required");
    console.error(usage());
    process.exitCode = 2;
    return;
  }

  let stagingDirectory = null;
  let browserProfile = null;
  try {
    const input = fs.realpathSync(args.input);
    const inputStat = fs.statSync(input);
    if (!inputStat.isFile() || inputStat.size <= 0 || inputStat.size > MAX_SVG_BYTES) {
      throw new Error(`input must be a nonempty SVG no larger than ${MAX_SVG_BYTES} bytes`);
    }
    if (path.extname(input).toLowerCase() !== ".svg") throw new Error("input must end in .svg");
    const source = new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(input));
    const inspection = inspectThemedSvg(source);

    const requestedOutput = path.resolve(args.output);
    if (path.extname(requestedOutput).toLowerCase() !== ".png") {
      throw new Error("output must end in .png");
    }
    const outputParent = fs.realpathSync(path.dirname(requestedOutput));
    const output = path.join(outputParent, path.basename(requestedOutput));
    if (fs.existsSync(output)) throw new Error(`refusing to replace existing output: ${output}`);

    const browser = findBrowser(args.browser);
    if (!browser) {
      throw new Error(
        "no local Chrome, Chromium, or Edge browser was found; pass --browser <path>",
      );
    }

    stagingDirectory = fs.mkdtempSync(path.join(outputParent, ".themed-svg-raster-"));
    const stagedSvg = path.join(stagingDirectory, "input.svg");
    const stagedPng = path.join(stagingDirectory, "output.png");
    browserProfile = isolatedBrowserProfile(browser, stagingDirectory);
    fs.writeFileSync(stagedSvg, source, { encoding: "utf8", flag: "wx" });
    runBrowser(browser, stagedSvg, stagedPng, browserProfile, inspection.width, inspection.height);
    validatePng(stagedPng);
    const png = pngDimensions(stagedPng);
    if (png.width !== inspection.width || png.height !== inspection.height) {
      throw new Error(
        `browser PNG dimensions ${png.width}x${png.height} do not match SVG ${inspection.width}x${inspection.height}`,
      );
    }
    publishNoClobber(stagedPng, output);
    console.log(`fixed theme: ${inspection.theme}`);
    console.log(`PNG: ${output}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    if (browserProfile) fs.rmSync(browserProfile, { recursive: true, force: true });
    if (stagingDirectory) fs.rmSync(stagingDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
