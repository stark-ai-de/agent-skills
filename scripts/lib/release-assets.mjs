export const LEGACY_RELEASE_ZIP_ASSET_NAMES = Object.freeze(["openai.zip", "portable.zip"]);
export const RELEASE_ZIP_ASSET_NAMES = Object.freeze([
  "openai-skills-only.zip",
  "openai-tools.zip",
  "portable.zip",
]);

export const RELEASE_ASSET_NAMES = Object.freeze([
  "openai.zip",
  ...RELEASE_ZIP_ASSET_NAMES,
  "release-subject.json",
]);

const LEGACY_TWO_ASSET_TAGS = new Set(["v0.20.1"]);

export function isMultiProfileReleaseTag(tag) {
  const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(tag ?? "");
  if (!match) return false;
  const [major, minor] = match.slice(1).map(Number);
  return major > 0 || minor >= 32;
}

export function releaseAssetNamesForTag(tag) {
  if (isMultiProfileReleaseTag(tag)) return [...RELEASE_ZIP_ASSET_NAMES, "release-subject.json"];
  return LEGACY_TWO_ASSET_TAGS.has(tag)
    ? [...LEGACY_RELEASE_ZIP_ASSET_NAMES]
    : [...LEGACY_RELEASE_ZIP_ASSET_NAMES, "release-subject.json"];
}
