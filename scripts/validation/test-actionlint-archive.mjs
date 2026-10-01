import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

// Qualify the ZIP API used by github-actionlint, including its patched symlink guard.
// All writes are confined to this test's newly created temporary fixture directory.
const require = createRequire(import.meta.url);
const wrapperRequire = createRequire(require.resolve("github-actionlint/package.json"));
const AdmZip = wrapperRequire("adm-zip");
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "actionlint-archive-"));
const contents = Buffer.from("actionlint fixture\n");
let passed = 0;

try {
  for (const entryName of ["actionlint.exe", "actionlint/actionlint.exe"]) {
    const label = entryName.includes("/") ? "wrapped" : "flat";
    const archivePath = path.join(fixture, `${label}.zip`);
    const destination = path.join(fixture, label);
    fs.mkdirSync(path.dirname(path.join(destination, entryName)), { recursive: true });
    fs.writeFileSync(path.join(destination, entryName), "old fixture");
    const archive = new AdmZip();
    archive.addFile(entryName, contents);
    archive.writeZip(archivePath);
    const installed = new AdmZip(archivePath);
    assert.equal(installed.getEntries()[0].entryName, entryName);
    installed.extractAllTo(destination, true);
    assert.deepEqual(fs.readFileSync(path.join(destination, entryName)), contents);
    passed++;
  }

  if (process.platform !== "win32") {
    const destination = path.join(fixture, "symlink-destination");
    const outside = path.join(fixture, "protected");
    fs.mkdirSync(destination);
    fs.mkdirSync(outside);
    const protectedFile = path.join(outside, "actionlint.exe");
    fs.writeFileSync(protectedFile, "protected fixture");
    fs.symlinkSync(outside, path.join(destination, "linked"), "dir");
    const archive = new AdmZip();
    archive.addFile("linked/actionlint.exe", contents);
    assert.throws(() => new AdmZip(archive.toBuffer()).extractAllTo(destination, true));
    assert.equal(fs.readFileSync(protectedFile, "utf8"), "protected fixture");
    passed++;
  } else {
    console.log("Actionlint ZIP symlink guard not exercised on Windows.");
  }
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}

console.log(`Actionlint ZIP compatibility and extraction security passed: ${passed} cases.`);
