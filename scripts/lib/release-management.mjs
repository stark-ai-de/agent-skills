import { GENERATED_RELEASE_FILES } from "./release-please.mjs";

export const RELEASE_PLEASE_LIFECYCLE_LABELS = Object.freeze([
  "autorelease: pending",
  "autorelease: tagged",
]);

export const PRE_PUBLICATION_RECOVERY_MAX_COMMITS = 4;

export const PRE_PUBLICATION_RECOVERY_PATHS = Object.freeze([
  ".github/workflows/publish-release.yml",
  "docs/adrs.md",
  "docs/adrs/0051-preserve-release-candidates-through-verified-main-history.guide.md",
  "docs/adrs/0051-preserve-release-candidates-through-verified-main-history.long.md",
  "docs/adrs/0051-preserve-release-candidates-through-verified-main-history.short.md",
  "docs/adrs/0053-recover-unpublished-releases-through-protected-replacement-candidates.guide.md",
  "docs/adrs/0053-recover-unpublished-releases-through-protected-replacement-candidates.long.md",
  "docs/adrs/0053-recover-unpublished-releases-through-protected-replacement-candidates.short.md",
  "docs/publishing.md",
  "incubator/skills/repo-maintenance/release-manager/SKILL.md",
  "scripts/lib/release-management.mjs",
  "scripts/release/manage-release.mjs",
  "scripts/release/verify-prepublication-release-recovery.mjs",
  "scripts/release/verify-release-recovery-subjects.mjs",
  "scripts/validation/adrs/decision-lock.tsv",
  "scripts/validation/test-release-management.mjs",
]);

export const PRE_PUBLICATION_RECOVERY_IMMUTABLE_PATHS = Object.freeze([
  ".release-please-manifest.json",
  "CHANGELOG.md",
  "package.json",
  "plugins/stark-ai-developer.source.json",
]);

export function missingReleasePleaseLifecycleLabels(labels) {
  const observed = new Set(
    Array.isArray(labels)
      ? labels.map((label) => label?.name).filter((name) => typeof name === "string")
      : [],
  );
  return RELEASE_PLEASE_LIFECYCLE_LABELS.filter((name) => !observed.has(name));
}

const COMMIT_SHA = /^[0-9a-f]{40}$/;

function runSha(run) {
  return run?.head_sha ?? run?.headSha;
}

function runBranch(run) {
  return run?.head_branch ?? run?.headBranch;
}

export function successfulMainValidateRun(runs, releaseSha) {
  if (!COMMIT_SHA.test(releaseSha ?? "") || !Array.isArray(runs)) return null;
  return (
    runs.find(
      (run) =>
        runSha(run) === releaseSha &&
        runBranch(run) === "main" &&
        run?.event === "push" &&
        run?.status === "completed" &&
        run?.conclusion === "success" &&
        Number.isSafeInteger(run?.databaseId ?? run?.id),
    ) ?? null
  );
}

export function successfulPullRequestValidateRun(runs, headSha, headBranch) {
  if (!COMMIT_SHA.test(headSha ?? "") || typeof headBranch !== "string" || !Array.isArray(runs)) {
    return null;
  }
  return (
    runs.find(
      (run) =>
        runSha(run) === headSha &&
        runBranch(run) === headBranch &&
        run?.event === "pull_request" &&
        run?.status === "completed" &&
        run?.conclusion === "success" &&
        Number.isSafeInteger(run?.databaseId ?? run?.id),
    ) ?? null
  );
}

