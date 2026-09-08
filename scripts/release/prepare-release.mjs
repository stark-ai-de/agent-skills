#!/usr/bin/env node
console.error(
  "Local version preparation is disabled. Use `pnpm run release:manage -- release-pr --confirm`; Release Please is the sole generator of package.json, .release-please-manifest.json, and CHANGELOG.md release changes.",
);
process.exitCode = 1;
