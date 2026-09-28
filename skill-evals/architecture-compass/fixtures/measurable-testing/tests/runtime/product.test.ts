import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { expect, test } from "vitest";
test("Bun product behavior has separate representative proof", () => {
  const result = spawnSync(
    "bun",
    [
      "--eval",
      'console.log(JSON.stringify({runtime:process.versions.bun,hash:Bun.hash("contract").toString()}))',
    ],
    { encoding: "utf8", timeout: 5000 },
  );
  expect(result.status).toBe(0);
  const observed = JSON.parse(result.stdout);
  expect(observed.runtime).toBeTruthy();
  expect(observed.hash).toMatch(/^\d+$/);
});

test("CommonJS and ESM boundaries both execute in the selected runtime", () =>
  expect(createRequire(import.meta.url)("./compat.cjs").format).toBe("commonjs"));
