/**
 * update_knowledge_source tool
 * Updates an existing knowledge source.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  sourceId: z
    .string()
    .describe("The knowledge source ID to update"),
  knowledgeStoreId: z
    .string()
    .describe("The knowledge store ID containing the source"),
  name: z
    .string()
    .optional()
    .describe("New name for the source"),
  description: z
    .string()
    .optional()
    .describe("New description"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without updating. Set to false to actually update."),
});

export function registerUpdateKnowledgeSource(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "update_knowledge_source",
    "Updates an existing Cognigy.AI knowledge source. Use this to change name or description. MUTATING: Set dryRun=false to update.",
    inputSchema.shape,
    async (args) => {
      const { sourceId, knowledgeStoreId, name, description, dryRun } = inputSchema.parse(args);

      // Verify the source exists
      const existing = await client.readKnowledgeSource({ sourceId, knowledgeStoreId }) as unknown as Record<string, unknown>;

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to update the knowledge source.",
                  existingSource: {
                    _id: existing._id,
                    name: existing.name,
                    type: existing.type,
                    status: existing.status,
                  },
                  wouldUpdate: {
                    name: name || "(unchanged)",
                    description: description !== undefined ? description : "(unchanged)",
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = await client.updateKnowledgeSource({
        sourceId,
        knowledgeStoreId,
        name,
        description,
      } as any) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                updated: true,
                source: {
                  _id: result._id,
                  name: result.name,
                  type: result.type,
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
