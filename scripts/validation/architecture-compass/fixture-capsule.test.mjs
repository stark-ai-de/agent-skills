import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createSealedBaselineCapsule,
  hashBaselineCapsule,
  materializeBaselineCapsule,
  removeSealedBaselineCapsule,
} from "./fixture-capsule.mjs";

test("sealed baseline materializes isolated CoW files with an ordinary-copy fallback", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-capsule-test-"));
  const source = path.join(root, "source");
  const capsule = path.join(root, "capsule");
  const materialized = path.join(root, "materialized");
  fs.mkdirSync(path.join(source, "nested"), { recursive: true });
  fs.writeFileSync(path.join(source, "nested", "fixture.txt"), "baseline\n");
  fs.writeFileSync(path.join(source, "root.txt"), "root\n");
  t.after(() => {
    if (fs.existsSync(capsule)) removeSealedBaselineCapsule(capsule);
    fs.rmSync(root, { recursive: true, force: true });
  });

  const created = createSealedBaselineCapsule({
    sourceRoot: source,
    destinationRoot: capsule,
    entries: ["nested", "root.txt"],
  });
  let attemptedClone = false;
  let usedFallback = false;
  const materialization = materializeBaselineCapsule({
    capsuleRoot: capsule,
    destinationRoot: materialized,
    copyFile(sourceFile, destinationFile, mode) {
      if (mode === fs.constants.COPYFILE_FICLONE) {
        attemptedClone = true;
        const error = new Error("clone unsupported");
        error.code = "ENOTSUP";
        throw error;
      }
      usedFallback = true;
      fs.copyFileSync(sourceFile, destinationFile, mode);
    },
  });

  assert.equal(attemptedClone, true);
  assert.equal(usedFallback, true);
  assert.deepEqual(materialization, { root: materialized, strategy: "copy" });
  assert.equal(created.digest, hashBaselineCapsule(capsule));
  assert.equal(fs.statSync(path.join(capsule, "nested", "fixture.txt")).mode & 0o222, 0);
  assert.notEqual(
    fs.statSync(path.join(capsule, "nested", "fixture.txt")).ino,
    fs.statSync(path.join(materialized, "nested", "fixture.txt")).ino,
  );

  fs.writeFileSync(path.join(materialized, "nested", "fixture.txt"), "mutated\n");
  assert.equal(fs.readFileSync(path.join(capsule, "nested", "fixture.txt"), "utf8"), "baseline\n");
  assert.equal(hashBaselineCapsule(capsule), created.digest);
});

test("baseline materialization reports clone when every file uses copy-on-write", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-capsule-clone-"));
  const source = path.join(root, "source");
  const capsule = path.join(root, "capsule");
  const materialized = path.join(root, "materialized");
  fs.mkdirSync(source);
  fs.writeFileSync(path.join(source, "fixture.txt"), "baseline\n");
  t.after(() => {
    if (fs.existsSync(capsule)) removeSealedBaselineCapsule(capsule);
    fs.rmSync(root, { recursive: true, force: true });
  });
  createSealedBaselineCapsule({
    sourceRoot: source,
    destinationRoot: capsule,
    entries: ["fixture.txt"],
  });

  const materialization = materializeBaselineCapsule({
    capsuleRoot: capsule,
    destinationRoot: materialized,
    copyFile(sourceFile, destinationFile, mode) {
      assert.equal(mode, fs.constants.COPYFILE_FICLONE);
      fs.copyFileSync(sourceFile, destinationFile);
    },
  });

  assert.deepEqual(materialization, { root: materialized, strategy: "clone" });
});

test("baseline hashing detects mutation after the capsule is unsealed", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-capsule-mutation-"));
  const source = path.join(root, "source");
  const capsule = path.join(root, "capsule");
  fs.mkdirSync(source);
  fs.writeFileSync(path.join(source, "fixture.txt"), "before\n");
  t.after(() => {
    if (fs.existsSync(capsule)) removeSealedBaselineCapsule(capsule);
    fs.rmSync(root, { recursive: true, force: true });
  });
  const { digest } = createSealedBaselineCapsule({
    sourceRoot: source,
    destinationRoot: capsule,
    entries: ["fixture.txt"],
  });

  fs.chmodSync(path.join(capsule, "fixture.txt"), 0o600);
  fs.writeFileSync(path.join(capsule, "fixture.txt"), "after\n");

  assert.notEqual(hashBaselineCapsule(capsule), digest);
});
