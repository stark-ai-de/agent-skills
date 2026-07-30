import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  validationErrors,
  validationSummary,
} from "./validation/architecture-compass/validate.mjs";

export { validationErrors, validationSummary };

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  if (validationErrors.length > 0) {
    console.error("Architecture Compass validation failed:");
    for (const error of validationErrors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(validationSummary);
}
