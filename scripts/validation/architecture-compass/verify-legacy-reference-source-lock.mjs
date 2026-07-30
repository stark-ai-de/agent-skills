import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TextDecoder } from "node:util";

import { inspectVisibleMarkdownTarget } from "../lib/legacy-case-lineage.mjs";

const expectedCommit = "05b11f31ee22e4ed2e68c8d89d8a415affc48fe3";
const expectedSourceDirectory = "skills/engineering-workflows/architecture-compass/references";
const expectedFiles = [
  "adoption-workflows.md",
  "backend-runtime-patterns.md",
  "checklists.md",
  "host-collaboration-modes.md",
  "nextjs-request-patterns.md",
  "preferred-stack-profile.md",
  "repository-source-structure.md",
  "rule-extraction-and-conflict-resolution.md",
];
const expectedSourceHashes = new Map([
  [
    "adoption-workflows.md",
    {
      blob: "44892a567aec9fb78572e6703e805df9b15dbe8a",
      sha256: "6c27d50c33103165b7aeb9cf61f3f0c5291cc7c11029985cf703fe22610b115d",
    },
  ],
  [
    "backend-runtime-patterns.md",
    {
      blob: "6dfb5db0ac095f8552353264ead6ab7e50f03320",
      sha256: "19c898d50a2c5e19bf8f0418167906e4b5aa5e518de845717765f2a4b2d7e174",
    },
  ],
  [
    "checklists.md",
    {
      blob: "57abc9025cc35490f1d74081f2076184ecaf57ef",
      sha256: "bb5ee887f77218addbc10f175207975fc0fb114ee83783ad228556d318496734",
    },
  ],
  [
    "host-collaboration-modes.md",
    {
      blob: "3789f26e559f76c29f745121687fa766e1ad1a1d",
      sha256: "96c45a86d9766cc35b6322e556ccfd16709dbd6f29e2f10d663c1cba9fb0b38f",
    },
  ],
  [
    "nextjs-request-patterns.md",
    {
      blob: "6c43f49e31f6fc1fd7e9af5485a1f88abb038c5a",
      sha256: "fba2a3b2bf828826708036b7c43afabda90b502dfc80a7ab661d542aa126d589",
    },
  ],
  [
    "preferred-stack-profile.md",
    {
      blob: "0c8c8f7bb8230307779eb93a7faf8ea89f2135b8",
      sha256: "83728b6cdaa11b58124a196647f9595e5d3943c8edf5f8fd019a567ada8b022a",
    },
  ],
  [
    "repository-source-structure.md",
    {
      blob: "2e77a9f7f349c7bd8a6f9c10255c56f9d8a48fd1",
      sha256: "3a07e1e6e11bf0e690c68a2fcefaa29fa6b622d6bb9c1cf9198b4174f501b9a6",
    },
  ],
  [
    "rule-extraction-and-conflict-resolution.md",
    {
      blob: "0f21741dcc53a06dfe7031529d74209e655ef27f",
      sha256: "f95b632d05ffd1e67de81e9359b73d1a8336f1ce6f2cfb0e86660956a67aa781",
    },
  ],
]);
const allowedDispositions = new Set(["preserved", "adapted", "explicitly-rejected"]);
const forbiddenEvidenceNames = new Set([
  "legacy-reference-source-lock.json",
  "legacy-reference-coverage.json",
]);
const sourceLockRelative = path.join(
  "scripts",
  "validation",
  "architecture-compass",
  "legacy-reference-source-lock.json",
);
const coverageRelative = path.join(
  "scripts",
  "validation",
  "architecture-compass",
  "legacy-reference-coverage.json",
);
const skillRelative = path.join("skills", "engineering-workflows", "architecture-compass");
const strictUtf8Decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

function hasExactKeys(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    sortedExpected.every((key, index) => key === actual[index])
  );
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function decodeUtf8(value, label, errors) {
  try {
    return strictUtf8Decoder.decode(value);
  } catch {
    errors.push(`${label}: must be valid UTF-8`);
    return null;
  }
}

function normalizeMarker(value) {
  return value.replace(/\s+/g, " ").trim();
}

function gitBlobId(value) {
  return crypto.createHash("sha1").update(`blob ${value.length}\0`).update(value).digest("hex");
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function relative(root, value) {
  return toPosix(path.relative(root, value));
}

function resolveInside(root, repoRelative) {
  if (
    typeof repoRelative !== "string" ||
    repoRelative.length === 0 ||
    path.isAbsolute(repoRelative)
  ) {
    return null;
  }
  const resolved = path.resolve(root, repoRelative);
  return resolved.startsWith(`${path.resolve(root)}${path.sep}`) ? resolved : null;
}

function componentIdentity(display, stat) {
  return {
    display,
    dev: stat.dev,
    ino: stat.ino,
    mode: stat.mode,
  };
}

function sameComponentIdentity(left, right) {
  return left.display === right.display && sameNodeIdentity(left, right);
}

function sameNodeIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.mode === right.mode;
}

