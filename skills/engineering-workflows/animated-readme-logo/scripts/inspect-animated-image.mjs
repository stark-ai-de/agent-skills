#!/usr/bin/env node
import {
  AnimatedImageError,
  DEFAULT_ANIMATED_IMAGE_LIMITS,
  inspectAnimatedImageFile,
} from "./lib/animated-image.mjs";

function usage() {
  return `Usage: node inspect-animated-image.mjs [options] <image>

Validate that a local GIF, APNG, or WebP is structurally animated and free of hidden metadata.

Options:
  --json                 Emit one deterministic JSON object
  --max-file-bytes N     Maximum input size (default: ${DEFAULT_ANIMATED_IMAGE_LIMITS.maxFileBytes})
  --max-chunk-bytes N    Maximum logical chunk size (default: ${DEFAULT_ANIMATED_IMAGE_LIMITS.maxChunkBytes})
  --max-frames N         Maximum frame count (default: ${DEFAULT_ANIMATED_IMAGE_LIMITS.maxFrames})
  --max-dimension N      Maximum width or height (default: ${DEFAULT_ANIMATED_IMAGE_LIMITS.maxDimension})
  -h, --help             Show this help

Exit codes: 0=valid animated image, 1=invalid/static/limit failure, 2=usage/I/O.`;
}

function positiveInteger(option, value) {
  if (!/^[1-9]\d*$/.test(value ?? "")) {
    throw new AnimatedImageError(
      "INVALID_OPTION",
      `${option} requires a positive integer`,
      "usage",
    );
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new AnimatedImageError(
      "INVALID_OPTION",
      `${option} exceeds the safe integer range`,
      "usage",
    );
  }
  return parsed;
}

function parseArgs(argv) {
  const args = { limits: {} };
  const limitOptions = new Map([
    ["--max-file-bytes", "maxFileBytes"],
    ["--max-chunk-bytes", "maxChunkBytes"],
    ["--max-frames", "maxFrames"],
    ["--max-dimension", "maxDimension"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      args.help = true;
      continue;
    }
    if (argument === "--json") {
      args.json = true;
      continue;
    }
    if (limitOptions.has(argument)) {
      args.limits[limitOptions.get(argument)] = positiveInteger(argument, argv[index + 1]);
      index += 1;
      continue;
    }
    if (argument.startsWith("-")) {
      throw new AnimatedImageError("UNKNOWN_OPTION", `unknown option: ${argument}`, "usage");
    }
    if (args.file) {
      throw new AnimatedImageError("TOO_MANY_INPUTS", "provide exactly one image path", "usage");
    }
    args.file = argument;
  }
  return args;
}

function outputSuccess(file, inspected, jsonOutput) {
  const payload = { valid: true, path: file, ...inspected, errors: [] };
  if (jsonOutput) {
    console.log(JSON.stringify(payload));
    return;
  }
  console.log(`VALID ANIMATED IMAGE: ${file}`);
  console.log(`Format: ${inspected.format}`);
  console.log(`Dimensions: ${inspected.width} x ${inspected.height}`);
  console.log(`Frames: ${inspected.frameCount}`);
  console.log(`Animated: yes`);
  console.log(`Loop: ${inspected.loop}`);
}

function outputFailure(file, error, jsonOutput) {
  const payload = {
    valid: false,
    path: file ?? null,
    errors: [{ code: error.code ?? "UNEXPECTED_ERROR", message: error.message }],
  };
  if (jsonOutput) {
    console.log(JSON.stringify(payload));
    return;
  }
  console.error(`INVALID ANIMATED IMAGE: ${file ?? "(no input)"}`);
  console.error(`- [${payload.errors[0].code}] ${payload.errors[0].message}`);
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    const normalized =
      error instanceof AnimatedImageError
        ? error
        : new AnimatedImageError("INVALID_ARGUMENT", error.message, "usage");
    outputFailure(null, normalized, process.argv.includes("--json"));
    if (!process.argv.includes("--json")) console.error(usage());
    process.exitCode = 2;
    return;
  }
  if (args.help) {
    console.log(usage());
    return;
  }
  if (!args.file) {
    const error = new AnimatedImageError("MISSING_INPUT", "provide one local image path", "usage");
    outputFailure(null, error, args.json);
    if (!args.json) console.error(usage());
    process.exitCode = 2;
    return;
  }

  try {
    const inspected = inspectAnimatedImageFile(args.file, args.limits);
    if (!inspected.animated) {
      throw new AnimatedImageError(
        "STATIC_IMAGE",
        `${inspected.format} contains ${inspected.frameCount} frame and is not animated`,
      );
    }
    outputSuccess(args.file, inspected, args.json);
  } catch (error) {
    const normalized =
      error instanceof AnimatedImageError
        ? error
        : new AnimatedImageError("UNEXPECTED_ERROR", error.message);
    outputFailure(args.file, normalized, args.json);
    process.exitCode = ["usage", "io"].includes(normalized.category) ? 2 : 1;
  }
}

main();
