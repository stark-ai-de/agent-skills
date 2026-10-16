#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
// Synthetic, disposable code-review cases. No network/model calls.
const cases = {
  "zero-is-present": {
    red: true,
    task: "Fix id=0 falsy handling; absent fields remain invalid.",
    files: {
      "src/api.mjs":
        "export function parse(v){if(!v||!v.id||!v.kind)return {ok:false};return {ok:true,id:v.id,kind:v.kind}}\n",
      "test/api.test.mjs":
        "import test from 'node:test';import assert from 'node:assert/strict';import {parse} from '../src/api.mjs';test('id 0',()=>assert.deepEqual(parse({id:0,kind:'card'}),{ok:true,id:0,kind:'card'}));test('missing id',()=>assert.equal(parse({kind:'card'}).ok,false));test('missing kind',()=>assert.equal(parse({id:1}).ok,false));\n",
    },
  },
  "duplicate-validators": {
    red: false,
    simplify: true,
    task: "Even with green tests, deduplicate repeated limit-check responsibility. Preserve both exports and semantics.",
    files: {
      "src/limits.mjs":
        "export function validQueue(x){return typeof x==='number'&&Number.isInteger(x)&&x>=0&&x<=50;}\nexport function validBatch(x){return typeof x==='number'&&Number.isInteger(x)&&x>=0&&x<=50;}\n",
      "test/limits.test.mjs":
        "import test from 'node:test';import assert from 'node:assert/strict';import {validQueue,validBatch} from '../src/limits.mjs';for(const f of [validQueue,validBatch])test(f.name,()=>{for(const x of [0,1,50])assert.equal(f(x),true);for(const x of [-1,51,1.5,'1',null])assert.equal(f(x),false)});\n",
    },
  },
  "distinct-contracts": {
    red: false,
    task: "Similar-looking contracts differ for zero. Preserve strictly-positive seat count and nonnegative adjustment. No change may be necessary.",
    files: {
      "src/policies.mjs":
        "export function seats(x){return Number.isInteger(x)&&x>0;}\nexport function adjustment(x){return Number.isInteger(x)&&x>=0;}\n",
      "test/policies.test.mjs":
        "import test from 'node:test';import assert from 'node:assert/strict';import {seats,adjustment} from '../src/policies.mjs';test('zero differs',()=>{assert.equal(seats(0),false);assert.equal(adjustment(0),true)});test('negative invalid',()=>{assert.equal(seats(-1),false);assert.equal(adjustment(-1),false)});\n",
    },
  },
  "untracked-component": {
    red: true,
    task: "The untracked src/chip.mjs is part of the feature; preserve empty string labels and nullish fallback.",
    files: {
      "src/index.mjs":
        "import {render} from './chip.mjs';export function chip(x){return render(x)}\n",
      "test/chip.test.mjs":
        "import test from 'node:test';import assert from 'node:assert/strict';import {chip} from '../src/index.mjs';test('empty label',()=>assert.equal(chip(''),''));test('null fallback',()=>assert.equal(chip(null),'unknown'));test('ordinary',()=>assert.equal(chip('OK'),'OK'));\n",
    },
    untracked: { "src/chip.mjs": "export function render(x){return String(x||'unknown')}\n" },
  },
  "regression-guard": {
    red: true,
    task: "Zero is normal. Preserve nullish missing, negatives invalid, 100+ high.",
    files: {
      "src/amount.mjs":
        "export function classify(x){if(x===null||x===undefined)return 'missing';if(x<0)return 'invalid';if(!x)return 'missing';if(x>=100)return 'high';return 'normal'}\n",
      "test/amount.test.mjs":
        "import test from 'node:test';import assert from 'node:assert/strict';import {classify} from '../src/amount.mjs';test('zero',()=>assert.equal(classify(0),'normal'));test('nullish',()=>assert.equal(classify(null),'missing'));test('negative',()=>assert.equal(classify(-1),'invalid'));test('threshold',()=>assert.equal(classify(100),'high'));\n",
    },
  },
};

function subprocessEnvironment() {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !key.toUpperCase().startsWith("GIT_") && key !== "NODE_TEST_CONTEXT",
    ),
  );
  return {
    ...env,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: os.devNull,
    GIT_CONFIG_SYSTEM: os.devNull,
    GIT_TERMINAL_PROMPT: "0",
  };
}

function run(executable, args, cwd) {
  const result = spawnSync(executable, args, {
    cwd,
    env: subprocessEnvironment(),
    encoding: "utf8",
    timeout: 15000,
  });
  if (result.error) throw result.error;
  if (result.signal || result.status === null)
    throw new Error("Fixture subprocess did not complete normally");
  return result;
}

function git(args, cwd) {
  const result = run(
    "git",
    [
      "-c",
      "core.hooksPath=" + os.devNull,
      "-c",
      "core.fsmonitor=false",
      "-c",
      "commit.gpgsign=false",
      "-c",
      "user.name=Fixture Author",
      "-c",
      "user.email=fixture@example.invalid",
      ...args,
    ],
    cwd,
  );
  if (result.status !== 0) throw new Error(result.stderr.trim() || "Fixture Git operation failed");
  return result.stdout.trim();
}

