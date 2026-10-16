/**
 * Explicit Linux/Node/Portless fixture qualification, never host provisioning.
 * Writes only temporary files and starts owned processes in an isolated netns.
 */
import assert from "node:assert/strict";
import { execFileSync, fork, spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const script = fileURLToPath(import.meta.url);
const fixture = fileURLToPath(new URL("./portless-runtime-fixture.mjs", import.meta.url));
const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(
    "qualify:portless-guide [--portless-bin EXISTING_EXECUTABLE]\nRequires Linux user/network namespaces, ip, Node 24.18+, openssl and existing Portless 0.15.8. No installation or host trust changes.",
  );
  process.exit(0);
}
let executable = "portless";
let parentNamespace = null;
for (let index = 0; index < args.length; index++) {
  if (args[index] === "--portless-bin" && args[index + 1]) executable = args[++index];
  else if (args[index] === "--parent-netns" && args[index + 1]) parentNamespace = args[++index];
  else throw new Error("Unknown or incomplete qualifier argument: " + args[index]);
}
assert.equal(process.platform, "linux", "This explicit qualifier requires Linux namespaces");
function resolveCommandPath(name) {
  const candidates = name.includes(path.sep)
    ? [path.resolve(name)]
    : (process.env.PATH || "").split(path.delimiter).map((directory) => path.join(directory, name));
  for (const candidate of candidates) {
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      if (fs.statSync(candidate).isFile()) return fs.realpathSync(candidate);
    } catch {
      /* Try the next existing executable; never install. */
    }
  }
  throw new Error("Required existing executable unavailable: " + name);
}
const binary = resolveCommandPath(executable);
assert.equal(
  execFileSync(binary, ["--version"], { encoding: "utf8", timeout: 10000 }).trim(),
  "0.15.8",
  "This version-qualified fixture requires Portless 0.15.8",
);
const node = resolveCommandPath("node");
const nodeVersion = execFileSync(node, ["--version"], { encoding: "utf8" }).trim();
const [major, minor] = nodeVersion.slice(1).split(".").map(Number);
assert.ok(major > 24 || (major === 24 && minor >= 18), "Requires existing Node 24.18+");
resolveCommandPath("openssl");
const ip = resolveCommandPath("ip");
if (!parentNamespace) {
  const unshare = resolveCommandPath("unshare");
  const namespace = fs.readlinkSync("/proc/self/ns/net");
  const ownedTemporary = fs.mkdtempSync(path.join(os.tmpdir(), "portless-guide-runtime-"));
  const child = spawn(
    unshare,
    [
      "--user",
      "--map-root-user",
      "--net",
      "--pid",
      "--fork",
      "--kill-child=SIGKILL",
      node,
      script,
      "--portless-bin",
      binary,
      "--parent-netns",
      namespace,
    ],
    {
      cwd: root,
      detached: true,
      stdio: "inherit",
      env: { ...process.env, PORTLESS_GUIDE_TEMPORARY: ownedTemporary },
    },
  );
  let timedOut = false;
  let escalation;
  const terminate = () => {
    if (!child.pid) return;
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
    escalation ??= setTimeout(() => {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch (error) {
        if (error.code !== "ESRCH") throw error;
      }
    }, 3000);
  };
  const timeout = setTimeout(() => {
    timedOut = true;
    terminate();
  }, 90000);
  process.on("SIGINT", terminate);
  process.on("SIGTERM", terminate);
  try {
    const code = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (status) => resolve(status));
    });
    assert.ok(!timedOut, "Isolated runtime qualification timed out");
    assert.equal(code, 0, "Isolated runtime qualification failed");
  } finally {
    clearTimeout(timeout);
    clearTimeout(escalation);
    process.removeListener("SIGINT", terminate);
    process.removeListener("SIGTERM", terminate);
    fs.rmSync(ownedTemporary, { recursive: true, force: true });
  }
} else {
  assert.notEqual(
    fs.readlinkSync("/proc/self/ns/net"),
    parentNamespace,
    "Refusing fixture listeners in the caller's network namespace",
  );
  const temporary = process.env.PORTLESS_GUIDE_TEMPORARY;
  assert.ok(temporary, "The parent must supply its owned temporary fixture directory");
  assert.match(
    fs.readFileSync("/proc/self/uid_map", "utf8"),
    /^\s*0\s+\d+\s+1\s*$/,
    "The fixture requires the single-user mapping created by --map-root-user",
  );
  execFileSync(ip, ["link", "set", "lo", "up"]);
  const children = [];
  const ownedSockets = new Set();
  const diagnostics = new Map();
  const environment = {
    ...process.env,
    PORTLESS_GUIDE_PARENT_NETNS: parentNamespace,
    PORTLESS_STATE_DIR: temporary,
    PORTLESS_HTTPS: "1",
    PORTLESS_TLD: "localhost",
    PORTLESS_LAN: "0",
    PORTLESS_WILDCARD: "0",
    PORTLESS_SYNC_HOSTS: "0",
    PORTLESS_TAILSCALE: "0",
    PORTLESS_FUNNEL: "0",
    PORTLESS_NGROK: "0",
    CI: "1",
  };
  function track(child) {
    children.push(child);
    diagnostics.set(child, "");
    for (const stream of [child.stdout, child.stderr])
      stream?.on("data", (chunk) =>
        diagnostics.set(child, (diagnostics.get(child) + chunk).slice(-4096)),
      );
    return child;
  }
  const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
  async function stop(child) {
    if (child.exitCode !== null || child.signalCode !== null) return;
    child.kill("SIGTERM");
    for (let attempt = 0; attempt < 30; attempt++) {
      if (child.exitCode !== null || child.signalCode !== null) return;
      await delay(100);
    }
    const exited = new Promise((resolve) => child.once("close", resolve));
    child.kill("SIGKILL");
    await exited;
  }
  function message(child, predicate) {
    return new Promise((resolve, reject) => {
      const finish = (error, value) => {
        clearTimeout(timeout);
        child.removeListener("message", receive);
        child.removeListener("error", failed);
        child.removeListener("exit", exited);
        if (error) reject(error);
        else resolve(value);
      };
      const receive = (value) => {
        if (predicate(value)) finish(null, value);
      };
      const failed = (error) => finish(error);
      const exited = () => finish(new Error("Fixture exited: " + diagnostics.get(child)));
      const timeout = setTimeout(() => finish(new Error("Fixture IPC timeout")), 10000);
      child.on("message", receive);
      child.once("error", failed);
      child.once("exit", exited);
    });
  }
  const lookup = (_host, options, callback) =>
    options.all
      ? callback(null, [{ address: "127.0.0.1", family: 4 }])
      : callback(null, "127.0.0.1", 4);
  const caPath = path.join(temporary, "ca.pem");
  function request(url, trusted = true) {
    return new Promise((resolve, reject) => {
      const request = https.get(
        url,
        {
          ca: trusted ? fs.readFileSync(caPath) : [],
          lookup,
          agent: false,
          timeout: 5000,
        },
        (response) => {
          let body = "";
          response.setEncoding("utf8");
          response.on("data", (chunk) => {
            body += chunk;
          });
          response.on("end", () => resolve({ status: response.statusCode, body }));
          response.on("error", reject);
        },
      );
      request.on("timeout", () => request.destroy(new Error("HTTPS probe timeout")));
      request.on("error", reject);
    });
  }
  async function expectResponse(url, status, serviceName) {
    let observed;
    for (let attempt = 0; attempt < 50; attempt++) {
      observed = await request(url);
      if (observed.status === status) {
        if (!serviceName) return observed;
        try {
          if (JSON.parse(observed.body).service === serviceName) return observed;
        } catch {
          /* Wait for the owned route registry watcher to catch up. */
        }
      }
      await delay(100);
    }
    throw new Error(
      "Expected HTTP " +
        status +
        " / " +
        (serviceName || "route status") +
        "; observed HTTP " +
        observed?.status,
    );
  }
  function command(...arguments_) {
    return execFileSync(binary, arguments_, {
      env: environment,
      encoding: "utf8",
      timeout: 10000,
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  }
  async function service(kind, config) {
    const child = track(
      fork(fixture, config ? [kind, config] : [kind], {
        execPath: node,
        env: { ...environment, NODE_EXTRA_CA_CERTS: caPath, DEV_API_NAME: "api.fixture" },
        stdio: ["ignore", "pipe", "pipe", "ipc"],
      }),
    );
    const ready = await message(child, (value) => Number.isInteger(value.port));
    return { child, port: ready.port };
  }
  async function websocket(url) {
    const key = randomBytes(16).toString("base64");
    const payload = Buffer.from("guide-echo");
    return new Promise((resolve, reject) => {
      let socket;
      const timeout = setTimeout(() => {
        socket?.destroy();
        reject(new Error("WebSocket timeout"));
      }, 5000);
      const finish = (error, value) => {
        clearTimeout(timeout);
        socket?.destroy();
        if (error) reject(error);
        else resolve(value);
      };
      const client = https.request(url, {
        ca: fs.readFileSync(caPath),
        lookup,
        agent: false,
        headers: {
          Connection: "Upgrade",
          Upgrade: "websocket",
          "Sec-WebSocket-Version": "13",
          "Sec-WebSocket-Key": key,
        },
      });
      client.on("error", (error) => finish(error));
      client.on("response", (response) => {
        response.resume();
        finish(new Error("WebSocket upgrade rejected"));
      });
      client.on("upgrade", (response, connection, head) => {
        socket = connection;
        ownedSockets.add(socket);
        socket.once("close", () => ownedSockets.delete(socket));
        try {
          assert.equal(response.statusCode, 101);
          assert.equal(
            response.headers["sec-websocket-accept"],
            createHash("sha1")
              .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
              .digest("base64"),
          );
        } catch (error) {
          finish(error);
          return;
        }
        let buffer = head;
        socket.on("data", (chunk) => {
          buffer = Buffer.concat([buffer, chunk]);
          if (buffer.length >= 2 && buffer.length >= 2 + (buffer[1] & 127)) {
            if (buffer[0] !== 129 || buffer[1] & 128)
              finish(new Error("Unexpected fixture WS frame"));
            else finish(null, buffer.subarray(2, 2 + (buffer[1] & 127)).toString());
          }
        });
        socket.on("error", (error) => finish(error));
        const mask = randomBytes(4);
        const encoded = Buffer.from(payload);
        for (let index = 0; index < encoded.length; index++) encoded[index] ^= mask[index % 4];
        socket.write(Buffer.concat([Buffer.from([129, 128 | encoded.length]), mask, encoded]));
      });
      client.end();
    });
  }
  try {
    const reserve = net.createServer();
    await new Promise((resolve, reject) => {
      reserve.once("error", reject);
      reserve.listen(0, "127.0.0.1", resolve);
    });
    const port = reserve.address().port;
    await new Promise((resolve) => reserve.close(resolve));
    environment.PORTLESS_PORT = String(port);
    const binDirectory = path.join(temporary, "bin");
    fs.mkdirSync(binDirectory);
    fs.symlinkSync(binary, path.join(binDirectory, "portless"));
    environment.PATH = binDirectory + path.delimiter + process.env.PATH;
    const proxy = track(
      spawn(
        binary,
        [
          "proxy",
          "start",
          "--foreground",
          "--https",
          "--port",
          String(port),
          "--tld",
          "localhost",
          "--skip-trust",
        ],
        {
          env: environment,
          stdio: ["ignore", "pipe", "pipe"],
        },
      ),
    );
    const probe = "https://api.fixture.localhost:" + port;
    let ready = false;
    for (let attempt = 0; attempt < 150; attempt++) {
      if (proxy.exitCode !== null || proxy.signalCode !== null)
        throw new Error("Isolated proxy exited: " + diagnostics.get(proxy));
      if (fs.existsSync(caPath)) {
        try {
          await request(probe);
          ready = true;
          break;
        } catch {
          /* Await owned proxy readiness. */
        }
      }
      await delay(100);
    }
    assert.ok(ready, "Owned HTTPS proxy did not become ready");
    const api = await service("api");
    const sibling = await service("sibling");
    command("alias", "api.fixture", String(api.port));
    command("alias", "sibling.fixture", String(sibling.port));
    const apiUrl = command("get", "api.fixture", "--no-worktree");
    const siblingUrl = command("get", "sibling.fixture", "--no-worktree");
    await expectResponse(apiUrl, 200, "api");
    await assert.rejects(
      request(apiUrl, false),
      /certificate|issuer|self.signed/i,
      "An untrusted fixture CA must not be silently accepted",
    );
    const guide = fs.readFileSync(
      path.join(
        root,
        "skills/engineering-workflows/architecture-compass/references/ac-adr-066-use-portless-for-local-development-endpoints.guide.md",
      ),
      "utf8",
    );
    const section = guide.split("## Forward between services without a proxy loop\n")[1];
    const fence = String.fromCharCode(96).repeat(3);
    const code = new RegExp(fence + "js\\r?\\n([\\s\\S]*?)\\r?\\n" + fence).exec(section)?.[1];
    assert.ok(code, "The canonical two-service example must exist");
    const config = path.join(temporary, "vite.config.mjs");
    fs.writeFileSync(config, code);
    const frontend = await service("frontend", config);
    command("alias", "frontend.fixture", String(frontend.port));
    const frontendUrl = command("get", "frontend.fixture", "--no-worktree") + "/api/identity";
    await expectResponse(frontendUrl, 200, "api");
    assert.equal(await websocket(frontendUrl), "api:guide-echo");
    let changed = message(frontend.child, (value) => value.changed === false);
    frontend.child.send({ changeOrigin: false });
    await changed;
    await expectResponse(frontendUrl, 508);
    changed = message(frontend.child, (value) => value.changed === true);
    frontend.child.send({ changeOrigin: true });
    await changed;
    await expectResponse(frontendUrl, 200, "api");
    // Observe the documented upstream alias limitation only in owned disposable state.
    command("alias", "collision.fixture", String(api.port));
    command("alias", "collision.fixture", String(sibling.port));
    const collisionUrl = command("get", "collision.fixture", "--no-worktree");
    await expectResponse(collisionUrl, 200, "sibling");
    command("alias", "--remove", "collision.fixture");
    command("alias", "--remove", "api.fixture");
    await expectResponse(apiUrl, 404);
    await expectResponse(siblingUrl, 200, "sibling");
    const direct = await new Promise((resolve, reject) => {
      http
        .get("http://127.0.0.1:" + api.port, (response) => {
          response.resume();
          response.on("end", () => resolve(response.statusCode));
        })
        .on("error", reject);
    });
    assert.equal(direct, 200, "Alias removal must preserve the independently owned backend");
    command("alias", "api.fixture", String(api.port));
    await expectResponse(frontendUrl, 200, "api");
    console.log(
      JSON.stringify({
        stage: "isolated-linux-node-portless-fixture",
        portless: "0.15.8",
        node: nodeVersion,
        checks: [
          "guide-config-executed",
          "verified-https",
          "untrusted-ca-rejected",
          "two-service-http",
          "websocket-echo",
          "negative-508-control",
          "static-alias-overwrite-limit-observed",
          "scoped-alias-removal",
          "backend-sibling-proxy-survive",
        ],
        targetQualification: "not-claimed",
      }),
    );
  } finally {
    for (const socket of ownedSockets) socket.destroy();
    for (const child of children.reverse()) await stop(child);
  }
}
