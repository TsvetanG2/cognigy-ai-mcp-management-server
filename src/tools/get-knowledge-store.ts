/**
 * get_knowledge_store tool
 * Gets detailed information about a specific knowledge store.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  knowledgeStoreId: z
    .string()
    .describe("The knowledge store ID to retrieve"),
});

export function registerGetKnowledgeStore(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_knowledge_store",
    "Gets detailed configuration of a specific Cognigy.AI knowledge store. Returns store settings, language, embedding model, and source counts.",
    inputSchema.shape,
    async (args) => {
      const { knowledgeStoreId } = inputSchema.parse(args);

      const store = await client.readKnowledgeStore({ knowledgeStoreId }) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                _id: store._id,
                referenceId: store.referenceId,
                name: store.name,
                description: store.description,
                language: store.language,
                embeddingModel: store.embeddingModel,
                chunkSize: store.chunkSize,
                chunkOverlap: store.chunkOverlap,
                createdAt: typeof store.createdAt === "number"
                  ? new Date(store.createdAt * 1000).toISOString()
                  : undefined,
                lastChanged: typeof store.lastChanged === "number"
                  ? new Date(store.lastChanged * 1000).toISOString()
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
