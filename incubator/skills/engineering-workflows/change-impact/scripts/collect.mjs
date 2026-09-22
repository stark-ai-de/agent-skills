import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

export const hash = (value) => createHash("sha256").update(value).digest("hex");
export const digest = (value) => hash(JSON.stringify(value));
export function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}
export function text(value, label, limit = 4000) {
  requireValue(
    typeof value === "string" && value.trim() && Buffer.byteLength(value) <= limit,
    `Invalid ${label}`,
  );
  return value;
}
export function relative(value) {
  text(value, "relative path", 1000);
  requireValue(
    !path.posix.isAbsolute(value) &&
      !value.includes("\\") &&
      !value.includes(":") &&
      !value.split("/").some((p) => p === ".." || p === ".git" || !p) &&
      !Array.from(value).some((character) => character.codePointAt(0) < 32),
    "Path must stay inside the repository",
  );
  return value.replace(/^\.\//, "");
}
export function integer(value, fallback, max) {
  const result = value ?? fallback;
  requireValue(Number.isInteger(result) && result > 0 && result <= max, "Invalid collection limit");
  return result;
}
export function sensitive(content) {
  return /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----|\b(?:sk[-_]|ts_|jv_live_)[a-zA-Z0-9_-]{20,}|\b(?:ghp_|github_pat_)[a-zA-Z0-9_]{20,}|\bAKIA[A-Z0-9]{16}|["']?\b(?:api[_-]?key|secret|password|access[_-]?token|token)["']?\s*[:=]\s*["']?[a-zA-Z0-9_+/.=-]{16,}|\bBearer\s+[a-zA-Z0-9_.-]{16,}/i.test(
    content,
  );
}
function excluded(file) {
  const parts = file.split("/");
  if (
    parts.some((p) =>
      [
        ".git",
        ".worktrees",
        "node_modules",
        "vendor",
        "dist",
        "build",
        ".next",
        "coverage",
        ".cache",
        ".venv",
      ].includes(p),
    )
  )
    return "dependency-or-build";
  if (
    parts.some((p) =>
      /^\.env(?:\.|$)|^(?:secrets?|credentials?)(?:\.|$)|^(?:id_rsa|id_ed25519|\.netrc|\.npmrc|auth\.json)$|\.(?:pem|key|p12|pfx)$/i.test(
        p,
      ),
    )
  )
    return "secret-path";
  return null;
}
function inScope(file, scopes) {
  return scopes.some((scope) => scope === "." || file === scope || file.startsWith(`${scope}/`));
}
export function collect(input) {
  requireValue(input && typeof input === "object", "Expected collection request");
  const root = fs.realpathSync(text(input.root, "repository root"));
  const git = (args, encoding = "utf8") =>
    execFileSync(
      "git",
      [
        "--no-lazy-fetch",
        "-c",
        "core.fsmonitor=false",
        "-c",
        "protocol.allow=never",
        "-C",
        root,
        ...args,
      ],
      {
        encoding,
        maxBuffer: 32 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 10000,
        killSignal: "SIGKILL",
        env: {
          ...process.env,
          GIT_NO_LAZY_FETCH: "1",
          GIT_OPTIONAL_LOCKS: "0",
          GIT_TERMINAL_PROMPT: "0",
        },
      },
    );
  requireValue(
    fs.realpathSync(git(["rev-parse", "--show-toplevel"]).trim()) === root,
    "root must be the repository top-level",
  );
  function revision(ref) {
    text(ref, "revision", 256);
    requireValue(!ref.startsWith("-"), "Invalid revision");
    return git(["rev-parse", "--verify", `${ref}^{commit}`]).trim();
  }
  const base = revision(input.base);
  const target = input.head && input.head !== "WORKTREE" ? revision(input.head) : "WORKTREE";
  const head = revision(target === "WORKTREE" ? "HEAD" : target);
  const suppliedScopes = input.scope ?? ["."];
  requireValue(
    Array.isArray(suppliedScopes) && suppliedScopes.length > 0 && suppliedScopes.length <= 32,
    "Invalid scope",
  );
  const scopes = suppliedScopes.map(relative);
  const limits = {
    maxFiles: integer(input.limits?.maxFiles, 500, 2000),
    maxFileBytes: integer(input.limits?.maxFileBytes, 65536, 262144),
    maxTotalBytes: integer(input.limits?.maxTotalBytes, 1048576, 8388608),
    maxCandidates: integer(input.limits?.maxCandidates, 400, 2000),
    chunkLines: integer(input.limits?.chunkLines, 40, 120),
  };
  const contracts = input.contracts;
  requireValue(
    Array.isArray(contracts) && contracts.length > 0 && contracts.length <= 8,
    "Provide one to eight source-backed contracts",
  );
  const ids = new Set();
  for (const contract of contracts) {
    text(contract.id, "contract id", 80);
    requireValue(
      /^[a-zA-Z0-9_-]+$/.test(contract.id) && !ids.has(contract.id),
      "Invalid or duplicate contract id",
    );
    ids.add(contract.id);
    text(contract.before, "before contract");
    text(contract.after, "after contract");
    requireValue(!sensitive(contract.before + contract.after), "Sensitive contract content");
    requireValue(
      Array.isArray(contract.evidence) &&
        contract.evidence.some((e) => e.side === "before") &&
        contract.evidence.some((e) => e.side === "after"),
      "Contracts need before and after evidence",
    );
  }
  const baseModes = new Map();
  const targetModes = new Map();
  function tree(ref, modes) {
    return git(["ls-tree", "-rz", ref])
      .split("\0")
      .filter(Boolean)
      .map((entry) => {
        const tab = entry.indexOf("\t");
        const file = entry.slice(tab + 1);
        modes.set(file, entry.slice(0, 6));
        return file;
      });
  }
  const beforePaths = tree(base, baseModes);
  const afterPaths =
    target === "WORKTREE"
      ? git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
          .split("\0")
          .filter(Boolean)
      : tree(target, targetModes);
  const paths = [...new Set([...beforePaths, ...afterPaths])]
    .sort()
    .filter((file) => inScope(file, scopes));
  const manifest = [];
  const omissions = [];
  const candidates = [];
  const documents = new Map();
  let totalBytes = 0;
  function read(file, side) {
    const ref = side === "before" ? base : target;
    const modes = side === "before" ? baseModes : targetModes;
    if (ref !== "WORKTREE") {
      if (!modes.has(file)) return null;
      if (!modes.get(file).startsWith("100")) throw new Error("non-regular-file");
      const size = Number(git(["cat-file", "-s", `${ref}:${file}`]).trim());
      if (size > limits.maxFileBytes) throw new Error("large-file");
      return git(["cat-file", "blob", `${ref}:${file}`], null);
    }
    const full = path.join(root, file);
    let cursor = root;
    for (const part of file.split("/")) {
      cursor = path.join(cursor, part);
      let stat;
      try {
        stat = fs.lstatSync(cursor);
      } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
      }
      if (stat.isSymbolicLink()) throw new Error("symlink");
    }
    const stat = fs.lstatSync(full);
    if (!stat.isFile()) throw new Error("non-regular-file");
    if (stat.size > limits.maxFileBytes) throw new Error("large-file");
    const real = fs.realpathSync(full);
    if (!real.startsWith(root + path.sep)) throw new Error("external-path");
    const fd = fs.openSync(
      full,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0) | (fs.constants.O_NONBLOCK ?? 0),
    );
    try {
      const opened = fs.fstatSync(fd);
      requireValue(
        opened.isFile() && opened.dev === stat.dev && opened.ino === stat.ino,
        "File changed during collection",
      );
      if (opened.size > limits.maxFileBytes) throw new Error("large-file");
      // A writer can grow the file after either stat. Allocate and read only the
      // fixed budget plus one detection byte, never readFileSync's growing buffer.
      const data = Buffer.alloc(limits.maxFileBytes + 1);
      let length = 0;
      while (length < data.length) {
        const count = fs.readSync(fd, data, length, data.length - length, null);
        if (count === 0) break;
        length += count;
      }
      if (length > limits.maxFileBytes) throw new Error("large-file");
      return data.subarray(0, length);
    } finally {
      fs.closeSync(fd);
    }
  }
  let eligibleFiles = 0;
  for (const file of paths) {
    let reason;
    try {
      relative(file);
      reason = excluded(file);
    } catch {
      reason = "unsupported-path";
    }
    if (!reason && eligibleFiles++ >= limits.maxFiles) reason = "file-budget";
    if (reason) {
      manifest.push({ path: file, excluded: reason });
      omissions.push({ path: file, reason });
      continue;
    }
    let before, after;
    try {
      before = read(file, "before");
      after = read(file, "after");
    } catch (error) {
      const known = ["non-regular-file", "large-file", "symlink", "external-path"];
      reason = known.includes(error.message) ? error.message : "unreadable-or-changing";
    }
    if (reason) {
      manifest.push({ path: file, excluded: reason });
      omissions.push({ path: file, reason });
      continue;
    }
    const item = {
      path: file,
      before: before ? hash(before) : null,
      after: after ? hash(after) : null,
    };
    manifest.push(item);
    const buffers = [before, after].filter(Boolean);
    if (buffers.some((b) => b.includes(0) || !Buffer.from(b.toString("utf8")).equals(b))) {
      omissions.push({ path: file, reason: "binary" });
      continue;
    }
    if (buffers.some((b) => sensitive(b.toString("utf8")))) {
      omissions.push({ path: file, reason: "sensitive-content" });
      continue;
    }
    const bytes = buffers.reduce((sum, b) => sum + b.length, 0);
    if (totalBytes + bytes > limits.maxTotalBytes) {
      omissions.push({ path: file, reason: "byte-budget" });
      continue;
    }
    totalBytes += bytes;
    documents.set(file, { before: before?.toString("utf8"), after: after?.toString("utf8") });
    if (!after) continue;
    const content = after.toString("utf8");
    const lines = content.split("\n");
    for (let start = 0; start < lines.length; start += limits.chunkLines) {
      const excerpt = lines.slice(start, start + limits.chunkLines).join("\n");
      if (!excerpt.trim()) continue;
      if (candidates.length >= limits.maxCandidates || Buffer.byteLength(excerpt) > 8000) {
        omissions.push({
          path: file,
          startLine: start + 1,
          reason: candidates.length >= limits.maxCandidates ? "candidate-budget" : "long-lines",
        });
        continue;
      }
      const endLine = Math.min(start + limits.chunkLines, lines.length);
      candidates.push({
        id: digest([file, start + 1, endLine, item.after]).slice(0, 24),
        path: file,
        startLine: start + 1,
        endLine,
        fileHash: item.after,
        contentHash: hash(excerpt),
        content: excerpt,
        changed: item.before !== item.after,
        context: /(?:^|\/)(?:history|archive|changelog)(?:[/.]|$)/i.test(file)
          ? "historical"
          : /@generated|DO NOT EDIT|auto-generated/i.test(content.slice(0, 1000))
            ? "generated"
            : "current",
      });
    }
  }
  for (const contract of contracts)
    for (const evidence of contract.evidence) {
      relative(evidence.path);
      requireValue(["before", "after"].includes(evidence.side), "Invalid evidence side");
      text(evidence.quote, "evidence quote", 2000);
      requireValue(
        documents.get(evidence.path)?.[evidence.side]?.includes(evidence.quote),
        "Contract evidence is absent from the collected snapshot",
      );
    }
  const options = { root, base, head: target, scope: scopes, contracts, limits };
  const snapshot = {
    base,
    head,
    target,
    digest: digest({ base, head, target, scopes, limits, manifest }),
    manifest,
  };
  return {
    schemaVersion: 1,
    options,
    snapshot,
    contracts,
    candidates,
    coverage: {
      enumeratedFiles: paths.length,
      collectedFiles: documents.size,
      candidates: candidates.length,
      bytes: totalBytes,
      omissions,
    },
  };
}

export function verifyPacket(packet) {
  requireValue(packet?.schemaVersion === 1 && packet.options, "Invalid collection packet");
  const current = collect(packet.options);
  requireValue(
    digest(current) === digest(packet),
    "Snapshot or packet changed; recollect before continuing",
  );
  return current;
}
