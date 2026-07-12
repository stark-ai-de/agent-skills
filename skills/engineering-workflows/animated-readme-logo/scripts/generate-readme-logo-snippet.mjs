#!/usr/bin/env node

function usage() {
  return [
    "Usage: node generate-readme-logo-snippet.mjs --fallback <path> --alt <text> --width <px> --height <px> [options]",
    "",
    "Options:",
    "  --static-webp <path>",
    "  --static-png <path>",
    "  --animated-webp <path>",
    "  --animated-apng <path>",
    "  --animated-gif <path>",
    "  --mode quality-first|conservative|static-only",
  ].join("\n");
}

function parseArgs(argv) {
  const args = { mode: "quality-first" };
  const valueOptions = new Set([
    "--static-webp",
    "--static-png",
    "--animated-webp",
    "--animated-apng",
    "--animated-gif",
    "--fallback",
    "--alt",
    "--width",
    "--height",
    "--mode",
  ]);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (!valueOptions.has(arg)) throw new Error(`Unknown option: ${arg}`);
    const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
    args[key] = value;
    i += 1;
  }

  return args;
}

function escapeAttr(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function requireOption(args, key) {
  if (!args[key])
    throw new Error(
      `Missing required option: --${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`,
    );
}

function hasControlCharacters(value) {
  return [...String(value)].some((character) => {
    const code = character.codePointAt(0);
    return code <= 0x1f || code === 0x7f;
  });
}

function validateAssetPath(value, option) {
  let decoded = value;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    let next;
    try {
      next = decodeURIComponent(decoded);
    } catch {
      throw new Error(`${option} contains invalid percent encoding`);
    }
    if (next === decoded) break;
    decoded = next;
  }
  if (/%[0-9a-f]{2}/i.test(decoded)) throw new Error(`${option} is over-encoded`);
  if (hasControlCharacters(decoded)) {
    throw new Error(`${option} contains control characters`);
  }
  if (decoded !== decoded.trim()) throw new Error(`${option} contains URL whitespace`);
  decoded = decoded.replaceAll("\\", "/");
  if (
    !decoded ||
    decoded.startsWith("/") ||
    decoded.startsWith("//") ||
    /^[a-z][a-z0-9+.-]*:/i.test(decoded) ||
    /^[a-z]:\//i.test(decoded) ||
    decoded.split("/").includes("..")
  ) {
    throw new Error(`${option} must be a safe relative repository path`);
  }
}

function validate(args) {
  for (const key of ["fallback", "alt", "width", "height"]) requireOption(args, key);
  if (!["quality-first", "conservative", "static-only"].includes(args.mode)) {
    throw new Error("--mode must be quality-first, conservative, or static-only");
  }
  for (const key of ["width", "height"]) {
    if (!/^[1-9]\d*$/.test(args[key])) throw new Error(`--${key} must be a positive integer`);
  }
  for (const [key, value] of Object.entries(args)) {
    if (!/(?:fallback|staticWebp|staticPng|animatedWebp|animatedApng|animatedGif)/.test(key))
      continue;
    validateAssetPath(value, `--${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`);
  }
  if (hasControlCharacters(args.alt)) {
    throw new Error("--alt must not contain control characters");
  }
  if (
    args.mode === "quality-first" &&
    !args.animatedWebp &&
    !args.animatedApng &&
    !args.animatedGif
  ) {
    throw new Error("quality-first mode requires at least one animated source");
  }
  if (args.mode === "conservative" && !args.animatedGif) {
    throw new Error("conservative mode requires --animated-gif");
  }
}

function sourceLine(srcset, attrs = {}) {
  const renderedAttrs = [
    `srcset="${escapeAttr(srcset)}"`,
    attrs.type ? `type="${escapeAttr(attrs.type)}"` : null,
    attrs.media ? `media="${escapeAttr(attrs.media)}"` : null,
  ].filter(Boolean);
  return `    <source\n      ${renderedAttrs.join("\n      ")}\n    >`;
}

function reducedMotionSource(args) {
  if (args.staticWebp) {
    return sourceLine(args.staticWebp, {
      type: "image/webp",
      media: "(prefers-reduced-motion: reduce)",
    });
  }
  if (args.staticPng) {
    return sourceLine(args.staticPng, {
      media: "(prefers-reduced-motion: reduce)",
    });
  }
  return sourceLine(args.fallback, {
    media: "(prefers-reduced-motion: reduce)",
  });
}

function renderImg(args, indent = "  ") {
  return [
    `${indent}<img`,
    `${indent}  src="${escapeAttr(args.fallback)}"`,
    `${indent}  alt="${escapeAttr(args.alt)}"`,
    `${indent}  width="${escapeAttr(args.width)}"`,
    `${indent}  height="${escapeAttr(args.height)}"`,
    `${indent}>`,
  ].join("\n");
}

function renderSnippet(args) {
  if (args.mode === "static-only") {
    return ['<p align="center">', renderImg(args, "  "), "</p>"].join("\n");
  }

  const sources = [reducedMotionSource(args)];
  if (args.mode === "quality-first") {
    if (args.animatedWebp) sources.push(sourceLine(args.animatedWebp, { type: "image/webp" }));
    if (args.animatedApng) sources.push(sourceLine(args.animatedApng, { type: "image/apng" }));
    if (args.animatedGif) sources.push(sourceLine(args.animatedGif, { type: "image/gif" }));
  }
  if (args.mode === "conservative") {
    sources.push(sourceLine(args.animatedGif, { type: "image/gif" }));
  }

  return [
    '<p align="center">',
    "  <picture>",
    ...sources,
    renderImg(args, "    "),
    "  </picture>",
    "</p>",
  ].join("\n");
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
    if (args.help) {
      console.log(usage());
      return;
    }
    validate(args);
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    process.exit(1);
  }

  console.log(renderSnippet(args));
}

main();
