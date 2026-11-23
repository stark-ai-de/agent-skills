import { createServer } from "node:http";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.mjs";
import { createApplication } from "./http.mjs";

export function createNodeServer({ config, application }) {
  const publicHost = new URL(config.publicOrigin).host;
  const server = createServer(
    { maxHeaderSize: 16384, requestTimeout: 15000, headersTimeout: 10000 },
    async (request, response) => {
      const rawPath = request.url || "/";
      const host = request.headers.host || "";
      const localHealth =
        rawPath === "/health" && /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
      if (
        !rawPath.startsWith("/") ||
        rawPath.startsWith("//") ||
        rawPath.includes("\\") ||
        (host !== publicHost && !localHealth)
      ) {
        response.writeHead(400, {
          "content-type": "text/plain",
          "cache-control": "no-store",
          connection: "close",
        });
        response.end("Invalid request host or path.");
        return;
      }
      const controller = new AbortController();
      request.on("aborted", () => controller.abort());
      response.on("close", () => {
        if (!response.writableFinished) controller.abort();
      });
      const headers = new Headers();
      for (const [key, value] of Object.entries(request.headers))
        if (
          value !== undefined &&
          ![
            "x-ads-client-address",
            "forwarded",
            "x-forwarded-for",
            "x-forwarded-host",
            "x-forwarded-proto",
          ].includes(key)
        )
          headers.set(key, Array.isArray(value) ? value.join(", ") : value);
      headers.set("x-ads-client-address", request.socket.remoteAddress || "unknown");
      try {
        const input = new Request(new URL(rawPath, config.publicOrigin), {
          method: request.method,
          headers,
          ...(["GET", "HEAD"].includes(request.method)
            ? {}
            : { body: Readable.toWeb(request), duplex: "half" }),
          signal: controller.signal,
        });
        const result = await application.handle(input);
        const outputHeaders = Object.fromEntries(result.headers);
        const cookies = result.headers.getSetCookie();
        if (cookies.length) outputHeaders["set-cookie"] = cookies;
        response.writeHead(result.status, outputHeaders);
        if (result.body) {
          const stream = Readable.fromWeb(result.body);
          stream.on("error", () => response.destroy());
          response.on("close", () => stream.destroy());
          stream.pipe(response);
        } else response.end();
      } catch {
        if (!response.headersSent)
          response.writeHead(500, { "content-type": "text/plain", "cache-control": "no-store" });
        response.end("Request failed.");
      }
    },
  );
  server.keepAliveTimeout = 5000;
  server.maxRequestsPerSocket = 1000;
  return server;
}

export async function startServer(config = loadConfig()) {
  const application = createApplication({ config });
  const server = createNodeServer({ config, application });
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(config.port, config.host, resolve);
    });
  } catch (error) {
    await application.close();
    throw error;
  }
  return {
    server,
    application,
    close: () =>
      new Promise((resolve, reject) =>
        server.close(async (error) => {
          await application.close();
          if (error) reject(error);
          else resolve();
        }),
      ),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const running = await startServer();
    console.error("stark AI Ads MCP is ready.");
    let shuttingDown = false;
    const stop = async () => {
      if (shuttingDown) return;
      shuttingDown = true;
      const timer = setTimeout(() => process.exit(1), 10000);
      timer.unref();
      await running.close();
      clearTimeout(timer);
    };
    process.on("SIGTERM", stop);
    process.on("SIGINT", stop);
  } catch (error) {
    // Configuration errors contain field names, never values or upstream responses.
    console.error(`stark AI Ads failed to start: ${error.message}`);
    process.exitCode = 1;
  }
}
