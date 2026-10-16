import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs/promises";
import path from "node:path";
import { requireThat, KnowledgeError, hash, identity, noLinks } from "./state.mjs";
const execute = promisify(execFile);
let localEnvNames;
async function gitEnvironment() {
  // Git defines the repository selectors. Query with no inherited Git settings,
  // then remove only local selectors from the real invocation (retain SSH/auth).
  localEnvNames ??= execute("git", ["rev-parse", "--local-env-vars"], {
    encoding: "utf8",
    timeout: 45000,
    env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))),
  }).then(({ stdout }) => stdout.trim().split(/\s+/u));
  const env = { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" };
  for (const name of await localEnvNames) delete env[name];
  for (const name of Object.keys(env))
    if (/^GIT_CONFIG_(KEY|VALUE)_\d+$/u.test(name)) delete env[name];
  return env;
}
export async function git(root, args, { bytes = false } = {}) {
  try {
    return (
      await execute("git", ["-C", root, ...args], {
        encoding: bytes ? "buffer" : "utf8",
        maxBuffer: 128 * 1024 * 1024,
        timeout: 45000,
        env: await gitEnvironment(),
      })
    ).stdout;
  } catch {
    throw new KnowledgeError(
      "git",
      "Git source verification failed; inspect the selected repository and existing authentication.",
    );
  }
}
export function eligible(p, file) {
  return (
    !path.isAbsolute(file) &&
    !file.split("/").includes("..") &&
    p.repo.include.some((g) => path.matchesGlob(file, g)) &&
    !p.repo.exclude.some((g) => path.matchesGlob(file, g))
  );
}
export async function repository(root, p) {
  const actual = (await git(root, ["rev-parse", "--show-toplevel"])).trim();
  requireThat(path.resolve(root) === actual, "repository", "Pass the repository root explicitly.");
  requireThat(
    (await git(root, ["remote", "get-url", p.repo.remoteName])).trim() === p.repo.remote,
    "repository",
    "Repository remote differs from the approved policy.",
  );
  return actual;
}
export async function localFingerprints(root, p) {
  await repository(root, p);
  const files = [
    ...new Set(
      (await git(root, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]))
        .split("\0")
        .filter(Boolean),
    ),
  ];
  const result = {};
  for (const file of files.filter((f) => eligible(p, f)).sort()) {
    const full = path.join(root, file);
    try {
      await noLinks(full);
      const stat = await fs.lstat(full);
      requireThat(
        stat.isFile() && stat.size <= p.maxContentBytes,
        "source_size",
        "Knowledge document is not a supported bounded file.",
      );
      result[file] = hash(await fs.readFile(full));
    } catch (e) {
      if (e.code === "ENOENT") {
        result[file] = "deleted";
        continue;
      }
      throw e;
    }
  }
  return result;
}
export async function snapshot(root, p, { offline = false, checkpoint } = {}) {
  if (p.scope === "collection")
    return {
      root: null,
      canonical: null,
      workContext: null,
      local: {},
      documents: [],
      verified: false,
    };
  await repository(root, p);
  let revision = null,
    verified = false;
  if (!offline) {
    const remote = await git(root, ["ls-remote", "--symref", p.repo.remoteName, "HEAD"]);
    const ref = remote.match(/^ref: refs\/heads\/(.+)\tHEAD$/mu);
    const oid = remote.match(/^([a-f0-9]{40,64})\tHEAD$/mu);
    requireThat(
      ref?.[1] === p.repo.branch && oid,
      "canonical",
      "Remote default branch differs from the approved source.",
    );
    revision = oid[1];
    try {
      await git(root, ["cat-file", "-e", revision + "^{commit}"]);
    } catch {
      await git(root, ["fetch", "--no-tags", p.repo.remoteName, p.repo.branch]);
      await git(root, ["cat-file", "-e", revision + "^{commit}"]);
    }
    if (checkpoint?.revision)
      await git(root, ["merge-base", "--is-ancestor", checkpoint.revision, revision]);
    verified = true;
  }
  const head = (await git(root, ["rev-parse", "HEAD"])).trim();
  const branch = (await git(root, ["branch", "--show-current"])).trim();
  const workContext = p.repo.workContext || branch || "detached:" + head;
  const documents = [];
  if (revision) {
    const rows = (await git(root, ["ls-tree", "-r", "-z", revision])).split("\0").filter(Boolean);
    for (const row of rows) {
      const [meta, file] = row.split("\t");
      if (!eligible(p, file)) continue;
      requireThat(
        meta.startsWith("100"),
        "source_type",
        "An eligible canonical document is a symlink or unsupported Git object.",
      );
      const bytes = await git(root, ["show", revision + ":" + file], { bytes: true });
      let text;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch {
        throw new KnowledgeError("source_type", "Canonical knowledge must be UTF-8 text.");
      }
      requireThat(
        Buffer.byteLength(text) <= p.maxContentBytes,
        "source_size",
        "Canonical document exceeds the configured content bound.",
      );
      documents.push({
        key: identity("document", p.repo.id, file, "canonical"),
        kind: "document",
        channel: "canonical",
        path: file,
        revision,
        text,
        contentHash: hash(text),
      });
    }
  }
  const local = await localFingerprints(root, p);
  for (const [file, fingerprint] of Object.entries(local)) {
    if (fingerprint === "deleted") continue;
    const bytes = await fs.readFile(path.join(root, file));
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    requireThat(
      hash(bytes) === fingerprint,
      "changed_input",
      "A local document changed during inspection.",
    );
    const canonical = documents.find((d) => d.path === file && d.channel === "canonical");
    if (!canonical || canonical.contentHash !== fingerprint) {
      documents.push({
        key: identity("document", p.repo.id, file, "draft", workContext),
        kind: "document",
        channel: "draft",
        path: file,
        revision: head,
        workContext,
        text,
        contentHash: fingerprint,
      });
    }
  }
  return { root: path.resolve(root), canonical: revision, workContext, local, documents, verified };
}
export async function validateSnapshot(s, p) {
  if (p.scope === "collection") return;
  await repository(s.root, p);
  if (s.verified) {
    const remote = await git(s.root, ["ls-remote", "--symref", p.repo.remoteName, "HEAD"]);
    requireThat(
      remote.includes("ref: refs/heads/" + p.repo.branch + "\tHEAD") &&
        remote.includes(s.canonical + "\tHEAD"),
      "needs_replan",
      "Remote canonical state changed after inspection.",
    );
  }
  requireThat(
    hash(await localFingerprints(s.root, p)) === hash(s.local),
    "needs_replan",
    "Local inputs changed after inspection.",
  );
  for (const d of s.documents.filter((d) => d.channel === "canonical")) {
    requireThat(
      s.verified && d.revision === s.canonical && eligible(p, d.path),
      "canonical",
      "Invalid canonical source evidence.",
    );
    requireThat(
      hash(await git(s.root, ["show", d.revision + ":" + d.path], { bytes: true })) ===
        d.contentHash,
      "needs_replan",
      "Canonical source bytes changed.",
    );
  }
}
