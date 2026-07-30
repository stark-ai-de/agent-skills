import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { TextDecoder } from "node:util";

const allowedDispositions = new Set(["preserved", "adapted", "explicitly-rejected"]);
const rootKeys = ["schema", "sourceCommit", "baselineDirectory", "cases"];
const caseKeys = [
  "sourcePath",
  "baselinePath",
  "sourceSha256",
  "disposition",
  "reason",
  "expectations",
];
const expectationKeys = ["summary", "source", "outcome", "reason", "targets"];
const sourceKeys = ["heading", "marker"];
const targetKeys = ["path", "heading", "markers"];
const materialHeadings = ["Deterministic Assertions", "Expected Behavior"];
const legacySourceSegmentWidth = 96;
const strictUtf8Decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const commonMarkEscapablePunctuation = new Set("!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~".split(""));
const commonMarkNamedReferences = new Map([
  ["Tab", "\t"],
  ["NewLine", "\n"],
  ["excl", "!"],
  ["quot", '"'],
  ["num", "#"],
  ["dollar", "$"],
  ["percnt", "%"],
  ["amp", "&"],
  ["apos", "'"],
  ["lpar", "("],
  ["rpar", ")"],
  ["ast", "*"],
  ["plus", "+"],
  ["comma", ","],
  ["period", "."],
  ["sol", "/"],
  ["colon", ":"],
  ["semi", ";"],
  ["lt", "<"],
  ["equals", "="],
  ["gt", ">"],
  ["quest", "?"],
  ["commat", "@"],
  ["lsqb", "["],
  ["bsol", "\\"],
  ["rsqb", "]"],
  ["Hat", "^"],
  ["lowbar", "_"],
  ["grave", "`"],
  ["lcub", "{"],
  ["verbar", "|"],
  ["rcub", "}"],
  ["nbsp", "\u00a0"],
  ["NonBreakingSpace", "\u00a0"],
  ["ensp", "\u2002"],
  ["emsp", "\u2003"],
  ["thinsp", "\u2009"],
  ["hairsp", "\u200a"],
  ["AMP", "&"],
  ["LT", "<"],
  ["GT", ">"],
  ["QUOT", '"'],
]);

