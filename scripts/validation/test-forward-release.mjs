import assert from "node:assert/strict";
import fs from "node:fs";
// Execute this contract suite as a plain script under the repository Bun runtime.
const cases = [];
function test(name, run) {
  cases.push({ name, run });
}

import {
  configureForwardManifest,
  FORWARD_RELEASE as config,
  githubReader,
  prepareForwardRelease,
  verifyForwardState,
} from "../release/prepare-forward-release.mjs";

const prefix = `repos/${config.repository}`;
const candidateSha = "a".repeat(40);
function fixture() {
  return {
    [`${prefix}/branches/main`]: { protected: true, commit: { sha: candidateSha } },
    [`${prefix}/compare/${config.abandonedSha}...${candidateSha}`]: { status: "ahead" },
    [`${prefix}/releases/latest`]: { tag_name: "v0.25.1", draft: false, prerelease: false },
    [`${prefix}/git/ref/tags/v0.25.1`]: { object: { type: "commit", sha: config.baselineSha } },
    [`${prefix}/git/ref/tags/v0.25.2`]: null,
    [`${prefix}/releases/tags/v0.25.2`]: null,
    [`${prefix}/git/ref/tags/v0.25.3`]: null,
    [`${prefix}/releases/tags/v0.25.3`]: null,
    [`${prefix}/pulls/118`]: {
      state: "closed",
      merged_at: "2026-09-28T14:39:08Z",
      merge_commit_sha: config.abandonedSha,
      base: { ref: "main" },
      title: "chore(release): release 0.25.2",
      labels: [],
    },
  };
}
async function verify(state = fixture(), overrides = {}) {
  return verifyForwardState({
    read: async (endpoint) => {
      assert.ok(Object.hasOwn(state, endpoint), `unmocked endpoint: ${endpoint}`);
      return state[endpoint];
    },
    candidateSha,
    rootPackage: { version: "0.25.2" },
    manifest: { ".": "0.25.2" },
    ...overrides,
  });
}

