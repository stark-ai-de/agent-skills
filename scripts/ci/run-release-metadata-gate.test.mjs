import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(scriptDirectory, "../..");
const gateScript = path.join(scriptDirectory, "run-release-metadata-gate.mjs");

test("failed pull-request release metadata validation removes its temporary root", (t) => {
  const isolatedTemporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "release-metadata-gate-test-"),
  );
  t.after(() => fs.rmSync(isolatedTemporaryRoot, { recursive: true, force: true }));

  const missingBaseRef = `refs/heads/release-metadata-gate-missing-${process.pid}-${Date.now()}`;
  const result = spawnSync(
    process.execPath,
    [gateScript, "--event", "pull_request", "--base-sha", missingBaseRef],
    {
      cwd: repository,
      env: {
        ...process.env,
        TMPDIR: isolatedTemporaryRoot,
        TMP: isolatedTemporaryRoot,
        TEMP: isolatedTemporaryRoot,
      },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  assert.equal(result.status, 1, result.stderr);
  assert.deepEqual(
    fs.readdirSync(isolatedTemporaryRoot).filter((name) => name.startsWith("release-intent-")),
    [],
  );
});
