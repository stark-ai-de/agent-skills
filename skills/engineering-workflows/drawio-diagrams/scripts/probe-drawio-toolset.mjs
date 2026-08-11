#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  discoverDrawioCandidates,
  inspectDrawioExecutable,
  resolveCommandPath,
  validatePng,
  validateSvg,
  supportsDescriptorAnchoredChild,
} from "./render-drawio.mjs";

const MAX_OUTPUT_CHARS = 4 * 1024;
const MAX_SPAWN_OUTPUT_CHARS = 64 * 1024;
const MAX_DIAGNOSTIC_CHARS = 512;
const MAX_CANDIDATES = 12;
const MAX_SMOKE_ARTIFACT_BYTES = 16 * 1024 * 1024;
const SMOKE_TIMEOUT_MS = 5_000;
const SCHEMA_VERSION = 1;
const DRAWIO_FORMATS = ["png", "svg", "pdf", "jpg", "xml", "html"];
const SMOKE_DRAWIO_SOURCE = `<mxfile host="app.diagrams.net"><diagram name="Capability probe"><mxGraphModel dx="800" dy="600" grid="1" gridSize="8" page="1" pageScale="1" pageWidth="827" pageHeight="1169"><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="probe" value="Capability probe" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="180" height="60" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>`;
const BROWSER_COMMANDS = [
  "chromium",
  "chromium-browser",
  "google-chrome",
  "google-chrome-stable",
  "chrome",
  "msedge",
  "firefox",
];
const PACKAGE_COMMANDS = ["pnpm", "npm", "yarn", "bun", "nix"];
const MCP_PACKAGE_CANDIDATES = ["@drawio/mcp", "drawio-mcp-server", "@next-ai-drawio/mcp-server"];

function truncate(value, limit = MAX_DIAGNOSTIC_CHARS) {
  const text = [...String(value ?? "")]
    .map((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint < 0x20 && ![0x09, 0x0a, 0x0d].includes(codePoint) ? "?" : character;
    })
    .join("");
  return text.length <= limit ? text : `${text.slice(0, Math.max(0, limit - 1))}…`;
}

function commandOutput(result, limit = MAX_OUTPUT_CHARS) {
  return truncate(
    [result?.stdout?.trim(), result?.stderr?.trim()].filter(Boolean).join("\n"),
    limit,
  );
}

