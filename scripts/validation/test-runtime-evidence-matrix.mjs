import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function requireCondition(condition, message) {
  if (!condition) errors.push(message);
}

const matrix = readJson("docs/runtime-evidence-matrix.json");
const packageJson = readJson("package.json");
const sitePackageJson = readJson("site/package.json");
const pluginSource = readJson("plugins/stark-ai-developer.source.json");

requireCondition(matrix.schemaVersion === 1, "matrix schemaVersion must equal 1");
requireCondition(matrix.advisory === true, "matrix must remain advisory");
requireCondition(
  JSON.stringify(matrix.signalValues) ===
    JSON.stringify(["pass", "fail", "unknown", "not-applicable"]),
  "matrix signalValues must preserve the supported advisory vocabulary",
);
requireCondition(
  Array.isArray(matrix.boundaries) && matrix.boundaries.length > 0,
  "matrix must define boundaries",
);

const allowedSignals = new Set(matrix.signalValues ?? []);
const seenBoundaryIds = new Set();
const seenSurfaces = new Map();

for (const boundary of matrix.boundaries ?? []) {
  requireCondition(
    typeof boundary.id === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(boundary.id),
    "each boundary must have a lower-kebab id",
  );
  requireCondition(!seenBoundaryIds.has(boundary.id), `duplicate boundary id: ${boundary.id}`);
  seenBoundaryIds.add(boundary.id);

  requireCondition(
    Array.isArray(boundary.surfaces) && boundary.surfaces.length > 0,
    `${boundary.id}: surfaces must be non-empty`,
  );
  for (const surface of boundary.surfaces ?? []) {
    requireCondition(
      typeof surface === "string" && surface.length > 0,
      `${boundary.id}: surface must be a non-empty string`,
    );
    if (seenSurfaces.has(surface)) {
      errors.push(`${surface}: classified by both ${seenSurfaces.get(surface)} and ${boundary.id}`);
    } else {
      seenSurfaces.set(surface, boundary.id);
    }
  }

  requireCondition(
    Array.isArray(boundary.candidates) && boundary.candidates.length > 0,
    `${boundary.id}: candidates must be non-empty`,
  );
  const candidateIds = new Set();
  for (const candidate of boundary.candidates ?? []) {
    requireCondition(
      typeof candidate.id === "string" && candidate.id.length > 0,
      `${boundary.id}: candidate id must be non-empty`,
    );
    requireCondition(
      !candidateIds.has(candidate.id),
      `${boundary.id}: duplicate candidate ${candidate.id}`,
    );
    candidateIds.add(candidate.id);
    const signalEntries = Object.entries(candidate.signals ?? {});
    requireCondition(signalEntries.length > 0, `${boundary.id}/${candidate.id}: signals required`);
    for (const [signal, value] of signalEntries) {
      requireCondition(signal.length > 0, `${boundary.id}/${candidate.id}: signal name required`);
      requireCondition(
        allowedSignals.has(value),
        `${boundary.id}/${candidate.id}/${signal}: unsupported signal ${value}`,
      );
    }
  }

  requireCondition(
    candidateIds.has(boundary.winner),
    `${boundary.id}: winner must identify a declared candidate`,
  );
  requireCondition(
    Array.isArray(boundary.evidenceRefs) &&
      boundary.evidenceRefs.length > 0 &&
      boundary.evidenceRefs.every((entry) => typeof entry === "string" && entry.length > 0),
    `${boundary.id}: evidenceRefs must be non-empty`,
  );
  requireCondition(
    typeof boundary.rationale === "string" && boundary.rationale.length > 0,
    `${boundary.id}: rationale required`,
  );
  requireCondition(
    typeof boundary.revisit === "string" && boundary.revisit.length > 0,
    `${boundary.id}: revisit trigger required`,
  );
  requireCondition(
    Array.isArray(boundary.fallbackOrder) &&
      boundary.fallbackOrder.length > 0 &&
      boundary.fallbackOrder[0] === boundary.winner &&
      boundary.fallbackOrder.every((candidate) => candidateIds.has(candidate)),
    `${boundary.id}: fallbackOrder must start with the winner and use declared candidates`,
  );
}

const requiredSurfaces = new Set([
  "package:root:bun-default",
  "package:root:validate-memory-curators",
  "internal:validate-scripts:syntax-check",
  "package:root:native-oxc",
  "package:root:pnpm-orchestration",
  "package:site:bun",
  "ci:current:bun",
  "ci:historical-tag:node",
  "transient:skills-cli:pnpm-dlx",
  "deployable:bun-server-artifact",
]);
requireCondition(
  seenSurfaces.size === requiredSurfaces.size &&
    [...requiredSurfaces].every((surface) => seenSurfaces.has(surface)),
  "matrix surfaces must equal the complete current runtime-selection inventory",
);

requireCondition(
  packageJson.packageManager === `pnpm@${matrix.toolchain.pnpm}`,
  "packageManager must match matrix.toolchain.pnpm",
);
requireCondition(
  packageJson.engines?.node === `>=${matrix.toolchain.node}`,
  "engines.node must match matrix.toolchain.node",
);
requireCondition(
  packageJson.engines?.bun === `>=${matrix.toolchain.bun}`,
  "engines.bun must match matrix.toolchain.bun",
);
requireCondition(read(".node-version").trim() === matrix.toolchain.node, ".node-version drifted");
requireCondition(read(".bun-version").trim() === matrix.toolchain.bun, ".bun-version drifted");
requireCondition(
  pluginSource.build.nodeVersion === matrix.toolchain.node &&
    pluginSource.build.bunVersion === matrix.toolchain.bun &&
    pluginSource.build.pnpmVersion === matrix.toolchain.pnpm,
  "release descriptor toolchain must match the matrix",
);

