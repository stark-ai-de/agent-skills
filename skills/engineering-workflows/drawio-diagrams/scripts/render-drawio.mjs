#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function usage() {
  return "Usage: node scripts/render-drawio.mjs path/to/file.drawio [--page-index <1-based-index>]";
}

function parseArgs(argv) {
  let input = null;
  let pageIndex = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return { help: true, input, pageIndex };
    if (arg === "--page-index" || arg === "-p") {
      const value = argv[++index];
      if (!value || !/^\d+$/.test(value) || Number(value) < 1) {
        throw new Error("--page-index must be a positive 1-based integer");
      }
      pageIndex = Number(value);
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`Unknown argument: ${arg}`);
    if (input) throw new Error(`Unexpected extra input: ${arg}`);
    input = arg;
  }

  return { help: false, input, pageIndex };
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
  const configured = process.env.DRAWIO_BIN;
  if (configured) {
    if (fs.existsSync(configured)) return configured;
    const probe = spawnSync(configured, ["--version"], { encoding: "utf8" });
    if (!probe.error && probe.status === 0) return configured;
  }
  for (const candidate of pathCandidates()) {
    if (fs.existsSync(candidate)) return candidate;
  }
  for (const command of ["drawio", "diagrams.net"]) {
    const probe = spawnSync(command, ["--version"], { encoding: "utf8" });
    if (!probe.error && probe.status === 0) return command;
  }
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
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    process.exit(2);
  }
  if (!args.input || args.help) {
    console.log(usage());
    process.exit(args.help ? 0 : 2);
  }
  const inputPath = path.resolve(args.input);
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
  const pageArgs = args.pageIndex ? ["--page-index", String(args.pageIndex)] : [];
  try {
    runDrawio(drawio, [
      "-x",
      "-f",
      "png",
      "-s",
      "2",
      "-b",
      "10",
      ...pageArgs,
      "-o",
      lightPng,
      inputPath,
    ]);
    runDrawio(drawio, [
      "-x",
      "-f",
      "svg",
      "--svg-theme",
      "dark",
      "-e",
      "-b",
      "10",
      ...pageArgs,
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
