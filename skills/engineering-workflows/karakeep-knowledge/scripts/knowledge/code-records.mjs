import path from "node:path";
import * as fs from "node:fs/promises";
import {
  hash,
  identity,
  object,
  string,
  requireThat,
  inside,
  noLinks,
  readJson,
  readPrivate,
} from "./state.mjs";
import { git } from "./git.mjs";

// This grant authorizes one narrowly defined record type, not arbitrary findings.
export function validateCodeGrant(p) {
  if (!p.codeRecords) return;
  const g = object(p.codeRecords, [
    "registryFile",
    "roots",
    "include",
    "exclude",
    "maxItems",
    "maxSeconds",
    "approval",
  ]);
  requireThat(
    p.scope === "collection" && p.kinds.includes("code-record") && p.listIds.length > 0,
    "code_policy",
    "Code records require a collection grant and private destination lists.",
  );
  string(g.approval);
  requireThat(
    path.isAbsolute(g.registryFile) &&
      Array.isArray(g.roots) &&
      g.roots.length > 0 &&
      g.roots.every((x) => typeof x === "string" && path.isAbsolute(x)),
    "code_policy",
    "Use explicit registry and source roots.",
  );
  for (const patterns of [g.include, g.exclude])
    requireThat(
      Array.isArray(patterns) &&
        patterns.length > 0 &&
        patterns.every(
          (x) => typeof x === "string" && !path.isAbsolute(x) && !x.split("/").includes(".."),
        ),
      "code_policy",
      "Code scope requires bounded relative include and exclude patterns.",
    );
  requireThat(
    Number.isInteger(g.maxItems) &&
      g.maxItems > 0 &&
      g.maxItems <= 20 &&
      Number.isInteger(g.maxSeconds) &&
      g.maxSeconds > 0 &&
      g.maxSeconds <= 600,
    "code_policy",
    "Code batches require explicit item and time bounds.",
  );
}

function allowed(g, file) {
  return (
    !path.isAbsolute(file) &&
    !file.split("/").includes("..") &&
    g.include.some((pattern) => path.matchesGlob(file, pattern)) &&
    !g.exclude.some((pattern) => path.matchesGlob(file, pattern)) &&
    !file.split("/").some((part) => /^\.(?:env|git|aws|ssh)(?:\.|$)/u.test(part)) &&
    !/\.(?:pem|key|p12|pfx)$/iu.test(file)
  );
}

