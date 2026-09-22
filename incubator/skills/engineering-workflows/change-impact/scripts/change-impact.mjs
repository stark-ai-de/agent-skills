#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";
import { collect, requireValue } from "./collect.mjs";
import { credential } from "./credentials.mjs";
import { MODEL, probe, rank } from "./rank.mjs";
import { queue, report } from "./review.mjs";
export { queue, report };

export async function doctor(live = false) {
  const auth = credential();
  let git = false;
  try {
    execFileSync("git", ["--no-lazy-fetch", "--version"], { stdio: "ignore", timeout: 5000 });
    git = true;
  } catch {
    /* Report a failed preflight without exposing paths. */
  }
  const nodeSupported =
    Number(process.versions.node.split(".")[0]) > 24 ||
    (Number(process.versions.node.split(".")[0]) === 24 &&
      Number(process.versions.node.split(".")[1]) >= 18);
  const result = {
    schemaVersion: 1,
    status: git && nodeSupported && auth.key ? "configured" : "incomplete",
    runtime: {
      node: process.versions.node,
      bun: process.versions.bun ?? null,
      nodeSupported,
      gitAvailable: git,
    },
    credential: { configured: Boolean(auth.key), source: auth.source, reason: auth.reason ?? null },
    model: MODEL,
    networkAttempted: false,
    meaning:
      "Local configuration only; a credential's presence is not authentication or authority to send project data.",
  };
  if (live && git && nodeSupported && auth.key) {
    result.networkAttempted = true;
    result.probe = await probe({ apiKey: auth.key });
    result.status = result.probe.status === "ready" ? "connected" : "incomplete";
    result.meaning =
      "Synthetic connection check only; project data authority and repository review remain separate.";
  }
  return result;
}

export async function main(args = process.argv.slice(2)) {
  if (args.length === 0 || args[0] === "--help") {
    console.log(
      "change-impact <doctor|collect|rank|queue|report> [--live] [--max-requests N]\ncollect/rank/queue/report read one JSON object from stdin. doctor requires no input.\nOnly rank --live and doctor --live send data to TypeSafe. Doctor sends fixed synthetic text only.\nCredentials: TYPESAFE_API_KEY or TYPESAFE_API_KEY_FILE (a local raw key file).\nNo repository files, configuration or Git index are modified. See references/helper-contract.md for inputs and exit codes.",
    );
    return;
  }
  const [operation, ...flags] = args;
  requireValue(
    ["doctor", "collect", "rank", "queue", "report"].includes(operation),
    "Unknown operation",
  );
  let live = false;
  let maxRequests;
  for (let i = 0; i < flags.length; i++) {
    if (flags[i] === "--live" && !live) live = true;
    else if (flags[i] === "--max-requests" && maxRequests === undefined)
      maxRequests = Number(flags[++i]);
    else throw new Error("Unknown or duplicate option");
  }
  requireValue(
    operation === "rank" || (maxRequests === undefined && (operation === "doctor" || !live)),
    "Network options only apply to rank or doctor",
  );
  let result;
  if (operation === "doctor") result = await doctor(live);
  else {
    process.stdin.setEncoding("utf8");
    let raw = "";
    for await (const chunk of process.stdin) {
      raw += chunk;
      requireValue(Buffer.byteLength(raw) <= 16777216, "Input is too large");
    }
    const input = JSON.parse(raw);
    if (operation === "collect") result = collect(input);
    else if (operation === "queue") result = queue(input);
    else if (operation === "report") result = report(input);
    else {
      requireValue(
        live,
        "rank requires --live and existing project authority for transmitting these excerpts",
      );
      const auth = credential();
      result = await rank(input, { maxRequests, apiKey: auth.key ?? "" });
      if (!auth.key) result.credential = { source: auth.source, reason: auth.reason };
    }
  }
  console.log(JSON.stringify(result, null, 2));
  if (["rank", "doctor"].includes(operation) && result.status === "incomplete")
    process.exitCode = 2;
}

function failure(error) {
  let code = "invalid-input-or-repository";
  let message =
    "Check the JSON input, repository root, scope, revision availability and helper contract.";
  if (/Snapshot or packet changed/.test(error.message)) {
    code = "snapshot-changed";
    message =
      "Recollect the current source and repeat ranking/confirmation; the saved packet is stale.";
  } else if (/ranking/i.test(error.message)) {
    code = "invalid-ranking";
    message =
      "Use the intact ranking from this exact packet; missing, altered or inconsistent results cannot be reused.";
  } else if (/Contract evidence is absent/.test(error.message)) {
    code = "source-evidence-missing";
    message =
      "Inspect the exact before/after source and collection omissions; correct scope or evidence quotes.";
  } else if (/requires --live/.test(error.message)) {
    code = "live-opt-in-required";
    message = "Use rank --live only within existing authority to send the chosen excerpts.";
  } else if (/Unknown|option/.test(error.message)) {
    code = "invalid-option";
    message = "Run --help for supported operations and options.";
  }
  return { status: "incomplete", error: { code, message } };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch((error) => {
    console.error(JSON.stringify(failure(error)));
    process.exitCode = 2;
  });
