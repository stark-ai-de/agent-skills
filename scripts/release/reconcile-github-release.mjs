#!/usr/bin/env node
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  applyReleaseReconciliation,
  classifyReleaseAsset,
  planReleaseReconciliation,
  RELEASE_ASSET_NAMES,
  resolveTagCommit,
} from "../lib/github-release-reconciliation.mjs";
import { RELEASE_SUBJECT_FILE } from "../lib/release-subject.mjs";
import { validateReleaseSubjectFile } from "../lib/release-subject-validation.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const schemaPath = path.join(
  repositoryRoot,
  "skill-evals/stark-ai-developer/evidence/release-subject.schema.json",
);

function argument(argv, name) {
  const index = argv.indexOf(name);
  const value = index === -1 ? null : (argv[index + 1] ?? null);
  return value && !value.startsWith("--") ? value : null;
}

function parseBoolean(value, name) {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be true or false`);
}

function parseArgs(argv) {
  const mode = argv[0];
  const repository = argument(argv, "--repository");
  const tag = argument(argv, "--tag");
  const releaseSha = argument(argv, "--release-sha");
  const subjectsDirValue = argument(argv, "--subjects-dir");
  const notesFileValue = argument(argv, "--notes-file");
  const markLatestValue = argument(argv, "--mark-latest");
  if (
    !["plan", "apply"].includes(mode) ||
    !repository ||
    !tag ||
    !releaseSha ||
    !subjectsDirValue ||
    !notesFileValue ||
    markLatestValue === null
  ) {
    throw new Error(
      "Usage: reconcile-github-release.mjs <plan|apply> --repository <owner/repo> --tag <vX.Y.Z> --release-sha <sha> --subjects-dir <directory> --notes-file <file> --mark-latest <true|false> [--github-output <file>]",
    );
  }
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error(`Invalid repository: ${repository}`);
  }
  if (!/^v\d+\.\d+\.\d+$/.test(tag)) throw new Error(`Invalid release tag: ${tag}`);
  if (!/^[0-9a-f]{40}$/.test(releaseSha)) {
    throw new Error("Release SHA must be a full lowercase 40-hex commit");
  }
  return {
    mode,
    repository,
    tag,
    releaseSha,
    releaseVersion: tag.slice(1),
    subjectsDir: path.resolve(subjectsDirValue),
    notesFile: path.resolve(notesFileValue),
    markLatest: parseBoolean(markLatestValue, "--mark-latest"),
    githubOutput: argument(argv, "--github-output"),
  };
}

function commandResult(command, args, { binary = false, allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: binary ? null : "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) {
    const stderr = binary ? result.stderr?.toString("utf8") : result.stderr;
    throw new Error(`${command} ${args.join(" ")} failed: ${(stderr ?? "").trim()}`);
  }
  return result;
}

function ghJson(args) {
  const result = commandResult("gh", args);
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`GitHub API returned invalid JSON: ${error.message}`);
  }
}

function missingGitHubResource(result) {
  const detail = `${result.stderr ?? ""}\n${result.stdout ?? ""}`;
  return /(?:HTTP\s+404|status\s+code\s+404|not found)/i.test(detail);
}

function readTagCommit({ repository, tag }) {
  const endpoint = `repos/${repository}/git/ref/tags/${encodeURIComponent(tag)}`;
  const result = commandResult("gh", ["api", endpoint], { allowFailure: true });
  if (result.status !== 0) {
    if (missingGitHubResource(result)) return null;
    throw new Error(`Could not read release tag: ${(result.stderr ?? "").trim()}`);
  }
  let object;
  try {
    object = JSON.parse(result.stdout).object;
  } catch (error) {
    throw new Error(`Release tag response is invalid: ${error.message}`);
  }
  return resolveTagCommit(
    object,
    (tagObjectSha) => ghJson(["api", `repos/${repository}/git/tags/${tagObjectSha}`]).object,
  );
}

function readMatchingRelease({ repository, tag }) {
  const pages = ghJson([
    "api",
    "--paginate",
    "--slurp",
    `repos/${repository}/releases?per_page=100`,
  ]);
  const releases = pages.flatMap((page) => (Array.isArray(page) ? page : []));
  const matches = releases.filter((release) => release?.tag_name === tag);
  if (matches.length > 1) return { ambiguous: true, release: null };
  return { ambiguous: false, release: matches[0] ?? null };
}

function digestBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function downloadAsset(repository, assetId) {
  const result = commandResult(
    "gh",
    [
      "api",
      "-H",
      "Accept: application/octet-stream",
      `repos/${repository}/releases/assets/${assetId}`,
    ],
    { binary: true },
  );
  return result.stdout;
}

function inspectAssets({ repository, releaseId, expectedSubjects }) {
  const pages = ghJson([
    "api",
    "--paginate",
    "--slurp",
    `repos/${repository}/releases/${releaseId}/assets?per_page=100`,
  ]);
  const assets = pages.flatMap((page) => (Array.isArray(page) ? page : []));
  const result = {};
  for (const name of RELEASE_ASSET_NAMES) {
    const matches = assets.filter((asset) => asset?.name === name);
    if (matches.length > 1) {
      result[name] = { status: "conflict", reason: "duplicate_asset_name" };
      continue;
    }
    if (matches.length === 0) {
      result[name] = { status: "missing" };
      continue;
    }
    const asset = matches[0];
    const expected = expectedSubjects[name];
    const classified = classifyReleaseAsset({ asset, expected });
    if (classified.status !== "download_required") {
      result[name] = classified;
      continue;
    }
    const downloaded = downloadAsset(repository, asset.id);
    result[name] = classifyReleaseAsset({
      asset,
      expected,
      downloaded: { bytes: downloaded.length, sha256: digestBuffer(downloaded) },
    });
  }
  return result;
}

function attestationFailureKind(result) {
  const detail = `${result.stderr ?? ""}\n${result.stdout ?? ""}`;
  if (
    /(?:timed?\s*out|connection|network|rate.?limit|authentication|unauthorized|forbidden|HTTP\s+(?:4(?!04)\d{2}|5\d{2})|API request failed)/i.test(
      detail,
    )
  ) {
    return "error";
  }
  return "missing";
}

function verifyPublishAttestations({ repository, releaseSha, subjectPaths }) {
  let status = "valid";
  for (const subjectPath of Object.values(subjectPaths)) {
    const result = commandResult(
      "gh",
      [
        "attestation",
        "verify",
        subjectPath,
        "--signer-workflow",
        `${repository}/.github/workflows/publish-release.yml`,
        "--signer-digest",
        releaseSha,
        "--source-digest",
        releaseSha,
        "--source-ref",
        "refs/heads/main",
        "--repo",
        repository,
        "--format",
        "json",
      ],
      { allowFailure: true },
    );
    if (result.status !== 0) {
      const failure = attestationFailureKind(result);
      if (failure === "error") return "error";
      status = "missing";
    }
  }
  return status;
}

function readLocalSubjects(options) {
  if (!fs.existsSync(options.notesFile) || !fs.statSync(options.notesFile).isFile()) {
    throw new Error(`Release notes file is missing: ${options.notesFile}`);
  }
  const subjectFile = path.join(options.subjectsDir, RELEASE_SUBJECT_FILE);
  const validation = validateReleaseSubjectFile(subjectFile, {
    schemaPath,
    subjectDirectory: options.subjectsDir,
    expected: {
      sourceRevision: options.releaseSha,
      sourceState: "clean",
      releaseVersion: options.releaseVersion,
      status: "pass",
    },
  });
  if (validation.errors.length > 0) {
    throw new Error(`Local release subjects are invalid: ${validation.errors.join("; ")}`);
  }
  const expectedSubjects = {};
  const subjectPaths = {};
  for (const key of ["openai", "portable"]) {
    const subject = validation.document.subjects[key];
    expectedSubjects[subject.name] = { sha256: subject.sha256, bytes: subject.bytes };
    subjectPaths[subject.name] = path.join(options.subjectsDir, subject.name);
  }
  return { expectedSubjects, subjectPaths };
}

function observe(options, localSubjects) {
  const tagCommit = readTagCommit(options);
  const releaseResult = readMatchingRelease(options);
  let release = null;
  if (releaseResult.release) {
    const remote = releaseResult.release;
    release = {
      id: remote.id,
      tagName: remote.tag_name,
      draft: typeof remote.draft === "boolean" ? remote.draft : null,
      immutable: typeof remote.immutable === "boolean" ? remote.immutable : null,
      assets: inspectAssets({
        repository: options.repository,
        releaseId: remote.id,
        expectedSubjects: localSubjects.expectedSubjects,
      }),
    };
  }
  return {
    tagCommit,
    release,
    ambiguousRelease: releaseResult.ambiguous,
    attestationStatus: verifyPublishAttestations({
      repository: options.repository,
      releaseSha: options.releaseSha,
      subjectPaths: localSubjects.subjectPaths,
    }),
  };
}

function plan(options, observation) {
  return planReleaseReconciliation({
    tag: options.tag,
    releaseSha: options.releaseSha,
    ...observation,
  });
}

function localTagCommit(tag) {
  const result = commandResult("git", ["rev-parse", "--verify", `refs/tags/${tag}^{commit}`], {
    allowFailure: true,
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

function executeOperation(operation, observation, options, localSubjects) {
  switch (operation.type) {
    case "create_tag": {
      const existing = localTagCommit(options.tag);
      if (existing && existing !== options.releaseSha) {
        throw new Error("Local release tag points to a different commit");
      }
      if (!existing) {
        commandResult("git", [
          "-c",
          "user.name=github-actions[bot]",
          "-c",
          "user.email=41898282+github-actions[bot]@users.noreply.github.com",
          "tag",
          "-a",
          options.tag,
          options.releaseSha,
          "-m",
          options.tag,
        ]);
      }
      commandResult("git", ["push", "origin", `refs/tags/${options.tag}`]);
      return;
    }
    case "create_draft":
      commandResult("gh", [
        "release",
        "create",
        options.tag,
        "--repo",
        options.repository,
        "--verify-tag",
        "--draft",
        "--title",
        options.tag,
        "--notes-file",
        options.notesFile,
      ]);
      return;
    case "upload_asset":
      commandResult("gh", [
        "release",
        "upload",
        options.tag,
        localSubjects.subjectPaths[operation.name],
        "--repo",
        options.repository,
      ]);
      return;
    case "publish_draft":
      if (!observation.release?.id || observation.release.draft !== true) {
        throw new Error("Cannot publish without the currently observed draft release");
      }
      commandResult("gh", [
        "api",
        "--method",
        "PATCH",
        `repos/${options.repository}/releases/${observation.release.id}`,
        "-F",
        "draft=false",
        "-f",
        `make_latest=${options.markLatest}`,
      ]);
      return;
    default:
      throw new Error(`Unknown reconciliation operation: ${operation.type}`);
  }
}

function apply(options, localSubjects) {
  if (
    process.env.GITHUB_EVENT_NAME !== "workflow_dispatch" ||
    process.env.RELEASE_DRY_RUN !== "false"
  ) {
    throw new Error("Apply mode requires manual workflow_dispatch with dry_run=false");
  }

  return applyReleaseReconciliation({
    tag: options.tag,
    releaseSha: options.releaseSha,
    observe: () => observe(options, localSubjects),
    execute: (operation, observation) =>
      executeOperation(operation, observation, options, localSubjects),
  });
}

function appendGithubOutput(filePath, result) {
  if (!filePath) return;
  const operations = result.operations?.map((operation) => operation.type).join(",") ?? "";
  fs.appendFileSync(
    path.resolve(filePath),
    [
      `status=${result.status}`,
      `reason=${result.reason}`,
      `requires_attestation=${result.requiresAttestation === true}`,
      `release_published=${result.releasePublished === true}`,
      `post_release_dispatch_required=${result.postReleaseDispatchRequired === true}`,
      `operations=${operations}`,
    ].join("\n") + "\n",
  );
}

export function runCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const localSubjects = readLocalSubjects(options);
  if (options.mode === "plan") {
    const result = plan(options, observe(options, localSubjects));
    appendGithubOutput(options.githubOutput, result);
    console.log(JSON.stringify(result, null, 2));
    if (result.status === "blocked") process.exitCode = 1;
    return result;
  }
  const result = apply(options, localSubjects);
  appendGithubOutput(options.githubOutput, result);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    runCli();
  } catch (error) {
    console.error(`GitHub release reconciliation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
