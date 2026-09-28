import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateOpenAiListing } from "../lib/openai-contract.mjs";
import { LISTING_PATH } from "../lib/openai-projection.mjs";
import { renderOpenAiSubmissionChecklist } from "../lib/openai-worksheet.mjs";
import {
  PLUGIN_SOURCE_PATH,
  PLUGIN_SOURCE_SCHEMA_PATH,
  pluginArtifactPaths,
} from "../lib/release-descriptor.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function createFixture() {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-openai-contract-"));
  fs.mkdirSync(path.join(fixture, "plugins"), { recursive: true, mode: 0o755 });
  fs.copyFileSync(
    path.join(repositoryRoot, PLUGIN_SOURCE_PATH),
    path.join(fixture, PLUGIN_SOURCE_PATH),
  );
  fs.copyFileSync(
    path.join(repositoryRoot, PLUGIN_SOURCE_SCHEMA_PATH),
    path.join(fixture, PLUGIN_SOURCE_SCHEMA_PATH),
  );
  fs.cpSync(path.join(repositoryRoot, "skills"), path.join(fixture, "skills"), {
    recursive: true,
  });
  fs.cpSync(path.join(repositoryRoot, "scripts/vendor"), path.join(fixture, "scripts/vendor"), {
    recursive: true,
  });
  const listingDir = path.posix.dirname(LISTING_PATH);
  const listingDest = path.join(fixture, listingDir);
  fs.mkdirSync(path.dirname(listingDest), { recursive: true, mode: 0o755 });
  fs.cpSync(path.join(repositoryRoot, listingDir), listingDest, {
    recursive: true,
  });
  fs.cpSync(path.join(repositoryRoot, "site", "public"), path.join(fixture, "site", "public"), {
    recursive: true,
  });
  fs.copyFileSync(path.join(repositoryRoot, "README.md"), path.join(fixture, "README.md"));
  fs.copyFileSync(path.join(repositoryRoot, "package.json"), path.join(fixture, "package.json"));
  fs.mkdirSync(path.join(fixture, "docs/assets"), { recursive: true, mode: 0o755 });
  fs.copyFileSync(
    path.join(repositoryRoot, "docs/assets/chatgpt-plugin-badge.svg"),
    path.join(fixture, "docs/assets/chatgpt-plugin-badge.svg"),
  );
  return fixture;
}

function readListing(fixture) {
  const listingPath = path.join(fixture, LISTING_PATH);
  const listing = JSON.parse(fs.readFileSync(listingPath, "utf8"));
  return { listing, listingPath };
}

function writeListing(fixture, listing, listingPath) {
  fs.writeFileSync(listingPath, `${JSON.stringify(listing, null, 2)}\n`);
}

const privateUrlFixture = createFixture();
try {
  const { listing, listingPath } = readListing(privateUrlFixture);
  listing.plugin.urls.website = "https://127.0.0.1/example";
  writeListing(privateUrlFixture, listing, listingPath);
  const result = validateOpenAiListing(privateUrlFixture);
  assert.ok(
    result.errors.some((error) => /public HTTPS URL/.test(error)),
    result.errors.join("\n"),
  );
} finally {
  fs.rmSync(privateUrlFixture, { recursive: true, force: true });
}

const missingAssetFixture = createFixture();
try {
  const { listing, listingPath } = readListing(missingAssetFixture);
  delete listing.plugin.assets.logo;
  writeListing(missingAssetFixture, listing, listingPath);
  const result = validateOpenAiListing(missingAssetFixture);
  assert.ok(
    result.errors.some((error) => /listing\.plugin\.assets\.logo is required/.test(error)),
    result.errors.join("\n"),
  );
} finally {
  fs.rmSync(missingAssetFixture, { recursive: true, force: true });
}

const leftoverAvailabilityFixture = createFixture();
try {
  const { listing, listingPath } = readListing(leftoverAvailabilityFixture);
  listing.availability = { regions: [], selectionRationale: "stale" };
  writeListing(leftoverAvailabilityFixture, listing, listingPath);
  const result = validateOpenAiListing(leftoverAvailabilityFixture);
  assert.ok(
    result.errors.some((error) => /listing\.availability is not a portal field/.test(error)),
    result.errors.join("\n"),
  );
} finally {
  fs.rmSync(leftoverAvailabilityFixture, { recursive: true, force: true });
}

const privatePublisherFixture = createFixture();
try {
  const { listing, listingPath } = readListing(privatePublisherFixture);
  listing.publisher.openaiOrganizationId = "synthetic-account-id";
  writeListing(privatePublisherFixture, listing, listingPath);
  const result = validateOpenAiListing(privatePublisherFixture);
  assert.ok(
    result.errors.some((error) => /\[PRV-001\]/.test(error)),
    result.errors.join("\n"),
  );
} finally {
  fs.rmSync(privatePublisherFixture, { recursive: true, force: true });
}

