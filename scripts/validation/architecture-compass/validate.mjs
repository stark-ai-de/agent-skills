import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TextDecoder } from "node:util";

import { validateLegacyReferenceEvidence } from "./verify-legacy-reference-source-lock.mjs";
import { validateLegacyCaseLineage } from "../lib/legacy-case-lineage.mjs";

const root = process.cwd();
const strictUtf8Decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const skillDir = path.join(root, "skills", "engineering-workflows", "architecture-compass");
const referencesDir = path.join(skillDir, "references");
const internalReferencesDir = path.join(referencesDir, "internal");
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
const decisionLineageFile = path.join(
  root,
  "scripts",
  "validation",
  "architecture-compass",
  "decision-lineage.json",
);
const repositoryAdrsDir = path.join(root, "docs", "adrs");
const errors = [];
const expectedAdrIds = Array.from({ length: 54 }, (_, index) => index + 1);
const expectedAdrIdSet = new Set(expectedAdrIds);

const variants = ["short", "long", "guide"];
const expectedPublicWorkflows = [
  "setup",
  "audit",
  "refactor",
  "plan-refactor",
  "plan-run-refactor",
];
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
const internalAllowedCategories = new Set([...allowedCategories, "implementation-policy"]);
const allowedStatuses = new Set(["Accepted", "Superseded"]);
const skillRuntimeIds = new Set([1, 2, 3, 4, 26, 36, 39, 43, 44, 45, 46, 48, 50, 51, 52, 53]);
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
  [26, "governance"],
  [27, "governance"],
  [28, "governance"],
  [29, "quality-delivery"],
  [30, "governance"],
  [31, "quality-delivery"],
  [32, "repository-architecture"],
  [33, "stack-tooling"],
  [34, "quality-delivery"],
  [35, "governance"],
  [36, "agent-lifecycle"],
  [37, "repository-architecture"],
  [38, "runtime-platform"],
  [39, "governance"],
  [40, "stack-tooling"],
  [41, "quality-delivery"],
  [42, "quality-delivery"],
  [43, "governance"],
  [44, "governance"],
  [45, "governance"],
  [46, "governance"],
  [47, "quality-delivery"],
  [48, "governance"],
  [49, "quality-delivery"],
  [50, "quality-delivery"],
  [51, "governance"],
  [52, "governance"],
  [53, "quality-delivery"],
  [54, "repository-architecture"],
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
  [26, "ac-adr-026-route-architecture-compass-through-explicit-setup-and-apply-pipelines"],
  [27, "ac-adr-027-use-the-open-agent-skills-specification"],
  [28, "ac-adr-028-keep-candidates-outside-the-promoted-public-catalog"],
  [29, "ac-adr-029-promote-skills-through-an-evidence-and-maintenance-gate"],
  [30, "ac-adr-030-license-public-skill-repositories-under-apache-2-0"],
  [31, "ac-adr-031-keep-skill-evaluation-evidence-outside-the-runtime-payload"],
  [32, "ac-adr-032-keep-maintainer-local-helper-state-out-of-public-repositories"],
  [33, "ac-adr-033-choose-portable-dependency-light-skill-helpers"],
  [34, "ac-adr-034-keep-release-metadata-coherent-with-public-catalog-changes"],
  [35, "ac-adr-035-classify-skill-portability-before-choosing-host-variants"],
  [36, "ac-adr-036-keep-architecture-compass-portable-through-host-adapters"],
  [37, "ac-adr-037-preserve-target-contracts-and-gate-gateway-extraction"],
  [38, "ac-adr-038-gate-optional-capabilities-and-tool-side-effects"],
  [39, "ac-adr-039-prefer-existing-public-skills-conditionally"],
  [40, "ac-adr-040-offer-an-opinionated-stack-profile-for-new-public-skill-repositories"],
  [41, "ac-adr-041-publish-public-skills-through-github-and-the-open-skills-cli"],
  [42, "ac-adr-042-calibrate-validation-to-change-risk-and-reuse-fresh-evidence"],
  [
    43,
    "ac-adr-043-route-architecture-compass-through-explicit-setup-and-apply-pipelines-with-risk-based-validation",
  ],
  [44, "ac-adr-044-record-material-decision-lineage-in-non-normative-guides"],
  [
    45,
    "ac-adr-045-route-architecture-compass-through-setup-audit-and-refactor-with-intent-bound-agent-selection",
  ],
  [46, "ac-adr-046-rank-architecture-evidence-without-expanding-operational-authority"],
  [47, "ac-adr-047-separate-low-and-moderate-validation-risk-with-explicit-triggers"],
  [48, "ac-adr-048-persist-approved-governance-before-planned-architecture-refactors"],
  [49, "ac-adr-049-distinguish-change-risk-from-representative-environment-observation"],
  [50, "ac-adr-050-use-semantic-status-markers-in-user-facing-receipts"],
  [51, "ac-adr-051-route-architecture-compass-through-public-and-internal-decision-namespaces"],
  [52, "ac-adr-052-persist-agent-governance-through-host-neutral-repository-surfaces"],
  [53, "ac-adr-053-use-capability-aware-presentation-profiles-for-portable-agent-receipts"],
  [54, "ac-adr-054-isolate-agent-writes-in-external-git-worktrees"],
]);
const expectedInternalStems = new Map([
  [1, "internal-adr-001-resolve-persistence-surfaces-before-writes"],
  [2, "internal-adr-002-select-capability-aware-receipt-renderers"],
]);
const allowedLineageRelations = new Set(["adapts", "consolidates", "generalizes", "diverges-from"]);
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
  "clear-setup-intent.md",
  "clear-audit-intent.md",
  "clear-bounded-refactor-intent.md",
  "clear-plan-refactor-intent.md",
  "clear-plan-run-refactor-intent.md",
  "ambiguous-workflow-selection.md",
  "agent-initiated-audit-authority.md",
  "setup-coverage-matrix.md",
  "audit-strict-read-only.md",
  "refactor-governance-boundary.md",
  "plan-mode-lifecycle.md",
  "plan-mode-unavailable-fallback.md",
  "plan-mode-indeterminate-stop.md",
  "plan-mode-declined-stop.md",
  "plan-run-state-recheck.md",
  "conflicting-adrs-stop.md",
  "stack-deviation-routing.md",
  "approved-decision-no-implementation.md",
  "plan-refactor-save-only-persistence.md",
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
  "repo-native-adr-mapping-and-split.md",
  "adr-deviation-warning-stop.md",
  "host-instruction-conventions.md",
  "setup-target-selector-instruction.md",
  "audit-target-selector-report-only.md",
  "portability-taxonomy.md",
  "host-metadata-gating.md",
  "worktree-parallelism-gate.md",
  "public-skill-reuse-consent.md",
  "opinionated-stack-profile-selection.md",
  "proportional-planning-evidence.md",
  "risk-proportional-validation-matrix.md",
  "validation-evidence-reuse.md",
  "nextjs-request-routing.md",
  "nextjs-query-write-lifecycle.md",
  "source-placement-parity.md",
  "legacy-input-routing.md",
  "refactor-report-receipt-completeness.md",
  "semantic-status-marker-receipts.md",
  "adaptive-presentation-profiles.md",
  "compact-initial-activation.md",
  "formatting-overhead-comparison.md",
  "host-wrong-persistence-surface.md",
  "internal-public-adr-namespace-separation.md",
  "receipt-accessibility-fallback.md",
];
const expectedEvalCases = [...baselineEvalCases, ...routedLibraryEvalCases];
const legacyCaseSourceCommit = "1d454f06375f3b74ba506fef54b664a2517674c0";
const legacyCaseSources = [
  {
    path: "skill-evals/architecture-compass/cases/conditional-plan-routing-matrix.md",
    sha256: "eb20fd998bfa0d0ca92daa588b9e5e881a547a4436a637c0f69faf3c3b008c38",
  },
  {
    path: "skill-evals/architecture-compass/cases/conflicting-adrs-plan-gate.md",
    sha256: "1ed3db444e449878d16733d2dc5cb8ebc45f38c7f9ae0a6086476aa595ab3557",
  },
  {
    path: "skill-evals/architecture-compass/cases/direct-route-reclassification.md",
    sha256: "c4e946f351a1c671a58ba712d2a8b78b172ed90a188243e9992db593867dc656",
  },
  {
    path: "skill-evals/architecture-compass/cases/native-plan-declined-fallback.md",
    sha256: "0d32e79f8249c5859da3fc5fbbdf859ba3ff17ba3db1866d8934ec1e415eca23",
  },
  {
    path: "skill-evals/architecture-compass/cases/native-plan-execution-lifecycle.md",
    sha256: "4b874b9594e0aef6b3704f0641aeff96063a5bdb4bfba08ecf4ead6d5947e7ea",
  },
  {
    path: "skill-evals/architecture-compass/cases/native-plan-fallbacks.md",
    sha256: "1c7427a480b970672c2277030c7e29aa26340fae77e00e0ee5cb4d1a3f7238f4",
  },
  {
    path: "skill-evals/architecture-compass/cases/native-plan-indeterminate-fallback.md",
    sha256: "efb34e4b321c6eccc3be01ff0613f437370a84131d79a2d61c77566627f41dee",
  },
  {
    path: "skill-evals/architecture-compass/cases/portable-fallback-execution-lifecycle.md",
    sha256: "bb7364fbbc47e279cdc5c343c86f96bb86c1ba0faa310690927df5c89e1192d9",
  },
  {
    path: "skill-evals/architecture-compass/cases/read-only-explicitly-declined-fallback.md",
    sha256: "1d4f419e68932c1eeb3c61207da9403605df79845ee0f7f14ca5b8d24cd243ab",
  },
  {
    path: "skill-evals/architecture-compass/cases/read-only-transition-gate.md",
    sha256: "e028b2ef42ee9feb0a0f0d33883b2e4ea074d12c5db8d53e3135af54f7977ca5",
  },
];

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
  try {
    return strictUtf8Decoder.decode(fs.readFileSync(file));
  } catch {
    fail(`${rel}: must be valid UTF-8`);
    return "";
  }
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

function regularFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...regularFiles(full));
    } else if (entry.isFile()) {
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

function markdownHeadings(value) {
  const headings = [];
  let fence = null;
  for (const [index, line] of value.split(/\r?\n/).entries()) {
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!fence) {
        fence = { character: marker[0], length: marker.length };
      } else if (marker[0] === fence.character && marker.length >= fence.length) {
        fence = null;
      }
      continue;
    }
    if (fence) continue;

    const match = /^ {0,3}(#{1,6})[ \t]+(.+?)[ \t]*$/.exec(line);
    if (!match) continue;
    const text = match[2].replace(/[ \t]+#+[ \t]*$/, "").trim();
    headings.push({ index, level: match[1].length, text });
  }
  return headings;
}

function headingCount(value, heading) {
  const target = heading.toLowerCase();
  return markdownHeadings(value).filter(({ text }) => text.toLowerCase() === target).length;
}

function withoutHeadingSections(value, heading) {
  const lines = value.split(/\r?\n/);
  const headings = markdownHeadings(value);
  const target = heading.toLowerCase();
  const excluded = new Set();
  for (const current of headings.filter(({ text }) => text.toLowerCase() === target)) {
    const next = headings.find(
      ({ index, level }) => index > current.index && level <= current.level,
    );
    const end = next?.index ?? lines.length;
    for (let index = current.index; index < end; index += 1) excluded.add(index);
  }
  return lines.filter((_, index) => !excluded.has(index)).join("\n");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hasExactKeys(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && expected.every((key, index) => key === actual[index]);
}

function readDecisionLineage() {
  const rel = relative(decisionLineageFile);
  const text = readRegularFile(decisionLineageFile);
  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch (error) {
    fail(`${rel}: invalid JSON: ${error.message}`);
    return new Map();
  }

  if (!hasExactKeys(manifest, ["decisions", "schema"])) {
    fail(`${rel}: top level must contain exactly schema and decisions`);
    return new Map();
  }
  if (manifest.schema !== 1) fail(`${rel}: schema must be 1`);
  if (!Array.isArray(manifest.decisions)) {
    fail(`${rel}: decisions must be an array`);
    return new Map();
  }
  if (manifest.decisions.length !== expectedAdrIds.length) {
    fail(
      `${rel}: expected ${expectedAdrIds.length} lineage dispositions; found ${manifest.decisions.length}`,
    );
  }

  const decisions = new Map();
  let previousNumber = 0;
  for (const [index, entry] of manifest.decisions.entries()) {
    const entryRel = `${rel}:decisions[${index}]`;
    if (!hasExactKeys(entry, ["disposition", "id", "relations"])) {
      fail(`${entryRel}: must contain exactly id, disposition, and relations`);
      continue;
    }
    if (!/^AC-ADR-\d{3}$/.test(entry.id ?? "")) {
      fail(`${entryRel}: id must be AC-ADR-NNN`);
      continue;
    }
    const idNumber = Number(entry.id.slice("AC-ADR-".length));
    if (idNumber <= previousNumber) fail(`${entryRel}: decisions must be sorted by ascending ID`);
    previousNumber = idNumber;
    if (decisions.has(entry.id)) {
      fail(`${entryRel}: duplicate ${entry.id}`);
      continue;
    }
    if (!new Set(["material", "independent"]).has(entry.disposition)) {
      fail(`${entryRel}: disposition must be material or independent`);
    }
    if (!Array.isArray(entry.relations)) {
      fail(`${entryRel}: relations must be an array`);
      continue;
    }
    if (entry.disposition === "material" && entry.relations.length === 0) {
      fail(`${entryRel}: material disposition requires at least one relation`);
    }
    if (entry.disposition === "independent" && entry.relations.length !== 0) {
      fail(`${entryRel}: independent disposition must not define relations`);
    }

    const relationTypes = new Set();
    const sourceIds = new Set();
    for (const [relationIndex, relation] of entry.relations.entries()) {
      const relationRel = `${entryRel}.relations[${relationIndex}]`;
      if (!hasExactKeys(relation, ["sources", "type"])) {
        fail(`${relationRel}: must contain exactly type and sources`);
        continue;
      }
      if (!allowedLineageRelations.has(relation.type)) {
        fail(`${relationRel}: unsupported relation ${JSON.stringify(relation.type)}`);
      }
      if (relationTypes.has(relation.type)) {
        fail(`${relationRel}: duplicate relation type ${relation.type}`);
      }
      relationTypes.add(relation.type);
      if (!Array.isArray(relation.sources) || relation.sources.length === 0) {
        fail(`${relationRel}: sources must be a non-empty array`);
        continue;
      }
      if (relation.type === "consolidates" && relation.sources.length < 2) {
        fail(`${relationRel}: consolidates requires at least two sources`);
      }
      for (const source of relation.sources) {
        if (!/^ADR-\d{4}$/.test(source ?? "")) {
          fail(`${relationRel}: source must be ADR-NNNN; found ${JSON.stringify(source)}`);
        } else if (sourceIds.has(source)) {
          fail(`${relationRel}: duplicate lineage source ${source}`);
        }
        sourceIds.add(source);
      }
    }
    decisions.set(entry.id, entry);
  }

  return decisions;
}

const repositoryAdrSources = new Map();
function repositoryAdrSource(sourceId) {
  if (!/^ADR-\d{4}$/.test(sourceId ?? "")) return null;
  if (repositoryAdrSources.has(sourceId)) return repositoryAdrSources.get(sourceId);
  const label = sourceId.slice("ADR-".length);
  const matches = fs.existsSync(repositoryAdrsDir)
    ? fs
        .readdirSync(repositoryAdrsDir)
        .filter((name) => name.startsWith(`${label}-`) && name.endsWith(".long.md"))
    : [];
  if (matches.length !== 1) {
    fail(
      `${relative(decisionLineageFile)}: ${sourceId} must resolve to exactly one repository Long ADR; found ${matches.length}`,
    );
    return null;
  }
  const file = path.join(repositoryAdrsDir, matches[0]);
  const text = readRegularFile(file);
  const rel = relative(file);
  const lines = text.split(/\r?\n/);
  const metadata = (field) => {
    const prefix = `${field}: `;
    const values = lines.filter((line) => line.startsWith(prefix));
    if (values.length !== 1) {
      fail(`${rel}: lineage target must contain exactly one ${field} field`);
      return null;
    }
    return values[0].slice(prefix.length);
  };
  if (!(lines[0] ?? "").startsWith(`# ${sourceId}: `)) {
    fail(`${rel}: lineage target H1 must identify ${sourceId}`);
  }
  if (metadata("ID") !== sourceId) {
    fail(`${rel}: lineage target ID must be ${sourceId}`);
  }
  const status = metadata("Status");
  if (!new Set(["Accepted", "Superseded"]).has(status)) {
    fail(`${rel}: lineage target Status must be Accepted or Superseded`);
  }
  if (metadata("Variant") !== "Long") {
    fail(`${rel}: lineage target Variant must be Long`);
  }
  if (metadata("Canonical variant") !== "Long") {
    fail(`${rel}: lineage target Canonical variant must be Long`);
  }
  const source = {
    id: sourceId,
    url: `https://github.com/stark-ai-de/agent-skills/blob/main/docs/adrs/${matches[0]}`,
  };
  repositoryAdrSources.set(sourceId, source);
  return source;
}

function expectedLineageText(entry) {
  return entry.relations
    .map((relation) => {
      const sources = (Array.isArray(relation?.sources) ? relation.sources : [])
        .map(repositoryAdrSource)
        .filter(Boolean)
        .map((source) => `[${source.id}](${source.url})`)
        .join(", ");
      return `- \`${relation?.type}\`: ${sources}.`;
    })
    .join("\n");
}

function readDecisionLocks() {
  const locks = new Map();
  const rel = relative(decisionLockFile);
  if (!fs.existsSync(decisionLockFile)) {
    fail(`${rel}: missing accepted-decision lock`);
    return locks;
  }
  const lines = readRegularFile(decisionLockFile).split(/\r?\n/);
  if (lines[0] !== "# schema=1 algorithm=sha256") fail(`${rel}: invalid schema header`);
  if (lines[1] !== "# id\tstem\tshort_decision_sha256\tlong_decision_sha256") {
    fail(`${rel}: invalid column header`);
  }
  for (const [index, line] of lines.slice(2).entries()) {
    if (!line) continue;
    const [id, stem, shortDigest, longDigest, ...extra] = line.split("\t");
    const publicIdentity =
      /^AC-ADR-\d{3}$/.test(id ?? "") && /^ac-adr-\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(stem ?? "");
    const internalIdentity =
      /^AC-INTERNAL-\d{3}$/.test(id ?? "") &&
      /^internal-adr-\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(stem ?? "");
    if (
      extra.length ||
      (!publicIdentity && !internalIdentity) ||
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

function validateVariantNavigation({ lines, rel, stem, variant, directory, navigationIndex }) {
  const expectedNav = expectedNavigation(stem, variant);
  const navigationLines = lines.filter((line) => line.startsWith("Variants: "));
  const navigation = lines[navigationIndex] ?? "";

  if (navigation !== expectedNav) {
    fail(`${rel}: variant navigation must be exactly "${expectedNav}"`);
  }
  if (navigationLines.length !== 1) {
    fail(`${rel}: expected exactly one Variants navigation line`);
  }

  const links = [...navigation.matchAll(/\]\(([^)\s]+)\)/g)].map((match) => match[1]);
  const expectedLinks = variants
    .filter((candidate) => candidate !== variant)
    .map((candidate) => `${stem}.${candidate}.md`);
  if (links.length !== expectedLinks.length) {
    fail(`${rel}: variant navigation must contain exactly two sibling links`);
  } else if (links.some((link, index) => link !== expectedLinks[index])) {
    fail(`${rel}: variant navigation sibling links must match the approved triplet variants`);
  }

  for (const link of links) {
    const resolved = path.resolve(directory, link);
    const relativeTarget = path.relative(directory, resolved);
    const escapesDirectory =
      path.isAbsolute(link) ||
      relativeTarget === ".." ||
      relativeTarget.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativeTarget);
    if (escapesDirectory) {
      fail(`${rel}: variant navigation target must remain within its reference namespace: ${link}`);
      continue;
    }
    if (!fs.existsSync(resolved)) {
      fail(`${rel}: variant navigation target is missing: ${link}`);
      continue;
    }
    const stat = fs.lstatSync(resolved);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      fail(`${rel}: variant navigation target must be a regular, non-symlink file: ${link}`);
    }
  }
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
  validateVariantNavigation({
    lines,
    rel,
    stem,
    variant,
    directory: path.dirname(file),
    navigationIndex: cursor,
  });

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
  if (!allowedStatuses.has(metadata.get("Status"))) {
    fail(`${rel}: Architecture Compass guardrails must be Accepted or Superseded`);
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

  const expectedScope = skillRuntimeIds.has(idNumber) ? "skill-runtime" : "target-repository";
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
  const expectedAdoptable =
    skillRuntimeIds.has(idNumber) || metadata.get("Status") === "Superseded" ? "false" : "true";
  if (metadata.get("Adoptable") !== expectedAdoptable) {
    const adoptabilityScope = skillRuntimeIds.has(idNumber)
      ? "skill-runtime ADRs"
      : metadata.get("Status") === "Superseded"
        ? "Superseded target-repository ADRs"
        : "target-repository ADRs";
    fail(`${rel}: Adoptable must be ${expectedAdoptable} for ${adoptabilityScope}`);
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
    if (!/https:\/\//.test(withoutHeadingSections(text, "Decision lineage"))) {
      fail(`${rel}: Guide must include at least one primary source link outside Decision lineage`);
    }
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

function parseInternalAdrList(value, rel, field) {
  if (value === "none") return [];
  if (!/^AC-INTERNAL-\d{3}(?:, AC-INTERNAL-\d{3})*$/.test(value ?? "")) {
    fail(`${rel}: ${field} must be "none" or a comma-space-separated AC-INTERNAL ID list`);
    return [];
  }
  return value.split(", ");
}

function validateSupersessionGraph(edges, namespaceLabel) {
  const states = new Map();
  const trail = [];

  function visit(id) {
    const state = states.get(id);
    if (state === "visited") return;
    if (state === "visiting") {
      const cycleStart = trail.indexOf(id);
      const cycle = [...trail.slice(cycleStart), id];
      fail(`${namespaceLabel} supersession cycle detected: ${cycle.join(" -> ")}`);
      return;
    }

    states.set(id, "visiting");
    trail.push(id);
    for (const targetId of edges.get(id) ?? []) {
      if (edges.has(targetId)) visit(targetId);
    }
    trail.pop();
    states.set(id, "visited");
  }

  for (const id of edges.keys()) visit(id);
}

const internalMetadataFields = [...metadataFields, "Visibility", "Public catalog"];
const internalTripletPattern =
  /^(internal-adr-(\d{3})-([a-z0-9]+(?:-[a-z0-9]+)*))\.(short|long|guide)\.md$/;

function parseInternalTriplet(file, match) {
  const text = readRegularFile(file);
  const rel = relative(file);
  const [, stem, rawId, slug, variant] = match;
  const idNumber = Number(rawId);
  const lines = text.split(/\r?\n/);
  const expectedId = `AC-INTERNAL-${rawId}`;
  const titleMatch = new RegExp(`^# (${expectedId}): (.+)$`).exec(lines[0] ?? "");
  const navigationIndex = lines.findIndex((line) => line.startsWith("Variants: "));

  if (!titleMatch) {
    fail(`${rel}: first line must be "# ${expectedId}: Title"`);
  }

  const metadata = new Map();
  const metadataLines = lines.slice(1, Math.max(1, navigationIndex));
  for (const field of internalMetadataFields) {
    const prefix = `${field}: `;
    const values = metadataLines
      .filter((line) => line.startsWith(prefix))
      .map((line) => line.slice(prefix.length).trim());
    if (values.length !== 1 || !values[0]) {
      fail(
        `${rel}: expected exactly one non-empty "${field}:" metadata field; found ${values.length}`,
      );
    } else {
      metadata.set(field, values[0]);
    }
  }

  validateVariantNavigation({
    lines,
    rel,
    stem,
    variant,
    directory: path.dirname(file),
    navigationIndex,
  });

  if (metadata.get("ID") !== expectedId) fail(`${rel}: ID must be ${expectedId}`);
  if (titleMatch?.[1] !== expectedId) fail(`${rel}: heading ID must be ${expectedId}`);
  if (titleMatch && metadata.get("Title") !== titleMatch[2]) {
    fail(`${rel}: Title metadata must match the H1 title byte-for-byte`);
  }
  if (!allowedStatuses.has(metadata.get("Status"))) {
    fail(`${rel}: internal Status must be Accepted or Superseded for shipped runtime records`);
  }
  const expectedStem = expectedInternalStems.get(idNumber);
  if (expectedStem && stem !== expectedStem) {
    fail(`${rel}: approved internal inventory stem for ${expectedId} is ${expectedStem}`);
  }
  for (const field of ["Date", "Guide verified"]) {
    if (!isIsoDate(metadata.get(field))) {
      fail(`${rel}: ${field} must be a real ISO date (YYYY-MM-DD)`);
    }
  }
  if (metadata.get("Owner") !== "stark-ai-de") fail(`${rel}: Owner must be stark-ai-de`);
  if (metadata.get("Scope") !== "skill-runtime-internal") {
    fail(`${rel}: Scope must be skill-runtime-internal`);
  }
  if (!internalAllowedCategories.has(metadata.get("Category"))) {
    fail(`${rel}: Category must use the Architecture Compass taxonomy`);
  }
  if (metadata.get("Adoptable") !== "false") fail(`${rel}: Adoptable must be false`);
  if (metadata.get("Visibility") !== "Internal") fail(`${rel}: Visibility must be Internal`);
  if (metadata.get("Public catalog") !== "Excluded") {
    fail(`${rel}: Public catalog must be Excluded`);
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
  if (!/(?:non-authority|not .*authority|not .*public|not .*portable)/i.test(text)) {
    fail(
      `${rel}: internal record must explicitly state that it is not public or portable authority`,
    );
  }

  let decision = "";
  if (variant === "short") {
    decision = sectionText(text, "Decision summary");
    if (!decision) fail(`${rel}: Short must contain a non-empty Decision summary section`);
  } else if (variant === "long") {
    decision = sectionText(text, "Decision");
    for (const heading of ["Context", "Decision", "Consequences"]) {
      if (!sectionText(text, heading)) {
        fail(`${rel}: Long must contain a non-empty ${heading} section`);
      }
    }
  } else {
    if (!/non-normative/i.test(text)) fail(`${rel}: Guide must state that it is non-normative`);
    if (/^## (?:Decision|Decision summary|Rules)$/m.test(text)) {
      fail(`${rel}: Guide must not define normative Decision or Rules sections`);
    }
  }

  return { file, rel, text, stem, slug, idNumber, rawId, variant, metadata, decision };
}

if (!fs.existsSync(referencesDir)) {
  fail(`${relative(referencesDir)}: missing references directory`);
}

const referenceEntries = fs.existsSync(referencesDir)
  ? fs.readdirSync(referencesDir, { withFileTypes: true })
  : [];
for (const entry of referenceEntries) {
  if (entry.isDirectory()) {
    if (entry.name !== "internal") {
      fail(
        `${relative(path.join(referencesDir, entry.name))}: only the internal reference namespace may be nested`,
      );
    }
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

const internalRecords = [];
if (!fs.existsSync(internalReferencesDir)) {
  fail(`${relative(internalReferencesDir)}: missing internal reference namespace`);
} else if (!fs.lstatSync(internalReferencesDir).isDirectory()) {
  fail(`${relative(internalReferencesDir)}: internal reference namespace must be a directory`);
} else {
  const internalEntries = fs.readdirSync(internalReferencesDir, { withFileTypes: true });
  for (const entry of internalEntries) {
    const file = path.join(internalReferencesDir, entry.name);
    if (entry.isDirectory()) {
      fail(`${relative(file)}: nested internal reference directories are not permitted`);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      fail(`${relative(file)}: internal references must be Markdown files`);
      continue;
    }
    if (entry.name === "internal-adr-index.md") continue;
    const match = internalTripletPattern.exec(entry.name);
    if (!match) {
      fail(
        `${relative(file)}: internal references may contain only internal-adr-index.md and internal ADR triplets`,
      );
      continue;
    }
    internalRecords.push(parseInternalTriplet(file, match));
  }
}

const internalRecordsById = new Map();
for (const record of internalRecords) {
  if (!internalRecordsById.has(record.idNumber)) internalRecordsById.set(record.idNumber, []);
  internalRecordsById.get(record.idNumber).push(record);
}
for (const [idNumber, stem] of expectedInternalStems) {
  const label = String(idNumber).padStart(3, "0");
  const idRecords = internalRecordsById.get(idNumber) ?? [];
  if (idRecords.length !== 3) {
    fail(`AC-INTERNAL-${label}: expected exactly three variants; found ${idRecords.length}`);
  }
  const stems = new Set(idRecords.map((record) => record.stem));
  if (stems.size > 1) {
    fail(`AC-INTERNAL-${label}: ID collision across stems: ${[...stems].sort().join(", ")}`);
  }
  if (stems.size === 1 && !stems.has(stem)) {
    fail(`AC-INTERNAL-${label}: approved stem is ${stem}`);
  }
  for (const variant of variants) {
    const count = idRecords.filter((record) => record.variant === variant).length;
    if (count !== 1) {
      fail(`AC-INTERNAL-${label}: expected exactly one .${variant}.md variant; found ${count}`);
    }
  }
  const baseline = idRecords.find((record) => record.variant === "long") ?? idRecords[0];
  if (baseline) {
    for (const record of idRecords) {
      for (const field of internalMetadataFields.filter((field) => field !== "Variant")) {
        if (record.metadata.get(field) !== baseline.metadata.get(field)) {
          fail(
            `${record.rel}: ${field} metadata drifts from ${baseline.rel}; only Variant may differ within an internal triplet`,
          );
        }
      }
    }
  }
}
for (const idNumber of internalRecordsById.keys()) {
  if (!expectedInternalStems.has(idNumber)) {
    fail(
      `AC-INTERNAL-${String(idNumber).padStart(3, "0")}: ID is outside the approved internal inventory`,
    );
  }
}
const internalIndexFile = path.join(internalReferencesDir, "internal-adr-index.md");
const internalIndexText = readRegularFile(internalIndexFile);
const internalIndexRel = relative(internalIndexFile);
const internalTripletNames = new Set(internalRecords.map((record) => path.basename(record.file)));
const internalLinks = [...internalIndexText.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g)].map(
  (match) => match[1],
);
const internalAdrLinks = internalLinks.filter((link) => link.startsWith("internal-adr-"));
for (const name of internalTripletNames) {
  if (!internalAdrLinks.includes(name)) fail(`${internalIndexRel}: missing direct link to ${name}`);
}
for (const link of internalAdrLinks) {
  if (link !== path.basename(link) || !internalTripletPattern.test(link)) {
    fail(
      `${internalIndexRel}: internal catalog links must be direct internal triplet filenames; found ${link}`,
    );
  } else if (!internalTripletNames.has(link)) {
    fail(`${internalIndexRel}: orphan internal ADR link ${link}`);
  }
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
const decisionLineage = readDecisionLineage();
const decisionLineageHash =
  fs.existsSync(decisionLineageFile) && fs.lstatSync(decisionLineageFile).isFile()
    ? sha256(fs.readFileSync(decisionLineageFile))
    : null;

const canonicalInternalRecords = new Map(
  internalRecords
    .filter((record) => record.variant === "long" && expectedInternalStems.has(record.idNumber))
    .map((record) => [`AC-INTERNAL-${record.rawId}`, record]),
);

for (const [idNumber, stem] of expectedInternalStems) {
  const label = String(idNumber).padStart(3, "0");
  const lockId = `AC-INTERNAL-${label}`;
  const idRecords = internalRecordsById.get(idNumber) ?? [];
  const short = idRecords.find((record) => record.variant === "short");
  const long = idRecords.find((record) => record.variant === "long");
  const lock = decisionLocks.get(lockId);
  if (!lock) {
    fail(`${relative(decisionLockFile)}: missing ${lockId} accepted-decision lock`);
  } else if (short && long) {
    if (lock.stem !== stem) fail(`${lockId}: accepted stem drifted from ${lock.stem}`);
    if (lock.shortDigest !== sha256(short.decision)) {
      fail(`${lockId}: Short Decision summary drifted from its accepted lock`);
    }
    if (lock.longDigest !== sha256(long.decision)) {
      fail(`${lockId}: Long Decision drifted from its accepted lock`);
    }
  }
}

const internalSupersessionEdges = new Map();
for (const [id, record] of canonicalInternalRecords) {
  const supersedes = parseInternalAdrList(
    record.metadata.get("Supersedes"),
    record.rel,
    "Supersedes",
  );
  const supersededBy = parseInternalAdrList(
    record.metadata.get("Superseded by"),
    record.rel,
    "Superseded by",
  );
  const status = record.metadata.get("Status");
  internalSupersessionEdges.set(id, supersedes);
  if (supersedes.includes(id) || supersededBy.includes(id)) {
    fail(`${record.rel}: ${id} cannot supersede itself`);
  }
  if (status === "Superseded" && supersededBy.length === 0) {
    fail(`${record.rel}: Status Superseded requires Superseded by`);
  }
  if (status !== "Superseded" && supersededBy.length > 0) {
    fail(`${record.rel}: only Status Superseded may declare Superseded by`);
  }
  for (const targetId of supersedes) {
    const target = canonicalInternalRecords.get(targetId);
    if (!target) {
      fail(`${record.rel}: Supersedes references missing ${targetId}`);
      continue;
    }
    const reverse = parseInternalAdrList(
      target.metadata.get("Superseded by"),
      target.rel,
      "Superseded by",
    );
    if (!reverse.includes(id)) {
      fail(`${record.rel}: ${targetId} must reciprocally list ${id} in Superseded by`);
    }
  }
  for (const sourceId of supersededBy) {
    const source = canonicalInternalRecords.get(sourceId);
    if (!source) {
      fail(`${record.rel}: Superseded by references missing ${sourceId}`);
      continue;
    }
    const reverse = parseInternalAdrList(
      source.metadata.get("Supersedes"),
      source.rel,
      "Supersedes",
    );
    if (!reverse.includes(id)) {
      fail(`${record.rel}: ${sourceId} must reciprocally list ${id} in Supersedes`);
    }
  }
}
validateSupersessionGraph(internalSupersessionEdges, "Internal ADR");

for (const file of regularFiles(skillDir)) {
  const matchesName = path.basename(file) === "decision-lineage.json";
  const matchesBytes =
    decisionLineageHash !== null && sha256(fs.readFileSync(file)) === decisionLineageHash;
  if (matchesName || matchesBytes) {
    fail(
      `${relative(file)}: repo-only decision-lineage manifest must not enter the skill payload by filename or exact content hash`,
    );
  }
}

for (const id of expectedAdrIds) {
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

  const lineage = decisionLineage.get(lockId);
  if (!lineage) {
    fail(`${relative(decisionLineageFile)}: missing ${lockId} lineage disposition`);
  }
  for (const record of idRecords) {
    if (headingCount(record.text, "Source provenance") > 0) {
      fail(`${record.rel}: legacy Source provenance heading is forbidden`);
    }
    if (record.variant !== "guide" && headingCount(record.text, "Decision lineage") > 0) {
      fail(`${record.rel}: Decision lineage is permitted only in Guide`);
    }
  }
  const guide = idRecords.find((record) => record.variant === "guide");
  if (guide && lineage) {
    const lineageHeadingCount = headingCount(guide.text, "Decision lineage");
    if (lineage.disposition === "independent") {
      if (lineageHeadingCount !== 0) {
        fail(`${guide.rel}: independent disposition must omit Decision lineage`);
      }
    } else {
      const expected = expectedLineageText(lineage);
      if (lineageHeadingCount !== 1) {
        fail(`${guide.rel}: material disposition requires exactly one Decision lineage section`);
      } else if (sectionText(guide.text, "Decision lineage") !== expected) {
        fail(`${guide.rel}: Decision lineage does not match ${relative(decisionLineageFile)}`);
      }
    }
  }
}

for (const id of decisionLocks.keys()) {
  const publicMatch = /^AC-ADR-(\d{3})$/.exec(id);
  const internalMatch = /^AC-INTERNAL-(\d{3})$/.exec(id);
  const validPublic = publicMatch && expectedAdrIdSet.has(Number(publicMatch[1]));
  const validInternal = internalMatch && expectedInternalStems.has(Number(internalMatch[1]));
  if (!validPublic && !validInternal) {
    fail(`${relative(decisionLockFile)}: orphan decision lock ${id}`);
  }
}

for (const id of decisionLineage.keys()) {
  const lineageNumber = Number(id.slice("AC-ADR-".length));
  if (!Number.isInteger(lineageNumber) || !expectedAdrIdSet.has(lineageNumber)) {
    fail(`${relative(decisionLineageFile)}: orphan lineage disposition ${id}`);
  }
}

for (const id of [...recordsById.keys()].sort((a, b) => a - b)) {
  if (!expectedAdrIdSet.has(id)) {
    fail(`AC-ADR-${String(id).padStart(3, "0")}: ID is outside the approved inventory`);
  }
}

const canonicalRecords = new Map(
  records
    .filter((record) => record.variant === "long" && expectedAdrIdSet.has(record.idNumber))
    .map((record) => [`AC-ADR-${record.rawId}`, record]),
);
const publicSupersessionEdges = new Map();
for (const [id, record] of canonicalRecords) {
  const supersedes = parseAdrList(record.metadata.get("Supersedes"), record.rel, "Supersedes");
  const supersededBy = parseAdrList(
    record.metadata.get("Superseded by"),
    record.rel,
    "Superseded by",
  );
  const status = record.metadata.get("Status");
  publicSupersessionEdges.set(id, supersedes);
  if (supersedes.includes(id) || supersededBy.includes(id)) {
    fail(`${record.rel}: ${id} cannot supersede itself`);
  }
  if (status === "Superseded" && supersededBy.length === 0) {
    fail(`${record.rel}: Status Superseded requires Superseded by`);
  }
  if (status !== "Superseded" && supersededBy.length > 0) {
    fail(`${record.rel}: only Status Superseded may declare Superseded by`);
  }

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
validateSupersessionGraph(publicSupersessionEdges, "Public ADR");

const catalogText = readRegularFile(catalogFile);
const catalogRel = relative(catalogFile);
const expectedTripletNames = new Set(records.map((record) => path.basename(record.file)));
const catalogLinks = [...catalogText.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g)].map((match) => match[1]);
const catalogAdrLinks = catalogLinks.filter((link) => link.startsWith("ac-adr-"));
const catalogInternalLinks = catalogLinks.filter((link) => link.startsWith("internal-adr-"));

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
if (catalogInternalLinks.length > 0) {
  fail(`${catalogRel}: internal ADR records must be excluded from the public catalog`);
}
for (const name of internalTripletNames) {
  if (catalogText.includes(name)) {
    fail(`${catalogRel}: internal ADR triplet ${name} must not appear in the public catalog`);
  }
}
for (const idNumber of expectedInternalStems.keys()) {
  const id = `AC-INTERNAL-${String(idNumber).padStart(3, "0")}`;
  if (catalogText.includes(id)) {
    fail(`${catalogRel}: internal ADR ID ${id} must not appear in the public catalog`);
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
const workflowSelection = sectionText(skillText, "Workflow selection");
const publicWorkflows = [...workflowSelection.matchAll(/^- `([^`]+)`:/gm)].map(
  ([, workflow]) => workflow,
);
if (JSON.stringify(publicWorkflows) !== JSON.stringify(expectedPublicWorkflows)) {
  fail(
    `${skillRel}: public workflows must be exactly ${expectedPublicWorkflows.join(", ")} in that order`,
  );
}
for (const required of [
  "There is no `auto` workflow.",
  "state the complete workflow set, selected workflow and rationale",
  "A bare activation, conflicting cues, or ambiguity",
  "Agent-initiated activation may select and announce `audit` without mutation authority.",
  "mutating workflow only when the user's existing task already requests that outcome and scope",
]) {
  if (!workflowSelection.includes(required)) {
    fail(`${skillRel}: workflow selection must include ${JSON.stringify(required)}`);
  }
}
for (const required of [
  "`recommended` or `complete` coverage",
  "Only a new or evidence-empty repository receives AC-ADR-005, 006, 018, 019, 021, 022, and 049",
  "Setup never authorizes application refactoring, deployment, publication, or production probes.",
  "perform a strictly read-only architecture, ADR-coverage, drift, and validation assessment",
  "Direct refactor never invents a durable decision or silently repairs governance.",
  "Uncertainty never authorizes fallback.",
  "Write no target repository/workspace artifact while Plan mode is active.",
  "recheck state after approval and Plan-mode exit",
  "references/ac-adr-048-persist-approved-governance-before-planned-architecture-refactors.short.md",
]) {
  if (!skillText.includes(required)) {
    fail(`${skillRel}: missing workflow invariant ${JSON.stringify(required)}`);
  }
}
const conditionalSelector = sectionText(skillText, "Conditional stable-skill selector instruction");
for (const required of [
  "stable public skill with multiple material workflows",
  "complete finite workflow disclosure, intent-bound selection and rationale, an ambiguity question",
  "Direct `refactor` does not repair a missing rule; route governance repair to `setup`.",
  "`indeterminate` never authorizes a write.",
]) {
  if (!conditionalSelector.includes(required)) {
    fail(`${skillRel}: conditional selector contract must include ${JSON.stringify(required)}`);
  }
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

const backendLifecycleGuideFile = path.join(
  referencesDir,
  "ac-adr-011-compose-long-running-backend-runtimes-and-lifecycles-explicitly.guide.md",
);
const backendLifecycleGuideText = readRegularFile(backendLifecycleGuideFile);
const backendLifecycleGuideRel = relative(backendLifecycleGuideFile);
for (const marker of [
  "type StartupOutcome = { ok: true } | { ok: false; error: unknown };",
  "let startupOutcome: StartupOutcome = { ok: true };",
  "prepareRuntimeAcquisition(config, bootstrapLogger)",
  "const databaseOwner = prepareDatabaseAcquisition(config.database)",
  "operation: (signal) => runtimeOwner!.acquire(signal)",
  "operation: (signal) => runtime!.start(signal)",
  "listenerOwner = prepareHttpListener(app, config.port)",
  "operation: (signal) => listenerOwner!.bind(signal)",
  "onAbort: () => listenerOwner!.close(AbortSignal.timeout(config.abortGraceMs))",
  "operation: (signal) => listener!.stopAdmission(signal)",
  "operation: (signal) => listener!.drain(signal)",
  "const operationOutcome = settle(Promise.resolve().then(() => operation(signal)))",
  "const sharedShutdown = shutdown(reason)",
  "const outcome = await lifecycleDone.promise",
  "return new AggregateError([primary, cleanup], message, { cause: primary })",
  "function invokeTerminalPreservingFailure(failure: TerminalFailure): never",
  "failure.cause,",
  "terminalError,",
  "throw combineFailures(",
  "function terminalBootstrapFailure",
  "function terminalShutdownFailure",
  "must synchronously return a closeable adapter **before** `bind(signal)` can open a socket",
  "Return a never-resolving `runtime.start(signal)`",
  "Let `bind(signal)` open a test socket and then never resolve",
  "Make `stopAdmission(signal)` never resolve",
  "make `drain(signal)` never resolve",
  "Make `listenerOwner.close(signal)` never resolve",
  "Make `runtimeOwner.close(signal)` never resolve",
  "Reject each guarded startup stage with every falsy JavaScript rejection value",
]) {
  if (!backendLifecycleGuideText.includes(marker)) {
    fail(`${backendLifecycleGuideRel}: missing backend lifecycle marker ${JSON.stringify(marker)}`);
  }
}

for (const [label, pattern] of [
  [
    "bounded runtime acquisition call site",
    /stage: "runtime-acquire"[\s\S]{0,320}operation: \(signal\) => runtimeOwner!\.acquire\(signal\)[\s\S]{0,240}onAbort: \(\) => runtimeOwner!\.close\(AbortSignal\.timeout\(config\.abortGraceMs\)\)[\s\S]{0,160}terminal: deps\.terminalBootstrapFailure/,
  ],
  [
    "observed shared shutdown",
    /const sharedShutdown = shutdown\(reason\);[\s\S]{0,240}sharedShutdown\.then\([\s\S]{0,180}lifecycleDone\.resolve\(\{ ok: true \}\)[\s\S]{0,180}lifecycleDone\.resolve\(\{ ok: false, error \}\)/,
  ],
  [
    "tagged falsy-safe startup failure unwind",
    /catch \(error\) \{\s+if \(!shutdownRequested\) startupOutcome = \{ ok: false, error \};\s+\} finally \{\s+startupSettled\.resolve\(\);\s+\}\s+if \(!startupOutcome\.ok\) \{\s+const startupFailure = startupOutcome\.error;\s+process\.exitCode = 1;[\s\S]{0,120}await shutdown\("startup-failure"\);[\s\S]{0,420}throw startupFailure;/,
  ],
  [
    "listener closeOrTerminate call site",
    /closeOrTerminate\([\s\S]{0,80}"listener-close"[\s\S]{0,180}listenerOwner\?\.close\(signal\)[\s\S]{0,120}config,[\s\S]{0,120}deps\.terminalShutdownFailure/,
  ],
  [
    "runtime closeOrTerminate call site",
    /closeOrTerminate\([\s\S]{0,80}"runtime-close"[\s\S]{0,180}runtimeOwner\?\.close\(signal\)[\s\S]{0,120}config,[\s\S]{0,120}deps\.terminalShutdownFailure/,
  ],
  [
    "guaranteed signal-handler cleanup",
    /const outcome = await lifecycleDone\.promise;[\s\S]{0,160}finally \{[\s\S]{0,180}removeSignalHandlers\(\);/,
  ],
  [
    "runtime acquisition error aggregation",
    /catch \(primaryError\) \{[\s\S]{0,180}await close\(AbortSignal\.timeout\(config\.abortGraceMs\)\)[\s\S]{0,180}catch \(cleanupError\)[\s\S]{0,180}combineFailures\(primaryError, cleanupError, "runtime acquisition and unwind failed"\)/,
  ],
  [
    "close terminal error preservation",
    /function invokeTerminalPreservingFailure\(failure: TerminalFailure\): never \{[\s\S]{0,180}terminal\(failure\)[\s\S]{0,180}catch \(terminalError\)[\s\S]{0,220}combineFailures\([\s\S]{0,80}failure\.cause,[\s\S]{0,80}terminalError/,
  ],
  [
    "close deadline and direct-rejection escalation",
    /async function closeOrTerminate\([\s\S]{0,900}operation: close,[\s\S]{0,260}terminal: \(failure\) => invokeTerminalPreservingFailure\(failure\)[\s\S]{0,260}if \(terminalInvoked\) throw error;[\s\S]{0,160}return invokeTerminalPreservingFailure\(\{ stage, cause: error \}\)/,
  ],
  [
    "admission stop before drain",
    /let admissionStopped = false;[\s\S]{0,240}try \{\s+await withDeadline\(\{[\s\S]{0,180}stage: "listener-stop-admission"[\s\S]{0,900}\}\);\s+admissionStopped = true;\s+\} catch[\s\S]{0,320}if \(admissionStopped\) \{[\s\S]{0,500}stage: "listener-drain"/,
  ],
]) {
  if (!pattern.test(backendLifecycleGuideText)) {
    fail(`${backendLifecycleGuideRel}: missing coupled backend lifecycle contract ${label}`);
  }
}

const signalRegistrationIndex = backendLifecycleGuideText.indexOf('process.on("SIGINT", onSigint)');
const runtimeAcquisitionIndex = backendLifecycleGuideText.indexOf(
  "runtimeOwner = prepareRuntimeAcquisition(config, bootstrapLogger)",
);
if (
  signalRegistrationIndex === -1 ||
  runtimeAcquisitionIndex === -1 ||
  signalRegistrationIndex >= runtimeAcquisitionIndex
) {
  fail(`${backendLifecycleGuideRel}: signal handlers must precede runtime acquisition`);
}

const databaseOwnerIndex = backendLifecycleGuideText.indexOf(
  "const databaseOwner = prepareDatabaseAcquisition(config.database)",
);
const databaseDisposerIndex = backendLifecycleGuideText.indexOf(
  "closeStack.push((cleanupSignal) => databaseOwner.close(cleanupSignal))",
);
const databaseAcquireIndex = backendLifecycleGuideText.indexOf(
  "const database = await createDatabase(databaseOwner, signal)",
);
if (
  databaseOwnerIndex === -1 ||
  databaseDisposerIndex <= databaseOwnerIndex ||
  databaseAcquireIndex <= databaseDisposerIndex
) {
  fail(`${backendLifecycleGuideRel}: database disposer must precede external acquisition`);
}

const assetFiles = markdownFiles(assetsDir);
if (assetFiles.length === 0) fail(`${relative(assetsDir)}: expected derived Markdown assets`);
const receiptAssetNames = new Set([
  "setup-report-template.md",
  "refactor-report-template.md",
  "new-repo-adoption-plan-template.md",
]);
const evidenceStageContract =
  "Evidence stage: source/static | local | CI | publication/install | deployed/production | external/third-party";
const evidenceStatusContract = "Status: verified | failed | not run | unavailable | stale";
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
  if (
    /Setup profile|Apply variant|audit-and-adr-apply|audit-and-apply-refactor|setup repo-relevant|wait for (?:my |an? )?explicit (?:user )?confirmation/i.test(
      text,
    )
  ) {
    fail(`${rel}: derived asset contains a superseded Setup/Apply selection contract`);
  }
  if (receiptAssetNames.has(path.basename(file))) {
    for (const [label, contract] of [
      ["evidence-stage", evidenceStageContract],
      ["status", evidenceStatusContract],
      ["environment", "Environment:"],
      ["observation/result", "Observation / result:"],
    ]) {
      const count = text.split(contract).length - 1;
      if (count !== 1) {
        fail(`${rel}: receipt asset must contain exactly one ${label} contract; found ${count}`);
      }
    }
    if (text.includes("deployed/Preview")) {
      fail(`${rel}: Preview is an Environment value, not an AC-ADR-004 evidence stage`);
    }
    for (const column of ["Stage", "Environment", "Status", "Observation/result"]) {
      if (!new RegExp(`\\|\\s*${column.replace("/", "\\/")}\\s*\\|`).test(text)) {
        fail(`${rel}: receipt table must expose the ${column} column`);
      }
    }
  }
}

const setupReportFile = path.join(assetsDir, "setup-report-template.md");
const setupReportText = readRegularFile(setupReportFile);
const setupReportRel = relative(setupReportFile);
const eligibleSetupAdrIds = [...canonicalRecords.entries()]
  .filter(
    ([, record]) =>
      record.metadata.get("Status") === "Accepted" &&
      record.metadata.get("Scope") === "target-repository" &&
      record.metadata.get("Adoptable") === "true",
  )
  .map(([id]) => id)
  .sort((left, right) => Number(left.slice(-3)) - Number(right.slice(-3)));
const eligibleSetupAdrIdSet = new Set(eligibleSetupAdrIds);
const eligibleSetupAdrCount = eligibleSetupAdrIds.length;

function setupCount(pattern, label) {
  const matches = [...setupReportText.matchAll(pattern)];
  if (matches.length !== 1) {
    fail(`${setupReportRel}: expected exactly one ${label} declaration; found ${matches.length}`);
    return null;
  }
  return Number(matches[0][1]);
}

const declaredEligibleCount = setupCount(
  /^- Eligible catalog count \(`Scope: target-repository`, `Adoptable: true`\): `(\d+)`$/gm,
  "eligible catalog count",
);
const declaredMatrixCount = setupCount(/^- Matrix row count: `(\d+)`$/gm, "matrix row count");
const declaredTotalCount = setupCount(
  /^- Total disposition count \(`selected` \+ `not-selected`\): `<number; must equal (\d+)>`$/gm,
  "total disposition count",
);
const declaredEqualityCount = setupCount(
  /^- Count equality: `selected \+ not-selected = total = (\d+)`: `pass \| fail`$/gm,
  "count equality",
);

for (const [label, count] of [
  ["eligible catalog count", declaredEligibleCount],
  ["matrix row count", declaredMatrixCount],
  ["total disposition count", declaredTotalCount],
  ["count equality total", declaredEqualityCount],
]) {
  if (count !== null && count !== eligibleSetupAdrCount) {
    fail(`${setupReportRel}: ${label} must be ${eligibleSetupAdrCount}; found ${count}`);
  }
}

for (const contract of [
  "- Selected count (`adopt` + `adapt`): `<number from completed matrix>`",
  "- Not-selected count (`defer` + `reject`): `<number from completed matrix>`",
]) {
  const count = setupReportText.split(contract).length - 1;
  if (count !== 1) {
    fail(
      `${setupReportRel}: expected exactly one setup count contract ${JSON.stringify(contract)}`,
    );
  }
}

if (headingCount(setupReportText, "Target adoption matrix") !== 1) {
  fail(`${setupReportRel}: expected exactly one Target adoption matrix section`);
}
const setupMatrix = sectionText(setupReportText, "Target adoption matrix");
const setupMatrixIds = [...setupMatrix.matchAll(/^\|\s*(AC-ADR-\d{3})\s*\|/gm)].map(([, id]) => id);
const setupMatrixIdCounts = new Map();
for (const id of setupMatrixIds) {
  setupMatrixIdCounts.set(id, (setupMatrixIdCounts.get(id) ?? 0) + 1);
}
for (const id of eligibleSetupAdrIds) {
  const count = setupMatrixIdCounts.get(id) ?? 0;
  if (count === 0) {
    fail(`${setupReportRel}: setup adoption matrix is missing ${id}`);
  } else if (count > 1) {
    fail(`${setupReportRel}: setup adoption matrix contains duplicate ${id}; found ${count} rows`);
  }
}
for (const id of setupMatrixIdCounts.keys()) {
  if (!eligibleSetupAdrIdSet.has(id)) {
    fail(`${setupReportRel}: setup adoption matrix contains ineligible ${id}`);
  }
}
if (setupMatrixIds.length !== eligibleSetupAdrCount) {
  fail(
    `${setupReportRel}: setup adoption matrix must contain ${eligibleSetupAdrCount} rows; found ${setupMatrixIds.length}`,
  );
}
if (JSON.stringify(setupMatrixIds) !== JSON.stringify(eligibleSetupAdrIds)) {
  fail(
    `${setupReportRel}: setup adoption matrix must list every eligible ADR exactly once in ascending canonical order`,
  );
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

const internalNamespaceCaseFile = path.join(
  evalCasesDir,
  "internal-public-adr-namespace-separation.md",
);
const internalNamespaceCaseText = readRegularFile(internalNamespaceCaseFile);
const internalNamespaceCaseRel = relative(internalNamespaceCaseFile);
for (const assertion of [
  "- contains: public Long governs",
  "- contains: affected route blocked",
  "- contains: promotion incomplete",
  "- contains: new exposed triplet",
  "- contains: catalog row",
  "- contains: decision lock",
  "- contains: lineage entry",
  "- contains: focused validation",
  "- not_contains: internal Long governs",
  "- not_contains: metadata-only promotion complete",
]) {
  if (!internalNamespaceCaseText.includes(assertion)) {
    fail(
      `${internalNamespaceCaseRel}: missing public/internal conflict or promotion assertion ${JSON.stringify(assertion)}`,
    );
  }
}

const backendRoutingCaseFile = path.join(evalCasesDir, "selective-backend-routing.md");
const backendRoutingCaseText = readRegularFile(backendRoutingCaseFile);
const backendRoutingCaseRel = relative(backendRoutingCaseFile);
for (const assertion of [
  "- contains: signal handlers before runtime acquisition",
  "- contains: cancellable runtime acquisition with AbortSignal",
  "- contains: synchronously registered database-acquisition cleanup",
  "- contains: bounded database-acquisition unwind",
  "- contains: cancellable runtime start with AbortSignal",
  "- contains: synchronously registered partial-bind cleanup",
  "- contains: cancellable listener bind with AbortSignal",
  "- contains: cancellable admission stop with AbortSignal",
  "- contains: cancellable drain with AbortSignal",
  "- contains: drain only after confirmed admission stop",
  "- contains: never-resolving start terminal escalation",
  "- contains: never-resolving bind terminal escalation",
  "- contains: never-resolving stop-admission terminal escalation",
  "- contains: never-resolving drain terminal escalation",
  "- contains: never-resolving listener close terminal escalation",
  "- contains: never-resolving runtime close terminal escalation",
  "- contains: original and cleanup failures preserved with AggregateError",
  "- contains: close failure before terminal failure in AggregateError",
  "- contains: shared shutdown rejection observed",
  "- contains: main awaits lifecycle completion",
  "- contains: late rejection observation",
  "- contains: handler cleanup when terminal throws",
  "- contains: listener-close closeOrTerminate call site",
  "- contains: runtime-close closeOrTerminate call site",
]) {
  if (!backendRoutingCaseText.includes(assertion)) {
    fail(
      `${backendRoutingCaseRel}: missing backend lifecycle assertion ${JSON.stringify(assertion)}`,
    );
  }
}

const legacyReferenceEvidence = validateLegacyReferenceEvidence({ root });
errors.push(...legacyReferenceEvidence.errors);

const legacyCaseLineage = validateLegacyCaseLineage({
  root,
  manifestRelative: "skill-evals/architecture-compass/legacy-case-lineage.json",
  expectedSourceCommit: legacyCaseSourceCommit,
  expectedSources: legacyCaseSources,
  expectedBaselineDirectory: `skill-evals/architecture-compass/legacy-case-baseline/${legacyCaseSourceCommit}`,
  runtimeDirectory: "skills/engineering-workflows/architecture-compass",
  activeTargetRoots: [
    "skills/engineering-workflows/architecture-compass",
    "skill-evals/architecture-compass/cases",
  ],
  forbiddenEvidenceRoots: [
    "skill-evals/architecture-compass/reference-baseline",
    "skill-evals/architecture-compass/runs",
    "skill-evals/architecture-compass/activation-cases.md",
    "skill-evals/architecture-compass/README.md",
    "skill-evals/architecture-compass/rubric.md",
  ],
});
errors.push(...legacyCaseLineage.errors);

export const validationErrors = [...new Set(errors)].sort();
export const validationSummary = `Architecture Compass validated: ${canonicalRecords.size} public ADRs, ${records.length} public triplet files, ${internalRecords.length} internal triplet files, ${decisionLineage.size} lineage dispositions, ${baselineEvalCases.length} lifecycle cases, ${routedLibraryEvalCases.length} routed-library cases, ${legacyCaseLineage.summary.cases} legacy-case dispositions covering ${legacyCaseLineage.summary.sourceUnits} material units, ${legacyReferenceEvidence.summary.files} legacy-reference files, ${legacyReferenceEvidence.summary.units} no-loss units, ${legacyReferenceEvidence.summary.codeBlocks} historical code examples (${legacyReferenceEvidence.summary.dispositions.preserved} preserved, ${legacyReferenceEvidence.summary.dispositions.adapted} adapted, ${legacyReferenceEvidence.summary.dispositions["explicitly-rejected"]} explicitly rejected).`;

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
