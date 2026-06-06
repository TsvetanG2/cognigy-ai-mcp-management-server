/**
 * list_knowledge_sources tool
 * Lists all knowledge sources in a knowledge store.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  knowledgeStoreId: z
    .string()
    .describe("The knowledge store ID to list sources from"),
  filter: z
    .string()
    .optional()
    .describe("Filter sources by name"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of sources to return (default: 25, max: 100)"),
  skip: z
    .number()
    .min(0)
    .default(0)
    .describe("Number of items to skip for pagination"),
});

export function registerListKnowledgeSources(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "list_knowledge_sources",
    "Lists knowledge sources in a Cognigy.AI knowledge store. Sources are documents (PDFs, web pages, text files) that have been ingested and chunked for RAG retrieval.",
    inputSchema.shape,
    async (args) => {
      const { knowledgeStoreId, filter, limit, skip } = inputSchema.parse(args);

      const result = await client.indexKnowledgeSources({
        knowledgeStoreId,
        filter,
        limit,
        skip,
      }) as unknown as { items?: Record<string, unknown>[]; total?: number; nextCursor?: string; previousCursor?: string };

      const sources = (result.items || []).map((source) => ({
        _id: source._id,
        referenceId: source.referenceId,
        name: source.name,
        description: source.description,
        type: source.type,
        status: source.status,
        chunkCount: source.chunkCount,
        createdAt: typeof source.createdAt === "number"
          ? new Date(source.createdAt * 1000).toISOString()
          : undefined,
        lastChanged: typeof source.lastChanged === "number"
          ? new Date(source.lastChanged * 1000).toISOString()
          : undefined,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                sources,
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