function hasExactKeys(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && wanted.every((key, index) => key === actual[index]);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalize(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function decodeUtf8(value, label, errors, failure = `${label}: must be valid UTF-8`) {
  try {
    return strictUtf8Decoder.decode(value);
  } catch {
    errors.push(failure);
    return null;
  }
}

function finalizeErrors(errors) {
  return [...new Set(errors)].sort();
}

function emptyLineageSummary() {
  return {
    cases: 0,
    dispositions: { preserved: 0, adapted: 0, "explicitly-rejected": 0 },
    expectations: 0,
    sourceUnits: 0,
  };
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function normalizedRelativePath(relativePath) {
  if (
    typeof relativePath !== "string" ||
    relativePath.length === 0 ||
    path.isAbsolute(relativePath) ||
    relativePath.includes("\0")
  ) {
    return null;
  }
  const normalized = path.normalize(relativePath);
  if (normalized === "." || normalized === ".." || normalized.startsWith(`..${path.sep}`)) {
    return null;
  }
  return normalized;
}

function canonicalNormalizedRelativePath(relativePath) {
  if (
    typeof relativePath !== "string" ||
    relativePath.includes("\\") ||
    path.posix.isAbsolute(relativePath) ||
    path.posix.normalize(relativePath) !== relativePath
  ) {
    return null;
  }
  return normalizedRelativePath(relativePath);
}

function resolveInside(root, relativePath) {
  const normalized = normalizedRelativePath(relativePath);
  if (!normalized) return null;
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, normalized);
  return resolved.startsWith(`${resolvedRoot}${path.sep}`) ? resolved : null;
}

function sameNode(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

function sameIdentityChain(left, right) {
  return (
    left.length === right.length &&
    left.every((entry, index) => sameNode(entry.stat, right[index].stat))
  );
}

function compareNames(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function entryKind(stat) {
  if (stat.isSymbolicLink()) return "symbolic link";
  if (stat.isFIFO()) return "FIFO";
  if (stat.isSocket()) return "socket";
  if (stat.isCharacterDevice()) return "character device";
  if (stat.isBlockDevice()) return "block device";
  if (stat.isDirectory()) return "directory";
  if (stat.isFile()) return "regular file";
  return "special entry";
}

function inspectSymlinkFree(
  root,
  relativePath,
  errors,
  label = relativePath,
  validationRootStat = null,
) {
  const normalized = normalizedRelativePath(relativePath);
  const resolvedRoot = path.resolve(root);
  if (!normalized) {
    errors.push(`${label || "<missing>"}: expected a repository-relative path`);
    return null;
  }
  let rootStat;
  try {
    rootStat = fs.lstatSync(resolvedRoot, { bigint: true });
  } catch (error) {
    errors.push(`${label}: unable to inspect repository root: ${error.message}`);
    return null;
  }
  if (validationRootStat && !sameNode(validationRootStat, rootStat)) {
    errors.push(`${label}: validation root identity changed after capture`);
    return null;
  }
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    errors.push(`${label}: repository root must be a symlink-free directory`);
    return null;
  }
  const identities = [{ display: ".", stat: rootStat }];
  let current = resolvedRoot;
  const components = normalized.split(path.sep);
  for (const [index, component] of components.entries()) {
    current = path.join(current, component);
    let stat;
    try {
      stat = fs.lstatSync(current, { bigint: true });
    } catch (error) {
      errors.push(
        error?.code === "ENOENT"
          ? `${label}: missing required file`
          : `${label}: unable to inspect path component ${toPosix(path.relative(resolvedRoot, current))}: ${error.message}`,
      );
      return null;
    }
    const display = toPosix(path.relative(resolvedRoot, current));
    if (stat.isSymbolicLink()) {
      errors.push(`${label}: path components must be symlink-free; found ${display}`);
      return null;
    }
    if (index < components.length - 1 && !stat.isDirectory()) {
      errors.push(`${label}: expected path component ${display} to be a directory`);
      return null;
    }
    identities.push({ display, stat });
  }
  return { file: current, identities, normalized, stat: identities.at(-1).stat };
}

function readRegularFile(
  root,
  relativePath,
  errors,
  {
    purpose = "required file",
    readWitnesses = null,
    testOnlyReadPhaseHook = null,
    validationRootStat = null,
  } = {},
) {
  const normalizedWitnessPath = normalizedRelativePath(relativePath);
  const existingWitness =
    readWitnesses instanceof Map && normalizedWitnessPath
      ? readWitnesses.get(toPosix(normalizedWitnessPath))
      : null;
  if (existingWitness) return Buffer.from(existingWitness.buffer);
  const inspected = inspectSymlinkFree(
    root,
    relativePath,
    errors,
    relativePath,
    validationRootStat,
  );
  if (!inspected) return null;
  if (!inspected.stat.isFile()) {
    errors.push(
      `${relativePath}: ${purpose} must be a regular file; found ${entryKind(inspected.stat)}`,
    );
    return null;
  }

  if (typeof fs.constants.O_NOFOLLOW !== "number" || typeof fs.constants.O_NONBLOCK !== "number") {
    errors.push(`${relativePath}: safe descriptor reads require O_NOFOLLOW and O_NONBLOCK`);
    return null;
  }
  const openFlags = fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK;
  const hookContext = {
    file: inspected.file,
    openFlags,
    relativePath: toPosix(inspected.normalized),
  };
  testOnlyReadPhaseHook?.({ ...hookContext, phase: "before-open" });

  let descriptor;
  let retainDescriptor = false;
  try {
    descriptor = fs.openSync(inspected.file, openFlags);
  } catch (error) {
    if (purpose === "runtime payload entry" && error?.code === "ELOOP") {
      errors.push(
        `${relativePath}: runtime payload entries and path components must be symlink-free`,
      );
    } else {
      errors.push(
        `${relativePath}: unable to open ${purpose} without following symlinks or blocking: ${error.message}`,
      );
    }
    return null;
  }

  try {
    const opened = fs.fstatSync(descriptor, { bigint: true });
    if (!opened.isFile()) {
      errors.push(
        `${relativePath}: opened ${purpose} descriptor must be a regular file; found ${entryKind(opened)}`,
      );
      return null;
    }
    if (!sameNode(inspected.stat, opened)) {
      errors.push(`${relativePath}: file identity or length changed while opening ${purpose}`);
      return null;
    }
    testOnlyReadPhaseHook?.({ ...hookContext, phase: "after-open" });

    if (opened.size > BigInt(Number.MAX_SAFE_INTEGER)) {
      errors.push(`${relativePath}: ${purpose} is too large for a stable in-memory read`);
      return null;
    }
    const expectedLength = Number(opened.size);
    const buffer = Buffer.alloc(expectedLength);
    let offset = 0;
    while (offset < expectedLength) {
      const read = fs.readSync(descriptor, buffer, offset, expectedLength - offset, offset);
      if (read === 0) break;
      offset += read;
    }
    const extra = Buffer.alloc(1);
    const extraLength = fs.readSync(descriptor, extra, 0, 1, expectedLength);
    testOnlyReadPhaseHook?.({ ...hookContext, phase: "after-read" });

    const completed = fs.fstatSync(descriptor, { bigint: true });
    const reinspected = inspectSymlinkFree(
      root,
      relativePath,
      errors,
      relativePath,
      validationRootStat,
    );
    if (!reinspected) return null;
    const parentsStable = sameIdentityChain(inspected.identities, reinspected.identities);
    if (
      offset !== expectedLength ||
      extraLength !== 0 ||
      BigInt(buffer.byteLength) !== completed.size ||
      !sameNode(opened, completed) ||
      !sameNode(completed, reinspected.stat) ||
      !parentsStable
    ) {
      errors.push(`${relativePath}: file identity or length changed while reading ${purpose}`);
      return null;
    }
    testOnlyReadPhaseHook?.({ ...hookContext, phase: "after-revalidate" });
    const witness = {
      buffer: Buffer.from(buffer),
      descriptor,
      digest: sha256(buffer),
      identities: reinspected.identities,
      openFlags,
      purpose,
      relativePath: toPosix(inspected.normalized),
      stat: completed,
    };
    if (readWitnesses instanceof Map) {
      readWitnesses.set(witness.relativePath, witness);
    }
    retainDescriptor = Boolean(readWitnesses);
    return buffer;
  } catch (error) {
    errors.push(`${relativePath}: unable to read ${purpose} safely: ${error.message}`);
    return null;
  } finally {
    if (!retainDescriptor) {
      try {
        fs.closeSync(descriptor);
      } catch (error) {
        errors.push(`${relativePath}: unable to close ${purpose} descriptor: ${error.message}`);
      }
    }
  }
}

function closeReadWitnesses(witnesses, errors) {
  for (const witness of witnesses.values()) {
    if (witness.descriptor === null) continue;
    try {
      fs.closeSync(witness.descriptor);
    } catch (error) {
      if (error?.code !== "EBADF") {
        errors.push(
          `${witness.relativePath}: unable to close retained validation descriptor: ${error.message}`,
        );
      }
    } finally {
      witness.descriptor = null;
    }
  }
}

function sealReadWitnesses(root, witnesses, errors, testOnlyReadPhaseHook, validationRootStat) {
  const ordered = [...witnesses.values()].sort((left, right) =>
    left.relativePath < right.relativePath ? -1 : left.relativePath > right.relativePath ? 1 : 0,
  );
  try {
    for (const [passIndex, pass] of [ordered, [...ordered].reverse()].entries()) {
      for (const witness of pass) {
        if (passIndex === 0) {
          testOnlyReadPhaseHook?.({
            file: resolveInside(root, witness.relativePath),
            openFlags: witness.openFlags,
            phase: "before-final-seal",
            relativePath: witness.relativePath,
          });
        }
        let descriptorStat;
        try {
          descriptorStat = fs.fstatSync(witness.descriptor, { bigint: true });
        } catch (error) {
          errors.push(
            `${witness.relativePath}: unable to inspect retained validation descriptor: ${error.message}`,
          );
          continue;
        }
        const current = inspectSymlinkFree(
          root,
          witness.relativePath,
          errors,
          witness.relativePath,
          validationRootStat,
        );
        if (!current) continue;
        const initialIdentityChanged =
          !sameNode(witness.stat, descriptorStat) ||
          !sameNode(descriptorStat, current.stat) ||
          !sameIdentityChain(witness.identities, current.identities);
        if (initialIdentityChanged) {
          errors.push(
            `${witness.relativePath}: file identity changed after its validated snapshot`,
          );
          continue;
        }
        const expectedLength = witness.buffer.length;
        const buffer = witness.buffer;
        try {
          let offset = 0;
          while (offset < expectedLength) {
            const read = fs.readSync(
              witness.descriptor,
              buffer,
              offset,
              expectedLength - offset,
              offset,
            );
            if (read === 0) break;
            offset += read;
          }
          const extra = Buffer.alloc(1);
          const extraLength = fs.readSync(witness.descriptor, extra, 0, 1, expectedLength);
          const sealedStat = fs.fstatSync(witness.descriptor, { bigint: true });
          const completed = inspectSymlinkFree(
            root,
            witness.relativePath,
            errors,
            witness.relativePath,
            validationRootStat,
          );
          const finalIdentityStable =
            completed &&
            sameNode(witness.stat, completed.stat) &&
            sameNode(sealedStat, completed.stat) &&
            sameIdentityChain(witness.identities, completed.identities);
          if (!finalIdentityStable) {
            errors.push(
              `${witness.relativePath}: file identity changed after its validated snapshot`,
            );
          }
          if (
            offset !== expectedLength ||
            extraLength !== 0 ||
            !sameNode(descriptorStat, sealedStat) ||
            sha256(buffer) !== witness.digest
          ) {
            errors.push(
              `${witness.relativePath}: file content changed after its validated snapshot`,
            );
          }
        } catch (error) {
          errors.push(
            `${witness.relativePath}: unable to seal retained validation descriptor: ${error.message}`,
          );
        }
      }
    }
  } finally {
    closeReadWitnesses(witnesses, errors);
  }
}

function sealDirectoryWitnesses(
  root,
  witnesses,
  errors,
  testOnlyReadPhaseHook,
  validationRootStat,
  { invokeHook = true } = {},
) {
  const ordered = [...witnesses].sort((left, right) =>
    left.relativePath < right.relativePath ? -1 : left.relativePath > right.relativePath ? 1 : 0,
  );
  for (const [passIndex, pass] of [ordered, [...ordered].reverse()].entries()) {
    for (const witness of pass) {
      if (invokeHook && passIndex === 0) {
        testOnlyReadPhaseHook?.({
          file: resolveInside(root, witness.relativePath),
          phase: "before-directory-final-seal",
          relativePath: witness.relativePath,
        });
      }
      const current = inspectSymlinkFree(
        root,
        witness.relativePath,
        errors,
        witness.relativePath,
        validationRootStat,
      );
      if (!current) continue;
      let names;
      let completed;
      let completedNames;
      let final;
      try {
        names = fs.readdirSync(current.file).sort(compareNames);
        completed = inspectSymlinkFree(
          root,
          witness.relativePath,
          errors,
          witness.relativePath,
          validationRootStat,
        );
        if (!completed) continue;
        completedNames = fs.readdirSync(completed.file).sort(compareNames);
        final = inspectSymlinkFree(
          root,
          witness.relativePath,
          errors,
          witness.relativePath,
          validationRootStat,
        );
        if (!final) continue;
      } catch (error) {
        errors.push(
          `${witness.relativePath}: unable to seal runtime directory entries: ${error.message}`,
        );
        continue;
      }
      if (
        !sameNode(witness.stat, current.stat) ||
        !sameNode(witness.stat, completed.stat) ||
        !sameNode(witness.stat, final.stat) ||
        !sameIdentityChain(witness.identities, current.identities) ||
        !sameIdentityChain(witness.identities, completed.identities) ||
        !sameIdentityChain(witness.identities, final.identities) ||
        JSON.stringify(witness.names) !== JSON.stringify(names) ||
        JSON.stringify(witness.names) !== JSON.stringify(completedNames)
      ) {
        errors.push(`${witness.relativePath}: runtime directory entries changed after traversal`);
      }
    }
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function backtickRunLength(line, offset) {
  let end = offset;
  while (line[end] === "`") end += 1;
  return end - offset;
}

function interruptsInlineCodeSpan(line) {
  if (!line.trim()) return true;
  const indent = commonMarkIndent(line);
  if (indent.columns > 3) return false;
  const candidate = line.slice(indent.offset);
  if (rawHtmlBlockOpener(candidate, true)) return true;
  if (/^(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/.test(candidate)) return true;
  return /^(?:#{1,6}(?:[ \t]|$)|`{3,}|~{3,}|>|[-+*][ \t]+|\d{1,9}[.)][ \t]+)/.test(candidate);
}

function hasClosingBacktickRun(lines, lineIndex, offset, length) {
  for (let index = lineIndex; index < lines.length; index += 1) {
    const line = lines[index];
    if (index > lineIndex && interruptsInlineCodeSpan(line)) return false;
    let cursor = index === lineIndex ? offset : 0;
    while (cursor < line.length) {
      if (line[cursor] !== "`") {
        cursor += 1;
        continue;
      }
      const runLength = backtickRunLength(line, cursor);
      if (runLength === length) return true;
      cursor += runLength;
    }
  }
  return false;
}

function stripHtmlComments(line, state, lines, lineIndex) {
  let visible = "";
  let cursor = 0;
  while (cursor < line.length) {
    if (state.inHtmlComment) {
      const end = line.indexOf("-->", cursor);
      if (end === -1) return visible;
      state.inHtmlComment = false;
      cursor = end + 3;
      continue;
    }
    if (state.inlineCodeLength) {
      if (line[cursor] === "`") {
        const length = backtickRunLength(line, cursor);
        visible += line.slice(cursor, cursor + length);
        cursor += length;
        if (length === state.inlineCodeLength) state.inlineCodeLength = 0;
      } else {
        visible += line[cursor];
        cursor += 1;
      }
      continue;
    }
    if (line[cursor] === "\\" && commonMarkEscapablePunctuation.has(line[cursor + 1] ?? "")) {
      visible += line.slice(cursor, cursor + 2);
      cursor += 2;
      continue;
    }
    if (line[cursor] === "`") {
      const length = backtickRunLength(line, cursor);
      visible += line.slice(cursor, cursor + length);
      cursor += length;
      if (hasClosingBacktickRun(lines, lineIndex, cursor, length)) {
        state.inlineCodeLength = length;
      }
      continue;
    }
    if (line.startsWith("<!--", cursor)) {
      state.inHtmlComment = true;
      cursor += 4;
      continue;
    }
    visible += line[cursor];
    cursor += 1;
  }
  return visible;
}

function commonMarkIndent(line) {
  let columns = 0;
  let offset = 0;
  while (offset < line.length) {
    if (line[offset] === " ") {
      columns += 1;
      offset += 1;
    } else if (line[offset] === "\t") {
      columns += 4 - (columns % 4);
      offset += 1;
    } else {
      break;
    }
  }
  return { columns, offset };
}

function commonMarkContainerCandidate(line) {
  let candidate = line;
  for (;;) {
    const indent = commonMarkIndent(candidate);
    if (indent.columns > 3) return candidate;
    const content = candidate.slice(indent.offset);
    const blockquote = /^>[ \t]?/.exec(content);
    if (blockquote) {
      candidate = content.slice(blockquote[0].length);
      continue;
    }
    const listItem = /^(?:[-+*]|\d{1,9}[.)])[ \t]+/.exec(content);
    if (listItem) {
      candidate = content.slice(listItem[0].length);
      continue;
    }
    return candidate;
  }
}

function markdownFenceOpener(candidate) {
  const opener = /^(`{3,}|~{3,})(.*)$/.exec(candidate);
  if (!opener || (opener[1][0] === "`" && opener[2].includes("`"))) return null;
  return { char: opener[1][0], length: opener[1].length };
}

const commonMarkHtmlBlockTag = new RegExp(
  "^</?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:[ \\t]|/?>|$)",
  "i",
);

function rawHtmlBlockOpener(candidate, paragraphOpen) {
  if (/^<(?:pre|script|style|textarea)(?:[ \t]|>|$)/i.test(candidate)) {
    return { end: /<\/(?:pre|script|style|textarea)>/i };
  }
  if (candidate.startsWith("<!--")) return { end: /-->/ };
  if (candidate.startsWith("<?")) return { end: /\?>/ };
  if (/^<![A-Z]/.test(candidate)) return { end: />/ };
  if (candidate.startsWith("<![CDATA[")) return { end: /\]\]>/ };
  if (commonMarkHtmlBlockTag.test(candidate)) return { blank: true };
  if (paragraphOpen) return null;
  if (/^<\/[A-Za-z][A-Za-z0-9-]*[ \t]*>[ \t]*$/.test(candidate)) {
    return { blank: true };
  }
  if (
    /^<[A-Za-z][A-Za-z0-9-]*(?:[ \t]+[A-Za-z_:][A-Za-z0-9_.:-]*(?:[ \t]*=[ \t]*(?:[^ "'=<>`]+|'[^']*'|"[^"]*"))?)*[ \t]*\/?>[ \t]*$/.test(
      candidate,
    )
  ) {
    return { blank: true };
  }
  return null;
}

function rawHtmlBlockEnded(block, line) {
  return block.blank ? line.trim() === "" : block.end.test(line);
}

function scanMarkdown(text) {
  const visibleLines = [];
  const commentState = { inHtmlComment: false, inlineCodeLength: 0 };
  let fence = null;
  let htmlBlock = null;
  let paragraphOpen = false;
  let linkDefinitionBoundary = "\0legacy-link-reference-definition:0\0";
  let linkDefinitionIndex = 0;
  while (text.includes(linkDefinitionBoundary)) {
    linkDefinitionIndex += 1;
    linkDefinitionBoundary = `\0legacy-link-reference-definition:${linkDefinitionIndex}\0`;
  }
  const lines = stripLinkReferenceDefinitions(text, linkDefinitionBoundary).split(/\r?\n/);
  for (const [lineIndex, rawLine] of lines.entries()) {
    const containerCandidate = commonMarkContainerCandidate(rawLine);
    if (fence) {
      const indent = commonMarkIndent(containerCandidate);
      const candidate = indent.columns <= 3 ? containerCandidate.slice(indent.offset) : "";
      const close = new RegExp(`^${escapeRegExp(fence.char)}{${fence.length},}[ \\t]*$`);
      if (close.test(candidate)) fence = null;
      visibleLines.push("");
      continue;
    }
    if (htmlBlock) {
      if (
        rawHtmlBlockEnded(htmlBlock, containerCandidate) ||
        rawHtmlBlockEnded(htmlBlock, rawLine)
      ) {
        htmlBlock = null;
      }
      visibleLines.push("");
      paragraphOpen = false;
      continue;
    }
    if (rawLine === linkDefinitionBoundary) {
      visibleLines.push("");
      paragraphOpen = false;
      continue;
    }
    const rawIndent = commonMarkIndent(containerCandidate);
    if (!commentState.inHtmlComment && rawIndent.columns >= 4) {
      visibleLines.push("");
      continue;
    }
    if (!commentState.inHtmlComment) {
      const rawCandidate = containerCandidate.slice(rawIndent.offset);
      const rawHtmlOpener = rawHtmlBlockOpener(rawCandidate, paragraphOpen);
      if (rawHtmlOpener) {
        if (!rawHtmlBlockEnded(rawHtmlOpener, rawLine)) htmlBlock = rawHtmlOpener;
        visibleLines.push("");
        paragraphOpen = false;
        continue;
      }
      const rawOpener = markdownFenceOpener(rawCandidate);
      if (rawOpener) {
        fence = rawOpener;
        visibleLines.push("");
        continue;
      }
    }
    const visible = stripHtmlComments(rawLine, commentState, lines, lineIndex);
    const indent = commonMarkIndent(visible);
    if (indent.columns >= 4) {
      visibleLines.push("");
      continue;
    }
    const candidate = visible.slice(indent.offset);
    const opener = markdownFenceOpener(candidate);
    if (opener) {
      fence = opener;
      visibleLines.push("");
      continue;
    }
    visibleLines.push(visible);
    paragraphOpen = visible.trim() !== "" && !interruptsInlineCodeSpan(visible);
  }
  return visibleLines;
}

function atxHeading(line) {
  const indent = commonMarkIndent(line);
  if (indent.columns > 3) return null;
  const candidate = line.slice(indent.offset);
  const match = /^(#{1,6})(?:[ \t]+(.*)|[ \t]*)$/.exec(candidate);
  if (!match) return null;
  let content = match[2] ?? "";
  content = content.replace(/[ \t]+#+[ \t]*$/, "").trim();
  return content ? { level: match[1].length, text: content } : null;
}

function headingSectionRecords(text, heading) {
  const lines = scanMarkdown(text);
  const rawLines = text.split(/\r?\n/);
  const matches = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = atxHeading(lines[index]);
    if (!match || normalize(match.text) !== normalize(heading)) continue;
    const level = match.level;
    let end = lines.length;
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const next = atxHeading(lines[cursor]);
      if (next && next.level <= level) {
        end = cursor;
        break;
      }
    }
    matches.push({
      content: lines.slice(index + 1, end).join("\n"),
      end,
      rawContent: rawLines.slice(index + 1, end).join("\n"),
      start: index + 1,
    });
  }
  return matches;
}

function headingSections(text, heading) {
  return headingSectionRecords(text, heading).map((section) => section.content);
}

function markdownListItems(section) {
  const items = [];
  let current = null;
  for (const line of section.split(/\r?\n/)) {
    const item = /^\s*-\s+(.+)$/.exec(line);
    if (item) {
      if (current !== null) items.push(normalize(`- ${current}`));
      current = item[1];
      continue;
    }
    if (current !== null && line.trim()) current += ` ${line.trim()}`;
  }
  if (current !== null) items.push(normalize(`- ${current}`));
  return items;
}

function materialUnits(sourcePath, text, errors) {
  const units = [];
  for (const heading of materialHeadings) {
    const sections = headingSections(text, heading);
    if (sections.length > 1) {
      errors.push(
        `${sourcePath}: source heading ${JSON.stringify(heading)} must exist at most once`,
      );
      continue;
    }
    if (sections.length === 0) continue;
    const items = markdownListItems(sections[0]);
    for (const marker of items) units.push({ heading, marker });
  }
  if (units.length === 0) {
    errors.push(`${sourcePath}: legacy source has no material assertion or behavior units`);
  }
  return units;
}

export function extractLegacyMaterialUnits(text) {
  const errors = [];
  const units = materialUnits("<inline>", text, errors);
  return { errors, units };
}

function sourceUnitKey(heading, marker) {
  return `${normalize(heading)}\u0000${normalize(marker)}`;
}

function walkRuntimeFiles(
  root,
  runtimeDirectory,
  errors,
  directoryWitnesses,
  readWitnesses,
  testOnlyReadPhaseHook,
  validationRootStat,
) {
  const runtime = inspectSymlinkFree(
    root,
    runtimeDirectory,
    errors,
    runtimeDirectory,
    validationRootStat,
  );
  if (!runtime) return [];
  if (!runtime.stat.isDirectory()) {
    errors.push(`${runtimeDirectory}: runtime payload root must be a directory`);
    return [];
  }
  const files = [];
  const resolvedRoot = path.resolve(root);

  function walk(relativeDirectory) {
    const before = inspectSymlinkFree(
      root,
      relativeDirectory,
      errors,
      relativeDirectory,
      validationRootStat,
    );
    if (!before || !before.stat.isDirectory()) {
      if (before) {
        errors.push(
          `${toPosix(relativeDirectory)}: runtime payload entry must be a directory; found ${entryKind(before.stat)}`,
        );
      }
      return;
    }
    let names;
    try {
      names = fs.readdirSync(before.file).sort(compareNames);
    } catch (error) {
      errors.push(
        `${toPosix(relativeDirectory)}: unable to enumerate runtime payload directory: ${error.message}`,
      );
      return;
    }
    for (const name of names) {
      const relative = path.join(relativeDirectory, name);
      const absolute = path.join(resolvedRoot, relative);
      let stat;
      try {
        stat = fs.lstatSync(absolute, { bigint: true });
      } catch (error) {
        errors.push(
          `${toPosix(relative)}: runtime payload entry changed during traversal: ${error.message}`,
        );
        continue;
      }
      if (stat.isSymbolicLink()) {
        errors.push(
          `${toPosix(relative)}: runtime payload entries and path components must be symlink-free`,
        );
      } else if (stat.isDirectory()) {
        walk(relative);
      } else if (stat.isFile()) {
        const buffer = readRegularFile(root, toPosix(relative), errors, {
          purpose: "runtime payload entry",
          readWitnesses,
          testOnlyReadPhaseHook,
          validationRootStat,
        });
        if (buffer) files.push({ buffer, relative: toPosix(relative) });
      } else {
        errors.push(
          `${toPosix(relative)}: runtime payload must contain only regular files and directories; found ${entryKind(stat)}`,
        );
      }
    }
    let after;
    let afterNames;
    let completed;
    let completedNames;
    let final;
    try {
      after = inspectSymlinkFree(
        root,
        relativeDirectory,
        errors,
        relativeDirectory,
        validationRootStat,
      );
      if (!after) return;
      afterNames = fs.readdirSync(after.file).sort(compareNames);
      completed = inspectSymlinkFree(
        root,
        relativeDirectory,
        errors,
        relativeDirectory,
        validationRootStat,
      );
      if (!completed) return;
      completedNames = fs.readdirSync(completed.file).sort(compareNames);
      final = inspectSymlinkFree(
        root,
        relativeDirectory,
        errors,
        relativeDirectory,
        validationRootStat,
      );
      if (!final) return;
    } catch (error) {
      errors.push(
        `${toPosix(relativeDirectory)}: runtime payload directory changed during traversal: ${error.message}`,
      );
      return;
    }
    if (
      !sameNode(before.stat, after.stat) ||
      !sameNode(before.stat, completed.stat) ||
      !sameNode(before.stat, final.stat) ||
      !sameIdentityChain(before.identities, after.identities) ||
      !sameIdentityChain(before.identities, completed.identities) ||
      !sameIdentityChain(before.identities, final.identities) ||
      JSON.stringify(names) !== JSON.stringify(afterNames) ||
      JSON.stringify(names) !== JSON.stringify(completedNames)
    ) {
      errors.push(
        `${toPosix(relativeDirectory)}: runtime payload directory changed during traversal`,
      );
    } else {
      directoryWitnesses.push({
        identities: final.identities,
        names: completedNames,
        relativePath: toPosix(relativeDirectory),
        stat: final.stat,
      });
    }
  }

  walk(runtime.normalized);
  return files;
}

function stripNestedBlockquotes(line) {
  let result = line;
  while (/^[ \t]{0,3}>[ \t]?/.test(result)) {
    result = result.replace(/^[ \t]{0,3}>[ \t]?/, "");
  }
  return result;
}

function findClosingBracket(value, start) {
  let depth = 1;
  for (let cursor = start; cursor < value.length; cursor += 1) {
    if (value[cursor] === "\\") {
      cursor += 1;
    } else if (value[cursor] === "[") {
      depth += 1;
    } else if (value[cursor] === "]" && --depth === 0) {
      return cursor;
    }
  }
  return -1;
}

function findClosingParenthesis(value, start) {
  let depth = 1;
  let quote = null;
  for (let cursor = start; cursor < value.length; cursor += 1) {
    const character = value[cursor];
    if (character === "\\") {
      cursor += 1;
    } else if (quote) {
      if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === "(") {
      depth += 1;
    } else if (character === ")" && --depth === 0) {
      return cursor;
    }
  }
  return -1;
}

function validInlineLinkContent(value) {
  return /^[ \t]*(?:<[^<>\n]*>|[^\s<>()]+)(?:[ \t]+(?:"[^"\n]*"|'[^'\n]*'|\([^()\n]*\)))?[ \t]*$/.test(
    value,
  );
}

function renderLinksAndRemoveImages(value, { excludedBoundary = "" } = {}) {
  let rendered = "";
  let cursor = 0;
  while (cursor < value.length) {
    if (value[cursor] === "\\" && cursor + 1 < value.length) {
      rendered += value.slice(cursor, cursor + 2);
      cursor += 2;
      continue;
    }
    const image = value.startsWith("![", cursor);
    const link = value[cursor] === "[";
    if (!image && !link) {
      rendered += value[cursor];
      cursor += 1;
      continue;
    }
    const labelStart = cursor + (image ? 2 : 1);
    const labelEnd = findClosingBracket(value, labelStart);
    if (labelEnd === -1) {
      rendered += value[cursor];
      cursor += 1;
      continue;
    }
    let end = labelEnd + 1;
    if (image && value[end] !== "(" && value[end] !== "[") {
      rendered += excludedBoundary;
      cursor = end;
      continue;
    }
    if (!image && value[end] !== "(") {
      rendered += value[cursor];
      cursor += 1;
      continue;
    }
    if (value[end] === "(") {
      const close = findClosingParenthesis(value, end + 1);
      if (close === -1 || !validInlineLinkContent(value.slice(end + 1, close))) {
        rendered += value[cursor];
        cursor += 1;
        continue;
      }
      end = close + 1;
    } else if (image && value[end] === "[") {
      const close = findClosingBracket(value, end + 1);
      if (close !== -1) end = close + 1;
    }
    if (image) rendered += excludedBoundary;
    else rendered += value.slice(labelStart, labelEnd);
    cursor = end;
  }
  return rendered;
}

function findRawHtmlEnd(value, start) {
  let quote = null;
  for (let cursor = start; cursor < value.length; cursor += 1) {
    const character = value[cursor];
    if (quote) {
      if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === ">") {
      return cursor + 1;
    }
  }
  return -1;
}

function protectMatchedCodeSpans(value) {
  const source = String(value);
  const lines = source.split(/\r?\n/);
  const spans = [];
  let protectedText = "";
  let active = null;
  for (const [lineIndex, line] of lines.entries()) {
    let cursor = 0;
    while (cursor < line.length) {
      if (active) {
        if (line[cursor] === "`") {
          const length = backtickRunLength(line, cursor);
          active.text += line.slice(cursor, cursor + length);
          cursor += length;
          if (length === active.length) {
            let token = `\0legacy-code-span:${spans.length}\0`;
            while (source.includes(token)) token = `\0${token}\0`;
            spans.push({ text: active.text, token });
            protectedText += token;
            active = null;
          }
        } else {
          active.text += line[cursor];
          cursor += 1;
        }
        continue;
      }
      if (line[cursor] === "\\" && commonMarkEscapablePunctuation.has(line[cursor + 1] ?? "")) {
        protectedText += line.slice(cursor, cursor + 2);
        cursor += 2;
        continue;
      }
      if (line[cursor] === "`") {
        const length = backtickRunLength(line, cursor);
        if (hasClosingBacktickRun(lines, lineIndex, cursor + length, length)) {
          active = { length, text: line.slice(cursor, cursor + length) };
          cursor += length;
          continue;
        }
        protectedText += line.slice(cursor, cursor + length);
        cursor += length;
        continue;
      }
      protectedText += line[cursor];
      cursor += 1;
    }
    if (lineIndex < lines.length - 1) {
      if (active) active.text += "\n";
      else protectedText += "\n";
    }
  }
  if (active) protectedText += active.text;
  return {
    restore(transformed) {
      let restored = transformed;
      for (const span of spans) restored = restored.replaceAll(span.token, () => span.text);
      return restored;
    },
    text: protectedText,
  };
}

function protectFencedCodeBlocks(value) {
  const source = String(value);
  const lines = source.split(/\r?\n/);
  const blocks = [];
  const rendered = [];
  let active = null;
  const candidateFor = (line) => {
    const container = commonMarkContainerCandidate(line);
    const indent = commonMarkIndent(container);
    return indent.columns <= 3 ? container.slice(indent.offset) : container;
  };
  for (const line of lines) {
    if (!active) {
      const opener = markdownFenceOpener(candidateFor(line));
      if (!opener) {
        rendered.push(line);
        continue;
      }
      active = { ...opener, lines: [line] };
      continue;
    }
    active.lines.push(line);
    const candidate = candidateFor(line);
    const closing = new RegExp(`^${active.char === "`" ? "`" : "~"}{${active.length},}[ \\t]*$`);
    if (!closing.test(candidate)) continue;
    let token = `\0legacy-fenced-code:${blocks.length}\0`;
    while (source.includes(token)) token = `\0${token}\0`;
    blocks.push({ text: active.lines.join("\n"), token });
    rendered.push(token);
    active = null;
  }
  if (active) rendered.push(...active.lines);
  return {
    restore(transformed) {
      let restored = transformed;
      for (const block of blocks) restored = restored.replaceAll(block.token, () => block.text);
      return restored;
    },
    text: rendered.join("\n"),
  };
}

function stripCommonMarkRawHtml(value) {
  let rendered = "";
  let cursor = 0;
  while (cursor < value.length) {
    if (value[cursor] !== "<") {
      rendered += value[cursor];
      cursor += 1;
      continue;
    }
    let end = -1;
    if (value.startsWith("<?", cursor)) {
      const close = value.indexOf("?>", cursor + 2);
      end = close === -1 ? -1 : close + 2;
    } else if (value.startsWith("<![CDATA[", cursor)) {
      const close = value.indexOf("]]>", cursor + 9);
      end = close === -1 ? -1 : close + 3;
    } else if (/^<![A-Z]/.test(value.slice(cursor))) {
      end = findRawHtmlEnd(value, cursor + 2);
    } else if (/^<\/?[A-Za-z]/.test(value.slice(cursor))) {
      end = findRawHtmlEnd(value, cursor + 1);
    }
    if (end === -1) {
      rendered += value[cursor];
      cursor += 1;
    } else {
      cursor = end;
    }
  }
  return rendered;
}

function stripLinkReferenceDefinitions(value, excludedBoundary) {
  const lines = value.split(/\r?\n/);
  const visible = [];
  let continuationPhase = null;
  let pendingLabel = false;
  let titleEnd = null;
  let paragraphOpen = false;
  const containerContent = (line) => {
    let content = line.replace(/^[ \t]{0,3}/, "");
    let hadContainer = false;
    while (/^>[ \t]?/.test(content)) {
      content = content.replace(/^>[ \t]?/, "");
      hadContainer = true;
    }
    if (/^(?:[-+*]|\d{1,9}[.)])[ \t]+/.test(content)) {
      content = content.replace(/^(?:[-+*]|\d{1,9}[.)])[ \t]+/, "");
      hadContainer = true;
    }
    return { content, hadContainer };
  };
  for (const line of lines) {
    const { content, hadContainer } = containerContent(line);
    if (titleEnd) {
      visible.push(excludedBoundary);
      if (content.trimEnd().endsWith(titleEnd)) titleEnd = null;
      continue;
    }
    if (continuationPhase === "destination") {
      if (!content.trim()) {
        continuationPhase = null;
        visible.push(line);
        continue;
      }
      visible.push(excludedBoundary);
      continuationPhase = "title";
      continue;
    }
    if (continuationPhase === "title") {
      const trimmed = content.trim();
      const opener = trimmed[0];
      const closer = opener === "(" ? ")" : opener;
      if (opener === '"' || opener === "'" || opener === "(") {
        visible.push(excludedBoundary);
        if (trimmed.length === 1 || !trimmed.endsWith(closer)) titleEnd = closer;
        continuationPhase = null;
        continue;
      }
      continuationPhase = null;
    }
    if (pendingLabel) {
      visible.push(excludedBoundary);
      const closing = /(?:\\.|[^\]\\])*\]:[ \t]*(.*)$/.exec(content);
      if (closing) {
        pendingLabel = false;
        continuationPhase = closing[1].trim() ? "title" : "destination";
      }
      continue;
    }
    const atBlockBoundary = !paragraphOpen || hadContainer;
    const definition = /^\[(?:\\.|[^\]\\])+\]:[ \t]*(.*)$/.exec(content);
    if (atBlockBoundary && definition) {
      continuationPhase = definition[1].trim() ? "title" : "destination";
      visible.push(excludedBoundary);
      continue;
    }
    if (atBlockBoundary && /^\[/.test(content) && !/\]/.test(content)) {
      pendingLabel = true;
      visible.push(excludedBoundary);
      continue;
    }
    visible.push(line);
    paragraphOpen = content.trim() !== "" && !hadContainer;
  }
  return visible.join("\n");
}

