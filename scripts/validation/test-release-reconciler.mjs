import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyReleaseReconciliation,
  classifyReleaseAsset,
  planReleaseReconciliation,
  releaseAssetCreatedAfterPublication,
  releaseAssetCreatedBeforePublication,
  releaseAssetNamesForTag,
  releaseMutationAllowed,
  resolveTagCommit,
} from "../lib/github-release-reconciliation.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tag = "v0.21.0";
const releaseSha = "a".repeat(40);
const expectedRelease = {
  title: tag,
  bodySha256: "c".repeat(64),
  prerelease: false,
};

const assets = (openai = "exact", portable = "exact", subject = "exact") => ({
  "openai.zip": { status: openai },
  "portable.zip": { status: portable },
  "release-subject.json": { status: subject },
});

const release = ({
  draft = true,
  immutable = false,
  title = expectedRelease.title,
  bodySha256 = expectedRelease.bodySha256,
  prerelease = expectedRelease.prerelease,
  openai,
  portable,
  subject,
  metadataAssetAddedAfterPublication = false,
  zipAssetsCreatedBeforePublication = false,
  unexpectedAssetNames = [],
} = {}) => ({
  id: 42,
  tagName: tag,
  title,
  bodySha256,
  prerelease,
  draft,
  immutable,
  stateChangedAt: "2026-08-26T12:00:00.000Z",
  assets: assets(openai, portable, subject),
  metadataAssetAddedAfterPublication,
  zipAssetsCreatedBeforePublication,
  unexpectedAssetNames,
});

const plan = (overrides = {}) => {
  const releaseValue = Object.hasOwn(overrides, "release") ? overrides.release : null;
  const normalizedOverrides = { ...overrides };
  if (normalizedOverrides.tagCommit && !Object.hasOwn(normalizedOverrides, "tagAnnotated")) {
    normalizedOverrides.tagAnnotated = true;
  }
  return planReleaseReconciliation({
    tag,
    releaseSha,
    expectedRelease,
    tagCommit: null,
    release: null,
    attestationStatus: "missing",
    latestRelease:
      releaseValue && releaseValue.draft === false
        ? { id: releaseValue.id, tagName: releaseValue.tagName }
        : null,
    ...normalizedOverrides,
  });
};

const expectedAsset = { bytes: 128, sha256: "b".repeat(64) };
const uploadedAsset = {
  id: 1,
  state: "uploaded",
  size: 128,
  digest: `sha256:${expectedAsset.sha256}`,
};
assert.deepEqual(classifyReleaseAsset({ asset: uploadedAsset, expected: expectedAsset }), {
  status: "exact",
});
assert.equal(
  classifyReleaseAsset({
    asset: { ...uploadedAsset, size: 127 },
    expected: expectedAsset,
  }).reason,
  "asset_size_mismatch",
);
assert.equal(
  classifyReleaseAsset({
    asset: { ...uploadedAsset, digest: `sha256:${"c".repeat(64)}` },
    expected: expectedAsset,
  }).reason,
  "asset_digest_mismatch",
);
const noApiDigest = { ...uploadedAsset, digest: null };
assert.equal(
  classifyReleaseAsset({ asset: noApiDigest, expected: expectedAsset }).status,
  "download_required",
);
assert.equal(
  classifyReleaseAsset({
    asset: noApiDigest,
    expected: expectedAsset,
    downloaded: { bytes: 128, sha256: expectedAsset.sha256 },
  }).status,
  "exact",
);
assert.equal(
  classifyReleaseAsset({
    asset: noApiDigest,
    expected: expectedAsset,
    downloaded: { bytes: 128, sha256: "d".repeat(64) },
  }).reason,
  "downloaded_asset_mismatch",
);
assert.equal(
  resolveTagCommit({ type: "commit", sha: releaseSha }, () => null),
  releaseSha,
);
assert.equal(
  resolveTagCommit({ type: "tag", sha: "c".repeat(40) }, (tagObjectSha) => {
    assert.equal(tagObjectSha, "c".repeat(40));
    return { type: "commit", sha: releaseSha };
  }),
  releaseSha,
);

