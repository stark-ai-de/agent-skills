import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const guide = fs.readFileSync(
  "skills/engineering-workflows/architecture-compass/references/ac-adr-066-use-portless-for-local-development-endpoints.guide.md",
  "utf8",
);
const section = guide.split(
  "## Derive a checkout identity when branch names are insufficient\n",
)[1];
assert.ok(section, "The canonical launcher example must exist");
const example = /```js\r?\n([\s\S]*?)\r?\n```/.exec(section)?.[1];
assert.ok(example, "Run the actual fenced JavaScript, not a copied implementation");

const environment = { ...process.env };
for (const key of execFileSync("git", ["rev-parse", "--local-env-vars"], {
  encoding: "utf8",
})
  .trim()
  .split(/\r?\n/))
  delete environment[key];
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "portless-guide-git-"));
const realGit = (process.env.PATH || "")
  .split(path.delimiter)
  .map((directory) => path.join(directory, "git"))
  .find((candidate) => {
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return fs.statSync(candidate).isFile();
    } catch {
      return false;
    }
  });
assert.ok(realGit, "An existing Git executable is required");
const shimDirectory = path.join(temporary, "git-environment-probe");
fs.mkdirSync(shimDirectory);
const shim = path.join(shimDirectory, "git");
fs.writeFileSync(
  shim,
  "#!" +
    process.execPath +
    "\n" +
    'import assert from "node:assert/strict";\n' +
    'import {execFileSync} from "node:child_process";\n' +
    'assert.equal(process.env.PORTLESS_GUIDE_SENTINEL, "unrelated-fixture-value");\n' +
    'assert.equal(process.env.GIT_SSH_COMMAND, "fixture-authentication-command");\n' +
    "execFileSync(" +
    JSON.stringify(realGit) +
    ', process.argv.slice(2), {stdio:"inherit"});\n',
  { mode: 0o700 },
);
const hooks = path.join(temporary, "empty-hooks");
fs.mkdirSync(hooks);
const git = (...args) =>
  execFileSync(
    "git",
    [
      "-c",
      `core.hooksPath=${hooks}`,
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      ...args,
    ],
    { env: environment, stdio: ["ignore", "pipe", "pipe"] },
  );
const launcher = (directory) => {
  const file = path.join(directory, "scripts", "dev.mjs");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    `${example}\nconsole.log(JSON.stringify({checkout, name,
    sentinel: process.env.PORTLESS_GUIDE_SENTINEL,
    authentication: process.env.GIT_SSH_COMMAND,
    inheritedDirectory: process.env.GIT_DIR}));\n`,
  );
  return file;
};
function run(file, cwd, additional = {}) {
  const result = spawnSync("node", [file], {
    cwd,
    timeout: 10000,
    encoding: "utf8",
    env: {
      ...environment,
      PORTLESS_GUIDE_SENTINEL: "unrelated-fixture-value",
      GIT_SSH_COMMAND: "fixture-authentication-command",
      PATH: shimDirectory + path.delimiter + environment.PATH,
      ...additional,
    },
  });
  assert.ifError(result.error);
  return result;
}
function identity(file, cwd, expected, additional) {
  const result = run(file, cwd, additional);
  assert.equal(result.status, 0, result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(value.checkout, fs.realpathSync(expected));
  assert.equal(value.sentinel, "unrelated-fixture-value");
  assert.equal(value.authentication, "fixture-authentication-command");
  assert.equal(value.inheritedDirectory, additional?.GIT_DIR);
  assert.match(value.name, /^ui\.project-[0-9a-f]{10}\.example-app$/);
  return value.name;
}
try {
  const first = path.join(temporary, "first", "project");
  const clone = path.join(temporary, "other clone", "project");
  const detached = path.join(temporary, "detached", "project");
  fs.mkdirSync(first, { recursive: true });
  fs.mkdirSync(path.dirname(clone));
  fs.mkdirSync(path.dirname(detached));
  git("init", "--quiet", "-b", "main", first);
  git("-C", first, "commit", "--quiet", "--allow-empty", "-m", "fixture");
  git("clone", "--quiet", first, clone);
  git("-C", first, "worktree", "add", "--quiet", "--detach", detached);
  const file = launcher(first);
  const cloneFile = launcher(clone);
  const detachedFile = launcher(detached);
  const nested = path.join(first, "packages", "web");
  fs.mkdirSync(nested, { recursive: true });
  const expected = identity(file, first, first);
  assert.equal(identity(file, nested, first), expected);
  assert.equal(identity(file, clone, first), expected);
  assert.notEqual(identity(cloneFile, first, clone), expected);
  assert.notEqual(identity(detachedFile, clone, detached), expected);
  const foreign = {
    GIT_DIR: path.join(clone, ".git"),
    GIT_WORK_TREE: clone,
    GIT_COMMON_DIR: path.join(clone, ".git"),
    GIT_INDEX_FILE: path.join(clone, ".git", "index"),
  };
  assert.equal(identity(file, clone, first, foreign), expected);
  assert.notEqual(identity(detachedFile, first, detached, foreign), expected);
  const outside = launcher(path.join(temporary, "outside"));
  for (const extra of [{}, foreign]) {
    const result = run(outside, clone, extra);
    assert.notEqual(result.status, 0, "A launcher without a Git root must fail");
    assert.equal(result.stdout, "", "Root failure must not produce an identity");
  }
  console.log(
    "Portless Guide Git regressions passed: invocation directories, clone, detached worktree, inherited selectors, missing roots and preserved environment.",
  );
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
