import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  assertExactPublicSkillSet,
  copyGitCandidateRepository,
  fingerprintGitCandidateRepository,
  listGitCandidatePaths,
} from "./smoke-install-contract.mjs";

function runGit(arguments_, cwd) {
  const result = spawnSync("git", arguments_, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.equal(
    result.status,
    0,
    `git ${arguments_.join(" ")} failed: ${result.stderr || result.stdout}`,
  );
}

function gitOutput(arguments_, cwd) {
  const result = spawnSync("git", arguments_, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.equal(
    result.status,
    0,
    `git ${arguments_.join(" ")} failed: ${result.stderr || result.stdout}`,
  );
  return result.stdout;
}

function writeFixtureFile(root, relativePath, contents) {
  const target = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

function cliListOutput(names) {
  return [
    "\u001B[32m◇\u001B[39m  Found \u001B[32m" + names.length + "\u001B[39m skills",
    "\u001B[32m◇\u001B[39m  \u001B[1mAvailable Skills\u001B[22m",
    "│",
    ...names.flatMap((name) => [
      "│    \u001B[36m" + name + "\u001B[39m",
      "│",
      "│      Description",
    ]),
    "│",
    "└  Use --skill <name> to install specific skills",
  ].join("\r\n");
}

function assertNoCleanCopyArtifacts(tmpRoot, destinationRoot) {
  assert.equal(fs.existsSync(destinationRoot), false);
  assert.deepEqual(
    fs
      .readdirSync(tmpRoot)
      .filter((name) => name.startsWith(`.${path.basename(destinationRoot)}-`)),
    [],
  );
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "smoke-install-contract-test-"));

try {
  const repositoryRoot = path.join(tmpRoot, "source");
  const destinationRoot = path.join(tmpRoot, "copy");
  fs.mkdirSync(repositoryRoot, { recursive: true });
  runGit(["init", "--quiet"], repositoryRoot);

  writeFixtureFile(
    repositoryRoot,
    ".gitignore",
    [".claude/", "docs/specs/do-not-publish/*", "node_modules/", "build/", "temp/", ""].join("\n"),
  );
  writeFixtureFile(repositoryRoot, "skills/public-skill/SKILL.md", "name: public-skill\n");
  writeFixtureFile(repositoryRoot, "candidate-note.md", "candidate\n");
  writeFixtureFile(repositoryRoot, ".claude/private.md", "private\n");
  writeFixtureFile(repositoryRoot, "docs/specs/do-not-publish/private.md", "private spec\n");
  writeFixtureFile(repositoryRoot, "node_modules/private-package/index.js", "private package\n");
  writeFixtureFile(repositoryRoot, "build/generated.js", "generated\n");
  writeFixtureFile(repositoryRoot, "temp/transient.txt", "transient\n");
  for (const candidatePath of [".gitignore", "candidate-note.md", "skills/public-skill/SKILL.md"]) {
    fs.chmodSync(path.join(repositoryRoot, ...candidatePath.split("/")), 0o644);
  }
  runGit(["add", ".gitignore", "skills/public-skill/SKILL.md"], repositoryRoot);

  const outsideSecret = path.join(tmpRoot, "outside-secret");
  fs.mkdirSync(outsideSecret);
  fs.writeFileSync(path.join(outsideSecret, "secret.txt"), "must not be followed\n");
  fs.symlinkSync(
    outsideSecret,
    path.join(repositoryRoot, ".claude", "private-link"),
    process.platform === "win32" ? "junction" : "dir",
  );

  const candidatePaths = listGitCandidatePaths(repositoryRoot);
  assert.deepEqual(candidatePaths, [
    ".gitignore",
    "candidate-note.md",
    "skills/public-skill/SKILL.md",
  ]);

  const statusBeforeFingerprint = gitOutput(
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    repositoryRoot,
  );
  const indexBeforeFingerprint = fs.readFileSync(path.join(repositoryRoot, ".git", "index"));
  const firstFingerprint = fingerprintGitCandidateRepository(repositoryRoot);
  const repeatedFingerprint = fingerprintGitCandidateRepository(repositoryRoot);
  assert.deepEqual(repeatedFingerprint, firstFingerprint);
  assert.equal(firstFingerprint.algorithm, "sha256");
  assert.match(firstFingerprint.digest, /^[a-f0-9]{64}$/);
  assert.equal(firstFingerprint.fileCount, candidatePaths.length);
  assert.deepEqual(firstFingerprint.candidatePaths, candidatePaths);
  assert.equal(
    gitOutput(["status", "--porcelain=v1", "-z", "--untracked-files=all"], repositoryRoot),
    statusBeforeFingerprint,
  );
  assert.deepEqual(
    fs.readFileSync(path.join(repositoryRoot, ".git", "index")),
    indexBeforeFingerprint,
  );

  const descriptorFailureRepositoryRoot = path.join(tmpRoot, "descriptor-failure-source");
  fs.mkdirSync(descriptorFailureRepositoryRoot, { recursive: true });
  runGit(["init", "--quiet"], descriptorFailureRepositoryRoot);
  writeFixtureFile(descriptorFailureRepositoryRoot, "victim.txt", "descriptor failure bytes\n");
  runGit(["add", "victim.txt"], descriptorFailureRepositoryRoot);

  const originalReadFileSync = fs.readFileSync;
  const originalCloseSync = fs.closeSync;
  const primaryReadFailure = new Error("synthetic candidate read failure");
  const concurrentCloseFailure = new Error("synthetic descriptor close failure");
  const readDescriptors = [];
  const concurrentlyClosedDescriptors = [];
  let combinedDescriptorFailure;
  try {
    fs.readFileSync = (target, ...arguments_) => {
      if (typeof target === "number") {
        readDescriptors.push(target);
        throw primaryReadFailure;
      }
      return originalReadFileSync(target, ...arguments_);
    };
    fs.closeSync = (descriptor) => {
      concurrentlyClosedDescriptors.push(descriptor);
      originalCloseSync(descriptor);
      throw concurrentCloseFailure;
    };
    try {
      fingerprintGitCandidateRepository(descriptorFailureRepositoryRoot);
    } catch (error) {
      combinedDescriptorFailure = error;
    }
  } finally {
    fs.readFileSync = originalReadFileSync;
    fs.closeSync = originalCloseSync;
  }
  assert.ok(combinedDescriptorFailure instanceof AggregateError);
  assert.equal(
    combinedDescriptorFailure.message,
    "Clean-copy candidate snapshot and descriptor close both failed: victim.txt",
  );
  assert.deepEqual(combinedDescriptorFailure.errors, [primaryReadFailure, concurrentCloseFailure]);
  assert.equal(combinedDescriptorFailure.cause, primaryReadFailure);
  assert.equal(readDescriptors.length, 1);
  assert.deepEqual(concurrentlyClosedDescriptors, readDescriptors);
  assert.throws(() => fs.fstatSync(readDescriptors[0]), { code: "EBADF" });

  const closeOnlyFailure = new Error("synthetic close-only failure");
  const closeOnlyDescriptors = [];
  let observedCloseOnlyFailure;
  try {
    fs.closeSync = (descriptor) => {
      closeOnlyDescriptors.push(descriptor);
      originalCloseSync(descriptor);
      throw closeOnlyFailure;
    };
    try {
      fingerprintGitCandidateRepository(descriptorFailureRepositoryRoot);
    } catch (error) {
      observedCloseOnlyFailure = error;
    }
  } finally {
    fs.closeSync = originalCloseSync;
  }
  assert.equal(observedCloseOnlyFailure, closeOnlyFailure);
  assert.equal(closeOnlyDescriptors.length, 1);
  assert.throws(() => fs.fstatSync(closeOnlyDescriptors[0]), { code: "EBADF" });

  const restrictiveUmaskDestinationRoot = path.join(tmpRoot, "restrictive-umask-copy");
  const restrictiveUmaskFailureDestinationRoot = path.join(
    tmpRoot,
    "restrictive-umask-failure-copy",
  );
  const previousUmask = process.umask(0o777);
  let restrictiveUmaskFailureHookCount = 0;
  try {
    assert.deepEqual(fingerprintGitCandidateRepository(repositoryRoot), firstFingerprint);
    assert.deepEqual(
      copyGitCandidateRepository(repositoryRoot, restrictiveUmaskDestinationRoot),
      firstFingerprint,
    );
    assert.equal(fs.statSync(restrictiveUmaskDestinationRoot).mode & 0o777, 0o700);
    assert.equal(
      fs.statSync(path.join(restrictiveUmaskDestinationRoot, "skills")).mode & 0o777,
      0o700,
    );
    assert.equal(
      fs.statSync(path.join(restrictiveUmaskDestinationRoot, "skills", "public-skill")).mode &
        0o777,
      0o700,
    );
    assert.equal(
      fs.statSync(path.join(restrictiveUmaskDestinationRoot, "skills", "public-skill", "SKILL.md"))
        .mode & 0o777,
      0o644,
    );
    assert.equal(
      fs.readFileSync(
        path.join(restrictiveUmaskDestinationRoot, "skills", "public-skill", "SKILL.md"),
        "utf8",
      ),
      "name: public-skill\n",
    );
    assert.deepEqual(
      fs
        .readdirSync(tmpRoot)
        .filter((name) => name.startsWith(`.${path.basename(restrictiveUmaskDestinationRoot)}-`)),
      [],
    );
    fs.rmSync(restrictiveUmaskDestinationRoot, { force: true, recursive: true });

    assert.throws(
      () =>
        copyGitCandidateRepository(repositoryRoot, restrictiveUmaskFailureDestinationRoot, {
          testOnlyOnSnapshotEvent({ stage }) {
            if (stage !== "after-destination-publication" || restrictiveUmaskFailureHookCount > 0) {
              return;
            }
            restrictiveUmaskFailureHookCount += 1;
            throw new Error("synthetic restrictive-umask publication failure");
          },
        }),
      /synthetic restrictive-umask publication failure/,
    );
    assert.equal(restrictiveUmaskFailureHookCount, 1);
    assertNoCleanCopyArtifacts(tmpRoot, restrictiveUmaskFailureDestinationRoot);
  } finally {
    process.umask(previousUmask);
    for (const artifactRoot of [
      restrictiveUmaskDestinationRoot,
      restrictiveUmaskFailureDestinationRoot,
      ...fs
        .readdirSync(tmpRoot)
        .filter(
          (name) =>
            name.startsWith(`.${path.basename(restrictiveUmaskDestinationRoot)}-`) ||
            name.startsWith(`.${path.basename(restrictiveUmaskFailureDestinationRoot)}-`),
        )
        .map((name) => path.join(tmpRoot, name)),
    ]) {
      if (!fs.existsSync(artifactRoot)) continue;
      fs.chmodSync(artifactRoot, 0o700);
      fs.rmSync(artifactRoot, { force: true, recursive: true });
    }
  }

  const copyResult = copyGitCandidateRepository(repositoryRoot, destinationRoot);
  assert.deepEqual(copyResult, firstFingerprint);
  assert.equal(
    fs.readFileSync(path.join(destinationRoot, "candidate-note.md"), "utf8"),
    "candidate\n",
  );
  assert.equal(
    fs.readFileSync(path.join(destinationRoot, "skills", "public-skill", "SKILL.md"), "utf8"),
    "name: public-skill\n",
  );
  for (const excluded of [
    ".git",
    ".claude/private.md",
    ".claude/private-link",
    "docs/specs/do-not-publish/private.md",
    "node_modules/private-package/index.js",
    "build/generated.js",
    "temp/transient.txt",
  ]) {
    assert.equal(
      fs.existsSync(path.join(destinationRoot, ...excluded.split("/"))),
      false,
      excluded,
    );
  }

  writeFixtureFile(repositoryRoot, "candidate-note.md", "changed candidate contents\n");
  const contentChangedFingerprint = fingerprintGitCandidateRepository(repositoryRoot);
  assert.notEqual(contentChangedFingerprint.digest, firstFingerprint.digest);
  writeFixtureFile(repositoryRoot, "candidate-note.md", "candidate\n");
  fs.chmodSync(path.join(repositoryRoot, "candidate-note.md"), 0o755);
  const modeChangedFingerprint = fingerprintGitCandidateRepository(repositoryRoot);
  assert.notEqual(modeChangedFingerprint.digest, firstFingerprint.digest);
  fs.chmodSync(path.join(repositoryRoot, "candidate-note.md"), 0o644);
  fs.renameSync(
    path.join(repositoryRoot, "candidate-note.md"),
    path.join(repositoryRoot, "renamed-note.md"),
  );
  const pathChangedFingerprint = fingerprintGitCandidateRepository(repositoryRoot);
  assert.notEqual(pathChangedFingerprint.digest, firstFingerprint.digest);
  fs.renameSync(
    path.join(repositoryRoot, "renamed-note.md"),
    path.join(repositoryRoot, "candidate-note.md"),
  );
  writeFixtureFile(repositoryRoot, "additional-candidate.txt", "additional\n");
  const candidateSetChangedFingerprint = fingerprintGitCandidateRepository(repositoryRoot);
  assert.notEqual(candidateSetChangedFingerprint.digest, firstFingerprint.digest);
  fs.rmSync(path.join(repositoryRoot, "additional-candidate.txt"));
  assert.deepEqual(fingerprintGitCandidateRepository(repositoryRoot), firstFingerprint);

  const reverseCreationRepositoryRoot = path.join(tmpRoot, "reverse-creation-source");
  fs.mkdirSync(reverseCreationRepositoryRoot, { recursive: true });
  runGit(["init", "--quiet"], reverseCreationRepositoryRoot);
  writeFixtureFile(
    reverseCreationRepositoryRoot,
    "skills/public-skill/SKILL.md",
    "name: public-skill\n",
  );
  writeFixtureFile(reverseCreationRepositoryRoot, "candidate-note.md", "candidate\n");
  writeFixtureFile(
    reverseCreationRepositoryRoot,
    ".gitignore",
    [".claude/", "docs/specs/do-not-publish/*", "node_modules/", "build/", "temp/", ""].join("\n"),
  );
  for (const candidatePath of [...candidatePaths].reverse()) {
    fs.chmodSync(path.join(reverseCreationRepositoryRoot, ...candidatePath.split("/")), 0o644);
  }
  runGit(["add", ".gitignore", "skills/public-skill/SKILL.md"], reverseCreationRepositoryRoot);
  assert.deepEqual(
    fingerprintGitCandidateRepository(reverseCreationRepositoryRoot),
    firstFingerprint,
  );

  const ambientSourceRepositoryRoot = path.join(tmpRoot, "ambient-source");
  const ambientDecoyRepositoryRoot = path.join(tmpRoot, "ambient-decoy");
  const ambientDestinationRoot = path.join(tmpRoot, "ambient-copy");
  const ambientHomeRoot = path.join(tmpRoot, "ambient-home");
  const ambientXdgRoot = path.join(tmpRoot, "ambient-xdg");
  const ambientIgnoreFile = path.join(tmpRoot, "ambient-ignore");
  const ambientSystemConfig = path.join(tmpRoot, "ambient-system.gitconfig");
  for (const fixtureRoot of [ambientSourceRepositoryRoot, ambientDecoyRepositoryRoot]) {
    fs.mkdirSync(fixtureRoot, { recursive: true });
    runGit(["init", "--quiet"], fixtureRoot);
    writeFixtureFile(fixtureRoot, "safe.txt", "shared safe bytes\n");
  }
  writeFixtureFile(
    ambientSourceRepositoryRoot,
    "omitted-secret.txt",
    "requested repository bytes\n",
  );
  writeFixtureFile(ambientSourceRepositoryRoot, "ambient-hidden.txt", "ambient visible bytes\n");
  runGit(["add", "safe.txt", "omitted-secret.txt"], ambientSourceRepositoryRoot);
  runGit(["add", "safe.txt"], ambientDecoyRepositoryRoot);
  const ambientBaseline = fingerprintGitCandidateRepository(ambientSourceRepositoryRoot);
  assert.deepEqual(ambientBaseline.candidatePaths, [
    "ambient-hidden.txt",
    "omitted-secret.txt",
    "safe.txt",
  ]);

  fs.writeFileSync(ambientIgnoreFile, "ambient-hidden.txt\n", "utf8");
  const ambientConfig = `[core]\n\texcludesFile = ${ambientIgnoreFile.split(path.sep).join("/")}\n`;
  writeFixtureFile(ambientHomeRoot, ".gitconfig", ambientConfig);
  writeFixtureFile(ambientXdgRoot, "git/config", ambientConfig);
  fs.writeFileSync(ambientSystemConfig, ambientConfig, "utf8");

  const gitSteeringEnvironment = {
    GIT_ALTERNATE_OBJECT_DIRECTORIES: path.join(ambientDecoyRepositoryRoot, ".git", "objects"),
    GIT_CEILING_DIRECTORIES: tmpRoot,
    GIT_COMMON_DIR: path.join(ambientDecoyRepositoryRoot, ".git"),
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "core.worktree",
    GIT_CONFIG_VALUE_0: ambientDecoyRepositoryRoot,
    GIT_CONFIG_GLOBAL: path.join(ambientHomeRoot, ".gitconfig"),
    GIT_CONFIG_NOSYSTEM: "0",
    GIT_CONFIG_SYSTEM: ambientSystemConfig,
    GIT_DIR: path.join(ambientDecoyRepositoryRoot, ".git"),
    GIT_INDEX_FILE: path.join(ambientDecoyRepositoryRoot, ".git", "index"),
    GIT_OBJECT_DIRECTORY: path.join(ambientDecoyRepositoryRoot, ".git", "objects"),
    GIT_WORK_TREE: ambientDecoyRepositoryRoot,
    HOME: ambientHomeRoot,
    XDG_CONFIG_HOME: ambientXdgRoot,
  };
  const previousGitEnvironment = new Map(
    Object.keys(gitSteeringEnvironment).map((name) => [name, process.env[name]]),
  );
  try {
    Object.assign(process.env, gitSteeringEnvironment);
    assert.deepEqual(listGitCandidatePaths(ambientSourceRepositoryRoot), [
      "ambient-hidden.txt",
      "omitted-secret.txt",
      "safe.txt",
    ]);
    assert.deepEqual(
      fingerprintGitCandidateRepository(ambientSourceRepositoryRoot),
      ambientBaseline,
    );
    assert.deepEqual(
      copyGitCandidateRepository(ambientSourceRepositoryRoot, ambientDestinationRoot),
      ambientBaseline,
    );
    assert.equal(
      fs.readFileSync(path.join(ambientDestinationRoot, "ambient-hidden.txt"), "utf8"),
      "ambient visible bytes\n",
    );
    assert.equal(
      fs.readFileSync(path.join(ambientDestinationRoot, "omitted-secret.txt"), "utf8"),
      "requested repository bytes\n",
    );
    assert.equal(
      fs.readFileSync(path.join(ambientDestinationRoot, "safe.txt"), "utf8"),
      "shared safe bytes\n",
    );
    assert.deepEqual(
      fs
        .readdirSync(tmpRoot)
        .filter((name) => name.startsWith(`.${path.basename(ambientDestinationRoot)}-`)),
      [],
    );
  } finally {
    for (const [name, value] of previousGitEnvironment) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }

  const publicationRepositoryRoot = path.join(tmpRoot, "publication-source");
  fs.mkdirSync(publicationRepositoryRoot, { recursive: true });
  runGit(["init", "--quiet"], publicationRepositoryRoot);
  writeFixtureFile(publicationRepositoryRoot, "candidate.txt", "candidate publication bytes\n");
  writeFixtureFile(publicationRepositoryRoot, "nested/second.txt", "second publication bytes\n");
  runGit(["add", "candidate.txt", "nested/second.txt"], publicationRepositoryRoot);

  const atomicDestinationRoot = path.join(tmpRoot, "atomic-copy");
  const publicationStages = [];
  let atomicStagingRoot;
  let publicationRenameCount = 0;
  const originalRenameSync = fs.renameSync;
  try {
    fs.renameSync = (source, destination) => {
      if (destination === atomicDestinationRoot) {
        publicationRenameCount += 1;
        assert.equal(source, atomicStagingRoot);
        assert.equal(path.dirname(source), path.dirname(destination));
        assert.equal(fs.existsSync(destination), false);
        assert.equal(
          fs.readFileSync(path.join(source, "candidate.txt"), "utf8"),
          "candidate publication bytes\n",
        );
        assert.equal(
          fs.readFileSync(path.join(source, "nested", "second.txt"), "utf8"),
          "second publication bytes\n",
        );
      }
      return originalRenameSync(source, destination);
    };

    copyGitCandidateRepository(publicationRepositoryRoot, atomicDestinationRoot, {
      testOnlyOnSnapshotEvent({ source, stage, stagingRoot }) {
        if (stage === "before-destination-publication") {
          publicationStages.push(stage);
          atomicStagingRoot = stagingRoot;
          assert.equal(source, atomicDestinationRoot);
          assert.equal(fs.existsSync(atomicDestinationRoot), false);
          assert.equal(
            fs.readFileSync(path.join(stagingRoot, "candidate.txt"), "utf8"),
            "candidate publication bytes\n",
          );
          assert.equal(
            fs.readFileSync(path.join(stagingRoot, "nested", "second.txt"), "utf8"),
            "second publication bytes\n",
          );
        }
        if (stage === "after-destination-publication") {
          publicationStages.push(stage);
          assert.equal(source, atomicDestinationRoot);
          assert.equal(fs.existsSync(stagingRoot), false);
          assert.equal(
            fs.readFileSync(path.join(source, "candidate.txt"), "utf8"),
            "candidate publication bytes\n",
          );
          assert.equal(
            fs.readFileSync(path.join(source, "nested", "second.txt"), "utf8"),
            "second publication bytes\n",
          );
        }
      },
    });
  } finally {
    fs.renameSync = originalRenameSync;
  }
  assert.equal(publicationRenameCount, 1);
  assert.deepEqual(publicationStages, [
    "before-destination-publication",
    "after-destination-publication",
  ]);
  assert.deepEqual(
    fs
      .readdirSync(tmpRoot)
      .filter((name) => name.startsWith(`.${path.basename(atomicDestinationRoot)}-`)),
    [],
  );

  const nonPrivateParentRoot = path.join(tmpRoot, "non-private-parent");
  const nonPrivateDestinationRoot = path.join(nonPrivateParentRoot, "copy");
  fs.mkdirSync(nonPrivateParentRoot, { mode: 0o755 });
  fs.chmodSync(nonPrivateParentRoot, 0o755);
  assert.throws(
    () => copyGitCandidateRepository(publicationRepositoryRoot, nonPrivateDestinationRoot),
    /Clean-copy destination parent must have mode 0700/,
  );
  assert.equal(fs.existsSync(nonPrivateDestinationRoot), false);
  assert.deepEqual(
    fs.readdirSync(nonPrivateParentRoot).filter((name) => name.startsWith(".copy-")),
    [],
  );

  const swappedParentRoot = path.join(tmpRoot, "swapped-private-parent");
  const parkedSwappedParentRoot = path.join(tmpRoot, "swapped-private-parent-parked");
  const swappedParentDestinationRoot = path.join(swappedParentRoot, "copy");
  fs.mkdirSync(swappedParentRoot, { mode: 0o700 });
  fs.chmodSync(swappedParentRoot, 0o700);
  let swappedParentHookCount = 0;
  let publicationParentWasSwapped = false;
  try {
    assert.throws(
      () =>
        copyGitCandidateRepository(publicationRepositoryRoot, swappedParentDestinationRoot, {
          testOnlyOnSnapshotEvent({ stage }) {
            if (stage !== "before-destination-publication" || swappedParentHookCount > 0) return;
            swappedParentHookCount += 1;
            fs.renameSync(swappedParentRoot, parkedSwappedParentRoot);
            fs.symlinkSync(
              parkedSwappedParentRoot,
              swappedParentRoot,
              process.platform === "win32" ? "junction" : "dir",
            );
            publicationParentWasSwapped = true;
          },
        }),
      /Clean-copy destination parent changed/,
    );
  } finally {
    if (publicationParentWasSwapped) {
      fs.unlinkSync(swappedParentRoot);
      fs.renameSync(parkedSwappedParentRoot, swappedParentRoot);
    }
  }
  assert.equal(swappedParentHookCount, 1);
  assert.equal(fs.existsSync(swappedParentDestinationRoot), false);
  for (const entry of fs
    .readdirSync(swappedParentRoot)
    .filter((name) => name.startsWith(".copy-"))) {
    fs.rmSync(path.join(swappedParentRoot, entry), { force: true, recursive: true });
  }

  const competitorDestinationRoot = path.join(tmpRoot, "competitor-copy");
  const competitorBytes = Buffer.from("competitor survives\n", "utf8");
  let competitorHookCount = 0;
  let competitorFileIdentity;
  assert.throws(
    () =>
      copyGitCandidateRepository(publicationRepositoryRoot, competitorDestinationRoot, {
        testOnlyOnSnapshotEvent({ stage, stagingRoot }) {
          if (stage !== "before-destination-publication" || competitorHookCount > 0) return;
          competitorHookCount += 1;
          assert.equal(fs.existsSync(competitorDestinationRoot), false);
          assert.equal(
            fs.readFileSync(path.join(stagingRoot, "candidate.txt"), "utf8"),
            "candidate publication bytes\n",
          );
          assert.equal(
            fs.readFileSync(path.join(stagingRoot, "nested", "second.txt"), "utf8"),
            "second publication bytes\n",
          );
          fs.mkdirSync(competitorDestinationRoot, { mode: 0o700 });
          const competitorFile = path.join(competitorDestinationRoot, "competitor.txt");
          fs.writeFileSync(competitorFile, competitorBytes);
          competitorFileIdentity = fs.lstatSync(competitorFile, { bigint: true });
        },
      }),
    /Clean-copy destination already exists/,
  );
  assert.equal(competitorHookCount, 1);
  const survivingCompetitorFile = path.join(competitorDestinationRoot, "competitor.txt");
  assert.deepEqual(fs.readFileSync(survivingCompetitorFile), competitorBytes);
  const survivingCompetitorIdentity = fs.lstatSync(survivingCompetitorFile, { bigint: true });
  assert.deepEqual(
    {
      device: survivingCompetitorIdentity.dev,
      inode: survivingCompetitorIdentity.ino,
      mode: survivingCompetitorIdentity.mode,
      size: survivingCompetitorIdentity.size,
    },
    {
      device: competitorFileIdentity.dev,
      inode: competitorFileIdentity.ino,
      mode: competitorFileIdentity.mode,
      size: competitorFileIdentity.size,
    },
  );
  assert.deepEqual(fs.readdirSync(competitorDestinationRoot), ["competitor.txt"]);
  assert.equal(fs.existsSync(path.join(competitorDestinationRoot, "candidate.txt")), false);
  assert.equal(fs.existsSync(path.join(competitorDestinationRoot, "nested")), false);
  assert.deepEqual(
    fs
      .readdirSync(tmpRoot)
      .filter((name) => name.startsWith(`.${path.basename(competitorDestinationRoot)}-`)),
    [],
  );

  const prePublicationFailureDestinationRoot = path.join(tmpRoot, "pre-publication-failure-copy");
  const prePublicationUnrelatedRoot = path.join(tmpRoot, "pre-publication-unrelated");
  const prePublicationPrimaryFailure = new Error("synthetic pre-publication primary failure");
  const prePublicationCleanupFailure = new Error("synthetic pre-publication cleanup failure");
  const originalRmSync = fs.rmSync;
  let prePublicationCleanupHookCount = 0;
  let prePublicationFailureHookCount = 0;
  let observedPrePublicationFailure;
  writeFixtureFile(prePublicationUnrelatedRoot, "custody.txt", "unrelated custody survives\n");
  try {
    try {
      copyGitCandidateRepository(publicationRepositoryRoot, prePublicationFailureDestinationRoot, {
        testOnlyOnSnapshotEvent({ stage, stagingRoot }) {
          if (stage !== "before-destination-publication" || prePublicationFailureHookCount > 0) {
            return;
          }
          prePublicationFailureHookCount += 1;
          assert.equal(fs.existsSync(prePublicationFailureDestinationRoot), false);
          assert.equal(
            fs.readFileSync(path.join(stagingRoot, "candidate.txt"), "utf8"),
            "candidate publication bytes\n",
          );
          fs.rmSync = (target, options) => {
            const result = originalRmSync(target, options);
            if (target === stagingRoot && prePublicationCleanupHookCount === 0) {
              prePublicationCleanupHookCount += 1;
              throw prePublicationCleanupFailure;
            }
            return result;
          };
          throw prePublicationPrimaryFailure;
        },
      });
    } catch (error) {
      observedPrePublicationFailure = error;
    }
  } finally {
    fs.rmSync = originalRmSync;
  }
  assert.equal(observedPrePublicationFailure, prePublicationPrimaryFailure);
  assert.equal(prePublicationFailureHookCount, 1);
  assert.equal(prePublicationCleanupHookCount, 1);
  assertNoCleanCopyArtifacts(tmpRoot, prePublicationFailureDestinationRoot);
  assert.equal(
    fs.readFileSync(path.join(prePublicationUnrelatedRoot, "custody.txt"), "utf8"),
    "unrelated custody survives\n",
  );

  const publicationFailureDestinationRoot = path.join(tmpRoot, "publication-failure-copy");
  const publicationPrimaryFailure = new Error("synthetic post-publication failure");
  let hiddenPublicationCleanupCount = 0;
  let observedPublicationFailure;
  let publicationFailureStagingRoot;
  let publicationFailureHookCount = 0;
  let unpublicationRenameCount = 0;
  try {
    fs.renameSync = (source, destination) => {
      if (source === publicationFailureDestinationRoot) {
        unpublicationRenameCount += 1;
        assert.equal(destination, publicationFailureStagingRoot);
        assert.equal(path.dirname(source), path.dirname(destination));
        assert.equal(fs.existsSync(destination), false);
        assert.equal(
          fs.readFileSync(path.join(source, "candidate.txt"), "utf8"),
          "candidate publication bytes\n",
        );
        assert.equal(
          fs.readFileSync(path.join(source, "nested", "second.txt"), "utf8"),
          "second publication bytes\n",
        );
        const result = originalRenameSync(source, destination);
        assert.equal(fs.existsSync(source), false);
        assert.equal(
          fs.readFileSync(path.join(destination, "candidate.txt"), "utf8"),
          "candidate publication bytes\n",
        );
        assert.equal(
          fs.readFileSync(path.join(destination, "nested", "second.txt"), "utf8"),
          "second publication bytes\n",
        );
        return result;
      }
      return originalRenameSync(source, destination);
    };
    fs.rmSync = (target, options) => {
      if (target === publicationFailureStagingRoot) {
        hiddenPublicationCleanupCount += 1;
        assert.equal(fs.existsSync(publicationFailureDestinationRoot), false);
        assert.equal(
          fs.readFileSync(path.join(target, "candidate.txt"), "utf8"),
          "candidate publication bytes\n",
        );
        assert.equal(
          fs.readFileSync(path.join(target, "nested", "second.txt"), "utf8"),
          "second publication bytes\n",
        );
      }
      return originalRmSync(target, options);
    };
    try {
      copyGitCandidateRepository(publicationRepositoryRoot, publicationFailureDestinationRoot, {
        testOnlyOnSnapshotEvent({ source, stage, stagingRoot }) {
          if (stage !== "after-destination-publication" || publicationFailureHookCount > 0) return;
          publicationFailureHookCount += 1;
          publicationFailureStagingRoot = stagingRoot;
          assert.equal(source, publicationFailureDestinationRoot);
          assert.equal(fs.existsSync(stagingRoot), false);
          assert.equal(
            fs.readFileSync(path.join(source, "candidate.txt"), "utf8"),
            "candidate publication bytes\n",
          );
          assert.equal(
            fs.readFileSync(path.join(source, "nested", "second.txt"), "utf8"),
            "second publication bytes\n",
          );
          throw publicationPrimaryFailure;
        },
      });
    } catch (error) {
      observedPublicationFailure = error;
    }
  } finally {
    fs.renameSync = originalRenameSync;
    fs.rmSync = originalRmSync;
  }
  assert.equal(observedPublicationFailure, publicationPrimaryFailure);
  assert.equal(publicationFailureHookCount, 1);
  assert.equal(unpublicationRenameCount, 1);
  assert.equal(hiddenPublicationCleanupCount, 1);
  assertNoCleanCopyArtifacts(tmpRoot, publicationFailureDestinationRoot);

  const replacedPublicationDestinationRoot = path.join(tmpRoot, "replaced-publication-copy");
  const parkedPublicationDestinationRoot = path.join(tmpRoot, "replaced-publication-owned-parked");
  const replacementCompetitorBytes = Buffer.from("replacement competitor survives\n", "utf8");
  const replacedPublicationPrimaryFailure = new Error("synthetic replaced-publication failure");
  let replacementCompetitorIdentity;
  let replacedPublicationHookCount = 0;
  let observedReplacedPublicationFailure;
  try {
    copyGitCandidateRepository(publicationRepositoryRoot, replacedPublicationDestinationRoot, {
      testOnlyOnSnapshotEvent({ source, stage, stagingRoot }) {
        if (stage !== "after-destination-publication" || replacedPublicationHookCount > 0) return;
        replacedPublicationHookCount += 1;
        assert.equal(source, replacedPublicationDestinationRoot);
        assert.equal(fs.existsSync(stagingRoot), false);
        assert.equal(
          fs.readFileSync(path.join(source, "nested", "second.txt"), "utf8"),
          "second publication bytes\n",
        );
        fs.renameSync(replacedPublicationDestinationRoot, parkedPublicationDestinationRoot);
        fs.mkdirSync(replacedPublicationDestinationRoot, { mode: 0o700 });
        const competitorFile = path.join(replacedPublicationDestinationRoot, "competitor.txt");
        fs.writeFileSync(competitorFile, replacementCompetitorBytes);
        replacementCompetitorIdentity = fs.lstatSync(competitorFile, { bigint: true });
        throw replacedPublicationPrimaryFailure;
      },
    });
  } catch (error) {
    observedReplacedPublicationFailure = error;
  }
  assert.equal(observedReplacedPublicationFailure, replacedPublicationPrimaryFailure);
  assert.equal(replacedPublicationHookCount, 1);
  const replacementCompetitorFile = path.join(replacedPublicationDestinationRoot, "competitor.txt");
  assert.deepEqual(fs.readFileSync(replacementCompetitorFile), replacementCompetitorBytes);
  const survivingReplacementIdentity = fs.lstatSync(replacementCompetitorFile, { bigint: true });
  assert.deepEqual(
    {
      device: survivingReplacementIdentity.dev,
      inode: survivingReplacementIdentity.ino,
      mode: survivingReplacementIdentity.mode,
      size: survivingReplacementIdentity.size,
    },
    {
      device: replacementCompetitorIdentity.dev,
      inode: replacementCompetitorIdentity.ino,
      mode: replacementCompetitorIdentity.mode,
      size: replacementCompetitorIdentity.size,
    },
  );
  assert.deepEqual(fs.readdirSync(replacedPublicationDestinationRoot), ["competitor.txt"]);
  assert.equal(
    fs.readFileSync(path.join(parkedPublicationDestinationRoot, "candidate.txt"), "utf8"),
    "candidate publication bytes\n",
  );
  assert.equal(
    fs.readFileSync(path.join(parkedPublicationDestinationRoot, "nested", "second.txt"), "utf8"),
    "second publication bytes\n",
  );
  assert.deepEqual(
    fs
      .readdirSync(tmpRoot)
      .filter((name) => name.startsWith(`.${path.basename(replacedPublicationDestinationRoot)}-`)),
    [],
  );

  for (const operation of ["fingerprint", "copy"]) {
    const sameInodeRepositoryRoot = path.join(tmpRoot, `same-inode-${operation}-source`);
    const sameInodeDestinationRoot = path.join(tmpRoot, `same-inode-${operation}-copy`);
    fs.mkdirSync(sameInodeRepositoryRoot, { recursive: true });
    runGit(["init", "--quiet"], sameInodeRepositoryRoot);
    writeFixtureFile(sameInodeRepositoryRoot, "victim.txt", "original bytes\n");
    runGit(["add", "victim.txt"], sameInodeRepositoryRoot);

    let sameInodeHookCount = 0;
    const options = {
      testOnlyOnSnapshotEvent({ candidatePath, pass, source, stage }) {
        if (stage !== "before-pre-open" || pass !== "forward" || candidatePath !== "victim.txt") {
          return;
        }
        sameInodeHookCount += 1;
        const before = fs.lstatSync(source, { bigint: true });
        fs.appendFileSync(source, "same-inode mutation\n");
        const after = fs.lstatSync(source, { bigint: true });
        assert.equal(after.dev, before.dev);
        assert.equal(after.ino, before.ino);
        assert.notEqual(after.size, before.size);
      },
    };
    const invoke =
      operation === "fingerprint"
        ? () => fingerprintGitCandidateRepository(sameInodeRepositoryRoot, options)
        : () =>
            copyGitCandidateRepository(sameInodeRepositoryRoot, sameInodeDestinationRoot, options);
    assert.throws(invoke, /changed before opening for snapshot: victim\.txt/);
    assert.equal(sameInodeHookCount, 1);
    if (operation === "copy") {
      assertNoCleanCopyArtifacts(tmpRoot, sameInodeDestinationRoot);
    }
  }

  for (const operation of ["fingerprint", "copy"]) {
    const openRaceRepositoryRoot = path.join(tmpRoot, `open-race-${operation}-source`);
    const openRaceDestinationRoot = path.join(tmpRoot, `open-race-${operation}-copy`);
    fs.mkdirSync(openRaceRepositoryRoot, { recursive: true });
    runGit(["init", "--quiet"], openRaceRepositoryRoot);
    writeFixtureFile(openRaceRepositoryRoot, "victim.txt", "open-race bytes\n");
    runGit(["add", "victim.txt"], openRaceRepositoryRoot);

    let openRaceHookCount = 0;
    const options = {
      testOnlyBeforeCandidateOpen({ candidatePath, source }) {
        if (candidatePath !== "victim.txt" || openRaceHookCount > 0) return;
        openRaceHookCount += 1;
        const before = fs.lstatSync(source, { bigint: true });
        fs.appendFileSync(source, "same-inode lstat-to-open mutation\n");
        const after = fs.lstatSync(source, { bigint: true });
        assert.equal(after.dev, before.dev);
        assert.equal(after.ino, before.ino);
        assert.notEqual(after.size, before.size);
      },
    };
    const invoke =
      operation === "fingerprint"
        ? () => fingerprintGitCandidateRepository(openRaceRepositoryRoot, options)
        : () =>
            copyGitCandidateRepository(openRaceRepositoryRoot, openRaceDestinationRoot, options);
    assert.throws(invoke, /changed while opening for snapshot: victim\.txt/);
    assert.equal(openRaceHookCount, 1);
    if (operation === "copy") {
      assertNoCleanCopyArtifacts(tmpRoot, openRaceDestinationRoot);
    }
  }

  for (const operation of ["fingerprint", "copy"]) {
    const postReadRepositoryRoot = path.join(tmpRoot, `post-read-${operation}-source`);
    const postReadDestinationRoot = path.join(tmpRoot, `post-read-${operation}-copy`);
    fs.mkdirSync(postReadRepositoryRoot, { recursive: true });
    runGit(["init", "--quiet"], postReadRepositoryRoot);
    writeFixtureFile(postReadRepositoryRoot, "victim.txt", "post-read bytes\n");
    runGit(["add", "victim.txt"], postReadRepositoryRoot);

    let postReadHookCount = 0;
    const options = {
      testOnlyOnSnapshotEvent({ candidatePath, pass, phase, source, stage }) {
        if (
          stage !== "after-read" ||
          pass !== "forward" ||
          phase !== "capture" ||
          candidatePath !== "victim.txt" ||
          postReadHookCount > 0
        ) {
          return;
        }
        postReadHookCount += 1;
        const before = fs.lstatSync(source, { bigint: true });
        fs.appendFileSync(source, "same-inode post-read mutation\n");
        const after = fs.lstatSync(source, { bigint: true });
        assert.equal(after.dev, before.dev);
        assert.equal(after.ino, before.ino);
        assert.notEqual(after.size, before.size);
      },
    };
    const invoke =
      operation === "fingerprint"
        ? () => fingerprintGitCandidateRepository(postReadRepositoryRoot, options)
        : () =>
            copyGitCandidateRepository(postReadRepositoryRoot, postReadDestinationRoot, options);
    assert.throws(invoke, /path changed after reading: victim\.txt/);
    assert.equal(postReadHookCount, 1);
    if (operation === "copy") {
      assertNoCleanCopyArtifacts(tmpRoot, postReadDestinationRoot);
    }
  }

  for (const operation of ["fingerprint", "copy"]) {
    const parentSwapRepositoryRoot = path.join(tmpRoot, `parent-swap-${operation}-source`);
    const parentSwapDestinationRoot = path.join(tmpRoot, `parent-swap-${operation}-copy`);
    const parkedParent = path.join(tmpRoot, `parent-swap-${operation}-parked`);
    fs.mkdirSync(parentSwapRepositoryRoot, { recursive: true });
    runGit(["init", "--quiet"], parentSwapRepositoryRoot);
    writeFixtureFile(parentSwapRepositoryRoot, "nested/victim.txt", "stable victim bytes\n");
    runGit(["add", "nested/victim.txt"], parentSwapRepositoryRoot);

    let parentSwapHookCount = 0;
    let parentWasSwapped = false;
    const options = {
      testOnlyBeforeCandidateOpen({ candidatePath, source }) {
        if (candidatePath !== "nested/victim.txt" || parentSwapHookCount > 0) return;
        parentSwapHookCount += 1;
        const before = fs.lstatSync(source, { bigint: true });
        const sourceParent = path.dirname(source);
        fs.renameSync(sourceParent, parkedParent);
        fs.symlinkSync(
          parkedParent,
          sourceParent,
          process.platform === "win32" ? "junction" : "dir",
        );
        parentWasSwapped = true;
        const after = fs.lstatSync(source, { bigint: true });
        assert.equal(after.dev, before.dev);
        assert.equal(after.ino, before.ino);
      },
    };
    const invoke =
      operation === "fingerprint"
        ? () => fingerprintGitCandidateRepository(parentSwapRepositoryRoot, options)
        : () =>
            copyGitCandidateRepository(
              parentSwapRepositoryRoot,
              parentSwapDestinationRoot,
              options,
            );
    try {
      assert.throws(invoke, /symbolic link.*nested|path changed after reading.*victim\.txt/i);
    } finally {
      if (parentWasSwapped) {
        fs.unlinkSync(path.join(parentSwapRepositoryRoot, "nested"));
        fs.renameSync(parkedParent, path.join(parentSwapRepositoryRoot, "nested"));
      }
    }
    assert.equal(parentSwapHookCount, 1);
    if (operation === "copy") {
      assertNoCleanCopyArtifacts(tmpRoot, parentSwapDestinationRoot);
    }
  }

  for (const operation of ["fingerprint", "copy"]) {
    const rootChainContainer = path.join(tmpRoot, `root-chain-${operation}-container`);
    const parkedRootChainContainer = path.join(tmpRoot, `root-chain-${operation}-container-parked`);
    const rootChainRepositoryRoot = path.join(rootChainContainer, "repository");
    const rootChainDestinationRoot = path.join(tmpRoot, `root-chain-${operation}-copy`);
    fs.mkdirSync(rootChainRepositoryRoot, { recursive: true });
    runGit(["init", "--quiet"], rootChainRepositoryRoot);
    writeFixtureFile(rootChainRepositoryRoot, "victim.txt", "root-chain victim\n");
    runGit(["add", "victim.txt"], rootChainRepositoryRoot);

    let rootChainHookCount = 0;
    let rootChainWasSwapped = false;
    const options = {
      testOnlyBeforeCandidateOpen({ candidatePath, source }) {
        if (candidatePath !== "victim.txt" || rootChainHookCount > 0) return;
        rootChainHookCount += 1;
        const rootBefore = fs.lstatSync(rootChainRepositoryRoot, { bigint: true });
        const leafBefore = fs.lstatSync(source, { bigint: true });
        fs.renameSync(rootChainContainer, parkedRootChainContainer);
        fs.symlinkSync(
          parkedRootChainContainer,
          rootChainContainer,
          process.platform === "win32" ? "junction" : "dir",
        );
        rootChainWasSwapped = true;
        const rootAfter = fs.lstatSync(rootChainRepositoryRoot, { bigint: true });
        const leafAfter = fs.lstatSync(source, { bigint: true });
        assert.equal(rootAfter.dev, rootBefore.dev);
        assert.equal(rootAfter.ino, rootBefore.ino);
        assert.equal(leafAfter.dev, leafBefore.dev);
        assert.equal(leafAfter.ino, leafBefore.ino);
      },
    };
    const invoke =
      operation === "fingerprint"
        ? () => fingerprintGitCandidateRepository(rootChainRepositoryRoot, options)
        : () =>
            copyGitCandidateRepository(rootChainRepositoryRoot, rootChainDestinationRoot, options);
    try {
      assert.throws(
        invoke,
        /repository root identity chain.*symbolic link|candidate path changed.*victim\.txt/i,
      );
    } finally {
      if (rootChainWasSwapped) {
        fs.unlinkSync(rootChainContainer);
        fs.renameSync(parkedRootChainContainer, rootChainContainer);
      }
    }
    assert.equal(rootChainHookCount, 1);
    if (operation === "copy") {
      assertNoCleanCopyArtifacts(tmpRoot, rootChainDestinationRoot);
    }
  }

  for (const operation of ["fingerprint", "copy"]) {
    const crossCandidateRepositoryRoot = path.join(tmpRoot, `cross-candidate-${operation}-source`);
    const crossCandidateDestinationRoot = path.join(tmpRoot, `cross-candidate-${operation}-copy`);
    fs.mkdirSync(crossCandidateRepositoryRoot, { recursive: true });
    runGit(["init", "--quiet"], crossCandidateRepositoryRoot);
    writeFixtureFile(crossCandidateRepositoryRoot, "a-victim.txt", "candidate A\n");
    writeFixtureFile(crossCandidateRepositoryRoot, "z-trigger.txt", "candidate B\n");
    runGit(["add", "a-victim.txt", "z-trigger.txt"], crossCandidateRepositoryRoot);

    let crossCandidateHookCount = 0;
    const options = {
      testOnlyOnSnapshotEvent({ candidatePath, pass, stage }) {
        if (
          stage !== "after-read" ||
          pass !== "forward" ||
          candidatePath !== "z-trigger.txt" ||
          crossCandidateHookCount > 0
        ) {
          return;
        }
        crossCandidateHookCount += 1;
        const victim = path.join(crossCandidateRepositoryRoot, "a-victim.txt");
        const before = fs.lstatSync(victim, { bigint: true });
        fs.appendFileSync(victim, "mutated while candidate B was read\n");
        const after = fs.lstatSync(victim, { bigint: true });
        assert.equal(after.dev, before.dev);
        assert.equal(after.ino, before.ino);
        assert.notEqual(after.size, before.size);
      },
    };
    const invoke =
      operation === "fingerprint"
        ? () => fingerprintGitCandidateRepository(crossCandidateRepositoryRoot, options)
        : () =>
            copyGitCandidateRepository(
              crossCandidateRepositoryRoot,
              crossCandidateDestinationRoot,
              options,
            );
    assert.throws(invoke, /changed.*a-victim\.txt/i);
    assert.equal(crossCandidateHookCount, 1);
    if (operation === "copy") {
      assertNoCleanCopyArtifacts(tmpRoot, crossCandidateDestinationRoot);
    }
  }

  const forwardSealRepositoryRoot = path.join(tmpRoot, "forward-seal-source");
  fs.mkdirSync(forwardSealRepositoryRoot, { recursive: true });
  runGit(["init", "--quiet"], forwardSealRepositoryRoot);
  writeFixtureFile(forwardSealRepositoryRoot, "a-victim.txt", "forward candidate A\n");
  writeFixtureFile(forwardSealRepositoryRoot, "z-trigger.txt", "forward candidate B\n");
  runGit(["add", "a-victim.txt", "z-trigger.txt"], forwardSealRepositoryRoot);
  const forwardSealOrder = [];
  let forwardSealHookCount = 0;
  assert.throws(
    () =>
      fingerprintGitCandidateRepository(forwardSealRepositoryRoot, {
        testOnlyOnSnapshotEvent({ candidatePath, pass, phase, stage }) {
          if (phase !== "seal" || pass !== "forward") return;
          if (stage === "before-pre-open") forwardSealOrder.push(candidatePath);
          if (
            stage === "after-read" &&
            candidatePath === "a-victim.txt" &&
            forwardSealHookCount === 0
          ) {
            forwardSealHookCount += 1;
            const trigger = path.join(forwardSealRepositoryRoot, "z-trigger.txt");
            const before = fs.lstatSync(trigger, { bigint: true });
            fs.appendFileSync(trigger, "mutated after forward A witness\n");
            const after = fs.lstatSync(trigger, { bigint: true });
            assert.equal(after.dev, before.dev);
            assert.equal(after.ino, before.ino);
            assert.notEqual(after.size, before.size);
          }
        },
      }),
    /changed before opening for snapshot: z-trigger\.txt/,
  );
  assert.equal(forwardSealHookCount, 1);
  assert.deepEqual(forwardSealOrder, ["a-victim.txt", "z-trigger.txt"]);

  for (const operation of ["fingerprint", "copy"]) {
    const reverseSealRepositoryRoot = path.join(tmpRoot, `reverse-seal-${operation}-source`);
    const reverseSealDestinationRoot = path.join(tmpRoot, `reverse-seal-${operation}-copy`);
    fs.mkdirSync(reverseSealRepositoryRoot, { recursive: true });
    runGit(["init", "--quiet"], reverseSealRepositoryRoot);
    writeFixtureFile(reverseSealRepositoryRoot, "a-victim.txt", "reverse candidate A\n");
    writeFixtureFile(reverseSealRepositoryRoot, "z-trigger.txt", "reverse candidate B\n");
    runGit(["add", "a-victim.txt", "z-trigger.txt"], reverseSealRepositoryRoot);

    let reverseSealHookCount = 0;
    const options = {
      testOnlyOnSnapshotEvent({ candidatePath, pass, phase, stage }) {
        if (
          stage !== "after-read" ||
          phase !== "seal" ||
          pass !== "reverse" ||
          candidatePath !== "z-trigger.txt" ||
          reverseSealHookCount > 0
        ) {
          return;
        }
        reverseSealHookCount += 1;
        const victim = path.join(reverseSealRepositoryRoot, "a-victim.txt");
        const before = fs.lstatSync(victim, { bigint: true });
        fs.appendFileSync(victim, "mutated after forward A witness\n");
        const after = fs.lstatSync(victim, { bigint: true });
        assert.equal(after.dev, before.dev);
        assert.equal(after.ino, before.ino);
        assert.notEqual(after.size, before.size);
      },
    };
    const invoke =
      operation === "fingerprint"
        ? () => fingerprintGitCandidateRepository(reverseSealRepositoryRoot, options)
        : () =>
            copyGitCandidateRepository(
              reverseSealRepositoryRoot,
              reverseSealDestinationRoot,
              options,
            );
    assert.throws(invoke, /changed before opening for snapshot: a-victim\.txt/);
    assert.equal(reverseSealHookCount, 1);
    if (operation === "copy") {
      assertNoCleanCopyArtifacts(tmpRoot, reverseSealDestinationRoot);
    }
  }

  const trackedDeletionRepositoryRoot = path.join(tmpRoot, "tracked-deletion-source");
  fs.mkdirSync(trackedDeletionRepositoryRoot, { recursive: true });
  runGit(["init", "--quiet"], trackedDeletionRepositoryRoot);
  writeFixtureFile(trackedDeletionRepositoryRoot, "tracked-deleted.txt", "indexed bytes\n");
  runGit(["add", "tracked-deleted.txt"], trackedDeletionRepositoryRoot);
  fs.rmSync(path.join(trackedDeletionRepositoryRoot, "tracked-deleted.txt"));
  assert.deepEqual(listGitCandidatePaths(trackedDeletionRepositoryRoot), ["tracked-deleted.txt"]);
  const stableTrackedDeletion = fingerprintGitCandidateRepository(trackedDeletionRepositoryRoot);
  assert.equal(stableTrackedDeletion.fileCount, 0);
  assert.deepEqual(stableTrackedDeletion.candidatePaths, []);

  for (const [operation, stage] of [
    ["fingerprint", "after-forward-capture"],
    ["copy", "after-reverse-witness"],
  ]) {
    const trackedDeletionDestinationRoot = path.join(tmpRoot, `tracked-deletion-${operation}-copy`);
    let trackedDeletionHookCount = 0;
    const options = {
      testOnlyOnSnapshotEvent(event) {
        if (event.stage !== stage || trackedDeletionHookCount > 0) return;
        trackedDeletionHookCount += 1;
        writeFixtureFile(
          trackedDeletionRepositoryRoot,
          "tracked-deleted.txt",
          "recreated materialized bytes\n",
        );
      },
    };
    const invoke =
      operation === "fingerprint"
        ? () => fingerprintGitCandidateRepository(trackedDeletionRepositoryRoot, options)
        : () =>
            copyGitCandidateRepository(
              trackedDeletionRepositoryRoot,
              trackedDeletionDestinationRoot,
              options,
            );
    assert.throws(invoke, /Git candidate set changed while capturing the repository/);
    assert.equal(trackedDeletionHookCount, 1);
    assert.deepEqual(listGitCandidatePaths(trackedDeletionRepositoryRoot), ["tracked-deleted.txt"]);
    fs.rmSync(path.join(trackedDeletionRepositoryRoot, "tracked-deleted.txt"));
    if (operation === "copy") {
      assertNoCleanCopyArtifacts(tmpRoot, trackedDeletionDestinationRoot);
    }
  }

  const initialSetSealRepositoryRoot = path.join(tmpRoot, "initial-set-seal-source");
  fs.mkdirSync(initialSetSealRepositoryRoot, { recursive: true });
  runGit(["init", "--quiet"], initialSetSealRepositoryRoot);
  writeFixtureFile(initialSetSealRepositoryRoot, "victim.txt", "set-seal victim\n");
  runGit(["add", "victim.txt"], initialSetSealRepositoryRoot);
  let initialSetSealHookCount = 0;
  assert.throws(
    () =>
      fingerprintGitCandidateRepository(initialSetSealRepositoryRoot, {
        testOnlyOnSnapshotEvent({ stage }) {
          if (stage !== "after-forward-capture" || initialSetSealHookCount > 0) return;
          initialSetSealHookCount += 1;
          writeFixtureFile(initialSetSealRepositoryRoot, "added-candidate.txt", "added\n");
        },
      }),
    /Git candidate set changed while capturing the repository/,
  );
  assert.equal(initialSetSealHookCount, 1);

  const finalSetSealRepositoryRoot = path.join(tmpRoot, "final-set-seal-source");
  const finalSetSealDestinationRoot = path.join(tmpRoot, "final-set-seal-copy");
  fs.mkdirSync(finalSetSealRepositoryRoot, { recursive: true });
  runGit(["init", "--quiet"], finalSetSealRepositoryRoot);
  writeFixtureFile(finalSetSealRepositoryRoot, "victim.txt", "final set-seal victim\n");
  runGit(["add", "victim.txt"], finalSetSealRepositoryRoot);
  let finalSetSealHookCount = 0;
  assert.throws(
    () =>
      copyGitCandidateRepository(finalSetSealRepositoryRoot, finalSetSealDestinationRoot, {
        testOnlyOnSnapshotEvent({ stage }) {
          if (stage !== "after-reverse-witness" || finalSetSealHookCount > 0) return;
          finalSetSealHookCount += 1;
          writeFixtureFile(finalSetSealRepositoryRoot, "late-candidate.txt", "late\n");
        },
      }),
    /Git candidate set changed while capturing the repository/,
  );
  assert.equal(finalSetSealHookCount, 1);
  assertNoCleanCopyArtifacts(tmpRoot, finalSetSealDestinationRoot);

  const finalRootContainer = path.join(tmpRoot, "final-root-container");
  const parkedFinalRootContainer = path.join(tmpRoot, "final-root-container-parked");
  const finalRootRepositoryRoot = path.join(finalRootContainer, "repository");
  fs.mkdirSync(finalRootRepositoryRoot, { recursive: true });
  runGit(["init", "--quiet"], finalRootRepositoryRoot);
  writeFixtureFile(finalRootRepositoryRoot, "victim.txt", "final root victim\n");
  runGit(["add", "victim.txt"], finalRootRepositoryRoot);
  let finalRootHookCount = 0;
  let finalRootWasSwapped = false;
  try {
    assert.throws(
      () =>
        fingerprintGitCandidateRepository(finalRootRepositoryRoot, {
          testOnlyOnSnapshotEvent({ stage }) {
            if (stage !== "after-reverse-witness" || finalRootHookCount > 0) return;
            finalRootHookCount += 1;
            fs.renameSync(finalRootContainer, parkedFinalRootContainer);
            fs.symlinkSync(
              parkedFinalRootContainer,
              finalRootContainer,
              process.platform === "win32" ? "junction" : "dir",
            );
            finalRootWasSwapped = true;
          },
        }),
      /repository root identity chain.*symbolic link/i,
    );
  } finally {
    if (finalRootWasSwapped) {
      fs.unlinkSync(finalRootContainer);
      fs.renameSync(parkedFinalRootContainer, finalRootContainer);
    }
  }
  assert.equal(finalRootHookCount, 1);

  for (const operation of ["fingerprint", "copy"]) {
    const finalLeafRepositoryRoot = path.join(tmpRoot, `final-leaf-${operation}-source`);
    const finalLeafDestinationRoot = path.join(tmpRoot, `final-leaf-${operation}-copy`);
    fs.mkdirSync(finalLeafRepositoryRoot, { recursive: true });
    runGit(["init", "--quiet"], finalLeafRepositoryRoot);
    writeFixtureFile(finalLeafRepositoryRoot, "victim.txt", "final leaf victim\n");
    runGit(["add", "victim.txt"], finalLeafRepositoryRoot);
    let finalLeafHookCount = 0;
    const options = {
      testOnlyOnSnapshotEvent({ stage }) {
        if (stage !== "after-reverse-witness" || finalLeafHookCount > 0) return;
        finalLeafHookCount += 1;
        const victim = path.join(finalLeafRepositoryRoot, "victim.txt");
        const before = fs.lstatSync(victim, { bigint: true });
        fs.appendFileSync(victim, "same-inode final-seal mutation\n");
        const after = fs.lstatSync(victim, { bigint: true });
        assert.equal(after.dev, before.dev);
        assert.equal(after.ino, before.ino);
        assert.notEqual(after.size, before.size);
      },
    };
    const invoke =
      operation === "fingerprint"
        ? () => fingerprintGitCandidateRepository(finalLeafRepositoryRoot, options)
        : () =>
            copyGitCandidateRepository(finalLeafRepositoryRoot, finalLeafDestinationRoot, options);
    assert.throws(invoke, /changed during Git-set seal: victim\.txt/);
    assert.equal(finalLeafHookCount, 1);
    if (operation === "copy") {
      assertNoCleanCopyArtifacts(tmpRoot, finalLeafDestinationRoot);
    }
  }

  const parentSymlinkRepositoryRoot = path.join(tmpRoot, "parent-symlink-source");
  const parentSymlinkDestinationRoot = path.join(tmpRoot, "parent-symlink-copy");
  const parentSymlinkOutsideRoot = path.join(tmpRoot, "parent-symlink-outside");
  fs.mkdirSync(parentSymlinkRepositoryRoot, { recursive: true });
  runGit(["init", "--quiet"], parentSymlinkRepositoryRoot);
  writeFixtureFile(parentSymlinkRepositoryRoot, "a-safe.txt", "safe candidate\n");
  writeFixtureFile(
    parentSymlinkRepositoryRoot,
    "tracked-parent/tracked.txt",
    "original tracked bytes\n",
  );
  runGit(["add", "a-safe.txt", "tracked-parent/tracked.txt"], parentSymlinkRepositoryRoot);
  writeFixtureFile(parentSymlinkRepositoryRoot, ".git/info/exclude", "tracked-parent\n");
  fs.mkdirSync(parentSymlinkOutsideRoot, { recursive: true });
  fs.writeFileSync(
    path.join(parentSymlinkOutsideRoot, "tracked.txt"),
    "external bytes must not be copied\n",
  );
  fs.rmSync(path.join(parentSymlinkRepositoryRoot, "tracked-parent"), {
    force: true,
    recursive: true,
  });
  fs.symlinkSync(
    parentSymlinkOutsideRoot,
    path.join(parentSymlinkRepositoryRoot, "tracked-parent"),
    process.platform === "win32" ? "junction" : "dir",
  );

  assert.deepEqual(listGitCandidatePaths(parentSymlinkRepositoryRoot), [
    "a-safe.txt",
    "tracked-parent/tracked.txt",
  ]);
  assert.throws(
    () => fingerprintGitCandidateRepository(parentSymlinkRepositoryRoot),
    /symbolic link.*tracked-parent/i,
  );
  assert.throws(
    () => copyGitCandidateRepository(parentSymlinkRepositoryRoot, parentSymlinkDestinationRoot),
    /symbolic link.*tracked-parent/i,
  );
  assert.equal(fs.existsSync(parentSymlinkDestinationRoot), false);
  assert.equal(
    fs.readFileSync(path.join(parentSymlinkOutsideRoot, "tracked.txt"), "utf8"),
    "external bytes must not be copied\n",
  );

  const leafSymlinkRepositoryRoot = path.join(tmpRoot, "leaf-symlink-source");
  const leafSymlinkDestinationRoot = path.join(tmpRoot, "leaf-symlink-copy");
  const leafSymlinkOutsideFile = path.join(tmpRoot, "leaf-symlink-outside.txt");
  fs.mkdirSync(leafSymlinkRepositoryRoot, { recursive: true });
  runGit(["init", "--quiet"], leafSymlinkRepositoryRoot);
  writeFixtureFile(leafSymlinkRepositoryRoot, "a-safe.txt", "safe candidate\n");
  writeFixtureFile(leafSymlinkRepositoryRoot, "tracked-link.txt", "original tracked bytes\n");
  runGit(["add", "a-safe.txt", "tracked-link.txt"], leafSymlinkRepositoryRoot);
  fs.writeFileSync(leafSymlinkOutsideFile, "external leaf bytes must not be copied\n");
  fs.rmSync(path.join(leafSymlinkRepositoryRoot, "tracked-link.txt"));
  fs.symlinkSync(leafSymlinkOutsideFile, path.join(leafSymlinkRepositoryRoot, "tracked-link.txt"));

  assert.deepEqual(listGitCandidatePaths(leafSymlinkRepositoryRoot), [
    "a-safe.txt",
    "tracked-link.txt",
  ]);
  assert.throws(
    () => fingerprintGitCandidateRepository(leafSymlinkRepositoryRoot),
    /symbolic link.*tracked-link\.txt/i,
  );
  assert.throws(
    () => copyGitCandidateRepository(leafSymlinkRepositoryRoot, leafSymlinkDestinationRoot),
    /symbolic link.*tracked-link\.txt/i,
  );
  assert.equal(fs.existsSync(leafSymlinkDestinationRoot), false);
  assert.equal(
    fs.readFileSync(leafSymlinkOutsideFile, "utf8"),
    "external leaf bytes must not be copied\n",
  );
  assert.equal(
    fs.lstatSync(path.join(leafSymlinkRepositoryRoot, "tracked-link.txt")).isSymbolicLink(),
    true,
  );

  const danglingSymlinkRepositoryRoot = path.join(tmpRoot, "dangling-symlink-source");
  const danglingSymlinkDestinationRoot = path.join(tmpRoot, "dangling-symlink-copy");
  fs.mkdirSync(danglingSymlinkRepositoryRoot, { recursive: true });
  runGit(["init", "--quiet"], danglingSymlinkRepositoryRoot);
  writeFixtureFile(danglingSymlinkRepositoryRoot, "tracked-dangling.txt", "original bytes\n");
  runGit(["add", "tracked-dangling.txt"], danglingSymlinkRepositoryRoot);
  fs.rmSync(path.join(danglingSymlinkRepositoryRoot, "tracked-dangling.txt"));
  fs.symlinkSync(
    path.join(tmpRoot, "missing-dangling-target.txt"),
    path.join(danglingSymlinkRepositoryRoot, "tracked-dangling.txt"),
  );
  assert.throws(
    () => fingerprintGitCandidateRepository(danglingSymlinkRepositoryRoot),
    /symbolic link.*tracked-dangling\.txt/i,
  );
  assert.throws(
    () => copyGitCandidateRepository(danglingSymlinkRepositoryRoot, danglingSymlinkDestinationRoot),
    /symbolic link.*tracked-dangling\.txt/i,
  );
  assertNoCleanCopyArtifacts(tmpRoot, danglingSymlinkDestinationRoot);

  let invalidUtf8FixtureStatus =
    " Invalid UTF-8 Git-path fixture skipped: required capability unavailable.";
  if (process.platform !== "win32") {
    const invalidUtf8RepositoryRoot = path.join(tmpRoot, "invalid-utf8-source");
    const invalidUtf8DestinationRoot = path.join(tmpRoot, "invalid-utf8-copy");
    fs.mkdirSync(invalidUtf8RepositoryRoot, { recursive: true });
    runGit(["init", "--quiet"], invalidUtf8RepositoryRoot);
    const invalidUtf8Name = Buffer.concat([
      Buffer.from("invalid-"),
      Buffer.from([0xff]),
      Buffer.from(".txt"),
    ]);
    const invalidUtf8Path = Buffer.concat([
      Buffer.from(invalidUtf8RepositoryRoot),
      Buffer.from(path.sep),
      invalidUtf8Name,
    ]);
    let supportsInvalidUtf8Path = false;
    try {
      fs.writeFileSync(invalidUtf8Path, "invalid path bytes\n");
      supportsInvalidUtf8Path = fs.existsSync(invalidUtf8Path);
    } catch (error) {
      if (!["EINVAL", "ENOTSUP"].includes(error?.code)) throw error;
    }
    if (supportsInvalidUtf8Path) {
      runGit(["add", "-A"], invalidUtf8RepositoryRoot);
      assert.throws(
        () => fingerprintGitCandidateRepository(invalidUtf8RepositoryRoot),
        /Git returned a candidate path that is not valid UTF-8/,
      );
      assert.throws(
        () => copyGitCandidateRepository(invalidUtf8RepositoryRoot, invalidUtf8DestinationRoot),
        /Git returned a candidate path that is not valid UTF-8/,
      );
      assertNoCleanCopyArtifacts(tmpRoot, invalidUtf8DestinationRoot);
      invalidUtf8FixtureStatus = " Invalid UTF-8 Git-path fixture executed.";
    }
  }

  const fifoCapabilityProbe = path.join(tmpRoot, "fifo-capability-probe");
  const hasRequiredOpenFlags =
    typeof fs.constants.O_NOFOLLOW === "number" && typeof fs.constants.O_NONBLOCK === "number";
  let hasMkfifoCapability = false;
  if (process.platform !== "win32" && hasRequiredOpenFlags) {
    const probe = spawnSync("mkfifo", [fifoCapabilityProbe], { encoding: "utf8" });
    hasMkfifoCapability =
      probe.status === 0 &&
      fs.existsSync(fifoCapabilityProbe) &&
      fs.lstatSync(fifoCapabilityProbe).isFIFO();
    if (fs.existsSync(fifoCapabilityProbe)) fs.rmSync(fifoCapabilityProbe);
  }
  let fifoFixtureStatus = " POSIX FIFO race fixture skipped: required capability unavailable.";
  if (process.platform !== "win32" && hasRequiredOpenFlags && hasMkfifoCapability) {
    const fifoRaceRepositoryRoot = path.join(tmpRoot, "fifo-race-source");
    const fifoRaceDestinationRoot = path.join(tmpRoot, "fifo-race-copy");
    const fifoRaceOutsideFile = path.join(tmpRoot, "fifo-race-outside.txt");
    fs.mkdirSync(fifoRaceRepositoryRoot, { recursive: true });
    runGit(["init", "--quiet"], fifoRaceRepositoryRoot);
    writeFixtureFile(fifoRaceRepositoryRoot, "a-safe.txt", "safe candidate before FIFO race\n");
    writeFixtureFile(fifoRaceRepositoryRoot, "tracked-fifo.txt", "original regular candidate\n");
    runGit(["add", "a-safe.txt", "tracked-fifo.txt"], fifoRaceRepositoryRoot);
    fs.writeFileSync(fifoRaceOutsideFile, "external FIFO bytes must not be copied\n");

    const fifoTarget = path.join(fifoRaceRepositoryRoot, "tracked-fifo.txt");
    const writer = spawn(
      process.execPath,
      [
        "-e",
        'setTimeout(() => { const fs = require("node:fs"); const payload = fs.readFileSync(process.argv[1]); const fd = fs.openSync(process.argv[2], "w"); fs.writeFileSync(fd, payload); fs.closeSync(fd); }, 2000);',
        fifoRaceOutsideFile,
        fifoTarget,
      ],
      { stdio: "ignore" },
    );
    let fifoHookFired = false;
    let fifoOpenFlagsObserved = 0;
    const fifoStartedAt = Date.now();
    try {
      assert.throws(
        () =>
          copyGitCandidateRepository(fifoRaceRepositoryRoot, fifoRaceDestinationRoot, {
            testOnlyBeforeCandidateOpen({ candidatePath, source }) {
              if (fifoHookFired || candidatePath !== "tracked-fifo.txt") return;
              fifoHookFired = true;
              fs.renameSync(source, `${source}.original`);
              const created = spawnSync("mkfifo", [source], { encoding: "utf8" });
              assert.equal(
                created.status,
                0,
                `mkfifo failed: ${created.stderr || created.error?.message || "unknown error"}`,
              );
              assert.equal(fs.lstatSync(source).isFIFO(), true);
            },
            testOnlyOnSnapshotEvent({ candidatePath, openFlags, stage }) {
              if (stage !== "before-open" || candidatePath !== "tracked-fifo.txt") return;
              fifoOpenFlagsObserved += 1;
              assert.equal(
                openFlags,
                fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK,
              );
            },
          }),
        /changed while opening for snapshot: tracked-fifo\.txt/,
      );
    } finally {
      if (writer.exitCode === null && writer.signalCode === null) writer.kill("SIGKILL");
    }
    const fifoElapsedMs = Date.now() - fifoStartedAt;
    assert.equal(fifoHookFired, true);
    assert.equal(fifoOpenFlagsObserved, 1);
    assert.ok(
      fifoElapsedMs < 1000,
      `FIFO candidate open did not fail promptly (${fifoElapsedMs}ms)`,
    );
    assert.equal(fs.existsSync(fifoRaceDestinationRoot), false);
    assert.equal(
      fs.readFileSync(fifoRaceOutsideFile, "utf8"),
      "external FIFO bytes must not be copied\n",
    );
    assert.deepEqual(
      fs
        .readdirSync(tmpRoot)
        .filter((name) => name.startsWith(`.${path.basename(fifoRaceDestinationRoot)}-`)),
      [],
    );
    fifoFixtureStatus = " POSIX FIFO race fixture executed.";
  }

  assert.deepEqual(
    assertExactPublicSkillSet(
      ["alpha-skill", "beta-skill"],
      cliListOutput(["alpha-skill", "beta-skill"]),
    ),
    ["alpha-skill", "beta-skill"],
  );
  assert.throws(
    () =>
      assertExactPublicSkillSet(
        ["alpha-skill", "beta-skill"],
        cliListOutput(["alpha-skill", "beta-skill", "unexpected-skill"]),
      ),
    /unexpected unexpected-skill/,
  );

  console.log(
    `Smoke-install clean-copy, fingerprint, and exact-list contract tests passed.${fifoFixtureStatus}${invalidUtf8FixtureStatus}`,
  );
} finally {
  fs.rmSync(tmpRoot, { force: true, recursive: true });
}
