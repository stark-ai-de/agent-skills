import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const kit = fileURLToPath(
  new URL(
    "../../incubator/skills/engineering-workflows/review-fix-swarm/scripts/fixture-kit.mjs",
    import.meta.url,
  ),
);
const cleanEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith("GIT_")),
);
Object.assign(cleanEnv, {
  GIT_CONFIG_GLOBAL: os.devNull,
  GIT_CONFIG_SYSTEM: os.devNull,
  GIT_CONFIG_NOSYSTEM: "1",
});

function command(executable, args, cwd, env = cleanEnv) {
  const result = spawnSync(executable, args, { cwd, env, encoding: "utf8", timeout: 25000 });
  if (result.error) throw result.error;
  return result;
}
function cli(args, env = cleanEnv) {
  return command(process.execPath, [kit, ...args], undefined, env);
}
function git(dir, args) {
  const result = command(
    "git",
    [
      "-c",
      "core.hooksPath=" + os.devNull,
      "-c",
      "commit.gpgsign=false",
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.invalid",
      ...args,
    ],
    dir,
  );
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}
function temporary(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "swarm-regression-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function prepare(parent, id = "duplicate-validators", name = id, env = cleanEnv) {
  const dir = path.join(parent, name);
  const result = cli(["prepare", "--case", id, "--out", dir], env);
  assert.equal(result.status, 0, result.stderr);
  return dir;
}
function grade(dir, id = "duplicate-validators") {
  const result = cli(["grade", "--case", id, "--dir", dir]);
  return { exit: result.status, ...JSON.parse(result.stdout) };
}
function write(dir, files) {
  for (const [relative, source] of Object.entries(files)) {
    const target = path.join(dir, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, source);
  }
}
function fingerprint(dir) {
  // Include ignored/untracked bytes as well as index/refs and configuration.
  function walk(current) {
    return fs
      .readdirSync(current, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))
      .flatMap((entry) => {
        const absolute = path.join(current, entry.name);
        return entry.isDirectory()
          ? walk(absolute)
          : [[path.relative(dir, absolute), fs.readFileSync(absolute).toString("base64")]];
      });
  }
  return createHash("sha256")
    .update(JSON.stringify(walk(dir)))
    .digest("hex");
}

test("all five initial RED/GREEN cases and semantic pending state", (t) => {
  const root = temporary(t);
  const cases = JSON.parse(cli(["list"]).stdout);
  assert.equal(cases.length, 5);
  for (const fixture of cases) {
    const dir = prepare(root, fixture.id);
    const result = grade(dir, fixture.id);
    assert.equal(result.testsPassed, fixture.baseline === "GREEN");
    assert.deepEqual(result.originalTestsChanged, []);
    assert.equal(result.exit, fixture.baseline === "RED" ? 1 : fixture.simplify ? 3 : 0);
    if (fixture.simplify) {
      assert.equal(result.status, "needs_semantic_review");
      assert.equal(result.passed, null);
      assert.equal(result.simplified, null);
    }
  }
  assert.equal(cli(["selftest"]).status, 0);
});

