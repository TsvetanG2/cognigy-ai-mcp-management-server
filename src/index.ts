#!/usr/bin/env node
/**
 * Cognigy.AI MCP Server
 *
 * A local MCP server that lets coding agents build, configure, test, and operate
 * Cognigy.AI agents via the Cognigy.AI REST API.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createCognigyClient } from "./cognigy-client.js";
import { registerTools } from "./tools/index.js";

async function main() {
  const config = loadConfig();
  const cognigyClient = createCognigyClient(config);

  const server = new McpServer({
    name: "cognigy-ai-mcp",
    version: "0.1.2",
  });

  registerTools(server, cognigyClient, config);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
