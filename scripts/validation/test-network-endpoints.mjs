import assert from "node:assert/strict";
import fs from "node:fs";
import { scanNetworkSource } from "../lib/network-endpoint-policy.mjs";

const source = fs.readFileSync(
  new URL(
    "../../skills/skill-maintenance/jev-capability-advisor/scripts/https_transport.py",
    import.meta.url,
  ),
  "utf8",
);
const canonical = "canonical/jev-capability-advisor/scripts/https_transport.py";
for (const label of [canonical, canonical.replace("canonical/", "portable/")]) {
  assert.deepEqual(scanNetworkSource(source, label), []);
  for (const unsafe of [
    source.replace("api.typesafe.ai/v1/systemone", "unexpected.example/v1/systemone"),
    source.replace("HOST = 'api.typesafe.ai'", "HOST = 'unexpected.example'"),
    source.replace("PORT = 443", "PORT = 80"),
    source.replace("API_PATH = '/v1/systemone'", "API_PATH = '/different'"),
    source.replace("connection.request('POST'", "connection.request('GET'"),
    source + "\nfetch('https://api.typesafe.ai/v1/systemone')",
    source + "\nconnection.request('POST', other_path)",
  ])
    assert.ok(scanNetworkSource(unsafe, label).length > 0, "unexpected network call must fail");
}
for (const label of [
  canonical.replace("jev-capability-advisor", "another-skill"),
  canonical.replace("https_transport.py", "another.py"),
  "external/jev-capability-advisor/scripts/https_transport.py",
])
  assert.ok(
    scanNetworkSource(source, label).length > 0,
    "provider exception must not escape its exact module",
  );
assert.deepEqual(scanNetworkSource("fetching = False", "canonical/offline/scripts/local.py"), []);
console.log(
  "Network policy: fixed Jev endpoint/call, projection parity and 17 rejection cases passed.",
);

// The manager discloses the provider destination but remains offline.
const hookSource = fs.readFileSync(
  new URL(
    "../../skills/skill-maintenance/jev-capability-advisor/scripts/jev_hooks.py",
    import.meta.url,
  ),
  "utf8",
);
for (const prefix of ["canonical", "portable"]) {
  const label = `${prefix}/jev-capability-advisor/scripts/jev_hooks.py`;
  assert.deepEqual(scanNetworkSource(hookSource, label), []);
  for (const unsafe of [
    hookSource.replaceAll(
      "https://api.typesafe.ai/v1/systemone",
      "https://unexpected.example/advice",
    ),
    hookSource + "\nfetch('https://api.typesafe.ai/v1/systemone')",
    hookSource + "\nhttps.request('https://api.typesafe.ai/v1/systemone')",
    hookSource + "\nurllib.request.urlopen('https://api.typesafe.ai/v1/systemone')",
    hookSource + "\nfrom urllib.request import urlopen as open_remote\nopen_remote(destination)",
    hookSource + "\nimport os, requests as client\nclient.post(destination)",
    hookSource + "\nfrom http.client import HTTPSConnection as Connection\nConnection(host)",
    hookSource + "\nsocket.create_connection((host, 443))",
  ])
    assert.ok(
      scanNetworkSource(unsafe, label).length > 0,
      "disclosure must not authorize hook networking",
    );
  assert.ok(scanNetworkSource(hookSource, label.replace("jev_hooks.py", "another.py")).length > 0);
}
console.log("Hook processing disclosure is declared; hook network calls remain rejected.");
