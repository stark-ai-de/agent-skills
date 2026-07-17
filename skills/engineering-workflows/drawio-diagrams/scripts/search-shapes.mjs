#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

function usage() {
  return [
    "Usage: node scripts/search-shapes.mjs <keywords...> [--type vertex|edge] [--limit N] [--index PATH] [--json]",
    'Example: node scripts/search-shapes.mjs "postgres database" --type vertex --limit 5 --json',
  ].join("\n");
}

function takeValue(argv, index, option) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${option} requires a value`);
  return value;
}

function parseArgs(argv) {
  const args = { terms: [], type: null, limit: 10, index: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--help" || token === "-h") {
      args.help = true;
    } else if (token === "--type") {
      args.type = takeValue(argv, i, token);
      i += 1;
    } else if (token === "--limit") {
      args.limit = Number.parseInt(takeValue(argv, i, token), 10);
      i += 1;
    } else if (token === "--index") {
      args.index = path.resolve(takeValue(argv, i, token));
      i += 1;
    } else if (token === "--json") {
      args.json = true;
    } else if (token.startsWith("--")) {
      throw new Error(`Unknown option: ${token}`);
    } else {
      args.terms.push(token);
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

function isFile(file) {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function resolveIndex(explicitIndex) {
  const configured = explicitIndex || process.env.DRAWIO_SHAPE_INDEX;
  if (configured) {
    const resolved = path.resolve(configured);
    if (!isFile(resolved)) throw new Error(`Shape index not found: ${resolved}`);
    return resolved;
  }

  const cacheRoot = path.join(os.homedir(), ".cache", "drawio-diagrams");
  const candidates = [
    path.join(cacheRoot, "search-index.json"),
    path.join(cacheRoot, "search-index.json.gz"),
  ];
  const found = candidates.find(isFile);
  if (found) return found;

  throw new Error(
    "Shape index not configured. Pass --index, set DRAWIO_SHAPE_INDEX, or place search-index.json(.gz) in ~/.cache/drawio-diagrams. Download or create an index only after approval.",
  );
}

function loadIndex(indexPath) {
  const raw = fs.readFileSync(indexPath);
  const json = indexPath.endsWith(".gz")
    ? zlib.gunzipSync(raw).toString("utf8")
    : raw.toString("utf8");
  const data = JSON.parse(json);
  if (!Array.isArray(data)) throw new Error("Shape index must be a JSON array");
  return data;
}

function itemTitle(item) {
  return String(item.title || item.name || item.label || "");
}

function itemTags(item) {
  return Array.isArray(item.tags) ? item.tags.join(" ") : String(item.tags || "");
}

function itemStyle(item) {
  return String(item.style || item.mystyle || item.mxStyle || "");
}

function tokenize(value) {
  const expanded = String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2");
  return (expanded.match(/[A-Za-z0-9]+/g) || [])
    .map((token) => token.toLowerCase())
    .filter((token) => token.length >= 2);
}

function queryTerms(values) {
  return [...new Set(values.flatMap(tokenize))];
}

const SOUNDEX_CODES = "01230120022455012603010202";

function soundexDigit(letter) {
  const index = letter.charCodeAt(0) - 97;
  if (index < 0 || index > 25) return "";
  const digit = SOUNDEX_CODES[index];
  return digit === "0" ? "" : digit;
}

function soundex(value) {
  const letters = String(value)
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (!letters) return "";
  let result = letters[0].toUpperCase();
  let previous = "";
  for (const letter of letters.slice(1)) {
    const digit = soundexDigit(letter);
    if (digit && digit !== previous) result += digit;
    if (digit) previous = digit;
    if (result.length === 4) break;
  }
  return result.padEnd(4, "0");
}

function tagTokens(item) {
  return [
    ...new Set(
      itemTags(item)
        .toLowerCase()
        .replace(/[/,()]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 2),
    ),
  ];
}

function phoneticToken(value) {
  return soundex(value.replace(/\.*\d*$/, ""));
}

function termScore(term, tags) {
  if (tags.includes(term)) return 1;
  const phonetic = phoneticToken(term);
  if (phonetic && tags.some((tag) => phoneticToken(tag) === phonetic)) return 0.5;
  return 0;
}

function rankItem(item, terms, index) {
  const title = itemTitle(item);
  const tags = tagTokens(item);
  const scores = terms.map((term) => termScore(term, tags));
  const titleTokens = new Set(
    title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  );
  return {
    item,
    index,
    matchedTerms: scores.filter((score) => score > 0).length,
    score: scores.reduce((sum, score) => sum + score, 0),
    titleHits: terms.filter((term) => titleTokens.has(term)).length,
  };
}

function resultFor(item) {
  return {
    title: itemTitle(item),
    style: itemStyle(item),
    w: item.w ?? null,
    h: item.h ?? null,
    type: item.type || null,
  };
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      console.log(usage());
      return;
    }
    const terms = queryTerms(args.terms);
    if (terms.length === 0) throw new Error("Provide at least one keyword");

    const data = loadIndex(resolveIndex(args.index));
    const ranked = data
      .filter((item) => !args.type || item.type === args.type)
      .map((item, index) => rankItem(item, terms, index))
      .filter((entry) => entry.matchedTerms > 0);
    const strict = ranked.filter((entry) => entry.matchedTerms === terms.length);
    const pool = strict.length > 0 ? strict : ranked;
    const fallback = strict.length === 0 && pool.length > 0;

    const matches = pool
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.titleHits - a.titleHits ||
          itemTitle(a.item).localeCompare(itemTitle(b.item)) ||
          a.index - b.index,
      )
      .slice(0, args.limit)
      .map(({ item }) => resultFor(item));

    if (matches.length === 0) {
      console.error(`No shapes matched: ${terms.join(" ")}`);
      process.exitCode = 1;
      return;
    }
    if (fallback) {
      console.error("No shape matched every term; showing ranked partial matches.");
    }

    if (args.json) {
      console.log(JSON.stringify(matches, null, 2));
      return;
    }
    for (const item of matches) {
      const dimensions = item.w && item.h ? `${item.w}x${item.h}` : "unsized";
      console.log(`${item.title || "(untitled shape)"} [${item.type || "unknown"}] ${dimensions}`);
      console.log(`  style: ${item.style}`);
    }
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    process.exit(2);
  }
}

main();
