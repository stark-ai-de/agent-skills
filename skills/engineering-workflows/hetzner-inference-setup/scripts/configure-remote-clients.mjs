#!/usr/bin/env node
import { runRemoteClients } from "./lib/remote-clients.mjs";

const help = `Usage:
  node configure-remote-clients.mjs plan --output-dir ABS --inference-url URL --alias NAME
    --clients codex,claude-code,cursor --inference-key-file ABS|--inference-key-env NAME
    [--codex-executable ABS] [--claude-executable ABS]
  node configure-remote-clients.mjs plan --output-dir ABS --operation rollback
  node configure-remote-clients.mjs apply --plan ABS --approve PLAN_ID
  node configure-remote-clients.mjs rollback --plan ABS --approve PLAN_ID

Plans are printed as JSON, expire after 15 minutes, and read no credentials.
Save the JSON to a file outside the output directory before applying it.
The output directory's parent must already be protected for the current user.
Cursor is guided only. Native Windows clients must be .exe executables.
`;

try {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "--help" || command === "help") {
    process.stdout.write(help);
  } else {
    const options = {};
    for (let index = 0; index < args.length; index += 2) {
      const flag = args[index];
      const value = args[index + 1];
      if (!/^--[a-z-]+$/u.test(flag) || !value || value.startsWith("--")) {
        throw new Error("Expected --option VALUE pairs; see --help");
      }
      const name = flag.slice(2).replace(/-([a-z])/gu, (_, letter) => letter.toUpperCase());
      if (Object.hasOwn(options, name)) throw new Error("Duplicate option; see --help");
      options[name] = value;
    }
    process.stdout.write(`${JSON.stringify(await runRemoteClients(command, options), null, 2)}\n`);
  }
} catch (error) {
  // Configuration and filesystem errors contain only locators, never credential values.
  process.stderr.write(`Remote client setup: ${error.message}\n`);
  process.exitCode = 1;
}
