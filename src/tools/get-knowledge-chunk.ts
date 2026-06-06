/**
 * get_knowledge_chunk tool
 * Gets detailed information about a specific knowledge chunk.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  chunkId: z
    .string()
    .describe("The knowledge chunk ID to retrieve"),
  sourceId: z
    .string()
    .describe("The knowledge source ID containing the chunk"),
  knowledgeStoreId: z
    .string()
    .describe("The knowledge store ID"),
});

export function registerGetKnowledgeChunk(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_knowledge_chunk",
    "Gets the full content of a specific Cognigy.AI knowledge chunk. Returns the complete text, metadata, and source information. Use this to inspect what content is being used in RAG searches.",
    inputSchema.shape,
    async (args) => {
      const { chunkId, sourceId, knowledgeStoreId } = inputSchema.parse(args);

      const chunk = await client.readKnowledgeChunk({ chunkId, sourceId, knowledgeStoreId }) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                _id: chunk._id,
                referenceId: chunk.referenceId,
                order: chunk.order,
                text: chunk.text,
                data: chunk.data,
                disabled: chunk.disabled,
                createdAt: typeof chunk.createdAt === "number"
                  ? new Date(chunk.createdAt * 1000).toISOString()
                  : undefined,
                lastChanged: typeof chunk.lastChanged === "number"
                  ? new Date(chunk.lastChanged * 1000).toISOString()
                  : undefined,
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
