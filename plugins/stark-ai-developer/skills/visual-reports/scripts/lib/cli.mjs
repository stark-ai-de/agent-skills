// SPDX-License-Identifier: Apache-2.0
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseMarkdown } from "./markdown-input.mjs";
import { starter, templates, profiles } from "./templates.mjs";
import { validateReport, writeReport } from "../render-report.mjs";
import { currentRevision, publishRevision, history } from "./report-store.mjs";
import { serveReport } from "./preview.mjs";

export async function readInput(filename) {
  const input = await readFile(path.resolve(filename), "utf8");
  if (/\.md$/i.test(filename)) return parseMarkdown(input);
  if (!/\.json$/i.test(filename)) throw new TypeError("Input extension must be .json or .md");
  return validateReport(JSON.parse(input));
}
const usage = `Visual Reports
  --templates
  --starter TYPE --profile PROFILE --id ID [--output NEW_FILE.json]
  --input MODEL.json|MODEL.md --output NEW_DIRECTORY
  --create STORE --input MODEL.json|MODEL.md
  --update STORE --input MODEL.json|MODEL.md --base REVISION
  --current STORE | --history STORE
  --preview STORE [--port NUMBER]
  --gallery NEW_DIRECTORY | --extract REPORT.html [--section ID]
All writes are explicit. Preview binds loopback and stops with Ctrl-C.`;
export async function runCli(args) {
  if (args.length === 1 && args[0] === "--help") {
    console.log(usage);
    return;
  }
  if (args.length === 1 && args[0] === "--templates") {
    console.log(JSON.stringify({ templates, profiles }, null, 2));
    return;
  }
  if (args.length === 2 && ["--current", "--history"].includes(args[0])) {
    console.log(
      JSON.stringify(
        await (args[0] === "--current" ? currentRevision : history)(path.resolve(args[1])),
        null,
        2,
      ),
    );
    return;
  }
  const flags = {};
  for (let i = 0; i < args.length; i += 2) {
    if (
      !args[i].startsWith("--") ||
      args[i + 1] === undefined ||
      args[i + 1].startsWith("--") ||
      Object.hasOwn(flags, args[i])
    )
      throw new Error(usage);
    flags[args[i]] = args[i + 1];
  }
  const only = (allowed) => {
    if (Object.keys(flags).some((k) => !allowed.includes(k))) throw new Error(usage);
  };
  if (flags["--starter"]) {
    only(["--starter", "--profile", "--id", "--output"]);
    const report = validateReport(
      starter({ type: flags["--starter"], profile: flags["--profile"], id: flags["--id"] }),
    );
    const data = JSON.stringify(report, null, 2) + "\n";
    if (flags["--output"]) await writeFile(path.resolve(flags["--output"]), data, { flag: "wx" });
    else process.stdout.write(data);
    return;
  }
  if (flags["--preview"]) {
    only(["--preview", "--port"]);
    const preview = await serveReport(path.resolve(flags["--preview"]), {
      port: flags["--port"] === undefined ? 0 : Number(flags["--port"]),
    });
    console.log(preview.url);
    for (const signal of ["SIGINT", "SIGTERM"])
      process.once(signal, () => {
        preview.close().catch((e) => {
          console.error(e.message);
          process.exitCode = 1;
        });
      });
    return;
  }
  if (flags["--create"] || flags["--update"]) {
    only(flags["--create"] ? ["--create", "--input"] : ["--update", "--input", "--base"]);
    if (!flags["--input"] || (flags["--update"] && !flags["--base"])) throw new Error(usage);
    const result = await publishRevision(
      await readInput(flags["--input"]),
      path.resolve(flags["--create"] ?? flags["--update"]),
      { expected: flags["--base"] ?? null },
    );
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  only(["--input", "--output"]);
  if (!flags["--input"] || !flags["--output"]) throw new Error(usage);
  await writeReport(await readInput(flags["--input"]), path.resolve(flags["--output"]));
  console.log(`Report written: ${flags["--output"]}`);
}
