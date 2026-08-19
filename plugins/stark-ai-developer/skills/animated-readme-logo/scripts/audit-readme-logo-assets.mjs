#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { inspectAnimatedImageFile } from "./lib/animated-image.mjs";

const MAX_README_FILE_BYTES = 5 * 1024 * 1024;
const MAX_SVG_AUDIT_BYTES = 5 * 1024 * 1024;
const MAX_RASTER_AUDIT_BYTES = 5 * 1024 * 1024;
const MAX_VALIDATOR_OUTPUT_BYTES = 1024 * 1024;
const SVG_VALIDATOR_TIMEOUT_MS = 5_000;
const MAX_IMAGE_BLOCKS = 4_096;
const MAX_REFERENCE_DEFINITIONS = 4_096;
const MAX_ASSET_USES_PER_BLOCK = 8_192;
const MAX_MARKDOWN_IMAGE_SYNTAX_BYTES = 64 * 1024;
const MAX_LOCAL_ASSET_REFERENCES = 256;
const HTML_VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);
const SVG_VALIDATOR = fileURLToPath(new URL("./validate_logo_svg.py", import.meta.url));

function usage() {
  return [
    "Usage: node audit-readme-logo-assets.mjs --root <repo-root> --readme <relative-path>",
    "",
    "Prints a read-only Markdown report for root-bounded README image/logo assets.",
    "",
    "Exit status: 0 clean; 1 compatibility/readiness findings; 2 unsafe input or path.",
  ].join("\n");
}

function auditFailure(message, code = "INVALID_INPUT") {
  const error = new Error(message);
  error.auditSafe = true;
  error.auditCode = code;
  return error;
}

function publicErrorMessage(error, fallback) {
  if (error?.auditSafe) return error.message;
  const code = /^[A-Z0-9_]+$/.test(error?.code || "") ? error.code : "IO_ERROR";
  return `${fallback} [${code}]`;
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
    if (arg === "--root") {
      args.root = argv[i + 1];
      i += 1;
      continue;
    }
    throw auditFailure("Unknown command-line option", "UNKNOWN_OPTION");
  }
  return args;
}

function attrsFrom(tag) {
  const attrs = new Map();
  attrs.duplicates = new Set();
  const pattern = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match;
  while ((match = pattern.exec(tag))) {
    const name = match[1].toLowerCase();
    if (attrs.has(name)) attrs.duplicates.add(name);
    else attrs.set(name, match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attrs;
}

function hasAttributeName(tag, name, attrs = attrsFrom(tag)) {
  if (attrs.has(name)) return true;
  let quote = null;
  let outsideQuotes = "";
  for (const character of tag) {
    if (quote) {
      if (character === quote) quote = null;
      outsideQuotes += " ";
    } else if (character === '"' || character === "'") {
      quote = character;
      outsideQuotes += " ";
    } else {
      outsideQuotes += character;
    }
  }
  return new RegExp("\\s" + name + "(?=\\s|=|/?>)", "i").test(outsideQuotes);
}

function isObviouslyHiddenTag(tag, attrs = attrsFrom(tag)) {
  if (hasAttributeName(tag, "hidden", attrs)) return true;
  const properties = new Map();
  for (const declaration of (attrs.get("style") || "").split(";")) {
    const [rawName, ...rawValue] = declaration.split(":");
    if (rawValue.length === 0) continue;
    properties.set(
      rawName.trim().toLowerCase(),
      rawValue
        .join(":")
        .replace(/\s*!important\s*$/i, "")
        .trim()
        .toLowerCase(),
    );
  }
  if (properties.get("display") === "none") return true;
  if (["hidden", "collapse"].includes(properties.get("visibility"))) return true;
  const opacity = properties.get("opacity");
  if (opacity == null) return false;
  const numeric = Number.parseFloat(opacity);
  return Number.isFinite(numeric) && numeric <= 0;
}

function srcsetUrls(value) {
  const urls = [];
  let index = 0;
  while (index < value.length) {
    while (index < value.length && /[\t\n\f\r ,]/.test(value[index])) index += 1;
    if (index >= value.length) break;

    const start = index;
    while (index < value.length && !/[\t\n\f\r ]/.test(value[index])) index += 1;
    const token = value.slice(start, index);
    const dataMarker = token.search(/(?:^|,)data:/i);
    if (dataMarker !== -1) {
      const dataStart = token[dataMarker] === "," ? dataMarker + 1 : dataMarker;
      urls.push(...token.slice(0, dataMarker).split(",").filter(Boolean));
      urls.push(token.slice(dataStart));
    } else {
      urls.push(...token.split(",").filter(Boolean));
      if (token.endsWith(",")) continue;
    }

    let parentheses = 0;
    while (index < value.length) {
      const character = value[index];
      index += 1;
      if (character === "(") parentheses += 1;
      else if (character === ")" && parentheses > 0) parentheses -= 1;
      else if (character === "," && parentheses === 0) break;
    }
  }
  return urls;
}

function singleBareSrcsetUrl(value) {
  const literal = String(value || "").trim();
  const urls = srcsetUrls(literal);
  return urls.length === 1 && urls[0] === literal ? urls[0] : null;
}

function isPositiveReducedMotionMedia(value) {
  return /^\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)$/i.test(String(value || "").trim());
}

function isLocalAsset(value) {
  if (!value || value.startsWith("#") || value.startsWith("<")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^[a-z]:[\\/]/i.test(value)) return false;
  return true;
}

function hasHtmlCharacterReference(value) {
  return /&#(?:x[0-9a-f]+|[0-9]+);?|&[a-z][a-z0-9]+;/i.test(value);
}

function stripQueryHash(value) {
  const queryless = value.split("?")[0];
  if (hasHtmlCharacterReference(queryless)) return queryless;
  return queryless.split("#")[0];
}

function decodedPath(value, label) {
  let decoded = value;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    let next;
    try {
      next = decodeURIComponent(decoded);
    } catch {
      throw auditFailure(`${label} contains invalid percent encoding`, "INVALID_PERCENT_ENCODING");
    }
    if (next === decoded) break;
    decoded = next;
  }
  if (/%[0-9a-f]{2}/i.test(decoded))
    throw auditFailure(`${label} is over-encoded`, "OVER_ENCODED_PATH");
  if (hasHtmlCharacterReference(decoded)) {
    throw auditFailure(
      `${label} contains an ambiguous HTML character reference`,
      "AMBIGUOUS_CHARACTER_REFERENCE",
    );
  }
  if (
    [...decoded].some((character) => {
      const code = character.codePointAt(0);
      return code < 0x20 || code === 0x7f;
    })
  ) {
    throw auditFailure(`${label} contains control characters`, "CONTROL_CHARACTER");
  }
  if (decoded !== decoded.trim())
    throw auditFailure(`${label} contains URL whitespace`, "URL_WHITESPACE");
  return decoded.replaceAll("\\", "/");
}

