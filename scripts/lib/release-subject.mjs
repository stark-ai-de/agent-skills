import crypto from "node:crypto";
import fs from "node:fs";

export const RELEASE_SUBJECT_FILE = "release-subject.json";
export const RELEASE_SUBJECT_SCHEMA_PATH =
  "skill-evals/stark-ai-developer/evidence/release-subject.schema.json";
export const RELEASE_SUBJECT_NAMES = Object.freeze(["openai.zip", "portable.zip"]);
export const HISTORICAL_RELEASES = Object.freeze({
  "v0.19.1": "35101f206b2416b2ac5a5fb7205fdd65c3f843b1",
});

const SHA256_HEX = /^[a-f0-9]{64}$/;
const GIT_COMMIT_HEX = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${filePath}: ${error.message}`);
  }
}

export function createReleaseSubject({
  status,
  sourceRevision,
  releaseVersion,
  pluginVersion,
  archiveProfile,
  openaiProfile,
  skillsOnlyProfile,
  openai,
  skillsOnly,
  portable,
  differences = [],
}) {
  const multiProfile = Boolean(skillsOnly || skillsOnlyProfile);
  if (multiProfile && (!skillsOnly || !skillsOnlyProfile || !openaiProfile)) {
    throw new Error("both OpenAI profiles and archive subjects are required");
  }
  return {
    schemaVersion: multiProfile ? 2 : 1,
    status,
    sourceRevision: {
      commit: sourceRevision.commit,
      tag: sourceRevision.tag,
      state: sourceRevision.state,
    },
    releaseVersion,
    pluginVersion,
    archiveProfile,
    ...(openaiProfile ? { openaiProfile } : {}),
    ...(skillsOnlyProfile ? { openaiSkillsOnlyProfile: skillsOnlyProfile } : {}),
    subjects: {
      openai: {
        name: multiProfile ? "openai-tools.zip" : "openai.zip",
        sha256: openai.sha256,
        bytes: openai.bytes,
      },
      ...(multiProfile
        ? {
            openaiSkillsOnly: {
              name: "openai-skills-only.zip",
              sha256: skillsOnly.sha256,
              bytes: skillsOnly.bytes,
            },
          }
        : {}),
      portable: { name: "portable.zip", sha256: portable.sha256, bytes: portable.bytes },
    },
    differences: [...differences],
  };
}

export function normalizeReleaseSubject(report, { releaseTag } = {}) {
  if (
    report?.schemaVersion === 2 &&
    (!report?.openaiSkillsOnlyProfile || !report?.subjects?.openaiSkillsOnly)
  ) {
    throw new Error("multi-profile release subject is incomplete");
  }
  const sourceRevision = report?.sourceRevision ?? {
    commit: report?.sourceCommit,
    tag: report?.releaseTag ?? releaseTag ?? "manual-review-required",
    state: report?.sourceState ?? "unknown",
  };
  const subjects = report?.subjects ?? {
    openai: report?.openai,
    portable: report?.portable,
  };
  const releaseVersion = report?.releaseVersion ?? report?.pluginVersion;

  return createReleaseSubject({
    status: report?.status,
    sourceRevision,
    releaseVersion,
    pluginVersion: report?.pluginVersion,
    archiveProfile: report?.archiveProfile,
    openaiProfile: report?.openaiProfile,
    skillsOnlyProfile: report?.openaiSkillsOnlyProfile,
    openai: subjects?.openai,
    skillsOnly: subjects?.openaiSkillsOnly,
    portable: subjects?.portable,
    differences: report?.differences ?? [],
  });
}

export function readReleaseSubject(filePath) {
  return readJson(filePath);
}

export function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

export function assertReleaseSubjectRevision(sourceRevision) {
  if (!GIT_COMMIT_HEX.test(sourceRevision)) {
    throw new Error("release subjects require a committed source SHA");
  }
}

export function isSha256(value) {
  return typeof value === "string" && SHA256_HEX.test(value);
}
