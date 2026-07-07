#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";

function usage() {
  return [
    "Usage: node scripts/open-drawio-url.mjs path/to/file.drawio [--open] [--print-only]",
    "",
    "Builds an app.diagrams.net #create URL from a .drawio file using Node built-ins.",
    "By default the script prints the URL only. Use --open to open it in the default browser.",
  ].join("\n");
}

function isWsl() {
  try {
    return /microsoft|wsl/i.test(fs.readFileSync("/proc/version", "utf8"));
  } catch {
    return false;
  }
}

function buildUrl(xml) {
  const compressed = zlib.deflateRawSync(encodeURIComponent(xml)).toString("base64");
  const payload = encodeURIComponent(
    JSON.stringify({ type: "xml", compressed: true, data: compressed }),
  );
  return `https://app.diagrams.net/?grid=0&pv=0&border=10&edit=_blank#create=${payload}`;
}

function writeShortcut(url) {
  const shortcutPath = path.join(os.tmpdir(), `drawio-${Date.now()}.url`);
  fs.writeFileSync(shortcutPath, `[InternetShortcut]\r\nURL=${url}\r\n`, "utf8");
  return shortcutPath;
}

function wslpath(filePath) {
  const result = spawnSync("wslpath", ["-w", filePath], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      `wslpath failed: ${(result.stderr || result.stdout || "").trim()}`,
    );
  }
  return result.stdout.trim();
}

function openUrl(url) {
  if (process.platform === "darwin") {
    return spawnSync("open", [url], { stdio: "inherit" });
  }
  if (process.platform === "win32") {
    const shortcut = writeShortcut(url);
    return spawnSync("cmd.exe", ["/c", "start", "", shortcut], { stdio: "inherit" });
  }
  if (isWsl()) {
    const shortcut = writeShortcut(url);
    return spawnSync("cmd.exe", ["/c", "start", "", wslpath(shortcut)], {
      stdio: "inherit",
    });
  }
  return spawnSync("xdg-open", [url], { stdio: "inherit" });
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(usage());
    process.exit(0);
  }

  const input = args.find((arg) => !arg.startsWith("-"));
  if (!input) {
    console.error(usage());
    process.exit(2);
  }

  const shouldOpen = args.includes("--open");
  const inputPath = path.resolve(input);
  if (!fs.existsSync(inputPath)) {
    console.error(`Input not found: ${inputPath}`);
    process.exit(2);
  }

  const xml = fs.readFileSync(inputPath, "utf8");
  const url = buildUrl(xml);
  console.log(url);
  console.error(`Local file: ${inputPath}`);
  console.error(`URL length: ${url.length}`);
  if (url.length > 32768) {
    console.error(
      "Warning: URL is large; browsers may reject it. Use the .drawio file fallback if opening fails.",
    );
  }

  if (shouldOpen) {
    const result = openUrl(url);
    if (result.error) {
      console.error(`Open command failed: ${result.error.message}`);
      process.exit(1);
    }
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}

main();
