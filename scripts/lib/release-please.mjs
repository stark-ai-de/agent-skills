export const GENERATED_RELEASE_FILES = Object.freeze([
  ".release-please-manifest.json",
  "CHANGELOG.md",
  "package.json",
]);
export const FIRST_AUTOMATED_RELEASE_VERSION = "0.21.0";

const RELEASE_TITLE_PATTERN = /^chore\(release\): release \d+\.\d+\.\d+$/;
const MERGE_TITLE_PATTERN = /^chore\(release\): release \d+\.\d+\.\d+(?: \(#\d+\))?$/;

export function isGeneratedReleaseMerge({ changedFiles, associatedTitles = [], commitTitle = "" }) {
  const normalizedFiles = [...changedFiles].sort();
  if (JSON.stringify(normalizedFiles) !== JSON.stringify([...GENERATED_RELEASE_FILES])) {
    return false;
  }
  return (
    associatedTitles.some((title) => RELEASE_TITLE_PATTERN.test(title.trim())) ||
    MERGE_TITLE_PATTERN.test(commitTitle.trim())
  );
}

export function generatedReleasePullRequests(pullRequests) {
  if (!Array.isArray(pullRequests)) return [];
  return pullRequests.filter((pullRequest) => generatedReleasePullRequest(pullRequest, true));
}

export function generatedReleasePullRequestForCommit(pullRequests, commit) {
  if (!/^[0-9a-f]{40}$/.test(commit ?? "")) return null;
  const matches = generatedReleasePullRequests(pullRequests).filter(
    (pullRequest) => pullRequest?.merge_commit_sha === commit,
  );
  return matches.length === 1 ? matches[0] : null;
}

export function generatedReleasePullRequest(pullRequest, requireMerged = false) {
  return Boolean(
    (!requireMerged || pullRequest?.merged_at) &&
    pullRequest?.base?.ref === "main" &&
    RELEASE_TITLE_PATTERN.test(pullRequest?.title?.trim() ?? ""),
  );
}

export function automatedReleaseVersionSupported(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) return false;
  const current = version.split(".").map(Number);
  const minimum = FIRST_AUTOMATED_RELEASE_VERSION.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (current[index] !== minimum[index]) return current[index] > minimum[index];
  }
  return true;
}

function appSlugFromBotActor(pullRequest) {
  const match = /^https:\/\/github\.com\/apps\/([A-Za-z0-9-]+)$/.exec(
    pullRequest?.user?.html_url ?? "",
  );
  return match?.[1] ?? null;
}

function appIdFromBotActor(pullRequest) {
  // GitHub's canonical App-bot actor payload currently encodes the numeric integration ID here.
  // Accept only that exact shape so provider drift blocks instead of weakening provenance.
  const match = /^https:\/\/avatars\.githubusercontent\.com\/in\/(\d+)(?:\?v=\d+)?$/.exec(
    pullRequest?.user?.avatar_url ?? "",
  );
  return match?.[1] ?? null;
}

function botAccountIdFromActor(pullRequest) {
  const accountId = pullRequest?.user?.id;
  return Number.isSafeInteger(accountId) && accountId > 0 ? String(accountId) : null;
}

export function releasePleasePullRequestOwnershipErrors({
  pullRequest,
  commits,
  repository,
  expectedAppId,
}) {
  const errors = [];
  const appSlug = appSlugFromBotActor(pullRequest);
  const actorAppId = appIdFromBotActor(pullRequest);
  const botAccountId = botAccountIdFromActor(pullRequest);
  const botLogin = typeof appSlug === "string" ? `${appSlug}[bot]` : null;
  if (!/^\d+$/.test(String(expectedAppId ?? "")) || actorAppId !== String(expectedAppId)) {
    errors.push("configured GitHub App identity does not match the release PR actor");
  }
  if (
    !botLogin ||
    !botAccountId ||
    pullRequest?.user?.type !== "Bot" ||
    pullRequest?.user?.login !== botLogin ||
    pullRequest?.user?.html_url !== `https://github.com/apps/${appSlug}`
  ) {
    errors.push("release PR was not opened by the configured App bot");
  }
  if (
    pullRequest?.head?.repo?.full_name !== repository ||
    !/^release-please--branches--main--components--[A-Za-z0-9_.-]+$/.test(
      pullRequest?.head?.ref ?? "",
    )
  ) {
    errors.push("release PR head is not the repository-local Release Please branch");
  }
  if (!Array.isArray(commits) || commits.length !== 1) {
    errors.push("release PR must contain exactly one Release Please commit");
    return errors;
  }
  const [commit] = commits;
  const expectedAuthorEmail =
    botAccountId && botLogin ? `${botAccountId}+${botLogin}@users.noreply.github.com` : null;
  if (
    commit?.sha !== pullRequest?.head?.sha ||
    commit?.author?.login !== botLogin ||
    commit?.commit?.author?.name !== botLogin ||
    commit?.commit?.author?.email !== expectedAuthorEmail ||
    commit?.commit?.message?.trim() !== pullRequest?.title?.trim()
  ) {
    errors.push("release PR head commit is not authored by the configured App bot");
  }
  if (
    commit?.committer?.login !== "web-flow" ||
    commit?.commit?.committer?.name !== "GitHub" ||
    commit?.commit?.committer?.email !== "noreply@github.com" ||
    commit?.commit?.verification?.verified !== true ||
    commit?.commit?.verification?.reason !== "valid"
  ) {
    errors.push("release PR head commit lacks the expected GitHub signature");
  }
  if (!Array.isArray(commit?.parents) || commit.parents.length !== 1) {
    errors.push("release PR head commit must have exactly one base parent");
  }
  return errors;
}
