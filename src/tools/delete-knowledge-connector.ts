/**
 * delete_knowledge_connector tool
 * Deletes a knowledge connector.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  connectorId: z
    .string()
    .describe("The knowledge connector ID to delete"),
  knowledgeStoreId: z
    .string()
    .describe("The knowledge store ID containing the connector"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without deleting. Set to false to actually delete."),
});

export function registerDeleteKnowledgeConnector(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "delete_knowledge_connector",
    "Deletes a Cognigy.AI knowledge connector. Stops automated content ingestion from the external source. MUTATING: Set dryRun=false to delete.",
    inputSchema.shape,
    async (args) => {
      const { connectorId, knowledgeStoreId, dryRun } = inputSchema.parse(args);

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
                  message: "Validation passed. Set dryRun=false to delete the knowledge connector.",
                  wouldDelete: {
                    _id: existing._id,
                    name: existing.name,
                    type: existing.type,
                  },
                  warning: "Deleting a connector stops automated content ingestion. Existing content remains.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      await client.deleteKnowledgeConnector({ connectorId, knowledgeStoreId } as any);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                deleted: true,
                connectorId,
                note: "Knowledge connector has been deleted. Existing content remains in the store.",
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
