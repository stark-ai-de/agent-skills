import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const ARTIFACT_PATH = "vendor/ssh-manager/runtime";
export const SOURCE_REPOSITORY = "https://github.com/stark-ai-de/ssh-manager";
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const fail = (message) => {
  throw new Error(`SSH runtime artifact: ${message}`);
};
const required = [
  "mcp.mjs",
  "daemon.mjs",
  "cli.mjs",
  "BUILD-MANIFEST.json",
  "NOTICE.txt",
  "LICENSE",
  "viewer/index.html",
  "viewer/xterm.js",
  "viewer/xterm.css",
  "viewer/fit.js",
];

export function validateRuntimeArtifact(directory, pin) {
  if (
    !pin ||
    typeof pin.version !== "string" ||
    !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(pin.version) ||
    pin.sourceRepository !== SOURCE_REPOSITORY ||
    !/^[a-f0-9]{40}$/.test(pin.sourceCommit ?? "") ||
    !/^[a-f0-9]{64}$/.test(pin.manifestSha256 ?? "")
  )
    fail("invalid provenance pin");
  const root = path.resolve(directory);
  if (!fs.lstatSync(root).isDirectory()) fail("root must be a regular directory");
  const actual = new Map();
  let total = 0;
  function walk(absolute, prefix = "") {
    for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
      const relative = prefix + entry.name;
      if (
        !/^[a-zA-Z0-9_./-]+$/.test(relative) ||
        relative.split("/").some((part) => part === "." || part === "..") ||
        relative.length > 256
      )
        fail("unsafe path");
      const file = path.join(absolute, entry.name);
      const stat = fs.lstatSync(file);
      if (stat.isDirectory()) walk(file, `${relative}/`);
      else if (stat.isFile()) {
        if (
          stat.size > 24 * 1024 * 1024 ||
          (total += stat.size) > 64 * 1024 * 1024 ||
          actual.size >= 1000
        )
          fail("payload exceeds limits");
        actual.set(relative, fs.readFileSync(file));
      } else fail("symlinks and special files are forbidden");
    }
  }
  walk(root);
  const raw = actual.get("ARTIFACT-MANIFEST.json");
  if (!raw || raw.length > 512 * 1024 || hash(raw) !== pin.manifestSha256)
    fail("manifest digest mismatch");
  const manifest = JSON.parse(raw);
  if (
    manifest.schemaVersion !== 1 ||
    manifest.managementApiVersion !== "v1" ||
    manifest.nodeMinimum !== "24.18.0" ||
    manifest.runtimeVersion !== pin.version ||
    manifest.sourceRepository !== pin.sourceRepository ||
    manifest.sourceCommit !== pin.sourceCommit ||
    !Array.isArray(manifest.files)
  )
    fail("manifest metadata mismatch");
  const inventory = [...actual.keys()].filter((name) => name !== "ARTIFACT-MANIFEST.json").sort();
  if (JSON.stringify(manifest.files.map((file) => file.path)) !== JSON.stringify(inventory))
    fail("payload inventory mismatch");
  for (const file of manifest.files) {
    const bytes = actual.get(file.path);
    if (file.size !== bytes.length || file.sha256 !== hash(bytes))
      fail(`file digest mismatch: ${file.path}`);
  }
  if (required.some((name) => !actual.has(name))) fail("required runtime file missing");
  if (
    !actual.get("NOTICE.txt").length ||
    !actual.get("LICENSE").toString().includes("Apache License")
  )
    fail("license notices missing");
  const buildRaw = actual.get("BUILD-MANIFEST.json");
  const build = JSON.parse(buildRaw);
  if (hash(buildRaw) !== manifest.buildManifestSha256 || build.nativeAddons !== false)
    fail("build provenance mismatch");
  return { manifest, files: actual };
}

export function artifactEntry(root) {
  const source = JSON.parse(
    fs.readFileSync(path.join(root, "plugins/stark-ai-developer.source.json")),
  );
  const entry = source.mcp?.find((item) => item.name === "ssh-management");
  if (!entry || entry.source !== ARTIFACT_PATH) fail("canonical artifact membership missing");
  let directory = path.resolve(root);
  for (const component of ARTIFACT_PATH.split("/")) {
    directory = path.join(directory, component);
    if (!fs.lstatSync(directory).isDirectory())
      fail("artifact ancestors must be regular directories");
  }
  return { entry, directory };
}

export function runtimeArtifactFiles(root) {
  const { entry, directory } = artifactEntry(root);
  const verified = validateRuntimeArtifact(directory, entry.artifact);
  return [...verified.files.keys()].sort().map((name) => `${ARTIFACT_PATH}/${name}`);
}

export function copyRuntimeArtifact({ root, output }) {
  const { entry, directory } = artifactEntry(root);
  const verified = validateRuntimeArtifact(directory, entry.artifact);
  fs.mkdirSync(output, { recursive: true });
  for (const [relative, bytes] of verified.files) {
    const destination = path.join(output, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes, { mode: 0o644 });
  }
  return verified;
}
