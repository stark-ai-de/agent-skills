export const POST_RELEASE_EVIDENCE_WORKFLOW = "post-release-evidence.yml";

export function postReleaseEvidenceTitle(tag) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag ?? "")) throw new Error(`Invalid release tag: ${tag}`);
  return `Post-release Evidence · ${tag}`;
}

function timestamp(value) {
  const parsed = Date.parse(value ?? "");
  return Number.isNaN(parsed) ? null : parsed;
}

export function releaseStateChangedAt(release, requiredAssetNames) {
  if (!release || !Array.isArray(requiredAssetNames)) return null;
  const required = new Set(requiredAssetNames);
  const releaseTimestamps = [release.created_at, release.published_at, release.updated_at]
    .map(timestamp)
    .filter((value) => value !== null);
  if (releaseTimestamps.length === 0) return null;
  const values = [...releaseTimestamps];
  for (const asset of Array.isArray(release.assets) ? release.assets : []) {
    if (!required.has(asset?.name)) continue;
    const assetTimestamps = [asset.created_at, asset.updated_at]
      .map(timestamp)
      .filter((value) => value !== null);
    if (assetTimestamps.length === 0) return null;
    values.push(...assetTimestamps);
  }
  return new Date(Math.max(...values)).toISOString();
}

export function selectPostReleaseEvidenceRun(runs, tag, { requireSuccess = false } = {}) {
  if (!Array.isArray(runs)) return null;
  const title = postReleaseEvidenceTitle(tag);
  return (
    runs
      .filter(
        (run) =>
          run?.displayTitle === title &&
          run?.event === "workflow_dispatch" &&
          run?.headBranch === "main" &&
          timestamp(run?.createdAt) !== null &&
          (!requireSuccess || (run.status === "completed" && run.conclusion === "success")),
      )
      .sort((left, right) => timestamp(right.createdAt) - timestamp(left.createdAt))[0] ?? null
  );
}

export function evidenceRunCoversRelease(run, releaseUpdatedAt, { requireSuccess = false } = {}) {
  const runCreatedAt = timestamp(run?.createdAt);
  const updatedAt = timestamp(releaseUpdatedAt);
  if (
    runCreatedAt === null ||
    updatedAt === null ||
    runCreatedAt <= updatedAt ||
    run?.event !== "workflow_dispatch" ||
    run?.headBranch !== "main"
  ) {
    return false;
  }
  return !requireSuccess || (run.status === "completed" && run.conclusion === "success");
}