function stripTargetRawHtmlRegions(value, excludedBoundary) {
  const lower = value.toLowerCase();
  let visible = "";
  let cursor = 0;
  while (cursor < value.length) {
    const start = value.indexOf("<", cursor);
    if (start === -1) return visible + value.slice(cursor);
    visible += value.slice(cursor, start);
    let end = -1;
    if (value.startsWith("<!--", start)) {
      const close = value.indexOf("-->", start + 4);
      end = close === -1 ? value.length : close + 3;
    } else if (value.startsWith("<?", start)) {
      const close = value.indexOf("?>", start + 2);
      end = close === -1 ? value.length : close + 2;
    } else if (value.startsWith("<![CDATA[", start)) {
      const close = value.indexOf("]]>", start + 9);
      end = close === -1 ? value.length : close + 3;
    } else if (/^<![A-Z]/.test(value.slice(start))) {
      end = findRawHtmlEnd(value, start + 2);
      if (end === -1) end = value.length;
    } else {
      const closing = /^<\/([A-Za-z][A-Za-z0-9-]*)\b/.exec(value.slice(start));
      if (closing) {
        end = findRawHtmlEnd(value, start + 2);
      } else {
        const opening = /^<([A-Za-z][A-Za-z0-9-]*)\b/.exec(value.slice(start));
        if (opening) {
          const openingEnd = findRawHtmlEnd(value, start + 1);
          if (openingEnd !== -1) {
            const tag = opening[1].toLowerCase();
            const closeStart = lower.indexOf(`</${tag}`, openingEnd);
            if (closeStart !== -1) {
              const closeEnd = findRawHtmlEnd(value, closeStart + 2);
              end = closeEnd === -1 ? value.length : closeEnd;
            } else {
              end = openingEnd;
            }
          }
        }
      }
    }
    if (end === -1) {
      visible += value[start];
      cursor = start + 1;
    } else {
      visible += excludedBoundary;
      cursor = end;
    }
  }
  return visible;
}

