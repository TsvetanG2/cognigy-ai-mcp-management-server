/**
 * create_knowledge_source tool
 * Creates a new knowledge source in a knowledge store.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  knowledgeStoreId: z
    .string()
    .describe("The knowledge store ID to create the source in"),
  name: z
    .string()
    .describe("Name for the knowledge source"),
  description: z
    .string()
    .optional()
    .describe("Description of the source content"),
  type: z
    .enum(["manual", "url"])
    .default("manual")
    .describe("Source type: 'manual' for text input, 'url' for web page"),
  url: z
    .string()
    .optional()
    .describe("URL to ingest (required if type is 'url')"),
  text: z
    .string()
    .optional()
    .describe("Text content to ingest (for type 'manual')"),
  metadata: z
    .record(z.string())
    .optional()
    .describe("Custom metadata to attach to all chunks from this source"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without creating. Set to false to actually create."),
});

export function registerCreateKnowledgeSource(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "create_knowledge_source",
    "Creates a new Cognigy.AI knowledge source for RAG content ingestion. Sources can be URLs, uploaded files, or manual text. Content is automatically chunked and embedded. MUTATING: Set dryRun=false to create.",
    inputSchema.shape,
    async (args) => {
      const { knowledgeStoreId, name, description, type, url, text, metadata, dryRun } = inputSchema.parse(args);

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to create the knowledge source.",
                  wouldCreate: {
                    knowledgeStoreId,
                    name,
                    type,
                    hasUrl: !!url,
                    hasText: !!text,
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

      const result = await client.createKnowledgeSource({
        knowledgeStoreId,
        name,
        description,
        type,
        url,
        metaData: metadata,
      } as any) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                created: true,
                source: {
                  _id: result._id,
                  referenceId: result.referenceId,
                  name: result.name,
                  type: result.type,
                  status: result.status,
                },
                note: "Source created. Content will be processed asynchronously.",
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
