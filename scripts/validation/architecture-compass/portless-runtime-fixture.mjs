/** Disposable Node HTTP/WS service used only by the isolated Guide qualifier. */
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

assert.ok(
  process.send && process.env.PORTLESS_GUIDE_TEMPORARY && process.env.PORTLESS_GUIDE_PARENT_NETNS,
  "Fixture requires the isolated qualifier parent",
);
assert.notEqual(
  fs.readlinkSync("/proc/self/ns/net"),
  process.env.PORTLESS_GUIDE_PARENT_NETNS,
  "Refusing fixture listeners in the caller's network namespace",
);
const kind = process.argv[2];
const configuration =
  kind === "frontend"
    ? (await import(pathToFileURL(process.argv[3]))).default.server.proxy["/api"]
    : null;
let rewrite = configuration?.changeOrigin;
const lookup = (_host, options, callback) =>
  options.all
    ? callback(null, [{ address: "127.0.0.1", family: 4 }])
    : callback(null, "127.0.0.1", 4);
const sockets = new Set();
const headers = (request) => {
  const result = { ...request.headers };
  if (rewrite) result.host = new URL(configuration.target).host;
  return result;
};
const server = http.createServer((request, response) => {
  if (configuration) {
    const upstream = https.request(
      new URL(request.url, configuration.target),
      {
        method: request.method,
        headers: headers(request),
        lookup,
      },
      (incoming) => {
        response.writeHead(incoming.statusCode, incoming.headers);
        incoming.pipe(response);
      },
    );
    upstream.on("error", (error) => {
      response.writeHead(502);
      response.end(error.code || "forwarding failed");
    });
    request.pipe(upstream);
  } else {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ service: kind, host: request.headers.host }));
  }
});
server.on("connection", (socket) => {
  sockets.add(socket);
  socket.once("close", () => sockets.delete(socket));
});
server.on("upgrade", (request, socket, head) => {
  if (configuration) {
    if (!configuration.ws) {
      socket.destroy();
      return;
    }
    const upstream = https.request(new URL(request.url, configuration.target), {
      headers: headers(request),
      lookup,
    });
    upstream.on("upgrade", (incoming, remote, upstreamHead) => {
      sockets.add(remote);
      remote.once("close", () => sockets.delete(remote));
      const fields = Object.entries(incoming.headers).map(([key, value]) => key + ": " + value);
      socket.write("HTTP/1.1 101 Switching Protocols\r\n" + fields.join("\r\n") + "\r\n\r\n");
      if (upstreamHead.length) socket.write(upstreamHead);
      if (head.length) remote.write(head);
      remote.pipe(socket).pipe(remote);
      remote.on("error", () => socket.destroy());
      socket.on("error", () => remote.destroy());
    });
    upstream.on("response", (incoming) => {
      socket.end(
        "HTTP/1.1 " + incoming.statusCode + " Forwarding failed\r\nConnection: close\r\n\r\n",
      );
      incoming.resume();
    });
    upstream.on("error", () => socket.destroy());
    upstream.end();
    return;
  }
  const accept = createHash("sha1")
    .update(request.headers["sec-websocket-key"] + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
    .digest("base64");
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " +
      accept +
      "\r\n\r\n",
  );
  let buffer = head;
  const receive = (part) => {
    buffer = Buffer.concat([buffer, part]);
    if (buffer.length < 6) return;
    const length = buffer[1] & 127;
    if (buffer[0] !== 129 || !(buffer[1] & 128) || length >= 126) {
      socket.destroy();
      return;
    }
    if (buffer.length < 6 + length) return;
    const payload = Buffer.from(buffer.subarray(6, 6 + length));
    for (let index = 0; index < length; index++) payload[index] ^= buffer[2 + (index % 4)];
    const reply = Buffer.from(kind + ":" + payload.toString());
    socket.write(Buffer.concat([Buffer.from([129, reply.length]), reply]));
    buffer = buffer.subarray(6 + length);
  };
  socket.on("data", receive);
  socket.on("error", () => {});
});
process.on("message", (message) => {
  if (typeof message.changeOrigin === "boolean") {
    rewrite = message.changeOrigin;
    process.send({ changed: rewrite });
  }
});
const close = () => {
  for (const socket of sockets) socket.destroy();
  server.close(() => process.exit(0));
};
process.on("SIGTERM", close);
process.on("SIGINT", close);
server.listen(0, "127.0.0.1", () => process.send({ port: server.address().port }));
