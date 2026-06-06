/**
 * delete_knowledge_store tool
 * Deletes a knowledge store and all its contents.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  knowledgeStoreId: z
    .string()
    .describe("The knowledge store ID to delete"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without deleting. Set to false to actually delete."),
});

export function registerDeleteKnowledgeStore(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "delete_knowledge_store",
    "Deletes a Cognigy.AI knowledge store and ALL its sources and chunks. WARNING: This is destructive and cannot be undone. AI Agents using this store will lose access. MUTATING: Set dryRun=false to delete.",
    inputSchema.shape,
    async (args) => {
      const { knowledgeStoreId, dryRun } = inputSchema.parse(args);

      // Verify the store exists
      const existing = await client.readKnowledgeStore({ knowledgeStoreId });

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to delete the knowledge store.",
                  wouldDelete: {
                    _id: existing._id,
                    name: existing.name,
                    language: existing.language,
                  },
                  warning: "Deleting a knowledge store removes ALL sources and chunks permanently.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      await client.deleteKnowledgeStore({ knowledgeStoreId });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                deleted: true,
                knowledgeStoreId,
                note: "Knowledge store and all contents have been permanently deleted.",
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
