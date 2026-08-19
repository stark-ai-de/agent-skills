#!/usr/bin/env node
import process from "node:process";

import { loadReleaseDescriptorFile, validateToolchainPins } from "./lib/release-descriptor.mjs";

const rootIndex = process.argv.indexOf("--root");
const root = rootIndex === -1 ? process.cwd() : process.argv[rootIndex + 1];

const { release, errors } = loadReleaseDescriptorFile(root);
errors.push(...validateToolchainPins(root));
if (errors.length > 0) {
  console.error("Release descriptor validation errors:");
  for (const error of [...new Set(errors)]) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Release descriptor is valid: ${release.pluginId}@${release.version} (${release.build.archiveProfile})`,
  );
}
