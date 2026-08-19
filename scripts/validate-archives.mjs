import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const stage = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-archive-validation-"));

function run(script, args = []) {
  const result = spawnSync(process.execPath, [path.join(root, "scripts", script), ...args], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`${script} failed with exit code ${result.status ?? "unknown"}`);
  }
}

try {
  const portableArchive = path.join(stage, "portable.zip");
  const openAiArchive = path.join(stage, "openai.zip");
  const standaloneOutput = path.join(stage, "skills");

  run("package-agent-plugin.mjs", ["--root", root, "--output", portableArchive]);
  run("package-openai-plugin.mjs", ["--root", root, "--output", openAiArchive]);
  run("package-standalone-skills.mjs", ["--root", root, "--output", standaloneOutput]);
  run("validate-openai-submission.mjs", ["--root", root, "--archive", openAiArchive]);
  run("validate-standalone-skills.mjs", ["--root", root, "--output", standaloneOutput]);

  console.log("Validated portable, OpenAI, and standalone archives in an isolated stage.");
} catch (error) {
  console.error(`Archive validation failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  fs.rmSync(stage, { recursive: true, force: true });
}