// Only repository-location evidence is retained, never URL credentials or query tokens.
export function sanitizeCodeRemote(value) {
  if (typeof value !== "string" || value.length > 4096 || /\s/u.test(value)) return null;
  if (/^[A-Za-z]:[\\/]/u.test(value) || value.startsWith("ext::")) return null;
  const scp = value.match(/^(?:[^/@:]+@)?([A-Za-z0-9.-]+):([^/].*)$/u);
  const raw = !value.includes("://") && scp ? `ssh://${scp[1]}/${scp[2]}` : value;
  try {
    const url = new URL(raw);
    if (!["https:", "http:", "ssh:", "git:"].includes(url.protocol) || !url.hostname) return null;
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

async function codeProvenance(root, file) {
  let branch = null,
    remote = null;
  try {
    branch = (await git(root, ["symbolic-ref", "--quiet", "--short", "HEAD"])).trim() || null;
  } catch {}
  try {
    remote = sanitizeCodeRemote((await git(root, ["remote", "get-url", "origin"])).trim());
  } catch {}
  // The closest conventional license file is evidence, not a legal conclusion.
  let directory = path.dirname(file);
  while (true) {
    for (const name of ["LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "COPYING"]) {
      const candidate = path.join(directory, name);
      try {
        await noLinks(candidate);
        const stat = await fs.stat(candidate);
        if (!stat.isFile() || stat.size > 65536) continue;
        const bytes = await fs.readFile(candidate);
        return {
          branch,
          remote,
          licenseEvidence: [{ file: path.relative(root, candidate), sha256: hash(bytes) }],
        };
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
    if (directory === root) break;
    directory = path.dirname(directory);
  }
  return { branch, remote, licenseEvidence: [] };
}

export async function captureCodeSource(p, selection) {
  requireThat(
    p.codeRecords && p.kinds.includes("code-record"),
    "code_policy",
    "No adopted code-record grant.",
  );
  object(selection, ["repoId", "file", "symbol", "startLine", "endLine"]);
  for (const key of ["repoId", "file", "symbol"]) string(selection[key]);
  const g = p.codeRecords;
  requireThat(
    allowed(g, selection.file),
    "code_scope",
    "Code source is outside the adopted file scope.",
  );
  const registry = await readJson(g.registryFile);
  requireThat(
    registry.schemaVersion === 1 && Array.isArray(registry.projects),
    "code_registry",
    "Unsupported repository registry.",
  );
  const matches = registry.projects.filter((r) => r.id === selection.repoId);
  requireThat(
    matches.length === 1,
    "code_registry",
    "Repository identity is missing or ambiguous.",
  );
  const repo = matches[0];
  requireThat(
    g.roots.some((root) => {
      const rel = path.relative(root, repo.path);
      return rel !== ".." && !rel.startsWith(".." + path.sep) && !path.isAbsolute(rel);
    }),
    "code_scope",
    "Repository is outside the adopted roots.",
  );
  const base = {
    branch: null,
    remote: null,
    licenseEvidence: [],
    repoId: repo.id,
    repository: repo.name,
    root: repo.path,
    file: selection.file,
    symbol: selection.symbol,
    requestedStartLine: selection.startLine,
    requestedEndLine: selection.endLine,
  };
  if (["retired", "excluded"].includes(repo.status))
    return {
      ...base,
      startLine: null,
      endLine: null,
      fileHash: null,
      excerptHash: null,
      revision: null,
      sourceMode: "missing",
      lifecycle: "retired",
    };
  await noLinks(repo.path);
  const file = inside(repo.path, path.join(repo.path, selection.file));
  await noLinks(file);
  let bytes;
  try {
    const stat = await fs.stat(file);
    requireThat(
      stat.isFile() && stat.size <= Math.min(p.maxContentBytes ?? 16 * 1024 * 1024, 1024 * 1024),
      "code_source",
      "Code source exceeds the regular-file bound.",
    );
    bytes = await fs.readFile(file);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    bytes = null;
  }
  if (repo.status === "retired" || !bytes)
    return {
      ...base,
      startLine: null,
      endLine: null,
      fileHash: null,
      excerptHash: null,
      revision: null,
      sourceMode: "missing",
      lifecycle: "retired",
    };
  requireThat(repo.status === "active", "code_registry", "Repository is not active.");
  requireThat(
    (await git(repo.path, ["rev-parse", "--show-toplevel"])).trim() === repo.path,
    "code_source",
    "Code root must be an actual Git root.",
  );
  Object.assign(base, await codeProvenance(repo.path, file));
  const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const lines = content.split("\n");
  requireThat(
    Number.isInteger(selection.startLine) &&
      Number.isInteger(selection.endLine) &&
      selection.startLine >= 1 &&
      selection.endLine >= selection.startLine &&
      selection.endLine - selection.startLine <= 500,
    "code_lines",
    "Invalid or oversized code line range.",
  );
  if (selection.endLine > lines.length)
    return {
      ...base,
      startLine: null,
      endLine: null,
      fileHash: hash(bytes),
      excerptHash: null,
      revision: null,
      sourceMode: "unresolved",
      lifecycle: "stale",
    };
  const revision = (await git(repo.path, ["rev-parse", "HEAD"])).trim();
  let committed = false;
  try {
    committed =
      hash(await git(repo.path, ["show", revision + ":" + selection.file], { bytes: true })) ===
      hash(bytes);
  } catch {
    /* Untracked and newly staged sources are local drafts. */
  }
  return {
    ...base,
    startLine: selection.startLine,
    endLine: selection.endLine,
    fileHash: hash(bytes),
    excerptHash: hash(lines.slice(selection.startLine - 1, selection.endLine).join("\n")),
    revision: committed ? revision : null,
    sourceMode: committed ? "commit" : "local-draft",
    lifecycle: "current",
  };
}

export async function normalizeCodeRecord(input, p, store) {
  requireThat(
    !input.contentFile &&
      !input.url &&
      !input.inputs &&
      !input.sourceUrl &&
      !input.references?.length,
    "code_record",
    "Code records use structured local-source evidence, not arbitrary aggregate inputs.",
  );
  string(input.id);
  const r = object(
    input.codeRecord,
    [
      "selection",
      "source",
      "problem",
      "useCase",
      "dependencies",
      "license",
      "tests",
      "adaptation",
      "status",
      "reviewedAt",
      "assessmentSourceHash",
    ],
    [
      "selection",
      "source",
      "problem",
      "useCase",
      "dependencies",
      "license",
      "tests",
      "adaptation",
      "status",
      "reviewedAt",
    ],
  );
  for (const value of [r.problem, r.useCase, r.license, r.adaptation, r.reviewedAt]) string(value);
  requireThat(
    !Number.isNaN(Date.parse(r.reviewedAt)),
    "code_record",
    "Review date must be an ISO timestamp.",
  );
  requireThat(
    ["candidate", "source-checked", "practically-validated"].includes(r.status),
    "code_record",
    "Unsupported code evidence status.",
  );
  requireThat(
    Array.isArray(r.dependencies) &&
      r.dependencies.length <= 30 &&
      r.dependencies.every((d) => typeof d === "string" && d.length <= 500),
    "code_record",
    "Dependencies must be a bounded factual list.",
  );
  const source = await captureCodeSource(p, r.selection);
  requireThat(
    hash(source) === hash(r.source),
    "needs_replan",
    "Code source changed; recapture source and reassess the record.",
  );
  const key = identity("code-record", p.id, source.repoId, input.id);
  const previous = store.entries[key];
  requireThat(
    source.lifecycle === "current" || previous?.owned,
    "code_record",
    "A missing source may only retire an already owned record.",
  );
  requireThat(
    source.lifecycle === "current" || r.status === "candidate",
    "code_record",
    "Missing sources cannot remain validated.",
  );
  requireThat(
    Array.isArray(r.tests) && r.tests.length <= 10,
    "code_tests",
    "Use bounded test evidence.",
  );
  for (const t of r.tests) {
    object(t, ["command", "outcome", "evidenceFile", "evidenceHash"], ["command", "outcome"]);
    string(t.command);
    requireThat(
      ["passed", "failed", "not-run"].includes(t.outcome),
      "code_tests",
      "Unsupported test outcome.",
    );
    if (t.outcome !== "not-run") {
      const evidence = inside(p.stateRoot, string(t.evidenceFile));
      const receiptText = await readPrivate(evidence, 1024 * 1024);
      requireThat(
        hash(receiptText) === t.evidenceHash,
        "code_tests",
        "An executed-test claim requires the exact private execution receipt.",
      );
      const receipt = JSON.parse(receiptText);
      requireThat(
        receipt.schemaVersion === 1 &&
          receipt.command === t.command &&
          receipt.repoId === source.repoId &&
          receipt.sourceHash === source.fileHash &&
          Number.isInteger(receipt.exitCode) &&
          (t.outcome === "passed") === (receipt.exitCode === 0),
        "code_tests",
        "Test receipt does not match the current source and outcome.",
      );
    }
  }
  requireThat(
    r.status !== "practically-validated" || r.tests.some((t) => t.outcome === "passed"),
    "code_tests",
    "Practical validation requires an actual passing execution receipt.",
  );
  const assessmentChanged =
    r.assessmentSourceHash !== undefined && r.assessmentSourceHash !== source.fileHash;
  if (r.assessmentSourceHash !== undefined)
    requireThat(
      /^[a-f0-9]{64}$/u.test(r.assessmentSourceHash),
      "code_record",
      "Invalid assessment fingerprint.",
    );
  requireThat(
    !assessmentChanged || (r.status === "candidate" && r.tests.length === 0),
    "code_record",
    "Changed assessed sources must clear technical qualification and test claims.",
  );
  const reviewState =
    source.lifecycle === "retired"
      ? "retired"
      : source.lifecycle === "stale" || assessmentChanged
        ? "stale"
        : source.sourceMode === "local-draft" || r.status === "candidate"
          ? "draft"
          : "needs-review";
  const status = {
    candidate: "Kandidat",
    "source-checked": "quellengeprüft",
    "practically-validated": "praktisch validiert",
  }[r.status];
  const text = [
    `# ${input.title}`,
    `Technische Prüfung: ${status}. Bewertung durch Agent; hierdurch keine menschliche Freigabe.`,
    `Review-Konvention: ${reviewState}. Menschliche Entscheidungen gehören in den manuell gepflegten Bereich.`,
    source.lifecycle === "retired"
      ? "QUELLE ENTFERNT: Dieser Record ist nicht mehr als aktuell qualifiziert."
      : source.lifecycle === "stale"
        ? "ZEILENBEZUG UNGEKLÄRT: Vor Wiederverwendung Symbol und Fundstelle neu prüfen."
        : "",
    `Problem: ${r.problem}`,
    `Einsatzzweck: ${r.useCase}`,
    `Repository: ${source.repository} (${source.repoId})`,
    `Remote: ${source.remote ?? "nicht verfügbar"}`,
    `Branch: ${source.branch ?? "nicht verfügbar / detached HEAD"}`,
    `Datei: ${source.file}`,
    `Symbol/Komponente: ${source.symbol}`,
    source.sourceMode === "commit"
      ? `Commit: ${source.revision}`
      : source.sourceMode === "local-draft"
        ? "Lokaler Entwurf: kein Commit-Link für diese Inhalte."
        : "Quellenstatus: nicht verfügbar.",
    `Zeilen: ${source.startLine ?? "—"}–${source.endLine ?? "—"}`,
    `Datei-Fingerprint: ${source.fileHash ?? "—"}`,
    `Ausschnitt-Fingerprint: ${source.excerptHash ?? "—"}`,
    `Abhängigkeiten: ${r.dependencies.join(", ") || "nicht ermittelt"}`,
    `Lizenzbewertung des Agents: ${r.license}`,
    source.licenseEvidence.length
      ? `Lizenzbeleg: ${source.licenseEvidence.map((entry) => `${entry.file} (SHA-256 ${entry.sha256})`).join(", ")}. Vor Übernahme Inhalt und Geltungsbereich prüfen.`
      : "Lizenzbeleg: unknown — keine konventionelle Lizenzdatei innerhalb des Repositorys gefunden.",
    "Tests und tatsächliche Ergebnisse:",
    ...(r.tests.length
      ? r.tests.map((t) => `- ${t.command}: ${t.outcome}`)
      : ["- Nicht ausgeführt; keine Laufzeitvalidierung."]),
    `Anpassungshinweise: ${r.adaptation}`,
    `Prüfdatum: ${r.reviewedAt}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  requireThat(
    Buffer.byteLength(text) <= Math.min(p.maxContentBytes ?? 16 * 1024 * 1024, 65536),
    "code_record",
    "Code record exceeds its content bound.",
  );
  return { key, text, source, channel: source.sourceMode, status: r.status, reviewState };
}

export async function verifyCodeRecord(item, p) {
  if (item.kind !== "code-record") return;
  const source = item.meta.source;
  const current = await captureCodeSource(p, {
    repoId: source.repoId,
    file: source.file,
    symbol: source.symbol,
    startLine: source.requestedStartLine,
    endLine: source.requestedEndLine,
  });
  requireThat(
    hash(source) === hash(current),
    "needs_replan",
    "Code changed before a managed write.",
  );
}
