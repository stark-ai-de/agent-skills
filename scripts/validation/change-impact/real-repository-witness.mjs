import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";

// Explicit qualification, outside offline CI: shallow checkouts may lack these
// objects. Only these fixed, independently inspected pure Git blobs are loaded.
const repo = path.resolve(process.argv[2] ?? ".");
const base = "7b7962a912b5f4b086c0ad0c889f40395c51518a";
const head = "c08079fe29df7c9ced3d86f1f7d8df3dcd67c586";
const sourcePath = "scripts/lib/release-management.mjs";
async function load(revision) {
  const source = execFileSync(
    "git",
    [
      "--no-lazy-fetch",
      "--no-replace-objects",
      "-c",
      "core.fsmonitor=false",
      "-C",
      repo,
      "show",
      `${revision}:${sourcePath}`,
    ],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10000,
      maxBuffer: 262144,
      env: { ...process.env, GIT_NO_LAZY_FETCH: "1", GIT_OPTIONAL_LOCKS: "0" },
    },
  );
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}
const before = await load(base),
  after = await load(head);
const candidateSha = "a".repeat(40),
  mainSha = "b".repeat(40),
  unrelatedSha = "c".repeat(40);
const identical = {
  candidateSha,
  branch: { protected: true, commit: { sha: candidateSha } },
  comparison: {
    status: "identical",
    ahead_by: 0,
    behind_by: 0,
    total_commits: 0,
    base_commit: { sha: candidateSha },
    merge_base_commit: { sha: candidateSha },
    commits: [],
  },
};
const advanced = {
  candidateSha,
  branch: { protected: true, commit: { sha: mainSha } },
  comparison: {
    status: "ahead",
    ahead_by: 1,
    behind_by: 0,
    total_commits: 1,
    base_commit: { sha: candidateSha },
    merge_base_commit: { sha: candidateSha },
    commits: [{ sha: mainSha }],
  },
};
const headError = "comparison head is not the observed main revision";
assert.deepEqual(before.mainCandidateContainmentErrors(identical), [headError]);
assert.deepEqual(before.mainCandidateContainmentErrors(advanced), [headError]);
assert.deepEqual(after.mainCandidateContainmentErrors(identical), []);
assert.deepEqual(after.mainCandidateContainmentErrors(advanced), []);
assert.ok(
  after
    .mainCandidateContainmentErrors({
      ...advanced,
      comparison: { ...advanced.comparison, commits: [{ sha: unrelatedSha }] },
    })
    .includes(headError),
);
assert.ok(
  after
    .mainCandidateContainmentErrors({
      ...advanced,
      comparison: { ...advanced.comparison, merge_base_commit: { sha: unrelatedSha } },
    })
    .includes("comparison merge base is not the release candidate"),
);
assert.ok(
  after
    .mainCandidateContainmentErrors({
      ...advanced,
      comparison: { ...advanced.comparison, ahead_by: 2 },
    })
    .includes("comparison distance is inconsistent with an advanced main revision"),
);
assert.ok(
  after
    .mainCandidateContainmentErrors({
      ...identical,
      comparison: { ...identical.comparison, ahead_by: 1 },
    })
    .includes("comparison distance is inconsistent with identical revisions"),
);
console.log(
  JSON.stringify(
    {
      base,
      head,
      sourcePath,
      status: "passed",
      assertions: 8,
      proof: "Pure historical containment-validator behavior; no network or publication.",
    },
    null,
    2,
  ),
);
