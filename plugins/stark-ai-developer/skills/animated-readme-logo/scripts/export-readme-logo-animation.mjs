#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  chmodSync,
  closeSync,
  constants,
  copyFileSync,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { TextDecoder } from "node:util";

import { inspectAnimatedImageFile } from "./lib/animated-image.mjs";
import {
  captureOutputSnapshot,
  removeAnchoredStageDirectory,
  replaceOutputsAtomically,
  TransactionalOutputError,
} from "./lib/transactional-output.mjs";

const MAX_DIMENSION = 4096;
const MAX_FRAME_COUNT = 1000;
const MAX_FRAME_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_FRAME_BYTES = 4 * MAX_FRAME_BYTES;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_GIF_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_PIXELS = 250_000_000;
const DEFAULT_GIF_BYTES = 5 * 1024 * 1024;
const DEFAULT_GIF_COLORS = 128;

const deterministicEnvironment = {
  ...process.env,
  LANG: "C",
  LC_ALL: "C",
  SOURCE_DATE_EPOCH: "0",
  TZ: "UTC",
};
delete deterministicEnvironment.FFREPORT;

class ExportError extends Error {
  constructor(code, message, category = "validation") {
    super(message);
    this.name = "ExportError";
    this.code = code;
    this.category = category;
  }
}

function fail(code, message, category) {
  throw new ExportError(code, message, category);
}

function usage() {
  return `Usage: node export-readme-logo-animation.mjs --root <repository> --recipe <relative.mjs> [options]

Export a static PNG and animated GIF from a trusted, repository-owned JavaScript recipe.
The recipe, canonical SVG, and output paths must remain inside the declared repository root.

Options:
  --root PATH       Existing repository root
  --recipe PATH     Root-relative .mjs recipe module
  --check           Validate the recipe and every frame without exporter-controlled writes
  --replace         Replace existing outputs only after both new artifacts validate
  --json            Emit one deterministic JSON object
  -h, --help        Show this help

The exporter runs rsvg-convert and ffmpeg but never installs them. Inspect the skill's
references/local-tooling.md and obtain approval before installing a missing command.

Exit codes: 0=checked/exported; 1=invalid recipe/export failure; 2=usage or I/O failure.`;
}

function requiredValue(argv, index, option) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    fail("MISSING_OPTION_VALUE", `${option} requires a value`, "usage");
  }
  return value;
}

function parseArgs(argv) {
  const args = { check: false, json: false, replace: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--root") {
      args.root = requiredValue(argv, ++index, argument);
    } else if (argument === "--recipe") {
      args.recipe = requiredValue(argv, ++index, argument);
    } else if (argument === "--check") {
      args.check = true;
    } else if (argument === "--json") {
      args.json = true;
    } else if (argument === "--replace") {
      args.replace = true;
    } else if (argument === "--help" || argument === "-h") {
      args.help = true;
    } else {
      fail("UNKNOWN_OPTION", "unknown option", "usage");
    }
  }
  return args;
}

