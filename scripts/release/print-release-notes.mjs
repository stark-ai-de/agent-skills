import fs from "node:fs";
import path from "node:path";

import { extractChangelogReleaseNotes } from "../lib/release-changelog.mjs";

const root = process.cwd();
const semverPattern = /^\d+\.\d+\.\d+$/;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--version") {
      args.version = argv[i + 1];
      i += 1;
    } else if (arg === "--changelog") {
      args.changelog = argv[i + 1];
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function packageVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  return pkg.version;
}

function extractReleaseNotes(changelog, version) {
  const body = extractChangelogReleaseNotes(changelog, version);
  if (body === null) fail(`CHANGELOG.md does not contain a ${version} release section.`);
  if (!body) fail(`CHANGELOG.md v${version} release section is empty.`);
  return body;
}

const args = parseArgs(process.argv.slice(2));
args.version ??= packageVersion();
if (!semverPattern.test(args.version))
  fail(`Version must be x.y.z without leading v: ${args.version}`);

const changelogPath = args.changelog ?? path.join(root, "CHANGELOG.md");
const changelog = fs.readFileSync(changelogPath, "utf8");
console.log(extractReleaseNotes(changelog, args.version));
