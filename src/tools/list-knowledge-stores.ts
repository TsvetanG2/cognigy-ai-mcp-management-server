/**
 * list_knowledge_stores tool
 * Lists all knowledge stores in a project.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe("Filter knowledge stores by project ID"),
  filter: z
    .string()
    .optional()
    .describe("Filter knowledge stores by name"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of stores to return (default: 25, max: 100)"),
  skip: z
    .number()
    .min(0)
    .default(0)
    .describe("Number of items to skip for pagination"),
});

export function registerListKnowledgeStores(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "list_knowledge_stores",
    "Lists Cognigy.AI Knowledge AI stores. Knowledge stores are containers for RAG (Retrieval-Augmented Generation) content used by AI Agents to answer questions from your data.",
    inputSchema.shape,
    async (args) => {
      const { projectId, filter, limit, skip } = inputSchema.parse(args);

      const result = await client.indexKnowledgeStores({
        projectId,
        filter,
        limit,
        skip,
      }) as unknown as { items?: Record<string, unknown>[]; total?: number; nextCursor?: string; previousCursor?: string };

      const stores = (result.items || []).map((store) => ({
        _id: store._id,
        referenceId: store.referenceId,
        name: store.name,
        description: store.description,
        language: store.language,
        embeddingModel: store.embeddingModel,
        createdAt: typeof store.createdAt === "number"
          ? new Date(store.createdAt * 1000).toISOString()
          : undefined,
        lastChanged: typeof store.lastChanged === "number"
          ? new Date(store.lastChanged * 1000).toISOString()
          : undefined,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                stores,
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
