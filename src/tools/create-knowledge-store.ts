/**
 * create_knowledge_store tool
 * Creates a new knowledge store in a project.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to create the knowledge store in"),
  name: z
    .string()
    .describe("Name for the knowledge store"),
  description: z
    .string()
    .optional()
    .describe("Description of the knowledge store's purpose"),
  language: z
    .string()
    .optional()
    .describe("Primary language for the knowledge store (e.g., 'en', 'de')"),
  embeddingModel: z
    .string()
    .optional()
    .describe("The embedding model to use for vectorization"),
  chunkSize: z
    .number()
    .optional()
    .describe("Size of text chunks in characters"),
  chunkOverlap: z
    .number()
    .optional()
    .describe("Overlap between chunks in characters"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without creating. Set to false to actually create."),
});

export function registerCreateKnowledgeStore(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "create_knowledge_store",
    "Creates a new Cognigy.AI knowledge store for RAG content. Knowledge stores contain sources (documents) that AI Agents can search to answer questions. MUTATING: Set dryRun=false to create.",
    inputSchema.shape,
    async (args) => {
      const { projectId, name, description, language, embeddingModel, chunkSize, chunkOverlap, dryRun } = inputSchema.parse(args);

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to create the knowledge store.",
                  wouldCreate: {
                    projectId,
                    name,
                    description,
                    language,
                    embeddingModel,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = await client.createKnowledgeStore({
        projectId,
        name,
        description,
        language,
        chunkSize,
        chunkOverlap,
      } as any) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                created: true,
                store: {
                  _id: result._id,
                  referenceId: result.referenceId,
                  name: result.name,
                  language: result.language,
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