assert.deepEqual(
  plan().operations.map((operation) => operation.type),
  ["create_tag", "create_draft", "upload_asset", "upload_asset", "upload_asset", "publish_draft"],
  "fresh publication must create an annotated tag, draft, all three assets, and publish last",
);
assert.equal(plan().requiresAttestation, true);
assert.equal(plan().attestationVerificationRequired, true);
assert.equal(
  plan({ expectedRelease: { ...expectedRelease, title: "v0.20.1" } }).reason,
  "invalid_expected_release_metadata",
);

const tagOnly = plan({ tagCommit: releaseSha });
assert.deepEqual(
  tagOnly.operations.map((operation) => operation.type),
  ["create_draft", "upload_asset", "upload_asset", "upload_asset", "publish_draft"],
);
assert.equal(
  plan({ tagCommit: releaseSha, tagAnnotated: false }).reason,
  "release_tag_must_be_annotated",
  "tag-only recovery must reject a lightweight release tag",
);

const partialDraft = plan({
  tagCommit: releaseSha,
  release: release({ openai: "exact", portable: "missing" }),
});
assert.deepEqual(partialDraft.operations, [
  { type: "upload_asset", name: "portable.zip" },
  { type: "publish_draft" },
]);
assert.equal(partialDraft.reason, "resume_draft_release");

const staleDraft = plan({
  tagCommit: releaseSha,
  release: release({ title: "stale title" }),
  attestationStatus: "valid",
});
assert.deepEqual(staleDraft.operations, [
  { type: "update_draft_metadata" },
  { type: "publish_draft" },
]);
assert.equal(staleDraft.reason, "repair_draft_release_metadata");

const draftWithoutTag = plan({
  release: release({ openai: "exact", portable: "missing" }),
});
assert.deepEqual(draftWithoutTag.operations, [
  { type: "create_tag" },
  { type: "upload_asset", name: "portable.zip" },
  { type: "publish_draft" },
]);

const completedDraft = plan({
  tagCommit: releaseSha,
  release: release(),
  attestationStatus: "valid",
});
assert.deepEqual(completedDraft.operations, [{ type: "publish_draft" }]);
assert.equal(completedDraft.requiresAttestation, false);

const publishedExact = plan({
  tagCommit: releaseSha,
  release: release({ draft: false }),
  attestationStatus: "valid",
});
assert.equal(publishedExact.status, "satisfied");
assert.equal(publishedExact.reason, "published_release_matches");
assert.equal(
  publishedExact.postReleaseDispatchRequired,
  true,
  "a satisfied release without observed evidence must recover the dispatch",
);
assert.equal(
  plan({
    tagCommit: releaseSha,
    release: release({ draft: false }),
    attestationStatus: "valid",
    postReleaseEvidenceDispatched: true,
  }).postReleaseDispatchRequired,
  false,
);

for (const mismatchedPublishedRelease of [
  release({ draft: false, title: "stale title" }),
  release({ draft: false, bodySha256: "d".repeat(64) }),
  release({ draft: false, prerelease: true }),
]) {
  assert.equal(
    plan({
      tagCommit: releaseSha,
      release: mismatchedPublishedRelease,
      attestationStatus: "valid",
    }).reason,
    "published_release_metadata_mismatch",
  );
}
assert.equal(plan({ release: release({ title: null }) }).reason, "unknown_release_metadata");
assert.equal(
  plan({ release: release({ unexpectedAssetNames: ["unexpected.zip"] }) }).reason,
  "unexpected_release_assets:unexpected.zip",
);

const publishedRepair = plan({
  tagCommit: releaseSha,
  release: release({ draft: false, openai: "missing", portable: "exact" }),
  attestationStatus: "valid",
});
assert.equal(publishedRepair.status, "planned");
assert.deepEqual(publishedRepair.operations, [{ type: "upload_asset", name: "openai.zip" }]);
assert.equal(publishedRepair.requiresAttestation, false);
assert.equal(publishedRepair.attestationVerificationRequired, true);

