import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import {
  loadBundle,
  openAiRoot,
  pluginId,
  readJson,
  root,
} from "./lib/plugin-projections.mjs";
import {
  assertPublicationSkills,
  bundleSkillNames,
  checkPublicationUrls,
  fail,
  locateSingleArchive,
  parsePublicationArgs,
  publicationDisplayName,
  publicationMarkdown,
  sha256File,
  validateListing,
  validatePublicationInputs,
  verifyReleaseSideArtifacts,
} from "./lib/openai-publication.mjs";

function run(command, args, validations, capture = false) {
  const label = [command, ...args].join(" ");
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (result.error || result.status !== 0) {
    if (capture) {
      process.stdout.write(result.stdout ?? "");
      process.stderr.write(result.stderr ?? "");
    }
    fail(`${label} failed`);
  }
  validations.push({ command: label, passed: true });
  return capture ? result.stdout.trim() : "";
}

function readCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error || result.status !== 0) fail(result.stderr.trim() || `${command} failed`);
  return result.stdout.trim();
}

function writeOutputs(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `${Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n")}\n`,
  );
}

async function main() {
  const args = parsePublicationArgs(process.argv.slice(2));
  const outputDir = validatePublicationInputs(args, root);
  const currentSha = readCommand("git", ["rev-parse", "HEAD"]);
  if (currentSha !== args.sourceSha) fail("checked-out commit differs from requested source SHA");
  if (readCommand("git", ["status", "--porcelain"])) {
    fail("working tree must be clean before publication preparation");
  }

  const manifestPath = path.join(openAiRoot, ".codex-plugin", "plugin.json");
  if (!fs.existsSync(manifestPath)) fail("OpenAI adapter manifest is missing");
  const manifest = readJson(manifestPath);
  validateListing(manifest, args, pluginId);

  const skills = bundleSkillNames(loadBundle());
  assertPublicationSkills(skills, "Codex bundle", true);
  const packagedSkills = fs
    .readdirSync(path.join(openAiRoot, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  assertPublicationSkills(packagedSkills, "OpenAI package", false);

  const validations = [];
  run("npm", ["run", "plugin:sync:check"], validations);
  run("npm", ["run", "plugin:validate"], validations);
  run("npm", ["run", "plugin:test"], validations);
  if (args.runFullValidation) run("npm", ["run", "validate"], validations);
  run("pnpm", ["format:check"], validations);
  run("pnpm", ["lint"], validations);
  if (!args.runFullValidation) run("pnpm", ["--filter", "./site", "build"], validations);
  if (fs.existsSync(path.join(root, "scripts", "validate-release.mjs"))) {
    run(process.execPath, ["scripts/validate-release.mjs"], validations);
  }
  const publicUrls = await checkPublicationUrls(manifest, validations);

  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), `${pluginId}-publication-`));
  try {
    fs.rmSync(path.join(root, "dist", "openai"), { recursive: true, force: true });
    run("npm", ["run", "plugin:pack"], validations);
    const firstArchive = locateSingleArchive(root);
    const firstSha256 = sha256File(firstArchive);
    const firstCopy = path.join(temporary, path.basename(firstArchive));
    fs.copyFileSync(firstArchive, firstCopy);

    fs.rmSync(path.join(root, "dist", "openai"), { recursive: true, force: true });
    run("npm", ["run", "plugin:pack"], validations);
    const finalArchive = locateSingleArchive(root);
    const finalSha256 = sha256File(finalArchive);
    if (
      firstSha256 !== finalSha256 ||
      !fs.readFileSync(firstCopy).equals(fs.readFileSync(finalArchive))
    ) {
      fail("two independent plugin package builds produced different ZIP bytes");
    }
    verifyReleaseSideArtifacts(
      finalArchive,
      finalSha256,
      manifest.version,
      args.sourceSha,
      readJson,
    );

    fs.rmSync(outputDir, { recursive: true, force: true });
    fs.mkdirSync(outputDir, { recursive: true });
    fs.cpSync(path.join(root, "dist", "openai"), path.join(outputDir, "artifacts"), {
      recursive: true,
    });

    const runUrl =
      process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
        ? [
            process.env.GITHUB_SERVER_URL,
            process.env.GITHUB_REPOSITORY,
            "actions",
            "runs",
            process.env.GITHUB_RUN_ID,
          ].join("/")
        : "https://github.com/stark-ai-de/agent-skills/actions";
    const evidence = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      plugin: {
        id: pluginId,
        displayName: publicationDisplayName,
        version: manifest.version,
        manifestPath: path.relative(root, manifestPath).split(path.sep).join("/"),
      },
      source: {
        repository: process.env.GITHUB_REPOSITORY ?? "stark-ai-de/agent-skills",
        sha: args.sourceSha,
        ref: args.sourceRef,
      },
      publisher: {
        identity: args.publisher,
        identityVerified: true,
        appsManagementWriteConfirmed: true,
        legalApproved: true,
      },
      availability: { approved: true, countriesOrRegions: args.countries },
      supportOwner: args.supportOwner,
      archive: {
        filename: path.basename(finalArchive),
        sha256: finalSha256,
        size: fs.statSync(finalArchive).size,
        firstBuildSha256: firstSha256,
        secondBuildSha256: finalSha256,
        reproducible: true,
      },
      bundleSkills: skills,
      publicUrls,
      validations,
      workflow: {
        runId: process.env.GITHUB_RUN_ID ?? "local",
        runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? "1",
        runUrl,
        actor: process.env.GITHUB_ACTOR ?? "local",
      },
    };

    fs.writeFileSync(
      path.join(outputDir, "publication-evidence.json"),
      `${JSON.stringify(evidence, null, 2)}\n`,
    );
    fs.writeFileSync(
      path.join(outputDir, "publication-evidence.md"),
      publicationMarkdown(evidence),
    );
    fs.copyFileSync(
      path.join(root, "docs", "plugins", pluginId, "publication-evidence.schema.json"),
      path.join(outputDir, "publication-evidence.schema.json"),
    );
    fs.writeFileSync(
      path.join(outputDir, "SHA256SUMS"),
      `${finalSha256}  artifacts/${path.basename(finalArchive)}\n`,
    );
    fs.writeFileSync(
      path.join(outputDir, "archive-file-list.txt"),
      `${readCommand("unzip", ["-Z1", finalArchive])}\n`,
    );

    const shortSha = args.sourceSha.slice(0, 12);
    writeOutputs({
      plugin_version: manifest.version,
      archive_name: path.basename(finalArchive),
      archive_sha256: finalSha256,
      source_sha: args.sourceSha,
      short_sha: shortSha,
      artifact_name: `${pluginId}-publication-evidence-${manifest.version}-${shortSha}`,
    });
    console.log(`Publication evidence prepared at ${path.relative(root, outputDir)}`);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`Publication preparation failed: ${error.message}`);
  process.exit(1);
});
