import { createServer } from "node:http";
import { Readable } from "node:stream";
import { handler } from "./http.mjs";
const server = createServer(async (request, response) => {
  const controller = new AbortController();
  request.on("aborted", () => controller.abort());
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers))
    if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  try {
    const input = new Request(new URL(request.url, "http://127.0.0.1:8788"), {
      method: request.method,
      headers,
      ...(request.method === "GET" || request.method === "HEAD"
        ? {}
        : { body: Readable.toWeb(request), duplex: "half" }),
      signal: controller.signal,
    });
    const result = await handler(input);
    response.writeHead(result.status, Object.fromEntries(result.headers));
    if (result.body) Readable.fromWeb(result.body).pipe(response);
    else response.end();
  } catch {
    response.writeHead(500);
    response.end("Request failed");
  }
});
server.listen(8788, "127.0.0.1", () => console.error("Metadata MCP: http://127.0.0.1:8788/mcp"));
process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());
