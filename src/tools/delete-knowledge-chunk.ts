/**
 * delete_knowledge_chunk tool
 * Deletes a knowledge chunk.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  chunkId: z
    .string()
    .describe("The knowledge chunk ID to delete"),
  sourceId: z
    .string()
    .describe("The knowledge source ID containing the chunk"),
  knowledgeStoreId: z
    .string()
    .describe("The knowledge store ID"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without deleting. Set to false to actually delete."),
});

export function registerDeleteKnowledgeChunk(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "delete_knowledge_chunk",
    "Deletes a Cognigy.AI knowledge chunk. The content will no longer be searchable via RAG. MUTATING: Set dryRun=false to delete.",
    inputSchema.shape,
    async (args) => {
      const { chunkId, sourceId, knowledgeStoreId, dryRun } = inputSchema.parse(args);

      // Verify the chunk exists
      const existing = await client.readKnowledgeChunk({ chunkId, sourceId, knowledgeStoreId }) as unknown as Record<string, unknown>;

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to delete the knowledge chunk.",
                  wouldDelete: {
                    _id: existing._id,
                    order: existing.order,
                    textPreview: typeof existing.text === "string" ? existing.text.substring(0, 100) : undefined,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      await client.deleteKnowledgeChunk({ chunkId, sourceId, knowledgeStoreId } as any);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                deleted: true,
                chunkId,
                note: "Knowledge chunk has been permanently deleted.",
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