function normalizeCommonMarkInlineText(
  value,
  { processEmphasis = true, processLinks = true, removeBackticks = true } = {},
) {
  const protectedCode = protectMatchedCodeSpans(value);
  let text = stripCommonMarkRawHtml(protectedCode.text);
  for (;;) {
    let next = processLinks ? renderLinksAndRemoveImages(text) : text;
    if (processEmphasis) {
      next = next
        .replace(/\*\*\*(?=\S)([^\n]*?\S)\*\*\*/g, "$1")
        .replace(/\*\*(?=\S)([^\n]*?\S)\*\*/g, "$1")
        .replace(/\*(?=\S)([^\n]*?\S)\*/g, "$1")
        .replace(/(^|[^\p{L}\p{N}])___(?=\S)([^_\n]*?\S)___(?![\p{L}\p{N}])/gu, "$1$2")
        .replace(/(^|[^\p{L}\p{N}])__(?=\S)([^_\n]*?\S)__(?![\p{L}\p{N}])/gu, "$1$2")
        .replace(/(^|[^\p{L}\p{N}])_(?=\S)([^_\n]*?\S)_(?![\p{L}\p{N}])/gu, "$1$2");
    }
    if (next === text) break;
    text = next;
  }
  text = protectedCode.restore(text);
  if (removeBackticks) text = text.replace(/`+/g, "");
  return text.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~])/g, "$1");
}

function decodeCommonMarkCharacterReferences(value) {
  return String(value).replace(
    /&(?:#(?:[xX]([0-9A-Fa-f]{1,6})|([0-9]{1,7}))|([A-Za-z][A-Za-z0-9]{1,31}));/g,
    (reference, hexadecimal, decimal, named) => {
      if (named) {
        const known = commonMarkNamedReferences.get(named);
        if (known !== undefined) return known;
        const compatibilityLetter = /^([A-Za-z])(?:scr|fr|opf)$/.exec(named);
        return compatibilityLetter?.[1] ?? reference;
      }
      const codePoint = Number.parseInt(hexadecimal ?? decimal, hexadecimal ? 16 : 10);
      if (
        !Number.isInteger(codePoint) ||
        codePoint === 0 ||
        codePoint > 0x10ffff ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff)
      ) {
        return "\ufffd";
      }
      return String.fromCodePoint(codePoint);
    },
  );
}

function unrecognizedNamedReferences(value) {
  const unknown = new Set();
  for (const match of String(value).matchAll(/&([A-Za-z][A-Za-z0-9]{1,31});/g)) {
    const name = match[1];
    if (!commonMarkNamedReferences.has(name) && !/^([A-Za-z])(?:scr|fr|opf)$/.test(name)) {
      unknown.add(name);
    }
  }
  return [...unknown];
}

function decodeReferencesOutsideCodeSpans(value, { stripMatchedCodeDelimiters = false } = {}) {
  const lines = String(value).split(/\r?\n/);
  const state = { inlineCodeLength: 0 };
  const renderedLines = [];
  for (const [lineIndex, line] of lines.entries()) {
    let rendered = "";
    let outside = "";
    let cursor = 0;
    const flushOutside = () => {
      rendered += decodeCommonMarkCharacterReferences(outside);
      outside = "";
    };
    while (cursor < line.length) {
      if (state.inlineCodeLength) {
        flushOutside();
        if (line[cursor] === "`") {
          const length = backtickRunLength(line, cursor);
          if (!stripMatchedCodeDelimiters || length !== state.inlineCodeLength) {
            rendered += line.slice(cursor, cursor + length);
          }
          cursor += length;
          if (length === state.inlineCodeLength) state.inlineCodeLength = 0;
        } else {
          rendered += line[cursor];
          cursor += 1;
        }
        continue;
      }
      if (line[cursor] === "\\" && commonMarkEscapablePunctuation.has(line[cursor + 1] ?? "")) {
        flushOutside();
        rendered += line.slice(cursor, cursor + 2);
        cursor += 2;
        continue;
      }
      if (line[cursor] === "`") {
        const length = backtickRunLength(line, cursor);
        if (hasClosingBacktickRun(lines, lineIndex, cursor + length, length)) {
          flushOutside();
          if (!stripMatchedCodeDelimiters) {
            rendered += line.slice(cursor, cursor + length);
          }
          cursor += length;
          state.inlineCodeLength = length;
          continue;
        }
      }
      outside += line[cursor];
      cursor += 1;
    }
    flushOutside();
    renderedLines.push(rendered);
  }
  return renderedLines.join("\n");
}

function canonicalEvidenceText(
  value,
  {
    decodeSerializedWhitespace = true,
    preserveUnmatchedBackticks = false,
    processEmphasis = true,
    processLinks = true,
    semantic = false,
  } = {},
) {
  let text = String(value).normalize("NFKC").split(/\r?\n/).map(stripNestedBlockquotes).join("\n");
  if (decodeSerializedWhitespace) {
    text = text.replace(/\\(?:r\\n|n|r|t)/g, " ");
  }
  text = text.replace(/\\(["\\/])/g, "$1");
  if (semantic) {
    text = normalizeCommonMarkInlineText(text, {
      processEmphasis,
      processLinks,
      removeBackticks: !preserveUnmatchedBackticks,
    });
  }
  return normalize(text);
}

function normalizeUnambiguousTargetEmphasis(value) {
  let text = value;
  for (;;) {
    const next = text
      .replace(/(^|[ \t\n])(\*{1,3})(?=\S)([^\n]*?\S)\2(?=$|[ \t\n.,;:!?)}\]])/g, "$1$3")
      .replace(/(^|[ \t\n])(_{1,3})(?=\S)([^_\n]*?\S)\2(?=$|[ \t\n.,;:!?)}\]])/g, "$1$3");
    if (next === text) return text;
    text = next;
  }
}

function addEvidenceVariants(forms, value) {
  const raw = String(value);
  for (const candidate of new Set([raw, stripRepeatedLineWrappers(raw)])) {
    for (const representation of new Set([
      candidate,
      decodeCommonMarkCharacterReferences(candidate),
    ])) {
      const literal = canonicalEvidenceText(representation);
      const semantic = canonicalEvidenceText(representation, { semantic: true });
      if (literal) forms.add(literal);
      if (semantic) forms.add(semantic);
    }
  }
}

function collectStringLeaves(value, currentPath = [], entries = []) {
  if (typeof value === "string") {
    entries.push({ path: JSON.stringify(currentPath), value });
  } else if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      collectStringLeaves(entry, [...currentPath, ["index", index]], entries);
    }
  } else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      collectStringLeaves(entry, [...currentPath, ["key", key]], entries);
    }
  }
  return entries;
}

