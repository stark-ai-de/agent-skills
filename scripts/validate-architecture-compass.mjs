import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const skillDir = path.join(root, "skills", "engineering-workflows", "architecture-compass");
const referencesDir = path.join(skillDir, "references");
const assetsDir = path.join(skillDir, "assets");
const skillFile = path.join(skillDir, "SKILL.md");
const catalogFile = path.join(referencesDir, "adr-catalog.md");
const decisionLockFile = path.join(
  root,
  "scripts",
  "validation",
  "architecture-compass",
  "decision-lock.tsv",
);
const errors = [];

const variants = ["short", "long", "guide"];
const variantLabels = new Map([
  ["short", "Short"],
  ["long", "Long"],
  ["guide", "Guide"],
]);
const metadataFields = [
  "ID",
  "Title",
  "Status",
  "Date",
  "Owner",
  "Scope",
  "Category",
  "Tags",
  "Applies when",
  "Adoptable",
  "Variant",
  "Canonical variant",
  "Supersedes",
  "Superseded by",
  "Guide verified",
  "Gist",
];
const identityFields = metadataFields.filter((field) => field !== "Variant");
const allowedCategories = new Set([
  "governance",
  "agent-lifecycle",
  "repository-architecture",
  "frontend",
  "backend",
  "runtime-platform",
  "security-data",
  "stack-tooling",
  "quality-delivery",
]);
const expectedCategories = new Map([
  [1, "governance"],
  [2, "governance"],
  [3, "agent-lifecycle"],
  [4, "quality-delivery"],
  [5, "governance"],
  [6, "repository-architecture"],
  [7, "repository-architecture"],
  [8, "frontend"],
  [9, "frontend"],
  [10, "frontend"],
  [11, "backend"],
  [12, "runtime-platform"],
  [13, "stack-tooling"],
  [14, "runtime-platform"],
  [15, "frontend"],
  [16, "runtime-platform"],
  [17, "security-data"],
  [18, "quality-delivery"],
  [19, "security-data"],
  [20, "security-data"],
  [21, "quality-delivery"],
  [22, "quality-delivery"],
  [23, "runtime-platform"],
  [24, "frontend"],
  [25, "quality-delivery"],
]);
const expectedStems = new Map([
  [1, "ac-adr-001-route-architecture-compass-through-canonical-adr-triplets"],
  [2, "ac-adr-002-select-actions-resolve-authority-and-record-guardrail-adoption"],
  [3, "ac-adr-003-coordinate-agents-and-execute-only-approved-bounded-slices"],
  [4, "ac-adr-004-report-staged-evidence-and-protect-public-outputs"],
  [5, "ac-adr-005-make-repository-adrs-binding-agent-guardrails"],
  [6, "ac-adr-006-assign-workspace-ownership-and-source-roles"],
  [7, "ac-adr-007-enforce-runtime-safe-module-and-public-package-boundaries"],
  [8, "ac-adr-008-compose-nextjs-routes-rendering-and-component-responsibilities"],
  [9, "ac-adr-009-choose-read-query-caching-and-freshness-boundaries"],
  [10, "ac-adr-010-protect-writes-behind-validated-command-boundaries"],
  [11, "ac-adr-011-compose-long-running-backend-runtimes-and-lifecycles-explicitly"],
  [12, "ac-adr-012-resolve-environment-and-configuration-at-deployable-boundaries"],
  [13, "ac-adr-013-own-language-package-build-lint-and-supply-chain-tooling-explicitly"],
  [
    14,
    "ac-adr-014-select-application-runtimes-deployment-hosts-and-additional-targets-by-evidence",
  ],
  [15, "ac-adr-015-select-frontend-capability-libraries-by-product-need"],
  [16, "ac-adr-016-select-ai-model-streaming-ui-and-agent-capabilities-deliberately"],
  [17, "ac-adr-017-select-relational-cache-queue-and-realtime-capabilities-by-data-requirements"],
  [18, "ac-adr-018-validate-behavior-at-the-owning-boundary-and-promote-enforcement-gradually"],
  [19, "ac-adr-019-apply-security-and-privacy-controls-at-every-trust-boundary"],
  [20, "ac-adr-020-define-data-ownership-tenancy-retention-and-deletion-before-access-paths"],
  [21, "ac-adr-021-preserve-compatibility-through-explicit-migrations-and-deprecation-windows"],
  [22, "ac-adr-022-deliver-reversible-slices-with-explicit-rollback-and-promotion-gates"],
  [23, "ac-adr-023-operate-services-with-observable-health-readiness-failure-and-cleanup"],
  [24, "ac-adr-024-meet-an-explicit-accessibility-baseline-with-automated-and-manual-proof"],
  [25, "ac-adr-025-set-measurable-performance-budgets-and-optimize-from-evidence"],
]);
const legacyReferenceFiles = [
  "adoption-workflows.md",
  "backend-runtime-patterns.md",
  "checklists.md",
  "host-collaboration-modes.md",
  "nextjs-request-patterns.md",
  "preferred-stack-profile.md",
  "repository-source-structure.md",
  "rule-extraction-and-conflict-resolution.md",
];
const baselineEvalCases = [
  "conditional-plan-routing-matrix.md",
  "read-only-transition-gate.md",
  "read-only-explicitly-declined-fallback.md",
  "conflicting-adrs-plan-gate.md",
  "stack-deviation-routing.md",
  "native-plan-fallbacks.md",
  "native-plan-declined-fallback.md",
  "native-plan-indeterminate-fallback.md",
  "native-plan-execution-lifecycle.md",
  "approved-decision-no-implementation.md",
  "portable-fallback-execution-lifecycle.md",
  "direct-route-reclassification.md",
  "direct-write-permission-gate.md",
  "reentry-material-drift.md",
  "audit-and-pr-review-routing.md",
];
const routedLibraryEvalCases = [
  "adr-catalog-short-first-inventory.md",
  "selective-frontend-routing.md",
  "selective-backend-routing.md",
  "cross-category-adr-routing.md",
  "instruction-adr-authority-conflict.md",
  "setup-adoptable-only.md",
  "stale-subagent-reconciliation.md",
  "evidence-stage-claim-limits.md",
  "invalid-missing-triplet.md",
  "invalid-id-collision.md",
  "invalid-metadata-drift.md",
  "invalid-decision-drift.md",
  "invalid-catalog-orphan.md",
  "invalid-legacy-link.md",
];
const expectedEvalCases = [...baselineEvalCases, ...routedLibraryEvalCases];

