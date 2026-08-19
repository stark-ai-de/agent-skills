import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { canonicalJson, hashBytes, loadValidatedBundle } from "./bundle-contract.mjs";
import { LISTING_PATH, readOpenAiListing } from "./openai-listing.mjs";
import {
  RETIRED_OPENAI_ADAPTER_TARGET,
  assertInside,
  compareTrees,
  syncGeneratedProjection,
  withTempStage,
  writeSharedPackageFiles,
} from "./plugin-projections.mjs";

export const OPENAI_EPHEMERAL_PROJECTION_PATH = "ephemeral";
const EXPECTED_ROOTS = new Set([
  ".codex-plugin",
  "assets",
  "skills",
  "LICENSE",
  "README.md",
  "SOURCE-MANIFEST.json",
]);
const FORBIDDEN_MANIFEST_FIELDS = [
  "mcpServers",
  "apps",
  "hooks",
  "interface.screenshots",
  "authentication",
  "connectors",
  "customUi",
];

function resolveAsset(root, relativeAsset) {
  if (
    typeof relativeAsset !== "string" ||
    relativeAsset.startsWith("/") ||
    relativeAsset.includes("\\") ||
    relativeAsset
      .split("/")
      .some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new Error(`listing asset path is not a safe repository-relative path: ${relativeAsset}`);
  }
  const asset = path.resolve(root, relativeAsset);
  assertInside(root, asset);
  return asset;
}

export function openAiManifestFromListing(listing) {
  const { plugin } = listing;
  return {
    name: plugin.name,
    version: plugin.version,
    description: plugin.longDescription,
    author: {
      name: listing.publisher.legalName,
    },
    skills: "./skills/",
    interface: {
      displayName: plugin.displayName,
      shortDescription: plugin.shortDescription,
      longDescription: plugin.longDescription,
      developerName: plugin.developerName,
      category: plugin.category,
      capabilities: plugin.capabilities,
      defaultPrompt: plugin.starterPrompts,
      logo: "./assets/logo.png",
      composerIcon: "./assets/composer-icon.png",
      websiteURL: plugin.urls.website,
      privacyPolicyURL: plugin.urls.privacyPolicy,
      termsOfServiceURL: plugin.urls.termsOfService,
      supportURL: plugin.urls.support,
      brandColor: plugin.brandColors.light,
      brandColorDark: plugin.brandColors.dark,
    },
  };
}

function prepareOpenAiWrite(root, listing) {
  return {
    pluginManifest: openAiManifestFromListing(listing),
    assetFiles: [
      {
        name: "logo.png",
        source: resolveAsset(root, listing.plugin.assets.logo),
      },
      {
        name: "composer-icon.png",
        source: resolveAsset(root, listing.plugin.assets.composerIcon),
      },
    ],
  };
}

function writeOpenAiPackage({ root, stage, bundle, listing, gitRoot = root }) {
  const { pluginManifest, assetFiles } = prepareOpenAiWrite(root, listing);
  writeSharedPackageFiles({
    root,
    stage,
    bundle,
    kind: "openai",
    manifestFiles: [],
    includePluginManifest: true,
    pluginManifest,
    includeAssets: true,
    assetFiles,
    gitRoot,
  });
  return pluginManifest;
}

function addTreeErrors(root, targetRoot, bundle, errors) {
  const expectedSkillRoots = new Set(bundle.skills.map((entry) => `skills/${entry.name}`));
  const actualSkillRoots = new Set(
    fs
      .readdirSync(path.join(targetRoot, "skills"), { withFileTypes: true })
      .map((entry) => `skills/${entry.name}`),
  );
  for (const expected of expectedSkillRoots) {
    if (!actualSkillRoots.has(expected)) errors.push(`missing OpenAI skill root ${expected}/`);
  }
  for (const actual of actualSkillRoots) {
    if (!expectedSkillRoots.has(actual)) errors.push(`unexpected OpenAI skill root ${actual}/`);
  }

  for (const entry of bundle.skills) {
    const sourceRoot = path.join(root, entry.source);
    const targetSkillRoot = path.join(targetRoot, "skills", entry.name);
    if (!fs.existsSync(targetSkillRoot)) continue;
    for (const drift of compareTrees(sourceRoot, targetSkillRoot, {
      excludeGeneratedCaches: true,
    })) {
      const directoryMode = drift.startsWith("directory mode ");
      const directoryDrift = /^(?:unexpected|missing) directory /.test(drift);
      const match = directoryMode
        ? /^directory mode (.+)$/.exec(drift)
        : /^(unexpected|missing|changed|mode) (?:directory )?(.+)$/.exec(drift);
      if (!match) {
        errors.push(`OpenAI tree drift for ${entry.name}: ${drift}`);
        continue;
      }
      const kind = directoryMode ? "mode" : match[1];
      const relative = directoryMode ? match[1] : match[2];
      const noun = directoryMode || directoryDrift ? "directory" : "file";
      const verb =
        kind === "unexpected"
          ? "unexpected"
          : kind === "missing"
            ? "missing"
            : kind === "changed"
              ? "changed"
              : "mode mismatch for";
      errors.push(`${verb} OpenAI ${noun} ${entry.name}/${relative}`);
    }
  }
}