const publishedJsonRepair = plan({
  tagCommit: releaseSha,
  release: release({ draft: false, subject: "missing" }),
  attestationStatus: "valid",
});
assert.equal(publishedJsonRepair.status, "planned");
assert.deepEqual(publishedJsonRepair.operations, [
  { type: "upload_asset", name: "release-subject.json" },
]);
const publishedJsonRepairWithoutAttestation = plan({
  tagCommit: releaseSha,
  release: release({
    draft: false,
    subject: "missing",
    zipAssetsCreatedBeforePublication: true,
  }),
  attestationStatus: "missing",
});
assert.equal(publishedJsonRepairWithoutAttestation.status, "planned");
assert.equal(publishedJsonRepairWithoutAttestation.attestationVerificationRequired, false);
assert.deepEqual(publishedJsonRepairWithoutAttestation.operations, [
  { type: "upload_asset", name: "release-subject.json" },
]);
assert.equal(
  plan({
    tagCommit: releaseSha,
    release: release({ draft: false, subject: "missing" }),
    attestationStatus: "missing",
  }).reason,
  "published_release_json_repair_chronology_ambiguous",
  "JSON-only repair must prove both ZIPs predate publication",
);

assert.equal(
  plan({
    tagCommit: releaseSha,
    release: release({
      draft: false,
      immutable: true,
      openai: "missing",
      portable: "exact",
    }),
    attestationStatus: "valid",
  }).reason,
  "published_release_cannot_accept_missing_assets",
);
assert.equal(
  plan({
    tagCommit: releaseSha,
    release: release({ draft: false, openai: "missing", portable: "exact" }),
    attestationStatus: "missing",
  }).reason,
  "published_release_missing_valid_publish_attestation",
  "published recovery must not create a post-publication attestation",
);
assert.equal(
  plan({
    tagCommit: releaseSha,
    release: release({ draft: false }),
    attestationStatus: "missing",
  }).status,
  "blocked",
);
const completedJsonRepairWithoutAttestation = plan({
  tagCommit: releaseSha,
  release: release({
    draft: false,
    metadataAssetAddedAfterPublication: true,
    zipAssetsCreatedBeforePublication: true,
  }),
  attestationStatus: "missing",
});
assert.equal(completedJsonRepairWithoutAttestation.status, "satisfied");
assert.equal(
  completedJsonRepairWithoutAttestation.reason,
  "published_json_repair_matches_without_publish_attestation",
);
assert.equal(completedJsonRepairWithoutAttestation.postReleaseDispatchRequired, true);
assert.equal(completedJsonRepairWithoutAttestation.attestationVerificationRequired, false);
assert.equal(
  plan({
    tagCommit: releaseSha,
    release: release({
      draft: false,
      metadataAssetAddedAfterPublication: true,
      zipAssetsCreatedBeforePublication: true,
    }),
    attestationStatus: "missing",
    postReleaseEvidenceDispatched: true,
  }).postReleaseDispatchRequired,
  false,
);
assert.equal(
  plan({
    tagCommit: releaseSha,
    release: release({ draft: false }),
    attestationStatus: "valid",
    latestRelease: { id: 99, tagName: "v0.20.1" },
  }).reason,
  "published_release_is_not_latest",
  "a stable target is satisfied only when the latest endpoint identifies it",
);

const legacyTag = "v0.20.1";
const legacyPlan = planReleaseReconciliation({
  tag: legacyTag,
  releaseSha,
  expectedRelease: { ...expectedRelease, title: legacyTag },
  tagCommit: null,
  release: null,
  attestationStatus: "missing",
});
assert.deepEqual(
  legacyPlan.operations.map((operation) => operation.type),
  ["create_tag", "create_draft", "upload_asset", "upload_asset", "publish_draft"],
  "v0.20.1 remains the explicit two-asset legacy boundary",
);
assert.deepEqual(releaseAssetNamesForTag("v0.19.1"), [
  "openai.zip",
  "portable.zip",
  "release-subject.json",
]);
assert.equal(releaseMutationAllowed("v0.19.1"), false);
assert.equal(releaseMutationAllowed("v0.20.0"), false);
assert.equal(releaseMutationAllowed("v0.20.1"), false);
assert.equal(releaseMutationAllowed("v0.21.0"), true);
assert.equal(
  releaseAssetCreatedAfterPublication(
    { created_at: "2026-08-26T12:00:01Z" },
    "2026-08-26T12:00:00Z",
  ),
  true,
);
assert.equal(
  releaseAssetCreatedAfterPublication(
    { created_at: "2026-08-26T12:00:00Z" },
    "2026-08-26T12:00:00Z",
  ),
  false,
  "same-second asset creation is ambiguous and must fail closed",
);
assert.equal(releaseAssetCreatedAfterPublication({}, "2026-08-26T12:00:00Z"), false);
assert.equal(
  releaseAssetCreatedBeforePublication(
    { created_at: "2026-08-26T11:59:59Z" },
    "2026-08-26T12:00:00Z",
  ),
  true,
);
assert.equal(
  releaseAssetCreatedBeforePublication(
    { created_at: "2026-08-26T12:00:00Z" },
    "2026-08-26T12:00:00Z",
  ),
  false,
  "same-second ZIP creation is ambiguous and must fail closed",
);
assert.equal(releaseAssetCreatedBeforePublication({}, "2026-08-26T12:00:00Z"), false);

