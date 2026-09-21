import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(2);
}

let codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
let json = false;
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--help" || arg === "-h") {
    console.log(`Usage: locate-memory-config.mjs [--codex-home PATH] [--json]

Read-only locator for memory and profile signals anywhere in config.toml.
Output contains line numbers and fixed signal names, never source values.
This is not a TOML parser: comments and strings can match. Inspect matching
sections and their table context before interpreting effective settings.
Exit 0: scanned or missing config; exit 2: invalid arguments or unreadable input.`);
    process.exit(0);
  } else if (arg === "--codex-home") {
    if (!args[index + 1] || args[index + 1].startsWith("--")) {
      fail("--codex-home requires a path.");
    }
    codexHome = args[++index];
  } else if (arg === "--json") {
    json = true;
  } else {
    fail("unknown argument; use --help.");
  }
}

// Fixed identifiers only: arbitrary keys, profile names, and values never escape.
const signals = [
  "features",
  "memories",
  "profile",
  "profiles",
  "use_memories",
  "generate_memories",
  "disable_on_external_context",
  "no_memories_if_mcp_or_web_search",
  "min_rate_limit_remaining_percent",
  "min_rollout_idle_hours",
  "max_rollout_age_days",
  "max_rollouts_per_startup",
  "max_unused_days",
  "max_raw_memories_for_consolidation",
  "extract_model",
  "consolidation_model",
];
const patterns = signals.map((signal) => [signal, new RegExp(`\\b${signal}\\b`)]);
let text;
let status = "scanned";
try {
  text = fs.readFileSync(path.join(codexHome, "config.toml"), "utf8");
} catch (error) {
  if (error.code !== "ENOENT") fail("config.toml could not be read.");
  status = "missing";
  text = "";
}

const lines = text.split(/\r?\n/);
const candidates = [];
for (let index = 0; index < lines.length; index += 1) {
  const found = patterns.filter(([, pattern]) => pattern.test(lines[index])).map(([key]) => key);
  if (found.length) candidates.push({ line: index + 1, signals: found });
}
const result = {
  status,
  interpretation: "candidate-locations-only",
  lines_scanned: status === "missing" ? 0 : lines.length,
  candidates,
};
if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Config: ${status}; candidate locations only, not effective settings.`);
  for (const candidate of candidates) {
    console.log(`${candidate.line}: ${candidate.signals.join(", ")}`);
  }
}
