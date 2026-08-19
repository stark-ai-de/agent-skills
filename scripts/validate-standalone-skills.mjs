import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { unzipSync } from "fflate";

import { hashBytes, loadValidatedBundle } from "./lib/bundle-contract.mjs";
import { comparePosixPaths, enumerateTree, STANDALONE_TARGET } from "./lib/plugin-projections.mjs";

function parseArgs(argv) {
  const rootIndex = argv.indexOf("--root");
  const outputIndex = argv.indexOf("--output");
  const root = rootIndex === -1 ? process.cwd() : path.resolve(argv[rootIndex + 1]);
  return {
    root,
    output:
      outputIndex === -1 ? path.join(root, STANDALONE_TARGET) : path.resolve(argv[outputIndex + 1]),
  };
}

function validateArchive(archivePath, entry, root) {
  const archive = unzipSync(fs.readFileSync(archivePath));
  const names = Object.keys(archive).sort(comparePosixPaths);
  const errors = [];
  const prefix = `${entry.name}/`;
  if (names.length === 0 || names.some((name) => !name.startsWith(prefix))) {
    errors.push(`${entry.name}.zip must contain exactly one ${entry.name}/ root`);
  }
  if (
    names.some((name) => name === `${entry.name}/plugin.json` || name.includes(".codex-plugin/"))
  ) {
    errors.push(`${entry.name}.zip contains a plugin-level manifest`);
  }

  const sourceRoot = path.join(root, entry.source);
  const expected = new Map(
    enumerateTree(sourceRoot, "", { excludeGeneratedCaches: true }).map((file) => [
      `${entry.name}/${file.relative}`,
      fs.readFileSync(file.absolute),
    ]),
  );
  assert.equal(
    names.length,
    expected.size,
    `${entry.name}.zip entry count differs from canonical source`,
  );
  for (const [name, bytes] of expected) {
    if (!archive[name] || hashBytes(archive[name]) !== hashBytes(bytes)) {
      errors.push(`${entry.name}.zip changed canonical file ${name}`);
    }
  }
  return errors;
}

try {
  const { root, output } = parseArgs(process.argv.slice(2));
  const bundle = loadValidatedBundle(root);
  const errors = [];
  const checksums = [];
  const expectedNames = new Set([
    ...bundle.skills.map((entry) => `${entry.name}.zip`),
    "SHA256SUMS",
  ]);
  let outputStat = null;
  try {
    outputStat = fs.lstatSync(output);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (outputStat?.isSymbolicLink()) {
    errors.push(`standalone output is a symlink: ${path.relative(root, output)}`);
  } else if (outputStat && !outputStat.isDirectory()) {
    errors.push(`standalone output is not a directory: ${path.relative(root, output)}`);
  } else if (outputStat) {
    for (const entry of fs.readdirSync(output, { withFileTypes: true })) {
      if (!expectedNames.has(entry.name)) {
        errors.push(`unexpected ${path.relative(root, path.join(output, entry.name))}`);
      } else if (!entry.isFile()) {
        errors.push(`standalone output entry is not a regular file: ${entry.name}`);
      }
    }
  }
  if (outputStat?.isDirectory()) {
    for (const entry of bundle.skills) {
      const archivePath = path.join(output, `${entry.name}.zip`);
      let archiveStat = null;
      try {
        archiveStat = fs.lstatSync(archivePath);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      if (!archiveStat) {
        errors.push(`missing ${path.relative(root, archivePath)}`);
        continue;
      }
      if (!archiveStat.isFile() || archiveStat.isSymbolicLink()) {
        errors.push(
          `standalone archive must be a regular file: ${path.relative(root, archivePath)}`,
        );
        continue;
      }
      errors.push(...validateArchive(archivePath, entry, root));
      checksums.push(`${hashBytes(fs.readFileSync(archivePath))}  ${entry.name}.zip`);
    }
  } else {
    for (const entry of bundle.skills) {
      errors.push(`missing ${path.relative(root, path.join(output, `${entry.name}.zip`))}`);
    }
  }
  const checksumPath = path.join(output, "SHA256SUMS");
  let checksumStat = null;
  if (outputStat?.isDirectory()) {
    try {
      checksumStat = fs.lstatSync(checksumPath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  if (!checksumStat) {
    errors.push(`missing ${path.relative(root, checksumPath)}`);
  } else if (!checksumStat.isFile() || checksumStat.isSymbolicLink()) {
    errors.push(`standalone checksum file must be regular: ${path.relative(root, checksumPath)}`);
  } else {
    const actualChecksums = fs
      .readFileSync(checksumPath, "utf8")
      .trim()
      .split(/\r?\n/)
      .sort(comparePosixPaths);
    if (JSON.stringify(actualChecksums) !== JSON.stringify(checksums.sort(comparePosixPaths))) {
      errors.push("SHA256SUMS does not match the standalone archives");
    }
  }
  if (errors.length > 0) {
    console.error("Standalone skill validation errors:");
    for (const error of [...new Set(errors)]) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`Validated ${bundle.skills.length} standalone skill archive(s).`);
  }
} catch (error) {
  console.error(`Standalone skill validation failed: ${error.message}`);
  process.exitCode = 1;
}