function relativeStringLeaves(value) {
  return collectStringLeaves(value).map((entry) => ({
    path: entry.path,
    value: entry.value,
  }));
}

function addStructuredStream(streams, values) {
  if (!streams || values.length < 2) return;
  streams.set(
    JSON.stringify(values),
    values.map((value) => String(value)),
  );
}

function addRecordStreams(forms, records, streams = null) {
  const byPath = new Map();
  for (const record of records) {
    const leaves = relativeStringLeaves(record);
    const current = new Map(leaves.map((entry) => [entry.path, entry.value]));
    const paths = new Set([...byPath.keys(), ...current.keys()]);
    for (const leafPath of paths) {
      if (!byPath.has(leafPath)) byPath.set(leafPath, []);
      byPath.get(leafPath).push(current.get(leafPath) ?? "");
    }
  }
  for (const values of byPath.values()) {
    addEvidenceVariants(forms, values.join("\n"));
    addEvidenceVariants(forms, values.join(""));
    addStructuredStream(streams, values);
  }
}

function addDocumentOrderLeafStream(forms, streams, records) {
  const values = records.flatMap((record) =>
    relativeStringLeaves(record).map((entry) => entry.value),
  );
  addEvidenceVariants(forms, values.join("\n"));
  addEvidenceVariants(forms, values.join(""));
  addStructuredStream(streams, values);
}

function addJsonEvidenceForms(forms, value, streams = null) {
  if (typeof value === "string") {
    addEvidenceVariants(forms, value);
    return;
  }
  if (Array.isArray(value)) {
    addRecordStreams(forms, value, streams);
    addDocumentOrderLeafStream(forms, streams, value);
    for (const entry of value) addJsonEvidenceForms(forms, entry, streams);
    return;
  }
  if (!value || typeof value !== "object") return;
  const keys = Object.keys(value);
  const isNumericRecord = keys.length > 0 && keys.every((key) => /^(?:0|[1-9]\d*)$/.test(key));
  if (isNumericRecord) {
    const ordered = [...keys]
      .sort((left, right) => {
        const leftValue = BigInt(left);
        const rightValue = BigInt(right);
        return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
      })
      .map((key) => value[key]);
    addRecordStreams(forms, ordered, streams);
    addDocumentOrderLeafStream(forms, streams, ordered);
  } else {
    addDocumentOrderLeafStream(forms, streams, [value]);
  }
  for (const entry of Object.values(value)) addJsonEvidenceForms(forms, entry, streams);
}

function stripFixedLineWrappers(line) {
  let result = line;
  for (;;) {
    const next = result
      .replace(/^[ \t]*(?:(?:line|row)[ \t]+)?\d{1,8}[ \t]*(?:\||:|=>)[ \t]*/, "")
      .replace(/^[ \t]*\[[A-Za-z0-9_.-]{1,32}\][ \t]+/, "");
    if (next === result) return result;
    result = next;
  }
}

function stripRepeatedLineWrappers(raw) {
  let current = raw;
  for (;;) {
    const lines = current.split(/\r?\n/).map(stripFixedLineWrappers);
    const signatures = new Map();
    const parsed = lines.map((line) => {
      const match = /^[ \t]*([A-Za-z][A-Za-z0-9_.-]{0,31})([ \t]*(?::|\||=>)[ \t]*)(.*)$/.exec(
        line,
      );
      if (!match) return null;
      const signature = `${match[1]}${match[2].trim()}`;
      signatures.set(signature, (signatures.get(signature) ?? 0) + 1);
      return { signature, value: match[3] };
    });
    const next = lines
      .map((line, index) => {
        const match = parsed[index];
        return match && signatures.get(match.signature) >= 2 ? match.value : line;
      })
      .join("\n");
    if (next === current) return current;
    current = next;
  }
}

function stripStructuredStreamWrappers(values) {
  let current = values.map(stripFixedLineWrappers);
  for (;;) {
    const parsed = current.map((value) => {
      if (!value) return null;
      const match = /^[ \t]*([A-Za-z][A-Za-z0-9_.-]{0,31})([ \t]*(?::|\||=>)[ \t]*)(.*)$/.exec(
        value,
      );
      return match ? { signature: `${match[1]}${match[2].trim()}`, value: match[3] } : null;
    });
    const signatures = new Set(parsed.filter(Boolean).map((entry) => entry.signature));
    if (signatures.size !== 1 || parsed.filter(Boolean).length < 2) return current;
    const next = current.map((value, index) => parsed[index]?.value ?? value);
    if (next.every((value, index) => value === current[index])) return current;
    current = next;
  }
}

function countBoundaryCrossingOccurrences(parts, separator, fingerprint) {
  if (parts.length < 2 || !fingerprint) return 0;
  let text = "";
  const boundaries = [];
  for (const [index, part] of parts.entries()) {
    if (index > 0) {
      const start = text.length;
      text += separator;
      boundaries.push({ end: text.length, start });
    }
    text += part;
  }
  let count = 0;
  let offset = 0;
  while ((offset = text.indexOf(fingerprint, offset)) !== -1) {
    const end = offset + fingerprint.length;
    if (boundaries.some((boundary) => offset < boundary.end && end > boundary.start)) {
      count += 1;
    }
    offset += 1;
  }
  return count;
}

function structuredBoundaryOccurrenceCount(streams, fingerprint) {
  let maximum = 0;
  for (const values of streams.values()) {
    for (const candidates of [values, stripStructuredStreamWrappers(values)]) {
      for (const decodeReferences of [false, true]) {
        for (const semantic of [false, true]) {
          const parts = candidates.map((value) =>
            canonicalEvidenceText(
              decodeReferences ? decodeCommonMarkCharacterReferences(value) : value,
              { semantic },
            ),
          );
          maximum = Math.max(
            maximum,
            countBoundaryCrossingOccurrences(parts, " ", fingerprint),
            countBoundaryCrossingOccurrences(parts, "", fingerprint),
          );
        }
      }
    }
  }
  return maximum;
}

function jsonValueStringTokens(raw) {
  const tokens = [];
  for (let index = 0; index < raw.length; index += 1) {
    if (raw[index] !== '"') continue;
    const start = index;
    index += 1;
    while (index < raw.length) {
      if (raw[index] === "\\") {
        index += 2;
        continue;
      }
      if (raw[index] === '"') break;
      index += 1;
    }
    if (index >= raw.length) break;
    const lexeme = raw.slice(start, index + 1);
    try {
      tokens.push({ decoded: JSON.parse(lexeme), encoded: lexeme.slice(1, -1) });
    } catch {
      // The enclosing JSON parser decides whether this text is a valid evidence record.
    }
  }
  return tokens;
}

function decodedStructuredExtraCount(tokens, fingerprint) {
  let extra = 0;
  for (const token of tokens) {
    const encodedForms = new Set();
    const decodedForms = new Set();
    addEvidenceVariants(encodedForms, token.encoded);
    addEvidenceVariants(decodedForms, token.decoded);
    extra += Math.max(
      0,
      fingerprintOccurrenceCountInForms([...decodedForms], fingerprint) -
        fingerprintOccurrenceCountInForms([...encodedForms], fingerprint),
    );
  }
  return extra;
}

function analyzeEvidence(value) {
  const raw = value.toString("utf8");
  const forms = new Set();
  const streams = new Map();
  let stringTokens = [];
  let parsedWholeDocument = false;
  addEvidenceVariants(forms, raw);
  try {
    addJsonEvidenceForms(forms, JSON.parse(raw), streams);
    stringTokens = jsonValueStringTokens(raw);
    parsedWholeDocument = true;
  } catch {
    // Non-JSON runtime files retain raw and wrapper-normalized evidence forms.
  }
  const jsonLineRecords = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line);
      jsonLineRecords.push(record);
      addJsonEvidenceForms(forms, record, streams);
      if (!parsedWholeDocument) {
        stringTokens.push(...jsonValueStringTokens(line));
      }
    } catch {
      // Metadata or prose lines do not invalidate independently valid JSONL records.
    }
  }
  if (jsonLineRecords.length > 0) {
    addRecordStreams(forms, jsonLineRecords, streams);
    addDocumentOrderLeafStream(forms, streams, jsonLineRecords);
  }
  const decodedTokenStream = stringTokens.map((token) => token.decoded);
  addEvidenceVariants(forms, decodedTokenStream.join("\n"));
  addEvidenceVariants(forms, decodedTokenStream.join(""));
  addStructuredStream(streams, decodedTokenStream);
  return {
    forms: [...forms].filter(Boolean),
    raw,
    streams,
    stringTokens,
    unrecognizedNamedReferences: unrecognizedNamedReferences(raw),
  };
}

function evidenceForms(value) {
  return analyzeEvidence(value).forms;
}

function visibleMarkerForms(value) {
  const forms = new Set();
  const raw = value.toString("utf8");
  for (const candidate of new Set([raw, stripRepeatedLineWrappers(raw)])) {
    for (const representation of new Set([
      candidate,
      decodeReferencesOutsideCodeSpans(candidate),
    ])) {
      const literal = canonicalEvidenceText(representation);
      const semantic = canonicalEvidenceText(representation, { semantic: true });
      if (literal) forms.add(literal);
      if (semantic) forms.add(semantic);
    }
  }
  return [...forms].filter(Boolean);
}

function targetMarkerForms(value, markers) {
  const forms = new Set();
  const raw = value.toString("utf8");
  const reserved = [raw, ...markers.map(String)];
  let boundaryIndex = 0;
  let excludedBoundary;
  do {
    excludedBoundary = `\0legacy-target-boundary:${boundaryIndex}\0`;
    boundaryIndex += 1;
  } while (reserved.some((candidate) => candidate.includes(excludedBoundary)));
  for (const candidate of [raw]) {
    const protectedFences = protectFencedCodeBlocks(candidate);
    const protectedCode = protectMatchedCodeSpans(protectedFences.text);
    const withoutHiddenBlocks = stripTargetRawHtmlRegions(
      stripLinkReferenceDefinitions(protectedCode.text, excludedBoundary),
      excludedBoundary,
    );
    const visibleLinks = renderLinksAndRemoveImages(withoutHiddenBlocks, {
      excludedBoundary,
    });
    const structural = normalizeUnambiguousTargetEmphasis(visibleLinks);
    const rendered = protectedFences.restore(
      decodeReferencesOutsideCodeSpans(protectedCode.restore(structural), {
        stripMatchedCodeDelimiters: true,
      }),
    );
    const unescaped = rendered.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~])/g, "$1");
    const literal = canonicalEvidenceText(unescaped, {
      decodeSerializedWhitespace: false,
    });
    if (literal) forms.add(literal);
  }
  return [...forms];
}

export function inspectVisibleMarkdownTarget(text, heading, markers = []) {
  const sections = headingSectionRecords(text, heading);
  if (sections.length !== 1) {
    return { markerCounts: new Map(), matches: sections.length, text: "" };
  }
  const section = sections[0];
  const forms = targetMarkerForms(Buffer.from(section.rawContent, "utf8"), markers);
  const markerCounts = new Map();
  for (const marker of markers) {
    if (typeof marker !== "string") continue;
    const normalizedMarkers = new Set(
      [canonicalEvidenceText(marker), canonicalEvidenceText(marker, { semantic: true })].filter(
        Boolean,
      ),
    );
    markerCounts.set(
      marker,
      Math.max(
        0,
        ...[...normalizedMarkers].map((normalizedMarker) =>
          fingerprintOccurrenceCountInForms(forms, normalizedMarker),
        ),
      ),
    );
  }
  return { markerCounts, matches: 1, text: section.rawContent };
}

export function canonicalMaterialFingerprint(marker) {
  return canonicalEvidenceText(marker, { semantic: true }).replace(/^\s*-\s*/, "");
}

function materialFingerprintVariants(marker) {
  return new Set(
    [
      canonicalEvidenceText(marker).replace(/^\s*-\s*/, ""),
      canonicalMaterialFingerprint(marker),
    ].filter(Boolean),
  );
}

