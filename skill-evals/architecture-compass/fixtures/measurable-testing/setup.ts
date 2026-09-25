import fs from "node:fs";
import path from "node:path";
import { afterAll, expect } from "vitest";
afterAll(() => {
  const output = process.env.QUALIFICATION_RUNTIME_DIR;
  if (!output) return;
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(
    path.join(output, `worker-${process.pid}.json`),
    JSON.stringify({
      role: "worker",
      versions: process.versions,
      executable: path.basename(process.execPath),
      maxRssKiB: process.resourceUsage().maxRSS,
    }),
  );
  expect(process.versions.node).toBeTruthy();
});
