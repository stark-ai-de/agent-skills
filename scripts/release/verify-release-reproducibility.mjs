import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { unzipSync } from "fflate";

import {
  canonicalJson,
  comparePosixPaths,
  createDirectoryArchive,
  createStandaloneArchive,
  PORTABLE_TARGET,
  STANDALONE_TARGET,
  enumerateTree,
  syncPortableProjection,
} from "../lib/plugin-projections.mjs";
import { hashBytes, loadValidatedBundle } from "../lib/bundle-contract.mjs";
import {
  LISTING_PATH,
  OPENAI_EPHEMERAL_PROJECTION_PATH,
  readOpenAiListing,
  withOpenAiStage,
} from "../lib/openai-projection.mjs";
import { OPENAI_WORKSHEET_PATH } from "../lib/openai-worksheet.mjs";
import {
  SOURCE_TREE_HASH_RECIPE,
  SOURCE_TREE_INPUTS,
  sourceTreeSha256,
} from "../lib/release-input-digest.mjs";
import {
  assertReleaseSubjectRevision,
  createReleaseSubject,
  RELEASE_SUBJECT_FILE,
} from "../lib/release-subject.mjs";
import { validateReleaseSubjectDocument } from "../lib/release-subject-validation.mjs";
import { PLUGIN_SOURCE_PATH, pluginIdentity } from "../lib/release-descriptor.mjs";
import { copyTrackedPrefixes } from "../lib/git-index.mjs";

const repositoryRoot = process.cwd();
const SHA256_HEX = /^[a-f0-9]{64}$/;

function writeStderr(lines) {
  fs.writeSync(process.stderr.fd, `${lines.join("\n")}\n`);
}

function parseArgs(argv) {
  const value = (name) => {
    const index = argv.indexOf(name);
    const result = index === -1 ? null : (argv[index + 1] ?? null);
    return result && !result.startsWith("--") ? result : null;
  };
  const resolved = (name, fallback = null) => {
    const result = value(name) ?? fallback;
    return result ? path.resolve(result) : null;
  };
  return {
    evidence: resolved("--evidence"),
    subjectsDir: resolved("--subjects-dir", process.env.RELEASE_SUBJECTS_DIR),
    githubOutput: resolved("--github-output", process.env.GITHUB_OUTPUT),
    reportFile: resolved("--report-file", process.env.RELEASE_SUBJECT_REPORT),
  };
}

function hash(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function packageVersion() {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8"),
  );
  const version = process.env.VERSION ?? packageJson.version;
  if (typeof version !== "string" || version.length === 0) {
    throw new Error("release version is missing from VERSION or package.json");
  }
  return version;
}