export function sourceMaterialFingerprints(marker) {
  if (typeof marker !== "string") return [];
  const rendered = decodeReferencesOutsideCodeSpans(marker, {
    stripMatchedCodeDelimiters: true,
  });
  const fingerprint = canonicalMaterialFingerprint(rendered);
  const payload = fingerprint.replace(/^(?:contains|not_contains):\s*/i, "");
  if (!/[\p{L}\p{N}]/u.test(payload)) return [];
  return [...materialFingerprintVariants(marker)].filter(
    (variant) => variant.length < legacySourceSegmentWidth,
  );
}

function countOccurrences(text, needle) {
  if (!needle) return 0;
  let count = 0;
  let offset = 0;
  while ((offset = text.indexOf(needle, offset)) !== -1) {
    count += 1;
    offset += 1;
  }
  return count;
}

function fingerprintOccurrenceCountInForms(forms, fingerprint) {
  return Math.max(0, ...forms.map((text) => countOccurrences(text, fingerprint)));
}

function leakSegments(value) {
  const width = legacySourceSegmentWidth;
  const segments = [];
  for (const text of evidenceForms(value)) {
    for (let offset = 0; offset + width <= text.length; offset += 1) {
      segments.push(text.slice(offset, offset + width));
    }
  }
  return [...new Set(segments)];
}

function containsLeakSegment(value, segments) {
  const width = legacySourceSegmentWidth;
  for (const text of evidenceForms(value)) {
    for (let offset = 0; offset + width <= text.length; offset += 1) {
      if (segments.has(text.slice(offset, offset + width))) return true;
    }
  }
  return false;
}

function isSameOrInside(candidate, parent) {
  return candidate === parent || candidate.startsWith(`${parent}${path.sep}`);
}

function policyPath(
  root,
  relativePath,
  errors,
  label,
  testOnlyReadPhaseHook = null,
  validationRootStat = null,
) {
  const inspected = inspectSymlinkFree(root, relativePath, errors, label, validationRootStat);
  if (!inspected) return null;
  const hookContext = {
    file: inspected.file,
    relativePath: toPosix(inspected.normalized),
  };
  testOnlyReadPhaseHook?.({ ...hookContext, phase: "before-realpath" });
  let real;
  try {
    real = fs.realpathSync.native(inspected.file);
  } catch (error) {
    errors.push(`${label}: unable to resolve real path: ${error.message}`);
    return null;
  }
  testOnlyReadPhaseHook?.({ ...hookContext, phase: "after-realpath" });
  const completed = inspectSymlinkFree(root, relativePath, errors, label, validationRootStat);
  if (!completed) return null;
  let realStat;
  try {
    realStat = fs.statSync(real, { bigint: true });
  } catch (error) {
    errors.push(`${label}: unable to inspect resolved real path: ${error.message}`);
    return null;
  }
  if (
    !sameIdentityChain(inspected.identities, completed.identities) ||
    !sameNode(inspected.stat, realStat)
  ) {
    errors.push(`${label}: path identity changed while resolving the real path`);
    return null;
  }
  return {
    absolute: inspected.file,
    dev: inspected.stat.dev,
    ino: inspected.stat.ino,
    isDirectory: inspected.stat.isDirectory(),
    isFile: inspected.stat.isFile(),
    identities: completed.identities,
    label,
    real,
    relative: toPosix(inspected.normalized),
    stat: inspected.stat,
  };
}

function validatePolicyWitness(
  root,
  policy,
  errors,
  testOnlyReadPhaseHook,
  validationRootStat,
  { invokeHook = true, phase = "before-policy-use" } = {},
) {
  if (!policy.identities) return true;
  if (invokeHook) {
    testOnlyReadPhaseHook?.({
      file: policy.absolute,
      phase,
      relativePath: policy.relative,
    });
  }
  const current = inspectSymlinkFree(
    root,
    policy.relative,
    errors,
    policy.label,
    validationRootStat,
  );
  if (!current) return false;
  let real;
  let realStat;
  try {
    real = fs.realpathSync.native(current.file);
    realStat = fs.statSync(real, { bigint: true });
  } catch (error) {
    errors.push(`${policy.label}: unable to reseal policy path: ${error.message}`);
    return false;
  }
  const completed = inspectSymlinkFree(
    root,
    policy.relative,
    errors,
    policy.label,
    validationRootStat,
  );
  if (
    !completed ||
    !sameIdentityChain(policy.identities, current.identities) ||
    !sameIdentityChain(policy.identities, completed.identities) ||
    !sameNode(policy.stat, current.stat) ||
    !sameNode(policy.stat, completed.stat) ||
    !sameNode(policy.stat, realStat) ||
    real !== policy.real
  ) {
    errors.push(`${policy.label}: policy path identity changed after capture`);
    return false;
  }
  return true;
}

function sealPolicyWitnesses(
  root,
  policies,
  errors,
  testOnlyReadPhaseHook,
  validationRootStat,
  { invokeHook = true } = {},
) {
  const ordered = [...new Set(policies)].sort((left, right) =>
    compareNames(left.relative, right.relative),
  );
  for (const [passIndex, pass] of [ordered, [...ordered].reverse()].entries()) {
    for (const policy of pass) {
      validatePolicyWitness(root, policy, errors, testOnlyReadPhaseHook, validationRootStat, {
        invokeHook: invokeHook && passIndex === 0,
        phase: "before-policy-final-seal",
      });
    }
  }
}

function collectForbiddenDescendantPolicies(
  root,
  directoryPolicy,
  errors,
  testOnlyReadPhaseHook,
  validationRootStat,
) {
  if (!directoryPolicy?.isDirectory) return [];
  const collected = [];

  function walk(relativeDirectory) {
    const before = inspectSymlinkFree(
      root,
      relativeDirectory,
      errors,
      `${relativeDirectory}: forbidden evidence custody`,
      validationRootStat,
    );
    if (!before?.stat.isDirectory()) return;
    let names;
    try {
      names = fs.readdirSync(before.file).sort(compareNames);
    } catch (error) {
      errors.push(
        `${relativeDirectory}: unable to enumerate forbidden evidence custody: ${error.message}`,
      );
      return;
    }
    for (const name of names) {
      const relative = toPosix(path.join(relativeDirectory, name));
      const child = policyPath(
        root,
        relative,
        errors,
        `${relative}: forbidden evidence custody entry`,
        testOnlyReadPhaseHook,
        validationRootStat,
      );
      if (!child) continue;
      collected.push(child);
      if (child.isDirectory) walk(relative);
    }
    const completed = inspectSymlinkFree(
      root,
      relativeDirectory,
      errors,
      `${relativeDirectory}: forbidden evidence custody`,
      validationRootStat,
    );
    if (!completed) return;
    let completedNames;
    try {
      completedNames = fs.readdirSync(completed.file).sort(compareNames);
    } catch (error) {
      errors.push(
        `${relativeDirectory}: unable to revalidate forbidden evidence custody: ${error.message}`,
      );
      return;
    }
    if (
      !sameIdentityChain(before.identities, completed.identities) ||
      JSON.stringify(names) !== JSON.stringify(completedNames)
    ) {
      errors.push(`${relativeDirectory}: forbidden evidence custody changed during capture`);
    }
  }

  walk(directoryPolicy.relative);
  return collected;
}

function matchesPolicyPath(target, policy) {
  if (target.isFile && policy.isFile && target.dev === policy.dev && target.ino === policy.ino) {
    return true;
  }
  if (policy.isDirectory) {
    return (
      isSameOrInside(target.absolute, policy.absolute) ||
      (policy.real && isSameOrInside(target.real, policy.real))
    );
  }
  return target.absolute === policy.absolute || (policy.real && target.real === policy.real);
}

function exactLexicalPolicy(root, relativePath) {
  const absolute = resolveInside(root, relativePath);
  return absolute
    ? {
        absolute,
        dev: null,
        ino: null,
        isDirectory: false,
        isFile: true,
        real: null,
        relative: toPosix(path.normalize(relativePath)),
      }
    : null;
}

function exactSourcePolicy(root, relativePath, errors, testOnlyReadPhaseHook, validationRootStat) {
  const absolute = resolveInside(root, relativePath);
  if (!absolute) return null;
  try {
    fs.lstatSync(absolute, { bigint: true });
  } catch (error) {
    if (error?.code === "ENOENT") return exactLexicalPolicy(root, relativePath);
    errors.push(`${relativePath}: unable to inspect forbidden legacy source: ${error.message}`);
    return null;
  }
  errors.push(`${relativePath}: staged-deletion source must remain absent`);
  return policyPath(
    root,
    relativePath,
    errors,
    `${relativePath}: forbidden legacy source`,
    testOnlyReadPhaseHook,
    validationRootStat,
  );
}

