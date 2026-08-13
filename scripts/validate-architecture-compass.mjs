import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateArchitecture } from "./validation/architecture-compass/validate.mjs";

export function runArchitectureValidation(root) {
  return validateArchitecture(root);
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const { validationErrors, validationSummary } = runArchitectureValidation(process.cwd());
  if (validationErrors.length > 0) {
    console.error("Architecture Compass validation failed:");
    for (const error of validationErrors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(validationSummary);
  }
}