assert.equal(plan({ tagCommit: "b".repeat(40) }).reason, "tag_points_to_different_commit");
assert.equal(
  plan({
    tagCommit: releaseSha,
    release: release({ openai: "conflict", portable: "exact" }),
  }).reason,
  "release_asset_conflict:openai.zip",
);
assert.equal(plan({ ambiguousRelease: true }).reason, "ambiguous_release_state");
assert.match(plan({ observationError: "api_error" }).reason, /^observation_failed:/);
assert.equal(plan({ attestationStatus: "error" }).reason, "attestation_observation_failed");
assert.equal(plan({ release: { ...release(), draft: null } }).reason, "unknown_release_state");

const retryableUpload = plan({
  tagCommit: releaseSha,
  release: release({ draft: false, openai: "missing", portable: "exact" }),
  attestationStatus: "valid",
});
assert.deepEqual(retryableUpload.operations, [{ type: "upload_asset", name: "openai.zip" }]);
const concurrentUpload = plan({
  tagCommit: releaseSha,
  release: release({ draft: false }),
  attestationStatus: "valid",
});
assert.equal(concurrentUpload.status, "satisfied", "a compatible upload race must converge");
const conflictingUpload = plan({
  tagCommit: releaseSha,
  release: release({ draft: false, openai: "conflict", portable: "exact" }),
  attestationStatus: "valid",
});
assert.equal(conflictingUpload.status, "blocked", "a conflicting upload race must fail closed");

function applySequence(observations, { failOperations = [] } = {}) {
  const remaining = [...observations];
  const executed = [];
  const result = applyReleaseReconciliation({
    tag,
    releaseSha,
    expectedRelease,
    observe: () => {
      assert.ok(remaining.length > 0, "test observation sequence exhausted");
      return remaining.shift();
    },
    execute: (operation) => {
      executed.push(operation);
      if (failOperations.includes(executed.length - 1)) {
        throw new Error("simulated mutation race");
      }
    },
  });
  return { result, executed, remaining };
}

const validObservation = (overrides = {}) => {
  const releaseValue = Object.hasOwn(overrides, "release") ? overrides.release : null;
  const observation = {
    tagCommit: null,
    release: null,
    attestationStatus: "valid",
    latestRelease:
      releaseValue && releaseValue.draft === false
        ? { id: releaseValue.id, tagName: releaseValue.tagName }
        : null,
    ...overrides,
  };
  if (observation.tagCommit && !Object.hasOwn(overrides, "tagAnnotated")) {
    observation.tagAnnotated = true;
  }
  return observation;
};

const freshApply = applySequence([
  validObservation(),
  validObservation({ tagCommit: releaseSha }),
  validObservation({ tagCommit: releaseSha, release: release({ openai: "missing" }) }),
  validObservation({ tagCommit: releaseSha, release: release({ portable: "missing" }) }),
  validObservation({ tagCommit: releaseSha, release: release({ subject: "missing" }) }),
  validObservation({ tagCommit: releaseSha, release: release() }),
  validObservation({ tagCommit: releaseSha, release: release({ draft: false }) }),
]);
assert.deepEqual(
  freshApply.executed.map((operation) => operation.type),
  ["create_tag", "create_draft", "upload_asset", "upload_asset", "upload_asset", "publish_draft"],
);
assert.equal(freshApply.result.status, "satisfied");
assert.equal(freshApply.result.postReleaseDispatchRequired, true);
assert.equal(freshApply.remaining.length, 0);

