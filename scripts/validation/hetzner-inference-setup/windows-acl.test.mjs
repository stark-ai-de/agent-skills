import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { powershellCommand } from "../../../skills/engineering-workflows/hetzner-inference-setup/assets/templates/protected-file.mjs";
import { minimalCommandEnvironment } from "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/hosts.mjs";

test("native Windows environment delta diagnosis", { skip: process.platform !== "win32", timeout: 360_000 }, (t) => {
  const powershell = path.join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  const root = fs.mkdtempSync(path.join(process.env.LOCALAPPDATA, "hetzner-acl-diagnosis-"));
  const target = path.join(root, "synthetic-ä.txt");
  fs.writeFileSync(target, "synthetic");
  const minimal = { ...minimalCommandEnvironment(), PSModulePath: path.join(path.dirname(powershell), "Modules") };
  const extra = Object.keys(process.env).filter((key) =>
    !Object.keys(minimal).some((present) => present.toLowerCase() === key.toLowerCase()) &&
    !/(?:TOKEN|PASSWORD|SECRET|API_KEY|PRIVATE_KEY|CREDENTIAL)/i.test(key));
  const command = powershellCommand("$acl=Get-Acl -LiteralPath $args[0];if($acl){[Console]::WriteLine('ACL_OK')}", [target]);
  const script = "[Console]::WriteLine('PRELUDE');" + Buffer.from(command.args[4], "base64").toString("utf16le");
  const args = [...command.args.slice(0, 4), Buffer.from(script, "utf16le").toString("base64")];
  let attempts = 0;
  const probe = (label, keys, raw = false) => {
    attempts += 1;
    const environment = { ...minimal, ...Object.fromEntries(keys.map((key) => [key, process.env[key]])), ...command.environment };
    const started = performance.now();
    const selectedArgs = raw ? [...command.args.slice(0, 4), Buffer.from("[Console]::WriteLine('ACL_OK')", "utf16le").toString("base64")] : args;
    const result = spawnSync(powershell, selectedArgs, {
      env: environment, encoding: "utf8", timeout: 10_000, maxBuffer: 65_536, windowsHide: true,
    });
    const passed = result.status === 0 && result.stdout.includes("ACL_OK");
    t.diagnostic(JSON.stringify({ label, keys, passed, prelude: result.stdout?.includes("PRELUDE"), status: result.status,
      code: result.error?.code ?? null, durationMs: Math.round(performance.now() - started) }));
    return passed;
  };
  try {
    probe("raw-minimum", [], true);
    probe("wrapped-minimum", []);
    assert.ok(probe("reference", extra), "The non-secret reference environment must reproduce successful native ACL access");
    let required = extra;
    let partitions = 2;
    while (required.length && attempts < 28) {
      const size = Math.ceil(required.length / partitions);
      let reduced = false;
      for (let start = 0; start < required.length && attempts < 28; start += size) {
        const candidate = required.filter((_key, index) => index < start || index >= start + size);
        if (probe("remove-partition", candidate)) {
          required = candidate;
          partitions = Math.max(2, partitions - 1);
          reduced = true;
          break;
        }
      }
      if (!reduced) {
        if (partitions >= required.length) break;
        partitions = Math.min(required.length, partitions * 2);
      }
    }
    t.diagnostic(JSON.stringify({ candidateRequiredNames: required, attempts }));
    assert.ok(probe("final-confirmation", required));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