function fail(message) {
  errors.push(message);
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function readRegularFile(file) {
  const rel = relative(file);
  if (!fs.existsSync(file)) {
    fail(`${rel}: missing required file`);
    return "";
  }
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail(`${rel}: expected a regular, non-symlink file`);
    return "";
  }
  return fs.readFileSync(file, "utf8");
}

function markdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      fail(`${relative(full)}: symlinks are not permitted in the Architecture Compass payload`);
    } else if (entry.isDirectory()) {
      files.push(...markdownFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(full);
    }
  }
  return files.sort();
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function sectionText(value, heading) {
  const lines = value.split(/\r?\n/);
  const start = lines.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const collected = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) break;
    collected.push(line);
  }
  return collected.join("\n").trim();
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readDecisionLocks() {
  const locks = new Map();
  const rel = relative(decisionLockFile);
  if (!fs.existsSync(decisionLockFile)) {
    fail(`${rel}: missing accepted-decision lock`);
    return locks;
  }
  const lines = fs.readFileSync(decisionLockFile, "utf8").split(/\r?\n/);
  if (lines[0] !== "# schema=1 algorithm=sha256") fail(`${rel}: invalid schema header`);
  if (lines[1] !== "# id\tstem\tshort_decision_sha256\tlong_decision_sha256") {
    fail(`${rel}: invalid column header`);
  }
  for (const [index, line] of lines.slice(2).entries()) {
    if (!line) continue;
    const [id, stem, shortDigest, longDigest, ...extra] = line.split("\t");
    if (
      extra.length ||
      !/^AC-ADR-\d{3}$/.test(id ?? "") ||
      !/^ac-adr-\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(stem ?? "") ||
      !/^[a-f0-9]{64}$/.test(shortDigest ?? "") ||
      !/^[a-f0-9]{64}$/.test(longDigest ?? "")
    ) {
      fail(`${rel}:${index + 3}: malformed decision lock row`);
      continue;
    }
    if (locks.has(id)) {
      fail(`${rel}: duplicate ${id}`);
      continue;
    }
    locks.set(id, { stem, shortDigest, longDigest });
  }
  return locks;
}

