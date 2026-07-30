import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const root = process.cwd();
const errors = [];
const workflows = [
  "plan-run-cleanup-file",
  "review-chat",
  "review-file",
  "cleanup-chat",
  "cleanup-file",
  "plan-cleanup-chat",
  "plan-cleanup-file",
  "plan-run-cleanup-chat",
];

const curators = [
  {
    name: "claude-memory-curator",
    runtime: "claude",
    dir: path.join("skills", "claude-operations", "claude-memory-curator"),
    backup: "backup-claude-memory.mjs",
    backupArgs(
      fixture,
      include,
      { backupRoot = fixture.backupRoot, backupRootAlias = fixture.backupRootAlias } = {},
    ) {
      return [
        "--repo",
        fixture.repo,
        "--claude-home",
        fixture.runtimeHome,
        ...(backupRoot
          ? ["--backup-root", backupRoot, "--backup-root-alias", backupRootAlias]
          : []),
        ...include,
      ];
    },
  },
  {
    name: "codex-memory-curator",
    runtime: "codex",
    dir: path.join("skills", "codex-operations", "codex-memory-curator"),
    backup: "backup-memories.mjs",
    openAi: true,
    backupArgs(
      fixture,
      include,
      { backupRoot = fixture.backupRoot, backupRootAlias = fixture.backupRootAlias } = {},
    ) {
      return [
        "--repo",
        fixture.repo,
        "--codex-home",
        fixture.runtimeHome,
        ...(backupRoot
          ? ["--backup-root", backupRoot, "--backup-root-alias", backupRootAlias]
          : []),
        ...include,
      ];
    },
  },
  {
    name: "cursor-memory-curator",
    runtime: "cursor",
    dir: path.join("skills", "cursor-operations", "cursor-memory-curator"),
    backup: "backup-cursor-context.mjs",
    openAi: true,
    backupArgs(
      fixture,
      include,
      { backupRoot = fixture.backupRoot, backupRootAlias = fixture.backupRootAlias } = {},
    ) {
      return [
        "--repo",
        fixture.repo,
        ...(backupRoot
          ? ["--backup-root", backupRoot, "--backup-root-alias", backupRootAlias]
          : []),
        ...include,
      ];
    },
  },
];

function fail(message) {
  errors.push(message);
}

function read(relative) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    fail(`${relative}: missing required file`);
    return "";
  }
  return fs.readFileSync(file, "utf8");
}

function section(text, heading) {
  const lines = text.split(/\r?\n/);
  const start = lines.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const result = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) break;
    result.push(line);
  }
  return result.join("\n").trim();
}

function filesBelow(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...filesBelow(full));
    if (entry.isFile()) files.push(full);
  }
  return files;
}

