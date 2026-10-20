// Hermetic Git fixtures only; no staging or user-repository mutation.
// SPDX-License-Identifier: Apache-2.0
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cp, mkdtemp, mkdir, readFile, writeFile, readdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
async function fixture() {
  const temp = await mkdtemp(path.join(tmpdir(), "visual-report-export-"));
  const repo = path.join(temp, "repo"), skill = path.join(repo, "incubator/skills/engineering-workflows/visual-reports");
  await mkdir(skill, { recursive: true }); await cp(source, skill, { recursive: true });
  // Compatibility aliases are unrelated to renderer behavior. Fill absent legacy files
  // only in this synthetic fixture; real repository exports use their committed bytes.
  for (const relative of ["assets/graphite-grain/configurator.mjs", "assets/graphite-grain/configurator.html", "assets/graphite-grain/relaxed.css", "scripts/cache_icon.py"]) {
    const target = path.join(skill, relative); await mkdir(path.dirname(target), { recursive: true });
    try { await readFile(target); } catch (error) { if (error.code !== "ENOENT") throw error; await writeFile(target, "Synthetic fixture only\n"); }
  }
  await writeFile(path.join(repo, "LICENSE"), "Synthetic test license, not a distributable bundle\n");
  const git = (args, input) => execFileSync("git", ["-C", repo, ...args], { input, encoding: "utf8" }).trim();
  git(["init", "-q"]);
  async function tree(dir) {
    const entries = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name === ".git") continue;
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) entries.push(`040000 tree ${await tree(absolute)}\t${entry.name}`);
      else entries.push(`100644 blob ${git(["hash-object", "-w", "--stdin"], await readFile(absolute))}\t${entry.name}`);
    }
    return git(["mktree"], entries.sort().join("\n") + "\n");
  }
  const revision = git(["-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit-tree", await tree(repo), "-m", "Synthetic export fixture"]);
  git(["update-ref", "HEAD", revision]);
  // Populate the fixture working tree/index by clone, never stage a user's files.
  // A clone has a normal index; no index is touched in the original source workspace.
  const clean = path.join(temp, "clean");
  execFileSync("git", ["clone", "--quiet", "--no-local", repo, clean]);
  const run = (destination, check = false) => execFileSync(process.execPath, [path.join(clean, "incubator/skills/engineering-workflows/visual-reports/scripts/export-assets.mjs"), "--destination", destination, ...(check ? ["--check"] : [])], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return { temp, repo: clean, run, revision };
}
test("committed portable bundle verifies digests and runs the renderer offline", async () => {
  const f = await fixture();
  try {
    const bundle = path.join(f.temp, "bundle"); f.run(bundle); f.run(bundle, true);
    const manifest = JSON.parse(await readFile(path.join(bundle, "manifest.json"), "utf8"));
    assert.equal(manifest.source.revision, f.revision);
    for (const entry of manifest.files) assert.equal(createHash("sha256").update(await readFile(path.join(bundle, entry.file))).digest("hex"), entry.sha256);
    assert.ok(manifest.files.some((entry) => entry.file === "configurator.mjs"));
    execFileSync(process.execPath, [path.join(bundle, "scripts/render-report.mjs"), "--gallery", path.join(f.temp, "gallery")]);
    assert.ok((await readFile(path.join(f.temp, "gallery/r24/r24.html"), "utf8")).includes("Zeitplan"));
    const target = path.join(bundle, "assets/report-runtime.css"); await writeFile(target, "tampered");
    assert.throws(() => f.run(bundle, true));
  } finally { await rm(f.temp, { recursive: true, force: true }); }
});
test("export refuses source destinations, symlink redirects and dirty source", async () => {
  const f = await fixture();
  try {
    assert.throws(() => f.run(path.join(f.repo, "not-allowed")));
    const redirect = path.join(f.temp, "redirect"); await symlink(f.repo, redirect, "dir");
    assert.throws(() => f.run(path.join(redirect, "not-allowed")));
    const skill = path.join(f.repo, "incubator/skills/engineering-workflows/visual-reports");
    await writeFile(path.join(skill, "uncommitted.txt"), "not reviewed");
    assert.throws(() => f.run(path.join(f.temp, "bundle")));
  } finally { await rm(f.temp, { recursive: true, force: true }); }
});