const bunfig = read("bunfig.toml");
requireCondition(/^env = false$/m.test(bunfig), "bunfig.toml must disable environment loading");
requireCondition(
  /^\[install\]\nauto = "disable"$/m.test(bunfig),
  "bunfig.toml must disable automatic installation",
);

for (const forbiddenLock of [
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
]) {
  requireCondition(
    !fs.existsSync(path.join(repositoryRoot, forbiddenLock)),
    `${forbiddenLock} is forbidden`,
  );
}
requireCondition(
  fs.existsSync(path.join(repositoryRoot, "pnpm-lock.yaml")),
  "pnpm-lock.yaml is required",
);

const nativeScripts = new Set(["format", "format:check", "lint", "lint:fix"]);
const nodeScripts = new Set(["validate:memory-curators"]);
const pnpmScripts = new Set(["validate:site"]);
for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
  if (nativeScripts.has(name)) {
    requireCondition(/^(?:oxfmt|oxlint)\b/.test(command), `${name}: native Oxc command drifted`);
  } else if (nodeScripts.has(name)) {
    requireCondition(
      /^node\b/.test(command),
      `${name}: must remain the evidenced Node.js fallback`,
    );
  } else if (pnpmScripts.has(name)) {
    requireCondition(
      command === "pnpm --filter ./site run build",
      `${name}: must delegate through explicit pnpm workspace orchestration`,
    );
  } else {
    requireCondition(
      /^(?:bun --bun\b|bun exec ")/.test(command),
      `${name}: JavaScript/TypeScript tooling must select Bun inside the script`,
    );
  }
}
requireCondition(
  packageJson.scripts.validate.includes("pnpm run validate:runtime-matrix"),
  "validate aggregate must own validate:runtime-matrix",
);

const expectedSiteScripts = {
  build: 'bun exec "bun --bun astro build && bun --bun scripts/validate-seo.mjs"',
  dev: "bun --bun astro dev",
  preview: "bun --bun astro preview",
  "validate:seo": "bun --bun scripts/validate-seo.mjs",
};
requireCondition(
  JSON.stringify(sitePackageJson.scripts) === JSON.stringify(expectedSiteScripts),
  "site package scripts must match the Bun-selected Astro boundary",
);
requireCondition(
  sitePackageJson.dependencies?.astro === "^7.2.7",
  "site Astro floor must equal ^7.2.7",
);

const currentAutomation = [
  ".github/workflows/validate.yml",
  ".github/workflows/pages.yml",
  ".github/workflows/openai-directory.yml",
  ".github/workflows/publish-release.yml",
  ".github/workflows/attest-release.yml",
  ".github/actions/build-release-subjects/action.yml",
  ".github/actions/verify-openai-directory/action.yml",
];
for (const relativePath of currentAutomation) {
  const text = read(relativePath);
  requireCondition(!/\bnpm run\b/.test(text), `${relativePath}: npm run is no longer current`);
  requireCondition(
    !/\bnpx skills@latest\b/.test(text),
    `${relativePath}: unpinned npx skills is no longer current`,
  );
  requireCondition(
    !/\bnode scripts\//.test(text),
    `${relativePath}: current scripts must select Bun`,
  );
  if (relativePath.startsWith(".github/workflows/") && /\bbun\b/.test(text)) {
    requireCondition(
      text.includes("oven-sh/setup-bun@v2") && text.includes('bun-version-file: ".bun-version"'),
      `${relativePath}: Bun use requires the repository version file setup`,
    );
  }
}

const lockfile = read("pnpm-lock.yaml");
requireCondition(lockfile.includes("astro@7.2.7"), "pnpm lockfile must resolve Astro 7.2.7");
requireCondition(lockfile.includes("vite@8.2.2"), "pnpm lockfile must resolve Vite 8.2.2");

const historicalAction = read(".github/actions/post-release-subjects/action.yml");
const historicalWorkflow = read(".github/workflows/post-release-evidence.yml");
requireCondition(
  historicalAction.includes('node "$RUNNER_TEMP/post-release-contract/scripts/release/'),
  "historical post-release action must retain its captured Node.js contract",
);
requireCondition(
  historicalWorkflow.includes("node scripts/release/"),
  "historical post-release workflow must retain its Node.js receipt contract",
);

const smokeInstall = read("scripts/repo/smoke-install.mjs");
requireCondition(
  smokeInstall.includes('"dlx", "skills@1.5.23"'),
  "smoke install must use pnpm dlx skills@1.5.23",
);
requireCondition(
  read(".github/workflows/validate.yml").includes("pnpm dlx skills@1.5.23 add ./skills --list"),
  "hosted public-skill listing must use the pinned pnpm transient boundary",
);

if (errors.length > 0) {
  console.error("Runtime evidence matrix validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Runtime evidence matrix passed (${matrix.boundaries.length} boundaries; unknown signals remain advisory).`,
  );
}