function snapshotTree(directory) {
  if (!fs.existsSync(directory)) return [];
  const entries = [];

  function visit(current) {
    for (const entry of fs
      .readdirSync(current, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const full = path.join(current, entry.name);
      const relative = path.relative(directory, full).split(path.sep).join("/");
      if (entry.isDirectory()) {
        entries.push(`directory:${relative}`);
        visit(full);
      } else if (entry.isFile()) {
        const stat = fs.statSync(full);
        entries.push(`file:${relative}:${stat.size}:${sha256(full)}`);
      } else if (entry.isSymbolicLink()) {
        entries.push(`symlink:${relative}:${fs.readlinkSync(full)}`);
      } else {
        entries.push(`other:${relative}`);
      }
    }
  }

  visit(directory);
  return entries;
}

function isWithin(directory, candidate) {
  const relative = path.relative(directory, candidate);
  return (
    relative === "" ||
    (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`))
  );
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function treeContainsHash(directory, expectedHash) {
  return filesBelow(directory).some((file) => {
    try {
      return fs.lstatSync(file).isFile() && sha256(file) === expectedHash;
    } catch {
      return false;
    }
  });
}

function makeFixture(temp, curator, name) {
  const fixture = {
    backupRoot: path.join(temp, name, "safe-backups"),
    backupRootAlias: `${curator.runtime}-${name}`,
    repo: path.join(temp, name, "repo"),
    runtimeHome: path.join(temp, name, `${curator.runtime}-home`),
  };
  fs.mkdirSync(fixture.repo, { recursive: true });
  fs.mkdirSync(fixture.runtimeHome, { recursive: true });
  return fixture;
}

function writeFixture(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
  return path.resolve(file);
}

function makeFifo(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const result = spawnSync("sh", ["-c", 'mkfifo "$1"', "memory-curator-mkfifo", file], {
    encoding: "utf8",
    timeout: 2_000,
  });
  if (result.status !== 0) {
    throw new Error(
      `could not create POSIX FIFO ${file}: ${result.error?.message ?? result.stderr.trim()}`,
    );
  }
  return path.resolve(file);
}

function createLegacySources(curator, fixture) {
  if (curator.runtime === "codex") {
    return [
      writeFixture(
        path.join(fixture.runtimeHome, "memories", "MEMORY.md"),
        "# Legacy Codex memory\n",
      ),
    ];
  }
  if (curator.runtime === "claude") {
    return [
      writeFixture(path.join(fixture.repo, "CLAUDE.md"), "# Project Claude context\n"),
      writeFixture(path.join(fixture.runtimeHome, "CLAUDE.md"), "# User Claude context\n"),
    ];
  }
  return [
    writeFixture(path.join(fixture.repo, ".cursor", "rules", "project.mdc"), "---\n---\n"),
    writeFixture(path.join(fixture.repo, "AGENTS.md"), "# Project agents\n"),
  ];
}

function backupRoots(curator, fixture) {
  const parent = fixture.backupRoot;
  const prefix =
    curator.runtime === "codex" ? "memories.backup." : `.${curator.runtime}-context.backup.`;
  if (!fs.existsSync(parent)) return [];
  return fs
    .readdirSync(parent, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
    .map((entry) => path.join(parent, entry.name))
    .sort();
}

function runBackup(script, args, environment = {}, options = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: options.cwd,
    encoding: "utf8",
    env: { ...process.env, ...environment },
    timeout: options.timeoutMs,
  });
}

function runBackupConcurrently(script, args, environment = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], {
      env: { ...process.env, ...environment },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      resolve({ status: null, stdout, stderr: `${stderr}${error.message}` });
    });
    child.on("close", (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

function runBackupAtCheckpoint(script, args, checkpoint, mutate, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: options.cwd,
      env: {
        ...process.env,
        ...options.environment,
        AGENT_MEMORY_CURATOR_TEST_CHECKPOINT: checkpoint,
        NODE_ENV: "test",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let checkpointReached = false;
    let mutationError = null;
    const marker = `TEST_CHECKPOINT:${checkpoint}\n`;
    const timeout = setTimeout(() => {
      mutationError ??= new Error(`checkpoint timed out: ${checkpoint}`);
      child.kill("SIGKILL");
    }, options.timeoutMs ?? 10_000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      if (checkpointReached || !stderr.includes(marker)) return;
      checkpointReached = true;
      try {
        mutate();
      } catch (error) {
        mutationError = error;
      }
      child.stdin.write("c");
      child.stdin.end();
    });
    child.on("error", (error) => {
      mutationError ??= error;
    });
    child.on("close", (status) => {
      clearTimeout(timeout);
      resolve({ checkpointReached, mutationError, status, stderr, stdout });
    });
  });
}

function runBackupWithLowNoFile(script, args, limit = 32) {
  return spawnSync(
    "sh",
    [
      "-c",
      'ulimit -n "$1" || exit 125; shift; exec "$@"',
      "memory-curator-low-nofile",
      String(limit),
      process.execPath,
      script,
      ...args,
    ],
    { encoding: "utf8", env: process.env },
  );
}

function validateManifest(curator, result, expectedMode, expectedSources) {
  const scriptLabel = path.join(curator.dir, "scripts", curator.backup);
  if (result.status !== 0) {
    fail(
      `${scriptLabel}: ${expectedMode} backup failed: ${result.stderr.trim() || result.stdout.trim()}`,
    );
    return null;
  }

  const backupDir = result.stdout.match(/^Backup created at (.+)$/m)?.[1];
  const backupId = result.stdout.match(/^Backup ID: (.+)$/m)?.[1];
  const backupRoot = result.stdout.match(/^Backup storage root: (.+)$/m)?.[1];
  const storageLocator = result.stdout.match(/^Backup storage locator: (.+)$/m)?.[1];
  const manifestPath = result.stdout.match(/^Manifest: (.+)$/m)?.[1];
  if (
    !backupDir ||
    !backupId ||
    !backupRoot ||
    !storageLocator ||
    !manifestPath ||
    backupId !== path.basename(backupDir) ||
    path.dirname(backupDir) !== backupRoot ||
    manifestPath !== path.join(backupDir, "backup-manifest.json")
  ) {
    fail(`${scriptLabel}: output must report the storage root, atomic backup root, and manifest`);
    return null;
  }
  if (!result.stdout.includes("Backup storage policy: outside-git-worktree")) {
    fail(`${scriptLabel}: output must identify the outside-git-worktree storage policy`);
  }
  if (
    path.isAbsolute(storageLocator) ||
    storageLocator.includes("\\") ||
    storageLocator.split("/").includes("..") ||
    !storageLocator.endsWith(`/${backupId}`) ||
    (!storageLocator.startsWith("user-state/") && !storageLocator.startsWith("external-root/"))
  ) {
    fail(`${scriptLabel}: backup storage locator must be portable, relative, and resolvable`);
  }
  if (
    !fs.existsSync(backupDir) ||
    !fs.statSync(backupDir).isDirectory() ||
    !fs.existsSync(manifestPath) ||
    !isWithin(backupDir, manifestPath)
  ) {
    fail(`${scriptLabel}: reported manifest must be inside the atomically created backup root`);
    return null;
  }

  let manifest;
  try {
    const raw = fs.readFileSync(manifestPath, "utf8");
    manifest = JSON.parse(raw);
    if (raw !== `${JSON.stringify(manifest, null, 2)}\n`) {
      fail(`${scriptLabel}: manifest serialization must be deterministic`);
    }
  } catch (error) {
    fail(`${scriptLabel}: manifest is not valid JSON: ${error.message}`);
    return null;
  }

  const expected = [...new Set(expectedSources.map((file) => path.resolve(file)))].sort();
  if (
    !result.stdout.includes(`Backup mode: ${expectedMode}`) ||
    !result.stdout.includes(`Files backed up: ${expected.length}`) ||
    !result.stdout.includes(
      `Exact includes backed up: ${expectedMode === "exact" ? expected.length : 0}`,
    )
  ) {
    fail(`${scriptLabel}: stdout counts must derive from the manifest selection`);
  }
  if (
    manifest.schemaVersion !== 1 ||
    manifest.mode !== expectedMode ||
    manifest.storagePolicy !== "outside-git-worktree" ||
    manifest.backupId !== backupId ||
    manifest.storageLocator !== storageLocator ||
    manifest.fileCount !== expected.length ||
    !Array.isArray(manifest.files) ||
    manifest.files.length !== expected.length
  ) {
    fail(`${scriptLabel}: manifest metadata does not reconcile with ${expectedMode} sources`);
    return null;
  }

  const sources = manifest.files.map((entry) => entry.source);
  if (sources.join("\n") !== expected.join("\n")) {
    fail(`${scriptLabel}: ${expectedMode} manifest sources differ from the selected source set`);
  }
  if (new Set(sources).size !== sources.length) {
    fail(`${scriptLabel}: manifest source paths must be unique`);
  }

  const destinations = new Set();
  for (const entry of manifest.files) {
    if (
      typeof entry.destination !== "string" ||
      path.isAbsolute(entry.destination) ||
      !entry.destination.startsWith("files/")
    ) {
      fail(`${scriptLabel}: manifest destination must be a relative path below files/`);
      continue;
    }
    const destination = path.join(backupDir, entry.destination);
    if (!isWithin(backupDir, destination)) {
      fail(`${scriptLabel}: manifest destination escapes the backup root: ${entry.destination}`);
      continue;
    }
    if (destinations.has(entry.destination)) {
      fail(`${scriptLabel}: manifest destination collision: ${entry.destination}`);
    }
    destinations.add(entry.destination);

    if (!fs.existsSync(destination) || !fs.statSync(destination).isFile()) {
      fail(`${scriptLabel}: manifest destination is not a copied file: ${entry.destination}`);
      continue;
    }
    const sourceSize = fs.statSync(entry.source).size;
    const destinationSize = fs.statSync(destination).size;
    const sourceHash = sha256(entry.source);
    const destinationHash = sha256(destination);
    if (
      entry.size !== sourceSize ||
      entry.size !== destinationSize ||
      entry.sha256 !== sourceHash ||
      entry.sha256 !== destinationHash
    ) {
      fail(`${scriptLabel}: manifest size/hash does not reconcile for ${entry.source}`);
    }
  }

  const copiedFiles = filesBelow(backupDir)
    .filter((file) => file !== manifestPath)
    .map((file) => path.relative(backupDir, file).split(path.sep).join("/"))
    .sort();
  const manifestedFiles = manifest.files.map((entry) => entry.destination).sort();
  if (copiedFiles.join("\n") !== manifestedFiles.join("\n")) {
    fail(`${scriptLabel}: copied payload must reconcile exactly with manifest destinations`);
  }

  return { backupDir, backupId, backupRoot, manifest, storageLocator };
}

async function runBackupContract(curator) {
  const script = path.join(root, curator.dir, "scripts", curator.backup);
  const scriptRelative = path.relative(root, script);
  const scriptSource = fs.readFileSync(script, "utf8");
  const help = runBackup(script, ["--help"]);
  if (
    help.status !== 0 ||
    !help.stdout.includes("--include PATH") ||
    !help.stdout.includes("--backup-root PATH") ||
    !help.stdout.includes("--backup-root-alias NAME") ||
    !help.stdout.includes("only the deduplicated explicit") ||
    !help.stdout.includes("With no --include, legacy mode discovers") ||
    !help.stdout.includes("symlinks, and symlinked parents are rejected") ||
    !help.stdout.includes("traversal errors") ||
    (curator.runtime === "claude" &&
      (!help.stdout.includes("Invalid settings JSON") ||
        !help.stdout.includes("not a non-empty string"))) ||
    !help.stdout.includes("backup-manifest.json") ||
    !help.stdout.includes("outside") ||
    !help.stdout.includes("Git worktree")
  ) {
    fail(`${scriptRelative}: captured --help must document exact-only and legacy discovery modes`);
    return;
  }
  for (const marker of [
    "fs.mkdtempSync",
    "fs.constants.O_EXCL",
    "fs.constants.O_NONBLOCK",
    "fs.fstatSync",
    "process.chdir",
    "capturePathSnapshot",
    "destination collision",
    "sha256",
    "inspectPath",
    "legacy discovery could not read directory",
    "XDG_STATE_HOME",
    "backup root must be outside Git worktrees",
    "storageLocator",
    "portable recovery",
  ]) {
    if (!scriptSource.includes(marker)) {
      fail(`${scriptRelative}: missing no-clobber backup marker ${JSON.stringify(marker)}`);
    }
  }
  if (
    curator.runtime === "codex" &&
    (!help.stdout.includes("root equal to or inside the resolved Codex memories tree") ||
      !scriptSource.includes("backup root must be outside the resolved Codex memories tree"))
  ) {
    fail(
      `${scriptRelative}: Codex backup contract must reject physical backup-root containment in the memories tree`,
    );
  }

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), `${curator.runtime}-curator-backup-`));
  try {
    const exactFixture = makeFixture(temp, curator, "exact");
    const legacySentinels = createLegacySources(curator, exactFixture);
    const exact = writeFixture(
      path.join(exactFixture.repo, "exact-a", "context.txt"),
      `exact-a-${curator.runtime}\n`,
    );
    const secondExactSource = writeFixture(
      path.join(exactFixture.repo, "exact-b", "context.txt"),
      `exact-b-${curator.runtime}\n`,
    );
    const explicitDiscoveryRoot = path.join(temp, "exact", "explicit-discovery");
    if (curator.runtime !== "codex") {
      legacySentinels.push(
        writeFixture(path.join(explicitDiscoveryRoot, "context.md"), "# Explicit discovery\n"),
      );
    }
    const exactArgs = (include) => {
      const args = curator.backupArgs(exactFixture, include);
      if (curator.runtime === "claude") args.push("--memory-dir", explicitDiscoveryRoot);
      if (curator.runtime === "cursor") args.push("--memory-bank", explicitDiscoveryRoot);
      return args;
    };

    if (process.platform !== "win32") {
      const staticFifoFixture = makeFixture(temp, curator, "static-fifo-source");
      const staticFifoSource = makeFifo(
        path.join(staticFifoFixture.repo, "selected-static-fifo.md"),
      );
      const staticFifoResult = runBackup(
        script,
        curator.backupArgs(staticFifoFixture, ["--include", staticFifoSource]),
        {},
        { timeoutMs: 2_000 },
      );
      if (
        !Number.isInteger(staticFifoResult.status) ||
        staticFifoResult.signal !== null ||
        staticFifoResult.status === 0 ||
        filesBelow(staticFifoFixture.backupRoot).length !== 0
      ) {
        fail(`${scriptRelative}: static FIFO source must fail promptly before backup mutation`);
      }

      const fifoSwapFixture = makeFixture(temp, curator, "regular-to-fifo-source");
      const fifoSwapSource = writeFixture(
        path.join(fifoSwapFixture.repo, "selected.md"),
        `trusted-before-fifo-swap-${curator.runtime}\n`,
      );
      const fifoSwapResult = await runBackupAtCheckpoint(
        script,
        curator.backupArgs(fifoSwapFixture, ["--include", fifoSwapSource]),
        "after-source-plan",
        () => {
          fs.renameSync(fifoSwapSource, `${fifoSwapSource}.original`);
          makeFifo(fifoSwapSource);
        },
        { timeoutMs: 2_000 },
      );
      if (
        !fifoSwapResult.checkpointReached ||
        fifoSwapResult.mutationError ||
        fifoSwapResult.status === 0 ||
        !fifoSwapResult.stderr.includes("source") ||
        filesBelow(fifoSwapFixture.backupRoot).length !== 0
      ) {
        fail(`${scriptRelative}: regular-to-FIFO source swap must fail promptly before mutation`);
      }
    }

    const sourceLeafRaceFixture = makeFixture(temp, curator, "source-leaf-race");
    const sourceLeafRace = writeFixture(
      path.join(sourceLeafRaceFixture.repo, "selected.md"),
      `trusted-source-${curator.runtime}\n`,
    );
    const sourceLeafAttacker = writeFixture(
      path.join(temp, "source-leaf-race", "attacker.md"),
      `attacker-source-${curator.runtime}\n`,
    );
    const sourceLeafRaceResult = await runBackupAtCheckpoint(
      script,
      curator.backupArgs(sourceLeafRaceFixture, ["--include", sourceLeafRace]),
      "after-source-plan",
      () => {
        fs.renameSync(sourceLeafRace, `${sourceLeafRace}.original`);
        fs.symlinkSync(sourceLeafAttacker, sourceLeafRace);
      },
    );
    if (
      !sourceLeafRaceResult.checkpointReached ||
      sourceLeafRaceResult.mutationError ||
      sourceLeafRaceResult.status === 0 ||
      !sourceLeafRaceResult.stderr.includes("source")
    ) {
      fail(`${scriptRelative}: source leaf replacement after descriptor snapshot must fail closed`);
    }
    if (filesBelow(sourceLeafRaceFixture.backupRoot).length !== 0) {
      fail(`${scriptRelative}: source leaf race must not write backup payload or manifest bytes`);
    }

    const sourceParentRaceFixture = makeFixture(temp, curator, "source-parent-race");
    const sourceParent = path.join(sourceParentRaceFixture.repo, "selected-parent");
    const sourceParentRace = writeFixture(
      path.join(sourceParent, "selected.md"),
      `trusted-parent-source-${curator.runtime}\n`,
    );
    const displacedSourceParent = `${sourceParent}.original`;
    const attackerSourceParent = path.join(temp, "source-parent-race-attacker", curator.runtime);
    writeFixture(
      path.join(attackerSourceParent, "selected.md"),
      `attacker-parent-source-${curator.runtime}\n`,
    );
    const sourceParentRaceResult = await runBackupAtCheckpoint(
      script,
      curator.backupArgs(sourceParentRaceFixture, ["--include", sourceParentRace]),
      "after-source-plan",
      () => {
        fs.renameSync(sourceParent, displacedSourceParent);
        fs.symlinkSync(attackerSourceParent, sourceParent, "dir");
      },
    );
    if (
      !sourceParentRaceResult.checkpointReached ||
      sourceParentRaceResult.mutationError ||
      sourceParentRaceResult.status === 0 ||
      !sourceParentRaceResult.stderr.includes("source")
    ) {
      fail(`${scriptRelative}: source parent replacement after snapshot must fail closed`);
    }
    if (filesBelow(sourceParentRaceFixture.backupRoot).length !== 0) {
      fail(`${scriptRelative}: source parent race must not write backup payload or manifest bytes`);
    }

    const storageRootRaceFixture = makeFixture(temp, curator, "storage-root-race");
    const storageRootRaceSource = writeFixture(
      path.join(storageRootRaceFixture.repo, "selected.md"),
      `storage-root-source-${curator.runtime}\n`,
    );
    const displacedStorageRoot = `${storageRootRaceFixture.backupRoot}.original`;
    const attackerStorageRoot = path.join(temp, "storage-root-race-attacker", curator.runtime);
    fs.mkdirSync(attackerStorageRoot, { recursive: true });
    const attackerRootBefore = snapshotTree(attackerStorageRoot);
    const storageRootRaceResult = await runBackupAtCheckpoint(
      script,
      curator.backupArgs(storageRootRaceFixture, ["--include", storageRootRaceSource]),
      "before-backup-mkdtemp",
      () => {
        fs.renameSync(storageRootRaceFixture.backupRoot, displacedStorageRoot);
        fs.symlinkSync(attackerStorageRoot, storageRootRaceFixture.backupRoot, "dir");
      },
    );
    if (
      !storageRootRaceResult.checkpointReached ||
      storageRootRaceResult.mutationError ||
      storageRootRaceResult.status === 0 ||
      !storageRootRaceResult.stderr.includes("backup root")
    ) {
      fail(`${scriptRelative}: backup-root replacement before mkdtemp must fail closed`);
    }
    if (JSON.stringify(snapshotTree(attackerStorageRoot)) !== JSON.stringify(attackerRootBefore)) {
      fail(`${scriptRelative}: backup-root race redirected bytes into the attacker root`);
    }

    const storageParentRaceFixture = makeFixture(temp, curator, "storage-parent-race");
    storageParentRaceFixture.backupRoot = path.join(
      temp,
      "storage-parent-race-custody",
      curator.runtime,
      "safe-backups",
    );
    const storageParentRaceSource = writeFixture(
      path.join(storageParentRaceFixture.repo, "selected.md"),
      `storage-parent-source-${curator.runtime}\n`,
    );
    const storageParentRaceHash = sha256(storageParentRaceSource);
    const storageParent = path.dirname(storageParentRaceFixture.backupRoot);
    const displacedStorageParent = `${storageParent}.original`;
    const attackerStorageParent = path.join(temp, "storage-parent-race-attacker", curator.runtime);
    fs.mkdirSync(path.join(attackerStorageParent, "safe-backups"), { recursive: true });
    const attackerParentBefore = snapshotTree(attackerStorageParent);
    const storageParentRaceResult = await runBackupAtCheckpoint(
      script,
      curator.backupArgs(storageParentRaceFixture, ["--include", storageParentRaceSource]),
      "before-destination-write",
      () => {
        fs.renameSync(storageParent, displacedStorageParent);
        fs.symlinkSync(attackerStorageParent, storageParent, "dir");
      },
    );
    if (
      !storageParentRaceResult.checkpointReached ||
      storageParentRaceResult.mutationError ||
      storageParentRaceResult.status === 0 ||
      !storageParentRaceResult.stderr.includes("backup root")
    ) {
      fail(`${scriptRelative}: backup-root parent replacement before write must fail closed`);
    }
    if (
      JSON.stringify(snapshotTree(attackerStorageParent)) !== JSON.stringify(attackerParentBefore)
    ) {
      fail(`${scriptRelative}: backup-root parent race redirected sensitive bytes`);
    }
    if (
      filesBelow(displacedStorageParent).some(
        (file) => path.basename(file) === "backup-manifest.json",
      ) ||
      treeContainsHash(displacedStorageParent, storageParentRaceHash)
    ) {
      fail(`${scriptRelative}: raced backup must scrub payload and withhold success manifest`);
    }

    {
      const postChdirFixture = makeFixture(temp, curator, "post-chdir-parent-rename");
      const postChdirFirstSource = writeFixture(
        path.join(postChdirFixture.repo, "a-first.md"),
        `trusted-post-chdir-first-${curator.runtime}\n`,
      );
      const postChdirSecondSource = writeFixture(
        path.join(postChdirFixture.repo, "z-second.md"),
        `trusted-post-chdir-second-${curator.runtime}\n`,
      );
      const postChdirFirstHash = sha256(postChdirFirstSource);
      let displacedPostChdirBackup = null;
      let replacementPostChdirBackup = null;
      const postChdirResult = await runBackupAtCheckpoint(
        script,
        curator.backupArgs(postChdirFixture, [
          "--include",
          postChdirFirstSource,
          "--include",
          postChdirSecondSource,
        ]),
        "after-backup-destination-chdir",
        () => {
          const [backupDir] = backupRoots(curator, postChdirFixture);
          if (!backupDir) throw new Error("post-chdir fixture did not find the active backup");
          displacedPostChdirBackup = `${backupDir}.displaced`;
          replacementPostChdirBackup = backupDir;
          fs.renameSync(backupDir, displacedPostChdirBackup);
          fs.mkdirSync(replacementPostChdirBackup, { recursive: true });
        },
        {
          environment: {
            AGENT_MEMORY_CURATOR_TEST_CHECKPOINT_OCCURRENCE: "3",
          },
        },
      );
      if (
        !postChdirResult.checkpointReached ||
        postChdirResult.mutationError ||
        postChdirResult.status === 0 ||
        !displacedPostChdirBackup ||
        !replacementPostChdirBackup
      ) {
        fail(`${scriptRelative}: post-chdir parent rename must fail closed after a prior write`);
      } else {
        if (
          filesBelow(postChdirFixture.backupRoot).some(
            (file) => path.basename(file) === "backup-manifest.json",
          ) ||
          treeContainsHash(displacedPostChdirBackup, postChdirFirstHash)
        ) {
          fail(`${scriptRelative}: post-chdir parent rename must scrub prior payload and manifest`);
        }
        if (snapshotTree(replacementPostChdirBackup).length !== 0) {
          fail(`${scriptRelative}: post-chdir parent rename redirected bytes to replacement root`);
        }
      }

      const regularSwapFixture = makeFixture(temp, curator, "regular-source-swap");
      const regularSwapSource = writeFixture(
        path.join(regularSwapFixture.repo, "selected.md"),
        "trusted-regular-source\n",
      );
      const regularSwapResult = await runBackupAtCheckpoint(
        script,
        curator.backupArgs(regularSwapFixture, ["--include", regularSwapSource]),
        "after-source-plan",
        () => {
          fs.renameSync(regularSwapSource, `${regularSwapSource}.original`);
          writeFixture(regularSwapSource, "replacement-regular-source\n");
        },
      );
      if (
        !regularSwapResult.checkpointReached ||
        regularSwapResult.mutationError ||
        regularSwapResult.status === 0 ||
        fs.existsSync(regularSwapFixture.backupRoot)
      ) {
        fail(`${scriptRelative}: regular-to-regular source replacement must fail before mutation`);
      }

      const directorySwapFixture = makeFixture(temp, curator, "directory-source-swap");
      const directorySwapParent = path.join(directorySwapFixture.repo, "selected-parent");
      const directorySwapSource = writeFixture(
        path.join(directorySwapParent, "selected.md"),
        "trusted-directory-source\n",
      );
      const directorySwapResult = await runBackupAtCheckpoint(
        script,
        curator.backupArgs(directorySwapFixture, ["--include", directorySwapSource]),
        "after-source-plan",
        () => {
          fs.renameSync(directorySwapParent, `${directorySwapParent}.original`);
          writeFixture(path.join(directorySwapParent, "selected.md"), "replacement-directory\n");
        },
      );
      if (
        !directorySwapResult.checkpointReached ||
        directorySwapResult.mutationError ||
        directorySwapResult.status === 0 ||
        fs.existsSync(directorySwapFixture.backupRoot)
      ) {
        fail(`${scriptRelative}: directory-to-directory source replacement must fail closed`);
      }

      const inPlaceFixture = makeFixture(temp, curator, "in-place-source-mutation");
      const inPlaceSource = writeFixture(
        path.join(inPlaceFixture.repo, "selected.md"),
        "trusted-in-place-source\n",
      );
      const inPlaceResult = await runBackupAtCheckpoint(
        script,
        curator.backupArgs(inPlaceFixture, ["--include", inPlaceSource]),
        "after-source-plan",
        () => {
          fs.truncateSync(inPlaceSource, 0);
          fs.writeFileSync(inPlaceSource, "mutated-in-place\n", "utf8");
        },
      );
      if (
        !inPlaceResult.checkpointReached ||
        inPlaceResult.mutationError ||
        inPlaceResult.status === 0 ||
        fs.existsSync(inPlaceFixture.backupRoot)
      ) {
        fail(`${scriptRelative}: in-place source mutation must fail before backup-root creation`);
      }

      const destinationSwapFixture = makeFixture(temp, curator, "destination-leaf-swap");
      const destinationSwapSource = writeFixture(
        path.join(destinationSwapFixture.repo, "selected.md"),
        "trusted-destination-leaf\n",
      );
      const destinationSwapHash = sha256(destinationSwapSource);
      let destinationSwapBackup;
      const destinationSwapResult = await runBackupAtCheckpoint(
        script,
        curator.backupArgs(destinationSwapFixture, ["--include", destinationSwapSource]),
        "before-pre-manifest-reconciliation",
        () => {
          [destinationSwapBackup] = backupRoots(curator, destinationSwapFixture);
          if (!destinationSwapBackup) throw new Error("destination-swap backup root missing");
          const destination = path.join(
            destinationSwapBackup,
            "files",
            "exact-includes",
            "001-selected.md",
          );
          fs.renameSync(destination, `${destination}.original`);
          writeFixture(destination, "replacement-destination-leaf\n");
        },
      );
      if (
        !destinationSwapResult.checkpointReached ||
        destinationSwapResult.mutationError ||
        destinationSwapResult.status === 0 ||
        !destinationSwapBackup ||
        treeContainsHash(destinationSwapBackup, destinationSwapHash) ||
        filesBelow(destinationSwapBackup).some(
          (file) => path.basename(file) === "backup-manifest.json",
        )
      ) {
        fail(`${scriptRelative}: destination leaf swap must fail reconciliation and scrub payload`);
      }

      const destinationDirectoryFixture = makeFixture(temp, curator, "destination-directory-swap");
      const destinationDirectorySource = writeFixture(
        path.join(destinationDirectoryFixture.repo, "selected.md"),
        "trusted-destination-directory\n",
      );
      const destinationDirectoryHash = sha256(destinationDirectorySource);
      let destinationDirectoryBackup;
      const destinationDirectoryResult = await runBackupAtCheckpoint(
        script,
        curator.backupArgs(destinationDirectoryFixture, ["--include", destinationDirectorySource]),
        "before-pre-manifest-reconciliation",
        () => {
          [destinationDirectoryBackup] = backupRoots(curator, destinationDirectoryFixture);
          if (!destinationDirectoryBackup) throw new Error("destination-directory root missing");
          const directory = path.join(destinationDirectoryBackup, "files", "exact-includes");
          fs.renameSync(directory, `${directory}.original`);
          writeFixture(path.join(directory, "001-selected.md"), "replacement-directory-leaf\n");
        },
      );
      if (
        !destinationDirectoryResult.checkpointReached ||
        destinationDirectoryResult.mutationError ||
        destinationDirectoryResult.status === 0 ||
        !destinationDirectoryBackup ||
        treeContainsHash(destinationDirectoryBackup, destinationDirectoryHash) ||
        filesBelow(destinationDirectoryBackup).some(
          (file) => path.basename(file) === "backup-manifest.json",
        )
      ) {
        fail(`${scriptRelative}: destination directory swap must scrub task-owned payload`);
      }

      const postManifestFixture = makeFixture(temp, curator, "post-manifest-leaf-mutation");
      const postManifestSource = writeFixture(
        path.join(postManifestFixture.repo, "selected.md"),
        "trusted-post-manifest\n",
      );
      const postManifestHash = sha256(postManifestSource);
      let postManifestBackup;
      let postManifestDestination;
      let postManifestIdentity;
      const postManifestResult = await runBackupAtCheckpoint(
        script,
        curator.backupArgs(postManifestFixture, ["--include", postManifestSource]),
        "after-manifest-publication",
        () => {
          [postManifestBackup] = backupRoots(curator, postManifestFixture);
          if (!postManifestBackup) throw new Error("post-manifest backup root missing");
          postManifestDestination = path.join(
            postManifestBackup,
            "files",
            "exact-includes",
            "001-selected.md",
          );
          const destinationStat = fs.lstatSync(postManifestDestination, { bigint: true });
          postManifestIdentity = { dev: destinationStat.dev, ino: destinationStat.ino };
          fs.truncateSync(postManifestDestination, 0);
          fs.writeFileSync(postManifestDestination, "post-manifest-mutation\n", "utf8");
        },
      );
      const ownedPostManifestPayloadRemains =
        postManifestBackup && postManifestIdentity
          ? filesBelow(postManifestBackup).some((file) => {
              const stat = fs.lstatSync(file, { bigint: true });
              return stat.dev === postManifestIdentity.dev && stat.ino === postManifestIdentity.ino;
            })
          : true;
      if (
        !postManifestResult.checkpointReached ||
        postManifestResult.mutationError ||
        postManifestResult.status === 0 ||
        !postManifestBackup ||
        !postManifestDestination ||
        !postManifestIdentity ||
        fs.existsSync(postManifestDestination) ||
        ownedPostManifestPayloadRemains ||
        treeContainsHash(postManifestBackup, postManifestHash) ||
        filesBelow(postManifestBackup).some(
          (file) => path.basename(file) === "backup-manifest.json",
        )
      ) {
        fail(`${scriptRelative}: post-manifest mutation must revoke manifest and scrub payload`);
      }

      const rootIdentityFixture = makeFixture(temp, curator, "storage-root-identity-swap");
      const rootIdentitySource = writeFixture(
        path.join(rootIdentityFixture.repo, "selected.md"),
        "trusted-root-identity\n",
      );
      const rootIdentityResult = await runBackupAtCheckpoint(
        script,
        curator.backupArgs(rootIdentityFixture, ["--include", rootIdentitySource]),
        "before-backup-mkdtemp",
        () => {
          fs.renameSync(
            rootIdentityFixture.backupRoot,
            `${rootIdentityFixture.backupRoot}.original`,
          );
          fs.mkdirSync(rootIdentityFixture.backupRoot, { recursive: true });
        },
      );
      if (
        !rootIdentityResult.checkpointReached ||
        rootIdentityResult.mutationError ||
        rootIdentityResult.status === 0 ||
        filesBelow(rootIdentityFixture.backupRoot).length !== 0
      ) {
        fail(`${scriptRelative}: directory-to-directory backup-root replacement must fail closed`);
      }

      const relativeFixture = makeFixture(temp, curator, "relative-fallback");
      const relativeCwd = path.join(temp, "relative-fallback-cwd");
      fs.mkdirSync(relativeCwd, { recursive: true });
      const relativeSource = writeFixture(
        path.join(relativeFixture.repo, "selected.md"),
        "trusted-relative-fallback\n",
      );
      const relativeDecoy = writeFixture(
        path.join(relativeCwd, "decoy", "selected.md"),
        "decoy-relative-source\n",
      );
      const relativeArgs = curator
        .backupArgs(relativeFixture, ["--include", relativeSource])
        .map((argument) =>
          path.isAbsolute(argument) ? path.relative(relativeCwd, argument) : argument,
        );
      const relativeResult = runBackup(
        script,
        relativeArgs,
        { AGENT_MEMORY_CURATOR_TEST_FORCE_NO_NOFOLLOW: "1", NODE_ENV: "test" },
        { cwd: relativeCwd },
      );
      const relativeBackup = validateManifest(curator, relativeResult, "exact", [relativeSource]);
      if (relativeBackup?.manifest.files.some((entry) => entry.source === relativeDecoy)) {
        fail(`${scriptRelative}: relative fallback invocation selected a cwd decoy`);
      }

      const fallbackSymlinkTarget = writeFixture(
        path.join(relativeCwd, "fallback-target.md"),
        "fallback-target\n",
      );
      const fallbackSymlink = path.join(relativeCwd, "fallback-symlink.md");
      fs.symlinkSync(fallbackSymlinkTarget, fallbackSymlink);
      const fallbackFailureArgs = [...relativeArgs];
      fallbackFailureArgs.splice(-1, 1, path.basename(fallbackSymlink));
      const fallbackFailure = runBackup(
        script,
        fallbackFailureArgs,
        { AGENT_MEMORY_CURATOR_TEST_FORCE_NO_NOFOLLOW: "1", NODE_ENV: "test" },
        { cwd: relativeCwd },
      );
      if (fallbackFailure.status === 0 || !fallbackFailure.stderr.includes("symlink component")) {
        fail(`${scriptRelative}: forced no-O_NOFOLLOW fallback must reject relative symlink input`);
      }

      const lowNoFileFixture = makeFixture(temp, curator, "low-nofile-high-count");
      const lowNoFileSources = Array.from({ length: 64 }, (_, index) =>
        writeFixture(
          path.join(lowNoFileFixture.repo, "many", `${String(index).padStart(3, "0")}.md`),
          `low-nofile-${index}\n`,
        ),
      );
      const lowNoFileIncludes = lowNoFileSources.flatMap((file) => ["--include", file]);
      const lowNoFileResult = runBackupWithLowNoFile(
        script,
        curator.backupArgs(lowNoFileFixture, lowNoFileIncludes),
      );
      validateManifest(curator, lowNoFileResult, "exact", lowNoFileSources);
    }

    const repeatedInclude = [
      "--include",
      exact,
      "--include",
      exact,
      "--include",
      secondExactSource,
    ];
    const exactResult = runBackup(script, exactArgs(repeatedInclude));
    const firstExact = validateManifest(curator, exactResult, "exact", [exact, secondExactSource]);
    if (
      firstExact &&
      (firstExact.backupRoot !== path.resolve(exactFixture.backupRoot) ||
        !firstExact.storageLocator.startsWith(`external-root/${exactFixture.backupRootAlias}/`) ||
        isWithin(exactFixture.repo, firstExact.backupRoot))
    ) {
      fail(`${scriptRelative}: explicit safe backup root must stay outside the target repository`);
    }
    if (!exactResult.stdout.includes("Exact includes backed up: 2")) {
      fail(`${scriptRelative}: repeatable exact includes must be deduplicated`);
    }
    for (const sentinel of legacySentinels) {
      if (firstExact?.manifest.files.some((entry) => entry.source === sentinel)) {
        fail(`${scriptRelative}: exact mode must exclude legacy discovery source ${sentinel}`);
      }
    }
    if (curator.runtime !== "codex") {
      const ignoredMissingDiscoveryArgs = curator.backupArgs(exactFixture, ["--include", exact]);
      ignoredMissingDiscoveryArgs.push(
        curator.runtime === "claude" ? "--memory-dir" : "--memory-bank",
        path.join(temp, "exact", "missing-legacy-discovery-root"),
      );
      validateManifest(curator, runBackup(script, ignoredMissingDiscoveryArgs), "exact", [exact]);
    }

    const defaultRootFixture = makeFixture(temp, curator, "default-safe-root");
    const defaultSource = writeFixture(
      path.join(defaultRootFixture.repo, "context.md"),
      `default-safe-root-${curator.runtime}\n`,
    );
    const defaultStateHome = path.join(temp, "default-safe-root", "user-state");
    const defaultResult = runBackup(
      script,
      curator.backupArgs(defaultRootFixture, ["--include", defaultSource], {
        backupRoot: null,
      }),
      { XDG_STATE_HOME: defaultStateHome },
    );
    const defaultBackup = validateManifest(curator, defaultResult, "exact", [defaultSource]);
    const defaultIdentity =
      curator.runtime === "codex" ? defaultRootFixture.runtimeHome : defaultRootFixture.repo;
    const expectedIdentityHash = crypto
      .createHash("sha256")
      .update(path.resolve(defaultIdentity))
      .digest("hex")
      .slice(0, 20);
    const expectedDefaultRoot = path.join(
      defaultStateHome,
      "agent-memory-curator-backups",
      curator.runtime,
      expectedIdentityHash,
    );
    const expectedDefaultLocatorPrefix = [
      "user-state",
      "agent-memory-curator-backups",
      curator.runtime,
      expectedIdentityHash,
    ].join("/");
    if (
      defaultBackup &&
      (defaultBackup.backupRoot !== expectedDefaultRoot ||
        defaultBackup.storageLocator !==
          `${expectedDefaultLocatorPrefix}/${defaultBackup.backupId}` ||
        isWithin(defaultRootFixture.repo, defaultBackup.backupRoot))
    ) {
      fail(
        `${scriptRelative}: default backup root must be deterministic user state outside the target repository`,
      );
    }
    const repeatedDefaultResult = runBackup(
      script,
      curator.backupArgs(defaultRootFixture, ["--include", defaultSource], {
        backupRoot: null,
      }),
      { XDG_STATE_HOME: defaultStateHome },
    );
    const repeatedDefaultBackup = validateManifest(curator, repeatedDefaultResult, "exact", [
      defaultSource,
    ]);
    if (
      defaultBackup &&
      repeatedDefaultBackup &&
      (repeatedDefaultBackup.backupRoot !== expectedDefaultRoot ||
        repeatedDefaultBackup.storageLocator !==
          `${expectedDefaultLocatorPrefix}/${repeatedDefaultBackup.backupId}` ||
        repeatedDefaultBackup.backupDir === defaultBackup.backupDir ||
        JSON.stringify(repeatedDefaultBackup.manifest.files) !==
          JSON.stringify(defaultBackup.manifest.files))
    ) {
      fail(`${scriptRelative}: repeated defaults must reuse the identity root without clobbering`);
    }

    if (curator.runtime === "codex") {
      const missingHomeFixture = makeFixture(temp, curator, "exact-missing-codex-home");
      missingHomeFixture.runtimeHome = path.join(
        temp,
        "exact-missing-codex-home",
        "does-not-exist",
      );
      const missingHomeSource = writeFixture(
        path.join(missingHomeFixture.repo, "context.md"),
        "exact-without-codex-home\n",
      );
      const missingHomeState = path.join(temp, "exact-missing-codex-home", "user-state");
      const missingHomeResult = runBackup(
        script,
        curator.backupArgs(missingHomeFixture, ["--include", missingHomeSource], {
          backupRoot: null,
        }),
        { XDG_STATE_HOME: missingHomeState },
      );
      const missingHomeBackup = validateManifest(curator, missingHomeResult, "exact", [
        missingHomeSource,
      ]);
      const missingHomeIdentityHash = crypto
        .createHash("sha256")
        .update(path.resolve(missingHomeFixture.runtimeHome))
        .digest("hex")
        .slice(0, 20);
      const expectedMissingHomeRoot = path.join(
        missingHomeState,
        "agent-memory-curator-backups",
        "codex",
        missingHomeIdentityHash,
      );
      if (
        missingHomeBackup &&
        (missingHomeBackup.backupRoot !== expectedMissingHomeRoot ||
          !missingHomeBackup.storageLocator.startsWith(
            `user-state/agent-memory-curator-backups/codex/${missingHomeIdentityHash}/`,
          ))
      ) {
        fail(
          `${scriptRelative}: exact mode must support a missing Codex home with the deterministic default root`,
        );
      }
      if (fs.existsSync(missingHomeFixture.runtimeHome)) {
        fail(`${scriptRelative}: exact mode must not create the missing Codex home`);
      }

      const missingLegacyHomeFixture = makeFixture(temp, curator, "legacy-missing-codex-home");
      missingLegacyHomeFixture.runtimeHome = path.join(
        temp,
        "legacy-missing-codex-home",
        "does-not-exist",
      );
      const missingLegacyHomeResult = runBackup(
        script,
        curator.backupArgs(missingLegacyHomeFixture, []),
      );
      if (
        missingLegacyHomeResult.status === 0 ||
        !missingLegacyHomeResult.stderr.includes("Codex home is not accessible")
      ) {
        fail(`${scriptRelative}: legacy mode must fail closed when Codex home is missing`);
      }
      if (backupRoots(curator, missingLegacyHomeFixture).length !== 0) {
        fail(`${scriptRelative}: missing legacy Codex home must fail before backup-root creation`);
      }

      const sourceRootFixture = makeFixture(temp, curator, "codex-source-root-containment");
      createLegacySources(curator, sourceRootFixture);
      const sourceMemoriesRoot = path.join(sourceRootFixture.runtimeHome, "memories");
      const nestedBackupRoot = path.join(sourceMemoriesRoot, "unsafe-backups");
      writeFixture(
        path.join(nestedBackupRoot, "preexisting-source.txt"),
        "must-not-be-recursively-backed-up\n",
      );
      const sourceTreeBefore = snapshotTree(sourceMemoriesRoot);
      const nestedRootResult = runBackup(
        script,
        curator.backupArgs(sourceRootFixture, [], {
          backupRoot: nestedBackupRoot,
          backupRootAlias: "codex-source-root",
        }),
      );
      if (
        nestedRootResult.status === 0 ||
        !nestedRootResult.stderr.includes(
          "backup root must be outside the resolved Codex memories tree",
        )
      ) {
        fail(`${scriptRelative}: backup root inside Codex memories must fail closed`);
      }
      if (
        JSON.stringify(snapshotTree(sourceMemoriesRoot)) !== JSON.stringify(sourceTreeBefore) ||
        filesBelow(nestedBackupRoot).some(
          (file) =>
            path.basename(file) === "backup-manifest.json" ||
            file.includes(`${path.sep}memories.backup.`),
        )
      ) {
        fail(
          `${scriptRelative}: rejected nested backup root must not mutate or recursively re-include the memories tree`,
        );
      }

      const equalRootResult = runBackup(
        script,
        curator.backupArgs(sourceRootFixture, [], {
          backupRoot: sourceMemoriesRoot,
          backupRootAlias: "codex-source-root-equal",
        }),
      );
      if (
        equalRootResult.status === 0 ||
        !equalRootResult.stderr.includes(
          "backup root must be outside the resolved Codex memories tree",
        ) ||
        JSON.stringify(snapshotTree(sourceMemoriesRoot)) !== JSON.stringify(sourceTreeBefore)
      ) {
        fail(`${scriptRelative}: backup root equal to Codex memories must fail without mutation`);
      }

      const derivedRootFixture = makeFixture(temp, curator, "codex-derived-source-root");
      createLegacySources(curator, derivedRootFixture);
      const derivedMemoriesRoot = path.join(derivedRootFixture.runtimeHome, "memories");
      const derivedStateHome = path.join(derivedMemoriesRoot, "derived-user-state");
      const derivedTreeBefore = snapshotTree(derivedMemoriesRoot);
      const derivedRootResult = runBackup(
        script,
        curator.backupArgs(derivedRootFixture, [], { backupRoot: null }),
        { XDG_STATE_HOME: derivedStateHome },
      );
      if (
        derivedRootResult.status === 0 ||
        !derivedRootResult.stderr.includes(
          "backup root must be outside the resolved Codex memories tree",
        ) ||
        fs.existsSync(derivedStateHome) ||
        JSON.stringify(snapshotTree(derivedMemoriesRoot)) !== JSON.stringify(derivedTreeBefore)
      ) {
        fail(
          `${scriptRelative}: derived backup root inside Codex memories must fail before directory creation`,
        );
      }

      const aliasRootFixture = makeFixture(temp, curator, "codex-source-root-alias");
      createLegacySources(curator, aliasRootFixture);
      const aliasMemoriesRoot = path.join(aliasRootFixture.runtimeHome, "memories");
      const memoriesAlias = path.join(temp, "codex-source-root-alias", "memories-alias");
      fs.symlinkSync(aliasMemoriesRoot, memoriesAlias, "dir");
      const aliasTreeBefore = snapshotTree(aliasMemoriesRoot);
      const aliasedBackupRoot = path.join(memoriesAlias, "aliased-backups");
      const aliasRootResult = runBackup(
        script,
        curator.backupArgs(aliasRootFixture, [], {
          backupRoot: aliasedBackupRoot,
          backupRootAlias: "codex-source-root-alias",
        }),
      );
      if (
        aliasRootResult.status === 0 ||
        !aliasRootResult.stderr.includes(
          "backup root must be outside the resolved Codex memories tree",
        ) ||
        fs.existsSync(path.join(aliasMemoriesRoot, "aliased-backups")) ||
        JSON.stringify(snapshotTree(aliasMemoriesRoot)) !== JSON.stringify(aliasTreeBefore)
      ) {
        fail(
          `${scriptRelative}: symlink-aliased backup root inside Codex memories must fail without mutation`,
        );
      }
    }

    const aliasFixture = makeFixture(temp, curator, "portable-root-alias");
    const aliasSource = writeFixture(
      path.join(aliasFixture.repo, "context.md"),
      `portable-alias-${curator.runtime}\n`,
    );
    const missingAliasArgs = curator.backupArgs(aliasFixture, ["--include", aliasSource]);
    const aliasFlagIndex = missingAliasArgs.indexOf("--backup-root-alias");
    missingAliasArgs.splice(aliasFlagIndex, 2);
    const missingAliasResult = runBackup(script, missingAliasArgs);
    if (
      missingAliasResult.status === 0 ||
      !missingAliasResult.stderr.includes(
        "--backup-root requires --backup-root-alias for portable recovery",
      )
    ) {
      fail(`${scriptRelative}: explicit backup root without portable alias must fail closed`);
    }
    const invalidAliasResult = runBackup(
      script,
      curator.backupArgs(aliasFixture, ["--include", aliasSource], {
        backupRootAlias: "../private-path",
      }),
    );
    if (
      invalidAliasResult.status === 0 ||
      !invalidAliasResult.stderr.includes("portable name without path separators")
    ) {
      fail(`${scriptRelative}: path-like backup-root alias must fail closed`);
    }
    if (backupRoots(curator, aliasFixture).length !== 0) {
      fail(`${scriptRelative}: invalid backup-root alias must fail before root creation`);
    }

    const unsafeRootFixture = makeFixture(temp, curator, "unsafe-worktree-root");
    const unsafeSource = writeFixture(
      path.join(unsafeRootFixture.repo, "context.md"),
      `unsafe-root-${curator.runtime}\n`,
    );
    const initializedWorktree = spawnSync("git", ["init", "--quiet", unsafeRootFixture.repo], {
      encoding: "utf8",
    });
    if (initializedWorktree.status !== 0) {
      fail(`${scriptRelative}: could not create a real Git-worktree fixture`);
    }
    const unsafeBackupRoot = path.join(unsafeRootFixture.repo, ".memory-curator-backups");
    const unsafeRootResult = runBackup(
      script,
      curator.backupArgs(unsafeRootFixture, ["--include", unsafeSource], {
        backupRoot: unsafeBackupRoot,
      }),
    );
    if (
      unsafeRootResult.status === 0 ||
      !unsafeRootResult.stderr.includes("backup root must be outside Git worktrees")
    ) {
      fail(`${scriptRelative}: backup root inside target Git worktree must fail closed`);
    }
    if (fs.existsSync(unsafeBackupRoot)) {
      fail(`${scriptRelative}: unsafe worktree root must be rejected before root creation`);
    }

    const otherWorktreeRoot = path.join(temp, "unsafe-other-worktree", curator.runtime);
    const linkedWorktreeMetadata = path.join(
      temp,
      "unsafe-other-worktree",
      `${curator.runtime}-linked-metadata`,
    );
    writeFixture(path.join(linkedWorktreeMetadata, "HEAD"), "ref: refs/heads/main\n");
    writeFixture(path.join(otherWorktreeRoot, ".git"), `gitdir: ${linkedWorktreeMetadata}\n`);
    const unsafeOtherRoot = path.join(otherWorktreeRoot, "backups");
    const unsafeOtherResult = runBackup(
      script,
      curator.backupArgs(unsafeRootFixture, ["--include", unsafeSource], {
        backupRoot: unsafeOtherRoot,
      }),
    );
    if (
      unsafeOtherResult.status === 0 ||
      !unsafeOtherResult.stderr.includes("backup root must be outside Git worktrees")
    ) {
      fail(`${scriptRelative}: backup root inside another Git worktree must fail closed`);
    }
    if (fs.existsSync(unsafeOtherRoot)) {
      fail(`${scriptRelative}: other-worktree root must be rejected before root creation`);
    }

    const concurrentArgs = exactArgs(["--include", secondExactSource, "--include", exact]);
    const [secondExactResult, thirdExactResult] = await Promise.all([
      runBackupConcurrently(script, concurrentArgs),
      runBackupConcurrently(script, concurrentArgs),
    ]);
    const secondExact = validateManifest(curator, secondExactResult, "exact", [
      exact,
      secondExactSource,
    ]);
    const thirdExact = validateManifest(curator, thirdExactResult, "exact", [
      exact,
      secondExactSource,
    ]);
    if (
      firstExact &&
      secondExact &&
      thirdExact &&
      new Set([firstExact.backupDir, secondExact.backupDir, thirdExact.backupDir]).size !== 3
    ) {
      fail(`${scriptRelative}: concurrent-capable invocations must receive distinct atomic roots`);
    }
    if (
      firstExact &&
      secondExact &&
      thirdExact &&
      (JSON.stringify(firstExact.manifest.files) !== JSON.stringify(secondExact.manifest.files) ||
        JSON.stringify(firstExact.manifest.files) !== JSON.stringify(thirdExact.manifest.files))
    ) {
      fail(`${scriptRelative}: equivalent exact selections must produce deterministic mappings`);
    }

    const rootsBeforeRejection = backupRoots(curator, exactFixture);
    const rejected = runBackup(
      script,
      curator.backupArgs(exactFixture, ["--include", exactFixture.repo]),
    );
    if (rejected.status === 0 || !rejected.stderr.includes("existing regular, non-symlink file")) {
      fail(`${scriptRelative}: directory --include must fail closed`);
    }
    if (backupRoots(curator, exactFixture).length !== rootsBeforeRejection.length) {
      fail(`${scriptRelative}: invalid includes must fail before creating a backup root`);
    }
    if (fs.existsSync("/dev/null") && !fs.lstatSync("/dev/null").isFile()) {
      const rootsBeforeSpecialRejection = backupRoots(curator, exactFixture).length;
      const specialRejected = runBackup(
        script,
        curator.backupArgs(exactFixture, ["--include", "/dev/null"]),
      );
      if (
        specialRejected.status === 0 ||
        !specialRejected.stderr.includes("existing regular, non-symlink file")
      ) {
        fail(`${scriptRelative}: special-file --include must fail closed`);
      }
      if (backupRoots(curator, exactFixture).length !== rootsBeforeSpecialRejection) {
        fail(`${scriptRelative}: special-file rejection must precede backup-root creation`);
      }
    }

    const exactParentSymlinkFixture = makeFixture(temp, curator, "exact-parent-symlink");
    const exactRealParent = path.join(temp, "exact-parent-symlink", "real-parent");
    const exactThroughParent = writeFixture(
      path.join(exactRealParent, "context.md"),
      `exact-parent-symlink-${curator.runtime}\n`,
    );
    const exactLinkedParent = path.join(temp, "exact-parent-symlink", "linked-parent");
    fs.symlinkSync(exactRealParent, exactLinkedParent, "dir");
    const exactParentSymlinkResult = runBackup(
      script,
      curator.backupArgs(exactParentSymlinkFixture, [
        "--include",
        path.join(exactLinkedParent, path.basename(exactThroughParent)),
      ]),
    );
    if (
      exactParentSymlinkResult.status === 0 ||
      !exactParentSymlinkResult.stderr.includes("symlink component")
    ) {
      fail(`${scriptRelative}: exact includes below a symlinked parent must fail closed`);
    }
    if (backupRoots(curator, exactParentSymlinkFixture).length !== 0) {
      fail(`${scriptRelative}: exact parent-symlink rejection must precede backup-root creation`);
    }

    const legacyFixture = makeFixture(temp, curator, "legacy");
    const expectedLegacy = createLegacySources(curator, legacyFixture);
    const unrelated = writeFixture(
      path.join(legacyFixture.repo, "unrelated-context.txt"),
      `unrelated-${curator.runtime}\n`,
    );
    const legacyArgs = curator.backupArgs(legacyFixture, []);
    if (curator.runtime === "claude") {
      const memoryDir = path.join(temp, "legacy", "auto-memory");
      expectedLegacy.push(writeFixture(path.join(memoryDir, "topic.md"), "# Auto memory\n"));
      legacyArgs.push("--memory-dir", memoryDir);
    }
    if (curator.runtime === "cursor") {
      const memoryBank = path.join(temp, "legacy", "memory-bank");
      expectedLegacy.push(writeFixture(path.join(memoryBank, "context.md"), "# Memory bank\n"));
      legacyArgs.push("--memory-bank", memoryBank);
    }
    const legacyResult = runBackup(script, legacyArgs);
    const legacy = validateManifest(curator, legacyResult, "legacy", expectedLegacy);
    if (legacy?.manifest.files.some((entry) => entry.source === unrelated)) {
      fail(`${scriptRelative}: zero-include legacy discovery copied an unrelated file`);
    }

    const symlinkFixture = makeFixture(temp, curator, "symlink");
    const symlinkTarget = writeFixture(
      path.join(temp, "symlink", "target.md"),
      `symlink-target-${curator.runtime}\n`,
    );
    const symlinkPath =
      curator.runtime === "codex"
        ? path.join(symlinkFixture.runtimeHome, "memories", "MEMORY.md")
        : curator.runtime === "claude"
          ? path.join(symlinkFixture.repo, "CLAUDE.md")
          : path.join(symlinkFixture.repo, ".cursorrules");
    fs.mkdirSync(path.dirname(symlinkPath), { recursive: true });
    fs.symlinkSync(symlinkTarget, symlinkPath);
    const symlinkResult = runBackup(script, curator.backupArgs(symlinkFixture, []));
    if (
      symlinkResult.status === 0 ||
      !symlinkResult.stderr.includes("legacy discovery found symlink")
    ) {
      fail(`${scriptRelative}: legacy discovery must fail closed on a selected symlink`);
    }
    if (backupRoots(curator, symlinkFixture).length !== 0) {
      fail(`${scriptRelative}: legacy symlinks must fail before backup-root creation`);
    }

    if (curator.runtime !== "codex") {
      const nestedSymlinkFixture = makeFixture(temp, curator, "nested-symlink");
      createLegacySources(curator, nestedSymlinkFixture);
      const nestedTarget = path.join(temp, "nested-symlink", "linked-context");
      writeFixture(
        path.join(nestedTarget, curator.runtime === "claude" ? "CLAUDE.md" : "AGENTS.md"),
        `# Nested ${curator.runtime} context\n`,
      );
      fs.symlinkSync(
        nestedTarget,
        path.join(nestedSymlinkFixture.repo, "nested-context-link"),
        "dir",
      );
      const nestedSymlinkResult = runBackup(script, curator.backupArgs(nestedSymlinkFixture, []));
      if (
        nestedSymlinkResult.status === 0 ||
        !nestedSymlinkResult.stderr.includes("legacy discovery found symlink")
      ) {
        fail(`${scriptRelative}: recursive discovery must reject every non-ignored symlink`);
      }
      if (backupRoots(curator, nestedSymlinkFixture).length !== 0) {
        fail(`${scriptRelative}: nested symlink rejection must precede backup-root creation`);
      }
    }

    const legacyParentSymlinkFixture = makeFixture(temp, curator, "legacy-parent-symlink");
    let legacyParentSymlinkArgs;
    let legacyParentSymlinkRootFixture = legacyParentSymlinkFixture;
    if (curator.runtime === "codex") {
      const realHome = path.join(temp, "legacy-parent-symlink", "real-codex-home");
      writeFixture(path.join(realHome, "memories", "MEMORY.md"), "# Linked Codex home\n");
      const linkedHome = path.join(temp, "legacy-parent-symlink", "linked-codex-home");
      fs.symlinkSync(realHome, linkedHome, "dir");
      legacyParentSymlinkArgs = [
        "--repo",
        legacyParentSymlinkFixture.repo,
        "--codex-home",
        linkedHome,
        "--backup-root",
        legacyParentSymlinkFixture.backupRoot,
        "--backup-root-alias",
        legacyParentSymlinkFixture.backupRootAlias,
      ];
      legacyParentSymlinkRootFixture = { ...legacyParentSymlinkFixture, runtimeHome: realHome };
    } else {
      createLegacySources(curator, legacyParentSymlinkFixture);
      const realDiscoveryParent = path.join(temp, "legacy-parent-symlink", "real-discovery");
      writeFixture(path.join(realDiscoveryParent, "memory", "topic.md"), "# Linked discovery\n");
      const linkedDiscoveryParent = path.join(temp, "legacy-parent-symlink", "linked-discovery");
      fs.symlinkSync(realDiscoveryParent, linkedDiscoveryParent, "dir");
      legacyParentSymlinkArgs = curator.backupArgs(legacyParentSymlinkFixture, []);
      legacyParentSymlinkArgs.push(
        curator.runtime === "claude" ? "--memory-dir" : "--memory-bank",
        path.join(linkedDiscoveryParent, "memory"),
      );
    }
    const legacyParentSymlinkResult = runBackup(script, legacyParentSymlinkArgs);
    if (
      legacyParentSymlinkResult.status === 0 ||
      !legacyParentSymlinkResult.stderr.includes("symlink component")
    ) {
      fail(`${scriptRelative}: configured legacy roots below symlinked parents must fail closed`);
    }
    if (backupRoots(curator, legacyParentSymlinkRootFixture).length !== 0) {
      fail(`${scriptRelative}: legacy parent-symlink rejection must precede backup-root creation`);
    }

    if (curator.runtime === "claude") {
      const configuredSymlinkFixture = makeFixture(temp, curator, "configured-parent-symlink");
      createLegacySources(curator, configuredSymlinkFixture);
      const configuredRealParent = path.join(temp, "configured-parent-symlink", "real-discovery");
      writeFixture(path.join(configuredRealParent, "memory", "topic.md"), "# Configured memory\n");
      const configuredLinkedParent = path.join(
        temp,
        "configured-parent-symlink",
        "linked-discovery",
      );
      fs.symlinkSync(configuredRealParent, configuredLinkedParent, "dir");
      writeFixture(
        path.join(configuredSymlinkFixture.runtimeHome, "settings.json"),
        `${JSON.stringify({ autoMemoryDirectory: path.join(configuredLinkedParent, "memory") })}\n`,
      );
      const configuredSymlinkResult = runBackup(
        script,
        curator.backupArgs(configuredSymlinkFixture, []),
      );
      if (
        configuredSymlinkResult.status === 0 ||
        !configuredSymlinkResult.stderr.includes("symlink component")
      ) {
        fail(`${scriptRelative}: configured auto-memory below a symlinked parent must fail closed`);
      }
      if (backupRoots(curator, configuredSymlinkFixture).length !== 0) {
        fail(`${scriptRelative}: configured-root rejection must precede backup-root creation`);
      }

      const emptyConfiguredFixture = makeFixture(temp, curator, "empty-configured-memory-root");
      createLegacySources(curator, emptyConfiguredFixture);
      writeFixture(
        path.join(emptyConfiguredFixture.runtimeHome, "settings.json"),
        `${JSON.stringify({ autoMemoryDirectory: "   " })}\n`,
      );
      const emptyConfiguredResult = runBackup(
        script,
        curator.backupArgs(emptyConfiguredFixture, []),
      );
      if (
        emptyConfiguredResult.status === 0 ||
        !emptyConfiguredResult.stderr.includes(
          "configured autoMemoryDirectory must be a non-empty path",
        )
      ) {
        fail(`${scriptRelative}: empty configured auto-memory root must fail closed`);
      }
      if (backupRoots(curator, emptyConfiguredFixture).length !== 0) {
        fail(`${scriptRelative}: empty configured root must fail before backup-root creation`);
      }

      const malformedSettingsFixture = makeFixture(temp, curator, "malformed-settings-json");
      const malformedSources = createLegacySources(curator, malformedSettingsFixture);
      const malformedSettings = writeFixture(
        path.join(malformedSettingsFixture.runtimeHome, "settings.json"),
        '{"autoMemoryDirectory":\n',
      );
      const malformedFingerprints = new Map(
        [...malformedSources, malformedSettings].map((file) => [file, sha256(file)]),
      );
      const malformedSettingsResult = runBackup(
        script,
        curator.backupArgs(malformedSettingsFixture, []),
      );
      if (
        malformedSettingsResult.status === 0 ||
        !malformedSettingsResult.stderr.includes("could not parse Claude settings JSON")
      ) {
        fail(`${scriptRelative}: malformed settings JSON must fail closed`);
      }
      if (fs.existsSync(malformedSettingsFixture.backupRoot)) {
        fail(`${scriptRelative}: malformed settings JSON must fail before backup-root creation`);
      }
      for (const [file, fingerprint] of malformedFingerprints) {
        if (!fs.existsSync(file) || sha256(file) !== fingerprint) {
          fail(`${scriptRelative}: malformed settings rejection mutated source ${file}`);
        }
      }

      const nonStringSettingsFixture = makeFixture(temp, curator, "non-string-settings-value");
      const nonStringSources = createLegacySources(curator, nonStringSettingsFixture);
      const nonStringSettings = writeFixture(
        path.join(nonStringSettingsFixture.runtimeHome, "settings.json"),
        `${JSON.stringify({ autoMemoryDirectory: 42 })}\n`,
      );
      const nonStringFingerprints = new Map(
        [...nonStringSources, nonStringSettings].map((file) => [file, sha256(file)]),
      );
      const nonStringSettingsResult = runBackup(
        script,
        curator.backupArgs(nonStringSettingsFixture, []),
      );
      if (
        nonStringSettingsResult.status === 0 ||
        !nonStringSettingsResult.stderr.includes("configured autoMemoryDirectory must be a string")
      ) {
        fail(`${scriptRelative}: non-string autoMemoryDirectory must fail closed`);
      }
      if (fs.existsSync(nonStringSettingsFixture.backupRoot)) {
        fail(`${scriptRelative}: non-string auto-memory value must fail before root creation`);
      }
      for (const [file, fingerprint] of nonStringFingerprints) {
        if (!fs.existsSync(file) || sha256(file) !== fingerprint) {
          fail(`${scriptRelative}: non-string settings rejection mutated source ${file}`);
        }
      }

      const derivedSettingsFixture = makeFixture(temp, curator, "missing-auto-memory-key");
      const derivedSources = createLegacySources(curator, derivedSettingsFixture);
      derivedSources.push(
        writeFixture(
          path.join(derivedSettingsFixture.runtimeHome, "settings.json"),
          `${JSON.stringify({ autoMemoryEnabled: true })}\n`,
        ),
      );
      const derivedSlug = derivedSettingsFixture.repo
        .replace(/^[\\/]+/, "")
        .replace(/[:\\/]+/g, "-");
      derivedSources.push(
        writeFixture(
          path.join(
            derivedSettingsFixture.runtimeHome,
            "projects",
            derivedSlug,
            "memory",
            "topic.md",
          ),
          "# Derived auto memory\n",
        ),
      );
      validateManifest(
        curator,
        runBackup(script, curator.backupArgs(derivedSettingsFixture, [])),
        "legacy",
        derivedSources,
      );
    }

    if (curator.runtime !== "codex") {
      const missingRootFixture = makeFixture(temp, curator, "missing-explicit-root");
      createLegacySources(curator, missingRootFixture);
      const missingRootArgs = curator.backupArgs(missingRootFixture, []);
      missingRootArgs.push(
        curator.runtime === "claude" ? "--memory-dir" : "--memory-bank",
        path.join(temp, "missing-explicit-root", "does-not-exist"),
      );
      const missingRootResult = runBackup(script, missingRootArgs);
      if (
        missingRootResult.status === 0 ||
        !missingRootResult.stderr.includes("is not accessible")
      ) {
        fail(`${scriptRelative}: a missing explicit discovery root must fail closed`);
      }
      if (backupRoots(curator, missingRootFixture).length !== 0) {
        fail(`${scriptRelative}: missing-root rejection must precede backup-root creation`);
      }

      const invalidRootFixture = makeFixture(temp, curator, "invalid-explicit-root");
      createLegacySources(curator, invalidRootFixture);
      const invalidRoot = "/dev/null";
      if (fs.existsSync(invalidRoot)) {
        const invalidRootArgs = curator.backupArgs(invalidRootFixture, []);
        invalidRootArgs.push(
          curator.runtime === "claude" ? "--memory-dir" : "--memory-bank",
          invalidRoot,
        );
        const invalidRootResult = runBackup(script, invalidRootArgs);
        if (invalidRootResult.status === 0 || !invalidRootResult.stderr.includes("must")) {
          fail(`${scriptRelative}: an explicit discovery root with invalid type must fail closed`);
        }
        if (backupRoots(curator, invalidRootFixture).length !== 0) {
          fail(`${scriptRelative}: invalid-root rejection must precede backup-root creation`);
        }
      }
    } else {
      const missingRootFixture = makeFixture(temp, curator, "missing-legacy-root");
      const missingRootResult = runBackup(script, curator.backupArgs(missingRootFixture, []));
      if (
        missingRootResult.status === 0 ||
        !missingRootResult.stderr.includes("is not accessible")
      ) {
        fail(`${scriptRelative}: a missing legacy discovery root must fail closed`);
      }
      if (backupRoots(curator, missingRootFixture).length !== 0) {
        fail(`${scriptRelative}: missing-root rejection must precede backup-root creation`);
      }
    }

    const unreadableFixture = makeFixture(temp, curator, "unreadable-root");
    let unreadableRoot;
    let unreadableArgs;
    if (curator.runtime === "codex") {
      unreadableRoot = path.join(unreadableFixture.runtimeHome, "memories");
      writeFixture(path.join(unreadableRoot, "MEMORY.md"), "# Unreadable memories\n");
      unreadableArgs = curator.backupArgs(unreadableFixture, []);
    } else {
      createLegacySources(curator, unreadableFixture);
      unreadableRoot = path.join(temp, "unreadable-root", "explicit-discovery");
      writeFixture(path.join(unreadableRoot, "context.md"), "# Unreadable discovery\n");
      unreadableArgs = curator.backupArgs(unreadableFixture, []);
      unreadableArgs.push(
        curator.runtime === "claude" ? "--memory-dir" : "--memory-bank",
        unreadableRoot,
      );
    }
    fs.chmodSync(unreadableRoot, 0o000);
    let hostRejectsTraversal = false;
    try {
      fs.readdirSync(unreadableRoot);
    } catch {
      hostRejectsTraversal = true;
    }
    if (hostRejectsTraversal) {
      const unreadableResult = runBackup(script, unreadableArgs);
      if (unreadableResult.status === 0) {
        fail(`${scriptRelative}: unreadable discovery traversal must fail closed`);
      }
      if (backupRoots(curator, unreadableFixture).length !== 0) {
        fail(`${scriptRelative}: unreadable-root rejection must precede backup-root creation`);
      }
    }
    fs.chmodSync(unreadableRoot, 0o700);

    if (curator.runtime === "claude") {
      const boundaryFixture = makeFixture(temp, curator, "boundary");
      const boundarySource = writeFixture(
        path.join(boundaryFixture.repo, "..rules", "CLAUDE.md"),
        "# Dot-prefixed in-repo child\n",
      );
      const boundaryResult = runBackup(script, curator.backupArgs(boundaryFixture, []));
      const boundary = validateManifest(curator, boundaryResult, "legacy", [boundarySource]);
      if (boundary?.manifest.files[0]?.destination !== "files/..rules/CLAUDE.md") {
        fail(`${scriptRelative}: boundary-safe containment must retain an in-repo '..rules' child`);
      }

      const collisionFixture = makeFixture(temp, curator, "collision");
      writeFixture(
        path.join(collisionFixture.repo, "user-claude-home", "CLAUDE.md"),
        "# Project collision\n",
      );
      writeFixture(path.join(collisionFixture.runtimeHome, "CLAUDE.md"), "# User collision\n");
      const collision = runBackup(script, curator.backupArgs(collisionFixture, []));
      if (collision.status === 0 || !collision.stderr.includes("destination collision")) {
        fail(`${scriptRelative}: lossy destination collision must fail during preflight`);
      }
      if (backupRoots(curator, collisionFixture).length !== 0) {
        fail(`${scriptRelative}: collision preflight must run before backup-root creation`);
      }
    }

    if (curator.runtime === "cursor") {
      const boundaryFixture = makeFixture(temp, curator, "boundary");
      const prefixBank = path.join(temp, "boundary", "bank");
      const actualBank = path.join(temp, "boundary", "bank-other");
      fs.mkdirSync(prefixBank, { recursive: true });
      const boundarySource = writeFixture(path.join(actualBank, "context.md"), "# Memory bank\n");
      const boundaryResult = runBackup(script, [
        "--repo",
        boundaryFixture.repo,
        "--backup-root",
        boundaryFixture.backupRoot,
        "--backup-root-alias",
        boundaryFixture.backupRootAlias,
        "--memory-bank",
        prefixBank,
        "--memory-bank",
        actualBank,
      ]);
      const boundary = validateManifest(curator, boundaryResult, "legacy", [boundarySource]);
      if (
        boundary?.manifest.files[0]?.destination !==
        "files/external-memory-bank/002-bank-other/context.md"
      ) {
        fail(`${scriptRelative}: sibling path prefixes must not satisfy memory-bank containment`);
      }

      const collisionFixture = makeFixture(temp, curator, "collision");
      const collisionBank = path.join(temp, "collision", "bank");
      writeFixture(path.join(collisionBank, "AGENTS.md"), "# External collision\n");
      writeFixture(
        path.join(collisionFixture.repo, "external-memory-bank", "001-bank", "AGENTS.md"),
        "# Project collision\n",
      );
      const collision = runBackup(script, [
        "--repo",
        collisionFixture.repo,
        "--backup-root",
        collisionFixture.backupRoot,
        "--backup-root-alias",
        collisionFixture.backupRootAlias,
        "--memory-bank",
        collisionBank,
      ]);
      if (collision.status === 0 || !collision.stderr.includes("destination collision")) {
        fail(`${scriptRelative}: lossy destination collision must fail during preflight`);
      }
      if (backupRoots(curator, collisionFixture).length !== 0) {
        fail(`${scriptRelative}: collision preflight must run before backup-root creation`);
      }
    }
  } finally {
    fs.rmSync(temp, { force: true, recursive: true });
  }
}

