import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  githubRepositorySlug,
  listingArtifactPaths,
  listingIdentityFromSource,
  publicRepositoryUrl,
} from "../lib/listing-identity.mjs";
import {
  githubRepositorySlug as releaseGithubRepositorySlug,
  loadValidatedPluginSource,
  pluginArtifactPaths,
  publicRepositoryUrl as releasePublicRepositoryUrl,
} from "../lib/release-descriptor.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = loadValidatedPluginSource(repoRoot);
const identity = listingIdentityFromSource(source);

assert.equal(
  publicRepositoryUrl("git+https://github.com/stark-ai-de/agent-skills.git/"),
  "https://github.com/stark-ai-de/agent-skills",
);
assert.equal(
  githubRepositorySlug("git@github.com:stark-ai-de/agent-skills.git"),
  "stark-ai-de/agent-skills",
);
assert.equal(
  githubRepositorySlug("ssh://git@github.com/stark-ai-de/agent-skills.git"),
  "stark-ai-de/agent-skills",
);
assert.equal(
  githubRepositorySlug({ url: "https://github.com/stark-ai-de/agent-skills/" }),
  "stark-ai-de/agent-skills",
);
for (const invalidRepository of [
  "https://example.com/stark-ai-de/agent-skills",
  "https://notgithub.com/stark-ai-de/agent-skills",
  "https://github.com.example.test/stark-ai-de/agent-skills",
  "https://example.test/github.com/stark-ai-de/agent-skills",
  "https://github.com/stark-ai-de/agent-skills/extra",
  "https://user@github.com/stark-ai-de/agent-skills",
  "https://github.com/stark-ai-de/agent-skills?ref=main",
]) {
  assert.equal(
    githubRepositorySlug(invalidRepository),
    undefined,
    `lookalike or non-canonical repository URL was accepted: ${invalidRepository}`,
  );
}

const sharedPaths = listingArtifactPaths(identity);
const releasePaths = pluginArtifactPaths(repoRoot);
for (const key of [
  "listing",
  "worksheet",
  "firstPublication",
  "portableTarget",
  "retiredOpenAiAdapter",
  "marketplaceName",
  "marketplaceDisplayName",
  "adapterFixtureName",
  "adapterFixtureDisplayName",
]) {
  assert.equal(releasePaths[key], sharedPaths[key], `release derivation drifted for ${key}`);
}

const siteListingSource = fs.readFileSync(
  path.join(repoRoot, "site/src/lib/plugin-listing.ts"),
  "utf8",
);
assert.equal(siteListingSource.includes("function githubRepositorySlug"), false);
assert.match(siteListingSource, /listingArtifactPaths/);
assert.equal(
  releasePublicRepositoryUrl({ repository: "git+https://github.com/stark-ai-de/agent-skills.git" }),
  "https://github.com/stark-ai-de/agent-skills",
);
assert.equal(
  releaseGithubRepositorySlug({
    repository: "git+https://github.com/stark-ai-de/agent-skills.git",
  }),
  "stark-ai-de/agent-skills",
);

console.log("Listing identity and catalog derivation fixtures passed.");
