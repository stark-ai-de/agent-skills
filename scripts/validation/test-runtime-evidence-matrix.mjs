import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const errors = [];
const nativeRootScripts = new Set(["format", "format:check", "lint", "lint:fix"]);
const internalNodeOwners = new Map([
  ["scripts/repo/validate-scripts.mjs", "internal:validate-scripts:syntax-check"],
  [
    "scripts/validation/drawio-diagrams/validate-fixtures.mjs",
    "internal:validate-drawio:node-children",
  ],
]);
const historicalAutomationOwners = new Map([
  [
    ".github/actions/post-release-subjects/action.yml",
    {
      surface: "ci:historical-tag:node",
      requiredText: 'node "$RUNNER_TEMP/post-release-contract/scripts/release/',
    },
  ],
  [
    ".github/workflows/post-release-evidence.yml",
    {
      surface: "ci:historical-tag:node",
      requiredText: "node scripts/release/",
    },
  ],
]);
const explicitNodeSelector =
  /\b(?:spawnSync|spawn|execFileSync|execFile|check|resolveCommandPath)\s*\(\s*["']node["']/s;
const explicitAutomationNode = /\bnode[ \t]+(?=["'$./-]|[A-Za-z0-9_])/;

function read(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function requireCondition(condition, message) {
  if (!condition) errors.push(message);
}

function walkRelativeFiles(relativeDirectory, predicate) {
  const files = [];
  const start = path.join(repositoryRoot, relativeDirectory);
  if (!fs.existsSync(start)) return files;

  function visit(directory) {
    for (const entry of fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (entry.isFile()) {
        const relativePath = path.relative(repositoryRoot, absolutePath).split(path.sep).join("/");
        if (predicate(relativePath)) files.push(relativePath);
      }
    }
  }

  visit(start);
  return files;
}

function automationSources() {
  const workflows = walkRelativeFiles(".github/workflows", (relativePath) =>
    /\.ya?ml$/.test(relativePath),
  );
  const actions = walkRelativeFiles(".github/actions", (relativePath) =>
    /\/action\.ya?ml$/.test(relativePath),
  );
  return [...workflows, ...actions]
    .sort()
    .map((relativePath) => ({ relativePath, text: read(relativePath) }));
}

function scriptSources() {
  return walkRelativeFiles("scripts", (relativePath) => relativePath.endsWith(".mjs")).map(
    (relativePath) => ({ relativePath, text: read(relativePath) }),
  );
}

function discoverPackageScriptSurfaces(rootScripts, siteScripts) {
  const findings = [];
  const occurrences = [];

  for (const name of nativeRootScripts) {
    if (typeof rootScripts[name] !== "string" || !/^(?:oxfmt|oxlint)\b/.test(rootScripts[name])) {
      findings.push(`${name}: native Oxc command drifted`);
    }
  }
  if (!/^node\b/.test(rootScripts["validate:memory-curators"] ?? "")) {
    findings.push("validate:memory-curators must remain the evidenced Node.js fallback");
  }
  if (rootScripts["validate:site"] !== "pnpm --filter ./site run build") {
    findings.push("validate:site must delegate through explicit pnpm workspace orchestration");
  }

  for (const [name, command] of Object.entries(rootScripts)) {
    let surface;
    if (/^(?:oxfmt|oxlint)\b/.test(command)) {
      surface = "package:root:native-oxc";
    } else if (name === "validate:memory-curators" && /^node\b/.test(command)) {
      surface = "package:root:validate-memory-curators";
    } else if (name === "validate:site" && /^pnpm\b/.test(command)) {
      surface = "package:root:pnpm-orchestration";
    } else if (/^(?:bun --bun\b|bun exec ")/.test(command)) {
      surface = "package:root:bun-default";
    } else {
      findings.push(`package.json#scripts.${name}: unclassified runtime command: ${command}`);
    }
    if (surface) occurrences.push({ source: `package.json#scripts.${name}`, surface });
  }

  for (const [name, command] of Object.entries(siteScripts)) {
    if (!/^(?:bun --bun\b|bun exec ")/.test(command)) {
      findings.push(`site/package.json#scripts.${name}: site tooling must select Bun`);
    } else {
      occurrences.push({
        source: `site/package.json#scripts.${name}`,
        surface: "package:site:bun",
      });
    }
  }

  return { errors: findings, occurrences };
}

function discoverAutomationSurfaces(sources) {
  const findings = [];
  const occurrences = [];
  const discoveredPaths = new Set(sources.map(({ relativePath }) => relativePath));

  for (const [relativePath, owner] of historicalAutomationOwners) {
    if (!discoveredPaths.has(relativePath)) {
      findings.push(`${relativePath}: historical runtime owner is missing`);
      continue;
    }
    const source = sources.find((candidate) => candidate.relativePath === relativePath);
    if (!source.text.includes(owner.requiredText)) {
      findings.push(`${relativePath}: historical Node.js contract drifted`);
    }
  }

  for (const { relativePath, text } of sources) {
    const historicalOwner = historicalAutomationOwners.get(relativePath);
    const hasExplicitNode = explicitAutomationNode.test(text);
    const hasBunCommand = /\bbun[ \t]+(?:--bun|exec)\b/.test(text);
    const hasPnpmExecution = /\bpnpm[ \t]+(?:run|--filter)\b/.test(text);

    if (historicalOwner) {
      if (!hasExplicitNode) {
        findings.push(`${relativePath}: historical Node.js owner must select Node explicitly`);
      } else {
        occurrences.push({ source: relativePath, surface: historicalOwner.surface });
      }
      continue;
    }

    if (/\bnpm run\b/.test(text)) findings.push(`${relativePath}: npm run is no longer current`);
    if (/\bnpx skills@latest\b/.test(text)) {
      findings.push(`${relativePath}: unpinned npx skills is no longer current`);
    }
    if (hasExplicitNode) {
      findings.push(`${relativePath}: unclassified explicit Node.js automation owner`);
    }
    if (hasBunCommand || hasPnpmExecution) {
      occurrences.push({ source: relativePath, surface: "ci:current:bun" });
    }
    if (relativePath.startsWith(".github/workflows/") && (hasBunCommand || hasPnpmExecution)) {
      if (
        !text.includes("oven-sh/setup-bun@v2") ||
        !text.includes('bun-version-file: ".bun-version"')
      ) {
        findings.push(
          `${relativePath}: Bun-selected execution requires the repository version file setup`,
        );
      }
    }
  }

  return { errors: findings, occurrences };
}

function discoverInternalNodeSurfaces(sources, owners = internalNodeOwners) {
  const findings = [];
  const occurrences = [];
  const matchedOwners = new Set();

  for (const { relativePath, text } of sources) {
    if (!explicitNodeSelector.test(text)) continue;
    const surface = owners.get(relativePath);
    if (!surface) {
      findings.push(`${relativePath}: unclassified explicit Node.js script owner`);
      continue;
    }
    matchedOwners.add(relativePath);
    occurrences.push({ source: relativePath, surface });
  }

  for (const relativePath of owners.keys()) {
    if (!matchedOwners.has(relativePath)) {
      findings.push(`${relativePath}: registered Node.js owner no longer selects Node explicitly`);
    }
  }

  return { errors: findings, occurrences };
}

function winnerContradictionErrors(boundary) {
  const winner = (boundary.candidates ?? []).find((candidate) => candidate.id === boundary.winner);
  const signals = Object.values(winner?.signals ?? {});
  return signals.length > 0 && signals.every((value) => value === "fail")
    ? [`${boundary.id}/${boundary.winner}: winner cannot have only failing signals`]
    : [];
}

function negativeFixtureErrors() {
  const findings = [];
  const allFailBoundary = {
    id: "all-fail-fixture",
    winner: "bun",
    candidates: [{ id: "bun", signals: { local: "fail", hosted: "fail" } }],
  };
  if (winnerContradictionErrors(allFailBoundary).length === 0) {
    findings.push("all-fail winner fixture must be rejected");
  }

  const syntheticNodeCall = ["spawnSync(", JSON.stringify("node"), ", [])"].join("");
  const unknownNodeOwner = discoverInternalNodeSurfaces(
    [{ relativePath: "scripts/validation/new-runtime-owner.mjs", text: syntheticNodeCall }],
    new Map(),
  );
  if (
    !unknownNodeOwner.errors.some((error) =>
      error.includes("unclassified explicit Node.js script owner"),
    )
  ) {
    findings.push("unregistered explicit Node.js script fixture must be rejected");
  }

  const processExecPathOnly = discoverInternalNodeSurfaces(
    [
      {
        relativePath: "scripts/validation/process-exec-path.mjs",
        text: 'import fs from "node:fs"; spawnSync(process.execPath, ["fixture.mjs"]);',
      },
    ],
    new Map(),
  );
  if (processExecPathOnly.errors.length > 0 || processExecPathOnly.occurrences.length > 0) {
    findings.push(
      "node: imports and process.execPath must not create explicit Node-owner surfaces",
    );
  }

  const unknownAutomationOwner = discoverAutomationSurfaces([
    {
      relativePath: ".github/workflows/new-runtime.yml",
      text: "jobs:\n  test:\n    steps:\n      - run: node scripts/new-runtime.mjs\n",
    },
  ]);
  if (
    !unknownAutomationOwner.errors.some((error) =>
      error.includes("unclassified explicit Node.js automation owner"),
    )
  ) {
    findings.push("unregistered explicit Node.js automation fixture must be rejected");
  }

  return findings;
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
  errors.push(...winnerContradictionErrors(boundary));
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

const packageDiscovery = discoverPackageScriptSurfaces(
  packageJson.scripts ?? {},
  sitePackageJson.scripts ?? {},
);
const automationDiscovery = discoverAutomationSurfaces(automationSources());
const internalNodeDiscovery = discoverInternalNodeSurfaces(scriptSources());
errors.push(
  ...packageDiscovery.errors,
  ...automationDiscovery.errors,
  ...internalNodeDiscovery.errors,
);

const surfaceOccurrences = [
  ...packageDiscovery.occurrences,
  ...automationDiscovery.occurrences,
  ...internalNodeDiscovery.occurrences,
];
if (
  read("scripts/repo/smoke-install.mjs").includes('"dlx", "skills@1.5.23"') &&
  read(".github/workflows/validate.yml").includes("pnpm dlx skills@1.5.23 add ./skills --list")
) {
  surfaceOccurrences.push({
    source: "scripts/repo/smoke-install.mjs + .github/workflows/validate.yml",
    surface: "transient:skills-cli:pnpm-dlx",
  });
}
surfaceOccurrences.push({
  source: "package.json + site/package.json",
  surface: "deployable:bun-server-artifact",
});

const requiredSurfaces = new Set(surfaceOccurrences.map(({ surface }) => surface));
const drawioOccurrences = surfaceOccurrences.filter(
  ({ surface }) => surface === "internal:validate-drawio:node-children",
);
requireCondition(
  drawioOccurrences.length === 1,
  "Draw.io explicit Node.js ownership must be discovered exactly once",
);
requireCondition(
  requiredSurfaces.size === 11,
  `current runtime-selection inventory must discover 11 surfaces, found ${requiredSurfaces.size}`,
);
requireCondition(
  seenSurfaces.size === requiredSurfaces.size &&
    [...requiredSurfaces].every((surface) => seenSurfaces.has(surface)),
  "matrix surfaces must equal the complete current runtime-selection inventory",
);
requireCondition(
  matrix.boundaries?.length === 11,
  `current runtime evidence matrix must define 11 boundaries, found ${matrix.boundaries?.length ?? 0}`,
);
errors.push(...negativeFixtureErrors());

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

const lockfile = read("pnpm-lock.yaml");
requireCondition(lockfile.includes("astro@7.2.7"), "pnpm lockfile must resolve Astro 7.2.7");
requireCondition(lockfile.includes("vite@8.2.2"), "pnpm lockfile must resolve Vite 8.2.2");

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
    `Runtime evidence matrix passed (${matrix.boundaries.length} boundaries, ${requiredSurfaces.size} discovered surfaces; unknown signals remain advisory).`,
  );
}
