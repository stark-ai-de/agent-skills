import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import zlib from "node:zlib";

import {
  commitRenderArtifacts,
  removeRenderStagingDirectory,
  verifyCommittedRenderArtifacts,
} from "../../../skills/engineering-workflows/drawio-diagrams/scripts/lib/transactional-render-output.mjs";
import {
  discoverDrawioCandidates,
  findDrawio,
  inspectDrawioExecutable,
  pathCandidates,
  supportsDescriptorAnchoredChild,
  validateSvgXml,
} from "../../../skills/engineering-workflows/drawio-diagrams/scripts/render-drawio.mjs";
import {
  probeBrowser,
  probeDrawio,
  probeDrawioToolset,
  probeRuntime,
} from "../../../skills/engineering-workflows/drawio-diagrams/scripts/probe-drawio-toolset.mjs";
import {
  findBrowser,
  inspectThemedSvg,
} from "../../../skills/engineering-workflows/drawio-diagrams/scripts/rasterize-themed-svg.mjs";

const root = process.cwd();
const validator = path.join(
  root,
  "skills/engineering-workflows/drawio-diagrams/scripts/validate_drawio.py",
);
const strictPreflight = path.join(
  root,
  "skills/engineering-workflows/drawio-diagrams/scripts/preflight-drawio-xml.mjs",
);
const diagramRules = path.join(
  root,
  "skills/engineering-workflows/drawio-diagrams/scripts/validate-drawio-diagram-rules.mjs",
);
const examples = path.join(
  root,
  "skills/engineering-workflows/drawio-diagrams/references/examples",
);
const urlOpener = path.join(
  root,
  "skills/engineering-workflows/drawio-diagrams/scripts/open-drawio-url.mjs",
);
const renderer = path.join(
  root,
  "skills/engineering-workflows/drawio-diagrams/scripts/render-drawio.mjs",
);
const themedSvgRasterizer = path.join(
  root,
  "skills/engineering-workflows/drawio-diagrams/scripts/rasterize-themed-svg.mjs",
);
const toolsetProbe = path.join(
  root,
  "skills/engineering-workflows/drawio-diagrams/scripts/probe-drawio-toolset.mjs",
);
const shapeSearch = path.join(
  root,
  "skills/engineering-workflows/drawio-diagrams/scripts/search-shapes.mjs",
);
const PNG_CRC32_TABLE = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function run(file, extraArgs = []) {
  return spawnSync("python3", [validator, file, ...extraArgs], {
    cwd: root,
    encoding: "utf8",
  });
}

function runPreflight(file) {
  return spawnSync("node", [strictPreflight, file], {
    cwd: root,
    encoding: "utf8",
  });
}

function assertRun(name, file, expectedStatus, expectedOutput, extraArgs = [], unexpectedOutput) {
  const result = run(file, extraArgs);
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.error) throw result.error;
  if (result.status !== expectedStatus) {
    throw new Error(`${name}: expected exit ${expectedStatus}, got ${result.status}\n${output}`);
  }
  for (const expected of [expectedOutput].flat().filter(Boolean)) {
    if (!output.includes(expected)) {
      throw new Error(`${name}: expected output to include ${JSON.stringify(expected)}\n${output}`);
    }
  }
  for (const unexpected of [unexpectedOutput].flat().filter(Boolean)) {
    if (output.includes(unexpected)) {
      throw new Error(
        `${name}: expected output to exclude ${JSON.stringify(unexpected)}\n${output}`,
      );
    }
  }
}

function assertPreflight(name, file, expectedStatus, expectedOutput) {
  const result = runPreflight(file);
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.error) throw result.error;
  if (result.status !== expectedStatus) {
    throw new Error(
      `${name}: expected preflight exit ${expectedStatus}, got ${result.status}\n${output}`,
    );
  }
  if (expectedOutput && !output.includes(expectedOutput)) {
    throw new Error(
      `${name}: expected preflight output to include ${JSON.stringify(expectedOutput)}\n${output}`,
    );
  }
}

function assertNodeRun(name, args, expectedStatus, expectedOutput) {
  const result = spawnSync("node", args, {
    cwd: root,
    encoding: "utf8",
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.error) throw result.error;
  if (result.status !== expectedStatus) {
    throw new Error(`${name}: expected exit ${expectedStatus}, got ${result.status}\n${output}`);
  }
  if (expectedOutput && !output.includes(expectedOutput)) {
    throw new Error(
      `${name}: expected output to include ${JSON.stringify(expectedOutput)}\n${output}`,
    );
  }
}

function graphModel(cells) {
  return `<mxGraphModel adaptiveColors="auto" dx="800" dy="600" grid="1" gridSize="10" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
${cells}
      </root>
    </mxGraphModel>`;
}

function drawio(cells) {
  return `<mxfile host="app.diagrams.net">
  <diagram name="Regression">
    ${graphModel(cells)}
  </diagram>
</mxfile>
`;
}

function xmlAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function compressedDrawio(cells) {
  const payload = zlib.deflateRawSync(encodeURIComponent(graphModel(cells))).toString("base64");
  return `<mxfile host="app.diagrams.net">
  <diagram name="Compressed Regression">${payload}</diagram>
</mxfile>
`;
}

function edgeOnlyDrawio(style) {
  return drawio(`        <mxCell id="edge" value="" style="${style}" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="40" y="80" as="sourcePoint"/>
            <mxPoint x="300" y="80" as="targetPoint"/>
          </mxGeometry>
        </mxCell>`);
}

function embeddedSvgDrawio(uri, { bareImage = false, fixedAspect = true } = {}) {
  const imageStyle = bareImage ? "image" : "shape=image";
  const aspectStyle = fixedAspect ? "aspect=fixed;" : "";
  return drawio(`        <mxCell id="logo" value="Logo" style="${imageStyle};image=${uri};${aspectStyle}verticalLabelPosition=bottom;verticalAlign=top;html=1;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="60" height="60" as="geometry"/>
        </mxCell>`);
}

function pngCrc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = PNG_CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data = Buffer.alloc(0)) {
  const typeBytes = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(pngCrc32(Buffer.concat([typeBytes, data])), data.length + 8);
  return chunk;
}

function embeddedPng({
  width = 1,
  height = 1,
  bitDepth = 8,
  colorType = 6,
  compression = 0,
  filter = 0,
  interlace = 0,
  decoded = Buffer.from([0, 0, 0, 0, 255]),
  zlibSuffix = Buffer.alloc(0),
  extraChunks = [],
  splitIdatAt = null,
} = {}) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = bitDepth;
  header[9] = colorType;
  header[10] = compression;
  header[11] = filter;
  header[12] = interlace;
  const compressed = Buffer.concat([zlib.deflateSync(decoded), zlibSuffix]);
  const idat =
    splitIdatAt === null
      ? [compressed]
      : [compressed.subarray(0, splitIdatAt), compressed.subarray(splitIdatAt)];
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    pngChunk("IHDR", header),
    ...extraChunks.map(([type, data]) => pngChunk(type, data)),
    ...idat.map((data) => pngChunk("IDAT", data)),
    pngChunk("IEND"),
  ]);
}

const temp = mkdtempSync(path.join(tmpdir(), "drawio-validator-"));

