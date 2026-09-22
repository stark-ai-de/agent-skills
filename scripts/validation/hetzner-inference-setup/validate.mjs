import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const skill = path.join(root, "skills/engineering-workflows/hetzner-inference-setup");
const entry = fs.readFileSync(path.join(skill, "SKILL.md"), "utf8");
assert.match(entry, /^name: hetzner-inference-setup$/m);
for (const relative of [
  "agents/openai.yaml",
  "references/manual-setup.md",
  "references/remote-setup.md",
  "references/remote-clients.md",
  "scripts/setup-hetzner-inference.mjs",
  "scripts/manage-remote-hetzner.mjs",
  "scripts/configure-remote-clients.mjs",
])
  assert.ok(
    fs.statSync(path.join(skill, relative)).isFile(),
    `Missing installed resource: ${relative}`,
  );
const source = JSON.parse(
  fs.readFileSync(path.join(root, "plugins/stark-ai-developer.source.json"), "utf8"),
);
assert.ok(
  !JSON.stringify(source).includes("hetzner-inference-setup"),
  "Hetzner must remain standalone",
);
const result = spawnSync(
  "node",
  [
    "--test",
    ...[
      "test.mjs",
      "remote.test.mjs",
      "probes.test.mjs",
      "remote-clients.test.mjs",
      "manual.test.mjs",
    ].map((name) => path.join(root, "scripts/validation/hetzner-inference-setup", name)),
  ],
  {
    cwd: root,
    stdio: "inherit",
    timeout: 600_000,
  },
);
if (result.error) throw result.error;
assert.equal(result.status, 0, "Hetzner behavior tests failed");
console.log("Hetzner standalone contract and behavior validation passed.");