export function releaseRecoveryComparisonErrors({
  releaseOriginSha,
  candidateSha,
  comparison,
} = {}) {
  const errors = [];
  const commits = Array.isArray(comparison?.commits) ? comparison.commits : null;
  const files = Array.isArray(comparison?.files) ? comparison.files : null;
  if (!COMMIT_SHA.test(releaseOriginSha ?? "")) errors.push("release origin SHA is invalid");
  if (!COMMIT_SHA.test(candidateSha ?? "")) errors.push("replacement candidate SHA is invalid");
  if (releaseOriginSha === candidateSha) {
    errors.push("replacement candidate must be newer than the release origin");
  }
  if (comparison?.base_commit?.sha !== releaseOriginSha) {
    errors.push("recovery comparison base is not the release origin");
  }
  if (comparison?.merge_base_commit?.sha !== releaseOriginSha) {
    errors.push("recovery merge base is not the release origin");
  }
  if (comparison?.status !== "ahead" || comparison?.behind_by !== 0) {
    errors.push("replacement candidate is not a strict descendant of the release origin");
  }
  if (
    !Number.isSafeInteger(comparison?.ahead_by) ||
    comparison.ahead_by < 1 ||
    !Number.isSafeInteger(comparison?.total_commits) ||
    comparison.total_commits < 1 ||
    comparison.ahead_by !== comparison.total_commits ||
    comparison.total_commits > PRE_PUBLICATION_RECOVERY_MAX_COMMITS
  ) {
    errors.push("recovery commit distance is invalid or exceeds the reviewed bound");
  }
  if (
    commits === null ||
    commits.length !== comparison?.total_commits ||
    commits.at(-1)?.sha !== candidateSha
  ) {
    errors.push("recovery commit response is incomplete or has the wrong head");
  }
  if (files === null || files.length < 1 || files.length > PRE_PUBLICATION_RECOVERY_PATHS.length) {
    errors.push("recovery file response is missing or exceeds the reviewed bound");
    return errors;
  }
  const allowed = new Set(PRE_PUBLICATION_RECOVERY_PATHS);
  const observed = new Set();
  let publicationWorkflowChanged = false;
  for (const file of files) {
    const filename = file?.filename;
    if (typeof filename !== "string" || observed.has(filename)) {
      errors.push("recovery file response contains an invalid or duplicate path");
      continue;
    }
    observed.add(filename);
    if (!allowed.has(filename)) errors.push(`recovery path is not allowed: ${filename}`);
    if (!new Set(["added", "modified"]).has(file?.status) || file?.previous_filename) {
      errors.push(`recovery file status is not allowed: ${filename}`);
    }
    if (filename === ".github/workflows/publish-release.yml") publicationWorkflowChanged = true;
  }
  if (!publicationWorkflowChanged) {
    errors.push("recovery diff does not change the guarded publication workflow");
  }
  return errors;
}

export function prePublicationRecoveryErrors({
  releaseOriginSha,
  candidateSha,
  branch,
  comparison,
  candidateContainmentComparison,
  allowContainedCandidate = false,
  validateRuns,
  releasePullRequest,
  releasePullRequestFiles,
  releasePullRequestValidateRuns,
  immutableFiles,
  releaseExists,
  tagExists,
} = {}) {
  const errors = [];
  const mainSha = branch?.commit?.sha;
  if (branch?.protected !== true) errors.push("main is not protected");
  if (!COMMIT_SHA.test(mainSha ?? "")) errors.push("main SHA is invalid");
  if (allowContainedCandidate) {
    errors.push(
      ...mainCandidateContainmentErrors({
        candidateSha,
        branch,
        comparison: candidateContainmentComparison,
      }),
    );
  } else if (candidateSha !== mainSha) {
    errors.push("replacement candidate is not the exact protected main revision");
  }
  errors.push(...releaseRecoveryComparisonErrors({ releaseOriginSha, candidateSha, comparison }));
  if (!successfulMainValidateRun(validateRuns, releaseOriginSha)) {
    errors.push("release origin has no successful hosted Validate push run on main");
  }
  if (
    releasePullRequest?.merge_commit_sha !== releaseOriginSha ||
    releasePullRequest?.base?.ref !== "main" ||
    !releasePullRequest?.merged_at ||
    !COMMIT_SHA.test(releasePullRequest?.head?.sha ?? "") ||
    typeof releasePullRequest?.head?.ref !== "string"
  ) {
    errors.push("release origin pull request identity is invalid");
  }
  const originFiles = Array.isArray(releasePullRequestFiles)
    ? releasePullRequestFiles.map((file) => file?.filename).sort()
    : null;
  if (
    !originFiles ||
    JSON.stringify(originFiles) !== JSON.stringify([...GENERATED_RELEASE_FILES].sort()) ||
    releasePullRequestFiles.some(
      (file) => file?.status !== "modified" || typeof file?.previous_filename === "string",
    )
  ) {
    errors.push("release origin pull request did not change exactly the generated release files");
  }
  if (
    !successfulPullRequestValidateRun(
      releasePullRequestValidateRuns,
      releasePullRequest?.head?.sha,
      releasePullRequest?.head?.ref,
    )
  ) {
    errors.push("release origin pull request has no successful hosted Validate run");
  }
  const immutableByPath = new Map(
    Array.isArray(immutableFiles) ? immutableFiles.map((file) => [file?.path, file]) : [],
  );
  for (const immutablePath of PRE_PUBLICATION_RECOVERY_IMMUTABLE_PATHS) {
    const file = immutableByPath.get(immutablePath);
    if (
      !COMMIT_SHA.test(file?.originBlobSha ?? "") ||
      !COMMIT_SHA.test(file?.candidateBlobSha ?? "") ||
      file.originBlobSha !== file.candidateBlobSha
    ) {
      errors.push(`immutable release input changed or is unavailable: ${immutablePath}`);
    }
  }
  if (releaseExists !== false) errors.push("target-version GitHub Release is not proven absent");
  if (tagExists !== false) errors.push("target tag is not proven absent");
  return [...new Set(errors)];
}

