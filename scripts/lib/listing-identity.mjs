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

function rawRepositoryUrl(repository) {
  return typeof repository === "string"
    ? repository
    : repository && typeof repository === "object"
      ? repository.url
      : undefined;
}

export function publicRepositoryUrl(repository) {
  const raw = rawRepositoryUrl(repository);
  if (typeof raw !== "string" || !raw.trim()) return undefined;

  return raw
    .trim()
    .replace(/^git\+/, "")
    .replace(/\/+$/, "")
    .replace(/\.git$/, "");
}

function validRepositorySegment(value) {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9_.-]+$/.test(value) &&
    value !== "." &&
    value !== ".."
  );
}

export function githubRepositorySlug(repository) {
  const raw = rawRepositoryUrl(repository);
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const normalized = raw.trim().replace(/^git\+/, "");

  const scp = /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(normalized);
  if (scp) {
    const [, owner, repositoryName] = scp;
    return validRepositorySegment(owner) && validRepositorySegment(repositoryName)
      ? `${owner}/${repositoryName}`
      : undefined;
  }

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    return undefined;
  }
  const allowedProtocol = ["https:", "http:", "git:", "ssh:"].includes(parsed.protocol);
  const validSshUser = parsed.protocol !== "ssh:" || !parsed.username || parsed.username === "git";
  if (
    !allowedProtocol ||
    parsed.hostname.toLowerCase() !== "github.com" ||
    parsed.password ||
    parsed.port ||
    parsed.search ||
    parsed.hash ||
    !validSshUser ||
    (["https:", "http:", "git:"].includes(parsed.protocol) && parsed.username)
  ) {
    return undefined;
  }

  const segments = parsed.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (segments.length !== 2) return undefined;
  const owner = segments[0];
  const repositoryName = segments[1].replace(/\.git$/, "");
  return validRepositorySegment(owner) && validRepositorySegment(repositoryName)
    ? `${owner}/${repositoryName}`
    : undefined;
}