function relativeAssetPath(value, label) {
  const decoded = decodedPath(value, label);
  if (
    !decoded ||
    decoded.startsWith("/") ||
    decoded.startsWith("//") ||
    /^[a-z][a-z0-9+.-]*:/i.test(decoded) ||
    path.posix.isAbsolute(decoded) ||
    path.win32.isAbsolute(decoded)
  ) {
    throw auditFailure(`${label} must be a relative repository path`, "ABSOLUTE_OR_REMOTE_PATH");
  }
  return decoded;
}

function isWithin(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
}

function resolveWithinRoot(rootRealPath, baseDirectory, value, label) {
  const relative = relativeAssetPath(value, label);
  const components = relative.split("/").filter((component) => component && component !== ".");
  let current = baseDirectory;
  if (!isWithin(rootRealPath, current)) {
    throw auditFailure(label + " base escapes the repository root", "ROOT_ESCAPE");
  }

  for (let index = 0; index < components.length; index += 1) {
    const component = components[index];
    if (component === "..") {
      current = path.dirname(current);
      if (!isWithin(rootRealPath, current)) {
        throw auditFailure(label + " escapes the repository root", "ROOT_ESCAPE");
      }
      continue;
    }

    const next = path.join(current, component);
    const isLast = index === components.length - 1;
    let stat;
    try {
      stat = fs.lstatSync(next);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      const unresolved = path.resolve(next, ...components.slice(index + 1));
      if (!isWithin(rootRealPath, unresolved)) {
        throw auditFailure(label + " escapes the repository root", "ROOT_ESCAPE");
      }
      return {
        relative,
        path: unresolved,
        rootRelative: path.relative(rootRealPath, unresolved).replaceAll("\\", "/"),
        exists: false,
      };
    }

    if (stat.isSymbolicLink()) {
      let target;
      try {
        target = fs.realpathSync(next);
      } catch {
        throw auditFailure(`${label} contains a dangling symlink`, "DANGLING_SYMLINK");
      }
      if (!isWithin(rootRealPath, target)) {
        throw auditFailure(
          `${label} escapes the repository root through a symlink`,
          "SYMLINK_ESCAPE",
        );
      }
      const targetStat = fs.statSync(target);
      if (!isLast && !targetStat.isDirectory()) {
        throw auditFailure(
          label + " crosses a non-directory path component",
          "NON_DIRECTORY_COMPONENT",
        );
      }
      if (isLast && !targetStat.isFile()) {
        throw auditFailure(label + " must resolve to a regular file", "NOT_REGULAR_FILE");
      }
      current = target;
      continue;
    }

    if (!isLast && !stat.isDirectory()) {
      throw auditFailure(
        `${label} crosses a non-directory path component`,
        "NON_DIRECTORY_COMPONENT",
      );
    }
    if (isLast && !stat.isFile()) {
      throw auditFailure(`${label} must resolve to a regular file`, "NOT_REGULAR_FILE");
    }
    current = next;
  }
  if (!fs.statSync(current).isFile()) {
    throw auditFailure(`${label} must resolve to a regular file`, "NOT_REGULAR_FILE");
  }
  return {
    relative,
    path: current,
    rootRelative: path.relative(rootRealPath, current).replaceAll("\\", "/"),
    exists: true,
  };
}

function newlineOffsets(text) {
  const offsets = [];
  for (let index = text.indexOf("\n"); index !== -1; index = text.indexOf("\n", index + 1)) {
    offsets.push(index);
  }
  return offsets;
}

function lineNumberAt(offsets, index) {
  let low = 0;
  let high = offsets.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (offsets[middle] < index) low = middle + 1;
    else high = middle;
  }
  return low + 1;
}

function unique(values) {
  return [...new Set(values)];
}

function visibleControlCharacters(value) {
  return [...String(value)]
    .map((character) => {
      const code = character.codePointAt(0);
      if (character === "\n") return "\\n";
      if (character === "\r") return "\\r";
      if (character === "\t") return "\\t";
      if (character === "\f") return "\\f";
      if (code < 0x20 || code === 0x7f) {
        return `\\u${code.toString(16).padStart(4, "0")}`;
      }
      return character;
    })
    .join("");
}