function sameFileObservation(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

function lstatSymlinkFreePath(root, file, errors, { symlinkError = null } = {}) {
  const resolvedRoot = path.resolve(root);
  const resolvedFile = path.resolve(file);
  const rel = relative(resolvedRoot, resolvedFile);
  if (resolvedFile === resolvedRoot || !resolvedFile.startsWith(`${resolvedRoot}${path.sep}`)) {
    errors.push(`${rel || "."}: required path must stay inside the repository`);
    return null;
  }

  const components = path.relative(resolvedRoot, resolvedFile).split(path.sep);
  const identities = [];
  let current = resolvedRoot;
  let stat;
  for (const [index, component] of ["", ...components].entries()) {
    if (component) current = path.join(current, component);
    const display = component ? relative(resolvedRoot, current) : ".";
    try {
      stat = fs.lstatSync(current, { bigint: true });
    } catch (error) {
      if (error?.code === "ENOENT") {
        errors.push(`${rel}: missing required file`);
      } else {
        errors.push(`${rel}: unable to inspect path component ${display}: ${error.message}`);
      }
      return null;
    }
    if (stat.isSymbolicLink()) {
      errors.push(
        symlinkError ?? `${rel}: every path component must be symlink-free; found ${display}`,
      );
      return null;
    }
    if (index < components.length && !stat.isDirectory()) {
      errors.push(`${rel}: expected path component ${display} to be a directory`);
      return null;
    }
    identities.push(componentIdentity(display, stat));
  }
  return { identities, stat };
}

function readRegularFile(
  root,
  file,
  errors,
  {
    anchoredLeafName = null,
    anchoredParent = null,
    readPhaseHook = null,
    retainedRecords = null,
    symlinkError = null,
  } = {},
) {
  const resolvedRoot = path.resolve(root);
  const resolvedFile = path.resolve(file);
  const rel = relative(resolvedRoot, resolvedFile);
  let initial;
  let openPath = resolvedFile;
  if (anchoredParent) {
    if (
      typeof anchoredLeafName !== "string" ||
      anchoredLeafName.length === 0 ||
      path.basename(anchoredLeafName) !== anchoredLeafName
    ) {
      errors.push(`${rel}: anchored payload leaf must be one path component`);
      return null;
    }
    let parentStat;
    let leafStat;
    try {
      parentStat = fs.statSync(".", { bigint: true });
      leafStat = fs.lstatSync(anchoredLeafName, { bigint: true });
    } catch (error) {
      errors.push(`${rel}: unable to inspect cwd-anchored payload leaf: ${error.message}`);
      return null;
    }
    if (!sameNodeIdentity(anchoredParent.stat, parentStat)) {
      errors.push(`${rel}: anchored payload parent changed before file inspection`);
      return null;
    }
    if (leafStat.isSymbolicLink()) {
      errors.push(
        symlinkError ?? `${rel}: every path component must be symlink-free; found ${rel}`,
      );
      return null;
    }
    initial = {
      identities: [...anchoredParent.identities, componentIdentity(rel, leafStat)],
      stat: leafStat,
    };
    openPath = anchoredLeafName;
  } else {
    initial = lstatSymlinkFreePath(resolvedRoot, resolvedFile, errors, { symlinkError });
  }
  if (!initial) return null;
  if (!initial.stat.isFile()) {
    errors.push(`${rel}: expected a regular, non-symlink file`);
    return null;
  }

  if (typeof fs.constants.O_NOFOLLOW !== "number" || typeof fs.constants.O_NONBLOCK !== "number") {
    errors.push(
      `${rel}: unable to open required file because O_NOFOLLOW or O_NONBLOCK is unavailable`,
    );
    return null;
  }
  const openFlags = fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK;
  const readHookContext = { file: resolvedFile, openFlags, relativePath: rel };

  readPhaseHook?.({ ...readHookContext, phase: "before-open" });

  let descriptor;
  let retainDescriptor = false;
  try {
    descriptor = fs.openSync(openPath, openFlags);
  } catch (error) {
    if (error?.code === "ELOOP" && symlinkError) {
      errors.push(symlinkError);
    } else {
      errors.push(
        `${rel}: unable to open required file without following symlinks: ${error.message}`,
      );
    }
    return null;
  }

  try {
    let openedStat;
    try {
      openedStat = fs.fstatSync(descriptor, { bigint: true });
    } catch (error) {
      errors.push(`${rel}: unable to inspect the opened descriptor: ${error.message}`);
      return null;
    }
    if (!openedStat.isFile()) {
      errors.push(`${rel}: opened descriptor is not a regular file`);
      return null;
    }
    if (!sameFileObservation(initial.stat, openedStat)) {
      errors.push(`${rel}: file identity changed while opening the descriptor`);
      return null;
    }

    readPhaseHook?.({ ...readHookContext, phase: "after-open" });

    let buffer;
    try {
      buffer = fs.readFileSync(descriptor);
    } catch (error) {
      errors.push(`${rel}: unable to read the opened descriptor: ${error.message}`);
      return null;
    }

    readPhaseHook?.({ ...readHookContext, phase: "after-read" });

    let completedStat;
    try {
      completedStat = fs.fstatSync(descriptor, { bigint: true });
    } catch (error) {
      errors.push(`${rel}: unable to re-inspect the opened descriptor: ${error.message}`);
      return null;
    }

    let stable = true;
    if (
      !sameFileObservation(openedStat, completedStat) ||
      BigInt(buffer.byteLength) !== completedStat.size
    ) {
      errors.push(`${rel}: file identity changed while reading the opened descriptor`);
      stable = false;
    }

    let completed;
    if (anchoredParent) {
      try {
        const parentStat = fs.statSync(".", { bigint: true });
        const leafStat = fs.lstatSync(anchoredLeafName, { bigint: true });
        if (!sameNodeIdentity(anchoredParent.stat, parentStat)) {
          errors.push(
            `${rel}: anchored payload parent changed while reading the opened descriptor`,
          );
          stable = false;
        }
        if (leafStat.isSymbolicLink()) {
          errors.push(
            symlinkError ?? `${rel}: every path component must be symlink-free; found ${rel}`,
          );
          return null;
        }
        completed = {
          identities: [...anchoredParent.identities, componentIdentity(rel, leafStat)],
          stat: leafStat,
        };
      } catch (error) {
        errors.push(`${rel}: unable to re-inspect cwd-anchored payload leaf: ${error.message}`);
        return null;
      }
    } else {
      completed = lstatSymlinkFreePath(resolvedRoot, resolvedFile, errors, { symlinkError });
    }
    if (!completed) return null;
    const initialParents = initial.identities.slice(0, -1);
    const completedParents = completed.identities.slice(0, -1);
    if (
      initialParents.length !== completedParents.length ||
      initialParents.some(
        (identity, index) => !sameComponentIdentity(identity, completedParents[index]),
      )
    ) {
      errors.push(`${rel}: parent path components changed while reading the opened descriptor`);
      stable = false;
    }
    if (
      !sameComponentIdentity(initial.identities.at(-1), completed.identities.at(-1)) ||
      !sameFileObservation(completedStat, completed.stat)
    ) {
      errors.push(`${rel}: file path identity changed after reading the opened descriptor`);
      stable = false;
    }

    if (anchoredParent) {
      const lexical = lstatSymlinkFreePath(resolvedRoot, resolvedFile, errors, { symlinkError });
      if (!lexical) return null;
      const lexicalParents = lexical.identities.slice(0, -1);
      if (
        anchoredParent.identities.length !== lexicalParents.length ||
        anchoredParent.identities.some(
          (identity, index) => !sameComponentIdentity(identity, lexicalParents[index]),
        )
      ) {
        errors.push(`${rel}: parent path components changed while reading the opened descriptor`);
        stable = false;
      }
      if (!sameFileObservation(completedStat, lexical.stat)) {
        errors.push(`${rel}: file path identity changed after reading the opened descriptor`);
        stable = false;
      }
    }

    if (!stable) return null;
    if (anchoredParent) {
      retainDescriptor = true;
      return {
        buffer,
        descriptor,
        identities: completed.identities,
        stat: completedStat,
      };
    }
    if (Array.isArray(retainedRecords)) {
      retainDescriptor = true;
      retainedRecords.push({
        buffer,
        descriptor,
        file: resolvedFile,
        identities: completed.identities,
        stat: completedStat,
      });
    }
    return buffer;
  } finally {
    if (!retainDescriptor) {
      try {
        fs.closeSync(descriptor);
      } catch (error) {
        errors.push(`${rel}: unable to close the opened descriptor: ${error.message}`);
      }
    }
  }
}

function readJson(root, relativePath, errors, readOptions) {
  const file = path.join(root, relativePath);
  const value = readRegularFile(root, file, errors, readOptions);
  if (!value) return null;
  const label = toPosix(relativePath);
  const text = decodeUtf8(value, label, errors);
  if (text === null) return null;
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      errors.push(`${label}: top level must be a JSON object`);
      return null;
    }
    return parsed;
  } catch (error) {
    errors.push(`${label}: invalid JSON: ${error.message}`);
    return null;
  }
}

