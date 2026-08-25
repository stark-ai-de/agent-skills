/**
 * Pure listing identity and catalog derivations shared by Node and site code.
 *
 * Keep filesystem access, schema validation, and portal-specific checks in the
 * callers. This module is deliberately limited to values derived from the
 * repository's author-maintained plugin identity source.
 */

export function listingIdentityFromSource(source) {
  if (!source || typeof source !== "object") {
    throw new TypeError("listing identity source must be an object");
  }

  return {
    pluginId: source.pluginId,
    displayName: source.displayName,
    version: source.version,
    bundleId: source.id,
    listingId: source.listingId,
    outputs: source.outputs,
  };
}

export function listingArtifactPaths(identity) {
  const pluginId = identity?.pluginId;
  const listingId = identity?.listingId;
  const displayName = identity?.displayName;
  const portableProjection = identity?.outputs?.portableProjection;

  if (
    typeof pluginId !== "string" ||
    !pluginId.trim() ||
    typeof listingId !== "string" ||
    !listingId.trim() ||
    typeof displayName !== "string" ||
    !displayName.trim() ||
    typeof portableProjection !== "string" ||
    !portableProjection.trim()
  ) {
    throw new TypeError("listing identity is missing required catalog derivation fields");
  }

  return {
    listing: `docs/listing/openai/${listingId}.json`,
    worksheet: `docs/listing/openai/${listingId}-submission-worksheet.md`,
    firstPublication: `docs/listing/openai/${listingId}-first-publication.md`,
    portableTarget: portableProjection,
    retiredOpenAiAdapter: `adapters/openai/${pluginId}`,
    marketplaceName: `${pluginId}-local`,
    marketplaceDisplayName: `${displayName} (local portable plugin)`,
    adapterFixtureName: `${pluginId}-openai-adapter-test`,
    adapterFixtureDisplayName: `${displayName} (isolated OpenAI adapter)`,
  };
}

export function publicRepositoryUrl(repository) {
  const raw =
    typeof repository === "string"
      ? repository
      : repository && typeof repository === "object"
        ? repository.url
        : undefined;
  if (typeof raw !== "string" || !raw.trim()) return undefined;

  return raw
    .trim()
    .replace(/^git\+/, "")
    .replace(/\/+$/, "")
    .replace(/\.git$/, "");
}

export function githubRepositorySlug(repository) {
  const url = publicRepositoryUrl(repository);
  if (!url) return undefined;
  const match = /github\.com[:/]([^/]+\/[^/]+)/i.exec(url);
  return match ? match[1].replace(/\.git$/, "") : undefined;
}