function markdownCode(value) {
  const visible = visibleControlCharacters(value);
  if (!/[`|&<>]/.test(visible)) return `\`${visible}\``;
  return `<code>${visible
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("|", "&#124;")
    .replaceAll("`", "&#96;")}</code>`;
}

function normalizeReferenceLabel(value) {
  return String(value)
    .replace(/\\([\\[\]])/g, "$1")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function isEscapedAt(text, index) {
  let backslashes = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor -= 1) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
}

function parseBracket(text, openIndex) {
  let depth = 1;
  let cursor = openIndex + 1;
  const limit = Math.min(text.length, openIndex + MAX_MARKDOWN_IMAGE_SYNTAX_BYTES);
  while (cursor < limit) {
    if (text[cursor] === "\\" && cursor + 1 < limit) {
      cursor += 2;
      continue;
    }
    if (text[cursor] === "[") depth += 1;
    else if (text[cursor] === "]") {
      depth -= 1;
      if (depth === 0) {
        return {
          value: text.slice(openIndex + 1, cursor),
          end: cursor + 1,
        };
      }
    }
    cursor += 1;
  }
  return null;
}

function unescapeMarkdownPunctuation(value) {
  return value.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~\\])/g, "$1");
}

function closingParenthesis(text, start, limit) {
  let depth = 1;
  let quote = null;
  for (let cursor = start; cursor < limit; cursor += 1) {
    const character = text[cursor];
    if (character === "\\") {
      cursor += 1;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "(") depth += 1;
    else if (character === ")") {
      depth -= 1;
      if (depth === 0) return cursor;
    }
  }
  return -1;
}

function parseInlineImageDestination(text, openIndex) {
  const limit = Math.min(text.length, openIndex + MAX_MARKDOWN_IMAGE_SYNTAX_BYTES);
  let cursor = openIndex + 1;
  while (cursor < limit && /[ \t\n\r]/.test(text[cursor])) cursor += 1;
  if (cursor >= limit) return null;

  let destination;
  let afterDestination;
  if (text[cursor] === "<") {
    const start = cursor + 1;
    cursor = start;
    while (cursor < limit) {
      if (text[cursor] === "\\" && cursor + 1 < limit) {
        cursor += 2;
        continue;
      }
      if (text[cursor] === ">") break;
      if (text[cursor] === "\n" || text[cursor] === "\r") return null;
      cursor += 1;
    }
    if (cursor >= limit || text[cursor] !== ">") return null;
    destination = text.slice(start, cursor);
    afterDestination = cursor + 1;
  } else {
    const start = cursor;
    let nested = 0;
    while (cursor < limit) {
      const character = text[cursor];
      if (character === "\\" && cursor + 1 < limit) {
        cursor += 2;
        continue;
      }
      if (character === "(") nested += 1;
      else if (character === ")") {
        if (nested === 0) {
          destination = text.slice(start, cursor);
          return destination
            ? {
                destination: unescapeMarkdownPunctuation(destination),
                end: cursor + 1,
              }
            : null;
        }
        nested -= 1;
      } else if (/\s/.test(character) && nested === 0) {
        break;
      }
      cursor += 1;
    }
    destination = text.slice(start, cursor);
    afterDestination = cursor;
  }
  if (!destination) return null;
  const close = closingParenthesis(text, afterDestination, limit);
  if (close === -1) return null;
  return {
    destination: unescapeMarkdownPunctuation(destination),
    end: close + 1,
  };
}

function mergeRanges(ranges) {
  const sorted = ranges
    .filter(([start, end]) => end > start)
    .sort((left, right) => left[0] - right[0] || left[1] - right[1]);
  const merged = [];
  for (const range of sorted) {
    const previous = merged.at(-1);
    if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1]);
    else merged.push([...range]);
  }
  return merged;
}

function indexInRanges(index, ranges) {
  let low = 0;
  let high = ranges.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const [start, end] = ranges[middle];
    if (index < start) high = middle - 1;
    else if (index >= end) low = middle + 1;
    else return true;
  }
  return false;
}

function markdownLineRecords(markdown) {
  const records = [];
  let start = 0;
  while (start < markdown.length) {
    let contentEnd = start;
    while (
      contentEnd < markdown.length &&
      markdown[contentEnd] !== "\n" &&
      markdown[contentEnd] !== "\r"
    ) {
      contentEnd += 1;
    }
    let end = contentEnd;
    if (markdown[end] === "\r" && markdown[end + 1] === "\n") end += 2;
    else if (end < markdown.length) end += 1;
    records.push({ start, end, content: markdown.slice(start, contentEnd) });
    start = end;
  }
  return records;
}

function scanHtmlTags(markup, excludedRanges = [], { failOnUnclosed = true } = {}) {
  const tags = [];
  const headPattern = /<(\/)?([a-z][a-z0-9:-]*)(?=[\s/>])/iy;
  for (let cursor = 0; cursor < markup.length;) {
    const start = markup.indexOf("<", cursor);
    if (start === -1) break;
    cursor = start + 1;
    if (indexInRanges(start, excludedRanges)) {
      continue;
    }
    if (markup.startsWith("<!--", start)) {
      const commentEnd = markup.indexOf("-->", start + 4);
      cursor = commentEnd === -1 ? markup.length : commentEnd + 3;
      continue;
    }
    headPattern.lastIndex = start;
    const head = headPattern.exec(markup);
    if (!head) continue;

    const limit = Math.min(markup.length, start + MAX_MARKDOWN_IMAGE_SYNTAX_BYTES);
    let quote = null;
    let closed = false;
    for (let index = start + 1; index < limit; index += 1) {
      const character = markup[index];
      if (quote) {
        if (character === quote) quote = null;
        continue;
      }
      if (character === '"' || character === "'") {
        quote = character;
        continue;
      }
      if (character === ">") {
        tags.push({
          name: head[2].toLowerCase(),
          closing: Boolean(head[1]),
          start,
          end: index + 1,
          markup: markup.slice(start, index + 1),
        });
        cursor = index + 1;
        closed = true;
        break;
      }
    }
    if (!closed && failOnUnclosed) {
      throw auditFailure(
        `HTML <${head[2].toLowerCase()}> tag did not close within the ${MAX_MARKDOWN_IMAGE_SYNTAX_BYTES}-byte syntax limit`,
        "HTML_TAG_LIMIT",
      );
    }
    if (!closed) cursor = limit;
  }
  return tags;
}

