#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";

import { runVisualAssertionRegressions } from "./validation/lib/visual-assertion-regressions.mjs";

export { runVisualAssertionRegressions };

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runVisualAssertionRegressions();
  console.log("Validated visual assertion fixture regressions.");
}