function expectedNavigation(stem, variant) {
  if (variant === "short") {
    return `Variants: **Short** · [Long, canonical](${stem}.long.md) · [Guide](${stem}.guide.md)`;
  }
  if (variant === "long") {
    return `Variants: [Short](${stem}.short.md) · **Long, canonical** · [Guide](${stem}.guide.md)`;
  }
  return `Variants: [Short](${stem}.short.md) · [Long, canonical](${stem}.long.md) · **Guide**`;
}

function parseTriplet(file, match) {
  const text = readRegularFile(file);
  const rel = relative(file);
  const [, stem, rawId, slug, variant] = match;
  const idNumber = Number(rawId);
  const lines = text.split(/\r?\n/);
  const titleMatch = /^# (AC-ADR-\d{3}): (.+)$/.exec(lines[0] ?? "");

  if (!titleMatch) {
    fail(`${rel}: first line must be "# AC-ADR-NNN: Title"`);
  }

  let cursor = 1;
  const metadata = new Map();
  for (const field of metadataFields) {
    while (lines[cursor]?.trim() === "") cursor += 1;
    const prefix = `${field}: `;
    const line = lines[cursor] ?? "";
    if (!line.startsWith(prefix) || line.slice(prefix.length).trim() === "") {
      fail(`${rel}: expected non-empty "${field}:" metadata in the canonical field order`);
      continue;
    }
    metadata.set(field, line.slice(prefix.length));
    cursor += 1;
  }

  for (const field of metadataFields) {
    const count = lines.filter((line) => line.startsWith(`${field}: `)).length;
    if (count !== 1) fail(`${rel}: expected exactly one "${field}:" field; found ${count}`);
  }

  while (lines[cursor]?.trim() === "") cursor += 1;
  const navigation = lines[cursor] ?? "";
  const expectedNav = expectedNavigation(stem, variant);
  if (navigation !== expectedNav) {
    fail(`${rel}: variant navigation must be exactly "${expectedNav}"`);
  }
  if (lines.filter((line) => line.startsWith("Variants: ")).length !== 1) {
    fail(`${rel}: expected exactly one Variants navigation line`);
  }

  const expectedId = `AC-ADR-${rawId}`;
  if (metadata.get("ID") !== expectedId) {
    fail(`${rel}: ID must be ${expectedId}`);
  }
  if (titleMatch?.[1] !== expectedId) {
    fail(`${rel}: heading ID must be ${expectedId}`);
  }
  if (titleMatch && metadata.get("Title") !== titleMatch[2]) {
    fail(`${rel}: Title metadata must match the H1 title byte-for-byte`);
  }
  if (metadata.get("Status") !== "Accepted") {
    fail(`${rel}: Architecture Compass guardrails must have Status: Accepted`);
  }
  const expectedStem = expectedStems.get(idNumber);
  if (expectedStem && stem !== expectedStem) {
    fail(`${rel}: approved inventory stem for ${expectedId} is ${expectedStem}`);
  }
  for (const field of ["Date", "Guide verified"]) {
    if (!isIsoDate(metadata.get(field))) {
      fail(`${rel}: ${field} must be a real ISO date (YYYY-MM-DD)`);
    }
  }
  if (metadata.get("Owner") !== "stark-ai-de") {
    fail(`${rel}: Owner must be stark-ai-de`);
  }

  const expectedScope = idNumber <= 4 ? "skill-runtime" : "target-repository";
  if (metadata.get("Scope") !== expectedScope) {
    fail(`${rel}: Scope must be ${expectedScope} for AC-ADR-${rawId}`);
  }
  const category = metadata.get("Category");
  if (!allowedCategories.has(category)) {
    fail(`${rel}: Category "${category}" is not in the Architecture Compass taxonomy`);
  }
  const expectedCategory = expectedCategories.get(idNumber);
  if (expectedCategory && category !== expectedCategory) {
    fail(`${rel}: Category must be ${expectedCategory} for AC-ADR-${rawId}`);
  }
  const expectedAdoptable = idNumber <= 4 ? "false" : "true";
  if (metadata.get("Adoptable") !== expectedAdoptable) {
    fail(`${rel}: Adoptable must be ${expectedAdoptable} for ${expectedScope} ADRs`);
  }
  if (metadata.get("Variant") !== variantLabels.get(variant)) {
    fail(`${rel}: Variant must match the .${variant}.md filename`);
  }
  if (metadata.get("Canonical variant") !== "Long") {
    fail(`${rel}: Canonical variant must be Long`);
  }
  if (!metadata.get("Applies when")?.trim()) fail(`${rel}: Applies when must be non-empty`);
  if (!metadata.get("Gist")?.trim()) fail(`${rel}: Gist must be non-empty`);

  const tags = metadata.get("Tags") ?? "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*(?:, [a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(tags)) {
    fail(`${rel}: Tags must be a non-empty, comma-space-separated list of lowercase kebab tags`);
  }

  let decision = "";
  if (variant === "short") {
    decision = sectionText(text, "Decision summary");
    if (!decision) fail(`${rel}: Short must contain a non-empty Decision summary section`);
  } else if (variant === "long") {
    decision = sectionText(text, "Decision");
    for (const heading of ["Context", "Decision", "Consequences"]) {
      if (!sectionText(text, heading))
        fail(`${rel}: Long must contain a non-empty ${heading} section`);
    }
  } else {
    if (!/non-normative/i.test(text)) fail(`${rel}: Guide must state that it is non-normative`);
    if (/^## (?:Decision|Decision summary|Rules)$/m.test(text)) {
      fail(`${rel}: Guide must not define normative Decision or Rules sections`);
    }
    if (!/https:\/\//.test(text))
      fail(`${rel}: Guide must include at least one primary source link`);
  }

  return { file, rel, text, stem, slug, idNumber, rawId, variant, metadata, decision };
}