function markdownFacts(buffer, label, errors) {
  const text = decodeUtf8(buffer, label, errors);
  if (text === null) return null;
  const rawLines = text.split("\n");
  const endsWithNewline = rawLines.at(-1) === "";
  const lines = endsWithNewline ? rawLines.slice(0, -1) : rawLines;
  const headings = [];
  const boundaryInFence = [false];
  let fence = null;
  let codeBlocks = 0;

  for (const [index, line] of lines.entries()) {
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!fence) {
        fence = { character: marker[0], length: marker.length };
        codeBlocks += 1;
      } else if (marker[0] === fence.character && marker.length >= fence.length) {
        fence = null;
      }
      boundaryInFence.push(Boolean(fence));
      continue;
    }
    if (!fence) {
      const heading = /^(#{1,6})[ \t]+(.+?)[ \t]*$/.exec(line);
      if (heading) {
        headings.push({
          line: index + 1,
          level: heading[1].length,
          text: heading[2].replace(/[ \t]+#+[ \t]*$/, "").trim(),
        });
      }
    }
    boundaryInFence.push(Boolean(fence));
  }

  return {
    text,
    rawLines,
    lines,
    lineCount: lines.length,
    h2Headings: headings.filter(({ level }) => level === 2),
    headings,
    codeBlocks,
    boundaryInFence,
    endsWithNewline,
    slice(startLine, endLine) {
      const body = rawLines.slice(startLine - 1, endLine).join("\n");
      const terminated = endLine < rawLines.length;
      return Buffer.from(`${body}${terminated ? "\n" : ""}`, "utf8");
    },
  };
}

function fencedCodeBlocks(text) {
  const blocks = [];
  let codeLines = [];
  let fence = null;
  for (const line of text.split("\n")) {
    if (!fence) {
      const opener = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
      if (!opener || (opener[1][0] === "`" && opener[2].includes("`"))) continue;
      fence = { character: opener[1][0], length: opener[1].length };
      continue;
    }
    const closingPattern = new RegExp(
      `^ {0,3}${fence.character === "`" ? "`" : "~"}{${fence.length},}[ \\t]*$`,
    );
    if (closingPattern.test(line)) {
      blocks.push(codeLines.join("\n"));
      codeLines = [];
      fence = null;
      continue;
    }
    codeLines.push(line);
  }
  if (fence) blocks.push(codeLines.join("\n"));
  return blocks;
}

function metadataValue(text, field) {
  const matches = text
    .split("\n")
    .filter((line) => line.startsWith(`${field}:`))
    .map((line) => line.slice(field.length + 1).trim());
  return matches.length === 1 ? matches[0] : null;
}

function directoryEntrySignature(entries) {
  return entries.map((entry) => {
    let kind = "special";
    if (entry.isDirectory()) kind = "directory";
    else if (entry.isFile()) kind = "file";
    else if (entry.isSymbolicLink()) kind = "symlink";
    return `${kind}\0${entry.name}`;
  });
}

function revalidateLocalTraversalWitness(witness, errors) {
  let stable = true;
  let currentStat;
  try {
    currentStat = fs.statSync(".", { bigint: true });
    const entries = fs
      .readdirSync(".", { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name, "en"));
    if (
      !sameFileObservation(witness.directoryStat, currentStat) ||
      JSON.stringify(witness.entrySignature) !== JSON.stringify(directoryEntrySignature(entries))
    ) {
      errors.push(
        `${witness.relativePath}: directory changed before payload traversal publication`,
      );
      stable = false;
    }
  } catch (error) {
    errors.push(
      `${witness.relativePath}: unable to revalidate payload traversal witness: ${error.message}`,
    );
    return { stable: false, stat: null };
  }

  for (const record of witness.files) {
    try {
      const stat = fs.lstatSync(record.leafName, { bigint: true });
      if (!stat.isFile() || !sameFileObservation(record.stat, stat)) {
        errors.push(
          `${relative(witness.root, record.file)}: payload leaf changed after descriptor read before traversal publication`,
        );
        stable = false;
      }
    } catch (error) {
      errors.push(
        `${relative(witness.root, record.file)}: unable to revalidate payload leaf before traversal publication: ${error.message}`,
      );
      stable = false;
    }
  }

  return { stable, stat: currentStat };
}

function revalidateTraversalWitness(witness, errors, direction, { invokeHook = true } = {}) {
  const initialLocal = revalidateLocalTraversalWitness(witness, errors);
  let stable = initialLocal.stable;
  const currentStat = initialLocal.stat;
  if (!currentStat) return false;

  const children = direction === "reverse" ? [...witness.children].reverse() : witness.children;
  for (const child of children) {
    let entered = false;
    try {
      const leafStat = fs.lstatSync(child.entryName, { bigint: true });
      if (
        leafStat.isSymbolicLink() ||
        !leafStat.isDirectory() ||
        !sameFileObservation(child.directoryStat, leafStat)
      ) {
        errors.push(
          `${child.relativePath}: child directory changed before payload traversal publication`,
        );
        stable = false;
        continue;
      }
      if (invokeHook) {
        witness.readPhaseHook?.({
          direction,
          file: path.join(witness.root, child.relativePath),
          phase: "before-witness-child-revalidation",
          relativePath: child.relativePath,
        });
      }
      process.chdir(child.entryName);
      entered = true;
      const anchoredStat = fs.statSync(".", { bigint: true });
      if (!sameFileObservation(child.directoryStat, anchoredStat)) {
        errors.push(
          `${child.relativePath}: child directory anchor changed before payload traversal publication`,
        );
        stable = false;
      } else if (!revalidateTraversalWitness(child, errors, direction, { invokeHook })) {
        stable = false;
      }
    } catch (error) {
      errors.push(
        `${child.relativePath}: unable to enter child for payload witness revalidation: ${error.message}`,
      );
      stable = false;
    } finally {
      if (entered) {
        try {
          process.chdir("..");
          const returnedStat = fs.statSync(".", { bigint: true });
          if (!sameNodeIdentity(currentStat, returnedStat)) {
            errors.push(
              `${child.relativePath}: witness revalidation returned through a different parent`,
            );
            stable = false;
          }
        } catch (error) {
          errors.push(
            `${child.relativePath}: unable to restore parent after witness revalidation: ${error.message}`,
          );
          stable = false;
        }
      }
    }
  }

  if (!revalidateLocalTraversalWitness(witness, errors).stable) stable = false;
  return stable;
}

