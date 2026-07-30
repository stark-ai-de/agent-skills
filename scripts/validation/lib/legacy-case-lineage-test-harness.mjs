import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { fingerprintGitCandidateRepository } from "../smoke-install-contract.mjs";

const unsupportedCapabilityCodes = new Set([
  "EACCES",
  "ENOENT",
  "EINVAL",
  "ENOSYS",
  "ENOTSUP",
  "EPERM",
]);
export class UnsupportedFixtureCapabilityError extends Error {
  constructor(capability, error) {
    super(
      `${capability} fixture unavailable (${error?.code ?? "unknown"}: ${error?.message ?? error})`,
    );
    this.name = "UnsupportedFixtureCapabilityError";
    this.capability = capability;
  }
}

function command(root, executable, arguments_, options = {}) {
  const environment = { ...process.env };
  for (const key of Object.keys(environment)) {
    if (key.toUpperCase().startsWith("GIT_")) delete environment[key];
  }
  environment.GIT_OPTIONAL_LOCKS = "0";
  environment.LC_ALL = "C";
  const result = spawnSync(executable, arguments_, {
    cwd: root,
    encoding: options.encoding === "buffer" ? null : (options.encoding ?? "utf8"),
    env: environment,
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) {
    throw new Error(
      `${executable} ${arguments_.join(" ")} failed to start: ${result.error.message}`,
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `${executable} ${arguments_.join(" ")} failed: ${String(result.stderr || result.stdout).trim()}`,
    );
  }
  return result.stdout;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function git(root, arguments_, options) {
  return command(root, "git", arguments_, options);
}

function resolveGitIndex(root) {
  let value;
  try {
    value = git(root, ["rev-parse", "--path-format=absolute", "--git-path", "index"]).trim();
  } catch {
    value = git(root, ["rev-parse", "--git-path", "index"]).trim();
  }
  return path.isAbsolute(value) ? value : path.resolve(root, value);
}

function candidateFingerprint(root) {
  const parsed = fingerprintGitCandidateRepository(root);
  return `${parsed.algorithm}:${parsed.digest}:${parsed.fileCount}`;
}

export function captureRepositoryGuards(root) {
  const resolvedRoot = path.resolve(root);
  const indexPath = resolveGitIndex(resolvedRoot);
  return Object.freeze({
    candidate: candidateFingerprint(resolvedRoot),
    head: git(resolvedRoot, ["rev-parse", "HEAD"]).trim(),
    indexPath,
    indexSha256: sha256(fs.readFileSync(indexPath)),
    stagedListingSha256: sha256(
      git(resolvedRoot, ["ls-files", "--stage", "-z"], { encoding: "buffer" }),
    ),
    stagedSha256: sha256(
      git(
        resolvedRoot,
        ["diff", "--cached", "--binary", "--full-index", "--no-ext-diff", "--no-color", "--"],
        { encoding: "buffer" },
      ),
    ),
  });
}

export function assertRepositoryGuardsUnchanged(root, expected, label) {
  const actual = captureRepositoryGuards(root);
  for (const key of [
    "candidate",
    "head",
    "indexPath",
    "indexSha256",
    "stagedListingSha256",
    "stagedSha256",
  ]) {
    if (actual[key] !== expected[key]) {
      throw new Error(
        `${label}: protected repository guard ${key} changed; expected ${expected[key]}, found ${actual[key]}`,
      );
    }
  }
}

export function assertAmbientGitSteeringIgnored() {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "lineage-git-steering-"));
  const protectedRoot = path.join(fixture, "protected");
  const decoyRoot = path.join(fixture, "decoy");
  const previous = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.toUpperCase().startsWith("GIT_")),
  );
  try {
    for (const repository of [protectedRoot, decoyRoot]) {
      fs.mkdirSync(repository);
      git(repository, ["init", "--quiet"]);
      fs.writeFileSync(path.join(repository, "tracked.txt"), `${path.basename(repository)}\n`);
      git(repository, ["add", "--", "tracked.txt"]);
      git(repository, [
        "-c",
        "user.name=Legacy Lineage Test",
        "-c",
        "user.email=lineage@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "fixture",
      ]);
      fs.writeFileSync(path.join(repository, "candidate.txt"), `${path.basename(repository)}\n`);
    }
    const expected = captureRepositoryGuards(protectedRoot);
    const decoyGit = path.join(decoyRoot, ".git");
    Object.assign(process.env, {
      GIT_ALTERNATE_OBJECT_DIRECTORIES: path.join(decoyGit, "objects"),
      GIT_CEILING_DIRECTORIES: fixture,
      GIT_COMMON_DIR: decoyGit,
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "core.worktree",
      GIT_CONFIG_VALUE_0: decoyRoot,
      GIT_DIR: decoyGit,
      GIT_DISCOVERY_ACROSS_FILESYSTEM: "1",
      GIT_INDEX_FILE: path.join(decoyGit, "index"),
      GIT_NAMESPACE: "decoy",
      GIT_OBJECT_DIRECTORY: path.join(decoyGit, "objects"),
      GIT_PREFIX: "decoy/",
      GIT_QUARANTINE_PATH: path.join(decoyGit, "objects"),
      GIT_WORK_TREE: decoyRoot,
    });
    fs.appendFileSync(path.join(decoyRoot, "candidate.txt"), "mutated decoy\n");
    assertRepositoryGuardsUnchanged(protectedRoot, expected, "ambient Git steering regression");
  } finally {
    for (const key of Object.keys(process.env)) {
      if (key.toUpperCase().startsWith("GIT_")) delete process.env[key];
    }
    Object.assign(process.env, previous);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

export function assertFixtureSetupFailureCleanup({ create, expectedMessage, label }) {
  let createdRoot = null;
  let failure = null;
  let rootRemained = false;
  try {
    create((fixture) => {
      createdRoot = fixture;
    });
  } catch (error) {
    failure = error;
  } finally {
    if (createdRoot) {
      rootRemained = fs.existsSync(createdRoot);
      if (rootRemained) fs.rmSync(createdRoot, { recursive: true, force: true });
    }
  }
  if (!failure?.message.includes(expectedMessage)) {
    throw new Error(`${label}: setup failure was not deterministic`);
  }
  if (!createdRoot || rootRemained) {
    throw new Error(`${label}: setup failure left its exact temporary root behind`);
  }
}

export function assertEarlyManifestErrorsFinalized(validateLegacyCaseLineage) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "lineage-final-errors-"));
  const options = {
    root: fixture,
    manifestRelative: "v",
    expectedSourceCommit: "missing-manifest-regression",
    expectedSources: [{ path: "z", sha256: "0".repeat(64) }],
    expectedBaselineDirectory: "z",
    runtimeDirectory: "x",
    activeTargetRoots: ["u", "u"],
    forbiddenEvidenceRoots: ["w", "w"],
  };
  try {
    const variants = [
      ["missing", null],
      ["invalid", "{"],
      ["primitive", "false"],
      ["array", "[]"],
    ];
    for (const [variant, content] of variants) {
      if (content !== null) fs.writeFileSync(path.join(fixture, "v"), content);
      const result = validateLegacyCaseLineage(options);
      const finalized = [...new Set(result.errors)].sort();
      if (JSON.stringify(result.errors) !== JSON.stringify(finalized)) {
        throw new Error(
          `${variant} manifest errors bypassed deterministic sorted-deduplicated finalization`,
        );
      }
      const expectedError =
        variant === "missing"
          ? "v: missing required file"
          : variant === "invalid"
            ? "v: invalid JSON"
            : "v: must use the exact legacy-case lineage root schema";
      if (!result.errors.some((error) => error.includes(expectedError))) {
        throw new Error(`${variant} manifest regression did not reach its early-return path`);
      }
      if (
        result.summary.cases !== 0 ||
        result.summary.expectations !== 0 ||
        result.summary.sourceUnits !== 0 ||
        JSON.stringify(result.summary.dispositions) !==
          JSON.stringify({ preserved: 0, adapted: 0, "explicitly-rejected": 0 })
      ) {
        throw new Error(`${variant} manifest regression returned a non-empty summary`);
      }
    }
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

export function assertCommonMaterialFingerprintCases(sourceMaterialFingerprints) {
  const exact = sourceMaterialFingerprints("- contains: ADR-0004");
  if ("contains: ADR-0004".length !== 18 || !exact.includes("contains: ADR-0004")) {
    throw new Error("18-character source-derived material fingerprint is not covered");
  }
  for (const marker of [
    "- ---",
    "- contains: ---",
    "- not_contains: ***",
    "- contains: &#x2a;&#x2a;&#x2a;",
  ]) {
    if (sourceMaterialFingerprints(marker).length !== 0) {
      throw new Error(`punctuation-only source marker became a fingerprint: ${marker}`);
    }
  }
}

export function createFixtureSymlink(target, link, type = "file") {
  const platformType = process.platform === "win32" && type === "dir" ? "junction" : type;
  try {
    fs.symlinkSync(target, link, platformType);
  } catch (error) {
    if (unsupportedCapabilityCodes.has(error?.code)) {
      throw new UnsupportedFixtureCapabilityError("symlink", error);
    }
    throw error;
  }
}

export function createFixtureFifo(file) {
  if (process.platform === "win32") {
    throw new UnsupportedFixtureCapabilityError(
      "POSIX FIFO",
      new Error("not available on Windows"),
    );
  }
  const result = spawnSync("mkfifo", [file], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 5_000,
  });
  if (result.error || result.status !== 0) {
    const error = result.error ?? new Error((result.stderr || result.stdout).trim());
    throw new UnsupportedFixtureCapabilityError("POSIX FIFO", error);
  }
  try {
    if (!fs.lstatSync(file).isFIFO()) {
      throw new Error("mkfifo did not create a FIFO");
    }
  } catch (error) {
    throw new UnsupportedFixtureCapabilityError("POSIX FIFO", error);
  }
}

