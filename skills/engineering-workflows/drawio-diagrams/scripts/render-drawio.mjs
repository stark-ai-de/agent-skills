#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function usage() {
  return "Usage: node scripts/render-drawio.mjs path/to/file.drawio";
}

function pathCandidates() {
  const candidates = [];
  const pathParts = (process.env.PATH || "").split(path.delimiter).filter(Boolean);
  for (const part of pathParts) {
    candidates.push(path.join(part, process.platform === "win32" ? "drawio.exe" : "drawio"));
  }
  candidates.push("/Applications/draw.io.app/Contents/MacOS/draw.io");
  candidates.push("C:\\Program Files\\draw.io\\draw.io.exe");
  candidates.push("/mnt/c/Program Files/draw.io/draw.io.exe");
  if (process.env.USER) {
    candidates.push(`/mnt/c/Users/${process.env.USER}/AppData/Local/Programs/draw.io/draw.io.exe`);
  }
  return candidates;
}

function findDrawio() {
  for (const candidate of pathCandidates()) {
    if (fs.existsSync(candidate)) return candidate;
  }
  const probe = spawnSync("drawio", ["--version"], { encoding: "utf8" });
  if (!probe.error) return "drawio";
  return null;
}

function runDrawio(drawio, args) {
  const result = spawnSync(drawio, args, { encoding: "utf8" });
  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    throw new Error(
      [`draw.io export failed: ${drawio} ${args.join(" ")}`, stderr, stdout]
        .filter(Boolean)
        .join("\n"),
    );
  }
}

function main() {
  const input = process.argv[2];
  if (!input || process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    process.exit(input ? 0 : 2);
  }
  const inputPath = path.resolve(input);
  if (!fs.existsSync(inputPath)) {
    console.error(`Input not found: ${inputPath}`);
    process.exit(2);
  }
  const drawio = findDrawio();
  if (!drawio) {
    console.error("draw.io Desktop CLI not found. Install it or open the .drawio file manually.");
    process.exit(1);
  }

  const lightPng = `${inputPath}.png`;
  const darkSvg = inputPath.replace(/\.drawio$/i, "") + ".dark.svg";
  try {
    runDrawio(drawio, ["-x", "-f", "png", "-s", "2", "-b", "10", "-o", lightPng, inputPath]);
    runDrawio(drawio, [
      "-x",
      "-f",
      "svg",
      "--svg-theme",
      "dark",
      "-e",
      "-b",
      "10",
      "-o",
      darkSvg,
      inputPath,
    ]);
    console.log(`draw.io CLI: ${drawio}`);
    console.log(`light PNG: ${lightPng}`);
    console.log(`dark SVG: ${darkSvg}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

main();
