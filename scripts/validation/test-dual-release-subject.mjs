import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { load as loadYaml } from "js-yaml";

import { RELEASE_ZIP_ASSET_NAMES, releaseAssetNamesForTag } from "../lib/release-assets.mjs";
import { planReleaseReconciliation } from "../lib/github-release-reconciliation.mjs";
import {
  createReleaseSubject,
  normalizeReleaseSubject,
  sha256File,
} from "../lib/release-subject.mjs";
import { validateReleaseSubjectDocument } from "../lib/release-subject-validation.mjs";
import { listingForOpenAiIdentity } from "../lib/openai-profiles.mjs";
import { buildOpenAiReleasePlan } from "../release/reconcile-openai-plugin-issue.mjs";
import {
  evaluateReleaseCompletion,
  RELEASE_COMPLETION_ASSETS,
} from "../lib/release-completion.mjs";

const root = process.cwd();
const schemaPath = path.join(
  root,
  "skill-evals/stark-ai-developer/evidence/release-subject.schema.json",
);
const receiptSchemaPath = path.join(
  root,
  "skill-evals/stark-ai-developer/evidence/post-release-receipt.schema.json",
);
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "dual-release-subject-"));
const archive = (name, content) => {
  const file = path.join(directory, name);
  fs.writeFileSync(file, content);
  return { sha256: sha256File(file), bytes: fs.statSync(file).size };
};

