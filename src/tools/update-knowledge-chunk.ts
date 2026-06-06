/**
 * update_knowledge_chunk tool
 * Updates an existing knowledge chunk.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  chunkId: z
    .string()
    .describe("The knowledge chunk ID to update"),
  sourceId: z
    .string()
    .describe("The knowledge source ID containing the chunk"),
  knowledgeStoreId: z
    .string()
    .describe("The knowledge store ID"),
  text: z
    .string()
    .optional()
    .describe("New text content (will be re-embedded)"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without updating. Set to false to actually update."),
});

export function registerUpdateKnowledgeChunk(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "update_knowledge_chunk",
    "Updates an existing Cognigy.AI knowledge chunk. If text is changed, the chunk will be re-embedded. MUTATING: Set dryRun=false to update.",
    inputSchema.shape,
    async (args) => {
      const { chunkId, sourceId, knowledgeStoreId, text, dryRun } = inputSchema.parse(args);

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
                  message: "Validation passed. Set dryRun=false to update the knowledge chunk.",
                  existingChunk: {
                    _id: existing._id,
                    order: existing.order,
                    textLength: typeof existing.text === "string" ? existing.text.length : undefined,
                  },
                  wouldUpdate: {
                    hasNewText: !!text,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = await client.updateKnowledgeChunk({
        chunkId,
        sourceId,
        knowledgeStoreId,
        text,
      } as any) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                updated: true,
                chunk: {
                  _id: result._id,
                },
                note: text ? "Text updated - chunk will be re-embedded." : "Chunk updated.",
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