function annotateHiddenAncestors(tags) {
  const stack = [];
  let hiddenDepth = 0;
  for (const tag of tags) {
    if (tag.closing) {
      const opening = stack.at(-1);
      if (opening?.name === tag.name) {
        stack.pop();
        if (opening.hidden) hiddenDepth -= 1;
      }
      continue;
    }
    tag.hiddenByAncestor = hiddenDepth > 0;
    const hidden = isObviouslyHiddenTag(tag.markup);
    if (!HTML_VOID_ELEMENTS.has(tag.name) && !/\/\s*>$/.test(tag.markup)) {
      stack.push({ name: tag.name, hidden });
      if (hidden) hiddenDepth += 1;
    }
  }
  return tags;
}

function htmlTagRanges(markdown, excludedRanges) {
  return scanHtmlTags(markdown, excludedRanges, {
    failOnUnclosed: false,
  }).map(({ start, end }) => [start, end]);
}

function markdownNonRenderedRanges(markdown) {
  const ranges = [];
  let fence = null;
  for (const line of markdownLineRecords(markdown)) {
    if (fence) {
      const closing = new RegExp(`^ {0,3}${fence.character}{${fence.length},}[ \\t]*$`);
      if (closing.test(line.content)) {
        ranges.push([fence.start, line.end]);
        fence = null;
      }
      continue;
    }

    const opening = line.content.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (opening && !(opening[1][0] === "`" && opening[2].includes("`"))) {
      fence = {
        start: line.start,
        character: opening[1][0],
        length: opening[1].length,
      };
      continue;
    }
    if (/^(?: {4}|\t)/.test(line.content)) ranges.push([line.start, line.end]);
  }
  if (fence) ranges.push([fence.start, markdown.length]);

  const tentativeBlockRanges = mergeRanges(ranges);
  const tagRanges = htmlTagRanges(markdown, tentativeBlockRanges);
  const blockRanges = tentativeBlockRanges.filter(([start]) => !indexInRanges(start, tagRanges));
  const inlineDelimiterExclusions = mergeRanges([...blockRanges, ...tagRanges]);
  const runs = [];
  for (let index = 0; index < markdown.length;) {
    if (markdown[index] !== "`") {
      index += 1;
      continue;
    }
    const start = index;
    while (markdown[index] === "`") index += 1;
    let backslashes = 0;
    for (let cursor = start - 1; cursor >= 0 && markdown[cursor] === "\\"; cursor -= 1) {
      backslashes += 1;
    }
    if (backslashes % 2 === 0 && !indexInRanges(start, inlineDelimiterExclusions)) {
      runs.push({ start, end: index, length: index - start });
    }
  }
  const nextByLength = new Map();
  const nextSame = Array.from({ length: runs.length });
  for (let index = runs.length - 1; index >= 0; index -= 1) {
    nextSame[index] = nextByLength.get(runs[index].length);
    nextByLength.set(runs[index].length, index);
  }
  for (let index = 0; index < runs.length;) {
    const closingIndex = nextSame[index];
    if (closingIndex == null) {
      index += 1;
      continue;
    }
    ranges.push([runs[index].start, runs[closingIndex].end]);
    index = closingIndex + 1;
  }

  const codeRanges = mergeRanges(ranges);
  const commentsOutside = (excluded) => {
    const comments = [];
    let commentStart = markdown.indexOf("<!--");
    while (commentStart !== -1) {
      if (indexInRanges(commentStart, excluded)) {
        commentStart = markdown.indexOf("<!--", commentStart + 4);
        continue;
      }
      const close = markdown.indexOf("-->", commentStart + 4);
      const end = close === -1 ? markdown.length : close + 3;
      comments.push([commentStart, end]);
      commentStart = markdown.indexOf("<!--", end);
    }
    return mergeRanges(comments);
  };
  const initialComments = commentsOutside(mergeRanges([...codeRanges, ...tagRanges]));
  const filteredCodeRanges = codeRanges.filter(([start]) => !indexInRanges(start, initialComments));
  const commentRanges = commentsOutside(mergeRanges([...filteredCodeRanges, ...tagRanges]));
  return mergeRanges([...filteredCodeRanges, ...commentRanges]);
}

function referenceDefinitions(markdown, excludedRanges) {
  const definitions = new Map();
  let definitionCount = 0;
  const pattern =
    /^[ \t]{0,3}\[((?:\\.|[^\\\]\r\n])+)\]:[ \t]*(?:<([^>\r\n]*)>|(\S+))(?:[ \t]+(?:"[^"\r\n]*"|'[^'\r\n]*'|\([^\r\n)]*\)))?[ \t]*$/gm;
  let match;
  while ((match = pattern.exec(markdown))) {
    if (indexInRanges(match.index, excludedRanges)) continue;
    definitionCount += 1;
    if (definitionCount > MAX_REFERENCE_DEFINITIONS) {
      throw auditFailure(
        `README exceeds the ${MAX_REFERENCE_DEFINITIONS} reference-definition limit`,
        "REFERENCE_DEFINITION_LIMIT",
      );
    }
    const label = normalizeReferenceLabel(match[1]);
    const destination = match[2] ?? match[3];
    if (label && destination != null && !definitions.has(label)) {
      definitions.set(label, destination);
    }
  }
  return definitions;
}

