import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  canonicalMaterialFingerprint,
  extractLegacyMaterialUnits,
  sourceMaterialFingerprints,
  validateLegacyCaseLineage,
} from "../lib/legacy-case-lineage.mjs";
import {
  assertCommonMarkdownParserCases,
  assertCommonMaterialFingerprintCases,
  assertAmbientGitSteeringIgnored,
  assertEarlyManifestErrorsFinalized,
  assertFixtureSetupFailureCleanup,
  assertRepositoryGuardsUnchanged,
  captureRepositoryGuards,
  commonLegacyLineageFailureCases,
  commonLegacyLineagePositiveCases,
  harmlessNumericEvidenceMutation,
  UnsupportedFixtureCapabilityError,
} from "../lib/legacy-case-lineage-test-harness.mjs";

const root = process.env.LEGACY_LINEAGE_TEST_ROOT
  ? path.resolve(process.env.LEGACY_LINEAGE_TEST_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const sourceCommit = "1d454f06375f3b74ba506fef54b664a2517674c0";
const evalRelative = "skill-evals/codegraph-ast-grep";
const runtimeRelative = "skills/engineering-workflows/codegraph-ast-grep";
const manifestRelative = `${evalRelative}/legacy-case-lineage.json`;
const baselineDirectory = `${evalRelative}/legacy-case-baseline/${sourceCommit}`;
const contractValidator = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "validate-contract.mjs",
);
const expectedSources = [
  [
    "advanced-migration-extension.md",
    "8cfbb48314c1968805531ba40d3e8bbbf54b972ec03720826afd9b2ab33e8f4d",
  ],
  [
    "ast-grep-structural-search.md",
    "bba4838338cc6993dd7019052e83daa090c341e42cec824e6baa248a02d2dbac",
  ],
  [
    "bounded-rewrite-after-approval.md",
    "dbb38811675a6d2e0a4fcd378e18a05dfe3469c1b42b43aa271f1f7411788768",
  ],
  ["codegraph-mcp-setup.md", "9fb75009ab6a2215842423d079d1297f82d866e9bc3e86205f1268b99ed75b10"],
  [
    "cross-runtime-setup-boundaries.md",
    "b49fa5b07de1865a2b216497715b4832ddbfe90a3e68b91170316fe573019e1d",
  ],
  ["native-lsp-first.md", "78cc90a4cc4824865fc252a74d49072fb1125656a8930b56b5c6382f85ab7c21"],
  ["refactor-planning.md", "f39bd2c511cf51a2ae34b03fa6fc5922fc0c5abfb134c297c49b4725702ddb82"],
  [
    "repo-exploration-and-impact.md",
    "38f791475128eac1688f008037af7e41305a46ba92f185bef3d9f4c390557fb9",
  ],
  [
    "security-policy-tool-boundary.md",
    "524920a8a0db30d4b811118ff2b28381171af53bc056610f01713dff0f6dea7d",
  ],
].map(([name, sha256]) => ({
  path: `${evalRelative}/cases/${name}`,
  sha256,
}));

const directoryCopyPlan = Object.freeze([evalRelative, runtimeRelative]);

function copyFixture({ copyDirectory = fs.cpSync, onCreate = () => {} } = {}) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "codegraph-lineage-"));
  try {
    onCreate(fixture);
    for (const relative of directoryCopyPlan) {
      const destination = path.join(fixture, relative);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      copyDirectory(path.join(root, relative), destination, {
        recursive: true,
        force: false,
        errorOnExist: true,
        preserveTimestamps: false,
      });
    }
    return fixture;
  } catch (error) {
    fs.rmSync(fixture, { recursive: true, force: true });
    throw error;
  }
}

function copyContractFixture() {
  const fixture = copyFixture();
  try {
    fs.copyFileSync(path.join(root, "package.json"), path.join(fixture, "package.json"));
    return fixture;
  } catch (error) {
    fs.rmSync(fixture, { recursive: true, force: true });
    throw error;
  }
}

