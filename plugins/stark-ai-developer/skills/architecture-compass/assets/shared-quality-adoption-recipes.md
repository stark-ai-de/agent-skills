# Shared quality adoption recipes

> Derived, non-normative asset. The applicable canonical Long ADRs prevail if this example conflicts or drifts. Adapt source paths and CI ownership to the inspected target.

Use these non-normative recipes with [AC-ADR-069 Long](../references/ac-adr-069-require-shared-code-quality-with-explicit-toolchain-ownership.long.md) and its [installation/configuration Guide](../references/ac-adr-069-require-shared-code-quality-with-explicit-toolchain-ownership.guide.md). Select the authorized workflow first. `setup` records governance and the handoff; implementation uses an already-authorized `refactor`. `audit` remains read-only.

Contents: [Copyable setup prompt](#copyable-setup-prompt) · [New repository](#new-repository) · [Existing debt](#existing-repository-with-debt) · [Consumer wrapper](#minimal-baseline-wrapper) · [CI](#ci-and-rejecting-proof) · [Daily use](#daily-use) · [Updates and moves](#policy-updates-and-file-moves).

## Copyable setup prompt

For a new JavaScript/TypeScript repository, install Architecture Compass for your coding agent, open the target repository and submit this German prompt. It requests local governance setup followed by the authorized implementation. Follow the AC-ADR-069 Guide to resolve the newest stable npm release, qualify it and save exact provider/peer pins. For inherited debt, use the [existing-repository recipe](#existing-repository-with-debt).

```text
Nutze Architecture Compass, um die gemeinsame Codequalität in diesem Repository vollständig einzurichten.

Der Auftrag umfasst die passende lokale Governance und anschließend die technische Umsetzung.

- Lies AC-ADR-069 einschließlich Guide und die „Shared quality adoption recipes“.
- Prüfe Stack, Quellverzeichnisse, Tests, Hilfsskripte und vorhandene Prüfungen.
- Ermittle die neueste stabile npm-Veröffentlichung von `@servrox/code-quality` über den `latest`-Tag. Prüfe Kompatibilität und Paketmetadaten. Installiere diese Version mit den passenden exakten Peer-Versionen des Releases. Speichere konkrete Versionen und Lockfile; halte normale Installationen und CI reproduzierbar. Dokumentiere blockierte Updates, ohne Schutzvorgaben stillschweigend zu lockern.
- Erstelle die gemeinsame Oxlint- und Oxfmt-Konfiguration. Aktiviere Framework-Regeln nur für tatsächlich verwendete Frameworks und passende Dateien.
- Richte `quality:check` und `format:check` ein. Dokumentiere außerdem einen Befehl für die gezielte Diagnose bearbeiteter Dateien.
- Verankere den Arbeitsablauf in `AGENTS.md` beziehungsweise der vorhandenen Agentenanweisung: Regeln vor Änderungen beachten, bearbeitete Dateien zwischendurch prüfen, vor Abschluss vollständige Quality-, Format- und vorhandene Verhaltenstests ausführen.
- Integriere die Prüfungen verbindlich in die vorhandene CI.
- Erhalte Projektlaufzeit, Paketmanager, Typechecks und bestehende Tests.
- Führe für dieses neue Repository keine automatische Baseline ein. Behebe neue Regelverstöße.
- Weise in einer temporären Kopie nach, dass erlaubter Code besteht und ein echter Regelverstoß zuverlässig abgelehnt wird. Prüfe dabei auch die tatsächliche Quellabdeckung.

Setze die Einrichtung um. Berichte abschließend kurz: geänderte Dateien, installierte Versionen, verfügbare Befehle sowie getrennte lokale und CI-Ergebnisse.

Die Umstellung auf den gemeinsamen Provider-Runner bleibt im Backlog.
```

## New repository

1. Map the provider decision to accepted local governance. Inventory all maintained source, tests and helpers.
2. Resolve the newest stable npm release and qualify its exact provider/peer pins using the Guide. Create its shared Oxlint and Oxfmt configurations.
3. Keep the target's package manager, runtime, compiler and existing checks. The example below assumes a Node-owned JavaScript repository whose application source is `src`; the gate also includes its executable quality configs. Replace that scope with the complete inspected inventory.
4. Add these scripts to the existing manifest:

```json
{
  "scripts": {
    "quality:check": "oxlint --config oxlint.config.mjs --disable-nested-config src oxlint.config.mjs oxfmt.config.mjs",
    "format:check": "oxfmt --config oxfmt.config.mjs --check ."
  }
}
```

5. Run a clean frozen install, both commands and the target's compiler/behavior checks.
6. In a disposable copy, verify an allowed source file passes. Add a real forbidden expression such as `eval("1")` to a maintained source file and verify the quality command fails. Restore the file.
7. Make both commands unconditional required CI steps. Record the installed pin, actual scope, commands and local/hosted proof in the existing receipt.

No baseline is needed when the source passes the mandatory policy. Verify the expected application, test and helper files against the inspected inventory before claiming coverage. With the pinned Oxlint, this command can still exit successfully when `src` is missing or empty because the configuration files are scanned. Neither this command nor the minimal baseline wrapper enforces a target-specific expected-file inventory; a green configuration-only scan is not a successful source qualification.

## Existing repository with debt

1. Preserve the currently passing correctness, compiler, behavior and formatter gates.
2. Install and configure the shared policy as above. Run it before capturing allowances; inspect every diagnostic category and resolve uncountable syntax.
3. Select an immutable existing-source revision before this migration. Use the wrapper below for a minimal Node consumer. Adapt its source entries and baseline path; do not copy `agent-skills`' repository-specific contract assertions or Bun/CI assumptions.
4. Add `tools/quality.mjs` from the example and wire the commands:

```json
{
  "scripts": {
    "quality:check": "node tools/quality.mjs check",
    "quality:baseline:prune": "node tools/quality.mjs prune"
  }
}
```

5. Only within an explicitly approved initial migration, run `node tools/quality.mjs capture FULL_EXISTING_SOURCE_SHA`. Capture refuses an existing baseline, CI execution, findings on new paths and unclassified reports. Its path check does not prove that a finding predates the migration: inspect the source diff and approve only existing debt. Record the source revision, provider pin, lock/config identity, counts, owner, cleanup criteria and revisit trigger in the existing migration receipt.
6. Review the baseline together with source/config changes. Run the unchanged correctness gate, `pnpm run quality:check`, formatter and behavior checks.
7. Qualify the PR-base comparison and prune behavior below before enabling CI. Report adoption as partial until the baseline is empty or only approved bounded exceptions remain.

## Minimal baseline wrapper

This is consumer-owned example code, not an additional Compass runtime or an exported provider CLI. `check` is read-only; `capture` creates a new baseline; `prune` writes only retained or reduced allowances. Keep the gate and source inventory under review. The example uses existing public `/baseline` APIs and leaves their normalization and budget semantics upstream.

Save as `tools/quality.mjs`:

```js
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createBaseline, findRegressions, normalizeLint } from "@servrox/code-quality/baseline";

const roots = ["src", "tools/quality.mjs", "oxlint.config.mjs", "oxfmt.config.mjs"];
const baselinePath = "quality-baseline.json";
const options = { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024, timeout: 120_000 };

const run = (command, args) => {
  const result = spawnSync(command, args, options);

  assert.ifError(result.error);
  assert.equal(result.signal, null, `${command} was interrupted`);

  return result;
};

const git = (args) => {
  const result = run("git", args);

  assert.equal(result.status, 0, result.stderr);

  return result.stdout;
};

const collect = () => {
  const binary = fileURLToPath(new URL("../bin/oxlint", import.meta.resolve("oxlint")));

  const result = run("node", [
    binary,
    "--config",
    "oxlint.config.mjs",
    "--disable-nested-config",
    "--format=json",
    ...roots,
  ]);

  assert.ok([0, 1].includes(result.status), `Oxlint failed: ${result.stderr}`);

  let findings;

  try {
    findings = normalizeLint(JSON.parse(result.stdout));
  } catch (error) {
    throw new Error(
      `Invalid or unclassified Oxlint report: ${result.stderr || result.stdout.slice(0, 4000)}`,
      { cause: error },
    );
  }

  assert.ok(
    result.status === 0 || findings.length > 0,
    `Oxlint failed without findings: ${result.stderr}`,
  );

  return findings;
};

const checkHistory = (candidate) => {
  const base = process.env.QUALITY_BASE_SHA;

  if (!base) {
    return;
  }

  assert.match(base, /^[a-f\d]{40}$/u, "QUALITY_BASE_SHA must be a full commit SHA");

  const previousManifest = JSON.parse(git(["show", `${base}:package.json`]));
  const previous = run("git", ["show", `${base}:${baselinePath}`]);

  if (previous.status === 128) {
    assert.equal(
      previousManifest.devDependencies?.["@servrox/code-quality"],
      undefined,
      "An adopted repository must retain its baseline history",
    );

    return;
  }

  assert.equal(previous.status, 0, previous.stderr);
  findRegressions([], candidate);

  const allowances = Object.entries(candidate.entries).flatMap(([identity, values]) => {
    const [file, rule, message] = JSON.parse(identity);

    return values.map((value) => ({ file, rule, message, value }));
  });

  assert.equal(
    findRegressions(allowances, JSON.parse(previous.stdout)).length,
    0,
    "Committed allowances must not grow",
  );
};

const capture = (findings, base) => {
  assert.ok(!process.env.CI, "Initial capture is a reviewed local migration");
  assert.ok(!existsSync(baselinePath), "Capture cannot replace an existing baseline");
  assert.match(base ?? "", /^[a-f\d]{40}$/u, "Supply the full existing-source SHA");

  const existing = new Set(git(["ls-tree", "-r", "--name-only", "-z", base]).split("\0"));
  const baseline = createBaseline(findings.filter(({ file }) => existing.has(file)));

  assert.equal(
    findRegressions(findings, baseline).length,
    0,
    "New migration source receives no allowance",
  );
  writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, { flag: "wx" });
  console.log(
    `Captured existing-source allowances from ${base}; review the baseline and migration receipt.`,
  );
};

const [mode = "check", base, ...extra] = process.argv.slice(2);

assert.ok(["check", "prune", "capture"].includes(mode), "Use check, prune or capture");

assert.ok(
  extra.length === 0 && (mode === "capture" || base === undefined),
  "Only capture accepts a source SHA",
);

assert.ok(
  process.env.GITHUB_EVENT_NAME !== "pull_request" || process.env.QUALITY_BASE_SHA,
  "PR CI requires QUALITY_BASE_SHA",
);

const findings = collect();

if (mode === "capture") {
  capture(findings, base);
} else {
  const baseline = JSON.parse(readFileSync(baselinePath, "utf-8"));

  checkHistory(baseline);

  const regressions = findRegressions(findings, baseline);

  for (const finding of regressions) {
    console.error(
      `${finding.file}: ${finding.rule}: ${finding.message} (current ${finding.value}, allowed ${finding.allowed})`,
    );
  }

  assert.equal(regressions.length, 0, "Shared quality regression");

  if (mode === "prune") {
    writeFileSync(baselinePath, `${JSON.stringify(createBaseline(findings), null, 2)}\n`);
    console.log("Baseline pruned; review and commit it with the source fix.");
  } else {
    console.log(`Shared quality: ${findings.length} findings within reviewed allowances.`);
  }
}
```

## CI and rejecting proof

For GitHub PRs, retain the target's pinned setup actions and fetch the full base history (`fetch-depth: 0`). Add the following steps after its frozen installation; retain all existing required checks:

```yaml
- name: Shared quality
  run: pnpm run quality:check
  env:
    QUALITY_BASE_SHA: ${{ github.event.pull_request.base.sha }}
- name: Shared formatting
  run: pnpm run format:check
```

For another CI system, bind `QUALITY_BASE_SHA` to its actual full PR-base commit and require that binding for PR jobs. Do not make the steps conditional or allow failure. Never run capture or prune in CI.

Qualify in a disposable consumer with the installed package:

| Scenario                                               | Required result           |
| ------------------------------------------------------ | ------------------------- |
| Existing approved finding; unchanged allowance         | Pass                      |
| New finding group, occurrence or increased metric      | Fail                      |
| Manually expanded committed allowance versus PR base   | Fail                      |
| Invalid source, missing/invalid report or tool failure | Fail                      |
| Fix an inherited finding, prune and commit             | Pass; allowance decreases |
| Reintroduce the same finding after pruning             | Fail                      |
| New maintained file with a violation during capture    | Fail                      |

Keep raw Oxlint diagnostics available during investigation: `pnpm exec oxlint --config oxlint.config.mjs --disable-nested-config src tools/quality.mjs oxlint.config.mjs oxfmt.config.mjs`. A nonzero diagnostic exit is expected for inherited debt; it does not replace the baseline gate.

## Daily use

Expose one discoverable command for each task. The `agent-skills` consumer uses:

| Task                        | Command                                       | Write effect                          |
| --------------------------- | --------------------------------------------- | ------------------------------------- |
| Required regression gate    | `pnpm run quality:check`                      | None                                  |
| Debt summary                | `pnpm run quality:report`                     | None                                  |
| Findings for selected files | `pnpm run quality:report -- path/to/file.mjs` | None                                  |
| Machine-readable report     | `pnpm --silent run quality:report -- --json`  | None                                  |
| Selected automatic fixes    | `pnpm run quality:fix -- path/to/file.mjs`    | Named source files only               |
| Make improvements durable   | `pnpm run quality:baseline:prune`             | Baseline only after a successful gate |

These report/fix commands are consumer wrappers, not provider exports. Inspect the target's actual scripts before invoking them; implement an equivalent interface only within authorized scope. Refuse empty selections, directories, globs, excluded files and paths outside maintained source for a mutating fix command.

Use the report to select a bounded cleanup. Fix the named files, inspect the diff, run the owning behavior and quality checks, then prune and commit the reduced allowance. Keep source locations and original diagnostic text for people; keep normalized identities for budget comparison. Show remaining findings by rule/file and available reductions. Counts include style findings and do not measure defects or user value on their own.

During migration, keep shared fixes deliberate. Do not run them on implicit focus/window autosave: readability fixes can add physical lines while an existing file already exceeds its line budget. Keep editor diagnostics and formatting; qualify explicit fixes against the gate.

## Policy updates and file moves

1. Resolve npm `latest`, verify it is a stable release, then compare the old and proposed exact provider pins on the same source revision. Record the registry check time, versions, integrity and changes by file, rule, normalized message, count and numeric value. If compatibility or supply-chain policy blocks the update, retain the qualified installation and record the blocker, owner and revisit condition.
2. Re-run clean install, consumer fixtures, exceptions and required gates. Review new rules, peer/plugin versions, parser behavior and license metadata separately from source edits.
3. Prune removed findings only after the new policy passes. Keep initial-capture provenance historical; record the update's evidence in the current receipt.
4. For a move, identify the exact old/new path pair and prove source identity separately (for example, Git's rename diff plus content digests). The baseline key includes the path: an allowance does not transfer automatically.
5. Prefer fixing the moved file's remaining findings before the move. If unchanged debt must move, stop the affected migration at the no-growth gate and prepare a narrowly reviewed mapping with before/after counts and metrics under the target's accepted migration governance.
6. Do not delete the baseline, disable history validation or introduce an unrestricted refresh flag to make a rename or update pass. Re-run fix → prune → reintroduce proof after an approved comparator/mapping change.

Keep generic rules, normalization and reusable runner capabilities in the shared package. Keep source inventories, entrypoints, CI authority and migration data in the consumer. The npm package now provides `code-quality-check`; migrating the existing consumer commands to that runner remains a separate backlog task with installed-package qualification.