test("Git environment cannot mutate an outer repository, index or object store", (t) => {
  const root = temporary(t);
  const outer = path.join(root, "outer");
  fs.mkdirSync(outer);
  write(outer, {
    "TASK.md": "outer task\n",
    "src/work.mjs": "export const x=1;\n",
    "test/work.mjs": "// outer test\n",
  });
  git(outer, ["init", "--template=", "-qb", "main"]);
  git(outer, ["add", "."]);
  git(outer, ["commit", "-qm", "outer"]);
  write(outer, { "src/work.mjs": "export const x=2;\n", "staged.txt": "staged\n" });
  git(outer, ["add", "staged.txt"]);
  write(outer, { "untracked.txt": "untracked\n" });
  const before = fingerprint(outer);
  const variants = [
    { GIT_DIR: path.join(outer, ".git"), GIT_WORK_TREE: outer },
    { GIT_INDEX_FILE: path.join(outer, ".git/index"), GIT_COMMON_DIR: path.join(outer, ".git") },
    {
      GIT_OBJECT_DIRECTORY: path.join(outer, ".git/objects"),
      GIT_ALTERNATE_OBJECT_DIRECTORIES: path.join(outer, ".git/objects"),
    },
    {
      GIT_CONFIG_COUNT: "2",
      GIT_CONFIG_KEY_0: "core.worktree",
      GIT_CONFIG_VALUE_0: outer,
      GIT_CONFIG_KEY_1: "core.bare",
      GIT_CONFIG_VALUE_1: "false",
    },
    {
      GIT_CONFIG_PARAMETERS: "'core.worktree=" + outer + "'",
      GIT_TRACE: path.join(outer, "trace.log"),
    },
  ];
  for (const [index, injected] of variants.entries()) {
    const dir = prepare(root, "zero-is-present", "isolated-" + index, { ...cleanEnv, ...injected });
    assert.equal(
      fingerprint(outer),
      before,
      "outer bytes changed for environment variant " + index,
    );
    assert.equal(
      fs.realpathSync(git(dir, ["rev-parse", "--show-toplevel"]).trim()),
      fs.realpathSync(dir),
    );
    assert.equal(
      fs.realpathSync(git(dir, ["rev-parse", "--absolute-git-dir"]).trim()),
      fs.realpathSync(path.join(dir, ".git")),
    );
  }
});

test("signing, hooks, templates and global/system config are isolated", (t) => {
  const root = temporary(t);
  const marker = path.join(root, "hook-ran");
  const hooks = path.join(root, "hooks");
  fs.mkdirSync(hooks);
  const template = path.join(root, "template");
  fs.mkdirSync(template);
  fs.mkdirSync(path.join(template, "hooks"));
  const hook = "#!/bin/sh\nprintf called > '" + marker.replaceAll("'", "'\\''") + "'\nexit 1\n";
  for (const target of [path.join(hooks, "pre-commit"), path.join(template, "hooks/pre-commit")]) {
    fs.writeFileSync(target, hook, { mode: 0o755 });
  }
  const config = path.join(root, "host.gitconfig");
  fs.writeFileSync(
    config,
    "[commit]\n gpgsign = true\n[gpg]\n program = deliberately-unavailable-signer\n[core]\n hooksPath = " +
      hooks +
      "\n[init]\n templateDir = " +
      template +
      "\n",
  );
  const configBytes = fs.readFileSync(config, "utf8");
  const dir = prepare(root, "zero-is-present", "signed", {
    ...cleanEnv,
    GIT_CONFIG_GLOBAL: config,
    GIT_CONFIG_SYSTEM: config,
    GIT_TEMPLATE_DIR: template,
  });
  assert.equal(fs.existsSync(marker), false);
  assert.equal(fs.existsSync(path.join(dir, ".git/hooks/pre-commit")), false);
  assert.equal(fs.readFileSync(config, "utf8"), configBytes);
});

const predicate = "typeof x==='number'&&Number.isInteger(x)&&x>=0&&x<=50";
for (const [name, sources] of Object.entries({
  relocated: {
    "src/limits.mjs":
      "export {validQueue} from './queue.mjs';export {validBatch} from './batch.mjs';\n",
    "src/queue.mjs": "export function validQueue(x){return " + predicate + "}\n",
    "src/batch.mjs": "export function validBatch(x){return " + predicate + "}\n",
  },
  shared: {
    "src/limits.mjs":
      "function validLimit(x){return " +
      predicate +
      "}\nexport const validQueue=validLimit;export const validBatch=validLimit;\n",
  },
  sharedComment: {
    "src/limits.mjs":
      "// Preserve Number.isInteger(x); fractions stay invalid.\nfunction validLimit(x){return " +
      predicate +
      "}\nexport const validQueue=validLimit;export const validBatch=validLimit;\n",
  },
}))
  test("semantic outcome is not invented for " + name, (t) => {
    const dir = prepare(temporary(t));
    write(dir, sources);
    const result = grade(dir);
    assert.equal(result.testsPassed, true);
    assert.equal(result.exit, 3);
    assert.equal(result.passed, null);
    assert.equal(result.simplified, null);
  });

