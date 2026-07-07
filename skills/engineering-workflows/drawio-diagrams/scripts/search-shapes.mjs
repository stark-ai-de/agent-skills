#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

function usage() {
  return [
    "Usage: node scripts/search-shapes.mjs <keywords...> [--type vertex|edge] [--limit N] [--index PATH]",
    'Example: node scripts/search-shapes.mjs "postgres database" --type vertex --limit 5',
  ].join("\n");
}

function parseArgs(argv) {
  const args = {
    terms: [],
    type: null,
    limit: 10,
    index: process.env.DRAWIO_SHAPE_INDEX || null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--help" || token === "-h") {
      args.help = true;
    } else if (token === "--type") {
      args.type = argv[++i];
    } else if (token === "--limit") {
      args.limit = Number.parseInt(argv[++i] || "", 10);
    } else if (token === "--index") {
      args.index = path.resolve(argv[++i] || "");
    } else {
      args.terms.push(...token.split(/\s+/).filter(Boolean));
    }
  }
  if (args.type && !["vertex", "edge"].includes(args.type)) {
    throw new Error("--type must be vertex or edge");
  }
  if (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 100) {
    throw new Error("--limit must be an integer from 1 to 100");
  }
  return args;
}

function loadIndex(indexPath) {
  if (!indexPath) {
    throw new Error(
      "Shape index not configured.\n" +
        "Set DRAWIO_SHAPE_INDEX or pass --index with a local JSON/JSON.GZ shape index.\n" +
        "Only fetch or create a local index after explicit user approval.",
    );
  }
  if (!fs.existsSync(indexPath)) {
    throw new Error(
      `Shape index not found: ${indexPath}\n` +
        "Set DRAWIO_SHAPE_INDEX or pass --index with a local JSON/JSON.GZ shape index.\n" +
        "Only fetch or create a local index after explicit user approval.",
    );
  }
  const raw = fs.readFileSync(indexPath);
  const json = indexPath.endsWith(".gz")
    ? zlib.gunzipSync(raw).toString("utf8")
    : raw.toString("utf8");
  const data = JSON.parse(json);
  if (!Array.isArray(data)) {
    throw new Error("Shape index must be a JSON array");
  }
  return data;
}

function itemTitle(item) {
  return item.title || item.name || item.label || "";
}

function itemTags(item) {
  return Array.isArray(item.tags) ? item.tags.join(" ") : item.tags || "";
}

function itemStyle(item) {
  return item.style || item.mystyle || item.mxStyle || "";
}

function score(item, terms) {
  const title = itemTitle(item);
  const tags = itemTags(item);
  const style = itemStyle(item);
  const haystack = `${title} ${tags} ${style}`.toLowerCase();
  let total = 0;
  for (const term of terms) {
    const needle = term.toLowerCase();
    if (!haystack.includes(needle)) return 0;
    if (title.toLowerCase().includes(needle)) total += 5;
    if (tags.toLowerCase().includes(needle)) total += 3;
    if (style.toLowerCase().includes(needle)) total += 1;
  }
  return total;
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
    if (args.help) {
      console.log(usage());
      return;
    }
    if (args.terms.length === 0) {
      throw new Error("Provide at least one keyword");
    }
    const data = loadIndex(args.index);
    const matches = data
      .filter((item) => !args.type || item.type === args.type)
      .map((item) => ({ item, score: score(item, args.terms) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || itemTitle(a.item).localeCompare(itemTitle(b.item)))
      .slice(0, args.limit);

    if (matches.length === 0) {
      console.log(`No shapes matched: ${args.terms.join(" ")}`);
      process.exitCode = 1;
      return;
    }

    for (const { item } of matches) {
      const dimensions = item.w && item.h ? `${item.w}x${item.h}` : "unsized";
      console.log(
        `${itemTitle(item) || "(untitled shape)"} [${item.type || "unknown"}] ${dimensions}`,
      );
      console.log(`  style: ${itemStyle(item)}`);
      if (itemTags(item)) console.log(`  tags: ${itemTags(item)}`);
    }
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    process.exit(2);
  }
}

main();
