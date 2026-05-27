#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const readinessDir = path.join(root, ".agents/skillopt-work/_readiness");
const finalPath = path.join(readinessDir, "codex-probe-final.txt");
const outputPath = path.join(readinessDir, "codex-probe-output.txt");

function parseArgs(argv) {
  const args = { json: false, authMode: "codex-cli", timeout: 240000 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") args.json = true;
    else if (arg === "--auth-mode") args.authMode = argv[++i];
    else if (arg === "--timeout-ms") args.timeout = Number(argv[++i]);
    else fail(`Unknown argument: ${arg}`);
  }
  return args;
}

function fail(message) {
  console.error(message);
  process.exit(2);
}

function redact(text) {
  const home = process.env.HOME ? path.resolve(process.env.HOME) : "";
  return String(text || "")
    .replaceAll(home, "~")
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, "[redacted-token]")
    .replace(/[A-Za-z0-9+/=._-]{40,}/g, (token) =>
      /[\\/]/.test(token) || /^[a-f0-9]{40,64}$/i.test(token)
        ? token
        : "[redacted-long-token]",
    )
    .replace(
      /[A-Za-z0-9_./-]*(auth|token|credential)[A-Za-z0-9_./-]*/gi,
      "[redacted-auth-reference]",
    );
}

function commandExists(command) {
  const result =
    process.platform === "win32"
      ? spawnSync("where", [command], { encoding: "utf8" })
      : spawnSync("sh", ["-lc", `command -v ${command}`], { encoding: "utf8" });
  return result.status === 0;
}

function writeDiagnostic(result) {
  fs.mkdirSync(readinessDir, { recursive: true });
  const diagnostic = [
    `status: ${result.status ?? "signal:" + result.signal}`,
    "stdout:",
    redact(result.stdout || ""),
    "stderr:",
    redact(result.stderr || ""),
  ].join("\n");
  fs.writeFileSync(outputPath, diagnostic.slice(0, 8000), "utf8");
}

function runCodexExec(timeout) {
  const prompt = "Return exactly CODEX_READY. Do not inspect files.";
  return spawnSync(
    "codex",
    [
      "exec",
      "--skip-git-repo-check",
      "--color",
      "never",
      "--sandbox",
      "read-only",
      "--output-last-message",
      finalPath,
      prompt,
    ],
    {
      cwd: root,
      encoding: "utf8",
      timeout,
    },
  );
}

const args = parseArgs(process.argv.slice(2));
fs.mkdirSync(readinessDir, { recursive: true });
fs.rmSync(finalPath, { force: true });

const warnings = [];
if (args.authMode === "codex-cli" && process.env.OPENAI_API_KEY) {
  warnings.push(
    "OPENAI_API_KEY is set while --auth-mode codex-cli was selected; verify the run uses the intended local auth path.",
  );
}

const result = {
  ok: false,
  codex_installed: false,
  codex_version: null,
  final_path: path.relative(root, finalPath).replaceAll("\\", "/"),
  diagnostic_path: path.relative(root, outputPath).replaceAll("\\", "/"),
  warnings,
  error: null,
};

if (!commandExists("codex")) {
  result.error = "codex executable not found";
} else {
  result.codex_installed = true;
  const version = spawnSync("codex", ["--version"], {
    cwd: root,
    encoding: "utf8",
    timeout: 30000,
  });
  result.codex_version = redact((version.stdout || version.stderr || "").trim());

  const probe = runCodexExec(args.timeout);
  writeDiagnostic(probe);

  const final = fs.existsSync(finalPath) ? fs.readFileSync(finalPath, "utf8").trim() : "";
  if (probe.status === 0 && final === "CODEX_READY") {
    result.ok = true;
  } else {
    result.error = `Codex probe did not return CODEX_READY; final response was ${JSON.stringify(redact(final))}.`;
  }
}

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Codex CLI installed: ${result.codex_installed ? "yes" : "no"}`);
  if (result.codex_version) console.log(`Codex CLI version: ${result.codex_version}`);
  console.log(`Probe: ${result.ok ? "pass" : "fail"}`);
  if (result.error) console.log(`Error: ${result.error}`);
  if (warnings.length) console.log(`Warnings: ${warnings.join("; ")}`);
}

process.exit(result.ok ? 0 : 1);