function parseAdrList(value, rel, field) {
  if (value === "none") return [];
  if (!/^AC-ADR-\d{3}(?:, AC-ADR-\d{3})*$/.test(value ?? "")) {
    fail(`${rel}: ${field} must be "none" or a comma-space-separated AC-ADR ID list`);
    return [];
  }
  return value.split(", ");
}

if (!fs.existsSync(referencesDir)) {
  fail(`${relative(referencesDir)}: missing references directory`);
}

const referenceEntries = fs.existsSync(referencesDir)
  ? fs.readdirSync(referencesDir, { withFileTypes: true })
  : [];
for (const entry of referenceEntries) {
  if (entry.isDirectory()) {
    fail(
      `${relative(path.join(referencesDir, entry.name))}: nested reference directories are not permitted`,
    );
  } else if (!entry.isFile() || !entry.name.endsWith(".md")) {
    fail(`${relative(path.join(referencesDir, entry.name))}: references must be Markdown files`);
  }
}
const referenceMarkdown = referenceEntries
  .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
  .map((entry) => entry.name)
  .sort();
const tripletPattern = /^(ac-adr-(\d{3})-([a-z0-9]+(?:-[a-z0-9]+)*))\.(short|long|guide)\.md$/;
const records = [];

for (const fileName of referenceMarkdown) {
  if (fileName === "adr-catalog.md") continue;
  const match = tripletPattern.exec(fileName);
  if (!match) {
    fail(
      `${relative(path.join(referencesDir, fileName))}: references may contain only adr-catalog.md and AC-ADR triplets`,
    );
    continue;
  }
  records.push(parseTriplet(path.join(referencesDir, fileName), match));
}

