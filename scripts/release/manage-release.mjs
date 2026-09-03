#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  evidenceRunCoversRelease,
  POST_RELEASE_EVIDENCE_WORKFLOW,
  postReleaseEvidenceTitle,
  releaseStateChangedAt,
  selectPostReleaseEvidenceRun,
} from "../lib/post-release-evidence.mjs";
import { resolveTagCommit } from "../lib/github-release-reconciliation.mjs";
import {
  approvalRunErrors,
  missingReleasePleaseLifecycleLabels,
} from "../lib/release-management.mjs";
import { githubRepositorySlug, readRepoPackage } from "../lib/release-descriptor.mjs";
import { validateReleaseEnvironment } from "./check-release-environment.mjs";

const root = process.cwd();
const MUTATING_COMMANDS = new Set([
  "release-pr",
  "publish-plan",
  "publish",
  "approve",
  "post-release",
]);

function argument(argv, name) {
  const index = argv.indexOf(name);
  const value = index === -1 ? null : (argv[index + 1] ?? null);
  return value && !value.startsWith("--") ? value : null;
}

function commandResult(command, args, { input, allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    input,
    stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr.trim()}`);
  }
  return result;
}

function ghJson(args) {
  const result = commandResult("gh", args);
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`GitHub returned invalid JSON: ${error.message}`);
  }
}

function repositorySlug() {
  const slug = githubRepositorySlug(readRepoPackage(root));
  if (!slug) throw new Error("package.json must declare a GitHub repository URL");
  return slug;
}

function requireConfirmation(command, argv) {
  if (MUTATING_COMMANDS.has(command) && !argv.includes("--confirm")) {
    throw new Error(`${command} dispatches or approves hosted state; rerun with --confirm`);
  }
}

function validateTag(tag) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag ?? "")) {
    throw new Error("--tag must use vX.Y.Z");
  }
  return tag;
}

function runWorkflow(repository, workflow, fields = []) {
  const args = ["workflow", "run", workflow, "--repo", repository, "--ref", "main"];
  for (const [name, value] of fields) args.push("-f", `${name}=${value}`);
  commandResult("gh", args);
  console.log(`Dispatched ${workflow} with ref main.`);
}

function status(repository) {
  const release = ghJson([
    "release",
    "list",
    "--repo",
    repository,
    "--limit",
    "5",
    "--json",
    "tagName,isLatest,isDraft,publishedAt",
  ]);
  const workflows = {};
  for (const workflow of [
    "release-please.yml",
    "publish-release.yml",
    "post-release-evidence.yml",
  ]) {
    workflows[workflow] = ghJson([
      "run",
      "list",
      "--repo",
      repository,
      "--workflow",
      workflow,
      "--limit",
      "3",
      "--json",
      "databaseId,status,conclusion,headSha,event,createdAt,url",
    ]);
  }
  console.log(JSON.stringify({ repository, release, workflows }, null, 2));
}

function setupCheck(repository) {
  for (const workflow of [
    ".github/workflows/release-please.yml",
    ".github/workflows/publish-release.yml",
    ".github/workflows/post-release-evidence.yml",
  ]) {
    if (!fs.existsSync(path.join(root, workflow))) throw new Error(`${workflow} is missing`);
  }
  const variable = ghJson(["api", `repos/${repository}/actions/variables/RELEASE_PLEASE_APP_ID`]);
  if (variable.name !== "RELEASE_PLEASE_APP_ID" || !String(variable.value ?? "").trim()) {
    throw new Error("RELEASE_PLEASE_APP_ID repository variable is missing");
  }
  const secrets = ghJson([
    "api",
    "--paginate",
    "--slurp",
    `repos/${repository}/actions/secrets?per_page=100`,
  ]).flatMap((page) => page?.secrets ?? []);
  if (!secrets.some((secret) => secret.name === "RELEASE_PLEASE_APP_PRIVATE_KEY")) {
    throw new Error("RELEASE_PLEASE_APP_PRIVATE_KEY repository secret is missing");
  }
  const labels = ghJson([
    "api",
    "--paginate",
    "--slurp",
    `repos/${repository}/labels?per_page=100`,
  ]).flatMap((page) => (Array.isArray(page) ? page : []));
  const missingLabels = missingReleasePleaseLifecycleLabels(labels);
  if (missingLabels.length > 0) {
    throw new Error(`Release Please lifecycle labels are missing: ${missingLabels.join(", ")}`);
  }
  const environment = ghJson(["api", `repos/${repository}/environments/release`]);
  const branch = ghJson(["api", `repos/${repository}/branches/main`]);
  const branchPolicies = ghJson([
    "api",
    `repos/${repository}/environments/release/deployment-branch-policies?per_page=100`,
  ]);
  const environmentErrors = validateReleaseEnvironment(environment, branch, branchPolicies);
  if (environmentErrors.length > 0) {
    throw new Error(`Release environment preflight failed: ${environmentErrors.join("; ")}`);
  }
  console.log(
    "Release setup is present: App variable, private-key secret, Release Please lifecycle labels, required reviewer, a single custom main branch policy, protected main, and disabled admin bypass. Confirm the App installation still grants only Contents, Pull requests, and Issues write with no webhooks.",
  );
}

function nextVersion(version, kind) {
  const [major, minor, patch] = version.split(".").map(Number);
  if (kind === "patch") return `${major}.${minor}.${patch + 1}`;
  if (kind === "minor") return `${major}.${minor + 1}.0`;
  if (major === 0) return `0.${minor + 1}.0`;
  return `${major + 1}.0.0`;
}

function impact(argv) {
  const kind = argument(argv, "--kind");
  if (!new Set(["patch", "minor", "breaking"]).has(kind)) {
    throw new Error("impact requires --kind patch|minor|breaking");
  }
  const skill = argument(argv, "--skill");
  if (!skill) {
    console.log(
      `Catalog impact: ${kind}. Use a Conventional Commit that reflects this impact; Release Please will compute the root version without changing it in the feature PR.`,
    );
    return;
  }
  const candidates = [
    ...fs.globSync(`skills/*/${skill}/SKILL.md`, { cwd: root }),
    ...fs.globSync(`incubator/skills/*/${skill}/SKILL.md`, { cwd: root }),
  ];
  if (candidates.length !== 1) throw new Error(`--skill must identify exactly one skill: ${skill}`);
  const text = fs.readFileSync(path.join(root, candidates[0]), "utf8");
  const version = text.match(/^\s+version:\s*["']?(\d+\.\d+\.\d+)["']?$/m)?.[1];
  if (!version) throw new Error(`${candidates[0]} has no valid metadata.version`);
  console.log(`${skill}: ${version} -> ${nextVersion(version, kind)} (${kind}); no files changed.`);
}

function approve(repository, argv) {
  const runId = argument(argv, "--run-id");
  if (!/^\d+$/.test(runId ?? "")) throw new Error("approve requires numeric --run-id");
  const run = ghJson(["api", `repos/${repository}/actions/runs/${runId}`]);
  if (!/^[0-9a-f]{40}$/.test(run?.head_sha ?? "")) {
    throw new Error("Refusing deployment approval: run SHA is invalid");
  }
  const main = ghJson(["api", `repos/${repository}/branches/main`]);
  const mainSha = main?.commit?.sha;
  if (!/^[0-9a-f]{40}$/.test(mainSha ?? "")) {
    throw new Error("Refusing deployment approval: main SHA is invalid");
  }
  const comparison = ghJson(["api", `repos/${repository}/compare/${run.head_sha}...${mainSha}`]);
  const containment = { branch: main, comparison };
  const runErrors = approvalRunErrors(run, containment);
  if (runErrors.length > 0) {
    throw new Error(`Refusing deployment approval: ${runErrors.join("; ")}`);
  }
  const variable = ghJson(["api", `repos/${repository}/actions/variables/RELEASE_PLEASE_APP_ID`]);
  const provenance = commandResult(process.execPath, [
    path.join(root, "scripts/release/verify-release-please-merge.mjs"),
    "--repository",
    repository,
    "--commit",
    run.head_sha,
    "--expected-app-id",
    String(variable.value ?? ""),
    "--json",
  ]);
  let candidate;
  try {
    candidate = JSON.parse(provenance.stdout);
  } catch {
    throw new Error("Refusing deployment approval: release candidate provenance is invalid");
  }
  if (candidate.authorized !== true || !/^\d+$/.test(String(candidate.pullRequest ?? ""))) {
    throw new Error("Refusing deployment approval: run SHA is not an App-owned release candidate");
  }
  const pending = ghJson([
    "api",
    `repos/${repository}/actions/runs/${runId}/pending_deployments`,
  ]).filter((deployment) => deployment?.environment?.name === "release");
  if (pending.length !== 1) {
    throw new Error(`run ${runId} must have exactly one pending release deployment`);
  }
  const payload = JSON.stringify({
    environment_ids: [pending[0].environment.id],
    state: "approved",
    comment: "Approved through the repository release:manage surface.",
  });
  commandResult(
    "gh",
    [
      "api",
      "--method",
      "POST",
      `repos/${repository}/actions/runs/${runId}/pending_deployments`,
      "--input",
      "-",
    ],
    { input: payload },
  );
  console.log(
    `Approved Publish Release run ${runId} for PR #${candidate.pullRequest} at ${run.head_sha} on main.`,
  );
}

