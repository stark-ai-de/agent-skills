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

test("asset fetch pins globally routed DNS answers, verifies hostname TLS, rejects mixed answers and bypasses proxies", () => {
  const result = python(`
import http.client, socket, urllib.request
public = "93.184.216.34"
private = "192.168.1.8"
original_getaddrinfo = m.socket.getaddrinfo
initial_url = "https:" + "/" + "/public.example.com/icon.svg"
private_redirect = "https:" + "/" + "/private.example.com/icon.svg"
def answer(addresses):
 return [(socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", (value, 443)) for value in addresses]
m.socket.getaddrinfo = lambda host, port, type: answer([public])
assert m.resolve_public_addresses("public.example.com") == (public,)
try:
 m.socket.getaddrinfo = lambda host, port, type: answer([public, private])
 m.resolve_public_addresses("mixed.example")
except ValueError as error:
 assert "globally routable" in str(error)
else: raise AssertionError("mixed public/private DNS answers accepted")

class FakeSocket:
 def __init__(self): self.writes=[]
 def setsockopt(self, *args): pass
 def sendall(self, value): self.writes.append(value)
 def close(self): pass
class FakeContext:
 def __init__(self): self.server_name=None
 def wrap_socket(self, sock, server_hostname):
  self.server_name=server_hostname
  return sock
fake = FakeSocket()
connected=[]
m.socket.getaddrinfo = lambda host, port, type: answer([public])
m.socket.create_connection = lambda address, timeout, source: (connected.append((address, timeout, source)) or fake)
context=FakeContext()
connection=m.PinnedHTTPSConnection("public.example.com", timeout=15, context=context)
connection.connect()
assert connected == [((public, 443), 15, None)]
assert connection.host == "public.example.com"
assert context.server_name == "public.example.com"
connection.putrequest("GET", "/icon.svg")
connection.endheaders()
assert b"Host: public.example.com" in b"".join(fake.writes)
connection.close()

m.socket.getaddrinfo = lambda host, port, type: answer([private])
request=urllib.request.Request(initial_url)
try:
 m.PublicHttpsRedirectHandler().redirect_request(request, object(), 302, "Found", {}, private_redirect)
except ValueError as error:
 assert "globally routable" in str(error)
else: raise AssertionError("private DNS redirect accepted")
opener=m.build_public_opener()
assert not any(isinstance(handler, urllib.request.ProxyHandler) and handler.proxies for handler in opener.handlers)
m.socket.getaddrinfo = original_getaddrinfo
`);
  assert.equal(result, "");
});