function extractImageBlocks(markdown) {
  const blocks = [];
  const lineOffsets = newlineOffsets(markdown);
  const addBlock = (block) => {
    if (blocks.length >= MAX_IMAGE_BLOCKS) {
      throw auditFailure(
        `README exceeds the ${MAX_IMAGE_BLOCKS} image-block limit`,
        "IMAGE_BLOCK_LIMIT",
      );
    }
    blocks.push(block);
  };
  const pictureRanges = [];
  const excludedRanges = markdownNonRenderedRanges(markdown);
  const htmlTags = annotateHiddenAncestors(scanHtmlTags(markdown, excludedRanges));
  const markdownSyntaxExclusions = mergeRanges([
    ...excludedRanges,
    ...htmlTags.map(({ start, end }) => [start, end]),
  ]);
  const definitions = referenceDefinitions(markdown, markdownSyntaxExclusions);
  const openPictures = [];
  for (const tag of htmlTags) {
    if (tag.name !== "picture") continue;
    if (!tag.closing) {
      if (openPictures.length > 0) {
        throw auditFailure("Nested HTML <picture> elements are unsupported", "NESTED_PICTURE");
      }
      openPictures.push(tag);
      continue;
    }
    const opening = openPictures.pop();
    if (!opening) {
      throw auditFailure(
        "HTML </picture> does not have a matching opening tag",
        "UNMATCHED_PICTURE",
      );
    }
    pictureRanges.push([opening.start, tag.end]);
    addBlock({
      type: "picture",
      line: lineNumberAt(lineOffsets, opening.start),
      markup: markdown.slice(opening.start, tag.end),
      hiddenByAncestor: opening.hiddenByAncestor,
    });
  }
  if (openPictures.length > 0) {
    throw auditFailure("HTML <picture> element is not closed", "UNCLOSED_PICTURE");
  }

  const livePictureRanges = mergeRanges(pictureRanges);
  for (const tag of htmlTags) {
    if (tag.name !== "img" || tag.closing) continue;
    const insidePicture = indexInRanges(tag.start, livePictureRanges);
    addBlock({
      type: insidePicture ? "img in picture" : "img",
      line: lineNumberAt(lineOffsets, tag.start),
      markup: tag.markup,
      hiddenByAncestor: tag.hiddenByAncestor,
    });
  }

  for (let cursor = 0; cursor < markdown.length;) {
    const start = markdown.indexOf("![", cursor);
    if (start === -1) break;
    cursor = start + 2;
    if (isEscapedAt(markdown, start) || indexInRanges(start, markdownSyntaxExclusions)) continue;

    const alt = parseBracket(markdown, start + 1);
    if (!alt) {
      addBlock({
        type: "unparsed markdown image",
        line: lineNumberAt(lineOffsets, start),
        markup: "![",
        parseIssue: "alt text or label did not close within the syntax limit",
      });
      cursor = Math.min(markdown.length, start + MAX_MARKDOWN_IMAGE_SYNTAX_BYTES);
      continue;
    }

    if (markdown[alt.end] === "(") {
      const inline = parseInlineImageDestination(markdown, alt.end);
      if (!inline) {
        addBlock({
          type: "unparsed markdown image",
          line: lineNumberAt(lineOffsets, start),
          markup: markdown.slice(start, alt.end + 1),
          parseIssue: "inline destination could not be parsed within the syntax limit",
        });
        cursor = Math.min(markdown.length, alt.end + MAX_MARKDOWN_IMAGE_SYNTAX_BYTES);
        continue;
      }
      addBlock({
        type: "markdown image",
        line: lineNumberAt(lineOffsets, start),
        markup: markdown.slice(start, inline.end),
        urls: [inline.destination],
      });
      cursor = inline.end;
      continue;
    }

    let label = alt.value;
    let end = alt.end;
    if (markdown[alt.end] === "[") {
      const explicit = parseBracket(markdown, alt.end);
      if (!explicit) {
        addBlock({
          type: "unparsed markdown image reference",
          line: lineNumberAt(lineOffsets, start),
          markup: markdown.slice(start, alt.end + 1),
          parseIssue: "reference label could not be parsed within the syntax limit",
        });
        cursor = Math.min(markdown.length, alt.end + MAX_MARKDOWN_IMAGE_SYNTAX_BYTES);
        continue;
      }
      label = explicit.value || alt.value;
      end = explicit.end;
    }
    const destination = definitions.get(normalizeReferenceLabel(label));
    addBlock({
      type: "markdown image reference",
      line: lineNumberAt(lineOffsets, start),
      markup: markdown.slice(start, end),
      ...(destination
        ? { urls: [destination] }
        : { parseIssue: "reference definition was not resolved" }),
    });
    cursor = end;
  }

  return blocks.sort((a, b) => a.line - b.line);
}

function assetUsesFromBlock(block) {
  const uses = (block.urls || []).map((ref) => ({
    ref,
    role: "image",
    media: "",
    eligible: true,
  }));
  for (const tag of scanHtmlTags(block.markup)) {
    if (tag.closing || !["source", "img"].includes(tag.name)) continue;
    const tagName = tag.name;
    const attrs = attrsFrom(tag.markup);
    const media = attrs.get("media") || "";
    const role =
      tagName === "source" && isPositiveReducedMotionMedia(media)
        ? "reduced-motion"
        : tagName === "source"
          ? "source"
          : "fallback";
    if (attrs.has("src")) {
      uses.push({
        ref: attrs.get("src"),
        role,
        media,
        eligible: tagName === "img",
      });
    }
    if (attrs.has("srcset")) {
      const bareUrl = singleBareSrcsetUrl(attrs.get("srcset"));
      for (const ref of srcsetUrls(attrs.get("srcset"))) {
        uses.push({ ref, role, media, eligible: ref === bareUrl });
      }
    }
    if (uses.length > MAX_ASSET_USES_PER_BLOCK) {
      throw auditFailure(
        `image block exceeds the ${MAX_ASSET_USES_PER_BLOCK} asset-use limit`,
        "ASSET_USE_LIMIT",
      );
    }
  }

  return uses;
}

