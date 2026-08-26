import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const semverPattern = /^\d+\.\d+\.\d+$/;

function parseArgs(argv) {
  const args = { dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--version") {
      args.version = argv[i + 1];
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

function writeIfChanged(file, next, changed, dryRun) {
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  if (current === next) return;

  changed.push(path.relative(root, file));
  if (!dryRun) fs.writeFileSync(file, next);
}

function updatePackageVersion(version, changed, dryRun) {
  const file = path.join(root, "package.json");
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
  if (semverPattern.test(pkg.version) && compareSemver(version, pkg.version) < 0) {
    fail(
      `Release version ${version} must not be lower than current package version ${pkg.version}.`,
    );
  }
  pkg.version = version;
  writeIfChanged(file, `${JSON.stringify(pkg, null, 2)}\n`, changed, dryRun);
}

function compareSemver(a, b) {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return 0;
}

function releaseDate() {
  return process.env.RELEASE_DATE ?? new Date().toISOString().slice(0, 10);
}

function updateChangelog(version, changed, dryRun) {
  const file = path.join(root, "CHANGELOG.md");
  const text = fs.readFileSync(file, "utf8");
  if (new RegExp(`^##\\s+v${version}(\\s|$)`, "m").test(text)) return;

  const heading = "## Unreleased\n";
  const start = text.indexOf(heading);
  if (start === -1) fail("CHANGELOG.md must contain a '## Unreleased' section.");

  const bodyStart = start + heading.length;
  const rest = text.slice(bodyStart);
  const nextRelease = rest.search(/^##\s+/m);
  const bodyEnd = nextRelease === -1 ? text.length : bodyStart + nextRelease;
  const unreleasedBody = text.slice(bodyStart, bodyEnd).trim();
  const emptyUnreleased = [
    "## Unreleased",
    "",
    "### Added",
    "",
    "### Changed",
    "",
    "### Fixed",
    "",
    "### Deprecated",
    "",
    "### Removed",
  ].join("\n");
  const releaseBody = /^-\s+/m.test(unreleasedBody) ? unreleasedBody : "- No changes recorded.";
  const releaseBlock = `## v${version} - ${releaseDate()}\n\n${releaseBody}`;
  const followingReleases = text.slice(bodyEnd).replace(/^\n+/, "");
  const next = `${text.slice(0, start)}${emptyUnreleased}\n\n${releaseBlock}\n\n${followingReleases}`;

  writeIfChanged(file, next, changed, dryRun);
}

const args = parseArgs(process.argv.slice(2));
if (!args.version) fail("Usage: pnpm run release:prepare -- --version <x.y.z> [--dry-run]");
if (!semverPattern.test(args.version))
  fail(`Version must be x.y.z without leading v: ${args.version}`);

const changed = [];
updatePackageVersion(args.version, changed, args.dryRun);
updateChangelog(args.version, changed, args.dryRun);

if (changed.length === 0) {
  console.log(`Release v${args.version} is already prepared.`);
} else if (args.dryRun) {
  console.log(`Dry run would update:\n${changed.map((file) => `- ${file}`).join("\n")}`);
} else {
  console.log(
    `Prepared release v${args.version}:\n${changed.map((file) => `- ${file}`).join("\n")}`,
  );
}
