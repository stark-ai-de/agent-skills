import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio, StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { registerTools, SERVER_INFO } from "./tools.mjs";

import { Transform } from "node:stream";
import { LIMITS } from "./core.mjs";

// Frame bytes before UTF-8 decoding or SDK parsing; a newline ends one request.
class BoundedStdioInput extends Transform {
  #buffer = Buffer.alloc(LIMITS.requestBytes + 1);
  #length = 0;

  _transform(chunk, encoding, callback) {
    let offset = 0;
    while (offset < chunk.length) {
      const newline = chunk.indexOf(10, offset);
      const end = newline === -1 ? chunk.length : newline;
      const bytes = end - offset;
      if (this.#length + bytes > LIMITS.requestBytes) {
        callback(new Error("MCP input exceeds 128 KiB"));
        return;
      }
      chunk.copy(this.#buffer, this.#length, offset, end);
      this.#length += bytes;
      if (newline === -1) break;
      this.#buffer[this.#length] = 10;
      this.push(Buffer.from(this.#buffer.subarray(0, this.#length + 1)));
      this.#length = 0;
      offset = newline + 1;
    }
    callback();
  }
}

const input = new BoundedStdioInput();
const transport = new StdioServerTransport(input);
let rejectedInput = false;
input.on("error", () => {
  rejectedInput = true;
  process.stderr.write("MCP input exceeds 128 KiB\n");
  process.exitCode = 1;
  process.stdin.unpipe(input);
  process.stdin.destroy();
  void transport.close();
});
serveStdio(
  () => {
    const server = new McpServer(SERVER_INFO, { capabilities: { tools: {} } });
    registerTools(server);
    return server;
  },
  {
    transport,
    maxSubscriptions: 0,
    onerror: () => {
      if (!rejectedInput) process.stderr.write("MCP transport error\n");
    },
  },
);

process.stdin.pipe(input);
