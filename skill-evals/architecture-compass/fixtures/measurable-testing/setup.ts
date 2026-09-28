import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { afterAll, expect } from "vitest";
afterAll(() => {
  const output = process.env.QUALIFICATION_RUNTIME_DIR;
  if (!output) return;
  const file = expect.getState().testPath;
  if (!file) throw new Error("missing worker test-file identity");
  const fileId = crypto.createHash("sha256").update(file).digest("hex");
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(
    path.join(output, `worker-${process.pid}-${fileId}.json`),
    JSON.stringify({
      role: "worker",
      pid: process.pid,
      file,
      versions: process.versions,
      executable: path.basename(process.execPath),
      maxRssKiB: process.resourceUsage().maxRSS,
    }),
  );
  expect(process.versions.node).toBeTruthy();
});