function redactPath(value) {
  if (!value) return null;
  const text = String(value);
  if (/^(?:[A-Za-z]:[\\/]|\\\\|\/mnt\/[a-z]\/)/i.test(text)) return "<windows-path>";
  const normalized = text.replaceAll("\\", "/");
  const home = os.homedir().replaceAll("\\", "/");
  const cwd = process.cwd().replaceAll("\\", "/");
  if (normalized === home || normalized.startsWith(`${home}/`)) {
    return `<home>${normalized.slice(home.length) || "/"}`;
  }
  if (normalized === cwd || normalized.startsWith(`${cwd}/`)) {
    return `<workspace>${normalized.slice(cwd.length) || "/"}`;
  }
  if (/^\/tmp(?:\/|$)/.test(normalized) || /^\/run\/user\//.test(normalized)) {
    return `<temp>/${path.basename(normalized)}`;
  }
  if (/^\/nix\/store\//.test(normalized)) return `<nix-store>/${path.basename(normalized)}`;
  if (normalized.startsWith("/")) return `<absolute>/${path.basename(normalized)}`;
  return truncate(text);
}

function redactCommand(value) {
  if (!value) return null;
  const text = String(value);
  if (/^(?:[A-Za-z]:[\\/]|\\\\|\/mnt\/[a-z]\/)/i.test(text)) return "<windows-drawio>";
  if (!text.includes("/") && !text.includes("\\")) return truncate(text);
  const base = path.basename(text);
  return /^[A-Za-z0-9._+-]+$/.test(base) ? base : "<executable>";
}

function redactEndpoint(value) {
  if (!value) return null;
  const text = String(value);
  if (/^[A-Za-z][A-Za-z\d+.-]*:\/\//i.test(text)) return "<configured-endpoint>";
  return redactPath(text);
}

function redactDistro(value) {
  if (!value) return null;
  const text = String(value);
  return /^(?:nixos|ubuntu|debian|fedora|arch|opensuse|alpine)(?:[-._\d]*)$/i.test(text)
    ? text
    : "<wsl-distro>";
}

function redactDiagnostic(value) {
  let text = String(value ?? "");
  text = text.replace(/(?:[A-Za-z]:[\\/]|\\\\|\/)[^\s'"`]+/g, (match, offset, source) => {
    if (source[offset - 1] === ">") return match;
    if (source[offset - 1] && /[A-Za-z0-9_.-]/.test(source[offset - 1])) return match;
    if (match.startsWith("/")) return redactPath(match);
    return "<path>";
  });
  return truncate(text);
}

function executableInfo(
  command,
  { args = ["--version"], env = process.env, timeout = 2_000, runProbe = true } = {},
) {
  const runtimePath = env.PATH ?? process.env.PATH ?? "";
  const resolved = resolveCommandPath(command, {
    pathValue: runtimePath,
    platform: process.platform,
    pathext: env.PATHEXT,
  });
  const descriptor = inspectDrawioExecutable(command, {
    pathValue: runtimePath,
    platform: process.platform,
    pathext: env.PATHEXT,
  });
  const result = {
    command: redactCommand(command),
    path: redactPath(descriptor.resolvedPath || resolved),
    terminalPath: redactPath(descriptor.terminalPath),
    available: Boolean(descriptor.executable && !descriptor.stale),
    status: !descriptor.executable || descriptor.stale ? "missing" : "indeterminate",
    executable: Boolean(descriptor.executable),
    stale: Boolean(descriptor.stale),
    version: null,
    diagnostics: descriptor.diagnostics?.map((item) => redactDiagnostic(item)).slice(0, 4) || [],
  };
  if (!result.available || !runProbe) return result;
  if (descriptor.crossBoundary) return result;
  const probeCommand =
    descriptor.probeCommand ||
    (/^node(?:\.exe)?$/i.test(path.basename(command)) ? process.execPath : command);
  const probe = spawnSync(probeCommand, args, {
    encoding: "utf8",
    env,
    timeout,
    maxBuffer: MAX_SPAWN_OUTPUT_CHARS,
  });
  if (!probe.error && probe.status === 0) {
    result.status = "available";
    result.version = redactDiagnostic(commandOutput(probe));
  } else if (probe.error?.code === "ETIMEDOUT") {
    result.diagnostics.push("version probe timed out");
  } else if (probe.error) {
    result.diagnostics.push(`version probe failed for ${redactCommand(command)}`);
  } else if (probe.status !== 0) result.diagnostics.push(`version probe exited ${probe.status}`);
  return result;
}

export function parseArgs(argv) {
  let json = false;
  for (const arg of argv) {
    if (arg === "--json") json = true;
    else if (arg === "--help" || arg === "-h") return { help: true, json };
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return { help: false, json };
}

export function probeRuntime(command, { env = process.env } = {}) {
  const result = executableInfo(command, { env });
  return {
    ...result,
    name: redactCommand(command),
    platform: process.platform,
    arch: process.arch,
  };
}

export function probePython({ env = process.env } = {}) {
  const result = probeRuntime("python3", { env });
  return { ...result, validatorAvailable: result.status === "available" };
}

export function probeNode({ env = process.env } = {}) {
  const result = probeRuntime("node", { env });
  const majorMatch = result.version?.match(/(?:^|\s)v?(\d+)(?:\.|\s|$)/);
  const major = majorMatch ? Number(majorMatch[1]) : null;
  return {
    ...result,
    requiredMajor: 18,
    major,
    supported: Boolean(result.status === "available" && major !== null && major >= 18),
  };
}

function drawioHelp(command, env) {
  if (!command) return { text: "", status: null, diagnostics: ["no draw.io candidate"] };
  const result = spawnSync(command, ["--help"], {
    encoding: "utf8",
    env,
    timeout: 3_000,
    maxBuffer: MAX_SPAWN_OUTPUT_CHARS,
  });
  return {
    text: commandOutput(result),
    status: result.error ? null : result.status,
    diagnostics: result.error
      ? [truncate(result.error.message)]
      : result.status === 0
        ? []
        : [`help probe exited ${result.status}`],
  };
}

function formatCapabilities(helpText, known = true) {
  const text = String(helpText || "").toLowerCase();
  const formats = Object.fromEntries(
    DRAWIO_FORMATS.map((format) => [
      format,
      known ? new RegExp(`\\b${format}\\b`).test(text) : null,
    ]),
  );
  const theme = known ? /(?:--theme|--svg-theme)/.test(text) : null;
  const pages = known ? /(?:--page-index|--all-pages|--page-range)/.test(text) : null;
  return {
    formats,
    formatList: DRAWIO_FORMATS.filter((format) => formats[format]),
    theme,
    pageSelection: pages,
    evidence: redactDiagnostic(helpText),
  };
}

function validateSmokeArtifact(file, format) {
  let stat;
  try {
    stat = fs.lstatSync(file);
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error(`${format} smoke export created no artifact`);
    throw error;
  }
  if (stat.isSymbolicLink()) throw new Error(`${format} smoke output is a symbolic link`);
  if (!stat.isFile() || stat.size === 0) {
    throw new Error(`${format} smoke output is empty or not a regular file`);
  }
  if (stat.size > MAX_SMOKE_ARTIFACT_BYTES) {
    throw new Error(`${format} smoke output exceeds the bounded size limit`);
  }
  if (format === "png") validatePng(file);
  else validateSvg(file);
}

function smokeDrawioCandidate(command, { env = process.env } = {}) {
  const result = {
    available: false,
    status: "indeterminate",
    attempted: false,
    formats: { png: null, svg: null },
    diagnostics: [],
  };
  let temporaryDirectory = null;
  try {
    temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "drawio-capability-probe-"));
    const input = path.join(temporaryDirectory, "probe.drawio");
    fs.writeFileSync(input, SMOKE_DRAWIO_SOURCE, "utf8");
    for (const format of ["png", "svg"]) {
      const output = path.join(temporaryDirectory, `probe.${format}`);
      const args = [
        "-x",
        "-f",
        format,
        ...(format === "png" ? ["-s", "1", "-b", "0"] : ["--svg-theme", "dark", "-e", "-b", "0"]),
        "-o",
        output,
        input,
      ];
      result.attempted = true;
      const smoke = spawnSync(command, args, {
        cwd: temporaryDirectory,
        encoding: "utf8",
        env,
        timeout: SMOKE_TIMEOUT_MS,
        maxBuffer: MAX_SPAWN_OUTPUT_CHARS,
      });
      if (smoke.error || smoke.status !== 0) {
        result.status = "rejected";
        result.formats[format] = false;
        result.diagnostics.push(
          `${format} smoke probe ${
            smoke.error?.code === "ETIMEDOUT"
              ? "timed out"
              : smoke.error
                ? "failed"
                : `exited ${smoke.status}`
          }`,
          commandOutput(smoke),
        );
        break;
      }
      try {
        validateSmokeArtifact(output, format);
      } catch (error) {
        result.status = "rejected";
        result.formats[format] = false;
        result.diagnostics.push(`${format} smoke artifact rejected`, error.message);
        break;
      }
      result.formats[format] = true;
    }
    if (result.formats.png === true && result.formats.svg === true) {
      result.available = true;
      result.status = "available";
      result.diagnostics = [];
    }
  } catch (error) {
    result.status = "indeterminate";
    result.diagnostics.push("temporary format smoke probe could not run", error.message);
  } finally {
    if (temporaryDirectory) {
      try {
        fs.rmSync(temporaryDirectory, { recursive: true, force: true });
      } catch (error) {
        result.available = false;
        result.status = "indeterminate";
        result.diagnostics.push(
          "temporary format smoke artifacts could not be removed",
          error.message,
        );
      }
    }
  }
  result.diagnostics = result.diagnostics
    .filter(Boolean)
    .map((item) => redactDiagnostic(item))
    .slice(0, 6);
  return result;
}

function unavailableSmoke(candidate, available) {
  const status =
    !candidate?.executable || candidate.stale
      ? "missing"
      : available
        ? "indeterminate"
        : "rejected";
  return {
    available: false,
    status,
    attempted: false,
    formats: { png: null, svg: null },
    diagnostics: [
      status === "missing"
        ? "candidate is unavailable for format smoke"
        : status === "indeterminate"
          ? "candidate is retained for raw/manual export; transactional format smoke was not attempted"
          : "version probe did not establish a usable draw.io executable",
    ],
  };
}

function candidateAvailable(candidate) {
  if (!candidate?.executable || candidate.stale) return false;
  if (candidate.ambiguous) return false;
  if (candidate.crossBoundary) return true;
  return candidate.versionProbeStatus === 0;
}

function serialiseDrawioCandidate(candidate, { env = process.env } = {}) {
  const command = candidate.command;
  const versionProbe = candidate.versionProbe || null;
  const version = executableInfo(command, { env, runProbe: false });
  const available = candidateAvailable(candidate);
  const help =
    available && !candidate.crossBoundary
      ? drawioHelp(command, env)
      : { text: "", status: null, diagnostics: [] };
  const capabilities = formatCapabilities(help.text, help.status === 0);
  const nativeEligible = supportsDescriptorAnchoredChild(candidate);
  const smoke =
    available && nativeEligible
      ? smokeDrawioCandidate(command, { env })
      : unavailableSmoke(candidate, available);
  const formats = { ...capabilities.formats };
  for (const format of ["png", "svg"]) {
    if (smoke.formats[format] !== null) formats[format] = smoke.formats[format];
  }
  const transactional = Boolean(available && nativeEligible && smoke.status === "available");
  return {
    command: redactCommand(command),
    source: candidate.source,
    path: redactPath(candidate.resolvedPath),
    terminalPath: redactPath(candidate.terminalPath),
    chainLength: Array.isArray(candidate.chain) ? candidate.chain.length : 0,
    executable: Boolean(candidate.executable),
    available,
    stale: Boolean(candidate.stale),
    wrapper: Boolean(candidate.wrapper),
    windows: Boolean(candidate.windows),
    fileKind: candidate.fileKind || "unknown",
    shebang: candidate.shebang ? redactDiagnostic(candidate.shebang) : null,
    wrapperReasons: candidate.wrapperReasons?.map((reason) => truncate(reason)).slice(0, 6) || [],
    platform: process.platform,
    version: redactDiagnostic(version.version || versionProbe),
    versionProbeStatus: candidate.versionProbeStatus ?? null,
    probes: { version: "--version", help: "--help", smoke: ["png", "svg"] },
    helpStatus: help.status,
    smoke,
    diagnostics: [
      ...(candidate.diagnostics || []),
      ...(version.diagnostics || []),
      ...help.diagnostics,
      ...smoke.diagnostics,
    ]
      .map((item) => redactDiagnostic(item))
      .slice(0, 8),
    capabilities: {
      ...capabilities,
      formats,
      formatList: DRAWIO_FORMATS.filter((format) => formats[format]),
      rawCli: available,
      transactional,
      smoke: { png: smoke.formats.png, svg: smoke.formats.svg },
    },
  };
}

export function probeDrawio({ env = process.env } = {}) {
  const discovery = discoverDrawioCandidates({
    env,
    pathValue: env.PATH ?? process.env.PATH ?? "",
  });
  const candidates = discovery
    .slice(0, MAX_CANDIDATES)
    .map((candidate) => serialiseDrawioCandidate(candidate, { env }));
  const selected =
    candidates.find((candidate) => candidate.available && candidate.capabilities.transactional) ||
    candidates.find((candidate) => candidate.available) ||
    null;
  const raw = candidates.filter(
    (candidate) => candidate.available && !candidate.capabilities.transactional,
  );
  const formats = Object.fromEntries(
    DRAWIO_FORMATS.map((format) => [format, selected?.capabilities.formats[format] ?? null]),
  );
  return {
    selected,
    candidates,
    transactional: {
      available: Boolean(selected?.available && selected?.capabilities.transactional),
      candidate: selected?.command || null,
      reason: selected?.capabilities.transactional
        ? "Linux-native executable passed temporary PNG/SVG smoke checks and supports descriptor-anchored staging"
        : candidates.some(
              (candidate) => candidate.smoke.attempted && candidate.smoke.status === "rejected",
            )
          ? "A draw.io candidate was found, but temporary PNG/SVG smoke checks did not pass"
          : "No Linux-native direct executable was found",
    },
    raw: {
      available: raw.length > 0,
      candidates: raw.map((candidate) => candidate.command),
      retainedForManualExport: raw.length > 0,
    },
    formats,
  };
}

function findBrowserCandidates({ env = process.env } = {}) {
  const values = [];
  if (env.SVG_RASTER_BROWSER) {
    values.push({ command: env.SVG_RASTER_BROWSER, source: "env:SVG_RASTER_BROWSER" });
  } else if (env.AGENT_BROWSER_EXECUTABLE_PATH) {
    values.push({
      command: env.AGENT_BROWSER_EXECUTABLE_PATH,
      source: "env:AGENT_BROWSER_EXECUTABLE_PATH",
    });
  } else {
    for (const command of BROWSER_COMMANDS) values.push({ command, source: "PATH" });
  }
  const seen = new Set();
  const candidates = [];
  for (const item of values) {
    if (seen.has(item.command)) continue;
    seen.add(item.command);
    const result = executableInfo(item.command, { env, args: ["--version"] });
    if (result.available || item.source.startsWith("env:"))
      candidates.push({ ...result, source: item.source });
  }
  return candidates.slice(0, MAX_CANDIDATES);
}

export function probeBrowser({ env = process.env } = {}) {
  const candidates = findBrowserCandidates({ env }).map((candidate) => ({
    ...candidate,
    status: !candidate.available
      ? "missing"
      : /\b(?:chromium|google chrome|microsoft edge)\b/i.test(candidate.version || "")
        ? "present"
        : "indeterminate",
  }));
  const selected = candidates.find((candidate) => candidate.status === "present") || null;
  return {
    available: Boolean(selected),
    status: selected
      ? "present"
      : candidates.some((candidate) => candidate.status === "indeterminate")
        ? "indeterminate"
        : "missing",
    selected,
    candidates,
    fixedThemeRasterization: {
      available: Boolean(selected),
      browser: selected?.command || null,
      approval: "local-browser-path-only",
    },
  };
}

export function probeAgentBrowser({ env = process.env } = {}) {
  const result = executableInfo("agent-browser", { env, args: ["--version"] });
  let help = "";
  if (result.available) {
    const helpResult = spawnSync("agent-browser", ["--help"], {
      encoding: "utf8",
      env,
      timeout: 2_000,
      maxBuffer: MAX_SPAWN_OUTPUT_CHARS,
    });
    help = commandOutput(helpResult);
  }
  return {
    ...result,
    status:
      result.status === "missing"
        ? "missing"
        : result.status === "available" && result.version
          ? "present"
          : "indeterminate",
    command: result.command || "agent-browser",
    browserExecutableReuse: Boolean(env.AGENT_BROWSER_EXECUTABLE_PATH),
    skillsCoreHint: /skills\s+get\s+core/.test(help),
  };
}

function commandExists(command, env = process.env) {
  return Boolean(
    resolveCommandPath(command, {
      pathValue: env.PATH ?? process.env.PATH ?? "",
      platform: process.platform,
      pathext: env.PATHEXT,
    }),
  );
}

export function probePackageManagers({ env = process.env } = {}) {
  const candidates = PACKAGE_COMMANDS.map((command) => {
    const result = executableInfo(command, { env, args: ["--version"] });
    return { name: command, ...result };
  }).filter((candidate) => candidate.status === "available");
  let active = null;
  const userAgent = env.npm_config_user_agent || env.NPM_CONFIG_USER_AGENT || "";
  const userAgentMatch = userAgent.match(/^(pnpm|npm|yarn|bun)\//i);
  if (userAgentMatch) active = userAgentMatch[1].toLowerCase();
  if (!active) {
    try {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
      );
      active = packageJson.packageManager?.split("@")[0] || null;
    } catch {
      active = null;
    }
  }
  if (!active)
    active =
      candidates.find((candidate) => candidate.name !== "nix")?.name || candidates[0]?.name || null;
  return {
    active,
    candidates,
    nix: candidates.find((candidate) => candidate.name === "nix") || {
      name: "nix",
      available: commandExists("nix", env),
      status: commandExists("nix", env) ? "indeterminate" : "missing",
    },
  };
}

export function probeMcp({ env = process.env } = {}) {
  const npxAvailable = commandExists("npx", env);
  const configuredEndpoint = env.DRAWIO_MCP_URL || env.MCP_DRAWIO_URL || null;
  return {
    local: {
      available: false,
      status: "indeterminate",
      npx: npxAvailable,
      packages: MCP_PACKAGE_CANDIDATES,
      installRequired: true,
      configuredEndpoint: redactEndpoint(configuredEndpoint),
    },
    hosted: {
      configured: Boolean(configuredEndpoint),
      endpoint: configuredEndpoint ? redactEndpoint(configuredEndpoint) : "https://mcp.draw.io/mcp",
      available: configuredEndpoint ? true : null,
      status: configuredEndpoint ? "present" : "indeterminate",
      requiresApproval: true,
      contentTransfer: "diagram XML may be sent to the hosted endpoint",
    },
  };
}

export function probeHostedPreview({ env = process.env } = {}) {
  const configured = env.DRAWIO_HOSTED_PREVIEW_URL || env.DRAWIO_MCP_URL || null;
  return {
    available: configured ? true : null,
    status: configured ? "present" : "indeterminate",
    endpoint: configured ? redactEndpoint(configured) : "https://app.diagrams.net/",
    mode: configured ? "configured-hosted" : "browser-url-fallback",
    requiresApproval: true,
    sensitiveDiagramWarning: "Hosted previews and browser URL fragments can expose diagram content",
  };
}

export function probeNixProposal({ env = process.env } = {}) {
  const nix = executableInfo("nix", { env, args: ["--version"] });
  const nixOs = fs.existsSync("/etc/NIXOS") || Boolean(env.NIXOS_VERSION) || Boolean(env.NIX_PATH);
  return {
    nixOs,
    available: nix.status === "available",
    userProfile: {
      proposal: "nix profile install nixpkgs#drawio",
      command: "nix profile install nixpkgs#drawio",
      package: "nixpkgs#drawio",
      appliesTo: "current-user",
      approvalRequired: true,
      executed: false,
    },
  };
}

export function probeDrawioToolset({ env = process.env } = {}) {
  const runtime = {
    python: probePython({ env }),
    node: probeNode({ env }),
  };
  let procVersion = "";
  try {
    procVersion = fs.readFileSync("/proc/version", "utf8");
  } catch {
    procVersion = "";
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedBy: "probe-drawio-toolset",
    receipt: {
      kind: "sanitized-capability-receipt",
      deterministic: true,
      paths: "redacted",
    },
    platform: {
      nodePlatform: process.platform,
      arch: process.arch,
      osRelease: truncate(os.release()),
      wsl: Boolean(env.WSL_DISTRO_NAME || /microsoft|wsl/i.test(procVersion)),
      distro: redactDistro(env.WSL_DISTRO_NAME),
    },
    runtime,
    drawio: probeDrawio({ env }),
    browser: probeBrowser({ env }),
    agentBrowser: probeAgentBrowser({ env }),
    mcp: probeMcp({ env }),
    hostedPreview: probeHostedPreview({ env }),
    packageManagers: probePackageManagers({ env }),
    nixProposal: probeNixProposal({ env }),
  };
}

function usage() {
  return "Usage: node scripts/probe-drawio-toolset.mjs [--json]";
}

function humanReceipt(report) {
  const python = report.runtime.python;
  const node = report.runtime.node;
  const lines = [
    "sanitized capability receipt:",
    `platform: ${report.platform.nodePlatform}/${report.platform.arch}${report.platform.wsl ? " (WSL)" : ""}`,
    `python3: ${python.status === "available" ? python.version || "available" : python.status}`,
    `node: ${node.supported ? node.version || "available" : node.status === "indeterminate" ? "indeterminate" : node.available ? "unsupported (<18)" : "unavailable"}`,
    `draw.io: ${report.drawio.selected?.command || "not found"} (version probe: --version)`,
    `transactional renderer: ${report.drawio.transactional.available ? "available" : "unavailable"}`,
    `raw/manual candidates: ${report.drawio.raw.candidates.length || "none"}`,
    `browser: ${report.browser.selected?.command || "not found"}`,
    `agent-browser: ${report.agentBrowser.available ? report.agentBrowser.version || "available" : "unavailable"}`,
    `MCP hosted preview: ${report.mcp.hosted.configured ? "configured (approval required)" : "not configured"}`,
    `package manager: ${report.packageManagers.active || "not detected"}`,
    `Nix proposal: ${report.nixProposal.userProfile.command} (proposal only)`,
  ];
  return lines.join("\n");
}

export function main(argv = process.argv.slice(2), env = process.env) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    return 2;
  }
  if (args.help) {
    console.log(usage());
    return 0;
  }
  const report = probeDrawioToolset({ env });
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else console.log(humanReceipt(report));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main();
}
