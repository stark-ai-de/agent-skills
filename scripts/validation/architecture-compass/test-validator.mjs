import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  commonLegacyLineageFailureCases,
  commonLegacyLineagePositiveCases,
  createFixtureFifo,
  harmlessNumericEvidenceMutation,
  UnsupportedFixtureCapabilityError,
} from "../lib/legacy-case-lineage-test-harness.mjs";
import { validateLegacyReferenceEvidence } from "./verify-legacy-reference-source-lock.mjs";
import { validateArchitecture } from "./validate.mjs";
import { materializeBaselineCapsule } from "./fixture-capsule.mjs";
import {
  architectureFixtureDirectories,
  architectureFixtureFiles,
  runFixtureCoordinator,
} from "./fixture-coordinator.mjs";
import { architectureValueDigest } from "./hosted-shards.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frozenInventoryPath = process.env.ARCHITECTURE_FIXTURE_INVENTORY_PATH
  ? path.resolve(process.env.ARCHITECTURE_FIXTURE_INVENTORY_PATH)
  : path.join(scriptDir, "test-validator-case-inventory.json");
const root = process.env.LEGACY_LINEAGE_TEST_ROOT
  ? path.resolve(process.env.LEGACY_LINEAGE_TEST_ROOT)
  : path.resolve(scriptDir, "..", "..", "..");
const validator = process.env.LEGACY_LINEAGE_ARCHITECTURE_VALIDATOR
  ? path.resolve(process.env.LEGACY_LINEAGE_ARCHITECTURE_VALIDATOR)
  : path.join(root, "scripts", "validation", "architecture-compass", "validate.mjs");
const skillRelative = path.join("skills", "engineering-workflows", "architecture-compass");
const evalRelative = path.join("skill-evals", "architecture-compass");
const lockRelative = path.join(
  "scripts",
  "validation",
  "architecture-compass",
  "decision-lock.tsv",
);
const lineageRelative = path.join(
  "scripts",
  "validation",
  "architecture-compass",
  "decision-lineage.json",
);
const sourceLockRelative = path.join(
  "scripts",
  "validation",
  "architecture-compass",
  "legacy-reference-source-lock.json",
);
const coverageRelative = path.join(
  "scripts",
  "validation",
  "architecture-compass",
  "legacy-reference-coverage.json",
);
const legacyCaseLineageRelative = path.join(evalRelative, "legacy-case-lineage.json");
const legacyCaseSourceCommit = "1d454f06375f3b74ba506fef54b664a2517674c0";
const legacyCaseSources = [
  [
    "conditional-plan-routing-matrix.md",
    "eb20fd998bfa0d0ca92daa588b9e5e881a547a4436a637c0f69faf3c3b008c38",
  ],
  [
    "conflicting-adrs-plan-gate.md",
    "1ed3db444e449878d16733d2dc5cb8ebc45f38c7f9ae0a6086476aa595ab3557",
  ],
  [
    "direct-route-reclassification.md",
    "c4e946f351a1c671a58ba712d2a8b78b172ed90a188243e9992db593867dc656",
  ],
  [
    "native-plan-declined-fallback.md",
    "0d32e79f8249c5859da3fc5fbbdf859ba3ff17ba3db1866d8934ec1e415eca23",
  ],
  [
    "native-plan-execution-lifecycle.md",
    "4b874b9594e0aef6b3704f0641aeff96063a5bdb4bfba08ecf4ead6d5947e7ea",
  ],
  ["native-plan-fallbacks.md", "1c7427a480b970672c2277030c7e29aa26340fae77e00e0ee5cb4d1a3f7238f4"],
  [
    "native-plan-indeterminate-fallback.md",
    "efb34e4b321c6eccc3be01ff0613f437370a84131d79a2d61c77566627f41dee",
  ],
  [
    "portable-fallback-execution-lifecycle.md",
    "bb7364fbbc47e279cdc5c343c86f96bb86c1ba0faa310690927df5c89e1192d9",
  ],
  [
    "read-only-explicitly-declined-fallback.md",
    "1d4f419e68932c1eeb3c61207da9403605df79845ee0f7f14ca5b8d24cd243ab",
  ],
  [
    "read-only-transition-gate.md",
    "e028b2ef42ee9feb0a0f0d33883b2e4ea074d12c5db8d53e3135af54f7977ca5",
  ],
].map(([name, sha256]) => ({
  path: `${evalRelative}/cases/${name}`,
  sha256,
}));
const legacyCommit = "05b11f31ee22e4ed2e68c8d89d8a415affc48fe3";
const legacyBaselineRelative = path.join(evalRelative, "reference-baseline", legacyCommit);
const repositoryAdrsRelative = path.join("docs", "adrs");
const stem001 = "ac-adr-001-route-architecture-compass-through-canonical-adr-triplets";
const stem002 = "ac-adr-002-select-actions-resolve-authority-and-record-guardrail-adoption";
const stem005 = "ac-adr-005-make-repository-adrs-binding-agent-guardrails";
const stem009 = "ac-adr-009-choose-read-query-caching-and-freshness-boundaries";
const stem010 = "ac-adr-010-protect-writes-behind-validated-command-boundaries";
const stem011 = "ac-adr-011-compose-long-running-backend-runtimes-and-lifecycles-explicitly";
const stem036 = "ac-adr-036-keep-architecture-compass-portable-through-host-adapters";
const stem039 = "ac-adr-039-prefer-existing-public-skills-conditionally";
const stem048 = "ac-adr-048-persist-approved-governance-before-planned-architecture-refactors";
const internalStem001 = "internal-adr-001-resolve-persistence-surfaces-before-writes";
const internalStem002 = "internal-adr-002-select-capability-aware-receipt-renderers";
const unsupportedSymlinkCodes = new Set(["EACCES", "EINVAL", "ENOSYS", "ENOTSUP", "EPERM"]);

class UnsupportedSymlinkFixtureError extends Error {
  constructor(error) {
    super(`symlink fixture unavailable (${error.code ?? "unknown"}: ${error.message})`);
    this.name = "UnsupportedSymlinkFixtureError";
  }
}

function createFixtureSymlink(target, link, type) {
  const platformType = process.platform === "win32" && type === "dir" ? "junction" : type;
  try {
    fs.symlinkSync(target, link, platformType);
  } catch (error) {
    if (unsupportedSymlinkCodes.has(error?.code)) {
      throw new UnsupportedSymlinkFixtureError(error);
    }
    throw error;
  }
}

const directoryCopyPlan = architectureFixtureDirectories;
const fileCopyPlan = architectureFixtureFiles;

let activeCaseTelemetry = null;
let activeMaterializationStrategies = null;

function measureCasePhase(phase, operation) {
  const startedAt = process.hrtime.bigint();
  try {
    return operation();
  } finally {
    if (activeCaseTelemetry) {
      const elapsedNanoseconds = process.hrtime.bigint() - startedAt;
      activeCaseTelemetry[phase] += Number(elapsedNanoseconds / 1_000_000n);
    }
  }
}

async function measureCasePhaseAsync(phase, operation) {
  const startedAt = process.hrtime.bigint();
  try {
    return await operation();
  } finally {
    if (activeCaseTelemetry) {
      const elapsedNanoseconds = process.hrtime.bigint() - startedAt;
      activeCaseTelemetry[phase] += Number(elapsedNanoseconds / 1_000_000n);
    }
  }
}

function copyFixture({
  sourceRoot = root,
  copyDirectory = fs.cpSync,
  copyFile = fs.copyFileSync,
  onCreate = () => {},
} = {}) {
  return measureCasePhase("materializeMs", () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-compass-validator-"));
    try {
      onCreate(fixture);
      const baselineCapsule = process.env.ARCHITECTURE_FIXTURE_BASELINE;
      if (baselineCapsule) {
        fs.rmSync(fixture, { recursive: true, force: true });
        const materializeCopyFile =
          process.env.ARCHITECTURE_FIXTURE_FORCE_COPY === "1"
            ? (source, destination, mode) => {
                if (mode === fs.constants.COPYFILE_FICLONE) {
                  const error = new Error("copy-on-write disabled");
                  error.code = "ENOTSUP";
                  throw error;
                }
                copyFile(source, destination, 0);
              }
            : copyFile;
        const materialized = materializeBaselineCapsule({
          capsuleRoot: baselineCapsule,
          destinationRoot: fixture,
          copyFile: materializeCopyFile,
        });
        activeMaterializationStrategies?.add(materialized.strategy);
        return materialized.root;
      }
      for (const relative of directoryCopyPlan) {
        const destination = path.join(fixture, relative);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        copyDirectory(path.join(sourceRoot, relative), destination, {
          recursive: true,
          force: false,
          errorOnExist: true,
          preserveTimestamps: false,
        });
      }
      for (const relative of fileCopyPlan) {
        const destination = path.join(fixture, relative);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        copyFile(path.join(sourceRoot, relative), destination);
      }
      return fixture;
    } catch (error) {
      fs.rmSync(fixture, { recursive: true, force: true });
      throw error;
    }
  });
}

async function runValidator(fixture) {
  if (
    path.resolve(validator) !==
    path.join(root, "scripts", "validation", "architecture-compass", "validate.mjs")
  ) {
    throw new Error(
      "LEGACY_LINEAGE_ARCHITECTURE_VALIDATOR no longer supports alternate modules; pass the fixture root to validateArchitecture instead.",
    );
  }
  const result = validateArchitecture(fixture);
  return {
    status: result.validationErrors.length === 0 ? 0 : 1,
    output: result.validationErrors.join("\n"),
  };
}

function runLegacyCaseLineage(fixture, testOnlyReadPhaseHook = null) {
  return validateLegacyCaseLineage({
    root: fixture,
    manifestRelative: legacyCaseLineageRelative.split(path.sep).join("/"),
    expectedSourceCommit: legacyCaseSourceCommit,
    expectedSources: legacyCaseSources,
    expectedBaselineDirectory: `${evalRelative.split(path.sep).join("/")}/legacy-case-baseline/${legacyCaseSourceCommit}`,
    runtimeDirectory: skillRelative.split(path.sep).join("/"),
    activeTargetRoots: [
      skillRelative.split(path.sep).join("/"),
      `${evalRelative.split(path.sep).join("/")}/cases`,
    ],
    forbiddenEvidenceRoots: [
      `${evalRelative.split(path.sep).join("/")}/reference-baseline`,
      `${evalRelative.split(path.sep).join("/")}/runs`,
      `${evalRelative.split(path.sep).join("/")}/activation-cases.md`,
      `${evalRelative.split(path.sep).join("/")}/README.md`,
      `${evalRelative.split(path.sep).join("/")}/rubric.md`,
    ],
    testOnlyReadPhaseHook,
  });
}

function runLegacyEvidenceValidator(fixture, readPhaseHook) {
  const result = validateLegacyReferenceEvidence({
    root: fixture,
    testOnlyReadPhaseHook: readPhaseHook,
  });
  return {
    status: result.errors.length === 0 ? 0 : 1,
    output: result.errors.join("\n"),
  };
}

function edit(file, transform) {
  const before = fs.readFileSync(file, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`Mutation did not change ${file}`);
  fs.writeFileSync(file, after, "utf8");
}

