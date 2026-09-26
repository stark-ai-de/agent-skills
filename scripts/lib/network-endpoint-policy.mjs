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

function endpointIsDeclared(endpoint, relative) {
  const advisorEndpointOwner =
    /^(?:canonical|portable)\/jev-capability-advisor\/scripts\/(?:jev_advisor|https_transport|jev_hooks)\.py$/.test(
      relative,
    );
  // The advisor owns one provider endpoint; the offline hook manager names it only
  // in its processing disclosure. Network-call exceptions remain transport-only.
  return (
    DECLARED_ENDPOINT_PREFIXES.some((prefix) => endpoint.startsWith(prefix)) ||
    (advisorEndpointOwner && endpoint === "https://api.typesafe.ai/v1/systemone")
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
  const apiText =
    sessionTransport && fixedTarget
      ? text.replace(
          /\bconnection\.request\(\s*(['"])POST\1,\s*API_PATH,\s*body=body,\s*headers=\{/g,
          "reviewed_provider_call({",
        )
      : text;
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
