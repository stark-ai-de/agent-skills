import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { loadValidatedBundle } from "./bundle-contract.mjs";
import { pluginIdentity } from "./release-descriptor.mjs";
import { validateRuntimeArtifact } from "./ssh-runtime-artifact.mjs";
import {
  compareTrees,
  createDirectoryArchive,
  withTempStage,
  writeClaudeStage,
} from "./plugin-projections.mjs";

export function claudeArchivePath(root) {
  const identity = pluginIdentity(root);
  return path.join(root, "dist", "claude", `${identity.name}-${identity.version}.zip`);
}

export function stageClaudeProjection({ root = process.cwd(), gitRoot = root } = {}) {
  root = path.resolve(root);
  const bundle = loadValidatedBundle(root);
  const stage = withTempStage("claude-plugin-stage-", (directory) => {
    writeClaudeStage({ root, stage: directory, bundle, gitRoot });
  });
  return { root, stage, bundle };
}

export function withClaudeStage(root, fn, { gitRoot = root } = {}) {
  const staged = stageClaudeProjection({ root, gitRoot });
  try {
    return fn(staged);
  } finally {
    fs.rmSync(staged.stage, { recursive: true, force: true });
  }
}

export function validateClaudeProjection({ root = process.cwd(), targetRoot, gitRoot = root }) {
  const bundle = loadValidatedBundle(root);
  const errors = [];
  try {
    const stat = fs.lstatSync(targetRoot);
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw new Error("expected regular staging directory");
    const manifest = JSON.parse(
      fs.readFileSync(path.join(targetRoot, ".claude-plugin/plugin.json"), "utf8"),
    );
    if (Object.hasOwn(manifest, "mcpServers"))
      errors.push(
        "Claude must discover only the root .mcp.json; redundant mcpServers is forbidden",
      );
    if (manifest.skills !== "./skills/") errors.push("Claude skills must use ./skills/");
    const runtime = bundle.mcp?.find((entry) => entry.targets.includes("claude"));
    if (runtime) validateRuntimeArtifact(path.join(targetRoot, "runtime"), runtime.artifact);
    withClaudeStage(
      root,
      ({ stage }) => {
        errors.push(
          ...compareTrees(stage, targetRoot).map((drift) => `Claude projection drift: ${drift}`),
        );
      },
      { gitRoot },
    );
  } catch (error) {
    errors.push(`Claude projection: ${error.message}`);
  }
  return { bundle, errors };
}

// Compare the complete ZIP bytes to a fresh canonical projection. This covers
// inventory, content, provenance, central-directory modes and zip-store-v1
// headers without extracting untrusted archive paths or trusting its manifest.
export function validateClaudeArchive({
  root = process.cwd(),
  archive = claudeArchivePath(root),
  gitRoot = root,
} = {}) {
  return withClaudeStage(
    root,
    ({ stage }) => {
      const validation = validateClaudeProjection({ root, targetRoot: stage, gitRoot });
      if (validation.errors.length) return validation;
      const scratch = withTempStage("claude-archive-validation-", () => {});
      try {
        const expected = createDirectoryArchive({
          sourceRoot: stage,
          output: path.join(scratch, "claude.zip"),
        });
        if (!fs.readFileSync(archive).equals(fs.readFileSync(expected.output))) {
          validation.errors.push(
            "Claude archive differs from canonical files, provenance, modes or zip-store-v1 encoding",
          );
        }
        return validation;
      } finally {
        fs.rmSync(scratch, { recursive: true, force: true });
      }
    },
    { gitRoot },
  );
}
