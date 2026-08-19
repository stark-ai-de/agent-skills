import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { loadValidatedBundle } from "./lib/bundle-contract.mjs";
import { validateOpenAiListing } from "./lib/openai-contract.mjs";

const root = process.cwd();
const inventoryPath = path.join(root, "skill-evals", "stark-ai-developer", "manifest.json");
const evidenceReadme = path.join(
  root,
  "skill-evals",
  "stark-ai-developer",
  "evidence",
  "README.md",
);
const fixtureEvidencePath = path.join(
  root,
  "skill-evals",
  "stark-ai-developer",
  "evidence",
  "local-marketplace-fixtures.json",
);

try {
  const errors = [];
  const bundle = loadValidatedBundle(root);
  const listing = validateOpenAiListing(root);
  errors.push(...listing.errors);
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
  const cases = Array.isArray(inventory.cases) ? inventory.cases : [];
  const skillNames = new Set(bundle.skills.map((entry) => entry.name));
  const positive = cases.filter((testCase) => testCase.kind === "positive");
  const negative = cases.filter((testCase) => testCase.kind === "negative");
  if (positive.length < 6)
    errors.push("plugin evaluation inventory needs at least six positive cases");
  if (negative.length < 3)
    errors.push("plugin evaluation inventory needs at least three negative cases");

  const requiredTags = [
    "ambiguity",
    "disabled-discovery",
    "ide-boundary",
    "listing-fidelity",
    "mutation-approval",
    "no-invention",
    "output-contract",
    "product-boundary",
  ];
  const tags = new Set(cases.flatMap((testCase) => testCase.tags ?? []));
  for (const tag of requiredTags) {
    if (!tags.has(tag)) errors.push(`plugin evaluation inventory is missing tag ${tag}`);
  }
  for (const discovery of ["direct", "implicit", "disabled"]) {
    if (!cases.some((testCase) => testCase.discovery === discovery)) {
      errors.push(`plugin evaluation inventory is missing ${discovery} discovery coverage`);
    }
  }
  for (const surface of ["CHAT", "CODEX", "CODEX-IDE"]) {
    if (!cases.some((testCase) => testCase.surface === surface)) {
      errors.push(`plugin evaluation inventory is missing ${surface} surface coverage`);
    }
  }

  const caseIds = new Set();
  for (const testCase of cases) {
    if (!testCase.id || caseIds.has(testCase.id))
      errors.push(`duplicate or missing evaluation case id: ${testCase.id}`);
    caseIds.add(testCase.id);
    if (testCase.skill && !skillNames.has(testCase.skill)) {
      errors.push(`${testCase.id} references a skill outside the bundle: ${testCase.skill}`);
    }
    if (typeof testCase.request !== "string" || !testCase.request.trim()) {
      errors.push(`${testCase.id} must have a sanitized request`);
    }
    if (testCase.kind === "ambiguity") {
      const candidates = Array.isArray(testCase.candidateSkills)
        ? [...new Set(testCase.candidateSkills)]
        : [];
      if (candidates.length < 2) {
        errors.push(`${testCase.id} must declare at least two candidate skills`);
      }
      const request = testCase.request.trim();
      const bareSkill = [...skillNames].find((name) =>
        new RegExp(`^Use\\s+(?:\\$${name}|${name})\\.?$`, "i").test(request),
      );
      if (bareSkill) {
        errors.push(
          `${testCase.id} must not be a bare single-skill invocation; use a cross-skill prompt`,
        );
      }
      for (const candidate of candidates) {
        if (!skillNames.has(candidate)) {
          errors.push(`${testCase.id} references an unbundled candidate skill: ${candidate}`);
        }
      }
      if (testCase.resolution !== "clarify") {
        errors.push(`${testCase.id} must require clarification before workflow selection`);
      }
      if (
        !Array.isArray(testCase.expectedResultShape) ||
        testCase.expectedResultShape.length === 0
      ) {
        errors.push(`${testCase.id} must have an expected result shape`);
      }
      if (!Array.isArray(testCase.passCriteria) || testCase.passCriteria.length === 0) {
        errors.push(`${testCase.id} must declare pass/fail criteria`);
      }
      if (
        !Array.isArray(testCase.expected) ||
        !testCase.expected.some((assertion) =>
          /\b(ask|asks|clarif|choose|select|order)\w*/i.test(assertion),
        )
      ) {
        errors.push(`${testCase.id} must assert a bounded clarification or selection step`);
      }
    }
    if (!Array.isArray(testCase.expected) || testCase.expected.length === 0) {
      errors.push(`${testCase.id} must have expected output assertions`);
    }
    if (testCase.kind === "positive") {
      if (
        !Array.isArray(testCase.expectedResultShape) ||
        testCase.expectedResultShape.length === 0
      ) {
        errors.push(`${testCase.id} must have an expected result shape`);
      }
      if (!Array.isArray(testCase.fixtures) || testCase.fixtures.length === 0) {
        errors.push(`${testCase.id} must declare required fixture data or files`);
      }
      if (!Array.isArray(testCase.passCriteria) || testCase.passCriteria.length === 0) {
        errors.push(`${testCase.id} must declare pass/fail criteria`);
      }
    }
    if (testCase.kind === "negative") {
      if (typeof testCase.reason !== "string" || !testCase.reason.trim()) {
        errors.push(`${testCase.id} must explain why the action should not complete`);
      }
      if (!Array.isArray(testCase.passCriteria) || testCase.passCriteria.length === 0) {
        errors.push(`${testCase.id} must declare pass/fail criteria`);
      }
    }
  }

  const mappings = Array.isArray(inventory.listingMappings) ? inventory.listingMappings : [];
  const expectedCapabilities = new Set(listing.listing?.plugin?.capabilities ?? []);
  const mappedSkills = new Set();
  for (const mapping of mappings) {
    if (!skillNames.has(mapping.skill))
      errors.push(`listing mapping names an unbundled skill: ${mapping.skill}`);
    mappedSkills.add(mapping.skill);
    if (!expectedCapabilities.has(mapping.capability)) {
      errors.push(`listing mapping does not match listing capability: ${mapping.capability}`);
    }
  }
  for (const name of skillNames) {
    if (!mappedSkills.has(name)) errors.push(`listing mapping is missing ${name}`);
  }

  if (!fs.existsSync(evidenceReadme)) errors.push("sanitized evidence README is missing");
  if (!fs.existsSync(fixtureEvidencePath)) {
    errors.push("local marketplace fixture evidence is missing");
  } else {
    const fixtureEvidence = JSON.parse(fs.readFileSync(fixtureEvidencePath, "utf8"));
    if (fixtureEvidence.clientLifecycle?.status !== "not-run") {
      errors.push(
        "client lifecycle evidence must remain not-run without explicit client authority",
      );
    }
    if (fixtureEvidence.publicStatus !== "not-public-directory-evidence") {
      errors.push("fixture evidence must not imply public-directory status");
    }
    for (const gate of ["liveHttps", "publisherIdentity", "appsManagement"]) {
      if (fixtureEvidence.externalGates?.[gate] !== "manual-review-required") {
        errors.push(`fixture evidence must keep ${gate} as manual-review-required`);
      }
    }
  }
  const serialized = JSON.stringify(inventory);
  if (
    /(?:\/home\/(?!<)[^/\s]+\/|\/Users\/(?!<)[^/\s]+\/|BEGIN (?:RSA|OPENSSH) PRIVATE KEY|ghp_|(?:^|[^A-Za-z0-9])sk-[A-Za-z0-9])/.test(
      serialized,
    )
  ) {
    errors.push("evaluation inventory contains a private path or token-like value");
  }
  if (
    serialized.includes("universal directory is live") ||
    serialized.includes("OpenAI approved")
  ) {
    errors.push("evaluation inventory must not claim public approval or publication");
  }

  const reliabilityPath = path.join(
    root,
    "skill-evals",
    "stark-ai-developer",
    "reliability-thresholds.json",
  );
  if (!fs.existsSync(reliabilityPath)) {
    errors.push("[EVAL-001] reliability-thresholds.json is missing");
  } else {
    const reliability = JSON.parse(fs.readFileSync(reliabilityPath, "utf8"));
    if (reliability.requirementId !== "EVAL-001") {
      errors.push("[EVAL-001] reliability-thresholds.json must cite EVAL-001");
    }
    if (!["not_run", "recorded"].includes(reliability.status)) {
      errors.push("[EVAL-001] reliability-thresholds.json status must be not_run or recorded");
    }
  }

  if (errors.length > 0) {
    console.error("Plugin evaluation validation errors:");
    for (const error of [...new Set(errors)]) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(
      `Validated ${positive.length} positive and ${negative.length} negative plugin cases.`,
    );
  }
} catch (error) {
  console.error(`Plugin evaluation validation failed: ${error.message}`);
  process.exitCode = 1;
}
