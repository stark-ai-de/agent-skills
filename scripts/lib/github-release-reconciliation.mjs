export const RELEASE_ASSET_NAMES = Object.freeze(["openai.zip", "portable.zip"]);

export function classifyReleaseAsset({ asset, expected, downloaded = null }) {
  if (!asset) return { status: "missing" };
  if (asset.state !== "uploaded") return { status: "conflict", reason: "asset_not_uploaded" };
  if (asset.size !== expected.bytes) {
    return { status: "conflict", reason: "asset_size_mismatch" };
  }
  const apiDigest = /^sha256:([0-9a-f]{64})$/.exec(asset.digest ?? "")?.[1];
  if (apiDigest) {
    return apiDigest === expected.sha256
      ? { status: "exact" }
      : { status: "conflict", reason: "asset_digest_mismatch" };
  }
  if (!downloaded) return { status: "download_required" };
  return downloaded.bytes === expected.bytes && downloaded.sha256 === expected.sha256
    ? { status: "exact" }
    : { status: "conflict", reason: "downloaded_asset_mismatch" };
}

export function resolveTagCommit(initialObject, readTagObject) {
  let object = initialObject;
  for (let depth = 0; depth < 8; depth += 1) {
    if (object?.type === "commit" && /^[0-9a-f]{40}$/.test(object.sha ?? "")) {
      return object.sha;
    }
    if (object?.type !== "tag" || !/^[0-9a-f]{40}$/.test(object.sha ?? "")) {
      throw new Error("Release tag does not resolve to a commit");
    }
    object = readTagObject(object.sha);
  }
  throw new Error("Release tag indirection exceeds the supported depth");
}

function blocked(reason, releasePublished = false) {
  return {
    status: "blocked",
    reason,
    operations: [],
    requiresAttestation: false,
    releasePublished,
  };
}

function assetState(release, name) {
  return release?.assets?.[name]?.status ?? "missing";
}

export function planReleaseReconciliation({
  tag,
  releaseSha,
  tagCommit = null,
  release = null,
  attestationStatus,
  observationError = null,
  ambiguousRelease = false,
}) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag ?? "")) return blocked("invalid_release_tag");
  if (!/^[0-9a-f]{40}$/.test(releaseSha ?? "")) return blocked("invalid_release_sha");
  if (observationError) return blocked(`observation_failed:${observationError}`);
  if (ambiguousRelease) return blocked("ambiguous_release_state");
  if (!["valid", "missing", "error"].includes(attestationStatus)) {
    return blocked("unknown_attestation_state", Boolean(release && !release.draft));
  }
  if (release && typeof release.draft !== "boolean") {
    return blocked("unknown_release_state");
  }
  if (attestationStatus === "error") {
    return blocked("attestation_observation_failed", Boolean(release && !release.draft));
  }
  if (tagCommit && tagCommit !== releaseSha) return blocked("tag_points_to_different_commit");
  if (release?.tagName !== undefined && release.tagName !== tag) {
    return blocked("release_tag_mismatch", !release.draft);
  }

  const releasePublished = Boolean(release && !release.draft);
  const missingAssets = [];
  for (const name of RELEASE_ASSET_NAMES) {
    const status = assetState(release, name);
    if (status === "conflict") return blocked(`release_asset_conflict:${name}`, releasePublished);
    if (status === "missing") missingAssets.push(name);
    else if (status !== "exact")
      return blocked(`unknown_release_asset_state:${name}`, releasePublished);
  }

  if (releasePublished) {
    if (!tagCommit) return blocked("published_release_missing_tag", true);
    if (attestationStatus !== "valid") {
      return blocked("published_release_missing_valid_publish_attestation", true);
    }
    if (missingAssets.length === 0) {
      return {
        status: "satisfied",
        reason: "published_release_matches",
        operations: [],
        requiresAttestation: false,
        releasePublished: true,
      };
    }
    if (release.immutable !== false) {
      return blocked("published_release_cannot_accept_missing_assets", true);
    }
    return {
      status: "planned",
      reason: "repair_published_release_assets",
      operations: missingAssets.map((name) => ({ type: "upload_asset", name })),
      requiresAttestation: false,
      releasePublished: true,
    };
  }

  if (release?.immutable === true) return blocked("draft_release_reported_immutable");

  const operations = [];
  if (!tagCommit) operations.push({ type: "create_tag" });
  if (!release) operations.push({ type: "create_draft" });
  for (const name of missingAssets) operations.push({ type: "upload_asset", name });
  operations.push({ type: "publish_draft" });

  return {
    status: "planned",
    reason: release
      ? "resume_draft_release"
      : tagCommit
        ? "create_draft_for_existing_tag"
        : "create_release",
    operations,
    requiresAttestation: attestationStatus !== "valid",
    releasePublished: false,
  };
}

function operationIdentity(operation) {
  return JSON.stringify(operation ?? null);
}

export function applyReleaseReconciliation({
  tag,
  releaseSha,
  observe,
  execute,
  maxTransitions = 12,
}) {
  if (typeof observe !== "function" || typeof execute !== "function") {
    throw new Error("Release reconciliation requires observe and execute callbacks");
  }
  if (!Number.isInteger(maxTransitions) || maxTransitions < 1) {
    throw new Error("Release reconciliation maxTransitions must be a positive integer");
  }

  let observation = observe();
  let repairedPublishedRelease = false;
  for (let attempt = 0; attempt < maxTransitions; attempt += 1) {
    const currentPlan = planReleaseReconciliation({ tag, releaseSha, ...observation });
    if (currentPlan.status === "blocked") throw new Error(currentPlan.reason);
    if (currentPlan.status === "satisfied") {
      return {
        ...currentPlan,
        postReleaseDispatchRequired: repairedPublishedRelease,
      };
    }
    if (currentPlan.requiresAttestation) {
      throw new Error(
        "Publish Release attestations must exist before apply mode mutates remote state",
      );
    }
    const operation = currentPlan.operations[0];
    if (!operation) throw new Error("Reconciliation plan contains no executable operation");
    const previousIdentity = operationIdentity(operation);
    if (currentPlan.releasePublished && operation.type === "upload_asset") {
      repairedPublishedRelease = true;
    }

    let mutationError = null;
    try {
      execute(operation, observation);
    } catch (error) {
      mutationError = error;
    }

    const nextObservation = observe();
    const nextPlan = planReleaseReconciliation({ tag, releaseSha, ...nextObservation });
    if (nextPlan.status === "blocked") {
      throw new Error(
        `Reconciliation conflict after ${operation.type}: ${nextPlan.reason}${mutationError ? `; ${mutationError.message}` : ""}`,
      );
    }
    if (nextPlan.status === "satisfied") {
      return {
        ...nextPlan,
        postReleaseDispatchRequired: repairedPublishedRelease,
      };
    }
    if (operationIdentity(nextPlan.operations[0]) === previousIdentity) {
      throw new Error(
        `Remote state remains safely incomplete after ${operation.type}; rerun the workflow${mutationError ? `: ${mutationError.message}` : ""}`,
      );
    }
    observation = nextObservation;
  }
  throw new Error("Release reconciliation exceeded its bounded transition count");
}