export function stageOpenAiProjection({ root = process.cwd(), gitRoot } = {}) {
  const resolvedRoot = path.resolve(root);
  const listing = readOpenAiListing(resolvedRoot);
  const bundle = loadValidatedBundle(resolvedRoot);
  let pluginManifest;
  const stage = withTempStage("openai-adapter-stage-", (stagePath) => {
    pluginManifest = writeOpenAiPackage({
      root: resolvedRoot,
      stage: stagePath,
      bundle,
      listing,
      gitRoot: gitRoot ?? resolvedRoot,
    });
  });
  return {
    root: resolvedRoot,
    stage,
    bundle,
    listing,
    pluginManifest,
  };
}

export function withOpenAiStage(root, fn, { gitRoot } = {}) {
  const staged = stageOpenAiProjection({ root, gitRoot });
  try {
    return fn(staged);
  } finally {
    fs.rmSync(staged.stage, { recursive: true, force: true });
  }
}

export function assertWritableOpenAiTarget(root, target) {
  if (typeof target !== "string" || !target.trim()) {
    throw new Error(
      "OpenAI adapter sync requires an explicit --target; the adapter is not a committed repository tree",
    );
  }
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, target.trim());
  const adaptersRoot = path.resolve(resolvedRoot, "adapters");
  if (resolved === adaptersRoot || resolved.startsWith(`${adaptersRoot}${path.sep}`)) {
    throw new Error(
      `refusing to materialize ${RETIRED_OPENAI_ADAPTER_TARGET}; use npm run validate:openai-plugin or npm run package:openai-plugin`,
    );
  }
}

export function validateOpenAiProjection({ root, targetRoot, bundle, listing }) {
  const errors = [];
  const targetStat = fs.existsSync(targetRoot) ? fs.lstatSync(targetRoot) : null;
  if (!targetStat?.isDirectory() || targetStat.isSymbolicLink()) {
    return { errors: [`OpenAI adapter is missing or not a directory: ${targetRoot}`] };
  }

  for (const entry of fs.readdirSync(targetRoot, { withFileTypes: true })) {
    if (!EXPECTED_ROOTS.has(entry.name)) {
      errors.push(`unexpected OpenAI adapter root entry: ${entry.name}`);
    }
  }
  for (const expected of EXPECTED_ROOTS) {
    if (!fs.existsSync(path.join(targetRoot, expected))) {
      errors.push(`missing OpenAI adapter root entry: ${expected}`);
    }
  }

  const manifestPath = path.join(targetRoot, ".codex-plugin", "plugin.json");
  if (fs.existsSync(manifestPath) && listing) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const expectedManifest = openAiManifestFromListing(listing);
    if (canonicalJson(manifest) !== canonicalJson(expectedManifest)) {
      errors.push(".codex-plugin/plugin.json does not match the reviewed listing source");
    }
    if (manifest.skills !== "./skills/") errors.push("OpenAI manifest skills must be ./skills/");
    for (const forbidden of FORBIDDEN_MANIFEST_FIELDS) {
      const value = forbidden.split(".").reduce((current, key) => current?.[key], manifest);
      if (value !== undefined) errors.push(`skills-only OpenAI adapter contains ${forbidden}`);
    }
  }

  const assetsRoot = path.join(targetRoot, "assets");
  if (fs.existsSync(assetsRoot)) {
    const assetNames = fs.readdirSync(assetsRoot).sort();
    if (JSON.stringify(assetNames) !== JSON.stringify(["composer-icon.png", "logo.png"])) {
      errors.push("OpenAI adapter assets must contain exactly logo.png and composer-icon.png");
    }
  }

  if (fs.existsSync(path.join(targetRoot, "skills"))) {
    addTreeErrors(root, targetRoot, bundle, errors);
  }

  if (fs.existsSync(path.join(targetRoot, "SOURCE-MANIFEST.json"))) {
    const sourceManifest = JSON.parse(
      fs.readFileSync(path.join(targetRoot, "SOURCE-MANIFEST.json"), "utf8"),
    );
    if (sourceManifest.projection !== "openai") {
      errors.push("OpenAI SOURCE-MANIFEST projection must be openai");
    }
    if (sourceManifest.bundleHash !== hashBytes(Buffer.from(canonicalJson(bundle)))) {
      errors.push("OpenAI SOURCE-MANIFEST bundle hash is stale");
    }
  }

  return { errors: [...new Set(errors)] };
}

export function syncOpenAiProjection({ root = process.cwd(), target, check = false } = {}) {
  const resolvedRoot = path.resolve(root);
  assertWritableOpenAiTarget(resolvedRoot, target);
  const listing = readOpenAiListing(resolvedRoot);
  const pluginManifest = openAiManifestFromListing(listing);
  const result = syncGeneratedProjection({
    root: resolvedRoot,
    target,
    check,
    writer: ({ root: projectionRoot, stage, bundle }) =>
      writeOpenAiPackage({
        root: projectionRoot,
        stage,
        bundle,
        listing,
      }),
  });
  return { ...result, listing, pluginManifest };
}

export { LISTING_PATH, readOpenAiListing };
