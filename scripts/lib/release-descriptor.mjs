import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import satisfies from "semver/functions/satisfies.js";

import {
  githubRepositorySlug as deriveGithubRepositorySlug,
  listingArtifactPaths,
  listingIdentityFromSource,
  publicRepositoryUrl as derivePublicRepositoryUrl,
} from "./listing-identity.mjs";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const PLUGIN_SOURCE_PATH = "plugins/stark-ai-developer.source.json";
export const PLUGIN_SOURCE_SCHEMA_PATH = "plugins/stark-ai-developer.source.schema.json";
export const PINNED_AGENT_PLUGINS_SCHEMA_PATH =
  "scripts/vendor/agent-plugins/1.0.0/plugin.schema.json";

function resolveRoot(root = moduleRoot) {
  return path.resolve(root);
}

function formatAjvErrors(errors = []) {
  return errors.map((error) => `${error.instancePath || "/"} ${error.message}`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function identityFromSource(source) {
  return {
    ...listingIdentityFromSource(source),
    schemaVersion: source.schemaVersion,
    submissionType: source.submissionType,
    publicListingStrategy: source.publicListingStrategy,
    contractSnapshots: source.contractSnapshots,
    build: source.build,
  };
}

export function membershipFromSource(source) {
  return {
    $schema: source.$schema,
    schemaVersion: source.schemaVersion,
    id: source.id,
    displayName: source.displayName,
    description: source.description,
    skills: source.skills,
    distributions: source.distributions,
  };
}

export function loadPluginSourceFile(root = moduleRoot) {
  const resolvedRoot = resolveRoot(root);
  const descriptorPath = path.join(resolvedRoot, PLUGIN_SOURCE_PATH);
  const schemaPath = path.join(resolvedRoot, PLUGIN_SOURCE_SCHEMA_PATH);
  if (!fs.existsSync(schemaPath) || !fs.lstatSync(schemaPath).isFile()) {
    return { source: null, errors: [`[FOUND-001] ${PLUGIN_SOURCE_SCHEMA_PATH} is missing`] };
  }
  if (!fs.existsSync(descriptorPath) || !fs.lstatSync(descriptorPath).isFile()) {
    return { source: null, errors: [`[FOUND-001] ${PLUGIN_SOURCE_PATH} is missing`] };
  }

  let source;
  try {
    source = readJson(descriptorPath);
  } catch (error) {
    return { source: null, errors: [`[FOUND-001] ${PLUGIN_SOURCE_PATH}: ${error.message}`] };
  }

  const schema = readJson(schemaPath);
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  if (!validate(source)) {
    return {
      source,
      errors: formatAjvErrors(validate.errors).map(
        (error) => `[FOUND-001] ${PLUGIN_SOURCE_PATH}${error}`,
      ),
    };
  }

  const errors = [];
  const expectedArchive = `dist/openai/${source.pluginId}-${source.version}.zip`;
  if (source.outputs.openaiArchive !== expectedArchive) {
    errors.push(
      `[REL-001] outputs.openaiArchive must equal ${expectedArchive} for the declared identity`,
    );
  }
  if (source.listingId !== source.pluginId) {
    errors.push("[REL-001] listingId must equal pluginId for the v1 one-listing strategy");
  }
  if (
    source.distributions.portablePlugin !== source.pluginId ||
    source.distributions.openaiPlugin !== source.pluginId
  ) {
    errors.push("[BND-001] distribution plugin ids must match pluginId");
  }

  return { source, errors };
}

export function loadReleaseDescriptorFile(root = moduleRoot) {
  const result = loadPluginSourceFile(root);
  return {
    release: result.source ? identityFromSource(result.source) : null,
    errors: result.errors,
  };
}

export function loadValidatedRelease(root = moduleRoot) {
  const result = loadReleaseDescriptorFile(root);
  if (result.errors.length > 0 || !result.release) {
    throw new Error(result.errors.join("\n"));
  }
  return result.release;
}

export function loadValidatedPluginSource(root = moduleRoot) {
  const result = loadPluginSourceFile(root);
  if (result.errors.length > 0 || !result.source) {
    throw new Error(result.errors.join("\n"));
  }
  return result.source;
}

export function pluginIdentity(root = moduleRoot) {
  const release = identityFromSource(loadValidatedPluginSource(root));
  return {
    name: release.pluginId,
    displayName: release.displayName,
    version: release.version,
    bundleId: release.bundleId,
    listingId: release.listingId,
    publicListingStrategy: release.publicListingStrategy,
    portableProjection: release.outputs.portableProjection,
    openaiArchive: release.outputs.openaiArchive,
    marketplaceTarget: release.outputs.repositoryMarketplaceTarget,
    archiveProfile: release.build.archiveProfile,
    nodeVersion: release.build.nodeVersion,
    bunVersion: release.build.bunVersion,
    pnpmVersion: release.build.pnpmVersion,
    contractSnapshots: release.contractSnapshots,
  };
}

export function readRepoPackage(root = moduleRoot) {
  return readJson(path.join(resolveRoot(root), "package.json"));
}

export function packageAuthorName(packageJson) {
  const author = packageJson?.author;
  if (typeof author === "string" && author.trim()) return author.trim();
  if (author && typeof author.name === "string" && author.name.trim()) {
    return author.name.trim();
  }
  return undefined;
}

export function publicRepositoryUrl(packageJson) {
  return derivePublicRepositoryUrl(packageJson?.repository);
}

export function githubRepositorySlug(packageJson) {
  return deriveGithubRepositorySlug(packageJson?.repository);
}

export function engineRangeAdmits(range, version) {
  if (typeof range !== "string" || typeof version !== "string") return false;
  try {
    return satisfies(version, range);
  } catch {
    return false;
  }
}

export function pluginArtifactPaths(root = moduleRoot) {
  const identity = pluginIdentity(root);
  const evalRoot = `skill-evals/${identity.name}`;
  return {
    ...listingArtifactPaths({
      pluginId: identity.name,
      displayName: identity.displayName,
      listingId: identity.listingId,
      outputs: { portableProjection: identity.portableProjection },
    }),
    evalRoot,
    postReleaseReceiptSchema: `${evalRoot}/evidence/post-release-receipt.schema.json`,
    manualClientLifecycleTemplate: `${evalRoot}/evidence/manual-client-lifecycle-receipt.template.json`,
  };
}

export function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

export function validateToolchainPins(root = moduleRoot) {
  const resolvedRoot = resolveRoot(root);
  const errors = [];
  const release = loadReleaseDescriptorFile(resolvedRoot);
  errors.push(...release.errors);
  if (!release.release) return errors;

  const packageJson = readJson(path.join(resolvedRoot, "package.json"));
  if (packageJson.packageManager !== `pnpm@${release.release.build.pnpmVersion}`) {
    errors.push(
      `[REL-001] package.json#packageManager must equal pnpm@${release.release.build.pnpmVersion}`,
    );
  }
  const engines = packageJson.engines?.node;
  if (!engineRangeAdmits(engines, release.release.build.nodeVersion)) {
    errors.push(
      `[REL-001] package.json#engines.node must admit ${release.release.build.nodeVersion}`,
    );
  }
  const nodeVersionPath = path.join(resolvedRoot, ".node-version");
  const nodeVersion = fs.existsSync(nodeVersionPath)
    ? fs.readFileSync(nodeVersionPath, "utf8").trim()
    : "";
  if (nodeVersion !== release.release.build.nodeVersion) {
    errors.push(`[REL-001] .node-version must equal ${release.release.build.nodeVersion}`);
  }
  const bunEngines = packageJson.engines?.bun;
  if (!engineRangeAdmits(bunEngines, release.release.build.bunVersion)) {
    errors.push(
      `[REL-001] package.json#engines.bun must admit ${release.release.build.bunVersion}`,
    );
  }
  const bunVersionPath = path.join(resolvedRoot, ".bun-version");
  const bunVersion = fs.existsSync(bunVersionPath)
    ? fs.readFileSync(bunVersionPath, "utf8").trim()
    : "";
  if (bunVersion !== release.release.build.bunVersion) {
    errors.push(`[REL-001] .bun-version must equal ${release.release.build.bunVersion}`);
  }
  return errors;
}
