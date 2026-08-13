import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { installPinnedActionlint, verifyActionlintBinary } from "./actionlint-contract.mjs";

const bytes = Buffer.from("#!/bin/sh\nprintf '1.2.3\\n'\n");
const binaryDigest = `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
const archive = Buffer.from("verified archive fixture");
const archiveDigest = `sha256:${crypto.createHash("sha256").update(archive).digest("hex")}`;
const identity = `actionlint@1.2.3+${binaryDigest}`;

test("installer accepts only pinned archive and executable bytes", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "actionlint-contract-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const destination = path.join(root, "bin", "actionlint");
  const contract = {
    version: "1.2.3",
    url: "https://example.invalid/actionlint.tar.gz",
    archiveDigest,
    binaryDigest,
  };
  const installed = await installPinnedActionlint({
    destination,
    contract,
    download: async () => archive,
    extract: async (_archive, directory) => {
      const executable = path.join(directory, "actionlint");
      fs.writeFileSync(executable, bytes, { mode: 0o700 });
      return executable;
    },
  });
  assert.deepEqual(installed, { path: destination, identity });
  assert.deepEqual(verifyActionlintBinary(destination, identity), {
    identity,
    executableDigest: binaryDigest,
  });

  await assert.rejects(
    installPinnedActionlint({
      destination: path.join(root, "bad", "actionlint"),
      contract,
      download: async () => Buffer.from("poisoned"),
      extract: async () => assert.fail("digest mismatch must reject before extraction"),
    }),
    /archive digest/i,
  );
});
