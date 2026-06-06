/**
 * update_knowledge_connector tool
 * Updates an existing knowledge connector.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  connectorId: z
    .string()
    .describe("The knowledge connector ID to update"),
  knowledgeStoreId: z
    .string()
    .describe("The knowledge store ID containing the connector"),
  name: z
    .string()
    .optional()
    .describe("New name for the connector"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without updating. Set to false to actually update."),
});

export function registerUpdateKnowledgeConnector(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "update_knowledge_connector",
    "Updates an existing Cognigy.AI knowledge connector. Use this to change settings or name. MUTATING: Set dryRun=false to update.",
    inputSchema.shape,
    async (args) => {
      const { connectorId, knowledgeStoreId, name, dryRun } = inputSchema.parse(args);

      // Verify the connector exists
      const existing = await client.readKnowledgeConnector({ connectorId, knowledgeStoreId }) as unknown as Record<string, unknown>;

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to update the knowledge connector.",
                  existingConnector: {
                    _id: existing._id,
                    name: existing.name,
                    type: existing.type,
                    schedule: existing.schedule,
                  },
                  wouldUpdate: {
                    name: name || "(unchanged)",
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = await client.updateKnowledgeConnector({
        connectorId,
        knowledgeStoreId,
        name,
      } as any) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                updated: true,
                connector: {
                  _id: result._id,
                  name: result.name,
                  type: result.type,
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