for (const legacy of legacyReferenceFiles) {
  if (fs.existsSync(path.join(referencesDir, legacy))) {
    fail(`${relative(path.join(referencesDir, legacy))}: legacy policy reference must be removed`);
  }
}

const recordsById = new Map();
for (const record of records) {
  if (!recordsById.has(record.idNumber)) recordsById.set(record.idNumber, []);
  recordsById.get(record.idNumber).push(record);
}

const decisionLocks = readDecisionLocks();

for (let id = 1; id <= 25; id += 1) {
  const label = String(id).padStart(3, "0");
  const idRecords = recordsById.get(id) ?? [];
  if (idRecords.length !== 3) {
    fail(`AC-ADR-${label}: expected exactly three variants; found ${idRecords.length}`);
  }
  const stems = new Set(idRecords.map((record) => record.stem));
  if (stems.size > 1) {
    fail(`AC-ADR-${label}: ID collision across stems: ${[...stems].sort().join(", ")}`);
  }
  for (const variant of variants) {
    const count = idRecords.filter((record) => record.variant === variant).length;
    if (count !== 1) {
      fail(`AC-ADR-${label}: expected exactly one .${variant}.md variant; found ${count}`);
    }
  }

  const baseline = idRecords.find((record) => record.variant === "long") ?? idRecords[0];
  if (baseline) {
    for (const record of idRecords) {
      for (const field of identityFields) {
        if (record.metadata.get(field) !== baseline.metadata.get(field)) {
          fail(
            `${record.rel}: ${field} metadata drifts from ${baseline.rel}; only Variant may differ within a triplet`,
          );
        }
      }
    }
  }

  const lockId = `AC-ADR-${label}`;
  const lock = decisionLocks.get(lockId);
  const short = idRecords.find((record) => record.variant === "short");
  const long = idRecords.find((record) => record.variant === "long");
  if (!lock) {
    fail(`${relative(decisionLockFile)}: missing ${lockId} accepted-decision lock`);
  } else if (short && long) {
    if (lock.stem !== long.stem) fail(`${lockId}: accepted stem drifted from ${lock.stem}`);
    if (lock.shortDigest !== sha256(short.decision)) {
      fail(`${lockId}: Short Decision summary drifted from its accepted lock`);
    }
    if (lock.longDigest !== sha256(long.decision)) {
      fail(`${lockId}: Long Decision drifted from its accepted lock`);
    }
  }
}

for (const id of decisionLocks.keys()) {
  if (!/^AC-ADR-(?:00[1-9]|01\d|02[0-5])$/.test(id)) {
    fail(`${relative(decisionLockFile)}: orphan decision lock ${id}`);
  }
}

for (const id of [...recordsById.keys()].sort((a, b) => a - b)) {
  if (id < 1 || id > 25) {
    fail(`AC-ADR-${String(id).padStart(3, "0")}: expected inventory is exactly AC-ADR-001..025`);
  }
}

const canonicalRecords = new Map(
  records
    .filter((record) => record.variant === "long" && record.idNumber >= 1 && record.idNumber <= 25)
    .map((record) => [`AC-ADR-${record.rawId}`, record]),
);
for (const [id, record] of canonicalRecords) {
  const supersedes = parseAdrList(record.metadata.get("Supersedes"), record.rel, "Supersedes");
  const supersededBy = parseAdrList(
    record.metadata.get("Superseded by"),
    record.rel,
    "Superseded by",
  );

  for (const targetId of supersedes) {
    const target = canonicalRecords.get(targetId);
    if (!target) {
      fail(`${record.rel}: Supersedes references missing ${targetId}`);
      continue;
    }
    const reverse = parseAdrList(target.metadata.get("Superseded by"), target.rel, "Superseded by");
    if (!reverse.includes(id)) {
      fail(`${record.rel}: ${targetId} must reciprocally list ${id} in Superseded by`);
    }
  }
  for (const sourceId of supersededBy) {
    const source = canonicalRecords.get(sourceId);
    if (!source) {
      fail(`${record.rel}: Superseded by references missing ${sourceId}`);
      continue;
    }
    const reverse = parseAdrList(source.metadata.get("Supersedes"), source.rel, "Supersedes");
    if (!reverse.includes(id)) {
      fail(`${record.rel}: ${sourceId} must reciprocally list ${id} in Supersedes`);
    }
  }
}