function remoteTagIdentity(repository, tag) {
  const reference = ghJson(["api", `repos/${repository}/git/ref/tags/${encodeURIComponent(tag)}`]);
  const annotated = reference?.object?.type === "tag";
  const commit = resolveTagCommit(
    reference?.object,
    (tagObjectSha) => ghJson(["api", `repos/${repository}/git/tags/${tagObjectSha}`]).object,
  );
  return { annotated, commit };
}

function releaseSubjectAsset(repository, asset) {
  const result = commandResult("gh", [
    "api",
    "-H",
    "Accept: application/octet-stream",
    `repos/${repository}/releases/assets/${asset.id}`,
  ]);
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error("release-subject.json is not valid JSON");
  }
}

function openAiHandoff(repository, tag) {
  const release = ghJson(["api", `repos/${repository}/releases/latest`]);
  const assetPages = Number.isInteger(release.id)
    ? ghJson([
        "api",
        "--paginate",
        "--slurp",
        `repos/${repository}/releases/${release.id}/assets?per_page=100`,
      ])
    : [];
  const releaseAssets = assetPages.flatMap((page) => (Array.isArray(page) ? page : []));
  const assetNames = releaseAssets
    .map((asset) => asset?.name)
    .filter(Boolean)
    .sort();
  const required = ["openai.zip", "portable.zip", "release-subject.json"].sort();
  const stateChangedAt = releaseStateChangedAt({ ...release, assets: releaseAssets }, required);
  const tagIdentity = remoteTagIdentity(repository, tag);
  const subjectAsset = releaseAssets.find((asset) => asset?.name === "release-subject.json");
  const subject = subjectAsset ? releaseSubjectAsset(repository, subjectAsset) : null;
  if (
    release.tag_name !== tag ||
    release.draft !== false ||
    release.prerelease !== false ||
    !stateChangedAt ||
    JSON.stringify(assetNames) !== JSON.stringify(required) ||
    tagIdentity.annotated !== true ||
    subject?.sourceRevision?.commit !== tagIdentity.commit ||
    subject?.sourceRevision?.state !== "clean" ||
    subject?.releaseVersion !== tag.slice(1) ||
    subject?.status !== "pass"
  ) {
    throw new Error(
      `${tag} is not an annotated, revision-bound latest release with all three direct assets`,
    );
  }
  const evidenceRuns = ghJson([
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
    "displayTitle,status,conclusion,headBranch,event,createdAt,url",
  ]);
  const evidence = selectPostReleaseEvidenceRun(evidenceRuns, tag, { requireSuccess: true });
  if (!evidenceRunCoversRelease(evidence, stateChangedAt, { requireSuccess: true })) {
    throw new Error(
      `${tag} requires a successful exact-tag Post-release Evidence run after the latest release update`,
    );
  }
  console.log(
    [
      `${postReleaseEvidenceTitle(tag)} passed at ${evidence.url}.`,
      `${tag} is ready for the manual OpenAI handoff: ${release.html_url}`,
      `Download exact asset: gh release download ${tag} --repo ${repository} --pattern openai.zip`,
      "Portal checks: verify all six skill icons; restore portal glyphs if package metadata is ignored; upload site/public/logo.png as the light Plugin Info logo; upload site/public/logo-dark.png as the dark Plugin Info logo and Composer icon; verify light/dark rendering and directory identity after propagation.",
    ].join("\n"),
  );
}

