import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  DEFAULT_BUNDLE_PATH,
  validateAllBundles,
  validateBundleFile,
} from "../lib/bundle-contract.mjs";

function parseCommandTokens(command) {
  return command.trim() ? command.trim().split(/\s+/) : [];
}

function extractCodexCommand(readme) {
  const summary = "<summary><strong>Install the Codex bundle</strong></summary>";
  const summaryIndex = readme.indexOf(summary);
  if (summaryIndex === -1) return null;

  const fenceStart = readme.indexOf("```", summaryIndex + summary.length);
  if (fenceStart === -1) return null;
  const commandStart = readme.indexOf("\n", fenceStart);
  if (commandStart === -1) return null;
  const fenceEnd = readme.indexOf("```", commandStart + 1);
  if (fenceEnd === -1) return null;
  return readme.slice(commandStart + 1, fenceEnd).trim();
}

function parseArgs(argv) {
  const rootIndex = argv.indexOf("--root");
  if (rootIndex === -1) {
    return { root: process.cwd() };
  }
  const root = argv[rootIndex + 1];
  if (!root || root.startsWith("--")) {
    throw new Error("--root requires a directory");
  }
  return { root: path.resolve(root) };
}

function validateReadme(root, bundle) {
  const readmePath = path.join(root, "README.md");
  if (!fs.existsSync(readmePath)) {
    return ["README.md is missing"];
  }

  const expectedTokens = [
    "npx",
    "skills@latest",
    "add",
    "stark-ai-de/agent-skills",
    "--skill",
    ...bundle.skills.map((entry) => entry.name),
    "-g",
    "-a",
    bundle.distributions.skillsCliAgent,
    "-y",
  ];
  const command = extractCodexCommand(fs.readFileSync(readmePath, "utf8"));
  const actualTokens = command === null ? null : parseCommandTokens(command);
  if (!actualTokens) {
    return ["README.md: Codex bundle install command is missing"];
  }
  if (JSON.stringify(actualTokens) !== JSON.stringify(expectedTokens)) {
    return [
      `README.md: Codex bundle command tokens must be exactly ${JSON.stringify(expectedTokens)}; found ${JSON.stringify(actualTokens)}`,
    ];
  }
  return [];
}

try {
  const { root } = parseArgs(process.argv.slice(2));
  const result = validateAllBundles(root);
  const errors = [...result.errors];
  const codexResult = validateBundleFile(root, DEFAULT_BUNDLE_PATH);
  if (codexResult.bundle) {
    errors.push(...validateReadme(root, codexResult.bundle));
  }

  if (errors.length > 0) {
    console.error("Errors:");
    for (const error of new Set(errors)) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    const membershipCount = result.bundleFiles.reduce((count, bundleFile) => {
      const relative = path.relative(root, bundleFile).split(path.sep).join("/");
      return count + (validateBundleFile(root, relative).bundle?.skills.length ?? 0);
    }, 0);
    console.log(
      `Validated ${result.bundleFiles.length} bundle(s) and ${membershipCount} explicit skill entries.`,
    );
  }
} catch (error) {
  console.error("Errors:");
  console.error(`- ${error.message}`);
  process.exitCode = 1;
}
