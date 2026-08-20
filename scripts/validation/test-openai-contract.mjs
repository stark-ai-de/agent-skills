import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateOpenAiListing } from "../lib/openai-contract.mjs";
import { LISTING_PATH } from "../lib/openai-projection.mjs";
import {
  OPENAI_WORKSHEET_PATH,
  renderOpenAiSubmissionWorksheet,
} from "../lib/openai-worksheet.mjs";
import { PLUGIN_SOURCE_PATH, PLUGIN_SOURCE_SCHEMA_PATH } from "../lib/release-descriptor.mjs";

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
  return fixture;
}

function readListing(fixture) {
  const listingPath = path.join(fixture, LISTING_PATH);
  const listing = JSON.parse(fs.readFileSync(listingPath, "utf8"));
  return { listing, listingPath };
}

function writeListingAndWorksheet(fixture, listing, listingPath) {
  fs.writeFileSync(listingPath, `${JSON.stringify(listing, null, 2)}\n`);
  fs.writeFileSync(
    path.join(fixture, OPENAI_WORKSHEET_PATH),
    renderOpenAiSubmissionWorksheet(listing),
  );
}

const privateUrlFixture = createFixture();
try {
  const { listing, listingPath } = readListing(privateUrlFixture);
  listing.plugin.urls.website = "https://127.0.0.1/example";
  writeListingAndWorksheet(privateUrlFixture, listing, listingPath);
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
  writeListingAndWorksheet(missingAssetFixture, listing, listingPath);
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
  writeListingAndWorksheet(leftoverAvailabilityFixture, listing, listingPath);
  const result = validateOpenAiListing(leftoverAvailabilityFixture);
  assert.ok(
    result.errors.some((error) => /listing\.availability is not a portal field/.test(error)),
    result.errors.join("\n"),
  );
} finally {
  fs.rmSync(leftoverAvailabilityFixture, { recursive: true, force: true });
}

for (const category of ["Education & Research", "Security"]) {
  const fixture = createFixture();
  try {
    const { listing, listingPath } = readListing(fixture);
    listing.plugin.category = category;
    writeListingAndWorksheet(fixture, listing, listingPath);
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
    writeListingAndWorksheet(fixture, listing, listingPath);
    const result = validateOpenAiListing(fixture);
    assert.ok(
      result.errors.some((error) => /category is unsupported/.test(error)),
      `${category} must be rejected:\n${result.errors.join("\n")}`,
    );
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

console.log("OpenAI listing contract fixtures passed.");
