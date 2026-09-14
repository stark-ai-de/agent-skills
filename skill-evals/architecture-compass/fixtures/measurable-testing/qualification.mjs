import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ProcessOwner } from "./process-owner.ts";
import { fileURLToPath } from "node:url";
import { assertComplete } from "./src/evidence.ts";
import { restoreTrustedCache } from "./src/cache.ts";

// This fixture-only experiment driver runs the selected framework. It is not a
// production runner or a replacement for target-native validation ownership.
const fixture = path.dirname(fileURLToPath(import.meta.url));
const outputIndex = process.argv.indexOf("--output");
assert(outputIndex >= 0 && process.argv[outputIndex + 1], "Pass --output <receipt.json>");
const output = path.resolve(process.argv[outputIndex + 1]);
assert(!output.startsWith(`${fixture}${path.sep}`), "Write evidence outside the fixture source");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "ac-testing-"));
const subject = path.join(temporary, "target");
const processes = new ProcessOwner();
const samples = [];
const faults = [];
const observations = [];
const sha = (text) => crypto.createHash("sha256").update(text).digest("hex");
const filesUnder = (root) =>
  fs
    .readdirSync(root, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      if (["node_modules", ".cache", "reports", "__pycache__"].includes(entry.name)) return [];
      const file = path.join(root, entry.name);
      return entry.isDirectory() ? filesUnder(file) : [file];
    });
const fingerprint = (root) =>
  sha(
    filesUnder(root)
      .map((file) => `${path.relative(root, file)}\0${sha(fs.readFileSync(file))}`)
      .join("\n"),
  );
const sourceDigest = fingerprint(fixture);
const started = new Date().toISOString();
const repository = path.resolve(fixture, "../../../..");
const providerRoot = path.join(repository, "skills/engineering-workflows/architecture-compass");
const provider = {
  name: "architecture-compass",
  version: fs
    .readFileSync(path.join(providerRoot, "SKILL.md"), "utf8")
    .match(/version: "([^"]+)"/)[1]
    .trim(),
  decisions: ["059", "060", "061", "062"].map((id) => {
    const file = fs
      .readdirSync(path.join(providerRoot, "references"))
      .find((name) => name.startsWith(`ac-adr-${id}-`) && name.endsWith(".long.md"));
    assert(file, `missing canonical provider ${id}`);
    return {
      id: `AC-ADR-${id}`,
      path: `skills/engineering-workflows/architecture-compass/references/${file}`,
      sha256: sha(fs.readFileSync(path.join(providerRoot, "references", file))),
    };
  }),
};
// These are the fixture's declared rule families, not a census of production rules.
const ruleInventory = [
  { id: "record-parser", file: "tests/contracts/domain.test.ts" },
  { id: "filesystem-discovery-and-selection", file: "tests/contracts/inputs.test.ts" },
  {
    id: "complete-partition-evidence",
    file: "tests/contracts/evidence.test.ts",
    prefix: "rejects ",
  },
  { id: "measurement-truth", file: "tests/contracts/evidence.test.ts", prefix: "measurements " },
  { id: "resource-isolation", file: "tests/contracts/isolation.test.ts" },
  { id: "process-tree-ownership", file: "tests/contracts/process-owner.test.ts" },
  { id: "cache-trust-admission", file: "tests/contracts/cache-admission.test.ts" },
];
const declaredNegativeRuns = [
  "input-add-rejection",
  "input-rename-rejection",
  "required-root-rejection",
  "native-bun-incompatibility",
  "real-failure-warm",
  "real-failure-off",
  "corrupt-cache-source-failure",
  "one-recovery-source-failure",
  "untrusted-restore-bypassed",
];
const inputInventory = ["inputs", "schemas"].flatMap((directory) =>
  filesUnder(path.join(fixture, directory)).map((file) => ({
    path: path.relative(fixture, file),
    sha256: sha(fs.readFileSync(file)),
  })),
);
const budget = {
  declaredBeforeSamples: started,
  owner: "synthetic qualification fixture",
  latencySeconds: 30,
  runnerSeconds: 90,
  sumProcessPeakRssKiB: 4 * 1024 * 1024,
  maximumRunnerRatio: 2,
  samplesPerCandidate: 5,
};
fs.cpSync(fixture, subject, {
  recursive: true,
  filter: (source) =>
    !source
      .split(path.sep)
      .some((part) => ["node_modules", ".cache", "reports", "__pycache__"].includes(part)),
});
fs.cpSync(path.join(fixture, "node_modules"), path.join(subject, "node_modules"), {
  recursive: true,
  verbatimSymlinks: true,
  filter: (source) => !source.split(path.sep).includes(".vite-temp"),
});
const vitest = path.join(subject, "node_modules/vitest/vitest.mjs");
const relative = (file) => path.relative(subject, file).split(path.sep).join("/");
let sequence = 0;
const sanitize = (value) =>
  String(value)
    .replaceAll(subject, "<fixture>")
    .replaceAll(fixture, "<fixture-source>")
    .replaceAll(temporary, "<temporary>");
