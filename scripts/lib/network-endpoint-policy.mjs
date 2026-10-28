const NETWORK_CALL_PATTERNS = [
  /\b(?:fetch|axios|got|request)\s*\(/,
  /\b(?:http|https)\.request\s*\(/,
  /\bnew\s+WebSocket\s*\(/,
  /\b(?:dns|net|tls)\.(?:connect|createConnection|lookup)\s*\(/,
  /\b(?:curl|wget)\s+/,
];
// The hook manager is Python and must stay offline, including aliased imports.
// These static checks complement review; they are not a runtime network sandbox.
const HOOK_PYTHON_NETWORK_PATTERNS = [
  /\b(?:urlopen|urlretrieve|HTTPConnection|HTTPSConnection|create_connection|socket)\s*\(/,
  /\b(?:requests|httpx|aiohttp|urllib3)\./,
  /^[ \t]*(?:from\s+(?:urllib|http|socket|requests|httpx|aiohttp|urllib3)\b|import\s+(?:[\w.]+\s*(?:as\s+\w+)?\s*,\s*)*(?:urllib|http|socket|requests|httpx|aiohttp|urllib3)\b)/m,
];
const DECLARED_ENDPOINT_PREFIXES = [
  "http://www.w3.org/",
  "https://www.w3.org/",
  "https://app.diagrams.net/",
  "https://mcp.draw.io/mcp",
];
const ENDPOINT_PATTERN = /https?:\/\/[^\s"'`<>()[\]{}]+/gi;

// Visual Reports declarations are file-scoped. Vendor URLs are inert ELK namespace
// identifiers and upstream font-import templates removed before report delivery.
// Test URLs are negative fixtures, never permitted destinations for a fetch.
const REPORT_ENDPOINTS = {
  "assets/vendor/generator.mjs": [
    "http://www.eclipse.org/elk/ElkGraph",
    "http:///org/eclipse/emf/ecore/util/ExtendedMetaData",
    "http://www.eclipse.org/emf/2002/Ecore",
    "http://www.eclipse.org/emf/2003/XMLType",
    "https://fonts.googleapis.com/css2?family=$",
    "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&amp;display=swap",
  ],
  "scripts/export-assets.mjs": ["https://github.com/stark-ai-de/agent-skills"],
  "scripts/lib/preview.mjs": ["http://localhost", "http://localhost:$"],
  "tests/render-report.test.mjs": [
    "https://example.invalid/a.png",
    "https://secret@example.invalid",
  ],
  "tests/v2.test.mjs": [
    "https://example.com",
    "https://example.org/mark.svg",
    "https://example.org/",
    "https://example.org/a",
  ],
};
const reportOwner = (relative) =>
  relative.match(/^(?:canonical|portable)\/visual-reports\/(.+)$/)?.[1];

function endpointIsDeclared(endpoint, relative) {
  const advisorEndpointOwner =
    /^(?:canonical|portable)\/jev-capability-advisor\/scripts\/(?:jev_advisor|https_transport|jev_hooks)\.py$/.test(
      relative,
    );
  const karakeepLoopbackOwner =
    /^(?:canonical|portable)\/karakeep-knowledge\/scripts\/(?:prepare|status)\.py$/.test(relative);
  // Only fixed loopback defaults are declared; runtime.py validates selected origins.
  // This grants no remote endpoint or exception for other skill scripts.
  // The advisor owns one provider endpoint; the offline hook manager names it only
  // in its processing disclosure. Network-call exceptions remain transport-only.
  return (
    DECLARED_ENDPOINT_PREFIXES.some((prefix) => endpoint.startsWith(prefix)) ||
    (REPORT_ENDPOINTS[reportOwner(relative)] ?? []).includes(endpoint) ||
    (advisorEndpointOwner && endpoint === "https://api.typesafe.ai/v1/systemone") ||
    (karakeepLoopbackOwner && ["http://localhost", "http://localhost:3000"].includes(endpoint))
  );
}

export function scanNetworkSource(text, relative) {
  const errors = [];
  const sessionTransport =
    /^(?:canonical|portable)\/jev-capability-advisor\/scripts\/https_transport\.py$/.test(relative);
  const fixedTarget =
    /^HOST = ['"]api\.typesafe\.ai['"]$/m.test(text) &&
    /^PORT = 443$/m.test(text) &&
    /^API_PATH = ['"]\/v1\/systemone['"]$/m.test(text);
  // Permit only the reviewed POST call shape in this provider-owned module.
  // All other call patterns and endpoint strings are still scanned below.
  let apiText =
    sessionTransport && fixedTarget
      ? text.replace(
          /\bconnection\.request\(\s*(['"])POST\1,\s*API_PATH,\s*body=body,\s*headers=\{/g,
          "reviewed_provider_call({",
        )
      : text;
  const karakeepTransport =
    /^(?:canonical|portable)\/karakeep-knowledge\/scripts\/knowledge\/karakeep\.mjs$/.test(
      relative,
    );
  const loopbackGuards = [
    '["http:", "https:"].includes(u.protocol)',
    '["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)',
    "!u.username",
    "!u.password",
    'u.pathname === "/"',
    "!u.search",
    "!u.hash",
    "this.address = origin(auth.address)",
    'route.startsWith("/api/v1/") && !route.includes("..")',
  ].every((guard) => text.includes(guard));
  // This exact module owns the reviewed, policy-bound loopback REST client.
  // Mask only its wrapper and single fetch shape; additional calls still fail.
  // Proxy handling belongs to the host; environment flags are not origin guards.
  // Guard-drift fixtures complement runtime origin/credential tests, not a sandbox.
  if (karakeepTransport && loopbackGuards) {
    apiText = apiText
      .replace(
        /\basync request\(route, \{ method = "GET", body \} = \{\}\)/,
        'async reviewedRequest(route, { method = "GET", body } = {})',
      )
      .replace(/\bthis\.request\(/g, "this.reviewedRequest(")
      .replace(
        /\bfetch\(this\.address \+ route, \{\s*method,\s*redirect: "manual",/,
        'reviewedLoopbackCall(this.address + route, { method, redirect: "manual",',
      );
  }
  const reportFile = reportOwner(relative);
  if (reportFile === "assets/preview.js") {
    // One same-origin metadata read. Additional calls remain undeclared.
    apiText = apiText.replace(
      /\bfetch\("\/current", \{\s*cache: "no-store"\s*\}\)/,
      "reviewedPreviewMetadata()",
    );
  }
  if (
    reportFile === "scripts/lib/preview.mjs" &&
    !text.includes('server.listen(port, "127.0.0.1", resolve)')
  )
    errors.push(`${relative}: preview must bind loopback`);
  if (reportFile === "tests/browser-delivery.mjs") {
    const normalized = text.replace(/\s+/g, " ");
    if (
      normalized.includes('endpoint.protocol === "ws:"') &&
      normalized.includes('["127.0.0.1", "localhost"].includes(endpoint.hostname)')
    ) {
      apiText = apiText.replace(/\bnew WebSocket\(endpoint\)/, "reviewedLoopbackCdp(endpoint)");
    }
  }
  if (reportFile === "tests/v2.test.mjs") {
    apiText = apiText.replace(
      /\bfetch\(preview\.url(?=[\s,)])/g,
      "reviewedFixtureRead(preview.url",
    );
  }
  const hookManager =
    /^(?:canonical|portable)\/jev-capability-advisor\/scripts\/jev_hooks\.py$/.test(relative);
  const patterns = hookManager
    ? [...NETWORK_CALL_PATTERNS, ...HOOK_PYTHON_NETWORK_PATTERNS]
    : NETWORK_CALL_PATTERNS;
  for (const pattern of patterns) {
    if (pattern.test(apiText))
      errors.push(`${relative} contains an undeclared network API: ${pattern}`);
    pattern.lastIndex = 0;
  }
  for (const match of text.matchAll(ENDPOINT_PATTERN)) {
    const endpoint = match[0].replace(/[),.;:]+$/, "");
    if (!endpointIsDeclared(endpoint, relative))
      errors.push(`${relative} contains an undeclared network endpoint: ${endpoint}`);
  }
  return errors;
}