export function assertCommonMarkdownParserCases(extractLegacyMaterialUnits) {
  const visible = extractLegacyMaterialUnits(
    [
      "    <!-- indented code must not open an HTML comment",
      "\t## Expected Behavior",
      "\t- tab-indented-code-unit",
      "````md",
      "## Expected Behavior",
      "- hidden-fence-unit",
      "```",
      "still fenced",
      "````",
      "<!--",
      "## Expected Behavior",
      "- hidden-comment-unit",
      "-->",
      "   ## Deterministic Assertions ###",
      "- visible-unit",
      "  continuation",
    ].join("\n"),
  );
  const expected = [{ heading: "Deterministic Assertions", marker: "- visible-unit continuation" }];
  if (visible.errors.length > 0 || JSON.stringify(visible.units) !== JSON.stringify(expected)) {
    throw new Error(
      `CommonMark visibility fixture failed:\n${visible.errors.join("\n")}\n${JSON.stringify(visible.units)}`,
    );
  }

  const invalidBacktickInfo = extractLegacyMaterialUnits(
    ["```bad`info", "## Deterministic Assertions", "- remains-visible-after-invalid-opener"].join(
      "\n",
    ),
  );
  if (
    invalidBacktickInfo.errors.length > 0 ||
    invalidBacktickInfo.units[0]?.marker !== "- remains-visible-after-invalid-opener"
  ) {
    throw new Error("Invalid backtick-info opener incorrectly hid the following live heading");
  }

  const shortCloser = extractLegacyMaterialUnits(
    [
      "````",
      "## Expected Behavior",
      "- hidden",
      "```",
      "## Deterministic Assertions",
      "- still-hidden",
      "````",
      "## Expected Behavior",
      "- visible",
    ].join("\n"),
  );
  if (shortCloser.errors.length > 0 || shortCloser.units[0]?.marker !== "- visible") {
    throw new Error("A shorter closing fence incorrectly closed a longer CommonMark fence");
  }

  const indentedCommentCloser = extractLegacyMaterialUnits(
    [
      "<!-- live comment opener",
      "    -->",
      "## Deterministic Assertions",
      "- visible-after-indented-comment-closer",
    ].join("\n"),
  );
  if (
    indentedCommentCloser.errors.length > 0 ||
    indentedCommentCloser.units[0]?.marker !== "- visible-after-indented-comment-closer"
  ) {
    throw new Error("An indented HTML-comment closer failed to restore Markdown visibility");
  }

  const commentTextInFenceInfo = extractLegacyMaterialUnits(
    [
      "```text <!-- fence info is not an HTML comment",
      "## Expected Behavior",
      "- hidden-after-comment-shaped-fence-info",
      "```",
      "## Deterministic Assertions",
      "- visible-after-comment-shaped-fence",
    ].join("\n"),
  );
  if (
    commentTextInFenceInfo.errors.length > 0 ||
    commentTextInFenceInfo.units.length !== 1 ||
    commentTextInFenceInfo.units[0]?.marker !== "- visible-after-comment-shaped-fence"
  ) {
    throw new Error("A valid fence opener with comment-shaped info text changed visibility");
  }

  for (const [label, lines] of [
    ["single-line code span", ["`<!--`", "## Expected Behavior", "- visible-unit"]],
    [
      "multiline code span",
      ["`inline code <!--", "continues here`", "## Expected Behavior", "- visible-unit"],
    ],
    ["escaped comment opener", ["\\<!--", "## Expected Behavior", "- visible-unit"]],
    [
      "backslash before one-backtick code-span closer",
      ["`<!--\\`", "## Expected Behavior", "- visible-unit"],
    ],
    [
      "backslash before two-backtick code-span closer",
      ["``<!--\\``", "## Expected Behavior", "- visible-unit"],
    ],
  ]) {
    const result = extractLegacyMaterialUnits(lines.join("\n"));
    if (result.errors.length > 0 || result.units[0]?.marker !== "- visible-unit") {
      throw new Error(`${label} incorrectly opened hidden HTML-comment state`);
    }
  }

  const unmatchedBeforeBlockBoundary = extractLegacyMaterialUnits(
    ["`literal <!--", "## Expected Behavior", "- hidden-unit", "-->", "", "`later literal"].join(
      "\n",
    ),
  );
  if (unmatchedBeforeBlockBoundary.units.length !== 0) {
    throw new Error(
      "An unmatched code-span opener crossed a CommonMark block boundary and hid a real comment",
    );
  }

  for (const slashCount of [1, 2, 3, 4]) {
    const result = extractLegacyMaterialUnits(
      [`${"\\".repeat(slashCount)}<!--`, "## Expected Behavior", "- parity-unit", "-->"].join("\n"),
    );
    const visible = result.units.some((unit) => unit.marker.startsWith("- parity-unit"));
    if (visible !== (slashCount % 2 === 1)) {
      throw new Error(`Backslash escape parity failed for ${slashCount} slash characters`);
    }
  }

  const hiddenHeadingContexts = [
    ...["script", "style", "pre", "textarea"].map((tag) => [
      `${tag} raw HTML block`,
      [`<${tag}>`, "## Expected Behavior", "- hidden-unit", `</${tag}>`],
    ]),
    ["CDATA block", ["<![CDATA[", "## Expected Behavior", "- hidden-unit", "]]>"]],
    ["processing instruction", ["<?processing", "## Expected Behavior", "- hidden-unit", "?>"]],
    ["declaration", ["<!DECL", "## Expected Behavior", "- hidden-unit", ">"]],
    ["block tag", ["<div>", "## Expected Behavior", "- hidden-unit", ""]],
    ["custom tag", ["<custom-target>", "## Expected Behavior", "- hidden-unit", ""]],
    [
      "multiline link-reference title",
      [
        "[hidden]: https://example.invalid",
        '"title',
        "## Expected Behavior",
        "- hidden-unit",
        '"',
        "",
      ],
    ],
  ];
  for (const [label, hiddenLines] of hiddenHeadingContexts) {
    const result = extractLegacyMaterialUnits(
      [
        ...hiddenLines,
        "## Deterministic Assertions",
        `- visible-after-${label.replaceAll(" ", "-")}`,
      ].join("\n"),
    );
    if (
      result.errors.length > 0 ||
      result.units.length !== 1 ||
      !result.units[0].marker.startsWith("- visible-after-")
    ) {
      throw new Error(`${label} exposed a hidden material heading or hid the later live heading`);
    }
  }

  for (const [label, hiddenLines] of [
    [
      "blockquote script container",
      ["> <script>", "> ## Expected Behavior", "> - hidden-unit", "> </script>"],
    ],
    [
      "list script container",
      ["- <script>", "  ## Expected Behavior", "  - hidden-unit", "  </script>"],
    ],
    [
      "list HTML block containing a link-reference definition",
      [
        "- <div>",
        "  [x]: /destination",
        "  ## Expected Behavior",
        "  - hidden-unit",
        "  </div>",
        "",
      ],
    ],
    [
      "nested blockquote-list fence container",
      ["> - ```md", ">   ## Expected Behavior", ">   - hidden-unit", ">   ```"],
    ],
    [
      "nested list-blockquote style container",
      ["- > <style>", "  > ## Expected Behavior", "  > - hidden-unit", "  > </style>"],
    ],
  ]) {
    const result = extractLegacyMaterialUnits(
      [
        ...hiddenLines,
        "## Deterministic Assertions",
        `- visible-after-${label.replaceAll(" ", "-")}`,
      ].join("\n"),
    );
    if (
      result.errors.length > 0 ||
      result.units.length !== 1 ||
      !result.units[0].marker.startsWith("- visible-after-")
    ) {
      throw new Error(`${label} exposed a container-hidden material heading`);
    }
  }
}

function readManifest(fixture, manifestRelative) {
  return JSON.parse(fs.readFileSync(path.join(fixture, manifestRelative), "utf8"));
}

