/**
 * create_knowledge_chunk tool
 * Creates a new knowledge chunk manually.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  knowledgeStoreId: z
    .string()
    .describe("The knowledge store ID to create the chunk in"),
  sourceId: z
    .string()
    .describe("The source ID to associate the chunk with"),
  title: z
    .string()
    .optional()
    .describe("Title for the chunk"),
  text: z
    .string()
    .describe("The text content of the chunk"),
  metadata: z
    .record(z.string())
    .optional()
    .describe("Custom metadata for the chunk"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without creating. Set to false to actually create."),
});

export function registerCreateKnowledgeChunk(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "create_knowledge_chunk",
    "Creates a new Cognigy.AI knowledge chunk manually. Use this to add specific text segments that should be searchable via RAG. The chunk will be embedded automatically. MUTATING: Set dryRun=false to create.",
    inputSchema.shape,
    async (args) => {
      const { knowledgeStoreId, sourceId, title, text, metadata, dryRun } = inputSchema.parse(args);

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to create the knowledge chunk.",
                  wouldCreate: {
                    knowledgeStoreId,
                    sourceId,
                    title,
                    textLength: text.length,
                    hasMetadata: !!metadata,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = await client.createKnowledgeChunk({
        knowledgeStoreId,
        sourceId,
        title,
        text,
        metadata,
      } as any) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                created: true,
                chunk: {
                  _id: result._id,
                  referenceId: result.referenceId,
                  title: result.title,
                },
                note: "Chunk created and will be embedded for RAG search.",
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