export function validateLegacyCaseLineage({
  root,
  manifestRelative,
  expectedSourceCommit,
  expectedSources,
  expectedBaselineDirectory,
  runtimeDirectory,
  activeTargetRoots,
  forbiddenEvidenceRoots,
  testOnlyReadPhaseHook = null,
}) {
  const errors = [];
  const directoryWitnesses = [];
  const readWitnesses = new Map();
  let validationRootStat = null;
  try {
    validationRootStat = fs.lstatSync(path.resolve(root), { bigint: true });
    if (validationRootStat.isSymbolicLink() || !validationRootStat.isDirectory()) {
      errors.push("<root>: validation root must be a symlink-free directory");
      validationRootStat = null;
    }
  } catch (error) {
    errors.push(`<root>: unable to capture validation root identity: ${error.message}`);
  }
  if (!Array.isArray(activeTargetRoots) || activeTargetRoots.length === 0) {
    throw new Error("activeTargetRoots must be a non-empty explicit allowlist");
  }
  if (!Array.isArray(forbiddenEvidenceRoots)) {
    throw new Error("forbiddenEvidenceRoots must be an explicit array");
  }
  const expectedSourceMap = new Map(expectedSources.map((entry) => [entry.path, entry.sha256]));
  if (expectedSourceMap.size !== expectedSources.length) {
    throw new Error("expectedSources contains duplicate paths");
  }

  let descriptorsSealed = false;
  try {
    const activePolicies = activeTargetRoots
      .map((entry) =>
        policyPath(
          root,
          entry,
          errors,
          `${entry}: active target root`,
          testOnlyReadPhaseHook,
          validationRootStat,
        ),
      )
      .filter(Boolean);
    for (const policy of activePolicies) {
      if (!policy.isDirectory) {
        errors.push(`${policy.relative}: active target root must be a directory`);
      }
    }
    const exactForbiddenPaths = expectedSources.map((entry) =>
      exactSourcePolicy(root, entry.path, errors, testOnlyReadPhaseHook, validationRootStat),
    );
    const forbiddenPolicies = [
      ...exactForbiddenPaths,
      policyPath(
        root,
        manifestRelative,
        errors,
        `${manifestRelative}: forbidden lineage evidence`,
        testOnlyReadPhaseHook,
        validationRootStat,
      ),
      policyPath(
        root,
        expectedBaselineDirectory,
        errors,
        `${expectedBaselineDirectory}: forbidden lineage baseline root`,
        testOnlyReadPhaseHook,
        validationRootStat,
      ),
      ...forbiddenEvidenceRoots.map((entry) =>
        policyPath(
          root,
          entry,
          errors,
          `${entry}: forbidden lineage evidence root`,
          testOnlyReadPhaseHook,
          validationRootStat,
        ),
      ),
    ].filter(Boolean);
    for (const policy of [...forbiddenPolicies]) {
      forbiddenPolicies.push(
        ...collectForbiddenDescendantPolicies(
          root,
          policy,
          errors,
          testOnlyReadPhaseHook,
          validationRootStat,
        ),
      );
    }

    const runtimePolicy = policyPath(
      root,
      runtimeDirectory,
      errors,
      `${runtimeDirectory}: runtime payload root`,
      testOnlyReadPhaseHook,
      validationRootStat,
    );
    if (runtimePolicy && !runtimePolicy.isDirectory) {
      errors.push(`${runtimeDirectory}: runtimeDirectory must name a directory`);
    }
    testOnlyReadPhaseHook?.({
      file: path.resolve(root),
      phase: "after-policy-capture",
      relativePath: ".",
    });
    const runtimePolicyStable = runtimePolicy
      ? validatePolicyWitness(
          root,
          runtimePolicy,
          errors,
          testOnlyReadPhaseHook,
          validationRootStat,
        )
      : false;
    const stableActivePolicies = activePolicies.filter((policy) =>
      validatePolicyWitness(root, policy, errors, testOnlyReadPhaseHook, validationRootStat),
    );
    if (
      runtimePolicy &&
      runtimePolicyStable &&
      !stableActivePolicies.some(
        (policy) => policy.isDirectory && matchesPolicyPath(runtimePolicy, policy),
      )
    ) {
      errors.push(`${runtimeDirectory}: runtimeDirectory must be inside activeTargetRoots`);
    }

    const manifestBytes = readRegularFile(root, manifestRelative, errors, {
      purpose: "legacy-case lineage manifest",
      readWitnesses,
      testOnlyReadPhaseHook,
      validationRootStat,
    });
    let manifest = null;
    let manifestParsed = false;
    if (manifestBytes) {
      const manifestText = decodeUtf8(
        manifestBytes,
        manifestRelative,
        errors,
        `${manifestRelative}: manifest must be valid UTF-8`,
      );
      if (manifestText !== null) {
        try {
          manifest = JSON.parse(manifestText);
          manifestParsed = true;
        } catch (error) {
          errors.push(`${manifestRelative}: invalid JSON (${error.message})`);
        }
      }
    }
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
      if (manifestParsed) {
        errors.push(`${manifestRelative}: must use the exact legacy-case lineage root schema`);
      }
      closeReadWitnesses(readWitnesses, errors);
      descriptorsSealed = true;
      return {
        errors: finalizeErrors(errors),
        summary: emptyLineageSummary(),
      };
    }

    if (!hasExactKeys(manifest, rootKeys)) {
      errors.push(`${manifestRelative}: must use the exact legacy-case lineage root schema`);
    }
    if (manifest.schema !== 1) errors.push(`${manifestRelative}: schema must be 1`);
    if (manifest.sourceCommit !== expectedSourceCommit) {
      errors.push(
        `${manifestRelative}: sourceCommit must be the reviewed HEAD ${expectedSourceCommit}`,
      );
    }
    if (manifest.baselineDirectory !== expectedBaselineDirectory) {
      errors.push(`${manifestRelative}: baselineDirectory must be ${expectedBaselineDirectory}`);
    }
    if (!Array.isArray(manifest.cases)) {
      errors.push(`${manifestRelative}: cases must be an array`);
      manifest.cases = [];
    }

    const seenSourcePaths = new Map();
    const baselineHashes = new Set();
    const baselineSegments = new Set();
    const materialFingerprints = new Set();
    const targetPolicyCache = new Map();
    const targetIdentityPaths = new Map();
    const validatedRuntimeTargets = [];
    const forbiddenRuntimeBasenames = new Set([path.basename(manifestRelative)]);
    const runtimeRoot = runtimePolicy?.absolute ?? resolveInside(root, runtimeDirectory);
    if (!runtimeRoot) {
      errors.push(`${runtimeDirectory}: runtimeDirectory must be repository-relative`);
    }
    const manifestHash = sha256(manifestBytes);
    let expectationCount = 0;
    let sourceUnitCount = 0;
    const dispositions = Object.fromEntries([...allowedDispositions].map((value) => [value, 0]));

    for (const [caseIndex, entry] of manifest.cases.entries()) {
      const label = `${manifestRelative}: cases[${caseIndex}]`;
      if (!hasExactKeys(entry, caseKeys)) {
        errors.push(`${label}: must use the exact legacy-case lineage case schema`);
        continue;
      }
      const sourcePath = entry.sourcePath;
      if (typeof sourcePath !== "string" || !resolveInside(root, sourcePath)) {
        errors.push(`${label}: sourcePath must be repository-relative`);
        continue;
      }
      seenSourcePaths.set(sourcePath, (seenSourcePaths.get(sourcePath) ?? 0) + 1);
      if (!expectedSourceMap.has(sourcePath)) {
        errors.push(`${sourcePath}: source is outside the exact staged-deletion contract`);
      }

      const expectedBaselinePath = `${expectedBaselineDirectory}/${path.posix.basename(sourcePath)}`;
      forbiddenRuntimeBasenames.add(path.posix.basename(expectedBaselinePath));
      if (entry.baselinePath !== expectedBaselinePath) {
        errors.push(`${sourcePath}: baselinePath must be ${expectedBaselinePath}`);
      }
      const exactBaselinePolicy = policyPath(
        root,
        entry.baselinePath,
        errors,
        `${entry.baselinePath}: forbidden locked baseline file`,
        testOnlyReadPhaseHook,
        validationRootStat,
      );
      if (exactBaselinePolicy) forbiddenPolicies.push(exactBaselinePolicy);
      const baselineBytes = readRegularFile(root, entry.baselinePath, errors, {
        purpose: "locked legacy baseline",
        readWitnesses,
        testOnlyReadPhaseHook,
        validationRootStat,
      });
      const actualSourceHash = baselineBytes ? sha256(baselineBytes) : null;
      const trustedSourceHash = expectedSourceMap.get(sourcePath);
      if (!/^[0-9a-f]{64}$/.test(entry.sourceSha256 ?? "")) {
        errors.push(`${sourcePath}: sourceSha256 must be a lowercase SHA-256`);
      }
      if (trustedSourceHash && entry.sourceSha256 !== trustedSourceHash) {
        errors.push(
          `${sourcePath}: source sha256 does not match the independent HEAD trust anchor`,
        );
      }
      if (actualSourceHash && entry.sourceSha256 !== actualSourceHash) {
        errors.push(`${entry.baselinePath}: baseline bytes do not match sourceSha256`);
      }
      if (actualSourceHash) {
        baselineHashes.add(actualSourceHash);
        for (const segment of leakSegments(baselineBytes)) baselineSegments.add(segment);
      }

      if (!allowedDispositions.has(entry.disposition)) {
        errors.push(
          `${sourcePath}: disposition must be preserved, adapted, or explicitly-rejected`,
        );
      } else {
        dispositions[entry.disposition] += 1;
      }
      if (typeof entry.reason !== "string" || normalize(entry.reason).length < 20) {
        errors.push(`${sourcePath}: reason must be a non-empty reviewed explanation`);
      }
      if (
        entry.disposition === "explicitly-rejected" &&
        !/\breject(?:ed)?\b/i.test(entry.reason ?? "")
      ) {
        errors.push(`${sourcePath}: explicitly-rejected reason must say reject or rejected`);
      }
      if (!Array.isArray(entry.expectations) || entry.expectations.length === 0) {
        errors.push(`${sourcePath}: expectations must map every material legacy unit`);
        continue;
      }

      const baselineText = baselineBytes
        ? (decodeUtf8(baselineBytes, `${entry.baselinePath}: locked legacy baseline`, errors) ?? "")
        : "";
      const units = materialUnits(sourcePath, baselineText, errors);
      sourceUnitCount += units.length;
      const sourceUnitOccurrences = new Map();
      for (const unit of units) {
        const key = sourceUnitKey(unit.heading, unit.marker);
        sourceUnitOccurrences.set(key, (sourceUnitOccurrences.get(key) ?? 0) + 1);
        for (const fingerprint of sourceMaterialFingerprints(unit.marker)) {
          materialFingerprints.add(fingerprint);
        }
      }
      for (const unit of units) {
        const key = sourceUnitKey(unit.heading, unit.marker);
        const count = sourceUnitOccurrences.get(key) ?? 0;
        if (count > 1) {
          errors.push(
            `${sourcePath}: duplicate material source unit ${JSON.stringify(unit.marker)} under ${JSON.stringify(unit.heading)}; found ${count} occurrences`,
          );
        }
      }
      const mappedSourceCounts = new Map();
      const expectationOutcomes = [];
      const allowedSourceUnits = new Set(
        units.map((unit) => sourceUnitKey(unit.heading, unit.marker)),
      );

      for (const [expectationIndex, expectation] of entry.expectations.entries()) {
        expectationCount += 1;
        const expectationLabel = `${sourcePath}: expectations[${expectationIndex}]`;
        if (!hasExactKeys(expectation, expectationKeys)) {
          errors.push(`${expectationLabel}: must use the exact expectation schema`);
          continue;
        }
        if (typeof expectation.summary !== "string" || normalize(expectation.summary).length < 10) {
          errors.push(`${expectationLabel}: summary must be a non-empty semantic description`);
        }
        if (!hasExactKeys(expectation.source, sourceKeys)) {
          errors.push(`${expectationLabel}: source must use the exact source-marker schema`);
        } else {
          const headingValid =
            typeof expectation.source.heading === "string" &&
            normalize(expectation.source.heading).length > 0;
          const markerValid =
            typeof expectation.source.marker === "string" &&
            normalize(expectation.source.marker).length > 0;
          if (!headingValid) {
            errors.push(`${expectationLabel}: source heading must be a non-empty string`);
          }
          if (!markerValid) {
            errors.push(`${expectationLabel}: source marker must be a non-empty string`);
          }
          if (headingValid && markerValid) {
            const key = sourceUnitKey(expectation.source.heading, expectation.source.marker);
            mappedSourceCounts.set(key, (mappedSourceCounts.get(key) ?? 0) + 1);
            if (!allowedSourceUnits.has(key)) {
              errors.push(
                `${expectationLabel}: source marker is not a material unit from the locked source`,
              );
            }
          }
        }
        if (!allowedDispositions.has(expectation.outcome)) {
          errors.push(
            `${expectationLabel}: outcome must be preserved, adapted, or explicitly-rejected`,
          );
        } else {
          expectationOutcomes.push(expectation.outcome);
        }
        if (typeof expectation.reason !== "string" || normalize(expectation.reason).length < 20) {
          errors.push(`${expectationLabel}: reason must explain this source-unit disposition`);
        }
        if (
          expectation.outcome === "explicitly-rejected" &&
          !/\breject(?:ed)?\b/i.test(expectation.reason ?? "")
        ) {
          errors.push(
            `${expectationLabel}: explicitly-rejected reason must say reject or rejected`,
          );
        }
        if (entry.disposition === "preserved" && expectation.outcome !== "preserved") {
          errors.push(
            `${expectationLabel}: preserved case disposition requires preserved outcomes`,
          );
        }
        if (
          entry.disposition === "explicitly-rejected" &&
          expectation.outcome !== "explicitly-rejected"
        ) {
          errors.push(
            `${expectationLabel}: explicitly-rejected case disposition requires rejected outcomes`,
          );
        }

        if (!Array.isArray(expectation.targets)) {
          errors.push(`${expectationLabel}: targets must be an array`);
          continue;
        }
        if (allowedDispositions.has(expectation.outcome) && expectation.targets.length === 0) {
          errors.push(
            `${expectationLabel}: every legacy expectation requires visible active target evidence`,
          );
        }

        const seenTargetRecords = new Set();
        for (const [targetIndex, target] of expectation.targets.entries()) {
          const targetLabel = `${expectationLabel}: targets[${targetIndex}]`;
          if (!hasExactKeys(target, targetKeys)) {
            errors.push(`${targetLabel}: must use the exact target schema`);
            continue;
          }
          if (
            typeof target.path === "string" &&
            typeof target.heading === "string" &&
            Array.isArray(target.markers) &&
            target.markers.every((marker) => typeof marker === "string")
          ) {
            const targetRecord = JSON.stringify([
              target.path,
              normalize(target.heading),
              [
                ...new Set(
                  target.markers.map((marker) => canonicalEvidenceText(marker, { semantic: true })),
                ),
              ].sort(),
            ]);
            if (seenTargetRecords.has(targetRecord)) {
              errors.push(`${targetLabel}: duplicate target object is not allowed`);
              continue;
            }
            seenTargetRecords.add(targetRecord);
          }
          if (!canonicalNormalizedRelativePath(target.path) || !resolveInside(root, target.path)) {
            errors.push(`${targetLabel}: path must be a canonical repository-relative POSIX path`);
            continue;
          }
          let targetPolicy = targetPolicyCache.get(target.path);
          if (!targetPolicy) {
            targetPolicy = policyPath(
              root,
              target.path,
              errors,
              target.path,
              testOnlyReadPhaseHook,
              validationRootStat,
            );
            if (targetPolicy) targetPolicyCache.set(target.path, targetPolicy);
          }
          if (!targetPolicy) continue;
          const targetPolicyStable = validatePolicyWitness(
            root,
            targetPolicy,
            errors,
            testOnlyReadPhaseHook,
            validationRootStat,
          );
          let duplicateTargetIdentity = false;
          if (targetPolicyStable && targetPolicy.isFile) {
            const identityKey = `${targetPolicy.dev}:${targetPolicy.ino}`;
            const priorPath = targetIdentityPaths.get(identityKey);
            if (priorPath && priorPath !== target.path) {
              duplicateTargetIdentity = true;
              errors.push(
                `${target.path}: distinct target paths must not share the same file identity as ${priorPath}`,
              );
            } else if (!priorPath) {
              targetIdentityPaths.set(identityKey, target.path);
            }
          }
          const activePoliciesAtUse = activePolicies.filter((policy) =>
            validatePolicyWitness(root, policy, errors, testOnlyReadPhaseHook, validationRootStat),
          );
          const forbiddenPoliciesAtUse = forbiddenPolicies
            .filter((policy) => matchesPolicyPath(targetPolicy, policy))
            .filter((policy) =>
              validatePolicyWitness(
                root,
                policy,
                errors,
                testOnlyReadPhaseHook,
                validationRootStat,
              ),
            );
          const runtimePolicyAtUse =
            runtimePolicy &&
            validatePolicyWitness(
              root,
              runtimePolicy,
              errors,
              testOnlyReadPhaseHook,
              validationRootStat,
            );
          const allowedTarget =
            targetPolicyStable &&
            activePoliciesAtUse.some(
              (policy) => policy.isDirectory && matchesPolicyPath(targetPolicy, policy),
            );
          if (!allowedTarget) {
            errors.push(
              `${target.path}: target real path is outside the explicit activeTargetRoots allowlist`,
            );
          }
          const forbiddenTarget = forbiddenPoliciesAtUse.length > 0;
          if (forbiddenTarget) {
            errors.push(
              `${target.path}: lineage targets must not point to source, baseline, manifest, or evidence custody`,
            );
          }
          const targetBytes = readRegularFile(root, target.path, errors, {
            purpose: "active lineage target",
            readWitnesses,
            testOnlyReadPhaseHook,
            validationRootStat,
          });
          if (!targetBytes) continue;
          const targetText = decodeUtf8(
            targetBytes,
            `${target.path}: active lineage target`,
            errors,
          );
          if (targetText === null) continue;
          if (typeof target.heading !== "string" || !normalize(target.heading)) {
            errors.push(`${targetLabel}: heading must be non-empty`);
            continue;
          }
          const sections = headingSectionRecords(targetText, target.heading);
          if (sections.length !== 1) {
            errors.push(
              `${target.path}: target heading ${JSON.stringify(target.heading)} must exist exactly once`,
            );
            continue;
          }
          if (!Array.isArray(target.markers) || target.markers.length === 0) {
            errors.push(`${targetLabel}: markers must be non-empty`);
            continue;
          }
          const sectionForms = targetMarkerForms(
            Buffer.from(sections[0].content, "utf8"),
            target.markers,
          );
          const seenMarkers = new Set();
          const authorizedMarkers = new Set();
          let markersValid = true;
          for (const marker of target.markers) {
            if (typeof marker !== "string") {
              markersValid = false;
              errors.push(`${targetLabel}: target marker must be a string`);
              continue;
            }
            const normalizedMarker = canonicalEvidenceText(marker, { semantic: true });
            if (!normalizedMarker) {
              markersValid = false;
              errors.push(`${targetLabel}: target marker must be non-empty`);
            } else if (seenMarkers.has(normalizedMarker)) {
              markersValid = false;
              errors.push(`${targetLabel}: duplicate target marker ${JSON.stringify(marker)}`);
            } else {
              const markerCount = fingerprintOccurrenceCountInForms(sectionForms, normalizedMarker);
              if (markerCount === 0) {
                markersValid = false;
                errors.push(
                  `${target.path}: target section ${JSON.stringify(target.heading)} is missing marker ${JSON.stringify(marker)}`,
                );
              } else if (markerCount !== 1) {
                markersValid = false;
                errors.push(
                  `${target.path}: target marker ${JSON.stringify(marker)} must appear exactly once in the visible target section; found ${markerCount}`,
                );
              }
            }
            const legacyFingerprints = [...materialFingerprintVariants(marker)].filter(
              (fingerprint) => materialFingerprints.has(fingerprint),
            );
            if (legacyFingerprints.length > 0) {
              const renderedFingerprint = canonicalMaterialFingerprint(marker);
              const count = fingerprintOccurrenceCountInForms(sectionForms, renderedFingerprint);
              if (count !== 1) {
                markersValid = false;
                errors.push(
                  `${target.path}: explicitly authorized legacy material marker ${JSON.stringify(marker)} must appear exactly once in the visible target section; found ${count}`,
                );
              } else {
                for (const fingerprint of legacyFingerprints) {
                  authorizedMarkers.add(fingerprint);
                }
              }
            }
            seenMarkers.add(normalizedMarker);
          }
          if (
            markersValid &&
            allowedTarget &&
            !forbiddenTarget &&
            !duplicateTargetIdentity &&
            runtimePolicyAtUse &&
            matchesPolicyPath(targetPolicy, runtimePolicy)
          ) {
            validatedRuntimeTargets.push({
              path: target.path,
              heading: target.heading,
              authorizedMarkers,
              sectionEnd: sections[0].end,
              sectionStart: sections[0].start,
            });
          }
        }
      }

      if (expectationOutcomes.length === entry.expectations.length) {
        const derivedDisposition = expectationOutcomes.every((outcome) => outcome === "preserved")
          ? "preserved"
          : expectationOutcomes.every((outcome) => outcome === "explicitly-rejected")
            ? "explicitly-rejected"
            : "adapted";
        if (entry.disposition !== derivedDisposition) {
          errors.push(
            `${sourcePath}: case disposition must match aggregate expectation outcomes (${derivedDisposition})`,
          );
        }
      }

      for (const unit of units) {
        const key = sourceUnitKey(unit.heading, unit.marker);
        const count = mappedSourceCounts.get(key) ?? 0;
        if (count !== 1) {
          errors.push(
            `${sourcePath}: material source unit ${JSON.stringify(unit.marker)} under ${JSON.stringify(unit.heading)} is not mapped exactly once; found ${count}`,
          );
        }
      }
    }

    for (const sourcePath of expectedSourceMap.keys()) {
      const count = seenSourcePaths.get(sourcePath) ?? 0;
      if (count === 0) {
        errors.push(`${sourcePath}: uncovered staged-deletion contract`);
      } else if (count > 1) {
        errors.push(`${sourcePath}: duplicate legacy source path; found ${count} dispositions`);
      }
    }

    const authorizedFingerprintCounts = new Map();
    const authorizedScopes = new Set();
    const authorizedIntervals = new Map();
    for (const target of validatedRuntimeTargets) {
      for (const fingerprint of target.authorizedMarkers) {
        const scope = `${target.path}\u0000${normalize(target.heading)}\u0000${fingerprint}`;
        if (authorizedScopes.has(scope)) continue;
        authorizedScopes.add(scope);
        const intervalKey = `${target.path}\u0000${fingerprint}`;
        const intervals = authorizedIntervals.get(intervalKey) ?? [];
        if (
          intervals.some(
            (interval) => target.sectionStart < interval.end && interval.start < target.sectionEnd,
          )
        ) {
          errors.push(
            `${target.path}: overlapping target heading scopes must not authorize the same legacy material marker`,
          );
          continue;
        }
        intervals.push({ end: target.sectionEnd, start: target.sectionStart });
        authorizedIntervals.set(intervalKey, intervals);
        if (!authorizedFingerprintCounts.has(target.path)) {
          authorizedFingerprintCounts.set(target.path, new Map());
        }
        const counts = authorizedFingerprintCounts.get(target.path);
        counts.set(fingerprint, (counts.get(fingerprint) ?? 0) + 1);
      }
    }

    const forbiddenFileIdentityKeys = new Set(
      forbiddenPolicies
        .filter((policy) => policy.isFile && policy.dev !== null && policy.ino !== null)
        .map((policy) => `${policy.dev}:${policy.ino}`),
    );

    const runtimeLeafPolicies = [];
    if (runtimeRoot) {
      const runtimeFiles = walkRuntimeFiles(
        root,
        runtimeDirectory,
        errors,
        directoryWitnesses,
        readWitnesses,
        testOnlyReadPhaseHook,
        validationRootStat,
      );
      for (const { buffer: runtimeBytes, relative: runtimeRelative } of runtimeFiles) {
        const runtimeLeafPolicy = policyPath(
          root,
          runtimeRelative,
          errors,
          `${runtimeRelative}: runtime payload entry`,
          testOnlyReadPhaseHook,
          validationRootStat,
        );
        if (runtimeLeafPolicy) runtimeLeafPolicies.push(runtimeLeafPolicy);
        const runtimeWitness = readWitnesses.get(runtimeRelative);
        if (!runtimeWitness) {
          errors.push(`${runtimeRelative}: runtime payload read witness is missing`);
        } else if (
          forbiddenFileIdentityKeys.has(`${runtimeWitness.stat.dev}:${runtimeWitness.stat.ino}`)
        ) {
          errors.push(
            `${runtimeRelative}: runtime payload entry must not share an inode with forbidden evidence custody`,
          );
        }
        const runtimeHash = sha256(runtimeBytes);
        if (forbiddenRuntimeBasenames.has(path.basename(runtimeRelative))) {
          errors.push(
            `${runtimeRelative}: legacy-case evidence filename must not leak into the installed runtime payload`,
          );
        }
        if (runtimeHash === manifestHash) {
          errors.push(
            `${runtimeRelative}: legacy-case lineage manifest content must not leak into the installed runtime payload`,
          );
        }
        if (baselineHashes.has(runtimeHash)) {
          errors.push(
            `${runtimeRelative}: legacy case source bytes must not leak into the installed runtime payload`,
          );
        }
        if (containsLeakSegment(runtimeBytes, baselineSegments)) {
          errors.push(
            `${runtimeRelative}: legacy-case source segment must not leak into the installed runtime payload`,
          );
        }
        const authorized = authorizedFingerprintCounts.get(runtimeRelative) ?? new Map();
        const runtimeEvidence = analyzeEvidence(runtimeBytes);
        if (runtimeEvidence.unrecognizedNamedReferences.length > 0) {
          errors.push(
            `${runtimeRelative}: unrecognized CommonMark named character reference prevents complete legacy leak validation`,
          );
        }
        const visibleRuntimeForms = visibleMarkerForms(runtimeBytes);
        for (const fingerprint of materialFingerprints) {
          const observed =
            fingerprintOccurrenceCountInForms(visibleRuntimeForms, fingerprint) +
            decodedStructuredExtraCount(runtimeEvidence.stringTokens, fingerprint) +
            structuredBoundaryOccurrenceCount(runtimeEvidence.streams, fingerprint);
          const allowed = authorized.get(fingerprint) ?? 0;
          if (observed > allowed) {
            errors.push(
              `${runtimeRelative}: legacy-case material-unit fingerprint must not leak into the installed runtime payload`,
            );
          }
        }
      }
    }

    const allPolicyWitnesses = [
      ...activePolicies,
      ...forbiddenPolicies,
      ...(runtimePolicy ? [runtimePolicy] : []),
      ...targetPolicyCache.values(),
      ...runtimeLeafPolicies,
    ];
    sealPolicyWitnesses(
      root,
      allPolicyWitnesses,
      errors,
      testOnlyReadPhaseHook,
      validationRootStat,
    );
    sealDirectoryWitnesses(
      root,
      directoryWitnesses,
      errors,
      testOnlyReadPhaseHook,
      validationRootStat,
    );
    sealReadWitnesses(root, readWitnesses, errors, testOnlyReadPhaseHook, validationRootStat);
    descriptorsSealed = true;
    sealDirectoryWitnesses(
      root,
      directoryWitnesses,
      errors,
      testOnlyReadPhaseHook,
      validationRootStat,
      { invokeHook: false },
    );
    sealPolicyWitnesses(
      root,
      allPolicyWitnesses,
      errors,
      testOnlyReadPhaseHook,
      validationRootStat,
      { invokeHook: false },
    );

    return {
      errors: finalizeErrors(errors),
      summary: {
        cases: manifest.cases.length,
        expectations: expectationCount,
        sourceUnits: sourceUnitCount,
        dispositions,
      },
    };
  } finally {
    if (!descriptorsSealed) closeReadWitnesses(readWitnesses, errors);
  }
}