const verifiedPublisherFixture = createFixture();
try {
  const { listing, listingPath } = readListing(verifiedPublisherFixture);
  listing.publisher.verifiedIdentity = true;
  writeListing(verifiedPublisherFixture, listing, listingPath);
  const result = validateOpenAiListing(verifiedPublisherFixture);
  assert.ok(
    result.errors.some((error) => /\[PRV-001\]/.test(error)),
    result.errors.join("\n"),
  );
} finally {
  fs.rmSync(verifiedPublisherFixture, { recursive: true, force: true });
}

for (const category of ["Education & Research", "Security"]) {
  const fixture = createFixture();
  try {
    const { listing, listingPath } = readListing(fixture);
    listing.plugin.category = category;
    writeListing(fixture, listing, listingPath);
    const result = validateOpenAiListing(fixture);
    assert.equal(
      result.errors.filter((error) => /category is unsupported/.test(error)).length,
      0,
      `${category} must be accepted:\n${result.errors.join("\n")}`,
    );
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

for (const category of ["Research", "Education", "Lifestyle"]) {
  const fixture = createFixture();
  try {
    const { listing, listingPath } = readListing(fixture);
    listing.plugin.category = category;
    writeListing(fixture, listing, listingPath);
    const result = validateOpenAiListing(fixture);
    assert.ok(
      result.errors.some((error) => /category is unsupported/.test(error)),
      `${category} must be rejected:\n${result.errors.join("\n")}`,
    );
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

const staleBadgeFixture = createFixture();
try {
  const badgePath = path.join(staleBadgeFixture, "docs/assets/chatgpt-plugin-badge.svg");
  const { listing } = readListing(staleBadgeFixture);
  const staleVersion = listing.plugin.version === "0.0.0" ? "9.9.9" : "0.0.0";
  fs.writeFileSync(
    badgePath,
    fs.readFileSync(badgePath, "utf8").replaceAll(listing.plugin.version, staleVersion),
  );
  const result = validateOpenAiListing(staleBadgeFixture);
  assert.ok(
    result.errors.some((error) =>
      error.includes("docs/assets/chatgpt-plugin-badge.svg must show ChatGPT"),
    ),
    result.errors.join("\n"),
  );
} finally {
  fs.rmSync(staleBadgeFixture, { recursive: true, force: true });
}

const cursorGlyphFixture = createFixture();
try {
  const { listing, listingPath } = readListing(cursorGlyphFixture);
  listing.skills[0].portalGlyph = "cursor";
  writeListing(cursorGlyphFixture, listing, listingPath);
  const result = validateOpenAiListing(cursorGlyphFixture);
  assert.ok(
    result.errors.some((error) =>
      /portalGlyph must be a reviewed Apps Management glyph/.test(error),
    ),
    result.errors.join("\n"),
  );
} finally {
  fs.rmSync(cursorGlyphFixture, { recursive: true, force: true });
}

const duplicateGlyphFixture = createFixture();
try {
  const { listing, listingPath } = readListing(duplicateGlyphFixture);
  listing.skills[0].portalGlyph = "bolt";
  listing.skills[1].portalGlyph = "bolt";
  writeListing(duplicateGlyphFixture, listing, listingPath);
  const result = validateOpenAiListing(duplicateGlyphFixture);
  assert.ok(
    result.errors.some((error) => /portalGlyph values must be unique/.test(error)),
    result.errors.join("\n"),
  );
} finally {
  fs.rmSync(duplicateGlyphFixture, { recursive: true, force: true });
}

const listing = JSON.parse(fs.readFileSync(path.join(repositoryRoot, LISTING_PATH), "utf8"));
const checklist = renderOpenAiSubmissionChecklist(listing, {
  repository: "example/example",
  tag: "v1.7.1",
  releaseSha: "a".repeat(40),
  releaseUrl: "https://github.com/example/example/releases/tag/v1.7.1",
  openaiAssetUrl: "https://github.com/example/example/releases/download/v1.7.1/openai.zip",
  openaiSha256: "b".repeat(64),
  firstPublicationUrl:
    "https://github.com/example/example/blob/main/docs/listing/openai/first-publication.md#composer-icon-handoff",
});
const paths = pluginArtifactPaths(repositoryRoot);
assert.match(checklist, /\[Composer icon handoff\]/);
assert.match(checklist, /Keep both existing Plugin Info logos unchanged/);
assert.match(checklist, /Confirm the successful exact-tag Post-release Evidence run/);
assert.doesNotMatch(checklist, /organization ID|Verified identity|submission ID/i);

const runbook = fs.readFileSync(path.join(repositoryRoot, paths.firstPublication), "utf8");
assert.match(runbook, /^### Composer icon handoff$/m);
assert.match(runbook, /interface\.composerIcon/);
for (const theme of ["light", "dark"]) {
  const icon = `assets/chatgpt-composer-icon-${theme}.png`;
  assert.ok(runbook.includes(`(${icon})`), `${theme} Composer upload must be linked`);
  assert.ok(fs.existsSync(path.join(repositoryRoot, path.dirname(paths.firstPublication), icon)));
}

console.log("OpenAI listing contract fixtures passed.");
