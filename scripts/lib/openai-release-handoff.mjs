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

/** Pure route decision: private evidence is supplied by the maintainer, never fetched or published. */
export function selectOpenAiReleaseRoute(evidence = {}) {
  const routes = ["A0", "A1", "B", "C", "D"];
  if (evidence.activeRoute) {
    if (!routes.includes(evidence.activeRoute))
      throw new Error("Unknown active OpenAI release route");
    if (["in-review", "published", "repair-required"].includes(evidence.activeStatus))
      return {
        route: evidence.activeRoute,
        status: evidence.activeStatus,
        reason:
          "Preserve the active route; review, publication and repair do not trigger fallback.",
      };
    if (evidence.activeStatus !== "route-unavailable")
      return {
        route: evidence.activeRoute,
        status: "verify",
        reason: "Confirm the active route outcome before selecting another.",
      };
    if (evidence.activeRoute === "D")
      return {
        route: "D",
        status: "bridge-only",
        reason: "Direct installation does not establish public OpenAI publication.",
      };
    if (evidence.unavailabilityKind !== "route-specific")
      return {
        route: evidence.activeRoute,
        status: "repair-required",
        reason: "Only route-specific eligibility or transport restrictions permit fallback.",
      };
    const rejected = new Set(routes.slice(0, routes.indexOf(evidence.activeRoute) + 1));
    const next = {
      ...evidence,
      activeRoute: undefined,
      skillsOnlyUpdate: rejected.has("A0") ? "unavailable" : evidence.skillsOnlyUpdate,
      existingMigration: rejected.has("A1") ? "unavailable" : evidence.existingMigration,
      newRemote: rejected.has("B") ? "unavailable" : evidence.newRemote,
      desktopPartner: rejected.has("C") ? "unavailable" : evidence.desktopPartner,
    };
    return selectOpenAiReleaseRoute(next);
  }
  if (evidence.skillsOnlyUpdate === "confirmed")
    return {
      route: "A0",
      status: "prepare",
      reason: "Use the permitted existing skills-only update; no MCP is required.",
    };
  if (evidence.skillsOnlyUpdate !== "unavailable")
    return {
      route: "A0",
      status: "verify",
      reason: "Check the existing update path once; a clearly attributed rejection counts.",
    };
  if (evidence.existingMigration === "confirmed")
    return {
      route: "A1",
      status: "prepare",
      reason: "Preserve the existing identity with confirmed MCP migration permission.",
    };
  if (evidence.newRemote !== "unavailable")
    return {
      route: "B",
      status: "prepare",
      reason:
        "The documented migration restriction permits a new remote-MCP candidate without waiting for support.",
    };
  if (evidence.desktopPartner === "confirmed")
    return {
      route: "C",
      status: "prepare",
      reason: "Use the confirmed partner stdio route with the same validator.",
    };
  return {
    route: "D",
    status: "bridge-only",
    reason:
      "No confirmed public route remains; use the existing portable distribution as a bridge.",
  };
}