function urlsFromBlock(block) {
  return unique(
    assetUsesFromBlock(block)
      .map(({ ref }) => ref)
      .filter(isLocalAsset)
      .map(stripQueryHash),
  );
}

function blockFindings(block) {
  const findings = [];
  if (block.hiddenByAncestor) {
    findings.push(
      "line " +
        block.line +
        ": image block has a hidden ancestor and cannot provide a meaningful fallback",
    );
  }
  if (block.parseIssue) {
    findings.push(
      `line ${block.line}: Markdown image readiness is unverified (${block.parseIssue})`,
    );
  }
  const scannedTags = scanHtmlTags(block.markup);
  const tags = scannedTags.filter(
    ({ closing, name }) => !closing && ["source", "img"].includes(name),
  );
  if (block.type === "picture") {
    const openingPicture = scannedTags.find(({ closing, name }) => !closing && name === "picture");
    if (openingPicture && isObviouslyHiddenTag(openingPicture.markup)) {
      findings.push(
        "line " + block.line + ": <picture> is hidden and cannot provide a meaningful fallback",
      );
    }
    const imageIndexes = tags.flatMap((tag, index) => (tag.name === "img" ? [index] : []));
    if (imageIndexes.length === 0) {
      findings.push("line " + block.line + ": picture is missing a final <img> fallback");
    } else if (imageIndexes.length > 1) {
      findings.push("line " + block.line + ": picture must contain exactly one <img> fallback");
    }
    if (imageIndexes.length > 0 && imageIndexes.at(-1) !== tags.length - 1) {
      findings.push(
        "line " + block.line + ": final <img> fallback must follow every <source> candidate",
      );
    }
  }
  for (const tag of tags) {
    const tagName = tag.name;
    const attrs = attrsFrom(tag.markup);
    if (isObviouslyHiddenTag(tag.markup, attrs)) {
      findings.push(
        "line " +
          block.line +
          ": <" +
          tagName +
          "> is hidden and cannot provide a meaningful image candidate",
      );
    }
    const relevant =
      tagName === "source"
        ? new Set(["src", "srcset", "media"])
        : new Set(["src", "srcset", "alt", "width", "height"]);
    for (const duplicate of attrs.duplicates) {
      if (relevant.has(duplicate)) {
        findings.push(
          `line ${block.line}: <${tagName}> contains duplicate ${duplicate} attributes`,
        );
      }
    }
    if (tagName === "img") {
      for (const required of ["alt", "width", "height"]) {
        if (!attrs.has(required)) findings.push(`line ${block.line}: <img> missing ${required}`);
      }
      for (const dimension of ["width", "height"]) {
        if (attrs.has(dimension) && !/^[1-9]\d*$/.test(attrs.get(dimension).trim())) {
          findings.push(
            "line " + block.line + ": <img> " + dimension + " must be a positive integer",
          );
        }
      }
    } else if (
      /prefers-reduced-motion/i.test(attrs.get("media") || "") &&
      !isPositiveReducedMotionMedia(attrs.get("media"))
    ) {
      findings.push(
        `line ${block.line}: <source> media is not an unambiguous positive reduced-motion query`,
      );
    }
    if (tagName === "source" && attrs.has("src")) {
      findings.push(
        "line " + block.line + ": <source> must use srcset; src is ignored by picture rendering",
      );
    }
    const bareSrcset = attrs.has("srcset") ? singleBareSrcsetUrl(attrs.get("srcset")) : null;
    if (attrs.has("srcset") && !bareSrcset) {
      findings.push(
        "line " +
          block.line +
          ": <" +
          tagName +
          "> srcset must contain exactly one bare URL without descriptors",
      );
    }
    const hasCandidate =
      (tagName === "img" && attrs.has("src") && attrs.get("src").trim().length > 0) ||
      Boolean(bareSrcset);
    if (!hasCandidate) {
      findings.push(
        "line " +
          block.line +
          ": <" +
          tagName +
          "> must contain a non-empty src or srcset candidate",
      );
    }
  }

  for (const pattern of [
    ["<script", /<script\b/i],
    ["<foreignObject", /<foreignobject\b/i],
    ["@keyframes", /@keyframes/i],
    ["animation:", /animation\s*:/i],
    ["external href", /\b(?:href|xlink:href)\s*=\s*["'](?:https?:|\/\/|data:)/i],
    ["embedded data image", /\b(?:src|srcset)\s*=\s*["'][^"']*data:/i],
  ]) {
    if (pattern[1].test(block.markup))
      findings.push(`line ${block.line}: markup contains ${pattern[0]}`);
  }

  return findings;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readUtf8FileBounded(file, maxBytes, label) {
  const handle = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NONBLOCK);
  try {
    const stat = fs.fstatSync(handle);
    if (!stat.isFile())
      throw auditFailure(`${label} must resolve to a regular file`, "NOT_REGULAR_FILE");
    if (stat.size > maxBytes) {
      throw auditFailure(`${label} exceeds the ${maxBytes}-byte audit limit`, "FILE_TOO_LARGE");
    }

    const buffer = Buffer.alloc(stat.size);
    let offset = 0;
    while (offset < buffer.length) {
      const bytesRead = fs.readSync(handle, buffer, offset, buffer.length - offset, null);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    return buffer.subarray(0, offset).toString("utf8");
  } finally {
    fs.closeSync(handle);
  }
}

function validationCodes(stdout) {
  try {
    const parsed = JSON.parse(stdout);
    return unique(
      (parsed.errors || [])
        .map(({ code }) => String(code || ""))
        .filter((code) => /^[a-z0-9-]+$/.test(code)),
    );
  } catch {
    return [];
  }
}

function inspectSvgReadiness(file) {
  const result = spawnSync("python3", [SVG_VALIDATOR, "--json", file], {
    encoding: "utf8",
    timeout: SVG_VALIDATOR_TIMEOUT_MS,
    maxBuffer: MAX_VALIDATOR_OUTPUT_BYTES,
  });
  if (result.error) {
    const reason =
      result.error.code === "ETIMEDOUT"
        ? "strict SVG validator timed out"
        : result.error.code === "ENOENT"
          ? "strict SVG validator is unavailable"
          : "strict SVG validator could not run";
    return { status: "unverified", reason };
  }
  if (result.status === 0) {
    try {
      const parsed = JSON.parse(result.stdout);
      if (parsed.valid === true) return { status: "static", format: "svg", frameCount: 1 };
    } catch {
      // The validator contract is JSON; malformed output is unverified.
    }
    return {
      status: "unverified",
      reason: "strict SVG validator returned invalid output",
    };
  }
  const codes = validationCodes(result.stdout);
  if (result.status === 1) {
    return {
      status: "invalid",
      reason: codes.length
        ? `strict SVG validation failed: ${codes.join(", ")}`
        : "strict SVG validation failed",
    };
  }
  return {
    status: "unverified",
    reason: codes.length
      ? `strict SVG validation is unverified: ${codes.join(", ")}`
      : "strict SVG validation is unverified",
  };
}

function motionStateForUse(use, assetStates) {
  if (!isLocalAsset(use.ref)) {
    return {
      status: "unverified",
      reason: "remote or embedded candidate was not fetched",
      display: `${use.role} candidate`,
    };
  }
  const ref = stripQueryHash(use.ref);
  return (
    assetStates.get(ref) || {
      status: "unverified",
      reason: "local candidate was not resolved",
      display: `${use.role} candidate`,
    }
  );
}

function motionReadinessFindings(blocks, assetStates) {
  const findings = [];
  for (const block of blocks) {
    if (block.type === "img in picture") continue;
    const evaluated = assetUsesFromBlock(block)
      .filter(({ eligible }) => eligible !== false)
      .map((use, index) => ({
        ...use,
        index,
        state: motionStateForUse(use, assetStates),
      }));
    if (evaluated.length === 0) continue;

    const reported = new Set();
    for (const entry of evaluated) {
      if (!["invalid", "unverified"].includes(entry.state.status)) continue;
      const key = `${entry.role}\u0000${entry.state.display}\u0000${entry.state.reason}`;
      if (reported.has(key)) continue;
      reported.add(key);
      const display = markdownCode(entry.state.display);
      const disposition =
        entry.state.status === "unverified" ? "readiness is unverified" : "is invalid";
      findings.push(
        `line ${block.line}: ${entry.role} ${display} ${disposition} (${entry.state.reason})`,
      );
    }

    const animated = evaluated.filter(
      ({ role, state }) => role !== "reduced-motion" && state.status === "animated",
    );
    if (block.type === "picture") {
      const fallbacks = evaluated.filter(({ role }) => role === "fallback");
      const finalFallback = fallbacks.at(-1);
      if (!finalFallback) {
        findings.push(`line ${block.line}: picture is missing a final <img> fallback`);
      } else {
        if (finalFallback.index !== evaluated.length - 1) {
          findings.push(
            `line ${block.line}: final <img> fallback must follow every <source> candidate`,
          );
        }
        for (const fallback of fallbacks) {
          if (fallback.state.status !== "static") {
            findings.push(
              `line ${block.line}: final <img> fallback ${markdownCode(fallback.state.display)} was not verified static`,
            );
          }
        }
      }
    }
    if (animated.length === 0) continue;
    const reduced = evaluated.filter(({ role }) => role === "reduced-motion");
    if (reduced.length === 0) {
      findings.push(`line ${block.line}: verified animated source without a reduced-motion source`);
      continue;
    }
    const staticReduced = reduced.filter(({ state }) => state.status === "static");
    for (const animatedEntry of animated) {
      if (!staticReduced.some(({ index }) => index < animatedEntry.index)) {
        findings.push(
          `line ${block.line}: verified-static reduced-motion source must precede animated candidate ${markdownCode(animatedEntry.state.display)}`,
        );
      }
    }
    for (const entry of reduced) {
      if (entry.state.status === "animated") {
        findings.push(
          `line ${block.line}: reduced-motion source ${markdownCode(entry.state.display)} is animated`,
        );
      }
    }
    if (staticReduced.length === 0) {
      findings.push(`line ${block.line}: no reduced-motion source was verified static`);
    }
  }
  return findings;
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(publicErrorMessage(error, "invalid command-line input"));
    console.error(usage());
    process.exit(2);
  }

  if (args.help) {
    console.log(usage());
    return;
  }

  if (!args.root || !args.readme) {
    console.error("Missing required options: --root and --readme");
    console.error(usage());
    process.exit(2);
  }

  let rootPath;
  let readmeResolution;
  try {
    rootPath = fs.realpathSync(path.resolve(args.root));
    if (!fs.statSync(rootPath).isDirectory())
      throw auditFailure("--root must resolve to a directory", "INVALID_ROOT");
    readmeResolution = resolveWithinRoot(rootPath, rootPath, args.readme, "README path");
    if (!readmeResolution.exists)
      throw auditFailure("README path does not exist", "MISSING_README");
  } catch (error) {
    console.error(
      `Unsafe or invalid input: ${publicErrorMessage(error, "repository boundary check failed")}`,
    );
    process.exit(2);
  }

  const readmePath = readmeResolution.path;
  let markdown;
  try {
    markdown = readUtf8FileBounded(readmePath, MAX_README_FILE_BYTES, "README");
  } catch (error) {
    console.error(
      `Unable to read declared README: ${publicErrorMessage(error, "README read failed")}`,
    );
    process.exit(error.auditCode === "FILE_TOO_LARGE" ? 2 : 1);
  }

  const readmeDir = path.dirname(readmePath);
  let blocks;
  let blockNotes;
  let assetRefs;
  try {
    blocks = extractImageBlocks(markdown);
    blockNotes = blocks.flatMap(blockFindings);
    assetRefs = unique(blocks.flatMap((block) => urlsFromBlock(block)));
    if (assetRefs.length > MAX_LOCAL_ASSET_REFERENCES) {
      throw auditFailure(
        `README exceeds the ${MAX_LOCAL_ASSET_REFERENCES} local-asset limit`,
        "LOCAL_ASSET_LIMIT",
      );
    }
  } catch (error) {
    console.error(
      `Unable to parse declared README safely: ${publicErrorMessage(error, "README parse limit exceeded")}`,
    );
    process.exit(2);
  }
  const assetRows = [];
  const assetNotes = [];
  const assetStates = new Map();
  const assetDisplayPaths = new Map();
  let unsafeAssetCount = 0;

  for (const ref of assetRefs) {
    let resolved;
    try {
      resolved = resolveWithinRoot(rootPath, readmeDir, ref, "asset reference");
    } catch (error) {
      unsafeAssetCount += 1;
      const displayPath = "rejected asset reference";
      assetDisplayPaths.set(ref, displayPath);
      assetStates.set(ref, {
        status: "unverified",
        reason: "unsafe path was rejected",
        display: displayPath,
      });
      assetRows.push({
        displayPath,
        exists: false,
        size: "-",
        safety: "rejected",
      });
      assetNotes.push(
        `${markdownCode(displayPath)}: rejected unsafe path (${markdownCode(
          publicErrorMessage(error, "path resolution failed"),
        )})`,
      );
      continue;
    }

    const fullPath = resolved.path;
    const exists = resolved.exists;
    const displayPath = resolved.rootRelative || ".";
    assetDisplayPaths.set(ref, displayPath);
    let size = "-";
    if (!exists) {
      assetStates.set(ref, {
        status: "unverified",
        reason: "local asset is missing",
        display: displayPath,
      });
      assetNotes.push(`${markdownCode(displayPath)}: missing local asset`);
      assetRows.push({ displayPath, exists, size, safety: "safe" });
      continue;
    }

    try {
      const stat = fs.statSync(fullPath);
      size = formatBytes(stat.size);
      const lowerPath = resolved.rootRelative.toLowerCase();
      let state;
      if (lowerPath.endsWith(".svg")) {
        state =
          stat.size > MAX_SVG_AUDIT_BYTES
            ? {
                status: "unverified",
                reason: `SVG exceeds the ${MAX_SVG_AUDIT_BYTES}-byte audit limit`,
              }
            : inspectSvgReadiness(fullPath);
      } else if (/\.(?:gif|png|apng|webp)$/.test(lowerPath)) {
        try {
          const inspected = inspectAnimatedImageFile(fullPath, {
            maxFileBytes: MAX_RASTER_AUDIT_BYTES,
          });
          state = {
            status: inspected.animated ? "animated" : "static",
            format: inspected.format,
            frameCount: inspected.frameCount,
          };
        } catch (error) {
          const code = /^[A-Z0-9_]+$/.test(error?.code || "") ? error.code : "INSPECTION_ERROR";
          state = {
            status: ["FILE_LIMIT", "READ_ERROR"].includes(code) ? "unverified" : "invalid",
            reason: `raster inspection failed [${code}]`,
          };
        }
      } else {
        state = {
          status: "unverified",
          reason: "format is not SVG, GIF, PNG/APNG, or WebP",
        };
      }
      assetStates.set(ref, { ...state, display: displayPath });
    } catch (error) {
      assetStates.set(ref, {
        status: "unverified",
        reason: publicErrorMessage(error, "filesystem inspection failed"),
        display: displayPath,
      });
    }
    assetRows.push({ displayPath, exists, size, safety: "safe" });
  }
  const motionNotes = motionReadinessFindings(blocks, assetStates);

  console.log("# README Logo Asset Audit");
  console.log("");
  console.log("- Root boundary: declared repository root");
  console.log(`- README: ${markdownCode(readmeResolution.rootRelative)}`);
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
      const refs = urlsFromBlock(block).map(
        (ref) => assetDisplayPaths.get(ref) || "unresolved asset reference",
      );
      console.log(
        `- Line ${block.line}: ${block.type}${refs.length ? ` (${refs.map(markdownCode).join(", ")})` : ""}`,
      );
    }
  }

  console.log("");
  console.log("## Local assets");
  console.log("");
  if (assetRows.length === 0) {
    console.log("- None found.");
  } else {
    console.log("| Path | Safe | Exists | Size |");
    console.log("| --- | --- | --- | --- |");
    for (const row of assetRows) {
      console.log(
        `| ${markdownCode(row.displayPath)} | ${row.safety === "safe" ? "yes" : "no"} | ${row.exists ? "yes" : "no"} | ${row.size} |`,
      );
    }
  }

  const findings = [...blockNotes, ...assetNotes, ...motionNotes];
  console.log("");
  console.log("## Findings");
  console.log("");
  if (findings.length === 0) {
    console.log("- No compatibility findings.");
  } else {
    for (const finding of findings) console.log(`- ${finding}`);
  }

  if (unsafeAssetCount > 0) process.exitCode = 2;
  else if (findings.length > 0) process.exitCode = 1;
}

main();
