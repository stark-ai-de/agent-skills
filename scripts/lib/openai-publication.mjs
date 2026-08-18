import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const publicationDisplayName = "stark AI Developer";
export const publicationSkills = [
  "codex-memory-curator",
  "codex-spec-interviewer",
  "animated-readme-logo",
  "architecture-compass",
  "codegraph-ast-grep",
  "drawio-diagrams",
];

export function fail(message) {
  throw new Error(message);
}

function parseBoolean(value, label) {
  if (value === "true") return true;
  if (value === "false") return false;
  fail(`${label} must be true or false`);
}

export function parsePublicationArgs(argv) {
  const raw = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || value === undefined || value.startsWith("--")) {
      fail(`Invalid or incomplete argument: ${flag ?? "(missing)"}`);
    }
    const key = flag.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (Object.hasOwn(raw, key)) fail(`Duplicate argument: ${flag}`);
    raw[key] = value;
  }

  const required = [
    "expectedVersion",
    "publisher",
    "countries",
    "supportOwner",
    "sourceSha",
    "sourceRef",
    "outputDir",
    "publisherIdentityVerified",
    "appsManagementWriteConfirmed",
    "legalApproved",
    "availabilityApproved",
    "runFullValidation",
  ];
  for (const key of required) {
    if (!raw[key]) fail(`Missing required publication argument: ${key}`);
  }

  return {
    ...raw,
    publisherIdentityVerified: parseBoolean(
      raw.publisherIdentityVerified,
      "publisher identity verification",
    ),
    appsManagementWriteConfirmed: parseBoolean(
      raw.appsManagementWriteConfirmed,
      "Apps Management permission",
    ),
    legalApproved: parseBoolean(raw.legalApproved, "legal approval"),
    availabilityApproved: parseBoolean(raw.availabilityApproved, "availability approval"),
    runFullValidation: parseBoolean(raw.runFullValidation, "full validation selection"),
  };
}

function assertLine(value, label, maximum) {
  if (typeof value !== "string" || !value.trim() || /\r|\n/.test(value)) {
    fail(`${label} must be a non-empty single line`);
  }
  if ([...value].length > maximum) fail(`${label} exceeds ${maximum} characters`);
}

export function validatePublicationInputs(args, root) {
  if (!/^\d+\.\d+\.\d+$/.test(args.expectedVersion)) fail("plugin version must be x.y.z");
  if (!/^[0-9a-f]{40}$/.test(args.sourceSha)) fail("source SHA must contain 40 hex characters");
  if (!args.publisherIdentityVerified) fail("publisher identity verification is not attested");
  if (!args.appsManagementWriteConfirmed) fail("Apps Management: Write is not attested");
  if (!args.legalApproved) fail("legal approval is not attested");
  if (!args.availabilityApproved) fail("availability approval is not attested");
  assertLine(args.publisher, "publisher identity", 80);
  assertLine(args.countries, "countries/regions", 500);
  assertLine(args.supportOwner, "support owner", 200);
  assertLine(args.sourceRef, "source ref", 300);

  const outputDir = path.resolve(root, args.outputDir);
  const relative = path.relative(root, outputDir);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    fail("output directory must resolve inside the repository");
  }
  return outputDir;
}

export function validateListing(manifest, args, pluginId) {
  if (manifest.name !== pluginId) fail(`manifest name must be ${pluginId}`);
  if (manifest.version !== args.expectedVersion) {
    fail("manifest version differs from workflow input");
  }
  if (manifest.interface?.displayName !== publicationDisplayName) {
    fail(`display name must be ${publicationDisplayName}`);
  }
  if (manifest.author?.name !== args.publisher) fail("author.name differs from verified identity");
  if (manifest.interface?.developerName !== args.publisher) {
    fail("interface.developerName differs from verified identity");
  }
  if (manifest.skills !== "./skills/") fail('manifest skills must equal "./skills/"');

  assertLine(manifest.name, "package name", 64);
  assertLine(manifest.interface.displayName, "display name", 30);
  assertLine(manifest.interface.shortDescription, "short description", 30);
  assertLine(manifest.interface.developerName, "developer name", 80);
  if (
    typeof manifest.interface.longDescription !== "string" ||
    !manifest.interface.longDescription.trim() ||
    [...manifest.interface.longDescription].length > 4000
  ) {
    fail("long description must contain 1-4000 characters");
  }

  const capabilities = manifest.interface.capabilities;
  if (!Array.isArray(capabilities) || capabilities.length < 1 || capabilities.length > 20) {
    fail("capabilities must contain 1-20 entries");
  }
  capabilities.forEach((value, index) => assertLine(value, `capability ${index + 1}`, 120));

  const prompts = manifest.interface.defaultPrompt;
  if (!Array.isArray(prompts) || prompts.length < 1 || prompts.length > 3) {
    fail("starter prompts must contain 1-3 entries");
  }
  const seen = new Set();
  prompts.forEach((value, index) => {
    assertLine(value, `starter prompt ${index + 1}`, 128);
    if (value.includes("@")) fail("starter prompts must not contain @mentions");
    const normalized = value.trim().toLowerCase();
    if (seen.has(normalized)) fail("starter prompts must be unique");
    seen.add(normalized);
  });
}

