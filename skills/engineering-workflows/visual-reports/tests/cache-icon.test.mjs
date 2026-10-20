// SPDX-License-Identifier: Apache-2.0
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../scripts/cache_icon.py", import.meta.url));
const check = `import importlib.util\nspec=importlib.util.spec_from_file_location("cache_icon", ${JSON.stringify(script)})\nm=importlib.util.module_from_spec(spec)\nspec.loader.exec_module(m)\n`;
const python = (body) =>
  execFileSync("python3", ["-B", "-c", check + body], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
const url = (scheme, authority, resource = "/a") =>
  `${scheme}:${"/".repeat(2)}${authority}${resource}`;

test("SVG cache accepts static local fragments and rejects active XML, namespace and escaped CSS", () => {
  const external = url("https", "example.com", "/x");
  python(
    `m.validate_svg(b'<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"/></defs><rect fill="url(#g)"/></svg>')`,
  );
  for (const payload of [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:x="urn:svg"><x:script/></svg>`,
    `<svg xmlns="http://www.w3.org/2000/svg"><rect style="fill:u\\\\72l(${external})"/></svg>`,
    `<!DOCTYPE svg [<!ENTITY x "y">]><svg/>`,
    `<svg><foreignObject/></svg>`,
    `<svg><rect fill="url(${external})"/></svg>`,
  ]) {
    assert.throws(() =>
      python(
        `m.validate_svg(${JSON.stringify(Buffer.from(payload).toString("base64"))} and __import__('base64').b64decode(${JSON.stringify(Buffer.from(payload).toString("base64"))}))`,
      ),
    );
  }
});

test("public asset identities and redirects reject credentials before use without echoing them", () => {
  const urls = [
    url("https", "user:secret@example.com"),
    url("http", "example.com"),
    url("https", "printer"),
    url("https", "host.invalid"),
  ];
  const initial = url("https", "example.com");
  const redirect = url("https", "user:secret@example.com", "/b");
  const result = python(`
import urllib.request
for url in ${JSON.stringify(urls)}:
 try: m.validate_public_https_url(url, "Asset URL")
 except ValueError as e:
  assert "secret" not in str(e)
 else: raise AssertionError("unsafe URL accepted")
request=urllib.request.Request(${JSON.stringify(initial)})
try: m.PublicHttpsRedirectHandler().redirect_request(request, object(), 302, "Found", {}, ${JSON.stringify(redirect)})
except ValueError as e: assert "secret" not in str(e)
else: raise AssertionError("credential redirect accepted")
`);
  assert.equal(result, "");
});
