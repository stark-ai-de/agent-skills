import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const adrDir = path.join(root, "docs", "adrs");
const catalogPath = path.join(root, "docs", "adrs.md");
const decisionLockPath = path.join(root, "scripts", "validation", "adrs", "decision-lock.tsv");
const errors = [];

const variants = ["short", "long", "guide"];
const variantLabels = { short: "Short", long: "Long", guide: "Guide" };
const requiredTemplates = variants.map((variant) => `TEMPLATE.${variant}.md`);
const allowedStatuses = new Set(["Proposed", "Accepted", "Superseded", "Deprecated", "Rejected"]);
const categories = [
  "governance",
  "agent-lifecycle",
  "repository-architecture",
  "frontend",
  "backend",
  "runtime-platform",
  "security-data",
  "stack-tooling",
  "quality-delivery",
];
const allowedCategories = new Set(categories);
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
const sharedMetadataFields = metadataFields.filter((field) => field !== "Variant");
const filenamePattern = /^(\d{4})-([a-z0-9]+(?:-[a-z0-9]+)*)\.(short|long|guide)\.md$/;
const legacyFilenamePattern = /^\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

function addError(message) {
  errors.push(message);
}

function sectionText(text, heading) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line === `## ${heading}`);
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

function readDecisionLock() {
  const locks = new Map();
  if (!fs.existsSync(decisionLockPath)) {
    addError(`${path.relative(root, decisionLockPath)} is missing`);
    return locks;
  }

  const lines = fs.readFileSync(decisionLockPath, "utf8").split(/\r?\n/);
  if (lines[0] !== "# schema=1 algorithm=sha256") {
    addError(`${path.relative(root, decisionLockPath)}: invalid schema header`);
  }
  if (lines[1] !== "# id\tstem\tdecision_sha256") {
    addError(`${path.relative(root, decisionLockPath)}: invalid column header`);
  }

  for (const [index, line] of lines.slice(2).entries()) {
    if (!line) continue;
    const [id, stem, digest, ...extra] = line.split("\t");
    if (
      extra.length ||
      !/^ADR-\d{4}$/.test(id ?? "") ||
      !/^\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(stem ?? "") ||
      !/^[a-f0-9]{64}$/.test(digest ?? "")
    ) {
      addError(
        `${path.relative(root, decisionLockPath)}:${index + 3}: malformed decision lock row`,
      );
      continue;
    }
    if (locks.has(id)) {
      addError(`${path.relative(root, decisionLockPath)}: duplicate ${id}`);
      continue;
    }
    locks.set(id, { stem, digest });
  }
  return locks;
}

function expectedNavigation(stem, variant) {
  const short = variant === "short" ? "**Short**" : `[Short](${stem}.short.md)`;
  const long = variant === "long" ? "**Long, canonical**" : `[Long, canonical](${stem}.long.md)`;
  const guide = variant === "guide" ? "**Guide**" : `[Guide](${stem}.guide.md)`;
  return `Variants: ${short} · ${long} · ${guide}`;
}

function parseReferences(value, rel, field) {
  if (value === "None") return [];
  if (!/^ADR-\d{4}(?:, ADR-\d{4})*$/.test(value)) {
    addError(`${rel}: ${field} must be None or sorted comma-separated ADR-NNNN values`);
    return [];
  }

  const refs = value.split(", ");
  if (new Set(refs).size !== refs.length) addError(`${rel}: ${field} contains duplicate ADR IDs`);
  const sorted = [...refs].sort();
  if (refs.join(", ") !== sorted.join(", ")) addError(`${rel}: ${field} must be sorted`);
  return refs;
}

