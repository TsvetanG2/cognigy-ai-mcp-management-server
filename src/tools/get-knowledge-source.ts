/**
 * get_knowledge_source tool
 * Gets detailed information about a specific knowledge source.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  sourceId: z
    .string()
    .describe("The knowledge source ID to retrieve"),
  knowledgeStoreId: z
    .string()
    .describe("The knowledge store ID containing the source"),
});

export function registerGetKnowledgeSource(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_knowledge_source",
    "Gets detailed information about a specific Cognigy.AI knowledge source. Returns source metadata, processing status, chunk count, and ingestion details.",
    inputSchema.shape,
    async (args) => {
      const { sourceId, knowledgeStoreId } = inputSchema.parse(args);

      const source = await client.readKnowledgeSource({ sourceId, knowledgeStoreId }) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                _id: source._id,
                referenceId: source.referenceId,
                name: source.name,
                description: source.description,
                type: source.type,
                status: source.status,
                url: source.url,
                chunkCount: source.chunkCount,
                metaData: source.metaData,
                createdAt: typeof source.createdAt === "number"
                  ? new Date(source.createdAt * 1000).toISOString()
                  : undefined,
                lastChanged: typeof source.lastChanged === "number"
                  ? new Date(source.lastChanged * 1000).toISOString()
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
