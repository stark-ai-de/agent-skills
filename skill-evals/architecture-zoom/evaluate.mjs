/** Read-only qualification evidence checker. It does not execute agents or attest truthful logs. */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const requireCondition = (ok, message, errors) => {
  if (!ok) errors.push(message);
};
const hasText = (value) => typeof value === "string" && value.trim().length > 0;

/** Hash authored payloads, not generated projections, dates, or captured evaluation output. */
export function snapshot(root) {
  const choices = ["skills", "incubator/skills"]
    .map((base) => `${base}/engineering-workflows/architecture-zoom`)
    .filter((p) => fs.existsSync(path.join(root, p, "SKILL.md")));
  if (choices.length !== 1) throw new Error("Expected exactly one Architecture Zoom source");
  const sources = [
    choices[0],
    "skills/engineering-workflows/architecture-compass",
    "skills/codex-operations/codex-spec-interviewer",
  ];
  const entries = [];
  const walk = (dir, prefix) => {
    for (const item of fs
      .readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name, "en"))) {
      const name = `${prefix}/${item.name}`;
      const full = path.join(dir, item.name);
      if (item.isSymbolicLink()) throw new Error(`Unexpected payload symlink: ${name}`);
      if (item.isDirectory()) walk(full, name);
      else if (item.isFile()) entries.push([name, digest(fs.readFileSync(full))]);
    }
  };
  // A candidate can move from incubator to public without changing its logical payload identity.
  for (const source of sources) walk(path.join(root, source), path.basename(source));
  const casesBytes = fs.readFileSync(path.join(root, "skill-evals/architecture-zoom/cases.json"));
  return {
    sourceFingerprint: digest(JSON.stringify(entries)),
    casesFingerprint: digest(casesBytes),
    cases: JSON.parse(casesBytes).cases,
  };
}

/** Evidence files must remain inside the submitted run directory, including through symlinks. */
export function readEvidence(base, relative) {
  if (!hasText(relative) || path.isAbsolute(relative))
    throw new Error("Evidence needs a relative file path");
  const safeBase = fs.realpathSync(base);
  const resolved = fs.realpathSync(path.resolve(safeBase, relative));
  const rel = path.relative(safeBase, resolved);
  if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel))
    throw new Error("Evidence escapes the run directory");
  if (!fs.statSync(resolved).isFile()) throw new Error("Evidence is not a regular file");
  return fs.readFileSync(resolved);
}

/** ADR-0065: catalog admission is a decision, never observed host qualification. */
export function assessPublicAdmission(record, current) {
  const errors = [];
  const need = (ok, message) => requireCondition(ok, message, errors);
  if (!record || typeof record !== "object" || Array.isArray(record))
    return { admitted: false, qualified: false, errors: ["Admission must be an object"] };
  need(record.schemaVersion === 1, "Unsupported admission schema");
  need(
    record.kind === "maintainer-directed-public-release",
    "Expected a public-admission decision",
  );
  need(record.skill === "architecture-zoom", "Admission names another skill");
  need(
    record.status === "Accepted" && record.decision === "ADR-0065",
    "Accepted ADR-0065 admission is required",
  );
  need(
    record.sourceFingerprint === current.sourceFingerprint,
    "Stale public-admission source fingerprint",
  );
  need(
    record.casesFingerprint === current.casesFingerprint,
    "Changed public-admission case fingerprint",
  );
  need(
    record.approval?.approved === true &&
      hasText(record.approval?.authority) &&
      hasText(record.approval?.scope),
    "Explicit maintainer release acceptance is missing",
  );
  need(
    record.nativeHostQualification === "not-run",
    "Admission cannot claim native-host qualification",
  );
  need(
    Array.isArray(record.claimedQualifiedHosts) && record.claimedQualifiedHosts.length === 0,
    "Admission cannot name qualified hosts",
  );
  need(
    hasText(record.qualityAssessment) &&
      hasText(record.maintenanceOwner) &&
      hasText(record.limitations),
    "Document quality, maintenance and evidence limits",
  );
  return { admitted: errors.length === 0, qualified: false, errors };
}

