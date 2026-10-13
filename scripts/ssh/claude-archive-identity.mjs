import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const platforms = ["Linux", "macOS", "Windows"];
const identityFile = "archive-identity.json";

// `write` creates only a generated identity JSON beside the single Claude ZIP.
// `compare` is read-only and requires evidence from all three native CI jobs.
export function writeClaudeArchiveIdentity(directory) {
  const archives = fs.readdirSync(directory).filter((name) => name.endsWith(".zip"));
  if (archives.length !== 1) throw new Error("Expected exactly one Claude archive.");
  const file = archives[0];
  const archive = path.join(directory, file);
  if (!fs.lstatSync(archive).isFile()) throw new Error("Claude archive must be a regular file.");
  const bytes = fs.readFileSync(archive);
  const identity = {
    schemaVersion: 1,
    file,
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
  fs.writeFileSync(path.join(directory, identityFile), JSON.stringify(identity, null, 2) + "\n");
  return identity;
}

export function compareClaudeArchiveIdentities(directory) {
  const identities = platforms.map((platform) => {
    const file = path.join(directory, `ssh-claude-identity-${platform}`, identityFile);
    const identity = JSON.parse(fs.readFileSync(file, "utf8"));
    if (
      identity.schemaVersion !== 1 ||
      typeof identity.file !== "string" ||
      !identity.file.endsWith(".zip") ||
      !Number.isSafeInteger(identity.bytes) ||
      identity.bytes <= 0 ||
      !/^[a-f0-9]{64}$/.test(identity.sha256 ?? "")
    ) {
      throw new Error(`Invalid Claude archive identity for ${platform}.`);
    }
    return identity;
  });
  const expected = identities[0];
  for (let index = 1; index < identities.length; index++) {
    const actual = identities[index];
    if (
      actual.file !== expected.file ||
      actual.bytes !== expected.bytes ||
      actual.sha256 !== expected.sha256
    ) {
      throw new Error(`Claude archive differs between Linux and ${platforms[index]}.`);
    }
  }
  return expected;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [operation, directory] = process.argv.slice(2);
    if (!directory || !["write", "compare"].includes(operation)) {
      throw new Error(
        "Usage: node scripts/ssh/claude-archive-identity.mjs <write|compare> <directory>",
      );
    }
    const identity =
      operation === "write"
        ? writeClaudeArchiveIdentity(directory)
        : compareClaudeArchiveIdentities(directory);
    const label =
      operation === "compare" ? "Three-platform Claude archive verified" : "Claude archive identity";
    console.log(`${label}: ${identity.sha256}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
