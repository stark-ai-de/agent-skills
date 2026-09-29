#!/usr/bin/env node
import { remoteCommand } from "./lib/remote.mjs";

const args = process.argv.slice(2);
const command = args.shift() ?? "help";
const options = {};
let valid = true;
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (!/^--[a-z][a-z-]*$/.test(argument) || Object.hasOwn(options, argument.slice(2))) {
    valid = false;
    break;
  }
  options[argument.slice(2)] =
    args[index + 1] && !args[index + 1].startsWith("--") ? args[++index] : true;
}
const result = valid
  ? await remoteCommand(command, options)
  : {
      ok: false,
      error: {
        code: "invalid_arguments",
        message: "Use unique --name value options; credentials must be source references.",
      },
    };
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) process.exitCode = 1;