export function bundleSkillNames(bundle) {
  if (!Array.isArray(bundle.skills)) fail("bundle skills must be an array");
  return bundle.skills.map((entry) => {
    if (typeof entry === "string") return path.posix.basename(entry);
    if (typeof entry?.name === "string") return entry.name;
    fail("bundle skill entries require a name");
  });
}

export function assertPublicationSkills(actual, label, ordered = true) {
  const expected = ordered ? publicationSkills : [...publicationSkills].sort();
  const received = ordered ? [...actual] : [...actual].sort();
  if (
    received.length !== expected.length ||
    received.some((value, index) => value !== expected[index])
  ) {
    fail(`${label} does not contain exactly the six approved skills`);
  }
}

export async function checkPublicationUrls(manifest, validations) {
  const entries = [
    ["website", manifest.interface.websiteURL],
    ["support", manifest.interface.supportURL],
    ["privacy", manifest.interface.privacyPolicyURL],
    ["terms", manifest.interface.termsOfServiceURL],
  ];
  const results = [];
  for (const [kind, url] of entries) {
    if (typeof url !== "string" || !url.startsWith("https://")) {
      fail(`${kind} URL must use production HTTPS`);
    }
    let response;
    try {
      response = await fetch(url, {
        redirect: "follow",
        headers: { "user-agent": "stark-ai-developer-publication-readiness/1" },
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      fail(`${kind} URL could not be fetched: ${error.message}`);
    }
    if (!response.ok) fail(`${kind} URL returned HTTP ${response.status}`);
    if (!response.url.startsWith("https://")) fail(`${kind} URL redirected away from HTTPS`);
    await response.body?.cancel();
    results.push({ kind, url, status: response.status, finalUrl: response.url });
    validations.push({ command: `HTTP GET ${url}`, passed: true });
  }
  return results;
}

export function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

export function locateSingleArchive(root) {
  const directory = path.join(root, "dist", "openai");
  const archives = fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".zip"))
    .map((entry) => path.join(directory, entry.name));
  if (archives.length !== 1) fail(`expected one OpenAI ZIP; found ${archives.length}`);
  return archives[0];
}

export function verifyReleaseSideArtifacts(archive, sha256, version, sourceSha, readJson) {
  const checksumPath = `${archive}.sha256`;
  const releaseManifestPath = archive.replace(/\.zip$/, ".manifest.json");
  if (!fs.existsSync(checksumPath) || !fs.existsSync(releaseManifestPath)) {
    fail("release ZIP must have checksum and release-manifest siblings");
  }
  const checksum = fs.readFileSync(checksumPath, "utf8").trim();
  if (checksum !== `${sha256}  ${path.basename(archive)}`) fail("release checksum is stale");
  const release = readJson(releaseManifestPath);
  if (
    release.version !== version ||
    release.sourceCommit !== sourceSha ||
    release.archive !== path.basename(archive) ||
    release.sha256 !== sha256 ||
    release.archiveBytes !== fs.statSync(archive).size
  ) {
    fail("release manifest is not bound to the selected candidate");
  }
  assertPublicationSkills(release.skills, "release manifest", true);
}

export function publicationMarkdown(evidence) {
  const urls = evidence.publicUrls
    .map((item) => `| ${item.kind} | ${item.status} | ${item.finalUrl} |`)
    .join("\n");
  const validations = evidence.validations
    .map((item) => `- ✅ \`${item.command}\``)
    .join("\n");
  return `# stark AI Developer publication evidence

- Plugin: **${evidence.plugin.displayName}** (\`${evidence.plugin.id}\`)
- Version: \`${evidence.plugin.version}\`
- Publisher: **${evidence.publisher.identity}**
- Source: \`${evidence.source.sha}\` from \`${evidence.source.ref}\`
- Archive: \`${evidence.archive.filename}\`
- SHA-256: \`${evidence.archive.sha256}\`
- Two-build reproducibility: **passed**
- Countries/regions: ${evidence.availability.countriesOrRegions}
- Support owner: ${evidence.supportOwner}

## Bundle skills

${evidence.bundleSkills.map((skill) => `- \`${skill}\``).join("\n")}

## Public URLs

| Kind | HTTP | Final URL |
| --- | ---: | --- |
${urls}

## Validations

${validations}

## Manual gates remaining

OpenAI upload, scan disposition, reviewer cases, attestations, review, approval,
the separate Publish action, and clean-account discovery/install/update/uninstall
verification remain human-controlled.

Workflow: ${evidence.workflow.runUrl}
`;
}
