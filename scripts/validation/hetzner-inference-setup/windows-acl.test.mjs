import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  powershellCommand,
  windowsAclAccessRulesScript,
} from "../../../skills/engineering-workflows/hetzner-inference-setup/assets/templates/protected-file.mjs";
import { minimalCommandEnvironment } from "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/hosts.mjs";

test("native Windows ACL staged diagnosis", { skip: process.platform !== "win32", timeout: 300_000 }, (t) => {
  const root = fs.mkdtempSync(path.join(process.env.LOCALAPPDATA, "hetzner-acl-diagnosis-"));
  const target = path.join(root, "synthetic-ä.txt");
  fs.writeFileSync(target, "synthetic test input");
  const powershell = path.join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  const moduleRoot = path.join(path.dirname(powershell), "Modules");
  const templateEnvironment = Object.fromEntries(
    ["PATH", "SystemRoot", "TEMP", "TMP", "WINDIR"]
      .filter((key) => process.env[key] !== undefined)
      .map((key) => [key, process.env[key]]),
  );
  const environments = [
    ["template-native-modules", { ...templateEnvironment, PSModulePath: moduleRoot }],
    ["orchestrator-native-modules", { ...minimalCommandEnvironment(), PSModulePath: moduleRoot }],
    ["reference-native-modules", { ...process.env, PSModulePath: moduleRoot }],
  ];
  const getAcl = "$acl=Get-Acl -LiteralPath $args[0];$acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value";
  const queries = [
    ["start", "'READY'"],
    ["arguments", "ConvertTo-Json -InputObject @($args) -Compress"],
    ["get-acl", getAcl],
    ["explicit-security-module", "Import-Module (Join-Path $PSHOME 'Modules\\Microsoft.PowerShell.Security\\Microsoft.PowerShell.Security.psd1');" + getAcl],
    ["sid-rules", "$acl=Get-Acl -LiteralPath $args[0];" + windowsAclAccessRulesScript + ";ConvertTo-Json -InputObject $items -Compress -Depth 4"],
  ];
  const outcomes = [];
  try {
    for (const [environmentName, environment] of environments) {
      for (const [stage, script] of queries) {
        const command = powershellCommand(script, [target]);
        const started = performance.now();
        const result = spawnSync(powershell, command.args, {
          env: { ...environment, ...command.environment },
          encoding: "utf8", timeout: 10_000, maxBuffer: 65_536, windowsHide: true,
        });
        const outcome = {
          environment: environmentName, stage,
          durationMs: Math.round(performance.now() - started),
          status: result.status,
          code: result.error?.code ?? null,
          signal: result.signal,
          outputPresent: Boolean(result.stdout?.trim()),
        };
        outcomes.push(outcome);
        t.diagnostic(JSON.stringify(outcome));
      }
    }
    assert.ok(outcomes.every((outcome) => outcome.status === 0 && outcome.outputPresent),
      "See stage diagnostics; no environment values or raw subprocess output are published");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