function usage() {
  return [
    "Usage: pnpm run release:manage -- <command>",
    "Commands: status | setup-check | impact --kind patch|minor|breaking [--skill name] | release-pr --confirm | publish-plan --confirm | publish --confirm | approve --run-id id --confirm | post-release --tag vX.Y.Z --confirm | openai-handoff --tag vX.Y.Z",
  ].join("\n");
}

try {
  const argv = process.argv.slice(2);
  const command = argv[0];
  if (!command) throw new Error(usage());
  requireConfirmation(command, argv);
  const repository = repositorySlug();
  switch (command) {
    case "status":
      status(repository);
      break;
    case "setup-check":
      setupCheck(repository);
      break;
    case "impact":
      impact(argv.slice(1));
      break;
    case "release-pr":
      runWorkflow(repository, "release-please.yml");
      break;
    case "publish-plan":
      runWorkflow(repository, "publish-release.yml", [["dry_run", "true"]]);
      break;
    case "publish":
      runWorkflow(repository, "publish-release.yml", [["dry_run", "false"]]);
      break;
    case "approve":
      approve(repository, argv.slice(1));
      break;
    case "post-release":
      runWorkflow(repository, "post-release-evidence.yml", [
        ["tag", validateTag(argument(argv, "--tag"))],
      ]);
      break;
    case "openai-handoff":
      openAiHandoff(repository, validateTag(argument(argv, "--tag")));
      break;
    default:
      throw new Error(`Unknown release management command: ${command}\n${usage()}`);
  }
} catch (error) {
  console.error(`Release management failed: ${error.message}`);
  process.exitCode = 1;
}