const requiredEvalCases = [
  "explicit-start-selection.md",
  "implicit-selection-no-start.md",
  "agent-initiated-review-boundary.md",
  "direct-cleanup-boundary.md",
  "backup-manifest-reconciliation.md",
  "file-persistence-failure.md",
  "plan-mode-lifecycle.md",
];

for (const curator of curators) {
  const skillRelative = path.join(curator.dir, "SKILL.md");
  const skill = read(skillRelative);
  const selection = section(skill, "Workflow selection");
  const routeRows = [...selection.matchAll(/^\|\s+`([^`]+)`(?:\s+\(Recommended\))?\s+\|/gm)].map(
    (match) => match[1],
  );
  if (routeRows.join("\n") !== workflows.join("\n")) {
    fail(`${skillRelative}: workflow table must use the canonical eight-route order`);
  }
  if (!selection.includes("`plan-run-cleanup-file` is always first and Recommended")) {
    fail(`${skillRelative}: plan-run-cleanup-file must be first and always Recommended`);
  }
  if (/\| `auto`/.test(selection)) fail(`${skillRelative}: recursive auto workflow is forbidden`);
  for (const marker of [
    "Explicit cleanup without a delivery preference selects `plan-run-cleanup-file`",
    "Agent-initiated activation may select only a relevant read-only route",
    "If selection is unambiguous, announce it and proceed",
    "If it is ambiguous, stop before inventory and ask",
    "Direct cleanup (`cleanup-chat` or `cleanup-file`) is limited to high-confidence atomic",
    "native Plan mode",
    "Do not ask a generic second cleanup question after plan approval",
    "Review`, `Plan`, `Execution Receipt`, `Deferred Work`, `Backup`, and `Verification",
    "Manifest reconciliation and unmatched paths",
    "New paths (`created-no-preimage`) and rollback",
    "Backup mode and manifest path",
    "Backup integrity result",
    "Unredacted backup payloads and manifests stay outside Git worktrees",
    "--backup-root",
    "Explicit --backup-root requires a stable non-sensitive --backup-root-alias",
    "script-reported portable storage locator",
    "<storage-locator>/backup-manifest.json",
    "exact absolute backup and manifest paths only in non-persisted chat",
    "load and follow [`assets/review-report-template.md`](assets/review-report-template.md)",
    "| Changed path | Backup destination | Bytes | SHA-256 | Verification |",
    "every symlink path component",
    "traversal error fails before root creation",
    `<repo>/.agent-reports/${curator.runtime}-memory-curation/`,
    `Do not invoke \`${curator.runtime}-spec-interviewer\` inside this curation workflow`,
    "[--include PATH ...]",
  ]) {
    if (!skill.includes(marker))
      fail(`${skillRelative}: missing contract marker ${JSON.stringify(marker)}`);
  }
  if (
    curator.runtime === "codex" &&
    !skill.includes("backup-memories.mjs [--repo PATH] [--codex-home PATH]")
  ) {
    fail(`${skillRelative}: Codex backup CLI must expose the target-repository boundary`);
  }
  const embeddedReportHeadings = [
    "## Review",
    "## Plan",
    "## Execution Receipt",
    "## Deferred Work",
    "## Backup",
    "## Verification",
  ].filter((heading) => skill.includes(heading));
  if (skill.includes("Memory Curation Record") || embeddedReportHeadings.length >= 3) {
    fail(`${skillRelative}: runtime contract must link the report asset without embedding it`);
  }
  const version = skill.match(/\n  version: "([^"]+)"/)?.[1];
  if (version !== "0.2.0")
    fail(`${skillRelative}: expected version 0.2.0; found ${version ?? "none"}`);

  const report = read(path.join(curator.dir, "assets", "review-report-template.md"));
  for (const heading of [
    "Review",
    "Plan",
    "Execution Receipt",
    "Deferred Work",
    "Backup",
    "Verification",
  ]) {
    if (!report.includes(`## ${heading}`)) {
      fail(`${path.join(curator.dir, "assets", "review-report-template.md")}: missing ${heading}`);
    }
  }
  for (const marker of [
    "Manifest reconciliation and unmatched paths",
    "Portable storage locator (`user-state/.../<backup-id>` or `external-root/<alias>/<backup-id>`)",
    "Portable manifest locator (`<storage-locator>/backup-manifest.json`)",
    "manifest-relative backup destinations",
    "non-persisted chat",
    "Manifest file count / changed-file match count",
    "Backup integrity result",
    "Storage policy / root safety (`outside-git-worktree`)",
    "created-no-preimage",
    "| Changed path | Backup destination | Bytes | SHA-256 | Verification |",
  ]) {
    if (!report.includes(marker)) {
      fail(
        `${path.join(curator.dir, "assets", "review-report-template.md")}: missing receipt marker ${JSON.stringify(marker)}`,
      );
    }
  }

  const expectedShapeRelative = path.join(
    "skill-evals",
    curator.name,
    "expected",
    "report-shape.md",
  );
  if (fs.existsSync(path.join(root, expectedShapeRelative))) {
    const expectedShape = read(expectedShapeRelative);
    for (const marker of [
      "Manifest reconciliation and unmatched paths",
      "New paths (`created-no-preimage`) and rollback",
      "Portable storage locator (`user-state/.../<backup-id>` or `external-root/<alias>/<backup-id>`)",
      "portable manifest locator (`<storage-locator>/backup-manifest.json`)",
      "manifest-relative",
      "Backup integrity result",
      "Storage policy / root safety (`outside-git-worktree`)",
      "| Changed path | Backup destination | Bytes | SHA-256 | Verification |",
    ]) {
      if (!expectedShape.includes(marker)) {
        fail(`${expectedShapeRelative}: missing receipt marker ${JSON.stringify(marker)}`);
      }
    }
  }

  const cleanupPlanRelative = path.join(curator.dir, "assets", "cleanup-plan-template.md");
  const cleanupPlan = read(cleanupPlanRelative);
  for (const marker of [
    "exact",
    "backup-manifest.json",
    "outside-git-worktree",
    "manifest-relative",
    "backup-root-alias",
    "script-reported",
    "Every pre-existing changed file",
    "created-no-preimage",
  ]) {
    if (!cleanupPlan.includes(marker)) {
      fail(`${cleanupPlanRelative}: missing backup-plan marker ${JSON.stringify(marker)}`);
    }
  }
  if (curator.runtime === "codex") {
    if (!cleanupPlan.includes('"unknown_schema_action": "defer_without_writing"')) {
      fail(
        `${cleanupPlanRelative}: unknown schemas must use an explicit defer-without-write action`,
      );
    }
    for (const file of filesBelow(path.join(root, curator.dir))) {
      if (fs.readFileSync(file, "utf8").includes("write_proposed_file_when_schema_unknown")) {
        fail(`${path.relative(root, file)}: stale unknown-schema write flag is forbidden`);
      }
    }
  }

  const safeEditingRelative = path.join(curator.dir, "references", "safe-editing-procedure.md");
  const safeEditing = read(safeEditingRelative);
  if (!safeEditing.includes("--include PATH")) {
    fail(`${safeEditingRelative}: exact include backup command is missing`);
  }
  for (const marker of [
    "exact mode",
    "zero includes",
    "backup-manifest.json",
    "Reconcile",
    "created-no-preimage",
    "symlink",
    "row's exact `source`",
    "copied `destination`",
    "file preimage only",
    "restored size and SHA-256",
    "--backup-root PATH",
    "outside Git worktrees",
    "XDG_STATE_HOME",
    "script-reported",
    "<storage-locator>/backup-manifest.json",
    "--backup-root-alias NAME",
    "manifest-relative destinations",
    "exact absolute backup and manifest paths only in non-persisted chat",
  ]) {
    if (!safeEditing.includes(marker)) {
      fail(`${safeEditingRelative}: missing manifest-safety marker ${JSON.stringify(marker)}`);
    }
  }
  if (safeEditing.includes("restore the changed file or directory from the backup path")) {
    fail(`${safeEditingRelative}: ambiguous file-or-directory recovery contract remains`);
  }
  if (
    curator.runtime === "codex" &&
    (!safeEditing.includes("outside the resolved `<codex-home>/memories` source tree") ||
      !safeEditing.includes("before legacy discovery can recursively include backup content"))
  ) {
    fail(
      `${safeEditingRelative}: Codex recovery guidance must forbid backup roots inside the physical memories tree`,
    );
  }
  if (/safe cleanup now|\.proposed\.md/.test(safeEditing)) {
    fail(`${safeEditingRelative}: obsolete second-approval or sibling-proposal contract remains`);
  }

  const evalRoot = path.join("skill-evals", curator.name);
  const evalReadme = read(path.join(evalRoot, "README.md"));
  const rubric = read(path.join(evalRoot, "rubric.md"));
  for (const evalCase of requiredEvalCases) {
    const relative = path.join(evalRoot, "cases", evalCase);
    const value = read(relative);
    if (!evalReadme.includes(`cases/${evalCase}`)) {
      fail(`${path.join(evalRoot, "README.md")}: missing cases/${evalCase} inventory entry`);
    }
    if (!value.includes("## Expected Behavior")) {
      fail(`${relative}: missing Expected Behavior`);
    }
    if (
      evalCase === "backup-manifest-reconciliation.md" &&
      (!value.includes("silently omitting") ||
        !value.includes("symlinked parent") ||
        !value.includes("exact manifest `source`/`destination` row") ||
        !value.includes("unsafe `--backup-root`") ||
        !value.includes("before root creation or copying") ||
        !value.includes("script-reported") ||
        !value.includes("storage locator") ||
        !value.includes("stable non-sensitive alias") ||
        (curator.runtime === "codex" &&
          (!value.includes("physical Codex memories tree") ||
            !value.includes("cannot recursively re-include"))))
    ) {
      fail(`${relative}: missing fail-closed symlink or manifest-row recovery expectation`);
    }
  }
  for (const marker of [
    "all eight workflows",
    "agent-initiated",
    "exact changed file",
    "backup-manifest.json",
    "Reconciles every pre-existing changed file",
    "Restores only file preimages from their exact manifest rows",
    "outside every Git worktree",
    "portable storage locator",
    "stable non-sensitive aliases",
  ]) {
    if (!rubric.includes(marker)) fail(`${path.join(evalRoot, "rubric.md")}: missing ${marker}`);
  }
  if (
    curator.runtime === "codex" &&
    (!rubric.includes("outside the physical Codex memories tree") ||
      !rubric.includes("recursive re-inclusion"))
  ) {
    fail(`${path.join(evalRoot, "rubric.md")}: missing physical source-root separation contract`);
  }

  if (curator.openAi) {
    const metadataRelative = path.join(curator.dir, "agents", "openai.yaml");
    const metadata = read(metadataRelative);
    if (!metadata.includes("all eight workflows") || !metadata.includes("plan-run-cleanup-file")) {
      fail(`${metadataRelative}: default prompt must expose the canonical selector`);
    }
  }

  await runBackupContract(curator);
}

if (errors.length > 0) {
  console.error("Memory curator validation failed:");
  for (const error of new Set(errors)) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  "Memory curators validated: 3 skills, 8 workflows, external-root exact/legacy no-clobber manifest fixtures.",
);
