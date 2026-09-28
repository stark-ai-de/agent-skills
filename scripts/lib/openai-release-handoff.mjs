const TRUSTED_ISSUE_AUTHORS = new Set(["servrox"]);

export function trustedOpenAiReleaseIssue(issue) {
  if (issue?.user?.type === "Bot") return true;
  const login = issue?.user?.login;
  return (
    issue?.user?.type === "User" &&
    typeof login === "string" &&
    TRUSTED_ISSUE_AUTHORS.has(login.toLowerCase())
  );
}

export function openAiReleaseIssueMatches(issue, marker) {
  return Boolean(
    !issue?.pull_request &&
    trustedOpenAiReleaseIssue(issue) &&
    typeof issue?.body === "string" &&
    issue.body.split(/\r?\n/, 1)[0] === marker,
  );
}

export function matchingOpenAiReleaseIssues(issues, marker) {
  return (Array.isArray(issues) ? issues : []).filter((issue) =>
    openAiReleaseIssueMatches(issue, marker),
  );
}

export function openAiReleaseIssueReference(issue) {
  if (!issue) return null;
  return {
    number: issue.number ?? null,
    url: issue.html_url ?? null,
    state: issue.state ?? null,
  };
}