const catalogText = readRegularFile(catalogFile);
const catalogRel = relative(catalogFile);
const expectedTripletNames = new Set(records.map((record) => path.basename(record.file)));
const catalogLinks = [...catalogText.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g)].map((match) => match[1]);
const catalogAdrLinks = catalogLinks.filter((link) => link.startsWith("ac-adr-"));

for (const name of expectedTripletNames) {
  if (!catalogAdrLinks.includes(name)) {
    fail(`${catalogRel}: missing direct link to ${name}`);
  }
}
for (const link of catalogAdrLinks) {
  if (link !== path.basename(link) || !tripletPattern.test(link)) {
    fail(`${catalogRel}: AC-ADR catalog links must be direct triplet filenames; found ${link}`);
  } else if (!expectedTripletNames.has(link)) {
    fail(`${catalogRel}: orphan AC-ADR link ${link}`);
  }
}
for (const heading of ["## Skill runtime", "## Target repository", "## Concern views"]) {
  if (!catalogText.includes(heading)) {
    fail(`${catalogRel}: catalog must expose ${heading.slice(3)} routing`);
  }
}
for (const categoryHeading of [
  "### Governance",
  "### Agent lifecycle",
  "### Repository architecture",
  "### Frontend",
  "### Backend",
  "### Runtime and platform",
  "### Security and data",
  "### Stack and tooling",
  "### Quality and delivery",
]) {
  if (!catalogText.includes(categoryHeading)) {
    fail(`${catalogRel}: catalog must expose the ${categoryHeading.slice(4)} category`);
  }
}
for (const column of ["Status", "Applies when", "Tags"]) {
  if (!new RegExp(`\\|\\s*${column}\\s*\\|`).test(catalogText)) {
    fail(`${catalogRel}: catalog must expose the ${column} field`);
  }
}