function walkFiles(
  root,
  directory,
  errors,
  readOptions,
  { anchoredEntryName = null, anchoredParent = null } = {},
) {
  const resolvedRoot = path.resolve(root);
  const resolvedDirectory = path.resolve(directory);
  const rel = relative(resolvedRoot, resolvedDirectory);
  let initial;
  if (anchoredParent) {
    let parentStat;
    let leafStat;
    try {
      parentStat = fs.statSync(".", { bigint: true });
      leafStat = fs.lstatSync(anchoredEntryName, { bigint: true });
    } catch (error) {
      errors.push(`${rel}: unable to inspect cwd-anchored payload directory: ${error.message}`);
      return { records: [], stable: false };
    }
    if (!sameNodeIdentity(anchoredParent.stat, parentStat)) {
      errors.push(`${rel}: payload parent changed before child traversal`);
      return { records: [], stable: false };
    }
    if (leafStat.isSymbolicLink()) {
      errors.push(`${rel}: every path component must be symlink-free; found ${rel}`);
      return { records: [], stable: false };
    }
    initial = {
      identities: [...anchoredParent.identities, componentIdentity(rel, leafStat)],
      stat: leafStat,
    };
  } else {
    initial = lstatSymlinkFreePath(resolvedRoot, resolvedDirectory, errors);
  }
  if (!initial) return { records: [], stable: false };
  if (!initial.stat.isDirectory()) {
    errors.push(`${rel}: expected a regular, non-symlink directory`);
    return { records: [], stable: false };
  }

  readOptions.readPhaseHook?.({
    file: resolvedDirectory,
    phase: "before-directory-open",
    relativePath: rel,
  });

  const previousDirectory = process.cwd();
  let previousDirectoryStat;
  try {
    previousDirectoryStat = fs.statSync(".", { bigint: true });
  } catch (error) {
    errors.push(`${rel}: unable to inspect traversal return directory: ${error.message}`);
    return { records: [], stable: false };
  }

  let anchoredStat;
  let completedStat;
  let entries;
  let stable = true;
  const records = [];
  const childWitnesses = [];
  const directRecords = [];
  let traversalWitness = null;
  let entered = false;
  try {
    try {
      process.chdir(anchoredEntryName ?? resolvedDirectory);
      entered = true;
      anchoredStat = fs.statSync(".", { bigint: true });
    } catch (error) {
      errors.push(`${rel}: unable to establish cwd-anchored directory traversal: ${error.message}`);
      stable = false;
    }
    if (entered && !anchoredStat.isDirectory()) {
      errors.push(`${rel}: cwd traversal anchor is not a directory`);
      stable = false;
    }
    if (entered && !sameFileObservation(initial.stat, anchoredStat)) {
      errors.push(`${rel}: directory identity changed while establishing the cwd anchor`);
      stable = false;
    }

    if (stable) {
      const witness = { identities: initial.identities, stat: anchoredStat };
      readOptions.readPhaseHook?.({
        file: resolvedDirectory,
        phase: "after-directory-open",
        relativePath: rel,
      });
      try {
        entries = fs
          .readdirSync(".", { withFileTypes: true })
          .sort((left, right) => left.name.localeCompare(right.name, "en"));
      } catch (error) {
        errors.push(`${rel}: unable to enumerate the cwd-anchored directory: ${error.message}`);
        stable = false;
      }

      if (entries) {
        readOptions.readPhaseHook?.({
          entries,
          file: resolvedDirectory,
          phase: "after-directory-read",
          relativePath: rel,
        });
        readOptions.readPhaseHook?.({
          entries,
          file: resolvedDirectory,
          phase: "after-directory-return",
          relativePath: rel,
        });
        const initialEntrySignature = directoryEntrySignature(entries);
        for (const entry of entries) {
          const full = path.join(resolvedDirectory, entry.name);
          if (entry.isDirectory()) {
            const child = walkFiles(root, full, errors, readOptions, {
              anchoredEntryName: entry.name,
              anchoredParent: witness,
            });
            records.push(...child.records);
            if (child.witness) childWitnesses.push(child.witness);
            if (!child.stable) stable = false;
          } else if (entry.isFile() || entry.isSymbolicLink()) {
            const snapshot = readRegularFile(root, full, errors, {
              ...readOptions,
              anchoredLeafName: entry.name,
              anchoredParent: witness,
              symlinkError: `${relative(root, full)}: repo-only legacy-reference evidence custody cannot be verified through skill-payload symlinks`,
            });
            if (snapshot) {
              const record = {
                buffer: snapshot.buffer,
                descriptor: snapshot.descriptor,
                file: full,
                identities: snapshot.identities,
                leafName: entry.name,
                stat: snapshot.stat,
              };
              if (Array.isArray(readOptions.retainedPayloadRecords)) {
                readOptions.retainedPayloadRecords.push(record);
              }
              directRecords.push(record);
              records.push(record);
            } else stable = false;
          } else {
            errors.push(
              `${relative(root, full)}: unsupported special entry in skill-payload traversal`,
            );
            stable = false;
          }
        }

        readOptions.readPhaseHook?.({
          file: resolvedDirectory,
          phase: "after-directory-children",
          relativePath: rel,
        });
        try {
          const completedEntries = fs
            .readdirSync(".", { withFileTypes: true })
            .sort((left, right) => left.name.localeCompare(right.name, "en"));
          if (
            JSON.stringify(initialEntrySignature) !==
            JSON.stringify(directoryEntrySignature(completedEntries))
          ) {
            errors.push(`${rel}: directory entry set changed during cwd-anchored traversal`);
            stable = false;
          }
          completedStat = fs.statSync(".", { bigint: true });
          if (!sameFileObservation(anchoredStat, completedStat)) {
            errors.push(`${rel}: directory identity changed during cwd-anchored traversal`);
            stable = false;
          }
          traversalWitness = {
            children: childWitnesses,
            directoryStat: completedStat,
            entryName: anchoredEntryName,
            entrySignature: directoryEntrySignature(completedEntries),
            files: directRecords,
            identities: initial.identities,
            readPhaseHook: readOptions.readPhaseHook,
            relativePath: rel,
            root: resolvedRoot,
          };
          const forwardStable = revalidateTraversalWitness(traversalWitness, errors, "forward");
          const reverseStable = revalidateTraversalWitness(traversalWitness, errors, "reverse");
          if (!forwardStable || !reverseStable) stable = false;
        } catch (error) {
          errors.push(`${rel}: unable to close cwd-anchored traversal bracket: ${error.message}`);
          stable = false;
        }
      }
    }
  } finally {
    try {
      if (entered && anchoredParent) process.chdir("..");
      else process.chdir(previousDirectory);
      const returnedStat = fs.statSync(".", { bigint: true });
      if (!sameNodeIdentity(previousDirectoryStat, returnedStat)) {
        errors.push(`${rel}: traversal returned through a different parent directory`);
        stable = false;
        process.chdir(previousDirectory);
      }
    } catch (error) {
      errors.push(`${rel}: unable to restore traversal parent directory: ${error.message}`);
      stable = false;
      try {
        process.chdir(previousDirectory);
      } catch {
        // The validation already fails closed; retain the original restoration error.
      }
    }
  }

  const completed = lstatSymlinkFreePath(resolvedRoot, resolvedDirectory, errors);
  if (!completed) stable = false;
  else if (
    initial.identities.length !== completed.identities.length ||
    initial.identities.some(
      (identity, index) => !sameComponentIdentity(identity, completed.identities[index]),
    ) ||
    (completedStat && !sameFileObservation(completedStat, completed.stat))
  ) {
    errors.push(`${rel}: directory path identity changed after cwd-anchored traversal`);
    stable = false;
  }

  return {
    records,
    stable,
    witness: stable ? traversalWitness : null,
  };
}

