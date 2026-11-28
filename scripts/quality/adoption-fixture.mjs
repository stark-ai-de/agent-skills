import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const skill = new URL("../../skills/engineering-workflows/architecture-compass/", import.meta.url);

const guideName =
  "references/ac-adr-069-require-shared-code-quality-with-explicit-toolchain-ownership.guide.md";

const recipeName = "assets/shared-quality-adoption-recipes.md";
const node = execFileSync("node", ["--print", "process.execPath"], { encoding: "utf-8" }).trim();

const assertDocumentedDependencies = (guide, manifest) => {
  const manifests = [...guide.matchAll(/```json\n(?<code>[\s\S]*?)\n```/gu)];

  assert.equal(manifests.length, 1, "Document the exact provider and peer manifest entries");

  const names = ["@servrox/code-quality", "ultracite", "oxlint", "oxfmt"];
  const expected = Object.fromEntries(names.map((name) => [name, manifest.devDependencies[name]]));
  const documented = JSON.parse(manifests[0].groups.code).devDependencies;

  assert.deepEqual(documented, expected, "Keep documented peers pinned to the qualified versions");

  return documented["@servrox/code-quality"];
};

const examples = () => {
  const guide = readFileSync(new URL(guideName, skill), "utf-8");
  const recipe = readFileSync(new URL(recipeName, skill), "utf-8");
  const configs = [...guide.matchAll(/```js\n(?<code>[\s\S]*?)\n```/gu)];
  const wrappers = [...recipe.matchAll(/```js\n(?<code>[\s\S]*?)\n```/gu)];
  const manifests = [...recipe.matchAll(/```json\n(?<code>[\s\S]*?)\n```/gu)];

  assert.equal(configs.length, 2, "Keep both documented shared configurations executable");
  assert.equal(wrappers.length, 1, "Qualify the exact documented baseline wrapper");

  const lintArgs = JSON.parse(manifests[0].groups.code).scripts["quality:check"].split(" ");

  assert.equal(lintArgs.shift(), "oxlint");

  const manifest = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf-8"),
  );

  const pin = assertDocumentedDependencies(guide, manifest);

  return { configs, wrapper: wrappers[0].groups.code, lintArgs, pin };
};

export const createConsumer = (context) => {
  const directory = mkdtempSync(path.join(tmpdir(), "quality-adoption-"));

  context.after(() => rmSync(directory, { recursive: true, force: true }));

  const environment = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) =>
        ![
          "CI",
          "QUALITY_BASE_SHA",
          "GITHUB_EVENT_NAME",
          "GITHUB_STEP_SUMMARY",
          "NODE_PATH",
        ].includes(key) && !key.startsWith("GIT_"),
    ),
  );

  const documented = examples();

  for (const name of ["src", "tools"]) {
    mkdirSync(path.join(directory, name));
  }

  symlinkSync(
    realpathSync(new URL("../../node_modules", import.meta.url)),
    path.join(directory, "node_modules"),
    "junction",
  );
  writeFileSync(
    path.join(directory, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  writeFileSync(path.join(directory, "src/example.mjs"), "export const enabled = true;\n");
  writeFileSync(path.join(directory, "tools/quality.mjs"), `${documented.wrapper}\n`);

  for (const [index, name] of ["oxlint", "oxfmt"].entries()) {
    writeFileSync(
      path.join(directory, `${name}.config.mjs`),
      `${documented.configs[index].groups.code}\n`,
    );
  }

  const binary = fileURLToPath(new URL("../bin/oxlint", import.meta.resolve("oxlint")));

  return {
    directory,
    environment,
    pin: documented.pin,
    lintArgs: [binary, ...documented.lintArgs],
  };
};

export const runConsumer = (fixture, args, environment = {}) => {
  const result = spawnSync(node, args, {
    cwd: fixture.directory,
    env: { ...fixture.environment, ...environment },
    encoding: "utf-8",
    timeout: 30_000,
    maxBuffer: 16 * 1024 * 1024,
  });

  assert.ifError(result.error);
  assert.equal(result.signal, null, result.stderr);

  return result;
};

const git = (fixture, args, input) =>
  execFileSync("git", args, {
    cwd: fixture.directory,
    env: fixture.environment,
    input,
    encoding: "utf-8",
    timeout: 30_000,
  }).trim();

export const commitConsumer = (fixture, baseline) => {
  git(fixture, ["init", "--quiet"]);

  const manifest = { private: true, type: "module" };

  if (baseline) {
    manifest.devDependencies = { "@servrox/code-quality": fixture.pin };
  }

  const manifestBlob = git(fixture, ["hash-object", "-w", "--stdin"], JSON.stringify(manifest));
  const source = readFileSync(path.join(fixture.directory, "src/example.mjs"), "utf-8");
  const sourceBlob = git(fixture, ["hash-object", "-w", "--stdin"], source);
  const sourceTree = git(fixture, ["mktree"], `100644 blob ${sourceBlob}\texample.mjs\n`);

  const entries = [
    `100644 blob ${manifestBlob}\tpackage.json\n`,
    `040000 tree ${sourceTree}\tsrc\n`,
  ];

  if (baseline) {
    const allowance = git(fixture, ["hash-object", "-w", "--stdin"], JSON.stringify(baseline));

    entries.push(`100644 blob ${allowance}\tquality-baseline.json\n`);
  }

  const tree = git(fixture, ["mktree"], entries.join(""));

  return git(
    fixture,
    [
      "-c",
      "user.name=Quality adoption fixture",
      "-c",
      "user.email=quality@example.invalid",
      "-c",
      "commit.gpgSign=false",
      "commit-tree",
      tree,
    ],
    "Consumer recipe history\n",
  );
};