const skillText = readRegularFile(skillFile);
const skillRel = relative(skillFile);
if (!skillText.includes("references/adr-catalog.md")) {
  fail(`${skillRel}: must link directly to references/adr-catalog.md`);
}
if (!/references\/ac-adr-\d{3}-[a-z0-9-]+\.short\.md/.test(skillText)) {
  fail(`${skillRel}: selective routing must include at least one direct Short ADR link`);
}
if (!/(?:select\w*|relevant|applies when)/i.test(skillText)) {
  fail(`${skillRel}: must tell agents how to select only relevant ADRs`);
}
if (/references\/[^\s)`]*[*{}]/.test(skillText)) {
  fail(`${skillRel}: wildcard or brace expansion is not selective ADR routing`);
}
for (const line of skillText.split(/\r?\n/)) {
  if (
    /\b(?:read|load|open|inspect)\b.{0,70}\b(?:all|every|entire)\b.{0,70}\b(?:ADR|reference|triplet)/i.test(
      line,
    ) &&
    !/\b(?:do not|don't|never|avoid|without)\b/i.test(line)
  ) {
    fail(`${skillRel}: read-all directive is forbidden: ${line.trim()}`);
  }
}

const skillMarkdown = markdownFiles(skillDir);
const unsuffixedAcPath = /\bac-adr-\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*\.md\b/gi;
for (const file of skillMarkdown) {
  const text = readRegularFile(file);
  const rel = relative(file);
  const unsuffixed = text.match(unsuffixedAcPath) ?? [];
  for (const link of unsuffixed) {
    fail(`${rel}: unsuffixed AC-ADR path is forbidden: ${link}`);
  }
  for (const legacy of legacyReferenceFiles) {
    if (text.includes(legacy)) {
      fail(`${rel}: stale legacy reference path ${legacy}`);
    }
  }
  const linkedTriplets = [
    ...text.matchAll(
      /\[[^\]]+\]\(([^)\s]*ac-adr-\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*\.(?:short|long|guide)\.md)\)/gi,
    ),
  ];
  for (const match of linkedTriplets) {
    const destination = path.resolve(path.dirname(file), match[1]);
    const withinSkill =
      destination === skillDir || destination.startsWith(`${skillDir}${path.sep}`);
    if (!withinSkill || !fs.existsSync(destination) || !fs.lstatSync(destination).isFile()) {
      fail(`${rel}: orphan AC-ADR link ${match[1]}`);
    }
  }
}

const assetFiles = markdownFiles(assetsDir);
if (assetFiles.length === 0) fail(`${relative(assetsDir)}: expected derived Markdown assets`);
for (const file of assetFiles) {
  const text = readRegularFile(file);
  const rel = relative(file);
  if (!/Derived, non-normative asset/i.test(text)) {
    fail(`${rel}: missing "Derived, non-normative asset" authority notice`);
  }
  if (!/(?:controlling|applicable canonical) Long ADRs prevail/i.test(text)) {
    fail(`${rel}: authority notice must state that the controlling Long ADRs prevail`);
  }
  if (/^Authority:\s*(?:Canonical|Normative)\b/im.test(text)) {
    fail(`${rel}: derived assets may not claim canonical or normative authority`);
  }
}

const evalRoot = path.join(root, "skill-evals", "architecture-compass");
const evalReadme = readRegularFile(path.join(evalRoot, "README.md"));
const evalCasesDir = path.join(evalRoot, "cases");
const actualEvalCases = fs
  .readdirSync(evalCasesDir)
  .filter((name) => name.endsWith(".md"))
  .sort();
for (const unexpected of actualEvalCases.filter((name) => !expectedEvalCases.includes(name))) {
  fail(`${relative(path.join(evalCasesDir, unexpected))}: case is outside the validated inventory`);
}
for (const caseName of expectedEvalCases) {
  const caseFile = path.join(evalCasesDir, caseName);
  const text = readRegularFile(caseFile);
  const rel = relative(caseFile);
  for (const heading of [
    "## Should Trigger",
    "## Prompt",
    "## Deterministic Assertions",
    "## Expected Behavior",
  ]) {
    if (!text.includes(heading)) fail(`${rel}: missing ${heading}`);
  }
  const shouldTrigger = sectionText(text, "Should Trigger");
  if (!new Set(["Yes.", "No."]).has(shouldTrigger)) {
    fail(`${rel}: Should Trigger must be exactly Yes. or No.`);
  }
  if (!sectionText(text, "Prompt")) fail(`${rel}: Prompt must be non-empty`);
  if (!sectionText(text, "Expected Behavior")) {
    fail(`${rel}: Expected Behavior must be non-empty`);
  }

  const assertions = sectionText(text, "Deterministic Assertions")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (assertions.length === 0) fail(`${rel}: at least one deterministic assertion is required`);
  const seenAssertions = new Set();
  const positiveValues = new Set();
  const negativeValues = new Set();
  for (const assertion of assertions) {
    const match = /^- (contains|not_contains): (.+)$/.exec(assertion);
    if (!match) {
      fail(`${rel}: invalid deterministic assertion "${assertion}"`);
      continue;
    }
    if (seenAssertions.has(assertion)) fail(`${rel}: duplicate assertion "${assertion}"`);
    seenAssertions.add(assertion);
    const [, kind, value] = match;
    (kind === "contains" ? positiveValues : negativeValues).add(value);
  }
  for (const value of positiveValues) {
    if (negativeValues.has(value)) fail(`${rel}: contradictory assertion for "${value}"`);
  }
  if (!evalReadme.includes(`cases/${caseName}`)) {
    fail(
      `${relative(path.join(evalRoot, "README.md"))}: missing cases/${caseName} inventory entry`,
    );
  }
}

export const validationErrors = [...new Set(errors)].sort();
export const validationSummary = `Architecture Compass validated: ${canonicalRecords.size} ADRs, ${records.length} triplet files, ${baselineEvalCases.length} lifecycle cases, ${routedLibraryEvalCases.length} routed-library cases.`;

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  if (validationErrors.length > 0) {
    console.error("Architecture Compass validation failed:");
    for (const error of validationErrors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(validationSummary);
}