async function command(executable, args, env = {}) {
  const begin = performance.now();
  return await new Promise((resolve, reject) => {
    const child = processes.spawn(executable, args, {
      cwd: subject,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "",
      stderr = "",
      timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      processes.stop(child).catch(reject);
    }, 120000);
    child.stdout.on("data", (data) => {
      stdout += data;
    });
    child.stderr.on("data", (data) => {
      stderr += data;
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", async (exit, signal) => {
      clearTimeout(timer);
      try {
        await processes.wait(child);
      } catch (error) {
        reject(error);
        return;
      }
      resolve({
        exit,
        signal,
        timedOut,
        seconds: (performance.now() - begin) / 1000,
        stdout,
        stderr,
      });
    });
  });
}
async function run(
  project,
  {
    runtime = "bun",
    cache = "off",
    shard,
    extra = [],
    env = {},
    label = project,
    expectExit = 0,
    blob = false,
  } = {},
) {
  const id = `${++sequence}-${label}`;
  const dir = path.join(temporary, id);
  fs.mkdirSync(dir);
  const report = path.join(dir, "native.json");
  const runtimeDir = path.join(dir, "runtime");
  const args = [
    ...(runtime === "bun" ? ["--bun"] : []),
    vitest,
    "run",
    "--project",
    project,
    ...(shard ? [`--shard=${shard}`] : []),
    "--reporter=json",
    `--outputFile.json=${report}`,
    ...(blob ? ["--reporter=blob", `--outputFile.blob=${path.join(dir, "blob.json")}`] : []),
    ...extra,
  ];
  const result = await command(runtime, args, {
    TEST_TRANSFORM_CACHE: cache,
    VITEST_FS_MODULE_CACHE_PATH: path.join(temporary, "cache"),
    QUALIFICATION_RUNTIME_DIR: runtimeDir,
    QUALIFICATION_NATIVE: "off",
    EXPECT_PLUGIN_VALUE: "7",
    ...env,
  });
  assert.equal(result.timedOut, false, `${id}: timed out`);
  if (expectExit === 0)
    assert.equal(result.exit, 0, `${id}: ${sanitize(result.stderr)} ${sanitize(result.stdout)}`);
  else assert.notEqual(result.exit, 0, `${id}: expected the injected failure`);
  const native = fs.existsSync(report) ? JSON.parse(fs.readFileSync(report, "utf8")) : null;
  if (expectExit === 0) assert.equal(native?.success, true, `${id}: no successful native report`);
  assert.equal(result.signal, null, `${id}: signal termination is not expected fault detection`);
  assert(native, `${id}: missing native report`);
  const nativeCases = native.testResults.flatMap((file) => file.assertionResults);
  const diagnostics =
    native.testResults
      .map(
        (file) =>
          file.message +
          "\n" +
          file.assertionResults.flatMap((test) => test.failureMessages ?? []).join("\n"),
      )
      .join("\n") + result.stderr;
  if (expectExit !== 0) {
    if (project === "fallback") {
      assert.match(
        result.stderr,
        /module\.registerHooks.*not supported/,
        `${id}: unrelated fallback failure`,
      );
      assert(
        nativeCases.some(
          (test) => test.fullName === "native-loader module mocking" && test.status === "pending",
        ),
      );
    } else {
      const name =
        project === "cache"
          ? "plugin-read input invalidates the transformed module"
          : "checks current repository inputs";
      const failed = nativeCases.filter((test) => test.status === "failed");
      if (label === "corrupt-cache-source-failure" && failed.length === 0) {
        assert(
          diagnostics.includes(path.join(temporary, "cache")),
          `${id}: failure not attributable to injected cache`,
        );
        assert.match(diagnostics, /SyntaxError|ParseError|Unexpected|corrupt/);
      } else {
        assert.equal(failed.length, 1, `${id}: unexpected failure set: ${sanitize(diagnostics)}`);
        assert.equal(failed[0].fullName, name, `${id}: unrelated failed case`);
        assert.match(
          failed[0].failureMessages.join("\n"),
          project === "cache"
            ? /expected 9 to be 7/
            : label === "required-root-rejection"
              ? /ENOENT/
              : /invalid Markdown input/,
        );
        assert(
          nativeCases
            .filter((test) => test.fullName !== name)
            .every((test) => test.status === "passed"),
          `${id}: unfinished independent cases`,
        );
      }
    }
  } else {
    assert(
      nativeCases.length > 0 && nativeCases.every((test) => test.status === "passed"),
      `${id}: missing or incomplete cases`,
    );
  }
  const identities = fs.existsSync(runtimeDir)
    ? fs
        .readdirSync(runtimeDir)
        .map((name) => JSON.parse(fs.readFileSync(path.join(runtimeDir, name), "utf8")))
    : [];
  const caseResults = (native?.testResults ?? []).flatMap((file) =>
    file.assertionResults.map((test) => ({
      id: `${relative(file.name)}::${test.fullName}`,
      status: test.status,
    })),
  );
  const row = {
    id,
    project,
    runtime,
    cache,
    shard: shard ?? "1/1",
    command: [runtime, ...args.map(sanitize)],
    exit: result.exit,
    seconds: result.seconds,
    files: (native?.testResults ?? []).map((file) => relative(file.name)).sort(),
    cases: caseResults,
    identities,
    sumProcessPeakRssKiB: identities.reduce((total, x) => total + (x.maxRssKiB ?? 0), 0),
    diagnostic: expectExit === 0 ? null : sanitize(diagnostics + result.stdout).slice(-8000),
  };
  samples.push(row);
  if (project === "cache")
    same(
      row.cases.map((c) => c.id),
      ["tests/cache/plugin.test.ts::plugin-read input invalidates the transformed module"],
    );
  return { row, native, dir };
}
async function listing(project, shard) {
  const destination = path.join(
    temporary,
    `list-${project}-${shard?.replace("/", "-") ?? "all"}.json`,
  );
  const result = await command("bun", [
    "--bun",
    vitest,
    "list",
    "--project",
    project,
    `--json=${destination}`,
    ...(shard ? [`--shard=${shard}`] : []),
  ]);
  assert.equal(result.exit, 0, sanitize(result.stderr));
  return JSON.parse(fs.readFileSync(destination, "utf8")).map((item) => ({
    file: relative(item.file),
    id: `${relative(item.file)}::${item.name}`,
  }));
}
const same = (a, b) => assert.deepEqual([...a].sort(), [...b].sort());
try {
  const typecheck = await command("pnpm", ["run", "typecheck"]);
  assert.equal(typecheck.exit, 0, typecheck.stdout + typecheck.stderr);
  observations.push({
    scenario: "fixture typecheck",
    status: "verified",
    seconds: typecheck.seconds,
  });
  // The default script exercises the published pnpm -> Bun -> Vitest command shape.
  const entrypoint = await command("pnpm", ["run", "test:run"]);
  assert.equal(entrypoint.exit, 0, entrypoint.stderr + entrypoint.stdout);
  observations.push({
    scenario: "default package entrypoint",
    status: "verified",
    seconds: entrypoint.seconds,
  });
  for (let i = 0; i < 5; i++)
    await run("contracts", { label: `small-${i}`, extra: ["--no-file-parallelism"] });
  const concurrent = await run("contracts", {
    label: "contracts-concurrent",
    extra: ["--maxWorkers=2"],
  });
  same(
    concurrent.row.cases.map((c) => `${c.id}:${c.status}`),
    samples.find((s) => s.id.endsWith("small-0")).cases.map((c) => `${c.id}:${c.status}`),
  );
  const observedConfigs = concurrent.row.identities.filter((x) => x.role === "configuration");
  assert(observedConfigs.length > 0, "resolved project settings were not observed");
  for (const config of observedConfigs) {
    assert.equal(config.pool, "forks");
    assert.equal(config.isolate, true);
    assert.equal(config.retry, 0);
    assert.equal(config.environment, "node");
    assert(config.setupFiles.includes("setup.ts"));
  }
  observations.push({
    scenario: "resolved child inheritance",
    status: "verified",
    configs: observedConfigs,
  });
  const changed = path.join(subject, "inputs/new.md"),
    renamed = path.join(subject, "inputs/renamed.md");
  fs.writeFileSync(changed, "invalid new Markdown");
  await run("contracts", { label: "input-add-rejection", expectExit: 1 });
  fs.renameSync(changed, renamed);
  await run("contracts", { label: "input-rename-rejection", expectExit: 1 });
  fs.unlinkSync(renamed);
  await run("contracts", { label: "input-delete-recovery" });
  fs.renameSync(path.join(subject, "inputs"), path.join(subject, "inputs-away"));
  await run("contracts", { label: "required-root-rejection", expectExit: 1 });
  fs.renameSync(path.join(subject, "inputs-away"), path.join(subject, "inputs"));
  const watchReport = path.join(temporary, "watch.json");
  const watchState = path.join(temporary, "watch-inputs.json");
  const watcher = processes.spawn(
    "bun",
    [
      "--bun",
      vitest,
      "--watch",
      "--project",
      "contracts",
      "--reporter=json",
      `--outputFile=${watchReport}`,
    ],
    {
      cwd: subject,
      env: { ...process.env, TEST_TRANSFORM_CACHE: "off", QUALIFICATION_WATCH_STATE: watchState },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let watchLog = "";
  watcher.stdout.on("data", (d) => {
    watchLog += d;
  });
  watcher.stderr.on("data", (d) => {
    watchLog += d;
  });
  const waitReport = async (after, expectedInputs) => {
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      if (fs.existsSync(watchReport) && fs.statSync(watchReport).mtimeMs > after) {
        try {
          assert.deepEqual(JSON.parse(fs.readFileSync(watchState, "utf8")), expectedInputs);
          return {
            data: JSON.parse(fs.readFileSync(watchReport, "utf8")),
            mtime: fs.statSync(watchReport).mtimeMs,
          };
        } catch {}
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(
      `watch did not report expected ${JSON.stringify(expectedInputs)}; observed ${fs.existsSync(watchState) ? fs.readFileSync(watchState, "utf8") : "missing input-state"}; ${sanitize(watchLog)}`,
    );
  };
  try {
    let prior = await waitReport(0, ["sample.md"]);
    const input = path.join(subject, "inputs/watch.md");
    for (const action of ["add", "rename", "delete"]) {
      if (action === "add") fs.writeFileSync(input, "# Watch addition\n");
      else if (action === "rename")
        fs.renameSync(input, path.join(subject, "inputs/watch-renamed.md"));
      else fs.unlinkSync(path.join(subject, "inputs/watch-renamed.md"));
      const next = await waitReport(
        prior.mtime,
        action === "delete"
          ? ["sample.md"]
          : ["sample.md", action === "add" ? "watch.md" : "watch-renamed.md"],
      );
      assert.equal(next.data.success, true);
      assert(next.data.testResults.some((f) => f.name.endsWith("/inputs.test.ts")));
      prior = next;
      observations.push({
        scenario: `native watch ${action}`,
        status: "verified",
        selectedFiles: next.data.testResults.map((f) => relative(f.name)),
      });
    }
  } finally {
    await processes.stop(watcher);
  }
  const product = await run("runtime");
  assert(product.row.identities.some((x) => x.role === "harness" && x.versions.bun));
  assert(product.row.identities.some((x) => x.role === "worker" && x.versions.bun));
  await run("fallback", { label: "bun-default-mocking" });
  const nativeBun = await run("fallback", {
    env: { QUALIFICATION_NATIVE: "on" },
    label: "native-bun-incompatibility",
    expectExit: 1,
  });
  faults.push({
    scenario: "optional native-loader Bun incompatibility",
    detected: nativeBun.row.exit !== 0,
    diagnostic: nativeBun.row.diagnostic,
  });
  await run("fallback", {
    runtime: "node",
    env: { QUALIFICATION_NATIVE: "on" },
    label: "native-node-fallback",
  });
  const native = await command("python3", [
    "-B",
    "-m",
    "unittest",
    "discover",
    "-s",
    "native",
    "-v",
  ]);
  assert.equal(native.exit, 0, native.stderr);
  observations.push({
    scenario: "native Python unittest",
    status: "verified",
    seconds: native.seconds,
    diagnostic: sanitize(native.stderr),
  });

  const domains = [
    "manifest",
    "exports",
    "routes",
    "schemas",
    "commands",
    "releases",
    "documents",
    "dependencies",
  ];
  const expected = ["api", "web", "tools"].flatMap((pkg) =>
    domains.flatMap((domain) =>
      Array.from(
        { length: 64 },
        (_, i) => `packages/${pkg}/tests/${domain}.test.ts::${pkg}/${domain} record ${i}`,
      ),
    ),
  );
  const collected = await listing("monorepo");
  same(
    collected.map((c) => c.id),
    expected,
  );
  const identity = {
    subject: sourceDigest,
    config: sha(fs.readFileSync(path.join(subject, "vitest.config.ts"))),
    lock: sha(fs.readFileSync(path.join(subject, "pnpm-lock.yaml"))),
    runtime: `bun-${process.versions.bun}`,
    platform: `${process.platform}-${process.arch}`,
    project: "monorepo",
    inputs: sha(expected.join("\n")),
    run: process.env.GITHUB_RUN_ID ?? started,
    attempt: Number(process.env.GITHUB_RUN_ATTEMPT ?? 1),
  };
  const experiments = [];
  for (const count of [1, 2, 4]) {
    const partitions = [];
    for (let shard = 1; shard <= count; shard++) {
      const items = await listing("monorepo", `${shard}/${count}`);
      partitions.push({
        shard,
        files: [...new Set(items.map((i) => i.file))],
        cases: items.map((i) => i.id),
      });
    }
    same(
      partitions.flatMap((p) => p.cases),
      expected,
    );
    for (let repeat = 0; repeat < 5; repeat++) {
      const begin = performance.now();
      const settled = await Promise.allSettled(
        partitions.map((p) =>
          run("monorepo", {
            shard: `${p.shard}/${count}`,
            label: `monorepo-${count}-${repeat}-${p.shard}`,
            blob: true,
          }),
        ),
      );
      const rejectedShard = settled.find((result) => result.status === "rejected");
      if (rejectedShard) throw rejectedShard.reason;
      const results = settled.map((result) => result.value);
      const reports = results.map((r, i) => ({
        ...partitions[i],
        files: r.row.files,
        cases: r.row.cases.map((c) => c.id),
        outcomes: r.row.cases,
        identity,
        job: r.row.exit === 0 ? "success" : "failure",
        exit: r.row.exit,
      }));
      assertComplete({ identity, partitions }, reports);
      const blobs = path.join(temporary, `blobs-${count}-${repeat}`);
      fs.mkdirSync(blobs);
      for (let i = 0; i < results.length; i++)
        fs.copyFileSync(
          path.join(results[i].dir, "blob.json"),
          path.join(blobs, `shard-${i + 1}.json`),
        );
      const merged = path.join(temporary, `merged-${count}-${repeat}.json`);
      const merge = await command("bun", [
        "--bun",
        vitest,
        "run",
        "--project",
        "monorepo",
        `--merge-reports=${blobs}`,
        "--reporter=json",
        "--reporter=default",
        "--reporter=junit",
        `--outputFile.json=${merged}`,
        `--outputFile.junit=${merged}.xml`,
      ]);
      assert.equal(merge.exit, 0, sanitize(merge.stderr));
      const mergedNative = JSON.parse(fs.readFileSync(merged, "utf8"));
      assert.equal(mergedNative.success, true);
      assert.equal(mergedNative.numPassedTests, expected.length);
      assert(fs.readFileSync(`${merged}.xml`, "utf8").includes("<testsuites"));
      experiments.push({
        shards: count,
        repeat,
        criticalPathSeconds: (performance.now() - begin) / 1000,
        runnerSeconds: results.reduce((total, r) => total + r.row.seconds, 0) + merge.seconds,
        mergeSeconds: merge.seconds,
        sumProcessPeakRssKiB: results.reduce((total, r) => total + r.row.sumProcessPeakRssKiB, 0),
        cases: expected.length,
      });
    }
  }
  // Cache parity uses one namespace; each mutation must be seen without a remote cache key.
  const cacheSamples = [];
  const expectedCache = [
    {
      id: "tests/cache/plugin.test.ts::plugin-read input invalidates the transformed module",
      status: "passed",
    },
  ];
  for (const state of ["off", "cleared", "warm"])
    for (let repeat = 0; repeat < 5; repeat++) {
      if (state === "cleared")
        fs.rmSync(path.join(temporary, "cache"), { recursive: true, force: true });
      const r = await run("cache", {
        cache: state === "off" ? "off" : "on",
        label: `cache-${state}-${repeat}`,
      });
      same(r.row.files, ["tests/cache/plugin.test.ts"]);
      assert.deepEqual(r.row.cases, expectedCache);
      if (cacheSamples.length) assert.deepEqual(r.row.cases, cacheSamples[0].cases);
      cacheSamples.push({ state, repeat, seconds: r.row.seconds, cases: r.row.cases });
    }
  assert(fs.existsSync(path.join(temporary, "cache")), "experimental cache was not populated");
  fs.writeFileSync(path.join(subject, "plugin-input.json"), '{"value":9}\n');
  await run("cache", { cache: "on", env: { EXPECT_PLUGIN_VALUE: "9" }, label: "plugin-mutation" });
  await run("cache", {
    cache: "off",
    env: { EXPECT_PLUGIN_VALUE: "9" },
    label: "plugin-mutation-off",
  });
  // Stale expected source assertion must fail, with or without cache.
  await run("cache", { cache: "on", label: "real-failure-warm", expectExit: 1 });
  await run("cache", { cache: "off", label: "real-failure-off", expectExit: 1 });
  const cacheFiles = filesUnder(path.join(temporary, "cache"));
  assert(cacheFiles.length > 0);
  for (const file of cacheFiles) fs.writeFileSync(file, "corrupt cache entry\n");
  const corrupt = await run("cache", {
    cache: "on",
    label: "corrupt-cache-source-failure",
    expectExit: 1,
  });
  // Bounded, visible recovery: discard only this owned cache and retry exactly once with it off.
  fs.rmSync(path.join(temporary, "cache"), { recursive: true, force: true });
  const recovered = await run("cache", {
    cache: "off",
    label: "one-recovery-source-failure",
    expectExit: 1,
  });
  faults.push({
    scenario: "corrupt cache cannot suppress real source failure",
    detected: corrupt.row.exit !== 0 && recovered.row.exit !== 0,
    retries: 1,
  });
  let consumed = false;
  const admitted = restoreTrustedCache(
    { trust: "untrusted-pr", inputs: "same-inputs" },
    { trust: "privileged-release", inputs: "same-inputs" },
    () => {
      consumed = true;
    },
  );
  assert.equal(admitted, false);
  assert.equal(consumed, false);
  // Trust admission rejects before copying/restoring any transformed code; fresh execution still fails.
  const rejected = await run("cache", {
    cache: "off",
    label: "untrusted-restore-bypassed",
    expectExit: 1,
  });
  faults.push({
    scenario: "untrusted cache bypass before consumption",
    detected: rejected.row.exit !== 0,
    restored: false,
  });
  const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const summaries = [1, 2, 4].map((shards) => {
    const rows = experiments.filter((r) => r.shards === shards);
    return {
      shards,
      medianSeconds: median(rows.map((r) => r.criticalPathSeconds)),
      rangeSeconds: [
        Math.min(...rows.map((r) => r.criticalPathSeconds)),
        Math.max(...rows.map((r) => r.criticalPathSeconds)),
      ],
      medianRunnerSeconds: median(rows.map((r) => r.runnerSeconds)),
      maximumSumProcessPeakRssKiB: Math.max(...rows.map((r) => r.sumProcessPeakRssKiB)),
    };
  });
  const eligible = summaries.filter(
    (s) =>
      s.medianSeconds <= budget.latencySeconds &&
      s.medianRunnerSeconds <= budget.runnerSeconds &&
      s.medianRunnerSeconds <= summaries[0].medianRunnerSeconds * budget.maximumRunnerRatio &&
      s.maximumSumProcessPeakRssKiB <= budget.sumProcessPeakRssKiB,
  );
  const selected = eligible.length
    ? {
        ...[...eligible].sort((a, b) => a.medianSeconds - b.medianSeconds)[0],
        measurementState: "met",
        scope: "local experiment only",
      }
    : {
        shards: 1,
        measurementState: "unmet",
        scope: "retain unsharded execution; no optimization rollout",
        reason:
          "No candidate met all provisional fixture budgets; preserve the evidence instead of weakening the budget.",
      };
  const cacheSummary = ["off", "cleared", "warm"].map((state) => ({
    state,
    medianSeconds: median(cacheSamples.filter((s) => s.state === state).map((s) => s.seconds)),
  }));
  await processes.close();
  assert.equal(processes.active.size, 0, "qualification retained owned processes");
  assert.equal(fingerprint(fixture), sourceDigest, "qualification mutated source fixture");
  const smallBaseline = samples.find((sample) => sample.id.endsWith("small-0"));
  const mappedRules = ruleInventory.filter((rule) =>
    smallBaseline.cases.some(
      (test) =>
        test.id.startsWith(`${rule.file}::${rule.prefix ?? ""}`) && test.status === "passed",
    ),
  ).length;
  assert.equal(mappedRules, ruleInventory.length, "unowned declared fixture rule");
  const detectedNegatives = declaredNegativeRuns.filter((label) =>
    samples.some((sample) => sample.id.endsWith(`-${label}`) && sample.exit !== 0),
  ).length;
  assert.equal(detectedNegatives, declaredNegativeRuns.length, "missing declared negative run");
  const metric = (name, definition, unit, denominator, target, observed, state = "met") => ({
    name,
    definition,
    unit,
    denominator,
    target,
    observed,
    measurementState: state,
  });
  const receipt = {
    schema: 1,
    kind: "synthetic-target-qualification",
    observedAt: new Date().toISOString(),
    stage: process.env.GITHUB_ACTIONS === "true" ? "CI" : "local",
    subject: sourceDigest,
    framework: "Vitest 4.1.11",
    provider,
    identity,
    ruleInventory,
    ruleInventoryDigest: sha(JSON.stringify(ruleInventory)),
    inputInventory,
    declaredNegativeRuns,
    adoption: {
      scope: "synthetic fixture declarations only; no repository or production adoption",
      declaration:
        "skill-evals/architecture-compass/fixtures/measurable-testing/README.md#targets-and-local-adoption-records",
      mappings: [
        {
          localId: "TST-001",
          providerId: "AC-ADR-059",
          disposition: "adapt",
          status: "fixture declaration",
        },
        {
          localId: "TST-002",
          providerId: "AC-ADR-060",
          disposition: "adapt",
          status: "fixture declaration",
        },
        {
          localId: "TST-003",
          providerId: "AC-ADR-061",
          disposition: "adapt",
          status: "fixture declaration",
        },
        {
          localId: "TST-004",
          providerId: "AC-ADR-062",
          disposition: "adapt",
          status: "fixture declaration",
        },
        {
          localId: "PY-001",
          providerId: "AC-ADR-059",
          disposition: "adapt",
          status: "fixture declaration",
        },
      ],
      owner: budget.owner,
      intent:
        "Qualify discoverable validation, effect/runtime boundaries, complete partitions and safe transform reuse without weakening correctness or claiming production performance.",
      enforcement:
        "correctness assertions block qualification; optimization measurements are report-only",
      rollout: "no hosted sharding or persistent remote cache enabled",
      revisit:
        "Requalify after source/config/lock/runtime/input changes; measure hosted allocation before any rollout.",
      exceptions: [],
    },
    baseline: {
      subject: sourceDigest,
      smallSample: smallBaseline.id,
      monorepo: { shards: 1, repeats: 5, cache: "off", cases: expected.length },
      cache: { state: "off", repeats: 5 },
      rawEvidence: "samples, cacheSamples and experiments in this receipt",
      command:
        "pnpm --dir skill-evals/architecture-compass/fixtures/measurable-testing run qualify --output <receipt.json>",
    },
    metrics: [
      metric(
        "rule_mapping_coverage",
        "mapped declared rule families / all declared rule families",
        "ratio",
        ruleInventory.length,
        1,
        mappedRules / ruleInventory.length,
      ),
      metric(
        "negative_scenario_detection",
        "expected rejections observed / declared driver negative runs; each run also verifies owning diagnostic",
        "ratio",
        declaredNegativeRuns.length,
        1,
        detectedNegatives / declaredNegativeRuns.length,
      ),
      metric(
        "unexpected_repository_mutations",
        "fixture source fingerprint differences before/after qualification",
        "count",
        1,
        0,
        0,
      ),
      metric(
        "shard_inventory_errors",
        "failed completeness or overlap assertions across measured native merges",
        "count",
        experiments.length,
        0,
        0,
      ),
      metric(
        "cache_parity_mismatches",
        "enabled/disabled/cleared positive baseline inventory and outcome mismatches",
        "count",
        cacheSamples.length,
        0,
        0,
      ),
      metric(
        "hosted_runner_allocation",
        "hosted billed allocation including setup, install and artifact overhead",
        "seconds",
        null,
        null,
        null,
        "unmeasured",
      ),
      metric(
        "persistent_cache_net_savings",
        "savings after remote restore/save/transfer/storage overhead",
        "seconds",
        null,
        null,
        null,
        "unmeasured",
      ),
      metric(
        "os_egress_enforcement",
        "OS and subprocess network events outside instrumented boundary",
        "count",
        null,
        0,
        null,
        "unmeasured",
      ),
    ],
    execution: { status: "verified", ownedProcessesRemaining: 0, sourceUnchanged: true },
    environment: {
      platform: process.platform,
      arch: process.arch,
      osRelease: os.release(),
      cpu: os.cpus()[0]?.model,
      logicalCpus: os.availableParallelism(),
      harness: process.versions,
    },
    budget,
    observations,
    experiments,
    summaries,
    selected,
    cacheSummary,
    cacheSamples,
    faults,
    samples,
    limits: [
      "Synthetic small and three-package TS targets; not production workload performance.",
      "Critical path includes process launch, tests, reports and native merge. Dependency installation and hosted scheduling are outside these samples and are not claimed as measured CI economics.",
      "Runner seconds here sum local process allocation plus merge; hosted billed allocation remains unmeasured.",
      "Memory is a conservative sum of process peak RSS, not a measured simultaneous peak.",
      "Instrumented network denial is observed; OS/subprocess egress enforcement is unobservable.",
      "No external service, deployment, publication or agent-behavior success is inferred.",
    ],
  };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(receipt, null, 2) + "\n");
  console.log(
    JSON.stringify({
      output,
      subject: sourceDigest,
      samples: samples.length,
      selected,
      cacheSummary,
      faults: faults.length,
    }),
  );
} finally {
  await processes.close();
  fs.rmSync(temporary, { recursive: true, force: true });
}