test("exact unpublished incident with a retired pending label is eligible", async () => verify());
test("annotated baseline tag is peeled before comparison", async () => {
  const state = fixture();
  state[`${prefix}/git/ref/tags/v0.25.1`].object = { type: "tag", sha: "b".repeat(40) };
  state[`${prefix}/git/tags/${"b".repeat(40)}`] = {
    object: { type: "commit", sha: config.baselineSha },
  };
  await verify(state);
});
for (const [name, mutate] of [
  [
    "unprotected main",
    (s) => {
      s[`${prefix}/branches/main`].protected = false;
    },
  ],
  [
    "moved main",
    (s) => {
      s[`${prefix}/branches/main`].commit.sha = "b".repeat(40);
    },
  ],
  [
    "diverged history",
    (s) => {
      s[`${prefix}/compare/${config.abandonedSha}...${candidateSha}`].status = "diverged";
    },
  ],
  [
    "new latest release",
    (s) => {
      s[`${prefix}/releases/latest`].tag_name = "v0.25.3";
    },
  ],
  [
    "draft baseline",
    (s) => {
      s[`${prefix}/releases/latest`].draft = true;
    },
  ],
  [
    "prerelease baseline",
    (s) => {
      s[`${prefix}/releases/latest`].prerelease = true;
    },
  ],
  [
    "retargeted baseline",
    (s) => {
      s[`${prefix}/git/ref/tags/v0.25.1`].object.sha = candidateSha;
    },
  ],
  [
    "unmerged origin",
    (s) => {
      s[`${prefix}/pulls/118`].merged_at = null;
    },
  ],
  [
    "wrong origin commit",
    (s) => {
      s[`${prefix}/pulls/118`].merge_commit_sha = candidateSha;
    },
  ],
  [
    "wrong origin title",
    (s) => {
      s[`${prefix}/pulls/118`].title = "unrelated";
    },
  ],
  [
    "pending origin",
    (s) => {
      s[`${prefix}/pulls/118`].labels = [{ name: "autorelease: pending" }];
    },
  ],
  [
    "falsely tagged origin",
    (s) => {
      s[`${prefix}/pulls/118`].labels = [{ name: "autorelease: tagged" }];
    },
  ],
]) {
  test(`rejects ${name}`, async () => {
    const state = fixture();
    mutate(state);
    await assert.rejects(verify(state));
  });
}
for (const version of ["0.25.2", "0.25.3"]) {
  for (const resource of ["git/ref/tags", "releases/tags"]) {
    test(`rejects existing ${resource}/v${version}`, async () => {
      const state = fixture();
      state[`${prefix}/${resource}/v${version}`] = {};
      await assert.rejects(verify(state));
    });
  }
}
test("forward lane cannot be reused after the root manifest advances", async () => {
  await assert.rejects(verify(fixture(), { manifest: { ".": "0.25.3" } }));
  await assert.rejects(verify(fixture(), { rootPackage: { version: "0.25.3" } }));
});
for (const status of [401, 403, 429, 500]) {
  test(`HTTP ${status} is not absence`, async () => {
    const read = githubReader("test", async () => ({ status, ok: false }));
    await assert.rejects(read(`${prefix}/releases/tags/v0.25.2`, true));
  });
}
test("only optional 404 is absence and all probes are GET-only", async () => {
  const read = githubReader("test", async (url, options) => {
    assert.equal(options.method, "GET");
    assert.equal(options.redirect, "error");
    assert.ok(url.startsWith(`https://api.github.com/${prefix}/`));
    return { status: 404, ok: false };
  });
  assert.equal(await read(`${prefix}/releases/tags/v0.25.2`, true), null);
  await assert.rejects(read(`${prefix}/branches/main`));
  await assert.rejects(read("repos/another/repo/releases/latest", true));
});
test("network errors fail closed", async () => {
  const read = githubReader("test", async () => {
    throw new Error("network");
  });
  await assert.rejects(read(`${prefix}/releases/tags/v0.25.2`, true), /network/);
});

class FixtureVersion {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
  static parse(value) {
    return new FixtureVersion(value);
  }
}