try {
  // Tool discovery is exercised with deterministic local doubles so the
  // validator never depends on a real Desktop install, Windows interop, or a
  // network connection.  The fake native command accepts the same --version
  // and -x/-f/-o shape used by render-drawio.mjs and emits bounded artifacts.
  const nativeBin = path.join(temp, "native-bin");
  mkdirSync(nativeBin, { recursive: true });
  const nativeDrawio = path.join(nativeBin, "drawio");
  const smokePngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  writeFileSync(
    nativeDrawio,
    `#!/usr/bin/env node
import fs from "node:fs";
const args = process.argv.slice(2);
if (args.includes("--version")) { console.log("draw.io native test 1.0.0"); process.exit(0); }
if (args.includes("--help")) { console.log("-f png|svg|pdf --svg-theme light|dark --page-index"); process.exit(0); }
const format = args[args.indexOf("-f") + 1];
const output = args[args.indexOf("-o") + 1];
if (!format || !output) process.exit(2);
if (format === "png") fs.writeFileSync(output, Buffer.from("${smokePngBase64}", "base64"));
else if (format === "svg") fs.writeFileSync(output, '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="red"/></svg>');
else process.exit(3);
`,
    "utf8",
  );
  chmodSync(nativeDrawio, 0o755);

  const staleDrawio = path.join(temp, "stale-drawio");
  const nonExecutableDrawio = path.join(temp, "non-executable-drawio");
  const invalidVersionDrawio = path.join(temp, "invalid-version-drawio");
  writeFileSync(nonExecutableDrawio, "#!/bin/sh\nexit 0\n", "utf8");
  chmodSync(nonExecutableDrawio, 0o644);
  writeFileSync(
    invalidVersionDrawio,
    '#!/usr/bin/env node\nif (process.argv.includes("--version")) { console.error("not draw.io"); process.exit(7); }\nprocess.exit(2);\n',
    "utf8",
  );
  chmodSync(invalidVersionDrawio, 0o755);
  const windowsExe = path.join(temp, "drawio.exe");
  writeFileSync(windowsExe, readFileSync(nativeDrawio), "utf8");
  chmodSync(windowsExe, 0o755);
  const shellWrapper = path.join(temp, "drawio-shell-wrapper");
  writeFileSync(
    shellWrapper,
    "#!/bin/sh\nexec '/mnt/c/Program Files/draw.io/drawio.exe' \"$@\"\n",
    "utf8",
  );
  chmodSync(shellWrapper, 0o755);
  const probeChromium = path.join(temp, "probe-chromium");
  writeFileSync(probeChromium, '#!/bin/sh\nprintf "Chromium 123.0.0.0\\n"\n', "utf8");
  chmodSync(probeChromium, 0o755);
  const probeIndeterminateBrowser = path.join(temp, "probe-indeterminate-browser");
  writeFileSync(
    probeIndeterminateBrowser,
    '#!/bin/sh\nprintf "browser status unavailable\\n"\n',
    "utf8",
  );
  chmodSync(probeIndeterminateBrowser, 0o755);
  const probeFirefox = path.join(temp, "probe-firefox");
  writeFileSync(probeFirefox, '#!/bin/sh\nprintf "Mozilla Firefox 128.0\\n"\n', "utf8");
  chmodSync(probeFirefox, 0o755);

  const nativeInspection = inspectDrawioExecutable(nativeDrawio, { pathValue: nativeBin });
  if (
    !nativeInspection.executable ||
    nativeInspection.stale ||
    nativeInspection.wrapper ||
    !supportsDescriptorAnchoredChild(nativeInspection)
  ) {
    throw new Error(
      `native draw.io candidate was not accepted: ${JSON.stringify(nativeInspection)}`,
    );
  }
  const staleInspection = inspectDrawioExecutable(staleDrawio, { pathValue: nativeBin });
  const nonExecutableInspection = inspectDrawioExecutable(nonExecutableDrawio, {
    pathValue: nativeBin,
  });
  if (!staleInspection.stale || nonExecutableInspection.executable) {
    throw new Error("stale/non-executable DRAWIO_BIN candidates were accepted");
  }
  const windowsInspection = inspectDrawioExecutable(windowsExe, { pathValue: nativeBin });
  const shellInspection = inspectDrawioExecutable(shellWrapper, { pathValue: nativeBin });
  if (
    !windowsInspection.wrapper ||
    !windowsInspection.windows ||
    supportsDescriptorAnchoredChild(windowsInspection) ||
    !shellInspection.wrapper ||
    !shellInspection.windows
  ) {
    throw new Error("Windows executable or shell-wrapper candidate was treated as native");
  }
  const candidatePaths = pathCandidates({ pathValue: nativeBin, platform: "linux" });
  if (
    !candidatePaths.includes(path.join(nativeBin, "drawio")) ||
    !candidatePaths.includes("/mnt/c/Program Files/draw.io/draw.io.exe")
  ) {
    throw new Error("draw.io candidate list lost native or WSL Windows candidates");
  }
  const discoveredCandidates = discoverDrawioCandidates({
    env: { ...process.env, DRAWIO_BIN: staleDrawio, PATH: nativeBin },
    pathValue: nativeBin,
    platform: "linux",
  });
  if (
    !discoveredCandidates.some(
      (candidate) => candidate.terminalPath === nativeInspection.terminalPath,
    ) ||
    !discoveredCandidates.some((candidate) => candidate.input === staleDrawio)
  ) {
    throw new Error("draw.io discovery omitted configured diagnostics or native PATH candidate");
  }

  const fallbackEnv = { ...process.env, DRAWIO_BIN: staleDrawio, PATH: nativeBin };
  const fallbackDiscovery = findDrawio({ env: fallbackEnv, pathValue: nativeBin, details: true });
  if (fallbackDiscovery.selected?.terminalPath !== nativeInspection.terminalPath) {
    throw new Error(
      `stale DRAWIO_BIN did not fall back to native PATH candidate: ${JSON.stringify(fallbackDiscovery)}`,
    );
  }
  const nonExecutableFallback = findDrawio({
    env: { ...process.env, DRAWIO_BIN: nonExecutableDrawio, PATH: nativeBin },
    pathValue: nativeBin,
    details: true,
  });
  if (nonExecutableFallback.selected?.terminalPath !== nativeInspection.terminalPath) {
    throw new Error("non-executable DRAWIO_BIN did not fall back to native PATH candidate");
  }
  const invalidVersionFallback = findDrawio({
    env: { ...process.env, DRAWIO_BIN: invalidVersionDrawio, PATH: nativeBin },
    pathValue: nativeBin,
    details: true,
  });
  const invalidVersionCandidate = invalidVersionFallback.candidates.find(
    (candidate) => candidate.input === invalidVersionDrawio,
  );
  if (
    invalidVersionFallback.selected?.terminalPath !== nativeInspection.terminalPath ||
    invalidVersionCandidate?.versionProbeStatus !== 7
  ) {
    throw new Error(
      `invalid-version DRAWIO_BIN did not fall back to native PATH candidate: ${JSON.stringify(invalidVersionFallback)}`,
    );
  }
  const invalidRuntime = probeRuntime(invalidVersionDrawio, { env: { ...process.env } });
  if (!invalidRuntime.available || invalidRuntime.status !== "indeterminate") {
    throw new Error(
      `failed runtime version probe was not classified as indeterminate: ${JSON.stringify(invalidRuntime)}`,
    );
  }
  const invalidToolsetProbe = probeDrawio({
    env: { ...process.env, DRAWIO_BIN: invalidVersionDrawio, PATH: "" },
  });
  const invalidToolsetCandidate = invalidToolsetProbe.candidates.find(
    (candidate) => candidate.command === path.basename(invalidVersionDrawio),
  );
  if (
    !invalidToolsetCandidate ||
    invalidToolsetCandidate.available ||
    invalidToolsetCandidate.capabilities.transactional
  ) {
    throw new Error(
      `failed draw.io version probe was advertised as usable: ${JSON.stringify(invalidToolsetProbe)}`,
    );
  }
  const windowsOnly = findDrawio({
    env: { ...process.env, DRAWIO_BIN: windowsExe, PATH: "" },
    pathValue: "",
    details: true,
  });
  if (!windowsOnly.selected || supportsDescriptorAnchoredChild(windowsOnly.selected)) {
    throw new Error("Windows-only candidate did not remain a raw/manual fallback");
  }

  const smokeInput = path.join(temp, "native-smoke.drawio");
  writeFileSync(smokeInput, readFileSync(path.join(examples, "example-clean.drawio")), "utf8");
  const smokeResult = spawnSync("node", [renderer, smokeInput], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      DRAWIO_BIN: nativeDrawio,
      PATH: `${nativeBin}${path.delimiter}${process.env.PATH || ""}`,
    },
    timeout: 10_000,
  });
  const smokeOutput = `${smokeResult.stdout || ""}${smokeResult.stderr || ""}`;
  if (
    smokeResult.error ||
    smokeResult.status !== 0 ||
    !existsSync(`${smokeInput}.png`) ||
    !existsSync(path.join(temp, "native-smoke.dark.svg"))
  ) {
    throw new Error(
      `native PNG/SVG smoke export failed (status=${smokeResult.status}, error=${smokeResult.error?.message || "none"})\n${smokeOutput}`,
    );
  }
  if (!smokeOutput.includes("draw.io CLI") || !smokeOutput.includes("light PNG")) {
    throw new Error(`native smoke receipt omitted export status\n${smokeOutput}`);
  }
  if (smokeOutput.includes(temp) || smokeOutput.includes(nativeDrawio)) {
    throw new Error("native smoke receipt leaked a temporary or private executable path");
  }
  const probePath = `${nativeBin}${path.delimiter}${path.dirname(process.execPath)}`;
  const probeEnv = {
    ...process.env,
    DRAWIO_BIN: nativeDrawio,
    PATH: probePath,
  };
  const drawioProbe = probeDrawio({ env: probeEnv });
  if (
    !drawioProbe.transactional.available ||
    drawioProbe.formats.png !== true ||
    drawioProbe.formats.svg !== true
  ) {
    throw new Error(
      `draw.io probe missed transactional or format capability: ${JSON.stringify(drawioProbe)}`,
    );
  }
  const toolsetReport = probeDrawioToolset({ env: probeEnv });
  if (
    toolsetReport.drawio.transactional.available !== true ||
    toolsetReport.drawio.selected?.version !== "draw.io native test 1.0.0" ||
    toolsetReport.drawio.formats.png !== true ||
    toolsetReport.drawio.formats.svg !== true
  ) {
    throw new Error(
      `toolset probe missed native/version/PNG/SVG capabilities: ${JSON.stringify(toolsetReport.drawio)}`,
    );
  }
  const serialisedToolsetReport = JSON.stringify(toolsetReport);
  if (serialisedToolsetReport.includes(temp) || serialisedToolsetReport.includes(nativeDrawio)) {
    throw new Error("toolset capability report leaked a temporary or private path");
  }
  const privateToolsetReport = probeDrawioToolset({
    env: {
      ...probeEnv,
      DRAWIO_MCP_URL: "https://private-host.example/internal/diagram",
      DRAWIO_HOSTED_PREVIEW_URL: "https://private-host.example/preview/diagram",
      WSL_DISTRO_NAME: "private-workstation",
    },
  });
  const serialisedPrivateToolsetReport = JSON.stringify(privateToolsetReport);
  if (
    serialisedPrivateToolsetReport.includes("private-host.example") ||
    serialisedPrivateToolsetReport.includes("private-workstation")
  ) {
    throw new Error("toolset capability report leaked a configured host or private distro");
  }
  const unavailableRuntimeReport = probeDrawioToolset({
    env: {
      ...process.env,
      DRAWIO_BIN: nativeDrawio,
      PATH: path.join(temp, "missing-runtime-bin"),
    },
  });
  if (
    unavailableRuntimeReport.runtime.python.available ||
    unavailableRuntimeReport.runtime.node.available
  ) {
    throw new Error("toolset probe reported missing Python/Node as available");
  }
  const browserPresentEnv = {
    ...process.env,
    AGENT_BROWSER_EXECUTABLE_PATH: "",
    PATH: path.join(temp, "missing-browser-bin"),
    SVG_RASTER_BROWSER: probeChromium,
  };
  const presentBrowser = probeBrowser({ env: browserPresentEnv });
  if (presentBrowser.status !== "present") {
    throw new Error(`toolset probe rejected present browser: ${JSON.stringify(presentBrowser)}`);
  }
  const missingBrowserReport = probeBrowser({
    env: {
      ...process.env,
      AGENT_BROWSER_EXECUTABLE_PATH: "",
      PATH: path.join(temp, "missing-browser-bin"),
      SVG_RASTER_BROWSER: path.join(temp, "missing-chromium"),
    },
  });
  if (missingBrowserReport.status !== "missing") {
    throw new Error(
      `toolset probe did not classify missing browser: ${JSON.stringify(missingBrowserReport)}`,
    );
  }
  const indeterminateBrowserReport = probeBrowser({
    env: {
      ...process.env,
      AGENT_BROWSER_EXECUTABLE_PATH: "",
      PATH: path.join(temp, "missing-browser-bin"),
      SVG_RASTER_BROWSER: probeIndeterminateBrowser,
    },
  });
  if (indeterminateBrowserReport.status !== "indeterminate") {
    throw new Error(
      `toolset probe did not classify indeterminate browser: ${JSON.stringify(indeterminateBrowserReport)}`,
    );
  }
  const firefoxBrowserReport = probeBrowser({
    env: {
      ...process.env,
      AGENT_BROWSER_EXECUTABLE_PATH: "",
      PATH: path.join(temp, "missing-browser-bin"),
      SVG_RASTER_BROWSER: probeFirefox,
    },
  });
  if (
    firefoxBrowserReport.status !== "indeterminate" ||
    firefoxBrowserReport.selected !== null ||
    firefoxBrowserReport.fixedThemeRasterization.available
  ) {
    throw new Error(
      `toolset probe advertised Firefox as a fixed-theme browser: ${JSON.stringify(firefoxBrowserReport)}`,
    );
  }
  const probeCli = spawnSync("node", [toolsetProbe, "--json"], {
    cwd: root,
    encoding: "utf8",
    env: probeEnv,
    timeout: 10_000,
  });
  if (probeCli.status !== 0 || !probeCli.stdout.includes('"schemaVersion": 1')) {
    throw new Error(`toolset probe CLI failed\n${probeCli.stdout}${probeCli.stderr}`);
  }

  const localShapeIndex = [
    {
      title: "Attribute",
      tags: "aws dynamodb database attribute",
      style: "shape=mxgraph.aws4.attribute;",
      w: 48,
      h: 48,
      type: "vertex",
    },
    {
      title: "DynamoDB",
      tags: "aws dynamodb database",
      style: "shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.dynamodb;",
      w: 60,
      h: 60,
      type: "vertex",
    },
    {
      title: "Lambda",
      tags: "aws lambda function serverless",
      style: "shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.lambda;",
      w: 60,
      h: 60,
      type: "vertex",
    },
    {
      title: "Lambda Edge",
      tags: "aws lambda connection",
      style: "edgeStyle=orthogonalEdgeStyle;endArrow=block;",
      w: 120,
      h: 0,
      type: "edge",
    },
    {
      title: "Capital",
      tags: "finance investment",
      style: "shape=api-placeholder;",
      w: 80,
      h: 40,
      type: "vertex",
    },
    {
      title: "Gateway",
      tags: "api service gateway",
      style: "shape=mxgraph.kubernetes.icon2;prIcon=api;",
      w: 50,
      h: 48,
      type: "vertex",
    },
  ];
  const shapeIndexJson = path.join(temp, "shape-index.json");
  const shapeIndexGzip = path.join(temp, "shape-index.json.gz");
  writeFileSync(shapeIndexJson, `${JSON.stringify(localShapeIndex)}\n`, "utf8");
  writeFileSync(shapeIndexGzip, zlib.gzipSync(Buffer.from(JSON.stringify(localShapeIndex))));

  const exactShapeSearch = spawnSync(
    "node",
    [shapeSearch, "dynamodb", "--index", shapeIndexJson, "--json"],
    { cwd: root, encoding: "utf8" },
  );
  if (exactShapeSearch.status !== 0) {
    throw new Error(`shape search JSON: ${exactShapeSearch.stderr}`);
  }
  const exactMatches = JSON.parse(exactShapeSearch.stdout);
  if (exactMatches[0]?.title !== "DynamoDB") {
    throw new Error(`shape search title ranking: ${exactShapeSearch.stdout}`);
  }
  const tagOnlyShapeSearch = spawnSync(
    "node",
    [shapeSearch, "api", "--index", shapeIndexJson, "--json"],
    { cwd: root, encoding: "utf8" },
  );
  const tagOnlyMatches = JSON.parse(tagOnlyShapeSearch.stdout || "[]");
  if (
    tagOnlyShapeSearch.status !== 0 ||
    tagOnlyMatches.length !== 1 ||
    tagOnlyMatches[0]?.title !== "Gateway"
  ) {
    throw new Error(
      `shape search must match tags, not title/style substrings: ${tagOnlyShapeSearch.stdout}`,
    );
  }
  assertNodeRun(
    "shape search phonetic fallback",
    [shapeSearch, "aws", "lmbda", "--index", shapeIndexJson],
    0,
    "Lambda [vertex]",
  );
  const partialShapeSearch = spawnSync(
    "node",
    [shapeSearch, "aws", "lambda", "nonsense", "--index", shapeIndexJson],
    { cwd: root, encoding: "utf8" },
  );
  if (
    partialShapeSearch.status !== 0 ||
    !partialShapeSearch.stdout.includes("Lambda [vertex]") ||
    !partialShapeSearch.stderr.includes("showing ranked partial matches")
  ) {
    throw new Error(
      `shape search partial fallback:\n${partialShapeSearch.stdout}${partialShapeSearch.stderr}`,
    );
  }
  assertNodeRun(
    "shape search edge filter",
    [shapeSearch, "lambda", "--type", "edge", "--index", shapeIndexJson],
    0,
    "Lambda Edge [edge]",
  );
  assertNodeRun(
    "shape search gzip index",
    [shapeSearch, "dynamodb", "--index", shapeIndexGzip, "--json"],
    0,
    '"title": "DynamoDB"',
  );

  const cacheHome = path.join(temp, "cache-home");
  const cacheDir = path.join(cacheHome, ".cache", "drawio-diagrams");
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(path.join(cacheDir, "search-index.json"), JSON.stringify(localShapeIndex), "utf8");
  const cacheEnv = { ...process.env, HOME: cacheHome };
  delete cacheEnv.DRAWIO_SHAPE_INDEX;
  const cachedShapeSearch = spawnSync("node", [shapeSearch, "dynamodb", "--json"], {
    cwd: root,
    encoding: "utf8",
    env: cacheEnv,
  });
  if (cachedShapeSearch.status !== 0 || !cachedShapeSearch.stdout.includes('"DynamoDB"')) {
    throw new Error(`shape search standard cache: ${cachedShapeSearch.stderr}`);
  }
  assertNodeRun(
    "shape search unknown option",
    [shapeSearch, "lambda", "--unknown", "--index", shapeIndexJson],
    2,
    "Unknown option: --unknown",
  );
  const emptyHome = path.join(temp, "empty-home");
  mkdirSync(emptyHome);
  const emptyCacheEnv = { ...process.env, HOME: emptyHome };
  delete emptyCacheEnv.DRAWIO_SHAPE_INDEX;
  const missingShapeIndex = spawnSync("node", [shapeSearch, "lambda"], {
    cwd: root,
    encoding: "utf8",
    env: emptyCacheEnv,
  });
  if (
    missingShapeIndex.status !== 2 ||
    !missingShapeIndex.stderr.includes("Shape index not configured")
  ) {
    throw new Error(`shape search missing index: ${missingShapeIndex.stderr}`);
  }

  assertRun("clean example", path.join(examples, "example-clean.drawio"), 0, undefined, [
    "--animation",
    "on",
  ]);
  assertRun(
    "architecture icons example",
    path.join(examples, "architecture-icons.drawio"),
    0,
    undefined,
    ["--animation", "on"],
  );
  assertRun(
    "icon catalog smoke example",
    path.join(examples, "icon-catalog-smoke.drawio"),
    0,
    undefined,
    ["--animation", "on"],
  );
  assertRun("existing edit before example", path.join(examples, "existing-edit-before.drawio"), 0);
  assertRun("existing edit after example", path.join(examples, "existing-edit-after.drawio"), 0);
  assertRun("multi-page example", path.join(examples, "multi-page.drawio"), 0, undefined, [
    "--animation",
    "on",
  ]);
  assertRun(
    "compressed page before example",
    path.join(examples, "compressed-page-before.drawio"),
    0,
  );
  assertRun(
    "crowded routing before example",
    path.join(examples, "crowded-routing-before.drawio"),
    0,
  );
  assertRun("animation on policy", path.join(examples, "animation-on.drawio"), 0, undefined, [
    "--animation",
    "on",
  ]);
  assertRun(
    "animation on rejected by opt-out policy",
    path.join(examples, "animation-on.drawio"),
    1,
    "flowAnimation=1 is forbidden under --animation off",
    ["--animation", "off"],
  );
  assertRun("animation opt-out policy", path.join(examples, "animation-off.drawio"), 0, undefined, [
    "--animation",
    "off",
  ]);
  assertRun("animation preserve default", path.join(examples, "animation-off.drawio"), 0);
  assertRun(
    "animation on requires directed flow animation",
    path.join(examples, "animation-off.drawio"),
    1,
    "directed semantic flow edge requires flowAnimation=1 under --animation on",
    ["--animation", "on"],
  );

  const explicitlyDisabledAnimation = path.join(temp, "explicitly-disabled-animation.drawio");
  writeFileSync(
    explicitlyDisabledAnimation,
    edgeOnlyDrawio("html=1;endArrow=block;dataRole=request;flowAnimation=0;"),
    "utf8",
  );
  assertRun(
    "flowAnimation zero accepted by opt-out policy",
    explicitlyDisabledAnimation,
    0,
    undefined,
    ["--animation", "off"],
  );
  assertRun(
    "flowAnimation zero rejected by animation-on policy",
    explicitlyDisabledAnimation,
    1,
    "directed semantic flow edge requires flowAnimation=1 under --animation on",
    ["--animation", "on"],
  );
  assertRun("invalid animation values", path.join(examples, "animation-invalid.drawio"), 1, [
    'flowAnimationDuration must be a positive integer, got "fast"',
    'flowAnimationTimingFunction must be one of ease, ease-in, ease-in-out, ease-out, linear, got "spring"',
  ]);
  assertRun(
    "static dependency animation exemption",
    path.join(examples, "animation-static-dependency.drawio"),
    0,
    undefined,
    ["--animation", "on"],
  );

  const animatedStaticEdge = path.join(temp, "animated-static-edge.drawio");
  writeFileSync(
    animatedStaticEdge,
    edgeOnlyDrawio("html=1;endArrow=open;dataRole=dependency;flowAnimation=1;"),
    "utf8",
  );
  assertRun(
    "animated static role warning",
    animatedStaticEdge,
    0,
    'static edge role "dependency" should not use flowAnimation=1',
  );

  const undirectedEdge = path.join(temp, "undirected-animation-exemption.drawio");
  writeFileSync(undirectedEdge, edgeOnlyDrawio("html=1;endArrow=none;"), "utf8");
  assertRun("undirected animation exemption", undirectedEdge, 0, undefined, ["--animation", "on"]);

  const explicitFlowEdge = path.join(temp, "explicit-flow-animation.drawio");
  writeFileSync(explicitFlowEdge, edgeOnlyDrawio("html=1;endArrow=none;dataRole=event;"), "utf8");
  assertRun(
    "explicit flow role overrides undirected exemption",
    explicitFlowEdge,
    1,
    "directed semantic flow edge requires flowAnimation=1 under --animation on",
    ["--animation", "on"],
  );

  const motionOnlyDirection = path.join(temp, "motion-only-direction.drawio");
  writeFileSync(
    motionOnlyDirection,
    edgeOnlyDrawio("html=1;endArrow=none;dataRole=request;flowAnimation=1;"),
    "utf8",
  );
  assertRun(
    "motion cannot carry direction alone",
    motionOnlyDirection,
    1,
    'semantic flow role "request" has no static arrow direction; animation must not carry direction alone',
    ["--animation", "on"],
  );

  const ambiguousAnimatedLegend = path.join(temp, "ambiguous-animated-legend.drawio");
  writeFileSync(
    ambiguousAnimatedLegend,
    drawio(`        <mxCell id="source" value="Source" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;fontColor=#1f2937;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="120" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="target" value="Target" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;fontColor=#1f2937;" vertex="1" parent="1">
          <mxGeometry x="300" y="40" width="120" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="legend" value="Solid = runtime; Dashed = pending" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f5f5f5;fontColor=#1f2937;dataRole=legend;" vertex="1" parent="1">
          <mxGeometry x="40" y="150" width="380" height="40" as="geometry"/>
        </mxCell>
        <mxCell id="flow" value="" style="edgeStyle=orthogonalEdgeStyle;html=1;endArrow=block;dataRole=request;flowAnimation=1;" edge="1" parent="1" source="source" target="target">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertRun(
    "animated legend cannot rely on solid versus dashed",
    ambiguousAnimatedLegend,
    0,
    "legend uses solid/dashed edge semantics while flowAnimation=1 renders a moving dash pattern",
    ["--animation", "on"],
  );

  const animatedVertex = path.join(temp, "animated-vertex.drawio");
  writeFileSync(
    animatedVertex,
    drawio(`        <mxCell id="node" value="Node" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;fontColor=#1f2937;flowAnimation=1;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="160" height="60" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertRun(
    "animation properties rejected on vertices",
    animatedVertex,
    1,
    "flow animation styles are only valid on edges",
  );

  const invalidAnimationKeys = path.join(temp, "invalid-animation-keys.drawio");
  writeFileSync(
    invalidAnimationKeys,
    edgeOnlyDrawio(
      "html=1;endArrow=block;flowAnimation=yes;flowAnimationDirection=forward;flowAnimationSpeed=quick;",
    ),
    "utf8",
  );
  assertRun("invalid native animation keys", invalidAnimationKeys, 1, [
    'unknown flow animation style key "flowAnimationSpeed"',
    'flowAnimation must be 0 or 1, got "yes"',
    'flowAnimationDirection must be one of alternate, alternate-reverse, normal, reverse, got "forward"',
  ]);
  assertRun("broken example", path.join(examples, "example-broken.drawio"), 1, "duplicate id");
  assertRun(
    "contrast example",
    path.join(examples, "example-contrast-broken.drawio"),
    1,
    "text/fill contrast below 4.5:1",
  );
  assertPreflight(
    "comment strict parse example",
    path.join(examples, "example-comment-broken.drawio"),
    2,
    "XML comments are forbidden",
  );
  assertPreflight(
    "doctype strict parse example",
    path.join(examples, "example-doctype-broken.drawio"),
    2,
    "DOCTYPE declarations are forbidden",
  );
  assertPreflight(
    "processing instruction strict parse example",
    path.join(examples, "example-processing-instruction-broken.drawio"),
    2,
    "processing instructions are forbidden",
  );
  assertPreflight(
    "compressed page before strict parse",
    path.join(examples, "compressed-page-before.drawio"),
    0,
  );
  assertPreflight(
    "crowded routing before strict parse",
    path.join(examples, "crowded-routing-before.drawio"),
    0,
  );

  const compressedForbidden = path.join(temp, "compressed-comment.drawio");
  writeFileSync(
    compressedForbidden,
    `<mxfile host="app.diagrams.net">
  <diagram name="Compressed Forbidden">dY5BCsJADEVPk2VhmhxhbLvyECOJODBthjhKj2/abhTsKo88/k+A4rxOlurjqiwFMCROteW3RC1qT6ALIKZXUx9AA1A01XYQYN91Hrmr3TKzLM6+2N28RilbX+ajI2wFOJ7YfrehJpOl/Qk4fN8df56m4QM=</diagram>
</mxfile>
`,
    "utf8",
  );
  assertPreflight(
    "compressed comment strict parse example",
    compressedForbidden,
    2,
    "compressed diagram payload contains XML comments are forbidden",
  );

  assertNodeRun(
    "diagram rules clean example",
    [diagramRules, path.join(examples, "example-clean.drawio")],
    0,
    "diagram rule error(s)",
  );
  assertNodeRun(
    "diagram rules architecture icons example",
    [diagramRules, path.join(examples, "architecture-icons.drawio")],
    0,
    "0 diagram rule error(s), 0 warning(s)",
  );
  assertNodeRun(
    "diagram rules icon catalog smoke example",
    [diagramRules, path.join(examples, "icon-catalog-smoke.drawio")],
    0,
    "0 diagram rule error(s), 0 warning(s)",
  );
  const iconlessComponent = path.join(temp, "iconless-component.drawio");
  writeFileSync(
    iconlessComponent,
    drawio(`        <mxCell id="component" value="API" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;fontColor=#1f2937;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="160" height="64" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertNodeRun(
    "diagram rules iconless component warning",
    [diagramRules, iconlessComponent],
    0,
    "component has no icon/logo",
  );

  const garbageImageComponent = path.join(temp, "garbage-image-component.drawio");
  writeFileSync(garbageImageComponent, embeddedSvgDrawio("garbage"), "utf8");
  assertNodeRun(
    "diagram rules garbage image is not an icon",
    [diagramRules, garbageImageComponent],
    0,
    "component has no icon/logo",
  );

  const validPngComponent = path.join(temp, "valid-png-component.drawio");
  const validPng =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  writeFileSync(validPngComponent, embeddedSvgDrawio(`data:image/png,${validPng}`), "utf8");
  assertNodeRun(
    "diagram rules valid PNG is an icon",
    [diagramRules, validPngComponent],
    0,
    "0 diagram rule error(s), 0 warning(s)",
  );
  assertRun("valid embedded PNG", validPngComponent, 0, "0 error(s)");

  const percentEncodedPng = [...Buffer.from(validPng, "base64")]
    .map((byte) => `%${byte.toString(16).padStart(2, "0").toUpperCase()}`)
    .join("");
  const percentEncodedPngComponent = path.join(temp, "percent-encoded-png-component.drawio");
  writeFileSync(
    percentEncodedPngComponent,
    embeddedSvgDrawio(`data:image/png,${percentEncodedPng}`),
    "utf8",
  );
  assertNodeRun(
    "diagram rules percent-encoded PNG is an icon",
    [diagramRules, percentEncodedPngComponent],
    0,
    "0 diagram rule error(s), 0 warning(s)",
  );
  assertRun("valid percent-encoded PNG", percentEncodedPngComponent, 0, "0 error(s)");

  const truncatedPngHeader = Buffer.alloc(24);
  Buffer.from("89504e470d0a1a0a", "hex").copy(truncatedPngHeader);
  truncatedPngHeader.write("IHDR", 12, "ascii");
  truncatedPngHeader.writeUInt32BE(1, 16);
  truncatedPngHeader.writeUInt32BE(1, 20);

  for (const [name, source] of [
    ["empty-png", "data:image/png,"],
    ["garbage-png", "data:image/png,not-a-png"],
    ["truncated-png", `data:image/png,${truncatedPngHeader.toString("base64")}`],
  ]) {
    const invalidPngComponent = path.join(temp, `${name}-component.drawio`);
    writeFileSync(invalidPngComponent, embeddedSvgDrawio(source), "utf8");
    assertNodeRun(
      `diagram rules ${name} is not an icon`,
      [diagramRules, invalidPngComponent],
      0,
      "component has no icon/logo",
    );
    assertRun(`invalid embedded ${name}`, invalidPngComponent, 1, "invalid embedded image");
  }

  for (const { name, png, expected } of [
    {
      name: "short-scanline-png",
      png: embeddedPng({ decoded: Buffer.from([0]) }),
      expected: "scanline layout",
    },
    {
      name: "interlaced-png",
      png: embeddedPng({ interlace: 1 }),
      expected: "interlacing is unsupported",
    },
    {
      name: "trailing-zlib-png",
      png: embeddedPng({ zlibSuffix: Buffer.from([0]) }),
      expected: "trailing zlib stream",
    },
    {
      name: "inflate-limit-png",
      png: embeddedPng({
        width: 32_768,
        height: 32_768,
        decoded: Buffer.from([0]),
      }),
      expected: "decoded data exceeds the validation limit",
    },
  ]) {
    const invalidPngComponent = path.join(temp, `${name}-component.drawio`);
    writeFileSync(
      invalidPngComponent,
      embeddedSvgDrawio(`data:image/png,${png.toString("base64")}`),
      "utf8",
    );
    assertNodeRun(
      `diagram rules ${name} is not an icon`,
      [diagramRules, invalidPngComponent],
      0,
      "component has no icon/logo",
    );
    assertRun(`invalid embedded ${name}`, invalidPngComponent, 1, expected);
  }

  const protocolRelativeImageComponent = path.join(
    temp,
    "protocol-relative-image-component.drawio",
  );
  writeFileSync(
    protocolRelativeImageComponent,
    embeddedSvgDrawio("//cdn.example/logo.svg"),
    "utf8",
  );
  assertNodeRun(
    "diagram rules protocol-relative image is not an icon",
    [diagramRules, protocolRelativeImageComponent],
    0,
    "component has no icon/logo",
  );
  assertRun(
    "protocol-relative remote image warning",
    protocolRelativeImageComponent,
    0,
    "linked/remote icon in portable mode",
  );

  const rectangleComponent = path.join(temp, "rectangle-component.drawio");
  writeFileSync(
    rectangleComponent,
    drawio(`        <mxCell id="component" value="API" style="shape=rectangle;whiteSpace=wrap;html=1;fillColor=#dae8fc;fontColor=#1f2937;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="160" height="64" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertNodeRun(
    "diagram rules rectangle is not an icon",
    [diagramRules, rectangleComponent],
    0,
    "component has no icon/logo",
  );

  const textIconChild = path.join(temp, "text-icon-child.drawio");
  writeFileSync(
    textIconChild,
    drawio(`        <mxCell id="component" value="API" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;fontColor=#1f2937;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="160" height="64" as="geometry"/>
        </mxCell>
        <mxCell id="fake-icon" value="i" style="text;html=1;fillColor=none;strokeColor=none;dataRole=icon;" vertex="1" parent="component">
          <mxGeometry x="8" y="8" width="24" height="24" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertNodeRun(
    "diagram rules text child is not an icon",
    [diagramRules, textIconChild],
    0,
    "component has no icon/logo",
  );

  const cylinderComponent = path.join(temp, "cylinder-component.drawio");
  writeFileSync(
    cylinderComponent,
    drawio(`        <mxCell id="component" value="Database" style="cylinder;whiteSpace=wrap;html=1;fillColor=#dae8fc;fontColor=#1f2937;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="100" height="72" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertNodeRun(
    "diagram rules bare semantic symbol",
    [diagramRules, cylinderComponent],
    0,
    "0 diagram rule error(s), 0 warning(s)",
  );

  for (const { name, style } of [
    {
      name: "aws-resource-wrapper",
      style: "shape=mxgraph.aws4.resourceIcon;dataRole=component;",
    },
    {
      name: "kubernetes-icon-wrapper",
      style: "shape=mxgraph.kubernetes.icon2;dataRole=component;",
    },
  ]) {
    const selectorlessWrapper = path.join(temp, `${name}.drawio`);
    writeFileSync(
      selectorlessWrapper,
      drawio(`        <mxCell id="component" value="Service" style="${style}" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="80" height="80" as="geometry"/>
        </mxCell>`),
      "utf8",
    );
    assertNodeRun(
      `diagram rules selectorless ${name}`,
      [diagramRules, selectorlessWrapper],
      0,
      "component has no icon/logo",
    );
  }

  const selectedIconWrappers = path.join(temp, "selected-icon-wrappers.drawio");
  writeFileSync(
    selectedIconWrappers,
    drawio(`        <mxCell id="aws" value="Lambda" style="shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.lambda;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="80" height="80" as="geometry"/>
        </mxCell>
        <mxCell id="kubernetes" value="Pod" style="shape=mxgraph.kubernetes.icon2;prIcon=pod;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="160" y="40" width="80" height="80" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertNodeRun(
    "diagram rules selected icon wrappers",
    [diagramRules, selectedIconWrappers],
    0,
    "0 diagram rule error(s), 0 warning(s)",
  );

  const componentWithIcon = path.join(temp, "component-with-icon.drawio");
  writeFileSync(
    componentWithIcon,
    drawio(`        <mxCell id="component" value="" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;fontColor=#1f2937;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="160" height="80" as="geometry"/>
        </mxCell>
        <mxCell id="component-icon" value="" style="shape=mxgraph.flowchart.document;html=1;dataRole=icon;" vertex="1" parent="component">
          <mxGeometry x="8" y="16" width="40" height="40" as="geometry"/>
        </mxCell>
        <mxCell id="component-title" value="Document API" style="text;html=1;fillColor=none;strokeColor=none;dataRole=title;" vertex="1" parent="component">
          <mxGeometry x="56" y="20" width="96" height="32" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertNodeRun(
    "diagram rules component icon coverage",
    [diagramRules, componentWithIcon],
    0,
    "0 diagram rule error(s), 0 warning(s)",
  );

  // A resolved embedded logo is an immutable witness when an adjacent brand
  // cannot be resolved.  Keep this fixture tied to the accepted PostgreSQL
  // source bytes and colors so a future fallback change cannot silently turn
  // the whole page into a recolored or vendor-neutral treatment.
  const offlinePeerFixture = path.join(
    root,
    "skill-evals/drawio-diagrams/fixtures/offline-icon-before.drawio",
  );
  const offlinePeerSource = readFileSync(offlinePeerFixture, "utf8");
  const postgresImageMatch = offlinePeerSource.match(
    /image=(data:image\/svg\+xml,[^;]+);aspect=fixed/,
  );
  if (!postgresImageMatch) {
    throw new Error("offline icon fixture lost its embedded PostgreSQL image payload");
  }
  const postgresImageUri = postgresImageMatch[1];
  const postgresSvg = decodeURIComponent(postgresImageUri.slice("data:image/svg+xml,".length));
  const postgresSvgDigest = createHash("sha256").update(postgresSvg, "utf8").digest("hex");
  if (
    postgresSvgDigest !== "4d0abd8d1835c357829c0d0ea2e25f106f57d8735d861aa7ced10df825e3c55a" ||
    !postgresSvg.includes('fill="#3b82f6"') ||
    !postgresSvg.includes('fill="#dbeafe"') ||
    /(?:<filter\b|\bfilter\s*=|\bstyle\s*=)/i.test(postgresSvg)
  ) {
    throw new Error(
      "offline PostgreSQL peer fixture changed its original colors, bytes, or paint behavior",
    );
  }
  const unresolvedPeerFallback = path.join(temp, "resolved-peer-with-unresolved-fallback.drawio");
  writeFileSync(
    unresolvedPeerFallback,
    drawio(`        <mxCell id="postgres" value="PostgreSQL" style="shape=image;image=${postgresImageUri};aspect=fixed;verticalLabelPosition=bottom;verticalAlign=top;html=1;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="72" height="72" as="geometry"/>
        </mxCell>
        <mxCell id="acme-ledger" value="Acme Ledger" style="shape=process;whiteSpace=wrap;html=1;fillColor=#f8fafc;strokeColor=#64748b;fontColor=#0f172a;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="200" y="40" width="140" height="72" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertNodeRun(
    "resolved logo plus unresolved semantic fallback",
    [diagramRules, unresolvedPeerFallback],
    0,
    "0 diagram rule error(s), 0 warning(s)",
  );
  assertRun("resolved logo plus unresolved fallback XML", unresolvedPeerFallback, 0, "0 error(s)");

  assertNodeRun(
    "diagram rules multi-page example",
    [diagramRules, path.join(examples, "multi-page.drawio")],
    0,
    "0 diagram rule error(s), 0 warning(s)",
  );
  assertNodeRun(
    "diagram rules compressed page before example",
    [diagramRules, path.join(examples, "compressed-page-before.drawio")],
    0,
    "0 diagram rule error(s)",
  );
  assertNodeRun(
    "diagram rules crowded routing before example",
    [diagramRules, path.join(examples, "crowded-routing-before.drawio")],
    0,
    "0 diagram rule error(s)",
  );
  assertNodeRun(
    "browser URL builder",
    [urlOpener, path.join(examples, "example-clean.drawio"), "--print-only"],
    0,
    "https://app.diagrams.net/?grid=0&pv=0&border=10&edit=_blank#create=",
  );
  assertNodeRun(
    "renderer rejects invalid page index",
    [renderer, path.join(examples, "multi-page.drawio"), "--page-index", "0"],
    2,
    "--page-index must be a positive 1-based integer",
  );
  const fixedThemeSvg = (theme, body = '<rect width="2" height="2" fill="red"/>') =>
    `<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme: ${theme};" width="2px" height="2px" viewBox="0 0 2 2">${body}</svg>`;
  const lightInspection = inspectThemedSvg(fixedThemeSvg("light"));
  const darkInspection = inspectThemedSvg(fixedThemeSvg("dark"));
  if (
    lightInspection.theme !== "light" ||
    darkInspection.theme !== "dark" ||
    lightInspection.width !== 2 ||
    lightInspection.height !== 2
  ) {
    throw new Error("themed SVG rasterizer lost fixed theme or dimensions");
  }
  for (const [name, svg, expected] of [
    ["adaptive theme", fixedThemeSvg("light dark"), "fixed light or fixed dark"],
    [
      "quoted color-scheme lookalike",
      `<svg xmlns="http://www.w3.org/2000/svg" style="content: ';color-scheme: light;';" width="2" height="2"><rect width="2" height="2"/></svg>`,
      "exactly one color-scheme",
    ],
    [
      "comment-spoofed root",
      `<!-- <svg xmlns="http://www.w3.org/2000/svg" style="color-scheme: light;" width="1" height="1"> -->
<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme: light dark;" width="200" height="100"><rect width="200" height="100"/></svg>`,
      "fixed light or fixed dark",
    ],
    [
      "root event handler",
      '<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme: light;" width="2" height="2" onload="alert(1)"><rect width="2" height="2"/></svg>',
      "event handler",
    ],
    [
      "namespace-prefixed script",
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:x="http://www.w3.org/2000/svg" style="color-scheme: light;" width="2" height="2"><x:script>location.href="file:///etc/passwd"</x:script><rect width="2" height="2"/></svg>',
      "active content element",
    ],
    [
      "javascript link",
      '<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme: light;" width="2" height="2"><a href="javascript:alert(1)"><rect width="2" height="2"/></a></svg>',
      "active URL scheme",
    ],
    [
      "encoded javascript link",
      '<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme: light;" width="2" height="2"><a href="java&#x73;cript:alert(1)"><rect width="2" height="2"/></a></svg>',
      "active URL scheme",
    ],
    [
      "animated external reference",
      '<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme: light;" width="2" height="2"><image id="mark" href="#local"/><set href="#mark" attributeName="href" to="https://example.invalid/icon.svg"/></svg>',
      "active content element",
    ],
    [
      "external image",
      '<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme: light;" width="2" height="2"><image href="https://example.invalid/icon.svg"/></svg>',
      "external image or symbol",
    ],
    [
      "remote XML base",
      '<svg xmlns="http://www.w3.org/2000/svg" xml:base="https://example.invalid/icon.svg" style="color-scheme: light;" width="2" height="2"><use href="#mark"/></svg>',
      "xml:base",
    ],
    [
      "local-file XML base",
      '<svg xmlns="http://www.w3.org/2000/svg" xml:base="file:///tmp/icon.svg" style="color-scheme: light;" width="2" height="2"><use href="#mark"/></svg>',
      "xml:base",
    ],
    [
      "external CSS asset",
      '<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme: light; background: url(https://example.invalid/bg.png);" width="2" height="2"><rect width="2" height="2"/></svg>',
      "external CSS render asset",
    ],
    [
      "string-form CSS image-set asset",
      `<svg xmlns="http://www.w3.org/2000/svg" style='color-scheme: light; background-image: image-set("https://example.invalid/bg.png" 1x);' width="2" height="2"><rect width="2" height="2"/></svg>`,
      "CSS image-set",
    ],
    [
      "external presentation attribute",
      '<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme: light;" width="2" height="2"><rect width="2" height="2" filter="url(file:///etc/passwd)"/></svg>',
      "external CSS render asset",
    ],
    [
      "comment-obfuscated CSS asset",
      '<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme: light;" width="2" height="2"><rect width="2" height="2" style="fill:u/**/rl(file:///etc/passwd)"/></svg>',
      "CSS escapes and comments",
    ],
    [
      "escape-obfuscated CSS asset",
      '<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme: light;" width="2" height="2"><rect width="2" height="2" style="fill:u\\72l(file:///etc/passwd)"/></svg>',
      "CSS escapes and comments",
    ],
    [
      "active handler element",
      '<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme: light;" width="2" height="2"><handler>location.href="file:///etc/passwd"</handler></svg>',
      "active content element",
    ],
    [
      "data document use",
      '<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme: light;" width="2" height="2"><use href="data:text/html,&lt;script&gt;alert(1)&lt;/script&gt;"/></svg>',
      "external image or symbol",
    ],
    [
      "external foreign-object image",
      '<svg xmlns="http://www.w3.org/2000/svg" style="color-scheme: light;" width="2" height="2"><foreignObject><div xmlns="http://www.w3.org/1999/xhtml"><img src="https://example.invalid/icon.png"/></div></foreignObject></svg>',
      "external HTML render asset",
    ],
  ]) {
    let failure;
    try {
      inspectThemedSvg(svg);
    } catch (error) {
      failure = error;
    }
    if (!failure?.message.includes(expected)) {
      throw new Error(`${name} passed themed SVG inspection`);
    }
  }
  const embeddedSvgUri = (svg) => `data:image/svg+xml,${encodeURIComponent(svg)}`;
  const nestedSvgDocument = (body) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2">${body}</svg>`;
  const safeEmbeddedSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><path d="M0 0h2v2H0z" fill="blue"/></svg>';
  const safeEmbeddedUri = embeddedSvgUri(safeEmbeddedSvg);
  inspectThemedSvg(fixedThemeSvg("light", `<image href="${safeEmbeddedUri}"/>`));
  let boundlessEmbeddedFailure;
  try {
    inspectThemedSvg(
      fixedThemeSvg(
        "light",
        `<image href="${embeddedSvgUri('<svg xmlns="http://www.w3.org/2000/svg"><rect width="2" height="2"/></svg>')}"/>`,
      ),
    );
  } catch (error) {
    boundlessEmbeddedFailure = error;
  }
  if (!boundlessEmbeddedFailure?.message.includes("positive viewBox or width and height")) {
    throw new Error("themed SVG rasterizer accepted a boundless embedded SVG");
  }
  let boundedNestedSvg = nestedSvgDocument('<rect width="2" height="2" fill="blue"/>');
  for (let level = 0; level < 3; level += 1) {
    boundedNestedSvg = nestedSvgDocument(`<image href="${embeddedSvgUri(boundedNestedSvg)}"/>`);
  }
  inspectThemedSvg(fixedThemeSvg("light", `<image href="${embeddedSvgUri(boundedNestedSvg)}"/>`));
  let tooDeepNestedSvg = boundedNestedSvg;
  tooDeepNestedSvg = nestedSvgDocument(`<image href="${embeddedSvgUri(tooDeepNestedSvg)}"/>`);
  let depthFailure;
  try {
    inspectThemedSvg(fixedThemeSvg("light", `<image href="${embeddedSvgUri(tooDeepNestedSvg)}"/>`));
  } catch (error) {
    depthFailure = error;
  }
  if (!depthFailure?.message.includes("nesting exceeds 4 levels")) {
    throw new Error("themed SVG rasterizer accepted excessive embedded SVG nesting");
  }
  const aggregateSvg = nestedSvgDocument(`<!--${"x".repeat(900_000)}-->`);
  const aggregateUri = embeddedSvgUri(aggregateSvg);
  let aggregateFailure;
  try {
    inspectThemedSvg(
      fixedThemeSvg(
        "light",
        Array.from({ length: 10 }, () => `<image href="${aggregateUri}"/>`).join(""),
      ),
    );
  } catch (error) {
    aggregateFailure = error;
  }
  if (!aggregateFailure?.message.includes("aggregate size limit")) {
    throw new Error("themed SVG rasterizer accepted excessive embedded SVG bytes");
  }
  const nestedUnsafeCases = [
    [
      "nested SVG script",
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><script>alert(1)</script></svg>',
      "active content element",
      "base64",
    ],
    [
      "nested SVG remote image",
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><image href="https://example.invalid/nested.svg"/></svg>',
      "external image or symbol",
      "encoded",
    ],
    [
      "nested SVG remote CSS",
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><style>.remote{fill:url(https://example.invalid/nested.svg)}</style><rect class="remote" width="2" height="2"/></svg>',
      "external CSS render asset",
      "encoded",
    ],
  ];
  for (const [name, nested, expected, encoding] of nestedUnsafeCases) {
    const uri =
      encoding === "base64"
        ? `data:image/svg+xml;base64,${Buffer.from(nested).toString("base64")}`
        : embeddedSvgUri(nested);
    let failure;
    try {
      inspectThemedSvg(fixedThemeSvg("light", `<image href="${uri}"/>`));
    } catch (error) {
      failure = error;
    }
    if (!failure?.message.includes(expected)) {
      throw new Error(`${name} passed nested themed SVG inspection`);
    }
  }
  let doctypeFailure;
  try {
    inspectThemedSvg(
      '<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg xmlns="http://www.w3.org/2000/svg" style="color-scheme: light;" width="2" height="2"><rect width="2" height="2"/></svg>',
    );
  } catch (error) {
    doctypeFailure = error;
  }
  if (!doctypeFailure?.message.includes("DOCTYPE")) {
    throw new Error("themed SVG rasterizer accepted an external DOCTYPE");
  }
  if (findBrowser("true") !== null) {
    throw new Error("themed SVG rasterizer accepted an unpinned PATH command as its browser");
  }
  const missingBrowser = path.join(temp, "missing-browser");
  if (findBrowser(missingBrowser) !== null) {
    throw new Error("themed SVG rasterizer accepted a missing browser path");
  }
  const nonBrowserExecutable = path.join(temp, "not-a-browser");
  writeFileSync(nonBrowserExecutable, '#!/bin/sh\nprintf "not a browser 1.0\\n"\n', "utf8");
  chmodSync(nonBrowserExecutable, 0o755);
  if (findBrowser(nonBrowserExecutable) !== null) {
    throw new Error("themed SVG rasterizer accepted a non-Chromium browser executable");
  }
  const indeterminateBrowser = path.join(temp, "indeterminate-browser");
  writeFileSync(
    indeterminateBrowser,
    '#!/bin/sh\nprintf "browser status unavailable\\n"\n',
    "utf8",
  );
  chmodSync(indeterminateBrowser, 0o755);
  if (findBrowser(indeterminateBrowser) !== null) {
    throw new Error("themed SVG rasterizer accepted an indeterminate browser version");
  }
  const fakeBrowser = path.join(temp, "fake-chromium");
  const fakeBrowserPng = embeddedPng({
    width: 2,
    height: 2,
    decoded: Buffer.alloc(18),
  });
  writeFileSync(
    fakeBrowser,
    `#!/usr/bin/env node
import fs from "node:fs";
if (process.argv.includes("--version")) {
  console.log("Chromium 123.0.0.0");
  process.exit(0);
}
const screenshot = process.argv.find((arg) => arg.startsWith("--screenshot="))?.slice("--screenshot=".length);
if (!screenshot) process.exit(2);
if (!process.argv.includes("--disable-javascript")) process.exit(3);
const profile = process.argv.find((arg) => arg.startsWith("--user-data-dir="))?.slice("--user-data-dir=".length);
if (!profile || !profile.includes(".themed-svg-raster-")) process.exit(4);
fs.writeFileSync(screenshot, Buffer.from(process.env.FAKE_BROWSER_PNG, "base64"));
`,
    "utf8",
  );
  chmodSync(fakeBrowser, 0o755);
  if (findBrowser(fakeBrowser) !== fakeBrowser) {
    throw new Error("themed SVG rasterizer rejected a valid Chromium-family browser");
  }
  const fixedSvgFile = path.join(temp, "fixed-light.svg");
  const fixedPngFile = path.join(temp, "fixed-light.png");
  writeFileSync(fixedSvgFile, fixedThemeSvg("light"), "utf8");
  const rasterResult = spawnSync(
    "node",
    [themedSvgRasterizer, fixedSvgFile, fixedPngFile, "--browser", fakeBrowser],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, FAKE_BROWSER_PNG: fakeBrowserPng.toString("base64") },
    },
  );
  if (
    rasterResult.error ||
    rasterResult.status !== 0 ||
    !existsSync(fixedPngFile) ||
    !rasterResult.stdout.includes("fixed theme: light")
  ) {
    throw new Error(
      `themed SVG rasterizer did not publish a validated PNG\n${rasterResult.stdout}${rasterResult.stderr}`,
    );
  }
  const noClobberResult = spawnSync(
    "node",
    [themedSvgRasterizer, fixedSvgFile, fixedPngFile, "--browser", fakeBrowser],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, FAKE_BROWSER_PNG: fakeBrowserPng.toString("base64") },
    },
  );
  if (
    noClobberResult.status !== 1 ||
    !noClobberResult.stderr.includes("refusing to replace existing output")
  ) {
    throw new Error("themed SVG rasterizer replaced or accepted an existing output");
  }
  let malformedSvgCommentFailure;
  try {
    validateSvgXml(
      '<svg xmlns="http://www.w3.org/2000/svg"><!--x---><rect width="1" height="1"/></svg>',
    );
  } catch (error) {
    malformedSvgCommentFailure = error;
  }
  if (!malformedSvgCommentFailure?.message.includes("malformed XML comment")) {
    throw new Error("renderer XML parser accepted a comment body ending in a hyphen");
  }

  function virtualStagingIdentity(stagingDir, firstInode) {
    return {
      handle: firstInode,
      descriptorPath: `/proc/self/fd/${firstInode}`,
      lexicalPath: path.resolve(stagingDir),
      directoryName: path.basename(stagingDir),
      dev: 1,
      ino: firstInode,
    };
  }

  function virtualFileInspection(files, ...directoryIdentities) {
    const directoriesByHandle = new Map(
      directoryIdentities.filter(Boolean).map((identity) => [identity.handle, identity]),
    );
    function stat(file) {
      const entry = files.get(file);
      const directoryIdentity = directoriesByHandle.get(file);
      if (!entry && directoryIdentity) {
        return {
          dev: directoryIdentity.dev,
          ino: directoryIdentity.ino,
          isDirectory: () => true,
          isFile: () => false,
          isSymbolicLink: () => false,
        };
      }
      if (!entry) {
        const error = new Error("missing file");
        error.code = "ENOENT";
        throw error;
      }
      return {
        ...entry,
        dev: entry.dev ?? 1,
        ino: entry.ino ?? entry.inode,
        size: entry.size ?? Buffer.byteLength(entry.content),
        mtimeMs: entry.mtimeMs ?? 1,
        ctimeMs: entry.ctimeMs ?? 1,
        isDirectory: () => false,
        isFile: () => entry.type !== "symlink",
        isSymbolicLink: () => entry.type === "symlink",
      };
    }
    return {
      lstatSync: stat,
      fstatSync: stat,
      openSync(file) {
        stat(file);
        return file;
      },
      closeSync() {},
      readSync(handle, buffer, offset, length, position) {
        const source = Buffer.from(files.get(handle)?.content || "");
        if (position >= source.length) return 0;
        const bytesRead = Math.min(length, source.length - position);
        source.copy(buffer, offset, position, position + bytesRead);
        return bytesRead;
      },
    };
  }

  const commitStageLabel = path.join(temp, "commit-stage");
  const commitStagingIdentity = virtualStagingIdentity(commitStageLabel, 1000);
  const commitStage = commitStagingIdentity.descriptorPath;
  const commitLightStage = path.join(commitStage, "light.png");
  const commitDarkStage = path.join(commitStage, "dark.svg");
  const commitLightOutput = path.join(temp, "commit-output", "light.png");
  const commitDarkOutput = path.join(temp, "commit-output", "dark.svg");
  const commitFiles = new Map([
    [commitLightStage, { content: "new-light", inode: 1 }],
    [commitDarkStage, { content: "new-dark", inode: 2 }],
    [commitLightOutput, { content: "old-light", inode: 3 }],
    [commitDarkOutput, { content: "old-dark", inode: 4 }],
  ]);
  const commitOperations = {
    ...virtualFileInspection(commitFiles, commitStagingIdentity),
    existsSync: (file) => commitFiles.has(file),
    renameSync(from, to) {
      commitFiles.set(to, commitFiles.get(from));
      commitFiles.delete(from);
    },
    linkSync(from, to) {
      if (from === commitDarkStage) {
        commitFiles.set(commitLightOutput, { content: "concurrent-light", inode: 5 });
        commitFiles.set(commitDarkOutput, { content: "concurrent-dark", inode: 6 });
        const error = new Error("injected collision");
        error.code = "EEXIST";
        throw error;
      }
      if (commitFiles.has(to)) {
        const error = new Error("destination exists");
        error.code = "EEXIST";
        throw error;
      }
      commitFiles.set(to, commitFiles.get(from));
    },
    rmSync(file) {
      commitFiles.delete(file);
    },
  };
  let interruptedCommit;
  try {
    commitRenderArtifacts(
      [
        { staged: commitLightStage, destination: commitLightOutput },
        { staged: commitDarkStage, destination: commitDarkOutput },
      ],
      commitStage,
      { operations: commitOperations, expectedStagingIdentity: commitStagingIdentity },
    );
  } catch (error) {
    interruptedCommit = error;
  }
  if (
    interruptedCommit?.preserveStagingDirectory !== true ||
    commitFiles.get(commitLightOutput)?.content !== "concurrent-light" ||
    commitFiles.get(commitDarkOutput)?.content !== "concurrent-dark" ||
    commitFiles.get(path.join(commitStage, "backup-0"))?.content !== "old-light" ||
    commitFiles.get(path.join(commitStage, "backup-1"))?.content !== "old-dark"
  ) {
    throw new Error("renderer commit rollback discarded concurrent output or recovery backups");
  }

  const backupRaceStageLabel = path.join(temp, "backup-race-stage");
  const backupRaceStagingIdentity = virtualStagingIdentity(backupRaceStageLabel, 1100);
  const backupRaceStage = backupRaceStagingIdentity.descriptorPath;
  const backupRaceStaged = path.join(backupRaceStage, "new.png");
  const backupRaceOutput = path.join(temp, "backup-race-output", "render.png");
  const backupRaceFiles = new Map([
    [backupRaceStaged, { content: "new-render", inode: 20 }],
    [backupRaceOutput, { content: "old-render", inode: 21 }],
  ]);
  const backupRaceOperations = {
    ...virtualFileInspection(backupRaceFiles, backupRaceStagingIdentity),
    existsSync: (file) => backupRaceFiles.has(file),
    renameSync(from, to) {
      if (from === backupRaceOutput) {
        // A replacement lands after the pre-backup lstat but before rename.
        backupRaceFiles.set(from, { content: "concurrent-render", inode: 22 });
      }
      backupRaceFiles.set(to, backupRaceFiles.get(from));
      backupRaceFiles.delete(from);
    },
    linkSync(from, to) {
      if (backupRaceFiles.has(to)) {
        const error = new Error("destination exists");
        error.code = "EEXIST";
        throw error;
      }
      backupRaceFiles.set(to, backupRaceFiles.get(from));
    },
    rmSync(file) {
      backupRaceFiles.delete(file);
    },
  };
  let backupRaceFailure;
  try {
    commitRenderArtifacts(
      [{ staged: backupRaceStaged, destination: backupRaceOutput }],
      backupRaceStage,
      { operations: backupRaceOperations, expectedStagingIdentity: backupRaceStagingIdentity },
    );
  } catch (error) {
    backupRaceFailure = error;
  }
  if (
    backupRaceFailure?.preserveStagingDirectory !== true ||
    backupRaceFiles.get(backupRaceOutput)?.content !== "concurrent-render" ||
    backupRaceFiles.get(path.join(backupRaceStage, "backup-0"))?.content !== "concurrent-render" ||
    backupRaceFiles.get(backupRaceStaged)?.content !== "new-render"
  ) {
    throw new Error("renderer backup-window race displaced or deleted a concurrent replacement");
  }

  const sameInodeRaceStageLabel = path.join(temp, "same-inode-backup-race-stage");
  const sameInodeRaceStagingIdentity = virtualStagingIdentity(sameInodeRaceStageLabel, 1200);
  const sameInodeRaceStage = sameInodeRaceStagingIdentity.descriptorPath;
  const sameInodeRaceStaged = path.join(sameInodeRaceStage, "new.png");
  const sameInodeRaceOutput = path.join(temp, "same-inode-backup-race-output", "render.png");
  const sameInodeRaceBackup = path.join(sameInodeRaceStage, "backup-0");
  const sameInodeRaceFiles = new Map([
    [sameInodeRaceStaged, { content: "new-render", inode: 23 }],
    [sameInodeRaceOutput, { content: "old-render", inode: 24 }],
  ]);
  const sameInodeRaceOperations = {
    ...virtualFileInspection(sameInodeRaceFiles, sameInodeRaceStagingIdentity),
    existsSync: (file) => sameInodeRaceFiles.has(file),
    renameSync(from, to) {
      const moved = sameInodeRaceFiles.get(from);
      sameInodeRaceFiles.set(to, moved);
      sameInodeRaceFiles.delete(from);
      if (from === sameInodeRaceOutput) {
        // A process that opened the public file before rename writes through
        // the same inode after it has become the recovery backup. Keep size and
        // mtime stable so only the content fingerprint proves the update.
        sameInodeRaceFiles.set(to, {
          ...moved,
          content: "peer-write",
          ctimeMs: 2,
          mtimeMs: 1,
        });
      }
    },
    linkSync(from, to) {
      if (sameInodeRaceFiles.has(to)) {
        const error = new Error("destination exists");
        error.code = "EEXIST";
        throw error;
      }
      sameInodeRaceFiles.set(to, sameInodeRaceFiles.get(from));
    },
    rmSync(file) {
      sameInodeRaceFiles.delete(file);
    },
  };
  let sameInodeRaceFailure;
  try {
    commitRenderArtifacts(
      [{ staged: sameInodeRaceStaged, destination: sameInodeRaceOutput }],
      sameInodeRaceStage,
      {
        operations: sameInodeRaceOperations,
        expectedStagingIdentity: sameInodeRaceStagingIdentity,
      },
    );
  } catch (error) {
    sameInodeRaceFailure = error;
  }
  if (
    sameInodeRaceFailure?.preserveStagingDirectory !== true ||
    sameInodeRaceFiles.get(sameInodeRaceOutput)?.content !== "peer-write" ||
    sameInodeRaceFiles.get(sameInodeRaceOutput)?.inode !== 24 ||
    sameInodeRaceFiles.get(sameInodeRaceBackup)?.content !== "peer-write" ||
    sameInodeRaceFiles.get(sameInodeRaceBackup)?.inode !== 24 ||
    sameInodeRaceFiles.get(sameInodeRaceStaged)?.content !== "new-render"
  ) {
    throw new Error("renderer discarded a same-inode destination update during backup");
  }

  const cleanupRaceStageLabel = path.join(temp, "backup-cleanup-race-stage");
  const cleanupRaceStagingIdentity = virtualStagingIdentity(cleanupRaceStageLabel, 1300);
  const cleanupRaceStage = cleanupRaceStagingIdentity.descriptorPath;
  const cleanupRaceStages = [
    path.join(cleanupRaceStage, "new-light.png"),
    path.join(cleanupRaceStage, "new-dark.svg"),
  ];
  const cleanupRaceOutputs = [
    path.join(temp, "backup-cleanup-race-output", "light.png"),
    path.join(temp, "backup-cleanup-race-output", "dark.svg"),
  ];
  const cleanupRaceBackups = [
    path.join(cleanupRaceStage, "backup-0"),
    path.join(cleanupRaceStage, "backup-1"),
  ];
  const cleanupRaceFiles = new Map([
    [cleanupRaceStages[0], { content: "new-light", inode: 25 }],
    [cleanupRaceStages[1], { content: "new-dark", inode: 26 }],
    [cleanupRaceOutputs[0], { content: "old-light", inode: 27 }],
    [cleanupRaceOutputs[1], { content: "old-dark", inode: 28 }],
  ]);
  const cleanupRaceRemoved = [];
  const cleanupRaceOperations = {
    ...virtualFileInspection(cleanupRaceFiles, cleanupRaceStagingIdentity),
    existsSync: (file) => cleanupRaceFiles.has(file),
    renameSync(from, to) {
      cleanupRaceFiles.set(to, cleanupRaceFiles.get(from));
      cleanupRaceFiles.delete(from);
    },
    linkSync(from, to) {
      if (cleanupRaceFiles.has(to)) {
        const error = new Error("destination exists");
        error.code = "EEXIST";
        throw error;
      }
      cleanupRaceFiles.set(to, cleanupRaceFiles.get(from));
      if (from === cleanupRaceStages[1]) {
        const heldOpenBackup = cleanupRaceFiles.get(cleanupRaceBackups[1]);
        cleanupRaceFiles.set(cleanupRaceBackups[1], {
          ...heldOpenBackup,
          content: "peer-new",
          ctimeMs: 2,
          mtimeMs: 1,
        });
      }
    },
    rmSync(file) {
      cleanupRaceRemoved.push(file);
      cleanupRaceFiles.delete(file);
    },
  };
  let cleanupRaceFailure;
  try {
    commitRenderArtifacts(
      cleanupRaceStages.map((staged, index) => ({
        staged,
        destination: cleanupRaceOutputs[index],
      })),
      cleanupRaceStage,
      { operations: cleanupRaceOperations, expectedStagingIdentity: cleanupRaceStagingIdentity },
    );
  } catch (error) {
    cleanupRaceFailure = error;
  }
  if (
    cleanupRaceFailure?.preserveStagingDirectory !== true ||
    !cleanupRaceFailure?.cause?.message.includes("render backup changed") ||
    cleanupRaceRemoved.length !== 0 ||
    cleanupRaceFiles.get(cleanupRaceOutputs[0])?.content !== "new-light" ||
    cleanupRaceFiles.get(cleanupRaceOutputs[1])?.content !== "new-dark" ||
    cleanupRaceFiles.get(cleanupRaceBackups[0])?.content !== "old-light" ||
    cleanupRaceFiles.get(cleanupRaceBackups[1])?.content !== "peer-new" ||
    cleanupRaceFiles.get(cleanupRaceStages[0])?.content !== "new-light" ||
    cleanupRaceFiles.get(cleanupRaceStages[1])?.content !== "new-dark"
  ) {
    throw new Error("renderer discarded a same-inode destination update before backup cleanup");
  }

  const retainedBackupStageLabel = path.join(temp, "retained-backup-stage");
  const retainedBackupStagingIdentity = virtualStagingIdentity(retainedBackupStageLabel, 1400);
  const retainedBackupStage = retainedBackupStagingIdentity.descriptorPath;
  const retainedBackupStaged = path.join(retainedBackupStage, "new.png");
  const retainedBackupOutput = path.join(temp, "retained-backup-output", "render.png");
  const retainedBackupPath = path.join(retainedBackupStage, "backup-0");
  const retainedBackupFiles = new Map([
    [retainedBackupStaged, { content: "new-render", inode: 29 }],
    [retainedBackupOutput, { content: "old-render", inode: 30 }],
  ]);
  let backupRemoveAttempted = false;
  const retainedBackupOperations = {
    ...virtualFileInspection(retainedBackupFiles, retainedBackupStagingIdentity),
    existsSync: (file) => retainedBackupFiles.has(file),
    renameSync(from, to) {
      retainedBackupFiles.set(to, retainedBackupFiles.get(from));
      retainedBackupFiles.delete(from);
    },
    linkSync(from, to) {
      if (retainedBackupFiles.has(to)) {
        const error = new Error("destination exists");
        error.code = "EEXIST";
        throw error;
      }
      retainedBackupFiles.set(to, retainedBackupFiles.get(from));
    },
    rmSync(file) {
      if (file === retainedBackupPath) {
        backupRemoveAttempted = true;
        retainedBackupFiles.set(file, {
          ...retainedBackupFiles.get(file),
          content: "peer-write",
          ctimeMs: 2,
          mtimeMs: 1,
        });
      }
      retainedBackupFiles.delete(file);
    },
  };
  const retainedBackupResult = commitRenderArtifacts(
    [{ staged: retainedBackupStaged, destination: retainedBackupOutput }],
    retainedBackupStage,
    {
      operations: retainedBackupOperations,
      expectedStagingIdentity: retainedBackupStagingIdentity,
    },
  );
  if (
    backupRemoveAttempted ||
    retainedBackupResult.preserveStagingDirectory !== true ||
    retainedBackupResult.recoveryDirectory !== retainedBackupStage ||
    retainedBackupResult.backupPaths[0] !== retainedBackupPath ||
    retainedBackupFiles.get(retainedBackupOutput)?.content !== "new-render" ||
    retainedBackupFiles.get(retainedBackupPath)?.content !== "old-render" ||
    retainedBackupFiles.get(retainedBackupStaged)?.content !== "new-render"
  ) {
    throw new Error("renderer unlinked or failed to retain a successful replacement backup");
  }

  const finalVerifyStageLabel = path.join(temp, "final-installed-verify-stage");
  const finalVerifyStagingIdentity = virtualStagingIdentity(finalVerifyStageLabel, 1450);
  const finalVerifyStage = finalVerifyStagingIdentity.descriptorPath;
  const finalVerifyStages = [
    path.join(finalVerifyStage, "first.png"),
    path.join(finalVerifyStage, "second.svg"),
  ];
  const finalVerifyOutputs = [
    path.join(temp, "final-installed-verify-output", "first.png"),
    path.join(temp, "final-installed-verify-output", "second.svg"),
  ];
  const firstValidatedContent = "first-good";
  const firstMutatedContent = "first-evil";
  const secondValidatedContent = "secondgood";
  const finalVerifyIdentities = [
    {
      dev: 1,
      ino: 31,
      size: Buffer.byteLength(firstValidatedContent),
      mtimeMs: 1,
      ctimeMs: 1,
      digest: createHash("sha256").update(firstValidatedContent).digest("hex"),
    },
    {
      dev: 1,
      ino: 32,
      size: Buffer.byteLength(secondValidatedContent),
      mtimeMs: 1,
      ctimeMs: 1,
      digest: createHash("sha256").update(secondValidatedContent).digest("hex"),
    },
  ];
  const finalVerifyFiles = new Map([
    [
      finalVerifyStages[0],
      { ...finalVerifyIdentities[0], content: firstValidatedContent, type: "file" },
    ],
    [
      finalVerifyStages[1],
      { ...finalVerifyIdentities[1], content: secondValidatedContent, type: "file" },
    ],
  ]);
  const finalVerifyOperations = {
    ...virtualFileInspection(finalVerifyFiles, finalVerifyStagingIdentity),
    existsSync: (file) => finalVerifyFiles.has(file),
    renameSync(from, to) {
      finalVerifyFiles.set(to, finalVerifyFiles.get(from));
      finalVerifyFiles.delete(from);
    },
    linkSync(from, to) {
      if (finalVerifyFiles.has(to)) {
        const error = new Error("destination exists");
        error.code = "EEXIST";
        throw error;
      }
      finalVerifyFiles.set(to, finalVerifyFiles.get(from));
      if (from === finalVerifyStages[1]) {
        // The first public hard link already passed its immediate verification.
        // Mutate that inode while the second output is installed; only the full
        // second pass can detect the unvalidated bytes.
        const changedFirst = {
          ...finalVerifyFiles.get(finalVerifyStages[0]),
          content: firstMutatedContent,
          ctimeMs: 2,
          mtimeMs: 1,
        };
        finalVerifyFiles.set(finalVerifyStages[0], changedFirst);
        finalVerifyFiles.set(finalVerifyOutputs[0], changedFirst);
      }
    },
    rmSync(file) {
      finalVerifyFiles.delete(file);
    },
  };
  let finalVerifyFailure;
  try {
    commitRenderArtifacts(
      finalVerifyStages.map((staged, index) => ({
        staged,
        destination: finalVerifyOutputs[index],
        expectedIdentity: finalVerifyIdentities[index],
      })),
      finalVerifyStage,
      {
        operations: finalVerifyOperations,
        expectedStagingIdentity: finalVerifyStagingIdentity,
      },
    );
  } catch (error) {
    finalVerifyFailure = error;
  }
  if (
    finalVerifyFailure?.preserveStagingDirectory !== true ||
    !finalVerifyFailure?.cause?.message.includes("content fingerprint does not match") ||
    finalVerifyFiles.get(finalVerifyOutputs[0])?.content !== firstMutatedContent ||
    finalVerifyFiles.get(finalVerifyOutputs[1])?.content !== secondValidatedContent ||
    finalVerifyFiles.get(finalVerifyStages[0])?.content !== firstMutatedContent ||
    finalVerifyFiles.get(finalVerifyStages[1])?.content !== secondValidatedContent
  ) {
    throw new Error("renderer omitted the final all-output content verification pass");
  }

  const backupReadRaceLabel = path.join(temp, "backup-read-race-stage");
  const backupReadRaceStage = virtualStagingIdentity(backupReadRaceLabel, 1460);
  const backupReadValidated = "new-render";
  const backupReadTampered = "bad-render";
  const backupReadIdentity = {
    dev: 1,
    ino: 40,
    size: Buffer.byteLength(backupReadValidated),
    mtimeMs: 1,
    ctimeMs: 1,
    digest: createHash("sha256").update(backupReadValidated).digest("hex"),
  };
  const backupReadStaged = path.join(backupReadRaceStage.descriptorPath, "render.png");
  const backupReadOutput = path.join(temp, "backup-read-race-output", "render.png");
  const backupReadBackup = path.join(backupReadRaceStage.descriptorPath, "backup-0");
  const backupReadFiles = new Map([
    [backupReadStaged, { ...backupReadIdentity, content: backupReadValidated, type: "file" }],
    [
      backupReadOutput,
      {
        dev: 1,
        ino: 41,
        size: 10,
        mtimeMs: 1,
        ctimeMs: 1,
        content: "old-render",
        type: "file",
      },
    ],
  ]);
  const backupReadInspection = virtualFileInspection(backupReadFiles, backupReadRaceStage);
  let backupReadMutatedPublic = false;
  const backupReadOperations = {
    ...backupReadInspection,
    existsSync: (file) => backupReadFiles.has(file),
    renameSync(from, to) {
      backupReadFiles.set(to, backupReadFiles.get(from));
      backupReadFiles.delete(from);
    },
    linkSync(from, to) {
      backupReadFiles.set(to, backupReadFiles.get(from));
    },
    readSync(handle, buffer, offset, length, position) {
      if (
        handle === backupReadBackup &&
        backupReadFiles.has(backupReadOutput) &&
        !backupReadMutatedPublic
      ) {
        backupReadMutatedPublic = true;
        const changed = {
          ...backupReadFiles.get(backupReadOutput),
          content: backupReadTampered,
          ctimeMs: 2,
          mtimeMs: 1,
        };
        backupReadFiles.set(backupReadOutput, changed);
        backupReadFiles.set(backupReadStaged, changed);
      }
      return backupReadInspection.readSync(handle, buffer, offset, length, position);
    },
    unlinkSync(file) {
      backupReadFiles.delete(file);
    },
    rmdirSync() {},
  };
  let backupReadFailure;
  try {
    commitRenderArtifacts(
      [
        {
          staged: backupReadStaged,
          destination: backupReadOutput,
          expectedIdentity: backupReadIdentity,
        },
      ],
      backupReadRaceStage.descriptorPath,
      {
        operations: backupReadOperations,
        expectedStagingIdentity: backupReadRaceStage,
      },
    );
  } catch (error) {
    backupReadFailure = error;
  }
  if (
    !backupReadMutatedPublic ||
    backupReadFailure?.preserveStagingDirectory !== true ||
    !backupReadFailure?.cause?.message.includes("content fingerprint does not match") ||
    backupReadFiles.get(backupReadOutput)?.content !== backupReadTampered ||
    backupReadFiles.get(backupReadBackup)?.content !== "old-render"
  ) {
    throw new Error("renderer omitted its final public digest after reading recovery backups");
  }

  const anchoredRenameParent = virtualStagingIdentity(
    path.join(temp, "anchored-rename-output"),
    1474,
  );
  const anchoredRenameStage = virtualStagingIdentity(
    path.join(temp, "anchored-rename-stage"),
    1475,
  );
  const anchoredRenameStaged = path.join(anchoredRenameStage.descriptorPath, "new.png");
  const anchoredRenameOutput = path.join(anchoredRenameParent.descriptorPath, "render.png");
  const anchoredRenameBackup = path.join(anchoredRenameStage.descriptorPath, "backup-0");
  const renameOutsideSentinel = path.join(temp, "rename-outside", "render.png");
  const anchoredRenameFiles = new Map([
    [anchoredRenameStaged, { content: "new-render", inode: 33 }],
    [anchoredRenameOutput, { content: "old-render", inode: 34 }],
    [renameOutsideSentinel, { content: "outside-safe", inode: 35 }],
  ]);
  let renameAncestorSwapped = false;
  const anchoredRenameOperations = {
    ...virtualFileInspection(anchoredRenameFiles, anchoredRenameParent, anchoredRenameStage),
    existsSync: (file) => anchoredRenameFiles.has(file),
    renameSync(from, to) {
      renameAncestorSwapped = true;
      if (from !== anchoredRenameOutput || to !== anchoredRenameBackup) {
        throw new Error("renderer used a lexical path for replacement backup");
      }
      anchoredRenameFiles.set(to, anchoredRenameFiles.get(from));
      anchoredRenameFiles.delete(from);
    },
    linkSync(from, to) {
      anchoredRenameFiles.set(to, anchoredRenameFiles.get(from));
    },
    unlinkSync(file) {
      anchoredRenameFiles.delete(file);
    },
    rmdirSync() {},
  };
  const anchoredRenameResult = commitRenderArtifacts(
    [{ staged: anchoredRenameStaged, destination: anchoredRenameOutput }],
    anchoredRenameStage.descriptorPath,
    {
      operations: anchoredRenameOperations,
      expectedStagingIdentity: anchoredRenameStage,
    },
  );
  if (
    !renameAncestorSwapped ||
    anchoredRenameResult.preserveStagingDirectory !== true ||
    anchoredRenameFiles.get(anchoredRenameOutput)?.content !== "new-render" ||
    anchoredRenameFiles.get(anchoredRenameBackup)?.content !== "old-render" ||
    anchoredRenameFiles.get(renameOutsideSentinel)?.content !== "outside-safe"
  ) {
    throw new Error("renderer replacement escaped descriptor-anchored parent directories");
  }

  const anchoredCleanupParent = virtualStagingIdentity(
    path.join(temp, "anchored-cleanup-output"),
    1476,
  );
  const anchoredCleanupStage = virtualStagingIdentity(
    path.join(temp, "anchored-cleanup-stage"),
    1477,
  );
  const cleanupEntries = ["light.png", "dark.svg"];
  const cleanupOutsideSentinel = path.join(temp, "cleanup-outside", "sentinel.txt");
  const anchoredCleanupFiles = new Map([
    [
      path.join(anchoredCleanupStage.descriptorPath, cleanupEntries[0]),
      { content: "png", inode: 36 },
    ],
    [
      path.join(anchoredCleanupStage.descriptorPath, cleanupEntries[1]),
      { content: "svg", inode: 37 },
    ],
    [cleanupOutsideSentinel, { content: "outside-safe", inode: 38 }],
  ]);
  const cleanupUnlinks = [];
  let cleanupAncestorSwapped = false;
  let removedAnchoredDirectory;
  const anchoredCleanupOperations = {
    ...virtualFileInspection(anchoredCleanupFiles, anchoredCleanupParent, anchoredCleanupStage),
    unlinkSync(file) {
      cleanupAncestorSwapped = true;
      cleanupUnlinks.push(file);
      anchoredCleanupFiles.delete(file);
    },
    rmdirSync(directory) {
      removedAnchoredDirectory = directory;
    },
  };
  removeRenderStagingDirectory(anchoredCleanupStage, anchoredCleanupParent, cleanupEntries, {
    operations: anchoredCleanupOperations,
  });
  if (
    !cleanupAncestorSwapped ||
    cleanupUnlinks.some(
      (file) => !file.startsWith(`${anchoredCleanupStage.descriptorPath}${path.sep}`),
    ) ||
    removedAnchoredDirectory !==
      path.join(anchoredCleanupParent.descriptorPath, anchoredCleanupStage.directoryName) ||
    anchoredCleanupFiles.get(cleanupOutsideSentinel)?.content !== "outside-safe"
  ) {
    throw new Error("renderer cleanup escaped descriptor-anchored parent directories");
  }

  const cleanupDigestParent = virtualStagingIdentity(
    path.join(temp, "cleanup-digest-output"),
    1480,
  );
  const cleanupDigestStage = virtualStagingIdentity(path.join(temp, "cleanup-digest-stage"), 1481);
  const cleanupDigestContent = "validated";
  const cleanupDigestMutated = "tampered!";
  const cleanupDigestIdentity = {
    dev: 1,
    ino: 39,
    size: Buffer.byteLength(cleanupDigestContent),
    mtimeMs: 1,
    ctimeMs: 1,
    digest: createHash("sha256").update(cleanupDigestContent).digest("hex"),
  };
  const cleanupDigestStaged = path.join(cleanupDigestStage.descriptorPath, "render.png");
  const cleanupDigestOutput = path.join(cleanupDigestParent.descriptorPath, "render.png");
  const cleanupDigestFiles = new Map([
    [
      cleanupDigestStaged,
      { ...cleanupDigestIdentity, content: cleanupDigestContent, type: "file" },
    ],
    [
      cleanupDigestOutput,
      { ...cleanupDigestIdentity, content: cleanupDigestContent, type: "file" },
    ],
  ]);
  const cleanupDigestOperations = {
    ...virtualFileInspection(cleanupDigestFiles, cleanupDigestParent, cleanupDigestStage),
    unlinkSync(file) {
      const changedPublic = {
        ...cleanupDigestFiles.get(cleanupDigestOutput),
        content: cleanupDigestMutated,
        ctimeMs: 2,
        mtimeMs: 1,
      };
      cleanupDigestFiles.set(cleanupDigestOutput, changedPublic);
      cleanupDigestFiles.delete(file);
    },
    rmdirSync() {},
  };
  removeRenderStagingDirectory(cleanupDigestStage, cleanupDigestParent, ["render.png"], {
    operations: cleanupDigestOperations,
  });
  let cleanupDigestFailure;
  try {
    verifyCommittedRenderArtifacts(
      [
        {
          staged: cleanupDigestStaged,
          destination: cleanupDigestOutput,
          expectedIdentity: cleanupDigestIdentity,
        },
      ],
      { operations: cleanupDigestOperations },
    );
  } catch (error) {
    cleanupDigestFailure = error;
  }
  if (
    !cleanupDigestFailure?.message.includes("content fingerprint does not match") ||
    cleanupDigestFiles.get(cleanupDigestOutput)?.content !== cleanupDigestMutated
  ) {
    throw new Error("renderer accepted public bytes mutated during fresh-stage cleanup");
  }

  const stageSwapLabel = path.join(temp, "stage-swap-stage");
  const stageSwapStagingIdentity = virtualStagingIdentity(stageSwapLabel, 1500);
  const stageSwapDir = stageSwapStagingIdentity.descriptorPath;
  const stageSwapStaged = path.join(stageSwapDir, "new.png");
  const stageSwapOutput = path.join(temp, "stage-swap-output", "render.png");
  const stageSwapBackup = path.join(stageSwapDir, "backup-0");
  const stageIdentity = {
    dev: 1,
    ino: 30,
    size: 10,
    mtimeMs: 1,
    ctimeMs: 1,
    digest: createHash("sha256").update("new-render").digest("hex"),
  };
  const stageSwapFiles = new Map([
    [stageSwapStaged, { ...stageIdentity, content: "new-render", type: "file" }],
    [
      stageSwapOutput,
      { dev: 1, ino: 31, size: 10, mtimeMs: 1, ctimeMs: 1, content: "old-render", type: "file" },
    ],
  ]);
  let stagedLinkAttempted = false;
  const stageSwapOperations = {
    ...virtualFileInspection(stageSwapFiles, stageSwapStagingIdentity),
    existsSync: (file) => stageSwapFiles.has(file),
    renameSync(from, to) {
      stageSwapFiles.set(to, stageSwapFiles.get(from));
      stageSwapFiles.delete(from);
      if (from === stageSwapOutput) {
        stageSwapFiles.set(stageSwapStaged, {
          dev: 1,
          ino: 32,
          size: 10,
          mtimeMs: 2,
          ctimeMs: 2,
          content: "untrusted-target",
          type: "symlink",
        });
      }
    },
    linkSync(from, to) {
      if (from === stageSwapStaged) stagedLinkAttempted = true;
      if (stageSwapFiles.has(to)) {
        const error = new Error("destination exists");
        error.code = "EEXIST";
        throw error;
      }
      stageSwapFiles.set(to, stageSwapFiles.get(from));
    },
    rmSync(file) {
      stageSwapFiles.delete(file);
    },
  };
  let stageSwapFailure;
  try {
    commitRenderArtifacts(
      [
        {
          staged: stageSwapStaged,
          destination: stageSwapOutput,
          expectedIdentity: stageIdentity,
        },
      ],
      stageSwapDir,
      { operations: stageSwapOperations, expectedStagingIdentity: stageSwapStagingIdentity },
    );
  } catch (error) {
    stageSwapFailure = error;
  }
  if (
    stagedLinkAttempted ||
    !stageSwapFailure?.cause?.message.includes("validated render artifact changed before commit") ||
    stageSwapFailure?.preserveStagingDirectory !== true ||
    stageSwapFiles.get(stageSwapOutput)?.content !== "old-render" ||
    stageSwapFiles.get(stageSwapBackup)?.content !== "old-render"
  ) {
    throw new Error(
      "renderer committed a changed stage or discarded the retained restoration backup",
    );
  }

  const linkSwapLabel = path.join(temp, "link-swap-stage");
  const linkSwapStagingIdentity = virtualStagingIdentity(linkSwapLabel, 1600);
  const linkSwapDir = linkSwapStagingIdentity.descriptorPath;
  const linkSwapStaged = path.join(linkSwapDir, "new.png");
  const linkSwapOutput = path.join(temp, "link-swap-output", "render.png");
  const linkSwapBackup = path.join(linkSwapDir, "backup-0");
  const linkIdentity = {
    dev: 1,
    ino: 40,
    size: 10,
    mtimeMs: 1,
    ctimeMs: 1,
    digest: createHash("sha256").update("validated-render").digest("hex"),
  };
  const linkSwapFiles = new Map([
    [linkSwapStaged, { ...linkIdentity, content: "validated-render", type: "file" }],
    [
      linkSwapOutput,
      { dev: 1, ino: 41, size: 10, mtimeMs: 1, ctimeMs: 1, content: "old-render", type: "file" },
    ],
  ]);
  const linkSwapOperations = {
    ...virtualFileInspection(linkSwapFiles, linkSwapStagingIdentity),
    existsSync: (file) => linkSwapFiles.has(file),
    renameSync(from, to) {
      linkSwapFiles.set(to, linkSwapFiles.get(from));
      linkSwapFiles.delete(from);
    },
    linkSync(from, to) {
      if (from === linkSwapStaged) {
        // The final staged-path lstat has passed. Swap the source immediately
        // before link(2) resolves it, then model a hard link to that symlink.
        linkSwapFiles.set(from, {
          dev: 1,
          ino: 42,
          size: 10,
          mtimeMs: 2,
          ctimeMs: 2,
          content: "untrusted-target",
          type: "symlink",
        });
      }
      if (linkSwapFiles.has(to)) {
        const error = new Error("destination exists");
        error.code = "EEXIST";
        throw error;
      }
      linkSwapFiles.set(to, linkSwapFiles.get(from));
    },
    rmSync(file) {
      linkSwapFiles.delete(file);
    },
  };
  let linkSwapFailure;
  try {
    commitRenderArtifacts(
      [
        {
          staged: linkSwapStaged,
          destination: linkSwapOutput,
          expectedIdentity: linkIdentity,
        },
      ],
      linkSwapDir,
      { operations: linkSwapOperations, expectedStagingIdentity: linkSwapStagingIdentity },
    );
  } catch (error) {
    linkSwapFailure = error;
  }
  if (
    linkSwapFailure?.preserveStagingDirectory !== true ||
    !linkSwapFailure?.cause?.message.includes(
      "installed render artifact has an unexpected identity",
    ) ||
    linkSwapFiles.get(linkSwapOutput)?.content !== "untrusted-target" ||
    linkSwapFiles.get(linkSwapOutput)?.type !== "symlink" ||
    linkSwapFiles.get(linkSwapBackup)?.content !== "old-render" ||
    linkSwapFiles.get(linkSwapStaged)?.content !== "untrusted-target"
  ) {
    throw new Error(
      "renderer reported success or discarded recovery state after a link-source swap",
    );
  }

  const contentRaceLabel = path.join(temp, "content-race-stage");
  const contentRaceStagingIdentity = virtualStagingIdentity(contentRaceLabel, 1700);
  const contentRaceDir = contentRaceStagingIdentity.descriptorPath;
  const contentRaceStaged = path.join(contentRaceDir, "new.png");
  const contentRaceOutput = path.join(temp, "content-race-output", "render.png");
  const contentRaceBackup = path.join(contentRaceDir, "backup-0");
  const validatedContent = "validated";
  const tamperedContent = "tampered!";
  const contentRaceIdentity = {
    dev: 1,
    ino: 50,
    size: Buffer.byteLength(validatedContent),
    mtimeMs: 1,
    ctimeMs: 1,
    digest: createHash("sha256").update(validatedContent).digest("hex"),
  };
  const contentRaceFiles = new Map([
    [contentRaceStaged, { ...contentRaceIdentity, content: validatedContent, type: "file" }],
    [
      contentRaceOutput,
      { dev: 1, ino: 51, size: 10, mtimeMs: 1, ctimeMs: 1, content: "old-render", type: "file" },
    ],
  ]);
  const contentRaceOperations = {
    ...virtualFileInspection(contentRaceFiles, contentRaceStagingIdentity),
    existsSync: (file) => contentRaceFiles.has(file),
    renameSync(from, to) {
      contentRaceFiles.set(to, contentRaceFiles.get(from));
      contentRaceFiles.delete(from);
    },
    linkSync(from, to) {
      if (from === contentRaceStaged) {
        // Mutate the validated inode after the final lstat, preserve its size and
        // restore mtime. Only ctime and the cryptographic digest reveal the swap.
        contentRaceFiles.set(from, {
          ...contentRaceFiles.get(from),
          content: tamperedContent,
          mtimeMs: contentRaceIdentity.mtimeMs,
          ctimeMs: 2,
        });
      }
      if (contentRaceFiles.has(to)) {
        const error = new Error("destination exists");
        error.code = "EEXIST";
        throw error;
      }
      contentRaceFiles.set(to, contentRaceFiles.get(from));
    },
    rmSync(file) {
      contentRaceFiles.delete(file);
    },
  };
  let contentRaceFailure;
  try {
    commitRenderArtifacts(
      [
        {
          staged: contentRaceStaged,
          destination: contentRaceOutput,
          expectedIdentity: contentRaceIdentity,
        },
      ],
      contentRaceDir,
      { operations: contentRaceOperations, expectedStagingIdentity: contentRaceStagingIdentity },
    );
  } catch (error) {
    contentRaceFailure = error;
  }
  if (
    contentRaceFailure?.preserveStagingDirectory !== true ||
    !contentRaceFailure?.cause?.message.includes("content fingerprint does not match") ||
    contentRaceFiles.get(contentRaceOutput)?.content !== tamperedContent ||
    contentRaceFiles.get(contentRaceOutput)?.ino !== contentRaceIdentity.ino ||
    contentRaceFiles.get(contentRaceOutput)?.mtimeMs !== contentRaceIdentity.mtimeMs ||
    contentRaceFiles.get(contentRaceBackup)?.content !== "old-render" ||
    contentRaceFiles.get(contentRaceStaged)?.content !== tamperedContent
  ) {
    throw new Error(
      "renderer accepted same-inode content mutation or discarded its recovery state",
    );
  }

  if (process.platform !== "win32") {
    const fakeBin = path.join(temp, "fake-bin");
    const rendererLog = path.join(temp, "renderer-args.jsonl");
    const fakeDiagramsNet = path.join(fakeBin, "diagrams.net");
    const rendererInput = path.join(temp, "multi-page-render.drawio");
    const lightOutput = `${rendererInput}.png`;
    const darkOutput = rendererInput.replace(/\.drawio$/i, ".dark.svg");
    const rendererPngCases = new Map([
      ["png-invalid-bit-depth", embeddedPng({ bitDepth: 4 })],
      ["png-invalid-compression", embeddedPng({ compression: 1 })],
      ["png-invalid-filter-method", embeddedPng({ filter: 1 })],
      ["png-interlaced", embeddedPng({ interlace: 1 })],
      ["png-unknown-critical", embeddedPng({ extraChunks: [["ABCD", Buffer.alloc(0)]] })],
      ["png-short-scanline", embeddedPng({ decoded: Buffer.from([0]) })],
      ["png-invalid-scanline-filter", embeddedPng({ decoded: Buffer.from([5, 0, 0, 0, 255]) })],
      ["png-trailing-zlib", embeddedPng({ zlibSuffix: Buffer.from([0]) })],
      ["png-split-idat", embeddedPng({ splitIdatAt: 4 })],
    ]);
    writeFileSync(rendererInput, readFileSync(path.join(examples, "multi-page.drawio")));
    mkdirSync(fakeBin);
    writeFileSync(
      fakeDiagramsNet,
      `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args.includes("--version")) { console.log("draw.io fake 1.0.0"); process.exit(0); }
if (args.includes("--help")) { console.log("-f png|svg --svg-theme light|dark --page-index"); process.exit(0); }
fs.appendFileSync(process.env.DRAWIO_ARGS_LOG, JSON.stringify(args) + "\\n");
const outputIndex = args.indexOf("-o");
const formatIndex = args.indexOf("-f");
const output = outputIndex >= 0 ? args[outputIndex + 1] : null;
const format = formatIndex >= 0 ? args[formatIndex + 1] : null;
const mode = process.env.DRAWIO_FAKE_MODE || "success";
if (!output || !format) process.exit(2);
if (mode === "missing" || mode === "missing-" + format) process.exit(0);
if (mode === "symlink-" + format) {
  const target = output + ".target";
  const artifact =
    format === "png"
      ? Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64")
      : '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1"/></svg>';
  fs.writeFileSync(target, artifact);
  fs.symlinkSync(target, output);
  process.exit(0);
}
if (mode === "invalid-" + format) {
  fs.writeFileSync(output, "invalid " + format);
  process.exit(0);
}
if (format === "png") {
  if (process.env.DRAWIO_FAKE_PNG) {
    fs.writeFileSync(output, Buffer.from(process.env.DRAWIO_FAKE_PNG, "base64"));
    process.exit(0);
  }
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  if (mode === "png-bad-crc") png[29] ^= 1;
  if (mode === "png-missing-idat") {
    fs.writeFileSync(output, Buffer.concat([png.subarray(0, 33), png.subarray(png.length - 12)]));
    process.exit(0);
  }
  if (mode === "png-out-of-bounds-chunk") png.writeUInt32BE(png.length, 33);
  fs.writeFileSync(output, png);
} else if (format === "svg") {
  if (mode === "svg-mismatched-tags") {
    fs.writeFileSync(output, '<svg xmlns="http://www.w3.org/2000/svg"><g></svg>');
  } else if (mode === "svg-invalid-attribute") {
    fs.writeFileSync(output, '<svg xmlns="http://www.w3.org/2000/svg"><g id=broken></g></svg>');
  } else if (mode === "svg-illegal-character") {
    fs.writeFileSync(output, '<svg xmlns="http://www.w3.org/2000/svg"><text>bad' + String.fromCharCode(0) + '</text></svg>');
  } else if (mode === "svg-invalid-entity") {
    fs.writeFileSync(output, '<svg xmlns="http://www.w3.org/2000/svg"><text>&bogus;</text></svg>');
  } else if (mode === "svg-invalid-character-reference") {
    fs.writeFileSync(output, '<svg xmlns="http://www.w3.org/2000/svg"><text>&#0;</text></svg>');
  } else if (mode === "svg-invalid-comment") {
    fs.writeFileSync(output, '<svg xmlns="http://www.w3.org/2000/svg"><!--x---><rect width="1" height="1"/></svg>');
  } else if (mode === "svg-valid-entities") {
    fs.writeFileSync(output, '<svg xmlns="http://www.w3.org/2000/svg"><text>&amp; &#x1F680;</text></svg>');
  } else if (mode === "svg-valid-declaration") {
    fs.writeFileSync(output, '<?xml version="1.0" encoding="uTf-8" standalone="no"?><svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>');
  } else if (mode === "svg-invalid-declaration") {
    fs.writeFileSync(output, '<?xml garbage?><svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>');
  } else if (mode === "svg-utf16-declaration") {
    fs.writeFileSync(output, '<?xml version="1.0" encoding="UTF-16"?><svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>');
  } else if (mode === "svg-misplaced-declaration") {
    fs.writeFileSync(output, ' \\n<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>');
  } else {
    fs.writeFileSync(output, '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1"/></svg>');
  }
} else {
  process.exit(2);
}
`,
      "utf8",
    );
    chmodSync(fakeDiagramsNet, 0o755);

    function runFakeRenderer(mode, extraArgs = []) {
      return spawnSync("node", [renderer, rendererInput, ...extraArgs], {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          DRAWIO_ARGS_LOG: rendererLog,
          DRAWIO_BIN: fakeDiagramsNet,
          DRAWIO_FAKE_MODE: mode,
          DRAWIO_FAKE_PNG: rendererPngCases.get(mode)?.toString("base64") || "",
          PATH: `${fakeBin}${path.delimiter}${path.dirname(process.execPath)}`,
        },
      });
    }

    function assertRendererFailure(name, mode, expectedOutput, expectedFiles = null) {
      const result = runFakeRenderer(mode);
      const output = `${result.stdout || ""}${result.stderr || ""}`;
      if (result.error) throw result.error;
      if (result.status !== 1 || !output.includes(expectedOutput)) {
        throw new Error(
          `${name}: expected exit 1 containing ${JSON.stringify(expectedOutput)}, got ${result.status}\n${output}`,
        );
      }
      if (expectedFiles === null) {
        if (existsSync(lightOutput) || existsSync(darkOutput)) {
          throw new Error(`${name}: failed render published an output artifact`);
        }
        return;
      }
      if (
        readFileSync(lightOutput, "utf8") !== expectedFiles.light ||
        readFileSync(darkOutput, "utf8") !== expectedFiles.dark
      ) {
        throw new Error(`${name}: failed render replaced an existing output artifact`);
      }
    }

    writeFileSync(rendererLog, "", "utf8");
    const renderResult = runFakeRenderer("success", ["--page-index", "2"]);
    if (renderResult.error) throw renderResult.error;
    if (renderResult.status !== 0) {
      throw new Error(
        `page-selective renderer: expected exit 0, got ${renderResult.status}\n${renderResult.stdout}${renderResult.stderr}`,
      );
    }
    if (!existsSync(lightOutput) || !existsSync(darkOutput)) {
      throw new Error("page-selective renderer did not publish both validated artifacts");
    }
    const renderInvocations = readFileSync(rendererLog, "utf8")
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line))
      .filter((args) => args.includes("-x"));
    if (
      renderInvocations.length !== 2 ||
      renderInvocations.some((args) => args[args.indexOf("--page-index") + 1] !== "2")
    ) {
      throw new Error(
        `page-selective renderer did not pass --page-index 2 to both exports: ${JSON.stringify(renderInvocations)}`,
      );
    }

    const replacedLightBytes = readFileSync(lightOutput);
    const replacedDarkBytes = readFileSync(darkOutput);
    const replacementResult = runFakeRenderer("success");
    const replacementOutput = `${replacementResult.stdout || ""}${replacementResult.stderr || ""}`;
    const recoveryMatch = replacementOutput.match(/^replacement recovery directory: (.+)$/m);
    const recoveryDirectory = recoveryMatch?.[1]?.trim();
    if (
      replacementResult.status !== 0 ||
      !recoveryDirectory ||
      !existsSync(recoveryDirectory) ||
      !existsSync(path.join(recoveryDirectory, "backup-0")) ||
      !existsSync(path.join(recoveryDirectory, "backup-1")) ||
      !existsSync(path.join(recoveryDirectory, path.basename(lightOutput))) ||
      !existsSync(path.join(recoveryDirectory, path.basename(darkOutput))) ||
      !readFileSync(path.join(recoveryDirectory, "backup-0")).equals(replacedLightBytes) ||
      !readFileSync(path.join(recoveryDirectory, "backup-1")).equals(replacedDarkBytes)
    ) {
      throw new Error(
        `renderer caller did not retain successful replacement recovery files\n${replacementOutput}`,
      );
    }

    for (const [name, mode] of [
      ["renderer accepts concatenated IDAT chunks", "png-split-idat"],
      ["renderer accepts predefined and legal numeric SVG entities", "svg-valid-entities"],
      ["renderer accepts a standards-compliant XML declaration", "svg-valid-declaration"],
    ]) {
      const result = runFakeRenderer(mode);
      if (result.status !== 0) {
        throw new Error(`${name}: expected exit 0, got ${result.status}\n${result.stderr}`);
      }
    }

    rmSync(lightOutput, { force: true });
    rmSync(darkOutput, { force: true });
    assertRendererFailure(
      "renderer rejects exit-zero missing PNG",
      "missing-png",
      "did not create a PNG artifact",
    );

    const staleFiles = { light: "stale png", dark: "stale svg" };
    writeFileSync(lightOutput, staleFiles.light, "utf8");
    writeFileSync(darkOutput, staleFiles.dark, "utf8");
    assertRendererFailure(
      "renderer preserves stale destinations when SVG is missing",
      "missing-svg",
      "did not create a SVG artifact",
      staleFiles,
    );
    assertRendererFailure(
      "renderer rejects invalid PNG",
      "invalid-png",
      "invalid PNG artifact",
      staleFiles,
    );
    assertRendererFailure(
      "renderer rejects invalid SVG without partially committing PNG",
      "invalid-svg",
      "invalid SVG artifact",
      staleFiles,
    );
    assertRendererFailure(
      "renderer rejects symlinked PNG output",
      "symlink-png",
      "output is a symbolic link",
      staleFiles,
    );
    assertRendererFailure(
      "renderer rejects symlinked SVG output",
      "symlink-svg",
      "output is a symbolic link",
      staleFiles,
    );
    assertRendererFailure(
      "renderer rejects a PNG with valid-looking chunks and a bad CRC",
      "png-bad-crc",
      "IHDR chunk CRC mismatch",
      staleFiles,
    );
    assertRendererFailure(
      "renderer rejects a PNG with valid IHDR and IEND but no IDAT",
      "png-missing-idat",
      "IEND requires IHDR, IDAT, and zero length",
      staleFiles,
    );
    assertRendererFailure(
      "renderer rejects a PNG chunk that exceeds file bounds",
      "png-out-of-bounds-chunk",
      "IDAT chunk exceeds file bounds",
      staleFiles,
    );
    for (const [name, mode, expected] of [
      [
        "renderer rejects an illegal PNG bit-depth/color-type pair",
        "png-invalid-bit-depth",
        "invalid bit-depth/color-type combination",
      ],
      [
        "renderer rejects an unsupported PNG compression method",
        "png-invalid-compression",
        "unsupported compression or filter method",
      ],
      [
        "renderer rejects an unsupported PNG filter method",
        "png-invalid-filter-method",
        "unsupported compression or filter method",
      ],
      ["renderer rejects interlaced PNG output", "png-interlaced", "interlacing is unsupported"],
      [
        "renderer rejects an unknown critical PNG chunk",
        "png-unknown-critical",
        "unsupported critical chunk ABCD",
      ],
      [
        "renderer rejects a short inflated PNG scanline",
        "png-short-scanline",
        "decoded data does not match its scanline layout",
      ],
      [
        "renderer rejects an invalid PNG scanline filter",
        "png-invalid-scanline-filter",
        "decoded data contains an invalid scanline filter",
      ],
      [
        "renderer rejects trailing bytes after the PNG zlib stream",
        "png-trailing-zlib",
        "incomplete or trailing zlib stream",
      ],
    ]) {
      assertRendererFailure(name, mode, expected, staleFiles);
    }
    assertRendererFailure(
      "renderer rejects mismatched SVG XML tags",
      "svg-mismatched-tags",
      "mismatched closing tag svg",
      staleFiles,
    );
    assertRendererFailure(
      "renderer rejects unquoted SVG XML attributes",
      "svg-invalid-attribute",
      "attribute id is not quoted",
      staleFiles,
    );
    assertRendererFailure(
      "renderer rejects illegal SVG XML characters",
      "svg-illegal-character",
      "illegal XML character",
      staleFiles,
    );
    assertRendererFailure(
      "renderer rejects undeclared SVG XML entities",
      "svg-invalid-entity",
      "invalid entity reference",
      staleFiles,
    );
    assertRendererFailure(
      "renderer rejects illegal SVG XML character references",
      "svg-invalid-character-reference",
      "invalid character reference",
      staleFiles,
    );
    assertRendererFailure(
      "renderer rejects XML comment bodies ending in a hyphen",
      "svg-invalid-comment",
      "malformed XML comment",
      staleFiles,
    );
    assertRendererFailure(
      "renderer rejects malformed XML declarations",
      "svg-invalid-declaration",
      "invalid XML declaration or processing instruction",
      staleFiles,
    );
    assertRendererFailure(
      "renderer rejects XML declarations that contradict UTF-8 decoding",
      "svg-utf16-declaration",
      "invalid XML declaration or processing instruction",
      staleFiles,
    );
    assertRendererFailure(
      "renderer rejects XML declarations after leading whitespace",
      "svg-misplaced-declaration",
      "invalid XML declaration or processing instruction",
      staleFiles,
    );
  }

  const floatingEdge = path.join(temp, "floating-edge.drawio");
  writeFileSync(
    floatingEdge,
    drawio(`        <mxCell id="edge" value="Events and artifacts" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="40" y="80" as="sourcePoint"/>
            <mxPoint x="300" y="80" as="targetPoint"/>
          </mxGeometry>
        </mxCell>`),
    "utf8",
  );
  assertNodeRun(
    "floating semantic edge",
    [diagramRules, floatingEdge],
    1,
    "edge must reference source and target vertex ids",
  );

  const compressedFloatingEdge = path.join(temp, "compressed-floating-edge.drawio");
  writeFileSync(
    compressedFloatingEdge,
    compressedDrawio(`        <mxCell id="edge" value="Compressed events" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="40" y="80" as="sourcePoint"/>
            <mxPoint x="300" y="80" as="targetPoint"/>
          </mxGeometry>
        </mxCell>`),
    "utf8",
  );
  assertNodeRun(
    "compressed floating semantic edge",
    [diagramRules, compressedFloatingEdge],
    1,
    "edge must reference source and target vertex ids",
  );

  const compressedLimitBomb = path.join(temp, "compressed-limit-bomb.drawio");
  const compressedLimitPayload = zlib
    .deflateRawSync(Buffer.alloc(64 * 1024 * 1024 + 1, 0x20))
    .toString("base64");
  writeFileSync(
    compressedLimitBomb,
    `<mxfile host="app.diagrams.net"><diagram name="Limit">${compressedLimitPayload}</diagram></mxfile>`,
    "utf8",
  );
  assertRun(
    "compressed Python inflated-size limit",
    compressedLimitBomb,
    2,
    "exceeds the aggregate inflated-size limit",
  );
  assertNodeRun(
    "compressed Node inflated-size limit",
    [diagramRules, compressedLimitBomb],
    2,
    "exceeds the 64 MiB inflated-size limit",
  );

  const trailingCompressedDiagram = path.join(temp, "trailing-compressed-diagram.drawio");
  const trailingCompressedPayload = Buffer.concat([
    zlib.deflateRawSync(encodeURIComponent(graphModel(""))),
    Buffer.from([0]),
  ]).toString("base64");
  writeFileSync(
    trailingCompressedDiagram,
    `<mxfile host="app.diagrams.net"><diagram name="Trailing">${trailingCompressedPayload}</diagram></mxfile>`,
    "utf8",
  );
  assertRun(
    "compressed Python trailing-stream guard",
    trailingCompressedDiagram,
    2,
    "incomplete or trailing deflate stream",
  );
  assertNodeRun(
    "compressed Node trailing-stream guard",
    [diagramRules, trailingCompressedDiagram],
    2,
    "trailing deflate data",
  );

  const singleQuotedFloatingEdge = path.join(temp, "single-quoted-floating-edge.drawio");
  writeFileSync(
    singleQuotedFloatingEdge,
    `<mxfile host='app.diagrams.net'>
  <diagram name='Single Quoted'>
    <mxGraphModel adaptiveColors='auto' dx='800' dy='600' grid='1' gridSize='10' page='1' pageScale='1' pageWidth='827' pageHeight='1169' math='0' shadow='0'>
      <root>
        <mxCell id='0'/>
        <mxCell id='1' parent='0'/>
        <mxCell id='edge' value='Single quoted events' style='edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;' edge='1' parent='1'>
          <mxGeometry relative='1' as='geometry'>
            <mxPoint x='40' y='80' as='sourcePoint'/>
            <mxPoint x='300' y='80' as='targetPoint'/>
          </mxGeometry>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`,
    "utf8",
  );
  assertNodeRun(
    "single-quoted floating semantic edge",
    [diagramRules, singleQuotedFloatingEdge],
    1,
    "edge must reference source and target vertex ids",
  );

  const decorativeEdge = path.join(temp, "decorative-edge.drawio");
  writeFileSync(
    decorativeEdge,
    drawio(`        <mxCell id="legend-line" value="Legend" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;dataRole=legend;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="40" y="80" as="sourcePoint"/>
            <mxPoint x="300" y="80" as="targetPoint"/>
          </mxGeometry>
        </mxCell>`),
    "utf8",
  );
  assertNodeRun(
    "decorative floating edge",
    [diagramRules, decorativeEdge],
    0,
    "0 diagram rule error(s)",
  );

  const transparentCalloutCrossing = path.join(temp, "transparent-callout-crossing.drawio");
  writeFileSync(
    transparentCalloutCrossing,
    drawio(`        <mxCell id="a" value="A" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;" vertex="1" parent="1">
          <mxGeometry x="20" y="40" width="60" height="40" as="geometry"/>
        </mxCell>
        <mxCell id="b" value="B" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;" vertex="1" parent="1">
          <mxGeometry x="220" y="40" width="60" height="40" as="geometry"/>
        </mxCell>
        <mxCell id="callout" value="Do not cross" style="text;html=1;strokeColor=none;fillColor=none;" vertex="1" parent="1">
          <mxGeometry x="110" y="45" width="80" height="30" as="geometry"/>
        </mxCell>
        <mxCell id="edge" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;" edge="1" parent="1" source="a" target="b">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertNodeRun(
    "transparent text callout crossing",
    [diagramRules, transparentCalloutCrossing],
    0,
    "probable connector route crosses callout",
  );

  const waypointRouteAvoidsCallout = path.join(temp, "waypoint-route-avoids-callout.drawio");
  writeFileSync(
    waypointRouteAvoidsCallout,
    drawio(`        <mxCell id="a" value="A" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;" vertex="1" parent="1">
          <mxGeometry x="20" y="40" width="60" height="40" as="geometry"/>
        </mxCell>
        <mxCell id="b" value="B" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;" vertex="1" parent="1">
          <mxGeometry x="220" y="40" width="60" height="40" as="geometry"/>
        </mxCell>
        <mxCell id="callout" value="Do not cross" style="text;html=1;strokeColor=none;fillColor=none;" vertex="1" parent="1">
          <mxGeometry x="110" y="45" width="80" height="30" as="geometry"/>
        </mxCell>
        <mxCell id="edge" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;" edge="1" parent="1" source="a" target="b">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="50" y="120"/>
              <mxPoint x="250" y="120"/>
            </Array>
          </mxGeometry>
        </mxCell>`),
    "utf8",
  );
  assertNodeRun(
    "waypoint route avoids callout",
    [diagramRules, waypointRouteAvoidsCallout],
    0,
    "0 diagram rule error(s), 0 warning(s)",
  );

  const nestedWaypointRouteAvoidsCallout = path.join(
    temp,
    "nested-waypoint-route-avoids-callout.drawio",
  );
  writeFileSync(
    nestedWaypointRouteAvoidsCallout,
    drawio(`        <mxCell id="group" value="" style="container=1;fillColor=none;strokeColor=none;" vertex="1" parent="1">
          <mxGeometry x="400" y="0" width="300" height="160" as="geometry"/>
        </mxCell>
        <mxCell id="a" value="A" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;" vertex="1" parent="group">
          <mxGeometry x="20" y="40" width="60" height="40" as="geometry"/>
        </mxCell>
        <mxCell id="b" value="B" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;" vertex="1" parent="group">
          <mxGeometry x="220" y="40" width="60" height="40" as="geometry"/>
        </mxCell>
        <mxCell id="callout" value="Do not cross" style="text;html=1;strokeColor=none;fillColor=none;" vertex="1" parent="group">
          <mxGeometry x="110" y="45" width="80" height="30" as="geometry"/>
        </mxCell>
        <mxCell id="edge" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;" edge="1" parent="group" source="a" target="b">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="50" y="120"/>
              <mxPoint x="250" y="120"/>
            </Array>
          </mxGeometry>
        </mxCell>`),
    "utf8",
  );
  assertNodeRun(
    "nested waypoint route avoids callout",
    [diagramRules, nestedWaypointRouteAvoidsCallout],
    0,
    "0 diagram rule error(s), 0 warning(s)",
  );

  const relativeSourcePortAvoidsCallout = path.join(
    temp,
    "relative-source-port-avoids-callout.drawio",
  );
  writeFileSync(
    relativeSourcePortAvoidsCallout,
    drawio(`        <mxCell id="a" value="A" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;" vertex="1" parent="1">
          <mxGeometry x="20" y="40" width="100" height="100" as="geometry"/>
        </mxCell>
        <mxCell id="source-sibling" value="" style="rounded=1;fillColor=#f8cecc;" vertex="1" parent="a">
          <mxGeometry x="0" y="0" width="30" height="30" as="geometry"/>
        </mxCell>
        <mxCell id="relative-badge" value="" style="rounded=1;fillColor=#fff2cc;" vertex="1" parent="a">
          <mxGeometry x="0.5" y="0.5" width="20" height="20" relative="1" as="geometry"/>
        </mxCell>
        <mxCell id="source-port" value="" style="ellipse;fillColor=#ffffff;" vertex="1" parent="a">
          <mxGeometry x="1" y="0" width="10" height="10" relative="1" as="geometry">
            <mxPoint x="-10" y="0" as="offset"/>
          </mxGeometry>
        </mxCell>
        <mxCell id="b" value="B" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;" vertex="1" parent="1">
          <mxGeometry x="300" y="25" width="60" height="40" as="geometry"/>
        </mxCell>
        <mxCell id="callout" value="Do not cross" style="text;html=1;strokeColor=none;fillColor=none;" vertex="1" parent="1">
          <mxGeometry x="140" y="65" width="80" height="25" as="geometry"/>
        </mxCell>
        <mxCell id="edge" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;sourcePort=source-port;" edge="1" parent="1" source="a" target="b">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertNodeRun(
    "relative source port avoids callout",
    [diagramRules, relativeSourcePortAvoidsCallout],
    0,
    "0 diagram rule error(s), 0 warning(s)",
  );
  assertRun("relative source port geometry", relativeSourcePortAvoidsCallout, 0);

  const missingSourcePort = path.join(temp, "missing-source-port.drawio");
  writeFileSync(
    missingSourcePort,
    drawio(`        <mxCell id="a" value="A" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;" vertex="1" parent="1">
          <mxGeometry x="20" y="40" width="60" height="40" as="geometry"/>
        </mxCell>
        <mxCell id="b" value="B" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;" vertex="1" parent="1">
          <mxGeometry x="220" y="40" width="60" height="40" as="geometry"/>
        </mxCell>
        <mxCell id="edge" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;sourcePort=missing-port;" edge="1" parent="1" source="a" target="b">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertNodeRun(
    "missing source port diagram rule",
    [diagramRules, missingSourcePort],
    1,
    'sourcePort="missing-port" must reference a vertex',
  );
  assertRun(
    "missing source port Python validation",
    missingSourcePort,
    1,
    'sourcePort="missing-port" does not exist',
  );

  const parentOffsetCalloutCrossing = path.join(temp, "parent-offset-callout-crossing.drawio");
  writeFileSync(
    parentOffsetCalloutCrossing,
    drawio(`        <mxCell id="left_container" value="Left" style="rounded=1;whiteSpace=wrap;html=1;container=1;fillColor=none;" vertex="1" parent="1">
          <mxGeometry x="0" y="0" width="140" height="140" as="geometry"/>
        </mxCell>
        <mxCell id="right_container" value="Right" style="rounded=1;whiteSpace=wrap;html=1;container=1;fillColor=none;" vertex="1" parent="1">
          <mxGeometry x="400" y="0" width="140" height="140" as="geometry"/>
        </mxCell>
        <mxCell id="a" value="A" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;" vertex="1" parent="left_container">
          <mxGeometry x="20" y="40" width="60" height="40" as="geometry"/>
        </mxCell>
        <mxCell id="b" value="B" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;" vertex="1" parent="right_container">
          <mxGeometry x="20" y="40" width="60" height="40" as="geometry"/>
        </mxCell>
        <mxCell id="callout" value="Actual crossing" style="text;html=1;strokeColor=none;fillColor=none;" vertex="1" parent="1">
          <mxGeometry x="210" y="45" width="120" height="30" as="geometry"/>
        </mxCell>
        <mxCell id="edge" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;" edge="1" parent="1" source="a" target="b">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertNodeRun(
    "parent-offset text callout crossing",
    [diagramRules, parentOffsetCalloutCrossing],
    0,
    "probable connector route crosses callout",
  );

  const distortedLogo = path.join(temp, "distorted-logo.drawio");
  writeFileSync(
    distortedLogo,
    drawio(`        <mxCell id="sap_logo" value="SAP" style="shape=image;image=data:image/svg+xml;base64,PHN2Zy8+;verticalLabelPosition=bottom;verticalAlign=top;html=1;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="60" height="60" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertNodeRun(
    "distorted logo guard",
    [diagramRules, distortedLogo],
    1,
    "logos must preserve their original aspect ratio",
  );

  const splitSvgDataUri = path.join(temp, "split-svg-data-uri.drawio");
  writeFileSync(
    splitSvgDataUri,
    drawio(`        <mxCell id="logo" value="Logo" style="shape=image;image=data:image/svg+xml;base64,PHN2Zy8+;aspect=fixed;verticalLabelPosition=bottom;verticalAlign=top;html=1;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="60" height="60" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertNodeRun(
    "split SVG data URI guard",
    [diagramRules, splitSvgDataUri],
    0,
    "SVG data URI uses a ;base64 style delimiter",
  );

  const safeSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="paint"><stop offset="0"/></linearGradient><path id="mark" fill="url(#paint)" d="M0 0h24v24H0z"/></defs><use href="#mark"/></svg>';
  const markerlessSvgUri = `data:image/svg+xml,${Buffer.from(safeSvg).toString("base64")}`;
  const compactArcSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19.503 0H4.496A4.496 4.496 0 000 4.496v15.007A4.496 4.496 0 004.496 24h15.007A4.496 4.496 0 0024 19.503V4.496A4.496 4.496 0 0019.503 0z"/></svg>';
  const compactArcSvgUri = `data:image/svg+xml,${Buffer.from(compactArcSvg).toString("base64")}`;
  const strokedOpenPathSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="#000" d="M1 1L20 20"/></svg>';
  const strokedOpenPathSvgUri = `data:image/svg+xml,${Buffer.from(strokedOpenPathSvg).toString("base64")}`;
  const zeroLengthRoundSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="#000" stroke-width="4" stroke-linecap="round" d="M12 12L12 12"/></svg>';
  const zeroLengthSquareSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="#000" stroke-width="4" stroke-linecap="square" d="M12 12L12 12"/></svg>';
  const strokedCollinearPolygonSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polygon fill="none" stroke="#000" points="1,1 12,12 20,20"/></svg>';
  const strokedCollinearPolylineSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polyline fill="none" stroke="#000" points="1,1 12,12 20,20"/></svg>';
  const filledNonCollinearPolylineSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polyline points="1,1 20,1 12,20"/></svg>';
  const patternPaintServerSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><pattern id="tile" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#000"/></pattern></defs><path fill="url(#tile)" d="M0 0h24v24H0z"/></svg>';
  const radialGradientPaintServerSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><radialGradient id="glow"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#2563EB"/></radialGradient></defs><circle fill="url(#glow)" cx="12" cy="12" r="12"/></svg>';
  const directColorSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#2563EB" d="M0 0h24v24H0z"/></svg>';
  const selfContainedSvgSource = path.join(temp, "self-contained-svg-source.drawio");
  writeFileSync(selfContainedSvgSource, embeddedSvgDrawio(markerlessSvgUri), "utf8");
  assertRun("self-contained uncompressed SVG source", selfContainedSvgSource, 0, "0 error(s)", [
    "--require-self-contained-images",
    "--require-uncompressed",
  ]);

  const imageSetSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" style="background-image:image-set(&quot;https://cdn.example/icon.png&quot; 1x)"/></svg>';
  const imageSetSvgUri = `data:image/svg+xml,${Buffer.from(imageSetSvg).toString("base64")}`;
  const imageSetSvgSource = path.join(temp, "image-set-svg-source.drawio");
  writeFileSync(imageSetSvgSource, embeddedSvgDrawio(imageSetSvgUri), "utf8");
  assertRun(
    "embedded SVG string-form image-set is not self-contained",
    imageSetSvgSource,
    1,
    "embedded SVG attribute contains unsupported CSS image-set",
    ["--require-self-contained-images", "--require-uncompressed"],
  );

  const missingFragmentImageSource = path.join(temp, "missing-fragment-image-source.drawio");
  writeFileSync(
    missingFragmentImageSource,
    drawio(`        <mxCell id="logo" value="Logo" style="shape=image;image=${markerlessSvgUri};aspect=fixed;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="60" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="missing-image" value="Missing" style="shape=image;image=#missing;aspect=fixed;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="140" y="40" width="60" height="60" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertRun(
    "fragment-only image cell source is not self-contained",
    missingFragmentImageSource,
    1,
    "non-embedded image source in portable mode",
    ["--require-self-contained-images", "--require-uncompressed"],
  );

  const emptyImageSource = path.join(temp, "empty-image-source.drawio");
  writeFileSync(
    emptyImageSource,
    drawio(`        <mxCell id="logo" value="Logo" style="shape=image;image=${markerlessSvgUri};aspect=fixed;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="60" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="empty-image" value="Empty" style="shape=image;aspect=fixed;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="140" y="40" width="60" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="empty-image-declaration" value="Empty declaration" style="image=;aspect=fixed;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="240" y="40" width="60" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="empty-bare-image" value="Empty bare image" style="image;aspect=fixed;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="340" y="40" width="60" height="60" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertRun(
    "image-shaped cell without a source is not self-contained",
    emptyImageSource,
    1,
    [
      "ERROR [empty-image] image cell has an empty or missing image source",
      "ERROR [empty-image-declaration] image cell has an empty or missing image source",
      "ERROR [empty-bare-image] image cell has an empty or missing image source",
    ],
    ["--require-self-contained-images", "--require-uncompressed"],
  );

  const inlineSvgDrawio = (inlineSvg) =>
    drawio(`        <mxCell id="logo" value="Logo" style="shape=image;image=${markerlessSvgUri};aspect=fixed;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="60" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="inline-svg" value="${xmlAttribute(inlineSvg)}" style="text;html=1;" vertex="1" parent="1">
          <mxGeometry x="140" y="40" width="120" height="60" as="geometry"/>
        </mxCell>`);
  for (const [name, resource] of [
    ["image", '<image href="https://cdn.example/icon.svg"/>'],
    ["use", '<use href="https://cdn.example/icons.svg#mark"/>'],
    ["fe-image", '<feImage href="https://cdn.example/icon.svg"/>'],
    ["linear-gradient", '<linearGradient href="https://cdn.example/paint.svg#gradient"/>'],
    [
      "radial-gradient-xlink",
      '<radialGradient xlink:href="https://cdn.example/paint.svg#gradient"/>',
    ],
    ["pattern", '<pattern href="https://cdn.example/paint.svg#pattern"/>'],
    ["filter", '<filter href="https://cdn.example/effects.svg#shadow"/>'],
    ["motion-path", '<mpath href="https://cdn.example/motion.svg#path"/>'],
    ["animation", '<animate href="https://cdn.example/icon.svg#mark" attributeName="opacity"/>'],
  ]) {
    const remoteInlineSvg = path.join(temp, `remote-inline-svg-${name}.drawio`);
    writeFileSync(remoteInlineSvg, inlineSvgDrawio(`<svg>${resource}</svg>`), "utf8");
    assertRun(
      `remote inline SVG ${name} rejected for self-contained source`,
      remoteInlineSvg,
      1,
      "linked/remote icon in portable mode",
      ["--require-self-contained-images", "--require-uncompressed"],
    );
  }
  const activeInlineSvgCases = [
    ["xml-base", '<svg xml:base="https://cdn.example/"><use href="#mark"/></svg>'],
    [
      "xml-stylesheet",
      '<?xml-stylesheet href="https://cdn.example/icon.css"?><svg><use href="#mark"/></svg>',
    ],
    [
      "smil-set-mutation",
      '<svg><image id="logo" href="#mark"/><set href="#logo" attributeName="href" to="https://cdn.example/icon.svg"/></svg>',
    ],
    [
      "smil-animate-values-mutation",
      '<svg><image id="logo" href="#mark"/><animate href="#logo" attributeName="href" values="#mark;https://cdn.example/icon.svg"/></svg>',
    ],
  ];
  for (const [name, inlineSvg] of activeInlineSvgCases) {
    const unsafeInlineSvg = path.join(temp, `unsafe-inline-svg-${name}.drawio`);
    writeFileSync(unsafeInlineSvg, inlineSvgDrawio(inlineSvg), "utf8");
    assertRun(
      `unsafe inline SVG ${name} rejected for self-contained source`,
      unsafeInlineSvg,
      1,
      "non-embedded image source in portable mode",
      ["--require-self-contained-images", "--require-uncompressed"],
    );
  }
  const localInlineSvgReferences = path.join(temp, "local-inline-svg-references.drawio");
  writeFileSync(
    localInlineSvgReferences,
    inlineSvgDrawio(
      '<svg><defs><path id="mark"/><linearGradient id="paint"/><pattern id="tile"/><filter id="shadow"/></defs><use href="#mark"/><feImage href="#mark"/><linearGradient href="#paint"/><radialGradient xlink:href="#paint"/><pattern href="#tile"/><filter href="#shadow"/><mpath href="#mark"/></svg>',
    ),
    "utf8",
  );
  assertRun(
    "unvalidated inline SVG fragments are not image payloads",
    localInlineSvgReferences,
    1,
    "non-embedded image source in portable mode",
    ["--require-self-contained-images", "--require-uncompressed"],
  );

  const remoteHtmlImage = path.join(temp, "remote-html-image.drawio");
  writeFileSync(
    remoteHtmlImage,
    drawio(`        <mxCell id="logo" value="Logo" style="shape=image;image=${markerlessSvgUri};aspect=fixed;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="60" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="html-image" value="&lt;img src=&quot;https://cdn.example/logo.svg&quot;/&gt;" style="text;html=1;" vertex="1" parent="1">
          <mxGeometry x="140" y="40" width="120" height="60" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertRun("remote HTML image warning", remoteHtmlImage, 0, "linked/remote icon in portable mode");
  assertRun(
    "remote HTML image rejected for self-contained source",
    remoteHtmlImage,
    1,
    "linked/remote icon in portable mode",
    ["--require-self-contained-images", "--require-uncompressed"],
  );

  const htmlResourceDrawio = (markup) =>
    drawio(`        <mxCell id="logo" value="Logo" style="shape=image;image=${markerlessSvgUri};aspect=fixed;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="60" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="html-resource" value="${xmlAttribute(markup)}" style="text;html=1;" vertex="1" parent="1">
          <mxGeometry x="140" y="40" width="120" height="60" as="geometry"/>
        </mxCell>`);

  for (const [name, markup] of [
    ["img-absent", "<img>"],
    ["img-empty", '<img src="" srcset="">'],
    ["image-absent", "<image>"],
    ["image-empty", '<image href="" xlink:href="">'],
    ["source-absent", "<source>"],
    ["source-empty", '<source src="" srcset="">'],
  ]) {
    const missingHtmlImageSource = path.join(temp, `missing-html-image-source-${name}.drawio`);
    writeFileSync(missingHtmlImageSource, htmlResourceDrawio(markup), "utf8");
    assertRun(
      `${name} HTML image resource requires a usable source`,
      missingHtmlImageSource,
      1,
      "non-embedded image source in portable mode",
      ["--require-self-contained-images", "--require-uncompressed"],
    );
  }

  for (const [name, markup] of [
    ["img-srcset", `<img src="" srcset="${markerlessSvgUri} 1x">`],
    ["image-xlink", `<image href="" xlink:href="${markerlessSvgUri}">`],
    ["source-srcset", `<source src="" srcset="${markerlessSvgUri} 1x">`],
  ]) {
    const fallbackHtmlImageSource = path.join(temp, `fallback-html-image-source-${name}.drawio`);
    writeFileSync(fallbackHtmlImageSource, htmlResourceDrawio(markup), "utf8");
    assertRun(
      `${name} HTML image resource accepts a valid fallback`,
      fallbackHtmlImageSource,
      0,
      "0 error(s)",
      ["--require-self-contained-images", "--require-uncompressed"],
    );
  }

  for (const [name, markup, expected] of [
    [
      "style-attribute-escape",
      '<span style="background:u\\72l(https://cdn.example/escaped.svg)">Escaped</span>',
      "non-embedded image source in portable mode",
    ],
    [
      "style-attribute-import",
      "<span style=\"@import 'https://cdn.example/import.css';\">Import</span>",
      "non-embedded image source in portable mode",
    ],
    [
      "style-element-escape",
      '<style>.mark{background:u\\72l(https://cdn.example/escaped.svg)}</style><span class="mark">Escaped</span>',
      "non-embedded image source in portable mode",
    ],
    [
      "style-element-import",
      '<style>@import "https://cdn.example/import.css";.mark{background:url(https://cdn.example/visible.svg)}</style><span class="mark">Import</span>',
      ["non-embedded image source in portable mode", "linked/remote icon in portable mode"],
    ],
    [
      "style-attribute-image-set",
      "<span style=\"background-image:image-set('https://cdn.example/one.png' 1x, 'https://cdn.example/two.png' 2x)\">Image set</span>",
      "non-embedded image source in portable mode",
    ],
    [
      "style-element-webkit-image-set",
      '<style>.mark{background-image:-webkit-image-set("https://cdn.example/one.png" 1x)}</style><span class="mark">Image set</span>',
      "non-embedded image source in portable mode",
    ],
  ]) {
    const unsafeHtmlCss = path.join(temp, `unsafe-html-css-${name}.drawio`);
    writeFileSync(unsafeHtmlCss, htmlResourceDrawio(markup), "utf8");
    assertRun(`${name} HTML CSS resource syntax is rejected`, unsafeHtmlCss, 1, expected, [
      "--require-self-contained-images",
      "--require-uncompressed",
    ]);
  }

  const remoteHtmlSrcset = path.join(temp, "remote-html-srcset.drawio");
  writeFileSync(
    remoteHtmlSrcset,
    drawio(`        <mxCell id="logo" value="Logo" style="shape=image;image=${markerlessSvgUri};aspect=fixed;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="60" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="html-srcset" value="&lt;source srcset=&quot;#logo 1x, https://cdn.example/icon.svg 2x&quot;/&gt;" style="text;html=1;" vertex="1" parent="1">
          <mxGeometry x="140" y="40" width="120" height="60" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertRun(
    "remote HTML srcset candidate rejected for self-contained source",
    remoteHtmlSrcset,
    1,
    "linked/remote icon in portable mode",
    ["--require-self-contained-images", "--require-uncompressed"],
  );

  const duplicateRemoteHtmlSrcset = path.join(temp, "duplicate-remote-html-srcset.drawio");
  writeFileSync(
    duplicateRemoteHtmlSrcset,
    drawio(`        <mxCell id="logo" value="Logo" style="shape=image;image=${markerlessSvgUri};aspect=fixed;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="60" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="html-srcset" value="&lt;source srcset=&quot;https://cdn.example/evil.svg 1x&quot; srcset=&quot;#logo 2x&quot;/&gt;" style="text;html=1;" vertex="1" parent="1">
          <mxGeometry x="140" y="40" width="120" height="60" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertRun(
    "remote candidate in duplicate HTML srcset attribute rejected",
    duplicateRemoteHtmlSrcset,
    1,
    "linked/remote icon in portable mode",
    ["--require-self-contained-images", "--require-uncompressed"],
  );

  const compactRemoteHtmlSrcset = path.join(temp, "compact-remote-html-srcset.drawio");
  writeFileSync(
    compactRemoteHtmlSrcset,
    drawio(`        <mxCell id="logo" value="Logo" style="shape=image;image=${markerlessSvgUri};aspect=fixed;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="60" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="html-srcset" value="&lt;source srcset=&quot;#logo,https://cdn.example/icon.svg&quot;/&gt;" style="text;html=1;" vertex="1" parent="1">
          <mxGeometry x="140" y="40" width="120" height="60" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertRun(
    "compact remote HTML srcset candidate rejected for self-contained source",
    compactRemoteHtmlSrcset,
    1,
    "linked/remote icon in portable mode",
    ["--require-self-contained-images", "--require-uncompressed"],
  );

  const localHtmlSrcset = path.join(temp, "local-html-srcset.drawio");
  writeFileSync(
    localHtmlSrcset,
    drawio(`        <mxCell id="logo" value="Logo" style="shape=image;image=${markerlessSvgUri};aspect=fixed;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="60" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="html-srcset" value="&lt;source srcset=&quot;#logo,#logo&quot;/&gt;" style="text;html=1;" vertex="1" parent="1">
          <mxGeometry x="140" y="40" width="120" height="60" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertRun(
    "fragment-only HTML srcset candidates are not image payloads",
    localHtmlSrcset,
    1,
    "non-embedded image source in portable mode",
    ["--require-self-contained-images", "--require-uncompressed"],
  );

  const dataUriHtmlSrcset = path.join(temp, "data-uri-html-srcset.drawio");
  writeFileSync(
    dataUriHtmlSrcset,
    drawio(`        <mxCell id="logo" value="Logo" style="shape=image;image=${markerlessSvgUri};aspect=fixed;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="60" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="html-srcset" value="${xmlAttribute(`<source srcset="${markerlessSvgUri} 1x, ${markerlessSvgUri} 2x"/>`)}" style="text;html=1;" vertex="1" parent="1">
          <mxGeometry x="140" y="40" width="120" height="60" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertRun(
    "data URI comma in HTML srcset remains part of its candidate",
    dataUriHtmlSrcset,
    0,
    "0 error(s)",
    ["--require-self-contained-images", "--require-uncompressed"],
  );

  const safeHtmlNavigation = path.join(temp, "safe-html-navigation.drawio");
  writeFileSync(
    safeHtmlNavigation,
    drawio(`        <mxCell id="logo" value="Logo" style="shape=image;image=${markerlessSvgUri};aspect=fixed;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="60" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="docs" value="&lt;a href=&quot;https://www.drawio.com/doc/faq/svg-export-text-problems&quot;&gt;Docs&lt;/a&gt;" style="text;html=1;" vertex="1" parent="1">
          <mxGeometry x="140" y="40" width="120" height="60" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertRun("HTTPS HTML navigation remains self-contained", safeHtmlNavigation, 0, "0 error(s)", [
    "--require-self-contained-images",
    "--require-uncompressed",
  ]);

  for (const [name, href] of [
    ["relative", "docs/guide.html"],
    ["parent-relative", "../guide.html#install"],
    ["root-relative", "/docs/guide.html"],
    ["telephone", "tel:+123456"],
    ["sms", "sms:+123456"],
    ["ftp", "ftp://downloads.example/guide.pdf"],
    ["geo", "geo:0,0"],
  ]) {
    const navigationSource = path.join(temp, `safe-html-navigation-${name}.drawio`);
    writeFileSync(
      navigationSource,
      drawio(`        <mxCell id="logo" value="Logo" style="shape=image;image=${markerlessSvgUri};aspect=fixed;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="60" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="docs" value="${xmlAttribute(`<a href="${href}">Docs</a>`)}" style="text;html=1;" vertex="1" parent="1">
          <mxGeometry x="140" y="40" width="120" height="60" as="geometry"/>
        </mxCell>`),
      "utf8",
    );
    assertRun(`${name} HTML navigation remains self-contained`, navigationSource, 0, "0 error(s)", [
      "--require-self-contained-images",
      "--require-uncompressed",
    ]);
  }

  for (const [name, unsafeHref] of [
    ["javascript", "javascript:alert(1)"],
    ["javascript-lf", "java&#10;script:alert(1)"],
    ["javascript-tab", "java&#9;script:alert(1)"],
    ["vbscript-cr", "vb&#13;script:msgbox(1)"],
    ["data-html-lf", "data:&#10;text/html,unsafe"],
    ["trimmed-c0", " &#9;javascript:alert(1)&#13; "],
  ]) {
    const unsafeHtmlNavigation = path.join(temp, `unsafe-html-navigation-${name}.drawio`);
    writeFileSync(
      unsafeHtmlNavigation,
      drawio(`        <mxCell id="logo" value="Logo" style="shape=image;image=${markerlessSvgUri};aspect=fixed;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="60" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="unsafe-link" value="&lt;a href=&quot;${unsafeHref}&quot;&gt;Unsafe&lt;/a&gt;" style="text;html=1;" vertex="1" parent="1">
          <mxGeometry x="140" y="40" width="120" height="60" as="geometry"/>
        </mxCell>`),
      "utf8",
    );
    assertRun(
      `${name} active HTML navigation remains rejected`,
      unsafeHtmlNavigation,
      1,
      "non-embedded image source in portable mode",
      ["--require-self-contained-images", "--require-uncompressed"],
    );
  }

  const remoteHtmlIframe = path.join(temp, "remote-html-iframe.drawio");
  writeFileSync(
    remoteHtmlIframe,
    drawio(`        <mxCell id="logo" value="Logo" style="shape=image;image=${markerlessSvgUri};aspect=fixed;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="60" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="iframe" value="&lt;iframe src=&quot;https://cdn.example/embed&quot;&gt;&lt;/iframe&gt;" style="text;html=1;" vertex="1" parent="1">
          <mxGeometry x="140" y="40" width="120" height="60" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertRun(
    "remote HTML iframe rejected for self-contained source",
    remoteHtmlIframe,
    1,
    "non-embedded image source in portable mode",
    ["--require-self-contained-images", "--require-uncompressed"],
  );

  const compressedEmbeddedSvg = path.join(temp, "compressed-embedded-svg.drawio");
  writeFileSync(
    compressedEmbeddedSvg,
    compressedDrawio(`        <mxCell id="logo" value="Logo" style="shape=image;image=${markerlessSvgUri};aspect=fixed;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="60" height="60" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertRun(
    "compressed source rejected by uncompressed contract",
    compressedEmbeddedSvg,
    2,
    "compressed diagram pages are not allowed",
    ["--require-self-contained-images", "--require-uncompressed"],
  );

  for (const { name, uri, bareImage = false } of [
    { name: "marker-less-embedded-svg", uri: markerlessSvgUri },
    {
      name: "percent-encoded-svg",
      uri: `data:image/svg+xml,${encodeURIComponent(safeSvg)}`,
    },
    {
      name: "percent-encoded-leading-whitespace-svg",
      uri: `data:image/svg+xml,${encodeURIComponent(`\n  ${safeSvg}`)}`,
    },
    {
      name: "case-insensitive-svg-media-type",
      uri: `DATA:IMAGE/SVG+XML,${Buffer.from(safeSvg).toString("base64")}`,
    },
    { name: "compact-arc-flags-svg", uri: compactArcSvgUri },
    { name: "stroked-open-path-svg", uri: strokedOpenPathSvgUri },
    {
      name: "zero-length-round-path-svg",
      uri: `data:image/svg+xml,${Buffer.from(zeroLengthRoundSvg).toString("base64")}`,
    },
    {
      name: "zero-length-square-path-svg",
      uri: `data:image/svg+xml,${Buffer.from(zeroLengthSquareSvg).toString("base64")}`,
    },
    {
      name: "stroked-collinear-polygon-svg",
      uri: `data:image/svg+xml,${Buffer.from(strokedCollinearPolygonSvg).toString("base64")}`,
    },
    {
      name: "stroked-collinear-polyline-svg",
      uri: `data:image/svg+xml,${Buffer.from(strokedCollinearPolylineSvg).toString("base64")}`,
    },
    {
      name: "filled-non-collinear-polyline-svg",
      uri: `data:image/svg+xml,${Buffer.from(filledNonCollinearPolylineSvg).toString("base64")}`,
    },
    {
      name: "pattern-paint-server-svg",
      uri: `data:image/svg+xml,${Buffer.from(patternPaintServerSvg).toString("base64")}`,
    },
    {
      name: "radial-gradient-paint-server-svg",
      uri: `data:image/svg+xml,${Buffer.from(radialGradientPaintServerSvg).toString("base64")}`,
    },
    {
      name: "direct-color-paint-svg",
      uri: `data:image/svg+xml,${Buffer.from(directColorSvg).toString("base64")}`,
    },
    { name: "bare-image-svg", uri: markerlessSvgUri, bareImage: true },
  ]) {
    const validEmbeddedSvg = path.join(temp, `${name}.drawio`);
    writeFileSync(validEmbeddedSvg, embeddedSvgDrawio(uri, { bareImage }), "utf8");
    assertRun(`valid ${name}`, validEmbeddedSvg, 0, "0 error(s)");
    assertNodeRun(
      `valid ${name} diagram rules`,
      [diagramRules, validEmbeddedSvg],
      0,
      "0 diagram rule error(s), 0 warning(s)",
    );
  }

  const bareImageWithoutAspect = path.join(temp, "bare-image-without-aspect.drawio");
  writeFileSync(
    bareImageWithoutAspect,
    embeddedSvgDrawio(markerlessSvgUri, {
      bareImage: true,
      fixedAspect: false,
    }),
    "utf8",
  );
  assertNodeRun(
    "bare image fixed-aspect guard",
    [diagramRules, bareImageWithoutAspect],
    1,
    "logos must preserve their original aspect ratio",
  );

  const utf16Doctype =
    '<?xml version="1.0" encoding="UTF-16"?><!DOCTYPE svg [<!ENTITY x "boom">]><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text>&x;</text></svg>';
  const invalidEmbeddedSvgCases = [
    {
      name: "non-svg-root",
      svg: "<html></html>",
      expected: "embedded image root is not <svg>",
    },
    {
      name: "active-script",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><script>alert(1)</script></svg>',
      expected: "forbidden <script>",
    },
    {
      name: "case-insensitive-active-script",
      mime: "DATA:IMAGE/SVG+XML,",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><script>alert(1)</script></svg>',
      expected: "forbidden <script>",
    },
    {
      name: "bare-image-active-script",
      bareImage: true,
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><script>alert(1)</script></svg>',
      expected: "forbidden <script>",
    },
    {
      name: "external-reference",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><use href="https://example.com/mark.svg#icon"/></svg>',
      expected: "external reference",
    },
    {
      name: "css-escaped-import",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><style>@\\69mport "https://example.com/icon.css";</style></svg>',
      expected: "non-keyframe stylesheet rule",
    },
    {
      name: "processing-instruction",
      svg: '<?xml-stylesheet href="https://example.com/icon.css"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"/>',
      expected: "processing instruction",
    },
    {
      name: "doctype",
      svg: '<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"/>',
      expected: "contains a DOCTYPE",
    },
    {
      name: "external-xml-base",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" xml:base="https://example.com/icon.svg" viewBox="0 0 24 24"><path id="mark"/><use href="#mark"/></svg>',
      expected: "xml:base",
    },
    {
      name: "smil-reference-mutation",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path id="mark"/><use href="#mark"><set attributeName="href" to="https://example.com/icon.svg#mark"/></use></svg>',
      expected: "forbidden <set>",
    },
    {
      name: "missing-local-fragment",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><use href="#missing"/></svg>',
      expected: "missing local fragment",
    },
    {
      name: "duplicate-local-id",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path id="mark"/><path id="mark"/></svg>',
      expected: "duplicate id",
    },
    {
      name: "non-svg-namespace",
      svg: '<svg xmlns="urn:not-svg" viewBox="0 0 24 24"/>',
      expected: "non-SVG namespace",
    },
    {
      name: "unbounded-svg",
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1z"/></svg>',
      expected: "positive viewBox or width and height",
    },
    {
      name: "empty-bounded-svg",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"/>',
      expected: "no renderable graphic content",
    },
    {
      name: "empty-path-svg",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path/></svg>',
      expected: "no renderable graphic content",
      checkRules: true,
    },
    {
      name: "malformed-path-svg",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="garbage"/></svg>',
      expected: "no renderable graphic content",
      checkRules: true,
    },
    {
      name: "incomplete-path-svg",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0 L"/></svg>',
      expected: "no renderable graphic content",
      checkRules: true,
    },
    {
      name: "zero-length-path-svg",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0L0 0"/></svg>',
      expected: "no renderable graphic content",
      checkRules: true,
    },
    {
      name: "open-fill-only-path-svg",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M1 1L20 20"/></svg>',
      expected: "no renderable graphic content",
      checkRules: true,
    },
    {
      name: "zero-length-butt-path-svg",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="#000" stroke-width="4" stroke-linecap="butt" d="M12 12L12 12"/></svg>',
      expected: "no renderable graphic content",
      checkRules: true,
    },
    {
      name: "collinear-polyline-fill-only-svg",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polyline points="1,1 12,12 20,20"/></svg>',
      expected: "no renderable graphic content",
      checkRules: true,
    },
    {
      name: "collinear-polygon-fill-only-svg",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polygon points="1,1 12,12 20,20"/></svg>',
      expected: "no renderable graphic content",
      checkRules: true,
    },
    {
      name: "missing-local-paint-server-svg",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="url(#missing)" d="M0 0h24v24H0z"/></svg>',
      expected: "missing local fragment",
      checkRules: true,
    },
    {
      name: "zero-sized-primitive-svg",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="0" height="24"/></svg>',
      expected: "no renderable graphic content",
      checkRules: true,
    },
    {
      name: "empty-text-svg",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text>   </text></svg>',
      expected: "no renderable graphic content",
      checkRules: true,
    },
    {
      name: "transparent-current-color-svg",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" color="transparent"><path fill="currentColor" d="M0 0h24v24H0z"/></svg>',
      expected: "no renderable graphic content",
      checkRules: true,
    },
    {
      name: "utf16-doctype",
      bytes: Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(utf16Doctype, "utf16le")]),
      expected: "must use UTF-8 encoding",
    },
  ];
  for (const {
    name,
    svg,
    bytes,
    mime = "data:image/svg+xml,",
    bareImage,
    expected,
    checkRules,
  } of invalidEmbeddedSvgCases) {
    const uri = `${mime}${(bytes || Buffer.from(svg)).toString("base64")}`;
    const invalidEmbeddedSvg = path.join(temp, `${name}.drawio`);
    writeFileSync(invalidEmbeddedSvg, embeddedSvgDrawio(uri, { bareImage }), "utf8");
    assertRun(`invalid ${name}`, invalidEmbeddedSvg, 1, expected);
    if (checkRules) {
      assertNodeRun(
        `diagram rules invalid ${name}`,
        [diagramRules, invalidEmbeddedSvg],
        0,
        "component has no icon/logo",
      );
    }
  }

  const missingEdgeAs = path.join(temp, "missing-edge-as.drawio");
  writeFileSync(
    missingEdgeAs,
    drawio(`        <mxCell id="a" value="A" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;fontColor=#1f2937;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="120" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="b" value="B" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;fontColor=#1f2937;" vertex="1" parent="1">
          <mxGeometry x="220" y="40" width="120" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="edge" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;" edge="1" parent="1" source="a" target="b">
          <mxGeometry relative="1"/>
        </mxCell>`),
    "utf8",
  );
  assertRun(
    "edge geometry as attribute",
    missingEdgeAs,
    1,
    'edge missing <mxGeometry relative="1" as="geometry"/>',
  );

  const missingVertexAs = path.join(temp, "missing-vertex-as.drawio");
  writeFileSync(
    missingVertexAs,
    drawio(`        <mxCell id="node" value="Node" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;fontColor=#1f2937;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="120" height="60"/>
        </mxCell>`),
    "utf8",
  );
  assertRun(
    "vertex geometry as attribute",
    missingVertexAs,
    1,
    'vertex missing <mxGeometry as="geometry"/>',
  );

  const malformedRootLayer = path.join(temp, "malformed-root-layer.drawio");
  writeFileSync(
    malformedRootLayer,
    `<mxfile host="app.diagrams.net">
  <diagram name="Regression">
    <mxGraphModel adaptiveColors="auto" dx="800" dy="600" grid="1" gridSize="10" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1"/>
        <mxCell id="node" value="Node" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;fontColor=#1f2937;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="120" height="60" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`,
    "utf8",
  );
  assertRun("malformed root layer", malformedRootLayer, 1, '<mxCell id="1"/> must set parent="0"');

  const missingVertexDimensions = path.join(temp, "missing-vertex-dimensions.drawio");
  writeFileSync(
    missingVertexDimensions,
    drawio(`        <mxCell id="node" value="Node" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;fontColor=#1f2937;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertRun("vertex dimensions", missingVertexDimensions, 1, "vertex has no usable mxGeometry");

  const inlineFontSize = path.join(temp, "inline-font-size.drawio");
  writeFileSync(
    inlineFontSize,
    drawio(`        <mxCell id="node" value="&lt;span style=&quot;font-size:8px&quot;&gt;Tiny&lt;/span&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;fontColor=#1f2937;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="160" height="60" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertRun("inline font-size", inlineFontSize, 0, "inline font-size 8px below 9");

  const orphanSemantics = path.join(temp, "orphan-semantics.drawio");
  writeFileSync(
    orphanSemantics,
    drawio(`        <mxCell id="card" value="API" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;fontColor=#1f2937;" vertex="1" parent="1">
          <mxGeometry x="20" y="40" width="180" height="100" as="geometry"/>
        </mxCell>
        <mxCell id="card-detail" value="Runtime details" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f5f5f5;fontColor=#1f2937;" vertex="1" parent="card">
          <mxGeometry x="20" y="50" width="140" height="30" as="geometry"/>
        </mxCell>
        <mxCell id="card-icon" value="" style="shape=image;image=${markerlessSvgUri};fillColor=none;strokeColor=none;" vertex="1" parent="card">
          <mxGeometry x="4" y="4" width="24" height="24" as="geometry"/>
        </mxCell>
        <mxCell id="nested-semantic" value="Nested service" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;fontColor=#1f2937;dataRole=component;" vertex="1" parent="card">
          <mxGeometry x="40" y="4" width="120" height="30" as="geometry"/>
        </mxCell>
        <mxCell id="peer" value="Worker" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;fontColor=#1f2937;" vertex="1" parent="1">
          <mxGeometry x="300" y="60" width="140" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="annotation" value="Optional note" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;fontColor=#1f2937;dataRole=annotation;" vertex="1" parent="1">
          <mxGeometry x="20" y="200" width="180" height="50" as="geometry"/>
        </mxCell>
        <mxCell id="true-orphan" value="Unconnected service" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;fontColor=#1f2937;dataRole=component;" vertex="1" parent="1">
          <mxGeometry x="300" y="200" width="180" height="50" as="geometry"/>
        </mxCell>
        <mxCell id="card-flow" value="" style="edgeStyle=orthogonalEdgeStyle;html=1;endArrow=block;" edge="1" parent="1" source="card" target="peer">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertRun(
    "orphan semantic classification",
    orphanSemantics,
    0,
    [
      "WARN  [nested-semantic] orphan vertex has no incoming or outgoing edge",
      "WARN  [true-orphan] orphan vertex has no incoming or outgoing edge",
    ],
    [],
    [
      "WARN  [card-detail] orphan vertex has no incoming or outgoing edge",
      "WARN  [card-icon] orphan vertex has no incoming or outgoing edge",
      "WARN  [annotation] orphan vertex has no incoming or outgoing edge",
    ],
  );

  const fixedFillAdaptiveFont = path.join(temp, "fixed-fill-adaptive-font.drawio");
  writeFileSync(
    fixedFillAdaptiveFont,
    drawio(`        <mxCell id="node" value="Mixed contrast" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;fontColor=light-dark(#111111,#eeeeee);" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="180" height="60" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertRun("fixed fill adaptive font", fixedFillAdaptiveFont, 1, "#eeeeee on #ffffff");
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log("Validated draw.io examples and validator regression fixtures.");
