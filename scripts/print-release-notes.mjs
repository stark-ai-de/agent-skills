import fs from "node:fs";
import path from "node:path";

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

function extractReleaseNotes(changelog, version) {
  const lines = changelog.split("\n");
  const headingPattern = new RegExp(`^##\\s+v${version}(\\s|$)`);
  const start = lines.findIndex((line) => headingPattern.test(line));
  if (start === -1) fail(`CHANGELOG.md does not contain a v${version} release section.`);

  const end = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  const body = lines
    .slice(start + 1, end === -1 ? undefined : end)
    .join("\n")
    .trim();
  if (!body) fail(`CHANGELOG.md v${version} release section is empty.`);
  return body;
}

const args = parseArgs(process.argv.slice(2));
if (!args.version) fail("Usage: node scripts/print-release-notes.mjs --version <x.y.z>");
if (!semverPattern.test(args.version))
  fail(`Version must be x.y.z without leading v: ${args.version}`);

const changelogPath = args.changelog ?? path.join(root, "CHANGELOG.md");
const changelog = fs.readFileSync(changelogPath, "utf8");
console.log(extractReleaseNotes(changelog, args.version));
