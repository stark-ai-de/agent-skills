import fs from "node:fs";
import path from "node:path";

import { canonicalJson } from "./bundle-contract.mjs";
import { allowedCategories } from "./openai-contract.mjs";
import { readOpenAiListing } from "./openai-listing.mjs";
import { assertInside } from "./plugin-projections.mjs";
import { pluginArtifactPaths, pluginIdentity } from "./release-descriptor.mjs";

export const COMMITTED_MARKETPLACE_PATH = ".agents/plugins/marketplace.json";

export function committedMarketplaceLabels(root) {
  const paths = pluginArtifactPaths(root);
  return {
    name: paths.marketplaceName,
    displayName: paths.marketplaceDisplayName,
  };
}

const committedLabels = committedMarketplaceLabels();
export const COMMITTED_MARKETPLACE_NAME = committedLabels.name;
export const COMMITTED_MARKETPLACE_DISPLAY_NAME = committedLabels.displayName;

export function validateMarketplaceDocument({
  root,
  contractRoot = root,
  file,
  expectedSource,
  expectedName,
  expectedDisplayName,
  pluginName,
}) {
  let resolvedName = expectedName;
  let resolvedDisplayName = expectedDisplayName;
  if (resolvedName === undefined || resolvedDisplayName === undefined) {
    const labels = committedMarketplaceLabels(root);
    resolvedName ??= labels.name;
    resolvedDisplayName ??= labels.displayName;
  }
  const errors = [];
  const marketplace = JSON.parse(fs.readFileSync(file, "utf8"));
  const topLevelKeys = Object.keys(marketplace).sort();
  if (JSON.stringify(topLevelKeys) !== JSON.stringify(["interface", "name", "plugins"])) {
    errors.push(
      "[MKT-001] marketplace top-level keys must be exactly name, interface, and plugins",
    );
  }
  if (marketplace.name !== resolvedName) {
    errors.push(`[MKT-001] marketplace name must be ${resolvedName}`);
  }
  if (marketplace.interface?.displayName !== resolvedDisplayName) {
    errors.push("[MKT-001] marketplace display name is incorrect");
  }
  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length !== 1) {
    errors.push("[MKT-001] marketplace must contain exactly one plugin entry");
  }
  const entry = marketplace.plugins?.[0];
  const identityName = pluginName ?? pluginIdentity(root).name;
  if (entry) {
    if (entry.name !== identityName) errors.push("[REL-001] marketplace plugin name is incorrect");
    if (entry.source?.source !== "local") errors.push("[MKT-001] marketplace source must be local");
    const sourcePath = entry.source?.path;
    if (
      typeof sourcePath !== "string" ||
      !sourcePath.startsWith("./") ||
      sourcePath.includes("\\") ||
      sourcePath.split("/").some((segment) => segment === "..")
    ) {
      errors.push("[MKT-001] marketplace source.path must be a safe ./-prefixed relative path");
    } else {
      const resolved = path.resolve(root, sourcePath);
      try {
        assertInside(root, resolved);
      } catch {
        errors.push("[MKT-001] marketplace source.path must not contain symlinked components");
      }
      const expected = path.resolve(root, expectedSource);
      if (resolved !== expected) {
        errors.push(`[MKT-001] marketplace source.path must point to ${expectedSource}`);
      }
      const stat = fs.existsSync(resolved) ? fs.lstatSync(resolved) : null;
      if (!stat?.isDirectory() || stat.isSymbolicLink()) {
        errors.push("[MKT-001] marketplace source.path must resolve to a plugin directory");
      }
    }
    if (entry.policy?.installation !== "AVAILABLE") {
      errors.push("[MKT-001] marketplace policy.installation must be AVAILABLE");
    }
    if (entry.policy?.authentication !== "ON_INSTALL") {
      errors.push("[MKT-001] marketplace policy.authentication must be ON_INSTALL");
    }
    try {
      if (!allowedCategories(contractRoot).has(entry.category)) {
        errors.push(`[MKT-001] marketplace category is unsupported: ${entry.category}`);
      }
    } catch (error) {
      errors.push(error.message);
    }
  }
  const serialized = JSON.stringify(marketplace);
  if (/(?:\/home\/(?!<)[^/\s]+\/|\/Users\/(?!<)[^/\s]+\/|ghp_|sk-[A-Za-z0-9])/.test(serialized)) {
    errors.push("[SEC-001] marketplace contains a private path or token-like value");
  }
  return { marketplace, errors };
}

export function renderMarketplace({
  name,
  displayName,
  pluginName,
  sourcePath,
  category = "Developer Tools",
}) {
  return {
    name,
    interface: { displayName },
    plugins: [
      {
        name: pluginName,
        source: { source: "local", path: sourcePath },
        policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
        category,
      },
    ],
  };
}

export function committedMarketplaceSourcePath(marketplaceTarget) {
  if (typeof marketplaceTarget !== "string" || marketplaceTarget.length === 0) {
    throw new Error("repository marketplace target is required");
  }
  return marketplaceTarget.startsWith("./") ? marketplaceTarget : `./${marketplaceTarget}`;
}

export function renderCommittedMarketplace(root) {
  const identity = pluginIdentity(root);
  const labels = committedMarketplaceLabels(root);
  const listing = readOpenAiListing(root);
  return renderMarketplace({
    name: labels.name,
    displayName: labels.displayName,
    pluginName: identity.name,
    sourcePath: committedMarketplaceSourcePath(identity.marketplaceTarget),
    category: listing.plugin.category,
  });
}

export function syncCommittedMarketplace({ root, check = false } = {}) {
  const resolvedRoot = path.resolve(root);
  const file = path.join(resolvedRoot, COMMITTED_MARKETPLACE_PATH);
  const expected = canonicalJson(renderCommittedMarketplace(resolvedRoot));
  const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (existing === expected) {
    return { file, drift: [] };
  }
  if (check) {
    return {
      file,
      drift: [
        existing == null
          ? `${COMMITTED_MARKETPLACE_PATH} is missing`
          : `${COMMITTED_MARKETPLACE_PATH} differs from release-policy generator output`,
      ],
    };
  }
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o755 });
  fs.writeFileSync(file, expected, { mode: 0o644 });
  return { file, drift: [] };
}