const metadataRepairApply = applySequence([
  validObservation({
    tagCommit: releaseSha,
    release: release({ title: "stale title" }),
  }),
  validObservation({ tagCommit: releaseSha, release: release() }),
  validObservation({ tagCommit: releaseSha, release: release({ draft: false }) }),
]);
assert.deepEqual(
  metadataRepairApply.executed.map((operation) => operation.type),
  ["update_draft_metadata", "publish_draft"],
);
assert.equal(metadataRepairApply.result.postReleaseDispatchRequired, true);

const jsonRepairWithoutAttestationApply = applySequence([
  validObservation({
    tagCommit: releaseSha,
    release: release({
      draft: false,
      subject: "missing",
      zipAssetsCreatedBeforePublication: true,
    }),
    attestationStatus: "missing",
  }),
  validObservation({
    tagCommit: releaseSha,
    release: release({
      draft: false,
      metadataAssetAddedAfterPublication: true,
      zipAssetsCreatedBeforePublication: true,
    }),
    attestationStatus: "missing",
  }),
]);
assert.deepEqual(jsonRepairWithoutAttestationApply.executed, [
  { type: "upload_asset", name: "release-subject.json" },
]);
assert.equal(jsonRepairWithoutAttestationApply.result.status, "satisfied");
assert.equal(jsonRepairWithoutAttestationApply.result.postReleaseDispatchRequired, true);

assert.throws(
  () =>
    applySequence(
      [
        {
          tagCommit: releaseSha,
          tagAnnotated: true,
          release: release({ draft: false, openai: "missing" }),
          attestationStatus: "valid",
          latestRelease: { id: 42, tagName: tag },
        },
        {
          tagCommit: releaseSha,
          tagAnnotated: true,
          release: release({ draft: false, openai: "missing" }),
          attestationStatus: "valid",
          latestRelease: { id: 42, tagName: tag },
        },
      ],
      { failOperations: [0] },
    ),
  /safely incomplete.*simulated mutation race/,
  "a failed upload with unchanged safe state must remain retryable",
);

const concurrentRepair = applySequence(
  [
    {
      tagCommit: releaseSha,
      tagAnnotated: true,
      release: release({ draft: false, openai: "missing" }),
      attestationStatus: "valid",
      latestRelease: { id: 42, tagName: tag },
    },
    {
      tagCommit: releaseSha,
      tagAnnotated: true,
      release: release({ draft: false }),
      attestationStatus: "valid",
      latestRelease: { id: 42, tagName: tag },
    },
  ],
  { failOperations: [0] },
);
assert.equal(concurrentRepair.result.status, "satisfied");
assert.equal(
  concurrentRepair.result.postReleaseDispatchRequired,
  true,
  "a compatible published-release repair race still requires fresh post-release evidence",
);

assert.throws(
  () =>
    applySequence(
      [
        validObservation({
          tagCommit: releaseSha,
          release: release({ portable: "missing" }),
        }),
        validObservation({
          tagCommit: releaseSha,
          release: release({ portable: "conflict" }),
        }),
      ],
      { failOperations: [0] },
    ),
  /Reconciliation conflict after upload_asset: release_asset_conflict:portable\.zip/,
  "a conflicting upload race must block after fresh observation",
);

let repairConflict;
try {
  applySequence(
    [
      validObservation({
        tagCommit: releaseSha,
        release: release({
          draft: false,
          subject: "missing",
          zipAssetsCreatedBeforePublication: true,
        }),
        attestationStatus: "missing",
      }),
      validObservation({
        tagCommit: releaseSha,
        release: release({
          draft: false,
          subject: "conflict",
          zipAssetsCreatedBeforePublication: true,
        }),
        attestationStatus: "missing",
      }),
    ],
    { failOperations: [0] },
  );
} catch (error) {
  repairConflict = error;
}
assert.match(repairConflict?.message ?? "", /Reconciliation conflict after upload_asset/);
assert.equal(
  repairConflict?.postReleaseDispatchRequired,
  true,
  "a blocked observation after a published repair must retain the evidence-dispatch marker",
);

