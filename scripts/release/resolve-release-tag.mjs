#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const HISTORICAL_RELEASES = {
  "v0.19.1": "35101f206b2416b2ac5a5fb7205fdd65c3f843b1",
};

function argument(argv, name) {
  const index = argv.indexOf(name);
  const value = index === -1 ? null : (argv[index + 1] ?? null);
  return value && !value.startsWith("--") ? value : null;
}

function parseArgs(argv) {
  const tag = argument(argv, "--tag") ?? process.env.RELEASE_TAG;
  const githubOutputValue = argument(argv, "--github-output");
  if (!tag || !githubOutputValue) {
    throw new Error("Usage: resolve-release-tag.mjs --tag <vX.Y.Z> --github-output <path>");
  }
  return { tag, githubOutput: path.resolve(githubOutputValue) };
}

function git(args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function appendOutput(filePath, name, value) {
  fs.appendFileSync(filePath, `${name}=${value}\n`);
}

try {
  const { tag, githubOutput } = parseArgs(process.argv.slice(2));
  if (!/^v\d+\.\d+\.\d+$/.test(tag)) {
    throw new Error(`Refusing non-release tag: ${tag}`);
  }

  git(["fetch", "--force", "origin", `refs/tags/${tag}:refs/tags/${tag}`]);
  git(["checkout", "--detach", `refs/tags/${tag}`]);

  const releaseSha = git(["rev-parse", `refs/tags/${tag}^{commit}`]);
  if (!/^[0-9a-f]{40}$/.test(releaseSha)) {
    throw new Error(`Could not resolve a commit for ${tag}`);
  }
  if (git(["status", "--porcelain", "--untracked-files=all"])) {
    throw new Error("Release tag checkout is not clean");
  }
  if (HISTORICAL_RELEASES[tag] && HISTORICAL_RELEASES[tag] !== releaseSha) {
    throw new Error(`${tag} does not point to its pinned historical commit`);
  }

  appendOutput(githubOutput, "release_sha", releaseSha);
  console.log(`Checked out ${tag} at ${releaseSha}`);
} catch (error) {
  console.error(`Release tag resolution failed: ${error.message}`);
  process.exitCode = 1;
}
