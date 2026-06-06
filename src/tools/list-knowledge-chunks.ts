/**
 * list_knowledge_chunks tool
 * Lists knowledge chunks in a knowledge store.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  knowledgeStoreId: z
    .string()
    .describe("The knowledge store ID to list chunks from"),
  sourceId: z
    .string()
    .optional()
    .describe("Filter chunks by source ID"),
  filter: z
    .string()
    .optional()
    .describe("Filter chunks by text content"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of chunks to return (default: 25, max: 100)"),
  skip: z
    .number()
    .min(0)
    .default(0)
    .describe("Number of items to skip for pagination"),
});

export function registerListKnowledgeChunks(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "list_knowledge_chunks",
    "Lists knowledge chunks in a Cognigy.AI knowledge store. Chunks are the actual text segments used for RAG retrieval, created by splitting source documents.",
    inputSchema.shape,
    async (args) => {
      const { knowledgeStoreId, sourceId, filter, limit, skip } = inputSchema.parse(args);

      const result = await client.indexKnowledgeChunks({
        knowledgeStoreId,
        sourceId,
        filter,
        limit,
        skip,
      } as any) as unknown as { items?: Record<string, unknown>[]; total?: number; nextCursor?: string; previousCursor?: string };

      const chunks = (result.items || []).map((chunk) => ({
        _id: chunk._id,
        referenceId: chunk.referenceId,
        order: chunk.order,
        // Truncate text for listing
        text: typeof chunk.text === "string" ? chunk.text.substring(0, 200) + (chunk.text.length > 200 ? "..." : "") : undefined,
        disabled: chunk.disabled,
        createdAt: typeof chunk.createdAt === "number"
          ? new Date(chunk.createdAt * 1000).toISOString()
          : undefined,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                chunks,
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
