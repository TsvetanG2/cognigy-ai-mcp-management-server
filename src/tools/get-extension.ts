/**
 * get_extension tool
 * Gets detailed information about a specific extension.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  extensionId: z
    .string()
    .describe("The extension ID to retrieve"),
});

export function registerGetExtension(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_extension",
    "Gets detailed information about a specific Cognigy.AI Extension. Returns package info, available nodes, connections schemas, and settings.",
    inputSchema.shape,
    async (args) => {
      const { extensionId } = inputSchema.parse(args);

      const ext = await client.readExtension({ extensionId }) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                _id: ext._id,
                referenceId: ext.referenceId,
                name: ext.name,
                description: ext.description,
                version: ext.version,
                trustedCode: ext.trustedCode,
                nodes: ext.nodes,
                connections: ext.connections,
                createdAt: typeof ext.createdAt === "number"
                  ? new Date(ext.createdAt * 1000).toISOString()
                  : undefined,
                lastChanged: typeof ext.lastChanged === "number"
                  ? new Date(ext.lastChanged * 1000).toISOString()
                  : undefined,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
