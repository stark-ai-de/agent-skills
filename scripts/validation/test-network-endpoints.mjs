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

for (const prefix of ["canonical", "portable"]) {
  for (const name of ["prepare", "status"]) {
    const label = `${prefix}/karakeep-knowledge/scripts/${name}.py`;
    for (const endpoint of ["http://localhost", "http://localhost:3000"]) {
      assert.deepEqual(scanNetworkSource(`URL = "${endpoint}"`, label), []);
    }
    for (const endpoint of [
      "http://localhost.example.org",
      "https://unexpected.example",
      "http://localhost:3001",
    ]) {
      assert.ok(scanNetworkSource(`URL = "${endpoint}"`, label).length > 0);
    }
    assert.ok(
      scanNetworkSource(
        'URL = "http://localhost:3000"',
        label.replace("status.py", "other.py").replace("prepare.py", "other.py"),
      ).length > 0,
    );
    assert.ok(
      scanNetworkSource(
        'URL = "http://localhost:3000"',
        label.replace("karakeep-knowledge", "other-skill"),
      ).length > 0,
    );
  }
}
console.log("Karakeep fixed loopback defaults stay scoped to their owning helpers.");

const knowledgeTransport = fs.readFileSync(
  new URL(
    "../../skills/engineering-workflows/karakeep-knowledge/scripts/knowledge/karakeep.mjs",
    import.meta.url,
  ),
  "utf8",
);
for (const prefix of ["canonical", "portable"]) {
  const label = `${prefix}/karakeep-knowledge/scripts/knowledge/karakeep.mjs`;
  assert.deepEqual(scanNetworkSource(knowledgeTransport, label), []);
  for (const unsafe of [
    knowledgeTransport.replace('["localhost", "127.0.0.1", "[::1]"]', '["unexpected.example"]'),
    knowledgeTransport.replace('redirect: "manual"', 'redirect: "follow"'),
    knowledgeTransport.replace('!route.includes("..")', "true"),
    knowledgeTransport.replace("!u.username", "true"),
    knowledgeTransport.replace("!u.password", "true"),
    knowledgeTransport.replace(
      "this.address = origin(auth.address)",
      "this.address = auth.address",
    ),
    knowledgeTransport.replace('route.startsWith("/api/v1/")', 'route.startsWith("/")'),
    knowledgeTransport + "\nfetch(destination)",
    knowledgeTransport + "\nrequest(destination)",
    knowledgeTransport + "\nhttps.request(destination)",
    knowledgeTransport + '\nconst endpoint = "https://unexpected.example";',
  ]) {
    assert.ok(
      scanNetworkSource(unsafe, label).length > 0,
      "loopback guard drift and extra calls must fail",
    );
  }
  for (const other of [
    label.replace("karakeep-knowledge", "other-skill"),
    label.replace("/karakeep.mjs", "/other.mjs"),
    label.replace(`${prefix}/`, "external/"),
  ]) {
    assert.ok(
      scanNetworkSource(knowledgeTransport, other).length > 0,
      "REST exception must stay in its exact transport module",
    );
  }
}
console.log("Karakeep loopback REST declaration and rejection fixtures passed.");

for (const prefix of ["canonical", "portable"]) {
  for (const relative of [
    "assets/preview.js",
    "scripts/lib/preview.mjs",
    "tests/browser-delivery.mjs",
    "tests/v2.test.mjs",
    "assets/vendor/generator.mjs",
  ]) {
    const text = fs.readFileSync(
      new URL(`../../skills/engineering-workflows/visual-reports/${relative}`, import.meta.url),
      "utf8",
    );
    const label = `${prefix}/visual-reports/${relative}`;
    assert.deepEqual(scanNetworkSource(text, label), [], label);
    for (const extra of [
      '\nfetch("https://unexpected.example")',
      '\nnew WebSocket("ws://unexpected.example")',
    ])
      assert.ok(scanNetworkSource(text + extra, label).length, "extra network calls must fail");
    assert.ok(
      scanNetworkSource(text, label.replace("visual-reports", "other-skill")).length,
      "declaration must stay with its owner",
    );
    if (relative === "assets/preview.js")
      assert.ok(
        scanNetworkSource(text.replace('fetch("/current"', 'fetch("/outside"'), label).length,
      );
    if (relative === "scripts/lib/preview.mjs")
      assert.ok(
        scanNetworkSource(
          text.replace(
            'server.listen(port, "127.0.0.1", resolve)',
            'server.listen(port, "0.0.0.0", resolve)',
          ),
          label,
        ).length,
      );
    if (relative === "tests/browser-delivery.mjs")
      assert.ok(
        scanNetworkSource(
          text.replace('["127.0.0.1", "localhost"]', '["unexpected.example"]'),
          label,
        ).length,
      );
  }
}
console.log(
  "Visual Reports same-origin preview, loopback CDP, inert vendor URLs and negative fixtures stay scoped to exact owners.",
);
