import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { createDirectoryArchive } from "../lib/plugin-projections.mjs";
import { validateOpenAiListing } from "../lib/openai-contract.mjs";
import { validateOpenAiProjection, withOpenAiStage } from "../lib/openai-projection.mjs";
import { openAiProfile } from "../lib/openai-profiles.mjs";

function writeStderr(lines) {
  fs.writeSync(process.stderr.fd, `${lines.join("\n")}\n`);
}

function parseArgs(argv) {
  const profileIndex = argv.indexOf("--profile");
  const profile = profileIndex === -1 ? undefined : argv[profileIndex + 1];
  if (profileIndex !== -1 && (!profile || profile.startsWith("--")))
    throw new Error("--profile requires a profile id");
  const rootIndex = argv.indexOf("--root");
  const outputIndex = argv.indexOf("--output");
  const root = rootIndex === -1 ? process.cwd() : path.resolve(argv[rootIndex + 1]);
  return {
    root,
    profile,
    output:
      outputIndex === -1
        ? path.join(root, openAiProfile(root, profile).archive)
        : path.resolve(argv[outputIndex + 1]),
  };
}

try {
  const { root, output, profile } = parseArgs(process.argv.slice(2));
  const listingValidation = validateOpenAiListing(root);
  if (listingValidation.errors.length > 0) {
    throw new Error(listingValidation.errors.join("\n"));
  }
  const result = withOpenAiStage(
    root,
    (staged) => {
      const validation = validateOpenAiProjection({
        root,
        targetRoot: staged.stage,
        bundle: staged.bundle,
        listing: staged.listing,
      });
      if (validation.errors.length > 0) {
        throw new Error(validation.errors.join("\n"));
      }
      return createDirectoryArchive({
        sourceRoot: staged.stage,
        output,
        archiveRoot: "",
      });
    },
    { profile },
  );
  console.log(`Packaged OpenAI ${openAiProfile(root, profile).profile} archive: ${result.output}`);
  console.log(`SHA-256: ${result.sha256}`);
  console.log(`Bytes: ${result.bytes}`);
} catch (error) {
  writeStderr([`OpenAI plugin packaging failed: ${error.message}`]);
  process.exitCode = 1;
}
