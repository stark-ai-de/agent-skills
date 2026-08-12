import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const gateProgram = fileURLToPath(new URL("./run-architecture-compass-gate.mjs", import.meta.url));

function waitForChild(child) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
}

function gateFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-gate-lifecycle-"));
  const validationDirectory = path.join(root, "scripts", "validation", "architecture-compass");
  fs.mkdirSync(validationDirectory, { recursive: true });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, validationDirectory };
}

test("Architecture Compass gate runs successful commands in order", async (t) => {
  const { root, validationDirectory } = gateFixture(t);
  const executionLog = path.join(root, "execution.log");
  fs.writeFileSync(
    path.join(root, "scripts", "validate-architecture-compass.mjs"),
    `import fs from "node:fs";\nfs.appendFileSync(${JSON.stringify(executionLog)}, "validator\\n");\n`,
  );
  fs.writeFileSync(
    path.join(validationDirectory, "test-validator.mjs"),
    `import fs from "node:fs";\nfs.appendFileSync(${JSON.stringify(executionLog)}, "fixtures\\n");\n`,
  );

  const child = spawn(process.execPath, [gateProgram], {
    cwd: root,
    env: process.env,
    stdio: "ignore",
  });
  const result = await waitForChild(child);

  assert.equal(result.code, 0);
  assert.equal(result.signal, null);
  assert.equal(fs.readFileSync(executionLog, "utf8"), "validator\nfixtures\n");
});

test(
  "Architecture Compass gate rejects a successful leader with a surviving process group",
  { skip: process.platform === "win32" },
  async (t) => {
    const { root, validationDirectory } = gateFixture(t);
    const lateMutation = path.join(root, "late-mutation");
    const secondCommand = path.join(root, "second-command");
    const descendant = `setTimeout(() => require('fs').writeFileSync(${JSON.stringify(lateMutation)}, 'mutated'), 600)`;
    fs.writeFileSync(
      path.join(root, "scripts", "validate-architecture-compass.mjs"),
      `import { spawn } from "node:child_process";\nconst child = spawn(process.execPath, ["-e", ${JSON.stringify(descendant)}], { stdio: "ignore" });\nchild.unref();\n`,
    );
    fs.writeFileSync(
      path.join(validationDirectory, "test-validator.mjs"),
      `import fs from "node:fs";\nfs.writeFileSync(${JSON.stringify(secondCommand)}, "ran");\n`,
    );

    const child = spawn(process.execPath, [gateProgram], {
      cwd: root,
      env: process.env,
      stdio: "ignore",
    });
    const result = await waitForChild(child);
    await new Promise((resolve) => setTimeout(resolve, 750));

    assert.equal(result.code, 1);
    assert.equal(result.signal, null);
    assert.equal(fs.existsSync(secondCommand), false);
    assert.equal(fs.existsSync(lateMutation), false);
  },
);