function parseAdrFile(file, match) {
  const full = path.join(adrDir, file);
  const rel = path.relative(root, full);
  const text = fs.readFileSync(full, "utf8");
  const [_, id, slug, variant] = match;
  const stem = `${id}-${slug}`;

  if (!text.endsWith("\n")) addError(`${rel}: file must end with a newline`);
  if (/[ \t]+$/m.test(text)) addError(`${rel}: trailing whitespace is not allowed`);
  if (/(?:^|\n)(?:- )?<[^>\n]+>/m.test(text)) addError(`${rel}: unresolved body placeholder`);

  const lines = text.split("\n");
  const headingMatch = lines[0]?.match(/^# ADR-(\d{4}): (.+)$/);
  if (!headingMatch) addError(`${rel}: first line must be "# ADR-NNNN: Title"`);
  if ((text.match(/^# /gm) ?? []).length !== 1) addError(`${rel}: must contain exactly one H1`);
  if (lines[1] !== "") addError(`${rel}: expected one blank line after the H1`);

  const metadata = {};
  metadataFields.forEach((field, index) => {
    const line = lines[index + 2] ?? "";
    const fieldMatch = line.match(new RegExp(`^${field}: (.+)$`));
    if (!fieldMatch) {
      addError(`${rel}: metadata field ${field} is missing or out of order`);
      return;
    }
    metadata[field] = fieldMatch[1];
  });

  const navigationIndex = metadataFields.length + 3;
  if (lines[metadataFields.length + 2] !== "") {
    addError(`${rel}: expected one blank line after metadata`);
  }
  const expectedNav = expectedNavigation(stem, variant);
  if (lines[navigationIndex] !== expectedNav) {
    addError(`${rel}: navigation must be exactly "${expectedNav}"`);
  }
  if (lines[navigationIndex + 1] !== "")
    addError(`${rel}: expected one blank line after navigation`);

  if (metadata.ID !== `ADR-${id}`) addError(`${rel}: ID must match the filename`);
  if (headingMatch?.[1] !== id) addError(`${rel}: H1 ID must match the filename`);
  if (headingMatch?.[2] !== metadata.Title) addError(`${rel}: H1 title must match Title metadata`);
  if (!allowedStatuses.has(metadata.Status))
    addError(`${rel}: invalid Status "${metadata.Status}"`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(metadata.Date ?? ""))
    addError(`${rel}: Date must use YYYY-MM-DD`);
  if (!metadata.Owner) addError(`${rel}: Owner must not be empty`);
  if (metadata.Scope !== "repository") addError(`${rel}: Scope must be repository`);
  if (!allowedCategories.has(metadata.Category))
    addError(`${rel}: invalid Category "${metadata.Category}"`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*(?:, [a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(metadata.Tags ?? "")) {
    addError(`${rel}: Tags must be unique lower-kebab values separated by comma-space`);
  } else {
    const tags = metadata.Tags.split(", ");
    if (new Set(tags).size !== tags.length) addError(`${rel}: Tags contains duplicates`);
  }
  if (!metadata["Applies when"]) addError(`${rel}: Applies when must not be empty`);
  if (metadata.Adoptable !== "false") addError(`${rel}: repository ADRs must use Adoptable: false`);
  if (metadata.Variant !== variantLabels[variant])
    addError(`${rel}: Variant must match the filename suffix`);
  if (metadata["Canonical variant"] !== "Long") addError(`${rel}: Canonical variant must be Long`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(metadata["Guide verified"] ?? "")) {
    addError(`${rel}: Guide verified must use YYYY-MM-DD`);
  }
  if (!metadata.Gist) addError(`${rel}: Gist must not be empty`);

  const supersedes = parseReferences(metadata.Supersedes ?? "", rel, "Supersedes");
  const supersededBy = parseReferences(metadata["Superseded by"] ?? "", rel, "Superseded by");
  if (supersedes.includes(`ADR-${id}`) || supersededBy.includes(`ADR-${id}`)) {
    addError(`${rel}: an ADR cannot supersede itself`);
  }
  if (metadata.Status === "Superseded" && supersededBy.length === 0) {
    addError(`${rel}: Status Superseded requires Superseded by`);
  }
  if (metadata.Status !== "Superseded" && supersededBy.length > 0) {
    addError(`${rel}: only Status Superseded may declare Superseded by`);
  }

  const decision = sectionText(text, "Decision");
  if (variant === "short") {
    if (!decision) addError(`${rel}: Short must contain a Decision section`);
    for (const heading of ["Context", "Consequences"]) {
      if (!sectionText(text, heading)) addError(`${rel}: Short must contain a ${heading} section`);
    }
  } else if (variant === "long") {
    if (!decision) addError(`${rel}: Long must contain a Decision section`);
    for (const heading of ["Why", "Options", "Consequences"]) {
      if (!sectionText(text, heading)) addError(`${rel}: Long must contain a ${heading} section`);
    }
  } else {
    if (/^## (?:Decision|Rules)$/m.test(text))
      addError(`${rel}: Guide must not define Decision or Rules sections`);
    if (!text.includes("This guide is non-normative."))
      addError(`${rel}: Guide must state that it is non-normative`);
    for (const heading of ["How to apply", "Verification", "Revisit"]) {
      if (!sectionText(text, heading)) addError(`${rel}: Guide must contain a ${heading} section`);
    }
  }

  return {
    file,
    rel,
    full,
    id,
    slug,
    stem,
    variant,
    text,
    metadata,
    supersedes,
    supersededBy,
    decision,
  };
}

function validateTemplates() {
  for (const file of requiredTemplates) {
    const full = path.join(adrDir, file);
    if (!fs.existsSync(full)) {
      addError(`docs/adrs/${file} is missing`);
      continue;
    }
    const text = fs.readFileSync(full, "utf8");
    if (/[ \t]+$/m.test(text)) addError(`docs/adrs/${file}: trailing whitespace is not allowed`);
    for (const field of metadataFields) {
      if (!new RegExp(`^${field}: .+$`, "m").test(text))
        addError(`docs/adrs/${file}: missing ${field}`);
    }
    const variant = file.match(/^TEMPLATE\.(short|long|guide)\.md$/)?.[1];
    if (variant && !text.includes(expectedNavigation("0000-short-title", variant))) {
      addError(`docs/adrs/${file}: invalid template navigation`);
    }
  }
  if (fs.existsSync(path.join(adrDir, "TEMPLATE.md")))
    addError("docs/adrs/TEMPLATE.md is forbidden after the triplet cutover");
}

function trackedMarkdownFiles() {
  const result = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "--", "*.md"],
    { cwd: root, encoding: "utf8" },
  );
  if (result.error || result.status !== 0) {
    const excluded = new Set([
      ".git",
      ".agents",
      ".codex",
      ".worktrees",
      "node_modules",
      "dist",
      "coverage",
      ".next",
      ".turbo",
      "site/dist",
      "docs/specs/do-not-publish",
    ]);
    const found = [];
    function walk(directory) {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const full = path.join(directory, entry.name);
        const rel = path.relative(root, full).split(path.sep).join("/");
        if (entry.isDirectory()) {
          if (!excluded.has(rel) && !excluded.has(entry.name)) walk(full);
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
          found.push(rel);
        }
      }
    }
    walk(root);
    return found;
  }
  return [...new Set(result.stdout.split("\n").filter(Boolean))].filter((file) =>
    fs.existsSync(path.join(root, file)),
  );
}

function validateMarkdownLinks(records) {
  const adrLinkTarget = /(?:^|\/)(\d{4})-([a-z0-9]+(?:-[a-z0-9]+)*)(?:\.(short|long|guide))?\.md$/;
  for (const file of trackedMarkdownFiles()) {
    if (/^docs\/adrs\/TEMPLATE\.(?:short|long|guide)\.md$/.test(file)) continue;
    const full = path.join(root, file);
    const text = fs.readFileSync(full, "utf8");
    const linkPattern = /\[([^\]\n]+)\]\(([^)\n]+)\)/g;
    let match;
    while ((match = linkPattern.exec(text))) {
      const [, label, rawTarget] = match;
      if (/^(?:https?:|mailto:)/.test(rawTarget)) continue;
      const target = rawTarget.split("#")[0].split("?")[0];
      const targetMatch = target.match(adrLinkTarget);
      if (!targetMatch) continue;

      const [, id, slug, variant] = targetMatch;
      const targetStem = `${id}-${slug}`;
      const knownRecord = records.get(id)?.stem === targetStem;
      const pathLooksLikeAdr = /(?:^|\/)(?:docs\/)?adrs\//.test(target);
      if (!knownRecord && !pathLooksLikeAdr) continue;
      if (!variant) {
        addError(`${file}: legacy unsuffixed ADR link "${rawTarget}"`);
        continue;
      }

      const resolved = path.resolve(path.dirname(full), target);
      if (!fs.existsSync(resolved)) addError(`${file}: broken ADR link "${rawTarget}"`);

      const isAdrPayload = file.startsWith("docs/adrs/") || file === "docs/adrs.md";
      if (isAdrPayload) continue;

      const stemTarget = target.replace(/\.(?:short|long|guide)\.md$/, "");
      const expected = `[ADR-${id}](${stemTarget}.short.md) ([Long, canonical](${stemTarget}.long.md) · [Guide](${stemTarget}.guide.md))`;
      if (!text.includes(expected)) {
        addError(
          `${file}: ADR-${id} references must use Short with matching Long and Guide companions`,
        );
      } else if (variant === "short" && label !== `ADR-${id}`) {
        addError(`${file}: Short link label must be ADR-${id}`);
      }
    }
  }

  for (const record of records.values()) {
    for (const variant of variants) {
      const sibling = record.variants.get(variant);
      if (!sibling) continue;
      const siblingTargets = variants
        .filter((candidate) => candidate !== variant)
        .map((candidate) => path.join(adrDir, `${record.stem}.${candidate}.md`));
      for (const target of siblingTargets) {
        if (!fs.existsSync(target))
          addError(`${sibling.rel}: missing sibling ${path.basename(target)}`);
      }
    }
  }
}

function validateCatalog(records) {
  if (!fs.existsSync(catalogPath)) {
    addError("docs/adrs.md is missing");
    return;
  }
  const text = fs.readFileSync(catalogPath, "utf8");
  if (/[ \t]+$/m.test(text)) addError("docs/adrs.md: trailing whitespace is not allowed");

  const headings = [...text.matchAll(/^### (.+)$/gm)].map((match) => match[1]);
  if (headings.join("\n") !== categories.join("\n")) {
    addError("docs/adrs.md: category headings must appear once in the approved order");
  }

  const seen = new Set();
  let currentCategory = null;
  let previousId = null;
  for (const line of text.split("\n")) {
    if (line.startsWith("### ")) {
      currentCategory = line.slice(4);
      previousId = null;
      continue;
    }
    if (!line.startsWith("| [ADR-")) continue;

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length !== 5) {
      addError(`docs/adrs.md: malformed ADR index row "${line}"`);
      continue;
    }
    const shortMatch = cells[0].match(
      /^\[ADR-(\d{4})\]\(adrs\/([a-z0-9]+(?:-[a-z0-9]+)*)\.short\.md\)$/,
    );
    const longMatch = cells[3].match(
      /^\[Long, canonical\]\(adrs\/([a-z0-9]+(?:-[a-z0-9]+)*)\.long\.md\)$/,
    );
    const guideMatch = cells[4].match(/^\[Guide\]\(adrs\/([a-z0-9]+(?:-[a-z0-9]+)*)\.guide\.md\)$/);
    if (!shortMatch || !longMatch || !guideMatch) {
      addError(`docs/adrs.md: malformed ADR index row "${line}"`);
      continue;
    }
    const [, id, shortStem] = shortMatch;
    const [, longStem] = longMatch;
    const [, guideStem] = guideMatch;
    const status = cells[1];
    const gist = cells[2];
    const record = records.get(id);
    if (!record) {
      addError(`docs/adrs.md: orphan ADR-${id} index row`);
      continue;
    }
    if (seen.has(id)) addError(`docs/adrs.md: duplicate ADR-${id} index row`);
    seen.add(id);
    if (shortStem !== record.stem || longStem !== record.stem || guideStem !== record.stem) {
      addError(`docs/adrs.md: ADR-${id} index links must target one matching triplet`);
    }
    const metadata = record.variants.get("short")?.metadata;
    if (status !== metadata?.Status)
      addError(`docs/adrs.md: ADR-${id} Status differs from metadata`);
    if (gist !== metadata?.Gist) addError(`docs/adrs.md: ADR-${id} Gist differs from metadata`);
    if (currentCategory !== metadata?.Category)
      addError(`docs/adrs.md: ADR-${id} is grouped under the wrong category`);
    if (previousId && id.localeCompare(previousId) <= 0) {
      addError(`docs/adrs.md: ${currentCategory} rows must be sorted by ADR ID`);
    }
    previousId = id;
  }

  for (const id of records.keys()) {
    if (!seen.has(id)) addError(`docs/adrs.md: missing ADR-${id} index row`);
  }
  if (seen.size !== records.size)
    addError("docs/adrs.md: index size does not match the ADR inventory");
}

if (!fs.existsSync(adrDir)) {
  addError("docs/adrs directory is missing");
} else {
  for (const required of ["README.md", ...requiredTemplates]) {
    if (!fs.existsSync(path.join(adrDir, required))) addError(`docs/adrs/${required} is missing`);
  }
  validateTemplates();

  const allMarkdown = fs
    .readdirSync(adrDir)
    .filter((file) => file.endsWith(".md"))
    .sort();
  const records = new Map();
  for (const file of allMarkdown) {
    if (file === "README.md" || requiredTemplates.includes(file)) continue;
    if (legacyFilenamePattern.test(file)) {
      addError(`docs/adrs/${file}: legacy unsuffixed numbered ADR is forbidden`);
      continue;
    }
    const match = file.match(filenamePattern);
    if (!match) {
      addError(`docs/adrs/${file}: unexpected Markdown file`);
      continue;
    }

    const parsed = parseAdrFile(file, match);
    const { id, stem, variant } = parsed;
    if (!records.has(id)) records.set(id, { id, stem, variants: new Map() });
    const record = records.get(id);
    if (record.stem !== stem) addError(`docs/adrs: ADR-${id} uses multiple filename stems`);
    if (record.variants.has(variant))
      addError(`docs/adrs: ADR-${id} has duplicate ${variant} variants`);
    record.variants.set(variant, parsed);
  }

  const ids = [...records.keys()].sort();
  const highestId = Number(ids.at(-1) ?? 0);
  const expectedIds = Array.from({ length: highestId }, (_, index) =>
    String(index + 1).padStart(4, "0"),
  );
  if (ids.join("\n") !== expectedIds.join("\n")) {
    const missing = expectedIds.filter((id) => !records.has(id));
    const unexpected = ids.filter((id) => !expectedIds.includes(id));
    if (missing.length) addError(`docs/adrs: missing expected ADR IDs ${missing.join(", ")}`);
    if (unexpected.length) {
      addError(`docs/adrs: unexpected ADR IDs ${unexpected.join(", ")}`);
    }
  }

  const decisionLocks = readDecisionLock();
  const immutableStatuses = new Set(["Accepted", "Superseded", "Deprecated", "Rejected"]);

  for (const record of records.values()) {
    for (const variant of variants) {
      if (!record.variants.has(variant))
        addError(`docs/adrs: ADR-${record.id} is missing ${variant}`);
    }
    if (record.variants.size !== variants.length)
      addError(`docs/adrs: ADR-${record.id} must contain exactly three variants`);
    if (record.variants.size !== variants.length) continue;

    const short = record.variants.get("short");
    const long = record.variants.get("long");
    const guide = record.variants.get("guide");
    for (const field of sharedMetadataFields) {
      const values = new Set([short.metadata[field], long.metadata[field], guide.metadata[field]]);
      if (values.size !== 1)
        addError(`docs/adrs: ADR-${record.id} ${field} differs across variants`);
    }
    if (short.decision !== long.decision)
      addError(`docs/adrs: ADR-${record.id} Decision differs between Short and Long`);

    const lockId = `ADR-${record.id}`;
    const lock = decisionLocks.get(lockId);
    if (immutableStatuses.has(long.metadata.Status)) {
      if (!lock) {
        addError(`docs/adrs: ${lockId} is ${long.metadata.Status} but has no decision lock`);
      } else {
        if (lock.stem !== record.stem) {
          addError(`docs/adrs: ${lockId} accepted stem drifted from ${lock.stem}`);
        }
        if (lock.digest !== sha256(long.decision)) {
          addError(`docs/adrs: ${lockId} Decision drifted from its accepted lock`);
        }
      }
    } else if (lock) {
      addError(`docs/adrs: Proposed ${lockId} must not have an accepted decision lock`);
    }
  }

  for (const id of decisionLocks.keys()) {
    if (!records.has(id.slice(4))) {
      addError(`${path.relative(root, decisionLockPath)}: orphan decision lock ${id}`);
    }
  }

  for (const record of records.values()) {
    const short = record.variants.get("short");
    if (!short) continue;
    for (const successorRef of short.supersededBy) {
      const successorId = successorRef.slice(4);
      const successor = records.get(successorId)?.variants.get("short");
      if (!successor) {
        addError(`ADR-${record.id}: unknown successor ${successorRef}`);
      } else if (!successor.supersedes.includes(`ADR-${record.id}`)) {
        addError(`ADR-${record.id}: ${successorRef} does not reciprocally declare Supersedes`);
      }
    }
    for (const predecessorRef of short.supersedes) {
      const predecessorId = predecessorRef.slice(4);
      const predecessor = records.get(predecessorId)?.variants.get("short");
      if (!predecessor) {
        addError(`ADR-${record.id}: unknown predecessor ${predecessorRef}`);
      } else if (!predecessor.supersededBy.includes(`ADR-${record.id}`)) {
        addError(`ADR-${record.id}: ${predecessorRef} does not reciprocally declare Superseded by`);
      }
    }
    if (
      short.supersedes.length > 0 &&
      !new Set(["Accepted", "Superseded", "Deprecated"]).has(short.metadata.Status)
    ) {
      addError(`ADR-${record.id}: a superseding ADR cannot be ${short.metadata.Status}`);
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) {
      addError(`docs/adrs: supersession cycle includes ADR-${id}`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    const short = records.get(id)?.variants.get("short");
    for (const successor of short?.supersededBy ?? []) visit(successor.slice(4));
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of records.keys()) visit(id);

  validateCatalog(records);
  validateMarkdownLinks(records);
}

for (const file of ["AGENTS.md", "docs/adrs.md", "docs/adrs/README.md"]) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) continue;
  const text = fs.readFileSync(full, "utf8");
  if (/\b(?:120\s+to\s+180|250)\s+words?\b/i.test(text)) {
    addError(`${file}: numeric ADR word limits are forbidden`);
  }
}

if (errors.length) {
  console.error("Errors:");
  for (const error of new Set(errors)) console.error(`- ${error}`);
  process.exit(1);
}

console.log("ADR triplets validated.");
