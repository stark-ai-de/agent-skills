import process from "node:process";

const ARCHIVE_SUBJECTS = [
  {
    name: "openai.zip",
    sha256: "OPENAI_SHA",
    bytes: "OPENAI_BYTES",
    publishedSha256: "PUBLISHED_OPENAI_SHA",
  },
  {
    name: "portable.zip",
    sha256: "PORTABLE_SHA",
    bytes: "PORTABLE_BYTES",
    publishedSha256: "PUBLISHED_PORTABLE_SHA",
  },
];
const LIFECYCLE_OPERATIONS = ["add", "enable", "disable", "update", "remove"];

function envValue(name, fallback = "") {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

function envInteger(name, fallback = 0) {
  const value = Number.parseInt(envValue(name), 10);
  return Number.isInteger(value) ? value : fallback;
}

function baseReceipt(receiptType, status, evidenceClass) {
  return {
    schemaVersion: "1",
    receiptType,
    status,
    evidenceClass,
    generatedAt: envValue("GENERATED_AT", new Date().toISOString()),
  };
}

function lifecycle(operations) {
  return { operations };
}

function nonClientLifecycle(reason) {
  return lifecycle(
    Object.fromEntries(
      LIFECYCLE_OPERATIONS.map((operation) => [operation, { status: "not_applicable", reason }]),
    ),
  );
}

function archiveArtifacts(packageStatus, role = "generated") {
  if (!["pass", "not_applicable"].includes(packageStatus)) return [];

  return ARCHIVE_SUBJECTS.map(({ name, sha256, bytes, publishedSha256 }) => {
    const publishedDigest = envValue(publishedSha256);
    return {
      name,
      role,
      sha256: envValue(sha256),
      bytes: envInteger(bytes),
      ...(publishedDigest ? { publishedSha256: publishedDigest } : {}),
    };
  });
}

function archiveSubjects(artifacts) {
  return artifacts.map(({ name, sha256 }) => ({ name, sha256 }));
}

function archiveRelease(archiveSubjectsStatus) {
  return {
    tag: envValue("RECEIPT_TAG"),
    sourceCommit: envValue("SOURCE_COMMIT"),
    sourceState: "clean",
    event: envValue("EVENT_NAME"),
    archiveSubjectsStatus,
  };
}

function archiveAttestation(status, artifacts) {
  const attestation = {
    status,
    subjects: status === "verified" ? archiveSubjects(artifacts) : [],
  };
  if (status === "verified") {
    Object.assign(attestation, {
      repository: envValue("REPOSITORY"),
      sourceDigest: envValue("SOURCE_COMMIT"),
      sourceRef: envValue("SOURCE_REF"),
      signerWorkflow: envValue("SIGNER_WORKFLOW"),
      signerDigest: envValue("SIGNER_DIGEST"),
      predicateType: "https://slsa.dev/provenance/v1",
    });
  }
  return attestation;
}

function archiveReceipt({
  receiptType,
  status,
  evidenceClass,
  packageStatus,
  archiveSubjectsStatus,
  attestationStatus,
  client,
  tests,
  lifecycle: lifecycleValue,
  blockers,
  reason,
  artifactRole = "generated",
  event,
  verifier,
}) {
  const artifacts = archiveArtifacts(packageStatus, artifactRole);
  return {
    ...baseReceipt(receiptType, status, evidenceClass),
    release: {
      ...archiveRelease(archiveSubjectsStatus),
      ...(event ? { event } : {}),
    },
    artifacts,
    attestation: archiveAttestation(attestationStatus, artifacts),
    ...(verifier ? { verifier } : {}),
    client,
    tests,
    lifecycle: lifecycleValue,
    blockers,
    reason,
  };
}

function renderPreRelease() {
  return archiveReceipt({
    receiptType: "pre_release_archive",
    status: "pass",
    evidenceClass: "repo-verified",
    packageStatus: "pass",
    archiveSubjectsStatus: "pass",
    attestationStatus: "verified",
    client: { name: "GitHub Actions", surface: "pre-publication-publisher" },
    tests: {
      ids: ["PRE-RELEASE-PACKAGE", "PRE-RELEASE-IDENTITY", "PRE-RELEASE-ATTESTATION"],
      commandFamily: "verify_release_subjects;actions_attest;gh_attestation_verify",
      counts: { total: 3, passed: 3, blocked: 0, notRun: 0, notApplicable: 0 },
    },
    lifecycle: nonClientLifecycle("not_a_client_lifecycle_receipt"),
    blockers: [],
    reason: "validated_release_subjects_attested_before_publication",
    artifactRole: "publication-subject",
    event: "workflow_dispatch",
  });
}

function renderPostRelease() {
  const tag = envValue("RECEIPT_TAG");
  const historical = tag === "v0.19.1";
  const requestedPackageStatus = envValue("PACKAGE_STATUS", "blocked");
  const packageStatus = historical
    ? requestedPackageStatus === "not_applicable"
      ? "not_applicable"
      : "blocked"
    : requestedPackageStatus;
  const requestedAssetStatus = envValue("ASSET_STATUS", "blocked");
  const assetStatus = historical
    ? requestedAssetStatus === "not_applicable"
      ? "not_applicable"
      : "blocked"
    : requestedAssetStatus;
  const reportedAttestationStatus = envValue("ATTESTATION_STATUS", "blocked");
  const attestationStatus =
    reportedAttestationStatus === "verified" && assetStatus !== "pass"
      ? "blocked"
      : reportedAttestationStatus;
  const blockers = [
    ...(packageStatus === "blocked" ? ["tag_bound_archive_rebuild_failed"] : []),
    ...(assetStatus === "blocked" ? ["published_release_subjects_mismatch"] : []),
    ...(attestationStatus === "blocked" ? ["tag_bound_attestation_verification_failed"] : []),
    ...(historical ? ["historical_unsigned_release_not_pre_publication_attested"] : []),
  ];
  const passed = [packageStatus, assetStatus, attestationStatus].filter(
    (statusValue) => statusValue === "pass" || statusValue === "verified",
  ).length;
  const notApplicable = [packageStatus, assetStatus, attestationStatus].filter(
    (statusValue) =>
      statusValue === "not_applicable" || statusValue === "not-pre-publication-attested",
  ).length;
  const historicalPass =
    historical &&
    packageStatus === "not_applicable" &&
    assetStatus === "not_applicable" &&
    attestationStatus === "not-pre-publication-attested";
  const status = historical
    ? historicalPass
      ? "retrospective"
      : "blocked"
    : packageStatus === "pass" && assetStatus === "pass" && attestationStatus === "verified"
      ? "pass"
      : "blocked";

  return archiveReceipt({
    receiptType: "post_release_archive",
    status,
    evidenceClass: historical ? "historical" : "repo-verified",
    packageStatus,
    archiveSubjectsStatus: assetStatus,
    attestationStatus,
    verifier: {
      workflowRef: envValue("VERIFIER_REF"),
      workflowSha: envValue("VERIFIER_SHA"),
      protectedDefaultBranch: envValue("PROTECTED_DEFAULT_BRANCH") === "true",
    },
    artifactRole: "verification-subject",
    client: { name: "GitHub Actions", surface: "post-release-verifier" },
    tests: {
      ids: ["POST-RELEASE-PACKAGE", "POST-RELEASE-RELEASE-SUBJECTS", "POST-RELEASE-ATTESTATION"],
      commandFamily:
        "git_checkout;prepare_release_subjects;gh_release_download;compare_release_subjects;gh_attestation_verify",
      counts: {
        total: 3,
        passed,
        blocked: 3 - passed - notApplicable,
        notRun: 0,
        notApplicable,
      },
    },
    lifecycle: nonClientLifecycle("not_a_client_lifecycle_receipt"),
    blockers,
    reason: historical
      ? "historical_unsigned_release_retrospective"
      : status === "pass"
        ? "tag_bound_archives_and_attestations_verified"
        : "post_publication_verification_failed",
  });
}

export function renderReceipt(kind) {
  switch (kind) {
    case "pre_release_archive":
      return renderPreRelease();
    case "post_release_archive":
      return renderPostRelease();
    default:
      throw new Error(`Unknown receipt render kind: ${kind}`);
  }
}
