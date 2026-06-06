/**
 * get_knowledge_connector tool
 * Gets detailed information about a specific knowledge connector.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  connectorId: z
    .string()
    .describe("The knowledge connector ID to retrieve"),
  knowledgeStoreId: z
    .string()
    .describe("The knowledge store ID containing the connector"),
});

export function registerGetKnowledgeConnector(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_knowledge_connector",
    "Gets detailed configuration of a specific Cognigy.AI knowledge connector. Returns connector type, schedule, connection settings, and run status.",
    inputSchema.shape,
    async (args) => {
      const { connectorId, knowledgeStoreId } = inputSchema.parse(args);

      const connector = await client.readKnowledgeConnector({ connectorId, knowledgeStoreId }) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                _id: connector._id,
                referenceId: connector.referenceId,
                name: connector.name,
                type: connector.type,
                schedule: connector.schedule,
                createdAt: typeof connector.createdAt === "number"
                  ? new Date(connector.createdAt * 1000).toISOString()
                  : undefined,
                lastChanged: typeof connector.lastChanged === "number"
                  ? new Date(connector.lastChanged * 1000).toISOString()
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