function revalidatePayloadTraversalSnapshot(
  root,
  directory,
  witness,
  errors,
  { invokeHook = true } = {},
) {
  if (!witness) return false;
  const resolvedRoot = path.resolve(root);
  const resolvedDirectory = path.resolve(directory);
  const rel = relative(resolvedRoot, resolvedDirectory);
  const currentPath = lstatSymlinkFreePath(resolvedRoot, resolvedDirectory, errors);
  let stable = Boolean(currentPath);
  if (
    currentPath &&
    (witness.identities.length !== currentPath.identities.length ||
      witness.identities.some(
        (identity, index) => !sameComponentIdentity(identity, currentPath.identities[index]),
      ) ||
      !sameFileObservation(witness.directoryStat, currentPath.stat))
  ) {
    errors.push(`${rel}: payload directory path changed before final traversal seal`);
    stable = false;
  }

  const previousDirectory = process.cwd();
  let previousDirectoryStat;
  let entered = false;
  try {
    previousDirectoryStat = fs.statSync(".", { bigint: true });
    process.chdir(resolvedDirectory);
    entered = true;
    const anchoredStat = fs.statSync(".", { bigint: true });
    if (!sameFileObservation(witness.directoryStat, anchoredStat)) {
      errors.push(`${rel}: payload directory anchor changed before final traversal seal`);
      stable = false;
    } else {
      for (const direction of ["forward", "reverse"]) {
        if (!revalidateTraversalWitness(witness, errors, direction, { invokeHook })) stable = false;
      }
    }
  } catch (error) {
    errors.push(`${rel}: unable to establish final payload traversal seal: ${error.message}`);
    stable = false;
  } finally {
    try {
      process.chdir(previousDirectory);
      const returnedStat = fs.statSync(".", { bigint: true });
      if (previousDirectoryStat && !sameNodeIdentity(previousDirectoryStat, returnedStat)) {
        errors.push(`${rel}: final payload traversal seal returned through a different directory`);
        stable = false;
      }
    } catch (error) {
      errors.push(`${rel}: unable to restore directory after final payload seal: ${error.message}`);
      stable = false;
      if (entered) {
        try {
          process.chdir(previousDirectory);
        } catch {
          // Validation already fails closed with the original restoration error.
        }
      }
    }
  }

  const completedPath = lstatSymlinkFreePath(resolvedRoot, resolvedDirectory, errors);
  if (
    !completedPath ||
    witness.identities.length !== completedPath.identities.length ||
    witness.identities.some(
      (identity, index) => !sameComponentIdentity(identity, completedPath.identities[index]),
    ) ||
    !sameFileObservation(witness.directoryStat, completedPath.stat)
  ) {
    errors.push(`${rel}: payload directory path changed during final traversal seal`);
    stable = false;
  }
  return stable;
}

function sealRetainedRecord(root, record, errors, { kind, symlinkError }) {
  const rel = relative(root, record.file);
  let openedStat;
  try {
    openedStat = fs.fstatSync(record.descriptor, { bigint: true });
  } catch (error) {
    errors.push(`${rel}: unable to inspect retained ${kind} descriptor: ${error.message}`);
    return null;
  }
  if (!openedStat.isFile() || openedStat.size > BigInt(Number.MAX_SAFE_INTEGER)) {
    errors.push(`${rel}: retained ${kind} descriptor cannot be sealed as a regular file`);
    return null;
  }
  const openedPath = lstatSymlinkFreePath(root, record.file, errors, { symlinkError });
  if (
    !openedPath ||
    record.identities.length !== openedPath.identities.length ||
    record.identities.some(
      (identity, index) => !sameComponentIdentity(identity, openedPath.identities[index]),
    ) ||
    !sameFileObservation(openedStat, openedPath.stat)
  ) {
    errors.push(`${rel}: retained ${kind} descriptor no longer matches the current ${kind} path`);
    return null;
  }

  let buffer;
  try {
    buffer = Buffer.alloc(Number(openedStat.size));
    let offset = 0;
    while (offset < buffer.byteLength) {
      const read = fs.readSync(
        record.descriptor,
        buffer,
        offset,
        buffer.byteLength - offset,
        offset,
      );
      if (read === 0) throw new Error(`unexpected EOF at byte ${offset}`);
      offset += read;
    }
  } catch (error) {
    errors.push(`${rel}: unable to read retained ${kind} descriptor: ${error.message}`);
    return null;
  }

  let completedStat;
  try {
    completedStat = fs.fstatSync(record.descriptor, { bigint: true });
  } catch (error) {
    errors.push(`${rel}: unable to re-inspect retained ${kind} descriptor: ${error.message}`);
    return null;
  }
  if (
    !sameFileObservation(openedStat, completedStat) ||
    BigInt(buffer.byteLength) !== completedStat.size
  ) {
    errors.push(`${rel}: retained ${kind} descriptor changed while sealing snapshot bytes`);
    return null;
  }
  const completedPath = lstatSymlinkFreePath(root, record.file, errors, { symlinkError });
  if (
    !completedPath ||
    record.identities.length !== completedPath.identities.length ||
    record.identities.some(
      (identity, index) => !sameComponentIdentity(identity, completedPath.identities[index]),
    ) ||
    !sameFileObservation(completedStat, completedPath.stat)
  ) {
    errors.push(`${rel}: current ${kind} path changed while sealing snapshot bytes`);
    return null;
  }
  return { buffer, file: record.file };
}

function sealPayloadRecord(root, record, errors) {
  const rel = relative(root, record.file);
  return sealRetainedRecord(root, record, errors, {
    kind: "payload",
    symlinkError: `${rel}: repo-only legacy-reference evidence custody cannot be verified through skill-payload symlinks`,
  });
}

function sealSemanticRecord(root, record, errors) {
  const rel = relative(root, record.file);
  const sealed = sealRetainedRecord(root, record, errors, {
    kind: "semantic",
    symlinkError: `${rel}: validated semantic path must remain symlink-free`,
  });
  if (sealed && !sealed.buffer.equals(record.buffer)) {
    errors.push(`${rel}: validated semantic bytes changed after the original snapshot`);
    return null;
  }
  return sealed;
}

