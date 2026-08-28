export const RELEASE_PLEASE_LIFECYCLE_LABELS = Object.freeze([
  "autorelease: pending",
  "autorelease: tagged",
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

export function mainCandidateContainmentErrors({ candidateSha, branch, comparison } = {}) {
  const errors = [];
  const mainSha = branch?.commit?.sha;
  if (branch?.protected !== true) errors.push("main is not protected");
  if (!COMMIT_SHA.test(candidateSha ?? "")) errors.push("release candidate SHA is invalid");
  if (!COMMIT_SHA.test(mainSha ?? "")) errors.push("main SHA is invalid");
  if (comparison?.base_commit?.sha !== candidateSha) {
    errors.push("comparison base is not the release candidate");
  }
  if (comparison?.head_commit?.sha !== mainSha) {
    errors.push("comparison head is not the observed main revision");
  }
  const expectedStatus = candidateSha === mainSha ? "identical" : "ahead";
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