function producer() {
  const calls = [];
  const pull = {
    title: "chore(release): release 0.25.3",
    version: "0.25.3",
    draft: true,
    headRefName: "release-please--branches--main--components--agent-skills",
  };
  const manifest = {
    repositoryConfig: {
      ".": { releaseType: "node", changelogType: "github", skipGithubRelease: true },
    },
    releasedVersions: { ".": FixtureVersion.parse("0.25.2") },
    buildPullRequests: async () => {
      calls.push("plan");
      return [{ pullRequest: pull }];
    },
    createPullRequests: async () => {
      calls.push("create-pr");
      return [{ number: 119 }];
    },
    createReleases: async () => {
      throw new Error("publication is forbidden");
    },
  };
  const library = {
    VERSION: "17.6.0",
    Manifest: {
      fromManifest: async (...args) => {
        assert.deepEqual(args.slice(1), [
          "main",
          "release-please-config.json",
          ".release-please-manifest.json",
        ]);
        return manifest;
      },
    },
  };
  return {
    calls,
    pull,
    manifest,
    library,
    github: {},
    verify: async () => {
      calls.push("verify");
    },
  };
}
test("default plan is read-only and preserves source manifest path", async () => {
  const p = producer();
  await prepareForwardRelease(p);
  assert.deepEqual(p.calls, ["verify", "plan", "verify"]);
  assert.equal(p.manifest.releasedVersions["."].toString(), "0.25.1");
  assert.equal(p.manifest.repositoryConfig["."].releaseAs, "0.25.3");
});
test("apply delegates only PR generation after two fresh checks", async () => {
  const p = producer();
  assert.equal((await prepareForwardRelease({ ...p, apply: true })).number, 119);
  assert.deepEqual(p.calls, ["verify", "plan", "verify", "create-pr"]);
});
test("dependency drift cannot activate the override", () => {
  const p = producer();
  p.library.VERSION = "18.0.0";
  assert.throws(() => configureForwardManifest(p.manifest, p.library));
});
test("unsafe producer configuration fails closed", () => {
  const p = producer();
  p.manifest.repositoryConfig["."].skipGithubRelease = false;
  assert.throws(() => configureForwardManifest(p.manifest, p.library));
});
test("unexpected generated candidate is not written", async () => {
  const p = producer();
  p.pull.draft = false;
  await assert.rejects(prepareForwardRelease({ ...p, apply: true }));
  assert.ok(!p.calls.includes("create-pr"));
});
test("state drift after preview blocks creation", async () => {
  const p = producer();
  let checks = 0;
  p.verify = async () => {
    if (++checks === 2) throw new Error("main moved");
  };
  await assert.rejects(prepareForwardRelease({ ...p, apply: true }), /main moved/);
  assert.ok(!p.calls.includes("create-pr"));
});
test("workflow isolates bootstrap and leaves normal preparation available", () => {
  const workflow = fs.readFileSync(
    new URL("../../.github/workflows/release-please.yml", import.meta.url),
    "utf8",
  );
  assert.ok(workflow.includes('manifest_version}" = "0.25.2"'));
  assert.ok(workflow.includes("googleapis/release-please-action@v5"));
  assert.ok(workflow.indexOf("--preflight") < workflow.indexOf("id: app-token"));
  assert.ok(workflow.indexOf("--ignore-scripts") < workflow.indexOf("id: app-token"));
  assert.ok(workflow.indexOf("--plan") > workflow.indexOf("id: app-token"));
  const preview = workflow.slice(
    workflow.indexOf("- name: 🔎 Preview forward release without writes"),
    workflow.indexOf("- name: 📝 Create forward release PR"),
  );
  assert.ok(preview.includes("GH_TOKEN: ${{ steps.app-token.outputs.token }}"));
  assert.ok(preview.includes("bun --bun scripts/release/prepare-forward-release.mjs --plan"));
  assert.ok(!workflow.includes("environment: release"));
  assert.ok(workflow.includes("client-id: ${{ vars.RELEASE_PLEASE_APP_CLIENT_ID }}"));
});

test("preview is permitted before retiring the pending release, but apply is not", async () => {
  const state = fixture();
  state[`${prefix}/pulls/118`].labels = [{ name: "autorelease: pending" }];
  await verify(state, { allowPending: true });
  await assert.rejects(verify(state));
});
test("upstream entry point need not export Version", async () => {
  const p = producer();
  assert.equal(Object.hasOwn(p.library, "Version"), false);
  await prepareForwardRelease(p);
  assert.equal(p.manifest.releasedVersions["."].toString(), "0.25.1");
});
test("a wrong-cased skipGitHubRelease field cannot replace the upstream contract", () => {
  const p = producer();
  p.manifest.repositoryConfig["."].skipGitHubRelease = true;
  delete p.manifest.repositoryConfig["."].skipGithubRelease;
  assert.throws(() => configureForwardManifest(p.manifest, p.library));
});

test("temporary dependency installation retains the supply-chain policy", () => {
  const workflow = fs.readFileSync(
    new URL("../../.github/workflows/release-please.yml", import.meta.url),
    "utf8",
  );
  for (const policy of [
    "strictDepBuilds: true",
    "blockExoticSubdeps: true",
    "minimumReleaseAge: 1440",
    "minimumReleaseAgeStrict: true",
    "trustPolicy: no-downgrade",
  ]) {
    assert.ok(workflow.includes(policy));
  }
});

for (const { name, run } of cases) {
  try {
    await run();
  } catch (error) {
    throw new Error(`Forward release contract failed: ${name}`, { cause: error });
  }
}
console.log(`Forward release preparation contracts passed: ${cases.length} cases.`);