function validateLegacyReferenceEvidenceInner({
  root = process.cwd(),
  testOnlyReadPhaseHook = null,
  retainedPayloadRecords,
  retainedRecords,
} = {}) {
  const errors = [];
  const readOptions = {
    readPhaseHook: testOnlyReadPhaseHook,
    retainedPayloadRecords,
    retainedRecords,
  };
  const sourceLock = readJson(root, sourceLockRelative, errors, readOptions);
  const coverage = readJson(root, coverageRelative, errors, readOptions);
  const expectedSourceUrl =
    `https://github.com/stark-ai-de/agent-skills/tree/${expectedCommit}/` + expectedSourceDirectory;
  const sourceFacts = new Map();
  const targetFacts = new Map();

  if (sourceLock) {
    if (!hasExactKeys(sourceLock, ["schema", "source", "baselineDirectory", "files"])) {
      errors.push(
        `${toPosix(sourceLockRelative)}: top level must contain exactly schema, source, baselineDirectory, and files`,
      );
    }
    if (sourceLock.schema !== 1) {
      errors.push(`${toPosix(sourceLockRelative)}: schema must be 1`);
    }
    if (!hasExactKeys(sourceLock.source, ["repository", "commit", "directory", "permalink"])) {
      errors.push(`${toPosix(sourceLockRelative)}: source must use the exact schema`);
    } else {
      if (sourceLock.source.repository !== "https://github.com/stark-ai-de/agent-skills") {
        errors.push(`${toPosix(sourceLockRelative)}: unexpected source repository`);
      }
      if (sourceLock.source.commit !== expectedCommit) {
        errors.push(
          `${toPosix(sourceLockRelative)}: source commit must be the reviewed ${expectedCommit}`,
        );
      }
      if (sourceLock.source.directory !== expectedSourceDirectory) {
        errors.push(`${toPosix(sourceLockRelative)}: unexpected source directory`);
      }
      if (sourceLock.source.permalink !== expectedSourceUrl) {
        errors.push(`${toPosix(sourceLockRelative)}: source permalink must be immutable`);
      }
    }

    const expectedBaseline = `skill-evals/architecture-compass/reference-baseline/${expectedCommit}`;
    const baselineDirectoryValid =
      typeof sourceLock.baselineDirectory === "string" &&
      sourceLock.baselineDirectory === expectedBaseline;
    if (!baselineDirectoryValid) {
      errors.push(`${toPosix(sourceLockRelative)}: baselineDirectory must be ${expectedBaseline}`);
    }
    if (!Array.isArray(sourceLock.files)) {
      errors.push(`${toPosix(sourceLockRelative)}: files must be an array`);
    } else {
      const actualNames = sourceLock.files.map((entry) => entry?.name);
      if (JSON.stringify(actualNames) !== JSON.stringify(expectedFiles)) {
        errors.push(
          `${toPosix(sourceLockRelative)}: files must be exactly the eight reviewed references in lexical order`,
        );
      }
      const seen = new Set();
      for (const [index, entry] of sourceLock.files.entries()) {
        const entryRel = `${toPosix(sourceLockRelative)}:files[${index}]`;
        if (
          !hasExactKeys(entry, [
            "name",
            "blob",
            "sha256",
            "bytes",
            "lines",
            "h2Headings",
            "codeBlocks",
          ])
        ) {
          errors.push(`${entryRel}: must use the exact source-file schema`);
          continue;
        }
        if (typeof entry.name !== "string") {
          errors.push(`${entryRel}: name must be a string`);
          continue;
        }
        if (seen.has(entry.name)) errors.push(`${entryRel}: duplicate source file ${entry.name}`);
        seen.add(entry.name);
        if (!expectedFiles.includes(entry.name)) {
          errors.push(`${entryRel}: unexpected source file ${JSON.stringify(entry.name)}`);
          continue;
        }
        const anchoredHashes = expectedSourceHashes.get(entry.name);
        if (!anchoredHashes) {
          errors.push(`${entryRel}: source file has no independent trust anchor`);
          continue;
        }
        if (!/^[a-f0-9]{40}$/.test(entry.blob ?? "")) {
          errors.push(`${entryRel}: blob must be a Git SHA-1 object ID`);
        }
        if (!/^[a-f0-9]{64}$/.test(entry.sha256 ?? "")) {
          errors.push(`${entryRel}: sha256 must be a lowercase SHA-256 digest`);
        }
        if (entry.blob !== anchoredHashes.blob) {
          errors.push(`${entryRel}: source blob must match the independent trust anchor`);
        }
        if (entry.sha256 !== anchoredHashes.sha256) {
          errors.push(`${entryRel}: source SHA-256 must match the independent trust anchor`);
        }
        if (!baselineDirectoryValid) continue;
        const baseline = resolveInside(root, path.join(sourceLock.baselineDirectory, entry.name));
        if (!baseline) {
          errors.push(`${entryRel}: invalid baseline path`);
          continue;
        }
        const buffer = readRegularFile(root, baseline, errors, readOptions);
        if (!buffer) continue;
        const facts = markdownFacts(buffer, toPosix(path.relative(root, baseline)), errors);
        if (!facts) continue;
        sourceFacts.set(entry.name, facts);
        if (gitBlobId(buffer) !== anchoredHashes.blob) {
          errors.push(`${entryRel}: baseline blob does not match the independent trust anchor`);
        }
        if (sha256(buffer) !== anchoredHashes.sha256) {
          errors.push(`${entryRel}: baseline SHA-256 does not match the independent trust anchor`);
        }
        if (entry.blob !== gitBlobId(buffer)) {
          errors.push(`${entryRel}: Git blob hash does not match the baseline bytes`);
        }
        if (entry.sha256 !== sha256(buffer)) {
          errors.push(`${entryRel}: SHA-256 does not match the baseline bytes`);
        }
        if (entry.bytes !== buffer.length) {
          errors.push(`${entryRel}: byte count does not match the baseline`);
        }
        if (entry.lines !== facts.lineCount) {
          errors.push(`${entryRel}: line count does not match the baseline`);
        }
        if (entry.h2Headings !== facts.h2Headings.length) {
          errors.push(`${entryRel}: H2 heading count does not match the baseline`);
        }
        if (entry.codeBlocks !== facts.codeBlocks) {
          errors.push(`${entryRel}: code-block count does not match the baseline`);
        }
        if (facts.boundaryInFence.at(-1)) {
          errors.push(`${entryRel}: baseline contains an unclosed Markdown code fence`);
        }
      }
    }
  }

  if (coverage) {
    if (!hasExactKeys(coverage, ["schema", "sourceCommit", "sourceLock", "units"])) {
      errors.push(
        `${toPosix(coverageRelative)}: top level must contain exactly schema, sourceCommit, sourceLock, and units`,
      );
    }
    if (coverage.schema !== 1) errors.push(`${toPosix(coverageRelative)}: schema must be 1`);
    if (coverage.sourceCommit !== expectedCommit) {
      errors.push(`${toPosix(coverageRelative)}: sourceCommit must match the source lock`);
    }
    if (coverage.sourceLock !== toPosix(sourceLockRelative)) {
      errors.push(`${toPosix(coverageRelative)}: sourceLock must point to the repo-only lock`);
    }
    if (!Array.isArray(coverage.units)) {
      errors.push(`${toPosix(coverageRelative)}: units must be an array`);
    } else {
      const seenUnits = new Set();
      const partitions = new Map(
        expectedFiles.map((file) => [
          file,
          {
            nextLine: 1,
            coveredHeadings: new Set(),
            partsByHeading: new Map(),
            codeBlocks: 0,
          },
        ]),
      );
      let previousFileIndex = -1;
      for (const [index, entry] of coverage.units.entries()) {
        const entryRel = `${toPosix(coverageRelative)}:units[${index}]`;
        if (
          !hasExactKeys(entry, [
            "id",
            "source",
            "kind",
            "summary",
            "disposition",
            "rationale",
            "targets",
          ])
        ) {
          errors.push(`${entryRel}: must use the exact coverage-unit schema`);
          continue;
        }
        if (seenUnits.has(entry.id)) errors.push(`${entryRel}: duplicate coverage ID ${entry.id}`);
        seenUnits.add(entry.id);
        let sourceCodeBlocks = 0;
        if (
          !hasExactKeys(entry.source, [
            "file",
            "heading",
            "startLine",
            "endLine",
            "sha256",
            "codeBlocks",
          ])
        ) {
          errors.push(`${entryRel}: source must use the exact section schema`);
        } else {
          const fileIndex = expectedFiles.indexOf(entry.source.file);
          const facts = sourceFacts.get(entry.source.file);
          const partition = partitions.get(entry.source.file);
          if (fileIndex === -1 || !facts || !partition) {
            errors.push(`${entryRel}: source file is not one of the eight locked references`);
          } else {
            if (fileIndex < previousFileIndex) {
              errors.push(`${entryRel}: coverage units must follow locked source-file order`);
            }
            previousFileIndex = Math.max(previousFileIndex, fileIndex);
            const { startLine, endLine } = entry.source;
            if (
              !Number.isInteger(startLine) ||
              !Number.isInteger(endLine) ||
              startLine < 1 ||
              endLine < startLine ||
              endLine > facts.lineCount
            ) {
              errors.push(`${entryRel}: source range must be valid locked line numbers`);
            } else {
              if (startLine !== partition.nextLine) {
                errors.push(
                  `${entryRel}: coverage partition expected line ${partition.nextLine}, found ${startLine}`,
                );
              }
              const ownerIndex = facts.h2Headings.findLastIndex(
                ({ line }) => line <= Math.max(startLine, facts.h2Headings[0]?.line ?? 1),
              );
              const owner = facts.h2Headings[Math.max(ownerIndex, 0)];
              if (!owner || entry.source.heading !== owner.text) {
                errors.push(`${entryRel}: source heading does not match the owning locked H2`);
              }
              const nextHeading = facts.h2Headings[Math.max(ownerIndex, 0) + 1];
              if (nextHeading && nextHeading.line <= endLine) {
                errors.push(`${entryRel}: one coverage unit must not cross an H2 boundary`);
              }
              const sectionNumber = Math.max(ownerIndex, 0) + 1;
              const partNumber = (partition.partsByHeading.get(sectionNumber) ?? 0) + 1;
              partition.partsByHeading.set(sectionNumber, partNumber);
              const expectedId = `legacy:${entry.source.file.replace(/\.md$/, "")}:${String(
                sectionNumber,
              ).padStart(2, "0")}.${String(partNumber).padStart(2, "0")}`;
              const legacySinglePartId = expectedId.replace(/\.01$/, "");
              if (entry.id !== expectedId && entry.id !== legacySinglePartId) {
                errors.push(`${entryRel}: coverage ID must be ${expectedId}`);
              }
              partition.coveredHeadings.add(sectionNumber);
              const sourceSlice = facts.slice(startLine, endLine);
              const sliceFacts = markdownFacts(
                sourceSlice,
                `${entryRel}: locked source slice`,
                errors,
              );
              if (!sliceFacts) continue;
              sourceCodeBlocks = sliceFacts.codeBlocks;
              if (entry.source.sha256 !== sha256(sourceSlice)) {
                errors.push(`${entryRel}: source sha256 does not match the locked line range`);
              }
              if (entry.source.codeBlocks !== sourceCodeBlocks) {
                errors.push(`${entryRel}: source codeBlocks does not match the locked line range`);
              }
              if (sourceCodeBlocks > 1) {
                errors.push(
                  `${entryRel}: split the unit so each historical code example is reviewable`,
                );
              }
              if (facts.boundaryInFence[startLine - 1] || facts.boundaryInFence[endLine]) {
                errors.push(`${entryRel}: section boundary splits a Markdown code fence`);
              }
              partition.codeBlocks += sourceCodeBlocks;
              partition.nextLine = endLine + 1;
            }
          }
        }
        const expectedKind = sourceCodeBlocks > 0 ? "example" : "guidance";
        if (entry.kind !== expectedKind) {
          errors.push(`${entryRel}: kind must be ${expectedKind} for the locked line range`);
        }
        if (typeof entry.summary !== "string" || entry.summary.trim().length < 8) {
          errors.push(`${entryRel}: summary must be a non-empty reviewed short description`);
        }
        if (!allowedDispositions.has(entry.disposition)) {
          errors.push(
            `${entryRel}: disposition must be preserved, adapted, or explicitly-rejected`,
          );
        }
        if (typeof entry.rationale !== "string" || entry.rationale.trim().length < 20) {
          errors.push(`${entryRel}: rationale must state the reviewed no-loss disposition`);
        }
        if (entry.disposition === "explicitly-rejected" && !/reject/i.test(entry.rationale ?? "")) {
          errors.push(`${entryRel}: explicitly rejected content must state why it is rejected`);
        }
        if (!Array.isArray(entry.targets) || entry.targets.length === 0) {
          errors.push(`${entryRel}: every coverage unit requires at least one active target`);
          continue;
        }
        let hasGuideExampleTarget = false;
        let hasAcceptedLongTarget = false;
        for (const [targetIndex, target] of entry.targets.entries()) {
          const targetRel = `${entryRel}.targets[${targetIndex}]`;
          if (!hasExactKeys(target, ["path", "heading", "markers"])) {
            errors.push(`${targetRel}: target must contain exactly path, heading, and markers`);
            continue;
          }
          if (
            typeof target.path !== "string" ||
            !/^skills\/engineering-workflows\/architecture-compass\/references\/ac-adr-\d{3}-[a-z0-9-]+\.(?:long|guide)\.md$/.test(
              target.path,
            )
          ) {
            errors.push(
              `${targetRel}: target must be a suffixed Architecture Compass Long or Guide`,
            );
            continue;
          }
          const isGuideTarget = target.path.endsWith(".guide.md");
          const isLongTarget = target.path.endsWith(".long.md");
          if (isLongTarget && target.heading !== "Decision") {
            errors.push(`${targetRel}: canonical Long target heading must be Decision`);
          }
          const targetFile = resolveInside(root, target.path);
          if (!targetFile) {
            errors.push(`${targetRel}: target path escapes the repository`);
            continue;
          }
          let facts = targetFacts.get(target.path);
          if (!facts) {
            const targetBuffer = readRegularFile(root, targetFile, errors, readOptions);
            if (!targetBuffer) continue;
            const markdown = markdownFacts(targetBuffer, target.path, errors);
            if (!markdown) continue;
            facts = { markdown, text: markdown.text };
            targetFacts.set(target.path, facts);
          }
          if (isLongTarget) {
            const status = metadataValue(facts.text, "Status");
            const variant = metadataValue(facts.text, "Variant");
            const canonicalVariant = metadataValue(facts.text, "Canonical variant");
            if (status !== "Accepted") {
              errors.push(`${targetRel}: canonical Long target Status must be Accepted`);
            }
            if (variant !== "Long") {
              errors.push(`${targetRel}: canonical Long target Variant must be Long`);
            }
            if (canonicalVariant !== "Long") {
              errors.push(
                `${targetRel}: canonical Long target must declare Canonical variant: Long`,
              );
            }
            if (
              status === "Accepted" &&
              variant === "Long" &&
              canonicalVariant === "Long" &&
              target.heading === "Decision"
            ) {
              hasAcceptedLongTarget = true;
            }
          }
          if (typeof target.heading !== "string" || target.heading.length === 0) {
            errors.push(`${targetRel}: heading must be a non-empty string`);
            continue;
          }
          const targetSection = inspectVisibleMarkdownTarget(
            facts.text,
            target.heading,
            Array.isArray(target.markers) ? target.markers : [],
          );
          if (targetSection.matches !== 1) {
            errors.push(
              `${targetRel}: target heading ${JSON.stringify(target.heading)} must exist exactly once`,
            );
          }
          if (!Array.isArray(target.markers) || target.markers.length === 0) {
            errors.push(`${targetRel}: markers must be a non-empty array`);
          } else {
            for (const marker of target.markers) {
              if (typeof marker !== "string" || marker.length < 3) {
                errors.push(`${targetRel}: markers must be strings of at least three characters`);
              } else if ((targetSection.markerCounts.get(marker) ?? 0) === 0) {
                errors.push(
                  `${targetRel}: target section is missing marker ${JSON.stringify(marker)}`,
                );
              }
            }
            if (
              isGuideTarget &&
              targetSection.matches === 1 &&
              (/(?:^|\s)examples?(?:\s|$)/i.test(target.heading) ||
                target.markers.some(
                  (marker) =>
                    typeof marker === "string" &&
                    fencedCodeBlocks(targetSection.text).some((codeBlock) =>
                      normalizeMarker(codeBlock).includes(normalizeMarker(marker)),
                    ),
                ))
            ) {
              hasGuideExampleTarget = true;
            }
          }
        }
        if (!hasAcceptedLongTarget) {
          errors.push(
            `${entryRel}: every legacy unit requires an exact Accepted canonical Long Decision target`,
          );
        }
        if (entry.disposition === "explicitly-rejected" && !hasAcceptedLongTarget) {
          errors.push(
            `${entryRel}: explicitly rejected content must name its governing Accepted canonical Long Decision target`,
          );
        }
        if (
          sourceCodeBlocks > 0 &&
          entry.disposition !== "explicitly-rejected" &&
          !hasGuideExampleTarget
        ) {
          errors.push(
            `${entryRel}: every preserved or adapted historical code example requires a current Guide code or example target`,
          );
        }
      }

      for (const file of expectedFiles) {
        const facts = sourceFacts.get(file);
        const partition = partitions.get(file);
        if (!facts || !partition) continue;
        if (partition.nextLine !== facts.lineCount + 1) {
          errors.push(
            `${toPosix(coverageRelative)}: ${file} coverage ends before locked line ${facts.lineCount}`,
          );
        }
        for (let index = 1; index <= facts.h2Headings.length; index += 1) {
          if (!partition.coveredHeadings.has(index)) {
            errors.push(
              `${toPosix(coverageRelative)}: ${file} is missing H2 section ${String(index).padStart(2, "0")}`,
            );
          }
        }
        if (partition.codeBlocks !== facts.codeBlocks) {
          errors.push(
            `${toPosix(coverageRelative)}: ${file} accounts for ${partition.codeBlocks} of ${facts.codeBlocks} code examples`,
          );
        }
      }
    }
  }

  const forbiddenEvidenceHashes = new Set();
  const forbiddenEvidenceBytes = [];
  if (
    sourceLock &&
    sourceLock.baselineDirectory ===
      `skill-evals/architecture-compass/reference-baseline/${expectedCommit}` &&
    Array.isArray(sourceLock.files)
  ) {
    for (const entry of sourceLock.files) {
      if (typeof entry?.name !== "string") continue;
      const baseline = resolveInside(
        root,
        path.join(sourceLock.baselineDirectory, entry?.name ?? ""),
      );
      const buffer = baseline ? readRegularFile(root, baseline, errors, readOptions) : null;
      if (buffer) {
        forbiddenEvidenceHashes.add(sha256(buffer));
        forbiddenEvidenceBytes.push(buffer);
      }
    }
  }
  for (const evidenceRelative of [sourceLockRelative, coverageRelative]) {
    const evidenceFile = path.join(root, evidenceRelative);
    const buffer = readRegularFile(root, evidenceFile, errors, readOptions);
    if (buffer) {
      forbiddenEvidenceHashes.add(sha256(buffer));
      forbiddenEvidenceBytes.push(buffer);
    }
  }

  const skillDir = path.join(root, skillRelative);
  const payloadTraversal = walkFiles(root, skillDir, errors, readOptions);
  const sealedPayloadRecords = [];
  const payloadSnapshotBuffers = new Map();
  let payloadSnapshotStable = payloadTraversal.stable;
  if (payloadSnapshotStable) {
    for (const record of payloadTraversal.records) {
      const sealed = sealPayloadRecord(root, record, errors);
      if (sealed) {
        sealedPayloadRecords.push(sealed);
        payloadSnapshotBuffers.set(record, sealed.buffer);
      } else payloadSnapshotStable = false;
    }
  }

  for (const { buffer, file } of payloadSnapshotStable ? sealedPayloadRecords : []) {
    const rel = relative(root, file);
    const parts = rel.split("/");
    if (
      forbiddenEvidenceNames.has(path.basename(file)) ||
      parts.includes("reference-baseline") ||
      expectedFiles.includes(path.basename(file)) ||
      forbiddenEvidenceHashes.has(sha256(buffer)) ||
      forbiddenEvidenceBytes.some((evidence) => evidence.length > 0 && buffer.includes(evidence))
    ) {
      errors.push(
        `${rel}: repo-only legacy-reference evidence bytes must not enter the skill payload`,
      );
    }
  }

  const dispositionCounts = { preserved: 0, adapted: 0, "explicitly-rejected": 0 };
  if (Array.isArray(coverage?.units)) {
    for (const unit of coverage.units) {
      if (Object.hasOwn(dispositionCounts, unit?.disposition)) {
        dispositionCounts[unit.disposition] += 1;
      }
    }
  }
  const finalRecords = [
    ...payloadTraversal.records.map((record) => ({ kind: "payload", record })),
    ...retainedRecords.map((record) => ({ kind: "semantic", record })),
  ];
  const sealFinalRecords = ({ invokeHook }) => {
    for (const pass of ["forward", "reverse"]) {
      const records = pass === "forward" ? finalRecords : [...finalRecords].reverse();
      for (const { kind, record } of records) {
        if (invokeHook) {
          testOnlyReadPhaseHook?.({
            file: record.file,
            kind,
            pass,
            phase: "before-final-record-seal",
            relativePath: relative(root, record.file),
          });
        }
        if (kind === "semantic") {
          sealSemanticRecord(root, record, errors);
          continue;
        }
        const sealed = sealPayloadRecord(root, record, errors);
        const original = payloadSnapshotBuffers.get(record);
        if (sealed && original && !sealed.buffer.equals(original)) {
          errors.push(
            `${relative(root, record.file)}: validated payload bytes changed after the original leak scan`,
          );
        }
      }
    }
  };
  sealFinalRecords({ invokeHook: true });
  if (payloadTraversal.witness) {
    revalidatePayloadTraversalSnapshot(root, skillDir, payloadTraversal.witness, errors);
  }
  sealFinalRecords({ invokeHook: false });
  if (payloadTraversal.witness) {
    revalidatePayloadTraversalSnapshot(root, skillDir, payloadTraversal.witness, errors, {
      invokeHook: false,
    });
  }
  return {
    errors: [...new Set(errors)].sort(),
    summary: {
      files: sourceFacts.size,
      units: Array.isArray(coverage?.units) ? coverage.units.length : 0,
      codeBlocks: [...sourceFacts.values()].reduce((sum, facts) => sum + facts.codeBlocks, 0),
      dispositions: dispositionCounts,
    },
  };
}