let observationFailure;
let observationCount = 0;
try {
  applyReleaseReconciliation({
    tag,
    releaseSha,
    expectedRelease,
    observe: () => {
      observationCount += 1;
      if (observationCount === 1) {
        return validObservation({
          tagCommit: releaseSha,
          release: release({ draft: false, openai: "missing" }),
        });
      }
      throw new Error("simulated observation failure");
    },
    execute: () => {},
  });
} catch (error) {
  observationFailure = error;
}
assert.match(observationFailure?.message ?? "", /simulated observation failure/);
assert.equal(
  observationFailure?.postReleaseDispatchRequired,
  true,
  "an observation failure after a published mutation must retain the evidence-dispatch marker",
);

assert.throws(
  () =>
    applyReleaseReconciliation({
      tag,
      releaseSha,
      expectedRelease,
      observe: () => ({
        tagCommit: null,
        release: null,
        attestationStatus: "missing",
      }),
      execute: () => assert.fail("apply must not mutate before attestations exist"),
    }),
  /attestations must exist before apply mode mutates remote state/,
);

const reconcilerSource = fs.readFileSync(
  path.join(repositoryRoot, "scripts/release/reconcile-github-release.mjs"),
  "utf8",
);
const publishWorkflow = fs.readFileSync(
  path.join(repositoryRoot, ".github/workflows/publish-release.yml"),
  "utf8",
);
const postReleaseWorkflow = fs.readFileSync(
  path.join(repositoryRoot, ".github/workflows/post-release-evidence.yml"),
  "utf8",
);
const attestWorkflow = fs.readFileSync(
  path.join(repositoryRoot, ".github/workflows/attest-release.yml"),
  "utf8",
);
assert.doesNotMatch(reconcilerSource, /--clobber/);
assert.doesNotMatch(reconcilerSource, /--mark-latest/);
assert.doesNotMatch(reconcilerSource, /git", \["push"/);
assert.match(reconcilerSource, /repos\/\$\{options\.repository\}\/git\/tags/);
assert.match(reconcilerSource, /repos\/\$\{options\.repository\}\/git\/refs/);
assert.match(reconcilerSource, /tagger\[name\]=github-actions\[bot\]/);
assert.match(reconcilerSource, /"make_latest=true"/);
assert.match(reconcilerSource, /releases\/latest/);
assert.match(reconcilerSource, /eventName === "workflow_dispatch"/);
assert.match(reconcilerSource, /eventName === "push"/);
assert.match(reconcilerSource, /RELEASE_ENVIRONMENT !== "release"/);
assert.match(reconcilerSource, /case "update_draft_metadata"/);
assert.match(reconcilerSource, /bodySha256/);
assert.match(
  reconcilerSource,
  /if \(options\.mode === "plan"\) \{[\s\S]*?const result = plan\(options, observe\(options, localSubjects\), localSubjects\);[\s\S]*?return result;[\s\S]*?\}\n  try \{\n    const result = apply/,
  "plan mode must return before the apply executor is reachable",
);
assert.match(reconcilerSource, /execute: \(operation, observation\) =>/);
assert.match(
  publishWorkflow,
  /Attest release subjects[\s\S]*release_published != 'true'/,
  "Publish Release must never create a new attestation for an already-published release",
);
assert.match(publishWorkflow, /actions: write/);
assert.match(publishWorkflow, /artifact-metadata: write/);
assert.match(
  reconcilerSource,
  /catch \(error\) \{[\s\S]*?appendGithubOutput\(options\.githubOutput,[\s\S]*?postReleaseDispatchRequired: error\.postReleaseDispatchRequired === true/,
  "apply failures must persist the evidence-dispatch marker to GitHub outputs",
);
assert.match(
  publishWorkflow,
  /always\(\) && steps\.reconciliation-apply\.outputs\.post_release_dispatch_required == 'true'[\s\S]*gh workflow run post-release-evidence\.yml[\s\S]*--ref main[\s\S]*-f "tag=/,
  "Publish Release must explicitly dispatch protected-main post-release evidence",
);
assert.doesNotMatch(postReleaseWorkflow, /\n  release:\n/);
assert.doesNotMatch(attestWorkflow, /\n  release:\n/);
assert.equal(
  publishWorkflow.match(/reconcile-github-release\.mjs plan/g)?.length,
  2,
  "dry-run/readiness and apply jobs must independently plan current remote state",
);
assert.equal(publishWorkflow.match(/reconcile-github-release\.mjs apply/g)?.length, 1);

console.log("GitHub release reconciliation state-machine fixtures passed.");