function installHiddenCoverageMarker(fixture, marker, body) {
  const manifestFile = path.join(fixture, coverageRelative);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const unit = manifest.units.find(
    (candidate) =>
      candidate.kind === "guidance" &&
      candidate.targets.some((target) => target.path.endsWith(".long.md")) &&
      candidate.targets.some((target) => target.path.endsWith(".guide.md")),
  );
  if (!unit)
    throw new Error("Hidden-marker fixture found no guidance unit with Long and Guide targets");
  const target = unit.targets.find((candidate) => candidate.path.endsWith(".guide.md"));
  const heading = "Synthetic hidden coverage marker";
  fs.appendFileSync(path.join(fixture, target.path), `\n\n## ${heading}\n\n${body}\n`, "utf8");
  target.heading = heading;
  target.markers = [marker];
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function processFileDescriptorCount() {
  try {
    return fs.readdirSync("/proc/self/fd").length;
  } catch (error) {
    throw new UnsupportedFixtureCapabilityError("proc-self-fd", error);
  }
}

function prepareAuthorizedShortFingerprint(fixture) {
  const manifestFile = path.join(fixture, legacyCaseLineageRelative);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  for (const entry of manifest.cases) {
    for (const expectation of entry.expectations) {
      const fingerprint = canonicalMaterialFingerprint(expectation.source.marker);
      if (!sourceMaterialFingerprints(expectation.source.marker).includes(fingerprint)) continue;
      for (const target of expectation.targets) {
        if (
          !target.path.startsWith(`${skillRelative}${path.sep}`) &&
          !target.path.startsWith(`${skillRelative}/`)
        ) {
          continue;
        }
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

function tripletFiles(fixture, stem) {
  const references = path.join(fixture, skillRelative, "references");
  return ["short", "long", "guide"].map((variant) =>
    path.join(references, `${stem}.${variant}.md`),
  );
}

function internalTripletFiles(fixture, stem) {
  const references = path.join(fixture, skillRelative, "references", "internal");
  return ["short", "long", "guide"].map((variant) =>
    path.join(references, `${stem}.${variant}.md`),
  );
}

function repositoryAdrLong(fixture, id) {
  const directory = path.join(fixture, repositoryAdrsRelative);
  const matches = fs
    .readdirSync(directory)
    .filter((name) => name.startsWith(`${id}-`) && name.endsWith(".long.md"));
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one repository Long ADR for ${id}; found ${matches.length}`);
  }
  return path.join(directory, matches[0]);
}

async function expectFailure(name, mutate, expected, run = runValidator) {
  const fixture = copyFixture();
  try {
    try {
      measureCasePhase("mutateMs", () => mutate(fixture));
    } catch (error) {
      if (
        error instanceof UnsupportedSymlinkFixtureError ||
        error instanceof UnsupportedFixtureCapabilityError
      ) {
        return {
          kind: error instanceof UnsupportedFixtureCapabilityError ? error.capability : "symlink",
          skipped: true,
          reason: error.message,
        };
      }
      throw error;
    }
    let result;
    try {
      result = await measureCasePhaseAsync("validateMs", () => run(fixture));
    } catch (error) {
      if (
        error instanceof UnsupportedSymlinkFixtureError ||
        error instanceof UnsupportedFixtureCapabilityError
      ) {
        return {
          kind: error instanceof UnsupportedFixtureCapabilityError ? error.capability : "symlink",
          skipped: true,
          reason: error.message,
        };
      }
      throw error;
    }
    const output = result.output;
    if (result.status === 0 || !output.includes(expected)) {
      throw new Error(
        `${name}: expected failure containing ${JSON.stringify(expected)}; status=${result.status}\n${output}`,
      );
    }
    return { skipped: false };
  } finally {
    measureCasePhase("cleanupMs", () => fs.rmSync(fixture, { recursive: true, force: true }));
  }
}

async function expectSuccess(name, mutate) {
  const fixture = copyFixture();
  try {
    measureCasePhase("mutateMs", () => mutate(fixture));
    const result = await measureCasePhaseAsync("validateMs", () => runValidator(fixture));
    if (result.status !== 0) {
      throw new Error(`${name}: expected success; status=${result.status}\n${result.output}`);
    }
  } finally {
    measureCasePhase("cleanupMs", () => fs.rmSync(fixture, { recursive: true, force: true }));
  }
}

function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const temporary = `${path.resolve(file)}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, path.resolve(file));
}

export async function runSharedArchitecturePreflight(preflightRoot = root) {
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
    label: "Architecture Compass copyFixture directory copy",
    expectedMessage: "synthetic fixture setup failure",
    create(onCreate) {
      return copyFixture({
        sourceRoot: preflightRoot,
        onCreate,
        copyDirectory(source, destination, options) {
          if (source === path.join(preflightRoot, evalRelative)) {
            throw new Error("synthetic fixture setup failure");
          }
          fs.cpSync(source, destination, options);
        },
      });
    },
  });

  assertFixtureSetupFailureCleanup({
    label: "Architecture Compass copyFixture file copy",
    expectedMessage: "synthetic copyFile setup failure",
    create(onCreate) {
      return copyFixture({
        sourceRoot: preflightRoot,
        onCreate,
        copyFile(source, destination) {
          if (source === path.join(preflightRoot, coverageRelative)) {
            throw new Error("synthetic copyFile setup failure");
          }
          fs.copyFileSync(source, destination);
        },
      });
    },
  });

  const baselineFixture = copyFixture({ sourceRoot: preflightRoot });
  try {
    const baseline = await runValidator(baselineFixture);
    if (baseline.status !== 0) {
      throw new Error(`Fixture baseline failed:\n${baseline.output}`);
    }
  } finally {
    fs.rmSync(baselineFixture, { recursive: true, force: true });
  }
  return {
    schemaVersion: 1,
    parserContract: "passed",
    fixtureSetupContract: "passed",
    baselineValidation: "passed",
  };
}

async function runWorker({
  workerIndex,
  workerCount,
  hostedShardIndex = 0,
  hostedShardCount = 1,
  taskKey,
  taskDigest,
  preflightEvidenceDigest,
  reportFile,
}) {
  const workerStartedAt = Date.now();
  let caseExecutionStartedAt = null;
  const frozenInventory = JSON.parse(fs.readFileSync(frozenInventoryPath, "utf8"));
  const inventoryDigest = architectureValueDigest(frozenInventory.cases);
  const results = [];
  const materializationStrategies = new Set();
  let fatal = null;
  activeMaterializationStrategies = materializationStrategies;
  try {
    const cases = [
      {
        name: "scalar legacy source lock root",
        expected: "legacy-reference-source-lock.json: top level must be a JSON object",
        mutate(fixture) {
          fs.writeFileSync(path.join(fixture, sourceLockRelative), "false\n", "utf8");
        },
      },
      {
        name: "scalar legacy coverage root",
        expected: "legacy-reference-coverage.json: top level must be a JSON object",
        mutate(fixture) {
          fs.writeFileSync(path.join(fixture, coverageRelative), "42\n", "utf8");
        },
      },
      {
        name: "wrong-typed legacy baseline directory",
        expected: "baselineDirectory must be skill-evals/architecture-compass/reference-baseline/",
        mutate(fixture) {
          edit(path.join(fixture, sourceLockRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.baselineDirectory = 42;
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "wrong-typed legacy source file name",
        expected: "name must be a string",
        mutate(fixture) {
          edit(path.join(fixture, sourceLockRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.files[0].name = [manifest.files[0].name];
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "legacy source lock with invalid UTF-8",
        expected: "legacy-reference-source-lock.json: must be valid UTF-8",
        mutate(fixture) {
          fs.appendFileSync(path.join(fixture, sourceLockRelative), Buffer.from([0xff]));
        },
      },
      {
        name: "legacy coverage with invalid UTF-8",
        expected: "legacy-reference-coverage.json: must be valid UTF-8",
        mutate(fixture) {
          fs.appendFileSync(path.join(fixture, coverageRelative), Buffer.from([0xff]));
        },
      },
      {
        name: "legacy target with invalid UTF-8",
        expected: "must be valid UTF-8",
        mutate(fixture) {
          const manifest = JSON.parse(
            fs.readFileSync(path.join(fixture, coverageRelative), "utf8"),
          );
          const target = manifest.units[0].targets[0];
          fs.appendFileSync(path.join(fixture, target.path), Buffer.from([0xff]));
        },
      },
      {
        name: "active Architecture Compass eval with invalid UTF-8",
        expected:
          "skill-evals/architecture-compass/cases/clear-setup-intent.md: must be valid UTF-8",
        mutate(fixture) {
          fs.appendFileSync(
            path.join(fixture, evalRelative, "cases", "clear-setup-intent.md"),
            Buffer.from([0xff]),
          );
        },
      },
      {
        name: "Architecture Compass decision lock with invalid UTF-8",
        expected: "scripts/validation/architecture-compass/decision-lock.tsv: must be valid UTF-8",
        mutate(fixture) {
          fs.appendFileSync(path.join(fixture, lockRelative), Buffer.from([0xff]));
        },
      },
      {
        name: "HTML-comment-only public-reference coverage marker",
        expected: 'target section is missing marker "coverage-hidden-comment-marker"',
        mutate(fixture) {
          installHiddenCoverageMarker(
            fixture,
            "coverage-hidden-comment-marker",
            "<!-- coverage-hidden-comment-marker -->",
          );
        },
      },
      {
        name: "raw-HTML-block-only public-reference coverage marker",
        expected: 'target section is missing marker "coverage-hidden-raw-html-marker"',
        mutate(fixture) {
          installHiddenCoverageMarker(
            fixture,
            "coverage-hidden-raw-html-marker",
            '<script type="text/plain">\ncoverage-hidden-raw-html-marker\n</script>',
          );
        },
      },
      {
        name: "link-definition-only public-reference coverage marker",
        expected: 'target section is missing marker "coverage-hidden-link-marker"',
        mutate(fixture) {
          installHiddenCoverageMarker(
            fixture,
            "coverage-hidden-link-marker",
            '[coverage-hidden-link-marker]: /coverage "coverage-hidden-link-marker"',
          );
        },
      },
      {
        name: "unmatched backtick cannot expose an HTML-comment coverage marker",
        expected: 'target section is missing marker "coverage-hidden-backtick-comment-marker"',
        mutate(fixture) {
          installHiddenCoverageMarker(
            fixture,
            "coverage-hidden-backtick-comment-marker",
            [
              "`orphan code-span opener",
              "<!-- coverage-hidden-backtick-comment-marker -->",
              "`later unmatched closer",
            ].join("\n"),
          );
        },
      },
      {
        name: "unmatched backtick cannot expose a raw-HTML coverage marker",
        expected: 'target section is missing marker "coverage-hidden-backtick-script-marker"',
        mutate(fixture) {
          installHiddenCoverageMarker(
            fixture,
            "coverage-hidden-backtick-script-marker",
            [
              "`orphan code-span opener",
              "<script>",
              "coverage-hidden-backtick-script-marker",
              "</script>",
              "`later unmatched closer",
            ].join("\n"),
          );
        },
      },
      {
        name: "source lock mutates after its semantic parse",
        expected: "validated semantic bytes changed after the original snapshot",
        mutate() {},
        run(fixture) {
          const sourceLock = path.join(fixture, sourceLockRelative);
          const coverage = path.join(fixture, coverageRelative);
          let fired = false;
          const result = runLegacyEvidenceValidator(fixture, ({ file, phase }) => {
            if (!fired && file === coverage && phase === "before-open") {
              fs.appendFileSync(sourceLock, " ", "utf8");
              fired = true;
            }
          });
          if (!fired) throw new Error("source-lock post-parse mutation hook did not execute");
          return result;
        },
      },
      {
        name: "validated target mutates before payload traversal",
        expected: "validated semantic bytes changed after the original snapshot",
        mutate() {},
        run(fixture) {
          const manifest = JSON.parse(
            fs.readFileSync(path.join(fixture, coverageRelative), "utf8"),
          );
          let selected = null;
          for (const target of manifest.units.flatMap((unit) => unit.targets)) {
            const targetFile = path.join(fixture, target.path);
            const text = fs.readFileSync(targetFile, "utf8");
            const marker = target.markers.find(
              (candidate) => typeof candidate === "string" && text.includes(candidate),
            );
            if (marker) {
              selected = { marker, targetFile };
              break;
            }
          }
          if (!selected)
            throw new Error("target mutation fixture found no literal reviewed marker");
          const skillRoot = path.join(fixture, skillRelative);
          let fired = false;
          const result = runLegacyEvidenceValidator(fixture, ({ file, phase }) => {
            if (!fired && file === skillRoot && phase === "before-directory-open") {
              edit(selected.targetFile, (text) =>
                text.replace(selected.marker, "x".repeat(selected.marker.length)),
              );
              fired = true;
            }
          });
          if (!fired) throw new Error("target pre-traversal mutation hook did not execute");
          return result;
        },
      },
      {
        name: "HTML-comment-only legacy-case target marker",
        expected: 'is missing marker "HTML-only lineage marker"',
        mutate(fixture) {
          const manifestFile = path.join(fixture, legacyCaseLineageRelative);
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
      },
      {
        name: "four-backtick-fenced legacy-case target marker",
        expected: 'is missing marker "fenced-only lineage marker"',
        mutate(fixture) {
          const manifestFile = path.join(fixture, legacyCaseLineageRelative);
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
      },
      {
        name: "nested-blockquoted legacy-case source in runtime payload",
        expected: "legacy-case source segment must not leak",
        mutate(fixture) {
          const manifest = JSON.parse(
            fs.readFileSync(path.join(fixture, legacyCaseLineageRelative), "utf8"),
          );
          const source = fs.readFileSync(
            path.join(fixture, manifest.cases[0].baselinePath),
            "utf8",
          );
          fs.writeFileSync(
            path.join(fixture, skillRelative, "assets", "nested-blockquoted-evidence.md"),
            source
              .split(/\r?\n/)
              .map((line) => `> > > ${line}`)
              .join("\n"),
            "utf8",
          );
        },
      },
      {
        name: "metadata-bearing JSONL legacy-case source in runtime payload",
        expected: "legacy-case source segment must not leak",
        mutate(fixture) {
          const manifest = JSON.parse(
            fs.readFileSync(path.join(fixture, legacyCaseLineageRelative), "utf8"),
          );
          const source = fs.readFileSync(
            path.join(fixture, manifest.cases[0].baselinePath),
            "utf8",
          );
          const jsonl = [
            "--- export metadata: legacy evidence ---",
            ...source
              .split(/\r?\n/)
              .map((line, index) => JSON.stringify({ sequence: index + 1, payload: { line } })),
          ].join("\n");
          fs.writeFileSync(
            path.join(fixture, skillRelative, "assets", "metadata-evidence.jsonl"),
            jsonl,
            "utf8",
          );
        },
      },
      {
        name: "line-wrapped legacy-case source in runtime payload",
        expected: "legacy-case source segment must not leak",
        mutate(fixture) {
          const manifest = JSON.parse(
            fs.readFileSync(path.join(fixture, legacyCaseLineageRelative), "utf8"),
          );
          const source = fs.readFileSync(
            path.join(fixture, manifest.cases[0].baselinePath),
            "utf8",
          );
          fs.writeFileSync(
            path.join(fixture, skillRelative, "assets", "line-wrapped-evidence.txt"),
            source
              .split(/\r?\n/)
              .map((line, index) => `line ${String(index + 1).padStart(4, "0")} | ${line}`)
              .join("\n"),
            "utf8",
          );
        },
      },
      {
        name: "short material fingerprint in unapproved runtime file",
        expected: "legacy-case material-unit fingerprint must not leak",
        mutate(fixture) {
          const { marker } = prepareAuthorizedShortFingerprint(fixture);
          fs.writeFileSync(
            path.join(fixture, skillRelative, "assets", "short-material-leak.txt"),
            `${marker}\n`,
            "utf8",
          );
        },
      },
      {
        name: "duplicate authorized short fingerprint in its target heading",
        expected: "legacy-case material-unit fingerprint must not leak",
        mutate(fixture) {
          const { marker, target } = prepareAuthorizedShortFingerprint(fixture);
          const targetFile = path.join(fixture, target.path);
          edit(targetFile, (text) => {
            const heading = `## ${target.heading}`;
            if (!text.includes(heading)) throw new Error(`Missing exact target heading ${heading}`);
            return text.replace(heading, `${heading}\n\n${marker}`);
          });
        },
      },
      {
        name: "authorized short fingerprint copied under another heading",
        expected: "legacy-case material-unit fingerprint must not leak",
        mutate(fixture) {
          const { marker, target } = prepareAuthorizedShortFingerprint(fixture);
          fs.appendFileSync(
            path.join(fixture, target.path),
            `\n\n## Unapproved Fingerprint Copy\n\n${marker}\n`,
            "utf8",
          );
        },
      },
      {
        name: "missing variant",
        expected: "expected exactly three variants",
        mutate(fixture) {
          fs.rmSync(tripletFiles(fixture, stem001)[2]);
        },
      },
      {
        name: "proposed internal record is not shippable",
        expected: "internal Status must be Accepted or Superseded for shipped runtime records",
        mutate(fixture) {
          edit(internalTripletFiles(fixture, internalStem001)[0], (text) =>
            text.replace("Status: Accepted", "Status: Proposed"),
          );
        },
      },
      {
        name: "accepted internal decision drift",
        expected: "AC-INTERNAL-001: Long Decision drifted from its accepted lock",
        mutate(fixture) {
          edit(internalTripletFiles(fixture, internalStem001)[1], (text) =>
            text.replace(
              "\n## Invariants",
              "\nThis sentence changes the accepted internal decision in place.\n\n## Invariants",
            ),
          );
        },
      },
      {
        name: "internal successor missing reciprocal predecessor metadata",
        expected: "AC-INTERNAL-001 must reciprocally list AC-INTERNAL-002 in Superseded by",
        mutate(fixture) {
          for (const file of internalTripletFiles(fixture, internalStem002)) {
            edit(file, (text) => text.replace("Supersedes: none", "Supersedes: AC-INTERNAL-001"));
          }
        },
      },
      {
        name: "internal decision cannot supersede itself",
        expected: "AC-INTERNAL-002 cannot supersede itself",
        mutate(fixture) {
          for (const file of internalTripletFiles(fixture, internalStem002)) {
            edit(file, (text) =>
              text
                .replace("Status: Accepted", "Status: Superseded")
                .replace("Supersedes: none", "Supersedes: AC-INTERNAL-002")
                .replace("Superseded by: none", "Superseded by: AC-INTERNAL-002"),
            );
          }
        },
      },
      {
        name: "internal decisions cannot form a supersession cycle",
        expected: "Internal ADR supersession cycle detected",
        mutate(fixture) {
          for (const [stem, otherId] of [
            [internalStem001, "AC-INTERNAL-002"],
            [internalStem002, "AC-INTERNAL-001"],
          ]) {
            for (const file of internalTripletFiles(fixture, stem)) {
              edit(file, (text) =>
                text
                  .replace("Status: Accepted", "Status: Superseded")
                  .replace("Supersedes: none", `Supersedes: ${otherId}`)
                  .replace("Superseded by: none", `Superseded by: ${otherId}`),
              );
            }
          }
        },
      },
      {
        name: "internal short navigation target is missing",
        expected: "variant navigation must be exactly",
        mutate(fixture) {
          edit(internalTripletFiles(fixture, internalStem001)[0], (text) =>
            text.replace(`${internalStem001}.long.md`, "missing.long.md"),
          );
        },
      },
      {
        name: "internal malformed navigation",
        expected: "variant navigation must be exactly",
        mutate(fixture) {
          edit(internalTripletFiles(fixture, internalStem001)[0], (text) =>
            text.replace("Variants: **Short** ·", "Variants: **Short** /"),
          );
        },
      },
      {
        name: "internal duplicate navigation",
        expected: "expected exactly one Variants navigation line",
        mutate(fixture) {
          const file = internalTripletFiles(fixture, internalStem001)[0];
          edit(file, (text) => `${text}\n${text.match(/^Variants: .*$/m)?.[0] ?? ""}\n`);
        },
      },
      {
        name: "internal public-conflict eval proof is missing",
        expected: "missing public/internal conflict or promotion assertion",
        mutate(fixture) {
          const file = path.join(
            fixture,
            evalRelative,
            "cases",
            "internal-public-adr-namespace-separation.md",
          );
          edit(file, (text) => text.replace("- contains: public Long governs\n", ""));
        },
      },
      {
        name: "internal promotion eval proof is missing",
        expected: "missing public/internal conflict or promotion assertion",
        mutate(fixture) {
          const file = path.join(
            fixture,
            evalRelative,
            "cases",
            "internal-public-adr-namespace-separation.md",
          );
          edit(file, (text) => text.replace("- contains: decision lock\n", ""));
        },
      },
      {
        name: "internal record leaked into public catalog",
        expected: "internal ADR triplet",
        mutate(fixture) {
          const catalog = path.join(fixture, skillRelative, "references", "adr-catalog.md");
          edit(
            catalog,
            (text) =>
              `${text}\n[Leaked internal record](internal-adr-001-resolve-persistence-surfaces-before-writes.short.md)\n`,
          );
        },
      },
      {
        name: "ID and stem collision",
        expected: "ID collision across stems",
        mutate(fixture) {
          const references = path.join(fixture, skillRelative, "references");
          for (const variant of ["short", "long", "guide"]) {
            fs.copyFileSync(
              path.join(references, `${stem001}.${variant}.md`),
              path.join(references, `ac-adr-001-collision.${variant}.md`),
            );
          }
        },
      },
      {
        name: "shared metadata drift",
        expected: "Category metadata drifts",
        mutate(fixture) {
          edit(tripletFiles(fixture, stem001)[2], (text) =>
            text.replace("Category: governance", "Category: backend"),
          );
        },
      },
      {
        name: "wrong canonical variant",
        expected: "Canonical variant must be Long",
        mutate(fixture) {
          edit(tripletFiles(fixture, stem001)[0], (text) =>
            text.replace("Canonical variant: Long", "Canonical variant: Short"),
          );
        },
      },
      {
        name: "invalid scope and adoptability",
        expected: "Scope must be target-repository",
        mutate(fixture) {
          for (const file of tripletFiles(fixture, stem005)) {
            edit(file, (text) => text.replace("Scope: target-repository", "Scope: skill-runtime"));
          }
        },
      },
      {
        name: "skill-runtime adoptability",
        expected: "Adoptable must be false for skill-runtime ADRs",
        mutate(fixture) {
          for (const file of tripletFiles(fixture, stem036)) {
            edit(file, (text) => text.replace("Adoptable: false", "Adoptable: true"));
          }
        },
      },
      {
        name: "catalog orphan",
        expected: "orphan AC-ADR link",
        mutate(fixture) {
          const catalog = path.join(fixture, skillRelative, "references", "adr-catalog.md");
          edit(catalog, (text) => `${text}\n[Orphan](ac-adr-999-orphan.short.md)\n`);
        },
      },
      {
        name: "setup matrix missing eligible ADR",
        expected: "setup adoption matrix is missing AC-ADR-005",
        mutate(fixture) {
          const setupReport = path.join(
            fixture,
            skillRelative,
            "assets",
            "setup-report-template.md",
          );
          edit(setupReport, (text) =>
            text.replace(
              "| AC-ADR-005   |             |                 |                     |                        |                     |\n",
              "",
            ),
          );
        },
      },
      {
        name: "setup matrix duplicate eligible ADR",
        expected: "setup adoption matrix contains duplicate AC-ADR-005",
        mutate(fixture) {
          const setupReport = path.join(
            fixture,
            skillRelative,
            "assets",
            "setup-report-template.md",
          );
          edit(setupReport, (text) =>
            text.replace(
              "| AC-ADR-005   |             |                 |                     |                        |                     |\n",
              "| AC-ADR-005   |             |                 |                     |                        |                     |\n| AC-ADR-005   |             |                 |                     |                        |                     |\n",
            ),
          );
        },
      },
      {
        name: "setup report stale catalog count",
        expected: "eligible catalog count must be 35; found 34",
        mutate(fixture) {
          const setupReport = path.join(
            fixture,
            skillRelative,
            "assets",
            "setup-report-template.md",
          );
          edit(setupReport, (text) =>
            text.replace(
              "Eligible catalog count (`Scope: target-repository`, `Adoptable: true`): `35`",
              "Eligible catalog count (`Scope: target-repository`, `Adoptable: true`): `34`",
            ),
          );
        },
      },
      {
        name: "setup report inconsistent total count",
        expected: "count equality total must be 35; found 34",
        mutate(fixture) {
          const setupReport = path.join(
            fixture,
            skillRelative,
            "assets",
            "setup-report-template.md",
          );
          edit(setupReport, (text) =>
            text.replace(
              "Count equality: `selected + not-selected = total = 35`: `pass | fail`",
              "Count equality: `selected + not-selected = total = 34`: `pass | fail`",
            ),
          );
        },
      },
      {
        name: "removed legacy reference",
        expected: "stale legacy reference path",
        mutate(fixture) {
          const skill = path.join(fixture, skillRelative, "SKILL.md");
          edit(skill, (text) => `${text}\nLegacy: references/nextjs-request-patterns.md\n`);
        },
      },
      {
        name: "accepted decision drift",
        expected: "Long Decision drifted from its accepted lock",
        mutate(fixture) {
          edit(tripletFiles(fixture, stem001)[1], (text) =>
            text.replace(
              "\n## Invariants",
              "\nThis sentence changes the accepted decision in place.\n\n## Invariants",
            ),
          );
        },
      },
      {
        name: "unsuffixed AC-ADR link",
        expected: "unsuffixed AC-ADR path is forbidden",
        mutate(fixture) {
          const skill = path.join(fixture, skillRelative, "SKILL.md");
          edit(skill, (text) => `${text}\nLegacy: references/${stem001}.md\n`);
        },
      },
      {
        name: "missing catalog route",
        expected: "missing direct link",
        mutate(fixture) {
          const catalog = path.join(fixture, skillRelative, "references", "adr-catalog.md");
          edit(catalog, (text) => text.replace(`${stem001}.guide.md`, "missing-guide.md"));
        },
      },
      {
        name: "non-reciprocal supersession",
        expected: "must reciprocally list",
        mutate(fixture) {
          for (const file of tripletFiles(fixture, stem002)) {
            edit(file, (text) => text.replace("Supersedes: none", "Supersedes: AC-ADR-001"));
          }
        },
      },
      {
        name: "public decision cannot supersede itself",
        expected: "AC-ADR-002 cannot supersede itself",
        mutate(fixture) {
          for (const file of tripletFiles(fixture, stem002)) {
            edit(file, (text) =>
              text
                .replace("Status: Accepted", "Status: Superseded")
                .replace("Supersedes: none", "Supersedes: AC-ADR-002")
                .replace("Superseded by: none", "Superseded by: AC-ADR-002"),
            );
          }
        },
      },
      {
        name: "public decisions cannot form a supersession cycle",
        expected: "Public ADR supersession cycle detected",
        mutate(fixture) {
          for (const [stem, otherId] of [
            [stem002, "AC-ADR-005"],
            [stem005, "AC-ADR-002"],
          ]) {
            for (const file of tripletFiles(fixture, stem)) {
              edit(file, (text) =>
                text
                  .replace("Status: Accepted", "Status: Superseded")
                  .replace("Supersedes: none", `Supersedes: ${otherId}`)
                  .replace("Superseded by: none", `Superseded by: ${otherId}`),
              );
            }
          }
        },
      },
      {
        name: "accepted successor missing predecessor",
        expected: "must reciprocally list",
        mutate(fixture) {
          for (const file of tripletFiles(fixture, stem048)) {
            edit(file, (text) => text.replace("Supersedes: AC-ADR-045", "Supersedes: none"));
          }
        },
      },
      {
        name: "normative guide section",
        expected: "Guide must not define normative Decision or Rules sections",
        mutate(fixture) {
          edit(tripletFiles(fixture, stem001)[2], (text) => `${text}\n## Rules\n\nHidden rule.\n`);
        },
      },
      {
        name: "invalid lineage JSON",
        expected: "invalid JSON",
        mutate(fixture) {
          edit(path.join(fixture, lineageRelative), () => "{");
        },
      },
      {
        name: "missing lineage disposition",
        expected: "missing AC-ADR-044 lineage disposition",
        mutate(fixture) {
          const lineage = path.join(fixture, lineageRelative);
          edit(lineage, (text) => {
            const manifest = JSON.parse(text);
            manifest.decisions = manifest.decisions.filter((entry) => entry.id !== "AC-ADR-044");
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "material lineage drift",
        expected: "Decision lineage does not match",
        mutate(fixture) {
          edit(tripletFiles(fixture, stem001)[2], (text) =>
            text.replace("- `consolidates`:", "- `generalizes`:"),
          );
        },
      },
      {
        name: "independent lineage section",
        expected: "independent disposition must omit Decision lineage",
        mutate(fixture) {
          edit(
            tripletFiles(fixture, stem039)[2],
            (text) =>
              `${text}\n## Decision lineage ##\n\n- \`adapts\`: [ADR-0001](https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/0001-use-open-agent-skills-spec.long.md).\n`,
          );
        },
      },
      {
        name: "legacy provenance heading",
        expected: "legacy Source provenance heading is forbidden",
        mutate(fixture) {
          edit(tripletFiles(fixture, stem001)[2], (text) =>
            text.replace("## Decision lineage", "## Source provenance ##"),
          );
        },
      },
      {
        name: "unsupported lineage relation",
        expected: "unsupported relation",
        mutate(fixture) {
          const lineage = path.join(fixture, lineageRelative);
          edit(lineage, (text) => {
            const manifest = JSON.parse(text);
            manifest.decisions[0].relations[0].type = "informed-by";
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "lineage source status",
        expected: "lineage target Status must be Accepted or Superseded",
        mutate(fixture) {
          edit(repositoryAdrLong(fixture, "0032"), (text) =>
            text.replace("Status: Accepted", "Status: Proposed"),
          );
        },
      },
      {
        name: "lineage source ID",
        expected: "lineage target ID must be ADR-0032",
        mutate(fixture) {
          edit(repositoryAdrLong(fixture, "0032"), (text) =>
            text.replace("ID: ADR-0032", "ID: ADR-9999"),
          );
        },
      },
      {
        name: "lineage source variant",
        expected: "lineage target Variant must be Long",
        mutate(fixture) {
          edit(repositoryAdrLong(fixture, "0032"), (text) =>
            text.replace("Variant: Long", "Variant: Guide"),
          );
        },
      },
      {
        name: "missing lineage source",
        expected: "ADR-0032 must resolve to exactly one repository Long ADR; found 0",
        mutate(fixture) {
          fs.rmSync(repositoryAdrLong(fixture, "0032"));
        },
      },
      {
        name: "lineage heading outside Guide",
        expected: "Decision lineage is permitted only in Guide",
        mutate(fixture) {
          edit(
            tripletFiles(fixture, stem001)[0],
            (text) => `${text}\n### Decision lineage ###\n\nThis heading is not permitted here.\n`,
          );
        },
      },
      {
        name: "primary source only in lineage",
        expected: "primary source link outside Decision lineage",
        mutate(fixture) {
          edit(tripletFiles(fixture, stem001)[2], (text) =>
            text.replace(/\n## Official sources\n[\s\S]*$/, "\n"),
          );
        },
      },
      {
        name: "repo-only lineage manifest in skill payload",
        expected:
          "repo-only decision-lineage manifest must not enter the skill payload by filename or exact content hash",
        mutate(fixture) {
          fs.copyFileSync(
            path.join(fixture, lineageRelative),
            path.join(fixture, skillRelative, "assets", "decision-lineage.json"),
          );
        },
      },
      {
        name: "renamed lineage manifest bytes in skill payload",
        expected:
          "repo-only decision-lineage manifest must not enter the skill payload by filename or exact content hash",
        mutate(fixture) {
          fs.copyFileSync(
            path.join(fixture, lineageRelative),
            path.join(fixture, skillRelative, "assets", "architecture-map.json"),
          );
        },
      },
      {
        name: "single-source consolidation",
        expected: "consolidates requires at least two sources",
        mutate(fixture) {
          const lineage = path.join(fixture, lineageRelative);
          edit(lineage, (text) => {
            const manifest = JSON.parse(text);
            const decision = manifest.decisions.find((entry) => entry.id === "AC-ADR-028");
            decision.relations[0].sources = decision.relations[0].sources.slice(0, 1);
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "missing legacy-case disposition",
        expected: "must use the exact legacy-case lineage case schema",
        mutate(fixture) {
          edit(path.join(fixture, legacyCaseLineageRelative), (text) => {
            const manifest = JSON.parse(text);
            delete manifest.cases[0].disposition;
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "duplicate legacy-case disposition",
        expected: "duplicate legacy source path; found 2 dispositions",
        mutate(fixture) {
          edit(path.join(fixture, legacyCaseLineageRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.cases.push(structuredClone(manifest.cases[0]));
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "unknown legacy-case disposition",
        expected: "disposition must be preserved, adapted, or explicitly-rejected",
        mutate(fixture) {
          edit(path.join(fixture, legacyCaseLineageRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.cases[0].disposition = "omitted";
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "missing legacy-case unit outcome",
        expected: "must use the exact expectation schema",
        mutate(fixture) {
          edit(path.join(fixture, legacyCaseLineageRelative), (text) => {
            const manifest = JSON.parse(text);
            delete manifest.cases[0].expectations[0].outcome;
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "missing adapted legacy-case unit reason",
        expected: "reason must explain this source-unit disposition",
        mutate(fixture) {
          edit(path.join(fixture, legacyCaseLineageRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.cases[0].expectations[0].outcome = "adapted";
            manifest.cases[0].expectations[0].reason = "";
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "duplicate legacy-case material mapping",
        expected: "is not mapped exactly once; found 2",
        mutate(fixture) {
          edit(path.join(fixture, legacyCaseLineageRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.cases[0].expectations.push(structuredClone(manifest.cases[0].expectations[0]));
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "wrong legacy-case source hash",
        expected: "source sha256 does not match the independent HEAD trust anchor",
        mutate(fixture) {
          edit(path.join(fixture, legacyCaseLineageRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.cases[0].sourceSha256 = "0".repeat(64);
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "missing legacy-case target",
        expected: "missing required file",
        mutate(fixture) {
          edit(path.join(fixture, legacyCaseLineageRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.cases[0].expectations[0].targets[0].path =
              "skill-evals/architecture-compass/cases/no-such-replacement.md";
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "missing legacy-case target marker",
        expected: "No such legacy-case target marker",
        mutate(fixture) {
          edit(path.join(fixture, legacyCaseLineageRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.cases[0].expectations[0].targets[0].markers = [
              "No such legacy-case target marker",
            ];
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "missing legacy-case target heading",
        expected: 'target heading "No such legacy-case target heading" must exist exactly once',
        mutate(fixture) {
          edit(path.join(fixture, legacyCaseLineageRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.cases[0].expectations[0].targets[0].heading =
              "No such legacy-case target heading";
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "duplicate legacy-case target heading",
        expected: "must exist exactly once",
        mutate(fixture) {
          const manifest = JSON.parse(
            fs.readFileSync(path.join(fixture, legacyCaseLineageRelative), "utf8"),
          );
          const target = manifest.cases[0].expectations[0].targets[0];
          fs.appendFileSync(
            path.join(fixture, target.path),
            `\n\n## ${target.heading}\n\n${target.markers[0]}\n`,
            "utf8",
          );
        },
      },
      {
        name: "uncovered staged-deletion legacy case",
        expected: "uncovered staged-deletion contract",
        mutate(fixture) {
          edit(path.join(fixture, legacyCaseLineageRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.cases.shift();
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "unexpected staged-deletion legacy case",
        expected: "source is outside the exact staged-deletion contract",
        mutate(fixture) {
          edit(path.join(fixture, legacyCaseLineageRelative), (text) => {
            const manifest = JSON.parse(text);
            const extra = structuredClone(manifest.cases[0]);
            extra.sourcePath =
              "skill-evals/architecture-compass/cases/not-in-the-reviewed-deletion-set.md";
            manifest.cases.push(extra);
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "unmapped legacy-case material expectation",
        expected: "is not mapped exactly once; found 0",
        mutate(fixture) {
          edit(path.join(fixture, legacyCaseLineageRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.cases[0].expectations.shift();
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "legacy-case source bytes in runtime payload",
        expected: "legacy case source bytes must not leak into the installed runtime payload",
        mutate(fixture) {
          const manifest = JSON.parse(
            fs.readFileSync(path.join(fixture, legacyCaseLineageRelative), "utf8"),
          );
          fs.copyFileSync(
            path.join(fixture, manifest.cases[0].baselinePath),
            path.join(fixture, skillRelative, "assets", "legacy-case-leak.md"),
          );
        },
      },
      {
        name: "legacy-case baseline filename in runtime payload",
        expected: "legacy-case evidence filename must not leak",
        mutate(fixture) {
          const manifest = JSON.parse(
            fs.readFileSync(path.join(fixture, legacyCaseLineageRelative), "utf8"),
          );
          const baselinePath = manifest.cases[0].baselinePath;
          fs.copyFileSync(
            path.join(fixture, baselinePath),
            path.join(fixture, skillRelative, "assets", path.basename(baselinePath)),
          );
        },
      },
      {
        name: "legacy-case manifest filename in runtime payload",
        expected: "legacy-case evidence filename must not leak",
        mutate(fixture) {
          fs.copyFileSync(
            path.join(fixture, legacyCaseLineageRelative),
            path.join(fixture, skillRelative, "assets", "legacy-case-lineage.json"),
          );
        },
      },
      {
        name: "renamed legacy-case manifest content in runtime payload",
        expected: "legacy-case lineage manifest content must not leak",
        mutate(fixture) {
          fs.copyFileSync(
            path.join(fixture, legacyCaseLineageRelative),
            path.join(fixture, skillRelative, "assets", "renamed-lineage-map.json"),
          );
        },
      },
      {
        name: "wrapped legacy-case source in runtime payload",
        expected: "legacy-case source segment must not leak",
        mutate(fixture) {
          const manifest = JSON.parse(
            fs.readFileSync(path.join(fixture, legacyCaseLineageRelative), "utf8"),
          );
          const source = fs.readFileSync(
            path.join(fixture, manifest.cases[0].baselinePath),
            "utf8",
          );
          fs.writeFileSync(
            path.join(fixture, skillRelative, "assets", "wrapped-evidence.md"),
            `# Runtime wrapper\n\n${source}`,
            "utf8",
          );
        },
      },
      {
        name: "markdown-blockquoted legacy-case source in runtime payload",
        expected: "legacy-case source segment must not leak",
        mutate(fixture) {
          const manifest = JSON.parse(
            fs.readFileSync(path.join(fixture, legacyCaseLineageRelative), "utf8"),
          );
          const source = fs.readFileSync(
            path.join(fixture, manifest.cases[0].baselinePath),
            "utf8",
          );
          fs.writeFileSync(
            path.join(fixture, skillRelative, "assets", "blockquoted-evidence.md"),
            source
              .split(/\r?\n/)
              .map((line) => `> ${line}`)
              .join("\n"),
            "utf8",
          );
        },
      },
      {
        name: "JSON-encoded legacy-case source lines in runtime payload",
        expected: "legacy-case source segment must not leak",
        mutate(fixture) {
          const manifest = JSON.parse(
            fs.readFileSync(path.join(fixture, legacyCaseLineageRelative), "utf8"),
          );
          const source = fs.readFileSync(
            path.join(fixture, manifest.cases[0].baselinePath),
            "utf8",
          );
          fs.writeFileSync(
            path.join(fixture, skillRelative, "assets", "encoded-evidence.json"),
            `${JSON.stringify(source.split(/\r?\n/), null, 2)}\n`,
            "utf8",
          );
        },
      },
      {
        name: "JSON-string legacy-case source in runtime payload",
        expected: "legacy-case source segment must not leak",
        mutate(fixture) {
          const manifest = JSON.parse(
            fs.readFileSync(path.join(fixture, legacyCaseLineageRelative), "utf8"),
          );
          const source = fs.readFileSync(
            path.join(fixture, manifest.cases[0].baselinePath),
            "utf8",
          );
          fs.writeFileSync(
            path.join(fixture, skillRelative, "assets", "encoded-evidence-string.json"),
            `${JSON.stringify(source)}\n`,
            "utf8",
          );
        },
      },
      {
        name: "JSONL legacy-case source lines in runtime payload",
        expected: "legacy-case source segment must not leak",
        mutate(fixture) {
          const manifest = JSON.parse(
            fs.readFileSync(path.join(fixture, legacyCaseLineageRelative), "utf8"),
          );
          const source = fs.readFileSync(
            path.join(fixture, manifest.cases[0].baselinePath),
            "utf8",
          );
          fs.writeFileSync(
            path.join(fixture, skillRelative, "assets", "encoded-evidence.jsonl"),
            `${source
              .split(/\r?\n/)
              .map((line) => JSON.stringify(line))
              .join("\n")}\n`,
            "utf8",
          );
        },
      },
      {
        name: "partial legacy-case source in runtime payload",
        expected: "legacy-case source segment must not leak",
        mutate(fixture) {
          const manifest = JSON.parse(
            fs.readFileSync(path.join(fixture, legacyCaseLineageRelative), "utf8"),
          );
          const source = fs.readFileSync(path.join(fixture, manifest.cases[0].baselinePath));
          fs.writeFileSync(
            path.join(fixture, skillRelative, "assets", "partial-evidence.md"),
            source.subarray(0, Math.min(source.length, 512)),
          );
        },
      },
      {
        name: "short unaligned legacy-case source in runtime payload",
        expected: "legacy-case source segment must not leak",
        mutate(fixture) {
          const manifest = JSON.parse(
            fs.readFileSync(path.join(fixture, legacyCaseLineageRelative), "utf8"),
          );
          const source = fs
            .readFileSync(path.join(fixture, manifest.cases[0].baselinePath), "utf8")
            .replace(/\s+/g, " ")
            .trim();
          fs.writeFileSync(
            path.join(fixture, skillRelative, "assets", "short-unaligned-evidence.md"),
            source.slice(37, 228),
            "utf8",
          );
        },
      },
      {
        name: "missing legacy coverage unit",
        expected: "coverage partition expected line 1",
        mutate(fixture) {
          edit(path.join(fixture, coverageRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.units.shift();
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "duplicate legacy coverage ID",
        expected: "duplicate coverage ID",
        mutate(fixture) {
          edit(path.join(fixture, coverageRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.units[1].id = manifest.units[0].id;
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "overlapping legacy source ranges",
        expected: "coverage partition expected line 12, found 11",
        mutate(fixture) {
          edit(path.join(fixture, coverageRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.units[1].source.startLine = 11;
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "wrong legacy source commit",
        expected: "source commit must be the reviewed",
        mutate(fixture) {
          edit(path.join(fixture, sourceLockRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.source.commit = "0000000000000000000000000000000000000000";
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "wrong legacy source blob",
        expected: "Git blob hash does not match the baseline bytes",
        mutate(fixture) {
          edit(path.join(fixture, sourceLockRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.files[0].blob = "0000000000000000000000000000000000000000";
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "wrong legacy range hash",
        expected: "source sha256 does not match the locked line range",
        mutate(fixture) {
          edit(path.join(fixture, coverageRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.units[0].source.sha256 = "0".repeat(64);
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "legacy coverage line gap",
        expected: "coverage partition expected line 1, found 2",
        mutate(fixture) {
          edit(path.join(fixture, coverageRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.units[0].source.startLine = 2;
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "unknown legacy disposition",
        expected: "disposition must be preserved, adapted, or explicitly-rejected",
        mutate(fixture) {
          edit(path.join(fixture, coverageRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.units[0].disposition = "omitted";
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "missing legacy summary",
        expected: "summary must be a non-empty reviewed short description",
        mutate(fixture) {
          edit(path.join(fixture, coverageRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.units[0].summary = "";
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "unvalidated currentSources field",
        expected: "must use the exact coverage-unit schema",
        mutate(fixture) {
          edit(path.join(fixture, coverageRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.units[0].currentSources = [
              "skills/engineering-workflows/architecture-compass/references/does-not-exist.long.md",
            ];
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "missing legacy target",
        expected: "every coverage unit requires at least one active target",
        mutate(fixture) {
          edit(path.join(fixture, coverageRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.units[0].targets = [];
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "missing Accepted Long target",
        expected: "every legacy unit requires an exact Accepted canonical Long Decision target",
        mutate(fixture) {
          edit(path.join(fixture, coverageRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.units[0].targets = manifest.units[0].targets.filter(
              (target) => !target.path.endsWith(".long.md"),
            );
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "non-Accepted Long target",
        expected: "canonical Long target Status must be Accepted",
        mutate(fixture) {
          const manifest = JSON.parse(
            fs.readFileSync(path.join(fixture, coverageRelative), "utf8"),
          );
          const target = manifest.units[0].targets.find((candidate) =>
            candidate.path.endsWith(".long.md"),
          );
          edit(path.join(fixture, target.path), (text) =>
            text.replace("Status: Accepted", "Status: Superseded"),
          );
        },
      },
      {
        name: "Long target does not name Decision",
        expected: "canonical Long target heading must be Decision",
        mutate(fixture) {
          edit(path.join(fixture, coverageRelative), (text) => {
            const manifest = JSON.parse(text);
            const target = manifest.units[0].targets.find((candidate) =>
              candidate.path.endsWith(".long.md"),
            );
            target.heading = "Context";
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "missing Long Decision marker",
        expected: 'target section is missing marker "No such Long marker"',
        mutate(fixture) {
          edit(path.join(fixture, coverageRelative), (text) => {
            const manifest = JSON.parse(text);
            const target = manifest.units[0].targets.find((candidate) =>
              candidate.path.endsWith(".long.md"),
            );
            target.markers = ["No such Long marker"];
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "missing legacy target heading",
        expected: 'target heading "No such heading" must exist exactly once',
        mutate(fixture) {
          edit(path.join(fixture, coverageRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.units[0].targets[0].heading = "No such heading";
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "missing legacy target marker",
        expected: 'target section is missing marker "No such marker"',
        mutate(fixture) {
          edit(path.join(fixture, coverageRelative), (text) => {
            const manifest = JSON.parse(text);
            manifest.units[0].targets[0].markers = ["No such marker"];
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "removed Next.js hydration marker",
        expected: 'target section is missing marker "HydrationBoundary"',
        mutate(fixture) {
          const manifest = JSON.parse(
            fs.readFileSync(path.join(fixture, coverageRelative), "utf8"),
          );
          const target = manifest.units
            .flatMap((unit) => unit.targets)
            .find((candidate) => candidate.markers.includes("HydrationBoundary"));
          edit(path.join(fixture, target.path), (text) =>
            text.replaceAll("HydrationBoundary", "RemovedHydrationMarker"),
          );
        },
      },
      {
        name: "missing expectedVersion accepted before numeric conversion",
        expected: 'target section is missing marker "const expectedVersionField = z .string()"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem010)[2], (text) =>
            text.replace(
              `const expectedVersionField = z
  .string()
  .trim()
  .regex(/^(0|[1-9]\\d*)$/, "expectedVersion must be a non-negative integer")
  .transform((value) => Number(value))
  .pipe(z.number().int().min(0).max(Number.MAX_SAFE_INTEGER));`,
              "const expectedVersionField = z.coerce.number().int().nonnegative();",
            ),
          );
        },
      },
      {
        name: "empty expectedVersion accepted before numeric conversion",
        expected: 'target section is missing marker ".regex(/^(0|[1-9]\\\\d*)$/"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem010)[2], (text) =>
            text.replace(
              '  .regex(/^(0|[1-9]\\d*)$/, "expectedVersion must be a non-negative integer")',
              "  .min(0)",
            ),
          );
        },
      },
      {
        name: "unscoped realtime subscription",
        expected:
          'target section is missing marker "const subscription = subscribeToProjects({ actorKey: identity.actorKey, tenantKey: identity.tenantKey, privilegeKey: identity.privilegeKey, locale: identity.locale, filters: canonicalFilters, resourceScope,"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem009)[2], (text) =>
            text.replace(
              "    actorKey: identity.actorKey,\n    tenantKey: identity.tenantKey,\n    privilegeKey: identity.privilegeKey,\n    locale: identity.locale,\n    filters: canonicalFilters,\n    resourceScope,\n",
              "",
            ),
          );
        },
      },
      {
        name: "query options reintroduce raw versus canonical filter drift",
        expected:
          'target section is missing marker "queryFn: () => fetchProjectsHttp(contract.canonicalFilters)"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem009)[2], (text) =>
            text
              .replace(
                'queryKey: ["projects", identity, canonicalFilters] as const',
                'queryKey: ["projects", identity, filterInput] as const',
              )
              .replace(
                "export const projectsClientOptions = (contract: ProjectsQueryContract) =>",
                "export const projectsClientOptions = (contract: ProjectsQueryContract, rawFilters: ProjectFilterInput) =>",
              )
              .replace(
                "queryFn: () => fetchProjectsHttp(contract.canonicalFilters)",
                "queryFn: () => fetchProjectsHttp(rawFilters)",
              )
              .replace(
                "export const projectsServerOptions = (actor: Actor, contract: ProjectsQueryContract) =>",
                "export const projectsServerOptions = (actor: Actor, contract: ProjectsQueryContract, rawFilters: ProjectFilterInput) =>",
              )
              .replace(
                "queryFn: () => loadProjects({ actor, filters: contract.canonicalFilters })",
                "queryFn: () => loadProjects({ actor, filters: rawFilters })",
              ),
          );
        },
      },
      {
        name: "hydration consumer drops the shared canonical contract",
        expected: 'target section is missing marker "<ProjectsList contract={contract} />"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem009)[2], (text) =>
            text
              .replace(
                "<ProjectsList contract={contract} />",
                "<ProjectsList identity={props.identity} filters={props.filters} />",
              )
              .replace(
                "<ProjectsSuspenseList contract={contract} />",
                "<ProjectsSuspenseList identity={identity} filters={filters} />",
              ),
          );
        },
      },
      {
        name: "retry consumer drops the shared canonical contract",
        expected: 'target section is missing marker "<ProjectsSuspenseList contract={contract} />"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem009)[2], (text) =>
            text.replace(
              `<Suspense fallback={<ProjectsSkeleton />}>
            <ProjectsSuspenseList contract={contract} />
          </Suspense>
        </ErrorBoundary>`,
              `<Suspense fallback={<ProjectsSkeleton />}>
            <ProjectsSuspenseList identity={identity} filters={filters} />
          </Suspense>
        </ErrorBoundary>`,
            ),
          );
        },
      },
      {
        name: "realtime resource scope reintroduces raw filter drift",
        expected:
          'target section is missing marker "projectResourceScope({ actorKey: identity.actorKey, tenantKey: identity.tenantKey, privilegeKey: identity.privilegeKey, locale: identity.locale, filters: canonicalFilters, })"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem009)[2], (text) =>
            text.replace(
              `projectResourceScope({
      actorKey: identity.actorKey,
      tenantKey: identity.tenantKey,
      privilegeKey: identity.privilegeKey,
      locale: identity.locale,
      filters: canonicalFilters,
    })`,
              `projectResourceScope({
      actorKey: identity.actorKey,
      tenantKey: identity.tenantKey,
      privilegeKey: identity.privilegeKey,
      locale: identity.locale,
      filters: filterInput,
    })`,
            ),
          );
        },
      },
      {
        name: "realtime cache operations drop the contract-derived query key",
        expected: 'target section is missing marker "queryClient.setQueryData(queryKey"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem009)[2], (text) =>
            text
              .replace("queryClient.setQueryData(queryKey", 'queryClient.setQueryData(["projects"]')
              .replaceAll(
                "queryClient.invalidateQueries({ queryKey, exact: true })",
                'queryClient.invalidateQueries({ queryKey: ["projects"] })',
              ),
          );
        },
      },
      {
        name: "realtime subscription omits privilege resubscription dependency",
        expected:
          'target section is missing marker "return () => subscription.unsubscribe(); }, [ canonicalFilters, identity.actorKey, identity.locale, identity.privilegeKey, identity.tenantKey, queryClient, queryKey, resourceScope, ]);"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem009)[2], (text) =>
            text.replace(
              `return () => subscription.unsubscribe();
}, [
  canonicalFilters,
  identity.actorKey,
  identity.locale,
  identity.privilegeKey,
  identity.tenantKey,
  queryClient,
  queryKey,
  resourceScope,
]);`,
              `return () => subscription.unsubscribe();
}, [
  canonicalFilters,
  identity.actorKey,
  identity.locale,
  identity.tenantKey,
  queryClient,
  queryKey,
  resourceScope,
]);`,
            ),
          );
        },
      },
      {
        name: "backend runtime start drops AbortSignal",
        expected:
          'missing backend lifecycle marker "operation: (signal) => runtime!.start(signal)"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace(
              "operation: (signal) => runtime!.start(signal)",
              "operation: () => runtime!.start()",
            ),
          );
        },
      },
      {
        name: "backend runtime acquisition drops AbortSignal",
        expected:
          'missing backend lifecycle marker "operation: (signal) => runtimeOwner!.acquire(signal)"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace(
              "operation: (signal) => runtimeOwner!.acquire(signal)",
              "operation: () => runtimeOwner!.acquire()",
            ),
          );
        },
      },
      {
        name: "backend signal handlers registered after runtime acquisition",
        expected: "signal handlers must precede runtime acquisition",
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) => {
            const registrations =
              '  process.on("SIGINT", onSigint);\n  process.on("SIGTERM", onSigterm);\n';
            return text
              .replace(registrations, "")
              .replace(
                "        runtimeOwner = prepareRuntimeAcquisition(config, bootstrapLogger);",
                `        runtimeOwner = prepareRuntimeAcquisition(config, bootstrapLogger);\n${registrations}`,
              );
          });
        },
      },
      {
        name: "backend database acquisition precedes disposer registration",
        expected: "database disposer must precede external acquisition",
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace(
              "    closeStack.push((cleanupSignal) => databaseOwner.close(cleanupSignal));\n    const database = await createDatabase(databaseOwner, signal);",
              "    const database = await createDatabase(databaseOwner, signal);\n    closeStack.push((cleanupSignal) => databaseOwner.close(cleanupSignal));",
            ),
          );
        },
      },
      {
        name: "backend late operation rejection loses observer",
        expected:
          'missing backend lifecycle marker "const operationOutcome = settle(Promise.resolve().then(() => operation(signal)))"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace(
              "const operationOutcome = settle(Promise.resolve().then(() => operation(signal)))",
              "const operationOutcome = operation(signal)",
            ),
          );
        },
      },
      {
        name: "backend aggregate error drops primary-cleanup ordering",
        expected:
          'missing backend lifecycle marker "return new AggregateError([primary, cleanup], message, { cause: primary })"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace(
              "return new AggregateError([primary, cleanup], message, { cause: primary })",
              "return new AggregateError([cleanup], message, { cause: cleanup })",
            ),
          );
        },
      },
      {
        name: "backend internal close terminal bypasses failure preservation",
        expected:
          "missing coupled backend lifecycle contract close deadline and direct-rejection escalation",
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace(
              "terminal: (failure) => invokeTerminalPreservingFailure(failure)",
              "terminal",
            ),
          );
        },
      },
      {
        name: "backend direct close rejection bypasses failure preservation",
        expected:
          "missing coupled backend lifecycle contract close deadline and direct-rejection escalation",
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace(
              "return invokeTerminalPreservingFailure({ stage, cause: error })",
              "return terminal({ stage, cause: error })",
            ),
          );
        },
      },
      {
        name: "backend close terminal aggregate reverses failure order",
        expected: "missing coupled backend lifecycle contract close terminal error preservation",
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace(
              "        failure.cause,\n        terminalError,",
              "        terminalError,\n        failure.cause,",
            ),
          );
        },
      },
      {
        name: "backend shared shutdown rejection is discarded",
        expected: "missing coupled backend lifecycle contract observed shared shutdown",
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace(
              "      (error) => lifecycleDone.resolve({ ok: false, error }),",
              "      () => lifecycleDone.resolve({ ok: true }),",
            ),
          );
        },
      },
      {
        name: "backend startup failure reintroduces a falsy truthiness gate",
        expected:
          "missing coupled backend lifecycle contract tagged falsy-safe startup failure unwind",
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace(
              "    if (!startupOutcome.ok) {",
              "    if (!startupOutcome.ok && startupOutcome.error) {",
            ),
          );
        },
      },
      {
        name: "backend main no longer awaits lifecycle completion",
        expected: 'missing backend lifecycle marker "const outcome = await lifecycleDone.promise"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace(
              "const outcome = await lifecycleDone.promise",
              "const outcome = { ok: true } as const",
            ),
          );
        },
      },
      {
        name: "backend outer finally loses signal-handler cleanup",
        expected: "missing coupled backend lifecycle contract guaranteed signal-handler cleanup",
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace(
              "    // Also runs when an injected terminal function throws in deterministic tests.\n    removeSignalHandlers();",
              "    // Handler cleanup removed by negative fixture.",
            ),
          );
        },
      },
      {
        name: "backend listener bind drops AbortSignal",
        expected:
          'missing backend lifecycle marker "operation: (signal) => listenerOwner!.bind(signal)"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace(
              "operation: (signal) => listenerOwner!.bind(signal)",
              "operation: () => listenerOwner!.bind()",
            ),
          );
        },
      },
      {
        name: "backend drain drops AbortSignal",
        expected:
          'missing backend lifecycle marker "operation: (signal) => listener!.drain(signal)"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace(
              "operation: (signal) => listener!.drain(signal)",
              "operation: () => listener!.drain()",
            ),
          );
        },
      },
      {
        name: "backend admission stop drops AbortSignal",
        expected:
          'missing backend lifecycle marker "operation: (signal) => listener!.stopAdmission(signal)"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace(
              "operation: (signal) => listener!.stopAdmission(signal)",
              "operation: () => listener!.stopAdmission()",
            ),
          );
        },
      },
      {
        name: "backend drain gate starts open before admission stop",
        expected: "missing coupled backend lifecycle contract admission stop before drain",
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace("let admissionStopped = false", "let admissionStopped = true"),
          );
        },
      },
      {
        name: "backend drain gate opens before admission stop settles",
        expected: "missing coupled backend lifecycle contract admission stop before drain",
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text
              .replace(
                '            await withDeadline({\n              stage: "listener-stop-admission",',
                '            const admissionStop = withDeadline({\n              stage: "listener-stop-admission",',
              )
              .replace(
                "            admissionStopped = true;\n          } catch (error) {",
                "            admissionStopped = true;\n            await admissionStop;\n          } catch (error) {",
              ),
          );
        },
      },
      {
        name: "backend drain runs without confirmed admission stop",
        expected: "missing coupled backend lifecycle contract admission stop before drain",
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace("if (admissionStopped) {", "if (true) {"),
          );
        },
      },
      {
        name: "backend partial bind loses synchronous disposer contract",
        expected:
          'missing backend lifecycle marker "must synchronously return a closeable adapter **before** `bind(signal)` can open a socket"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace(
              "must synchronously return a closeable adapter **before** `bind(signal)` can open a socket",
              "may return a closeable adapter after binding begins",
            ),
          );
        },
      },
      {
        name: "backend never-resolving start test removed",
        expected:
          'missing backend lifecycle marker "Return a never-resolving `runtime.start(signal)`"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace(
              "Return a never-resolving `runtime.start(signal)`",
              "Return a rejected `runtime.start(signal)`",
            ),
          );
        },
      },
      {
        name: "backend never-resolving bind test removed",
        expected:
          'missing backend lifecycle marker "Let `bind(signal)` open a test socket and then never resolve"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace(
              "Let `bind(signal)` open a test socket and then never resolve",
              "Let `bind(signal)` reject before opening a test socket",
            ),
          );
        },
      },
      {
        name: "backend never-resolving drain test removed",
        expected: 'missing backend lifecycle marker "make `drain(signal)` never resolve"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace(
              "make `drain(signal)` never resolve",
              "make `drain(signal)` reject immediately",
            ),
          );
        },
      },
      {
        name: "backend never-resolving admission-stop test removed",
        expected: 'missing backend lifecycle marker "Make `stopAdmission(signal)` never resolve"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace(
              "Make `stopAdmission(signal)` never resolve",
              "Make `stopAdmission(signal)` reject immediately",
            ),
          );
        },
      },
      {
        name: "backend never-resolving listener-close test removed",
        expected:
          'missing backend lifecycle marker "Make `listenerOwner.close(signal)` never resolve"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace(
              "Make `listenerOwner.close(signal)` never resolve",
              "Make `listenerOwner.close(signal)` reject immediately",
            ),
          );
        },
      },
      {
        name: "backend never-resolving runtime-close test removed",
        expected:
          'missing backend lifecycle marker "Make `runtimeOwner.close(signal)` never resolve"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace(
              "Make `runtimeOwner.close(signal)` never resolve",
              "Make `runtimeOwner.close(signal)` reject immediately",
            ),
          );
        },
      },
      {
        name: "backend listener close stage mislabeled",
        expected: "missing coupled backend lifecycle contract listener closeOrTerminate call site",
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replaceAll('"listener-close"', '"listener-bind"'),
          );
        },
      },
      {
        name: "backend listener close call drops owner cleanup",
        expected: "missing coupled backend lifecycle contract listener closeOrTerminate call site",
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace(
              "(signal) => listenerOwner?.close(signal) ?? Promise.resolve()",
              "async () => {}",
            ),
          );
        },
      },
      {
        name: "backend runtime close stage mislabeled",
        expected: "missing coupled backend lifecycle contract runtime closeOrTerminate call site",
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replaceAll('"runtime-close"', '"runtime-start"'),
          );
        },
      },
      {
        name: "backend runtime close call drops owner cleanup",
        expected: "missing coupled backend lifecycle contract runtime closeOrTerminate call site",
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace(
              "(signal) => runtimeOwner?.close(signal) ?? Promise.resolve()",
              "async () => {}",
            ),
          );
        },
      },
      {
        name: "backend shutdown terminal escalation removed",
        expected: 'missing backend lifecycle marker "function terminalShutdownFailure"',
        mutate(fixture) {
          edit(tripletFiles(fixture, stem011)[2], (text) =>
            text.replace("function terminalShutdownFailure", "function recordShutdownFailure"),
          );
        },
      },
      {
        name: "backend lifecycle eval assertion removed",
        expected:
          'missing backend lifecycle assertion "- contains: never-resolving drain terminal escalation"',
        mutate(fixture) {
          const backendCase = path.join(
            fixture,
            evalRelative,
            "cases",
            "selective-backend-routing.md",
          );
          edit(backendCase, (text) =>
            text.replace("- contains: never-resolving drain terminal escalation\n", ""),
          );
        },
      },
      {
        name: "unsplit legacy code examples",
        expected: "split the unit so each historical code example is reviewable",
        mutate(fixture) {
          edit(path.join(fixture, coverageRelative), (text) => {
            const manifest = JSON.parse(text);
            const unit = manifest.units.find(
              (entry) => entry.id === "legacy:nextjs-request-patterns:07.02",
            );
            unit.source.endLine = 229;
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "legacy coverage boundary inside an open code fence",
        expected: "section boundary splits a Markdown code fence",
        mutate(fixture) {
          edit(path.join(fixture, coverageRelative), (text) => {
            const manifest = JSON.parse(text);
            const unit = manifest.units.find(
              (entry) => entry.id === "legacy:nextjs-request-patterns:07.02",
            );
            unit.source.endLine = 209;
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
      {
        name: "historical code mapped only to arbitrary Guide prose",
        expected:
          "every preserved or adapted historical code example requires a current Guide code or example target",
        mutate(fixture) {
          const guide = path.join(
            fixture,
            skillRelative,
            "references",
            "ac-adr-012-resolve-environment-and-configuration-at-deployable-boundaries.guide.md",
          );
          edit(guide, (text) =>
            text.replace(
              `\`\`\`json
{
  "scripts": {
    "dev": "bun --env-file=.env.development.local --watch src/main.ts",
    "start": "bun --no-env-file src/main.ts"
  }
}
\`\`\``,
              `Launcher illustration expressed only as ordinary prose:

{
  "scripts": {
    "dev": "bun --env-file=.env.development.local --watch src/main.ts",
    "start": "bun --no-env-file src/main.ts"
  }
}`,
            ),
          );
        },
      },
      {
        name: "repo-only legacy evidence in skill payload",
        expected: "repo-only legacy-reference evidence bytes must not enter the skill payload",
        mutate(fixture) {
          fs.copyFileSync(
            path.join(fixture, coverageRelative),
            path.join(fixture, skillRelative, "assets", "legacy-reference-coverage.json"),
          );
        },
      },
      {
        name: "renamed legacy baseline bytes in skill payload",
        expected: "repo-only legacy-reference evidence bytes must not enter the skill payload",
        mutate(fixture) {
          fs.copyFileSync(
            path.join(fixture, legacyBaselineRelative, "adoption-workflows.md"),
            path.join(fixture, skillRelative, "assets", "historical-pattern.md"),
          );
        },
      },
      {
        name: "wrapped renamed legacy baseline bytes in skill payload",
        expected: "repo-only legacy-reference evidence bytes must not enter the skill payload",
        mutate(fixture) {
          fs.writeFileSync(
            path.join(fixture, skillRelative, "assets", "wrapped-historical-pattern.md"),
            Buffer.concat([
              Buffer.from("wrapper prefix\n", "utf8"),
              fs.readFileSync(path.join(fixture, legacyBaselineRelative, "adoption-workflows.md")),
              Buffer.from("wrapper suffix\n", "utf8"),
            ]),
          );
        },
      },
      {
        name: "wrapped renamed legacy source lock in skill payload",
        expected: "repo-only legacy-reference evidence bytes must not enter the skill payload",
        mutate(fixture) {
          fs.writeFileSync(
            path.join(fixture, skillRelative, "assets", "wrapped-source-custody.txt"),
            Buffer.concat([
              Buffer.from("wrapper prefix\n", "utf8"),
              fs.readFileSync(path.join(fixture, sourceLockRelative)),
              Buffer.from("wrapper suffix\n", "utf8"),
            ]),
          );
        },
      },
      {
        name: "wrapped renamed legacy coverage in skill payload",
        expected: "repo-only legacy-reference evidence bytes must not enter the skill payload",
        mutate(fixture) {
          fs.writeFileSync(
            path.join(fixture, skillRelative, "assets", "wrapped-coverage-custody.txt"),
            Buffer.concat([
              Buffer.from("wrapper prefix\n", "utf8"),
              fs.readFileSync(path.join(fixture, coverageRelative)),
              Buffer.from("wrapper suffix\n", "utf8"),
            ]),
          );
        },
      },
      {
        name: "forbidden payload hash uses every descriptor read phase",
        expected: "repo-only legacy-reference evidence bytes must not enter the skill payload",
        mutate(fixture) {
          fs.copyFileSync(
            path.join(fixture, legacyBaselineRelative, "adoption-workflows.md"),
            path.join(fixture, skillRelative, "assets", "exact-forbidden-evidence.md"),
          );
        },
        run(fixture) {
          const target = path.join(fixture, skillRelative, "assets", "exact-forbidden-evidence.md");
          const observedPhases = new Set();
          const result = runLegacyEvidenceValidator(fixture, ({ file, phase }) => {
            if (file === target) observedPhases.add(phase);
          });
          for (const phase of ["before-open", "after-open", "after-read"]) {
            if (!observedPhases.has(phase)) {
              throw new Error(`forbidden payload hash did not execute ${phase}`);
            }
          }
          return result;
        },
      },
      {
        name: "payload mutation during a later semantic final seal",
        expected: "validated payload bytes changed after the original leak scan",
        mutate(fixture) {
          fs.writeFileSync(
            path.join(fixture, skillRelative, "assets", "late-final-seal-victim.md"),
            "harmless payload before the final seal\n",
            "utf8",
          );
        },
        run(fixture) {
          const victim = path.join(fixture, skillRelative, "assets", "late-final-seal-victim.md");
          let fired = false;
          const result = runLegacyEvidenceValidator(fixture, ({ kind, pass, phase }) => {
            if (
              fired ||
              kind !== "semantic" ||
              pass !== "forward" ||
              phase !== "before-final-record-seal"
            ) {
              return;
            }
            fired = true;
            fs.writeFileSync(
              victim,
              fs.readFileSync(path.join(fixture, legacyBaselineRelative, "adoption-workflows.md")),
            );
          });
          if (!fired) throw new Error("late payload final-seal mutation hook did not execute");
          return result;
        },
      },
      {
        name: "payload sibling addition during a later semantic final seal",
        expected: "directory changed before payload traversal publication",
        mutate() {},
        run(fixture) {
          const sibling = path.join(fixture, skillRelative, "assets", "late-final-seal-sibling.md");
          let fired = false;
          const result = runLegacyEvidenceValidator(fixture, ({ kind, pass, phase }) => {
            if (
              fired ||
              kind !== "semantic" ||
              pass !== "forward" ||
              phase !== "before-final-record-seal"
            ) {
              return;
            }
            fired = true;
            fs.writeFileSync(sibling, "late sibling outside the original traversal\n", "utf8");
          });
          if (!fired) throw new Error("late payload sibling-add hook did not execute");
          return result;
        },
      },
      {
        name: "payload removal during the reverse final seal",
        expected: "retained payload descriptor no longer matches the current payload path",
        mutate(fixture) {
          fs.writeFileSync(
            path.join(fixture, skillRelative, "assets", "reverse-final-seal-victim.md"),
            "harmless payload before reverse removal\n",
            "utf8",
          );
        },
        run(fixture) {
          const victim = path.join(
            fixture,
            skillRelative,
            "assets",
            "reverse-final-seal-victim.md",
          );
          let fired = false;
          const result = runLegacyEvidenceValidator(fixture, ({ kind, pass, phase }) => {
            if (
              fired ||
              kind !== "semantic" ||
              pass !== "reverse" ||
              phase !== "before-final-record-seal"
            ) {
              return;
            }
            fired = true;
            fs.unlinkSync(victim);
          });
          if (!fired) throw new Error("reverse payload removal hook did not execute");
          return result;
        },
      },
      {
        name: "final reverse traversal mutation is terminally resealed",
        expected: "validated payload bytes changed after the original leak scan",
        mutate(fixture) {
          const skill = path.join(fixture, skillRelative);
          const trigger = path.join(skill, "00-final-traversal-trigger");
          const victim = path.join(skill, "zz-final-traversal-victim");
          fs.mkdirSync(trigger);
          fs.mkdirSync(victim);
          fs.writeFileSync(path.join(trigger, "child.md"), "final traversal trigger\n", "utf8");
          fs.writeFileSync(
            path.join(victim, "payload.md"),
            "harmless payload before the terminal reseal\n",
            "utf8",
          );
        },
        run(fixture) {
          const skill = path.join(fixture, skillRelative);
          const trigger = path.join(skill, "00-final-traversal-trigger");
          const victim = path.join(skill, "zz-final-traversal-victim", "payload.md");
          let finalReverseSealObserved = false;
          let fired = false;
          const result = runLegacyEvidenceValidator(
            fixture,
            ({ direction, file, kind, pass, phase }) => {
              if (
                kind === "payload" &&
                pass === "reverse" &&
                phase === "before-final-record-seal"
              ) {
                finalReverseSealObserved = true;
                return;
              }
              if (
                fired ||
                !finalReverseSealObserved ||
                direction !== "reverse" ||
                file !== trigger ||
                phase !== "before-witness-child-revalidation"
              ) {
                return;
              }
              fired = true;
              fs.writeFileSync(
                victim,
                fs.readFileSync(
                  path.join(fixture, legacyBaselineRelative, "adoption-workflows.md"),
                ),
              );
            },
          );
          if (!finalReverseSealObserved) {
            throw new Error("terminal reseal fixture did not observe the reverse record seal");
          }
          if (!fired) throw new Error("final reverse traversal mutation hook did not execute");
          return result;
        },
      },
      {
        name: "payload traversal exception closes every retained descriptor",
        expected: "synthetic payload traversal failure",
        mutate(fixture) {
          processFileDescriptorCount();
          fs.writeFileSync(
            path.join(fixture, skillRelative, "assets", "exceptional-traversal-victim.md"),
            "harmless payload before exceptional traversal\n",
            "utf8",
          );
        },
        run(fixture) {
          const assets = path.join(fixture, skillRelative, "assets");
          const before = processFileDescriptorCount();
          let fired = false;
          let thrown = null;
          try {
            validateLegacyReferenceEvidence({
              root: fixture,
              testOnlyReadPhaseHook({ file, phase }) {
                if (fired || file !== assets || phase !== "after-directory-children") return;
                fired = true;
                throw new Error("synthetic payload traversal failure");
              },
            });
          } catch (error) {
            thrown = error;
          }
          if (!fired) throw new Error("exceptional payload traversal hook did not execute");
          if (!thrown) throw new Error("exceptional payload traversal did not propagate");
          const after = processFileDescriptorCount();
          if (after !== before) {
            throw new Error(
              `payload traversal leaked descriptors: before=${before}, after=${after}`,
            );
          }
          return { status: 1, output: thrown.message };
        },
      },
      {
        name: "regular payload leaf changes before descriptor open",
        expected: "file identity changed while opening the descriptor",
        mutate(fixture) {
          const target = path.join(
            fixture,
            skillRelative,
            "assets",
            "legacy-evidence-regular-leaf-race.md",
          );
          fs.writeFileSync(target, "original payload race fixture\n", "utf8");
        },
        run(fixture) {
          const target = path.join(
            fixture,
            skillRelative,
            "assets",
            "legacy-evidence-regular-leaf-race.md",
          );
          let beforeOpenFired = false;
          let afterOpenFired = false;
          const result = runLegacyEvidenceValidator(fixture, ({ file, phase }) => {
            if (file !== target) return;
            if (phase === "before-open" && !beforeOpenFired) {
              beforeOpenFired = true;
              fs.renameSync(target, `${target}.original`);
              fs.writeFileSync(target, "replacement payload race fixture\n", "utf8");
            }
            if (phase === "after-open") afterOpenFired = true;
          });
          if (!beforeOpenFired) throw new Error("regular payload leaf race hook did not execute");
          if (afterOpenFired) {
            throw new Error("regular payload leaf race reached the post-open read phase");
          }
          return result;
        },
      },
      {
        name: "regular payload parent changes before descriptor open",
        expected: "parent path components changed while reading the opened descriptor",
        mutate(fixture) {
          const target = path.join(
            fixture,
            skillRelative,
            "assets",
            "legacy-evidence-regular-parent-race",
            "target.md",
          );
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, "hard-linked payload race fixture\n", "utf8");
          const replacementParent = `${path.dirname(target)}.replacement`;
          fs.mkdirSync(replacementParent);
          fs.linkSync(target, path.join(replacementParent, path.basename(target)));
        },
        run(fixture) {
          const target = path.join(
            fixture,
            skillRelative,
            "assets",
            "legacy-evidence-regular-parent-race",
            "target.md",
          );
          let fired = false;
          const result = runLegacyEvidenceValidator(fixture, ({ file, phase }) => {
            if (fired || file !== target || phase !== "before-open") return;
            fired = true;
            const parent = path.dirname(target);
            const originalParent = `${parent}.original`;
            fs.renameSync(parent, originalParent);
            fs.renameSync(`${parent}.replacement`, parent);
          });
          if (!fired) throw new Error("regular payload parent race hook did not execute");
          return result;
        },
      },
      {
        name: "payload directory swap cannot hide forbidden evidence",
        expected: "directory identity changed during cwd-anchored traversal",
        mutate(fixture) {
          const target = path.join(
            fixture,
            skillRelative,
            "assets",
            "legacy-evidence-directory-race",
            "hidden-evidence.md",
          );
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.copyFileSync(
            path.join(fixture, legacyBaselineRelative, "adoption-workflows.md"),
            target,
          );
        },
        run(fixture) {
          const directory = path.join(
            fixture,
            skillRelative,
            "assets",
            "legacy-evidence-directory-race",
          );
          const parkedDirectory = `${directory}.original`;
          let opened = false;
          let restored = false;
          const result = runLegacyEvidenceValidator(fixture, ({ file, phase }) => {
            if (file !== directory) return;
            if (phase === "after-directory-open" && !opened) {
              opened = true;
              fs.renameSync(directory, parkedDirectory);
              fs.mkdirSync(directory);
            } else if (phase === "after-directory-read" && opened && !restored) {
              restored = true;
              fs.rmdirSync(directory);
              fs.renameSync(parkedDirectory, directory);
            }
          });
          if (!opened || !restored) {
            throw new Error("payload directory race did not execute both swap phases");
          }
          return result;
        },
      },
      {
        name: "payload directory changes after enumeration before child open",
        expected: "directory identity changed during cwd-anchored traversal",
        mutate(fixture) {
          const target = path.join(
            fixture,
            skillRelative,
            "assets",
            "legacy-evidence-return-race",
            "hidden-evidence.md",
          );
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.copyFileSync(
            path.join(fixture, legacyBaselineRelative, "adoption-workflows.md"),
            target,
          );
        },
        run(fixture) {
          const directory = path.join(
            fixture,
            skillRelative,
            "assets",
            "legacy-evidence-return-race",
          );
          const target = path.join(directory, "hidden-evidence.md");
          const parkedDirectory = `${directory}.original`;
          const filePhases = new Set();
          let swapped = false;
          let restored = false;
          const result = runLegacyEvidenceValidator(fixture, ({ file, phase }) => {
            if (file === directory && phase === "after-directory-return" && !swapped) {
              swapped = true;
              fs.renameSync(directory, parkedDirectory);
              fs.mkdirSync(directory);
            }
            if (file === target) {
              filePhases.add(phase);
              if (phase === "after-read" && swapped && !restored) {
                restored = true;
                fs.rmdirSync(directory);
                fs.renameSync(parkedDirectory, directory);
              }
            }
          });
          if (!swapped || !restored) {
            throw new Error("payload post-enumeration race did not swap and restore");
          }
          for (const phase of ["before-open", "after-open", "after-read"]) {
            if (!filePhases.has(phase)) {
              throw new Error(`cwd-anchored child read did not execute ${phase}`);
            }
          }
          return result;
        },
      },
      {
        name: "special payload traversal entry",
        expected: "unsupported special entry in skill-payload traversal",
        mutate() {},
        run(fixture) {
          const assets = path.join(fixture, skillRelative, "assets");
          let fired = false;
          const result = runLegacyEvidenceValidator(fixture, ({ entries, file, phase }) => {
            if (fired || file !== assets || phase !== "after-directory-read") return;
            fired = true;
            entries.push({
              isDirectory: () => false,
              isFile: () => false,
              isSymbolicLink: () => false,
              name: "synthetic-special-entry",
            });
          });
          if (!fired) throw new Error("special payload traversal hook did not execute");
          return result;
        },
      },
      {
        name: "payload leaf changes to FIFO before descriptor open",
        expected: "opened descriptor is not a regular file",
        mutate(fixture) {
          const target = path.join(
            fixture,
            skillRelative,
            "assets",
            "legacy-evidence-fifo-race.md",
          );
          fs.writeFileSync(target, "harmless payload before FIFO swap\n", "utf8");
        },
        async run(fixture) {
          const target = path.join(
            fixture,
            skillRelative,
            "assets",
            "legacy-evidence-fifo-race.md",
          );
          const writer = spawn(
            process.execPath,
            [
              "-e",
              'setTimeout(() => { const fs = require("node:fs"); const fd = fs.openSync(process.argv[1], "w"); fs.closeSync(fd); }, 2000);',
              target,
            ],
            { stdio: "ignore" },
          );
          let fired = false;
          const startedAt = Date.now();
          let result;
          try {
            result = runLegacyEvidenceValidator(fixture, ({ file, openFlags, phase }) => {
              if (fired || file !== target || phase !== "before-open") return;
              fired = true;
              const requiredOpenFlags = fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK;
              if ((openFlags & requiredOpenFlags) !== requiredOpenFlags) {
                throw new Error("legacy-reference read hook did not expose O_NOFOLLOW|O_NONBLOCK");
              }
              fs.renameSync(target, `${target}.original`);
              createFixtureFifo(target);
            });
          } finally {
            if (writer.exitCode === null && writer.signalCode === null) writer.kill("SIGKILL");
            if (writer.exitCode === null && writer.signalCode === null) {
              await new Promise((resolve) => writer.once("close", resolve));
            }
          }
          const elapsedMs = Date.now() - startedAt;
          if (!fired) throw new Error("payload FIFO race hook did not execute");
          if (elapsedMs >= 1000) {
            throw new Error(`payload FIFO open did not fail promptly (${elapsedMs}ms)`);
          }
          return result;
        },
      },
      {
        name: "payload leaf changes to a symlink before descriptor open",
        expected:
          "repo-only legacy-reference evidence custody cannot be verified through skill-payload symlinks",
        mutate(fixture) {
          const target = path.join(
            fixture,
            skillRelative,
            "assets",
            "legacy-evidence-leaf-race.md",
          );
          fs.writeFileSync(target, "harmless payload race fixture\n", "utf8");
        },
        run(fixture) {
          const target = path.join(
            fixture,
            skillRelative,
            "assets",
            "legacy-evidence-leaf-race.md",
          );
          let fired = false;
          const result = runLegacyEvidenceValidator(fixture, ({ file, phase }) => {
            if (fired || file !== target || phase !== "before-open") return;
            fired = true;
            if (typeof fs.constants.O_NOFOLLOW !== "number") {
              const error = new Error("O_NOFOLLOW is unavailable");
              error.code = "ENOTSUP";
              throw new UnsupportedSymlinkFixtureError(error);
            }
            const original = `${target}.original`;
            fs.renameSync(target, original);
            createFixtureSymlink(original, target, "file");
          });
          if (!fired) throw new Error("payload leaf race hook did not execute");
          return result;
        },
      },
      {
        name: "payload bytes mutate between descriptor fstat observations",
        expected: "file identity changed while reading the opened descriptor",
        mutate(fixture) {
          const target = path.join(
            fixture,
            skillRelative,
            "assets",
            "legacy-evidence-content-race.md",
          );
          fs.writeFileSync(target, "harmless payload race fixture\n", "utf8");
        },
        run(fixture) {
          const target = path.join(
            fixture,
            skillRelative,
            "assets",
            "legacy-evidence-content-race.md",
          );
          let fired = false;
          const result = runLegacyEvidenceValidator(fixture, ({ file, phase }) => {
            if (fired || file !== target || phase !== "after-open") return;
            fired = true;
            fs.appendFileSync(target, "changed during descriptor read\n", "utf8");
          });
          if (!fired) throw new Error("payload content race hook did not execute");
          return result;
        },
      },
      {
        name: "payload bytes mutate after child reads before traversal publication",
        expected: "payload leaf changed after descriptor read before traversal publication",
        mutate(fixture) {
          const target = path.join(
            fixture,
            skillRelative,
            "assets",
            "legacy-evidence-late-content-race.md",
          );
          fs.writeFileSync(target, "harmless payload before late drift\n", "utf8");
        },
        run(fixture) {
          const assets = path.join(fixture, skillRelative, "assets");
          const target = path.join(assets, "legacy-evidence-late-content-race.md");
          let fired = false;
          const result = runLegacyEvidenceValidator(fixture, ({ file, phase }) => {
            if (fired || file !== assets || phase !== "after-directory-children") return;
            fired = true;
            fs.writeFileSync(
              target,
              fs.readFileSync(path.join(fixture, legacyBaselineRelative, "adoption-workflows.md")),
            );
          });
          if (!fired) throw new Error("late payload content race hook did not execute");
          return result;
        },
      },
      {
        name: "payload bytes mutate during later child witness revalidation",
        expected: "payload leaf changed after descriptor read before traversal publication",
        mutate(fixture) {
          const assets = path.join(fixture, skillRelative, "assets");
          fs.writeFileSync(
            path.join(assets, "00-witness-victim.md"),
            "harmless payload before recursive revalidation\n",
            "utf8",
          );
          const child = path.join(assets, "zz-witness-child");
          fs.mkdirSync(child);
          fs.writeFileSync(path.join(child, "child.md"), "slow child witness\n", "utf8");
        },
        run(fixture) {
          const assets = path.join(fixture, skillRelative, "assets");
          const victim = path.join(assets, "00-witness-victim.md");
          const child = path.join(assets, "zz-witness-child");
          let fired = false;
          const result = runLegacyEvidenceValidator(fixture, ({ file, phase }) => {
            if (fired || file !== child || phase !== "before-witness-child-revalidation") return;
            fired = true;
            fs.writeFileSync(
              victim,
              fs.readFileSync(path.join(fixture, legacyBaselineRelative, "adoption-workflows.md")),
            );
          });
          if (!fired) throw new Error("recursive witness drift hook did not execute");
          return result;
        },
      },
      {
        name: "payload child subtree mutates during later sibling revalidation",
        expected: "payload leaf changed after descriptor read before traversal publication",
        mutate(fixture) {
          const assets = path.join(fixture, skillRelative, "assets");
          const victimChild = path.join(assets, "00-victim-child");
          const triggerChild = path.join(assets, "zz-trigger-child");
          fs.mkdirSync(victimChild);
          fs.mkdirSync(triggerChild);
          fs.writeFileSync(
            path.join(victimChild, "payload.md"),
            "harmless nested payload before sibling revalidation\n",
            "utf8",
          );
          fs.copyFileSync(
            path.join(fixture, legacyBaselineRelative, "adoption-workflows.md"),
            path.join(victimChild, "must-be-discarded.md"),
          );
          fs.writeFileSync(path.join(triggerChild, "child.md"), "later sibling witness\n", "utf8");
        },
        run(fixture) {
          const assets = path.join(fixture, skillRelative, "assets");
          const victim = path.join(assets, "00-victim-child", "payload.md");
          const triggerChild = path.join(assets, "zz-trigger-child");
          let fired = false;
          const result = runLegacyEvidenceValidator(fixture, ({ direction, file, phase }) => {
            if (
              fired ||
              direction !== "forward" ||
              file !== triggerChild ||
              phase !== "before-witness-child-revalidation"
            ) {
              return;
            }
            fired = true;
            fs.writeFileSync(
              victim,
              fs.readFileSync(path.join(fixture, legacyBaselineRelative, "adoption-workflows.md")),
            );
          });
          if (!fired) throw new Error("nested sibling witness drift hook did not execute");
          if (
            result.output.includes(
              "repo-only legacy-reference evidence bytes must not enter the skill payload",
            )
          ) {
            throw new Error("invalidated child subtree records were published to the leak scan");
          }
          return result;
        },
      },
      {
        name: "payload child subtree mutates in the final reverse witness pass",
        expected: "repo-only legacy-reference evidence bytes must not enter the skill payload",
        mutate(fixture) {
          const skill = path.join(fixture, skillRelative);
          const triggerChild = path.join(skill, "00-reverse-trigger-child");
          const victimChild = path.join(skill, "zz-reverse-victim-child");
          fs.mkdirSync(triggerChild);
          fs.mkdirSync(victimChild);
          fs.writeFileSync(
            path.join(triggerChild, "child.md"),
            "reverse trigger witness\n",
            "utf8",
          );
          fs.writeFileSync(
            path.join(victimChild, "payload.md"),
            "harmless nested payload before reverse sibling revalidation\n",
            "utf8",
          );
        },
        run(fixture) {
          const skill = path.join(fixture, skillRelative);
          const triggerChild = path.join(skill, "00-reverse-trigger-child");
          const victim = path.join(skill, "zz-reverse-victim-child", "payload.md");
          let fired = false;
          const result = runLegacyEvidenceValidator(fixture, ({ direction, file, phase }) => {
            if (
              fired ||
              direction !== "reverse" ||
              file !== triggerChild ||
              phase !== "before-witness-child-revalidation"
            ) {
              return;
            }
            fired = true;
            fs.writeFileSync(
              victim,
              fs.readFileSync(path.join(fixture, legacyBaselineRelative, "adoption-workflows.md")),
            );
          });
          if (!fired) throw new Error("reverse sibling witness drift hook did not execute");
          return result;
        },
      },
      {
        name: "payload child path swaps inode in the final reverse witness pass",
        expected: "retained payload descriptor no longer matches the current payload path",
        mutate(fixture) {
          const skill = path.join(fixture, skillRelative);
          const triggerChild = path.join(skill, "00-path-swap-trigger");
          const victimChild = path.join(skill, "zz-path-swap-victim");
          fs.mkdirSync(triggerChild);
          fs.mkdirSync(victimChild);
          fs.writeFileSync(path.join(triggerChild, "child.md"), "path swap trigger\n", "utf8");
          fs.writeFileSync(
            path.join(victimChild, "payload.md"),
            "harmless payload before reverse path swap\n",
            "utf8",
          );
        },
        run(fixture) {
          const skill = path.join(fixture, skillRelative);
          const triggerChild = path.join(skill, "00-path-swap-trigger");
          const victim = path.join(skill, "zz-path-swap-victim", "payload.md");
          let fired = false;
          const result = runLegacyEvidenceValidator(fixture, ({ direction, file, phase }) => {
            if (
              fired ||
              direction !== "reverse" ||
              file !== triggerChild ||
              phase !== "before-witness-child-revalidation"
            ) {
              return;
            }
            fired = true;
            fs.renameSync(victim, `${victim}.original`);
            fs.copyFileSync(
              path.join(fixture, legacyBaselineRelative, "adoption-workflows.md"),
              victim,
            );
          });
          if (!fired) throw new Error("reverse payload path-swap hook did not execute");
          return result;
        },
      },
      {
        name: "payload parent changes after descriptor read",
        expected: "parent path components changed while reading the opened descriptor",
        mutate(fixture) {
          const target = path.join(
            fixture,
            skillRelative,
            "assets",
            "legacy-evidence-parent-race",
            "target.md",
          );
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, "harmless payload race fixture\n", "utf8");
        },
        run(fixture) {
          const target = path.join(
            fixture,
            skillRelative,
            "assets",
            "legacy-evidence-parent-race",
            "target.md",
          );
          let fired = false;
          const result = runLegacyEvidenceValidator(fixture, ({ file, phase }) => {
            if (fired || file !== target || phase !== "after-read") return;
            fired = true;
            const parent = path.dirname(target);
            fs.renameSync(parent, `${parent}.original`);
            fs.mkdirSync(parent);
            fs.writeFileSync(target, "replacement payload race fixture\n", "utf8");
          });
          if (!fired) throw new Error("payload parent race hook did not execute");
          return result;
        },
      },
      {
        name: "symlinked legacy baseline parent",
        expected: "every path component must be symlink-free",
        mutate(fixture) {
          const baselineParent = path.dirname(path.join(fixture, legacyBaselineRelative));
          const custodyDirectory = `${baselineParent}-symlink-target`;
          fs.renameSync(baselineParent, custodyDirectory);
          createFixtureSymlink(custodyDirectory, baselineParent, "dir");
        },
      },
      {
        name: "renamed legacy evidence symlink in skill payload",
        expected:
          "repo-only legacy-reference evidence custody cannot be verified through skill-payload symlinks",
        mutate(fixture) {
          createFixtureSymlink(
            path.join(fixture, legacyBaselineRelative, "adoption-workflows.md"),
            path.join(fixture, skillRelative, "assets", "historical-pattern-link.md"),
            "file",
          );
        },
      },
      {
        name: "snapshot and manifest changed behind trust anchor",
        expected: "source blob must match the independent trust anchor",
        mutate(fixture) {
          const baseline = path.join(fixture, legacyBaselineRelative, "adoption-workflows.md");
          edit(baseline, (text) => text.replace("Architecture", "architecturE"));
          edit(path.join(fixture, sourceLockRelative), (text) => {
            const manifest = JSON.parse(text);
            const bytes = fs.readFileSync(baseline);
            manifest.files[0].blob = crypto
              .createHash("sha1")
              .update(`blob ${bytes.length}\0`)
              .update(bytes)
              .digest("hex");
            manifest.files[0].sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
            return `${JSON.stringify(manifest, null, 2)}\n`;
          });
        },
      },
    ];

    const sharedCases = commonLegacyLineageFailureCases({
      evidenceDirectoryRelative: `${evalRelative}/reference-baseline`,
      evidenceRelative: `${evalRelative}/README.md`,
      manifestRelative: legacyCaseLineageRelative,
      prepareAuthorizedShortFingerprint,
      runtimeRelative: skillRelative,
      sourceDerivedFingerprintRegression: {
        expectedLength: 18,
        marker: "- contains: ADR-0004",
      },
      sourceMaterialFingerprints,
    });
    const sharedPositiveCases = commonLegacyLineagePositiveCases({
      manifestRelative: legacyCaseLineageRelative,
      prepareAuthorizedShortFingerprint,
    });
    const registry = [
      ...cases.map((testCase) => ({
        id: `local-negative:${testCase.name}`,
        expectedOutcome: "failure",
        applicability:
          testCase.name === "payload leaf changes to FIFO before descriptor open" ? "posix" : "all",
        async execute() {
          return expectFailure(testCase.name, testCase.mutate, testCase.expected, testCase.run);
        },
      })),
      ...sharedCases.map((testCase) => ({
        id: `shared-negative:${testCase.name}`,
        expectedOutcome: "failure",
        applicability: "all",
        async execute() {
          const execute = testCase.run
            ? async (fixture) => {
                const result = await testCase.run(fixture, runLegacyCaseLineage);
                return {
                  status: result.errors.length === 0 ? 0 : 1,
                  output: result.errors.join("\n"),
                };
              }
            : runValidator;
          return expectFailure(testCase.name, testCase.mutate, testCase.expected, execute);
        },
      })),
      ...sharedPositiveCases.map((testCase) => ({
        id: `shared-positive:${testCase.name}`,
        expectedOutcome: "success",
        applicability: "all",
        async execute() {
          const fixture = copyFixture();
          try {
            measureCasePhase("mutateMs", () => testCase.mutate(fixture));
            const result = measureCasePhase("validateMs", () => runLegacyCaseLineage(fixture));
            if (result.errors.length > 0) {
              throw new Error(`${testCase.name} failed:\n${result.errors.join("\n")}`);
            }
            return { skipped: false };
          } finally {
            measureCasePhase("cleanupMs", () =>
              fs.rmSync(fixture, { recursive: true, force: true }),
            );
          }
        },
      })),
      {
        id: "local-positive:harmless numeric runtime evidence",
        expectedOutcome: "success",
        applicability: "all",
        async execute() {
          const fixture = copyFixture();
          try {
            measureCasePhase("mutateMs", () =>
              harmlessNumericEvidenceMutation(skillRelative)(fixture),
            );
            const result = measureCasePhase("validateMs", () => runLegacyCaseLineage(fixture));
            if (result.errors.length > 0) {
              throw new Error(
                `harmless numeric runtime evidence failed:\n${result.errors.join("\n")}`,
              );
            }
            return { skipped: false };
          } finally {
            measureCasePhase("cleanupMs", () =>
              fs.rmSync(fixture, { recursive: true, force: true }),
            );
          }
        },
      },
      {
        id: "local-positive:Long marker matching ignores formatting whitespace",
        expectedOutcome: "success",
        applicability: "all",
        async execute() {
          await expectSuccess("Long marker matching ignores formatting whitespace", (fixture) => {
            edit(path.join(fixture, coverageRelative), (text) => {
              const manifest = JSON.parse(text);
              const target = manifest.units[0].targets.find((candidate) =>
                candidate.path.endsWith(".long.md"),
              );
              target.markers[0] = target.markers[0].replaceAll(" ", " \n\t");
              return `${JSON.stringify(manifest, null, 2)}\n`;
            });
          });
          return { skipped: false };
        },
      },
    ].sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));

    const generatedInventory = registry.map(({ id, expectedOutcome, applicability }) => ({
      id,
      expectedOutcome,
      applicability,
    }));
    if (JSON.stringify(generatedInventory) !== JSON.stringify(frozenInventory.cases)) {
      throw new Error("Architecture Compass fixture registry differs from the frozen inventory.");
    }
    if (new Set(registry.map((testCase) => testCase.id)).size !== registry.length) {
      throw new Error("Architecture Compass fixture registry contains duplicate stable IDs.");
    }

    caseExecutionStartedAt = Date.now();
    for (const [ordinal, testCase] of registry.entries()) {
      if (
        ordinal % hostedShardCount !== hostedShardIndex ||
        Math.floor(ordinal / hostedShardCount) % workerCount !== workerIndex
      ) {
        continue;
      }
      const startedAt = Date.now();
      const phaseTelemetry = {
        materializeMs: 0,
        mutateMs: 0,
        validateMs: 0,
        cleanupMs: 0,
      };
      if (testCase.applicability === "posix" && process.platform === "win32") {
        results.push({
          id: testCase.id,
          ordinal,
          expectedOutcome: testCase.expectedOutcome,
          status: "not-applicable",
          skipBucket: "platform",
          reason: "POSIX fixture is not applicable on Windows",
          durationMs: 0,
          phaseTelemetry: { materializeMs: 0, mutateMs: 0, validateMs: 0, cleanupMs: 0 },
        });
        continue;
      }
      activeCaseTelemetry = phaseTelemetry;
      try {
        const result = await testCase.execute();
        results.push({
          id: testCase.id,
          ordinal,
          expectedOutcome: testCase.expectedOutcome,
          status: result?.skipped ? "skipped" : "passed",
          skipBucket: result?.skipped ? (result.kind ?? "capability") : null,
          reason: result?.skipped ? result.reason : null,
          durationMs: Date.now() - startedAt,
          phaseTelemetry,
        });
      } catch (error) {
        results.push({
          id: testCase.id,
          ordinal,
          expectedOutcome: testCase.expectedOutcome,
          status: "failed",
          skipBucket: null,
          reason: error instanceof Error ? error.message : String(error),
          durationMs: Date.now() - startedAt,
          phaseTelemetry,
        });
        throw error;
      } finally {
        activeCaseTelemetry = null;
      }
    }
  } catch (error) {
    fatal = { message: error.message, stack: error.stack ?? null };
  } finally {
    activeMaterializationStrategies = null;
    writeJsonAtomic(reportFile, {
      schemaVersion: 1,
      workerIndex,
      workerCount,
      hostedShardIndex,
      hostedShardCount,
      taskKey,
      taskDigest,
      preflightEvidenceDigest,
      inventoryDigest,
      results,
      fatal,
      phaseTelemetry: {
        startupMs: (caseExecutionStartedAt ?? Date.now()) - workerStartedAt,
      },
      materializationStrategy: materializationStrategies.has("copy") ? "copy" : "clone",
    });
  }
  if (fatal) throw new Error(fatal.message);
}

function parseWorkerArguments(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (
      new Set([
        "--worker-index",
        "--worker-count",
        "--hosted-shard-index",
        "--hosted-shard-count",
        "--task-key",
        "--task-digest",
        "--preflight-evidence-digest",
        "--worker-report",
      ]).has(argument)
    ) {
      values[argument] = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown Architecture Compass fixture argument: ${argument}`);
    }
  }
  if (values["--worker-index"] === undefined) return null;
  const workerIndex = Number(values["--worker-index"]);
  const workerCount = Number(values["--worker-count"]);
  const hostedShardIndex = Number(values["--hosted-shard-index"] ?? 0);
  const hostedShardCount = Number(values["--hosted-shard-count"] ?? 1);
  if (!Number.isSafeInteger(workerIndex) || !Number.isSafeInteger(workerCount)) {
    throw new Error("Worker index and count must be integers.");
  }
  if (workerCount < 1 || workerCount > 3 || workerIndex < 0 || workerIndex >= workerCount) {
    throw new Error("Worker index/count is outside the supported shard range.");
  }
  if (
    !new Set([1, 3]).has(hostedShardCount) ||
    !Number.isSafeInteger(hostedShardIndex) ||
    hostedShardIndex < 0 ||
    hostedShardIndex >= hostedShardCount
  ) {
    throw new Error("Hosted shard index/count is outside the supported range.");
  }
  if (!values["--worker-report"]) throw new Error("--worker-report is required.");
  for (const name of ["--task-key", "--task-digest", "--preflight-evidence-digest"]) {
    if (!/^sha256:[a-f0-9]{64}$/.test(values[name] ?? "")) {
      throw new Error(`${name} must be a SHA-256 digest.`);
    }
  }
  return {
    workerIndex,
    workerCount,
    hostedShardIndex,
    hostedShardCount,
    taskKey: values["--task-key"],
    taskDigest: values["--task-digest"],
    preflightEvidenceDigest: values["--preflight-evidence-digest"],
    reportFile: path.resolve(values["--worker-report"]),
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

function formatFailure(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!(error instanceof AggregateError)) return message;
  return [message, ...error.errors.map((cause) => `caused by: ${formatFailure(cause)}`)].join("\n");
}

if (isMain) {
  try {
    const workerOptions = parseWorkerArguments(process.argv.slice(2));
    if (workerOptions) await runWorker(workerOptions);
    else await runFixtureCoordinator({ root, workerProgram: fileURLToPath(import.meta.url) });
  } catch (error) {
    console.error(
      `Architecture Compass validator fixture execution failed: ${formatFailure(error)}`,
    );
    process.exitCode = 1;
  }
}
