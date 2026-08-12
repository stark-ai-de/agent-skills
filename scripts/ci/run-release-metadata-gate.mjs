import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--event" || argument === "--base-sha") {
      options[argument.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] =
        argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (!options.event) throw new Error("--event is required.");
  return options;
}

function run(arguments_, environment = process.env) {
  const result = spawnSync(process.execPath, arguments_, {
    cwd: process.cwd(),
    env: environment,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const options = parseArguments(process.argv.slice(2));
if (options.event !== "pull_request") {
  run(["scripts/validate-release-metadata.mjs"]);
} else {
  if (!options.baseSha || options.baseSha === "none") {
    throw new Error("Pull-request release metadata validation requires a base SHA.");
  }
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "release-intent-"));
  try {
    const outputFile = path.join(outputRoot, "github-output");
    run(["scripts/check-release-intent.mjs", "--base-ref", options.baseSha, "--github-output"], {
      ...process.env,
      GITHUB_OUTPUT: outputFile,
    });
    const values = Object.fromEntries(
      fs
        .readFileSync(outputFile, "utf8")
        .trimEnd()
        .split("\n")
        .map((line) => {
          const separator = line.indexOf("=");
          return [line.slice(0, separator), line.slice(separator + 1)];
        }),
    );
    if (values.release_intent === "true") {
      run([
        "scripts/validate-release-metadata.mjs",
        "--version",
        values.release_version,
        "--base-ref",
        options.baseSha,
      ]);
    } else {
      console.log("Release metadata gate passed with no release intent.");
    }
  } finally {
    fs.rmSync(outputRoot, { recursive: true, force: true });
  }
}
