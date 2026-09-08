export const RELEASE_ZIP_ASSET_NAMES = Object.freeze(["openai.zip", "portable.zip"]);

export const RELEASE_ASSET_NAMES = Object.freeze([
  ...RELEASE_ZIP_ASSET_NAMES,
  "release-subject.json",
]);

const LEGACY_TWO_ASSET_TAGS = new Set(["v0.20.1"]);

export function releaseAssetNamesForTag(tag) {
  return LEGACY_TWO_ASSET_TAGS.has(tag)
    ? RELEASE_ASSET_NAMES.filter((name) => name !== "release-subject.json")
    : [...RELEASE_ASSET_NAMES];
}
