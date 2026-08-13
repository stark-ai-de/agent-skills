#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const MAX_ARCHIVE_BYTES = 10_000_000;
const MAX_REDIRECTS = 5;

export const ACTIONLINT_CONTRACT = Object.freeze({
  version: "1.7.12",
  asset: "actionlint_1.7.12_linux_amd64.tar.gz",
  archiveDigest: "sha256:8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8",
  binaryDigest: "sha256:c872d6db8c6bf83a8eaa704fc93999f027d55dffbc63b8a6abdccb47df5f4cd4",
  url: "https://github.com/rhysd/actionlint/releases/download/v1.7.12/actionlint_1.7.12_linux_amd64.tar.gz",
});

export const ACTIONLINT_IDENTITY = `actionlint@${ACTIONLINT_CONTRACT.version}+${ACTIONLINT_CONTRACT.binaryDigest}`;

function sha256(bytes) {
  return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

function parseIdentity(identity) {
  const match = /^actionlint@(\d+\.\d+\.\d+)\+(sha256:[a-f0-9]{64})$/.exec(identity ?? "");
  if (!match) throw new Error("actionlint identity must bind an exact version and binary digest.");
  return { version: match[1], binaryDigest: match[2] };
}

function downloadArchive(url, redirects = 0) {
  if (redirects > MAX_REDIRECTS) throw new Error("actionlint download exceeded redirect limit.");
  const target = new URL(url);
  if (target.protocol !== "https:") throw new Error("actionlint download requires HTTPS.");
  return new Promise((resolve, reject) => {
    const request = https.get(
      target,
      { headers: { "User-Agent": "agent-skills-validation" } },
      (response) => {
        if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0)) {
          const location = response.headers.location;
          response.resume();
          if (!location) return reject(new Error("actionlint redirect omitted Location."));
          return downloadArchive(new URL(location, target).href, redirects + 1).then(
            resolve,
            reject,
          );
        }
        if (response.statusCode !== 200) {
          response.resume();
          return reject(new Error(`actionlint download returned HTTP ${response.statusCode}.`));
        }
        const contentLength = Number(response.headers["content-length"] ?? 0);
        if (contentLength > MAX_ARCHIVE_BYTES) {
          response.resume();
          return reject(new Error("actionlint archive exceeds the size limit."));
        }
        const chunks = [];
        let size = 0;
        response.on("data", (chunk) => {
          size += chunk.length;
          if (size > MAX_ARCHIVE_BYTES) {
            response.destroy(new Error("actionlint archive exceeds the size limit."));
            return;
          }
          chunks.push(chunk);
        });
        response.once("end", () => resolve(Buffer.concat(chunks)));
      },
    );
    request.setTimeout(30_000, () => request.destroy(new Error("actionlint download timed out.")));
    request.once("error", reject);
  });
}

function readTarString(block, start, length) {
  const bytes = block.subarray(start, start + length);
  const end = bytes.indexOf(0);
  return bytes.subarray(0, end === -1 ? bytes.length : end).toString("utf8");
}

function readTarOctal(block, start, length) {
  const text = readTarString(block, start, length).trim();
  if (!/^[0-7]+$/.test(text)) throw new Error("actionlint archive contains an invalid TAR size.");
  return Number.parseInt(text, 8);
}

function extractArchive(archive, directory) {
  const tar = zlib.gunzipSync(archive, { maxOutputLength: 20_000_000 });
  let offset = 0;
  let executable = null;
  const names = new Set();
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = readTarString(header, 0, 100);
    const type = String.fromCharCode(header[156] || 48);
    const size = readTarOctal(header, 124, 12);
    if (!name || names.has(name) || name.startsWith("/") || name.includes("..")) {
      throw new Error("actionlint archive contains an unsafe or duplicate TAR entry.");
    }
    names.add(name);
    const dataStart = offset + 512;
    const dataEnd = dataStart + size;
    if (dataEnd > tar.length) throw new Error("actionlint archive TAR entry is truncated.");
    if (name === "actionlint") {
      if (type !== "0") throw new Error("actionlint archive executable is not a regular file.");
      executable = path.join(directory, "actionlint");
      fs.writeFileSync(executable, tar.subarray(dataStart, dataEnd), { mode: 0o700 });
    }
    offset = dataStart + Math.ceil(size / 512) * 512;
  }
  if (!executable) throw new Error("actionlint archive does not contain its executable.");
  return executable;
}

