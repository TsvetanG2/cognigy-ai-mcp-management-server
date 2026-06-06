/**
 * update_knowledge_store tool
 * Updates an existing knowledge store.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  knowledgeStoreId: z
    .string()
    .describe("The knowledge store ID to update"),
  name: z
    .string()
    .optional()
    .describe("New name for the knowledge store"),
  description: z
    .string()
    .optional()
    .describe("New description"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without updating. Set to false to actually update."),
});

export function registerUpdateKnowledgeStore(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "update_knowledge_store",
    "Updates an existing Cognigy.AI knowledge store. Use this to change name or description. MUTATING: Set dryRun=false to update.",
    inputSchema.shape,
    async (args) => {
      const { knowledgeStoreId, name, description, dryRun } = inputSchema.parse(args);

      // Verify the store exists
      const existing = await client.readKnowledgeStore({ knowledgeStoreId }) as unknown as Record<string, unknown>;

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to update the knowledge store.",
                  existingStore: {
                    _id: existing._id,
                    name: existing.name,
                    language: existing.language,
                  },
                  wouldUpdate: {
                    name: name || "(unchanged)",
                    description: description !== undefined ? description : "(unchanged)",
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = await client.updateKnowledgeStore({
        knowledgeStoreId,
        name,
        description,
      } as any) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                updated: true,
                store: {
                  _id: result._id,
                  name: result.name,
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
