import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function openAiDocumentationDriftErrors({ publishing, firstPublication, valuesReview }) {
  const errors = [];
  if (/dist\/openai\/stark-ai-developer-\d+\.\d+\.\d+\.zip/i.test(publishing)) {
    errors.push("publishing.md hard-codes a versioned current OpenAI archive path");
  }
  if (/\bcurrent plugin\s+\d+\.\d+\.\d+\b/i.test(firstPublication)) {
    errors.push("first-publication notes claim a versioned current plugin");
  }
  if (/\bpublication is pending\b/i.test(valuesReview)) {
    errors.push("listing values claim that publication is pending");
  }
  if (/^## .*awaiting publication\s*$/im.test(valuesReview)) {
    errors.push("listing values contain a volatile awaiting-publication section");
  }
  return errors;
}

const documents = {
  publishing: fs.readFileSync(path.join(repositoryRoot, "docs/publishing.md"), "utf8"),
  firstPublication: fs.readFileSync(
    path.join(repositoryRoot, "docs/listing/openai/stark-ai-developer-first-publication.md"),
    "utf8",
  ),
  valuesReview: fs.readFileSync(
    path.join(repositoryRoot, "docs/listing/openai/stark-ai-developer-values-review.md"),
    "utf8",
  ),
};
assert.deepEqual(openAiDocumentationDriftErrors(documents), []);

for (const [field, value, expected] of [
  [
    "publishing",
    "Use dist/openai/stark-ai-developer-9.9.9.zip now.",
    /versioned current OpenAI archive/,
  ],
  ["firstPublication", "The current plugin 9.9.9 contains skills.", /versioned current plugin/],
  ["valuesReview", "Status: publication is pending.", /publication is pending/],
  ["valuesReview", "## Accepted addition awaiting publication", /awaiting-publication/],
]) {
  const errors = openAiDocumentationDriftErrors({ ...documents, [field]: value });
  assert.match(errors.join("; "), expected);
}

console.log("OpenAI documentation drift fixtures passed.");
