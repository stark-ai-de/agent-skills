import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  _internal,
  createGitHubValidationTaskStore,
  localControlPlaneIdentity,
  materializeCanonicalTaskBundle,
  packCanonicalTaskBundle,
  taskArtifactName,
  TASK_BUNDLE_FILE,
} from "./github-validation-task-store.mjs";

const SHA = `sha256:${"a".repeat(64)}`;
const CREATED_AT = "2026-08-13T12:00:00.000Z";

function gitBlobSha(bytes) {
  return crypto
    .createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`))
    .update(bytes)
    .digest("hex");
}

function response(body, status = 200, headers = {}) {
  return new Response(
    typeof body === "string" || body instanceof Uint8Array ? body : JSON.stringify(body),
    {
      status,
      headers,
    },
  );
}

function receipt(overrides = {}) {
  return {
    schemaVersion: 1,
    proofLevel: "diagnostic",
    kind: "result",
    gateId: "skills",
    taskKey: SHA,
    source: {
      repository: "example/repository",
      workflowPath: ".github/workflows/validate.yml",
      workflowDigest: SHA,
      controlPlaneDigest: SHA,
      runId: "101",
      runAttempt: "2",
      jobId: "303",
      jobName: "Gate / skills",
      jobConclusion: "success",
      artifactName: `validation-task-v1-skills-${"a".repeat(64)}-101-2`,
      event: "workflow_dispatch",
      ref: "refs/heads/feature",
      sha: "b".repeat(40),
      createdAt: CREATED_AT,
    },
    ...overrides,
  };
}

function locator(document = receipt()) {
  return {
    kind: "github-artifact",
    id: "404",
    name: document.source.artifactName,
    digest: SHA,
    size: 123,
    repository: document.source.repository,
    runId: document.source.runId,
    runAttempt: document.source.runAttempt,
    jobId: document.source.jobId,
    jobName: document.source.jobName,
  };
}

function githubFixture({
  artifactCount = 1,
  document = receipt(),
  archiveDocument = document,
  runStatus = "completed",
  runConclusion = "success",
  headRepository = document.source.repository,
  runHeadSha = document.source.sha,
  pullRequests = [],
  producerCommit = { sha: document.source.sha, parents: [] },
} = {}) {
  const requests = [];
  const artifact = {
    id: 404,
    name: document.source.artifactName,
    size_in_bytes: 123,
    digest: SHA,
    expired: false,
    created_at: CREATED_AT,
    workflow_run: {
      id: 101,
      repository_id: 501,
      head_repository_id: headRepository === document.source.repository ? 501 : 502,
      head_sha: runHeadSha,
      head_branch: "feature",
    },
  };
  const fetchImpl = async (url) => {
    const pathname = new URL(url).pathname;
    const search = new URL(url).search;
    requests.push(`${pathname}${search}`);
    if (pathname.endsWith("/actions/artifacts") && search) {
      return response({ total_count: artifactCount, artifacts: artifactCount ? [artifact] : [] });
    }
    if (pathname.endsWith("/actions/artifacts/404")) return response(artifact);
    if (pathname.endsWith("/actions/runs/101")) {
      return response({
        id: 101,
        run_attempt: 2,
        status: runStatus,
        conclusion: runConclusion,
        event: document.source.event,
        head_branch: "feature",
        head_sha: runHeadSha,
        path: document.source.workflowPath,
        pull_requests: pullRequests,
        repository: { id: 501, full_name: document.source.repository },
        head_repository: {
          id: headRepository === document.source.repository ? 501 : 502,
          full_name: headRepository,
        },
      });
    }
    if (pathname.endsWith("/actions/runs/101/attempts/2/jobs")) {
      return response({
        total_count: 1,
        jobs: [
          {
            id: 303,
            check_run_url: "https://api.github.com/repos/example/repository/check-runs/303",
            name: document.source.jobName,
            status: "completed",
            conclusion: document.source.jobConclusion,
          },
        ],
      });
    }
    throw new Error(`Unexpected request: ${pathname}${search}`);
  };
  const archive = {
    async inspect() {
      return {
        digest: SHA,
        size: 123,
        receipt: structuredClone(archiveDocument),
        bundle: { schemaVersion: 1, bundleDigest: SHA },
      };
    },
    async restore() {
      return { digest: SHA, fileCount: 1 };
    },
  };
  const verifyProducerControlPlane = async () => ({
    workflowDigest: document.source.workflowDigest,
    controlPlaneDigest: document.source.controlPlaneDigest,
    commit: producerCommit,
  });
  return { artifact, archive, fetchImpl, requests, verifyProducerControlPlane };
}

function remoteControlPlaneSetup(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "github-control-plane-negative-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".github/workflows"), { recursive: true });
  fs.mkdirSync(path.join(root, "scripts/ci"), { recursive: true });
  const workflowBytes = Buffer.from("name: Validate\n");
  const scriptBytes = Buffer.from("export const value = 1;\n");
  fs.writeFileSync(path.join(root, ".github/workflows/validate.yml"), workflowBytes);
  fs.writeFileSync(path.join(root, "scripts/ci/example.mjs"), scriptBytes);
  const identity = localControlPlaneIdentity(root);
  const document = receipt();
  document.source.workflowDigest = identity.workflowDigest;
  document.source.controlPlaneDigest = identity.controlPlaneDigest;
  const fixture = githubFixture({ document });
  const treeShas = ["1", "2", "3", "4", "5"].map((value) => value.repeat(40));
  const workflowSha = gitBlobSha(workflowBytes);
  const scriptSha = gitBlobSha(scriptBytes);
  const gitDocuments = new Map([
    [
      `/git/commits/${document.source.sha}`,
      { sha: document.source.sha, tree: { sha: treeShas[0] }, parents: [] },
    ],
    [
      `/git/trees/${treeShas[0]}`,
      {
        sha: treeShas[0],
        truncated: false,
        tree: [
          { path: ".github", mode: "040000", type: "tree", sha: treeShas[1] },
          { path: "scripts", mode: "040000", type: "tree", sha: treeShas[3] },
        ],
      },
    ],
    [
      `/git/trees/${treeShas[1]}`,
      {
        sha: treeShas[1],
        truncated: false,
        tree: [{ path: "workflows", mode: "040000", type: "tree", sha: treeShas[2] }],
      },
    ],
    [
      `/git/trees/${treeShas[2]}`,
      {
        sha: treeShas[2],
        truncated: false,
        tree: [
          {
            path: "validate.yml",
            mode: "100644",
            type: "blob",
            sha: workflowSha,
            size: workflowBytes.length,
          },
        ],
      },
    ],
    [
      `/git/trees/${treeShas[3]}`,
      {
        sha: treeShas[3],
        truncated: false,
        tree: [{ path: "ci", mode: "040000", type: "tree", sha: treeShas[4] }],
      },
    ],
    [
      `/git/trees/${treeShas[4]}`,
      {
        sha: treeShas[4],
        truncated: false,
        tree: [
          {
            path: "example.mjs",
            mode: "100644",
            type: "blob",
            sha: scriptSha,
            size: scriptBytes.length,
          },
        ],
      },
    ],
    [
      `/git/blobs/${workflowSha}`,
      {
        sha: workflowSha,
        encoding: "base64",
        size: workflowBytes.length,
        content: workflowBytes.toString("base64"),
      },
    ],
    [
      `/git/blobs/${scriptSha}`,
      {
        sha: scriptSha,
        encoding: "base64",
        size: scriptBytes.length,
        content: scriptBytes.toString("base64"),
      },
    ],
  ]);
  const makeStore = (documents = gitDocuments) => {
    const fetchImpl = async (url) => {
      const parsed = new URL(url);
      const marker = "/repos/example/repository";
      const endpoint = parsed.pathname.slice(parsed.pathname.indexOf(marker) + marker.length);
      if (documents.has(endpoint)) return response(documents.get(endpoint));
      return await fixture.fetchImpl(url);
    };
    return createGitHubValidationTaskStore({
      repository: "example/repository",
      token: "test-token",
      fetchImpl,
      archive: fixture.archive,
    });
  };
  const verification = {
    locator: locator(document),
    receipt: document,
    trustContext: {
      repository: document.source.repository,
      workflowPath: document.source.workflowPath,
      workflowDigest: identity.workflowDigest,
      controlPlaneDigest: identity.controlPlaneDigest,
    },
  };
  return { document, gitDocuments, makeStore, treeShas, workflowSha, verification };
}

test("authoritative verification correlates the exact artifact, run, job, and archived receipt", async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "github-task-store-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const document = receipt();
  const fixture = githubFixture({ document });
  const store = createGitHubValidationTaskStore({
    repository: "example/repository",
    token: "test-token",
    indexFile: path.join(root, "index.json"),
    fetchImpl: fixture.fetchImpl,
    archive: fixture.archive,
    verifyProducerControlPlane: fixture.verifyProducerControlPlane,
  });

  const verified = await store.verify({
    locator: locator(document),
    receipt: document,
    trustContext: {
      repository: document.source.repository,
      workflowPath: document.source.workflowPath,
      workflowDigest: document.source.workflowDigest,
      controlPlaneDigest: document.source.controlPlaneDigest,
    },
  });

  assert.equal(verified.verified, true);
  assert.equal(verified.jobConclusion, "success");
  assert.deepEqual(verified.artifact, {
    id: "404",
    name: document.source.artifactName,
    digest: SHA,
    size: 123,
    expired: false,
    createdAt: CREATED_AT,
  });
  assert.ok(fixture.requests.some((request) => request.endsWith("/actions/runs/101")));
  assert.ok(
    fixture.requests.some((request) => request.includes("/actions/runs/101/attempts/2/jobs")),
  );
});

test("pull-request verification binds the artifact head to the exact merge candidate", async () => {
  const headSha = "c".repeat(40);
  const baseSha = "d".repeat(40);
  const mergeSha = "e".repeat(40);
  const document = receipt();
  document.source.event = "pull_request";
  document.source.ref = "refs/pull/52/merge";
  document.source.sha = mergeSha;
  const pullRequests = [
    {
      number: 52,
      head: { sha: "f".repeat(40), repo: { id: 501 } },
      base: { sha: "a".repeat(40), repo: { id: 501 } },
    },
  ];
  const options = {
    document,
    runHeadSha: headSha,
    pullRequests,
    producerCommit: { sha: mergeSha, parents: [baseSha, headSha] },
  };
  const fixture = githubFixture(options);
  const store = createGitHubValidationTaskStore({
    repository: "example/repository",
    token: "test-token",
    fetchImpl: fixture.fetchImpl,
    archive: fixture.archive,
    verifyProducerControlPlane: fixture.verifyProducerControlPlane,
  });
  const verification = {
    locator: locator(document),
    receipt: document,
    trustContext: {
      repository: document.source.repository,
      workflowPath: document.source.workflowPath,
      workflowDigest: document.source.workflowDigest,
      controlPlaneDigest: document.source.controlPlaneDigest,
    },
  };

  const verified = await store.verify(verification);
  assert.equal(verified.verified, true);
  assert.equal(verified.sha, mergeSha);

  const contradictory = githubFixture({
    ...options,
    producerCommit: { sha: mergeSha, parents: [baseSha, "f".repeat(40)] },
  });
  await assert.rejects(
    createGitHubValidationTaskStore({
      repository: "example/repository",
      token: "test-token",
      fetchImpl: contradictory.fetchImpl,
      archive: contradictory.archive,
      verifyProducerControlPlane: contradictory.verifyProducerControlPlane,
    }).verify(verification),
    /merge candidate parents are contradictory/,
  );
});

test("verification rejects a producer outside the current workflow digest trust boundary", async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "github-task-store-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const document = receipt();
  const fixture = githubFixture({ document });
  const store = createGitHubValidationTaskStore({
    repository: "example/repository",
    token: "test-token",
    indexFile: path.join(root, "index.json"),
    fetchImpl: fixture.fetchImpl,
    archive: fixture.archive,
    verifyProducerControlPlane: fixture.verifyProducerControlPlane,
  });

  await assert.rejects(
    store.verify({
      locator: locator(document),
      receipt: document,
      trustContext: {
        repository: document.source.repository,
        workflowPath: document.source.workflowPath,
        workflowDigest: `sha256:${"b".repeat(64)}`,
        controlPlaneDigest: document.source.controlPlaneDigest,
      },
    }),
    /workflowDigest.*trust context/,
  );
});

test("verification rejects a cancelled or incomplete producer job", async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "github-task-store-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const document = receipt();
  const fixture = githubFixture({ document });
  const originalFetch = fixture.fetchImpl;
  const fetchImpl = async (url) => {
    if (new URL(url).pathname.endsWith("/actions/runs/101/attempts/2/jobs")) {
      return response({
        total_count: 1,
        jobs: [
          {
            id: 303,
            check_run_url: "https://api.github.com/repos/example/repository/check-runs/303",
            name: document.source.jobName,
            status: "completed",
            conclusion: "cancelled",
          },
        ],
      });
    }
    return await originalFetch(url);
  };
  const store = createGitHubValidationTaskStore({
    repository: "example/repository",
    token: "test-token",
    indexFile: path.join(root, "index.json"),
    fetchImpl,
    archive: fixture.archive,
    verifyProducerControlPlane: fixture.verifyProducerControlPlane,
  });

  await assert.rejects(
    store.verify({
      locator: locator(document),
      receipt: document,
      trustContext: {
        repository: document.source.repository,
        workflowPath: document.source.workflowPath,
        workflowDigest: document.source.workflowDigest,
        controlPlaneDigest: document.source.controlPlaneDigest,
      },
    }),
    /job conclusion.*contradictory/,
  );
});

test("verification accepts a successful producer job from a safely failed workflow run", async () => {
  const document = receipt();
  const fixture = githubFixture({ document, runConclusion: "failure" });
  const store = createGitHubValidationTaskStore({
    repository: "example/repository",
    token: "test-token",
    fetchImpl: fixture.fetchImpl,
    archive: fixture.archive,
    verifyProducerControlPlane: fixture.verifyProducerControlPlane,
  });
  const verified = await store.verify({
    locator: locator(document),
    receipt: document,
    trustContext: {
      repository: document.source.repository,
      workflowPath: document.source.workflowPath,
      workflowDigest: document.source.workflowDigest,
      controlPlaneDigest: document.source.controlPlaneDigest,
    },
  });
  assert.equal(verified.jobConclusion, "success");
});

test("verification rejects a producer whose head repository is outside the repository", async () => {
  const document = receipt();
  const fixture = githubFixture({ document, headRepository: "fork/repository" });
  const store = createGitHubValidationTaskStore({
    repository: "example/repository",
    token: "test-token",
    fetchImpl: fixture.fetchImpl,
    archive: fixture.archive,
    verifyProducerControlPlane: fixture.verifyProducerControlPlane,
  });
  await assert.rejects(
    store.verify({
      locator: locator(document),
      receipt: document,
      trustContext: {
        repository: document.source.repository,
        workflowPath: document.source.workflowPath,
        workflowDigest: document.source.workflowDigest,
        controlPlaneDigest: document.source.controlPlaneDigest,
      },
    }),
    /repository identity is contradictory/,
  );
});

test("only the explicitly identified current run may still be in progress", async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "github-task-store-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const document = receipt();
  const fixture = githubFixture({
    document,
    runStatus: "in_progress",
    runConclusion: null,
  });
  const options = {
    repository: "example/repository",
    token: "test-token",
    indexFile: path.join(root, "index.json"),
    fetchImpl: fixture.fetchImpl,
    archive: fixture.archive,
    verifyProducerControlPlane: fixture.verifyProducerControlPlane,
  };
  const verification = {
    locator: locator(document),
    receipt: document,
    trustContext: {
      repository: document.source.repository,
      workflowPath: document.source.workflowPath,
      workflowDigest: document.source.workflowDigest,
      controlPlaneDigest: document.source.controlPlaneDigest,
    },
  };

  await assert.rejects(
    createGitHubValidationTaskStore(options).verify(verification),
    /not safely completed/,
  );
  const current = createGitHubValidationTaskStore({ ...options, currentRunId: "101" });
  assert.equal((await current.verify(verification)).verified, true);
  await assert.rejects(
    createGitHubValidationTaskStore({ ...options, currentRunId: "999" }).verify(verification),
    /not safely completed/,
  );
});

test("verification hard-fails when the authoritative artifact contains another receipt", async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "github-task-store-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const document = receipt();
  const fixture = githubFixture({
    document,
    archiveDocument: receipt({ gateId: "actions" }),
  });
  const store = createGitHubValidationTaskStore({
    repository: "example/repository",
    token: "test-token",
    indexFile: path.join(root, "index.json"),
    fetchImpl: fixture.fetchImpl,
    archive: fixture.archive,
    verifyProducerControlPlane: fixture.verifyProducerControlPlane,
  });

  await assert.rejects(
    store.verify({
      locator: locator(document),
      receipt: document,
      trustContext: {
        repository: document.source.repository,
        workflowPath: document.source.workflowPath,
        workflowDigest: document.source.workflowDigest,
        controlPlaneDigest: document.source.controlPlaneDigest,
      },
    }),
    /archived receipt contradicts/i,
  );
});

test("producer control-plane verification walks bounded non-recursive Git trees", async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "github-control-plane-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".github/workflows"), { recursive: true });
  fs.mkdirSync(path.join(root, "scripts/ci"), { recursive: true });
  const workflowBytes = Buffer.from("name: Validate\n");
  const scriptBytes = Buffer.from("export const value = 1;\n");
  fs.writeFileSync(path.join(root, ".github/workflows/validate.yml"), workflowBytes);
  fs.writeFileSync(path.join(root, "scripts/ci/example.mjs"), scriptBytes);
  const identity = localControlPlaneIdentity(root);
  const document = receipt();
  document.source.workflowDigest = identity.workflowDigest;
  document.source.controlPlaneDigest = identity.controlPlaneDigest;
  const fixture = githubFixture({ document });
  const treeShas = ["1", "2", "3", "4", "5"].map((value) => value.repeat(40));
  const workflowSha = gitBlobSha(workflowBytes);
  const scriptSha = gitBlobSha(scriptBytes);
  const gitDocuments = new Map([
    [
      `/git/commits/${document.source.sha}`,
      { sha: document.source.sha, tree: { sha: treeShas[0] }, parents: [] },
    ],
    [
      `/git/trees/${treeShas[0]}`,
      {
        sha: treeShas[0],
        truncated: false,
        tree: [
          { path: ".github", mode: "040000", type: "tree", sha: treeShas[1] },
          { path: "scripts", mode: "040000", type: "tree", sha: treeShas[3] },
        ],
      },
    ],
    [
      `/git/trees/${treeShas[1]}`,
      {
        sha: treeShas[1],
        truncated: false,
        tree: [{ path: "workflows", mode: "040000", type: "tree", sha: treeShas[2] }],
      },
    ],
    [
      `/git/trees/${treeShas[2]}`,
      {
        sha: treeShas[2],
        truncated: false,
        tree: [
          {
            path: "validate.yml",
            mode: "100644",
            type: "blob",
            sha: workflowSha,
            size: workflowBytes.length,
          },
        ],
      },
    ],
    [
      `/git/trees/${treeShas[3]}`,
      {
        sha: treeShas[3],
        truncated: false,
        tree: [{ path: "ci", mode: "040000", type: "tree", sha: treeShas[4] }],
      },
    ],
    [
      `/git/trees/${treeShas[4]}`,
      {
        sha: treeShas[4],
        truncated: false,
        tree: [
          {
            path: "example.mjs",
            mode: "100644",
            type: "blob",
            sha: scriptSha,
            size: scriptBytes.length,
          },
        ],
      },
    ],
    [
      `/git/blobs/${workflowSha}`,
      {
        sha: workflowSha,
        encoding: "base64",
        size: workflowBytes.length,
        content: workflowBytes.toString("base64"),
      },
    ],
    [
      `/git/blobs/${scriptSha}`,
      {
        sha: scriptSha,
        encoding: "base64",
        size: scriptBytes.length,
        content: scriptBytes.toString("base64"),
      },
    ],
  ]);
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    const marker = "/repos/example/repository";
    const endpoint = parsed.pathname.slice(parsed.pathname.indexOf(marker) + marker.length);
    if (gitDocuments.has(endpoint)) return response(gitDocuments.get(endpoint));
    return await fixture.fetchImpl(url);
  };
  const store = createGitHubValidationTaskStore({
    repository: "example/repository",
    token: "test-token",
    fetchImpl,
    archive: fixture.archive,
  });
  const verified = await store.verify({
    locator: locator(document),
    receipt: document,
    trustContext: {
      repository: document.source.repository,
      workflowPath: document.source.workflowPath,
      workflowDigest: identity.workflowDigest,
      controlPlaneDigest: identity.controlPlaneDigest,
    },
  });
  assert.equal(verified.verified, true);
  assert.equal(
    fixture.requests.some((request) => request.includes("recursive=1")),
    false,
  );
});

test("producer control-plane verification rejects truncated trees and object contradictions", async (context) => {
  const fixture = remoteControlPlaneSetup(context);
  const cases = [
    {
      label: "truncated tree",
      mutate(documents) {
        documents.set(`/git/trees/${fixture.treeShas[0]}`, {
          ...documents.get(`/git/trees/${fixture.treeShas[0]}`),
          truncated: true,
        });
      },
      pattern: /truncated or malformed/,
    },
    {
      label: "blob SHA",
      mutate(documents) {
        documents.set(`/git/blobs/${fixture.workflowSha}`, {
          ...documents.get(`/git/blobs/${fixture.workflowSha}`),
          sha: "f".repeat(40),
        });
      },
      pattern: /blob is malformed/,
    },
    {
      label: "base64 size",
      mutate(documents) {
        documents.set(`/git/blobs/${fixture.workflowSha}`, {
          ...documents.get(`/git/blobs/${fixture.workflowSha}`),
          content: "not-base64",
        });
      },
      pattern: /blob bytes are contradictory/,
    },
    {
      label: "symlink",
      mutate(documents) {
        const key = `/git/trees/${fixture.treeShas[4]}`;
        const value = structuredClone(documents.get(key));
        value.tree[0].mode = "120000";
        documents.set(key, value);
      },
      pattern: /entry is unsupported/,
    },
    {
      label: "submodule",
      mutate(documents) {
        const key = `/git/trees/${fixture.treeShas[4]}`;
        const value = structuredClone(documents.get(key));
        value.tree[0].mode = "160000";
        value.tree[0].type = "commit";
        documents.set(key, value);
      },
      pattern: /entry is unsupported/,
    },
  ];
  for (const item of cases) {
    const documents = new Map(
      [...fixture.gitDocuments].map(([key, value]) => [key, structuredClone(value)]),
    );
    item.mutate(documents);
    await assert.rejects(
      fixture.makeStore(documents).verify(fixture.verification),
      item.pattern,
      item.label,
    );
  }
});

test("GitHub store enforces the absolute lookup deadline", async () => {
  const store = createGitHubValidationTaskStore({
    repository: "example/repository",
    token: "test-token",
    fetchImpl: async (_url, { signal }) =>
      await new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      }),
    archive: { inspect: async () => assert.fail("deadline must stop before archive inspection") },
  });
  await assert.rejects(
    store.lookup({
      repositoryIdentity: "example/repository",
      gateId: "skills",
      taskKey: SHA,
      deadline: new Date(Date.now() - 1).toISOString(),
    }),
    (error) => error?.code === "ERR_STORE_UNAVAILABLE",
  );
});

test("GitHub store keeps the absolute deadline active while reading a response body", async () => {
  const store = createGitHubValidationTaskStore({
    repository: "example/repository",
    token: "test-token",
    fetchImpl: async (_url, { signal }) => ({
      status: 200,
      ok: true,
      async json() {
        await new Promise((_resolve, reject) => {
          const rejectOnAbort = () => reject(signal.reason);
          if (signal.aborted) rejectOnAbort();
          else signal.addEventListener("abort", rejectOnAbort, { once: true });
        });
      },
    }),
    archive: { inspect: async () => assert.fail("deadline must stop before archive inspection") },
  });
  await assert.rejects(
    store.lookup({
      repositoryIdentity: "example/repository",
      gateId: "skills",
      taskKey: SHA,
      deadline: new Date(Date.now() + 10).toISOString(),
    }),
    (error) => error?.code === "ERR_STORE_UNAVAILABLE",
  );
});

test("publish writes only a locator index and lookup treats it as a candidate, not proof", async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "github-task-store-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const document = receipt();
  const fixture = githubFixture({ artifactCount: 0, document });
  const indexFile = path.join(root, "index.json");
  const store = createGitHubValidationTaskStore({
    repository: "example/repository",
    token: "test-token",
    indexFile,
    fetchImpl: fixture.fetchImpl,
    archive: fixture.archive,
    verifyProducerControlPlane: fixture.verifyProducerControlPlane,
  });

  const published = await store.publish({
    receipt: document,
    locator: locator(document),
    bundleDigest: SHA,
    verifiedMetadata: { verified: true },
  });
  assert.deepEqual(published, locator(document));
  const index = JSON.parse(fs.readFileSync(indexFile, "utf8"));
  assert.deepEqual(Object.keys(index.observations[0]).sort(), [
    "gateId",
    "locator",
    "publishedAt",
    "receipt",
    "repositoryIdentity",
    "taskKey",
  ]);

  const found = await store.lookup({
    repositoryIdentity: "example/repository",
    gateId: "skills",
    taskKey: SHA,
  });
  assert.equal(found.complete, true);
  assert.equal(found.observations.length, 1);
  assert.equal(found.observations[0].locator.id, "404");
  assert.equal(found.observations[0].observedAt, CREATED_AT);
});

test("lookup discards a poisoned hint and applies the bounded total order and limit", async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "github-task-store-order-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const documents = [
    ["401", "100", "2"],
    ["402", "101", "1"],
    ["403", "101", "2"],
  ].map(([id, runId, runAttempt]) => {
    const document = receipt();
    document.source.runId = runId;
    document.source.runAttempt = runAttempt;
    document.source.artifactName = taskArtifactName("skills", SHA, runId, runAttempt);
    return {
      artifact: {
        id: Number(id),
        name: document.source.artifactName,
        size_in_bytes: 123,
        digest: SHA,
        expired: false,
        created_at: CREATED_AT,
      },
      document,
    };
  });
  const indexFile = path.join(root, "index.json");
  fs.writeFileSync(
    indexFile,
    `${JSON.stringify({
      schemaVersion: 1,
      observations: [
        {
          repositoryIdentity: "example/repository",
          gateId: "skills",
          taskKey: SHA,
          receipt: receipt(),
          locator: { id: "999" },
        },
      ],
    })}\n`,
  );
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/actions/artifacts")) {
      return response({
        total_count: documents.length,
        artifacts: documents.map(({ artifact }) => artifact),
      });
    }
    if (parsed.pathname.endsWith("/actions/artifacts/999")) return response({}, 404);
    throw new Error(`Unexpected request: ${url}`);
  };
  const store = createGitHubValidationTaskStore({
    repository: "example/repository",
    token: "test-token",
    indexFile,
    fetchImpl,
    archive: {
      async inspect({ artifact }) {
        const match = documents.find((item) => item.artifact.id === artifact.id);
        return { digest: SHA, size: 123, receipt: match.document, bundle: {} };
      },
    },
  });
  const found = await store.lookup({
    repositoryIdentity: "example/repository",
    gateId: "skills",
    taskKey: SHA,
    limit: 2,
  });
  assert.deepEqual(
    found.observations.map(({ locator: value }) => value.id),
    ["403", "402"],
  );
});

test("lookup stops at the 1000-artifact bound and safely returns a miss", async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "github-task-store-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const fetchImpl = async (url) => {
    const page = Number(new URL(url).searchParams.get("page"));
    return response({
      total_count: 1001,
      artifacts: Array.from({ length: 100 }, (_, index) => ({
        id: (page - 1) * 100 + index + 1,
        name: "unrelated",
      })),
    });
  };
  const store = createGitHubValidationTaskStore({
    repository: "example/repository",
    token: "test-token",
    indexFile: path.join(root, "index.json"),
    fetchImpl,
    archive: { inspect: async () => assert.fail("unrelated artifacts must not be downloaded") },
  });

  const found = await store.lookup({
    repositoryIdentity: "example/repository",
    gateId: "skills",
    taskKey: SHA,
  });
  assert.equal(found.complete, true);
  assert.deepEqual(found.observations, []);
});

test("archive paths reject traversal, ambiguity, and undeclared top-level content", () => {
  for (const candidate of ["../receipt.json", "/receipt.json", "outputs\\site", "outputs//site"])
    assert.throws(() => _internal.validateArchivePath(candidate), /unsafe|ambiguous/i);
  assert.throws(() => _internal.validateBundleEntry("surprise.txt"), /undeclared/i);
  assert.throws(() => _internal.validateBundleEntry("outputs/site/index.html"), /undeclared/i);
  assert.equal(_internal.validateBundleEntry(TASK_BUNDLE_FILE), TASK_BUNDLE_FILE);
});

test("canonical inner task bundle survives outer mode normalization", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "github-task-bundle-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const publication = path.join(root, "publication");
  fs.mkdirSync(path.join(publication, "outputs/site/bin"), { recursive: true, mode: 0o750 });
  fs.writeFileSync(path.join(publication, "receipt.json"), '{"gateId":"site"}\n', { mode: 0o600 });
  fs.writeFileSync(path.join(publication, "bundle.json"), '{"gateId":"site"}\n', { mode: 0o600 });
  fs.writeFileSync(path.join(publication, "outputs/site/bin/tool"), "payload\n", { mode: 0o751 });
  fs.chmodSync(publication, 0o700);
  fs.chmodSync(path.join(publication, "outputs"), 0o755);
  fs.chmodSync(path.join(publication, "outputs/site"), 0o755);
  fs.chmodSync(path.join(publication, "outputs/site/bin"), 0o750);
  fs.chmodSync(path.join(publication, "outputs/site/bin/tool"), 0o751);
  const packedFile = path.join(root, "upload", TASK_BUNDLE_FILE);
  packCanonicalTaskBundle(publication, packedFile);
  // Simulate upload-artifact/download-artifact normalizing the outer file mode.
  fs.chmodSync(packedFile, 0o644);
  const restored = path.join(root, "restored");
  materializeCanonicalTaskBundle(packedFile, restored);

  assert.equal(fs.statSync(restored).mode & 0o7777, 0o700);
  assert.equal(fs.statSync(path.join(restored, "receipt.json")).mode & 0o7777, 0o600);
  assert.equal(fs.statSync(path.join(restored, "outputs/site/bin")).mode & 0o7777, 0o750);
  assert.equal(fs.statSync(path.join(restored, "outputs/site/bin/tool")).mode & 0o7777, 0o751);
  assert.equal(fs.readFileSync(path.join(restored, "outputs/site/bin/tool"), "utf8"), "payload\n");
});

test("artifact names bind a full task key and attempt-safe producer identity", () => {
  assert.equal(
    _internal.taskArtifactName("skills", SHA, "101", "2"),
    `validation-task-v1-skills-${"a".repeat(64)}-101-2`,
  );
  assert.throws(() => _internal.taskArtifactName("../skills", SHA, "101", "2"), /gate ID/);
});