function writeManifest(fixture, manifestRelative, manifest) {
  fs.writeFileSync(
    path.join(fixture, manifestRelative),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
}

function firstSource(fixture, manifestRelative) {
  const manifest = readManifest(fixture, manifestRelative);
  const entry = manifest.cases[0];
  return {
    entry,
    manifest,
    source: fs.readFileSync(path.join(fixture, entry.baselinePath), "utf8"),
  };
}

function canonicalSourceChunks(source, maximumLength = 72) {
  const words = source.replace(/\s+/g, " ").trim().split(" ");
  const chunks = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && next.length > maximumLength) {
      chunks.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function unicodeEscapeJsonString(value) {
  let encoded = "";
  for (let index = 0; index < value.length; index += 1) {
    encoded += `\\u${value.charCodeAt(index).toString(16).padStart(4, "0")}`;
  }
  return encoded;
}

function numericCharacterReferences(value, radix) {
  return [...value]
    .map((character) =>
      radix === 16
        ? `&#x${character.codePointAt(0).toString(16)};`
        : `&#${character.codePointAt(0)};`,
    )
    .join("");
}

function ordinaryObjectEvidence(source) {
  const canonical = source.replace(/\s+/g, " ").trim();
  return Object.fromEntries(
    (canonical.match(/.{1,8}/g) ?? []).map((chunk, index) => [
      `field${String(index).padStart(6, "0")}`,
      chunk,
    ]),
  );
}

export function commonLegacyLineageFailureCases({
  evidenceDirectoryRelative,
  evidenceRelative,
  manifestRelative,
  prepareAuthorizedShortFingerprint,
  runtimeRelative,
  sourceDerivedFingerprintRegression = null,
  sourceMaterialFingerprints,
}) {
  const runtimeFile = (fixture, name) => path.join(fixture, runtimeRelative, "references", name);
  const addSyntheticTargetMarker = (fixture, marker, visibleText) => {
    const manifest = readManifest(fixture, manifestRelative);
    const target = manifest.cases[0].expectations[0].targets[0];
    const targetFile = path.join(fixture, target.path);
    const text = fs.readFileSync(targetFile, "utf8");
    const escapedHeading = target.heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const headingPattern = new RegExp(`^(#{1,6})\\s+${escapedHeading}\\s*#*\\s*$`, "m");
    if (!headingPattern.test(text)) {
      throw new Error(`synthetic marker fixture cannot find heading ${target.heading}`);
    }
    fs.writeFileSync(
      targetFile,
      text.replace(headingPattern, (heading) => `${heading}\n\n${visibleText}`),
      "utf8",
    );
    target.markers.push(marker);
    writeManifest(fixture, manifestRelative, manifest);
  };
  const firstRegularDescendant = (fixture, relativeDirectory) => {
    const pending = [relativeDirectory];
    while (pending.length > 0) {
      const current = pending.shift();
      for (const name of fs.readdirSync(path.join(fixture, current)).sort()) {
        const relative = path.posix.join(current, name);
        const stat = fs.lstatSync(path.join(fixture, relative));
        if (stat.isDirectory()) pending.push(relative);
        else if (stat.isFile()) return relative;
      }
    }
    throw new Error(`${relativeDirectory}: no regular evidence descendant for hardlink fixture`);
  };
  return [
    ...[
      ["null", null],
      ["false", false],
      ["zero", 0],
      ["empty string", ""],
      ["true", true],
      ["one", 1],
      ["string", "x"],
    ].map(([label, value]) => ({
      name: `${label} manifest root fails the root schema without throwing`,
      expected: "must use the exact legacy-case lineage root schema",
      mutate(fixture) {
        fs.writeFileSync(
          path.join(fixture, manifestRelative),
          `${JSON.stringify(value)}\n`,
          "utf8",
        );
      },
    })),
    {
      name: "manifest with an invalid UTF-8 byte fails before JSON parsing",
      expected: "manifest must be valid UTF-8",
      mutate(fixture) {
        fs.writeFileSync(path.join(fixture, manifestRelative), Buffer.from([0xff]));
      },
    },
    {
      name: "active target with an invalid UTF-8 byte fails before semantic parsing",
      expected: "active lineage target: must be valid UTF-8",
      mutate(fixture) {
        const manifest = readManifest(fixture, manifestRelative);
        const targetFile = path.join(fixture, manifest.cases[0].expectations[0].targets[0].path);
        fs.appendFileSync(targetFile, Buffer.from([0xff]));
      },
    },
    {
      name: "numeric target marker is rejected even when its text is visible",
      expected: "target marker must be a string",
      mutate(fixture) {
        const manifest = readManifest(fixture, manifestRelative);
        const target = manifest.cases[0].expectations[0].targets[0];
        const targetFile = path.join(fixture, target.path);
        const text = fs.readFileSync(targetFile, "utf8");
        const escapedHeading = target.heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const headingPattern = new RegExp(`^(#{1,6})\\s+${escapedHeading}\\s*#*\\s*$`, "m");
        if (!headingPattern.test(text)) {
          throw new Error(`numeric marker fixture cannot find heading ${target.heading}`);
        }
        fs.writeFileSync(
          targetFile,
          text.replace(headingPattern, (heading) => `${heading}\n\n123`),
          "utf8",
        );
        target.markers.push(123);
        writeManifest(fixture, manifestRelative, manifest);
      },
    },
    {
      name: "restored staged-deletion source is rejected even outside target evidence",
      expected: "staged-deletion source must remain absent",
      mutate(fixture) {
        const { entry, source } = firstSource(fixture, manifestRelative);
        fs.mkdirSync(path.dirname(path.join(fixture, entry.sourcePath)), { recursive: true });
        fs.writeFileSync(path.join(fixture, entry.sourcePath), source, "utf8");
      },
    },
    ...[
      ["heading", (value) => [value]],
      ["marker", (value) => [value]],
    ].map(([field, invalid]) => ({
      name: `array-valued source ${field} is rejected before source-unit keying`,
      expected: `source ${field} must be a non-empty string`,
      mutate(fixture) {
        const manifest = readManifest(fixture, manifestRelative);
        const source = manifest.cases[0].expectations[0].source;
        source[field] = invalid(source[field]);
        writeManifest(fixture, manifestRelative, manifest);
      },
    })),
    {
      name: "case disposition is derived from aggregate expectation outcomes",
      expected: "case disposition must match aggregate expectation outcomes",
      mutate(fixture) {
        const manifest = readManifest(fixture, manifestRelative);
        const entry = manifest.cases[0];
        const outcomes = entry.expectations.map((expectation) => expectation.outcome);
        const derivedDisposition = outcomes.every((outcome) => outcome === "preserved")
          ? "preserved"
          : outcomes.every((outcome) => outcome === "explicitly-rejected")
            ? "explicitly-rejected"
            : "adapted";
        entry.disposition = derivedDisposition === "preserved" ? "adapted" : "preserved";
        writeManifest(fixture, manifestRelative, manifest);
      },
    },
    {
      name: "duplicate material source units under one heading fail closed",
      expected: "duplicate material source unit",
      mutate(fixture) {
        const { entry, manifest, source } = firstSource(fixture, manifestRelative);
        const marker = manifest.cases[0].expectations[0].source.marker;
        const duplicated = source.replace(marker, `${marker}\n${marker}`);
        if (duplicated === source) {
          throw new Error("duplicate source-unit fixture could not find its locked marker");
        }
        fs.writeFileSync(path.join(fixture, entry.baselinePath), duplicated, "utf8");
      },
    },
    ...[
      ["dot segment", (directory, basename) => `${directory}/./${basename}`],
      ["parent segment", (directory, basename) => `${directory}/alias/../${basename}`],
      ["repeated separator", (directory, basename) => `${directory}//${basename}`],
    ].map(([label, alias]) => ({
      name: `${label} target path alias is rejected before policy caching`,
      expected: "path must be a canonical repository-relative POSIX path",
      mutate(fixture) {
        const manifest = readManifest(fixture, manifestRelative);
        const target = manifest.cases[0].expectations[0].targets[0];
        const directory = path.posix.dirname(target.path);
        target.path = alias(directory, path.posix.basename(target.path));
        writeManifest(fixture, manifestRelative, manifest);
      },
    })),
    {
      name: "target heading and marker inside a raw script block are not visible evidence",
      expected: "must exist exactly once",
      mutate(fixture) {
        const manifest = readManifest(fixture, manifestRelative);
        const target = manifest.cases[0].expectations[0].targets[0];
        fs.writeFileSync(
          path.join(fixture, target.path),
          `<script>\n## ${target.heading}\n\n${target.markers[0]}\n</script>\n`,
          "utf8",
        );
      },
    },
    {
      name: "wrong angle-bracket text inside inline code cannot satisfy the expected code marker",
      expected: "is missing marker",
      mutate(fixture) {
        addSyntheticTargetMarker(fixture, "`<not requested | ready>`", "`<totally wrong states>`");
      },
    },
    {
      name: "generic target marker must appear exactly once in its visible section",
      expected: "must appear exactly once in the visible target section; found 2",
      mutate(fixture) {
        const marker = "synthetic generic marker must remain exactly once";
        addSyntheticTargetMarker(fixture, marker, `${marker}\n${marker}`);
      },
    },
    {
      name: "set-equivalent duplicate targets ignore object and marker order",
      expected: "duplicate target object is not allowed",
      mutate(fixture) {
        const manifest = readManifest(fixture, manifestRelative);
        const expectation = manifest.cases[0].expectations[0];
        const target = expectation.targets[0];
        expectation.targets.push({
          markers: [...target.markers].reverse(),
          heading: target.heading,
          path: target.path,
        });
        writeManifest(fixture, manifestRelative, manifest);
      },
    },
    ...(sourceDerivedFingerprintRegression
      ? [
          {
            name: `${sourceDerivedFingerprintRegression.expectedLength}-character source-derived fingerprint leaks outside its authorized target`,
            expected: "legacy-case material-unit fingerprint must not leak",
            mutate(fixture) {
              const manifest = readManifest(fixture, manifestRelative);
              const matches = manifest.cases.flatMap((entry) =>
                entry.expectations.filter(
                  (expectation) =>
                    expectation.source.marker === sourceDerivedFingerprintRegression.marker,
                ),
              );
              if (matches.length !== 1) {
                throw new Error(
                  `expected one source-derived fingerprint fixture marker; found ${matches.length}`,
                );
              }
              const fingerprint = sourceDerivedFingerprintRegression.marker.replace(/^\s*-\s*/, "");
              if (
                fingerprint.length !== sourceDerivedFingerprintRegression.expectedLength ||
                !sourceMaterialFingerprints(sourceDerivedFingerprintRegression.marker).includes(
                  fingerprint,
                )
              ) {
                throw new Error("source-derived fingerprint is not eligible at its exact length");
              }
              fs.writeFileSync(
                runtimeFile(fixture, "short-source-derived-fingerprint.md"),
                `${fingerprint}\n`,
                "utf8",
              );
            },
          },
        ]
      : []),
    ...[
      ["hexadecimal", (marker) => numericCharacterReferences(marker, 16)],
      ["decimal", (marker) => numericCharacterReferences(marker, 10)],
      ["named", (marker) => marker.replaceAll(" ", "&nbsp;")],
      [
        "compatibility-named",
        (marker) => marker.replace(/^([A-Za-z])/, (_match, letter) => `&${letter}scr;`),
      ],
    ].map(([label, encode]) => ({
      name: `${label} CommonMark character references expose a short fingerprint`,
      expected: "legacy-case material-unit fingerprint must not leak",
      mutate(fixture) {
        const { marker } = prepareAuthorizedShortFingerprint(fixture);
        fs.writeFileSync(
          runtimeFile(fixture, `${label}-character-reference.md`),
          `${encode(marker)}\n`,
        );
      },
    })),
    ...[
      ["inline link", (word) => `[${word}](https://example.invalid)`],
      ["single emphasis", (word) => `*${word}*`],
      ["inline HTML", (word) => `<strong>${word}</strong>`],
    ].map(([label, decorate]) => ({
      name: `${label} cannot hide a short rendered fingerprint`,
      expected: "legacy-case material-unit fingerprint must not leak",
      mutate(fixture) {
        const { marker } = prepareAuthorizedShortFingerprint(fixture);
        const word = marker.match(/[A-Za-z]{4,}/)?.[0];
        if (!word) throw new Error(`${label}: prepared marker has no decoratable word`);
        fs.writeFileSync(
          runtimeFile(fixture, `${label.replaceAll(" ", "-")}-short-leak.md`),
          `${marker.replace(word, decorate(word))}\n`,
        );
      },
    })),
    ...[false, true].map((pretty) => ({
      name: `${pretty ? "pretty" : "compact"} ordinary JSON object preserves document-order leaves`,
      expected: "legacy-case source segment must not leak",
      mutate(fixture) {
        const { source } = firstSource(fixture, manifestRelative);
        fs.writeFileSync(
          runtimeFile(fixture, `${pretty ? "pretty" : "compact"}-ordinary-object-evidence.json`),
          JSON.stringify(ordinaryObjectEvidence(source), null, pretty ? 2 : 0),
        );
      },
    })),
    ...[false, true].map((escaped) => ({
      name: `${escaped ? "unicode-escaped" : "plain"} split JSON keys preserve document order`,
      expected: "legacy-case source segment must not leak",
      mutate(fixture) {
        const { source } = firstSource(fixture, manifestRelative);
        const canonical = source.replace(/\s+/g, " ").trim();
        const records = (canonical.match(/.{1,8}/g) ?? []).map((chunk) => {
          const key = escaped ? unicodeEscapeJsonString(chunk) : chunk;
          return escaped ? `{"${key}":""}` : { [key]: "" };
        });
        fs.writeFileSync(
          runtimeFile(fixture, `${escaped ? "unicode" : "plain"}-split-json-keys.json`),
          escaped ? `[\n  ${records.join(",\n  ")}\n]` : JSON.stringify(records, null, 2),
        );
      },
    })),
    {
      name: "top-level JSON array preserves document-order nested leaves",
      expected: "legacy-case source segment must not leak",
      mutate(fixture) {
        const { source } = firstSource(fixture, manifestRelative);
        const chunks = canonicalSourceChunks(source, 40);
        const records = [];
        for (let index = 0; index < chunks.length; index += 2) {
          records.push({ lines: chunks.slice(index, index + 2) });
        }
        fs.writeFileSync(
          runtimeFile(fixture, "array-document-order-evidence.json"),
          JSON.stringify(records),
        );
      },
    },
    {
      name: "JSONL records preserve document-order nested leaves",
      expected: "legacy-case source segment must not leak",
      mutate(fixture) {
        const { source } = firstSource(fixture, manifestRelative);
        const chunks = canonicalSourceChunks(source, 40);
        const records = [];
        for (let index = 0; index < chunks.length; index += 2) {
          records.push(JSON.stringify({ lines: chunks.slice(index, index + 2) }));
        }
        fs.writeFileSync(
          runtimeFile(fixture, "jsonl-document-order-evidence.jsonl"),
          records.join("\n"),
        );
      },
    },
    {
      name: "typed JSON leaf paths resist slash-key collisions",
      expected: "legacy-case source segment must not leak",
      mutate(fixture) {
        const { source } = firstSource(fixture, manifestRelative);
        const chunks = canonicalSourceChunks(source, 40);
        const records = Object.fromEntries(
          chunks.map((chunk, index) => [
            String(index),
            { payload: { line: chunk }, "payload/line": "" },
          ]),
        );
        fs.writeFileSync(
          runtimeFile(fixture, "typed-path-collision-evidence.json"),
          JSON.stringify(records),
        );
      },
    },
    {
      name: "nested repeated wrappers reconstruct legacy evidence",
      expected: "legacy-case source segment must not leak",
      mutate(fixture) {
        const { source } = firstSource(fixture, manifestRelative);
        const lines = canonicalSourceChunks(source, 40).map((chunk) => `outer: inner: ${chunk}`);
        fs.writeFileSync(runtimeFile(fixture, "nested-wrapper-records.txt"), lines.join("\n"));
      },
    },
    {
      name: "visible authorization does not offset a split numeric JSON duplicate",
      expected: "legacy-case material-unit fingerprint must not leak",
      mutate(fixture) {
        const { marker, target } = prepareAuthorizedShortFingerprint(fixture);
        const midpoint = Math.floor(marker.length / 2);
        fs.appendFileSync(
          path.join(fixture, target.path),
          `\n${JSON.stringify({ 0: marker.slice(0, midpoint), 1: marker.slice(midpoint) })}\n`,
        );
      },
    },
    {
      name: "unicode-escaped JSON leaf exposes a short fingerprint",
      expected: "legacy-case material-unit fingerprint must not leak",
      mutate(fixture) {
        const { marker } = prepareAuthorizedShortFingerprint(fixture);
        fs.writeFileSync(
          runtimeFile(fixture, "unicode-escaped-short.json"),
          `{"value":"${unicodeEscapeJsonString(marker)}"}`,
        );
      },
    },
    {
      name: "unicode-escaped JSONL leaf exposes a short fingerprint",
      expected: "legacy-case material-unit fingerprint must not leak",
      mutate(fixture) {
        const { marker } = prepareAuthorizedShortFingerprint(fixture);
        fs.writeFileSync(
          runtimeFile(fixture, "unicode-escaped-short.jsonl"),
          [
            JSON.stringify({ kind: "metadata" }),
            `{"value":"${unicodeEscapeJsonString(marker)}"}`,
          ].join("\n"),
        );
      },
    },
    {
      name: "unicode-escaped JSON key exposes a short fingerprint",
      expected: "legacy-case material-unit fingerprint must not leak",
      mutate(fixture) {
        const { marker } = prepareAuthorizedShortFingerprint(fixture);
        fs.writeFileSync(
          runtimeFile(fixture, "unicode-escaped-key.json"),
          `{"${unicodeEscapeJsonString(marker)}":"active value"}`,
        );
      },
    },
    {
      name: "unicode-escaped JSONL key exposes a short fingerprint",
      expected: "legacy-case material-unit fingerprint must not leak",
      mutate(fixture) {
        const { marker } = prepareAuthorizedShortFingerprint(fixture);
        fs.writeFileSync(
          runtimeFile(fixture, "unicode-escaped-key.jsonl"),
          [
            JSON.stringify({ kind: "metadata" }),
            `{"${unicodeEscapeJsonString(marker)}":"active value"}`,
          ].join("\n"),
        );
      },
    },
    {
      name: "numeric-record JSON with empty leaves reconstructs legacy evidence",
      expected: "legacy-case source segment must not leak",
      mutate(fixture) {
        const { source } = firstSource(fixture, manifestRelative);
        let blankRecordCount = 0;
        const records = Object.fromEntries(
          source.split(/\r?\n/).map((line, index) => {
            if (line === "") {
              blankRecordCount += 1;
              return [
                String(index),
                blankRecordCount === 1
                  ? { metadata: index + 1 }
                  : { line: "", metadata: index + 1 },
              ];
            }
            return [String(index), { line, metadata: index + 1 }];
          }),
        );
        fs.writeFileSync(
          runtimeFile(fixture, "numeric-record-evidence.json"),
          JSON.stringify(records),
        );
      },
    },
    {
      name: "nested array leaf positions preserve chunk streams",
      expected: "legacy-case source segment must not leak",
      mutate(fixture) {
        const { source } = firstSource(fixture, manifestRelative);
        const chunks = canonicalSourceChunks(source);
        const records = Object.fromEntries(
          chunks.map((chunk, index) => [String(index), { lines: [chunk, ""] }]),
        );
        fs.writeFileSync(
          runtimeFile(fixture, "nested-array-leaf-streams.json"),
          JSON.stringify(records),
        );
      },
    },
    {
      name: "nested numeric-record stream inside a JSONL record",
      expected: "legacy-case source segment must not leak",
      mutate(fixture) {
        const { source } = firstSource(fixture, manifestRelative);
        const chunks = canonicalSourceChunks(source);
        const payload = Object.fromEntries(chunks.map((line, index) => [String(index), { line }]));
        fs.writeFileSync(
          runtimeFile(fixture, "nested-numeric-record.jsonl"),
          [JSON.stringify({ kind: "metadata", sequence: 1 }), JSON.stringify({ payload })].join(
            "\n",
          ),
        );
      },
    },
    {
      name: "numeric-record keys above Number safe integer sort exactly",
      expected: "legacy-case source segment must not leak",
      mutate(fixture) {
        const { source } = firstSource(fixture, manifestRelative);
        const canonical = source.replace(/\s+/g, " ").trim().slice(0, 120);
        const midpoint = Math.floor(canonical.length / 2);
        const records = {
          "9007199254740993": { line: canonical.slice(midpoint) },
          9007199254740992: { line: canonical.slice(0, midpoint) },
        };
        fs.writeFileSync(
          runtimeFile(fixture, "large-numeric-record-keys.json"),
          JSON.stringify(records),
        );
      },
    },
    {
      name: "repeated named wrappers with empty records reconstruct legacy evidence",
      expected: "legacy-case source segment must not leak",
      mutate(fixture) {
        const { source } = firstSource(fixture, manifestRelative);
        const lines = canonicalSourceChunks(source).flatMap((chunk) => [
          `chunk:${chunk}`,
          "chunk:",
        ]);
        fs.writeFileSync(runtimeFile(fixture, "empty-wrapper-records.txt"), lines.join("\n"));
      },
    },
    {
      name: "bold-wrapped short material fingerprint",
      expected: "legacy-case material-unit fingerprint must not leak",
      mutate(fixture) {
        const { marker } = prepareAuthorizedShortFingerprint(fixture);
        fs.writeFileSync(runtimeFile(fixture, "bold-short-leak.md"), `**${marker}**\n`);
      },
    },
    {
      name: "backtick-wrapped short material fingerprint",
      expected: "legacy-case material-unit fingerprint must not leak",
      mutate(fixture) {
        const { marker } = prepareAuthorizedShortFingerprint(fixture);
        const tick = String.fromCharCode(96);
        fs.writeFileSync(
          runtimeFile(fixture, "backtick-short-leak.md"),
          `${tick}${marker}${tick}\n`,
        );
      },
    },
    {
      name: "bold-wrapped long legacy evidence",
      expected: "legacy-case source segment must not leak",
      mutate(fixture) {
        const { source } = firstSource(fixture, manifestRelative);
        fs.writeFileSync(runtimeFile(fixture, "bold-long-leak.md"), `**${source}**\n`);
      },
    },
    {
      name: "backtick-wrapped long legacy evidence",
      expected: "legacy-case source segment must not leak",
      mutate(fixture) {
        const { source } = firstSource(fixture, manifestRelative);
        const tick = String.fromCharCode(96);
        fs.writeFileSync(
          runtimeFile(fixture, "backtick-long-leak.md"),
          `${tick}${source}${tick}\n`,
        );
      },
    },
    {
      name: "direct legacy source self-map",
      expected: "targets must not point to source, baseline, manifest, or evidence custody",
      mutate(fixture) {
        const { entry, manifest, source } = firstSource(fixture, manifestRelative);
        fs.writeFileSync(path.join(fixture, entry.sourcePath), source, "utf8");
        const expectation = manifest.cases[0].expectations[0];
        const target = expectation.targets[0];
        target.path = entry.sourcePath;
        target.heading = expectation.source.heading;
        target.markers = [expectation.source.marker];
        writeManifest(fixture, manifestRelative, manifest);
      },
    },
    {
      name: "direct baseline self-map",
      expected: "targets must not point to source, baseline, manifest, or evidence custody",
      mutate(fixture) {
        const { entry, manifest } = firstSource(fixture, manifestRelative);
        const expectation = manifest.cases[0].expectations[0];
        const target = expectation.targets[0];
        target.path = entry.baselinePath;
        target.heading = expectation.source.heading;
        target.markers = [expectation.source.marker];
        writeManifest(fixture, manifestRelative, manifest);
      },
    },
    {
      name: "direct manifest self-map",
      expected: "targets must not point to source, baseline, manifest, or evidence custody",
      mutate(fixture) {
        const manifest = readManifest(fixture, manifestRelative);
        manifest.cases[0].expectations[0].targets[0].path = manifestRelative;
        writeManifest(fixture, manifestRelative, manifest);
      },
    },
    {
      name: "direct evidence-custody target",
      expected: "targets must not point to source, baseline, manifest, or evidence custody",
      mutate(fixture) {
        const manifest = readManifest(fixture, manifestRelative);
        manifest.cases[0].expectations[0].targets[0].path = evidenceRelative;
        writeManifest(fixture, manifestRelative, manifest);
      },
    },
    {
      name: "hardlinked baseline target under an active path",
      expected: "targets must not point to source, baseline, manifest, or evidence custody",
      mutate(fixture) {
        const { entry, manifest } = firstSource(fixture, manifestRelative);
        const destinationRelative = `${path.posix.dirname(entry.sourcePath)}/hardlinked-baseline.md`;
        fs.linkSync(
          path.join(fixture, entry.baselinePath),
          path.join(fixture, destinationRelative),
        );
        manifest.cases[0].expectations[0].targets[0].path = destinationRelative;
        writeManifest(fixture, manifestRelative, manifest);
      },
    },
    {
      name: "hardlinked manifest target under an active path",
      expected: "targets must not point to source, baseline, manifest, or evidence custody",
      mutate(fixture) {
        const manifest = readManifest(fixture, manifestRelative);
        const destinationRelative = `${path.posix.dirname(manifest.cases[0].sourcePath)}/hardlinked-manifest.json`;
        fs.linkSync(path.join(fixture, manifestRelative), path.join(fixture, destinationRelative));
        manifest.cases[0].expectations[0].targets[0].path = destinationRelative;
        writeManifest(fixture, manifestRelative, manifest);
      },
    },
    {
      name: "hardlinked configured evidence target under an active path",
      expected: "targets must not point to source, baseline, manifest, or evidence custody",
      mutate(fixture) {
        const manifest = readManifest(fixture, manifestRelative);
        const destinationRelative = `${path.posix.dirname(manifest.cases[0].sourcePath)}/hardlinked-evidence.md`;
        fs.linkSync(path.join(fixture, evidenceRelative), path.join(fixture, destinationRelative));
        manifest.cases[0].expectations[0].targets[0].path = destinationRelative;
        writeManifest(fixture, manifestRelative, manifest);
      },
    },
    {
      name: "hardlinked child of a configured evidence directory",
      expected: "targets must not point to source, baseline, manifest, or evidence custody",
      mutate(fixture) {
        const manifest = readManifest(fixture, manifestRelative);
        const evidenceChild = firstRegularDescendant(fixture, evidenceDirectoryRelative);
        const destinationRelative = `${path.posix.dirname(manifest.cases[0].sourcePath)}/hardlinked-evidence-child${path.extname(evidenceChild) || ".txt"}`;
        fs.linkSync(path.join(fixture, evidenceChild), path.join(fixture, destinationRelative));
        manifest.cases[0].expectations[0].targets[0].path = destinationRelative;
        writeManifest(fixture, manifestRelative, manifest);
      },
    },
    {
      name: "runtime payload hardlink to a configured evidence descendant",
      expected: "runtime payload entry must not share an inode with forbidden evidence custody",
      mutate(fixture) {
        const evidenceChild = firstRegularDescendant(fixture, evidenceDirectoryRelative);
        fs.linkSync(
          path.join(fixture, evidenceChild),
          runtimeFile(
            fixture,
            `hardlinked-evidence-custody${path.extname(evidenceChild) || ".txt"}`,
          ),
        );
      },
    },
    {
      name: "distinct target paths cannot share one hardlinked file identity",
      expected: "distinct target paths must not share the same file identity",
      mutate(fixture) {
        const manifest = readManifest(fixture, manifestRelative);
        const expectation = manifest.cases[0].expectations[0];
        const target = expectation.targets[0];
        const aliasRelative = `${path.posix.dirname(target.path)}/hardlinked-target-provenance${path.posix.extname(target.path) || ".md"}`;
        fs.linkSync(path.join(fixture, target.path), path.join(fixture, aliasRelative));
        expectation.targets.push({ ...structuredClone(target), path: aliasRelative });
        writeManifest(fixture, manifestRelative, manifest);
      },
    },
    {
      name: "ordinary target outside active target roots",
      expected: "target real path is outside the explicit activeTargetRoots allowlist",
      mutate(fixture) {
        const manifest = readManifest(fixture, manifestRelative);
        const target = manifest.cases[0].expectations[0].targets[0];
        const outsideRelative = "outside-active-targets/decision.md";
        fs.mkdirSync(path.join(fixture, path.dirname(outsideRelative)), { recursive: true });
        fs.writeFileSync(
          path.join(fixture, outsideRelative),
          `## ${target.heading}\n\n${target.markers.join("\n")}\n`,
        );
        target.path = outsideRelative;
        writeManifest(fixture, manifestRelative, manifest);
      },
    },
    {
      name: "active target leaf symlink",
      expected: "path components must be symlink-free",
      mutate(fixture) {
        const manifest = readManifest(fixture, manifestRelative);
        const target = manifest.cases[0].expectations[0].targets[0];
        const source = path.join(fixture, target.path);
        const linkRelative = `${path.posix.dirname(manifest.cases[0].sourcePath)}/symlink-target.md`;
        createFixtureSymlink(source, path.join(fixture, linkRelative));
        target.path = linkRelative;
        writeManifest(fixture, manifestRelative, manifest);
      },
    },
    {
      name: "active target parent symlink",
      expected: "path components must be symlink-free",
      mutate(fixture) {
        const manifest = readManifest(fixture, manifestRelative);
        const target = manifest.cases[0].expectations[0].targets[0];
        const linkedParentRelative = `${path.posix.dirname(manifest.cases[0].sourcePath)}/linked-parent`;
        createFixtureSymlink(
          path.dirname(path.join(fixture, target.path)),
          path.join(fixture, linkedParentRelative),
          "dir",
        );
        target.path = `${linkedParentRelative}/${path.basename(target.path)}`;
        writeManifest(fixture, manifestRelative, manifest);
      },
    },
    {
      name: "eval target does not authorize a runtime copy",
      expected: "legacy-case material-unit fingerprint must not leak",
      mutate(fixture) {
        const { marker, target } = prepareAuthorizedShortFingerprint(fixture);
        const manifest = readManifest(fixture, manifestRelative);
        const evalRelative = `${path.posix.dirname(manifest.cases[0].sourcePath)}/eval-only-authorization.md`;
        fs.writeFileSync(
          path.join(fixture, evalRelative),
          `## Eval-only authorization\n\n${marker}\n`,
        );
        for (const entry of manifest.cases) {
          for (const expectation of entry.expectations) {
            const selected = expectation.targets.find(
              (candidate) => candidate.path === target.path && candidate.heading === target.heading,
            );
            if (!selected) continue;
            selected.path = evalRelative;
            selected.heading = "Eval-only authorization";
            selected.markers = [marker];
          }
        }
        writeManifest(fixture, manifestRelative, manifest);
      },
    },
    {
      name: "split JSON fields cannot authorize a visible target marker",
      expected: "is missing marker",
      mutate(fixture) {
        const manifest = readManifest(fixture, manifestRelative);
        const target = manifest.cases[0].expectations[0].targets[0];
        const marker = "split JSON marker must remain visibly contiguous";
        const targetRelative = `${path.posix.dirname(manifest.cases[0].sourcePath)}/split-json-marker.md`;
        fs.writeFileSync(
          path.join(fixture, targetRelative),
          [
            "## Split JSON marker",
            "",
            JSON.stringify({ parts: ["split JSON marker must", "remain visibly contiguous"] }),
          ].join("\n"),
        );
        target.path = targetRelative;
        target.heading = "Split JSON marker";
        target.markers = [marker];
        writeManifest(fixture, manifestRelative, manifest);
      },
    },
    {
      name: "entity text inside a code span cannot authorize a plain marker",
      expected: "is missing marker",
      mutate(fixture) {
        const { marker, target } = prepareAuthorizedShortFingerprint(fixture);
        const targetFile = path.join(fixture, target.path);
        const before = fs.readFileSync(targetFile, "utf8");
        const encoded = `\`${marker.replaceAll(" ", "&nbsp;")}\``;
        const after = before.replace(marker, encoded);
        if (after === before) {
          throw new Error("code-span entity fixture could not replace its prepared marker");
        }
        fs.writeFileSync(targetFile, after, "utf8");
      },
    },
    ...[
      ["image alt", (marker) => `![${marker}](marker.png)`],
      ["link title", (marker) => `[unrelated](https://example.invalid ${JSON.stringify(marker)})`],
      [
        "double-quoted link title with parenthesis",
        (marker) => `[unrelated](https://example.invalid "x ) ${marker}")`,
      ],
      [
        "single-quoted link title with parenthesis",
        (marker) => `[unrelated](https://example.invalid 'x ) ${marker}')`,
      ],
      [
        "double-quoted raw HTML attribute",
        (marker) => `<span title="x > ${marker}">unrelated</span>`,
      ],
      [
        "single-quoted raw HTML attribute",
        (marker) => `<span title='x > ${marker}'>unrelated</span>`,
      ],
      ["processing instruction", (marker) => `<?pi ${marker} ?>`],
      ["declaration", (marker) => `<!DECL ${marker}>`],
      ["multiline processing instruction", (marker) => `<?pi\n${marker}\n?>`],
      ["multiline declaration", (marker) => `<!DECL\n${marker}\n>`],
      ["multiline CDATA", (marker) => `<![CDATA[\n${marker}\n]]>`],
      [
        "link reference definition",
        (marker) => `[hidden]: https://example.invalid ${JSON.stringify(marker)}`,
      ],
      [
        "multiline link reference title",
        (marker) => `[hidden]: https://example.invalid\n  ${JSON.stringify(marker)}`,
      ],
      [
        "split link reference destination",
        (marker) => `[hidden]:\n  https://example.invalid\n  ${JSON.stringify(marker)}`,
      ],
      [
        "unindented link reference destination",
        (marker) => `[hidden]:\nhttps://example.invalid\n${JSON.stringify(marker)}`,
      ],
      [
        "multiline link reference label",
        (marker) => `[\nhidden\n]: https://example.invalid ${JSON.stringify(marker)}`,
      ],
      [
        "escaped-bracket link reference label",
        (marker) => `[hidden\\]]: https://example.invalid ${JSON.stringify(marker)}`,
      ],
      [
        "multiline link reference title body",
        (marker) => `[hidden]: https://example.invalid\n  "prefix\n  ${marker}"`,
      ],
      [
        "blockquote link reference definition",
        (marker) => `> [hidden]: https://example.invalid ${JSON.stringify(marker)}`,
      ],
      [
        "list link reference definition",
        (marker) => `- [hidden]: https://example.invalid ${JSON.stringify(marker)}`,
      ],
      ["script block", (marker) => `<script>${marker}</script>`],
      ["style block", (marker) => `<style>${marker}</style>`],
      ["multiline script block", (marker) => `<script\n data-x="x">\n${marker}\n</script>`],
      ["multiline style block", (marker) => `<style\n data-x="x">\n${marker}\n</style>`],
      ["template block", (marker) => `<template>${marker}</template>`],
      ["hidden element", (marker) => `<span hidden>${marker}</span>`],
      ["display-none element", (marker) => `<span style="display:none">${marker}</span>`],
      ["head title element", (marker) => `<head><title>${marker}</title></head>`],
      [
        "split wrapper",
        (marker) => {
          const midpoint = Math.floor(marker.length / 2);
          return `chunk: ${marker.slice(0, midpoint)}\nchunk: ${marker.slice(midpoint)}`;
        },
      ],
      ...["n", "r", "t", "r\\n"].map((escape) => [
        `literal backslash-${escape} text`,
        (marker) => marker.replace(" ", `\\${escape}`),
      ]),
      [
        "unmatched backtick",
        (marker) =>
          `${marker.slice(0, Math.floor(marker.length / 2))}\`${marker.slice(Math.floor(marker.length / 2))}`,
      ],
      [
        "invalid emphasis",
        (marker) => {
          const pair = marker.match(/(\S+)(\s+)(\S+)/);
          if (!pair) return `* ${marker}*`;
          return marker.replace(pair[0], () => `${pair[1]}*${pair[2]}${pair[3]}*`);
        },
      ],
    ].map(([label, disguise]) => ({
      name: `${label} metadata cannot authorize a plain marker`,
      expected: "is missing marker",
      mutate(fixture) {
        const { marker, target } = prepareAuthorizedShortFingerprint(fixture);
        const targetFile = path.join(fixture, target.path);
        const before = fs.readFileSync(targetFile, "utf8");
        const after = before.replace(marker, disguise(marker));
        if (after === before) {
          throw new Error(`${label}: target fixture could not replace its marker`);
        }
        fs.writeFileSync(targetFile, after, "utf8");
      },
    })),
    ...[
      ['synthetica"syntheticfoo"', 'synthetica*"syntheticfoo"*'],
      ['synthetica"syntheticfoo"', 'synthetica**"syntheticfoo"**'],
      ["synthetic-alpha synthetic-beta", "[synthetic-alpha](invalid destination) synthetic-beta"],
      ["synthetic-alpha synthetic-beta", "[synthetic-alpha][undefined] synthetic-beta"],
      ["synthetic-alpha synthetic-beta", "[synthetic-alpha] synthetic-beta"],
      ["synthetic-alpha synthetic-beta", "[synthetic-alpha][] synthetic-beta"],
      ["synthetic-alpha synthetic-beta", "synthetic-alpha<https://foo.bar> synthetic-beta"],
      ["synthetic-alpha synthetic-beta", "synthetic-alpha<https://foo.bar/baz bim> synthetic-beta"],
      ["synthetic-alpha synthetic-beta", "synthetic-alpha<a/b> synthetic-beta"],
      [
        "synthetic-alpha synthetic-beta",
        "synthetic-alpha\n[hidden]: https://example.invalid\nsynthetic-beta",
      ],
      [
        "synthetic-alpha synthetic-word synthetic-beta",
        "synthetic-alpha &ast;synthetic-word&ast; synthetic-beta",
      ],
      ["synthetic-alpha visible synthetic-beta", "synthetic-alpha &lt;visible&gt; synthetic-beta"],
    ].map(([marker, visibleText], index) => ({
      name: `invalid inline target syntax ${index + 1} cannot authorize a plain marker`,
      expected: "is missing marker",
      mutate(fixture) {
        addSyntheticTargetMarker(fixture, marker, visibleText);
      },
    })),
    {
      name: "nested target scopes cannot double-authorize one occurrence",
      expected: "overlapping target heading scopes must not authorize",
      mutate(fixture) {
        const { marker, target } = prepareAuthorizedShortFingerprint(fixture);
        const targetFile = path.join(fixture, target.path);
        const text = fs.readFileSync(targetFile, "utf8");
        const withoutInsertedMarker = text.replace(marker, "");
        const escapedHeading = target.heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const headingPattern = new RegExp(`^(#{1,6})\\s+${escapedHeading}\\s*#*\\s*$`, "m");
        fs.writeFileSync(
          targetFile,
          withoutInsertedMarker.replace(
            headingPattern,
            (heading, hashes) =>
              `${heading}\n\n${"#".repeat(Math.min(6, hashes.length + 1))} Nested material authorization\n\n${marker}`,
          ),
          "utf8",
        );
        const manifest = readManifest(fixture, manifestRelative);
        for (const entry of manifest.cases) {
          for (const expectation of entry.expectations) {
            const selected = expectation.targets.find(
              (candidate) => candidate.path === target.path && candidate.heading === target.heading,
            );
            if (!selected) continue;
            expectation.targets.push({
              path: target.path,
              heading: "Nested material authorization",
              markers: [marker],
            });
            writeManifest(fixture, manifestRelative, manifest);
            return;
          }
        }
        throw new Error("nested target scope fixture could not find its prepared target");
      },
    },
    {
      name: "explicitly rejected expectation without active decision target",
      expected: "every legacy expectation requires visible active target evidence",
      mutate(fixture) {
        const manifest = readManifest(fixture, manifestRelative);
        const expectation = manifest.cases[0].expectations[0];
        expectation.outcome = "explicitly-rejected";
        expectation.reason =
          "The current active decision explicitly rejected this historical behavior.";
        expectation.targets = [];
        writeManifest(fixture, manifestRelative, manifest);
      },
    },
    {
      name: "explicitly rejected target marker must remain visible",
      expected: "is missing marker",
      mutate(fixture) {
        const manifest = readManifest(fixture, manifestRelative);
        const expectation = manifest.cases[0].expectations[0];
        expectation.outcome = "explicitly-rejected";
        expectation.reason =
          "The current active decision explicitly rejects this historical behavior.";
        expectation.targets[0].markers = ["missing visible rejection decision marker"];
        writeManifest(fixture, manifestRelative, manifest);
      },
    },
    {
      name: "explicitly rejected outcome requires rejection wording",
      expected: "explicitly-rejected reason must say reject or rejected",
      mutate(fixture) {
        const manifest = readManifest(fixture, manifestRelative);
        const expectation = manifest.cases[0].expectations[0];
        expectation.outcome = "explicitly-rejected";
        expectation.reason = "The active decision records a reviewed alternative disposition here.";
        writeManifest(fixture, manifestRelative, manifest);
      },
    },
    {
      name: "runtime symlink entry",
      expected: "runtime payload entries and path components must be symlink-free",
      mutate(fixture) {
        const target = runtimeFile(fixture, "harmless-target.txt");
        fs.writeFileSync(target, "harmless\n");
        createFixtureSymlink(target, runtimeFile(fixture, "runtime-link.txt"));
      },
    },
    {
      name: "runtime FIFO entry",
      expected: "runtime payload must contain only regular files and directories; found FIFO",
      mutate(fixture) {
        createFixtureFifo(runtimeFile(fixture, "runtime-fifo"));
      },
    },
    {
      name: "runtime leaf swaps to symlink before descriptor open",
      expected: "runtime payload entries and path components must be symlink-free",
      mutate(fixture) {
        fs.writeFileSync(runtimeFile(fixture, "race-symlink-leaf.txt"), "before\n");
        fs.writeFileSync(runtimeFile(fixture, "race-symlink-target.txt"), "target\n");
      },
      run(fixture, defaultRun) {
        const leaf = runtimeFile(fixture, "race-symlink-leaf.txt");
        const target = runtimeFile(fixture, "race-symlink-target.txt");
        let fired = false;
        const result = defaultRun(fixture, ({ file, phase }) => {
          if (!fired && phase === "before-open" && file === leaf) {
            fs.unlinkSync(leaf);
            createFixtureSymlink(target, leaf);
            fired = true;
          }
        });
        if (!fired) throw new Error("runtime symlink race hook did not execute");
        return result;
      },
    },
    {
      name: "runtime leaf swaps to FIFO before nonblocking descriptor open",
      expected: "opened runtime payload entry descriptor must be a regular file; found FIFO",
      mutate(fixture) {
        fs.writeFileSync(runtimeFile(fixture, "race-fifo-leaf.txt"), "before\n");
      },
      run(fixture, defaultRun) {
        const leaf = runtimeFile(fixture, "race-fifo-leaf.txt");
        let fired = false;
        const result = defaultRun(fixture, ({ file, openFlags, phase }) => {
          if (!fired && phase === "before-open" && file === leaf) {
            if (
              typeof fs.constants.O_NOFOLLOW !== "number" ||
              typeof fs.constants.O_NONBLOCK !== "number"
            ) {
              throw new UnsupportedFixtureCapabilityError(
                "O_NOFOLLOW|O_NONBLOCK",
                new Error("safe descriptor flags are unavailable"),
              );
            }
            const required = fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK;
            if ((openFlags & required) !== required) {
              throw new Error("runtime read hook did not expose O_NOFOLLOW|O_NONBLOCK");
            }
            fs.unlinkSync(leaf);
            createFixtureFifo(leaf);
            fired = true;
          }
        });
        if (!fired) throw new Error("runtime FIFO race hook did not execute");
        return result;
      },
    },
    {
      name: "earlier runtime snapshot changes while a later file opens",
      expected: "file identity changed after its validated snapshot",
      mutate(fixture) {
        fs.writeFileSync(runtimeFile(fixture, "aa-earlier-snapshot.txt"), "before\n");
        fs.writeFileSync(runtimeFile(fixture, "zz-later-trigger.txt"), "later\n");
      },
      run(fixture, defaultRun) {
        const earlier = runtimeFile(fixture, "aa-earlier-snapshot.txt");
        const later = runtimeFile(fixture, "zz-later-trigger.txt");
        const { source } = firstSource(fixture, manifestRelative);
        let fired = false;
        const result = defaultRun(fixture, ({ file, phase }) => {
          if (!fired && phase === "before-open" && file === later) {
            fs.writeFileSync(earlier, source, "utf8");
            fired = true;
          }
        });
        if (!fired) throw new Error("later runtime read did not mutate the earlier snapshot");
        return result;
      },
    },
    {
      name: "new runtime sibling appears during final directory seal",
      expected: "runtime directory entries changed after traversal",
      mutate() {},
      run(fixture, defaultRun) {
        const referencesRelative = path.posix.join(runtimeRelative, "references");
        let fired = false;
        const result = defaultRun(fixture, ({ phase, relativePath }) => {
          if (
            !fired &&
            phase === "before-directory-final-seal" &&
            relativePath === referencesRelative
          ) {
            fs.writeFileSync(runtimeFile(fixture, "seal-new-sibling.txt"), "new\n");
            fired = true;
          }
        });
        if (!fired) throw new Error("runtime directory final-seal hook did not execute");
        return result;
      },
    },
    {
      name: "manifest changes after its read revalidation",
      expected: "file identity changed after its validated snapshot",
      mutate() {},
      run(fixture, defaultRun) {
        const manifestFile = path.join(fixture, manifestRelative);
        let fired = false;
        const result = defaultRun(fixture, ({ file, phase }) => {
          if (!fired && phase === "after-revalidate" && file === manifestFile) {
            fs.appendFileSync(manifestFile, " ");
            fired = true;
          }
        });
        if (!fired) throw new Error("manifest after-revalidate hook did not execute");
        return result;
      },
    },
    {
      name: "sparse retained descriptor growth is finalized without allocating its new size",
      expected: "file identity changed after its validated snapshot",
      mutate() {},
      run(fixture, defaultRun) {
        const manifest = readManifest(fixture, manifestRelative);
        const targetFile = path.join(fixture, manifest.cases[0].expectations[0].targets[0].path);
        const originalBytes = fs.readFileSync(targetFile);
        const sparseLength = 64 * 1024 * 1024 + originalBytes.length;
        const originalAlloc = Buffer.alloc;
        let fired = false;
        let result;
        try {
          result = defaultRun(fixture, ({ file, phase }) => {
            if (!fired && phase === "before-final-seal" && file === targetFile) {
              fs.truncateSync(targetFile, sparseLength);
              Buffer.alloc = function guardedAlloc(size, ...arguments_) {
                if (size === sparseLength) {
                  throw new RangeError("synthetic allocation ceiling");
                }
                return Reflect.apply(originalAlloc, Buffer, [size, ...arguments_]);
              };
              fired = true;
            }
          });
        } finally {
          Buffer.alloc = originalAlloc;
          fs.writeFileSync(targetFile, originalBytes);
        }
        if (!fired) throw new Error("retained descriptor final-seal hook did not execute");
        return result;
      },
    },
    {
      name: "final retained-descriptor read failure is finalized and closes its descriptor",
      expected: "unable to seal retained validation descriptor: synthetic final-seal EIO",
      mutate() {},
      run(fixture, defaultRun) {
        const manifest = readManifest(fixture, manifestRelative);
        const targetFile = path.join(fixture, manifest.cases[0].expectations[0].targets[0].path);
        const originalRead = fs.readSync;
        let armed = false;
        let injectedDescriptor = null;
        let result;
        fs.readSync = function injectedFinalSealRead(descriptor, ...arguments_) {
          if (armed && injectedDescriptor === null) {
            injectedDescriptor = descriptor;
            const error = new Error("synthetic final-seal EIO");
            error.code = "EIO";
            throw error;
          }
          return Reflect.apply(originalRead, fs, [descriptor, ...arguments_]);
        };
        try {
          result = defaultRun(fixture, ({ file, phase }) => {
            if (!armed && phase === "before-final-seal" && file === targetFile) {
              armed = true;
            }
          });
        } finally {
          fs.readSync = originalRead;
        }
        if (!armed || injectedDescriptor === null) {
          throw new Error("final-seal EIO fixture did not inject its read failure");
        }
        try {
          fs.fstatSync(injectedDescriptor);
          throw new Error("final-seal EIO fixture leaked its retained descriptor");
        } catch (error) {
          if (error?.code !== "EBADF") throw error;
        }
        return result;
      },
    },
    {
      name: "runtime leaf mutated while retained descriptors close is caught by final policy seal",
      expected: "policy path identity changed after capture",
      mutate(fixture) {
        fs.writeFileSync(runtimeFile(fixture, "unreferenced-close-race.txt"), "harmless\n");
      },
      run(fixture, defaultRun) {
        const leaf = runtimeFile(fixture, "unreferenced-close-race.txt");
        const { marker } = prepareAuthorizedShortFingerprint(fixture);
        const originalClose = fs.closeSync;
        let armed = false;
        let fired = false;
        let result;
        fs.closeSync = function mutateRuntimeLeafAfterClose(descriptor) {
          const result = Reflect.apply(originalClose, fs, [descriptor]);
          if (armed && !fired) {
            fs.writeFileSync(leaf, `${marker}\n`, "utf8");
            fired = true;
          }
          return result;
        };
        try {
          result = defaultRun(fixture, ({ file, phase }) => {
            if (!armed && phase === "before-final-seal" && file === leaf) armed = true;
          });
        } finally {
          fs.closeSync = originalClose;
        }
        if (!armed || !fired) {
          throw new Error("runtime leaf close-race fixture did not mutate after descriptor close");
        }
        return result;
      },
    },
    {
      name: "target is replaced by a same-bytes inode after read revalidation",
      expected: "file identity changed after its validated snapshot",
      mutate() {},
      run(fixture, defaultRun) {
        const manifest = readManifest(fixture, manifestRelative);
        const targetFile = path.join(fixture, manifest.cases[0].expectations[0].targets[0].path);
        const parked = `${targetFile}.parked-same-bytes`;
        let fired = false;
        const result = defaultRun(fixture, ({ file, phase }) => {
          if (!fired && phase === "after-revalidate" && file === targetFile) {
            const bytes = fs.readFileSync(targetFile);
            fs.renameSync(targetFile, parked);
            fs.writeFileSync(targetFile, bytes);
            fired = true;
          }
        });
        if (!fired) throw new Error("target after-revalidate hook did not execute");
        return result;
      },
    },
    {
      name: "validation root swaps to a symlink after policy capture",
      expected: "validation root identity changed after capture",
      mutate() {},
      run(fixture, defaultRun) {
        const parked = `${fixture}-parked-root`;
        let fired = false;
        let swapped = false;
        let result;
        try {
          result = defaultRun(fixture, ({ phase }) => {
            if (fired || phase !== "after-policy-capture") return;
            fired = true;
            fs.renameSync(fixture, parked);
            try {
              createFixtureSymlink(parked, fixture, "dir");
              swapped = true;
            } catch (error) {
              fs.renameSync(parked, fixture);
              throw error;
            }
          });
        } finally {
          if (swapped) {
            fs.unlinkSync(fixture);
            fs.renameSync(parked, fixture);
          }
        }
        if (!fired) throw new Error("after-policy-capture hook did not execute");
        return result;
      },
    },
    {
      name: "target parent swaps during realpath resolution",
      expected: "path identity changed while resolving the real path",
      mutate() {},
      run(fixture, defaultRun) {
        const manifest = readManifest(fixture, manifestRelative);
        const targetRelative = manifest.cases[0].expectations[0].targets[0].path;
        const targetFile = path.join(fixture, targetRelative);
        const parent = path.dirname(targetFile);
        const parked = `${parent}-parked-realpath`;
        const outside = `${fixture}-outside-realpath`;
        let swapped = false;
        let fired = false;
        let result;
        try {
          result = defaultRun(fixture, ({ phase, relativePath }) => {
            if (!fired && phase === "before-realpath" && relativePath === targetRelative) {
              fired = true;
              fs.mkdirSync(outside);
              fs.copyFileSync(targetFile, path.join(outside, path.basename(targetFile)));
              fs.renameSync(parent, parked);
              try {
                createFixtureSymlink(outside, parent, "dir");
                swapped = true;
              } catch (error) {
                fs.renameSync(parked, parent);
                throw error;
              }
            } else if (swapped && phase === "after-realpath" && relativePath === targetRelative) {
              fs.unlinkSync(parent);
              fs.renameSync(parked, parent);
              swapped = false;
            }
          });
        } finally {
          if (swapped) {
            fs.unlinkSync(parent);
            fs.renameSync(parked, parent);
          }
          fs.rmSync(outside, { recursive: true, force: true });
        }
        if (!fired) throw new Error("target realpath race hook did not execute");
        return result;
      },
    },
    {
      name: "runtime policy directory is replaced after capture",
      expected: "policy path identity changed after capture",
      mutate() {},
      run(fixture, defaultRun) {
        const runtime = path.join(fixture, runtimeRelative);
        const parked = `${runtime}-parked-policy`;
        let fired = false;
        const result = defaultRun(fixture, ({ phase, relativePath }) => {
          if (!fired && phase === "before-policy-use" && relativePath === runtimeRelative) {
            fs.renameSync(runtime, parked);
            fs.cpSync(parked, runtime, { recursive: true });
            fired = true;
          }
        });
        if (!fired) throw new Error("runtime before-policy-use hook did not execute");
        return result;
      },
    },
    {
      name: "target policy changes to a forbidden hardlink during later policy validation",
      expected: "policy path identity changed after capture",
      mutate(fixture) {
        const manifest = readManifest(fixture, manifestRelative);
        const target = manifest.cases[0].expectations[0].targets[0];
        const casesRelative = path.posix.dirname(manifest.cases[0].sourcePath);
        const raceParentRelative = path.posix.join(casesRelative, "identity-order-parent");
        const currentRelative = path.posix.join(raceParentRelative, "current");
        const swapRelative = path.posix.join(raceParentRelative, "swap");
        const targetRelative = path.posix.join(currentRelative, "target.md");
        const runsRelative = path.posix.join(path.posix.dirname(manifestRelative), "runs");
        const forbiddenRelative = path.posix.join(
          runsRelative,
          "identity-order-race",
          "forbidden-target.md",
        );
        const content = `## ${target.heading}\n\n${target.markers.join("\n")}\n`;
        fs.mkdirSync(path.join(fixture, currentRelative), { recursive: true });
        fs.mkdirSync(path.join(fixture, swapRelative), { recursive: true });
        fs.mkdirSync(path.dirname(path.join(fixture, forbiddenRelative)), {
          recursive: true,
        });
        fs.writeFileSync(path.join(fixture, targetRelative), content, "utf8");
        fs.writeFileSync(path.join(fixture, forbiddenRelative), content, "utf8");
        fs.linkSync(
          path.join(fixture, forbiddenRelative),
          path.join(fixture, swapRelative, "target.md"),
        );
        target.path = targetRelative;
        writeManifest(fixture, manifestRelative, manifest);
      },
      run(fixture, defaultRun) {
        const manifest = readManifest(fixture, manifestRelative);
        const target = manifest.cases[0].expectations[0].targets[0];
        const targetFile = path.join(fixture, target.path);
        const current = path.dirname(targetFile);
        const raceParent = path.dirname(current);
        const swap = path.join(raceParent, "swap");
        const parked = path.join(raceParent, "parked");
        const casesRelative = path.posix.dirname(manifest.cases[0].sourcePath);
        let targetPolicyObserved = false;
        let casesPolicyObserved = false;
        let runtimePolicyUses = 0;
        let swapped = false;
        try {
          const result = defaultRun(fixture, ({ phase, relativePath }) => {
            if (phase !== "before-policy-use") return;
            if (relativePath === target.path) {
              targetPolicyObserved = true;
              return;
            }
            if (!targetPolicyObserved) return;
            if (relativePath === casesRelative) casesPolicyObserved = true;
            if (relativePath === runtimeRelative) runtimePolicyUses += 1;
            if (!swapped && casesPolicyObserved && runtimePolicyUses >= 2) {
              fs.renameSync(current, parked);
              fs.renameSync(swap, current);
              swapped = true;
            }
          });
          if (!targetPolicyObserved) {
            throw new Error("target policy hook did not execute before the swap trigger");
          }
          if (!swapped) {
            throw new Error("later runtime policy hook did not swap the nested target parent");
          }
          return result;
        } finally {
          if (swapped) {
            fs.renameSync(current, swap);
            fs.renameSync(parked, current);
          }
        }
      },
    },
    {
      name: "runtime parent becomes a symlink to the same directory during file seal",
      expected: "path components must be symlink-free",
      mutate(fixture) {
        fs.writeFileSync(runtimeFile(fixture, "parent-symlink-seal.txt"), "stable\n");
      },
      run(fixture, defaultRun) {
        const leaf = runtimeFile(fixture, "parent-symlink-seal.txt");
        const parent = path.dirname(leaf);
        const parked = `${parent}-parked-seal`;
        let swapped = false;
        let fired = false;
        let result;
        try {
          result = defaultRun(fixture, ({ file, phase }) => {
            if (!fired && phase === "before-final-seal" && file === leaf) {
              fired = true;
              fs.renameSync(parent, parked);
              try {
                createFixtureSymlink(parked, parent, "dir");
                swapped = true;
              } catch (error) {
                fs.renameSync(parked, parent);
                throw error;
              }
            }
          });
        } finally {
          if (swapped) {
            fs.unlinkSync(parent);
            fs.renameSync(parked, parent);
          }
        }
        if (!fired) throw new Error("runtime file final-seal hook did not execute");
        return result;
      },
    },
  ];
}

export function harmlessNumericEvidenceMutation(runtimeRelative) {
  return (fixture) => {
    fs.writeFileSync(
      path.join(fixture, runtimeRelative, "references", "harmless-numeric.json"),
      JSON.stringify({
        0: { line: "unrelated active documentation", sequence: 1 },
        1: { line: "", sequence: 2 },
        2: { line: "no legacy material here", sequence: 3 },
      }),
      "utf8",
    );
  };
}

export function commonLegacyLineagePositiveCases({
  manifestRelative,
  prepareAuthorizedShortFingerprint,
}) {
  return [
    {
      name: "explicitly rejected expectation retains a visible active decision target",
      mutate(fixture) {
        const manifest = readManifest(fixture, manifestRelative);
        const expectation = manifest.cases[0].expectations[0];
        expectation.outcome = "explicitly-rejected";
        expectation.reason =
          "The current active decision explicitly rejected this historical behavior.";
        writeManifest(fixture, manifestRelative, manifest);
      },
    },
    {
      name: "authorized contiguous JSON leaf counts as one visible occurrence",
      mutate(fixture) {
        const { marker, target } = prepareAuthorizedShortFingerprint(fixture);
        const targetFile = path.join(fixture, target.path);
        const before = fs.readFileSync(targetFile, "utf8");
        const after = before.replace(marker, JSON.stringify({ decision: marker }));
        if (after === before) {
          throw new Error("contiguous JSON leaf fixture could not replace its prepared marker");
        }
        fs.writeFileSync(targetFile, after, "utf8");
      },
    },
    {
      name: "valid single emphasis preserves rendered target authorization",
      mutate(fixture) {
        const { marker, target } = prepareAuthorizedShortFingerprint(fixture);
        const word = marker.match(/[A-Za-z]{4,}/)?.[0];
        if (!word) throw new Error("valid emphasis fixture has no eligible word");
        const targetFile = path.join(fixture, target.path);
        const before = fs.readFileSync(targetFile, "utf8");
        const after = before.replace(marker, marker.replace(word, `*${word}*`));
        if (after === before) {
          throw new Error("valid emphasis fixture could not replace its marker");
        }
        fs.writeFileSync(targetFile, after, "utf8");
      },
    },
  ];
}
