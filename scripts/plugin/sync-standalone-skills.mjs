import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import {
  comparePosixPaths,
  createStandaloneArchive,
  STANDALONE_TARGET,
} from "../lib/plugin-projections.mjs";
import { loadValidatedBundle } from "../lib/bundle-contract.mjs";

function writeStderr(lines) {
  fs.writeSync(process.stderr.fd, `${lines.join("\n")}\n`);
}

function parseArgs(argv) {
  const rootIndex = argv.indexOf("--root");
  const outputIndex = argv.indexOf("--output");
  return {
    check: argv.includes("--check"),
    root: rootIndex === -1 ? process.cwd() : path.resolve(argv[rootIndex + 1]),
    output:
      outputIndex === -1
        ? path.join(
            rootIndex === -1 ? process.cwd() : path.resolve(argv[rootIndex + 1]),
            STANDALONE_TARGET,
          )
        : path.resolve(argv[outputIndex + 1]),
  };
}

function digest(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function replaceDirectory(stage, target) {
  let existing = null;
  try {
    existing = fs.lstatSync(target);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (existing?.isSymbolicLink()) {
    throw new Error(`standalone output must not be a symlink: ${target}`);
  }
  if (existing && !existing.isDirectory()) {
    throw new Error(`standalone output must be a directory: ${target}`);
  }
  if (!existing) {
    fs.renameSync(stage, target);
    return;
  }

  const backup = path.join(
    path.dirname(target),
    `.${path.basename(target)}.previous-${crypto.randomUUID()}`,
  );
  fs.renameSync(target, backup);
  try {
    fs.renameSync(stage, target);
  } catch (error) {
    fs.renameSync(backup, target);
    throw error;
  }
  fs.rmSync(backup, { recursive: true, force: true });
}

try {
  const { check, root, output } = parseArgs(process.argv.slice(2));
  const bundle = loadValidatedBundle(root);
  const drift = [];
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
  if (check && outputStat?.isSymbolicLink()) {
    drift.push(`standalone output is a symlink: ${path.relative(root, output)}`);
  } else if (check && outputStat && !outputStat.isDirectory()) {
    drift.push(`standalone output is not a directory: ${path.relative(root, output)}`);
  } else if (check && outputStat) {
    for (const entry of fs.readdirSync(output, { withFileTypes: true })) {
      if (!expectedNames.has(entry.name)) {
        drift.push(`unexpected ${path.relative(root, path.join(output, entry.name))}`);
      } else if (!entry.isFile()) {
        drift.push(`standalone output entry is not a regular file: ${entry.name}`);
      }
    }
  }
  if (!check) {
    fs.mkdirSync(path.dirname(output), { recursive: true, mode: 0o755 });
  }
  let stage = fs.mkdtempSync(
    check
      ? path.join(os.tmpdir(), "standalone-check-")
      : path.join(path.dirname(output), `.${path.basename(output)}.stage-`),
  );
  try {
    for (const entry of bundle.skills) {
      const expectedPath = path.join(output, `${entry.name}.zip`);
      const generated = createStandaloneArchive({
        root,
        entry,
        output: path.join(stage, `${entry.name}.zip`),
      });
      if (check) {
        const expectedStat = fs.existsSync(expectedPath) ? fs.lstatSync(expectedPath) : null;
        if (!expectedStat?.isFile() || expectedStat.isSymbolicLink()) {
          drift.push(`missing ${path.relative(root, expectedPath)}`);
        } else if (digest(expectedPath) !== generated.sha256) {
          drift.push(`changed ${path.relative(root, expectedPath)}`);
        }
      }
      checksums.push(`${generated.sha256}  ${entry.name}.zip`);
    }
    checksums.sort(comparePosixPaths);
    const checksumPath = path.join(output, "SHA256SUMS");
    if (check) {
      let checksumStat = null;
      try {
        checksumStat = fs.lstatSync(checksumPath);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      if (!checksumStat) {
        drift.push("missing SHA256SUMS");
      } else if (!checksumStat.isFile() || checksumStat.isSymbolicLink()) {
        drift.push("SHA256SUMS must be a regular file");
      } else if (fs.readFileSync(checksumPath, "utf8").trim() !== checksums.join("\n")) {
        drift.push("changed SHA256SUMS");
      }
    } else {
      fs.writeFileSync(path.join(stage, "SHA256SUMS"), `${checksums.join("\n")}\n`, {
        mode: 0o644,
      });
      fs.chmodSync(path.join(stage, "SHA256SUMS"), 0o644);
      replaceDirectory(stage, output);
      stage = null;
    }
  } finally {
    if (stage) fs.rmSync(stage, { recursive: true, force: true });
  }

  if (drift.length > 0) {
    writeStderr(["Standalone projection drift:", ...drift.map((item) => `- ${item}`)]);
    process.exitCode = 1;
  } else {
    console.log(
      `${check ? "Standalone projections are up to date" : "Synchronized standalone projections"}: ${output}`,
    );
  }
} catch (error) {
  writeStderr([`Standalone skill sync failed: ${error.message}`]);
  process.exitCode = 1;
}
