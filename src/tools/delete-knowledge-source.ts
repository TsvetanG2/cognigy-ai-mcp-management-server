/**
 * delete_knowledge_source tool
 * Deletes a knowledge source and all its chunks.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  sourceId: z
    .string()
    .describe("The knowledge source ID to delete"),
  knowledgeStoreId: z
    .string()
    .describe("The knowledge store ID containing the source"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without deleting. Set to false to actually delete."),
});

export function registerDeleteKnowledgeSource(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "delete_knowledge_source",
    "Deletes a Cognigy.AI knowledge source and all its chunks. WARNING: This is destructive. The document content will no longer be searchable. MUTATING: Set dryRun=false to delete.",
    inputSchema.shape,
    async (args) => {
      const { sourceId, knowledgeStoreId, dryRun } = inputSchema.parse(args);

      // Verify the source exists
      const existing = await client.readKnowledgeSource({ sourceId, knowledgeStoreId }) as unknown as Record<string, unknown>;

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to delete the knowledge source.",
                  wouldDelete: {
                    _id: existing._id,
                    name: existing.name,
                    type: existing.type,
                    chunkCount: existing.chunkCount,
                  },
                  warning: "Deleting a source removes all its chunks permanently.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      await client.deleteKnowledgeSource({ sourceId, knowledgeStoreId } as any);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                deleted: true,
                sourceId,
                note: "Knowledge source and all chunks have been permanently deleted.",
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
