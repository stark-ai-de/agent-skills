import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { configureForwardManifest, FORWARD_RELEASE } from "../release/prepare-forward-release.mjs";

// Exercise the actual isolated library graph without credentials or network requests.
const toolDirectory = process.argv[2];
assert.ok(toolDirectory && path.isAbsolute(toolDirectory), "Pass the installed tool directory");
const toolRequire = createRequire(path.join(toolDirectory, "package.json"));
const library = toolRequire("release-please");
const libraryRequire = createRequire(toolRequire.resolve("release-please/package.json"));
const repositoryRoot = new URL("../../", import.meta.url);

const cases = [
  [
    "pinned library loads under the repository runtime",
    () => {
      assert.equal(library.VERSION, FORWARD_RELEASE.libraryVersion);
    },
  ],
  [
    "REST requests retain path escaping and query parameters",
    async () => {
      let requests = 0;
      const { Octokit } = libraryRequire("@octokit/rest");
      const octokit = new Octokit({
        request: {
          fetch: async (url, options) => {
            requests++;
            const target = new URL(url);
            assert.equal(target.origin, "https://api.github.com");
            assert.equal(target.pathname, "/repos/fixture-owner/fixture%20repo/issues");
            assert.equal(target.searchParams.get("state"), "open");
            assert.equal(target.searchParams.get("per_page"), "2");
            assert.equal(options.method, "GET");
            return new Response("[]", { headers: { "content-type": "application/json" } });
          },
        },
      });
      const result = await octokit.issues.listForRepo({
        owner: "fixture-owner",
        repo: "fixture repo",
        state: "open",
        per_page: 2,
      });
      assert.deepEqual(result.data, []);
      assert.equal(requests, 1);
    },
  ],
  [
    "GraphQL requests retain their method and variables",
    async () => {
      let requests = 0;
      const { graphql } = libraryRequire("@octokit/graphql");
      const query =
        "query Repo($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { name } }";
      const result = await graphql(query, {
        owner: "fixture-owner",
        name: "fixture repo",
        request: {
          fetch: async (url, options) => {
            requests++;
            assert.equal(url, "https://api.github.com/graphql");
            assert.equal(options.method, "POST");
            assert.deepEqual(JSON.parse(options.body), {
              query,
              variables: { owner: "fixture-owner", name: "fixture repo" },
            });
            return new Response(
              JSON.stringify({ data: { repository: { name: "fixture repo" } } }),
              {
                headers: { "content-type": "application/json" },
              },
            );
          },
        },
      });
      assert.equal(result.repository.name, "fixture repo");
      assert.equal(requests, 1);
    },
  ],
  [
    "package normalization accepts valid versions and rejects invalid ones",
    () => {
      let dependencyRequire = libraryRequire;
      for (const dependency of [
        "conventional-changelog-writer",
        "meow",
        "read-pkg-up",
        "read-pkg",
      ]) {
        dependencyRequire = createRequire(dependencyRequire.resolve(dependency));
      }
      const normalize = dependencyRequire("normalize-package-data");
      const data = { name: "forward-release-fixture", version: "v1.2.3", private: true };
      normalize(data, true);
      assert.equal(data.version, "1.2.3");
      assert.throws(() => normalize({ ...data, version: "invalid" }, true), /Invalid version/);
    },
  ],
  [
    "actual Manifest parsing supports the bounded forward baseline",
    async () => {
      const readPaths = [];
      const github = {
        getFileJson: async (file, branch) => {
          assert.equal(branch, "main");
          assert.ok(["release-please-config.json", ".release-please-manifest.json"].includes(file));
          readPaths.push(file);
          // Keep this incident fixture valid after a future root release advances the real manifest.
          if (file === ".release-please-manifest.json") {
            return { ".": FORWARD_RELEASE.abandonedVersion };
          }
          return JSON.parse(fs.readFileSync(new URL(file, repositoryRoot), "utf8"));
        },
      };
      const manifest = await library.Manifest.fromManifest(github, "main");
      assert.equal(manifest.releasedVersions["."].toString(), FORWARD_RELEASE.abandonedVersion);
      configureForwardManifest(manifest, library);
      assert.equal(manifest.releasedVersions["."].toString(), FORWARD_RELEASE.baselineVersion);
      assert.equal(manifest.repositoryConfig["."].releaseAs, FORWARD_RELEASE.nextVersion);
      assert.equal(manifest.repositoryConfig["."].skipGithubRelease, true);
      assert.deepEqual(readPaths.sort(), [
        ".release-please-manifest.json",
        "release-please-config.json",
      ]);
    },
  ],
];

for (const [name, run] of cases) {
  try {
    await run();
  } catch (error) {
    throw new Error(`Forward release installation failed: ${name}`, { cause: error });
  }
}
console.log(
  `Actual forward release library contracts passed: ${cases.length} cases (offline fixtures).`,
);
