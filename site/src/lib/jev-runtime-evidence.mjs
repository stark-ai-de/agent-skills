import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// Historical default; current presentation supplies its reviewed measurement-series revision.
export const measuredRevision = "a4a8512dd8ebb55abb26650e08af38f301cea064";
export const measuredSourceUrl = `https://github.com/stark-ai-de/agent-skills/tree/${measuredRevision}/skills/skill-maintenance/jev-capability-advisor/scripts`;
// Site builds run from site/; direct consistency checks run from the repository root.
// Resolve from cwd, as the other site loaders do, because Astro bundles this module.
function currentRuntimeDirectory() {
  const cwd = process.cwd();
  const root =
    existsSync(join(cwd, "skills")) && existsSync(join(cwd, "incubator"))
      ? cwd
      : resolve(cwd, "..");
  return join(root, "skills/skill-maintenance/jev-capability-advisor/scripts");
}
export const runtimeFiles = [
  "decision_cache.py",
  "https_transport.py",
  "index_cache.py",
  "jev_advisor.py",
  "jev_session.py",
  "retrieval.py",
  "routing_metadata.py",
];

export function compareRuntimeSources(measured, current, revision = measuredRevision) {
  if (!/^[a-f0-9]{40}$/.test(revision))
    throw new Error("Jev runtime evidence: invalid source revision");
  for (const sources of [measured, current]) {
    if (
      !sources ||
      Object.keys(sources).length !== runtimeFiles.length ||
      !runtimeFiles.every((file) => /^[a-f0-9]{64}$/.test(sources[file] ?? ""))
    )
      throw new Error("Jev runtime evidence: require all seven runtime source hashes");
  }
  const changedFiles = runtimeFiles.filter((file) => current[file] !== measured[file]);
  const matchesCurrentRuntime = changedFiles.length === 0;
  return {
    measuredRevision: revision,
    measuredSourceUrl: `https://github.com/stark-ai-de/agent-skills/tree/${revision}/skills/skill-maintenance/jev-capability-advisor/scripts`,
    matchesCurrentRuntime,
    changedFiles,
    disclosure: matchesCurrentRuntime
      ? "All seven current runtime files match this dated live benchmark’s source snapshot."
      : `These measurements belong to the recorded runtime snapshot. The current runtime differs in ${changedFiles.join(", ")}; it has not been live rebenchmarked. These figures do not qualify the changed runtime.`,
  };
}

export function inspectRuntimeSources(
  measured,
  directory = currentRuntimeDirectory(),
  revision = measuredRevision,
) {
  const current = Object.fromEntries(
    runtimeFiles.map((file) => [
      file,
      createHash("sha256")
        .update(readFileSync(join(directory, file)))
        .digest("hex"),
    ]),
  );
  return compareRuntimeSources(measured, current, revision);
}