function gitValue(args) {
  try {
    return execFileSync("git", args, {
      cwd: repositoryRoot,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function sourceIdentity(root) {
  const status = gitValue(["status", "--porcelain", "--untracked-files=all"]);
  return {
    commit: gitValue(["rev-parse", "HEAD"]) ?? "manual-review-required",
    tag:
      process.env.RELEASE_TAG ??
      gitValue(["describe", "--tags", "--exact-match", "HEAD"]) ??
      "manual-review-required",
    state: status === null ? "unknown" : status ? "dirty" : "clean",
    sourceTreeSha256: sourceTreeSha256(root),
  };
}

function archiveEntries(filePath) {
  return Object.keys(unzipSync(fs.readFileSync(filePath))).sort(comparePosixPaths);
}

function portableManifestHashes(root) {
  return {
    portableManifest: hash(path.join(root, PORTABLE_TARGET, "plugin.json")),
    portableSourceManifest: hash(path.join(root, PORTABLE_TARGET, "SOURCE-MANIFEST.json")),
  };
}

function projectionHash(root) {
  const files = enumerateTree(root, "", { excludeGeneratedCaches: true }).map(
    ({ relative, absolute, stat }) => ({
      path: relative,
      mode: (stat.mode & 0o777).toString(8).padStart(4, "0"),
      sha256: hash(absolute),
    }),
  );
  return hashBytes(Buffer.from(canonicalJson(files)));
}

function assertEvidenceHashes(value, fieldPath = "") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertEvidenceHashes(item, `${fieldPath}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = fieldPath ? `${fieldPath}.${key}` : key;
    if (key === "sha256" || key.endsWith("Sha256")) {
      if (typeof child === "string") {
        if (!SHA256_HEX.test(child)) {
          throw new Error(`${childPath} must be a SHA-256 hex digest`);
        }
      } else if (child && typeof child === "object" && !Array.isArray(child)) {
        for (const [name, digest] of Object.entries(child)) {
          if (typeof digest !== "string" || !SHA256_HEX.test(digest)) {
            throw new Error(`${childPath}.${name} must be a SHA-256 hex digest`);
          }
        }
      } else {
        throw new Error(`${childPath} must be a SHA-256 hex digest`);
      }
      continue;
    }
    assertEvidenceHashes(child, childPath);
  }
}

function writeEvidence(filePath, evidence) {
  if (evidence.sourceTreeHashRecipe !== SOURCE_TREE_HASH_RECIPE) {
    throw new Error("sourceTreeHashRecipe must match SOURCE_TREE_HASH_RECIPE");
  }
  assertEvidenceHashes(evidence);
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o755 });
  const temporary = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o644 });
  fs.chmodSync(temporary, 0o644);
  fs.renameSync(temporary, filePath);
}

function releaseSubjectReport(firstBuild, checksums, differences) {
  const identity = pluginIdentity(firstBuild.root);
  const source = sourceIdentity(repositoryRoot);
  return createReleaseSubject({
    status: differences.length === 0 ? "pass" : "blocked",
    sourceRevision: source,
    releaseVersion: packageVersion(),
    pluginVersion: identity.version,
    archiveProfile: identity.archiveProfile,
    openai: {
      sha256: checksums["openai.zip"],
      bytes: firstBuild.archives["openai.zip"].bytes,
    },
    portable: {
      sha256: checksums["portable.zip"],
      bytes: firstBuild.archives["portable.zip"].bytes,
    },
    differences,
  });
}

function writeReleaseSubjects(directory, firstBuild) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o755 });
  for (const legacyName of ["SHA256SUMS", "IDENTITY"]) {
    fs.rmSync(path.join(directory, legacyName), { force: true });
  }
  for (const name of ["openai.zip", "portable.zip"]) {
    fs.copyFileSync(firstBuild.archives[name].output, path.join(directory, name));
  }
}

function writeReleaseSubjectMetadata(directory, report) {
  assertReleaseSubjectRevision(report.sourceRevision.commit);
  const schemaPath = path.join(
    repositoryRoot,
    "skill-evals/stark-ai-developer/evidence/release-subject.schema.json",
  );
  const errors = validateReleaseSubjectDocument(report, {
    schemaPath,
    subjectDirectory: directory,
  });
  if (errors.length > 0) {
    throw new Error(`release-subject.json is invalid:\n${errors.join("\n")}`);
  }

  const filePath = path.join(directory, RELEASE_SUBJECT_FILE);
  const temporary = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o644 });
  fs.renameSync(temporary, filePath);
}

function writeSubjectOutputs(filePath, report, openaiArchive) {
  if (!filePath) return;
  const lines = [
    `status=${report.status}`,
    `source_sha=${report.sourceRevision.commit}`,
    `release_version=${report.releaseVersion}`,
    `plugin_version=${report.pluginVersion}`,
    `openai_sha=${report.subjects.openai.sha256}`,
    `portable_sha=${report.subjects.portable.sha256}`,
    `openai_bytes=${report.subjects.openai.bytes}`,
    `portable_bytes=${report.subjects.portable.bytes}`,
    `archive_profile=${report.archiveProfile}`,
    `openai_archive=${openaiArchive}`,
  ];
  fs.appendFileSync(filePath, `${lines.join("\n")}\n`);
}

function writeSubjectReport(filePath, report) {
  if (!filePath) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o755 });
  fs.writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`);
}

function copyInputs(targetRoot) {
  copyTrackedPrefixes({
    gitRoot: repositoryRoot,
    sourceRoot: repositoryRoot,
    targetRoot,
    prefixes: [...SOURCE_TREE_INPUTS, path.posix.dirname(LISTING_PATH)],
  });
}

function buildIsolated(root) {
  copyInputs(root);
  syncPortableProjection({ root, gitRoot: repositoryRoot });
  const identity = pluginIdentity(root);
  const openAi = withOpenAiStage(
    root,
    (staged) => ({
      archive: createDirectoryArchive({
        sourceRoot: staged.stage,
        output: path.join(root, identity.openaiArchive),
        archiveRoot: "",
      }),
      projection: {
        path: OPENAI_EPHEMERAL_PROJECTION_PATH,
        projectionSha256: projectionHash(staged.stage),
        sourceManifestSha256: hash(path.join(staged.stage, "SOURCE-MANIFEST.json")),
        pluginManifestSha256: hash(path.join(staged.stage, ".codex-plugin", "plugin.json")),
      },
    }),
    { gitRoot: repositoryRoot },
  );
  if (fs.existsSync(path.join(root, "adapters"))) {
    throw new Error("isolated OpenAI packaging must not create adapters/");
  }
  const portableArchive = createDirectoryArchive({
    sourceRoot: path.join(root, PORTABLE_TARGET),
    output: path.join(root, "portable.zip"),
    archiveRoot: "",
  });
  const bundle = loadValidatedBundle(root);
  const archives = {
    "portable.zip": portableArchive,
    "openai.zip": openAi.archive,
  };
  const standaloneRoot = path.join(root, STANDALONE_TARGET);
  fs.mkdirSync(standaloneRoot, { recursive: true, mode: 0o755 });
  for (const entry of bundle.skills) {
    archives[`skills/${entry.name}.zip`] = createStandaloneArchive({
      root,
      gitRoot: repositoryRoot,
      entry,
      output: path.join(standaloneRoot, `${entry.name}.zip`),
    });
  }
  return { root, archives, openAiProjection: openAi.projection };
}

function buildEvidence(firstBuild, checksums, differences) {
  const bundle = loadValidatedBundle(firstBuild.root);
  const listing = readOpenAiListing(firstBuild.root);
  const identity = sourceIdentity(repositoryRoot);
  const generatedManifests = {
    ...portableManifestHashes(firstBuild.root),
    openAiManifest: firstBuild.openAiProjection.pluginManifestSha256,
    openAiSourceManifest: firstBuild.openAiProjection.sourceManifestSha256,
  };
  const listingPath = path.join(firstBuild.root, LISTING_PATH);
  const worksheetPath = path.join(firstBuild.root, OPENAI_WORKSHEET_PATH);
  const archives = Object.fromEntries(
    Object.entries(firstBuild.archives)
      .sort(([firstName], [secondName]) => comparePosixPaths(firstName, secondName))
      .map(([name, archive]) => [
        name,
        {
          bytes: archive.bytes,
          sha256: checksums[name],
          entries: archiveEntries(archive.output),
        },
      ]),
  );
  return {
    schemaVersion: 1,
    package: {
      name: listing.plugin.name,
      version: listing.plugin.version,
    },
    sourceCommit: identity.commit,
    releaseTag: identity.tag,
    sourceState: identity.state,
    sourceTreeSha256: identity.sourceTreeSha256,
    sourceTreeHashRecipe: SOURCE_TREE_HASH_RECIPE,
    source: {
      bundleSha256: hashBytes(Buffer.from(canonicalJson(bundle))),
      bundlePath: PLUGIN_SOURCE_PATH,
    },
    projections: {
      portable: {
        path: PORTABLE_TARGET,
        projectionSha256: projectionHash(path.join(firstBuild.root, PORTABLE_TARGET)),
        sourceManifestSha256: generatedManifests.portableSourceManifest,
        pluginManifestSha256: generatedManifests.portableManifest,
      },
      openai: firstBuild.openAiProjection,
    },
    manifests: {
      generated: generatedManifests,
      submitted: {
        openAiPluginManifestSha256: generatedManifests.openAiManifest,
      },
      portalNormalized: {
        status: "not_applicable",
      },
    },
    listing: {
      sourcePath: LISTING_PATH,
      sourceSha256: hash(listingPath),
      worksheetPath: OPENAI_WORKSHEET_PATH,
      worksheetSha256: hash(worksheetPath),
    },
    archives,
    reproducibility: {
      buildCount: 2,
      byteIdentical: differences.length === 0,
      archiveProfile: "zip-store-v1",
      sha256: checksums,
      differences,
    },
  };
}

try {
  const {
    evidence: evidencePath,
    subjectsDir,
    githubOutput,
    reportFile,
  } = parseArgs(process.argv.slice(2));
  const firstRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stark-ai-repro-a-"));
  const secondRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stark-ai-repro-b-"));
  try {
    const firstBuild = buildIsolated(firstRoot);
    const secondBuild = buildIsolated(secondRoot);
    const first = firstBuild.archives;
    const second = secondBuild.archives;
    const names = [...new Set([...Object.keys(first), ...Object.keys(second)])].sort(
      comparePosixPaths,
    );
    const differences = [];
    const checksums = {};
    for (const name of names) {
      const firstPath = first[name].output;
      const secondPath = second[name].output;
      const firstHash = hash(firstPath);
      const secondHash = hash(secondPath);
      checksums[name] = firstHash;
      if (firstHash !== secondHash) differences.push(`${name}: ${firstHash} != ${secondHash}`);
    }
    if (evidencePath) {
      writeEvidence(evidencePath, buildEvidence(firstBuild, checksums, differences));
      console.log(`Wrote release evidence: ${path.relative(repositoryRoot, evidencePath)}`);
    }
    const subjectReport = releaseSubjectReport(firstBuild, checksums, differences);
    if (subjectsDir) {
      writeReleaseSubjects(subjectsDir, firstBuild);
      writeReleaseSubjectMetadata(subjectsDir, subjectReport);
    }
    writeSubjectOutputs(githubOutput, subjectReport, pluginIdentity(firstBuild.root).openaiArchive);
    writeSubjectReport(reportFile, subjectReport);
    if (differences.length > 0) {
      writeStderr([
        "Release reproducibility failed:",
        ...differences.map((difference) => `- ${difference}`),
      ]);
      process.exitCode = 1;
    } else {
      console.log("Release reproducibility passed for two isolated builds.");
      for (const [name, checksum] of Object.entries(checksums)) {
        console.log(`${name}: ${checksum}`);
      }
    }
  } finally {
    fs.rmSync(firstRoot, { recursive: true, force: true });
    fs.rmSync(secondRoot, { recursive: true, force: true });
  }
} catch (error) {
  writeStderr([`Release reproducibility failed: ${error.message}`]);
  process.exitCode = 1;
}
