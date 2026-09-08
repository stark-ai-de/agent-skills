#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import process from "node:process";

import { isGeneratedReleaseMerge } from "../lib/release-please.mjs";

function git(args, allowFailure = false) {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trimEnd();
  } catch (error) {
    if (allowFailure) return null;
    throw error;
  }
}

let skip = false;
const beforeSha = process.env.BEFORE_SHA ?? "";
if (
  process.env.EVENT_NAME === "push" &&
  beforeSha &&
  git(["cat-file", "-e", `${beforeSha}^{commit}`], true) !== null
) {
  const changedFiles = git(["diff", "--name-only", beforeSha, "HEAD"])
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean);
  skip = isGeneratedReleaseMerge({
    changedFiles,
    associatedTitles: (process.env.ASSOCIATED_TITLES ?? "")
      .split("\n")
      .map((title) => title.trim())
      .filter(Boolean),
    commitTitle: process.env.COMMIT_TITLE ?? "",
  });
}

if (process.argv.includes("--github-output")) {
  if (!process.env.GITHUB_OUTPUT) throw new Error("GITHUB_OUTPUT is required");
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `skip=${skip}\n`);
}
console.log(skip ? "Skipping the merged generated release PR." : "Release Please may run.");
