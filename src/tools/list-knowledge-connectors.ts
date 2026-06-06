/**
 * list_knowledge_connectors tool
 * Lists knowledge connectors for automated content ingestion.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  knowledgeStoreId: z
    .string()
    .describe("The knowledge store ID to list connectors from"),
  filter: z
    .string()
    .optional()
    .describe("Filter connectors by name"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of connectors to return (default: 25, max: 100)"),
  skip: z
    .number()
    .min(0)
    .default(0)
    .describe("Number of items to skip for pagination"),
});

export function registerListKnowledgeConnectors(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "list_knowledge_connectors",
    "Lists Cognigy.AI knowledge connectors for automated content ingestion. Connectors can pull content from external sources like SharePoint, Confluence, or custom APIs.",
    inputSchema.shape,
    async (args) => {
      const { knowledgeStoreId, filter, limit, skip } = inputSchema.parse(args);

      const result = await client.indexKnowledgeConnectors({
        knowledgeStoreId,
        filter,
        limit,
        skip,
      }) as unknown as { items?: Record<string, unknown>[]; total?: number; nextCursor?: string; previousCursor?: string };

      const connectors = (result.items || []).map((connector) => ({
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
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                connectors,
                total: result.total,
                pagination: {
                  limit,
                  skip,
                  nextCursor: result.nextCursor,
                  previousCursor: result.previousCursor,
                },
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
