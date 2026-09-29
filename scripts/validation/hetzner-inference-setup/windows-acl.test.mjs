import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  powershellCommand,
  readProtectedSecret,
  secureCurrentUserDirectory,
  secureAndVerifyCurrentUserFileAsync,
  verifyCurrentUserFileAsync,
  windowsAclSnapshot,
} from "../../../skills/engineering-workflows/hetzner-inference-setup/assets/templates/protected-file.mjs";
import {
  detectHost,
  minimalCommandEnvironment,
} from "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/hosts.mjs";
import {
  secureDirectoryPermissions,
  securePathPermissions,
  verifyRestrictedFilePermissions,
} from "../../../skills/engineering-workflows/hetzner-inference-setup/scripts/lib/permissions.mjs";

test("PowerShell helper selects native modules and a child-only disabled analysis cache", () => {
  const before = {
    cache: process.env.PSModuleAnalysisCachePath,
    modules: process.env.PSModulePath,
  };
  const values = ["O'Brien;$(throw 'injected')-ä-東京", "", "C:\\"];
  const command = powershellCommand("ConvertTo-Json -InputObject @($args) -Compress", values);
  assert.equal(command.environment.PSModuleAnalysisCachePath, "NUL");
  assert.deepEqual(JSON.parse(command.environment.HETZNER_POWERSHELL_ARGUMENTS), values);
  const script = Buffer.from(command.args[4], "base64").toString("utf16le");
  assert.ok(script.indexOf("$env:PSModulePath=") < script.indexOf("ConvertFrom-Json"));
  assert.ok(script.includes("[IO.Path]::Combine($PSHOME,'Modules')"));
  assert.equal(script.includes(values[0]), false);
  assert.deepEqual(
    { cache: process.env.PSModuleAnalysisCachePath, modules: process.env.PSModulePath },
    before,
  );
});

test(
  "native Windows command transport works under the production minimum environment",
  { skip: process.platform !== "win32", timeout: 60_000 },
  () => {
    const powershell = path.join(
      process.env.SystemRoot,
      "System32",
      "WindowsPowerShell",
      "v1.0",
      "powershell.exe",
    );
    for (const values of [[""], [], ["C:\\", "a ä 東京 🌍", "O'Brien;$(throw 'injected')"]]) {
      const command = powershellCommand("ConvertTo-Json -InputObject @($args) -Compress", values);
      const result = spawnSync(powershell, command.args, {
        env: minimalCommandEnvironment(command.environment),
        encoding: "utf8",
        timeout: 10_000,
        maxBuffer: 65_536,
        windowsHide: true,
      });
      assert.equal(
        result.error?.code,
        undefined,
        "Native production-minimum PowerShell must finish",
      );
      assert.equal(
        result.status,
        0,
        "Native argument transport must finish without raw diagnostics",
      );
      assert.deepEqual(JSON.parse(result.stdout), values);
    }
  },
);

test(
  "native Windows ACL helpers preserve protection, readback and broad-grant refusal",
  { skip: process.platform !== "win32", timeout: 90_000 },
  async () => {
    const root = fs.realpathSync.native(
      fs.mkdtempSync(path.join(process.env.LOCALAPPDATA, "hetzner-acl-regression-")),
    );
    const host = detectHost();
    const synthetic = "synthetic-inference-credential";
    try {
      secureCurrentUserDirectory(root);
      await secureDirectoryPermissions(root, host);
      const target = path.join(root, "O'Brien;$(throw 'injected') [literal]`$value-ä-東京.txt");
      fs.writeFileSync(target, synthetic);
      await securePathPermissions(target, host);
      const acl = windowsAclSnapshot(target);
      assert.equal(acl.owner, acl.current);
      assert.equal(acl.protected, true);
      await secureAndVerifyCurrentUserFileAsync(target);
      await verifyCurrentUserFileAsync(target);
      await verifyRestrictedFilePermissions(target, host);
      assert.equal(readProtectedSecret(target), synthetic);
      const icacls = path.join(process.env.SystemRoot, "System32", "icacls.exe");
      const broaden = spawnSync(icacls, [target, "/grant", "*S-1-1-0:(R)"], {
        env: minimalCommandEnvironment(),
        timeout: 10_000,
        maxBuffer: 65_536,
        windowsHide: true,
      });
      assert.equal(broaden.status, 0, "Synthetic broad-grant setup must complete");
      assert.throws(() => readProtectedSecret(target));
      await assert.rejects(verifyCurrentUserFileAsync(target));
      await assert.rejects(verifyRestrictedFilePermissions(target, host));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  },
);
