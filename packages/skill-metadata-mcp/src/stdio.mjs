import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { registerTools, SERVER_INFO } from "./tools.mjs";

serveStdio(
  () => {
    const server = new McpServer(SERVER_INFO, { capabilities: { tools: {} } });
    registerTools(server);
    return server;
  },
  { maxSubscriptions: 0, onerror: () => process.stderr.write("MCP transport error\n") },
);