let contractImportSequence = 0;
async function runContractValidator(fixture) {
  const previousCwd = process.cwd();
  process.chdir(fixture);
  try {
    contractImportSequence += 1;
    const module = await import(
      `${pathToFileURL(contractValidator).href}?fixture=${contractImportSequence}`
    );
    return {
      status: module.validationErrors.length === 0 ? 0 : 1,
      output: module.validationErrors.join("\n"),
    };
  } finally {
    process.chdir(previousCwd);
  }
}

async function expectContractFailure(name, relativePath, expected) {
  const fixture = copyContractFixture();
  try {
    fs.appendFileSync(path.join(fixture, relativePath), Buffer.from([0xff]));
    const result = await runContractValidator(fixture);
    if (result.status === 0 || !result.output.includes(expected)) {
      throw new Error(
        `${name}: expected failure containing ${JSON.stringify(expected)}; status=${result.status}\n${result.output}`,
      );
    }
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

function run(fixture, testOnlyReadPhaseHook = null) {
  return validateLegacyCaseLineage({
    root: fixture,
    manifestRelative,
    expectedSourceCommit: sourceCommit,
    expectedSources,
    expectedBaselineDirectory: baselineDirectory,
    runtimeDirectory: runtimeRelative,
    activeTargetRoots: [runtimeRelative, `${evalRelative}/cases`],
    forbiddenEvidenceRoots: [
      `${evalRelative}/behavioral`,
      `${evalRelative}/runs`,
      `${evalRelative}/validator-fixtures`,
      `${evalRelative}/README.md`,
      `${evalRelative}/rubric.md`,
    ],
    testOnlyReadPhaseHook,
  });
}

function editManifest(fixture, mutate) {
  const file = path.join(fixture, manifestRelative);
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  mutate(manifest);
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function prepareAuthorizedShortFingerprint(fixture) {
  const manifestFile = path.join(fixture, manifestRelative);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  for (const entry of manifest.cases) {
    for (const expectation of entry.expectations) {
      const fingerprint = canonicalMaterialFingerprint(expectation.source.marker);
      if (!sourceMaterialFingerprints(expectation.source.marker).includes(fingerprint)) continue;
      for (const target of expectation.targets) {
        if (!target.path.startsWith(`${runtimeRelative}/`)) continue;
        const targetFile = path.join(fixture, target.path);
        const text = fs.readFileSync(targetFile, "utf8");
        const canonicalText = text
          .normalize("NFKC")
          .replaceAll("**", "")
          .replaceAll("`", "")
          .replace(/\s+/g, " ")
          .trim();
        if (canonicalText.includes(fingerprint)) continue;
        const escapedHeading = target.heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const headingPattern = new RegExp(`^(#{1,6})\\s+${escapedHeading}\\s*#*\\s*$`, "m");
        if (!headingPattern.test(text)) continue;
        fs.writeFileSync(
          targetFile,
          text.replace(headingPattern, (heading) => `${heading}\n\n${fingerprint}`),
          "utf8",
        );
        target.markers.push(fingerprint);
        fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
        return { fingerprint, marker: fingerprint, target };
      }
    }
  }
  throw new Error("Expected a runtime target that can carry one exact short fingerprint");
}

function edit(file, transform) {
  const before = fs.readFileSync(file, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`Mutation did not change ${file}`);
  fs.writeFileSync(file, after, "utf8");
}

function expectFailure(name, expected, mutate, execute = (fixture) => run(fixture)) {
  const fixture = copyFixture();
  try {
    mutate(fixture);
    const result = execute(fixture, run);
    if (!result.errors.some((error) => error.includes(expected))) {
      throw new Error(`${name}: expected ${JSON.stringify(expected)}\n${result.errors.join("\n")}`);
    }
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

const repositoryGuardRoot = process.env.LEGACY_LINEAGE_GUARD_ROOT
  ? path.resolve(process.env.LEGACY_LINEAGE_GUARD_ROOT)
  : root;
const repositoryGuards = captureRepositoryGuards(repositoryGuardRoot);

try {
  assertAmbientGitSteeringIgnored();
  assertCommonMarkdownParserCases(extractLegacyMaterialUnits);
  assertCommonMaterialFingerprintCases(sourceMaterialFingerprints);
  assertEarlyManifestErrorsFinalized(validateLegacyCaseLineage);

  const parserFixture = [
    "<!--",
    "## Deterministic Assertions",
    "- hidden-comment-unit",
    "-->",
    "",
    "````md",
    "## Expected Behavior",
    "- hidden-fence-unit",
    "```",
    "still fenced by the four-backtick opener",
    "```",
    "````",
    "",
    "## Deterministic Assertions",
    "",
    "- visible-unit",
    "  continuation",
  ].join("\n");
  const parsedFixture = extractLegacyMaterialUnits(parserFixture);
  const expectedParserUnits = [
    { heading: "Deterministic Assertions", marker: "- visible-unit continuation" },
  ];
  if (
    parsedFixture.errors.length > 0 ||
    JSON.stringify(parsedFixture.units) !== JSON.stringify(expectedParserUnits)
  ) {
    throw new Error(
      `Markdown visibility fixture failed:\n${parsedFixture.errors.join("\n")}\n${JSON.stringify(parsedFixture.units)}`,
    );
  }
  const duplicateAfterFence = extractLegacyMaterialUnits(
    [
      "````md",
      "## Deterministic Assertions",
      "- hidden",
      "```",
      "```",
      "````",
      "## Deterministic Assertions",
      "- first-visible",
      "## Deterministic Assertions",
      "- second-visible",
    ].join("\n"),
  );
  if (!duplicateAfterFence.errors.some((error) => error.includes("must exist at most once"))) {
    throw new Error("Four-backtick fixture did not expose the later live duplicate heading");
  }
  for (const unterminated of [
    ["## Deterministic Assertions", "- visible", "<!--", "## Expected Behavior", "- hidden"],
    ["## Deterministic Assertions", "- visible", "````md", "## Expected Behavior", "- hidden"],
  ]) {
    const result = extractLegacyMaterialUnits(unterminated.join("\n"));
    if (
      result.errors.length > 0 ||
      result.units.length !== 1 ||
      result.units[0].marker !== "- visible"
    ) {
      throw new Error("Unterminated Markdown-hidden region became visible before EOF");
    }
  }

  assertFixtureSetupFailureCleanup({
    label: "CodeGraph copyFixture",
    expectedMessage: "synthetic fixture setup failure",
    create(onCreate) {
      return copyFixture({
        onCreate,
        copyDirectory(source, destination, options) {
          if (source === path.join(root, runtimeRelative)) {
            throw new Error("synthetic fixture setup failure");
          }
          fs.cpSync(source, destination, options);
        },
      });
    },
  });
  const baselineFixture = copyFixture();
  try {
    const baseline = run(baselineFixture);
    if (baseline.errors.length > 0) {
      throw new Error(`CodeGraph legacy-case baseline failed:\n${baseline.errors.join("\n")}`);
    }
  } finally {
    fs.rmSync(baselineFixture, { recursive: true, force: true });
  }

  const contractBaselineFixture = copyContractFixture();
  try {
    const baseline = await runContractValidator(contractBaselineFixture);
    if (baseline.status !== 0) {
      throw new Error(`CodeGraph contract-validator fixture baseline failed:\n${baseline.output}`);
    }
  } finally {
    fs.rmSync(contractBaselineFixture, { recursive: true, force: true });
  }

  const contractFailureCases = [
    {
      name: "current-contract manifest with invalid UTF-8",
      relativePath: `${evalRelative}/behavioral/current-contract/manifest.json`,
    },
    {
      name: "historical behavioral manifest with invalid UTF-8",
      relativePath: `${evalRelative}/behavioral/manifest.json`,
    },
  ];
  for (const testCase of contractFailureCases) {
    await expectContractFailure(
      testCase.name,
      testCase.relativePath,
      `${testCase.relativePath}: must be valid UTF-8`,
    );
  }

  const cases = [
    [
      "HTML-comment-only target marker",
      'is missing marker "HTML-only lineage marker"',
      (fixture) => {
        const manifestFile = path.join(fixture, manifestRelative);
        const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
        const target = manifest.cases[0].expectations[0].targets[0];
        fs.appendFileSync(
          path.join(fixture, target.path),
          "\n\n## HTML Comment Target\n\n<!-- HTML-only lineage marker -->\n",
          "utf8",
        );
        target.heading = "HTML Comment Target";
        target.markers = ["HTML-only lineage marker"];
        fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
      },
    ],
    [
      "four-backtick-fenced target marker",
      'is missing marker "fenced-only lineage marker"',
      (fixture) => {
        const manifestFile = path.join(fixture, manifestRelative);
        const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
        const target = manifest.cases[0].expectations[0].targets[0];
        fs.appendFileSync(
          path.join(fixture, target.path),
          [
            "",
            "## Fenced Marker Target",
            "",
            "````md",
            "```",
            "fenced-only lineage marker",
            "```",
            "````",
            "",
          ].join("\n"),
          "utf8",
        );
        target.heading = "Fenced Marker Target";
        target.markers = ["fenced-only lineage marker"];
        fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
      },
    ],
    [
      "runtime nested-blockquoted baseline source leak",
      "legacy-case source segment must not leak",
      (fixture) => {
        const manifest = JSON.parse(fs.readFileSync(path.join(fixture, manifestRelative), "utf8"));
        const source = fs.readFileSync(path.join(fixture, manifest.cases[0].baselinePath), "utf8");
        fs.writeFileSync(
          path.join(fixture, runtimeRelative, "references", "nested-blockquoted-evidence.md"),
          source
            .split(/\r?\n/)
            .map((line) => `> > > ${line}`)
            .join("\n"),
          "utf8",
        );
      },
    ],
    [
      "runtime metadata-bearing JSONL baseline source leak",
      "legacy-case source segment must not leak",
      (fixture) => {
        const manifest = JSON.parse(fs.readFileSync(path.join(fixture, manifestRelative), "utf8"));
        const source = fs.readFileSync(path.join(fixture, manifest.cases[0].baselinePath), "utf8");
        fs.writeFileSync(
          path.join(fixture, runtimeRelative, "references", "metadata-evidence.jsonl"),
          [
            "--- export metadata: legacy evidence ---",
            ...source
              .split(/\r?\n/)
              .map((line, index) => JSON.stringify({ sequence: index + 1, payload: { line } })),
          ].join("\n"),
          "utf8",
        );
      },
    ],
    [
      "runtime per-line-wrapped baseline source leak",
      "legacy-case source segment must not leak",
      (fixture) => {
        const manifest = JSON.parse(fs.readFileSync(path.join(fixture, manifestRelative), "utf8"));
        const source = fs.readFileSync(path.join(fixture, manifest.cases[0].baselinePath), "utf8");
        fs.writeFileSync(
          path.join(fixture, runtimeRelative, "references", "line-wrapped-evidence.txt"),
          source
            .split(/\r?\n/)
            .map((line, index) => `line ${String(index + 1).padStart(4, "0")} | ${line}`)
            .join("\n"),
          "utf8",
        );
      },
    ],
    [
      "short material fingerprint in unapproved runtime file",
      "legacy-case material-unit fingerprint must not leak",
      (fixture) => {
        const { marker } = prepareAuthorizedShortFingerprint(fixture);
        fs.writeFileSync(
          path.join(fixture, runtimeRelative, "references", "short-material-leak.txt"),
          `${marker}\n`,
          "utf8",
        );
      },
    ],
    [
      "duplicate authorized short fingerprint in target heading",
      "legacy-case material-unit fingerprint must not leak",
      (fixture) => {
        const { marker, target } = prepareAuthorizedShortFingerprint(fixture);
        const targetFile = path.join(fixture, target.path);
        edit(targetFile, (text) => {
          const heading = `## ${target.heading}`;
          if (!text.includes(heading)) throw new Error(`Missing exact target heading ${heading}`);
          return text.replace(heading, `${heading}\n\n${marker}`);
        });
      },
    ],
    [
      "authorized short fingerprint copied under another heading",
      "legacy-case material-unit fingerprint must not leak",
      (fixture) => {
        const { marker, target } = prepareAuthorizedShortFingerprint(fixture);
        fs.appendFileSync(
          path.join(fixture, target.path),
          `\n\n## Unapproved Fingerprint Copy\n\n${marker}\n`,
          "utf8",
        );
      },
    ],
    [
      "missing disposition",
      "exact legacy-case lineage case schema",
      (fixture) => {
        editManifest(fixture, (manifest) => delete manifest.cases[0].disposition);
      },
    ],
    [
      "duplicate disposition",
      "duplicate legacy source path; found 2 dispositions",
      (fixture) => {
        editManifest(fixture, (manifest) =>
          manifest.cases.push(structuredClone(manifest.cases[0])),
        );
      },
    ],
    [
      "unknown disposition",
      "disposition must be preserved, adapted, or explicitly-rejected",
      (fixture) => {
        editManifest(fixture, (manifest) => {
          manifest.cases[0].disposition = "omitted";
        });
      },
    ],
    [
      "wrong source hash",
      "source sha256 does not match the independent HEAD trust anchor",
      (fixture) => {
        editManifest(fixture, (manifest) => {
          manifest.cases[0].sourceSha256 = "0".repeat(64);
        });
      },
    ],
    [
      "missing target",
      "missing required file",
      (fixture) => {
        editManifest(fixture, (manifest) => {
          manifest.cases[0].expectations[0].targets[0].path = `${evalRelative}/cases/no-such-replacement.md`;
        });
      },
    ],
    [
      "missing marker",
      "No such lineage marker",
      (fixture) => {
        editManifest(fixture, (manifest) => {
          manifest.cases[0].expectations[0].targets[0].markers = ["No such lineage marker"];
        });
      },
    ],
    [
      "missing target heading",
      'target heading "No such lineage heading" must exist exactly once',
      (fixture) => {
        editManifest(fixture, (manifest) => {
          manifest.cases[0].expectations[0].targets[0].heading = "No such lineage heading";
        });
      },
    ],
    [
      "duplicate target heading",
      "must exist exactly once",
      (fixture) => {
        const manifest = JSON.parse(fs.readFileSync(path.join(fixture, manifestRelative), "utf8"));
        const target = manifest.cases[0].expectations[0].targets[0];
        fs.appendFileSync(
          path.join(fixture, target.path),
          `\n\n## ${target.heading}\n\n${target.markers[0]}\n`,
          "utf8",
        );
      },
    ],
    [
      "uncovered staged deletion",
      "uncovered staged-deletion contract",
      (fixture) => {
        editManifest(fixture, (manifest) => manifest.cases.shift());
      },
    ],
    [
      "unexpected staged deletion",
      "outside the exact staged-deletion contract",
      (fixture) => {
        editManifest(fixture, (manifest) => {
          const extra = structuredClone(manifest.cases[0]);
          extra.sourcePath = `${evalRelative}/cases/not-reviewed.md`;
          manifest.cases.push(extra);
        });
      },
    ],
    [
      "unmapped material expectation",
      "is not mapped exactly once; found 0",
      (fixture) => {
        editManifest(fixture, (manifest) => manifest.cases[0].expectations.shift());
      },
    ],
    [
      "missing source-unit outcome",
      "must use the exact expectation schema",
      (fixture) => {
        editManifest(fixture, (manifest) => delete manifest.cases[0].expectations[0].outcome);
      },
    ],
    [
      "missing adapted source-unit reason",
      "reason must explain this source-unit disposition",
      (fixture) => {
        editManifest(fixture, (manifest) => {
          manifest.cases[0].expectations[0].outcome = "adapted";
          manifest.cases[0].expectations[0].reason = "";
        });
      },
    ],
    [
      "duplicate source-unit mapping",
      "is not mapped exactly once; found 2",
      (fixture) => {
        editManifest(fixture, (manifest) => {
          manifest.cases[0].expectations.push(structuredClone(manifest.cases[0].expectations[0]));
        });
      },
    ],
    [
      "runtime source-byte leak",
      "legacy case source bytes must not leak",
      (fixture) => {
        const manifest = JSON.parse(fs.readFileSync(path.join(fixture, manifestRelative), "utf8"));
        fs.copyFileSync(
          path.join(fixture, manifest.cases[0].baselinePath),
          path.join(fixture, runtimeRelative, "references", "legacy-case-leak.md"),
        );
      },
    ],
    [
      "runtime baseline filename leak",
      "legacy-case evidence filename must not leak",
      (fixture) => {
        const manifest = JSON.parse(fs.readFileSync(path.join(fixture, manifestRelative), "utf8"));
        const baselinePath = manifest.cases[0].baselinePath;
        fs.copyFileSync(
          path.join(fixture, baselinePath),
          path.join(fixture, runtimeRelative, "references", path.basename(baselinePath)),
        );
      },
    ],
    [
      "runtime lineage-manifest filename leak",
      "legacy-case evidence filename must not leak",
      (fixture) => {
        fs.copyFileSync(
          path.join(fixture, manifestRelative),
          path.join(fixture, runtimeRelative, "references", "legacy-case-lineage.json"),
        );
      },
    ],
    [
      "runtime renamed lineage-manifest content leak",
      "legacy-case lineage manifest content must not leak",
      (fixture) => {
        fs.copyFileSync(
          path.join(fixture, manifestRelative),
          path.join(fixture, runtimeRelative, "references", "renamed-lineage-map.json"),
        );
      },
    ],
    [
      "runtime wrapped baseline source leak",
      "legacy-case source segment must not leak",
      (fixture) => {
        const manifest = JSON.parse(fs.readFileSync(path.join(fixture, manifestRelative), "utf8"));
        const source = fs.readFileSync(path.join(fixture, manifest.cases[0].baselinePath), "utf8");
        fs.writeFileSync(
          path.join(fixture, runtimeRelative, "references", "wrapped-legacy-evidence.md"),
          `# Runtime wrapper\n\n${source}`,
          "utf8",
        );
      },
    ],
    [
      "runtime markdown-blockquoted baseline source leak",
      "legacy-case source segment must not leak",
      (fixture) => {
        const manifest = JSON.parse(fs.readFileSync(path.join(fixture, manifestRelative), "utf8"));
        const source = fs.readFileSync(path.join(fixture, manifest.cases[0].baselinePath), "utf8");
        fs.writeFileSync(
          path.join(fixture, runtimeRelative, "references", "blockquoted-evidence.md"),
          source
            .split(/\r?\n/)
            .map((line) => `> ${line}`)
            .join("\n"),
          "utf8",
        );
      },
    ],
    [
      "runtime JSON-encoded baseline source lines leak",
      "legacy-case source segment must not leak",
      (fixture) => {
        const manifest = JSON.parse(fs.readFileSync(path.join(fixture, manifestRelative), "utf8"));
        const source = fs.readFileSync(path.join(fixture, manifest.cases[0].baselinePath), "utf8");
        fs.writeFileSync(
          path.join(fixture, runtimeRelative, "references", "encoded-evidence.json"),
          `${JSON.stringify(source.split(/\r?\n/), null, 2)}\n`,
          "utf8",
        );
      },
    ],
    [
      "runtime JSON-string baseline source leak",
      "legacy-case source segment must not leak",
      (fixture) => {
        const manifest = JSON.parse(fs.readFileSync(path.join(fixture, manifestRelative), "utf8"));
        const source = fs.readFileSync(path.join(fixture, manifest.cases[0].baselinePath), "utf8");
        fs.writeFileSync(
          path.join(fixture, runtimeRelative, "references", "encoded-evidence-string.json"),
          `${JSON.stringify(source)}\n`,
          "utf8",
        );
      },
    ],
    [
      "runtime JSONL baseline source lines leak",
      "legacy-case source segment must not leak",
      (fixture) => {
        const manifest = JSON.parse(fs.readFileSync(path.join(fixture, manifestRelative), "utf8"));
        const source = fs.readFileSync(path.join(fixture, manifest.cases[0].baselinePath), "utf8");
        fs.writeFileSync(
          path.join(fixture, runtimeRelative, "references", "encoded-evidence.jsonl"),
          `${source
            .split(/\r?\n/)
            .map((line) => JSON.stringify(line))
            .join("\n")}\n`,
          "utf8",
        );
      },
    ],
    [
      "runtime partial baseline source leak",
      "legacy-case source segment must not leak",
      (fixture) => {
        const manifest = JSON.parse(fs.readFileSync(path.join(fixture, manifestRelative), "utf8"));
        const source = fs.readFileSync(path.join(fixture, manifest.cases[0].baselinePath), "utf8");
        fs.writeFileSync(
          path.join(fixture, runtimeRelative, "references", "partial-legacy-evidence.md"),
          source.slice(0, 512),
          "utf8",
        );
      },
    ],
    [
      "runtime short unaligned baseline source leak",
      "legacy-case source segment must not leak",
      (fixture) => {
        const manifest = JSON.parse(fs.readFileSync(path.join(fixture, manifestRelative), "utf8"));
        const source = fs
          .readFileSync(path.join(fixture, manifest.cases[0].baselinePath), "utf8")
          .replace(/\s+/g, " ")
          .trim();
        fs.writeFileSync(
          path.join(fixture, runtimeRelative, "references", "short-unaligned-evidence.md"),
          source.slice(37, 228),
          "utf8",
        );
      },
    ],
  ];

  for (const [name, expected, mutate] of cases) expectFailure(name, expected, mutate);

  const sharedCases = commonLegacyLineageFailureCases({
    evidenceDirectoryRelative: `${evalRelative}/behavioral`,
    evidenceRelative: `${evalRelative}/README.md`,
    manifestRelative,
    prepareAuthorizedShortFingerprint,
    runtimeRelative,
    sourceMaterialFingerprints,
  });
  const skippedCapabilities = [];
  for (const testCase of sharedCases) {
    try {
      expectFailure(testCase.name, testCase.expected, testCase.mutate, testCase.run);
    } catch (error) {
      if (error instanceof UnsupportedFixtureCapabilityError) {
        skippedCapabilities.push(`${testCase.name}: ${error.message}`);
        continue;
      }
      throw error;
    }
  }

  const sharedPositiveCases = commonLegacyLineagePositiveCases({
    manifestRelative,
    prepareAuthorizedShortFingerprint,
  });
  for (const testCase of sharedPositiveCases) {
    const fixture = copyFixture();
    try {
      testCase.mutate(fixture);
      const result = run(fixture);
      if (result.errors.length > 0) {
        throw new Error(`${testCase.name} failed:\n${result.errors.join("\n")}`);
      }
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  }

  const harmlessNumericFixture = copyFixture();
  try {
    harmlessNumericEvidenceMutation(runtimeRelative)(harmlessNumericFixture);
    const result = run(harmlessNumericFixture);
    if (result.errors.length > 0) {
      throw new Error(`harmless numeric runtime evidence failed:\n${result.errors.join("\n")}`);
    }
  } finally {
    fs.rmSync(harmlessNumericFixture, { recursive: true, force: true });
  }

  console.log(
    `CodeGraph legacy-case lineage fixtures passed: ${cases.length + sharedCases.length + contractFailureCases.length - skippedCapabilities.length} negative cases and ${sharedPositiveCases.length + 2} positive cases.${
      skippedCapabilities.length > 0
        ? ` ${skippedCapabilities.length} capability fixture(s) skipped: ${skippedCapabilities.join("; ")}.`
        : " All shared symlink and FIFO capability fixtures executed."
    }`,
  );
} finally {
  assertRepositoryGuardsUnchanged(
    repositoryGuardRoot,
    repositoryGuards,
    "CodeGraph legacy-case lineage suite",
  );
}