function isWithin(parent, candidate) {
  const rel = relative(parent, candidate);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`));
}

function canonicalDirectory(input, label) {
  let canonical;
  let stats;
  try {
    canonical = realpathSync(resolve(input));
    stats = statSync(canonical);
  } catch {
    fail("INVALID_ROOT", `${label} must name an existing directory`, "io");
  }
  if (!stats.isDirectory()) {
    fail("INVALID_ROOT", `${label} must name an existing directory`, "io");
  }
  return canonical;
}

function safeRelativePath(value, label, expectedExtension) {
  if (typeof value !== "string" || value.length === 0) {
    fail("INVALID_PATH", `${label} must be a non-empty relative path`);
  }
  if (/\0|[\u0001-\u001f\u007f]/u.test(value)) {
    fail("INVALID_PATH", `${label} must not contain control characters`);
  }
  if (
    isAbsolute(value) ||
    /^[a-zA-Z]:[\\/]/.test(value) ||
    /^\\\\/.test(value) ||
    /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)
  ) {
    fail("INVALID_PATH", `${label} must be a root-relative repository path`);
  }
  if (expectedExtension && extname(value).toLowerCase() !== expectedExtension) {
    fail("INVALID_PATH", `${label} must end in ${expectedExtension}`);
  }
  return value;
}

function lexicalPath(root, value, label) {
  const candidate = resolve(root, safeRelativePath(value, label));
  if (!isWithin(root, candidate)) {
    fail("ROOT_ESCAPE", `${label} escapes the declared repository root`);
  }
  return candidate;
}

function existingRegularFile(root, value, label, expectedExtension) {
  safeRelativePath(value, label, expectedExtension);
  const candidate = lexicalPath(root, value, label);
  let canonical;
  let stats;
  try {
    canonical = realpathSync(candidate);
    stats = statSync(canonical);
  } catch {
    fail("MISSING_INPUT", `${label} must name an existing regular file`, "io");
  }
  if (!isWithin(root, canonical)) {
    fail("ROOT_ESCAPE", `${label} escapes the declared repository root through a symlink`);
  }
  if (!stats.isFile()) {
    fail("INVALID_INPUT", `${label} must name an existing regular file`, "io");
  }
  return canonical;
}

function nearestExistingAncestor(candidate, label) {
  let current = candidate;
  while (true) {
    try {
      lstatSync(current);
      return current;
    } catch (error) {
      if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") {
        fail("INVALID_OUTPUT", `${label} parent could not be inspected`, "io");
      }
    }
    const parent = dirname(current);
    if (parent === current) return current;
    current = parent;
  }
}

function safeOutputPath(root, value, label, expectedExtension) {
  safeRelativePath(value, label, expectedExtension);
  const candidate = lexicalPath(root, value, label);
  const ancestor = nearestExistingAncestor(dirname(candidate), label);
  let canonicalAncestor;
  let ancestorStats;
  try {
    canonicalAncestor = realpathSync(ancestor);
    ancestorStats = statSync(canonicalAncestor);
  } catch {
    fail("INVALID_OUTPUT", `${label} has no resolvable parent directory`, "io");
  }
  if (!isWithin(root, canonicalAncestor)) {
    fail("ROOT_ESCAPE", `${label} escapes the declared repository root through a symlink`);
  }
  if (!ancestorStats.isDirectory()) {
    fail("INVALID_OUTPUT", `${label} parent must resolve through directories`, "io");
  }
  let candidateStats;
  try {
    candidateStats = lstatSync(candidate);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      fail("INVALID_OUTPUT", `${label} could not be inspected`, "io");
    }
  }
  if (candidateStats) {
    const stats = candidateStats;
    if (stats.isSymbolicLink() || !stats.isFile()) {
      fail("INVALID_OUTPUT", `${label} must be absent or an existing regular file`, "io");
    }
    if (!isWithin(root, realpathSync(candidate))) {
      fail("ROOT_ESCAPE", `${label} escapes the declared repository root through a symlink`);
    }
  }
  return candidate;
}

function outputDirectoryIdentity(root, directory, label) {
  let before;
  let canonical;
  let after;
  try {
    before = lstatSync(directory);
    if (before.isSymbolicLink()) {
      fail("ROOT_ESCAPE", `${label} parent component must not be a symlink`, "io");
    }
    if (!before.isDirectory()) {
      fail("INVALID_OUTPUT", `${label} parent components must be real directories`, "io");
    }
    canonical = realpathSync(directory);
    after = lstatSync(directory);
  } catch (error) {
    if (error instanceof ExportError) throw error;
    fail("INVALID_OUTPUT", `${label} parent component could not be inspected`, "io");
  }
  if (
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    after.isSymbolicLink() ||
    !after.isDirectory()
  ) {
    fail("INVALID_OUTPUT", `${label} parent component changed during inspection`, "io");
  }
  if (!isWithin(root, canonical)) {
    fail("ROOT_ESCAPE", `${label} parent escaped the declared repository root`, "io");
  }
  return { path: directory, canonical, dev: after.dev, ino: after.ino };
}

function descriptorDirectoryRoot() {
  if (process.platform === "linux") return "/proc/self/fd";
  if (process.platform === "win32") return null;
  return "/dev/fd";
}

function directoryOpenFlags() {
  return (
    constants.O_RDONLY |
    (constants.O_DIRECTORY ?? 0) |
    (process.platform === "win32" ? 0 : (constants.O_NOFOLLOW ?? 0))
  );
}

function descriptorPath(descriptor) {
  const root = descriptorDirectoryRoot();
  return root ? `${root}/${descriptor}` : null;
}

function ensureOutputParent(root, outputPath, label) {
  const parent = dirname(outputPath);
  const parentRelative = relative(root, parent);
  if (parentRelative === ".." || parentRelative.startsWith(`..${sep}`)) {
    fail("ROOT_ESCAPE", `${label} parent escapes the declared repository root`, "io");
  }

  const descriptorDirectory = descriptorDirectoryRoot();
  if (!descriptorDirectory) {
    fail(
      "INVALID_OUTPUT",
      `${label} cannot be mutated safely because this platform has no descriptor-directory view`,
      "io",
    );
  }
  const components =
    parentRelative === "" || parentRelative === "."
      ? []
      : parentRelative.split(sep).filter(Boolean);
  let current = root;
  const directoryFlags = directoryOpenFlags();
  let descriptor;
  try {
    descriptor = openSync(root, directoryFlags);
    for (const component of components) {
      const next = join(current, component);
      const anchored = `${descriptorDirectory}/${descriptor}/${component}`;
      let childDescriptor;
      try {
        childDescriptor = openSync(anchored, directoryFlags);
      } catch (error) {
        if (error?.code !== "ENOENT") {
          fail("ROOT_ESCAPE", `${label} parent component could not be opened safely`, "io");
        }
        // POSIX hosts expose the held directory descriptor through /proc or /dev/fd.
        // Creating exactly one child below that descriptor prevents a raced lexical
        // ancestor from redirecting this mutation outside --root. EEXIST is safe only if
        // the no-follow open below
        // subsequently proves that the peer created a real directory.
        try {
          mkdirSync(anchored);
        } catch (mkdirError) {
          if (mkdirError?.code !== "EEXIST") {
            fail("INVALID_OUTPUT", `${label} parent component could not be created`, "io");
          }
        }
        try {
          childDescriptor = openSync(anchored, directoryFlags);
        } catch {
          fail("ROOT_ESCAPE", `${label} parent component became unsafe`, "io");
        }
      }
      const childStats = fstatSync(childDescriptor);
      if (!childStats.isDirectory()) {
        closeSync(childDescriptor);
        fail("INVALID_OUTPUT", `${label} parent component is not a directory`, "io");
      }
      let lexical;
      try {
        lexical = outputDirectoryIdentity(root, next, label);
      } catch (error) {
        closeSync(childDescriptor);
        throw error;
      }
      if (lexical.dev !== childStats.dev || lexical.ino !== childStats.ino) {
        closeSync(childDescriptor);
        fail("INVALID_OUTPUT", `${label} parent component changed during creation`, "io");
      }
      closeSync(descriptor);
      descriptor = childDescriptor;
      current = next;
    }
    const identity = outputParentIdentity(root, outputPath, label);
    const descriptorStats = fstatSync(descriptor);
    if (identity.dev !== descriptorStats.dev || identity.ino !== descriptorStats.ino) {
      fail("INVALID_OUTPUT", `${label} parent changed before it could be bound`, "io");
    }
    return {
      ...identity,
      root,
      descriptor,
      anchorPath: `${descriptorDirectory}/${descriptor}`,
    };
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    throw error;
  }
}

function createAnchoredStage(parent, prefix, label) {
  let entryPath;
  let descriptor;
  try {
    entryPath = mkdtempSync(join(parent.anchorPath, prefix));
    const name = basename(entryPath);
    const lexicalPath = join(parent.canonicalParent, name);
    descriptor = openSync(entryPath, directoryOpenFlags());
    const descriptorStats = fstatSync(descriptor);
    const lexical = outputDirectoryIdentity(parent.root, lexicalPath, label);
    if (lexical.dev !== descriptorStats.dev || lexical.ino !== descriptorStats.ino) {
      fail("INVALID_OUTPUT", `${label} changed while it was being bound`, "io");
    }
    return {
      lexicalPath,
      entryPath,
      descriptor,
      anchorPath: descriptorPath(descriptor),
    };
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    if (entryPath) {
      try {
        removeAnchoredStageDirectory({ anchorPath: parent.anchorPath, entryPath }, []);
      } catch {
        // The caller will report the primary stage-creation failure. The entry is anchored
        // below a held parent descriptor, so refusing recursive cleanup cannot touch a peer.
      }
    }
    throw error;
  }
}

function outputParentIdentity(root, outputPath, label) {
  let canonicalParent;
  let stats;
  try {
    canonicalParent = realpathSync(dirname(outputPath));
    stats = lstatSync(canonicalParent);
  } catch {
    fail("INVALID_OUTPUT", `${label} parent could not be inspected`, "io");
  }
  if (!stats.isDirectory()) {
    fail("INVALID_OUTPUT", `${label} parent must remain a directory`, "io");
  }
  if (!isWithin(root, canonicalParent)) {
    fail("ROOT_ESCAPE", `${label} parent escaped the declared repository root`, "io");
  }
  return { canonicalParent, dev: stats.dev, ino: stats.ino, label };
}

function assertOutputParentStable(root, outputPath, expected) {
  let current;
  try {
    current = outputParentIdentity(root, outputPath, expected.label);
  } catch {
    throw new TransactionalOutputError(
      "OUTPUT_ROLLBACK_INCOMPLETE",
      "an output parent changed during export; staged files were retained for manual recovery",
      { preserveStageDirectories: true },
    );
  }
  if (
    current.canonicalParent !== expected.canonicalParent ||
    current.dev !== expected.dev ||
    current.ino !== expected.ino
  ) {
    throw new TransactionalOutputError(
      "OUTPUT_ROLLBACK_INCOMPLETE",
      "an output parent changed during export; staged files were retained for manual recovery",
      { preserveStageDirectories: true },
    );
  }
}

function positiveInteger(value, label, maximum) {
  if (!Number.isSafeInteger(value) || value <= 0 || value > maximum) {
    fail("INVALID_RECIPE", `${label} must be a positive integer no greater than ${maximum}`);
  }
  return value;
}

function recipeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("INVALID_RECIPE", "recipe default export must be an object");
  }
  return value;
}

function rejectUnknownRecipeKeys(recipe) {
  const supported = new Set([
    "schemaVersion",
    "source",
    "staticOutput",
    "animatedOutput",
    "width",
    "height",
    "fps",
    "frameCount",
    "maxTotalFrameBytes",
    "maxFileBytes",
    "gifMaxColors",
    "preserveTransparency",
    "renderFrame",
  ]);
  for (const key of Object.keys(recipe)) {
    if (!supported.has(key)) {
      fail("INVALID_RECIPE", "recipe contains an unsupported field");
    }
  }
}

function validateRecipe(recipeValue, root, recipePath) {
  const recipe = recipeObject(recipeValue);
  rejectUnknownRecipeKeys(recipe);
  if (recipe.schemaVersion !== 1) {
    fail("INVALID_RECIPE", "recipe schemaVersion must be exactly 1");
  }
  const sourcePath = existingRegularFile(root, recipe.source, "recipe source", ".svg");
  const staticOutputPath = safeOutputPath(root, recipe.staticOutput, "static output", ".png");
  const animatedOutputPath = safeOutputPath(root, recipe.animatedOutput, "animated output", ".gif");
  const paths = [sourcePath, recipePath, staticOutputPath, animatedOutputPath];
  if (new Set(paths).size !== paths.length) {
    fail("PATH_COLLISION", "recipe source, recipe module, and outputs must use distinct paths");
  }

  const width = positiveInteger(recipe.width, "width", MAX_DIMENSION);
  const height = positiveInteger(recipe.height, "height", MAX_DIMENSION);
  const fps = positiveInteger(recipe.fps, "fps", 60);
  const frameCount = positiveInteger(recipe.frameCount, "frameCount", MAX_FRAME_COUNT);
  if (frameCount < 2) {
    fail("INVALID_RECIPE", "frameCount must be at least 2 for an animated export");
  }
  if (width * height * frameCount > MAX_TOTAL_PIXELS) {
    fail("INVALID_RECIPE", `recipe exceeds the ${MAX_TOTAL_PIXELS}-pixel export-work limit`);
  }
  const maxTotalFrameBytes = positiveInteger(
    recipe.maxTotalFrameBytes ?? MAX_TOTAL_FRAME_BYTES,
    "maxTotalFrameBytes",
    MAX_TOTAL_FRAME_BYTES,
  );
  const maxFileBytes = positiveInteger(
    recipe.maxFileBytes ?? DEFAULT_GIF_BYTES,
    "maxFileBytes",
    MAX_GIF_BYTES,
  );
  const preserveTransparency = recipe.preserveTransparency ?? true;
  if (typeof preserveTransparency !== "boolean") {
    fail("INVALID_RECIPE", "preserveTransparency must be a boolean when provided");
  }
  const gifMaxColors = positiveInteger(
    recipe.gifMaxColors ?? DEFAULT_GIF_COLORS,
    "gifMaxColors",
    256,
  );
  const minimumGifColors = preserveTransparency ? 3 : 2;
  if (gifMaxColors < minimumGifColors) {
    fail(
      "INVALID_RECIPE",
      `gifMaxColors must be at least ${minimumGifColors} when preserveTransparency is ${preserveTransparency}`,
    );
  }
  if (typeof recipe.renderFrame !== "function") {
    fail("INVALID_RECIPE", "recipe must export a renderFrame function");
  }

  return {
    source: recipe.source,
    sourcePath,
    staticOutput: recipe.staticOutput,
    staticOutputPath,
    animatedOutput: recipe.animatedOutput,
    animatedOutputPath,
    width,
    height,
    fps,
    frameCount,
    maxTotalFrameBytes,
    maxFileBytes,
    gifMaxColors,
    preserveTransparency,
    renderFrame: recipe.renderFrame.bind(recipe),
  };
}

const XML_NAME_RE = /^(?:[A-Za-z_][A-Za-z0-9_.-]*:)?[A-Za-z_][A-Za-z0-9_.-]*/u;
const LOCAL_FRAGMENT_RE = /^#[A-Za-z_][A-Za-z0-9_.:-]*$/u;
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";
const XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
const XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";
const XML_WHITESPACE_RE = /^[\t\n\r ]*$/u;
const CSS_URL_ATTRIBUTES = new Set([
  "clip-path",
  "cursor",
  "fill",
  "filter",
  "marker",
  "marker-end",
  "marker-mid",
  "marker-start",
  "mask",
  "stroke",
  "style",
]);
const UNSUPPORTED_SVG_ELEMENTS = new Set([
  "audio",
  "canvas",
  "embed",
  "foreignObject",
  "iframe",
  "object",
  "script",
  "video",
]);
const DECLARATIVE_ANIMATION_SVG_ELEMENTS = new Set([
  "animate",
  "animatecolor",
  "animatemotion",
  "animatetransform",
  "discard",
  "mpath",
  "set",
]);
const XML_ENTITIES = Object.freeze({
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  quot: '"',
});

function isXmlCodePoint(codePoint) {
  return (
    codePoint === 0x09 ||
    codePoint === 0x0a ||
    codePoint === 0x0d ||
    (codePoint >= 0x20 && codePoint <= 0xd7ff) ||
    (codePoint >= 0xe000 && codePoint <= 0xfffd) ||
    (codePoint >= 0x10000 && codePoint <= 0x10ffff)
  );
}

function assertXmlCharacters(value, label, code) {
  for (const character of value) {
    if (!isXmlCodePoint(character.codePointAt(0))) {
      fail(code, `${label} contains a character forbidden by XML 1.0`);
    }
  }
}

function decodeXmlEntities(value, label, code) {
  let decoded = "";
  let offset = 0;
  while (offset < value.length) {
    const opening = value.indexOf("&", offset);
    if (opening === -1) {
      decoded += value.slice(offset);
      break;
    }
    decoded += value.slice(offset, opening);
    const end = value.indexOf(";", opening + 1);
    if (end === -1) fail(code, `${label} contains malformed XML text`);
    const entity = value.slice(opening + 1, end);
    if (Object.hasOwn(XML_ENTITIES, entity)) {
      decoded += XML_ENTITIES[entity];
    } else if (/^#\d+$/u.test(entity) || /^#x[\dA-Fa-f]+$/u.test(entity)) {
      const radix = entity.startsWith("#x") ? 16 : 10;
      const digits = entity.slice(radix === 16 ? 2 : 1);
      const codePoint = Number.parseInt(digits, radix);
      if (!Number.isSafeInteger(codePoint) || !isXmlCodePoint(codePoint)) {
        fail(code, `${label} contains an invalid XML character reference`);
      }
      decoded += String.fromCodePoint(codePoint);
    } else {
      fail(code, `${label} contains an unsupported XML entity`);
    }
    offset = end + 1;
  }
  return decoded;
}

function xmlTagEnd(svg, start, label, code) {
  let quote = null;
  for (let index = start; index < svg.length; index += 1) {
    const character = svg[index];
    if (quote) {
      if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === ">") {
      return index;
    } else if (character === "<") {
      fail(code, `${label} contains malformed XML markup`);
    }
  }
  fail(code, `${label} contains unterminated XML markup`);
}

function parseXmlTag(content, label, code) {
  if (content.startsWith("/")) {
    const closing = content.slice(1);
    const match = closing.match(XML_NAME_RE);
    if (!match || !XML_WHITESPACE_RE.test(closing.slice(match[0].length))) {
      fail(code, `${label} contains a malformed closing tag`);
    }
    return { attributes: new Map(), closing: true, name: match[0], selfClosing: false };
  }

  const selfClosing = content.endsWith("/");
  const body = selfClosing ? content.slice(0, -1) : content;
  const nameMatch = body.match(XML_NAME_RE);
  if (!nameMatch) fail(code, `${label} contains a malformed opening tag`);
  const name = nameMatch[0];

  const attributes = new Map();
  const rawAttributes = new Map();
  let offset = name.length;
  while (offset < body.length) {
    if (!/[\t\n\r ]/u.test(body[offset])) {
      fail(code, `${label} contains malformed element attributes`);
    }
    while (offset < body.length && /[\t\n\r ]/u.test(body[offset])) offset += 1;
    if (offset === body.length) break;

    const attributeMatch = body.slice(offset).match(XML_NAME_RE);
    if (!attributeMatch) fail(code, `${label} contains a malformed attribute name`);
    const attribute = attributeMatch[0];
    if (attributes.has(attribute)) fail(code, `${label} contains a duplicate attribute`);
    offset += attribute.length;
    while (offset < body.length && /[\t\n\r ]/u.test(body[offset])) offset += 1;
    if (body[offset] !== "=") fail(code, `${label} contains an unassigned attribute`);
    offset += 1;
    while (offset < body.length && /[\t\n\r ]/u.test(body[offset])) offset += 1;
    const quote = body[offset];
    if (quote !== '"' && quote !== "'") {
      fail(code, `${label} contains an unquoted attribute`);
    }
    const valueStart = ++offset;
    const valueEnd = body.indexOf(quote, valueStart);
    if (valueEnd === -1) fail(code, `${label} contains an unterminated attribute`);
    const value = body.slice(valueStart, valueEnd);
    if (value.includes("<")) fail(code, `${label} contains malformed attribute text`);
    rawAttributes.set(attribute, value);
    attributes.set(attribute, decodeXmlEntities(value, label, code));
    offset = valueEnd + 1;
  }
  return { attributes, closing: false, name, rawAttributes, selfClosing };
}

function resolveElementName(name, namespaces, label, code) {
  const separator = name.indexOf(":");
  const prefix = separator === -1 ? "" : name.slice(0, separator);
  const localName = separator === -1 ? name : name.slice(separator + 1);
  const namespace = namespaces.get(prefix);
  if (namespace === undefined) {
    fail(code, `${label} contains an undeclared XML namespace prefix`);
  }
  return { key: `${namespace}\u0000${localName}`, localName, namespace, rawName: name };
}

function parseSvgDocument(svg, label, code) {
  if (svg.startsWith("\uFEFF")) svg = svg.slice(1);
  assertXmlCharacters(svg, label, code);
  const stack = [];
  const namespaceStack = [];
  const cssValues = [];
  const ids = new Set();
  const references = [];
  let root = null;
  let rootClosed = false;
  let documentNamespace = null;
  let sawXmlDeclaration = false;
  let offset = 0;

  while (offset < svg.length) {
    const opening = svg.indexOf("<", offset);
    const text = opening === -1 ? svg.slice(offset) : svg.slice(offset, opening);
    const decodedText = decodeXmlEntities(text, label, code);
    if (text.includes("]]>") && stack.length > 0) {
      fail(code, `${label} contains a CDATA terminator outside CDATA`);
    }
    if (stack.at(-1)?.localName === "style") stack.at(-1).styleText += decodedText;
    if (stack.length === 0 && !XML_WHITESPACE_RE.test(text)) {
      fail(code, `${label} contains text outside its SVG root`);
    }
    if (opening === -1) break;

    if (svg.startsWith("<!--", opening)) {
      const end = svg.indexOf("-->", opening + 4);
      const content = end === -1 ? "" : svg.slice(opening + 4, end);
      if (end === -1 || content.includes("--") || content.endsWith("-")) {
        fail(code, `${label} contains a malformed XML comment`);
      }
      offset = end + 3;
      continue;
    }
    if (svg.startsWith("<![CDATA[", opening)) {
      if (stack.length === 0) fail(code, `${label} contains CDATA outside its SVG root`);
      const end = svg.indexOf("]]>", opening + 9);
      if (end === -1) fail(code, `${label} contains unterminated CDATA`);
      if (stack.at(-1)?.localName === "style") {
        stack.at(-1).styleText += svg.slice(opening + 9, end);
      }
      offset = end + 3;
      continue;
    }
    if (svg.startsWith("<?", opening)) {
      const end = svg.indexOf("?>", opening + 2);
      const declaration = end === -1 ? "" : svg.slice(opening, end + 2);
      if (
        end === -1 ||
        sawXmlDeclaration ||
        root !== null ||
        opening !== 0 ||
        !/^<\?xml[\t\n\r ]+version=(?:"1\.[01]"|'1\.[01]')(?:[\t\n\r ]+encoding=(?:"[Uu][Tt][Ff]-8"|'[Uu][Tt][Ff]-8'))?(?:[\t\n\r ]+standalone=(?:"(?:yes|no)"|'(?:yes|no)'))?[\t\n\r ]*\?>$/u.test(
          declaration,
        )
      ) {
        fail(code, `${label} contains an unsupported processing instruction`);
      }
      sawXmlDeclaration = true;
      offset = end + 2;
      continue;
    }
    if (svg.startsWith("<!", opening)) {
      fail(code, `${label} contains unsupported XML content`);
    }

    const end = xmlTagEnd(svg, opening + 1, label, code);
    const tag = parseXmlTag(svg.slice(opening + 1, end), label, code);
    if (tag.closing) {
      const closingName = resolveElementName(
        tag.name,
        namespaceStack.at(-1) ??
          new Map([
            ["", ""],
            ["xml", XML_NAMESPACE],
          ]),
        label,
        code,
      );
      if (stack.at(-1)?.key !== closingName.key || stack.at(-1)?.rawName !== closingName.rawName) {
        fail(code, `${label} contains mismatched XML tags`);
      }
      if (stack.at(-1).localName === "style") cssValues.push(stack.at(-1).styleText);
      stack.pop();
      namespaceStack.pop();
      if (stack.length === 0) rootClosed = true;
    } else {
      const namespaces = new Map(
        namespaceStack.at(-1) ?? [
          ["", ""],
          ["xml", XML_NAMESPACE],
        ],
      );
      for (const [attribute, value] of tag.attributes) {
        if (attribute === "xmlns") {
          if (value === XML_NAMESPACE || value === XMLNS_NAMESPACE) {
            fail(code, `${label} contains an invalid default XML namespace declaration`);
          }
          namespaces.set("", value);
          continue;
        }
        if (!attribute.startsWith("xmlns:")) continue;
        const prefix = attribute.slice("xmlns:".length);
        if (
          prefix === "xmlns" ||
          value === "" ||
          value === XMLNS_NAMESPACE ||
          (prefix === "xml" && value !== XML_NAMESPACE) ||
          (prefix !== "xml" && value === XML_NAMESPACE)
        ) {
          fail(code, `${label} contains an invalid XML namespace declaration`);
        }
        namespaces.set(prefix, value);
      }
      const elementName = resolveElementName(tag.name, namespaces, label, code);

      if (stack.length === 0) {
        if (root !== null || rootClosed || elementName.localName !== "svg") {
          fail(code, `${label} must contain exactly one SVG root`);
        }
        if (!["", SVG_NAMESPACE].includes(elementName.namespace)) {
          fail(code, `${label} root has an unsupported namespace`);
        }
        documentNamespace = elementName.namespace;
        root = { ...tag, elementName };
      }
      if (elementName.namespace !== documentNamespace) {
        fail(code, `${label} contains an element outside the root SVG namespace`);
      }
      if (
        UNSUPPORTED_SVG_ELEMENTS.has(elementName.localName) ||
        DECLARATIVE_ANIMATION_SVG_ELEMENTS.has(elementName.localName.toLowerCase())
      ) {
        fail(code, `${label} contains active or unsupported content`);
      }

      const expandedAttributes = new Set();
      for (const [attribute, value] of tag.attributes) {
        if (attribute === "xmlns" || attribute.startsWith("xmlns:")) continue;
        const separator = attribute.indexOf(":");
        const prefix = separator === -1 ? null : attribute.slice(0, separator);
        const localName = separator === -1 ? attribute : attribute.slice(separator + 1);
        const namespace = prefix ? namespaces.get(prefix) : "";
        if (prefix && namespace === undefined) {
          fail(code, `${label} contains an undeclared XML namespace prefix`);
        }
        const expandedName = `${namespace}\u0000${localName}`;
        if (expandedAttributes.has(expandedName)) {
          fail(code, `${label} contains duplicate expanded XML attributes`);
        }
        expandedAttributes.add(expandedName);
        if (localName === "id" && (namespace === "" || namespace === XML_NAMESPACE) && value) {
          if (ids.has(value)) fail(code, `${label} contains a duplicate id`);
          ids.add(value);
        }
        if (namespace === XML_NAMESPACE && localName === "base") {
          fail(code, `${label} contains an external or indirect reference base`);
        }
        if (localName === "href" && (namespace === "" || namespace === XLINK_NAMESPACE)) {
          references.push(tag.rawAttributes.get(attribute));
        }
        if (namespace === "" && CSS_URL_ATTRIBUTES.has(localName.toLowerCase())) {
          cssValues.push(value);
        }
      }

      if (tag.selfClosing) {
        if (stack.length === 0) rootClosed = true;
      } else {
        stack.push({ ...elementName, styleText: elementName.localName === "style" ? "" : null });
        namespaceStack.push(namespaces);
      }
    }
    offset = end + 1;
  }

  if (!root || !rootClosed || stack.length !== 0) {
    fail(code, `${label} must contain one complete, well-formed SVG root`);
  }
  return { cssValues, ids, references, root };
}

function decodeCssEscapes(value) {
  return value
    .replace(/\\([\dA-Fa-f]{1,6})(?:\r\n|[\t\n\f\r ])?/gu, (_match, digits) => {
      const codePoint = Number.parseInt(digits, 16);
      return isXmlCodePoint(codePoint) ? String.fromCodePoint(codePoint) : "\uFFFD";
    })
    .replace(/\\(?:\r\n|[\n\f\r])/gu, "")
    .replace(/\\([\s\S])/gu, "$1");
}

function assertLocalReferences(document, label, code) {
  const localReferences = [...document.references];
  for (const cssValue of document.cssValues) {
    const decodedCss = decodeCssEscapes(cssValue).replace(/\/\*[\s\S]*?\*\//gu, "");
    if (/@import\b/iu.test(decodedCss)) {
      fail(code, `${label} contains an external or indirect reference`);
    }
    for (const match of decodedCss.matchAll(/url\(([^)]*)\)/giu)) {
      let target = match[1].trim();
      if (
        target.length >= 2 &&
        ((target.startsWith('"') && target.endsWith('"')) ||
          (target.startsWith("'") && target.endsWith("'")))
      ) {
        target = target.slice(1, -1).trim();
      }
      localReferences.push(target);
    }
  }
  for (const target of localReferences) {
    if (!LOCAL_FRAGMENT_RE.test(target) || !document.ids.has(target.slice(1))) {
      fail(code, `${label} contains an external, encoded, or unresolved reference`);
    }
  }
}

function assertSelfContainedSvg(svg, width, height, label) {
  if (typeof svg !== "string" || Buffer.byteLength(svg, "utf8") > MAX_FRAME_BYTES) {
    fail(
      "INVALID_FRAME",
      `${label} must return an SVG string no larger than ${MAX_FRAME_BYTES} bytes`,
    );
  }
  if (/\0/u.test(svg) || /<!DOCTYPE\b/i.test(svg)) {
    fail("INVALID_FRAME", `${label} contains unsupported XML content`);
  }
  if (/<(?:script|foreignObject|iframe|object|embed|audio|video|canvas)\b/i.test(svg)) {
    fail("INVALID_FRAME", `${label} contains active or unsupported content`);
  }
  const document = parseSvgDocument(svg, label, "INVALID_FRAME");
  assertLocalReferences(document, label, "INVALID_FRAME");
  const numericAttribute = (name) => {
    const value = document.root.attributes.get(name);
    if (!value || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return null;
    return Number(value);
  };
  if (numericAttribute("width") !== width || numericAttribute("height") !== height) {
    fail("INVALID_FRAME", `${label} must declare numeric ${width} by ${height} dimensions`);
  }
}

function assertCanonicalSource(svg) {
  if (Buffer.byteLength(svg, "utf8") > MAX_SOURCE_BYTES) {
    fail("INVALID_SOURCE", `canonical SVG exceeds ${MAX_SOURCE_BYTES} bytes`);
  }
  if (/\0/u.test(svg) || /<!DOCTYPE\b/i.test(svg)) {
    fail("INVALID_SOURCE", "canonical SVG contains unsupported XML content");
  }
  if (/<(?:script|foreignObject|iframe|object|embed|audio|video|canvas)\b/i.test(svg)) {
    fail("INVALID_SOURCE", "canonical SVG contains active or unsupported content");
  }
  const document = parseSvgDocument(svg, "canonical SVG", "INVALID_SOURCE");
  assertLocalReferences(document, "canonical SVG", "INVALID_SOURCE");
}

function readUtf8FileBounded(file, maximumBytes, label, code) {
  let descriptor;
  try {
    descriptor = openSync(file, "r");
    const stats = fstatSync(descriptor);
    if (!stats.isFile()) fail(code, `${label} must be a regular file`);
    if (stats.size > maximumBytes) fail(code, `${label} exceeds ${maximumBytes} bytes`);

    const buffer = Buffer.allocUnsafe(stats.size + 1);
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const count = readSync(descriptor, buffer, bytesRead, buffer.length - bytesRead, null);
      if (count === 0) break;
      bytesRead += count;
    }
    if (bytesRead > stats.size || bytesRead > maximumBytes) {
      fail(code, `${label} changed while reading or exceeds ${maximumBytes} bytes`);
    }
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, bytesRead));
    } catch {
      fail(code, `${label} is not valid UTF-8`);
    }
  } catch (error) {
    if (error instanceof ExportError) throw error;
    fail("SOURCE_READ_FAILED", `${label} could not be read`, "io");
  } finally {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        // The descriptor belongs only to this bounded read; failure is sanitized by later I/O checks.
      }
    }
  }
}

async function renderFrame(config, sourceSvg, frameIndex) {
  let svg;
  try {
    svg = await config.renderFrame(
      Object.freeze({
        sourceSvg,
        frameIndex,
        timeSeconds: frameIndex / config.fps,
        width: config.width,
        height: config.height,
        fps: config.fps,
        frameCount: config.frameCount,
      }),
    );
  } catch (error) {
    fail("RECIPE_FAILED", `renderFrame failed for frame ${frameIndex}`);
  }
  assertSelfContainedSvg(svg, config.width, config.height, `frame ${frameIndex}`);
  return svg;
}

function consumeFrameByteBudget(totalBytes, svg, maximumBytes) {
  const frameBytes = Buffer.byteLength(svg, "utf8");
  if (frameBytes > maximumBytes - totalBytes) {
    fail("INVALID_FRAME", `rendered SVG frames exceed the cumulative ${maximumBytes}-byte limit`);
  }
  return totalBytes + frameBytes;
}

function frameName(index, extension) {
  return `frame-${String(index).padStart(4, "0")}.${extension}`;
}

function runTool(command, arguments_, root) {
  const result = spawnSync(command, arguments_, {
    cwd: root,
    encoding: "utf8",
    env: deterministicEnvironment,
    maxBuffer: 16 * 1024 * 1024,
    shell: false,
  });
  if (result.error) {
    const message = result.error.code === "ENOENT" ? "is unavailable" : `could not start`;
    fail(
      "MISSING_OR_BROKEN_TOOL",
      `${command} ${message}; inspect references/local-tooling.md before proposing an installation`,
      "tool",
    );
  }
  if (result.status !== 0) {
    fail("TOOL_FAILED", `${command} exited with status ${result.status ?? "unknown"}`, "tool");
  }
  return result.stdout.trim();
}

function sanitizeAndValidatePng(file, width, height, preserveTransparency) {
  const png = readFileSync(file);
  if (png.length < 33 || png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    fail("INVALID_STATIC_PNG", "rasterized static output is not a valid PNG");
  }
  const signature = png.subarray(0, 8);
  const kept = [signature];
  const allowed = new Set(["IHDR", "PLTE", "tRNS", "cHRM", "gAMA", "sBIT", "sRGB", "IDAT", "IEND"]);
  let offset = 8;
  let chunks = 0;
  let sawHeader = false;
  let sawEnd = false;
  let hasTransparency = false;
  while (offset < png.length) {
    if (offset + 12 > png.length) fail("INVALID_STATIC_PNG", "PNG chunk is truncated");
    const length = png.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > png.length) fail("INVALID_STATIC_PNG", "PNG chunk exceeds file bounds");
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    chunks += 1;
    if (chunks > 10_000) fail("INVALID_STATIC_PNG", "PNG contains too many chunks");
    if (!sawHeader) {
      if (type !== "IHDR" || length !== 13) {
        fail("INVALID_STATIC_PNG", "PNG must begin with a valid IHDR chunk");
      }
      sawHeader = true;
      if (png.readUInt32BE(offset + 8) !== width || png.readUInt32BE(offset + 12) !== height) {
        fail("INVALID_STATIC_PNG", `PNG dimensions must be ${width} by ${height}`);
      }
      const colorType = png[offset + 17];
      hasTransparency = colorType === 4 || colorType === 6;
    }
    if (type === "tRNS") hasTransparency = true;
    if (allowed.has(type)) {
      kept.push(png.subarray(offset, end));
    } else if (type[0] === type[0].toUpperCase()) {
      fail("INVALID_STATIC_PNG", `PNG contains unknown critical chunk ${type}`);
    }
    offset = end;
    if (type === "IEND") {
      sawEnd = true;
      break;
    }
  }
  if (!sawEnd || offset !== png.length) {
    fail("INVALID_STATIC_PNG", "PNG has a missing IEND chunk or trailing data");
  }
  if (preserveTransparency && !hasTransparency) {
    fail("INVALID_STATIC_PNG", "PNG does not retain an alpha channel or transparency table");
  }
  writeFileSync(file, Buffer.concat(kept));
}

function strictlyInspectStaticPng(file, width, height) {
  let inspected;
  try {
    inspected = inspectAnimatedImageFile(file, {
      maxFileBytes: MAX_GIF_BYTES,
      maxFrames: 1,
      maxDimension: Math.max(width, height),
    });
  } catch {
    fail("INVALID_STATIC_PNG", "sanitized static PNG failed strict structural inspection");
  }
  if (
    inspected.format !== "png" ||
    inspected.width !== width ||
    inspected.height !== height ||
    inspected.frameCount !== 1
  ) {
    fail("INVALID_STATIC_PNG", `static PNG must be ${width} by ${height} and contain one frame`);
  }
}

function expectedGifFrameDelays(frameCount, fps) {
  const delays = [];
  for (let index = 0; index < frameCount - 1; index += 1) {
    delays.push(Math.round(((index + 1) * 100) / fps) - Math.round((index * 100) / fps));
  }
  delays.push(Math.round(100 / fps));
  return delays;
}

function validateAnimatedGif(file, config) {
  let inspected;
  try {
    inspected = inspectAnimatedImageFile(file, {
      maxFileBytes: config.maxFileBytes,
      maxFrames: config.frameCount,
      maxDimension: Math.max(config.width, config.height),
    });
  } catch {
    fail("INVALID_ANIMATED_GIF", "animated GIF failed strict structural inspection");
  }
  if (
    inspected.format !== "gif" ||
    inspected.width !== config.width ||
    inspected.height !== config.height ||
    inspected.frameCount !== config.frameCount ||
    inspected.loopCount !== 0
  ) {
    fail(
      "INVALID_ANIMATED_GIF",
      `GIF must be ${config.width} by ${config.height}, contain ${config.frameCount} frames, and loop infinitely`,
    );
  }
  const expectedDelays = expectedGifFrameDelays(config.frameCount, config.fps);
  const timingMatches =
    inspected.frameDelaysCentiseconds?.length === expectedDelays.length &&
    expectedDelays.every(
      (expectedDelay, index) => inspected.frameDelaysCentiseconds[index] === expectedDelay,
    );
  if (inspected.graphicControlCount !== config.frameCount || !timingMatches) {
    fail(
      "INVALID_ANIMATED_GIF",
      `GIF frame delays must match ${expectedDelays.join(",")} centiseconds at ${config.fps} fps`,
    );
  }
}

async function loadConfiguration(root, recipeArgument) {
  safeRelativePath(recipeArgument, "recipe", ".mjs");
  const recipePath = existingRegularFile(root, recipeArgument, "recipe", ".mjs");
  let version;
  try {
    version = statSync(recipePath).mtimeMs;
  } catch {
    fail("RECIPE_LOAD_FAILED", "recipe module could not be inspected", "io");
  }
  let module;
  try {
    module = await import(`${pathToFileURL(recipePath).href}?v=${version}`);
  } catch (error) {
    fail(
      "RECIPE_LOAD_FAILED",
      "recipe module could not be loaded",
      isNodeIoError(error) ? "io" : undefined,
    );
  }
  return validateRecipe(module.default, root, recipePath);
}

async function renderFramePass(config, sourceSvg) {
  const frames = [];
  let totalFrameBytes = 0;
  for (let frameIndex = 0; frameIndex < config.frameCount; frameIndex += 1) {
    const frame = await renderFrame(config, sourceSvg, frameIndex);
    totalFrameBytes = consumeFrameByteBudget(totalFrameBytes, frame, config.maxTotalFrameBytes);
    frames.push(frame);
  }
  return frames;
}

async function checkRecipe(config, sourceSvg) {
  const verifiedFrames = await renderFramePass(config, sourceSvg);
  const comparisonFrames = await renderFramePass(config, sourceSvg);
  for (let frameIndex = 0; frameIndex < config.frameCount; frameIndex += 1) {
    if (verifiedFrames[frameIndex] !== comparisonFrames[frameIndex]) {
      fail("NONDETERMINISTIC_RECIPE", `frame ${frameIndex} changes between identical passes`);
    }
  }
  return verifiedFrames;
}

function publicToolVersion(command, value) {
  const version = value.match(/\b\d+(?:\.\d+){1,3}(?:[-+][0-9A-Za-z.-]+)?\b/)?.[0];
  return version ? `${command} ${version}` : `${command} available`;
}

function verifyFfmpegCapabilities(root) {
  const filters = runTool("ffmpeg", ["-hide_banner", "-filters"], root);
  const muxers = runTool("ffmpeg", ["-hide_banner", "-muxers"], root);
  const encoders = runTool("ffmpeg", ["-hide_banner", "-encoders"], root);
  if (!/\bpalettegen\b/.test(filters) || !/\bpaletteuse\b/.test(filters)) {
    fail("MISSING_TOOL_CAPABILITY", "ffmpeg lacks the palettegen or paletteuse filter", "tool");
  }
  if (!/^\s*E\s+gif\b/m.test(muxers)) {
    fail("MISSING_TOOL_CAPABILITY", "ffmpeg lacks the GIF muxer", "tool");
  }
  if (!/^\s*V\S*\s+gif\b/m.test(encoders)) {
    fail("MISSING_TOOL_CAPABILITY", "ffmpeg lacks the GIF encoder", "tool");
  }
}

async function exportArtifacts(root, config, verifiedFrames, replace) {
  if (!replace && (existsSync(config.staticOutputPath) || existsSync(config.animatedOutputPath))) {
    fail(
      "OUTPUT_EXISTS",
      "one or more declared outputs already exist; rerun with --replace only after reviewing the recipe and destinations",
    );
  }
  const rsvgVersion = publicToolVersion(
    "rsvg-convert",
    runTool("rsvg-convert", ["--version"], root),
  );
  const ffmpegVersion = publicToolVersion("ffmpeg", runTool("ffmpeg", ["-version"], root));
  verifyFfmpegCapabilities(root);
  const runDirectory = mkdtempSync(join(tmpdir(), "animated-readme-logo-export-"));
  let staticStage;
  let animatedStage;
  let staticOutputParent;
  let animatedOutputParent;
  let preserveStageDirectories = false;
  let result;
  let primaryError;
  try {
    for (let frameIndex = 0; frameIndex < verifiedFrames.length; frameIndex += 1) {
      const svgPath = join(runDirectory, frameName(frameIndex, "svg"));
      const pngPath = join(runDirectory, frameName(frameIndex, "png"));
      writeFileSync(svgPath, verifiedFrames[frameIndex], "utf8");
      runTool(
        "rsvg-convert",
        [
          "--format",
          "png",
          "--width",
          String(config.width),
          "--height",
          String(config.height),
          "--output",
          pngPath,
          svgPath,
        ],
        root,
      );
    }

    staticOutputParent = ensureOutputParent(root, config.staticOutputPath, "static output");
    animatedOutputParent = ensureOutputParent(root, config.animatedOutputPath, "animated output");
    staticStage = createAnchoredStage(
      staticOutputParent,
      ".readme-logo-static-stage-",
      "static stage directory",
    );
    animatedStage = createAnchoredStage(
      animatedOutputParent,
      ".readme-logo-animated-stage-",
      "animated stage directory",
    );
    assertOutputParentStable(root, config.staticOutputPath, staticOutputParent);
    assertOutputParentStable(root, config.animatedOutputPath, animatedOutputParent);
    const staticName = basename(config.staticOutputPath);
    const animatedName = basename(config.animatedOutputPath);
    const stagedStatic = join(staticStage.lexicalPath, staticName);
    const stagedAnimated = join(animatedStage.lexicalPath, animatedName);
    const stagedStaticMutationPath = join(staticStage.anchorPath, staticName);
    const stagedAnimatedMutationPath = join(animatedStage.anchorPath, animatedName);
    const staticDestinationMutationPath = join(staticOutputParent.anchorPath, staticName);
    const animatedDestinationMutationPath = join(animatedOutputParent.anchorPath, animatedName);
    const firstFrame = join(runDirectory, frameName(0, "png"));
    const palette = join(runDirectory, "palette.png");
    const inputPattern = join(runDirectory, "frame-%04d.png");
    const generatedAnimated = join(runDirectory, "generated-animated.gif");

    copyFileSync(firstFrame, stagedStaticMutationPath);
    sanitizeAndValidatePng(
      stagedStaticMutationPath,
      config.width,
      config.height,
      config.preserveTransparency,
    );
    strictlyInspectStaticPng(stagedStaticMutationPath, config.width, config.height);

    runTool(
      "ffmpeg",
      [
        "-nostdin",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-filter_threads",
        "1",
        "-threads",
        "1",
        "-framerate",
        String(config.fps),
        "-start_number",
        "0",
        "-i",
        inputPattern,
        "-vf",
        `palettegen=max_colors=${config.gifMaxColors}:reserve_transparent=${config.preserveTransparency ? 1 : 0}:stats_mode=diff`,
        "-frames:v",
        "1",
        "-update",
        "1",
        palette,
      ],
      root,
    );
    runTool(
      "ffmpeg",
      [
        "-nostdin",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-filter_complex_threads",
        "1",
        "-threads",
        "1",
        "-framerate",
        String(config.fps),
        "-start_number",
        "0",
        "-i",
        inputPattern,
        "-i",
        palette,
        "-filter_complex",
        "[0:v][1:v]paletteuse=dither=none:diff_mode=none:alpha_threshold=128",
        "-frames:v",
        String(config.frameCount),
        "-an",
        "-map_metadata",
        "-1",
        "-loop",
        "0",
        "-gifflags",
        "0",
        "-bitexact",
        generatedAnimated,
      ],
      root,
    );

    validateAnimatedGif(generatedAnimated, config);
    copyFileSync(generatedAnimated, stagedAnimatedMutationPath);
    chmodSync(stagedStaticMutationPath, 0o644);
    chmodSync(stagedAnimatedMutationPath, 0o644);
    strictlyInspectStaticPng(stagedStaticMutationPath, config.width, config.height);
    validateAnimatedGif(stagedAnimatedMutationPath, config);
    assertOutputParentStable(root, config.staticOutputPath, staticOutputParent);
    assertOutputParentStable(root, config.animatedOutputPath, animatedOutputParent);
    const staticSnapshot = captureOutputSnapshot(stagedStaticMutationPath);
    const animatedSnapshot = captureOutputSnapshot(stagedAnimatedMutationPath);
    let commitResult;
    try {
      commitResult = replaceOutputsAtomically(
        [
          {
            staged: stagedStatic,
            stagedMutationPath: stagedStaticMutationPath,
            destination: config.staticOutputPath,
            destinationMutationPath: staticDestinationMutationPath,
            validatedSnapshot: staticSnapshot,
          },
          {
            staged: stagedAnimated,
            stagedMutationPath: stagedAnimatedMutationPath,
            destination: config.animatedOutputPath,
            destinationMutationPath: animatedDestinationMutationPath,
            validatedSnapshot: animatedSnapshot,
          },
        ],
        { replace },
      );
    } catch (error) {
      preserveStageDirectories = Boolean(error?.preserveStageDirectories);
      throw error;
    }
    preserveStageDirectories ||= Boolean(commitResult?.preserveStageDirectories);
    result = {
      rsvgVersion,
      ffmpegVersion,
      recoveryRetained: Boolean(commitResult?.retainedRecovery),
    };
  } catch (error) {
    preserveStageDirectories ||= Boolean(error?.preserveStageDirectories);
    primaryError = error;
    try {
      if (staticOutputParent) {
        assertOutputParentStable(root, config.staticOutputPath, staticOutputParent);
      }
      if (animatedOutputParent) {
        assertOutputParentStable(root, config.animatedOutputPath, animatedOutputParent);
      }
    } catch (parentError) {
      preserveStageDirectories = true;
      primaryError = parentError;
    }
  }

  const cleanupErrors = [];
  try {
    rmSync(runDirectory, { recursive: true, force: true });
  } catch {
    cleanupErrors.push("run directory");
  }
  if (!preserveStageDirectories && staticStage) {
    try {
      removeAnchoredStageDirectory(staticStage, [basename(config.staticOutputPath)]);
    } catch {
      cleanupErrors.push("static stage directory");
    }
  }
  if (!preserveStageDirectories && animatedStage) {
    try {
      removeAnchoredStageDirectory(animatedStage, [basename(config.animatedOutputPath)]);
    } catch {
      cleanupErrors.push("animated stage directory");
    }
  }
  for (const handle of [staticStage, animatedStage, staticOutputParent, animatedOutputParent]) {
    if (!handle) continue;
    try {
      closeSync(handle.descriptor);
    } catch {
      cleanupErrors.push("directory descriptor");
    }
  }
  if (primaryError) throw primaryError;
  if (cleanupErrors.length > 0) {
    throw new TransactionalOutputError(
      "OUTPUT_CLEANUP_INCOMPLETE",
      "generated outputs are valid, but one or more temporary directories could not be removed",
    );
  }
  return result;
}

function publicConfiguration(config) {
  return {
    schemaVersion: 1,
    source: config.source,
    staticOutput: config.staticOutput,
    animatedOutput: config.animatedOutput,
    width: config.width,
    height: config.height,
    fps: config.fps,
    frameCount: config.frameCount,
    maxTotalFrameBytes: config.maxTotalFrameBytes,
    maxFileBytes: config.maxFileBytes,
    gifMaxColors: config.gifMaxColors,
    preserveTransparency: config.preserveTransparency,
  };
}

function outputSuccess(args, config, tools) {
  const payload = {
    valid: true,
    status: args.check ? "checked" : "completed",
    recipe: args.recipe,
    ...publicConfiguration(config),
    ...(tools
      ? {
          tools: { rsvgVersion: tools.rsvgVersion, ffmpegVersion: tools.ffmpegVersion },
          recoveryRetained: tools.recoveryRetained,
        }
      : {}),
    errors: [],
  };
  if (args.json) {
    console.log(JSON.stringify(payload));
    return;
  }
  if (args.check) {
    console.log(`VALID README LOGO RECIPE: ${args.recipe}`);
    console.log(
      `Frames: ${config.frameCount}; size: ${config.width}x${config.height}; fps: ${config.fps}`,
    );
    console.log("Exporter-controlled files written: none (--check)");
    return;
  }
  console.log(`Generated ${config.staticOutput}`);
  console.log(`Generated ${config.animatedOutput}`);
  console.log(
    `Frames: ${config.frameCount}; size: ${config.width}x${config.height}; fps: ${config.fps}; loop: infinite`,
  );
  console.log(`Tools: ${tools.rsvgVersion}; ${tools.ffmpegVersion}`);
  if (tools.recoveryRetained) {
    console.log("Replacement recovery stage directories retained for manual cleanup");
  }
}

function outputFailure(args, error) {
  const payload = {
    valid: false,
    status: args?.check ? "check-failed" : "export-failed",
    recipe: null,
    errors: [{ code: error.code ?? "UNEXPECTED_ERROR", message: error.message }],
  };
  if (args?.json || process.argv.includes("--json")) {
    console.log(JSON.stringify(payload));
    return;
  }
  console.error(`README LOGO EXPORT FAILED: [${payload.errors[0].code}] ${error.message}`);
}

function isNodeIoError(error) {
  return (
    error instanceof Error &&
    typeof error.code === "string" &&
    (/^E[A-Z0-9_]+$/.test(error.code) || error.code.startsWith("ERR_FS_"))
  );
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
    if (args.help) {
      console.log(usage());
      return;
    }
    if (!args.root || !args.recipe) {
      fail("MISSING_ARGUMENT", "--root and --recipe are required", "usage");
    }
    const root = canonicalDirectory(args.root, "--root");
    const config = await loadConfiguration(root, args.recipe);
    const sourceSvg = readUtf8FileBounded(
      config.sourcePath,
      MAX_SOURCE_BYTES,
      "canonical SVG",
      "INVALID_SOURCE",
    );
    assertCanonicalSource(sourceSvg);
    const verifiedFrames = await checkRecipe(config, sourceSvg);
    const tools = args.check
      ? null
      : await exportArtifacts(root, config, verifiedFrames, args.replace);
    outputSuccess(args, config, tools);
  } catch (error) {
    const normalized =
      error instanceof ExportError
        ? error
        : error instanceof TransactionalOutputError
          ? new ExportError(error.code, error.message, error.category)
          : isNodeIoError(error)
            ? new ExportError("IO_FAILED", "filesystem operation failed", "io")
            : new ExportError("UNEXPECTED_ERROR", "unexpected exporter failure");
    outputFailure(args, normalized);
    if (!args?.json && normalized.category === "usage") console.error(usage());
    process.exitCode = ["usage", "io"].includes(normalized.category) ? 2 : 1;
  }
}

await main();