export function verifyActionlintBinary(binaryPath, expectedIdentity = ACTIONLINT_IDENTITY) {
  const absolute = path.resolve(binaryPath);
  if (absolute !== binaryPath || fs.lstatSync(absolute).isSymbolicLink()) {
    throw new Error("actionlint must be an exact absolute non-symlink binary.");
  }
  const stat = fs.statSync(absolute);
  if (!stat.isFile()) throw new Error("actionlint must be a regular file.");
  const expected = expectedIdentity ? parseIdentity(expectedIdentity) : null;
  const binaryDigest = sha256(fs.readFileSync(absolute));
  if (expected && binaryDigest !== expected.binaryDigest) {
    throw new Error("actionlint binary digest does not match the task identity.");
  }
  const result = spawnSync(absolute, ["-version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0 || result.error) {
    throw new Error(
      result.stderr?.trim() || result.error?.message || "actionlint -version failed.",
    );
  }
  const version = /\b(\d+\.\d+\.\d+)\b/.exec(result.stdout)?.[1] ?? null;
  if (!version || (expected && version !== expected.version)) {
    throw new Error("actionlint version does not match the task identity.");
  }
  return { identity: `actionlint@${version}+${binaryDigest}`, executableDigest: binaryDigest };
}

export async function installPinnedActionlint({
  destination,
  download = downloadArchive,
  extract = extractArchive,
  contract = ACTIONLINT_CONTRACT,
} = {}) {
  if (process.platform !== "linux" || process.arch !== "x64") {
    throw new Error("The pinned actionlint artifact supports only linux/x64 validation runners.");
  }
  const absoluteDestination = path.resolve(destination ?? "");
  if (
    !path.isAbsolute(destination ?? "") ||
    absoluteDestination === path.parse(absoluteDestination).root
  ) {
    throw new Error("An absolute actionlint destination is required.");
  }
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "actionlint-install-"));
  try {
    const archive = await download(contract.url);
    if (!Buffer.isBuffer(archive) || sha256(archive) !== contract.archiveDigest) {
      throw new Error("actionlint archive digest does not match the pinned release.");
    }
    const extracted = await extract(archive, temporary);
    const expectedIdentity = `actionlint@${contract.version}+${contract.binaryDigest}`;
    verifyActionlintBinary(extracted, expectedIdentity);
    fs.mkdirSync(path.dirname(absoluteDestination), { recursive: true, mode: 0o700 });
    fs.copyFileSync(extracted, absoluteDestination, fs.constants.COPYFILE_EXCL);
    fs.chmodSync(absoluteDestination, 0o700);
    verifyActionlintBinary(absoluteDestination, expectedIdentity);
    return { path: absoluteDestination, identity: expectedIdentity };
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

function parseArguments(argv) {
  if (argv.length === 0 || argv.length > 3 || argv[0] !== "--destination") {
    throw new Error(
      "Usage: install-pinned-actionlint.mjs --destination <absolute-path> [--github-output]",
    );
  }
  const githubOutput = argv[2] === "--github-output";
  if (argv.length === 3 && !githubOutput) throw new Error(`Unknown argument: ${argv[2]}`);
  return { destination: argv[1], githubOutput };
}

async function main(argv) {
  const options = parseArguments(argv);
  const installed = await installPinnedActionlint(options);
  if (options.githubOutput) {
    if (!process.env.GITHUB_OUTPUT) throw new Error("GITHUB_OUTPUT is required.");
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `actionlint_path=${installed.path}\n`);
  } else {
    process.stdout.write(`${installed.path}\n`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`Could not install pinned actionlint: ${error.message}`);
    process.exitCode = 1;
  });
}