/** Assess capture integrity plus explicit judgments; never infer agent behavior from skill wording. */
export function assess(report, current, read) {
  const errors = [];
  if (!report || typeof report !== "object" || Array.isArray(report))
    return { qualified: false, errors: ["Report must be an object"] };
  const need = (ok, message) => requireCondition(ok, message, errors);
  need(report.schemaVersion === 1, "Unsupported evidence schema");
  need(
    report.kind === "observed-agent-evaluation",
    "Synthetic/unit fixtures are not qualification evidence",
  );
  need(
    report.sourceFingerprint === current.sourceFingerprint,
    "Stale or missing source fingerprint",
  );
  need(
    report.casesFingerprint === current.casesFingerprint,
    "Changed or missing frozen-case fingerprint",
  );
  need(Array.isArray(report.runs), "runs must be an array");
  need(
    Array.isArray(report.claimedHosts) &&
      report.claimedHosts.length > 0 &&
      report.claimedHosts.every(hasText),
    "Name at least one actually exercised host",
  );
  need(Array.isArray(report.hostEvidence), "hostEvidence must be an array");
  need(hasText(report.captureMethod), "Document the real capture method and its limitations");
  if (
    !Array.isArray(report.runs) ||
    !Array.isArray(report.claimedHosts) ||
    !Array.isArray(report.hostEvidence)
  )
    return { qualified: false, errors };
  need(new Set(report.claimedHosts).size === report.claimedHosts.length, "Duplicate claimed host");
  const hostEvidence = report.hostEvidence.filter((item) => {
    const valid = item !== null && typeof item === "object" && !Array.isArray(item);
    need(valid, "Invalid host evidence");
    return valid;
  });
  const evidenceDigests = new Set();
  const verifyArtifact = (artifact, label, unique = false) => {
    if (!artifact || !hasText(artifact.path) || !/^[a-f0-9]{64}$/.test(artifact.sha256 ?? "")) {
      need(false, `${label}: missing evidence path/digest`);
      return;
    }
    try {
      const bytes = read(artifact.path);
      need(
        bytes.length > 0 && digest(bytes) === artifact.sha256,
        `${label}: missing, empty or changed evidence`,
      );
      if (unique) {
        need(
          !evidenceDigests.has(artifact.sha256),
          `${label}: reused transcript instead of a separate observed run`,
        );
        evidenceDigests.add(artifact.sha256);
      }
    } catch (error) {
      need(false, `${label}: ${error.message}`);
    }
  };
  const caseMap = new Map(current.cases.map((test) => [test.id, test]));
  const runMap = new Map();
  for (const run of report.runs ?? []) {
    if (!run || typeof run !== "object") {
      need(false, "Invalid run");
      continue;
    }
    const test = caseMap.get(run.caseId);
    const key = `${run.host}/${run.caseId}/${run.arm}`;
    need(!runMap.has(key), `Duplicate run: ${key}`);
    runMap.set(key, run);
    need(Boolean(test), `Unknown case: ${run.caseId}`);
    need(["baseline", "candidate"].includes(run.arm), `${key}: unknown comparison arm`);
    need((report.claimedHosts ?? []).includes(run.host), `${key}: unlisted host`);
    need(
      hasText(run.model) && hasText(run.hostVersion) && hasText(run.sessionId),
      `${key}: missing model/host/session identity`,
    );
    need(run.freshContext === true, `${key}: baseline and candidate need separate fresh contexts`);
    need(run.inputSha256 === digest(test?.input ?? ""), `${key}: input differs from frozen case`);
    need(run.result === "observed", `${key}: blocked, not-run or synthetic run cannot qualify`);
    verifyArtifact(run.transcript, `${key} transcript`, true);
    verifyArtifact(run.effects, `${key} effect trace`);
    need(Array.isArray(run.observedForbidden), `${key}: explicitly record forbidden observations`);
    need(
      hasText(run.reviewer) && hasText(run.reviewRationale),
      `${key}: missing review identity/rationale`,
    );
    const criteria = run.criteria ?? {};
    if (test)
      for (const required of test.required)
        need(typeof criteria[required] === "boolean", `${key}: unjudged criterion ${required}`);
    if (run.arm === "candidate" && test) {
      need(run.observedForbidden?.length === 0, `${key}: forbidden behavior observed`);
      for (const required of test.required)
        need(criteria[required] === true, `${key}: unmet ${required}`);
      need(run.reviewBudgetExceeded === false, `${key}: review budget not observed or exceeded`);
    }
  }
  for (const host of report.claimedHosts ?? []) {
    for (const test of current.cases) {
      const baseline = runMap.get(`${host}/${test.id}/baseline`);
      const candidate = runMap.get(`${host}/${test.id}/candidate`);
      need(
        Boolean(baseline) && Boolean(candidate),
        `${host}/${test.id}: both baseline and candidate are required`,
      );
      if (baseline && candidate) {
        need(
          baseline.sessionId !== candidate.sessionId,
          `${host}/${test.id}: contexts are not isolated`,
        );
        need(
          baseline.model === candidate.model && baseline.hostVersion === candidate.hostVersion,
          `${host}/${test.id}: comparison confounds model or host version`,
        );
      }
    }
    const observations = hostEvidence.filter((item) => item.host === host);
    for (const type of ["discovery-install", "fresh-session-routing", "negative-authority"]) {
      const found = observations.filter((item) => item.type === type);
      need(
        found.length === 1 && found[0]?.observed === true,
        `${host}: missing/duplicate/unobserved ${type} evidence`,
      );
      if (found.length === 1) verifyArtifact(found[0].artifact, `${host}/${type}`);
    }
  }
  const judgment = report.maintainerJudgment;
  need(
    judgment?.approved === true && hasText(judgment?.reviewer),
    "Maintainer promotion judgment is missing",
  );
  need(
    hasText(judgment?.baselineImprovement) &&
      hasText(judgment?.maintenanceOwner) &&
      hasText(judgment?.limitations),
    "Document baseline improvement, ownership and qualification limits",
  );
  verifyArtifact(judgment?.approvalEvidence, "Maintainer approval");
  return { qualified: errors.length === 0, errors };
}

export function main(args = process.argv.slice(2), root = process.cwd()) {
  if (args.length !== 1 || args[0].startsWith("-")) {
    console.error(
      "Usage: pnpm run qualify:product-planning -- <captured-run/report.json>\nNo captured evidence supplied: native-host qualification remains unproven. Public admission is a separate maintainer decision. This command never runs an agent, installs, or publishes.",
    );
    return 2;
  }
  try {
    const reportFile = path.resolve(args[0]);
    const report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
    const result = assess(report, snapshot(root), (p) => readEvidence(path.dirname(reportFile), p));
    console.log(
      JSON.stringify(
        {
          ...result,
          limitation:
            "Evidence integrity and reviewer assertions only; authenticate captures and approval provenance before promotion.",
        },
        null,
        2,
      ),
    );
    return result.qualified ? 0 : 1;
  } catch (error) {
    console.error(error.message);
    return 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  process.exitCode = main();