function verifyRepository(dir) {
  const root = fs.realpathSync(dir);
  const gitPath = path.join(root, ".git");
  if (!fs.lstatSync(gitPath).isDirectory() || fs.lstatSync(gitPath).isSymbolicLink())
    throw new Error("Not an isolated fixture repository");
  const expectedGit = fs.realpathSync(gitPath);
  const actualRoot = fs.realpathSync(git(["rev-parse", "--show-toplevel"], root));
  const actualGit = fs.realpathSync(git(["rev-parse", "--absolute-git-dir"], root));
  if (actualRoot !== root || actualGit !== expectedGit)
    throw new Error("Fixture repository escapes the selected directory");
  return root;
}

function arg(args, key) {
  const index = args.indexOf("--" + key);
  return index < 0 || !args[index + 1] || args[index + 1].startsWith("--") ? null : args[index + 1];
}

function fixtureCase(id) {
  if (!Object.hasOwn(cases, id)) throw new Error("Unknown case " + id);
  return cases[id];
}

function write(dir, files) {
  for (const [relative, source] of Object.entries(files)) {
    const target = path.join(dir, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, source);
  }
}

function prepare(id, output) {
  const fixture = fixtureCase(id);
  if (!output) throw new Error("Missing --out");
  const dest = path.resolve(output);
  // mkdir is exclusive even for dangling symlinks; do not create missing parents.
  fs.mkdirSync(dest);
  write(dest, fixture.files);
  fs.writeFileSync(
    path.join(dest, "TASK.md"),
    "# Review task\n\n" + fixture.task + "\n\nRun node --test before reporting.\n",
  );
  git(["init", "--template=", "-q", "-b", "main"], dest);
  verifyRepository(dest);
  git(["add", "--", "TASK.md", "src", "test"], dest);
  verifyRepository(dest);
  git(["commit", "--no-gpg-sign", "-qm", "Fixture baseline"], dest);
  write(dest, fixture.untracked || {});
  return {
    id,
    dir: dest,
    head: git(["rev-parse", "HEAD"], dest),
    untracked: Object.keys(fixture.untracked || {}),
  };
}

function grade(id, directory) {
  const fixture = fixtureCase(id);
  if (!directory) throw new Error("Missing --dir");
  const dest = verifyRepository(path.resolve(directory));
  const changed = Object.entries(fixture.files)
    .filter(
      ([relative, source]) =>
        relative.startsWith("test/") &&
        (!fs.existsSync(path.join(dest, relative)) ||
          !fs.lstatSync(path.join(dest, relative)).isFile() ||
          fs.readFileSync(path.join(dest, relative), "utf8") !== source),
    )
    .map(([relative]) => relative);
  const start = performance.now();
  // Do not execute modified original tests. New tests are permitted in this authorized disposable scope.
  const result = changed.length
    ? { status: 1, stdout: "", stderr: "Original tests changed" }
    : run(process.execPath, ["--test"], dest);
  const testsPassed = result.status === 0;
  const status =
    !testsPassed || changed.length
      ? "failed"
      : fixture.simplify
        ? "needs_semantic_review"
        : "passed";
  return {
    id,
    status,
    passed: status === "needs_semantic_review" ? null : status === "passed",
    testsPassed,
    originalTestsChanged: changed,
    simplified: null,
    elapsedMs: Math.round(performance.now() - start),
    testTail: (result.stdout + result.stderr).slice(-700),
    note: "Mechanical grader only; independent whole-diff semantic and churn review remains required",
  };
}

const [op, ...args] = process.argv.slice(2);
try {
  if (op === "list")
    console.log(
      JSON.stringify(
        Object.entries(cases).map(([id, fixture]) => ({
          id,
          baseline: fixture.red ? "RED" : "GREEN",
          simplify: !!fixture.simplify,
          untracked: !!fixture.untracked,
        })),
        null,
        2,
      ),
    );
  else if (op === "prepare")
    console.log(JSON.stringify(prepare(arg(args, "case"), arg(args, "out")), null, 2));
  else if (op === "grade") {
    const result = grade(arg(args, "case"), arg(args, "dir"));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.status === "needs_semantic_review" ? 3 : result.passed ? 0 : 1;
  } else if (op === "selftest") {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "swarm-fixture-"));
    try {
      for (const [id, fixture] of Object.entries(cases)) {
        const dir = path.join(temp, id);
        prepare(id, dir);
        const result = grade(id, dir);
        if (result.testsPassed === !!fixture.red) throw new Error("Wrong baseline " + id);
        if (
          fixture.simplify &&
          (result.status !== "needs_semantic_review" || result.simplified !== null)
        )
          throw new Error("Unassessed simplification " + id);
        console.log(id + ": baseline " + (result.testsPassed ? "GREEN" : "RED") + " as designed");
      }
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  } else
    throw new Error(
      "Usage: list|selftest|prepare --case ID --out NEW_DIR|grade --case ID --dir DIR",
    );
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
