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
  RELEASE_ZIP_ASSET_NAMES,
  releaseAssetCreatedAfterPublication,
  releaseAssetCreatedBeforePublication,
  releaseAssetNamesForTag,
  releaseMutationAllowed,
  resolveTagCommit,
} from "../lib/github-release-reconciliation.mjs";
import {
  evidenceRunCoversRelease,
  POST_RELEASE_EVIDENCE_WORKFLOW,
  releaseStateChangedAt,
  selectPostReleaseEvidenceRun,
} from "../lib/post-release-evidence.mjs";
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

function parseArgs(argv) {
  const mode = argv[0];
  const repository = argument(argv, "--repository");
  const tag = argument(argv, "--tag");
  const releaseSha = argument(argv, "--release-sha");
  const subjectsDirValue = argument(argv, "--subjects-dir");
  const notesFileValue = argument(argv, "--notes-file");
  if (
    !["plan", "apply"].includes(mode) ||
    !repository ||
    !tag ||
    !releaseSha ||
    !subjectsDirValue ||
    !notesFileValue
  ) {
    throw new Error(
      "Usage: reconcile-github-release.mjs <plan|apply> --repository <owner/repo> --tag <vX.Y.Z> --release-sha <sha> --subjects-dir <directory> --notes-file <file> [--github-output <file>]",
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

function readTagIdentity({ repository, tag }) {
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
  return {
    annotated: object?.type === "tag",
    commit: resolveTagCommit(
      object,
      (tagObjectSha) => ghJson(["api", `repos/${repository}/git/tags/${tagObjectSha}`]).object,
    ),
  };
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

function normalizedReleaseBody(value) {
  return (typeof value === "string" ? value : "").replace(/\r\n?/g, "\n").replace(/\n+$/, "");
}

function releaseBodySha256(value) {
  return digestBuffer(Buffer.from(normalizedReleaseBody(value), "utf8"));
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

function inspectAssets({ repository, releaseId, expectedSubjects, requiredAssetNames }) {
  const pages = ghJson([
    "api",
    "--paginate",
    "--slurp",
    `repos/${repository}/releases/${releaseId}/assets?per_page=100`,
  ]);
  const assets = pages.flatMap((page) => (Array.isArray(page) ? page : []));
  const required = {};
  for (const name of requiredAssetNames) {
    const matches = assets.filter((asset) => asset?.name === name);
    if (matches.length > 1) {
      required[name] = { status: "conflict", reason: "duplicate_asset_name" };
      continue;
    }
    if (matches.length === 0) {
      required[name] = { status: "missing" };
      continue;
    }
    const asset = matches[0];
    const expected = expectedSubjects[name];
    const classified = classifyReleaseAsset({ asset, expected });
    if (classified.status !== "download_required") {
      required[name] = classified;
      continue;
    }
    const downloaded = downloadAsset(repository, asset.id);
    required[name] = classifyReleaseAsset({
      asset,
      expected,
      downloaded: { bytes: downloaded.length, sha256: digestBuffer(downloaded) },
    });
  }
  return {
    required,
    records: assets,
    unexpectedAssetNames: [
      ...new Set(
        assets
          .map((asset) => asset?.name)
          .filter((name) => typeof name === "string" && !requiredAssetNames.includes(name)),
      ),
    ].sort(),
  };
}

function readPostReleaseEvidence(repository, tag, releaseUpdatedAt) {
  const runs = ghJson([
    "run",
    "list",
    "--repo",
    repository,
    "--workflow",
    POST_RELEASE_EVIDENCE_WORKFLOW,
    "--event",
    "workflow_dispatch",
    "--limit",
    "100",
    "--json",
    "displayTitle,status,conclusion,headBranch,event,createdAt,databaseId,url",
  ]);
  return evidenceRunCoversRelease(selectPostReleaseEvidenceRun(runs, tag), releaseUpdatedAt);
}

function readLatestRelease(repository) {
  const result = commandResult("gh", ["api", `repos/${repository}/releases/latest`], {
    allowFailure: true,
  });
  if (result.status !== 0) {
    if (missingGitHubResource(result)) return null;
    throw new Error(`Could not read latest release: ${(result.stderr ?? "").trim()}`);
  }
  let release;
  try {
    release = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`Latest release response is invalid: ${error.message}`);
  }
  return { id: release.id, tagName: release.tag_name };
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
  for (const subjectPath of Object.entries(subjectPaths)
    .filter(([name]) => name.endsWith(".zip"))
    .map(([, subjectPath]) => subjectPath)) {
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
  const releaseBody = fs.readFileSync(options.notesFile, "utf8");
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
  const subjectBytes = fs.readFileSync(subjectFile);
  expectedSubjects[RELEASE_SUBJECT_FILE] = {
    sha256: digestBuffer(subjectBytes),
    bytes: subjectBytes.length,
  };
  subjectPaths[RELEASE_SUBJECT_FILE] = subjectFile;
  return {
    expectedSubjects,
    subjectPaths,
    expectedRelease: {
      title: options.tag,
      body: releaseBody,
      bodySha256: releaseBodySha256(releaseBody),
      prerelease: false,
    },
  };
}

function observe(options, localSubjects) {
  const requiredAssetNames = releaseAssetNamesForTag(options.tag);
  const tagIdentity = readTagIdentity(options);
  const releaseResult = readMatchingRelease(options);
  let release = null;
  if (releaseResult.release) {
    const remote = releaseResult.release;
    const inspectedAssets = inspectAssets({
      repository: options.repository,
      releaseId: remote.id,
      expectedSubjects: localSubjects.expectedSubjects,
      requiredAssetNames,
    });
    release = {
      id: remote.id,
      tagName: remote.tag_name,
      title: typeof remote.name === "string" ? remote.name : null,
      bodySha256:
        typeof remote.body === "string" || remote.body === null
          ? releaseBodySha256(remote.body ?? "")
          : null,
      prerelease: typeof remote.prerelease === "boolean" ? remote.prerelease : null,
      draft: typeof remote.draft === "boolean" ? remote.draft : null,
      immutable: typeof remote.immutable === "boolean" ? remote.immutable : null,
      stateChangedAt: releaseStateChangedAt(
        { ...remote, assets: inspectedAssets.records },
        requiredAssetNames,
      ),
      assets: inspectedAssets.required,
      unexpectedAssetNames: inspectedAssets.unexpectedAssetNames,
      metadataAssetAddedAfterPublication: releaseAssetCreatedAfterPublication(
        inspectedAssets.records.find((asset) => asset?.name === RELEASE_SUBJECT_FILE),
        remote.published_at,
      ),
      zipAssetsCreatedBeforePublication: RELEASE_ZIP_ASSET_NAMES.every((name) =>
        releaseAssetCreatedBeforePublication(
          inspectedAssets.records.find((asset) => asset?.name === name),
          remote.published_at,
        ),
      ),
    };
  }
  return {
    tagCommit: tagIdentity?.commit ?? null,
    tagAnnotated: tagIdentity?.annotated ?? null,
    release,
    ambiguousRelease: releaseResult.ambiguous,
    latestRelease: readLatestRelease(options.repository),
    requiredAssetNames,
    postReleaseEvidenceDispatched:
      release && !release.draft
        ? readPostReleaseEvidence(options.repository, options.tag, release.stateChangedAt)
        : false,
    attestationStatus: verifyPublishAttestations({
      repository: options.repository,
      releaseSha: options.releaseSha,
      subjectPaths: localSubjects.subjectPaths,
    }),
  };
}

function plan(options, observation, localSubjects) {
  return planReleaseReconciliation({
    tag: options.tag,
    releaseSha: options.releaseSha,
    expectedRelease: localSubjects.expectedRelease,
    ...observation,
  });
}

function executeOperation(operation, observation, options, localSubjects) {
  switch (operation.type) {
    case "create_tag": {
      const tagObject = ghJson([
        "api",
        "--method",
        "POST",
        `repos/${options.repository}/git/tags`,
        "-f",
        `tag=${options.tag}`,
        "-f",
        `message=${options.tag}`,
        "-f",
        `object=${options.releaseSha}`,
        "-f",
        "type=commit",
        "-f",
        "tagger[name]=github-actions[bot]",
        "-f",
        "tagger[email]=41898282+github-actions[bot]@users.noreply.github.com",
      ]);
      if (!/^[0-9a-f]{40}$/.test(tagObject?.sha ?? "")) {
        throw new Error("GitHub did not return an annotated tag object SHA");
      }
      commandResult("gh", [
        "api",
        "--method",
        "POST",
        `repos/${options.repository}/git/refs`,
        "-f",
        `ref=refs/tags/${options.tag}`,
        "-f",
        `sha=${tagObject.sha}`,
      ]);
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
        localSubjects.expectedRelease.title,
        "--notes-file",
        options.notesFile,
      ]);
      return;
    case "update_draft_metadata":
      if (!observation.release?.id || observation.release.draft !== true) {
        throw new Error("Cannot repair metadata without the currently observed draft release");
      }
      commandResult("gh", [
        "api",
        "--method",
        "PATCH",
        `repos/${options.repository}/releases/${observation.release.id}`,
        "-f",
        `name=${localSubjects.expectedRelease.title}`,
        "-f",
        `body=${localSubjects.expectedRelease.body}`,
        "-F",
        "prerelease=false",
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
        "make_latest=true",
      ]);
      return;
    default:
      throw new Error(`Unknown reconciliation operation: ${operation.type}`);
  }
}

function apply(options, localSubjects) {
  const eventName = process.env.GITHUB_EVENT_NAME;
  const manualApply = eventName === "workflow_dispatch" && process.env.RELEASE_DRY_RUN === "false";
  const automaticApply = eventName === "push";
  if ((!manualApply && !automaticApply) || process.env.RELEASE_ENVIRONMENT !== "release") {
    throw new Error(
      "Apply mode requires a release-environment push or workflow_dispatch with dry_run=false",
    );
  }
  if (!releaseMutationAllowed(options.tag)) {
    throw new Error("Apply mode supports only v0.21.0 and newer release tags");
  }

  return applyReleaseReconciliation({
    tag: options.tag,
    releaseSha: options.releaseSha,
    expectedRelease: localSubjects.expectedRelease,
    observe: () => observe(options, localSubjects),
    execute: (operation, observation) =>
      executeOperation(operation, observation, options, localSubjects),
  });
}

function appendGithubOutput(filePath, result) {
  if (!filePath) return;
  const operations = result?.operations?.map((operation) => operation.type).join(",") ?? "";
  const reason = String(result?.reason ?? "").replace(/[\r\n]+/g, " ");
  fs.appendFileSync(
    path.resolve(filePath),
    [
      `status=${result?.status ?? "blocked"}`,
      `reason=${reason}`,
      `requires_attestation=${result?.requiresAttestation === true}`,
      `attestation_verification_required=${result?.attestationVerificationRequired === true}`,
      `release_published=${result?.releasePublished === true}`,
      `post_release_dispatch_required=${result?.postReleaseDispatchRequired === true}`,
      `operations=${operations}`,
    ].join("\n") + "\n",
  );
}

export function runCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const localSubjects = readLocalSubjects(options);
  if (options.mode === "plan") {
    const result = plan(options, observe(options, localSubjects), localSubjects);
    appendGithubOutput(options.githubOutput, result);
    console.log(JSON.stringify(result, null, 2));
    if (result.status === "blocked") process.exitCode = 1;
    return result;
  }
  try {
    const result = apply(options, localSubjects);
    appendGithubOutput(options.githubOutput, result);
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    appendGithubOutput(options.githubOutput, {
      status: "blocked",
      reason: error.message,
      postReleaseDispatchRequired: error.postReleaseDispatchRequired === true,
    });
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    runCli();
  } catch (error) {
    console.error(`GitHub release reconciliation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