export function releaseRecoverySubjectErrors(origin, candidate) {
  const errors = [];
  if (!origin || !candidate) return ["both recovery subject documents are required"];
  const comparable = (document) => ({
    schemaVersion: document.schemaVersion,
    status: document.status,
    sourceState: document.sourceRevision?.state,
    sourceTag: document.sourceRevision?.tag,
    releaseVersion: document.releaseVersion,
    pluginVersion: document.pluginVersion,
    archiveProfile: document.archiveProfile,
    subjects: {
      openai: {
        name: document.subjects?.openai?.name,
        sha256: document.subjects?.openai?.sha256,
        bytes: document.subjects?.openai?.bytes,
      },
      portable: {
        name: document.subjects?.portable?.name,
        sha256: document.subjects?.portable?.sha256,
        bytes: document.subjects?.portable?.bytes,
      },
    },
    differences: Array.isArray(document.differences) ? [...document.differences] : null,
  });
  const originComparable = comparable(origin);
  const candidateComparable = comparable(candidate);
  if (JSON.stringify(originComparable) !== JSON.stringify(candidateComparable)) {
    errors.push("origin and replacement release subjects are not payload-equivalent");
  }
  if (
    origin.sourceRevision?.tag !== "manual-review-required" ||
    candidate.sourceRevision?.tag !== "manual-review-required"
  ) {
    errors.push("pre-publication recovery subjects must retain the untagged validation marker");
  }
  return errors;
}

export function mainCandidateContainmentErrors({ candidateSha, branch, comparison } = {}) {
  const errors = [];
  const mainSha = branch?.commit?.sha;
  const candidateIsObservedMain = COMMIT_SHA.test(candidateSha ?? "") && candidateSha === mainSha;
  if (branch?.protected !== true) errors.push("main is not protected");
  if (!COMMIT_SHA.test(candidateSha ?? "")) errors.push("release candidate SHA is invalid");
  if (!COMMIT_SHA.test(mainSha ?? "")) errors.push("main SHA is invalid");
  if (comparison?.base_commit?.sha !== candidateSha) {
    errors.push("comparison base is not the release candidate");
  }
  if (comparison?.merge_base_commit?.sha !== candidateSha) {
    errors.push("comparison merge base is not the release candidate");
  }
  // GitHub omits head_commit; the last commit of an unpaginated comparison is its documented head.
  const commits = Array.isArray(comparison?.commits) ? comparison.commits : null;
  if (!candidateIsObservedMain && (commits === null || commits.at(-1)?.sha !== mainSha)) {
    errors.push("comparison head is not the observed main revision");
  }
  if (
    candidateIsObservedMain &&
    (comparison?.ahead_by !== 0 ||
      comparison?.behind_by !== 0 ||
      comparison?.total_commits !== 0 ||
      commits?.length !== 0)
  ) {
    errors.push("comparison distance is inconsistent with identical revisions");
  }
  if (
    !candidateIsObservedMain &&
    (!Number.isSafeInteger(comparison?.ahead_by) ||
      comparison.ahead_by < 1 ||
      comparison?.behind_by !== 0 ||
      !Number.isSafeInteger(comparison?.total_commits) ||
      comparison.total_commits < 1 ||
      comparison.ahead_by !== comparison.total_commits)
  ) {
    errors.push("comparison distance is inconsistent with an advanced main revision");
  }
  const expectedStatus = candidateIsObservedMain ? "identical" : "ahead";
  if (comparison?.status !== expectedStatus) {
    errors.push("release candidate is not contained in protected main");
  }
  return errors;
}

export function approvalRunErrors(run, containment) {
  const errors = [];
  if (run?.path !== ".github/workflows/publish-release.yml") {
    errors.push("run is not Publish Release");
  }
  if (!new Set(["push", "workflow_dispatch"]).has(run?.event)) {
    errors.push("run event is not an allowed publication event");
  }
  if (run?.head_branch !== "main") errors.push("run does not target main");
  if (!COMMIT_SHA.test(run?.head_sha ?? "")) {
    errors.push("run SHA is invalid");
  } else {
    errors.push(
      ...mainCandidateContainmentErrors({
        candidateSha: run.head_sha,
        ...containment,
      }),
    );
  }
  if (run?.status !== "waiting" || run?.conclusion !== null) {
    errors.push("run is not waiting for environment approval");
  }
  return errors;
}