export function validateLegacyReferenceEvidence(options = {}) {
  const retainedRecords = [];
  const retainedPayloadRecords = [];
  let result = null;
  try {
    result = validateLegacyReferenceEvidenceInner({
      ...options,
      retainedPayloadRecords,
      retainedRecords,
    });
    return result;
  } finally {
    const closeErrors = [];
    for (const [kind, records] of [
      ["payload", retainedPayloadRecords],
      ["semantic", retainedRecords],
    ]) {
      for (const record of records) {
        try {
          fs.closeSync(record.descriptor);
        } catch (error) {
          closeErrors.push(
            `${relative(options.root ?? process.cwd(), record.file)}: unable to close retained ${kind} descriptor: ${error.message}`,
          );
        }
      }
    }
    if (result && closeErrors.length > 0) {
      result.errors = [...new Set([...result.errors, ...closeErrors])].sort();
    }
  }
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const result = validateLegacyReferenceEvidence();
  if (result.errors.length > 0) {
    console.error("Legacy Architecture Compass reference evidence validation failed:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  const { files, units, codeBlocks, dispositions } = result.summary;
  console.log(
    `Legacy Architecture Compass reference evidence validated: ${files} files, ${units} sections, ${codeBlocks} code examples; ${dispositions.preserved} preserved, ${dispositions.adapted} adapted, ${dispositions["explicitly-rejected"]} explicitly rejected.`,
  );
}