for (const mutation of ["changed", "deleted", "directory"])
  test("original tests " + mutation + " cannot pass grading", (t) => {
    const dir = prepare(temporary(t));
    const original = path.join(dir, "test/limits.test.mjs");
    if (mutation === "changed") fs.appendFileSync(original, "// changed\n");
    else {
      fs.unlinkSync(original);
      if (mutation === "directory") fs.mkdirSync(original);
    }
    const result = grade(dir);
    assert.equal(result.exit, 1);
    assert.equal(result.status, "failed");
    assert.deepEqual(result.originalTestsChanged, ["test/limits.test.mjs"]);
  });

test("additional tests are allowed", (t) => {
  const dir = prepare(temporary(t), "distinct-contracts");
  write(dir, {
    "test/additional.test.mjs": "import test from 'node:test';test('extra',()=>{});\n",
  });
  assert.equal(grade(dir, "distinct-contracts").exit, 0);
});

test("existing directories and symlinks are refused without changes", (t) => {
  const root = temporary(t);
  const dir = path.join(root, "existing");
  fs.mkdirSync(dir);
  write(dir, { "keep.txt": "untouched" });
  const before = fingerprint(dir);
  assert.equal(cli(["prepare", "--case", "zero-is-present", "--out", dir]).status, 2);
  assert.equal(fingerprint(dir), before);
  const link = path.join(root, "link");
  fs.symlinkSync(dir, link, process.platform === "win32" ? "junction" : "dir");
  assert.equal(cli(["prepare", "--case", "zero-is-present", "--out", link]).status, 2);
  assert.equal(fingerprint(dir), before);
});

test("invalid inputs and failed subprocesses are execution errors", (t) => {
  const root = temporary(t);
  for (const args of [
    [],
    ["prepare", "--case", "constructor", "--out", path.join(root, "bad")],
    ["prepare", "--case", "zero-is-present"],
    ["grade", "--case", "zero-is-present", "--dir", root],
  ]) {
    assert.equal(cli(args).status, 2);
  }
  const noGit = path.join(root, "empty-path");
  fs.mkdirSync(noGit);
  assert.equal(
    cli(["prepare", "--case", "zero-is-present", "--out", path.join(root, "missing-git")], {
      ...cleanEnv,
      PATH: noGit,
    }).status,
    2,
  );
});

test("grade rejects an indirect .git file", (t) => {
  const root = temporary(t);
  const dir = path.join(root, "not-fixture");
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, ".git"), "gitdir: ../elsewhere\n");
  assert.equal(cli(["grade", "--case", "zero-is-present", "--dir", dir]).status, 2);
});

test(
  "hung Git subprocess is bounded and reported as an execution error",
  { skip: process.platform === "win32", timeout: 23000 },
  (t) => {
    const root = temporary(t);
    const bin = path.join(root, "bin");
    fs.mkdirSync(bin);
    fs.writeFileSync(
      path.join(bin, "git"),
      "#!" + process.execPath + "\nsetTimeout(() => {}, 30000);\n",
      { mode: 0o755 },
    );
    const started = performance.now();
    const result = cli(
      ["prepare", "--case", "zero-is-present", "--out", path.join(root, "timeout")],
      { ...cleanEnv, PATH: bin },
    );
    assert.equal(result.status, 2);
    assert.match(result.stderr, /ETIMEDOUT/);
    assert.ok(performance.now() - started < 22000);
  },
);
