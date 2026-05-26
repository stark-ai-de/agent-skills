#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function usage() {
  return [
    "Usage: node audit-readme-logo-assets.mjs --readme README.md",
    "",
    "Prints a read-only Markdown report for README image/logo assets.",
  ].join("\n");
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (arg === "--readme") {
      args.readme = argv[i + 1];
      i += 1;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }
  return args;
}

function attrsFrom(tag) {
  const attrs = new Map();
  const pattern = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match;
  while ((match = pattern.exec(tag))) {
    attrs.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attrs;
}

function srcsetUrls(value) {
  return value
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function isLocalAsset(value) {
  return value && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value) && !value.startsWith("<");
}

function stripQueryHash(value) {
  return value.split("#")[0].split("?")[0];
}

function lineNumberAt(text, index) {
  return text.slice(0, index).split("\n").length;
}

function unique(values) {
  return [...new Set(values)];
}

function extractImageBlocks(markdown) {
  const blocks = [];
  const pictureRanges = [];
  const picturePattern = /<picture\b[\s\S]*?<\/picture>/gi;
  let match;

  while ((match = picturePattern.exec(markdown))) {
    pictureRanges.push([match.index, match.index + match[0].length]);
    blocks.push({
      type: "picture",
      line: lineNumberAt(markdown, match.index),
      markup: match[0],
    });
  }

  const imgPattern = /<img\b[^>]*>/gi;
  while ((match = imgPattern.exec(markdown))) {
    const insidePicture = pictureRanges.some(
      ([start, end]) => match.index >= start && match.index < end,
    );
    blocks.push({
      type: insidePicture ? "img in picture" : "img",
      line: lineNumberAt(markdown, match.index),
      markup: match[0],
    });
  }

  const markdownImagePattern = /!\[[^\]]*]\(([^)\s]+)(?:\s+["'][^)]*["'])?\)/g;
  while ((match = markdownImagePattern.exec(markdown))) {
    blocks.push({
      type: "markdown image",
      line: lineNumberAt(markdown, match.index),
      markup: match[0],
    });
  }

  return blocks.sort((a, b) => a.line - b.line);
}

function urlsFromMarkup(markup) {
  const urls = [];
  const tagPattern = /<(?:source|img)\b[^>]*>/gi;
  let tagMatch;

  while ((tagMatch = tagPattern.exec(markup))) {
    const attrs = attrsFrom(tagMatch[0]);
    if (attrs.has("src")) urls.push(attrs.get("src"));
    if (attrs.has("srcset")) urls.push(...srcsetUrls(attrs.get("srcset")));
  }

  const markdownMatch = markup.match(/!\[[^\]]*]\(([^)\s]+)(?:\s+["'][^)]*["'])?\)/);
  if (markdownMatch) urls.push(markdownMatch[1]);

  return unique(urls.filter(isLocalAsset).map(stripQueryHash));
}

function isAnimatedReference(value) {
  return /\.(?:gif|apng)(?:$|[?#])/i.test(value) || /animated/i.test(value);
}

function hasReducedMotion(markup) {
  return /prefers-reduced-motion\s*:\s*reduce/i.test(markup);
}

function blockFindings(block) {
  const findings = [];
  const imgTags = [...block.markup.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  for (const img of imgTags) {
    const attrs = attrsFrom(img);
    for (const required of ["alt", "width", "height"]) {
      if (!attrs.has(required)) findings.push(`line ${block.line}: <img> missing ${required}`);
    }
  }

  const urls = urlsFromMarkup(block.markup);
  if (urls.some(isAnimatedReference) && !hasReducedMotion(block.markup)) {
    findings.push(`line ${block.line}: animated source without reduced-motion static source`);
  }

  for (const pattern of [
    ["<script", /<script\b/i],
    ["<foreignObject", /<foreignobject\b/i],
    ["@keyframes", /@keyframes/i],
    ["animation:", /animation\s*:/i],
    ["external href", /\b(?:href|xlink:href)\s*=\s*["'](?:https?:|\/\/|data:)/i],
  ]) {
    if (pattern[1].test(block.markup))
      findings.push(`line ${block.line}: markup contains ${pattern[0]}`);
  }

  return findings;
}

function svgFindings(svgText) {
  const checks = [
    ["contains <script", /<script\b/i],
    ["contains <foreignObject", /<foreignobject\b/i],
    ["contains @keyframes", /@keyframes/i],
    ["contains animation:", /animation\s*:/i],
    [
      "contains external href/xlink:href",
      /\b(?:href|xlink:href)\s*=\s*["'](?:https?:|\/\/|data:)/i,
    ],
    [
      "review possible background/full-canvas rect",
      /<rect\b(?=[^>]*(?:width\s*=\s*["'](?:100%|\d+)|height\s*=\s*["'](?:100%|\d+)))(?=[^>]*fill\s*=\s*["'](?!none|transparent))/i,
    ],
  ];

  return checks.filter(([, pattern]) => pattern.test(svgText)).map(([message]) => message);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    process.exit(1);
  }

  if (args.help) {
    console.log(usage());
    return;
  }

  if (!args.readme) {
    console.error("Missing required option: --readme");
    console.error(usage());
    process.exit(1);
  }

  const readmePath = path.resolve(args.readme);
  let markdown;
  try {
    markdown = fs.readFileSync(readmePath, "utf8");
  } catch (error) {
    console.error(`Unable to read ${args.readme}: ${error.message}`);
    process.exit(1);
  }

  const readmeDir = path.dirname(readmePath);
  const blocks = extractImageBlocks(markdown);
  const blockNotes = blocks.flatMap(blockFindings);
  const assetRefs = unique(blocks.flatMap((block) => urlsFromMarkup(block.markup)));
  const assetRows = [];
  const assetNotes = [];

  for (const ref of assetRefs) {
    const fullPath = path.resolve(readmeDir, ref);
    const exists = fs.existsSync(fullPath);
    let size = "-";
    if (exists) {
      const stat = fs.statSync(fullPath);
      size = formatBytes(stat.size);
      if (/\.svg$/i.test(ref)) {
        const notes = svgFindings(fs.readFileSync(fullPath, "utf8"));
        for (const note of notes) assetNotes.push(`${ref}: ${note}`);
      }
    }
    assetRows.push({ ref, exists, size });
  }

  console.log("# README Logo Asset Audit");
  console.log("");
  console.log(`- README: \`${path.relative(process.cwd(), readmePath) || args.readme}\``);
  console.log(`- Image blocks found: ${blocks.length}`);
  console.log(`- Local asset references found: ${assetRefs.length}`);
  console.log("");

  console.log("## Image blocks");
  if (blocks.length === 0) {
    console.log("");
    console.log("- None found.");
  } else {
    console.log("");
    for (const block of blocks) {
      const refs = urlsFromMarkup(block.markup);
      console.log(
        `- Line ${block.line}: ${block.type}${refs.length ? ` (${refs.join(", ")})` : ""}`,
      );
    }
  }

  console.log("");
  console.log("## Local assets");
  console.log("");
  if (assetRows.length === 0) {
    console.log("- None found.");
  } else {
    console.log("| Path | Exists | Size |");
    console.log("| --- | --- | --- |");
    for (const row of assetRows) {
      console.log(`| \`${row.ref}\` | ${row.exists ? "yes" : "no"} | ${row.size} |`);
    }
  }

  const findings = [...blockNotes, ...assetNotes];
  console.log("");
  console.log("## Findings");
  console.log("");
  if (findings.length === 0) {
    console.log("- No compatibility findings.");
  } else {
    for (const finding of findings) console.log(`- ${finding}`);
  }
}

main();