try {
  const skills = archive("openai-skills-only.zip", "skills-only package");
  const tools = archive("openai-tools.zip", "remote-mcp package");
  const portable = archive("portable.zip", "portable package");
  const skillsOnlyProfile = {
    profile: "existing-skills-only",
    pluginId: "stark-ai-developer",
    version: "1.19.6",
    displayName: "stark AI Developer",
    transport: "none",
    archive: "dist/openai/stark-ai-developer-1.19.6.zip",
    listingUrl: "https://chatgpt.com/plugins/plugins_6a85d98a7bc48191879aedd91610271e",
  };
  const openaiProfile = {
    profile: "new-remote",
    pluginId: "stark-ai-developer-tools",
    version: "1.1.6",
    displayName: "stark AI Developer Tools",
    transport: "http",
    archive: "dist/openai/stark-ai-developer-tools-1.1.6.zip",
    url: "https://skills-mcp.stark-ai.de/mcp",
    listingUrl: "https://chatgpt.com/plugins/plugin_asdk_app_6ad281cbc9a481919d8d5e123985ddc8",
  };
  const doc = createReleaseSubject({
    status: "pass",
    sourceRevision: { commit: "a".repeat(40), tag: "v0.32.0", state: "clean" },
    releaseVersion: "0.32.0",
    pluginVersion: "1.19.6",
    archiveProfile: "zip-store-v1",
    openaiProfile,
    skillsOnlyProfile,
    openai: tools,
    skillsOnly: skills,
    portable,
  });
  const errors = (value) =>
    validateReleaseSubjectDocument(value, { schemaPath, subjectDirectory: directory });
  assert.equal(doc.schemaVersion, 2);
  assert.deepEqual(errors(doc), []);
  assert.deepEqual(normalizeReleaseSubject(doc), doc);
  assert.deepEqual(releaseAssetNamesForTag("v0.20.1"), ["openai.zip", "portable.zip"]);
  assert.deepEqual(releaseAssetNamesForTag("v0.31.0"), [
    "openai.zip",
    "portable.zip",
    "release-subject.json",
  ]);
  assert.deepEqual(releaseAssetNamesForTag("v0.32.0"), [
    "openai-skills-only.zip",
    "openai-tools.zip",
    "portable.zip",
    "release-subject.json",
  ]);
  const planArgs = {
    tag: "v0.32.0",
    releaseSha: "a".repeat(40),
    expectedRelease: { title: "v0.32.0", bodySha256: "c".repeat(64), prerelease: false },
    attestationStatus: "missing",
  };
  const initialPlan = planReleaseReconciliation(planArgs);
  assert.equal(initialPlan.status, "planned");
  assert.equal(initialPlan.operations.filter((op) => op.type === "upload_asset").length, 4);
  assert.equal(
    planReleaseReconciliation({
      ...planArgs,
      requiredAssetNames: ["openai-tools.zip", "portable.zip"],
    }).status,
    "blocked",
    "a reduced asset set cannot weaken the release gate",
  );
  const published = {
    id: 42,
    tagName: "v0.32.0",
    draft: false,
    immutable: false,
    title: "v0.32.0",
    bodySha256: "c".repeat(64),
    prerelease: false,
    stateChangedAt: "2026-10-28T10:00:00Z",
    unexpectedAssetNames: [],
    zipAssetsCreatedBeforePublication: true,
    metadataAssetAddedAfterPublication: true,
    assets: Object.fromEntries(
      releaseAssetNamesForTag("v0.32.0").map((name) => [name, { status: "exact" }]),
    ),
  };
  const withoutAttestations = planReleaseReconciliation({
    ...planArgs,
    tagCommit: "a".repeat(40),
    tagAnnotated: true,
    release: published,
    latestRelease: { id: 42, tagName: "v0.32.0" },
  });
  assert.equal(
    withoutAttestations.status,
    "blocked",
    "the old two-ZIP JSON repair exception must not cover three ZIPs",
  );
  const listing = JSON.parse(
    fs.readFileSync(path.join(root, "docs/listing/openai/stark-ai-developer.json"), "utf8"),
  );
  const syntheticSkillsOnlyListing = {
    ...listing,
    plugin: { ...listing.plugin, version: skillsOnlyProfile.version },
  };
  assert.deepEqual(RELEASE_COMPLETION_ASSETS, [...RELEASE_ZIP_ASSET_NAMES, "release-subject.json"]);
  const release = {
    tag_name: "v0.32.0",
    assets: Object.values(doc.subjects).map((item) => ({
      name: item.name,
      digest: `sha256:${item.sha256}`,
      browser_download_url: `https://github.com/example/project/releases/download/v0.32.0/${item.name}`,
    })),
  };
  for (const [profile, profileId, expectedAsset] of [
    [skillsOnlyProfile, "existing-skills-only", "openai-skills-only.zip"],
    [openaiProfile, "new-remote", "openai-tools.zip"],
  ]) {
    const context = {
      repository: "example/project",
      tag: "v0.32.0",
      releaseSha: "a".repeat(40),
      release,
      listing: listingForOpenAiIdentity(syntheticSkillsOnlyListing, profile),
      subject: doc,
      issues: [],
      profileId,
    };
    const handoff = buildOpenAiReleasePlan(context);
    assert.equal(handoff.status, "create");
    assert.ok(handoff.body.includes(expectedAsset));
    assert.ok(handoff.body.includes(profile.listingUrl));
    assert.ok(handoff.body.includes(profile.pluginId));
    assert.throws(
      () =>
        buildOpenAiReleasePlan({
          ...context,
          profileId: profileId === "new-remote" ? "existing-skills-only" : "new-remote",
        }),
      /does not match listing/,
    );
  }
  const assetRows = Object.values(doc.subjects).map((item) => ({
    name: item.name,
    size: item.bytes,
    digest: `sha256:${item.sha256}`,
    created_at: "2026-10-28T12:00:01Z",
  }));
  assetRows.push({ name: "release-subject.json", size: 1, created_at: "2026-10-28T12:00:01Z" });
  const observation = {
    release: {
      id: 1,
      tag_name: "v0.32.0",
      draft: false,
      prerelease: false,
      assets: assetRows,
      created_at: "2026-10-28T12:00:00Z",
    },
    subject: doc,
    tag: { annotated: true, commit: "a".repeat(40) },
    pullRequest: { labels: ["autorelease: tagged"] },
    issues: [],
    evidenceRuns: [
      {
        id: 1,
        displayTitle: "Post-release Evidence · v0.32.0",
        event: "workflow_dispatch",
        headBranch: "main",
        status: "completed",
        conclusion: "success",
        createdAt: "2026-10-28T12:00:02Z",
      },
    ],
  };
  for (const profile of [skillsOnlyProfile, openaiProfile]) {
    const expected = {
      repository: "example/project",
      tag: "v0.32.0",
      releaseSha: "a".repeat(40),
      releasePullRequest: "1",
      handoff: {
        profileId: profile.profile,
        marker: `<!-- openai-plugin-release:${profile.pluginId}@${profile.version} -->`,
        status: "noop",
        reason: "plugin_version_unchanged",
        pluginVersionChanged: false,
      },
    };
    assert.equal(evaluateReleaseCompletion(observation, expected).status, "success");
    const wrong = structuredClone(expected);
    wrong.handoff.profileId =
      profile.profile === "new-remote" ? "existing-skills-only" : "new-remote";
    assert.equal(evaluateReleaseCompletion(observation, wrong).reason, "openai_handoff_invalid");
    const missing = structuredClone(observation);
    missing.release.assets = missing.release.assets.filter(
      (item) => item.name !== "openai-skills-only.zip",
    );
    assert.equal(evaluateReleaseCompletion(missing, expected).reason, "release_asset_set_mismatch");
  }
  const workflow = loadYaml(
    fs.readFileSync(path.join(root, ".github/workflows/post-release-evidence.yml"), "utf8"),
  );
  const receiptStep = workflow.jobs.verify.steps.find((step) =>
    step.name?.includes("Write sanitized post-release receipt"),
  );
  assert.ok(receiptStep?.run, "the workflow receipt step must exist");
  const workflowExpressions = {
    "inputs.tag": "v0.32.0",
    "github.event_name": "workflow_dispatch",
    "github.repository": "example/project",
    "steps.release.outputs.release_sha": "a".repeat(40),
    "steps.release.outputs.package_status": "pass",
    "steps.release.outputs.openai_sha": tools.sha256,
    "steps.release.outputs.skills_only_sha": skills.sha256,
    "steps.release.outputs.portable_sha": portable.sha256,
    "steps.release.outputs.openai_bytes": String(tools.bytes),
    "steps.release.outputs.skills_only_bytes": String(skills.bytes),
    "steps.release.outputs.portable_bytes": String(portable.bytes),
    "steps.assets.outputs.status": "pass",
    "steps.assets.outputs.published_openai_sha": tools.sha256,
    "steps.assets.outputs.published_skills_only_sha": skills.sha256,
    "steps.assets.outputs.published_portable_sha": portable.sha256,
    "steps.attestation.outputs.status": "verified",
    "steps.verifier.outputs.verifier_sha": "b".repeat(40),
    "steps.verifier.outputs.verifier_ref":
      "example/project/.github/workflows/post-release-evidence.yml@refs/heads/main",
    "steps.verifier.outputs.protected_default_branch": "true",
  };
  const fixtureEnvironment = { ...process.env, GITHUB_REPOSITORY: "example/project" };
  const expandWorkflowEnvironment = (values) => {
    for (const [name, template] of Object.entries(values ?? {})) {
      fixtureEnvironment[name] = template.replace(/\$\{\{\s*([^}]+?)\s*\}\}/g, (_, expression) => {
        assert.ok(
          expression in workflowExpressions,
          `fixture value missing for workflow expression: ${expression}`,
        );
        return workflowExpressions[expression];
      });
    }
  };
  expandWorkflowEnvironment(workflow.jobs.verify.env);
  expandWorkflowEnvironment(receiptStep.env);
  const workflowFixture = path.join(directory, "workflow-receipt");
  fs.mkdirSync(workflowFixture);
  fs.symlinkSync(path.join(root, "scripts"), path.join(workflowFixture, "scripts"), "dir");
  const workflowReceiptPath = path.join(workflowFixture, "post-release-receipt.json");
  fixtureEnvironment.GITHUB_OUTPUT = path.join(workflowFixture, "github-output");
  fs.writeFileSync(fixtureEnvironment.GITHUB_OUTPUT, "");
  assert.equal(fixtureEnvironment.SKILLS_ONLY_SHA, skills.sha256);
  assert.equal(fixtureEnvironment.SKILLS_ONLY_BYTES, String(skills.bytes));
  assert.equal(fixtureEnvironment.PUBLISHED_SKILLS_ONLY_SHA, skills.sha256);
  const workflowRun = spawnSync("bash", ["-euo", "pipefail", "-c", receiptStep.run], {
    cwd: workflowFixture,
    env: fixtureEnvironment,
    encoding: "utf8",
  });
  assert.equal(workflowRun.status, 0, workflowRun.stderr || workflowRun.stdout);
  const validateReceipt = (receipt, name) => {
    const candidatePath = path.join(workflowFixture, `${name}.json`);
    fs.writeFileSync(candidatePath, JSON.stringify(receipt));
    return spawnSync(
      process.execPath,
      [
        path.join(root, "scripts/release/validate-post-release-receipt.mjs"),
        "--schema",
        receiptSchemaPath,
        "--file",
        candidatePath,
      ],
      { cwd: workflowFixture, env: fixtureEnvironment, encoding: "utf8" },
    );
  };
  const workflowReceipt = JSON.parse(fs.readFileSync(workflowReceiptPath, "utf8"));
  assert.equal(workflowReceipt.status, "pass");
  assert.deepEqual(
    workflowReceipt.artifacts.map(({ name, sha256, publishedSha256, bytes }) => ({
      name,
      sha256,
      publishedSha256,
      bytes,
    })),
    [
      {
        name: "openai-skills-only.zip",
        sha256: skills.sha256,
        publishedSha256: skills.sha256,
        bytes: skills.bytes,
      },
      {
        name: "openai-tools.zip",
        sha256: tools.sha256,
        publishedSha256: tools.sha256,
        bytes: tools.bytes,
      },
      {
        name: "portable.zip",
        sha256: portable.sha256,
        publishedSha256: portable.sha256,
        bytes: portable.bytes,
      },
    ],
  );
  assert.deepEqual(workflowReceipt.attestation.subjects, [
    { name: "openai-skills-only.zip", sha256: skills.sha256 },
    { name: "openai-tools.zip", sha256: tools.sha256 },
    { name: "portable.zip", sha256: portable.sha256 },
  ]);
  const validReceiptValidation = validateReceipt(workflowReceipt, "valid-three-zip");
  assert.equal(validReceiptValidation.status, 0, validReceiptValidation.stderr);
  const invalidWorkflowReceipt = (mutate, label) => {
    const candidate = structuredClone(workflowReceipt);
    mutate(candidate);
    assert.notEqual(validateReceipt(candidate, label).status, 0, label);
  };
  invalidWorkflowReceipt((candidate) => {
    candidate.artifacts.pop();
  }, "missing-archive-artifact");
  invalidWorkflowReceipt((candidate) => {
    candidate.artifacts.push(structuredClone(candidate.artifacts[0]));
  }, "duplicate-archive-artifact");
  invalidWorkflowReceipt((candidate) => {
    [candidate.artifacts[0].name, candidate.artifacts[1].name] = [
      candidate.artifacts[1].name,
      candidate.artifacts[0].name,
    ];
  }, "swapped-archive-artifacts");
  invalidWorkflowReceipt((candidate) => {
    candidate.attestation.subjects.pop();
  }, "missing-attestation-subject");
  invalidWorkflowReceipt((candidate) => {
    candidate.attestation.subjects.push(structuredClone(candidate.attestation.subjects[0]));
  }, "duplicate-attestation-subject");
  invalidWorkflowReceipt((candidate) => {
    [candidate.attestation.subjects[0].name, candidate.attestation.subjects[1].name] = [
      candidate.attestation.subjects[1].name,
      candidate.attestation.subjects[0].name,
    ];
  }, "swapped-attestation-subjects");
  invalidWorkflowReceipt((candidate) => {
    candidate.attestation.subjects[0].sha256 = "f".repeat(64);
  }, "mismatched-attestation-digest");
  const receiptFile = path.join(directory, "receipt.json");
  const env = {
    ...process.env,
    RECEIPT_TAG: "v0.32.0",
    SOURCE_COMMIT: "a".repeat(40),
    REPOSITORY: "example/project",
    SIGNER_WORKFLOW: "example/project/.github/workflows/publish-release.yml",
    SIGNER_DIGEST: "a".repeat(40),
    SOURCE_REF: "refs/heads/main",
    OPENAI_SHA: tools.sha256,
    OPENAI_BYTES: String(tools.bytes),
    SKILLS_ONLY_SHA: skills.sha256,
    SKILLS_ONLY_BYTES: String(skills.bytes),
    PORTABLE_SHA: portable.sha256,
    PORTABLE_BYTES: String(portable.bytes),
  };
  execFileSync(
    process.execPath,
    [
      "scripts/release/render-post-release-receipt.mjs",
      "--render",
      "pre_release_archive",
      "--file",
      receiptFile,
    ],
    { cwd: root, env },
  );
  execFileSync(
    process.execPath,
    ["scripts/release/validate-post-release-receipt.mjs", "--file", receiptFile],
    { cwd: root, env },
  );
  const receipt = JSON.parse(fs.readFileSync(receiptFile, "utf8"));
  receipt.artifacts = receipt.artifacts.filter((item) => item.name !== "openai-skills-only.zip");
  fs.writeFileSync(receiptFile, JSON.stringify(receipt));
  assert.notEqual(
    spawnSync(
      process.execPath,
      ["scripts/release/validate-post-release-receipt.mjs", "--file", receiptFile],
      { cwd: root, env },
    ).status,
    0,
    "an attested receipt cannot omit one profile",
  );

  const invalid = (mutate, description) => {
    const candidate = structuredClone(doc);
    mutate(candidate);
    assert.notEqual(errors(candidate).length, 0, description);
  };
  invalid((d) => {
    delete d.subjects.openaiSkillsOnly;
  }, "both profile subjects are required");
  invalid((d) => {
    d.subjects.openaiSkillsOnly.name = d.subjects.openai.name;
  }, "archive names cannot be swapped or duplicated");
  invalid((d) => {
    d.subjects.openai.sha256 = "b".repeat(64);
  }, "changed package bytes are rejected");
  invalid((d) => {
    d.openaiProfile.pluginId = skillsOnlyProfile.pluginId;
  }, "profile identities cannot be swapped");
  invalid((d) => {
    d.openaiSkillsOnlyProfile.transport = "http";
  }, "skills-only cannot silently become MCP");
  invalid((d) => {
    d.openaiSkillsOnlyProfile.version = "1.19.5";
  }, "skills-only version must match the bundled release version");
  invalid((d) => {
    d.openaiSkillsOnlyProfile.listingUrl = openaiProfile.listingUrl;
  }, "portal targets must remain distinct");
  const downgraded = structuredClone(doc);
  downgraded.schemaVersion = 1;
  delete downgraded.subjects.openaiSkillsOnly;
  delete downgraded.openaiSkillsOnlyProfile;
  downgraded.subjects.openai.name = "openai.zip";
  assert.notEqual(
    errors(downgraded).length,
    0,
    "a dual-profile release cannot use the legacy subject schema",
  );
  console.log("Dual-profile release subject and legacy asset fixtures passed.");
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
